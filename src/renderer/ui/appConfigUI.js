// Companion_soundboard/src/renderer/ui/appConfigUI.js
// Manages the App Configuration Sidebar UI, state, and interactions.

import * as ipcRendererBindingsModule from '../ipcRendererBindings.js'; // Import the module
import { uiLog } from './uiLogger.js';
import { normalizeRecentColors } from './buttonColorPresets.js';
import {
    populateRetriggerSelect,
    updateRetriggerHelpText,
    renderRetriggerLegend
} from '../retriggerBehaviorCatalog.js';
import { refreshAllCueBadges } from './cueGrid.js';
import {
    setMonitorOutputDeviceId,
    setRouteShowPlaybackToMonitor
} from '../audioOutputRouting.js';

// let ipcRendererBindings; // REMOVE: This will now refer to the imported module alias

// --- Debounce Utility ---
let debounceTimer;
function debounce(func, delay) {
    return function(...args) {
        clearTimeout(debounceTimer);
        debounceTimer = setTimeout(() => func.apply(this, args), delay);
    };
}
// --- End Debounce Utility ---

// --- App Configuration DOM Elements ---
let configSidebar;
let saveAppConfigButton;
let closeConfigSidebarButton;

// General
let configCuesFilePathInput;
let configAutoLoadLastWorkspaceCheckbox;
let configLastOpenedWorkspacePathDiv;

// Default Cue Settings
let configDefaultCueTypeSelect;
let configDefaultFadeInInput; // in seconds in UI, converted to ms for config
let configDefaultFadeOutInput; // in seconds in UI, converted to ms for config
let configDefaultLoopSingleCueCheckbox;
let configDefaultRetriggerBehaviorSelect;
let retriggerBehaviorHelp;
let globalRetriggerLegend;
let configDefaultStopAllBehaviorSelect;
let configDefaultStopAllFadeOutInput;
let configDefaultStopAllFadeOutGroup;
let configCrossfadeTimeInput;

// Audio Settings
let configAudioOutputDeviceSelect;
let configAudioMonitorOutputDeviceSelect;
let configRouteShowPlaybackToMonitorCheckbox;

// UI Settings
// let configShowQuickControlsCheckbox; // REMOVED

// HTTP Remote Control Elements
let configHttpRemoteEnabledCheckbox;
let configHttpRemotePortGroup;
let configHttpRemotePortInput;
let configHttpRemoteLinksGroup;
let configHttpRemoteLinksDiv;
let configMainWaveformEnabledCheckbox;
let configDefaultShowButtonWaveformCheckbox;

// Mixer Integration Elements
// Mixer Integration removed



// --- App Configuration State (local cache) ---
let currentAppConfig = {};
let isPopulatingSidebar = false;
let audioControllerRef = null; // Reference to audioController for applying device changes

async function init(electronAPI) { // Renamed parameter to avoid confusion
    uiLog.info('AppConfigUI: Initializing...');
    // ipcRendererBindings is already available as ipcRendererBindingsModule via import
    // No need to store electronAPI here if all IPC calls go through the module.
    cacheDOMElements();
    bindEventListeners();

    // Set up device change listener
    setupDeviceChangeListener();

    try {
        await forceLoadAndApplyAppConfiguration();
        uiLog.info('AppConfigUI: Initial config loaded and populated after init. Returning config.');
        return currentAppConfig; // Return the loaded config
    } catch (error) {
        uiLog.error('AppConfigUI: Error during initial config load in init:', error);
        return {}; // Return empty object or handle error as appropriate
    }
}

// Function to set up device change listener
function setupDeviceChangeListener() {
    if (navigator.mediaDevices && navigator.mediaDevices.addEventListener) {
        navigator.mediaDevices.addEventListener('devicechange', () => {
            uiLog.info('AppConfigUI: Audio devices changed, refreshing device list...');
            // Debounce the device list refresh to avoid excessive updates
            setTimeout(() => {
                loadAudioOutputDevices();
            }, 500);
        });
        uiLog.info('AppConfigUI: Device change listener set up.');
    } else {
        uiLog.warn('AppConfigUI: navigator.mediaDevices.addEventListener not available, device changes won\'t be detected.');
    }
}

// Function to set the audioController reference
function syncAppConfigToAudioController(config) {
    if (audioControllerRef && typeof audioControllerRef.updateAppConfig === 'function') {
        audioControllerRef.updateAppConfig(config);
    }
    if (config) {
        setMonitorOutputDeviceId(config.audioMonitorOutputDeviceId || 'default');
        setRouteShowPlaybackToMonitor(config.routeShowPlaybackToMonitor === true);
    }
}

async function applyAudioRoutingFromConfig(config) {
    if (!audioControllerRef || !config) return;
    try {
        if (config.audioOutputDeviceId) {
            await audioControllerRef.setAudioOutputDevice(config.audioOutputDeviceId);
        }
        if (typeof audioControllerRef.setMonitorOutputDevice === 'function') {
            await audioControllerRef.setMonitorOutputDevice(config.audioMonitorOutputDeviceId || 'default');
        }
        setRouteShowPlaybackToMonitor(config.routeShowPlaybackToMonitor === true);
    } catch (error) {
        uiLog.error('AppConfigUI: Error applying audio routing from config:', error);
    }
}

function setAudioControllerRef(audioController) {
    audioControllerRef = audioController;
    uiLog.info('AppConfigUI: AudioController reference set');
    if (audioControllerRef && Object.keys(currentAppConfig).length > 0) {
        syncAppConfigToAudioController(currentAppConfig);
    }
}

function cacheDOMElements() {
    configSidebar = document.getElementById('configSidebar');
    saveAppConfigButton = document.getElementById('saveAppConfigButton'); 
    closeConfigSidebarButton = document.getElementById('closeConfigSidebarButton'); 

    // General
    configCuesFilePathInput = document.getElementById('configCuesFilePath');
    configAutoLoadLastWorkspaceCheckbox = document.getElementById('configAutoLoadLastWorkspace');
    configLastOpenedWorkspacePathDiv = document.getElementById('configLastOpenedWorkspacePath');

    // Default Cue Settings
    configDefaultCueTypeSelect = document.getElementById('configDefaultCueType');
    configDefaultFadeInInput = document.getElementById('defaultFadeIn');
    configDefaultFadeOutInput = document.getElementById('defaultFadeOut');
    configDefaultLoopSingleCueCheckbox = document.getElementById('defaultLoop');
    configDefaultRetriggerBehaviorSelect = document.getElementById('retriggerBehavior');
    retriggerBehaviorHelp = document.getElementById('retriggerBehaviorHelp');
    globalRetriggerLegend = document.getElementById('globalRetriggerLegend');
    populateRetriggerSelect(configDefaultRetriggerBehaviorSelect, { includeDefault: false });
    renderRetriggerLegend(globalRetriggerLegend);
    configDefaultStopAllBehaviorSelect = document.getElementById('defaultStopAllBehavior');
    configDefaultStopAllFadeOutInput = document.getElementById('defaultStopAllFadeOut');
    configDefaultStopAllFadeOutGroup = document.getElementById('defaultStopAllFadeOutGroup');
    configCrossfadeTimeInput = document.getElementById('crossfadeTime');

    // Audio Settings
    configAudioOutputDeviceSelect = document.getElementById('configAudioOutputDevice');
    configAudioMonitorOutputDeviceSelect = document.getElementById('configAudioMonitorOutputDevice');
    configRouteShowPlaybackToMonitorCheckbox = document.getElementById('configRouteShowPlaybackToMonitor');

    // HTTP Remote Control Elements
    configHttpRemoteEnabledCheckbox = document.getElementById('configHttpRemoteEnabled');
    configHttpRemotePortGroup = document.getElementById('httpRemotePortGroup');
    configHttpRemotePortInput = document.getElementById('configHttpRemotePort');
    configHttpRemoteLinksGroup = document.getElementById('httpRemoteLinksGroup');
    configHttpRemoteLinksDiv = document.getElementById('httpRemoteLinksDiv');
    configMainWaveformEnabledCheckbox = document.getElementById('configMainWaveformEnabled');
    configDefaultShowButtonWaveformCheckbox = document.getElementById('configDefaultShowButtonWaveform');

    // Mixer Integration removed

    uiLog.info('AppConfigUI: DOM elements cached.');
}

// Mixer integration elements removed

function bindEventListeners() {
    uiLog.debug('AppConfigUI (DEBUG): bindEventListeners CALLED.');
    if (saveAppConfigButton) saveAppConfigButton.addEventListener('click', handleSaveButtonClick);
    if (closeConfigSidebarButton) closeConfigSidebarButton.addEventListener('click', () => uiAPI.toggleSidebar('configSidebar', false));

    if (configCuesFilePathInput) configCuesFilePathInput.addEventListener('change', handleAppConfigChange);
    if (configAutoLoadLastWorkspaceCheckbox) configAutoLoadLastWorkspaceCheckbox.addEventListener('change', handleAppConfigChange);

    if (configDefaultCueTypeSelect) configDefaultCueTypeSelect.addEventListener('change', handleAppConfigChange);
    if (configDefaultFadeInInput) configDefaultFadeInInput.addEventListener('change', handleAppConfigChange);
    if (configDefaultFadeOutInput) {
        uiLog.debug('AppConfigUI (DEBUG): configDefaultFadeOutInput FOUND. Adding event listener.');
        configDefaultFadeOutInput.addEventListener('change', handleAppConfigChange);
    } else {
        uiLog.error('AppConfigUI (DEBUG): configDefaultFadeOutInput NOT FOUND when trying to bind event listener!');
    }
    if (configDefaultLoopSingleCueCheckbox) configDefaultLoopSingleCueCheckbox.addEventListener('change', handleAppConfigChange);
    if (configDefaultRetriggerBehaviorSelect) {
        configDefaultRetriggerBehaviorSelect.addEventListener('change', () => {
            updateRetriggerHelpText(configDefaultRetriggerBehaviorSelect, retriggerBehaviorHelp);
            handleAppConfigChange();
        });
    }
    if (configDefaultStopAllBehaviorSelect) {
        configDefaultStopAllBehaviorSelect.value = currentAppConfig.defaultStopAllBehavior || 'stop';
        configDefaultStopAllBehaviorSelect.addEventListener('change', () => {
            handleStopAllBehaviorChange();
            handleAppConfigChange();
        });
    }
    if (configDefaultStopAllFadeOutInput) {
        configDefaultStopAllFadeOutInput.addEventListener('change', handleAppConfigChange);
    }

    if (configAudioOutputDeviceSelect) configAudioOutputDeviceSelect.addEventListener('change', handleAppConfigChange);
    
    // HTTP Remote Control event listeners
    if (configHttpRemoteEnabledCheckbox) {
        configHttpRemoteEnabledCheckbox.addEventListener('change', () => {
            handleHttpRemoteEnabledChange();
            handleAppConfigChange(); 
        });
    }
    if (configHttpRemotePortInput) configHttpRemotePortInput.addEventListener('change', handleAppConfigChange);
    if (configHttpRemotePortInput) configHttpRemotePortInput.addEventListener('blur', handleAppConfigChange);

    if (configMainWaveformEnabledCheckbox) {
        configMainWaveformEnabledCheckbox.addEventListener('change', () => {
            const enabled = configMainWaveformEnabledCheckbox.checked;
            if (window.uiModules?.mainWaveformPanel?.setPanelVisible) {
                window.uiModules.mainWaveformPanel.setPanelVisible(enabled, false);
            } else if (window.uiModules?.mainWaveformPanel?.applyConfig) {
                window.uiModules.mainWaveformPanel.applyConfig({
                    ...currentAppConfig,
                    mainWaveformEnabled: enabled,
                    mainWaveformHeight: currentAppConfig.mainWaveformHeight || 140
                });
            }
            handleAppConfigChange();
        });
    }
    if (configDefaultShowButtonWaveformCheckbox) {
        configDefaultShowButtonWaveformCheckbox.addEventListener('change', handleAppConfigChange);
    }
    
    // Mixer event listeners removed

    uiLog.info('AppConfigUI: Event listeners bound.');
}

function handleSaveButtonClick() {
    uiLog.info('AppConfigUI: Save button clicked.');
    saveAppConfiguration();
}

const debouncedSaveAppConfiguration = debounce(saveAppConfiguration, 500);

function handleAppConfigChange() {
    uiLog.debug('AppConfigUI (DEBUG): handleAppConfigChange CALLED.');
    if (isPopulatingSidebar) {
        uiLog.debug('AppConfigUI: App config field change detected during population, save suppressed.');
        return;
    }
    uiLog.info('AppConfigUI: App config field changed, attempting to save (debounced).');
    debouncedSaveAppConfiguration();
}

function populateConfigSidebar(config) {
    isPopulatingSidebar = true;
    try {
        currentAppConfig = config || {}; 
        uiLog.debug('AppConfigUI: Populating sidebar with config:', currentAppConfig);

        // General
        if (configCuesFilePathInput) configCuesFilePathInput.value = currentAppConfig.cuesFilePath || '';
        if (configAutoLoadLastWorkspaceCheckbox) configAutoLoadLastWorkspaceCheckbox.checked = currentAppConfig.autoLoadLastWorkspace === undefined ? true : currentAppConfig.autoLoadLastWorkspace;
        if (configLastOpenedWorkspacePathDiv) configLastOpenedWorkspacePathDiv.textContent = currentAppConfig.lastOpenedWorkspacePath || 'None';

        // Default Cue Settings
        if (configDefaultCueTypeSelect) configDefaultCueTypeSelect.value = currentAppConfig.defaultCueType || 'single_file';
        if (configDefaultFadeInInput) configDefaultFadeInInput.value = currentAppConfig.defaultFadeInTime !== undefined ? currentAppConfig.defaultFadeInTime : 0;
        if (configDefaultFadeOutInput) configDefaultFadeOutInput.value = currentAppConfig.defaultFadeOutTime !== undefined ? currentAppConfig.defaultFadeOutTime : 0;
        
        if (configDefaultLoopSingleCueCheckbox) configDefaultLoopSingleCueCheckbox.checked = currentAppConfig.defaultLoopSingleCue || false;
        if (configDefaultRetriggerBehaviorSelect) {
            configDefaultRetriggerBehaviorSelect.value = currentAppConfig.defaultRetriggerBehavior || 'restart';
            updateRetriggerHelpText(configDefaultRetriggerBehaviorSelect, retriggerBehaviorHelp);
        }
        if (configDefaultStopAllBehaviorSelect) configDefaultStopAllBehaviorSelect.value = currentAppConfig.defaultStopAllBehavior || 'stop';
        if (configDefaultStopAllFadeOutInput) configDefaultStopAllFadeOutInput.value = currentAppConfig.defaultStopAllFadeOutTime || 1500;
        if (configCrossfadeTimeInput) configCrossfadeTimeInput.value = currentAppConfig.crossfadeTime || 2000;
        
        // HTTP Remote Control Settings
        if (configHttpRemoteEnabledCheckbox) configHttpRemoteEnabledCheckbox.checked = currentAppConfig.httpRemoteEnabled !== false; // Default to true
        if (configHttpRemotePortInput) configHttpRemotePortInput.value = currentAppConfig.httpRemotePort || 3000;
        if (configMainWaveformEnabledCheckbox) {
            configMainWaveformEnabledCheckbox.checked = currentAppConfig.mainWaveformEnabled !== false;
        }
        if (configDefaultShowButtonWaveformCheckbox) {
            configDefaultShowButtonWaveformCheckbox.checked = currentAppConfig.defaultShowButtonWaveform === true;
        }
        
        if (configAudioOutputDeviceSelect && currentAppConfig.audioOutputDeviceId) {
            configAudioOutputDeviceSelect.value = currentAppConfig.audioOutputDeviceId;
        } else if (configAudioOutputDeviceSelect) {
            configAudioOutputDeviceSelect.value = 'default';
        }

        if (configAudioMonitorOutputDeviceSelect && currentAppConfig.audioMonitorOutputDeviceId) {
            configAudioMonitorOutputDeviceSelect.value = currentAppConfig.audioMonitorOutputDeviceId;
        } else if (configAudioMonitorOutputDeviceSelect) {
            configAudioMonitorOutputDeviceSelect.value = 'default';
        }

        if (configRouteShowPlaybackToMonitorCheckbox) {
            configRouteShowPlaybackToMonitorCheckbox.checked = currentAppConfig.routeShowPlaybackToMonitor === true;
        }

        // Mixer config population removed
        
        handleHttpRemoteEnabledChange();
        handleStopAllBehaviorChange();



        uiLog.debug('AppConfigUI: Sidebar populated (end of try block).');
    } finally {
        isPopulatingSidebar = false; 
    }
    uiLog.debug('AppConfigUI: DOM elements updated.');
}

function handleHttpRemoteEnabledChange() {
    const isEnabled = configHttpRemoteEnabledCheckbox && configHttpRemoteEnabledCheckbox.checked;
    if (configHttpRemotePortGroup) {
        configHttpRemotePortGroup.style.display = isEnabled ? 'block' : 'none';
    }
    if (configHttpRemoteLinksGroup) {
        configHttpRemoteLinksGroup.style.display = isEnabled ? 'block' : 'none';
    }
    
    // Load remote info when enabled
    if (isEnabled) {
        loadHttpRemoteInfo();
    }
}

async function loadHttpRemoteInfo() {
    if (!ipcRendererBindingsModule || !configHttpRemoteLinksDiv) return;
    
    try {
        const remoteInfo = await ipcRendererBindingsModule.getHttpRemoteInfo();
        uiLog.info('AppConfigUI: Received HTTP remote info:', remoteInfo);
        
        if (!remoteInfo.enabled) {
            configHttpRemoteLinksDiv.innerHTML = '<p class="small-text">HTTP remote is disabled.</p>';
            return;
        }
        
        if (!remoteInfo.interfaces || remoteInfo.interfaces.length === 0) {
            configHttpRemoteLinksDiv.innerHTML = '<p class="small-text">No network interfaces found.</p>';
            return;
        }
        
        let linksHTML = '';
        remoteInfo.interfaces.forEach(iface => {
            linksHTML += `
                <div class="remote-link-item">
                    <div class="remote-link-info">
                        <div class="remote-link-interface">${iface.interface}</div>
                        <div class="remote-link-url">${iface.url}</div>
                    </div>
                    <button class="remote-link-copy" data-url="${iface.url}">Copy</button>
                </div>
            `;
        });
        
        configHttpRemoteLinksDiv.innerHTML = linksHTML;
        
        // Add event listeners to all copy buttons (event delegation)
        configHttpRemoteLinksDiv.querySelectorAll('.remote-link-copy').forEach(button => {
            button.addEventListener('click', function() {
                const url = this.getAttribute('data-url');
                if (url) {
                    window.copyToClipboard(url, this);
                }
            });
        });
    } catch (error) {
        uiLog.error('AppConfigUI: Error loading HTTP remote info:', error);
        configHttpRemoteLinksDiv.innerHTML = '<p class="small-text">Error loading remote info.</p>';
    }
}

// Global function for copy to clipboard
window.copyToClipboard = async function(text, button) {
    const setBtn = (label, clsAdd, clsRemove) => {
        if (!button) return;
        const original = button.getAttribute('data-original-label') || button.textContent;
        if (!button.getAttribute('data-original-label')) button.setAttribute('data-original-label', original);
        button.textContent = label;
        if (clsAdd) button.classList.add(clsAdd);
        if (clsRemove) button.classList.remove(clsRemove);
        setTimeout(() => {
            button.textContent = original;
            if (clsAdd) button.classList.remove(clsAdd);
        }, 2000);
    };
    
    // Use Electron's clipboard API (most reliable for Electron apps)
    try {
        if (window.electronAPI && typeof window.electronAPI.writeToClipboard === 'function') {
            const result = await window.electronAPI.writeToClipboard(text);
            if (result && result.success) {
                setBtn('Copied!', 'copied');
                return;
            } else {
                uiLog.error('Electron clipboard API failed:', result?.error);
            }
        }
    } catch (error) {
        uiLog.error('Error using Electron clipboard API:', error);
    }
    
    // Fallback: Try browser clipboard API
    try {
        if (navigator.clipboard && navigator.clipboard.writeText) {
            await navigator.clipboard.writeText(text);
            setBtn('Copied!', 'copied');
            return;
        }
    } catch (error) {
        uiLog.warn('Browser clipboard API failed, trying execCommand fallback:', error);
    }

    // Last resort: use textarea + execCommand
    try {
        const textarea = document.createElement('textarea');
        textarea.value = text;
        textarea.style.position = 'fixed';
        textarea.style.left = '-9999px';
        textarea.style.opacity = '0';
        document.body.appendChild(textarea);
        textarea.focus();
        textarea.select();
        
        const ok = document.execCommand('copy');
        document.body.removeChild(textarea);
        
        if (ok) {
            setBtn('Copied!', 'copied');
        } else {
            setBtn('Failed');
            uiLog.error('All clipboard methods failed');
        }
    } catch (error) {
        uiLog.error('Failed to copy to clipboard:', error);
        setBtn('Failed');
    }
};

// Mixer handlers removed

function handleStopAllBehaviorChange() {
    const behavior = configDefaultStopAllBehaviorSelect ? configDefaultStopAllBehaviorSelect.value : 'stop';
    const showFadeOutTime = behavior === 'fade_out_and_stop';
    
    if (configDefaultStopAllFadeOutGroup) {
        configDefaultStopAllFadeOutGroup.style.display = showFadeOutTime ? 'block' : 'none';
    }
    
    uiLog.info('AppConfigUI: Stop All behavior changed to:', behavior, 'Show fade out time:', showFadeOutTime);
}


async function populateAudioOutputSelect(selectEl, selectedDeviceId) {
    if (!selectEl) return;

    selectEl.innerHTML = '';
    const defaultOption = document.createElement('option');
    defaultOption.value = 'default';
    defaultOption.textContent = 'System Default';
    selectEl.appendChild(defaultOption);

    if (navigator.mediaDevices && navigator.mediaDevices.enumerateDevices) {
        try {
            const devices = await navigator.mediaDevices.enumerateDevices();
            devices
                .filter((device) => device.kind === 'audiooutput')
                .forEach((device) => {
                    const option = document.createElement('option');
                    option.value = device.deviceId;
                    option.textContent = device.label || `Audio Output ${device.deviceId.substring(0, 8)}...`;
                    selectEl.appendChild(option);
                });
        } catch (deviceError) {
            uiLog.warn('AppConfigUI: Error enumerating audio output devices:', deviceError);
            const fallbackOption = document.createElement('option');
            fallbackOption.value = 'default';
            fallbackOption.textContent = 'System Default (Device list unavailable)';
            selectEl.appendChild(fallbackOption);
        }
    }

    selectEl.value = selectedDeviceId || 'default';
}

async function loadAudioOutputDevices() {
    if (!configAudioOutputDeviceSelect && !configAudioMonitorOutputDeviceSelect) {
        uiLog.warn('AppConfigUI: Audio output select elements not found.');
        return;
    }

    try {
        uiLog.info('AppConfigUI: Loading audio output devices...');
        const mainSelected = currentAppConfig?.audioOutputDeviceId || 'default';
        const monitorSelected = currentAppConfig?.audioMonitorOutputDeviceId || 'default';
        await populateAudioOutputSelect(configAudioOutputDeviceSelect, mainSelected);
        await populateAudioOutputSelect(configAudioMonitorOutputDeviceSelect, monitorSelected);
        uiLog.info('AppConfigUI: Audio output device selection completed.');
    } catch (error) {
        uiLog.error('AppConfigUI: Error loading audio output devices:', error);
        [configAudioOutputDeviceSelect, configAudioMonitorOutputDeviceSelect].forEach((selectEl) => {
            if (!selectEl) return;
            selectEl.innerHTML = '';
            const errorOption = document.createElement('option');
            errorOption.value = 'default';
            errorOption.textContent = 'System Default (Error loading devices)';
            selectEl.appendChild(errorOption);
            selectEl.value = 'default';
        });
    }
}

let uiAPI = {}; 

function setUiApi(api) {
    uiAPI = api;
}
 
function gatherConfigFromUI() {
    const config = {
        cuesFilePath: configCuesFilePathInput ? configCuesFilePathInput.value : '',
        autoLoadLastWorkspace: configAutoLoadLastWorkspaceCheckbox ? configAutoLoadLastWorkspaceCheckbox.checked : true,
        lastOpenedWorkspacePath: currentAppConfig.lastOpenedWorkspacePath || '', // Preserve this from loaded config, not UI
        recentWorkspaces: currentAppConfig.recentWorkspaces || [], // Preserve this from loaded config
        recentButtonColors: currentAppConfig.recentButtonColors || [],

        defaultCueType: configDefaultCueTypeSelect ? configDefaultCueTypeSelect.value : 'single_file',
        defaultFadeInTime: configDefaultFadeInInput ? parseInt(configDefaultFadeInInput.value) : 0,
        defaultFadeOutTime: configDefaultFadeOutInput ? parseInt(configDefaultFadeOutInput.value) : 0,
        defaultLoopSingleCue: configDefaultLoopSingleCueCheckbox ? configDefaultLoopSingleCueCheckbox.checked : false,
        defaultRetriggerBehavior: configDefaultRetriggerBehaviorSelect ? configDefaultRetriggerBehaviorSelect.value : 'restart',
        defaultStopAllBehavior: configDefaultStopAllBehaviorSelect ? configDefaultStopAllBehaviorSelect.value : 'stop',
        defaultStopAllFadeOutTime: configDefaultStopAllFadeOutInput ? parseInt(configDefaultStopAllFadeOutInput.value) : 1500,
        crossfadeTime: configCrossfadeTimeInput ? parseInt(configCrossfadeTimeInput.value) : 2000,
        
        httpRemoteEnabled: configHttpRemoteEnabledCheckbox ? configHttpRemoteEnabledCheckbox.checked : true,
        httpRemotePort: configHttpRemotePortInput ? parseInt(configHttpRemotePortInput.value) : 3000,
        mainWaveformEnabled: configMainWaveformEnabledCheckbox ? configMainWaveformEnabledCheckbox.checked : true,
        mainWaveformHeight: currentAppConfig.mainWaveformHeight || 140,
        defaultShowButtonWaveform: configDefaultShowButtonWaveformCheckbox
            ? configDefaultShowButtonWaveformCheckbox.checked
            : false,
        
        audioOutputDeviceId: configAudioOutputDeviceSelect ? configAudioOutputDeviceSelect.value : 'default',
        audioMonitorOutputDeviceId: configAudioMonitorOutputDeviceSelect ? configAudioMonitorOutputDeviceSelect.value : 'default',
        routeShowPlaybackToMonitor: configRouteShowPlaybackToMonitorCheckbox ? configRouteShowPlaybackToMonitorCheckbox.checked : false,
        
        // theme setting is not directly edited here, but preserved if it exists
        theme: currentAppConfig.theme || 'system',
    };
    
    uiLog.debug('AppConfigUI (gatherConfigFromUI): Gathered config:', JSON.parse(JSON.stringify(config)));
    return config;
}

async function savePartialAppConfiguration(partialSettings) {
    if (!ipcRendererBindingsModule) {
        uiLog.error('AppConfigUI: ipcRendererBindingsModule not available. Cannot save partial config.');
        return { success: false };
    }
    try {
        const payload = { ...partialSettings };
        if (Array.isArray(payload.recentButtonColors)) {
            payload.recentButtonColors = normalizeRecentColors(payload.recentButtonColors);
        }
        const result = await ipcRendererBindingsModule.saveAppConfig(payload);
        if (result && result.success) {
            currentAppConfig = { ...currentAppConfig, ...partialSettings };
            if (result.config) {
                currentAppConfig = { ...currentAppConfig, ...result.config };
            }
            syncAppConfigToAudioController(currentAppConfig);
        }
        return result;
    } catch (error) {
        uiLog.error('AppConfigUI: Error during savePartialAppConfiguration:', error);
        return { success: false, error: error.message };
    }
}

async function saveAppConfiguration() {
    uiLog.debug('AppConfigUI (DEBUG): saveAppConfiguration CALLED.');
    try {
        const configToSave = gatherConfigFromUI();
        uiLog.debug('AppConfigUI (DEBUG): gatherConfigFromUI completed, configToSave:', JSON.stringify(configToSave));

        if (!configToSave) {
            uiLog.error('AppConfigUI: No config data gathered from UI. Aborting save.');
            return;
        }

        uiLog.debug('AppConfigUI (DEBUG): Attempting to call ipcRendererBindingsModule.saveAppConfig...');
        const result = await ipcRendererBindingsModule.saveAppConfig(configToSave);
        uiLog.debug('AppConfigUI (DEBUG): ipcRendererBindingsModule.saveAppConfig call completed, result:', result);

        if (result && result.success) {
            uiLog.info('AppConfigUI: App configuration successfully saved via main process.');
            
            if (audioControllerRef) {
                try {
                    if (configToSave.audioOutputDeviceId !== currentAppConfig.audioOutputDeviceId) {
                        uiLog.info('AppConfigUI: Main audio output changed to', configToSave.audioOutputDeviceId);
                        await audioControllerRef.setAudioOutputDevice(configToSave.audioOutputDeviceId);
                    }
                    if (configToSave.audioMonitorOutputDeviceId !== currentAppConfig.audioMonitorOutputDeviceId
                        && typeof audioControllerRef.setMonitorOutputDevice === 'function') {
                        uiLog.info('AppConfigUI: Monitor audio output changed to', configToSave.audioMonitorOutputDeviceId);
                        await audioControllerRef.setMonitorOutputDevice(configToSave.audioMonitorOutputDeviceId);
                    }
                } catch (error) {
                    uiLog.error('AppConfigUI: Error applying audio routing changes:', error);
                    if (configAudioOutputDeviceSelect) {
                        configAudioOutputDeviceSelect.value = currentAppConfig.audioOutputDeviceId || 'default';
                    }
                    if (configAudioMonitorOutputDeviceSelect) {
                        configAudioMonitorOutputDeviceSelect.value = currentAppConfig.audioMonitorOutputDeviceId || 'default';
                    }
                }
            }
            
            currentAppConfig = { ...currentAppConfig, ...configToSave };
            syncAppConfigToAudioController(currentAppConfig);
            if (typeof refreshAllCueBadges === 'function') {
                refreshAllCueBadges();
            }
        } else {
            uiLog.error('AppConfigUI: Failed to save app configuration via main process:', result ? result.error : 'Unknown error');
        }
    } catch (error) {
        uiLog.error('AppConfigUI: Error during saveAppConfiguration:', error);
    }
}

async function forceLoadAndApplyAppConfiguration() {
    uiLog.info('AppConfigUI: Forcing load and apply of app configuration...');
    if (!ipcRendererBindingsModule) {
        uiLog.error('AppConfigUI: ipcRendererBindingsModule not available. Cannot force load config.');
        return Promise.reject('ipcRendererBindingsModule not available');
    }
    try {
        const loadedConfig = await ipcRendererBindingsModule.getAppConfig();
        uiLog.info('AppConfigUI: Successfully loaded config from main:', loadedConfig);
        populateConfigSidebar(loadedConfig);
        syncAppConfigToAudioController(loadedConfig);
        await loadAudioOutputDevices();
        await applyAudioRoutingFromConfig(loadedConfig);
        return loadedConfig; 
    } catch (error) {
        uiLog.error('AppConfigUI: Error loading app configuration from main:', error);
        populateConfigSidebar({ ...currentAppConfig });
        await loadAudioOutputDevices();
        return Promise.reject(error);
    }
}

function getCurrentAppConfig() {
    return { ...currentAppConfig };
}

export { 
    init,
    populateConfigSidebar,
    saveAppConfiguration,
    savePartialAppConfiguration,
    forceLoadAndApplyAppConfiguration,
    getCurrentAppConfig,
    loadAudioOutputDevices,
    setUiApi,
    setAudioControllerRef
}; 