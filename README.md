# AV Cueboard

Live audio cue software for **Bitfocus Companion** and **Elgato Stream Deck**.

> Formerly **acCompaniment** — fork of [mko1989/acCompaniment](https://github.com/mko1989/acCompaniment). See [NOTICE](NOTICE).

- **Website:** [alani.media](https://alani.media)
- **Releases:** [github.com/alanimedia/avcueboard/releases](https://github.com/alanimedia/avcueboard/releases)
- **User guide:** [HELP.md](HELP.md) — full UI reference (Playback/Edit modes, sections, waveforms, meters, remote, Companion)

Cross-platform desktop cue engine: grid layout with **sections**, **waveform trim**, **live seek/volume**, **crossfade**, **ducking**, dual audio outputs (main + monitor/preview), **per-cue meters**, **web remote** for iPad, and **missing-media relink** for live shows.

## Quick start

### End users
Download the latest installer from [Releases](https://github.com/alanimedia/avcueboard/releases).

### Developers
```bash
git clone https://github.com/alanimedia/avcueboard.git
cd avcueboard
npm run setup:hooks
npm install
npm start
```

### Companion (5 minutes)
1. Run AV Cueboard — WebSocket on by default (port **8877**).
2. In Bitfocus Companion, add **Alani Media → AVCueboard**.
3. Set IP + port; import presets or assign **Trigger** actions.

Module repo: [bitfocus/companion-module-alanimedia-avcueboard](https://github.com/bitfocus/companion-module-alanimedia-avcueboard)

## Feature highlights

| Area | Capabilities |
|------|----------------|
| **Cue grid** | Sections, drag-reorder, multi-select, square cards, custom colors, loop/retrigger badges |
| **Playback** | Single file & playlist cues, fade in/out, ducking, crossfade mode, Stop All |
| **Waveforms** | In/out trim, expanded editor, bottom panel with stacked lanes, mini strips on buttons, scrub/seek while playing |
| **Meters** | Header master VU + dBFS; per-cue meters; monitor/preview output with LUFS |
| **Outputs** | Main + monitor/preview devices; optional live mirror; cue preview (♪) to monitor |
| **Remote** | HTTP web UI (port 3000) with edit mode, touch reorder, waveforms, XFADE/WAVE |
| **Show safety** | Missing media badges, periodic rescan, relink-by-filename, launch warning |
| **Integration** | Companion WebSocket (8877), variables/feedbacks, layout-ordered presets |

See **[HELP.md](HELP.md)** for the complete guide aligned with the current UI.

## Upgrading from acCompaniment 1.9.x

Install **1.10.0** over your existing build. Settings migrate from the legacy userData folder on first launch. In Companion, remove the old HighPass connection and add **Alani Media → AVCueboard** fresh.

## System requirements

Windows 10/11, macOS 10.15+, or Linux · 4 GB RAM (8 GB recommended) · compatible audio output

## Development

```bash
npm run dist:win    # Windows installer
npm run dist:mac    # macOS DMG
npm run dist:linux  # deb + AppImage
```

Built packages appear in `dist/`. Project layout: `main.js`, `src/main/`, `src/renderer/`, `src/shared/branding.js`, `assets/icons/`.

## Contributing & license

Issues and PRs welcome on [GitHub](https://github.com/alanimedia/avcueboard/issues).

MIT License — [LICENSE](LICENSE) · [NOTICE](NOTICE)
