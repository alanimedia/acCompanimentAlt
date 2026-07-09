(function attachRemoteBadgeUtils(global) {
    const LOOP_BADGE_GLYPH = '∞';
    const ICON_BASE = '/assets/icons/';

    const RETRIGGER_PRESENTATION = {
        fade_out_and_stop: { label: 'Fade out and stop', glyph: '◧', image: `${ICON_BASE}fade-out-stop.svg`, imageClass: 'icon-image-native' },
        restart: { label: 'Restart', glyph: '↺', image: `${ICON_BASE}skip-start.png` },
        stop: { label: 'Stop', glyph: '■', image: `${ICON_BASE}stop.png` },
        toggle_pause_play: { label: 'Toggle pause / play', glyph: '⏯', image: `${ICON_BASE}pause.png` },
        do_nothing: { label: 'Do nothing', glyph: '—', image: null },
        play_new_instance: { label: 'Play new instance', glyph: '＋', image: `${ICON_BASE}play.png` },
        replay_current_item: { label: 'Replay current item', glyph: '⟲', image: null },
        play_next_item: { label: 'Play next item', glyph: '⏭', image: `${ICON_BASE}skip-end.png` }
    };

    function getRetriggerBadgePresentation(value) {
        const key = String(value || '').toLowerCase().replace(/\s+/g, '_').replace(/-+/g, '_');
        const meta = RETRIGGER_PRESENTATION[key] || { label: String(value || ''), glyph: 'R', image: null };
        return { label: meta.label, glyph: meta.glyph, image: meta.image, imageClass: meta.imageClass || null };
    }

    function resolveEffectiveRetriggerBehavior(cue, appConfig = {}) {
        if (cue?.effectiveRetriggerBehavior) return cue.effectiveRetriggerBehavior;
        if (cue?.retriggerBehavior != null && cue.retriggerBehavior !== '') return cue.retriggerBehavior;
        return appConfig.defaultRetriggerBehavior || 'restart';
    }

    function ensureCueIndicatorStrip(hostEl) {
        if (!hostEl) return null;
        let strip = hostEl.querySelector(':scope > .cue-indicator-strip');
        if (!strip) {
            strip = document.createElement('div');
            strip.className = 'cue-indicator-strip';

            const retriggerIcon = document.createElement('span');
            retriggerIcon.className = 'cue-retrigger-icon';

            const loopBadge = document.createElement('span');
            loopBadge.className = 'cue-loop-badge';
            loopBadge.textContent = LOOP_BADGE_GLYPH;
            loopBadge.title = 'Loop enabled';

            strip.appendChild(retriggerIcon);
            strip.appendChild(loopBadge);
            hostEl.insertBefore(strip, hostEl.firstChild);
        }

        return {
            strip,
            retriggerIcon: strip.querySelector('.cue-retrigger-icon'),
            loopBadge: strip.querySelector('.cue-loop-badge')
        };
    }

    function updateRetriggerBadgeElement(retriggerIcon, behavior, options = {}) {
        if (!retriggerIcon) return;
        const { label, glyph, image, imageClass } = getRetriggerBadgePresentation(behavior);
        retriggerIcon.title = options.isOverride ? `${label} (cue override)` : `${label} (app default)`;
        retriggerIcon.classList.remove('icon-image-native');
        if (image) {
            retriggerIcon.classList.add('icon-image');
            if (imageClass) {
                retriggerIcon.classList.add(imageClass);
            }
            retriggerIcon.style.backgroundImage = `url(${image})`;
            retriggerIcon.textContent = '';
        } else {
            retriggerIcon.classList.remove('icon-image');
            retriggerIcon.style.backgroundImage = 'none';
            retriggerIcon.textContent = glyph;
        }
        retriggerIcon.classList.add('visible');
    }

    function updateCueIndicatorStrip(hostEl, cue, appConfig = {}) {
        const refs = ensureCueIndicatorStrip(hostEl);
        if (!refs || !cue) return refs;

        const behavior = resolveEffectiveRetriggerBehavior(cue, appConfig);
        const isOverride = cue.retriggerBehavior != null && cue.retriggerBehavior !== '';
        updateRetriggerBadgeElement(refs.retriggerIcon, behavior, { isOverride });
        refs.strip.title = `Retrigger while playing: ${getRetriggerBadgePresentation(behavior).label}`;

        if (refs.loopBadge) {
            refs.loopBadge.classList.toggle('visible', !!cue.loop);
        }

        return refs;
    }

    global.RemoteBadgeUtils = {
        LOOP_BADGE_GLYPH,
        ensureCueIndicatorStrip,
        updateCueIndicatorStrip,
        getRetriggerBadgePresentation,
        resolveEffectiveRetriggerBehavior
    };
})(window);
