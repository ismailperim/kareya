// Image sourcing adapter (KAR-53) — provider-agnostic, like the LLM adapter.
// Pexels (free stock, no attribution required) is the PoC default; Gemini
// image generation is wired and activates automatically once billing enables
// it. No provider → the caller skips images gracefully.

export type SiteImage = { buffer: Buffer; ext: string };
export type ImageFn = (query: string, orientation: "landscape" | "square") => Promise<SiteImage>;
export type ImageChoice = { name: string; getImage: ImageFn };

/** Pexels search → best photo, downloaded (we self-host copies on R2). */
export function pexelsImageProvider(apiKey: string): ImageFn {
  return async (query, orientation) => {
    const res = await fetch(
      `https://api.pexels.com/v1/search?query=${encodeURIComponent(query)}&per_page=3&orientation=${orientation}`,
      { headers: { Authorization: apiKey } },
    );
    if (!res.ok) throw new Error(`Pexels ${res.status}: ${(await res.text()).slice(0, 200)}`);
    const data = (await res.json()) as {
      photos?: { src?: { large2x?: string; large?: string } }[];
    };
    const url = data.photos?.[0]?.src?.large2x ?? data.photos?.[0]?.src?.large;
    if (!url) throw new Error(`Pexels: no results for "${query}"`);
    const img = await fetch(url);
    if (!img.ok) throw new Error(`Pexels download ${img.status}`);
    return { buffer: Buffer.from(await img.arrayBuffer()), ext: "jpg" };
  };
}

/** Gemini image generation (requires billing — free tier has no image quota). */
export function geminiImageProvider(apiKey: string, model = "gemini-3.1-flash-image"): ImageFn {
  return async (query, orientation) => {
    const prompt = `Professional website photograph: ${query}. Premium minimal aesthetic, clean light background, photorealistic, no text, ${orientation === "landscape" ? "16:9 wide" : "square"} composition.`;
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
      {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { responseModalities: ["IMAGE"] },
        }),
      },
    );
    if (!res.ok) throw new Error(`Gemini image ${res.status}: ${(await res.text()).slice(0, 200)}`);
    const data = (await res.json()) as {
      candidates?: { content?: { parts?: { inlineData?: { mimeType: string; data: string } }[] } }[];
    };
    const part = data.candidates?.[0]?.content?.parts?.find((p) => p.inlineData);
    if (!part?.inlineData) throw new Error("Gemini image: empty response");
    const ext = part.inlineData.mimeType.includes("png") ? "png" : "jpg";
    return { buffer: Buffer.from(part.inlineData.data, "base64"), ext };
  };
}

/** Pick a provider from available keys (Pexels first — free). */
export function pickImageProvider(env: {
  PEXELS_API_KEY?: string;
  GEMINI_API_KEY?: string;
  GEMINI_IMAGE_MODEL?: string;
  /** Gemini image needs billing; opt in explicitly to avoid guaranteed 429s. */
  GEMINI_IMAGE_ENABLED?: string;
}): ImageChoice | null {
  if (env.PEXELS_API_KEY) {
    return { name: "pexels", getImage: pexelsImageProvider(env.PEXELS_API_KEY) };
  }
  if (env.GEMINI_API_KEY && env.GEMINI_IMAGE_ENABLED === "1") {
    return {
      name: "gemini-image",
      getImage: geminiImageProvider(env.GEMINI_API_KEY, env.GEMINI_IMAGE_MODEL || undefined),
    };
  }
  return null;
}
