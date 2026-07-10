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
const activeTestContexts = new Set();

let mainAnalyser = null;
let mainAnalyserData = null;
let mainLoudnessTracker = createLoudnessTracker();
let mainLoudnessBuffer = { current: null };
let monitorLoudnessTracker = createLoudnessTracker();
let monitorMeterContext = null;
let meterRafId = null;
let onLevelsUpdate = null;
let mainPlaybackPeak = 0;

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
    if (!monitorMeterContext || monitorMeterContext.state === 'closed') {
        monitorMeterContext = new AudioContext();
    }
    return monitorMeterContext;
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
            const analyser = ctx.createAnalyser();
            analyser.fftSize = 512;
            analyser.smoothingTimeConstant = 0.75;
            source.connect(analyser);
            howlAnalyserMap.set(howl, {
                analyser,
                dataArray: new Uint8Array(analyser.fftSize)
            });
        } catch (error) {
            console.warn('audioOutputDiagnostics: Failed to attach Howl analyser:', error);
        }
    };

    howl.on('play', attach);
    if (howl.state && howl.state() === 'loaded') {
        attach();
    }
}

function readHowlAnalyserLevel(howl) {
    if (!howl || typeof howl.playing !== 'function' || !howl.playing()) return 0;
    const entry = howlAnalyserMap.get(howl);
    if (!entry) return 0;
    return readTimeDomainPeak(entry.analyser, entry.dataArray);
}

function getMonitorLiveLevel() {
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

    const mainLiveLevel = Math.max(mainPlaybackPeak, mainAnalyserLevel);
    mainPlaybackPeak *= 0.9;
    if (mainVol <= 0.001) {
        mainPlaybackPeak = 0;
    }

    const monitorLiveLevel = getMonitorLiveLevel();

    if (mainVol > 0.001 && mainAnalyser) {
        readAnalyserLoudness(mainAnalyser, mainLoudnessTracker, mainLoudnessBuffer);
    } else if (mainVol <= 0.001) {
        mainLoudnessTracker.momentary = Number.NEGATIVE_INFINITY;
        mainLoudnessTracker.shortTerm *= 0.85;
    }
    if (monitorLiveLevel > 0.001 && monitorVol > 0.001) {
        monitorLoudnessTracker.momentary = loudnessFromPeak(monitorLiveLevel);
        monitorLoudnessTracker.shortTerm = Number.isFinite(monitorLoudnessTracker.shortTerm)
            ? monitorLoudnessTracker.shortTerm * 0.85 + monitorLoudnessTracker.momentary * 0.15
            : monitorLoudnessTracker.momentary;
    } else {
        monitorLoudnessTracker.momentary = Number.NEGATIVE_INFINITY;
        monitorLoudnessTracker.shortTerm *= 0.98;
    }

    const mainRawPeak = clampLevel(Math.max(mainTestLevel, mainLiveLevel));
    const monitorRawPeak = clampLevel(Math.max(monitorTestLevel, monitorLiveLevel));
    const mainPeak = mainVol <= 0.001 ? 0 : mainRawPeak;
    const monitorPeak = monitorVol <= 0.001 ? 0 : monitorRawPeak;

    let mainLufsValue = mainLoudnessTracker.shortTerm;
    if (channels.main.testNodes) {
        mainLufsValue = loudnessFromPeak(mainPeak);
    } else if (mainVol <= 0.001 || !mainAnalyser) {
        mainLufsValue = Number.NEGATIVE_INFINITY;
    }

    let monitorLufsValue = monitorLoudnessTracker.shortTerm;
    if (channels.monitor.testNodes) {
        monitorLufsValue = loudnessFromPeak(monitorPeak);
    } else if (monitorLiveLevel <= 0.001 || monitorVol <= 0.001) {
        monitorLufsValue = Number.NEGATIVE_INFINITY;
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
        mainAnalyser.fftSize = 2048;
        mainAnalyser.smoothingTimeConstant = 0.5;
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

export function refreshActiveTestToneVolumes() {
    ['main', 'monitor'].forEach((channelKey) => {
        const nodes = channels[channelKey]?.testNodes;
        if (!nodes?.gainNode) return;
        const outputVolume = channelKey === 'main' ? getMainOutputVolume() : getMonitorOutputVolume();
        nodes.gainNode.gain.value = 0.35 * outputVolume;
    });
}
