// scripts/build-prisma.js
const { build } = require('esbuild');
const { copyFile, mkdir, readdir } = require('fs/promises');
const path = require('path');

const generatedClientPath = path.resolve(__dirname, '../node_modules/.prisma/client');
const outdir = path.resolve(__dirname, '../prisma/bundled');

async function main() {
    try {
        await mkdir(outdir, { recursive: true });

        const prismaClientFiles = await readdir(generatedClientPath);
        // --- CHANGE 1: Find ALL engine files, not just one ---
        const engineFiles = prismaClientFiles.filter(file => file.startsWith('libquery_engine'));

        if (engineFiles.length === 0) {
            throw new Error('Could not find any Prisma query engine files. Please run "npx prisma generate" first.');
        }

        // Bundle the JS part of the client
        await build({
            entryPoints: [path.join(generatedClientPath, 'index.js')],
            bundle: true,
            platform: 'node',
            outfile: path.join(outdir, 'index.js'),
            external: ['electron'],
        });

        // --- CHANGE 2: Copy ALL engine files ---
        for (const engineFile of engineFiles) {
            const engineSource = path.join(generatedClientPath, engineFile);
            const engineTarget = path.join(outdir, engineFile);
            await copyFile(engineSource, engineTarget);
            console.log(`- Copied engine: ${engineFile}`);
        }

        console.log(`✅ Prisma client bundled and ${engineFiles.length} engines copied successfully.`);

    } catch (err) {
        console.error("❌ Failed to build Prisma client:", err);
        process.exit(1);
    }
}

main();