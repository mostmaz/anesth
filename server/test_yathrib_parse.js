const fs = require('fs');

async function testParse() {
    const html = fs.readFileSync('search_result_yathrib.html', 'utf8');

    // MOCK DOM for node
    const jsdom = require("jsdom");
    const { JSDOM } = jsdom;
    const dom = new JSDOM(html);
    const document = dom.window.document;

    const rows = Array.from(document.querySelectorAll('table.dataTable > tbody > tr'));
    const records = [];

    rows.forEach((row, i) => {
        const cells = Array.from(row.querySelectorAll('td'));
        if (cells.length < 5) return;

        const dateStr = cells[1].textContent.trim();
        const accNo = cells[2].textContent.trim().split('\n')[0];
        const name = cells[3].querySelector('.card-title')?.textContent?.trim() || cells[3].textContent.trim();
        const invoiceId = cells[2].querySelector('.invoice_samples')?.getAttribute('invoice_id') || '';

        const invCell = cells[4];
        const testRows = Array.from(invCell.querySelectorAll('table tr'));

        console.log(`Row ${i} (${name}): Found ${testRows.length} sub-tests`);

        const tests = testRows.map(tr => {
            // Log the HTML of the row to see what we are dealing with
            // console.log("TR HTML:", tr.innerHTML);

            const statusTd = tr.querySelector('td.text-success, td.text-danger, td.text-warning');

            // Try to find ANY td just in case the classes are different for processing
            const allTds = Array.from(tr.querySelectorAll('td'));

            const title = statusTd?.textContent?.trim() || allTds[0]?.textContent?.trim() || 'Lab Report';

            const isProcessing = (statusTd && statusTd.className.includes('text-warning')) ||
                allTds.some(td => td.textContent.includes('Processing') || td.textContent.includes('Under Processing'));

            return {
                title: title,
                status: isProcessing ? 'PROCESSING' : 'FINAL'
            };
        });

        tests.forEach(test => {
            records.push({
                name, date: dateStr, accNo, invoiceId, title: test.title, portalStatus: test.status
            });
        });
    });

    console.log(JSON.stringify(records, null, 2));
}

testParse().catch(console.error);
