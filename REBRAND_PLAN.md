# AV Cueboard — Full Rebrand Plan

> **Status:** Planning — not yet executed  
> **Target release:** v1.10.0 (market as **AV Cueboard v1**)  
> **Last updated:** 2026-07-10

This document captures the step-by-step plan to rebrand from **acCompaniment** to **AV Cueboard**. Review and confirm Phase 0 decisions before implementation begins.

---

## 0. Lock naming conventions (decide once)

| Use | Value | Example |
|---|---|---|
| **Display name** (UI, installers, window title) | `AV Cueboard` | “AV Cueboard - My Show.cues” |
| **Technical slug** (npm, repos, IDs) | `avcueboard` | `alanimedia/avcueboard` |
| **PascalCase** (product lists) | `AVCueboard` | Companion `products: ["AVCueboard"]` |
| **Company / manufacturer** | `Alani Media` | Companion, `publisherName`, website |
| **Author / owner** | `Omar Gadahn` | `package.json` author; Marcin stays in `NOTICE` |
| **Website** | `https://alani.media` | `homepage`, README, Help → Learn More |
| **appId** | `com.alanimedia.avcueboard` | Replaces `com.highpass.acCompaniment` |
| **Tagline** (README, GitHub, module) | *Live audio cue playback for Bitfocus Companion and Stream Deck* | Not in legal product name |

**Version:** `1.10.0` — continues the 1.x semver line after acCompaniment `1.9.2`; market the release as **AV Cueboard v1** in README/release titles. Semver stays `1.10.0` everywhere (About, tags, changelog).

**Why not 1.0.0?** Tags `v1.0.0`–`v1.9.2` already exist on the app repo. `1.10.0` avoids tag collision, preserves GitHub history via rename, and semver correctly treats `1.10.0 > 1.9.2` for updaters.

---

## 1. Inventory (what actually changes)

### Electron app (`acCompanimentAlt`) — ~20 source files

| Area | Files | Changes |
|---|---|---|
| **Package / build** | `package.json` | `name`, `description`, `author`, `homepage`, `repository`, `productName`, `appId`, `publisherName`, `maintainer`, `publish.repo`, `version` → `1.10.0` |
| **Main process** | `main.js` | Window title, macOS `app.setName`, Help → Learn More URL |
| **UI** | `index.html`, `remote.html` | `<title>`, headers, alt text |
| **Workspace** | `workspaceManager.js` | Window title prefix |
| **Updater** | `autoUpdaterService.js`, `updateCheckUtils.js` | Dialog copy, repo slug, User-Agent |
| **Stale bug** | `ipcHandlers.js` | Still points at `mko1989/acCompaniment` — fix to `alanimedia/avcueboard` |
| **Drag-drop MIME** | `cueGrid.js`, `cueGridSections.js`, `dragDropHandler.js`, `remote.html` | `application/x-accompaniment-*` → `application/x-avcueboard-*` (internal only) |
| **Docs** | `README.md`, `changelog.md` | Full rewrite + fork credit |
| **Legal** | `LICENSE`, `NOTICE` (new) | MIT + Marcin Wardecki attribution |
| **Comments** | Various file headers | Optional cleanup |

**Do not change:** `audioLoudnessMeter.js` line `highPass.type = 'highpass'` — audio DSP, not branding.

### Companion module — 7+ files

| File | Changes |
|---|---|
| `companion/manifest.json` | **New** `id`, `name`, `manufacturer`, `products`, `keywords`, `repository`, `legacyIds` |
| `package.json` | `name`, `description`, `version` → `1.10.0` |
| `config.js` | Field labels |
| `main.js`, `feedbacks.js` | Log/description strings |
| `README.md`, `companion/HELP.md` | Full update |

### GitHub / infra (manual, outside code)

| Item | Current | Target |
|---|---|---|
| App repo | `alanimedia/acCompanimentAlt` | `alanimedia/avcueboard` (rename) |
| Module repo | `alanimedia/acCompanimentAlt-companion-module` | `bitfocus/companion-module-alanimedia-avcueboard` (new Bitfocus repo — see §2.C) |
| Module registry ID | `highpass-accompaniment` / HighPass | `alanimedia-avcueboard` / Alani Media (**separate** Connections listing) |
| GitHub topics | (unset) | `bitfocus-companion`, `stream-deck`, `audio-cues`, etc. |

---

## 2. Critical migration decisions

### A. `appId` change → new userData folder

Electron stores config/cues under a path derived from the app name:

| OS | Today | After rebrand |
|---|---|---|
| Windows | `%APPDATA%\acCompaniment` | `%APPDATA%\AV Cueboard` (or similar) |
| macOS | `~/Library/Application Support/acCompaniment` | `~/Library/Application Support/AV Cueboard` |
| Linux | `~/.config/acCompaniment` | `~/.config/AV Cueboard` |

**Plan:** Add a **one-time migration** in `main.js` (before `loadConfig`):

1. Detect old userData path (hardcode legacy names: `acCompaniment`, `accompaniment`).
2. If new path is empty and old path has `config.json` / `cues.json`, copy the directory.
3. Log success; never overwrite if new path already has data.

This is the highest-risk item — worth a dedicated test on Windows before release.

### B. Auto-updater from 1.9.x → 1.10.0

- `appId` change may still prevent seamless in-app update from old installs.
- Semver is correct: `1.10.0 > 1.9.2` — Windows `electron-updater` and Help → Check for Updates will see it as newer.
- **Plan:** Release notes: *“AV Cueboard v1 (1.10.0) — rebrand of acCompaniment. Install over 1.9.x; settings migrate automatically.”*
- `publish.repo` must match renamed repo **before** tagging `v1.10.0`.
- Keep `releaseType: "release"` and the CI `publish` job.

### C. Companion module — new separate listing (clean start, no `legacyIds`)

**Yes — skip `legacyIds`.** Brand-new **Alani Media → AVCueboard** listing; users add the connection fresh.

**Current situation:** Your repo (`alanimedia/acCompanimentAlt-companion-module`) still uses manifest `id: "highpass-accompaniment"`. Manual version submissions update the **HighPass** module identity — not your own product listing.

**Target:** New module via Bitfocus **First Release** — `legacyIds: []` (no connection migration).

```json
{
  "id": "alanimedia-avcueboard",
  "name": "avcueboard",
  "shortname": "avcueboard",
  "description": "Connects to AV Cueboard via websocket",
  "manufacturer": "Alani Media",
  "products": ["AVCueboard"],
  "legacyIds": [],
  "keywords": ["AVCueboard", "Audio Cues", "Soundboard", "Stream Deck", "Bitfocus Companion", "Live Audio"]
}
```

**Why no `legacyIds`:** No user base to migrate; simpler Bitfocus request; upstream HighPass module stays independent. Same websocket protocol — you re-enter IP/port when testing. **App userData migration (§2.A) is separate** (desktop app upgrades from 1.9.x).

**Bitfocus repo naming (required for store):** Manifest `id` must match the GitHub repo basename after stripping the `companion-module-` prefix. So:

| Field | Value |
|---|---|
| GitHub repo | `bitfocus/companion-module-alanimedia-avcueboard` |
| Manifest `id` | `alanimedia-avcueboard` |

**Manual steps for Companion module (you — before/at release):**

1. **Slack (#module-development):** Request `alanimedia-avcueboard` for **AV Cueboard** (Alani Media). New module, same websocket protocol. Not replacing upstream HighPass. **No legacyIds.**
2. **Wait for Bitfocus** to create `bitfocus/companion-module-alanimedia-avcueboard` (or approve your org repo — follow their guidance).
3. **Push rebrand code** to that repo (agent prepares the code; you push to the Bitfocus repo).
4. **Stop submitting** new versions to the `highpass-accompaniment` listing in the [Developer Portal](https://developer.bitfocus.io/).
5. **Tag** `v1.10.0` on the module repo.
6. **Developer Portal** → My Connections → select **alanimedia-avcueboard** → Submit Version → choose tag `v1.10.0` → wait for volunteer review.
7. **After approval:** New **Alani Media → AVCueboard** listing on Connections page.

**When testing:** Remove old `highpass-accompaniment` connection → add new module → enter IP/port.

**Note:** The original HighPass module (`bitfocus/companion-module-highpass-accompaniment`) may remain on the store for users still on Marcin’s upstream app. Your listing is for AV Cueboard.

### D. Repo rename timing (app)

**Efficient order:**

1. Commit all rebrand code to `main` on **current** repo name.
2. Rename GitHub app repo → `avcueboard` (GitHub auto-redirects old URLs).
3. Update local `origin` remote.
4. Tag `v1.10.0` and push (CI builds with correct publish target).
5. Companion module: push to **Bitfocus** repo (separate from app rename).

Renaming **before** the code commit works too, but committing first avoids a window where `package.json` still says `acCompanimentAlt` while the repo is already `avcueboard`.

### E. Local Windows folders (match app naming)

**Layout:** Both projects live under **`d:\avcueboard\`**:

| Path | Project |
|---|---|
| `d:\avcueboard\avcueboard\` | Electron app (git → `alanimedia/avcueboard` after rename) |
| `d:\avcueboard\avcueboard-companion-module\` | Companion module |
| `d:\avcueboard\avcueboard.code-workspace` | Open both folders in Cursor/VS Code |

**When to set up:** Before starting the agent. Close Cursor before moving if folders are locked.

**Reopen:** File → Open Workspace from File → `d:\avcueboard\avcueboard.code-workspace`

**Note:** Local layout is independent of GitHub repo rename. `origin` may still point at `alanimedia/acCompanimentAlt` until release day.

---

## 3. Execution phases

### Phase 0 — Pre-flight (review before coding)

- [x] Confirm display name: **AV Cueboard**
- [x] Confirm company: **Alani Media** ([alani.media](https://alani.media))
- [x] Confirm author: **Omar Gadahn** (owner; Marcin stays in `NOTICE`)
- [ ] Confirm **email** for `package.json` / `maintainer` (or use a public contact from alani.media)
- [x] Confirm version: **1.10.0** (market as AV Cueboard v1)
- [x] Confirm app strategy: **rename** `acCompanimentAlt` → `avcueboard` (GitHub + local `d:\avcueboard`)
- [x] Confirm module strategy: **new Bitfocus module** `alanimedia-avcueboard` — **no `legacyIds`** (clean start)
- [x] **Icon / logo:** **Approved** — `concept-a-cue-grid-v2.png` → ship in v1.10.0 ([REBRAND_ASSETS.md](REBRAND_ASSETS.md))
- [ ] Domain: register `avcueboard.app` now or later?
- [ ] **Post in #module-development Slack** for new module repo (can do before agent starts)

### Phase 1 — Foundation (efficiency win)

**Create a single branding module** so we never hunt strings again:

`src/shared/branding.js`:

```js
module.exports = {
  displayName: 'AV Cueboard',
  slug: 'avcueboard',
  companyName: 'Alani Media',
  companyUrl: 'https://alani.media',
  authorName: 'Omar Gadahn',
  repo: 'alanimedia/avcueboard',
  moduleRepo: 'bitfocus/companion-module-alanimedia-avcueboard',
  moduleId: 'alanimedia-avcueboard',
  legacyAppNames: ['acCompaniment', 'accompaniment'],
};
```

Use it in `main.js`, `workspaceManager.js`, `updateCheckUtils.js`, updater dialogs.

**Add legal files:**

- `LICENSE` — standard MIT (Marcin's copyright for original + yours for modifications, or dual notice)
- `NOTICE` — fork credit: *Based on acCompaniment by Marcin Wardecki (mko1989/acCompaniment), MIT licensed.*

### Phase 2 — Electron app rebrand (one PR)

**2a. `package.json` / build config**

- All identity fields (see inventory)
- `version`: `1.10.0`
- `keywords`: add `bitfocus-companion`, `stream-deck`, `live-audio`, `theatre`

**2b. UI strings**

- `index.html`, `remote.html`, `main.js`, `workspaceManager.js`, `autoUpdaterService.js`

**2c. Internal MIME types** (safe in same release)

- `application/x-avcueboard-cue-ids`
- `application/x-avcueboard-section-id`

**2d. userData migration** (`main.js` or `src/main/userDataMigration.js`)

**2e. Fix stale update URL** in `ipcHandlers.js`

**2f. README** — SEO-first opening:

```markdown
# AV Cueboard

Live audio cue software for **Bitfocus Companion** and **Elgato Stream Deck**.

> Formerly **acCompaniment** — fork of [mko1989/acCompaniment](...).
```

Include: 5-minute Companion setup, comparison vs MultiPlay, migration note for 1.9.x users.

**2g. `changelog.md`** — v1.10.0 section only (when releasing)

**Do not touch:** `dist/`, `node_modules/` — rebuilt by CI.

### Phase 3 — Companion module (parallel with Phase 2)

**3a. Manifest** — new id + empty `legacyIds` + manufacturer + keywords (see §2.C)

**3b. Config labels** — `AV Cueboard IP Address`, `AV Cueboard Port`

**3c. Logs / feedbacks / HELP.md / README** — align with app repo URLs

**3d. Module version** — `1.10.0` (aligned with app)

**3e. Publish** — push to `bitfocus/companion-module-alanimedia-avcueboard`; submit **first release** via Developer Portal

### Phase 4 — GitHub infrastructure

| Step | Action |
|---|---|
| 4.1 | Merge rebrand PR to `main` |
| 4.2 | Rename `acCompanimentAlt` → `avcueboard` |
| 4.3 | Set GitHub repo description + topics (from discoverability analysis) |
| 4.4 | Pin a “Companion setup” release asset or README section |
| 4.5 | (Module) Push module code to Bitfocus repo when available |

**Suggested GitHub description:**

```
Live audio cue playback for Bitfocus Companion & Stream Deck. Free, cross-platform, web remote, waveforms, crossfade, ducking.
```

**Suggested GitHub topics:**

```
bitfocus-companion, stream-deck, audio-cues, live-audio, theatre, soundboard, electron, av, cue-playback, osc, http-remote
```

### Phase 5 — Release & verify

| Step | Action |
|---|---|
| 5.1 | Tag app `v1.10.0`, push tag |
| 5.2 | CI builds Windows/macOS/Linux; `publish` job marks release public |
| 5.3 | Verify `latest.yml` on GitHub release (Windows updater) |
| 5.4 | Mark GitHub release **Latest** |
| 5.5 | Fresh install test — name, icon, paths |
| 5.6 | Upgrade test — install 1.10.0 over 1.9.2; confirm userData migration |
| 5.7 | Tag module `v1.10.0`; submit via Developer Portal |
| 5.8 | Companion test — add fresh **Alani Media → AVCueboard** connection; verify presets/feedback |
| 5.9 | Remote web UI shows “AV Cueboard” |
| 5.10 | Verify new listing on bitfocus.io/connections |

### Phase 6 — Discoverability (post-release, optional)

- [ ] Bitfocus connections page: manufacturer **Alani Media**, product **AVCueboard**
- [ ] Optional one-page site at `avcueboard.app` → GitHub releases
- [ ] Short demo video title: *“Stream Deck theatre audio cues — AV Cueboard + Bitfocus Companion”*
- [ ] One forum post (da-share / ControlBooth) — migration announcement, not spam

---

## 4. Efficiency principles

1. **One branding constants file** — avoids scattered string edits later.
2. **One PR for app, one for module** — reviewable, atomic.
3. **App repo rename after merge, before tag** — single source of truth for publish URLs.
4. **New Companion module ID** — separate store listing; `legacyIds: []` (clean start).
5. **userData migration in code** — avoids support burden.
6. **Ship new icon in v1.10.0** — from approved `concept-a-cue-grid-v2.png` (see [REBRAND_ASSETS.md](REBRAND_ASSETS.md))
7. **No git history rewrite** — forward-only; README handles “formerly acCompaniment”.
8. **Exclude `highpass` audio filter** from search-replace (use targeted edits, not blind replace).

---

## 5. Risk register

| Risk | Impact | Mitigation |
|---|---|---|
| Lost userData after upgrade | High | Migration on first launch + release notes |
| Updater won't chain 1.9→1.10 (appId) | Medium | “Install over existing” + migration |
| Companion module setup | Low | Fresh connection add; document IP/port in README |
| Bitfocus module review delay | Medium | Submit early; module works locally before approval |
| Wrong module listing updated | Medium | Stop submitting to `highpass-accompaniment`; use new portal entry |
| Old bookmarks dead | Low | GitHub redirects after app rename |
| Two installs side-by-side | Low | Different `appId` = expected |
| Cursor co-author on commits | Low | Existing `.githooks/commit-msg` rule |

---

## 6. Suggested timeline

| Session | Work | Duration |
|---|---|---|
| **Pre-flight** | Phase 0 + Slack module repo request | 15–30 min |
| **Session 1** | Phase 1 + 2 (app) + userData migration | ~2–3 hrs |
| **Session 2** | Phase 3 (module) | ~1 hr |
| **Session 3** | Phase 4–5 (rename, tag, test) | ~1 hr |
| **Waiting** | Bitfocus module review | days (volunteer) |
| **Later** | Phase 6 discoverability | Optional |

---

**`package.json` identity (agent will apply):**

```json
{
  "author": "Omar Gadahn, Alani Media",
  "homepage": "https://alani.media",
  "build": {
    "productName": "AV Cueboard",
    "appId": "com.alanimedia.avcueboard",
    "win": { "publisherName": "Alani Media" },
    "linux": { "maintainer": "Omar Gadahn <EMAIL_TBD>" }
  }
}
```

## 7. Open decisions (confirm before executing)

1. **Email** — contact for `package.json` / Linux `maintainer` (only remaining identity field)
2. **Windows install folder** — `AV Cueboard` (with space) is fine for `productName`; confirm OK with that path
3. **Domain** — `avcueboard.app` now or later? (website is [alani.media](https://alani.media))

**Resolved:**

- ~~Author~~ → **Omar Gadahn**, **Alani Media**
- ~~Company / website~~ → **Alani Media**, https://alani.media
- ~~Version~~ → **1.10.0**, market as AV Cueboard v1
- ~~Icon~~ → Option A v2 ([REBRAND_ASSETS.md](REBRAND_ASSETS.md))
- ~~App repo~~ → rename to `avcueboard`
- ~~Module~~ → new Bitfocus module `alanimedia-avcueboard`, no `legacyIds`

---

## 8. Manual checklist

### Do **now** (before you start the agent)

| # | Task | Why |
|---|---|---|
| 0 | **Open workspace** `d:\avcueboard\avcueboard.code-workspace` (see §2.E) | App + companion under one parent folder |
| 1 | **Bitfocus Slack** — post in `#module-development` requesting module `alanimedia-avcueboard` for **AV Cueboard** (Alani Media). New module, same websocket protocol. **No legacyIds.** | Module repo must exist before final publish; can take days |
| 2 | **Developer Portal** — sign in at [developer.bitfocus.io](https://developer.bitfocus.io/) with GitHub | Required to submit module v1.10.0 later |
| 3 | **GitHub** — confirm you have **admin** on `alanimedia` org (for repo rename after merge) | Agent cannot rename repos |
| 4 | **Email** — reply with address for `package.json` / Linux maintainer (or say “use hello@…” from site) | Last open identity field |
| 5 | **Optional:** draft release note one-liner for GitHub | Speeds up tag day |

**Slack message template (copy/paste):**

```
Hi — requesting a new Companion module repo for Alani Media.

GitHub user: <your-username>
Module name: alanimedia-avcueboard
Product: AV Cueboard (live audio cue app for Companion + Stream Deck)
Site: https://alani.media

Brand-new module for our AV Cueboard app. Same websocket protocol as
highpass-accompaniment but a separate listing — we are not replacing or
migrating from the upstream HighPass module. No legacyIds needed.

Thanks — Omar Gadahn, Alani Media
```

### Agent does (Phases 1–3) — **you start the agent**

- Branding module, app rebrand, userData migration, icon export, companion module code
- Does **not** rename GitHub repos, create Bitfocus repos, or submit Developer Portal

### Do **after** agent finishes (you — release day)

| # | Task |
|---|---|
| 1 | Merge rebrand PR to `main` |
| 2 | Rename `acCompanimentAlt` → `avcueboard` on GitHub; `git remote set-url origin …` |
| 3 | Tag **`v1.10.0`**, push — verify CI builds + release is public + **Latest** |
| 4 | Push module to `bitfocus/companion-module-alanimedia-avcueboard` (when Slack repo exists) |
| 5 | Developer Portal → Submit module **v1.10.0** |
| 6 | Test: fresh install, upgrade from 1.9.2, new Companion connection |
| 7 | Set GitHub repo description + topics (REBRAND_PLAN §4) |

### Lock for agent (ready)

- [x] Company: **Alani Media** — https://alani.media
- [x] Author: **Omar Gadahn**
- [x] Icon: **concept-a-cue-grid-v2.png** → v1.10.0
- [ ] Email for `package.json` (or agent uses placeholder you replace)

---

## 9. Discoverability context (summary)

**Primary discovery channel:** Bitfocus Companion Connections (search “audio”, “cue”, “sound”).

**Positioning:** Not “another soundboard” — a **Companion-native cue engine** with dynamic presets, feedback, and web remote.

**Avoid in product name:** Sound Show, CueAudio, “Companion” (Bitfocus brand confusion).

**Competitors in Companion ecosystem:** MultiPlay, SCS, Farrago, SoundByte, TuneIT, pySSP.

**SEO keywords to embed in README/description (not product name):** bitfocus companion, stream deck, audio cues, live audio, theatre, QLab alternative Windows.
