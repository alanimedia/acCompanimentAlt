import {
    PRESET_BUTTON_COLORS,
    DEFAULT_CUE_BUTTON_COLOR,
    EDIT_CARD_RECENT_COLOR_SLOTS,
    normalizeHexColor,
    isPresetButtonColor,
    isDefaultButtonColor,
    normalizeRecentColors,
} from './ui/buttonColorPresets.js';

function isCustomButtonColor(color) {
    const norm = normalizeHexColor(color);
    return !!norm && !isPresetButtonColor(norm) && !isDefaultButtonColor(norm);
}

function syncSwatchSelection(container, selectedColor) {
    const norm = normalizeHexColor(selectedColor);
    container.querySelectorAll('.cue-color-swatch').forEach((swatch) => {
        if (swatch.classList.contains('cue-color-swatch-empty')) return;
        if (swatch.classList.contains('cue-color-custom')) {
            const isCustom = isCustomButtonColor(norm);
            swatch.classList.toggle('active', isCustom);
            swatch.style.backgroundColor = isCustom ? norm : DEFAULT_CUE_BUTTON_COLOR;
            return;
        }
        swatch.classList.toggle('active', normalizeHexColor(swatch.title) === norm);
    });
}

function appendCustomPicker(row, currentColor, onSelectColor, container) {
    const wrap = document.createElement('div');
    wrap.className = 'cue-color-custom-wrap';

    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = `cue-color-swatch cue-color-custom${isCustomButtonColor(currentColor) ? ' active' : ''}`;
    btn.style.backgroundColor = isCustomButtonColor(currentColor) ? currentColor : DEFAULT_CUE_BUTTON_COLOR;
    btn.title = 'Pick custom color';
    btn.setAttribute('aria-label', 'Pick custom color');

    const input = document.createElement('input');
    input.type = 'color';
    input.className = 'cue-color-input-hidden';
    input.value = isCustomButtonColor(currentColor) ? currentColor : DEFAULT_CUE_BUTTON_COLOR;
    input.addEventListener('input', (event) => {
        event.stopPropagation();
        const hex = normalizeHexColor(event.target.value);
        if (!hex) return;
        btn.style.backgroundColor = hex;
        onSelectColor(hex);
        syncSwatchSelection(container, hex);
    });

    btn.addEventListener('click', (event) => {
        event.stopPropagation();
        if (typeof input.showPicker === 'function') {
            input.showPicker();
        } else {
            input.click();
        }
    });

    wrap.appendChild(btn);
    wrap.appendChild(input);
    row.appendChild(wrap);
}

function appendColorSwatch(row, color, { title, current, onSelectColor, container, isEmpty = false } = {}) {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'cue-color-swatch';
    if (isEmpty) {
        btn.classList.add('cue-color-swatch-empty');
        btn.disabled = true;
        btn.title = 'No recent color';
        btn.setAttribute('aria-label', 'Empty recent color slot');
        row.appendChild(btn);
        return;
    }

    const norm = normalizeHexColor(color);
    if (!norm) return;

    btn.classList.toggle('active', current === norm);
    btn.style.backgroundColor = norm;
    btn.title = title || norm;
    btn.addEventListener('click', (event) => {
        event.stopPropagation();
        onSelectColor(norm);
        syncSwatchSelection(container, norm);
    });
    row.appendChild(btn);
}

export function buildEditCardColorSwatches(container, currentColor, {
    onSelectColor,
    getRecentColors = () => [],
} = {}) {
    if (!container || typeof onSelectColor !== 'function') return;

    container.innerHTML = '';
    const current = normalizeHexColor(currentColor);

    const presetsRow = document.createElement('div');
    presetsRow.className = 'cue-edit-color-row cue-edit-color-row-presets';

    const recentRow = document.createElement('div');
    recentRow.className = 'cue-edit-color-row cue-edit-color-row-recent';

    PRESET_BUTTON_COLORS.forEach((color) => {
        appendColorSwatch(presetsRow, color, {
            title: color,
            current,
            onSelectColor,
            container,
        });
    });

    appendCustomPicker(recentRow, current, onSelectColor, container);

    const recent = normalizeRecentColors(getRecentColors());
    for (let index = 0; index < EDIT_CARD_RECENT_COLOR_SLOTS; index += 1) {
        const color = recent[index];
        if (color) {
            appendColorSwatch(recentRow, color, {
                title: `Recent ${color}`,
                current,
                onSelectColor,
                container,
            });
        } else {
            appendColorSwatch(recentRow, null, { isEmpty: true });
        }
    }

    container.appendChild(presetsRow);
    container.appendChild(recentRow);
}

export function syncEditCardColorSwatches(container, color) {
    if (!container) return;
    syncSwatchSelection(container, color);
}
