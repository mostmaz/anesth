
const { LabImportService } = require('./dist/services/labImportService');
const puppeteer = require('puppeteer-core');

async function debugParse() {
    const service = new LabImportService();
    // Launch using our service's specific launch logic 
    const browser = await service.launchBrowser();
    const page = await browser.newPage();
    try {
        await page.goto('file:///app/uploads/search_result.html', { waitUntil: 'domcontentloaded' });

        const result = await page.evaluate(() => {
            try {
                const tables = document.querySelectorAll('table.dataTable');
                const tbodies = document.querySelectorAll('table.dataTable > tbody');
                const rows = document.querySelectorAll('table.dataTable > tbody > tr');

                let errorLog = '';

                const data = [];
                Array.from(rows).forEach((row, i) => {
                    try {
                        const cells = Array.from(row.querySelectorAll('td'));
                        if (cells.length < 5) {
                            errorLog += `Row ${i} skipped: cells.length=${cells.length}\n`;
                            return;
                        }

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
                            });
                        } else {
                            errorLog += `Row ${i} has 0 testRows (invCell HTML: ${invCell.innerHTML.substring(0, 50)})\n`;
                        }

                        tests.forEach(test => {
                            data.push({
                                name, date: dateStr, accNo, invoiceId, title: test.title, portalStatus: test.status
                            });
                        });
                    } catch (err) {
                        errorLog += `Row ${i} broke: ${err.message}\n`;
                    }
                });

                return {
                    tablesCount: tables.length,
                    tbodiesCount: tbodies.length,
                    rowsCount: rows.length,
                    recordsFound: data.length,
                    errorLog
                };
            } catch (err) {
                return { outerError: err.message };
            }
        });

        console.log('Parse result:', result);

    } catch (err) {
        console.error('Debug script failed:', err);
    } finally {
        await browser.close();
    }
}

debugParse();
