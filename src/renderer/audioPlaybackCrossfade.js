// audioPlaybackCrossfade.js
// Crossfade functionality for audio playback management

import { log } from './audioPlaybackLogger.js';
import { resolveConfiguredCueVolume, ensurePlayingStateOriginalVolume } from './audioPlaybackUtils.js';

// Crossfade functionality
function handleCrossfadeToggle(cueId, getGlobalCueByIdRef, currentlyPlaying, toggleCue, _handleCrossfadeStart) {
    console.log(`AudioPlaybackManager: Crossfade toggle for cue ${cueId}`);
    
    const cue = getGlobalCueByIdRef(cueId);
    if (!cue) {
        console.error(`AudioPlaybackManager: Cue ${cueId} not found for crossfade`);
        return;
    }

    // Check if crossfade mode is enabled via UI
    const isCrossfadeMode = window.ui && window.ui.isCrossfadeEnabled && window.ui.isCrossfadeEnabled();
    
    if (isCrossfadeMode && !currentlyPlaying[cueId]) {
        // Crossfade mode: fade out other playing cues and start this one
        _handleCrossfadeStart(cueId, cue);
    } else {
        // Normal mode: use regular toggle behavior
        toggleCue(cueId);
    }
}

function _handleCrossfadeStart(newCueId, newCue, currentlyPlaying, getAppConfigFuncRef, cueGridAPIRef, stop, play, _playTargetItem, getGlobalCueByIdRef) {
    console.log(`AudioPlaybackManager: Starting crossfade to cue ${newCueId}`);
    
    // Get crossfade duration from app config
    const appConfig = getAppConfigFuncRef ? getAppConfigFuncRef() : {};
    const crossfadeDuration = appConfig.crossfadeTime || 2000; // Default to 2 seconds
    console.log(`AudioPlaybackManager: Using crossfade duration: ${crossfadeDuration}ms from config`);
    
    // Count currently playing cues
    const playingCues = Object.keys(currentlyPlaying);
    console.log(`AudioPlaybackManager: Currently playing cues for crossfade: ${playingCues.length}`, playingCues);
    
    // Fade out all currently playing cues with timer display
    for (const cueId in currentlyPlaying) {
        if (cueId !== newCueId) {
            const playingState = currentlyPlaying[cueId];
            if (playingState && playingState.sound) {
                console.log(`AudioPlaybackManager: Fading out cue ${cueId} for crossfade (current vol: ${playingState.sound.volume()})`);
                
                const outgoingCue = getGlobalCueByIdRef ? getGlobalCueByIdRef(cueId) : null;
                ensurePlayingStateOriginalVolume(playingState, outgoingCue);
                
                // Mark as fading out for UI + remote IPC (uses fadeStartTime/fadeTotalDurationMs)
                const fadeOutStartTime = Date.now();
                playingState.isFadingOut = true;
                playingState.isFadingIn = false;
                playingState.fadeOutStartTime = fadeOutStartTime;
                playingState.fadeOutDuration = crossfadeDuration;
                playingState.fadeStartTime = fadeOutStartTime;
                playingState.fadeTotalDurationMs = crossfadeDuration;
                
                // Start fade out with Howler
                playingState.sound.fade(playingState.sound.volume(), 0, crossfadeDuration);
                
                // Create fade-out timer for UI updates
                console.log(`🎵 CROSSFADE: Creating fade-out interval for ${cueId}, duration: ${crossfadeDuration}ms`);
                const fadeOutInterval = setInterval(() => {
                    const elapsed = Date.now() - playingState.fadeOutStartTime;
                    const remaining = Math.max(0, crossfadeDuration - elapsed);
                    const remainingSeconds = (remaining / 1000).toFixed(1);
                    
                    console.log(`🎵 CROSSFADE: Fade-out interval tick for ${cueId}, remaining: ${remainingSeconds}s`);
                    
                    // Update UI to show fade-out progress
                    if (cueGridAPIRef && cueGridAPIRef.updateButtonPlayingState) {
                        console.log(`🎵 CROSSFADE: Updating ${cueId} with "Fade Out: ${remainingSeconds}s"`);
                        cueGridAPIRef.updateButtonPlayingState(cueId, true, `Fade Out: ${remainingSeconds}s`, false);
                    } else {
                        console.warn(`🎵 CROSSFADE: cueGridAPIRef not available for fade-out display. cueGridAPIRef: ${!!cueGridAPIRef}`);
                    }
                    
                    // Clear timer when fade completes
                    if (remaining <= 0) {
                        clearInterval(fadeOutInterval);
                        playingState.isFadingOut = false;
                        playingState.fadeStartTime = 0;
                        playingState.fadeTotalDurationMs = 0;
                        playingState.fadeOutStartTime = 0;
                        playingState.fadeOutDuration = 0;
                    }
                }, 100); // Update every 100ms for smooth countdown
                
                // Stop the sound after fade completes
                setTimeout(() => {
                    if (currentlyPlaying[cueId] && currentlyPlaying[cueId].sound) {
                        console.log(`AudioPlaybackManager: Stopping crossfaded-out cue ${cueId}`);
                        clearInterval(fadeOutInterval); // Ensure timer is cleared
                        stop(cueId, false, false, true); // Use internal stop function
                    }
                }, crossfadeDuration + 100);
            }
        }
    }
    
    // Start the new cue with crossfade-in
    console.log(`AudioPlaybackManager: Starting new cue ${newCueId} with crossfade-in`);
    if (newCue.type === 'playlist') {
        // For playlists, start the first item
        if (newCue.playlistItems && newCue.playlistItems.length > 0) {
            console.log(`AudioPlaybackManager: Starting playlist ${newCueId} for crossfade`);
            _playTargetItem(newCueId, 0, false); // Start from first item
        }
    } else {
        // For single files
        console.log(`AudioPlaybackManager: Starting single file ${newCueId} for crossfade`);
        play(newCue, false);
    }
    
    // Mark the new cue for crossfade-in BEFORE starting it
    const latestIncomingCue = getGlobalCueByIdRef ? (getGlobalCueByIdRef(newCueId) || newCue) : newCue;
    const configuredIncomingVolume = resolveConfiguredCueVolume(latestIncomingCue);
    const crossfadeInState = {
        isCrossfadeIn: true,
        crossfadeStartTime: Date.now(),
        crossfadeDuration: crossfadeDuration,
        targetVolume: configuredIncomingVolume
    };
    
    // Store crossfade info for the playback instance handler to use
    if (!currentlyPlaying[newCueId]) {
        currentlyPlaying[newCueId] = { crossfadeInfo: crossfadeInState };
    } else {
        currentlyPlaying[newCueId].crossfadeInfo = crossfadeInState;
    }
    
    console.log(`AudioPlaybackManager: Marked ${newCueId} for crossfade-in with duration ${crossfadeDuration}ms`);
}

export {
    handleCrossfadeToggle,
    _handleCrossfadeStart
};
