/**
 * Test tones, output level meters, and live level reporting for main/monitor outputs.
 */

import {
    normalizeSinkId,
    getMainOutputVolume,
    getMonitorOutputVolume
} from './audioOutputRouting.js';
import {
    createKWeightingChain,
    createLoudnessTracker,
    readAnalyserLoudness,
    loudnessFromPeak,
    peakToDbfs,
    formatLufs,
    formatDbfs
} from './audioLoudnessMeter.js';

const channels = {
    main: {
        deviceId: 'default',
        testNodes: null
    },
    monitor: {
        deviceId: 'default',
        testNodes: null
    }
};

const monitorLevelSources = new Map();
const howlAnalyserMap = new WeakMap();
const wavesurferAnalyserMap = new WeakMap();
const monitorAnalyserSources = new Set();
const activeTestContexts = new Set();

const OUTPUT_ANALYSER_FFT_SIZE = 2048;
const OUTPUT_ANALYSER_SMOOTHING = 0.5;
// HTML5 captureStream taps in Chromium read ~10 dB hot vs WebAudio bus meters.
const HTML5_CAPTURE_STREAM_CORRECTION = Math.pow(10, -10 / 20);

let mainAnalyser = null;
let mainAnalyserData = null;
let mainLoudnessTracker = createLoudnessTracker();
let mainLoudnessBuffer = { current: null };
let monitorLoudnessTracker = createLoudnessTracker();
let monitorMeterContext = null;
let meterRafId = null;
let onLevelsUpdate = null;
let mainPlaybackPeak = 0;
let mirroredMonitorPlaybackCount = 0;

function clampLevel(value) {
    return Math.max(0, Math.min(1, Number.isFinite(value) ? value : 0));
}

function ensureDataArray(analyser, existing) {
    const size = analyser.fftSize;
    if (!existing || existing.length !== size) {
        return new Uint8Array(size);
    }
    return existing;
}

function readTimeDomainPeak(analyser, dataArrayRef) {
    if (!analyser) return 0;
    const dataArray = ensureDataArray(analyser, dataArrayRef);
    analyser.getByteTimeDomainData(dataArray);
    let peak = 0;
    for (let i = 0; i < dataArray.length; i++) {
        const abs = Math.abs((dataArray[i] - 128) / 128);
        if (abs > peak) peak = abs;
    }
    return clampLevel(peak);
}

function readAnalyserLevel(analyser, dataArrayRef) {
    return readTimeDomainPeak(analyser, dataArrayRef);
}

function getMonitorMeterContext() {
    if (typeof Howler !== 'undefined' && Howler.ctx && Howler.ctx.state !== 'closed') {
        return Howler.ctx;
    }
    if (!monitorMeterContext || monitorMeterContext.state === 'closed') {
        monitorMeterContext = new AudioContext();
    }
    return monitorMeterContext;
}

function registerMonitorAnalyserTap(audioContext, sourceNode, isActive = () => true, { ownsSourceNode = false, signalCorrection = 1 } = {}) {
    const weighting = createKWeightingChain(audioContext);
    const analyser = audioContext.createAnalyser();
    analyser.fftSize = OUTPUT_ANALYSER_FFT_SIZE;
    analyser.smoothingTimeConstant = OUTPUT_ANALYSER_SMOOTHING;
    sourceNode.connect(weighting.input);
    weighting.output.connect(analyser);

    const entry = {
        analyser,
        dataArray: new Uint8Array(analyser.fftSize),
        loudnessBuffer: { current: null },
        loudnessTracker: createLoudnessTracker(),
        isActive,
        weighting,
        ownsSourceNode,
        sourceNode,
        signalCorrection,
        dispose() {
            monitorAnalyserSources.delete(entry);
            try { weighting.input.disconnect(); } catch (_) { /* ignore */ }
            try { weighting.output.disconnect(); } catch (_) { /* ignore */ }
            try { analyser.disconnect(); } catch (_) { /* ignore */ }
            if (ownsSourceNode) {
                try { sourceNode.disconnect(); } catch (_) { /* ignore */ }
            }
        }
    };
    monitorAnalyserSources.add(entry);
    return entry;
}

function readMonitorBusLevels() {
    let peak = 0;
    let activeEntry = null;
    monitorAnalyserSources.forEach((entry) => {
        if (entry.isActive && !entry.isActive()) return;
        const level = readTimeDomainPeak(entry.analyser, entry.dataArray) * (entry.signalCorrection || 1);
        if (level > peak) {
            peak = level;
            activeEntry = entry;
        }
    });
    return { peak, entry: activeEntry };
}

export function detachHowlOutputAnalyser(howl) {
    const entry = howlAnalyserMap.get(howl);
    if (entry) {
        entry.dispose();
        howlAnalyserMap.delete(howl);
    }
}

export function attachHowlOutputAnalyser(howl) {
    if (!howl) return;

    const attach = () => {
        if (howlAnalyserMap.has(howl)) return;
        const node = howl._sounds?.[0]?._node;
        if (!node || typeof node.captureStream !== 'function') return;

        try {
            const ctx = getMonitorMeterContext();
            const stream = node.captureStream();
            const source = ctx.createMediaStreamSource(stream);
            const entry = registerMonitorAnalyserTap(
                ctx,
                source,
                () => typeof howl.playing === 'function' && howl.playing(),
                { ownsSourceNode: true, signalCorrection: HTML5_CAPTURE_STREAM_CORRECTION }
            );
            howlAnalyserMap.set(howl, entry);
        } catch (error) {
            console.warn('audioOutputDiagnostics: Failed to attach Howl analyser:', error);
        }
    };

    howl.on('play', () => {
        // Defer tap setup so captureStream cannot interrupt Howl play start.
        setTimeout(attach, 0);
    });
    if (howl.state && howl.state() === 'loaded') {
        attach();
    }
    if (typeof howl.playing === 'function' && howl.playing()) {
        attach();
    }
}

export function detachWaveSurferOutputAnalyser(wavesurfer) {
    const entry = wavesurferAnalyserMap.get(wavesurfer);
    if (entry) {
        entry.dispose();
        wavesurferAnalyserMap.delete(wavesurfer);
    }
}

function getWaveSurferGainNode(wavesurfer) {
    const media = wavesurfer?.getMediaElement?.();
    if (!media || typeof media.getGainNode !== 'function') return null;
    return media.getGainNode();
}

export function attachWaveSurferOutputAnalyser(wavesurfer) {
    if (!wavesurfer) return;

    const attachFromMediaStream = () => {
        if (wavesurferAnalyserMap.has(wavesurfer)) return;
        const media = wavesurfer.getMediaElement?.();
        if (!media || typeof media.captureStream !== 'function') return;

        try {
            const ctx = getMonitorMeterContext();
            const stream = media.captureStream();
            const source = ctx.createMediaStreamSource(stream);
            const entry = registerMonitorAnalyserTap(
                ctx,
                source,
                () => typeof wavesurfer.isPlaying === 'function' && wavesurfer.isPlaying(),
                { ownsSourceNode: true, signalCorrection: HTML5_CAPTURE_STREAM_CORRECTION }
            );
            wavesurferAnalyserMap.set(wavesurfer, entry);
        } catch (error) {
            console.warn('audioOutputDiagnostics: Failed to attach WaveSurfer media analyser:', error);
        }
    };

    const attach = () => {
        if (wavesurferAnalyserMap.has(wavesurfer)) return;

        const gainNode = getWaveSurferGainNode(wavesurfer);
        if (gainNode) {
            try {
                const entry = registerMonitorAnalyserTap(
                    gainNode.context,
                    gainNode,
                    () => typeof wavesurfer.isPlaying === 'function' && wavesurfer.isPlaying(),
                    { ownsSourceNode: false }
                );
                wavesurferAnalyserMap.set(wavesurfer, entry);
                return;
            } catch (error) {
                console.warn('audioOutputDiagnostics: Failed to attach WaveSurfer gain analyser:', error);
            }
        }

        attachFromMediaStream();
    };

    const detach = () => {
        detachWaveSurferOutputAnalyser(wavesurfer);
    };

    wavesurfer.on('play', attach);
    wavesurfer.once('destroy', detach);
    if (typeof wavesurfer.isPlaying === 'function' && wavesurfer.isPlaying()) {
        attach();
    }
}

function readHowlAnalyserLevel(howl) {
    if (!howl || typeof howl.playing !== 'function' || !howl.playing()) return 0;
    const entry = howlAnalyserMap.get(howl);
    if (!entry) return 0;
    return readTimeDomainPeak(entry.analyser, entry.dataArray);
}

function readWaveSurferAnalyserLevel(wavesurfer) {
    if (!wavesurfer || typeof wavesurfer.isPlaying !== 'function' || !wavesurfer.isPlaying()) return 0;
    if (getMonitorOutputVolume() <= 0.001) return 0;
    const entry = wavesurferAnalyserMap.get(wavesurfer);
    if (!entry) return 0;
    return readTimeDomainPeak(entry.analyser, entry.dataArray);
}

function getMonitorLiveLevel() {
    const busPeak = readMonitorBusLevels().peak;
    if (busPeak > 0) return busPeak;

    let peak = 0;
    monitorLevelSources.forEach((getLevel) => {
        try {
            peak = Math.max(peak, clampLevel(getLevel()));
        } catch (_) {
            // ignore bad source
        }
    });
    return peak;
}

/** Mirrored show playback uses the main bus meter (same program, monitor fader). */
export function registerMirroredMonitorPlayback() {
    mirroredMonitorPlaybackCount += 1;
    return () => {
        mirroredMonitorPlaybackCount = Math.max(0, mirroredMonitorPlaybackCount - 1);
    };
}

export function updateMainOutputLiveLevel(level) {
    const outputVol = getMainOutputVolume();
    if (outputVol <= 0.001) {
        mainPlaybackPeak = 0;
        return;
    }
    // Per-cue analyser is pre–master-gain; scale by main fader to match post-fader output.
    mainPlaybackPeak = Math.max(mainPlaybackPeak, clampLevel(level) * outputVol);
}

async function closeTestAudioContext(audioContext) {
    if (!audioContext) return;
    activeTestContexts.delete(audioContext);
    try {
        if (audioContext.state !== 'closed') {
            await audioContext.suspend();
            await audioContext.close();
        }
    } catch (_) {
        // ignore
    }
}

async function stopChannelTest(channelKey) {
    const channel = channels[channelKey];
    if (!channel?.testNodes) return;

    const { oscillator, gainNode, analyser, audioContext } = channel.testNodes;
    channel.testNodes = null;

    try {
        if (gainNode && audioContext && audioContext.state !== 'closed') {
            gainNode.gain.cancelScheduledValues(audioContext.currentTime);
            gainNode.gain.setValueAtTime(0, audioContext.currentTime);
        }
        if (oscillator) {
            oscillator.onended = null;
            try {
                oscillator.stop();
            } catch (_) {
                // already stopped
            }
            oscillator.disconnect();
        }
        gainNode?.disconnect();
        analyser?.disconnect();
    } catch (_) {
        // ignore
    }

    await closeTestAudioContext(audioContext);
}

export async function stopAllOutputChannelTests() {
    await stopChannelTest('main');
    await stopChannelTest('monitor');
    const lingering = [...activeTestContexts];
    activeTestContexts.clear();
    await Promise.all(lingering.map((ctx) => closeTestAudioContext(ctx)));
}

function tickMeters() {
    const mainTestLevel = channels.main.testNodes?.analyser
        ? readAnalyserLevel(channels.main.testNodes.analyser, channels.main.testNodes.dataArray)
        : 0;
    const monitorTestLevel = channels.monitor.testNodes?.analyser
        ? readAnalyserLevel(channels.monitor.testNodes.analyser, channels.monitor.testNodes.dataArray)
        : 0;

    const mainAnalyserLevel = mainAnalyser
        ? readAnalyserLevel(mainAnalyser, mainAnalyserData)
        : 0;
    if (mainAnalyser && mainAnalyserData) {
        // keep shared buffer reference updated
    }

    const mainVol = getMainOutputVolume();
    const monitorVol = getMonitorOutputVolume();

    const mainLiveLevel = (mainAnalyser && mainVol > 0.001)
        ? mainAnalyserLevel
        : mainPlaybackPeak;
    mainPlaybackPeak *= 0.9;
    if (mainVol <= 0.001) {
        mainPlaybackPeak = 0;
    }

    const { peak: monitorBusPeak, entry: monitorBusEntry } = readMonitorBusLevels();
    const monitorLiveLevel = monitorBusPeak > 0 ? monitorBusPeak : getMonitorLiveLevel();

    if (mainVol > 0.001 && mainAnalyser) {
        readAnalyserLoudness(mainAnalyser, mainLoudnessTracker, mainLoudnessBuffer);
    } else if (mainVol <= 0.001) {
        mainLoudnessTracker.momentary = Number.NEGATIVE_INFINITY;
        mainLoudnessTracker.shortTerm *= 0.85;
    }
    if (monitorBusEntry && monitorVol > 0.001 && monitorBusPeak > 0.001) {
        readAnalyserLoudness(
            monitorBusEntry.analyser,
            monitorBusEntry.loudnessTracker,
            monitorBusEntry.loudnessBuffer
        );
    } else if (monitorLiveLevel <= 0.001 || monitorVol <= 0.001) {
        monitorLoudnessTracker.momentary = Number.NEGATIVE_INFINITY;
        monitorLoudnessTracker.shortTerm *= 0.98;
    }

    const mainRawPeak = clampLevel(Math.max(mainTestLevel, mainLiveLevel));
    const monitorRawPeak = clampLevel(Math.max(monitorTestLevel, monitorLiveLevel));
    const mainPeak = mainVol <= 0.001 ? 0 : mainRawPeak;

    let mainLufsValue = mainLoudnessTracker.shortTerm;
    if (channels.main.testNodes) {
        mainLufsValue = loudnessFromPeak(mainPeak);
    } else if (mainVol <= 0.001 || !mainAnalyser) {
        mainLufsValue = Number.NEGATIVE_INFINITY;
    }

    let monitorPeak = monitorVol <= 0.001 ? 0 : monitorRawPeak;
    let monitorLufsValue = monitorBusEntry?.loudnessTracker?.shortTerm ?? monitorLoudnessTracker.shortTerm;
    if (channels.monitor.testNodes) {
        monitorLufsValue = loudnessFromPeak(monitorPeak);
    } else if (monitorLiveLevel <= 0.001 || monitorVol <= 0.001) {
        monitorLufsValue = Number.NEGATIVE_INFINITY;
    }

    // Mirrored live playback is the same program as main — use the main bus tap, not
    // captureStream on the separate HTML5 monitor Howl (reads ~10 dB hot in Chromium).
    if (mirroredMonitorPlaybackCount > 0 && mainVol > 0.001 && mainPeak > 0.001) {
        const faderRatio = monitorVol / mainVol;
        monitorPeak = clampLevel(mainPeak * faderRatio);
        monitorLufsValue = mainLufsValue;
    }

    const levels = {
        main: mainPeak,
        monitor: monitorPeak,
        dbfs: {
            main: peakToDbfs(mainPeak),
            monitor: peakToDbfs(monitorPeak)
        },
        lufs: {
            main: mainLufsValue,
            monitor: monitorLufsValue
        }
    };

    if (typeof onLevelsUpdate === 'function') {
        onLevelsUpdate(levels);
    }

    meterRafId = requestAnimationFrame(tickMeters);
}

export function ensureMainOutputAnalyser() {
    if (typeof Howler === 'undefined' || !Howler.ctx || !Howler.masterGain) {
        return mainAnalyser;
    }
    if (mainAnalyser) {
        return mainAnalyser;
    }
    try {
        const weighting = createKWeightingChain(Howler.ctx);
        mainAnalyser = Howler.ctx.createAnalyser();
        mainAnalyser.fftSize = OUTPUT_ANALYSER_FFT_SIZE;
        mainAnalyser.smoothingTimeConstant = OUTPUT_ANALYSER_SMOOTHING;
        mainAnalyserData = new Uint8Array(mainAnalyser.fftSize);
        mainLoudnessBuffer = { current: new Float32Array(mainAnalyser.fftSize) };
        Howler.masterGain.disconnect();
        Howler.masterGain.connect(weighting.input);
        weighting.output.connect(mainAnalyser);
        mainAnalyser.connect(Howler.ctx.destination);
    } catch (error) {
        console.warn('audioOutputDiagnostics: Failed to hook main output analyser:', error);
        mainAnalyser = null;
        mainAnalyserData = null;
    }
    return mainAnalyser;
}

export function formatOutputLoudness(levels) {
    return {
        main: formatLufs(levels?.lufs?.main),
        monitor: formatLufs(levels?.lufs?.monitor),
        mainDbfs: formatDbfs(levels?.dbfs?.main),
        monitorDbfs: formatDbfs(levels?.dbfs?.monitor)
    };
}

export function initAudioOutputDiagnostics(callback) {
    onLevelsUpdate = callback;
    ensureMainOutputAnalyser();
    if (!meterRafId) {
        meterRafId = requestAnimationFrame(tickMeters);
    }
}

export function disposeAudioOutputDiagnostics() {
    if (meterRafId) {
        cancelAnimationFrame(meterRafId);
        meterRafId = null;
    }
    stopAllOutputChannelTests();
    onLevelsUpdate = null;
}

export function setOutputChannelDevice(channelKey, deviceId) {
    if (!channels[channelKey]) return;
    const nextId = deviceId || 'default';
    const deviceChanged = channels[channelKey].deviceId !== nextId;
    channels[channelKey].deviceId = nextId;
    if (deviceChanged && channels[channelKey].testNodes) {
        stopChannelTest(channelKey);
    }
}

export function syncOutputChannelDevice(channelKey, deviceId) {
    if (!channels[channelKey]) return;
    const nextId = deviceId || 'default';
    if (channels[channelKey].deviceId !== nextId) {
        channels[channelKey].deviceId = nextId;
    }
}

export function isOutputChannelTestPlaying(channelKey) {
    return !!channels[channelKey]?.testNodes;
}

export async function stopOutputChannelTest(channelKey) {
    if (!channels[channelKey]?.testNodes) return false;
    await stopChannelTest(channelKey);
    return true;
}

export async function startOutputChannelTest(channelKey) {
    if (!channels[channelKey]) return false;

    await stopAllOutputChannelTests();

    const channel = channels[channelKey];
    const outputVolume = channelKey === 'main' ? getMainOutputVolume() : getMonitorOutputVolume();
    const audioContext = new AudioContext();
    activeTestContexts.add(audioContext);
    try {
        if (audioContext.state === 'suspended') {
            await audioContext.resume();
        }
        if (typeof audioContext.setSinkId === 'function') {
            await audioContext.setSinkId(normalizeSinkId(channel.deviceId));
        }
    } catch (error) {
        console.warn(`audioOutputDiagnostics: Failed to set ${channelKey} test sink:`, error);
        await closeTestAudioContext(audioContext);
        return false;
    }

    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();
    const analyser = audioContext.createAnalyser();
    analyser.fftSize = 512;
    analyser.smoothingTimeConstant = 0.75;
    oscillator.type = 'sine';
    oscillator.frequency.value = channelKey === 'main' ? 440 : 523.25;
    gainNode.gain.value = 0.35 * outputVolume;
    oscillator.connect(gainNode);
    gainNode.connect(analyser);
    analyser.connect(audioContext.destination);
    oscillator.start(0);

    channel.testNodes = {
        audioContext,
        oscillator,
        gainNode,
        analyser,
        dataArray: new Uint8Array(analyser.fftSize),
        channelKey
    };
    return true;
}

export async function toggleOutputChannelTest(channelKey) {
    if (isOutputChannelTestPlaying(channelKey)) {
        await stopOutputChannelTest(channelKey);
        return false;
    }
    return startOutputChannelTest(channelKey);
}

export function registerMonitorLevelSource(sourceId, getLevel) {
    if (!sourceId || typeof getLevel !== 'function') return () => {};
    monitorLevelSources.set(sourceId, getLevel);
    return () => monitorLevelSources.delete(sourceId);
}

export function createHowlMonitorLevelSource(howl) {
    attachHowlOutputAnalyser(howl);
    return () => readHowlAnalyserLevel(howl);
}

export function createWaveSurferMonitorLevelSource(wavesurfer) {
    attachWaveSurferOutputAnalyser(wavesurfer);
    return () => readWaveSurferAnalyserLevel(wavesurfer);
}

export function refreshActiveTestToneVolumes() {
    ['main', 'monitor'].forEach((channelKey) => {
        const nodes = channels[channelKey]?.testNodes;
        if (!nodes?.gainNode) return;
        const outputVolume = channelKey === 'main' ? getMainOutputVolume() : getMonitorOutputVolume();
        nodes.gainNode.gain.value = 0.35 * outputVolume;
    });
}
