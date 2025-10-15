// src/lib/db.js
const { app } = require('electron');
const path = require('path');
const fs = require('fs');
const os = require('os');

const isDev = !app.isPackaged;

let PrismaClient, Prisma;
if (isDev) {
  ({ PrismaClient, Prisma } = require('@prisma/client'));
} else {
  ({ PrismaClient, Prisma } = require('../../prisma/bundled'));
}

let dbPath;
if (isDev) {
    dbPath = path.resolve(process.cwd(), 'prisma', 'pos_v2.db');
} else {
    const userDataPath = app.getPath('userData');
    dbPath = path.join(userDataPath, 'pos_v2.db');
    // This logic is for copying the db in a packaged app
    const packagedDbPath = path.join(process.resourcesPath, 'pos_v2.db');
    if (fs.existsSync(packagedDbPath) && !fs.existsSync(dbPath)) {
        fs.copyFileSync(packagedDbPath, dbPath);
    }
}

console.log(`[DB] Using database at path: ${dbPath}`);

const prismaInstance = new PrismaClient({
    datasources: {
        db: {
            url: `file:${dbPath.replace(/\\/g, '/')}`,
        },
    },
});

module.exports = {
    prisma: prismaInstance,
    Prisma,
};