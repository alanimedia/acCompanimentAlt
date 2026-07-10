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

Until Bitfocus approves the store listing, install the module manually (below).

### Manual module install (until store approval)

Companion 3+ can load modules from a local **developer modules** folder.

1. **Create a folder** for custom modules, e.g. `C:\companion-module-dev` (Windows) or `~/companion-module-dev` (macOS/Linux).

2. **Clone the module** into that folder:
   ```bash
   cd C:\companion-module-dev
   git clone https://github.com/alanimedia/avcueboard-companion-module.git
   cd avcueboard-companion-module
   ```

3. **Install and build** (requires [Node.js](https://nodejs.org/) 18+ and [Yarn 1](https://classic.yarnpkg.com/)):
   ```bash
   npm install --global yarn
   yarn install
   yarn build
   ```

4. **Point Companion at the parent folder**
   - Open the Companion launcher
   - Click the **cog** (settings)
   - Set **Developer modules path** to `C:\companion-module-dev` (the folder that *contains* `avcueboard-companion-module`, not the module folder itself)
   - Launch / restart Companion

5. **Add the connection**
   - In Companion Admin → Connections, add **Alani Media → AVCueboard**
   - Host: IP of the machine running AV Cueboard (`127.0.0.1` if same PC)
   - Port: **8877** (must match App Config → WebSocket)

6. Import presets or bind Stream Deck buttons to per-cue **Trigger** actions.

Module source: [alanimedia/avcueboard-companion-module](https://github.com/alanimedia/avcueboard-companion-module)  
Bitfocus docs: [Local / developer modules](https://companion.free/for-developers/module-development/local-modules/)

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
