const fs = require('fs');

const filePath = '/app/dist/services/labImportService.js';
let content = fs.readFileSync(filePath, 'utf8');

// Check if fix already applied
if (content.includes('SYSTEM_USER_IDS')) {
    console.log('Fix already applied.');
    process.exit(0);
}

// Add a helper constant at the start of syncAndSavePatientLabs
// Find the line: "const results = [];" inside syncAndSavePatientLabs
const MARKER = "const { PrismaClient } = require('@prisma/client');\n        const prisma = new PrismaClient();\n        const results = [];";
const REPLACEMENT = "const { PrismaClient } = require('@prisma/client');\n        const prisma = new PrismaClient();\n        const results = [];\n        // Use fallback user for system-generated syncs\n        const SYSTEM_USER_IDS = ['system-sync', 'system-cron', 'manual-sync', 'manual-sync-admin'];\n        const effectiveAuthorId = SYSTEM_USER_IDS.includes(authorId) ? 'mock-senior-id' : authorId;";

if (content.includes(MARKER)) {
    content = content.replace(MARKER, REPLACEMENT);

    // Also replace the authorId usage in prisma.investigation.create
    // Find: "authorId,\n                                        type: (item.type || 'LAB')"
    content = content.replace(
        /authorId,\s*\n(\s*)type: \(item\.type \|\| 'LAB'\)/g,
        `effectiveAuthorId,\n$1type: (item.type || 'LAB')`
    );

    // Rename authorId -> effectiveAuthorId in the create data
    content = content.replace(/\bauthorId,\n(\s+)type: \(item\.type/g, 'effectiveAuthorId,\n$1type: (item.type');

    fs.writeFileSync(filePath, content, 'utf8');
    console.log('SUCCESS: authorId fix applied');
} else {
    console.log('Marker not found. Trying alternative approach...');
    // Direct replacement of the create data authorId
    content = content.replace(
        /(\s*const newInv = await prisma\.investigation\.create\(\{[\s\S]*?data: \{[\s\S]*?patientId,\n\s*)authorId,/,
        '$1authorId: ([\'system-sync\',\'system-cron\',\'manual-sync\',\'manual-sync-admin\'].includes(authorId) ? \'mock-senior-id\' : authorId),'
    );

    fs.writeFileSync(filePath, content, 'utf8');

    // Verify
    if (content.includes("mock-senior-id' : authorId)")) {
        console.log('SUCCESS: Regex replacement worked');
    } else {
        console.log('FAILED: Could not apply fix. Showing create data context:');
        const idx = content.indexOf('const newInv = await prisma.investigation.create');
        console.log(content.substring(idx - 20, idx + 300));
    }
}
