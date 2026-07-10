/**
 * Mirrors live cue playback to the monitor output device (second stereo pair).
 */

import {
    applySinkIdToHowl,
    getMonitorOutputDeviceId,
    shouldUseSeparateMonitorOutput,
    registerMonitorHowl,
    applyMonitorVolumeMultiplier
} from './audioOutputRouting.js';
import {
    registerMirroredMonitorPlayback,
    detachHowlOutputAnalyser
} from './audioOutputDiagnostics.js';

const monitorLevelUnregisters = new WeakMap();
const monitorHowlUnregisters = new WeakMap();

function trackMonitorLevel(playingState, howl) {
    const previousUnregister = monitorLevelUnregisters.get(playingState);
    if (previousUnregister) previousUnregister();

    const previousHowlUnregister = monitorHowlUnregisters.get(playingState);
    if (previousHowlUnregister) previousHowlUnregister();

    if (!howl) return;
    const baseVolume = typeof howl._acBaseVolume === 'number'
        ? howl._acBaseVolume
        : (typeof howl.volume === 'function' ? howl.volume() : 1);
    monitorHowlUnregisters.set(playingState, registerMonitorHowl(howl, baseVolume));
    monitorLevelUnregisters.set(playingState, registerMirroredMonitorPlayback());
}

function clearMonitorLevel(playingState) {
    const unregister = monitorLevelUnregisters.get(playingState);
    if (unregister) unregister();
    monitorLevelUnregisters.delete(playingState);

    const howlUnregister = monitorHowlUnregisters.get(playingState);
    if (howlUnregister) howlUnregister();
    monitorHowlUnregisters.delete(playingState);
}

export function disposeMonitorSound(playingState) {
    if (!playingState?.monitorSound) {
        clearMonitorLevel(playingState);
        return;
    }
    clearMonitorLevel(playingState);
    try {
        if (playingState.monitorSound) {
            detachHowlOutputAnalyser(playingState.monitorSound);
        }
        playingState.monitorSound.stop();
        playingState.monitorSound.unload();
    } catch (_) {
        // ignore cleanup errors
    }
    playingState.monitorSound = null;
}

function createMonitorSound(filePath, volume) {
    const baseVolume = volume ?? 1;
    const monitorSound = new Howl({
        src: [filePath],
        html5: true,
        volume: applyMonitorVolumeMultiplier(baseVolume),
        preload: true
    });
    monitorSound._acBaseVolume = baseVolume;
    const applySink = () => applySinkIdToHowl(monitorSound, getMonitorOutputDeviceId());
    monitorSound.once('load', applySink);
    monitorSound.on('play', applySink);
    return monitorSound;
}

export function attachMonitorToPlayingState(playingState, filePath, volume, mainDeviceId) {
    disposeMonitorSound(playingState);
    if (!shouldUseSeparateMonitorOutput(mainDeviceId)) return;
    const monitorSound = createMonitorSound(filePath, volume);
    playingState.monitorSound = monitorSound;
    trackMonitorLevel(playingState, monitorSound);
}

export function syncMonitorPlay(playingState, mainSound) {
    const monitor = playingState?.monitorSound;
    if (!monitor || !mainSound) return;

    const seekTime = typeof mainSound.seek === 'function' ? mainSound.seek() : 0;
    const startMonitor = () => {
        monitor.seek(seekTime);
        if (!monitor.playing()) monitor.play();
    };

    if (monitor.state() === 'loaded') {
        startMonitor();
        return;
    }
    monitor.once('load', startMonitor);
}

export function syncMonitorPause(playingState) {
    playingState?.monitorSound?.pause();
}

export function syncMonitorStop(playingState) {
    disposeMonitorSound(playingState);
}

export function syncMonitorSeek(playingState, seekTime) {
    const monitor = playingState?.monitorSound;
    if (!monitor || monitor.state() !== 'loaded') return;
    monitor.seek(seekTime);
}

export function syncMonitorVolume(playingState, volume) {
    if (!playingState?.monitorSound) return;
    const baseVolume = clampVolume(volume);
    playingState.monitorSound._acBaseVolume = baseVolume;
    playingState.monitorSound.volume(applyMonitorVolumeMultiplier(baseVolume));
}

function clampVolume(value) {
    return Math.max(0, Math.min(1, Number.isFinite(value) ? value : 0));
}
