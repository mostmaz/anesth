
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
            args: ['--no-sandbox', '--disable-setuid-sandbox', '--window-size=1280,800']
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
                return rows.map((tr, idx) => {
                    const cells = Array.from(tr.querySelectorAll('td'));
                    if (cells.length < 9) return null; // We need at least 9 cols based on inspection

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
                    const titleLong = (cells[6] as HTMLElement)?.innerText?.trim();

                    // Cleanup title (remove / Chemistry etc if needed, but keeping it is fine for now)
                    const title = titleLong ? titleLong.split('/')[0].trim() : 'Unknown Test';

                    if (!name) return null;

                    return {
                        id: mrn || Math.random().toString(36).substr(2, 9),
                        name: name,
                        mrn: mrn,
                        date: dateStr,
                        gender: 'Unknown',
                        dob: '',
                        accNo: accNo,
                        title: title,
                        rowIndex: idx // Capture index for precise selection later
                    };
                }).filter(p => p !== null);
            });

            console.log(`Found ${patients.length} patients.`);

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
                screenshotPath = `uploads/import-${Date.now()}.png`;
                const absolutePath = require('path').resolve(screenshotPath);
                await page.screenshot({ path: absolutePath, fullPage: true });
                return { screenshotPath: absolutePath, accNo: targetAccNo };
            } else {
                await newPage.waitForNetworkIdle({ timeout: 10000 }).catch(() => { });
                screenshotPath = `uploads/import-${Date.now()}.png`;
                const absolutePath = require('path').resolve(screenshotPath);
                await newPage.screenshot({ path: absolutePath, fullPage: true });
                return { screenshotPath: absolutePath, accNo: targetAccNo };
            }

        } catch (error) {
            console.error('Error importing report:', error);
            throw error;
        } finally {
            await browser.close();
        }
    }

    async syncPatientLabResults(username: string, password: string, mrn: string, existingSignatures: Set<string>): Promise<any[]> {
        console.log(`Syncing results for MRN: ${mrn}`);

        const browser = await this.launchBrowser();
        const page = await browser.newPage();
        const newReports: any[] = [];

        try {
            await this.login(page, username, password);

            // Get List including rowIndex
            await page.waitForSelector('table.k-grid-table', { timeout: 30000 });
            const rows = await page.evaluate(() => {
                return Array.from(document.querySelectorAll('table.k-grid-table tbody tr')).map((tr, idx) => {
                    const cells = Array.from(tr.querySelectorAll('td'));
                    if (cells.length < 7) return null; // We need at least 9 cols based on inspection
                    const titleLong = (cells[6] as HTMLElement)?.innerText?.trim();
                    const title = titleLong ? titleLong.split('/')[0].trim() : 'Unknown Test';

                    return {
                        accNo: (cells[0] as HTMLElement)?.innerText?.trim(),
                        date: (cells[1] as HTMLElement)?.innerText?.trim(),
                        mrn: (cells[2] as HTMLElement)?.innerText?.trim(),
                        name: (cells[3] as HTMLElement)?.innerText?.trim(),
                        title: title,
                        rowIndex: idx // Capture the exact row index
                    };
                }).filter(r => r !== null);
            });

            const matches = rows.filter(r => r && r.mrn === mrn);
            console.log(`Found ${matches.length} matches for MRN ${mrn}`);

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
                        page.evaluate((idx) => {
                            const rows = document.querySelectorAll('table.k-grid-table tbody tr');
                            const btn = rows[idx].querySelector('a.k-button') || rows[idx].querySelector('a');
                            if (btn) (btn as HTMLElement).click();
                        }, match.rowIndex)
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
            // We are ignoring existing for now to ensure we get everything, based on "fix naming" request.
            // Or we can pass empty set.
            const existingSignatures = new Set<string>();

            const newReports = await this.syncPatientLabResults(username, password, mrn, existingSignatures);

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
                        const item = analysisResults[0];
                        const relativePath = '/uploads/' + require('path').basename(report.screenshotPath);

                        // Prioritize AI title
                        const finalTitle = item.title || report.title || 'Lab Report';

                        // Deduplication Check:
                        // We check for (Patient + ExternalId + FinalTitle + Date) to be sure.
                        // If multiple reports have same Title (e.g. "Lab Report") and same AccNo, we might have an issue.
                        // We should try to append something unique if title is generic.

                        let uniqueTitle = finalTitle;
                        if (uniqueTitle === 'Lab Report' || uniqueTitle === 'Unknown Test') {
                            uniqueTitle = `${report.title} (${report.rowIndex})`; // Fallback to scraped title
                        }

                        const exists = await prisma.investigation.findFirst({
                            where: {
                                patientId,
                                externalId: report.accNo,
                                title: uniqueTitle,
                                // Add check for approx date to allow re-testing same thing on different days? 
                                // But AccNo usually changes per visit. If AccNo is same, it's same order.
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
                            return newInv;
                        } else {
                            console.log(`Skipping duplicate: ${report.accNo} - ${finalTitle}`);
                            return null; // Marked as duplicate
                        }
                    }
                } catch (e) {
                    console.error(`Failed to process/save ${report.accNo}`, e);
                    return null;
                }
            });

            const processed = await Promise.all(analysisPromises);
            results.push(...processed.filter(r => r !== null));

            return results;
        } finally {
            await prisma.$disconnect();
        }
    }
}
