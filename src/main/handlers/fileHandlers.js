// src/main/handlers/fileHandlers.js
const { ipcMain, dialog, app } = require('electron');
const fs = require('fs');
const path = require('path');

function setupFileHandlers() {
  
  // Existing Product Image Upload (Updated to return 'local-media://')
  ipcMain.handle('upload-image', async () => {
    const { canceled, filePaths } = await dialog.showOpenDialog({
      properties: ['openFile'],
      filters: [{ name: 'Images', extensions: ['jpg', 'png', 'gif', 'webp'] }], // Added webp support
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

    // Return the path using the standardized 'local-media://' protocol
    return `local-media://${destination}`;
  });

  // 🔥 NEW HANDLER: Saves Base64 icon data to disk
  ipcMain.handle('save-icon-image', async (e, { name, data }) => {
    // 1. Define storage path in user data folder
    const iconDir = path.join(app.getPath('userData'), 'payment_icons'); // Dedicated folder
    if (!fs.existsSync(iconDir)) {
        fs.mkdirSync(iconDir, { recursive: true });
    }

    // 2. Decode the Base64 data
    const matches = data.match(/^data:image\/([A-Za-z0-9]+);base64,(.+)$/);
    if (!matches) {
        throw new Error('Invalid image data format.');
    }
    
    const extension = matches[1];
    const base64Data = matches[2];
    const buffer = Buffer.from(base64Data, 'base64');
    
    // 3. Create a unique filename and save the file
    const uniqueFileName = `${Date.now()}-${path.basename(name, path.extname(name))}.${extension}`;
    const filePath = path.join(iconDir, uniqueFileName);

    fs.writeFileSync(filePath, buffer);

    // 4. Return the path using the standardized 'local-media://' protocol
    return `local-media://${filePath}`; 
  });
}

module.exports = { setupFileHandlers };