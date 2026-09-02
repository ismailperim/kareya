// Provider-agnostic LLM adapter for build-time content generation (KAR-50).
// Pure: keys come in as arguments; callers own env reading. Open-source users
// plug in whichever provider they have. The in-call meeting agent's brain stays
// Claude (ADR-0003) — this adapter is for background content writing only.

export type LlmFn = (prompt: string) => Promise<string>;

export type LlmChoice = { name: string; llm: LlmFn };

/**
 * Google Gemini via REST (free-tier friendly — the PoC default). The
 * `-latest` alias tracks the newest flash model available to the account
 * (fixed model names age out for new users).
 */
export function geminiLlm(apiKey: string, model = "gemini-flash-latest"): LlmFn {
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
export function anthropicLlm(
  apiKey: string,
  model = "claude-haiku-4-5-20251001",
  maxTokens = 4096,
): LlmFn {
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
        max_tokens: maxTokens,
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

/** OpenAI-compatible Chat Completions API (OpenAI, Ollama, LM Studio, etc.). */
export function openAiCompatibleLlm(
  baseUrl: string,
  apiKey: string | undefined,
  model: string,
): LlmFn {
  const endpoint = `${baseUrl.replace(/\/+$/, "")}/chat/completions`;
  return async (prompt: string) => {
    const headers: Record<string, string> = { "content-type": "application/json" };
    if (apiKey) headers.authorization = `Bearer ${apiKey}`;

    const res = await fetch(endpoint, {
      method: "POST",
      headers,
      body: JSON.stringify({
        model,
        temperature: 0.7,
        messages: [{ role: "user", content: prompt }],
      }),
    });
    if (!res.ok) {
      throw new Error(`OpenAI-compatible ${res.status}: ${(await res.text()).slice(0, 300)}`);
    }
    const data = (await res.json()) as {
      choices?: { message?: { content?: string } }[];
    };
    const text = data.choices?.[0]?.message?.content ?? "";
    if (!text) throw new Error("OpenAI-compatible provider returned empty content");
    return text;
  };
}

export type LlmEnvironment = {
  GEMINI_API_KEY?: string;
  ANTHROPIC_API_KEY?: string;
  LLM_MODEL?: string;
  OPENAI_BASE_URL?: string;
  OPENAI_API_KEY?: string;
  OPENAI_MODEL?: string;
};

/** Pick a provider from available keys (Gemini first — free tier). */
export function pickLlm(env: LlmEnvironment): LlmChoice | null {
  return pickLlms(env)[0] ?? null;
}

/**
 * All available providers in preference order (Gemini first — free tier;
 * Claude next). Callers use this as a runtime FALLBACK CHAIN: a provider
 * failing mid-build (rate limit, outage) must not degrade the customer's
 * site to unpolished copy when another key is on hand.
 */
export function pickLlms(env: LlmEnvironment): LlmChoice[] {
  const choices: LlmChoice[] = [];
  if (env.GEMINI_API_KEY) {
    choices.push({ name: "gemini", llm: geminiLlm(env.GEMINI_API_KEY, env.LLM_MODEL || undefined) });
  }
  if (env.ANTHROPIC_API_KEY) {
    // LLM_MODEL is a Gemini override; Claude keeps its own default here.
    choices.push({ name: "anthropic", llm: anthropicLlm(env.ANTHROPIC_API_KEY) });
  }
  if (env.OPENAI_BASE_URL && env.OPENAI_MODEL) {
    choices.push({
      name: "openai-compatible",
      llm: openAiCompatibleLlm(env.OPENAI_BASE_URL, env.OPENAI_API_KEY, env.OPENAI_MODEL),
    });
  }
  return choices;
}
