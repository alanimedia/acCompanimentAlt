/**
 * Approximate EBU R128 momentary loudness (LUFS) from a Web Audio analyser tap.
 */

export function createKWeightingChain(audioContext) {
    const highPass = audioContext.createBiquadFilter();
    highPass.type = 'highpass';
    highPass.frequency.value = 38;
    highPass.Q.value = 0.707;

    const highShelf = audioContext.createBiquadFilter();
    highShelf.type = 'highshelf';
    highShelf.frequency.value = 1681;
    highShelf.gain.value = 4.0;
    highShelf.Q.value = 0.707;

    highPass.connect(highShelf);
    return { input: highPass, output: highShelf };
}

export function createLoudnessTracker() {
    return {
        momentary: Number.NEGATIVE_INFINITY,
        shortTerm: Number.NEGATIVE_INFINITY,
        integrated: Number.NEGATIVE_INFINITY,
        blockSumSquare: 0,
        blockSamples: 0,
        integratedSumSquare: 0,
        integratedSamples: 0
    };
}

function loudnessFromMeanSquare(meanSquare) {
    if (!Number.isFinite(meanSquare) || meanSquare <= 1e-12) {
        return Number.NEGATIVE_INFINITY;
    }
    return -0.691 + 10 * Math.log10(meanSquare);
}

export function pushLoudnessSamples(tracker, samples) {
    if (!tracker || !samples || samples.length === 0) return tracker;

    let blockSumSquare = 0;
    for (let i = 0; i < samples.length; i++) {
        blockSumSquare += samples[i] * samples[i];
    }

    const blockMeanSquare = blockSumSquare / samples.length;
    const momentary = loudnessFromMeanSquare(blockMeanSquare);
    tracker.momentary = momentary;

    if (Number.isFinite(momentary)) {
        tracker.shortTerm = Number.isFinite(tracker.shortTerm)
            ? tracker.shortTerm * 0.85 + momentary * 0.15
            : momentary;
    } else {
        tracker.shortTerm *= 0.98;
    }

    tracker.blockSumSquare += blockSumSquare;
    tracker.blockSamples += samples.length;

    if (tracker.blockSamples >= 2048) {
        const integratedMeanSquare = tracker.blockSumSquare / tracker.blockSamples;
        const blockLoudness = loudnessFromMeanSquare(integratedMeanSquare);
        if (Number.isFinite(blockLoudness) && blockLoudness > -70) {
            tracker.integratedSumSquare += integratedMeanSquare * tracker.blockSamples;
            tracker.integratedSamples += tracker.blockSamples;
            const integratedMean = tracker.integratedSumSquare / tracker.integratedSamples;
            tracker.integrated = loudnessFromMeanSquare(integratedMean);
        }
        tracker.blockSumSquare = 0;
        tracker.blockSamples = 0;
    }

    return tracker;
}

export function readAnalyserLoudness(analyser, tracker, floatBufferRef) {
    if (!analyser) return tracker;

    const size = analyser.fftSize;
    let buffer = floatBufferRef.current;
    if (!buffer || buffer.length !== size) {
        buffer = new Float32Array(size);
        floatBufferRef.current = buffer;
    }

    analyser.getFloatTimeDomainData(buffer);
    return pushLoudnessSamples(tracker, buffer);
}

export function formatLufs(value) {
    if (!Number.isFinite(value) || value <= -100) return '— LUFS';
    return `${value.toFixed(1)} LUFS`;
}

export function peakToDbfs(peak) {
    const linear = Math.max(0, Math.min(1, Number(peak) || 0));
    if (linear <= 1e-6) return Number.NEGATIVE_INFINITY;
    return 20 * Math.log10(linear);
}

export function formatDbfs(value) {
    if (!Number.isFinite(value) || value <= -100) return '−∞ dBFS';
    return `${value.toFixed(1)} dBFS`;
}

export function formatDbfsCompact(value) {
    if (!Number.isFinite(value) || value <= -100) return '−∞';
    return value.toFixed(1);
}

export function loudnessFromPeak(peak) {
    const clamped = Math.max(1e-6, Math.min(1, peak || 0));
    return -0.691 + 20 * Math.log10(clamped);
}
