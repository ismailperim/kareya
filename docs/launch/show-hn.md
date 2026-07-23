# Show HN — başlık + metin + ilk yorum

> HN kuralları: samimi, teknik, pazarlama dili sıfır, sınırlamaları itiraf
> et. Başlık 80 karakter altı, "Show HN:" ile başlar. En iyi saat: Salı–Perşembe,
> 15:00–17:00 TR (08:00–10:00 ET).

## Başlık varyantları (birini seç)

1. **Show HN: Kareya – open-source AI web agency that interviews you by voice** *(önerilen — "interviews you by voice" ayrıştırıcı)*
2. Show HN: An AI agency that talks to your customer, then writes their site's code
3. Show HN: Open-source AI web agency – voice meeting in, real Astro repo out

## Gönderi metni

---

Hi HN — I run a one-person web agency in Turkey and have built ~500 small-business sites over the years. The bottleneck was never the code; it was the meetings, the briefs, the "can you change that text" emails. So I built the agency itself as software, and I'm open-sourcing it.

How it works: the customer joins a browser meeting room and has a real voice conversation (Turkish, ElevenLabs for speech + Claude as the brain). The AI consultant interviews them for 15–30 minutes and fills a structured brief live while they talk. When the brief is approved, a pipeline generates the site — and this is the part I care about most: **Claude writes actual Astro component code per project**, not config for a template engine. The generated repo belongs to the customer (`npm install && npm run build` anywhere).

Letting an LLM write production code for non-technical customers sounds like the builder.ai story, so the whole system is built around not trusting it:

- Rewritten components must pass `astro build` in an isolated worktree, then a content check (business name, services, phone must survive in the built HTML). One retry with the error fed back; then it falls back to a deterministic component kit. A broken build can never reach a customer.
- Content lives in `site.json`; components only read props. "Change the headline" patches data; "make it feel more premium" patches code — through the same gates.
- Customer revision text is treated as data, never as instructions (prompt-injection).
- Money, DNS, deploys never touch an LLM.

Everything is boring on purpose: a Postgres job queue with `SKIP LOCked` claims, a typed phase machine, one stateless runner binary (`RUNNER_ROLE=writer|builder` if you want to split the LLM work from builds).

Honest limitations: the voice consultant is Turkish-only for now (my market), design variety is bounded by what the design pass dares to do, and a human (me) still approves briefs and go-lives — that's a feature at this stage, not a gap.

Repo: https://github.com/ismailperim/kareya — demo video in the README. Happy to answer anything about the voice stack, the build gates, or the economics of an AI agency.

---

## İlk yorum (sen atacaksın — mimari derinlik)

---

Some architecture notes for the curious:

The core decision was separating "who decides" from "who executes". A typed phase machine (BRIEF → BUILDING → PREVIEW_READY → LIVE → CARE) owns control flow; LLMs are stateless workers invoked at specific steps. The voice agent can only fill the brief and navigate — it cannot price, promise, or deploy.

Generation is a chain: deterministic assembler (brief → site.json) → LLM copy polish (structure-locked, provider fallback Gemini→Claude) → stock photos → a deterministic Astro kit (content/presentation split) → the "design pass" where Claude rewrites 3–6 components for that specific business. Brand palette, photos, and the chosen design are pinned after the first build, so rebuilds don't re-roll the customer's site.

The design pass prompt gets the business character (sector, tone, interview notes) and the kit source, and must output full files through a fenced protocol. Validators reject: paths outside the component allowlist, `<script>`, external URLs, and components that lose their data wiring. Then the build+content gates run. In practice Sonnet passes on the first attempt most of the time; the fallback exists for the days it doesn't.

The runner is a single Node binary against Neon's HTTP driver — no interactive transactions, so queue claims are single-statement `UPDATE … WHERE id = (SELECT … FOR UPDATE SKIP LOCKED)`. Same image runs as `writer` (needs LLM keys) or `builder` (only DB+R2) for least-privilege splitting.

---

## Cevap nöbeti notları

- İlk 2 saat kritik — her teknik soruya hızlı, dürüst, spesifik cevap.
- "Template engine'den farkı ne?" → design pass gerçek kod yazar; sources/
  linki göster (canlı manifest).
- "Neden AGPL?" → hosted kopyalamayı açık tutmak; müşteri sitelerinin
  kendisi kısıtsız.
- "Maliyet?" → site başına ilk build ~1 Sonnet çağrısı + görüşme dakikaları;
  rakamları açıkça paylaş.
- Downvote/negatif yoruma savunmaya geçme; teknik olanı cevapla, gerisini bırak.
