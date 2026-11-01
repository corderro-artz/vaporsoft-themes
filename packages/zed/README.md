# Vaporsoft for Zed

Vaporsoft Dark and Vaporsoft Light, built only from [`palette.json`](../../palette.json). Carmine `#a11f31` is the only accent.

```
packages/zed/
  extension.toml          Zed extension manifest
  LICENSE                 MIT
  themes/vaporsoft.json   Theme family (Dark + Light), commented JSONC
  scripts/check-theme.mjs Validator: palette fidelity, key coverage, contrast
```

## Install

**Local (no publishing):** copy `themes/vaporsoft.json` to

| OS            | Folder                                  |
| ------------- | --------------------------------------- |
| Windows       | `%USERPROFILE%\AppData\Roaming\Zed\themes\` |
| macOS / Linux | `~/.config/zed/themes/`                 |

**Dev extension:** in Zed run `zed: install dev extension` and select the `packages/zed` folder.

Then select the themes in `settings.json`:

```json
{
  "theme": {
    "mode": "system",
    "light": "Vaporsoft Light",
    "dark": "Vaporsoft Dark"
  }
}
```

## Design rules

- **Palette only.** Every colour is a palette value, with an alpha suffix where needed. Retired values and atmosphere stops are rejected.
- **Carmine for strokes, never dark-theme text.** Carmine on ink is about 2.6:1. Dark text uses the ramp **tints**. Light text uses carmine and the ramp **shades**.
- **One hue.** Hierarchy comes from ramp position, alpha and font style. The exception is `#2ea44f` (`functional.live`), used only for success and added signals.
- **Alpha steps** follow the palette's `muted` and `line` values. Extra steps are listed in the header of `themes/vaporsoft.json`.

## Coverage

Each theme sets all 190 UI and status keys in Zed's theme schema, plus 8 players, 6 accents, and every documented syntax capture. This includes minimap, vim/helix, debugger, diff hunks, version control, and all 24 ANSI terminal colours. `scripts/check-theme.mjs` enforces this and fails on a missing or unknown key.

## Validate

```sh
node scripts/check-theme.mjs
```

It needs Node 18 or later and no dependencies. Run it after editing the theme or `palette.json`.

## Before publishing

`extension.toml` already points at this repo and `LICENSE` (MIT) is included, which the Zed registry requires. The extension lives in a subdirectory of this monorepo, so reference it with `path = "packages/zed"` in the `zed-industries/extensions` submodule entry.
