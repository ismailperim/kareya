// Provider-agnostic LLM adapter for build-time content generation (KAR-50).
// Pure: keys come in as arguments; callers own env reading. Open-source users
// plug in whichever provider they have. The in-call meeting agent's brain stays
// Claude (ADR-0003) — this adapter is for background content writing only.

export type LlmFn = (prompt: string) => Promise<string>;

export type LlmChoice = { name: string; llm: LlmFn };

/** Google Gemini via REST (free-tier friendly — the PoC default). */
export function geminiLlm(apiKey: string, model = "gemini-2.5-flash"): LlmFn {
  return async (prompt: string) => {
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
      {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { temperature: 0.7 },
        }),
      },
    );
    if (!res.ok) {
      throw new Error(`Gemini ${res.status}: ${(await res.text()).slice(0, 300)}`);
    }
    const data = (await res.json()) as {
      candidates?: { content?: { parts?: { text?: string }[] } }[];
    };
    const text = data.candidates?.[0]?.content?.parts?.map((p) => p.text ?? "").join("") ?? "";
    if (!text) throw new Error("Gemini returned empty content");
    return text;
  };
}

/** Anthropic Claude via the Messages API. */
export function anthropicLlm(apiKey: string, model = "claude-haiku-4-5-20251001"): LlmFn {
  return async (prompt: string) => {
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model,
        max_tokens: 4096,
        messages: [{ role: "user", content: prompt }],
      }),
    });
    if (!res.ok) {
      throw new Error(`Anthropic ${res.status}: ${(await res.text()).slice(0, 300)}`);
    }
    const data = (await res.json()) as { content?: { type: string; text?: string }[] };
    const text = (data.content ?? [])
      .filter((b) => b.type === "text")
      .map((b) => b.text ?? "")
      .join("");
    if (!text) throw new Error("Anthropic returned empty content");
    return text;
  };
}

/** Pick a provider from available keys (Gemini first — free tier). */
export function pickLlm(env: {
  GEMINI_API_KEY?: string;
  ANTHROPIC_API_KEY?: string;
  LLM_MODEL?: string;
}): LlmChoice | null {
  if (env.GEMINI_API_KEY) {
    return { name: "gemini", llm: geminiLlm(env.GEMINI_API_KEY, env.LLM_MODEL || undefined) };
  }
  if (env.ANTHROPIC_API_KEY) {
    return { name: "anthropic", llm: anthropicLlm(env.ANTHROPIC_API_KEY, env.LLM_MODEL || undefined) };
  }
  return null;
}
