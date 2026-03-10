
import puppeteer, { Page } from 'puppeteer';

export class LabImportService {
    private static BASE_URL = 'https://amrlab.net/referral/auth/login';
    // Cache storage
    private static patientCache: any[] | null = null;
    private static cacheTimestamp: number = 0;
    private static CACHE_TTL = 5 * 60 * 1000; // 5 minutes

    private async launchBrowser() {
        console.log("Puppeteer: Launching browser...");
        console.log("Puppeteer default executable path:", puppeteer.executablePath());

        const launchOptions: any = {
            headless: true,
            args: [
                '--no-sandbox',
                '--disable-setuid-sandbox',
                '--disable-dev-shm-usage',
                '--disable-gpu',
                '--window-size=1280,800'
            ]
        };

        // On Windows, if PUPPETEER_EXECUTABLE_PATH is not set, try the default Chrome path
        if (process.platform === 'win32' && !process.env.PUPPETEER_EXECUTABLE_PATH) {
            launchOptions.executablePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
        } else if (process.env.PUPPETEER_EXECUTABLE_PATH) {
            launchOptions.executablePath = process.env.PUPPETEER_EXECUTABLE_PATH;
        }

        console.log("Puppeteer: Using executablePath:", launchOptions.executablePath || 'bundled');
        const browser = await puppeteer.launch(launchOptions);
        console.log("Puppeteer: Browser launched successfully.");
        return browser;
    }

    private async login(page: Page, username: string, password: string) {
        console.log('Puppeteer: Navigating to login page: ' + LabImportService.BASE_URL);
        await page.goto(LabImportService.BASE_URL, { waitUntil: 'networkidle2', timeout: 60000 });
        console.log('Puppeteer: Login page loaded.');

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

    async getPatients(username: string, password: string, forceRefresh: boolean = false, browserInstance?: any, search: string = ''): Promise<any[]> {
        // Check Cache ONLY if no search query
        if (!search && !forceRefresh && LabImportService.patientCache && (Date.now() - LabImportService.cacheTimestamp < LabImportService.CACHE_TTL)) {
            console.log("Returning cached patient list.");
            return LabImportService.patientCache;
        }

        console.log(`Starting Lab Import Service (Fetching List, Search="${search}")...`);
        const browser = browserInstance || await this.launchBrowser();
        const page = await browser.newPage();

        try {
            if (!browserInstance) {
                await this.login(page, username, password);
            } else {
                // If browser passed, assume already logged in or needs navigation to list
                await page.goto('https://amrlab.net/referral/invoices', { waitUntil: 'networkidle2', timeout: 45000 });
                await new Promise(r => setTimeout(r, 4000));
            }

            // If search query provided, use the portal's search box
            if (search) {
                console.log(`Searching for "${search}" on portal...`);
                await page.evaluate((val: string) => {
                    const el = document.querySelector('input[type="search"]') as HTMLInputElement;
                    if (el) {
                        el.value = val;
                        el.dispatchEvent(new Event('input', { bubbles: true }));
                        el.dispatchEvent(new Event('change', { bubbles: true }));
                    }
                }, search);
                // Wait for the processing class to appear and then disappear, or just wait long enough
                await new Promise(r => setTimeout(r, 4000));
            }

            // 4. Scrape Data
            console.log('Scraping patient list...');
            await page.waitForSelector('table.dataTable', { timeout: 30000 }).catch(() => console.log('Wait for dataTable timeout'));

            const patients = await page.evaluate(() => {
                const rows = Array.from(document.querySelectorAll('table.dataTable tbody tr[role="row"]'));
                const records: any[] = [];

                rows.forEach((row, idx) => {
                    const cells = Array.from(row.querySelectorAll('td'));
                    if (cells.length < 5) return;

                    const dateStr = cells[1] ? cells[1].innerText.trim() : '';
                    const barcodeDiv = cells[2] ? cells[2].querySelector('.invoice_samples') : null;
                    const invoiceId = barcodeDiv ? barcodeDiv.getAttribute('invoice_id') : '';
                    const accNo = cells[2] ? (cells[2] as HTMLElement).innerText.trim().split('\n')[0] : '';

                    // Patient Info is in cells[3]
                    const patientInfoCell = cells[3];
                    const nameCardHeader = patientInfoCell ? patientInfoCell.querySelector('.card-title') : null;
                    const name = nameCardHeader ? (nameCardHeader as HTMLElement).innerText.trim() : '';
                    const patientInfoTable = patientInfoCell ? patientInfoCell.querySelector('table') : null;

                    // Investigations / Status are in cells[4]
                    const investigationsCell = cells[4];
                    const investigationsTable = investigationsCell ? investigationsCell.querySelector('table') : null;

                    const titles: string[] = [];
                    if (investigationsTable) {
                        const trs = Array.from(investigationsTable.querySelectorAll('tr'));
                        for (let tr of trs) {
                            const td = tr.querySelector('td.text-success, td.text-danger, td.text-warning');
                            if (td) titles.push((td as HTMLElement).innerText.trim());
                        }
                    } else if (investigationsCell) {
                        // Fallback: If no table, maybe the status text itself contains the "Done" or "Under processing"
                        // But usually we want the test names. 
                        // If it's a card, let's look for test names in the card-body
                        const testNames = Array.from(investigationsCell.querySelectorAll('.card-body table tr td.text-success, .card-body table tr td.text-danger'));
                        testNames.forEach(td => titles.push((td as HTMLElement).innerText.trim()));
                    }

                    let mrn = invoiceId;
                    if (patientInfoTable) {
                        const infoRows = Array.from(patientInfoTable.querySelectorAll('tr'));
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
                                mrn: mrn,
                                date: dateStr,
                                accNo: accNo,
                                title: title,
                                rowIndex: idx,
                                invoiceId: invoiceId
                            });
                        });
                    } else {
                        records.push({
                            id: `${mrn}-Unknown-${idx}`,
                            name: name,
                            mrn: mrn,
                            date: dateStr,
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
            console.error('Error in getPatients:', error);
            throw error;
        } finally {
            if (!browserInstance) await browser.close();
            else await page.close();
        }
    }

    async importReport(username: string, password: string, patientData: any, browserInstance?: any): Promise<any> {
        console.log('Starting Lab Report Import...', patientData.accNo);
        const targetInvoiceId = patientData.invoiceId;

        const browser = browserInstance || await this.launchBrowser();
        const page = await browser.newPage();

        try {
            if (!browserInstance) {
                await this.login(page, username, password);
            }

            const printUrl = `https://amrlab.net/referral/invoices/print_medical_report/${targetInvoiceId}`;
            console.log(`Navigating to Print URL: ${printUrl}`);

            // Ensure we are on a page with a CSRF token
            if (page.url() === 'about:blank') {
                await page.goto('https://amrlab.net/referral/invoices', { waitUntil: 'networkidle2' });
            }

            const pdfData = await page.evaluate(async (url: string) => {
                const tokenInput = document.querySelector('input[name="_token"]') as HTMLInputElement;
                const token = tokenInput ? tokenInput.value : '';

                try {
                    const response = await fetch(url, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                        body: `_token=${encodeURIComponent(token)}`
                    });

                    if (!response.ok) return { error: `HTTP ${response.status}` };
                    const contentType = response.headers.get('content-type') || '';
                    if (!contentType.includes('application/pdf')) return { error: 'Not a PDF' };

                    const buffer = await response.arrayBuffer();
                    return { success: true, data: Array.from(new Uint8Array(buffer)) };
                } catch (e: any) { return { error: e.message }; }
            }, printUrl);

            let absolutePath = '';
            if (pdfData && (pdfData as any).success) {
                const pdfBuffer = Buffer.from((pdfData as any).data);
                const pdfPath = `uploads/import-${Date.now()}.pdf`;
                absolutePath = require('path').resolve(pdfPath);
                require('fs').writeFileSync(absolutePath, pdfBuffer);
                console.log(`PDF saved successfully to ${absolutePath}`);
            } else {
                console.log("PDF fetch failed, falling back to screenshot...");
                // Fallback screenshot logic
                await page.evaluate((url: string) => {
                    const form = document.createElement('form');
                    form.method = 'POST';
                    form.action = url;
                    const token = (document.querySelector('input[name="_token"]') as HTMLInputElement)?.value;
                    if (token) {
                        const input = document.createElement('input');
                        input.name = '_token';
                        input.value = token;
                        form.appendChild(input);
                    }
                    document.body.appendChild(form);
                    form.submit();
                }, printUrl);

                await page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 30000 }).catch(() => { });
                await new Promise(r => setTimeout(r, 10000));

                const screenshotPath = `uploads/import-${Date.now()}.png`;
                absolutePath = require('path').resolve(screenshotPath);
                await page.screenshot({ path: absolutePath, fullPage: true });
                console.log(`Screenshot saved to ${absolutePath}`);
            }

            return { screenshotPath: absolutePath, accNo: patientData.accNo };
        } catch (error) {
            console.error('Error importing report:', error);
            throw error;
        } finally {
            if (!browserInstance) await browser.close();
            else await page.close();
        }
    }

    async syncAndSavePatientLabs(mrn: string, patientId: string, authorId: string, patientName?: string, browserInstance?: any, cachedReports?: any[]): Promise<any[]> {
        const username = 'icu@amrlab.net';
        const password = process.env.LAB_PASSWORD || '1989';

        const { PrismaClient } = require('@prisma/client');
        const prisma = new PrismaClient();
        const results = [];
        const { notificationEmitter } = await import('../routes/notifications.routes');

        let browser = browserInstance;

        try {
            // Check if patient is currently admitted
            const admission = await prisma.admission.findFirst({
                where: { patientId, dischargedAt: null }
            });

            if (!admission) {
                console.log(`Sync skipped for ${patientName || mrn}: Patient is not currently admitted.`);
                return [];
            }

            // Find existing accession numbers
            const existingInvestigations = await prisma.investigation.findMany({
                where: { patientId, externalId: { not: null } },
                select: { externalId: true, title: true }
            });

            const existingAccTitles = new Set<string>();
            existingInvestigations.forEach((inv: any) => existingAccTitles.add(`${inv.externalId}-${inv.title}`));

            if (!browser && !cachedReports) browser = await this.launchBrowser();

            // 1. Use cached reports or fetch new ones
            const allReports = cachedReports || await this.getPatients(username, password, true, browser);

            const normalize = (s: string) => {
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

            const targetName = normalize(patientName || '');

            console.log(`Sync Matching: TargetName="${targetName}" (MRN matching disabled)`);

            // Better matching logic handling missing middle names
            const isNameMatch = (target: string, row: string) => {
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

            let patientReports = allReports.filter(r => {
                const rowName = normalize(r.name);
                const matchName = isNameMatch(targetName, rowName);

                if (matchName) {
                    console.log(`   MATCHED: PortalName="${rowName}" PortalMRN="${r.mrn}" InvoiceID="${r.invoiceId}"`);
                    return true;
                }
                return false;
            });

            // FALLBACK: If no reports found for this specific patient, try an explicit search on the portal
            if (patientReports.length === 0 && patientName) {
                console.log(`Sync: No reports found in default list for ${patientName}. Retrying with explicit portal search (by Name)...`);

                // Use original (unnormalized) name for portal search box to avoid literal mismatch
                const searchQuery = patientName;
                const searchReports = await this.getPatients(username, password, true, browser, searchQuery);

                patientReports = searchReports.filter(r => {
                    const rowName = normalize(r.name);
                    const matchName = isNameMatch(targetName, rowName);
                    return matchName;
                });

                // SECOND FALLBACK: If still nothing, try a broader search with just first two words
                if (patientReports.length === 0) {
                    const words = patientName.split(/\s+/);
                    if (words.length > 2) {
                        const broaderQuery = words.slice(0, 2).join(' ');
                        console.log(`Sync: Still no reports. Trying broader search for "${broaderQuery}"...`);
                        const broaderReports = await this.getPatients(username, password, true, browser, broaderQuery);

                        patientReports = broaderReports.filter(r => {
                            const rowName = normalize(r.name);
                            const matchName = isNameMatch(targetName, rowName);
                            return matchName;
                        });
                    }
                }
            }

            console.log(`Sync: Found ${patientReports.length} reports on portal for ${patientName || mrn}`);

            for (const report of patientReports) {
                const key = `${report.accNo}-${report.title}`;
                if (existingAccTitles.has(key)) continue;

                console.log(`Syncing NEW report: ${report.accNo} - ${report.title}`);

                try {
                    // Use the robust import mechanism
                    const importResult = await this.importReport(username, password, report, browser);

                    let ocrService = require('./ocrService');
                    if (ocrService.default) ocrService = ocrService.default;
                    if (ocrService.ocrService) ocrService = ocrService.ocrService;

                    const analysisResults = await ocrService.analyzeImage(importResult.screenshotPath);

                    if (analysisResults && analysisResults.length > 0) {
                        for (const item of analysisResults) {
                            const relativePath = '/uploads/' + require('path').basename(importResult.screenshotPath);
                            const finalTitle = item.title || report.title || 'Lab Report';

                            let parsedConductedAt = new Date();
                            if (report.date) {
                                const parts = report.date.split('-');
                                if (parts.length === 3) {
                                    parsedConductedAt = new Date(parseInt(parts[2]), parseInt(parts[1]) - 1, parseInt(parts[0]));
                                }
                            }

                            const exists = await prisma.investigation.findFirst({
                                where: { patientId, externalId: report.accNo, title: finalTitle }
                            });

                            if (!exists) {
                                const newInv = await prisma.investigation.create({
                                    data: {
                                        patientId,
                                        authorId,
                                        type: (item.type || 'LAB') as 'LAB' | 'IMAGING',
                                        category: item.category || 'External',
                                        title: finalTitle,
                                        status: 'FINAL',
                                        result: { ...item.results, imageUrl: relativePath },
                                        impression: 'Auto-synced from Lab Results',
                                        conductedAt: parsedConductedAt,
                                        externalId: report.accNo
                                    }
                                });
                                results.push(newInv);

                                const isAbnormal = item.results && typeof item.results === 'object' &&
                                    Object.values(item.results).some((v: any) => typeof v === 'object' && v !== null && (v as any).isAbnormal === true);

                                notificationEmitter.emit('new_investigation', {
                                    id: newInv.id,
                                    type: 'new_investigation',
                                    patientId,
                                    patientName,
                                    title: `New ${newInv.type || 'Lab'} Result: ${newInv.title}`,
                                    timestamp: new Date(),
                                    isAbnormal
                                });
                            }
                        }
                    }
                } catch (reportErr) {
                    console.error(`Failed to sync report ${report.accNo}:`, reportErr);
                }
            }

            return results;
        } finally {
            await prisma.$disconnect();
            if (!browserInstance && browser) await browser.close();
        }
    }

    async syncAllActivePatients(authorId: string = 'system-sync'): Promise<any[]> {
        const { PrismaClient } = require('@prisma/client');
        const prisma = new PrismaClient();
        const results = [];
        const browser = await this.launchBrowser();
        const username = 'icu@amrlab.net';
        const password = process.env.LAB_PASSWORD || '1989';

        let syncLog;
        try {
            syncLog = await prisma.syncLog.create({
                data: { type: 'LAB_SYNC', status: 'RUNNING', startedAt: new Date() }
            });
        } catch (e) { console.error(e); }

        try {
            // Login once for the whole session
            const page = await browser.newPage();
            try {
                await this.login(page, username, password);
                await page.close();
            } catch (loginErr) {
                console.error("Login failed for sync-all session:", loginErr);
                throw loginErr;
            }

            const admittedPatients = await prisma.patient.findMany({
                where: { admissions: { some: { dischargedAt: null } } },
                select: { id: true, mrn: true, name: true }
            });

            console.log(`Auto-Sync: Starting sync for ${admittedPatients.length} admitted patients...`);

            // Fetch everything on the portal once at the start
            const allPortalReports = await this.getPatients(username, password, true, browser);

            for (const patient of admittedPatients) {
                try {
                    const patientResults = await this.syncAndSavePatientLabs(
                        patient.mrn, patient.id, authorId, patient.name, browser, allPortalReports
                    );
                    results.push(...patientResults);
                } catch (patientErr) {
                    console.error(`Failed to sync ${patient.name}:`, patientErr);
                }
            }

            if (syncLog) {
                await prisma.syncLog.update({
                    where: { id: syncLog.id },
                    data: { status: 'SUCCESS', endedAt: new Date(), resultsCount: results.length }
                }).catch(console.error);
            }
            return results;
        } catch (error) {
            console.error("Auto-Sync Failure:", error);
            if (syncLog) {
                await prisma.syncLog.update({
                    where: { id: syncLog.id },
                    data: { status: 'FAILED', message: String(error), endedAt: new Date(), resultsCount: results.length }
                }).catch(console.error);
            }
            return results;
        } finally {
            await browser.close();
            await prisma.$disconnect();
        }
    }
}
