const { app } = require('electron');
const path = require('path');
const os = require('os');
const fs = require('fs-extra');
const branding = require('../shared/branding');
const logger = require('./utils/logger');

function getLegacyUserDataPaths() {
  const paths = [];
  const home = os.homedir();

  for (const name of branding.legacyAppNames) {
    if (process.platform === 'win32') {
      const appData = process.env.APPDATA || path.join(home, 'AppData', 'Roaming');
      paths.push(path.join(appData, name));
    } else if (process.platform === 'darwin') {
      paths.push(path.join(home, 'Library', 'Application Support', name));
    } else {
      paths.push(path.join(home, '.config', name));
    }
  }

  return [...new Set(paths)];
}

function isUserDataEmpty(dir) {
  if (!fs.existsSync(dir)) {
    return true;
  }
  try {
    return fs.readdirSync(dir).length === 0;
  } catch {
    return true;
  }
}

function legacyHasUserData(dir) {
  return (
    fs.existsSync(path.join(dir, 'appConfig.json'))
    || fs.existsSync(path.join(dir, 'cues.json'))
    || fs.existsSync(path.join(dir, 'config.json'))
  );
}

function migrateUserDataIfNeeded() {
  const newUserData = app.getPath('userData');

  for (const legacyPath of getLegacyUserDataPaths()) {
    if (path.resolve(legacyPath) === path.resolve(newUserData)) {
      continue;
    }
    if (!fs.existsSync(legacyPath) || !legacyHasUserData(legacyPath)) {
      continue;
    }
    if (!isUserDataEmpty(newUserData)) {
      logger.info(`[UserDataMigration] Skipping "${legacyPath}" — new userData already has data.`);
      continue;
    }

    try {
      fs.ensureDirSync(newUserData);
      fs.copySync(legacyPath, newUserData, { overwrite: false, errorOnExist: false });
      logger.info(`[UserDataMigration] Migrated user data from "${legacyPath}" to "${newUserData}".`);
      return;
    } catch (error) {
      logger.error(`[UserDataMigration] Failed to migrate from "${legacyPath}":`, error);
    }
  }
}

module.exports = { migrateUserDataIfNeeded };
