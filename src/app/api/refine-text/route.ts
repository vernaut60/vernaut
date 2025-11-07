import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { z } from "zod";
import crypto from "crypto";
import { createClient as createSupabaseServerClient } from "@/lib/supabase/server";
import { createClient } from "@supabase/supabase-js";
import { validateIdeaIsNotVague } from "@/lib/ideaValidation";

// Rate limiting configuration (server + DB-backed)
const RATE_LIMIT_WINDOW_SECONDS = 60; // 60s window
const RATE_LIMIT_MAX = 15; // default production limit per user per minute

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
  refinedIdea: z.string().nullable().optional(), // Can be null if skipRefinement is true
  skipRefinement: z.boolean().optional(), // Flag to indicate refinement was skipped
  reason: z.string().optional(), // Reason for skipping (e.g., "too vague")
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
    // Step 1: Authenticate user (optional for demo/guest users)
    const supabase = await createSupabaseServerClient();
    const { data: { user } } = await supabase.auth.getUser();
    
    // Allow unauthenticated users (guests) for demo purposes
    // Rate limiting will use IP address for guests, user_id for authenticated users
    const userId = user?.id || null;
    const isGuest = !userId;
    
    // Generate deterministic UUID from IP for guest users (for rate limiting)
    // Uses UUID v5-like approach: hash IP address to create consistent UUID
    const getGuestUserId = (ip: string): string => {
      // Create a deterministic UUID from IP address
      // Use a fixed namespace UUID for guest users (DNS namespace)
      const namespace = '6ba7b810-9dad-11d1-80b4-00c04fd430c8';
      
      // Hash namespace + IP using SHA-1 (required for UUID v5)
      const hash = crypto.createHash('sha1')
        .update(Buffer.from(namespace.replace(/-/g, ''), 'hex'))
        .update(ip)
        .digest();
      
      // Convert to UUID v5 format (RFC 4122)
      // Set version (5) and variant bits
      const bytes = Array.from(hash);
      bytes[6] = (bytes[6] & 0x0f) | 0x50; // Version 5
      bytes[8] = (bytes[8] & 0x3f) | 0x80; // Variant 10
      
      // Convert to UUID string format (8-4-4-4-12)
      const hex = Buffer.from(bytes).toString('hex');
      return [
        hex.substring(0, 8),
        hex.substring(8, 12),
        hex.substring(12, 16),
        hex.substring(16, 20),
        hex.substring(20, 32)
      ].join('-');
    };
    
    // Use user ID if authenticated, otherwise generate deterministic UUID from IP
    const rateLimitUserId = userId || getGuestUserId(clientIp);
    
    // For guests, use service role key to bypass RLS for cache and rate limit operations
    // For authenticated users, use regular client (RLS allows their own data)
    const supabaseForDbOps = isGuest && process.env.SUPABASE_SERVICE_ROLE_KEY
      ? createClient(
          process.env.NEXT_PUBLIC_SUPABASE_URL!,
          process.env.SUPABASE_SERVICE_ROLE_KEY,
          { auth: { persistSession: false } }
        )
      : supabase;

    // Step 2: Content type validation
    const contentType = request.headers.get("content-type") || "";
    if (!contentType.includes("application/json")) {
      logError('warn', 'Invalid content type', { contentType, clientIp });
      return NextResponse.json(
        { success: false, error: "Invalid content-type. Expected application/json." },
        { status: 400 }
      );
    }

    // Step 2: Parse and validate request body
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

    // Step 3: Input validation with Zod
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

    // Step 3.5: Validate idea is not too vague (skip refinement for vague ideas)
    // This prevents showing refined text for ideas that are too short/unclear
    const validationResult = await validateIdeaIsNotVague(rawIdea);
    if (!validationResult.valid) {
      // Return helpful guidance message instead of refined text
      // This gives users actionable feedback on how to improve their idea
      let guidanceMessage = '';
      
      if (validationResult.error?.includes('more detail')) {
        guidanceMessage = '💡 Add more details: Describe who it\'s for, what problem it solves, and your solution approach.';
      } else if (validationResult.error?.includes('too vague')) {
        guidanceMessage = '💡 Be more specific: Try describing what your product does or who it helps. Example: "Time tracking tool for remote teams losing billable hours"';
      } else if (validationResult.error?.includes('business idea')) {
        guidanceMessage = '💡 Focus on a business concept: Describe a product, service, or startup idea that solves a problem for customers.';
      } else {
        guidanceMessage = '💡 Add more context: Include details about your target audience, the problem you\'re solving, and your proposed solution.';
      }
      
      return NextResponse.json(
        { 
          success: true, 
          rawIdea, 
          refinedIdea: guidanceMessage,
          skipRefinement: true,
          reason: validationResult.error 
        },
        { status: 200 }
      );
    }

    // Step 4: Normalize text & compute hash (for de-dup)
    // For guests, use IP address; for authenticated users, use user_id
    const normalizedText = rawIdea.replace(/\s+/g, ' ').trim();
    const identifier = userId || `ip:${clientIp}`;
    const inputHash = crypto.createHash('sha256').update(`${identifier}::${normalizedText}`).digest('hex');

    // Step 5: De-dup cache (60s TTL)
    // Use rateLimitUserId (deterministic UUID for guests, actual UUID for authenticated users)
    // Use supabaseForDbOps to bypass RLS for guests
    const ttlIso = new Date(Date.now() - 60_000).toISOString();
    const { data: cached } = await supabaseForDbOps
      .from('refine_cache')
      .select('result, created_at')
      .eq('user_id', rateLimitUserId)
      .eq('input_hash', inputHash)
      .gt('created_at', ttlIso)
      .maybeSingle();

    interface CachedResult {
      result?: {
        refinedIdea: string
      }
    }

    if (cached && (cached as CachedResult).result) {
      const response = NextResponse.json({ success: true, rawIdea, refinedIdea: (cached as CachedResult).result?.refinedIdea }, { status: 200 });
      response.headers.set('X-Refine-Cache', 'hit');
      response.headers.set('X-RateLimit-Limit', String(RATE_LIMIT_MAX));
      // Remaining is unknown from cache path; set to '-'
      response.headers.set('X-RateLimit-Remaining', '-');
      response.headers.set('X-RateLimit-Reset', String(Math.floor((Date.now() + RATE_LIMIT_WINDOW_SECONDS * 1000) / 1000)));
      return response;
    }

    // Step 6: DB-backed rate limit (per user or per IP for guests)
    // rateLimitUserId is already set above (deterministic UUID for guests, actual UUID for authenticated users)
    // Use supabaseForDbOps to bypass RLS for guests (RPC uses SECURITY DEFINER but client still needs proper permissions)
    const { data: rlData, error: rlError } = await supabaseForDbOps.rpc('check_rate_limit', {
      p_user_id: rateLimitUserId,
      p_endpoint: 'refine-text',
      p_limit: RATE_LIMIT_MAX,
      p_window_seconds: RATE_LIMIT_WINDOW_SECONDS
    });

    if (rlError) {
      logError('error', 'Rate limit RPC failed', { clientIp, userId: rateLimitUserId, error: rlError.message });
      // Fail open to avoid blocking users if RPC misconfigured
    } else if (Array.isArray(rlData) && rlData[0] && rlData[0].allowed === false) {
      const resetAt = rlData[0].reset_at as string;
      const remaining = rlData[0].remaining as number;
      const limit = rlData[0].limit_val as number;
      const resetUnix = Math.floor(new Date(resetAt).getTime() / 1000);
      const nowUnix = Math.floor(Date.now() / 1000);
      const retryAfter = Math.max(resetUnix - nowUnix, 1);
      const resp = NextResponse.json(
        { success: false, error: 'Rate limit exceeded. Please try again shortly.', retry_after: retryAfter },
        { status: 429 }
      );
      resp.headers.set('X-RateLimit-Limit', String(limit));
      resp.headers.set('X-RateLimit-Remaining', String(remaining));
      resp.headers.set('X-RateLimit-Reset', String(resetUnix));
      return resp;
    }

    // Step 7: Environment validation
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      logError('error', 'Missing Anthropic API key', { clientIp });
      return NextResponse.json(
        { success: false, error: "Server misconfiguration: missing ANTHROPIC_API_KEY." },
        { status: 500 }
      );
    }

    // Step 8: Determine adaptive limits based on input length
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

    // Step 9: Anthropic API call with retry logic
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

    // Step 10: Validate response structure
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

    // Step 11: Store in cache (upsert) & Success logging
    // Use supabaseForDbOps to bypass RLS for guests
    try {
      await supabaseForDbOps
        .from('refine_cache')
        .upsert({ user_id: rateLimitUserId, input_hash: inputHash, result: { refinedIdea }, created_at: new Date().toISOString() }, { onConflict: 'user_id,input_hash' });
    } catch (err) {
      logError('warn', 'Refine cache upsert failed', { userId: rateLimitUserId, error: err instanceof Error ? err.message : String(err) });
    }

    logError('info', 'Text refinement successful', { 
      clientIp, 
      inputLength: rawIdea.length,
      outputLength: refinedIdea.length,
      wordCount: refinedIdea.split(/\s+/).length
    });

    const httpResponse = NextResponse.json(response, { status: 200 });
    httpResponse.headers.set('X-Refine-Cache', 'miss');
    if (Array.isArray(rlData) && rlData[0]) {
      const resetUnix = Math.floor(new Date(rlData[0].reset_at as string).getTime() / 1000);
      httpResponse.headers.set('X-RateLimit-Limit', String(rlData[0].limit_val));
      httpResponse.headers.set('X-RateLimit-Remaining', String(rlData[0].remaining));
      httpResponse.headers.set('X-RateLimit-Reset', String(resetUnix));
    }
    return httpResponse;

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


