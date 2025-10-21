// src/main/handlers/settingHandlers.js
const { ipcMain } = require('electron');
const { prisma } = require('../../lib/db');

function setupSettingHandlers() {
  // Get all POS settings as an object { key: value }
  ipcMain.handle('get-pos-settings', async () => {
    const settingsList = await prisma.posSetting.findMany();
    const settingsMap = settingsList.reduce((acc, setting) => {
      acc[setting.key] = setting.value;
      return acc;
    }, {});
    return settingsMap;
  });

  // Get a single POS setting by key
  ipcMain.handle('get-pos-setting', async (e, key) => {
    if (!key) {
      throw new Error('Setting key is required.');
    }
    const setting = await prisma.posSetting.findUnique({
      where: { key: key },
    });
    return setting ? setting.value : null; // Return null if setting doesn't exist
  });

  // Set (create or update) a POS setting
  ipcMain.handle('set-pos-setting', async (e, { key, value }) => {
    if (!key) {
      throw new Error('Setting key is required.');
    }
    // Value can be null or empty string, but key cannot
    if (value === undefined) {
         throw new Error('Setting value is required (can be null or empty).');
    }

    const valueAsString = value !== null ? String(value) : ''; // Ensure value is a string

    return prisma.posSetting.upsert({
      where: { key: key },
      update: { value: valueAsString },
      create: { key: key, value: valueAsString },
    });
  });

  // Set multiple POS settings at once (useful for saving a form)
  // Expects an object like { 'setting_key1': 'value1', 'setting_key2': 'value2' }
  ipcMain.handle('set-pos-settings', async (e, settingsMap) => {
     if (typeof settingsMap !== 'object' || settingsMap === null) {
       throw new Error('Invalid input: settingsMap must be an object.');
     }

     const operations = Object.entries(settingsMap).map(([key, value]) => {
        if (!key) {
           console.warn('Skipping setting with empty key.');
           return null; // Skip invalid entries
        }
         const valueAsString = value !== null ? String(value) : '';
         return prisma.posSetting.upsert({
             where: { key: key },
             update: { value: valueAsString },
             create: { key: key, value: valueAsString },
         });
     });

     // Filter out null operations and run the rest in a transaction
     const validOperations = operations.filter(op => op !== null);
     if (validOperations.length === 0) {
        return { success: true, count: 0 }; // No valid operations to perform
     }

     await prisma.$transaction(validOperations);
     return { success: true, count: validOperations.length }; // Indicate how many settings were processed
  });

}

module.exports = { setupSettingHandlers };
