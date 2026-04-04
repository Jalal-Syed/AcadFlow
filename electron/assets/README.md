# electron/assets — App Icons for electron-builder

Place the following icon files here before running a desktop build:

| File | Size | Used by |
|---|---|---|
| `icon.ico` | 256×256 (multi-size ICO) | Windows installer + taskbar |
| `icon.png` | 512×512 PNG | Linux AppImage |
| `icon.icns` | macOS ICNS bundle | macOS DMG + Dock |

## Quick way to generate all three from one PNG

1. Get a 1024×1024 PNG of the AcadFlow logo (Flux owl)
2. Use https://cloudconvert.com or https://icoconvert.com to convert:
   - PNG → ICO (select 256px size) → save as icon.ico
   - PNG → ICNS → save as icon.icns
   - Resize PNG to 512×512 → save as icon.png

Or install `electron-icon-maker` and run:
  npx electron-icon-maker --input=logo-1024.png --output=electron/assets

Without these files, electron-builder will use a default Electron icon.
The CI workflow will still succeed — icons are optional for the build to complete.
