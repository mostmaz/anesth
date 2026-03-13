const fs = require('fs');

const filePath = '/app/src/services/labImportService.ts';
let content = fs.readFileSync(filePath, 'utf8');

// Check current state
console.log('effectiveAuthorId present:', content.includes('effectiveAuthorId'));
console.log('SYSTEM_USER_FALLBACK present:', content.includes('SYSTEM_USER_FALLBACK'));
console.log('Date fix present:', content.includes('dateOnly = report.date.split'));

// Fix 1: Add effectiveAuthorId after "const results = [];"
// The marker is inside syncAndSavePatientLabs
const marker = "        const results = [];\n        const { notificationEmitter } = await import('../routes/notifications.routes');";

if (content.includes(marker) && !content.includes('SYSTEM_USER_FALLBACK')) {
    content = content.replace(
        marker,
        `        const results = [];
        const SYSTEM_USER_FALLBACK = 'mock-senior-id';
        const effectiveAuthorId = ['system-sync','system-cron','manual-sync','manual-sync-admin'].includes(authorId) ? SYSTEM_USER_FALLBACK : authorId;
        const { notificationEmitter } = await import('../routes/notifications.routes');`
    );
    console.log('Added effectiveAuthorId');
} else if (content.includes(SYSTEM_USER_FALLBACK)) {
    console.log('Fix 1 already applied');
} else {
    // Try simpler marker
    const simpleMarker = "        const results = [];";
    const idx = content.indexOf(simpleMarker);
    if (idx >= 0) {
        // Only replace the first occurrence (in syncAndSavePatientLabs)
        content = content.substring(0, idx) +
            `        const results = [];
        const SYSTEM_USER_FALLBACK = 'mock-senior-id';
        const effectiveAuthorId = ['system-sync','system-cron','manual-sync','manual-sync-admin'].includes(authorId) ? SYSTEM_USER_FALLBACK : authorId;` +
            content.substring(idx + simpleMarker.length);
        console.log('Added effectiveAuthorId (simple)');
    }
}

// Fix 2: authorId -> effectiveAuthorId in create data (only if not already done)
if (content.includes('authorId: effectiveAuthorId,')) {
    console.log('Fix 2 already applied');
} else if (content.includes('                        authorId,\n                        type: (item.type')) {
    content = content.replace(
        '                        authorId,\n                        type: (item.type',
        '                        authorId: effectiveAuthorId,\n                        type: (item.type'
    );
    console.log('Fix 2 applied');
}

fs.writeFileSync(filePath, content, 'utf8');

// Final verification
console.log('\n=== VERIFICATION ===');
console.log('effectiveAuthorId defined:', content.includes('SYSTEM_USER_FALLBACK'));
console.log('effectiveAuthorId used:', content.includes('authorId: effectiveAuthorId,'));
console.log('Date fix:', content.includes('dateOnly = report.date.split'));

// Show context
const idx = content.indexOf('const SYSTEM_USER_FALLBACK');
if (idx >= 0) {
    console.log('\nFix context:');
    console.log(content.substring(idx - 30, idx + 350));
}
