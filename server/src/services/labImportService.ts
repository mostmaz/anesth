
import puppeteer, { Page } from 'puppeteer';

export class LabImportService {
    private static BASE_URL = 'https://amrlab.net/referral/auth/login';
    // Cache storage
    private static patientCache: any[] | null = null;
    private static cacheTimestamp: number = 0;
    private static CACHE_TTL = 5 * 60 * 1000; // 5 minutes

    private async launchBrowser() {
        const fs = require('fs');
        let executablePath = '';
        const possiblePaths = [
            // Linux (Docker)
            '/usr/bin/google-chrome',
            '/usr/bin/google-chrome-stable',
            '/usr/bin/chromium',
            '/usr/bin/chromium-browser',
            // Windows
            'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
            'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe'
        ];

        for (const path of possiblePaths) {
            if (fs.existsSync(path)) {
                executablePath = path;
                break;
            }
        }

        if (!executablePath) {
            console.warn("LabImportService: System Chrome not found, relying on bundled Chromium.");
        } else {
            console.log("LabImportService: Using system Chrome at", executablePath);
        }

        return puppeteer.launch({
            headless: true,
            executablePath: executablePath || undefined,
            args: [
                '--no-sandbox',
                '--disable-setuid-sandbox',
                '--disable-dev-shm-usage',   // Critical for Docker — avoids /dev/shm crash
                '--disable-gpu',
                '--no-zygote',
                '--single-process',
                '--window-size=1280,800'
            ]
        });
    }

    private async login(page: Page, username: string, password: string) {
        console.log('Navigating to ' + LabImportService.BASE_URL);
        await page.goto(LabImportService.BASE_URL, { waitUntil: 'networkidle2', timeout: 60000 });

        console.log('Waiting for login inputs...');
        await page.waitForSelector('input[name="email"]', { visible: true, timeout: 30000 });

        console.log('Setting credentials via JS...');

        await page.evaluate((u, p) => {
            const user = document.querySelector('input[name="email"]') as HTMLInputElement;
            const pass = document.querySelector('input[name="password"]') as HTMLInputElement;

            if (user) {
                user.value = u;
                user.dispatchEvent(new Event('input', { bubbles: true }));
                user.dispatchEvent(new Event('change', { bubbles: true }));
                user.dispatchEvent(new Event('blur', { bubbles: true }));
            }
            if (pass) {
                pass.value = p;
                pass.dispatchEvent(new Event('input', { bubbles: true }));
                pass.dispatchEvent(new Event('change', { bubbles: true }));
                pass.dispatchEvent(new Event('blur', { bubbles: true }));
            }
        }, username, password);

        // Click Login
        console.log('Submitting login form...');

        try {
            await Promise.all([
                page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 45000 }),
                page.click('button[type="submit"]')
            ]);
            console.log("Navigation completed.");
        } catch (e) {
            console.log("Navigation error or already on page.", e);
        }

        // Specifically go to invoices page since dashboard doesn't hold the tables
        console.log('Navigating to Invoices (Lab Results)...');
        await page.goto('https://amrlab.net/referral/invoices', { waitUntil: 'networkidle2', timeout: 45000 });
        // Wait for DataTables to possibly render
        await new Promise(r => setTimeout(r, 4000));
    }

    async getPatients(username: string, password: string, forceRefresh: boolean = false): Promise<any[]> {
        // Check Cache
        if (!forceRefresh && LabImportService.patientCache && (Date.now() - LabImportService.cacheTimestamp < LabImportService.CACHE_TTL)) {
            console.log("Returning cached patient list.");
            return LabImportService.patientCache;
        }

        console.log('Starting Lab Import Service (Fetching Fresh List)...');
        const browser = await this.launchBrowser();
        const page = await browser.newPage();

        // Pipe browser logs to node console
        page.on('console', msg => console.log('PAGE LOG:', msg.text()));

        try {
            await this.login(page, username, password);

            // 4. Scrape Data
            console.log('Scraping patient list...');
            await page.waitForSelector('table.dataTable', { timeout: 30000 }).catch(() => console.log('Wait for dataTable timeout'));

            const patients = await page.evaluate(() => {
                const rows = Array.from(document.querySelectorAll('table.dataTable tbody tr[role="row"]'));
                const records: any[] = [];

                rows.forEach((row, idx) => {
                    const cells = Array.from(row.querySelectorAll('td'));
                    if (cells.length < 5) return; // We need enough columns

                    const dateStr = cells[1] ? cells[1].innerText.trim() : '';

                    const barcodeDiv = cells[2] ? cells[2].querySelector('.invoice_samples') : null;
                    const invoiceId = barcodeDiv ? barcodeDiv.getAttribute('invoice_id') : '';
                    const accNo = cells[2] ? (cells[2] as HTMLElement).innerText.trim().split('\n')[0] : '';

                    const nameCardHeader = cells[3] ? cells[3].querySelector('.card-title') : null;
                    const name = nameCardHeader ? (nameCardHeader as HTMLElement).innerText.trim() : '';

                    // Extract titles
                    const testsTable = cells[3] ? cells[3].querySelector('table') : null;
                    const titles: string[] = [];
                    if (testsTable) {
                        const trs = Array.from(testsTable.querySelectorAll('tr'));
                        for (let tr of trs) {
                            const td = tr.querySelector('td.text-success, td.text-danger, td.text-warning');
                            if (td) {
                                titles.push((td as HTMLElement).innerText.trim());
                            }
                        }
                    }

                    // Extract MRN/ID NO
                    let mrn = invoiceId || Math.random().toString(36).substr(2, 9);
                    if (testsTable) {
                        const infoRows = Array.from(testsTable.querySelectorAll('tr'));
                        for (let ir of infoRows) {
                            const th = ir.querySelector('th');
                            if (th && (th as HTMLElement).innerText.includes('ID NO')) {
                                const siblingTd = th.nextElementSibling;
                                if (siblingTd) {
                                    const potentialMrn = (siblingTd as HTMLElement).innerText.trim();
                                    if (potentialMrn) mrn = potentialMrn;
                                }
                            }
                        }
                    }

                    if (!name) return;

                    if (titles.length > 0) {
                        titles.forEach(title => {
                            records.push({
                                id: `${mrn}-${title}-${idx}`,
                                name: name,
                                mrn: mrn, // Now mostly fallback or ID NO
                                date: dateStr,
                                gender: 'Unknown',
                                dob: '',
                                accNo: accNo,
                                title: title,
                                rowIndex: idx,
                                invoiceId: invoiceId
                            });
                        });
                    } else {
                        // Fallback if cell was somehow empty but row was valid
                        records.push({
                            id: `${mrn}-Unknown-${idx}`,
                            name: name,
                            mrn: mrn,
                            date: dateStr,
                            gender: 'Unknown',
                            dob: '',
                            accNo: accNo,
                            title: 'Lab Report',
                            rowIndex: idx,
                            invoiceId: invoiceId
                        });
                    }
                });
                return records;
            });

            console.log(`Found ${patients.length} patient records (tests).`);

            // Update Cache
            LabImportService.patientCache = patients;
            LabImportService.cacheTimestamp = Date.now();

            return patients;

        } catch (error) {
            console.error('Error in LabImportService:', error);
            try {
                const errorPath = `uploads/error-${Date.now()}.png`;
                await page.screenshot({ path: require('path').resolve(errorPath) });
                console.log(`Error screenshot saved to ${errorPath}`);
            } catch (e) { }
            throw error;
        } finally {
            await browser.close();
        }
    }

    async importReport(username: string, password: string, patientData: any): Promise<any> {
        console.log('Starting Lab Report Import...', patientData);
        const targetAccNo = patientData.accNo;
        const targetInvoiceId = patientData.invoiceId;

        const browser = await this.launchBrowser();
        const page = await browser.newPage();

        try {
            await this.login(page, username, password);

            await page.waitForSelector('table.dataTable', { timeout: 30000 });

            // Since we know the print action URL is `/referral/invoices/print_medical_report/:invoiceId`
            // And we extracted invoiceId, we can directly trigger a print if we have it.
            // But if we don't have it (fallback from older system), we find the row first.

            let printUrl = '';

            if (targetInvoiceId) {
                printUrl = `https://amrlab.net/referral/invoices/print_medical_report/${targetInvoiceId}`;
            } else {
                // Find row and extract action
                const extractedUrl = await page.evaluate((targetName, targetDate, accNo) => {
                    const rows = Array.from(document.querySelectorAll('table.dataTable tbody tr[role="row"]'));

                    const matchIndex = rows.findIndex((tr) => {
                        const cells = Array.from(tr.querySelectorAll('td'));
                        if (cells.length < 5) return false;

                        const rowAccNo = cells[2] ? (cells[2] as HTMLElement).innerText.trim().split('\n')[0] : '';
                        const date = cells[1] ? (cells[1] as HTMLElement).innerText.trim() : '';

                        const nameCardHeader = cells[3] ? cells[3].querySelector('.card-title') : null;
                        const name = nameCardHeader ? (nameCardHeader as HTMLElement).innerText.trim() : '';

                        if (accNo && rowAccNo === accNo) return true;
                        return (name === targetName && date === targetDate);
                    });

                    if (matchIndex !== -1) {
                        const matchRow = rows[matchIndex];
                        const cells = Array.from(matchRow.querySelectorAll('td'));
                        const printForm = cells[5] ? cells[5].querySelector('form') : null;
                        return printForm ? printForm.getAttribute('action') : '';
                    }
                    return '';
                }, patientData.name, patientData.date, targetAccNo);

                printUrl = extractedUrl || '';
            }

            if (!printUrl) {
                throw new Error("Patient record or print link not found in current list");
            }

            console.log(`Navigating to Print URL: ${printUrl}`);

            // The print url is a POST request according to the form snippet.
            // <form action="..." method="POST" ...>
            // We can evaluate a form submission on the current page to that URL to open it.

            await page.evaluate((url) => {
                const form = document.createElement('form');
                form.method = 'POST';
                form.action = url;

                // Needs a CSRF token. The form on the page has a hidden _token field.
                const existingToken = document.querySelector('input[name="_token"]') as HTMLInputElement;
                if (existingToken) {
                    const tokenInput = document.createElement('input');
                    tokenInput.type = 'hidden';
                    tokenInput.name = '_token';
                    tokenInput.value = existingToken.value;
                    form.appendChild(tokenInput);
                }

                document.body.appendChild(form);
                form.submit();
            }, printUrl);

            await page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 30000 }).catch(e => console.log('Navigation wait error', e));

            await page.setViewport({ width: 1280, height: 1024 });
            await new Promise(r => setTimeout(r, 3000)); // Allow render

            // Try to expand any hidden overflow for full page
            await page.evaluate(() => { const s = document.createElement('style'); s.innerHTML = '*,body,html{overflow:visible!important;height:auto!important;max-height:none!important;}'; document.head.appendChild(s); });
            await new Promise(r => setTimeout(r, 1000));

            const screenshotPath = `uploads/import-${Date.now()}.png`;
            const absolutePath = require('path').resolve(screenshotPath);

            try {
                await page.screenshot({ path: absolutePath, fullPage: true });
            } catch (screenshotError) {
                console.error("Screenshot failed, trying without fullPage:", screenshotError);
                await page.screenshot({ path: absolutePath });
            }

            return { screenshotPath: absolutePath, accNo: targetAccNo };

        } catch (error) {
            console.error('Error importing report:', error);
            throw error;
        } finally {
            await browser.close();
        }
    }

    async syncPatientLabResults(username: string, password: string, mrn: string, existingAccNos: Set<string>): Promise<any[]> {
        console.log(`Syncing results for MRN: ${mrn}`);

        const browser = await this.launchBrowser();
        const page = await browser.newPage();
        const newReports: any[] = [];

        try {
            await this.login(page, username, password);

            // Get List including rowIndex
            await page.waitForSelector('table.dataTable', { timeout: 30000 });
            const rows = await page.evaluate(() => {
                const records: any[] = [];
                Array.from(document.querySelectorAll('table.dataTable tbody tr[role="row"]')).forEach((row, idx) => {
                    const cells = Array.from(row.querySelectorAll('td'));
                    if (cells.length < 5) return;

                    const dateStr = cells[1] ? (cells[1] as HTMLElement).innerText.trim() : '';
                    const barcodeDiv = cells[2] ? cells[2].querySelector('.invoice_samples') : null;
                    const invoiceId = barcodeDiv ? barcodeDiv.getAttribute('invoice_id') : '';
                    const accNo = cells[2] ? (cells[2] as HTMLElement).innerText.trim().split('\n')[0] : '';

                    const nameCardHeader = cells[3] ? cells[3].querySelector('.card-title') : null;
                    const name = nameCardHeader ? (nameCardHeader as HTMLElement).innerText.trim() : '';

                    const testsTable = cells[3] ? cells[3].querySelector('table') : null;
                    const titles: string[] = [];
                    if (testsTable) {
                        const trs = Array.from(testsTable.querySelectorAll('tr'));
                        for (let tr of trs) {
                            const td = tr.querySelector('td.text-success, td.text-danger, td.text-warning');
                            if (td) titles.push((td as HTMLElement).innerText.trim());
                        }
                    }

                    let rowMrn = invoiceId;
                    if (testsTable) {
                        const infoRows = Array.from(testsTable.querySelectorAll('tr'));
                        for (let ir of infoRows) {
                            const th = ir.querySelector('th');
                            if (th && (th as HTMLElement).innerText.includes('ID NO')) {
                                const siblingTd = th.nextElementSibling;
                                if (siblingTd) {
                                    const potentialMrn = (siblingTd as HTMLElement).innerText.trim();
                                    if (potentialMrn) rowMrn = potentialMrn;
                                }
                            }
                        }
                    }

                    if (titles.length > 0) {
                        titles.forEach((title, sIdx) => {
                            records.push({
                                accNo: accNo,
                                date: dateStr,
                                mrn: rowMrn,
                                name: name,
                                title: title,
                                invoiceId: invoiceId,
                                rowIndex: idx,
                                subIndex: sIdx
                            });
                        });
                    } else {
                        records.push({
                            accNo: accNo,
                            date: dateStr,
                            mrn: rowMrn,
                            name: name,
                            title: 'Lab Report',
                            invoiceId: invoiceId,
                            rowIndex: idx,
                            subIndex: 0
                        });
                    }
                });
                return records;
            });

            // Fallback match by Name if MRN doesn't match directly since MRN is removed
            // Wait, we passed MRN to this function but user says MRN is removed, use Name.
            // The route passes MRN, but we might actually pass the Name as MRN.
            // We should match by name or by MRN depending on what was passed.
            // In the sync endpoint we passed `mrn` derived from patientMrn. The UI might send patientName.
            // Let's match by MRN if it exists, otherwise fall back to name match.
            // Actually, `mrn` param might literally be the patient string if we changed the caller... 
            // We'll broaden the match condition.
            let matches = rows.filter(r => r && (r.mrn === mrn || r.name === mrn || r.name.includes(mrn)));

            // Deduplicate early using the existingAccNos set to save API usage
            matches = matches.filter(r => !existingAccNos.has(r.accNo));
            console.log(`Found ${matches.length} new/unprocessed matches for MRN/Name ${mrn}`);

            if (matches.length > 5) {
                matches = matches.slice(0, 5);
                console.log(`Limiting to latest 5 matches for auto-sync.`);
            }

            for (const match of matches) {
                if (!match || !match.invoiceId) continue;
                console.log(`Processing report for ${match.accNo} - ${match.title}`);

                try {
                    // Navigate directly to print page
                    const printUrl = `https://amrlab.net/referral/invoices/print_medical_report/${match.invoiceId}`;

                    const newPage = await browser.newPage();

                    // The print page requires POST and CSRF. We can't simply goto() a POST.
                    // Instead, we inject JS into the current dataTable page to trigger form submission
                    // into a new target/tab.
                    await page.evaluate((url) => {
                        const form = document.createElement('form');
                        form.method = 'POST';
                        form.action = url;
                        form.target = '_blank'; // open in new tab

                        const existingToken = document.querySelector('input[name="_token"]') as HTMLInputElement;
                        if (existingToken) {
                            const tokenInput = document.createElement('input');
                            tokenInput.type = 'hidden';
                            tokenInput.name = '_token';
                            tokenInput.value = existingToken.value;
                            form.appendChild(tokenInput);
                        }

                        document.body.appendChild(form);
                        form.submit();
                    }, printUrl);

                    const newTarget = await browser.waitForTarget(target => target.opener() === page.target(), { timeout: 15000 }).catch(() => null);

                    if (newTarget) {
                        const printPage = await newTarget.page();
                        if (printPage) {
                            await printPage.waitForNetworkIdle({ timeout: 5000 }).catch(() => { });
                            await printPage.evaluate(() => { const s = document.createElement('style'); s.textContent = '*,body,html{overflow:visible!important;height:auto!important;max-height:none!important;}'; document.head.appendChild(s); });

                            await printPage.setViewport({ width: 1280, height: 1024 });
                            await new Promise(r => setTimeout(r, 1500));

                            const screenshotPath = `uploads/sync-${match.accNo}-${Date.now()}-${Math.floor(Math.random() * 1000)}.png`;
                            const absolutePath = require('path').resolve(screenshotPath);

                            try {
                                await printPage.screenshot({ path: absolutePath, fullPage: true });
                            } catch (ssErr) {
                                await printPage.screenshot({ path: absolutePath });
                            }

                            await printPage.close();

                            newReports.push({
                                screenshotPath: absolutePath,
                                ...match
                            });
                        }
                    }

                } catch (err) {
                    console.error(`Failed to grab report for ${match.accNo}`, err);
                }
            }
        } catch (e) {
            console.error("Sync failed", e);
        } finally {
            await browser.close();
        }

        return newReports;
    }

    async syncAndSavePatientLabs(mrn: string, patientId: string, authorId: string): Promise<any[]> {
        const username = 'icu@amrlab.net';
        const password = process.env.LAB_PASSWORD || '1989';

        // Imports moved to top of file for proper module syntax
        // import { PrismaClient } from '@prisma/client';
        // import puppeteer, { Page } from 'puppeteer';
        // import fs from 'fs';
        // import { notificationEmitter } from '../routes/notifications.routes';

        const { PrismaClient } = require('@prisma/client');
        const prisma = new PrismaClient();
        const results = [];

        // Dynamically import notificationEmitter to avoid circular dependencies if this file is imported by notification.routes
        const { notificationEmitter } = await import('../routes/notifications.routes');

        try {
            // Find existing accession numbers for this patient to prevent redundant processing
            const existingInvestigations = await prisma.investigation.findMany({
                where: {
                    patientId: patientId,
                    externalId: { not: null }
                },
                select: { externalId: true }
            });

            const existingAccNos = new Set<string>();
            existingInvestigations.forEach((inv: any) => existingAccNos.add(inv.externalId));
            console.log(`Pre-filtering ${existingAccNos.size} existing accession numbers for patient ${patientId}`);

            const newReports = await this.syncPatientLabResults(username, password, mrn, existingAccNos);

            let ocrService = require('./ocrService');
            if (ocrService.default) ocrService = ocrService.default;
            if (ocrService.ocrService) ocrService = ocrService.ocrService;

            // ANALYZE IN PARALLEL
            // OCR analysis is independent and cpu/network bound (if using external API).
            // We can run these in parallel.

            for (const report of newReports) {
                try {
                    const analysisResults = await ocrService.analyzeImage(report.screenshotPath);

                    if (analysisResults && analysisResults.length > 0) {
                        const createdItems = [];

                        // Process ALL results returned by the AI, not just the first one
                        for (const item of analysisResults) {
                            const relativePath = '/uploads/' + require('path').basename(report.screenshotPath);

                            // Prioritize AI title
                            const finalTitle = item.title || report.title || 'Lab Report';

                            // Deduplication Check
                            let uniqueTitle = finalTitle;
                            if (uniqueTitle === 'Lab Report' || uniqueTitle === 'Unknown Test') {
                                uniqueTitle = `${report.title} (${report.rowIndex})`;
                            }

                            const exists = await prisma.investigation.findFirst({
                                where: {
                                    patientId,
                                    externalId: report.accNo,
                                    title: uniqueTitle,
                                }
                            });

                            if (!exists) {
                                const newInv = await prisma.investigation.create({
                                    data: {
                                        patientId,
                                        authorId: authorId,
                                        type: (item.type || 'LAB') as 'LAB' | 'IMAGING',
                                        category: item.category || 'External',
                                        title: uniqueTitle,
                                        status: 'FINAL',
                                        result: { ...item.results, imageUrl: relativePath },
                                        impression: 'Auto-synced from Lab Results',
                                        conductedAt: report.date ? new Date(report.date.split('-').reverse().join('-')) : new Date(),
                                        externalId: report.accNo
                                    }
                                });
                                createdItems.push(newInv);

                                // Fetch patient name for notification
                                const patient = await prisma.patient.findUnique({
                                    where: { id: patientId },
                                    select: { name: true }
                                });
                                const patientName = patient?.name || 'Unknown Patient';

                                // Emit real-time notification to all connected clients
                                notificationEmitter.emit('new_investigation', {
                                    patientId: patientId,
                                    patientName: patientName,
                                    title: newInv.title || 'Lab Result',
                                    timestamp: new Date()
                                });
                            } else {
                                console.log(`Skipping duplicate: ${report.accNo} - ${finalTitle}`);
                            }
                        }
                        results.push(...createdItems);
                    }
                } catch (e) {
                    console.error(`Failed to process/save ${report.accNo}`, e);
                }
            }

            return results;
        } finally {
            await prisma.$disconnect();
        }
    }
}
