# ADR-0003: Voice agent vendor — ElevenLabs Agents (BYO-LLM Claude)

- **Status:** Accepted
- **Date:** 2026-07-09
- **Deciders:** İsmail Perim
- **Related ticket:** KAR-12

## Context

The meeting room needs a voice layer: speech-to-text (STT), text-to-speech (TTS), and turn-taking / barge-in. We buy this — do not DIY turn-taking. Two hard constraints shape the choice:

1. **The brain must stay Claude.** DESIGN's core principle is "the LLM decides"; the in-call agent runs on Claude, not a vendor-bundled model.
2. **Turkish voice quality is critical.** Customers are Turkish SMB owners; the voice must sound natural in Turkish.

The vendor must sit behind a `MeetingSession` abstraction so it can be swapped later. Research and comparison table: KAR-12.

## Options considered

1. **ElevenLabs Agents + BYO-LLM (Claude)** — managed STT+TTS+turn-taking; best-in-class Turkish voices (native + İstanbul accent), Flash v2.5 (~75ms); BYO-LLM keeps Claude as the brain; ready widget/SDK, fastest to ship. ~$0.08/min platform + Claude tokens. Trade-off: medium vendor lock at the orchestration layer.
2. **OpenAI Realtime (gpt-realtime)** — GA, native WebRTC/WS/SIP, strongest tool-calling + remote MCP. But it is a **speech-to-speech single model**: the brain is GPT, not Claude — conflicts with constraint 1. Turkish output quality unproven. ~$0.30/min all-in.
3. **Vapi (orchestrator)** — most flexible: bring your own STT/TTS/LLM (Claude + ElevenLabs + Deepgram). Preserves the Claude brain and Turkish quality, but more moving parts than the MVP needs. ~$0.05/min platform + components ($0.15–0.40 all-in).
4. **Deepgram STT + separate TTS + own turn-taking** — strong Turkish STT (sub-300ms streaming), but forces DIY turn-taking and stack assembly. Slowest path; rejected.

## Decision

**Option 1 — ElevenLabs Agents with BYO-LLM = Claude.**

The decisive axis is "the brain must be Claude," which eliminates OpenAI Realtime (its brain is necessarily GPT). Among the remaining Claude-brain options, ElevenLabs Agents wins for the MVP: best Turkish voice (the critical criterion), managed turn-taking, fastest widget/SDK path, and lowest integration effort. KAR-14 already starts on ElevenLabs.

All of it stays behind the `MeetingSession` abstraction, keeping migration open to **Vapi** (if finer stack control is needed) or **OpenAI Realtime** (if Turkish quality is proven and a GPT brain becomes acceptable).

## Consequences

- **Positive:** high Turkish voice quality, managed turn-taking (no DIY), Claude preserved as the brain, fastest route to a working voice test, reasonable MVP cost (~$0.08/min + Claude tokens).
- **Negative / trade-offs:** medium vendor lock at the orchestration layer (mitigated by `MeetingSession`); BYO-LLM wiring to Claude must be verified during setup — ElevenLabs Agents also ships its own LLM, so confirm the Claude path in the KAR-14 spike.
- **Follow-ups:** KAR-14 (`MeetingSession` abstraction + ElevenLabs adapter + BYO-Claude verification + first real voice test); an optional later Vapi/OpenAI comparison spike if the orchestration lock or Turkish quality becomes a concern.
