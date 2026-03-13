const fs = require('fs');

const filePath = '/app/dist/services/labImportService.js';
let content = fs.readFileSync(filePath, 'utf8');

// Fix: replace "effectiveAuthorId," (shorthand) with "authorId: effectiveAuthorId,"
content = content.replace(
    /(\s*)effectiveAuthorId,\n(\s*)type: \(item\.type/g,
    '$1authorId: effectiveAuthorId,\n$2type: (item.type'
);

fs.writeFileSync(filePath, content, 'utf8');

// Verify
if (content.includes('authorId: effectiveAuthorId,')) {
    console.log('SUCCESS: authorId field name fixed correctly');
} else {
    // Try alternate pattern
    content = content.replace(/\beffectiveAuthorId,\b/g, 'authorId: effectiveAuthorId,');
    fs.writeFileSync(filePath, content, 'utf8');
    if (content.includes('authorId: effectiveAuthorId')) {
        console.log('SUCCESS: Applied alternate fix');
    } else {
        console.log('Check context:');
        const idx = content.indexOf('effectiveAuthorId');
        console.log(content.substring(Math.max(0, idx - 50), idx + 200));
    }
}
