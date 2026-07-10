/**
 * Shared audio output routing for main show playback and monitor/preview output.
 */

let monitorOutputDeviceId = 'default';
let routeShowPlaybackToMonitor = false;
let mainOutputVolume = 1;
let monitorOutputVolume = 1;

const previewWaveSurfers = new Set();
const activeMonitorHowls = new Set();

function clampVolume(value) {
    return Math.max(0, Math.min(1, Number.isFinite(value) ? value : 0));
}

export function getMainOutputVolume() {
    return mainOutputVolume;
}

export function getMonitorOutputVolume() {
    return monitorOutputVolume;
}

export function setMainOutputVolume(volume) {
    mainOutputVolume = clampVolume(volume);
    if (typeof Howler !== 'undefined' && typeof Howler.volume === 'function') {
        Howler.volume(mainOutputVolume);
    }
}

export function applyMonitorVolumeMultiplier(baseVolume) {
    return clampVolume(baseVolume) * monitorOutputVolume;
}

export function setMonitorOutputVolume(volume) {
    monitorOutputVolume = clampVolume(volume);
    activeMonitorHowls.forEach((howl) => {
        if (!howl || typeof howl.volume !== 'function') return;
        const base = typeof howl._acBaseVolume === 'number' ? howl._acBaseVolume : howl.volume();
        howl.volume(applyMonitorVolumeMultiplier(base));
    });
    previewWaveSurfers.forEach((wavesurfer) => {
        if (wavesurfer && typeof wavesurfer.setVolume === 'function') {
            const base = typeof wavesurfer._acBaseVolume === 'number' ? wavesurfer._acBaseVolume : 1;
            wavesurfer.setVolume(applyMonitorVolumeMultiplier(base));
        }
    });
}

export function registerMonitorHowl(howl, baseVolume) {
    if (!howl) return () => {};
    howl._acBaseVolume = clampVolume(baseVolume);
    howl.volume(applyMonitorVolumeMultiplier(howl._acBaseVolume));
    activeMonitorHowls.add(howl);
    return () => activeMonitorHowls.delete(howl);
}

export function bindPreviewWaveSurferVolume(wavesurfer, baseVolume = 1) {
    if (!wavesurfer) return;
    wavesurfer._acBaseVolume = clampVolume(baseVolume);
    if (typeof wavesurfer.setVolume === 'function') {
        wavesurfer.setVolume(applyMonitorVolumeMultiplier(wavesurfer._acBaseVolume));
    }
}

export function normalizeSinkId(deviceId) {
    if (!deviceId || deviceId === 'default') return '';
    return deviceId;
}

export function setMonitorOutputDeviceId(deviceId) {
    monitorOutputDeviceId = deviceId || 'default';
    previewWaveSurfers.forEach((wavesurfer) => {
        applySinkIdToWaveSurfer(wavesurfer, monitorOutputDeviceId);
    });
}

export function getMonitorOutputDeviceId() {
    return monitorOutputDeviceId;
}

export function setRouteShowPlaybackToMonitor(enabled) {
    routeShowPlaybackToMonitor = !!enabled;
}

export function isRouteShowPlaybackToMonitorEnabled() {
    return routeShowPlaybackToMonitor;
}

export function shouldUseSeparateMonitorOutput(mainDeviceId) {
    if (!routeShowPlaybackToMonitor) return false;
    return normalizeSinkId(mainDeviceId) !== normalizeSinkId(monitorOutputDeviceId);
}

export async function applySinkIdToWaveSurfer(wavesurfer, deviceId) {
    if (!wavesurfer || typeof wavesurfer.setSinkId !== 'function') return false;
    try {
        await wavesurfer.setSinkId(normalizeSinkId(deviceId));
        return true;
    } catch (error) {
        console.warn('audioOutputRouting: Failed to set WaveSurfer sink:', error);
        return false;
    }
}

export async function applySinkIdToHowl(howl, deviceId) {
    const audioNode = howl?._sounds?.[0]?._node;
    if (!audioNode || typeof audioNode.setSinkId !== 'function') return false;
    try {
        await audioNode.setSinkId(normalizeSinkId(deviceId));
        return true;
    } catch (error) {
        console.warn('audioOutputRouting: Failed to set Howl sink:', error);
        return false;
    }
}

/** Register a WaveSurfer instance used for local preview/editing audio. */
export function registerPreviewWaveSurfer(wavesurfer) {
    if (!wavesurfer) return () => {};
    previewWaveSurfers.add(wavesurfer);
    applySinkIdToWaveSurfer(wavesurfer, monitorOutputDeviceId);
    bindPreviewWaveSurferVolume(wavesurfer, wavesurfer._acBaseVolume ?? 1);
    return () => previewWaveSurfers.delete(wavesurfer);
}

export function bindPreviewWaveSurferOnReady(wavesurfer) {
    if (!wavesurfer) return () => {};
    let unregister = null;
    const attach = () => {
        if (unregister) unregister();
        unregister = registerPreviewWaveSurfer(wavesurfer);
    };
    if (typeof wavesurfer.getDuration === 'function' && wavesurfer.getDuration() > 0) {
        attach();
    } else {
        wavesurfer.once('ready', attach);
    }
    return () => {
        if (unregister) unregister();
        unregister = null;
    };
}
