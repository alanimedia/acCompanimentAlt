// Companion_soundboard/src/renderer/ui/waveformZoom.js

/**
 * Waveform Zoom Management Module
 * Handles zoom + shared wheel gestures for the expanded waveform editor
 */

import {
    attachWaveformWheelControls,
    panWaveform,
    scrubWaveform
} from './waveformPointerControls.js';

// Zoom state variables
let zoomLevel = 0; // Start at minimum zoom (0-100 scale, higher = more zoomed in)
let maxZoom = 1000; // Maximum zoom level (increased for better zoom range)
let minZoom = 0; // Minimum zoom level
let expandedZoomLevel = 0; // Zoom level for expanded waveform

// DOM elements for expanded waveform zoom
let expandedWaveformDisplay = null;
let expandedWaveformInstance = null;
let detachExpandedWheel = null;
let onExpandedScrubCallback = null;

/**
 * Initialize the zoom module with required dependencies
 * @param {object} dependencies - Object containing expanded waveform elements
 */
function initZoomModule(dependencies) {
    expandedWaveformDisplay = dependencies.expandedWaveformDisplay;
    expandedWaveformInstance = dependencies.expandedWaveformInstance;
    if (typeof dependencies.onExpandedScrub === 'function') {
        onExpandedScrubCallback = dependencies.onExpandedScrub;
    }
}

/**
 * Reset zoom to show the entire track
 * @param {object} wavesurferInstance - The main WaveSurfer instance
 */
function resetZoom(wavesurferInstance) {
    if (wavesurferInstance) {
        zoomLevel = 0; // Reset to minimum zoom level
        wavesurferInstance.zoom(1); // Minimum effective zoom for wavesurfer (0 would be invalid)
    }
}

/**
 * Reset expanded waveform zoom
 */
function resetExpandedZoom() {
    if (expandedWaveformInstance) {
        expandedZoomLevel = 0; // Reset to minimum zoom level
        expandedWaveformInstance.zoom(1); // Minimum effective zoom for wavesurfer (0 would be invalid)
    }
}

/**
 * Apply zoom delta to the expanded waveform (+/- keys and wheel).
 * @param {number} direction - 1 zoom in, -1 zoom out
 */
function adjustExpandedZoom(direction) {
    if (!expandedWaveformInstance?.zoom) return;

    let zoomStep;
    if (expandedZoomLevel < 10) {
        zoomStep = 1 * direction;
    } else {
        zoomStep = 5 * direction;
    }

    expandedZoomLevel += zoomStep;
    expandedZoomLevel = Math.min(Math.max(expandedZoomLevel, minZoom), maxZoom);

    try {
        if (expandedZoomLevel <= minZoom || expandedZoomLevel === 0) {
            expandedWaveformInstance.zoom(1);
            expandedZoomLevel = 0;
        } else {
            expandedWaveformInstance.zoom(Math.max(1, expandedZoomLevel));
        }
    } catch (zoomError) {
        console.error('WaveformZoom: Error applying expanded zoom:', zoomError);
    }
}

/**
 * Set up zoom + pan + scrub for expanded waveform
 */
function setupExpandedWaveformZoom() {
    if (!expandedWaveformInstance || !expandedWaveformDisplay) {
        console.warn('WaveformZoom: Cannot setup zoom - missing expandedWaveformInstance or expandedWaveformDisplay');
        return;
    }

    cleanupExpandedZoomHandlers();

    const dblClickHandler = (e) => {
        if (!expandedWaveformInstance?.zoom) return;
        // Don't reset zoom when double-clicking region handles
        if (e.target?.closest?.('[part~="region-handle"], [part~="region"]')) return;
        e.preventDefault();
        e.stopPropagation();
        resetExpandedZoom();
    };

    expandedWaveformDisplay._dblClickHandler = dblClickHandler;
    expandedWaveformDisplay.addEventListener('dblclick', dblClickHandler);

    detachExpandedWheel = attachWaveformWheelControls(expandedWaveformDisplay, {
        getInstance: () => expandedWaveformInstance,
        onZoom: (direction) => adjustExpandedZoom(direction),
        onPan: (deltaPx) => panWaveform(expandedWaveformInstance, deltaPx),
        onScrub: (delta) => {
            const next = scrubWaveform(expandedWaveformInstance, delta);
            if (next != null && typeof onExpandedScrubCallback === 'function') {
                onExpandedScrubCallback(next);
            }
        }
    });

    const wrapper = expandedWaveformInstance.getWrapper?.() || expandedWaveformDisplay.querySelector('.wavesurfer');
    if (wrapper && wrapper !== expandedWaveformDisplay) {
        wrapper.addEventListener('dblclick', dblClickHandler);
        wrapper.setAttribute('data-zoom-setup', 'true');
    }

    expandedWaveformDisplay.setAttribute('data-zoom-setup', 'true');
    expandedWaveformDisplay.title = 'Wheel zoom · Shift+wheel / tilt pan · Ctrl+wheel scrub · Double-click reset zoom';
}

/**
 * Helper function to clean up expanded zoom handlers
 */
function cleanupExpandedZoomHandlers() {
    if (typeof detachExpandedWheel === 'function') {
        detachExpandedWheel();
        detachExpandedWheel = null;
    }

    if (expandedWaveformDisplay) {
        if (expandedWaveformDisplay._dblClickHandler) {
            expandedWaveformDisplay.removeEventListener('dblclick', expandedWaveformDisplay._dblClickHandler);
            const wrapper = expandedWaveformDisplay.querySelector('.wavesurfer[data-zoom-setup]');
            if (wrapper) {
                wrapper.removeEventListener('dblclick', expandedWaveformDisplay._dblClickHandler);
                wrapper.removeAttribute('data-zoom-setup');
            }
            delete expandedWaveformDisplay._dblClickHandler;
        }

        // Legacy cleanup from older wheel handlers
        if (expandedWaveformDisplay._wheelHandler) {
            expandedWaveformDisplay.removeEventListener('wheel', expandedWaveformDisplay._wheelHandler);
            delete expandedWaveformDisplay._wheelHandler;
        }

        const canvasElements = expandedWaveformDisplay.querySelectorAll('canvas[data-zoom-setup]');
        canvasElements.forEach((canvas) => {
            canvas.removeAttribute('data-zoom-setup');
        });

        expandedWaveformDisplay.removeAttribute('data-zoom-setup');
    }
}

/**
 * Simplified setup function for zoom after waveform is ready
 */
function setupExpandedZoomAfterReady() {
    if (!expandedWaveformInstance || !expandedWaveformDisplay) {
        return;
    }
    // Re-bind in case the WaveSurfer wrapper was recreated on ready
    setupExpandedWaveformZoom();
}

/**
 * Update expanded waveform instance reference
 * @param {object} instance - The expanded WaveSurfer instance
 */
function updateExpandedWaveformInstance(instance) {
    expandedWaveformInstance = instance;
}

/**
 * Get current zoom level
 * @returns {number} Current zoom level
 */
function getZoomLevel() {
    return zoomLevel;
}

/**
 * Get current expanded zoom level
 * @returns {number} Current expanded zoom level
 */
function getExpandedZoomLevel() {
    return expandedZoomLevel;
}

export {
    initZoomModule,
    resetZoom,
    resetExpandedZoom,
    adjustExpandedZoom,
    setupExpandedWaveformZoom,
    cleanupExpandedZoomHandlers,
    setupExpandedZoomAfterReady,
    updateExpandedWaveformInstance,
    getZoomLevel,
    getExpandedZoomLevel
};
