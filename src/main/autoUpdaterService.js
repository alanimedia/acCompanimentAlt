const { showUpdateCheckDialog } = require('./utils/updateCheckUtils');

let mainWindowRef = null;

/**
 * In-app electron-updater install is disabled until Windows builds are code-signed.
 * All platforms use Help → Check for Updates → download installer from GitHub Releases.
 */
function isWindowsAutoUpdateEnabled() {
    return false;
}

function getMainWindow() {
    return mainWindowRef && !mainWindowRef.isDestroyed() ? mainWindowRef : null;
}

function initialize(mainWindow) {
    mainWindowRef = mainWindow;
}

async function checkForUpdates({ manual = false } = {}) {
    if (!manual) return;
    await showUpdateCheckDialog(getMainWindow());
}

module.exports = {
    initialize,
    checkForUpdates,
    isWindowsAutoUpdateEnabled
};
