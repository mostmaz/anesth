
const fs = require('fs');
const jsdom = require('jsdom');
const { JSDOM } = jsdom;

const html = fs.readFileSync(__dirname + '/search_result.html', 'utf8');
const dom = new JSDOM(html);
const document = dom.window.document;

const rows = Array.from(document.querySelectorAll('table.dataTable > tbody > tr'));
const records = [];

rows.forEach((row, i) => {
    const cells = Array.from(row.querySelectorAll('td'));
    if (cells.length < 5) return;

    const dateStr = cells[1].innerText || cells[1].textContent.trim();
    const accNo = (cells[2].innerText || cells[2].textContent).trim().split('\n')[0].trim();

    let name = cells[3].querySelector('.card-title')?.textContent?.trim() || cells[3].textContent.trim();
    // remove newlines and extra spaces from name
    name = name.replace(/\s+/g, ' ').trim();

    const invoiceId = cells[2].querySelector('.invoice_samples')?.getAttribute('invoice_id') || '';

    const invCell = cells[4];
    const testRows = Array.from(invCell.querySelectorAll('table tr'));

    // Fallback if testRows is empty
    let tests = [];
    if (testRows.length > 0) {
        tests = testRows.map(tr => {
            const statusTd = tr.querySelector('td.text-success, td.text-danger, td.text-warning');
            return {
                title: statusTd?.textContent?.trim() || 'Lab Report',
                status: (statusTd?.className.includes('text-warning') || statusTd?.textContent?.includes('Processing')) ? 'PROCESSING' : 'FINAL'
            };
        });
    } else {
        tests = [{ title: 'Lab Report', status: 'FINAL' }];
    }

    tests.forEach(test => {
        records.push({
            name, date: dateStr, accNo, invoiceId, title: test.title, portalStatus: test.status
        });
    });
});

console.log(`Found ${records.length} records in HTML`);
console.log(records);

// Test name match
const searchName = 'هاشم ياسين خليل يونس';
const normalize = (n) => n.replace(/،/g, '').trim().replace(/\s+/g, ' ').split(' ').slice(0, 2).join(' ');
console.log('Search name normalized:', normalize(searchName));
console.log('Record 0 name normalized:', records[0] ? normalize(records[0].name) : 'none');
console.log('Match?', records[0] ? normalize(searchName) === normalize(records[0].name) : false);

