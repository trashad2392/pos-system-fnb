// src/main/handlers/userHandlers.js
const { ipcMain } = require('electron');
const { prisma } = require('../../lib/db');

// A simple in-memory store for the currently logged-in user.
// In a real-world scenario with multiple windows, this might need a more robust solution.
let activeUser = null;

function setupUserHandlers() {
  // --- User Management ---
  ipcMain.handle('get-users', () => 
    prisma.user.findMany({ 
      where: { isActive: true }, 
      orderBy: { name: 'asc' } 
    })
  );

  ipcMain.handle('add-user', (e, data) => 
    prisma.user.create({ data })
  );

  ipcMain.handle('update-user', (e, { id, data }) => 
    prisma.user.update({ where: { id }, data })
  );

  // We'll "soft delete" by setting isActive to false
  ipcMain.handle('delete-user', (e, id) => 
    prisma.user.update({ where: { id }, data: { isActive: false } })
  );

  // --- Authentication ---
  ipcMain.handle('login', async (e, pin) => {
    const user = await prisma.user.findFirst({ where: { pin, isActive: true } });
    if (user) {
      activeUser = user;
      // Automatically clock in the user if they don't have an open shift
      const openShift = await prisma.shift.findFirst({
        where: { userId: user.id, clockOut: null },
      });
      if (!openShift) {
        await prisma.shift.create({ data: { userId: user.id } });
      }
      return user;
    }
    throw new Error('Invalid PIN or inactive user.');
  });

  ipcMain.handle('logout', () => {
    activeUser = null;
    return true;
  });

  ipcMain.handle('get-active-user', () => {
    return activeUser;
  });

  // --- Shift Management ---
  ipcMain.handle('clock-out', async () => {
    if (!activeUser) throw new Error('No user is logged in.');
    const openShift = await prisma.shift.findFirst({
      where: { userId: activeUser.id, clockOut: null },
    });

    if (openShift) {
      await prisma.shift.update({
        where: { id: openShift.id },
        data: { clockOut: new Date() },
      });
      activeUser = null; // Log out after clocking out
      return true;
    }
    throw new Error('No open shift found for the current user.');
  });

  ipcMain.handle('get-current-shift', (e, userId) => {
    return prisma.shift.findFirst({
      where: { userId, clockOut: null },
      orderBy: { clockIn: 'desc' }
    });
  });
}

module.exports = { setupUserHandlers };