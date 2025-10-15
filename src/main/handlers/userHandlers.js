// src/main/handlers/userHandlers.js
const { ipcMain } = require('electron');
const { prisma } = require('../../lib/db');

let activeUser = null;

function setupUserHandlers() {
  ipcMain.handle('get-users', () => 
    prisma.user.findMany({ 
      where: { isActive: true }, 
      orderBy: { name: 'asc' },
      include: { role: true }
    })
  );

  ipcMain.handle('add-user', (e, data) => 
    prisma.user.create({ data })
  );

  ipcMain.handle('update-user', (e, { id, data }) => 
    prisma.user.update({ where: { id }, data })
  );

  ipcMain.handle('delete-user', (e, id) => 
    prisma.user.update({ where: { id }, data: { isActive: false } })
  );

  ipcMain.handle('login', async (e, pin) => {
    const user = await prisma.user.findFirst({
      where: { pin, isActive: true },
      include: {
        role: {
          include: {
            permissions: true,
          },
        },
      },
    });

    if (user) {
      const simplifiedUser = {
        id: user.id,
        name: user.name,
        role: user.role.name,
        permissions: user.role.permissions.map(p => p.name),
      };
      
      activeUser = simplifiedUser;

      const openShift = await prisma.shift.findFirst({
        where: { userId: user.id, clockOut: null },
      });
      if (!openShift) {
        await prisma.shift.create({ data: { userId: user.id } });
      }
      return simplifiedUser;
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
      activeUser = null;
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