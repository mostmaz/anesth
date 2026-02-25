
import puppeteer, { Page } from 'puppeteer';

export class LabImportService {
    private static BASE_URL = 'https://www.labforme.com/Login/';
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

        // Click "Laboratories" category (img with 3.svg)
        console.log('Selecting Laboratories category...');
        try {
            await page.waitForSelector('img[src*="3.svg"]', { visible: true, timeout: 10000 });
            await page.click('img[src*="3.svg"]');
            console.log("Clicked Laboratories button.");
        } catch (e) {
            console.log("Laboratories button not found or already open?", e);
            // Fallback: check if modal is already open with correct label
        }

        console.log('Waiting for login inputs...');
        await page.waitForSelector('input[name="userName"]', { visible: true, timeout: 30000 });

        // Optional: Check if we are in the right modal
        const labelText = await page.evaluate(() => {
            const label = document.querySelector('.modal-body label');
            return label ? (label as HTMLElement).innerText : '';
        });
        console.log(`Modal Label: ${labelText}`);

        // Set credentials via JS directly to bypass simulated typing issues
        console.log('Setting credentials via JS...');

        await page.evaluate((u, p) => {
            const user = document.querySelector('input[name="userName"]') as HTMLInputElement;
            const pass = document.querySelector('input[name="passWord"]') as HTMLInputElement;

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

            // Check validity
            const form = document.querySelector('form');
            if (form) {
                console.log("Form Validity:", form.checkValidity());
                console.log("Form Classes:", form.className);
            }
            if (user) console.log("User Input Classes:", user.className);
        }, username, password);

        // Verify values
        const values = await page.evaluate(() => {
            const user = document.querySelector('input[name="userName"]') as HTMLInputElement;
            return { user: user ? user.value : 'missing' };
        });
        console.log(`Input value check: ${values.user}`);

        // Click Login
        console.log('Clicking Login...');

        // Strategy 1: Press Enter in password field (often most reliable)
        try {
            await page.focus('input[name="passWord"]');
            await page.keyboard.press('Enter');
            console.log("Pressed Enter key.");
            // Wait briefly to see if navigation starts
            await new Promise(r => setTimeout(r, 1000));
        } catch (e) { console.log("Enter key strategy failed", e); }

        // Strategy 2: Click button if still there
        const clicked = await page.evaluate(() => {
            const btn = document.querySelector('button.btn-primary') as HTMLButtonElement;
            if (btn && document.body.contains(btn) && btn.offsetParent !== null) {
                // Check if button is still visible/present
                console.log("Button found. Disabled?", btn.disabled, "Attributes:", btn.getAttributeNames().join(','));
                if (btn.hasAttribute('disabled') || btn.disabled) {
                    console.log("Login button disabled, enabling force...");
                    btn.removeAttribute('disabled');
                    btn.disabled = false;
                }
                btn.click();
                return true;
            }
            return false;
        });

        if (clicked) {
            console.log("Login button clicked via JS.");
        } else {
            console.log("Login button not found or already navigated.");
        }

        // Strategy 3: Form submission
        const formSubmitted = await page.evaluate(() => {
            const form = document.querySelector('form');
            if (form) {
                console.log("Found form, submitting directly...", form.action);
                form.requestSubmit(); // Better than submit() for validation
                return true;
            }
            return false;
        });

        if (formSubmitted) console.log("Form submitted via JS.");

        // Navigation wait
        try {
            await page.waitForNavigation({ waitUntil: 'networkidle0', timeout: 45000 });
            console.log("Navigation completed.");
        } catch (e) {
            console.log("Navigation timeout or already on page. Checking for error...");
        }
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
            await page.waitForSelector('table.k-grid-table', { timeout: 30000 });

            const patients = await page.evaluate(() => {
                const rows = Array.from(document.querySelectorAll('table.k-grid-table tbody tr'));
                const records: any[] = [];

                rows.forEach((tr, idx) => {
                    const cells = Array.from(tr.querySelectorAll('td'));
                    if (cells.length < 9) return; // We need at least 9 cols based on inspection

                    // Column mapping based on inspection:
                    // 0: Acc. No.
                    // 1: Visit Date
                    // 2: Patient No. (MRN)
                    // 3: Patient Name
                    // 6: Report Type (Title)

                    const accNo = (cells[0] as HTMLElement)?.innerText?.trim();
                    const dateStr = (cells[1] as HTMLElement)?.innerText?.trim();
                    const mrn = (cells[2] as HTMLElement)?.innerText?.trim();
                    const name = (cells[3] as HTMLElement)?.innerText?.trim();

                    if (!name) return;

                    // The Report Type cell might contain multiple tests separated by newlines
                    // e.g. "CBC\nPT"
                    const reportTypeCell = cells[6] as HTMLElement;

                    if (reportTypeCell) {
                        // We extract all text nodes or handle innerText lines
                        const textContent = reportTypeCell.innerText || '';

                        // Split by newline to get individual reports. 
                        const lines = textContent.split(/\r?\n/).map(s => s.trim()).filter(s => s.length > 0);

                        if (lines.length > 0) {
                            lines.forEach(lineTitle => {
                                // Sometimes titles might still have ' / Chemistry' attached, we can optionally clean it
                                const title = lineTitle.split('/')[0].trim();

                                records.push({
                                    id: `${mrn}-${title}`, // Use a composite id
                                    name: name,
                                    mrn: mrn,
                                    date: dateStr,
                                    gender: 'Unknown',
                                    dob: '',
                                    accNo: accNo,
                                    title: title,
                                    rowIndex: idx // Capture index for precise selection later
                                });
                            });
                        } else {
                            // Fallback if cell was somehow empty but row was valid
                            records.push({
                                id: mrn || Math.random().toString(36).substr(2, 9),
                                name: name,
                                mrn: mrn,
                                date: dateStr,
                                gender: 'Unknown',
                                dob: '',
                                accNo: accNo,
                                title: 'Unknown Test',
                                rowIndex: idx
                            });
                        }
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
        // If we have accNo, use it. Otherwise fallback to name/date.
        const targetAccNo = patientData.accNo;

        const browser = await this.launchBrowser();
        const page = await browser.newPage();

        try {
            await this.login(page, username, password);

            // 4. Find the specific row for this patient
            await page.waitForSelector('table.k-grid-table', { timeout: 30000 });

            // 4. Find the specific row for this patient
            await page.waitForSelector('table.k-grid-table', { timeout: 30000 });

            const rowIndex = await page.evaluate((targetMrn, targetName, targetDate, targetAccNo, targetRowIndex) => {
                const rows = Array.from(document.querySelectorAll('table.k-grid-table tbody tr'));

                // 1. Direct Row Index Match (Most Precise)
                if (targetRowIndex !== undefined && targetRowIndex !== null && rows[targetRowIndex]) {
                    // Verify it matches at least the MRN or AccNo to be safe (in case list changed)
                    const cells = Array.from(rows[targetRowIndex].querySelectorAll('td'));
                    const accNo = (cells[0] as HTMLElement)?.innerText?.trim();
                    const mrn = (cells[2] as HTMLElement)?.innerText?.trim();

                    if ((targetAccNo && accNo === targetAccNo) || (targetMrn && mrn === targetMrn)) {
                        console.log(`Using precise rowIndex: ${targetRowIndex}`);
                        return targetRowIndex;
                    }
                    console.warn(`Row index ${targetRowIndex} exists but content mismatch. Falling back to search.`);
                }

                console.log(`Searching for: AccNo=${targetAccNo}, MRN=${targetMrn}, Name=${targetName}, Date=${targetDate}`);

                return rows.findIndex((tr, idx) => {
                    const cells = Array.from(tr.querySelectorAll('td'));
                    if (cells.length < 4) return false;

                    const accNo = (cells[0] as HTMLElement)?.innerText?.trim();
                    const date = (cells[1] as HTMLElement)?.innerText?.trim();
                    const mrn = (cells[2] as HTMLElement)?.innerText?.trim();
                    const name = (cells[3] as HTMLElement)?.innerText?.trim();

                    // Priority match by AccNo
                    if (targetAccNo && accNo === targetAccNo) {
                        return true; // Use first match if index failed/missing
                    }

                    // Fallback
                    const match = mrn === targetMrn || (name === targetName && date === targetDate);
                    return match;
                });
            }, patientData.mrn, patientData.name, patientData.date, targetAccNo, patientData.rowIndex);

            if (rowIndex === -1) {
                throw new Error("Patient record not found in current list");
            }

            // Click View
            await page.evaluate((index) => {
                const rows = document.querySelectorAll('table.k-grid-table tbody tr');
                const row = rows[index];
                const btn = row.querySelector('a.k-button') || row.querySelector('a') || row.querySelector('button');
                if (btn) (btn as HTMLElement).click();
            }, rowIndex);

            const newTarget = await browser.waitForTarget(target => target.opener() === page.target(), { timeout: 15000 });
            const newPage = await newTarget.page();

            let screenshotPath = '';
            if (!newPage) {
                console.log("No new tab detected, checking current page...");
                await new Promise(r => setTimeout(r, 5000));
                await page.setViewport({ width: 1280, height: 1024 });
                screenshotPath = `uploads/import-${Date.now()}.png`;
                const absolutePath = require('path').resolve(screenshotPath);
                await page.screenshot({ path: absolutePath, fullPage: true });
                return { screenshotPath: absolutePath, accNo: targetAccNo };
            } else {
                await newPage.setViewport({ width: 1280, height: 1024 });
                await newPage.waitForNetworkIdle({ timeout: 10000 }).catch(() => { });
                await new Promise(r => setTimeout(r, 2000)); // Give it a moment to render
                screenshotPath = `uploads/import-${Date.now()}.png`;
                const absolutePath = require('path').resolve(screenshotPath);

                // Fallback catch for screenshot errors
                try {
                    await newPage.screenshot({ path: absolutePath, fullPage: true });
                } catch (screenshotError) {
                    console.error("Screenshot failed on newPage, trying without fullPage:", screenshotError);
                    await newPage.screenshot({ path: absolutePath }); // try standard if fullPage fails
                }

                return { screenshotPath: absolutePath, accNo: targetAccNo };
            }

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
            await page.waitForSelector('table.k-grid-table', { timeout: 30000 });
            const rows = await page.evaluate(() => {
                const records: any[] = [];
                Array.from(document.querySelectorAll('table.k-grid-table tbody tr')).forEach((tr, idx) => {
                    const cells = Array.from(tr.querySelectorAll('td'));
                    if (cells.length < 7) return; // We need at least 7 cols based on inspection

                    const accNo = (cells[0] as HTMLElement)?.innerText?.trim();
                    const dateStr = (cells[1] as HTMLElement)?.innerText?.trim();
                    const mrn = (cells[2] as HTMLElement)?.innerText?.trim();
                    const name = (cells[3] as HTMLElement)?.innerText?.trim();

                    const reportTypeCell = cells[6] as HTMLElement;
                    if (reportTypeCell) {
                        const textContent = reportTypeCell.innerText || '';
                        const lines = textContent.split(/\r?\n/).map(s => s.trim()).filter(s => s.length > 0);

                        if (lines.length > 0) {
                            lines.forEach((lineTitle, sIdx) => {
                                const title = lineTitle.split('/')[0].trim();
                                records.push({
                                    accNo: accNo,
                                    date: dateStr,
                                    mrn: mrn,
                                    name: name,
                                    title: title,
                                    rowIndex: idx, // Capture the exact row index
                                    subIndex: sIdx // Capture which button to click
                                });
                            });
                        } else {
                            records.push({
                                accNo: accNo,
                                date: dateStr,
                                mrn: mrn,
                                name: name,
                                title: 'Unknown Test',
                                rowIndex: idx, // Capture the exact row index
                                subIndex: 0
                            });
                        }
                    }
                });
                return records;
            });

            let matches = rows.filter(r => r && r.mrn === mrn);

            // Deduplicate early using the existingAccNos set to save API usage
            matches = matches.filter(r => !existingAccNos.has(r.accNo));
            console.log(`Found ${matches.length} new/unprocessed matches for MRN ${mrn}`);

            // Limit to the most recent 5 to save time and API quota during auto-sync
            if (matches.length > 5) {
                matches = matches.slice(0, 5);
                console.log(`Limiting to latest 5 matches for auto-sync.`);
            }

            // Process matches in parallel chunks to avoid browser context overload/timeout
            // But puppeteer page interaction must be sequential if using same page.
            // To parallelize, we need multiple pages or contexts.
            // For now, let's optimize the existing loop by removing unnecessary waits and handling new targets better.

            for (const match of matches) {
                if (!match) continue;
                console.log(`Processing row ${match.rowIndex}: ${match.accNo} - ${match.title}`);

                // Check if we want to skip based on DB? 
                // We'll skip this optimization for now to ensure we get everything as requested.

                try {
                    // Trigger click
                    const [newTarget] = await Promise.all([
                        browser.waitForTarget(target => target.opener() === page.target(), { timeout: 10000 }).catch(e => null),
                        page.evaluate((idx, subIdx) => {
                            const rows = document.querySelectorAll('table.k-grid-table tbody tr');
                            const row = rows[idx];
                            if (!row) return;

                            const fileOps = row.querySelectorAll('file-operation');
                            if (fileOps && fileOps.length > subIdx) {
                                // There are multiple view buttons, pick the correct one corresponding to the line item
                                const btn = fileOps[subIdx].querySelector('a');
                                if (btn) (btn as HTMLElement).click();
                            } else {
                                // Fallback
                                const btn = row.querySelector('a.k-button') || row.querySelector('a');
                                if (btn) (btn as HTMLElement).click();
                            }
                        }, match.rowIndex, match.subIndex || 0)
                    ]);

                    if (newTarget) {
                        const newPage = await newTarget.page();
                        if (newPage) {
                            // FAST TRACK: Wait for network idle or just a fixed short buffer?
                            // Network idle is safer for rendering.
                            await newPage.waitForNetworkIdle({ timeout: 5000 }).catch(() => { });

                            const screenshotPath = `uploads/sync-${match.accNo}-${Date.now()}-${Math.floor(Math.random() * 1000)}.png`;
                            const absolutePath = require('path').resolve(screenshotPath);

                            // Optimization: Quality 80 jpeg might be faster than png? 
                            // But OCR usually prefers lossless. Stick to PNG but maybe limit size if needed.
                            await newPage.screenshot({ path: absolutePath, fullPage: true });
                            await newPage.close();

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
        const username = '10427';
        const password = process.env.LAB_PASSWORD || '7358782';

        const { PrismaClient } = require('@prisma/client');
        const prisma = new PrismaClient();
        const results = [];

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

            const analysisPromises = newReports.map(async (report) => {
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
                            } else {
                                console.log(`Skipping duplicate: ${report.accNo} - ${finalTitle}`);
                            }
                        }
                        return createdItems;
                    }
                    return [];
                } catch (e) {
                    console.error(`Failed to process/save ${report.accNo}`, e);
                    return [];
                }
            });

            const processed = await Promise.all(analysisPromises);
            // Flatten the array of arrays
            results.push(...processed.flat());

            return results;
        } finally {
            await prisma.$disconnect();
        }
    }
}
