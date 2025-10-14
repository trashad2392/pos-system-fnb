// src/main/handlers/fileHandlers.js
const { ipcMain, dialog, app } = require('electron');
const fs = require('fs');
const path = require('path');

function setupFileHandlers() {
  ipcMain.handle('upload-image', async () => {
    const { canceled, filePaths } = await dialog.showOpenDialog({
      properties: ['openFile'],
      filters: [{ name: 'Images', extensions: ['jpg', 'png', 'gif'] }],
    });

    if (canceled || filePaths.length === 0) {
      return null;
    }

    const filePath = filePaths[0];
    const fileName = `${Date.now()}-${path.basename(filePath)}`;
    const userDataPath = app.getPath('userData');
    const imagesPath = path.join(userDataPath, 'product_images');

    if (!fs.existsSync(imagesPath)) {
      fs.mkdirSync(imagesPath, { recursive: true });
    }

    const destination = path.join(imagesPath, fileName);
    fs.copyFileSync(filePath, destination);

    // Return the path using the custom 'safe-file' protocol
    return `safe-file://${destination}`;
  });
}

module.exports = { setupFileHandlers };