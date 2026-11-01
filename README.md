# Vaporsoft Themes Monorepo

This repo hosts Vaporsoft themes for multiple platforms. Each platform lives under `packages/`.

## Packages

- `packages/vscode` - VS Code themes (Light, Dark, High Contrast, Flat variants)
- `packages/zed` - Zed themes (Light, Dark), full key coverage
- `packages/neovim` - Neovim statusline colours (Light, Dark)
- `packages/sublime` - Sublime Text themes (Light, Dark)
- `packages/sublime-text` - Sublime Text install notes

`palette.json` is the official palette every theme is assembled from.

## Build (VS Code)

1. `cd packages\vscode`
2. Rebuild themes: `node .\scripts\build-full-themes.js`
3. Validate coverage: `node .\scripts\validate-theme-coverage.js`
4. Package VSIX: `cmd /c "npx @vscode/vsce package"`

## Build (Zed)

1. `cd packages/zed`
2. Validate palette fidelity and coverage: `node scripts/check-theme.mjs`

## Release

CI builds and attaches VSIX files to GitHub Releases on tag.
