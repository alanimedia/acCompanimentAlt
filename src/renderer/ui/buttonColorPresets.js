/** Preset and recent cue button colors — kept distinct from playing-state green (#228b22). */

export const DEFAULT_CUE_BUTTON_COLOR = '#3a3a3a';
export const CUE_PLAYING_GREEN = '#228b22';
export const MAX_RECENT_CUSTOM_COLORS = 8;
/** Recent custom slots shown on edit cue cards (custom picker + this many history swatches). */
export const EDIT_CARD_RECENT_COLOR_SLOTS = 7;

/** WCAG relative luminance above this → black text; at or below → white text (~mid-gray). */
export const TEXT_LUMINANCE_THRESHOLD = 0.5;

/** Eight neon-style presets (no greens — avoids confusion with playing state). */
export const PRESET_BUTTON_COLORS = [
    '#ff006e', // neon pink
    '#00f5ff', // neon cyan
    '#ff6b35', // neon orange
    '#9d4edd', // neon purple
    '#ffd60a', // neon yellow
    '#4361ee', // electric blue
    '#e63946', // neon red
    '#f72585', // hot magenta
];

export function normalizeHexColor(color) {
    if (!color || typeof color !== 'string') return null;
    let hex = color.trim().toLowerCase();
    if (!hex.startsWith('#')) hex = `#${hex}`;
    if (/^#[0-9a-f]{3}$/.test(hex)) {
        hex = `#${hex[1]}${hex[1]}${hex[2]}${hex[2]}${hex[3]}${hex[3]}`;
    }
    return /^#[0-9a-f]{6}$/.test(hex) ? hex : null;
}

/** WCAG 2.x relative luminance for sRGB (0 = black, 1 = white). */
export function getRelativeLuminance(hex) {
    const normalized = normalizeHexColor(hex);
    if (!normalized) return 0;

    const toLinear = (channel) => {
        const c = channel / 255;
        return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
    };

    const r = toLinear(parseInt(normalized.slice(1, 3), 16));
    const g = toLinear(parseInt(normalized.slice(3, 5), 16));
    const b = toLinear(parseInt(normalized.slice(5, 7), 16));

    return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/** Returns foreground colors for text on the given background. */
export function getContrastTextColors(hex) {
    const useDarkText = getRelativeLuminance(hex) > TEXT_LUMINANCE_THRESHOLD;
    return useDarkText
        ? { primary: '#1a1a1a', secondary: 'rgba(0, 0, 0, 0.65)' }
        : { primary: '#e0e0e0', secondary: 'rgba(255, 255, 255, 0.75)' };
}

export function shouldUseDarkText(hex) {
    return getRelativeLuminance(hex) > TEXT_LUMINANCE_THRESHOLD;
}

export function isPresetButtonColor(color) {
    const normalized = normalizeHexColor(color);
    return normalized ? PRESET_BUTTON_COLORS.includes(normalized) : false;
}

export function isDefaultButtonColor(color) {
    return normalizeHexColor(color) === DEFAULT_CUE_BUTTON_COLOR;
}

/** Deduplicate and normalize a recent-colors list from config. */
export function normalizeRecentColors(recentColors) {
    if (!Array.isArray(recentColors)) return [];
    const seen = new Set();
    const unique = [];
    for (const entry of recentColors) {
        const normalized = normalizeHexColor(entry);
        if (!normalized || seen.has(normalized)) continue;
        if (isDefaultButtonColor(normalized) || isPresetButtonColor(normalized)) continue;
        seen.add(normalized);
        unique.push(normalized);
        if (unique.length >= MAX_RECENT_CUSTOM_COLORS) break;
    }
    return unique;
}

export function addRecentCustomColor(recentColors, color) {
    const normalized = normalizeHexColor(color);
    if (!normalized || isDefaultButtonColor(normalized) || isPresetButtonColor(normalized)) {
        return normalizeRecentColors(recentColors);
    }
    const filtered = normalizeRecentColors(recentColors).filter(c => c !== normalized);
    return [normalized, ...filtered].slice(0, MAX_RECENT_CUSTOM_COLORS);
}

export function isColorInRecentList(recentColors, color) {
    const normalized = normalizeHexColor(color);
    if (!normalized) return false;
    return normalizeRecentColors(recentColors).includes(normalized);
}
