// src/lib/db.js
const { app } = require('electron');
const path = require('path');
const fs = require('fs');
const os = require('os');

// This check is crucial for determining which Prisma Client to use.
const isDev = !app.isPackaged;

// --- THIS IS THE FIX ---
// We now conditionally require the PrismaClient.
let PrismaClient, Prisma;
if (isDev) {
  // In development, we use the client directly from node_modules, which is always up-to-date.
  ({ PrismaClient, Prisma } = require('@prisma/client'));
} else {
  // In production, we use the client that was bundled during the build process.
  ({ PrismaClient, Prisma } = require('../../prisma/bundled'));
}
// --- END OF FIX ---


let dbPath;
let enginePath;

const bundledDir = path.resolve(__dirname, '..', '..', 'prisma', 'bundled');

if (isDev) {
    dbPath = path.resolve(process.cwd(), 'prisma', 'prisma', 'dev.db');
} else {
    const userDataPath = app.getPath('userData');
    dbPath = path.join(userDataPath, 'pos.db');
    try {
        const platform = os.platform();
        const arch = os.arch();
        const files = fs.readdirSync(bundledDir);
        let engineFile;

        if (platform === 'win32') {
            engineFile = files.find(f => f.endsWith('windows.dll.node'));
        } else if (platform === 'darwin') {
            const engineIdentifier = arch === 'arm64' ? 'darwin-arm64.so.node' : 'darwin.dylib.node';
            engineFile = files.find(f => f.endsWith(engineIdentifier));
        } else if (platform === 'linux') {
            engineFile = files.find(f => f.includes('debian-openssl'));
        }

        if (engineFile) {
            enginePath = path.join(bundledDir, engineFile);
        } else {
            throw new Error(`Could not find a compatible Prisma query engine for platform "${platform}-${arch}".`);
        }
    } catch (e) {
        console.error("Engine lookup error:", e);
    }
}

const dbDir = path.dirname(dbPath);
if (!fs.existsSync(dbDir)) {
    fs.mkdirSync(dbDir, { recursive: true });
}

if (enginePath) {
    process.env.PRISMA_QUERY_ENGINE_LIBRARY = enginePath;
}

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