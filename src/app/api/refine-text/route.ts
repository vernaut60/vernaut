import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { z } from "zod";

// Rate limiting configuration
const RATE_LIMIT_WINDOW_MS = 60_000; // 1 minute
const RATE_LIMIT_MAX = 10; // 10 requests per minute
const rateBuckets: Map<string, { windowStart: number; count: number }> = new Map();

// Input validation schema
const requestSchema = z.object({
  idea: z.string()
    .min(1, 'Idea text is required')
    .max(1000, 'Idea text too long (max 1000 characters)')
    .refine(
      (text) => {
        const words = text.trim().split(/\s+/).filter(w => w.length > 0);
        return words.length >= 3; // Require at least 3 words for meaningful refinement
      },
      'Idea must contain at least 3 words to refine'
    )
});

// Response validation schema
const responseSchema = z.object({
  success: z.boolean(),
  rawIdea: z.string(),
  refinedIdea: z.string(),
  error: z.string().optional()
});

// Retry utility function
async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  maxRetries: number = 3,
  baseDelay: number = 1000
): Promise<T> {
  let lastError: Error;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error as Error;
      
      if (attempt === maxRetries) {
        throw lastError;
      }

      // Exponential backoff: 1s, 2s, 4s
      const delay = baseDelay * Math.pow(2, attempt);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }

  throw lastError!;
}

// Error logging utility
function logError(level: 'error' | 'warn' | 'info', message: string, context?: Record<string, unknown>) {
  const timestamp = new Date().toISOString();
  const logEntry = {
    timestamp,
    level,
    message,
    context,
    service: 'refine-text-api'
  };
  
  console.error(`[${level.toUpperCase()}] ${message}`, logEntry);
}

export async function GET() {
  return NextResponse.json({ success: false, error: "Method Not Allowed" }, { status: 405 });
}

export async function PUT() {
  return NextResponse.json({ success: false, error: "Method Not Allowed" }, { status: 405 });
}

export async function PATCH() {
  return NextResponse.json({ success: false, error: "Method Not Allowed" }, { status: 405 });
}

export async function DELETE() {
  return NextResponse.json({ success: false, error: "Method Not Allowed" }, { status: 405 });
}

export async function POST(request: NextRequest) {
  const clientIp = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown';
  
  try {
    // Step 1: Rate limiting
    const now = Date.now();
    const bucket = rateBuckets.get(clientIp);
    if (!bucket || now - bucket.windowStart > RATE_LIMIT_WINDOW_MS) {
      rateBuckets.set(clientIp, { windowStart: now, count: 1 });
    } else {
      bucket.count += 1;
      if (bucket.count > RATE_LIMIT_MAX) {
        logError('warn', 'Rate limit exceeded', { 
          clientIp, 
          count: bucket.count, 
          windowStart: bucket.windowStart 
        });
        return NextResponse.json(
          { success: false, error: 'Rate limit exceeded. Please try again shortly.' },
          { status: 429 }
        );
      }
    }

    // Step 2: Content type validation
    const contentType = request.headers.get("content-type") || "";
    if (!contentType.includes("application/json")) {
      logError('warn', 'Invalid content type', { contentType, clientIp });
      return NextResponse.json(
        { success: false, error: "Invalid content-type. Expected application/json." },
        { status: 400 }
      );
    }

    // Step 3: Parse and validate request body
    let body: unknown;
    try {
      body = await request.json();
    } catch (error) {
      logError('warn', 'Invalid JSON in request body', { clientIp, error: error instanceof Error ? error.message : 'Unknown error' });
      return NextResponse.json(
        { success: false, error: "Invalid JSON in request body." },
        { status: 400 }
      );
    }

    // Step 4: Input validation with Zod
    let validatedInput: { idea: string };
    try {
      validatedInput = requestSchema.parse(body);
    } catch (error) {
      if (error instanceof z.ZodError) {
        logError('warn', 'Input validation failed', { 
          clientIp, 
          errors: error.errors.map(err => ({ field: err.path.join('.'), message: err.message }))
        });
        return NextResponse.json(
          { 
            success: false, 
            error: error.errors[0]?.message || 'Invalid input',
            details: error.errors.map(err => ({
              field: err.path.join('.'),
              message: err.message
            }))
          },
          { status: 400 }
        );
      }
      throw error;
    }

    const rawIdea = validatedInput.idea.trim();
    const inputWordCount = rawIdea.split(/\s+/).filter(w => w.length > 0).length;

    // Step 5: Environment validation
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      logError('error', 'Missing Anthropic API key', { clientIp });
      return NextResponse.json(
        { success: false, error: "Server misconfiguration: missing ANTHROPIC_API_KEY." },
        { status: 500 }
      );
    }

    // Step 6: Determine adaptive limits based on input length
    let targetWordMin: number;
    let targetWordMax: number;
    let maxTokens: number;
    let maxWordsAllowed: number;

    if (inputWordCount <= 15) {
      // Short inputs: Keep it concise
      targetWordMin = 20;
      targetWordMax = 30;
      maxWordsAllowed = 40;
      maxTokens = 120; // ~90 words max
    } else if (inputWordCount <= 40) {
      // Medium inputs: Allow more detail preservation
      targetWordMin = 30;
      targetWordMax = 50;
      maxWordsAllowed = 70;
      maxTokens = 180; // ~135 words max
    } else {
      // Long inputs: Preserve as much detail as possible
      targetWordMin = 50;
      targetWordMax = 80;
      maxWordsAllowed = 100;
      maxTokens = 250; // ~187 words max
    }

    // Step 7: Anthropic API call with retry logic
    const client = new Anthropic({ apiKey });
    let refinedIdea: string;

    try {
      refinedIdea = await retryWithBackoff(async () => {
        const lengthGuidance = inputWordCount <= 15
          ? `Keep it concise: aim for ${targetWordMin}–${targetWordMax} words; allow up to ${maxWordsAllowed} words if needed to preserve essential details.`
          : inputWordCount <= 40
          ? `Aim for ${targetWordMin}–${targetWordMax} words to preserve the user's key details; allow up to ${maxWordsAllowed} words if the input contains multiple important concepts.`
          : `The user provided detailed information - preserve all key details. Aim for ${targetWordMin}–${targetWordMax} words; you may use up to ${maxWordsAllowed} words to capture all essential elements.`;

        const chat = await client.messages.create({
          model: "claude-3-5-haiku-20241022",
          max_tokens: maxTokens,
          temperature: 0.2,
          messages: [
            {
              role: "user",
              content: `You are an assistant that rewrites messy or unclear business ideas into clear, professional startup idea statements.

Rules:
- Correct obvious typos and spelling errors (e.g., "thcat" → "that", "wed" → "wed" only if it makes sense in context).
- Fix grammar and structure while preserving the user's intended meaning.
- Prefer one clear sentence; if the user expresses more than one distinct essential concept, you may use two sentences.
- Never use more than two sentences.
- Preserve ALL key details mentioned by the user - do not drop important information.
- If the input appears to be random characters, gibberish, or completely nonsensical (e.g., "wedwedwed ed wed wed wed" with no meaningful pattern), try to extract ANY meaningful words or concepts. If you cannot extract any meaningful concept, return a neutral version that acknowledges the input needs clarification, such as "A service or product that requires further clarification" - but ONLY if the input is truly nonsensical.
- If the input is very short (1-3 words) or a single concept, DO NOT invent generic business details. Instead, expand naturally while staying true to what the user actually wrote. For example, "AI" should become something like "A platform or service that leverages artificial intelligence" - NOT a generic "AI-powered platform for businesses" unless the user mentioned businesses.
- For longer inputs with typos but clear meaning, correct the typos and improve structure while keeping the core idea intact.
- For longer inputs, you may lightly enrich the phrasing with obvious business context (e.g., target audience, product type), but do not invent new features or markets.
- ${lengthGuidance}
- If the user's input is a question, reframe it as a neutral business idea statement.
- Tone: professional, concise, business-oriented.
- Return only the refined sentence(s), nothing else.

Idea to refine: ${rawIdea}`
            }
          ]
        });

        const text = chat.content?.[0]?.type === 'text' ? chat.content[0].text?.trim() : '';
        if (!text) {
          throw new Error('No response from AI model');
        }

        // Post-process: normalize whitespace and enforce adaptive word limit
        const normalized = text.replace(/\s+/g, " ").trim();
        const words = normalized.split(/\s+/);
        if (words.length > maxWordsAllowed) {
          // If over limit, truncate but try to end at sentence boundary
          const truncated = words.slice(0, maxWordsAllowed).join(" ");
          // Add period if not ending with punctuation
          return truncated + (truncated.match(/[.!?]$/) ? "" : ".");
        }
        return normalized;
      }, 3, 1000);

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown OpenAI error';
      logError('error', 'OpenAI API call failed', { 
        clientIp, 
        error: errorMessage,
        rawIdea: rawIdea.substring(0, 100) // Log first 100 chars for debugging
      });

      if (errorMessage.includes('rate limit') || errorMessage.includes('429')) {
        return NextResponse.json(
          { success: false, error: "AI service is temporarily overloaded. Please try again in a moment." },
          { status: 429 }
        );
      }

      if (errorMessage.includes('timeout') || errorMessage.includes('network')) {
        return NextResponse.json(
          { success: false, error: "AI service is temporarily unavailable. Please try again." },
          { status: 503 }
        );
      }

      return NextResponse.json(
        { success: false, error: "AI service error. Please try again later." },
        { status: 502 }
      );
    }

    // Step 7: Validate response structure
    const response = { success: true, rawIdea, refinedIdea };
    try {
      responseSchema.parse(response);
    } catch (error) {
      logError('error', 'Response validation failed', { 
        clientIp, 
        response, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      });
      return NextResponse.json(
        { success: false, error: "Response validation failed." },
        { status: 500 }
      );
    }

    // Step 8: Success logging
    logError('info', 'Text refinement successful', { 
      clientIp, 
      inputLength: rawIdea.length,
      outputLength: refinedIdea.length,
      wordCount: refinedIdea.split(/\s+/).length
    });

    return NextResponse.json(response, { status: 200 });

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    logError('error', 'Unexpected error in refine-text API', { 
      clientIp, 
      error: errorMessage,
      stack: error instanceof Error ? error.stack : undefined
    });

    return NextResponse.json(
      { success: false, error: "Unexpected server error. Please try again." },
      { status: 500 }
    );
  }
}


