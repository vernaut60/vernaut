import { NextResponse } from "next/server";
import OpenAI from "openai";

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

export async function POST(request: Request) {
  try {
    const contentType = request.headers.get("content-type") || "";
    if (!contentType.includes("application/json")) {
      return NextResponse.json(
        { success: false, error: "Invalid content-type. Expected application/json." },
        { status: 400 }
      );
    }

    const body = await request.json().catch(() => null);
    const idea = body?.idea;

    if (typeof idea !== "string" || idea.trim().length === 0) {
      return NextResponse.json(
        { success: false, error: "Invalid input: 'idea' must be a non-empty string." },
        { status: 400 }
      );
    }

    const rawIdea = idea.trim();

    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { success: false, error: "Server misconfiguration: missing OPENAI_API_KEY." },
        { status: 500 }
      );
    }

    const client = new OpenAI({ apiKey });

    // Use Chat Completions API with explicit system and user messages
    let refinedIdea = "";
    try {
      const chat = await client.chat.completions.create({
        model: "gpt-4o-mini",
        temperature: 0.2,
        messages: [
          {
            role: "system",
            content:
              "You are an assistant that rewrites messy or unclear business ideas into clear, professional startup idea statements.\nRules:\n- Correct grammar, spelling, and structure.\n- Prefer one clear sentence; if the user expresses more than one distinct essential concept, you may use two sentences.\n- Never use more than two sentences.\n- Preserve all key details mentioned by the user.\n- You may lightly enrich the phrasing with obvious business context (e.g., target audience, product type), but do not invent new features or markets.\n- Keep it concise: aim for 20–30 words; allow up to 40 words if needed to preserve essential details.\n- If the user’s input is a question, reframe it as a neutral business idea statement.\n- Tone: professional, concise, business-oriented.\n- Return only the refined sentence(s), nothing else.",
          },
          { role: "user", content: rawIdea },
        ],
      });

      const text = chat.choices?.[0]?.message?.content?.trim();
      if (!text) {
        return NextResponse.json(
          { success: false, error: "No response from the AI model." },
          { status: 502 }
        );
      }
      // Post-process: normalize whitespace and cap to 40 words, allow up to two sentences
      const normalized = text.replace(/\s+/g, " ").trim();
      const words = normalized.split(/\s+/);
      refinedIdea = words.length > 40 ? words.slice(0, 40).join(" ") + "." : normalized;
    } catch {
      return NextResponse.json(
        { success: false, error: "AI service error. Please try again later." },
        { status: 502 }
      );
    }

    return NextResponse.json({ success: true, rawIdea, refinedIdea }, { status: 200 });
  } catch {
    return NextResponse.json(
      { success: false, error: "Unexpected server error." },
      { status: 500 }
    );
  }
}


