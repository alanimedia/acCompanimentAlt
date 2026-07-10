/**
 * Shared cue monitor-preview button behavior for playback and edit cards.
 */

import {
    previewCueOnMonitor,
    stopCueMonitorPreview,
    isCueMonitorPreviewActive
} from '../cueMonitorPreview.js';

export function setPreviewButtonState(previewBtn, active) {
    if (!previewBtn) return;
    previewBtn.classList.toggle('active', active);
    previewBtn.classList.toggle('is-previewing', active);
    previewBtn.setAttribute('aria-pressed', active ? 'true' : 'false');
    previewBtn.textContent = active ? '■' : '♪';
    previewBtn.title = active ? 'Stop preview on monitor output' : 'Preview on monitor output';
    previewBtn.setAttribute(
        'aria-label',
        active ? 'Stop preview on monitor output' : 'Preview on monitor output'
    );
}

export function syncAllCuePreviewButtons(activeCueId = null) {
    document.querySelectorAll('.cue-preview-btn').forEach((btn) => {
        const host = btn.closest('[data-cue-id]');
        const cueId = host?.dataset?.cueId;
        const active = activeCueId
            ? cueId === activeCueId
            : !!(cueId && isCueMonitorPreviewActive(cueId));
        setPreviewButtonState(btn, active);
    });
}

export function createCuePreviewButton(cue, resolveAudioPathFn) {
    const previewBtn = document.createElement('button');
    previewBtn.type = 'button';
    previewBtn.className = 'cue-preview-btn';
    previewBtn.title = 'Preview on monitor output';
    previewBtn.setAttribute('aria-label', 'Preview on monitor output');
    previewBtn.setAttribute('aria-pressed', 'false');
    previewBtn.textContent = '♪';
    previewBtn.addEventListener('click', (event) => {
        handleCuePreviewClick(event, cue, previewBtn, resolveAudioPathFn);
    });
    if (cue?.id && isCueMonitorPreviewActive(cue.id)) {
        setPreviewButtonState(previewBtn, true);
    }
    return previewBtn;
}

export async function handleCuePreviewClick(event, cue, previewBtn, resolveAudioPathFn) {
    event.preventDefault();
    event.stopPropagation();

    if (!cue) return;

    if (isCueMonitorPreviewActive(cue.id)) {
        stopCueMonitorPreview();
        syncAllCuePreviewButtons(null);
        return;
    }

    syncAllCuePreviewButtons(null);

    const result = await previewCueOnMonitor(cue, resolveAudioPathFn);

    if (result?.success) {
        syncAllCuePreviewButtons(cue.id);
    } else {
        setPreviewButtonState(previewBtn, false);
        console.warn(`Cue preview failed for ${cue.id}: ${result?.error || 'unknown error'}`);
    }
}
