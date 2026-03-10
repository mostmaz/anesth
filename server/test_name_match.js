const normalize = (s) => {
    if (!s) return '';
    return s
        .replace(/\s+/g, ' ')
        .trim()
        .toLowerCase()
        .replace(/[أإآ]/g, 'ا')
        .replace(/ة/g, 'ه')
        .replace(/[ىي]/g, 'ي') // Normalize both to yeh
        .replace(/ئ/g, 'ي')
        .replace(/ؤ/g, 'و')
        .replace(/عبد\s+/g, 'عبد') // Normalize "عبد الله" to "عبدالله"
        .replace(/ابو\s+/g, 'ابو')
        .replace(/ابا\s+/g, 'ابا')
        .replace(/ابي\s+/g, 'ابي');
};

const isNameMatch = (target, row) => {
    if (!target || !row) return false;
    if (row === target || row.includes(target) || target.includes(row)) return true;

    // Token-based matching for Arabic names
    const targetTokens = target.split(/\s+/).filter(t => t.length > 1);
    const rowTokens = row.split(/\s+/).filter(t => t.length > 1);

    if (targetTokens.length === 0 || rowTokens.length === 0) return false;

    const isRowSubset = rowTokens.every(t => targetTokens.includes(t));
    const isTargetSubset = targetTokens.every(t => rowTokens.includes(t));

    if (isRowSubset || isTargetSubset) {
        // Require at least 2 matching words to prevent single generic word matches 
        // e.g. "المياحي" shouldn't automatically match any patient with that last name.
        const minTokens = Math.min(targetTokens.length, rowTokens.length);
        if (minTokens >= 2) return true;
    }

    return false;
};

const testCases = [
    { target: "حكمت ناجي سعيد المياحي", row: "حكمت ناجي المياحي", expected: true }, // missing middle name
    { target: "عبد الله محمد", row: "عبدالله محمد احمد", expected: true }, // spacing variation
    { target: "ابو الفضل عباس", row: "ابوالفضل عباس", expected: true },
    { target: "علي حسن منصور", row: "علي منصور", expected: true }, // missing middle name
    { target: "محمد", row: "محمد", expected: true },
    { target: "احمد كريم", row: "محمود كريم", expected: false }, // mismatch first name
    { target: "حسن محمد علي", row: "حسين محمد علي", expected: false }, // sibling overlap
    { target: "علي حسن منصور", row: "منصور", expected: true }, // NOTE: target.includes("منصور") returns true, but isNameMatch includes substring check. Let's see what it does.
];

testCases.forEach((tc, i) => {
    const tNorm = normalize(tc.target);
    const rNorm = normalize(tc.row);
    const match = isNameMatch(tNorm, rNorm);
    console.log(`Test ${i + 1}: expected ${tc.expected}, got ${match}`);
    console.log(`  Target: ${tc.target} -> ${tNorm}`);
    console.log(`  Row:    ${tc.row} -> ${rNorm}`);
    console.log(`  Pass:   ${match === tc.expected}`);
});
