const fs = require('fs');

// Fix the date parsing bug in production labImportService.js
const filePath = '/app/dist/services/labImportService.js';
let content = fs.readFileSync(filePath, 'utf8');

// Check if fix is already applied
if (content.includes('dateOnly = report.date.split')) {
    console.log('Fix already applied, skipping.');
    process.exit(0);
}

// Find and replace the buggy date parsing
const oldPattern = `if (report.date) {
                                const parts = report.date.split('-');
                                if (parts.length === 3) {
                                    parsedConductedAt = new Date(parseInt(parts[2]), parseInt(parts[1]) - 1, parseInt(parts[0]));
                                }
                            }`;

const newCode = `if (report.date) {
                                // Fix: date format is 'YYYY-MM-DD HH:mm', parse correctly
                                const dateOnly = report.date.split(' ')[0];
                                const timeOnly = (report.date.split(' ')[1] || '00:00') + ':00';
                                parsedConductedAt = new Date(dateOnly + 'T' + timeOnly);
                                if (isNaN(parsedConductedAt.getTime())) parsedConductedAt = new Date(report.date);
                                if (isNaN(parsedConductedAt.getTime())) parsedConductedAt = new Date();
                            }`;

if (content.includes("parts = report.date.split('-')")) {
    content = content.replace(oldPattern, newCode);
    if (content.includes('dateOnly = report.date.split')) {
        fs.writeFileSync(filePath, content, 'utf8');
        console.log('SUCCESS: Date parsing fix applied to labImportService.js');
    } else {
        // Try a more targeted replacement
        content = fs.readFileSync(filePath, 'utf8');
        content = content.replace(
            /const parts = report\.date\.split\('-'\);\s*if \(parts\.length === 3\) \{\s*parsedConductedAt = new Date\(parseInt\(parts\[2\]\), parseInt\(parts\[1\]\) - 1, parseInt\(parts\[0\]\)\);\s*\}/,
            `const dateOnly = report.date.split(' ')[0]; const timeOnly = (report.date.split(' ')[1] || '00:00') + ':00'; parsedConductedAt = new Date(dateOnly + 'T' + timeOnly); if (isNaN(parsedConductedAt.getTime())) parsedConductedAt = new Date();`
        );
        fs.writeFileSync(filePath, content, 'utf8');
        console.log('SUCCESS: Applied targeted regex fix');
    }
} else {
    console.log('Pattern not found. Showing context around parsedConductedAt:');
    const idx = content.indexOf('parsedConductedAt = new Date(parseInt');
    if (idx >= 0) {
        console.log(content.substring(idx - 100, idx + 300));
    } else {
        console.log('No parsedConductedAt found in file.');
    }
}
