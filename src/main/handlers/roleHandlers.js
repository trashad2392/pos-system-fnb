// src/main/handlers/roleHandlers.js
const { ipcMain } = require('electron');
const { prisma } = require('../../lib/db');

function setupRoleHandlers() {
  // Get all roles with their permissions
  ipcMain.handle('get-roles', () =>
    prisma.role.findMany({
      orderBy: { name: 'asc' },
      include: { permissions: true },
    })
  );

  // Get all available permissions
  ipcMain.handle('get-permissions', () =>
    prisma.permission.findMany({ orderBy: { name: 'asc' } })
  );

  // Create a new role and assign permissions
  ipcMain.handle('create-role', (e, { name, permissionIds }) =>
    prisma.role.create({
      data: {
        name,
        permissions: {
          connect: permissionIds.map(id => ({ id })),
        },
      },
    })
  );
  
  // Update an existing role's name and permissions
  ipcMain.handle('update-role', (e, { id, name, permissionIds }) =>
    prisma.role.update({
      where: { id },
      data: {
        name,
        permissions: {
          // 'set' disconnects all old permissions and connects all new ones
          set: permissionIds.map(id => ({ id })),
        },
      },
    })
  );

  // Delete a role
  ipcMain.handle('delete-role', async (e, id) => {
    const userCount = await prisma.user.count({ where: { roleId: id } });
    if (userCount > 0) {
      throw new Error('Cannot delete role as it is still assigned to users.');
    }
    return prisma.role.delete({ where: { id } });
  });
}

module.exports = { setupRoleHandlers };