# Git Konvansiyonları

## Branch isimlendirme

Format: **`<type>/kar-<numara>-<kisa-baslik>`**

```
<type>/kar-<numara>-<kisa-baslik>
örn: feature/kar-12-hero-section
     fix/kar-15-brief-schema-validation
     chore/kar-3-repo-bootstrap
```

- `<type>`: işin türü — `feature`, `fix`, `chore`, `refactor`, `docs`, `test`, `perf`. Ticket'ın tip label'ıyla uyumlu (Feature→`feature`, Bug→`fix`, Improvement→`refactor`/`chore`).
- `kar-<numara>`: Linear issue id; **branch'te bulunması şart** — otomatik linkleme bununla olur.
- `<kisa-baslik>`: kebab-case, kısa, İngilizce.
- Branch adını **biz üretiriz**; Linear'ın kullanıcı-prefix'li ("magic branch") adını **kullanmayız**. Linear yine otomatik bağlar: (a) branch'te `kar-<n>` geçer, (b) PR body'sinde `Fixes KAR-x` vardır.
- `main` korumalıdır; doğrudan push yok, her şey PR ile.
- Tek ticket = tek branch.

## Commit mesajları

[Conventional Commits](https://www.conventionalcommits.org/) kullanılır. Mesaj **İngilizce**:

```
<type>(<scope>): <kısa açıklama>

[opsiyonel gövde]
```

**type:** `feat`, `fix`, `chore`, `refactor`, `docs`, `test`, `perf`, `build`, `ci`
**scope (opsiyonel):** etkilenen alan (`portal`, `kit`, `orchestration`, `meeting`, `schema`, `infra`…)

Örnekler:
```
feat(kit): add hero-image section variant
fix(schema): tighten Site JSON page enum
chore: configure linear mcp
docs: add workflow conventions
```

- Küçük, odaklı commit'ler. Bir commit bir mantıksal değişiklik.
- Imperative mood ("add", "fix" — "added", "fixes" değil).

## Pull Request

- **Başlık:** ne yaptığını net anlatır (Conventional Commits formatı tercih edilir).
- **Body:**
  - `Fixes KAR-<numara>` (ticket'ı otomatik kapatır).
  - Kısa "ne / neden" özeti.
  - Varsa test/doğrulama notu, ekran görüntüsü.
- PR küçük tutulur; büyürse ticket sub-issue'lara bölünür.
- Co-author satırı (commit'lerde):
  ```
  Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>
  ```

## PR body şablonu

```markdown
## Ne
<değişikliğin özeti>

## Neden
Fixes KAR-<numara>

## Nasıl test edildi
<adımlar / sonuç>
```
