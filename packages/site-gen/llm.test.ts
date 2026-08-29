import { afterEach, describe, expect, it, vi } from "vitest";

import { openAiCompatibleLlm, pickLlms } from "./llm";

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("openAiCompatibleLlm", () => {
  it("calls the configured Chat Completions endpoint", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({ choices: [{ message: { content: "Polished copy" } }] }),
        { status: 200 },
      ),
    );
    vi.stubGlobal("fetch", fetchMock);

    const llm = openAiCompatibleLlm("http://127.0.0.1:11434/v1/", "local-token", "llama3.1:8b");
    await expect(llm("Rewrite this")).resolves.toBe("Polished copy");

    expect(fetchMock).toHaveBeenCalledWith(
      "http://127.0.0.1:11434/v1/chat/completions",
      expect.objectContaining({
        method: "POST",
        headers: {
          "content-type": "application/json",
          authorization: "Bearer local-token",
        },
      }),
    );
    const body = JSON.parse(fetchMock.mock.calls[0][1].body as string);
    expect(body).toMatchObject({
      model: "llama3.1:8b",
      messages: [{ role: "user", content: "Rewrite this" }],
    });
  });

  it("supports local servers without an API key", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ choices: [{ message: { content: "Local result" } }] })),
    );
    vi.stubGlobal("fetch", fetchMock);

    await openAiCompatibleLlm("http://localhost:1234/v1", undefined, "local-model")("Prompt");

    expect(fetchMock.mock.calls[0][1].headers).toEqual({ "content-type": "application/json" });
  });

  it("reports HTTP and empty-content failures", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response("offline", { status: 503 })));
    const llm = openAiCompatibleLlm("http://localhost:1234/v1", undefined, "local-model");
    await expect(llm("Prompt")).rejects.toThrow("OpenAI-compatible 503: offline");

    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response('{"choices":[]}')));
    await expect(llm("Prompt")).rejects.toThrow("returned empty content");
  });
});

describe("pickLlms", () => {
  it("adds the OpenAI-compatible provider only with a base URL and model", () => {
    expect(
      pickLlms({ OPENAI_BASE_URL: "http://localhost:11434/v1", OPENAI_MODEL: "llama3.1:8b" }).map(
        (choice) => choice.name,
      ),
    ).toEqual(["openai-compatible"]);
    expect(pickLlms({ OPENAI_BASE_URL: "http://localhost:11434/v1" })).toEqual([]);
  });
});
