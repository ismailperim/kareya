// KAR-22: apply the v2 meeting-agent config (system prompt + tools) to the
// ElevenLabs agent. Single source of truth: lib/meeting/agent-config.ts.
// Run: `npm run setup:agent -w @kareya/portal` (vite-node resolves TS + workspace).
// The Claude brain (ADR-0003) is preserved.

import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { FIRST_MESSAGE, MEETING_TOOLS, SYSTEM_PROMPT_V2 } from "../lib/meeting/agent-config";

const portalRoot = join(dirname(fileURLToPath(import.meta.url)), "..");

function envVal(name: string): string | undefined {
  if (process.env[name]) return process.env[name];
  try {
    const env = readFileSync(join(portalRoot, ".env.local"), "utf8");
    for (const line of env.split("\n")) {
      const t = line.trim();
      if (t.startsWith(`${name}=`)) return t.slice(name.length + 1);
    }
  } catch {
    /* no .env.local */
  }
  return undefined;
}

const apiKey = envVal("ELEVENLABS_API_KEY");
const agentId = envVal("ELEVENLABS_AGENT_ID");
if (!apiKey || !agentId) {
  console.error("Missing ELEVENLABS_API_KEY / ELEVENLABS_AGENT_ID (env or .env.local).");
  process.exit(1);
}

const body = {
  conversation_config: {
    agent: {
      language: "tr",
      first_message: FIRST_MESSAGE,
      // Resume context (KAR-26). Default keeps the prompt valid when no value is
      // passed (e.g. simulate-conversation); the client passes the real summary.
      dynamic_variables: {
        dynamic_variable_placeholders: { collected_summary: "Henüz bilgi toplanmadı." },
      },
      prompt: {
        prompt: SYSTEM_PROMPT_V2,
        llm: "claude-sonnet-4-5", // preserve Claude brain (ADR-0003)
        tools: MEETING_TOOLS,
      },
    },
  },
};

const res = await fetch(`https://api.elevenlabs.io/v1/convai/agents/${agentId}`, {
  method: "PATCH",
  headers: { "xi-api-key": apiKey, "Content-Type": "application/json" },
  body: JSON.stringify(body),
});

if (!res.ok) {
  console.error("PATCH failed", res.status, (await res.text()).slice(0, 800));
  process.exit(1);
}

const data = (await res.json()) as {
  conversation_config?: { agent?: { prompt?: { llm?: string; tools?: { name: string }[] } } };
};
const prompt = data.conversation_config?.agent?.prompt;
console.log("agent updated:", agentId);
console.log("llm:", prompt?.llm);
console.log("tools:", (prompt?.tools ?? []).map((t) => t.name).join(", "));
