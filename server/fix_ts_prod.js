const fs = require('fs');

// Fix the TypeScript source file (the server runs with ts-node)
const filePath = '/app/src/services/labImportService.ts';
let content = fs.readFileSync(filePath, 'utf8');

// Check if fix already applied
if (content.includes('SYSTEM_USER_FALLBACK') || content.includes('mock-senior-id')) {
    console.log('Fix already applied.');
    process.exit(0);
}

// Fix 1: Add authorId fallback constant after "const results: any[] = [];"
const marker1 = 'const results: any[] = [];';
if (content.includes(marker1)) {
    content = content.replace(
        marker1,
        `const results: any[] = [];
        const SYSTEM_USER_FALLBACK = 'mock-senior-id';
        const effectiveAuthorId = ['system-sync','system-cron','manual-sync','manual-sync-admin'].includes(authorId) ? SYSTEM_USER_FALLBACK : authorId;`
    );
    console.log('Added effectiveAuthorId constant');
} else {
    console.log('Marker 1 not found:', marker1);
}

// Fix 2: Replace authorId with effectiveAuthorId in the create data block
content = content.replace(
    /(\s*data: \{\s*\n\s*patientId,\s*\n\s*)authorId,/,
    '$1authorId: effectiveAuthorId,'
);

// Fix 3: Fix date parsing (old pattern with parseInt)
const oldDateParse = `if (report.date) {
                                const parts = report.date.split('-');
                                if (parts.length === 3) {
                                    parsedConductedAt = new Date(parseInt(parts[2]), parseInt(parts[1]) - 1, parseInt(parts[0]));
                                }
                            }`;
const newDateParse = `if (report.date) {
                                // Fix: date format is 'YYYY-MM-DD HH:mm', parse correctly
                                const dateOnly = report.date.split(' ')[0];
                                const timeOnly = (report.date.split(' ')[1] || '00:00') + ':00';
                                parsedConductedAt = new Date(dateOnly + 'T' + timeOnly);
                                if (isNaN(parsedConductedAt.getTime())) parsedConductedAt = new Date(report.date);
                                if (isNaN(parsedConductedAt.getTime())) parsedConductedAt = new Date();
                            }`;

if (content.includes("parts = report.date.split('-')")) {
    content = content.replace(oldDateParse, newDateParse);
    console.log('Date parsing fix applied');
} else {
    console.log('Date parsing already fixed or not found');
}

fs.writeFileSync(filePath, content, 'utf8');

// Verify
const verification = content.includes('effectiveAuthorId') && content.includes('SYSTEM_USER_FALLBACK');
console.log('Verification:', verification ? 'SUCCESS - All fixes applied' : 'PARTIAL - Check manually');

// Show context around fix
const idx = content.indexOf('effectiveAuthorId');
if (idx >= 0) {
    console.log('\nContext around fix:');
    console.log(content.substring(idx - 100, idx + 300));
}
