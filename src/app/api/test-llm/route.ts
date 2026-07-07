import { NextResponse } from "next/server";
import { LLM_PROVIDERS, type LLMConfig } from "@/lib/llm-providers";

export async function POST(request: Request) {
  const config: LLMConfig = await request.json();

  if (!config.provider || !config.model) {
    return NextResponse.json(
      { error: "Provider and model are required" },
      { status: 400 }
    );
  }

  const provider = LLM_PROVIDERS[config.provider];
  if (!provider) {
    return NextResponse.json(
      { error: "Invalid provider" },
      { status: 400 }
    );
  }

  const baseUrl = config.baseUrl || provider.baseUrl;
  const apiKey = config.apiKey || "";

  try {
    const start = Date.now();

    const response = await fetch(`${baseUrl}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(apiKey ? { Authorization: `Bearer ${apiKey}` } : {}),
      },
      body: JSON.stringify({
        model: config.model,
        messages: [
          {
            role: "user",
            content: "Say 'Connection successful' in one sentence.",
          },
        ],
        temperature: 0.7,
        max_tokens: 100,
      }),
    });

    const elapsed = Date.now() - start;

    if (!response.ok) {
      const error = await response.text();
      return NextResponse.json(
        { error: `API error (${response.status}): ${error.slice(0, 200)}` },
        { status: response.status }
      );
    }

    const data = await response.json();
    const message = data.choices?.[0]?.message?.content;

    if (!message) {
      return NextResponse.json(
        { error: "No response from model" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message,
      time: elapsed,
      provider: config.provider,
      model: config.model,
    });
  } catch (e) {
    return NextResponse.json(
      {
        error: `Connection failed: ${e instanceof Error ? e.message : "Unknown error"}`,
      },
      { status: 500 }
    );
  }
}
