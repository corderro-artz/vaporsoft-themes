#!/usr/bin/env node
// Validates themes/vaporsoft.json against ../../palette.json and Zed's theme schema.
// Zero dependencies. Usage: node scripts/check-theme.mjs   (exit 1 on any error)
//
// Checks:
//   1. Palette fidelity: every colour's RGB is a palette value (alpha is free).
//   2. Retired and atmosphere values never appear.
//   3. Coverage: every Zed theme key (schema v0.2.0 + current source) is set; no unknown keys.
//   4. Syntax: every documented capture is styled.
//   5. Contrast: syntax text vs editor background (warnings for low-emphasis tokens).

import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const palette = JSON.parse(readFileSync(resolve(root, "../../palette.json"), "utf8"));
const raw = readFileSync(resolve(root, "themes/vaporsoft.json"), "utf8");

const errors = [];
const warnings = [];
const err = (m) => errors.push(m);

// --- JSONC: strip // and /* */ comments, respecting strings -----------------
function stripComments(src) {
  let out = "";
  let inStr = false;
  for (let i = 0; i < src.length; i++) {
    const c = src[i];
    const n = src[i + 1];
    if (inStr) {
      out += c;
      if (c === "\\") out += src[++i];
      else if (c === '"') inStr = false;
    } else if (c === '"') {
      inStr = true;
      out += c;
    } else if (c === "/" && n === "/") {
      while (i < src.length && src[i] !== "\n") i++;
      out += "\n";
    } else if (c === "/" && n === "*") {
      i += 2;
      while (i < src.length && !(src[i] === "*" && src[i + 1] === "/")) i++;
      i++;
    } else out += c;
  }
  return out;
}

let family;
try {
  family = JSON.parse(stripComments(raw));
} catch (e) {
  console.error(`themes/vaporsoft.json is not valid JSONC: ${e.message}`);
  process.exit(1);
}

// --- Allowed RGB set, derived from palette.json ------------------------------
// Excludes `atmosphere` (background gradient only) and `retired`.
const allowed = new Set(
  [
    ...Object.values(palette.core).map((c) => c.hex),
    ...["dark", "light"].flatMap((m) => ["canvas", "surface", "text"].map((k) => palette.theme[m][k])),
    ...palette.ramp.shades,
    palette.ramp.anchor,
    ...palette.ramp.tints,
    palette.functional.live.hex,
  ].map((h) => h.toLowerCase()),
);
const retired = Object.keys(palette.retired).filter((k) => k.startsWith("#"));
const atmosphere = [...palette.atmosphere.dark, ...palette.atmosphere.light];

// --- Expected key coverage ---------------------------------------------------
const ansi = ["black", "red", "green", "yellow", "blue", "magenta", "cyan", "white"];
const status = [
  "conflict", "created", "deleted", "error", "hidden", "hint", "ignored",
  "info", "modified", "predictive", "renamed", "success", "unreachable", "warning",
];
const vimModes = ["normal", "insert", "replace", "visual", "visual_line", "visual_block"];

const expectedKeys = new Set([
  "background.appearance", "accents", "players", "syntax",
  "border", "border.variant", "border.focused", "border.selected", "border.transparent", "border.disabled",
  "elevated_surface.background", "surface.background", "background",
  ...["background", "hover", "active", "selected", "disabled"].map((s) => `element.${s}`),
  "element.selection_background",
  "drop_target.background", "drop_target.border",
  ...["background", "hover", "active", "selected", "disabled"].map((s) => `ghost_element.${s}`),
  "text", "text.muted", "text.placeholder", "text.disabled", "text.accent",
  "icon", "icon.muted", "icon.disabled", "icon.placeholder", "icon.accent",
  "debugger.accent",
  "status_bar.background", "title_bar.background", "title_bar.inactive_background",
  "toolbar.background", "tab_bar.background", "tab.inactive_background", "tab.active_background",
  "search.match_background", "search.active_match_background",
  "panel.background", "panel.focused_border", "panel.indent_guide", "panel.indent_guide_hover",
  "panel.indent_guide_active", "panel.overlay_background", "panel.overlay_hover",
  "pane.focused_border", "pane_group.border",
  "scrollbar.thumb.background", "scrollbar.thumb.hover_background", "scrollbar.thumb.active_background",
  "scrollbar.thumb.border", "scrollbar.track.background", "scrollbar.track.border",
  "minimap.thumb.background", "minimap.thumb.hover_background", "minimap.thumb.active_background",
  "minimap.thumb.border",
  "editor.foreground", "editor.code_lens.foreground", "editor.background", "editor.gutter.background",
  "editor.subheader.background", "editor.active_line.background", "editor.highlighted_line.background",
  "editor.debugger_active_line.background", "editor.line_number", "editor.active_line_number",
  "editor.hover_line_number", "editor.invisible", "editor.wrap_guide", "editor.active_wrap_guide",
  "editor.indent_guide", "editor.indent_guide_active",
  "editor.document_highlight.read_background", "editor.document_highlight.write_background",
  "editor.document_highlight.bracket_background",
  ...["added", "deleted"].flatMap((k) =>
    ["background", "hollow_background", "hollow_border"].map((s) => `editor.diff_hunk.${k}.${s}`)),
  "terminal.background", "terminal.foreground", "terminal.ansi.background",
  "terminal.bright_foreground", "terminal.dim_foreground",
  ...ansi.flatMap((c) => [`terminal.ansi.${c}`, `terminal.ansi.bright_${c}`, `terminal.ansi.dim_${c}`]),
  "link_text.hover",
  ...["added", "deleted", "modified", "renamed", "conflict", "ignored", "word_added", "word_deleted"]
    .map((k) => `version_control.${k}`),
  "version_control.conflict_marker.ours", "version_control.conflict_marker.theirs",
  ...vimModes.flatMap((m) => [`vim.${m}.background`, `vim.${m}.foreground`]),
  "vim.yank.background", "vim.helix_jump_label.foreground",
  "vim.helix_normal.background", "vim.helix_normal.foreground",
  "vim.helix_select.background", "vim.helix_select.foreground",
  ...status.flatMap((s) => [s, `${s}.background`, `${s}.border`]),
]);

const requiredSyntax = [
  "attribute", "boolean", "comment", "comment.doc", "constant", "constant.builtin", "constructor",
  "embedded", "emphasis", "emphasis.strong", "enum", "function", "hint", "keyword", "label",
  "link_text", "link_uri", "number", "operator", "predictive", "preproc", "primary", "property",
  "punctuation", "punctuation.bracket", "punctuation.delimiter", "punctuation.list_marker",
  "punctuation.special", "string", "string.escape", "string.regex", "string.special",
  "string.special.symbol", "tag", "tag.doctype", "text.literal", "title", "type", "type.builtin",
  "variable", "variable.special", "variable.parameter", "variant",
];
const optionalSyntax = new Set(["punctuation.markup", "selector", "selector.pseudo"]);
const lowEmphasis = new Set([
  "comment", "comment.doc", "hint", "predictive", "punctuation", "punctuation.delimiter",
]);

// --- Colour helpers ----------------------------------------------------------
const COLOR = /^#([0-9a-f]{6})([0-9a-f]{2})?$/i;
const rgbOf = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
const alphaOf = (h) => (h.length === 9 ? parseInt(h.slice(7, 9), 16) / 255 : 1);
const lin = (v) => ((v /= 255) <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4);
const lum = ([r, g, b]) => 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
const over = (fg, bg) => {
  const a = alphaOf(fg);
  return rgbOf(fg).map((v, i) => v * a + rgbOf(bg)[i] * (1 - a));
};
const contrast = (a, b) => {
  const [hi, lo] = [lum(a), lum(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
};

function* colours(value, path) {
  if (typeof value === "string") yield [path, value];
  else if (Array.isArray(value)) for (const [i, v] of value.entries()) yield* colours(v, `${path}[${i}]`);
  else if (value && typeof value === "object")
    for (const [k, v] of Object.entries(value))
      if (k !== "font_style" && k !== "font_weight") yield* colours(v, `${path}.${k}`);
}

// --- Run ---------------------------------------------------------------------
if (!Array.isArray(family.themes) || family.themes.length === 0) err("themes[] is missing or empty");

for (const theme of family.themes ?? []) {
  const tag = theme.name;
  const style = theme.style ?? {};
  if (!["light", "dark"].includes(theme.appearance)) err(`${tag}: invalid appearance`);

  // Coverage
  for (const k of expectedKeys) if (!(k in style)) err(`${tag}: missing key "${k}"`);
  for (const k of Object.keys(style)) if (!expectedKeys.has(k)) err(`${tag}: unknown key "${k}"`);
  if ((style.players ?? []).length < 8) err(`${tag}: players needs 8 entries`);
  if ((style.accents ?? []).length < 1) err(`${tag}: accents is empty`);
  for (const k of requiredSyntax) if (!(k in (style.syntax ?? {}))) err(`${tag}: missing syntax "${k}"`);
  for (const k of Object.keys(style.syntax ?? {}))
    if (!requiredSyntax.includes(k) && !optionalSyntax.has(k)) err(`${tag}: unknown syntax "${k}"`);

  // Palette fidelity
  for (const [path, value] of colours(style, "style")) {
    if (path === "style.background.appearance") continue;
    const m = COLOR.exec(value);
    if (!m) { err(`${tag}: ${path} is not #rrggbb[aa]: ${value}`); continue; }
    const hex = `#${m[1].toLowerCase()}`;
    if (retired.includes(hex)) err(`${tag}: ${path} uses retired ${hex}`);
    else if (atmosphere.includes(hex) && !allowed.has(hex)) err(`${tag}: ${path} uses atmosphere stop ${hex}`);
    else if (!allowed.has(hex)) err(`${tag}: ${path} is off-palette: ${value}`);
  }

  // Contrast: syntax text over the editor ground
  const ground = rgbOf(style["editor.background"]);
  for (const [name, s] of Object.entries(style.syntax ?? {})) {
    if (!s.color) continue;
    const ratio = contrast(over(s.color, style["editor.background"]), ground);
    const floor = lowEmphasis.has(name) ? 3 : 4.5;
    if (ratio < floor) err(`${tag}: syntax "${name}" contrast ${ratio.toFixed(2)} < ${floor}`);
    else if (ratio < 4.5) warnings.push(`${tag}: syntax "${name}" contrast ${ratio.toFixed(2)} (low-emphasis)`);
  }
  const body = contrast(rgbOf(style["editor.foreground"]), ground);
  if (body < 7) err(`${tag}: editor.foreground contrast ${body.toFixed(2)} < 7`);
}

for (const w of warnings) console.warn(`warn  ${w}`);
if (errors.length) {
  for (const e of errors) console.error(`error ${e}`);
  console.error(`\n${errors.length} error(s)`);
  process.exit(1);
}
console.log(`ok    ${family.themes.length} themes, ${expectedKeys.size} keys each, palette v${palette.version}`);
