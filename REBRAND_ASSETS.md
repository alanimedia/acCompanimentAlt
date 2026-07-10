# AV Cueboard — Rebrand Assets & Logo Selection

> **Purpose:** Narrow down icon and logo direction **before** implementing in v1.10.0.  
> **Status:** **Approved** — Option A v2 (`concept-a-cue-grid-v2.png`) for v1.10.0 production export.  
> **Last updated:** 2026-07-10

Use this doc to pick a direction, then hand the winner to implementation (or commission final vector art from the chosen concept).

---

## How to use this doc

1. Review **current baseline** and **concepts A–D** below (open images in `assets/rebrand-candidates/`).
2. Score each option in the **selection scorecard** (§5).
3. Pick one app icon direction + decide wordmark approach (§4).
4. Tick **Phase 0 decision** in [REBRAND_PLAN.md](REBRAND_PLAN.md): ship 1.10.0 with chosen art, or keep baseline and iterate in 1.10.1.
5. When ready, follow **implementation checklist** (§6).

**Note:** Concept images in `rebrand-candidates/` are AI-generated explorations — good for direction, not necessarily pixel-perfect for production. A designer (or a follow-up pass) should export final `icon.png` (1024×1024), `icon.ico` (multi-size), and optional SVG wordmark.

---

## 1. Where assets are used today

| Surface | File / location | Size notes |
|---|---|---|
| Windows installer / taskbar | `assets/icons/icon.ico` | electron-builder; multi-resolution ICO |
| macOS / Linux app bundle | `assets/icons/icon.png` | 512×512 minimum; 1024×1024 recommended |
| Electron main window (macOS dock) | From `productName` + icon above | — |
| In-app header | `index.html` → `assets/icons/icon.png` | `.app-icon-title` in layout CSS |
| Web remote | `remote.html` favicon + header icon | Same `icon.png` |
| GitHub repo social preview | Optional `assets/social-preview.png` | 1280×640 (not created yet) |
| Companion module | Bitfocus module icon (from manifest/build) | Often 256×256 PNG in module repo |
| README / docs | Wordmark or icon + text | Horizontal logo preferred |

---

## 2. Current baseline (acCompaniment)

**File:** [`assets/icons/icon.png`](assets/icons/icon.png) (also copied to [`assets/rebrand-candidates/baseline-current-icon.png`](assets/rebrand-candidates/baseline-current-icon.png))

**Description:** Dark circle, white ring, red “live” dot, three white broadcast/signal arcs.

**Pros**

- Already wired through build (`package.json` → `build.mac/win/linux.icon`)
- Recognizable at small sizes
- Matches “live / on-air” cue metaphor

**Cons**

- Tied to acCompaniment / HighPass era visually
- Does not suggest “cue board” or Stream Deck grid
- Large PNG (~1 MB) — could be optimized on export

**Option E — Keep baseline for v1.10.0:** Zero art risk; rebrand is name/copy only. New icon in 1.10.1+.

---

## 3. App icon concepts (pick one direction)

Open all images side-by-side:

```
assets/rebrand-candidates/
├── concept-a-cue-grid-v2.png      ← Option A ★ LEADING (refined)
├── concept-a-cue-grid.png         ← Option A v1
├── baseline-current-icon.png      ← Option E (keep)
├── concept-b-wave-cue.png         ← Option B
├── concept-c-cue-list.png         ← Option C
├── concept-d-evolved-broadcast.png ← Option D
└── concept-wordmark-horizontal.png ← Wordmark (§4)
```

### Option A — Cue grid (Stream Deck) ★ **Selected direction**

**Leading file:** `concept-a-cue-grid-v2.png`  
**Earlier explore:** `concept-a-cue-grid.png`

**Idea:** 2×2 grid of rounded cue buttons — mirrors the in-app cue board and Stream Deck layout. Each cell uses a **different color** so the icon reads as a live UI, not a flat logo:

| Cell | Color | Suggested meaning |
|---|---|---|
| Top-left | Amber `#e8a838` | Active / playing cue |
| Top-right | Teal `#2dd4bf` | Cued / ready |
| Bottom-left | Purple `#a78bfa` | Idle / configured |
| Bottom-right | Blue-gray `#4b5563` | Empty / stopped |

**Audio layer:** A horizontal **waveform passes behind** the button grid (left-to-right), partially visible around/under the cells — ties “cue board” to “sound” without cluttering the foreground.

**Best if:** Distinct break from acCompaniment; strong Companion / Stream Deck association; previews what the product actually looks like.

**Watch at small size:** At 32×32, wave may need simplification to 2–3 bumps; four button colors should stay distinguishable (test in implementation export).

**Still to refine (optional):** v3 with stronger wave contrast, or wave only on bottom third if v2 feels busy at favicon size.

---

### Option B — Wave + playhead

**File:** `concept-b-wave-cue.png`

**Idea:** Horizontal waveform with vertical cue/playhead line; red live dot.

**Best if:** You want “audio engine” first, theatre/QLab-adjacent, less “button grid.”

**Watch at small size:** Playhead line must not disappear on taskbar icons.

---

### Option C — Cue list stack

**File:** `concept-c-cue-list.png`

**Idea:** Stacked horizontal bars = cue list; top cue “armed” in amber; red go dot.

**Best if:** You want the product metaphor (ordered cues) without looking like Stream Deck.

**Watch at small size:** Three bars may merge — may need simplification to two bars for favicon.

---

### Option D — Evolved broadcast (refresh current)

**File:** `concept-d-evolved-broadcast.png`

**Idea:** Same red-dot + arcs language as today, refined (amber accent arc, cleaner ring).

**Best if:** You want continuity for existing users and minimal “what app is this?” friction.

**Watch at small size:** Close to baseline — lowest migration surprise.

---

### Option E — Keep current (no new art in 1.10.0)

**File:** `baseline-current-icon.png`

Ship rebrand with existing `icon.png` / `icon.ico`; replace art in a follow-up release.

---

## 4. Wordmark & logo lockups

### Wordmark concept (horizontal)

**File:** `concept-wordmark-horizontal.png`

**Idea:** “AV” in amber, “Cueboard” in white; optional tagline “Live audio cues.”

**Usage:** README header, GitHub About image, future `avcueboard.app`, release banner.

### Lockup options to decide

| Lockup | Use | Status |
|---|---|---|
| Icon only | App icon, favicon, Companion module | Concepts A–E |
| Icon + wordmark horizontal | README, website | `concept-wordmark-horizontal.png` |
| Icon + wordmark stacked | Posters, splash (optional) | Not generated yet |
| “Alani Media” sub-brand mark | Companion manufacturer row | Optional; can be text-only |

**Typography (if refining in Figma/Illustrator):** Prefer neutral sans (Inter, SF Pro, Segoe UI). Avoid decorative theatre fonts in the UI; save personality for marketing one-pagers.

---

## 5. Selection scorecard

Rate each **1–5** (5 = best). Add notes in the right column.

| Criterion | A Grid | B Wave | C List | D Evolved | E Keep |
|---|---|---|---|---|---|
| Readable at 32×32 (taskbar) | | | | | |
| Distinct from acCompaniment | | | | | |
| Says “live audio cues” | | | | | |
| Companion / Stream Deck fit | | | | | |
| Works on dark UI header | | | | | |
| Production effort (5 = easiest) | | | | | |
| **Total** | | | | | |

**Your pick (fill in):**

- [x] App icon direction: **A — cue grid** (`concept-a-cue-grid-v2.png`) — **approved**
- [ ] Wordmark: Use concept / Text-only in UI / Defer to 1.10.1
- [x] Ship icon in **v1.10.0** (export to `assets/icons/` during rebrand implementation)
- [x] v2 approved as-is

---

## 6. Color palette (starting point)

Use consistently across icon, wordmark, and optional UI accents (not a full theme rewrite).

| Role | Hex | Notes |
|---|---|---|
| Background dark | `#1a1a1e` | App chrome, icon bg |
| Surface | `#2a2a30` | Cards, panels |
| Accent / “active cue” | `#e8a838` | Amber gold — cue armed, highlights |
| Live / record dot | `#e53935` | Keep red “on air” DNA from baseline |
| Text primary | `#f5f5f5` | |
| Text muted | `#9aa0a6` | Taglines, secondary |

**Avoid:** Pure Bitfocus orange, Elgato blue — don’t look like official partner branding.

---

## 7. Implementation checklist (after you pick)

**Icon locked:** `concept-a-cue-grid-v2.png` → production assets for v1.10.0.

When the rebrand implementation runs:

- [ ] Resize/optimize v2 → **`assets/icons/icon.png`** (1024×1024 PNG)
- [ ] Generate **`assets/icons/icon.ico`** (256, 128, 64, 48, 32, 16) from v2
- [ ] Update `index.html` / `remote.html` alt text → “AV Cueboard”
- [ ] Optional: `assets/social-preview.png` for GitHub (1280×640, v2 + wordmark)
- [ ] Companion module: matching 256×256 module icon in Bitfocus repo
- [ ] Verify `npm run dist:win` / mac build shows new icon in installer
- [ ] Note in `changelog.md` under 1.10.0: new AV Cueboard icon

---

## 8. Generating more concepts (optional)

To explore more directions, note briefs here and regenerate:

| Brief | Status |
|---|---|
| Monogram “AV” only (no grid) | Not started |
| Light-mode icon variant (for macOS light dock) | Not started |
| Monochrome icon for Windows tile | Not started |
| Alani Media maker mark | Not started |

---

## 9. Related docs

- [REBRAND_PLAN.md](REBRAND_PLAN.md) — full rebrand execution (Phase 0 icon decision)
- `assets/rebrand-candidates/` — concept images for this doc
- `assets/icons/` — **production** icons (do not replace until decision is final)
