/**
 * Shared labels, help text, and badge icons for retrigger behaviors.
 */

export const RETRIGGER_DEFAULT_OPTION = {
    value: 'default',
    label: 'Use app default',
    description: 'Uses the global default from Settings. The cue button shows the same retrigger icon as the global default.',
    badgeGlyph: null,
    badgeImage: null
};

export const RETRIGGER_BEHAVIOR_OPTIONS = [
    {
        value: 'fade_out_and_stop',
        label: 'Fade out and stop',
        description: 'While playing: fades volume down (uses this cue\'s fade-out time, then the default cue fade-out, then Stop All fade time). While stopped: starts playback.',
        badgeGlyph: '◧',
        badgeImage: '../../assets/icons/fade-out-stop.svg',
        badgeImageClass: 'icon-image-native'
    },
    {
        value: 'restart',
        label: 'Restart',
        description: 'While playing or paused: stops immediately and starts again from the beginning.',
        badgeGlyph: '↺',
        badgeImage: '../../assets/icons/skip-start.png'
    },
    {
        value: 'stop',
        label: 'Stop',
        description: 'While playing or paused: stops immediately with no fade. While stopped: starts playback.',
        badgeGlyph: '■',
        badgeImage: '../../assets/icons/stop.png'
    },
    {
        value: 'toggle_pause_play',
        label: 'Toggle pause / play',
        description: 'While playing: pauses and keeps position. While paused: resumes from the same position.',
        badgeGlyph: '⏯',
        badgeImage: '../../assets/icons/pause.png'
    },
    {
        value: 'do_nothing',
        label: 'Do nothing',
        description: 'While playing or paused: ignores the button press. While stopped: starts playback.',
        badgeGlyph: '—',
        badgeImage: null
    },
    {
        value: 'play_new_instance',
        label: 'Play new instance',
        description: 'While playing or paused: starts an additional overlapping copy (can stack audio). While stopped: starts normally.',
        badgeGlyph: '＋',
        badgeImage: '../../assets/icons/play.png'
    },
    {
        value: 'replay_current_item',
        label: 'Replay current item',
        description: 'While playing: stops so you can play again from the start. While paused: restarts the current file/item from the beginning.',
        badgeGlyph: '⟲',
        badgeImage: null
    },
    {
        value: 'play_next_item',
        label: 'Play next item',
        description: 'Playlist only. While playing or paused: advances to the next playlist item. While stopped: starts the playlist.',
        badgeGlyph: '⏭',
        badgeImage: '../../assets/icons/skip-end.png'
    }
];

const OPTION_BY_VALUE = new Map(RETRIGGER_BEHAVIOR_OPTIONS.map((option) => [option.value, option]));

export function normalizeRetriggerBehaviorKey(value) {
    return String(value || '').toLowerCase().replace(/\s+/g, '_').replace(/-+/g, '_');
}

export function getRetriggerBehaviorMeta(value) {
    if (value === 'default') return RETRIGGER_DEFAULT_OPTION;
    const key = normalizeRetriggerBehaviorKey(value);
    if (key === 'pause_resume' || key === 'pause' || key === 'toggle_pause') {
        return OPTION_BY_VALUE.get('toggle_pause_play');
    }
    return OPTION_BY_VALUE.get(key) || null;
}

export function populateRetriggerSelect(selectEl, { includeDefault = false } = {}) {
    if (!selectEl) return;
    const previous = selectEl.value;
    selectEl.innerHTML = '';
    if (includeDefault) {
        const defaultOption = document.createElement('option');
        defaultOption.value = RETRIGGER_DEFAULT_OPTION.value;
        defaultOption.textContent = RETRIGGER_DEFAULT_OPTION.label;
        selectEl.appendChild(defaultOption);
    }
    RETRIGGER_BEHAVIOR_OPTIONS.forEach((option) => {
        const el = document.createElement('option');
        el.value = option.value;
        el.textContent = option.label;
        selectEl.appendChild(el);
    });
    if (previous && [...selectEl.options].some((opt) => opt.value === previous)) {
        selectEl.value = previous;
    }
}

export function updateRetriggerHelpText(selectEl, helpEl, { includeDefault = false } = {}) {
    if (!helpEl) return;
    const value = selectEl?.value;
    if (includeDefault && value === 'default') {
        helpEl.textContent = RETRIGGER_DEFAULT_OPTION.description;
        return;
    }
    const meta = getRetriggerBehaviorMeta(value);
    helpEl.textContent = meta?.description || 'Choose what happens when this cue\'s button is pressed while it is already playing or paused.';
}

export function renderRetriggerLegend(containerEl) {
    if (!containerEl) return;
    containerEl.innerHTML = '';
    const intro = document.createElement('p');
    intro.className = 'small-text retrigger-legend-intro';
    intro.textContent = 'These symbols appear on every cue button and show what happens when the button is pressed while already playing or paused.';
    containerEl.appendChild(intro);

    const list = document.createElement('ul');
    list.className = 'retrigger-legend-list';
    RETRIGGER_BEHAVIOR_OPTIONS.forEach((option) => {
        const item = document.createElement('li');
        item.className = 'retrigger-legend-item';

        const icon = document.createElement('span');
        icon.className = 'retrigger-legend-icon';
        if (option.badgeImage) {
            icon.classList.add('icon-image');
            icon.style.backgroundImage = `url(${option.badgeImage})`;
        } else {
            icon.textContent = option.badgeGlyph || '?';
        }
        icon.title = option.label;

        const text = document.createElement('span');
        text.className = 'retrigger-legend-text';
        const title = document.createElement('strong');
        title.textContent = option.label;
        const body = document.createElement('span');
        body.textContent = ` — ${option.description}`;
        text.appendChild(title);
        text.appendChild(body);

        item.appendChild(icon);
        item.appendChild(text);
        list.appendChild(item);
    });
    containerEl.appendChild(list);
}

export function getRetriggerBadgePresentation(value) {
    const meta = getRetriggerBehaviorMeta(value);
    if (!meta) {
        return { label: String(value || ''), glyph: 'R', image: null };
    }
    return {
        label: meta.label,
        glyph: meta.badgeGlyph || 'R',
        image: meta.badgeImage || null,
        imageClass: meta.badgeImageClass || null
    };
}
