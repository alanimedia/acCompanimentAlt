# AV Cueboard

Live audio cue software for **Bitfocus Companion** and **Elgato Stream Deck**.

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

## Bitfocus Companion

AV Cueboard talks to Companion over WebSocket (default port **8877**).

When the module is listed on the [Connections](https://bitfocus.io/connections) page, add **Alani Media → AVCueboard**, set the host IP and port, then import presets or assign **Trigger** actions.

Until Bitfocus approves the store listing, install the packaged module manually (below).

### Manual module install — Companion 4.x (recommended)

No developer mode or Node.js required on the Companion machine.

1. Download the packaged module:  
   **[alanimedia-avcueboard-1.10.0.tgz](https://github.com/alanimedia/avcueboard-companion-module/raw/main/packages/alanimedia-avcueboard-1.10.0.tgz)**  
   (also listed on the [companion module repo](https://github.com/alanimedia/avcueboard-companion-module))
2. Open Companion Admin → **Modules**.
3. **Import / Install custom module** and select the `.tgz`.
4. **Connections** → add **Alani Media → AVCueboard**.
5. Host: IP of the AV Cueboard PC (`127.0.0.1` if same machine). Port: **8877**.

### Manual module install — developer path (optional)

For live module development, use Companion’s **Developer modules path** instead. Clone [avcueboard-companion-module](https://github.com/alanimedia/avcueboard-companion-module), run `yarn install` / `yarn build`, and point the launcher cog at the **parent** folder. Details: [Bitfocus local modules](https://companion.free/for-developers/module-development/local-modules/).

> HTTP remote (port **3000**) is the web/iPad UI — not the Companion WebSocket port.

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

## System requirements

Windows 10/11, macOS 10.15+, or Linux · 4 GB RAM (8 GB recommended) · compatible audio output

## Development

```bash
npm run dist:win    # Windows installer
npm run dist:mac    # macOS DMG
npm run dist:linux  # deb + AppImage
```

Built packages appear in `dist/`. Project layout: `main.js`, `src/main/`, `src/renderer/`, `src/shared/branding.js`, `assets/icons/`.

## Contributing

Issues and pull requests are welcome: [github.com/alanimedia/avcueboard/issues](https://github.com/alanimedia/avcueboard/issues).

## License & credits

AV Cueboard is released under the **MIT License**. See [LICENSE](LICENSE) and [NOTICE](NOTICE).

This project is based on **[acCompaniment](https://github.com/mko1989/acCompaniment)** by **Marcin Wardecki** ([mko1989](https://github.com/mko1989)), also MIT licensed. Original work © Marcin Wardecki. Modifications © Omar Gadahn, [Alani Media](https://alani.media).
