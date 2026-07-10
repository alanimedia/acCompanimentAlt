/**
 * Shared mouse-wheel gestures for WaveSurfer preview / editor waveforms.
 *
 * Wheel (vertical)     → zoom
 * Shift+wheel / tilt   → pan (horizontal scroll)
 * Ctrl/Cmd+wheel       → scrub playhead
 * Double-click         → reset zoom (handled by caller)
 */

/**
 * Normalize wheel deltas to roughly pixel units.
 * @param {WheelEvent} e
 * @returns {{ dx: number, dy: number }}
 */
function normalizeWheelDelta(e) {
    let dx = e.deltaX || 0;
    let dy = e.deltaY || 0;
    if (e.deltaMode === 1) {
        dx *= 16;
        dy *= 16;
    } else if (e.deltaMode === 2) {
        dx *= 100;
        dy *= 100;
    }
    return { dx, dy };
}

/**
 * Classify a wheel event into a waveform gesture.
 * Horizontal tilt / side-wheel must never zoom.
 * @param {WheelEvent} e
 * @returns {'zoom'|'pan'|'scrub'|null}
 */
function getWheelGesture(e) {
    if (e.ctrlKey || e.metaKey) return 'scrub';
    if (e.shiftKey) return 'pan';

    const { dx, dy } = normalizeWheelDelta(e);
    const absX = Math.abs(dx);
    const absY = Math.abs(dy);

    // Tilt-wheel / side scroll: treat as pan even if a tiny deltaY sneaks in
    if (absX > absY) return 'pan';
    if (absY > 0) return 'zoom';
    if (absX > 0) return 'pan';
    return null;
}

/**
 * Primary delta for the active gesture (signed).
 * @param {WheelEvent} e
 * @param {'zoom'|'pan'|'scrub'} gesture
 * @returns {number}
 */
function getGestureDelta(e, gesture) {
    const { dx, dy } = normalizeWheelDelta(e);
    if (gesture === 'pan') {
        // Shift+vertical wheel pans; otherwise prefer horizontal tilt
        if (e.shiftKey && Math.abs(dy) >= Math.abs(dx)) return dy;
        return Math.abs(dx) >= Math.abs(dy) ? dx : dy;
    }
    // zoom / scrub: prefer vertical, fall back to horizontal
    return Math.abs(dy) >= Math.abs(dx) ? dy : dx;
}

/**
 * Pan a zoomed WaveSurfer view horizontally.
 * @param {object} wavesurfer
 * @param {number} deltaPx
 */
function panWaveform(wavesurfer, deltaPx) {
    if (!wavesurfer || typeof wavesurfer.getScroll !== 'function' || typeof wavesurfer.setScroll !== 'function') {
        return;
    }
    const next = wavesurfer.getScroll() + deltaPx;
    wavesurfer.setScroll(Math.max(0, next));
}

/**
 * Scrub the playhead by a wheel delta.
 * @param {object} wavesurfer
 * @param {number} delta - wheel delta (positive = scrub forward in time when using natural zoom-out direction... we invert so wheel-up seeks earlier like left)
 * @param {{ secondsPerNotch?: number }} [options]
 * @returns {number|null} new time in seconds, or null
 */
function scrubWaveform(wavesurfer, delta, options = {}) {
    if (!wavesurfer || typeof wavesurfer.getDuration !== 'function') return null;
    const duration = wavesurfer.getDuration();
    if (!duration || duration <= 0) return null;

    const secondsPerNotch = options.secondsPerNotch ?? 0.25;
    // Match typical scrubbers: wheel up / tilt left → earlier
    const notches = delta / 100;
    const current = typeof wavesurfer.getCurrentTime === 'function' ? wavesurfer.getCurrentTime() : 0;
    const next = Math.max(0, Math.min(duration, current + notches * secondsPerNotch));
    wavesurfer.seekTo(next / duration);
    return next;
}

/**
 * Attach wheel gesture handling to a waveform container.
 * Replaces any previous handler stored on the element.
 *
 * @param {HTMLElement} container
 * @param {object} options
 * @param {() => object|null} options.getInstance
 * @param {(direction: 1|-1, event: WheelEvent) => void} [options.onZoom]
 * @param {(deltaPx: number, event: WheelEvent) => void} [options.onPan]
 * @param {(delta: number, event: WheelEvent) => void} [options.onScrub]
 * @returns {() => void} cleanup
 */
function attachWaveformWheelControls(container, options = {}) {
    if (!container) return () => {};

    const {
        getInstance,
        onZoom,
        onPan,
        onScrub
    } = options;

    if (container._avWaveformWheelHandler) {
        container.removeEventListener('wheel', container._avWaveformWheelHandler);
        delete container._avWaveformWheelHandler;
    }

    const wheelHandler = (e) => {
        const wavesurfer = typeof getInstance === 'function' ? getInstance() : null;
        if (!wavesurfer) return;

        const gesture = getWheelGesture(e);
        if (!gesture) return;

        e.preventDefault();
        e.stopPropagation();

        const delta = getGestureDelta(e, gesture);

        if (gesture === 'zoom' && typeof onZoom === 'function') {
            const direction = delta < 0 ? 1 : -1;
            onZoom(direction, e);
            return;
        }

        if (gesture === 'pan') {
            if (typeof onPan === 'function') {
                onPan(delta, e);
            } else {
                panWaveform(wavesurfer, delta);
            }
            return;
        }

        if (gesture === 'scrub') {
            if (typeof onScrub === 'function') {
                onScrub(delta, e);
            } else {
                scrubWaveform(wavesurfer, delta);
            }
        }
    };

    container._avWaveformWheelHandler = wheelHandler;
    container.addEventListener('wheel', wheelHandler, { passive: false });

    return () => {
        if (container._avWaveformWheelHandler === wheelHandler) {
            container.removeEventListener('wheel', wheelHandler);
            delete container._avWaveformWheelHandler;
        }
    };
}

const WAVEFORM_POINTER_TIPS = {
    short: 'Wheel zoom · Shift+wheel pan · Ctrl+wheel scrub',
    editor: 'Wheel zoom · Shift+wheel / tilt pan · Ctrl+wheel scrub · ←→ seek · Drag handles for { }',
    propertiesTitle: 'Click to expand editor · Drag to seek · Wheel zoom · Shift+wheel pan · Ctrl+wheel scrub · Drag edge handles for in/out'
};

export {
    normalizeWheelDelta,
    getWheelGesture,
    getGestureDelta,
    panWaveform,
    scrubWaveform,
    attachWaveformWheelControls,
    WAVEFORM_POINTER_TIPS
};
