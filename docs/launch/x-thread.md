# X (Twitter) Thread — EN

> Show HN ile aynı gün, HN gönderisinden ~1 saat sonra at. Video Sahne
> 3+5+6 kısa kesitini (≤45 sn) tweet 1'e göm. Her tweet tek başına
> anlaşılır olmalı.

**1/**
I've built ~500 websites for small businesses. The code was never the hard part — the meetings were.

So I turned the entire agency into open-source software. Voice meeting in → real code out.

Watch: [video]

**2/**
The customer joins a browser room and just… talks.

An AI consultant (ElevenLabs voice + Claude brain) interviews them for 15–30 min — in Turkish — and fills a structured brief live on screen while they speak.

No forms. No editor. No blank canvas.

**3/**
When the brief is approved, Claude writes actual Astro component code for THAT business.

Not "template + your text". A law firm gets sharp corners and a numbered service list; a bakery gets warm, round, photo-first. Same pipeline, different code.

**4/**
"LLM writes production code for non-technical customers" = how builder.ai died.

So nothing ships without passing:
→ `astro build` in an isolated worktree
→ a content check (name, services, phone must survive)
→ one retry with the error fed back
→ else: deterministic kit fallback

**5/**
Revisions are messages.

"Change that headline" → patches site.json
"Make it feel more premium" → patches component code

Both go through the same gates. The customer's words are treated as data, never as instructions (prompt-injection safe).

**6/**
The customer owns the repo. `sources/<slug>/` on R2 is a complete Astro project — clone it, `npm run build`, host it anywhere. No lock-in, by design.

**7/**
The boring parts are deliberately boring: Postgres job queue (SKIP LOCKED), typed phase machine, one stateless runner binary. LLMs decide content and design. Deterministic code touches money, DNS, deploys.

**8/**
It's AGPL, self-hostable, and I built it in the open with an AI dev team (the operating model is in the repo too — `.claude/`).

Star it, fork it, run your own AI agency:
https://github.com/ismailperim/kareya

Feedback very welcome 🙏

---

## Teaser takvimi (launch öncesi, opsiyonel)

- **T-2 gün:** Sahne 3 GIF'i tek başına — "an AI consultant taking live
  notes while the customer talks" + "open-sourcing this week"
- **T-1 gün:** hukuk bürosu vs pastane karşılaştırma ekran görüntüsü —
  "same pipeline, different code"
- **T günü:** thread.
