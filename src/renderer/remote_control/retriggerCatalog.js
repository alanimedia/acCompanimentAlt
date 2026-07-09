(function attachRetriggerCatalog(global) {
    const ICON_BASE = '/assets/icons/';

    const RETRIGGER_DEFAULT_OPTION = {
        value: 'default',
        label: 'Use app default',
        description: 'Follows the global default from Settings. The cue button shows the same retrigger icon as the global default.'
    };

    const RETRIGGER_BEHAVIOR_OPTIONS = [
        {
            value: 'fade_out_and_stop',
            label: 'Fade out and stop',
            description: 'While playing: fades volume down (uses this cue\'s fade-out time, then the default cue fade-out, then Stop All fade time). While stopped: starts playback.',
            badgeGlyph: '◧',
            badgeImage: `${ICON_BASE}fade-out-stop.svg`,
            badgeImageClass: 'icon-image-native'
        },
        {
            value: 'restart',
            label: 'Restart',
            description: 'While playing or paused: stops immediately and starts again from the beginning.',
            badgeGlyph: '↺',
            badgeImage: `${ICON_BASE}skip-start.png`
        },
        {
            value: 'stop',
            label: 'Stop',
            description: 'While playing or paused: stops immediately with no fade. While stopped: starts playback.',
            badgeGlyph: '■',
            badgeImage: `${ICON_BASE}stop.png`
        },
        {
            value: 'toggle_pause_play',
            label: 'Toggle pause / play',
            description: 'While playing: pauses and keeps position. While paused: resumes from the same position.',
            badgeGlyph: '⏯',
            badgeImage: `${ICON_BASE}pause.png`
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
            description: 'While playing or paused: starts an additional overlapping copy. While stopped: starts normally.',
            badgeGlyph: '＋',
            badgeImage: `${ICON_BASE}play.png`
        },
        {
            value: 'replay_current_item',
            label: 'Replay current item',
            description: 'While playing: stops so you can play again from the start. While paused: restarts from the beginning.',
            badgeGlyph: '⟲',
            badgeImage: null
        },
        {
            value: 'play_next_item',
            label: 'Play next item',
            description: 'Playlist only. While playing or paused: advances to the next playlist item. While stopped: starts the playlist.',
            badgeGlyph: '⏭',
            badgeImage: `${ICON_BASE}skip-end.png`
        }
    ];

    function getRetriggerBehaviorMeta(value) {
        if (value === 'default') return RETRIGGER_DEFAULT_OPTION;
        const key = String(value || '').toLowerCase().replace(/\s+/g, '_').replace(/-+/g, '_');
        if (key === 'pause_resume' || key === 'pause' || key === 'toggle_pause') {
            return RETRIGGER_BEHAVIOR_OPTIONS.find((option) => option.value === 'toggle_pause_play') || null;
        }
        return RETRIGGER_BEHAVIOR_OPTIONS.find((option) => option.value === key) || null;
    }

    function populateRetriggerSelect(selectEl, options = {}) {
        if (!selectEl) return;
        const previous = selectEl.value;
        selectEl.innerHTML = '';
        if (options.includeDefault) {
            const defaultOption = document.createElement('option');
            defaultOption.value = 'default';
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

    function updateRetriggerHelpText(selectEl, helpEl, options = {}) {
        if (!helpEl || !selectEl) return;
        if (options.includeDefault && selectEl.value === 'default') {
            helpEl.textContent = RETRIGGER_DEFAULT_OPTION.description;
            return;
        }
        const meta = getRetriggerBehaviorMeta(selectEl.value);
        helpEl.textContent = meta?.description || 'Choose what happens when this cue button is pressed while already playing or paused.';
    }

    function renderRetriggerLegend(containerEl) {
        if (!containerEl) return;
        containerEl.innerHTML = '';
        const intro = document.createElement('p');
        intro.className = 'retrigger-legend-intro';
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

    global.RetriggerCatalog = {
        RETRIGGER_BEHAVIOR_OPTIONS,
        getRetriggerBehaviorMeta,
        populateRetriggerSelect,
        updateRetriggerHelpText,
        renderRetriggerLegend
    };
})(window);
