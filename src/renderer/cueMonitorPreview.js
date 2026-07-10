/**
 * Preview cue audio on the monitor/preview output only (not main show output).
 */

import {
    applySinkIdToHowl,
    getMonitorOutputDeviceId,
    registerMonitorHowl,
    applyMonitorVolumeMultiplier
} from './audioOutputRouting.js';
import {
    createHowlMonitorLevelSource,
    registerMonitorLevelSource
} from './audioOutputDiagnostics.js';

let activePreview = null;
let unregisterMonitorLevel = null;
let unregisterMonitorHowl = null;

function notifyMonitorPreviewState(activeCueId) {
    if (typeof window !== 'undefined' && window.electronAPI?.send) {
        window.electronAPI.send('monitor-preview-state-changed', {
            cueId: activeCueId || null,
            active: !!activeCueId
        });
    }
}

function stopActivePreview() {
    const endedCueId = activePreview?.cueId || null;
    if (unregisterMonitorLevel) {
        unregisterMonitorLevel();
        unregisterMonitorLevel = null;
    }
    if (unregisterMonitorHowl) {
        unregisterMonitorHowl();
        unregisterMonitorHowl = null;
    }
    if (!activePreview) return;
    try {
        activePreview.howl.stop();
        activePreview.howl.unload();
    } catch (_) {
        // ignore cleanup errors
    }
    activePreview = null;
    notifyMonitorPreviewState(null);
    if (endedCueId) {
        document.dispatchEvent(new CustomEvent('cue-monitor-preview-stopped', {
            detail: { cueId: endedCueId }
        }));
    }
}

async function resolveCuePreviewPath(cue, resolveAudioPathFn) {
    if (!cue) return null;

    if (cue.type === 'playlist' && Array.isArray(cue.playlistItems) && cue.playlistItems.length > 0) {
        const item = cue.playlistItems[0];
        return item?.path || item?.filePath || null;
    }

    return cue.filePath || null;
}

async function resolvePlaybackPath(rawPath, resolveAudioPathFn) {
    if (!rawPath) return null;
    const trimmed = String(rawPath).trim();
    const hasDirectory = trimmed.includes('/') || trimmed.includes('\\') || /^[a-zA-Z]:/.test(trimmed);
    if (hasDirectory || typeof resolveAudioPathFn !== 'function') {
        return trimmed;
    }
    try {
        const result = await resolveAudioPathFn(trimmed);
        if (result?.success && result.path) return result.path;
    } catch (error) {
        console.warn('cueMonitorPreview: Failed to resolve audio path:', error);
    }
    return trimmed;
}

function bindMonitorOutput(howl) {
    const applySink = () => applySinkIdToHowl(howl, getMonitorOutputDeviceId());
    howl.once('load', applySink);
    howl.on('play', applySink);
}

export function stopCueMonitorPreview() {
    stopActivePreview();
}

export function isCueMonitorPreviewActive(cueId) {
    return activePreview?.cueId === cueId
        && activePreview.howl
        && typeof activePreview.howl.playing === 'function'
        && activePreview.howl.playing();
}

export async function previewCueOnMonitor(cue, resolveAudioPathFn) {
    if (!cue) return { success: false, error: 'No cue provided' };

    const rawPath = await resolveCuePreviewPath(cue, resolveAudioPathFn);
    const filePath = await resolvePlaybackPath(rawPath, resolveAudioPathFn);
    if (!filePath) {
        return { success: false, error: 'Cue has no audio file assigned' };
    }

    stopActivePreview();

    const baseVolume = cue.volume !== undefined ? cue.volume : 1;
    const trimStart = cue.type === 'playlist'
        ? (cue.playlistItems?.[0]?.trimStartTime || 0)
        : (cue.trimStartTime || 0);

    const howl = new Howl({
        src: [filePath],
        html5: true,
        volume: applyMonitorVolumeMultiplier(baseVolume),
        preload: true
    });

    bindMonitorOutput(howl);
    unregisterMonitorHowl = registerMonitorHowl(howl, baseVolume);

    const previewId = `cue-preview-${cue.id}`;
    unregisterMonitorLevel = registerMonitorLevelSource(
        previewId,
        createHowlMonitorLevelSource(howl)
    );

    howl.once('end', stopActivePreview);
    howl.once('stop', stopActivePreview);
    howl.once('loaderror', () => {
        console.warn('cueMonitorPreview: Failed to load preview for cue', cue.id);
        stopActivePreview();
    });

    const startPlayback = () => {
        if (trimStart > 0) {
            howl.seek(trimStart);
        }
        howl.play();
    };

    if (howl.state() === 'loaded') {
        startPlayback();
    } else {
        howl.once('load', startPlayback);
    }

    activePreview = { cueId: cue.id, howl };
    notifyMonitorPreviewState(cue.id);
    document.dispatchEvent(new CustomEvent('cue-monitor-preview-started', {
        detail: { cueId: cue.id }
    }));
    return { success: true };
}
