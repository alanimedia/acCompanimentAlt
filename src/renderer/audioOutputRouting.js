/**
 * Shared audio output routing for main show playback and monitor/preview output.
 */

let monitorOutputDeviceId = 'default';
let routeShowPlaybackToMonitor = false;

const previewWaveSurfers = new Set();

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
