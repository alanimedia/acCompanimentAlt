/**
 * Mirrors live cue playback to the monitor output device (second stereo pair).
 */

import {
    applySinkIdToHowl,
    getMonitorOutputDeviceId,
    shouldUseSeparateMonitorOutput
} from './audioOutputRouting.js';

export function disposeMonitorSound(playingState) {
    if (!playingState?.monitorSound) return;
    try {
        playingState.monitorSound.stop();
        playingState.monitorSound.unload();
    } catch (_) {
        // ignore cleanup errors
    }
    playingState.monitorSound = null;
}

function createMonitorSound(filePath, volume) {
    const monitorSound = new Howl({
        src: [filePath],
        html5: true,
        volume: volume ?? 1,
        preload: true
    });
    monitorSound.once('load', () => {
        applySinkIdToHowl(monitorSound, getMonitorOutputDeviceId());
    });
    return monitorSound;
}

export function attachMonitorToPlayingState(playingState, filePath, volume, mainDeviceId) {
    disposeMonitorSound(playingState);
    if (!shouldUseSeparateMonitorOutput(mainDeviceId)) return;
    playingState.monitorSound = createMonitorSound(filePath, volume);
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
    playingState.monitorSound.volume(volume);
}
