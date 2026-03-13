const fs = require('fs');

const filePath = '/app/dist/services/labImportService.js';
let content = fs.readFileSync(filePath, 'utf8');

// Fix 1: Default authorId in syncAllActivePatients - 'system-sync' -> 'mock-senior-id'
content = content.replace(
    "async syncAllActivePatients(authorId = 'system-sync')",
    "async syncAllActivePatients(authorId = 'mock-senior-id')"
);

// Fix 2: When authorId is a non-existent placeholder, use fallback
// Replace: data: { patientId, authorId, type:
// With: data: { patientId, authorId: (authorId === 'system-sync' || authorId === 'system-cron' || authorId === 'manual-sync' || authorId === 'manual-sync-admin' ? 'mock-senior-id' : authorId), type:
content = content.replace(
    /authorId: authorId,\s*type: \(item\.type/g,
    `authorId: (['system-sync','system-cron','manual-sync','manual-sync-admin'].includes(authorId) ? 'mock-senior-id' : authorId), type: (item.type`
);

fs.writeFileSync(filePath, content, 'utf8');
console.log('Author fix applied.');

// Verify
if (content.includes("mock-senior-id' : authorId)")) {
    console.log('VERIFIED: authorId fallback is in place');
} else {
    console.log('Note: authorId replacement may need manual check');
    // Show context
    const idx = content.indexOf('authorId:');
    if (idx >= 0) console.log(content.substring(idx - 20, idx + 150));
}
