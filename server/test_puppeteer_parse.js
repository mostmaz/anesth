
const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');

async function testLocalParse() {
    const browser = await puppeteer.launch();
    const page = await browser.newPage();
    const htmlPath = 'file:///' + path.join(__dirname, 'search_result.html').replace(/\\/g, '/');
    await page.goto(htmlPath, { waitUntil: 'networkidle2' });

    const records = await page.evaluate(() => {
        const rows = Array.from(document.querySelectorAll('table.dataTable > tbody > tr'));
        const data = [];
        rows.forEach((row) => {
            const cells = Array.from(row.querySelectorAll('td'));
            if (cells.length < 5) return;

            const dateStr = cells[1].innerText.trim();
            const accNo = cells[2].innerText.trim().split('\n')[0].trim();

            let name = cells[3].querySelector('.card-title')?.textContent?.trim() || cells[3].innerText.trim();
            name = name.replace(/\s+/g, ' ').trim();

            const invoiceId = cells[2].querySelector('.invoice_samples')?.getAttribute('invoice_id') || '';

            const invCell = cells[4];
            const testRows = Array.from(invCell.querySelectorAll('table tr'));

            let tests = [];
            if (testRows.length > 0) {
                tests = testRows.map(tr => {
                    const statusTd = tr.querySelector('td.text-success, td.text-danger, td.text-warning');
                    return {
                        title: statusTd?.textContent?.trim() || 'Lab Report',
                        status: (statusTd?.className.includes('text-warning') || statusTd?.innerText?.includes('Processing')) ? 'PROCESSING' : 'FINAL'
                    };
                }).filter(t => t.title && t.title !== 'Lab Report');
            }

            tests.forEach(test => {
                data.push({
                    name, date: dateStr, accNo, invoiceId, title: test.title, portalStatus: test.status
                });
            });
        });
        return data;
    });

    console.log(`Found ${records.length} records in HTML`);
    console.log(records);

    const searchName = 'هاشم ياسين خليل يونس';
    const normalize = (n) => n.replace(/،/g, '').trim().replace(/\s+/g, ' ').split(' ').slice(0, 2).join(' ');
    console.log('Search name normalized:', normalize(searchName));
    if (records.length > 0) {
        console.log('Record 0 name normalized:', normalize(records[0].name));
        console.log('Match?', normalize(searchName) === normalize(records[0].name));
    }

    await browser.close();
}

testLocalParse();
