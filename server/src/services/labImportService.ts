
import { PrismaClient } from '@prisma/client';
import puppeteer from 'puppeteer';
import * as fs from 'fs';
import * as path from 'path';
import { ocrService } from './ocrService';

const pdfCache = new Map<string, Buffer>();
const aiCache = new Map<string, any[]>();

export class LabImportService {
    private prisma = new PrismaClient();

    private async launchBrowser() {
        console.log(`[SYNC] Launching browser...`);
        const userDataDir = path.join(__dirname, '../../lab_session_data');
        if (!fs.existsSync(userDataDir)) fs.mkdirSync(userDataDir, { recursive: true });

        const browser = await puppeteer.launch({
            executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
            headless: true,
            args: [
                '--no-sandbox',
                '--disable-setuid-sandbox',
                '--disable-blink-features=AutomationControlled',
                '--window-size=1920,1080',
                '--lang=en-US,en;q=0.9'
            ],
            userDataDir,
            ignoreDefaultArgs: ['--enable-automation']
        });
        return browser;
    }

    private async setupPage(page: any) {
        console.log(`[SYNC] Establish page profile...`);
        await page.setViewport({ width: 1920, height: 1080 });
        await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36');

        await page.evaluateOnNewDocument(() => {
            Object.defineProperty(navigator, 'webdriver', { get: () => false });
            // @ts-ignore
            window.chrome = { runtime: {} };
            // @ts-ignore
            navigator.languages = ['en-US', 'en'];
        });
    }

    private async checkAndRecover(page: any) {
        const content = await page.content();
        // Specifically look for the "Failed" trap message if it's the only prominent thing
        if (content.includes('Failed') && content.length < 2000 && !content.includes('Dashboard')) {
            console.warn(`[SYNC] Portal restriction detected. Reloading...`);
            await new Promise(r => setTimeout(r, 3000));
            await page.reload({ waitUntil: 'networkidle2' });
        }
    }

    private async enableResourceBlocking(page: any) {
        console.log(`[SYNC] Enabling resource blocking...`);
        await page.setRequestInterception(true);
        page.on('request', (req: any) => {
            const resourceType = req.resourceType();
            if (['image', 'font', 'stylesheet'].includes(resourceType)) {
                req.abort();
            } else {
                req.continue();
            }
        });
    }

    private async login(page: any, username: string, password: string) {
        if (!page.url().includes('login')) return;

        console.log(`[SYNC] Portal login for ${username}...`);
        await page.waitForSelector('input#email', { timeout: 15000 }).catch(() => { });
        const emailInput = await page.$('input#email');

        if (emailInput) {
            console.log(`[SYNC] Typing credentials...`);

            const typeValue = async (selector: string, value: string) => {
                await page.click(selector, { clickCount: 3 });
                await page.keyboard.press('Backspace');
                await page.type(selector, value, { delay: 50 });
                const currentVal = await page.$eval(selector, (el: any) => el.value);
                if (currentVal !== value) {
                    console.log(`[SYNC] Typing verification failed for ${selector}, setting via JS...`);
                    await page.$eval(selector, (el: any, v: string) => el.value = v, value);
                }
            };

            await typeValue('input#email', username);
            await new Promise(r => setTimeout(r, 500));
            await typeValue('input#password', password);

            await new Promise(r => setTimeout(r, 1000));

            console.log('[SYNC] Clicking login button...');
            await Promise.all([
                page.click('button.login100-form-btn'),
                page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 60000 }).catch(() => { })
            ]);

            const currentUrl = page.url();
            console.log('[SYNC] Post-login URL:', currentUrl);
            if (currentUrl.includes('login')) {
                const content = await page.content();
                if (content.includes('Failed')) {
                    console.error('[SYNC] ERROR: Login rejected or failed.');
                    const debugPath = path.join(__dirname, `../../uploads/LOGIN_FAIL_${Date.now()}.png`);
                    await page.screenshot({ path: debugPath });
                    console.log(`[SYNC] Screenshot saved: ${debugPath}`);
                }
            }
        }
    }

    async getPatients(username: string, password: string, returnReports = false, browserInstance?: any, searchName?: string) {
        const browser = browserInstance || await this.launchBrowser();
        const page = await browser.newPage();
        await this.setupPage(page);
        try {
            console.log(`[SYNC] Initializing portal session...`);
            await page.goto('https://amrlab.net/referral', { waitUntil: 'networkidle2', timeout: 90000 });
            await this.checkAndRecover(page);

            if (page.url().includes('login')) {
                await this.login(page, username, password);
                await this.checkAndRecover(page);
            }

            if (!page.url().includes('invoices')) {
                console.log(`[SYNC] Navigating to results page...`);
                await page.goto('https://amrlab.net/referral/invoices', { waitUntil: 'networkidle2', timeout: 60000 });
                if (page.url().includes('login')) {
                    await this.login(page, username, password);
                    await page.goto('https://amrlab.net/referral/invoices', { waitUntil: 'networkidle2', timeout: 60000 });
                }
            }

            await this.enableResourceBlocking(page);

            const searchInputSelector = 'input[type="search"]';
            console.log(`[SYNC] Waiting for data table...`);
            await page.waitForSelector(searchInputSelector, { timeout: 30000 }).catch(async () => {
                const debugPath = path.join(__dirname, `../../uploads/ERROR_DATA_${Date.now()}.png`);
                await page.screenshot({ path: debugPath });
                throw new Error(`Timeout waiting for search input at ${page.url()}`);
            });

            const sName = searchName || '';
            await page.click(searchInputSelector, { clickCount: 3 });
            await page.keyboard.press('Backspace');
            await page.type(searchInputSelector, sName, { delay: 50 });

            await new Promise(r => setTimeout(r, 3000));

            const results = await page.evaluate(() => {
                const table = document.querySelector('table#invoices_table') || document.querySelector('table#example');
                const rows = Array.from(table?.querySelectorAll('tbody tr') || []);
                return rows.map(row => {
                    const cells = Array.from(row.querySelectorAll('td'));
                    if (cells.length < 5) return null;
                    return {
                        date: cells[0]?.innerText.trim(),
                        accNo: cells[1]?.innerText.trim(),
                        invoiceId: cells[2]?.innerText.trim(),
                        patient: cells[3]?.innerText.trim(),
                        title: cells[4]?.innerText.trim(),
                        portalStatus: cells[5]?.innerText.trim() === 'Processing' ? 'PROCESSING' : 'FINAL'
                    };
                }).filter(Boolean);
            });

            return results;
        } finally {
            await page.close();
            if (!browserInstance) await browser.close();
        }
    }

    /**
     * Legacy/Interactive import flow: Find a patient and take a screenshot of their result row.
     */
    async importReport(username: string, password: string, patientName: string) {
        const browser = await this.launchBrowser();
        const page = await browser.newPage();
        await this.setupPage(page);

        try {
            console.log(`[IMPORT] Starting manual import for ${patientName}...`);
            await page.goto('https://amrlab.net/referral/invoices', { waitUntil: 'networkidle2', timeout: 90000 });

            if (page.url().includes('login')) {
                await this.login(page, username, password);
                await page.goto('https://amrlab.net/referral/invoices', { waitUntil: 'networkidle2', timeout: 60000 });
            }

            const searchInputSelector = 'input[type="search"]';
            await page.waitForSelector(searchInputSelector, { timeout: 30000 });

            await page.click(searchInputSelector, { clickCount: 3 });
            await page.keyboard.press('Backspace');
            await page.type(searchInputSelector, patientName, { delay: 50 });

            await new Promise(r => setTimeout(r, 3000));

            const screenshotName = `import_${patientName.replace(/\s+/g, '_')}_${Date.now()}.png`;
            const absolutePath = path.join(__dirname, `../../uploads/${screenshotName}`);
            const imageUrl = `/uploads/${screenshotName}`;

            // Ensure uploads directory exists
            const uploadsDir = path.join(__dirname, '../../uploads');
            if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });

            await page.screenshot({ path: absolutePath, fullPage: false });
            console.log(`[IMPORT] Captured screenshot for ${patientName}: ${absolutePath}`);

            return { absolutePath, imageUrl };
        } finally {
            await page.close();
            await browser.close();
        }
    }

    async syncAndSavePatientLabs(mrn: string, patientId: string, authorId: string, patientName: string, browserInstance?: any) {
        const username = process.env.LAB_USER || 'icu@amrlab.net';
        const password = process.env.LAB_PASSWORD || '1989';

        const browser = browserInstance || await this.launchBrowser();
        const page = await browser.newPage();
        await this.setupPage(page);
        const results: any[] = [];

        // Validate authorId to prevent foreign key violations
        let validAuthorId = authorId;
        const authorExists = await this.prisma.user.findUnique({ where: { id: authorId } });
        if (!authorExists) {
            const firstUser = await this.prisma.user.findFirst();
            if (firstUser) {
                console.warn(`[SYNC] Invalid authorId ${authorId}, falling back to system user ${firstUser.id}`);
                validAuthorId = firstUser.id;
            } else {
                console.error(`[SYNC] NO USERS FOUND IN DATABASE. Sync will likely fail.`);
            }
        }

        try {
            console.log(`[SYNC] Loading patient reports for ${patientName}`);
            const reports = await this.getPatients(username, password, true, browser, patientName);

            console.log(`[SYNC] Preparing for PDF extraction...`);
            await page.goto('https://amrlab.net/referral/invoices', { waitUntil: 'networkidle2' });
            if (page.url().includes('login')) {
                await this.login(page, username, password);
            }
            await this.enableResourceBlocking(page);

            const searchInputSelector = 'input[type="search"]';
            await page.waitForSelector(searchInputSelector);
            await page.keyboard.type(patientName, { delay: 50 });
            await new Promise(r => setTimeout(r, 3000));

            for (let i = 0; i < reports.length; i++) {
                const report = reports[i] as any;
                const existing = await this.prisma.investigation.findFirst({
                    where: {
                        patientId,
                        title: report.title,
                        externalId: report.accNo
                    }
                });

                if (existing && existing.status === 'FINAL') {
                    results.push(existing);
                    continue;
                }

                if (report.portalStatus === 'PROCESSING') {
                    const inv = await this.prisma.investigation.upsert({
                        where: { id: existing?.id || 'new' },
                        create: {
                            patientId, authorId: validAuthorId, title: report.title, type: 'LAB',
                            status: 'PROCESSING' as any, category: 'External',
                            externalId: report.accNo, conductedAt: this.parseDate(report.date),
                            impression: 'Under processing on portal...',
                            pdfFilename: `INVOICE_${report.invoiceId}`
                        } as any,
                        update: { status: 'PROCESSING' as any } as any
                    });
                    results.push(inv);
                } else {
                    try {
                        let pdfBuffer = pdfCache.get(report.invoiceId);
                        const filename = `INVOICE_${report.invoiceId}`;
                        const uploadDir = path.join(__dirname, '../../uploads');
                        if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });
                        const safePath = path.join(uploadDir, `${filename}.pdf`);

                        if (!pdfBuffer) {
                            console.log(`[SYNC] Downloading ${report.title} (${report.invoiceId})...`);
                            await page.bringToFront();
                            const table = await page.$('table#invoices_table') || await page.$('table#example');
                            const rows = table ? await table.$$('tbody tr') : [];
                            let rowToClick = null;
                            for (const r of rows) {
                                const text = await page.evaluate((el: any) => el.textContent, r);
                                if (text?.includes(report.invoiceId)) {
                                    rowToClick = r;
                                    break;
                                }
                            }

                            if (rowToClick) {
                                // NEW portal: POST form. Use in-page fetch to avoid PDF viewer interception.
                                const downloadBtn = await rowToClick.$('button.btn-primary:has(i.fa-print)') || await rowToClick.$('button.btn-primary');
                                if (downloadBtn) {
                                    console.log(`[SYNC] Found POST download button for ${report.invoiceId}, fetching raw bytes via browser context...`);

                                    try {
                                        const pdfData = await page.evaluate(async (invoiceId: string) => {
                                            const table = document.querySelector('table#invoices_table') || document.querySelector('table#example');
                                            const rows = Array.from(table?.querySelectorAll('tbody tr') || []);
                                            const row = rows.find(r => (r as HTMLElement).innerText.includes(invoiceId));
                                            const btn = row?.querySelector('button.btn-primary:has(i.fa-print)') || row?.querySelector('button.btn-primary');

                                            const form = btn?.closest('form') as HTMLFormElement;
                                            if (!form) throw new Error('Download form not found');

                                            const url = form.action;
                                            const formData = new FormData(form);

                                            const resp = await fetch(url, {
                                                method: 'POST',
                                                body: formData
                                            });

                                            if (!resp.ok) throw new Error(`Fetch failed with status ${resp.status}`);

                                            const ab = await resp.arrayBuffer();
                                            const bytes = new Uint8Array(ab);
                                            // Convert to base64 properly to avoid recursion limits
                                            let binary = '';
                                            const chunk = 8192;
                                            for (let i = 0; i < bytes.length; i += chunk) {
                                                binary += String.fromCharCode.apply(null, bytes.subarray(i, i + chunk) as any);
                                            }
                                            return btoa(binary);
                                        }, report.invoiceId).catch((e: any) => {
                                            console.error('Fetch error:', e);
                                            return null;
                                        });

                                        if (pdfData) {
                                            const buffer = Buffer.from(pdfData, 'base64');
                                            // Check if it's a real PDF by preamble
                                            if (buffer.length > 5 && buffer.toString('ascii', 0, 5) === '%PDF-') {
                                                pdfBuffer = buffer;
                                                console.log(`[SYNC]   Successfully captured raw PDF (${pdfBuffer.length} bytes)`);
                                            } else {
                                                console.warn(`[SYNC]   Captured response is not a PDF. Starts with: ${buffer.toString('utf8', 0, 100)}`);
                                            }
                                        }
                                    } catch (err: any) {
                                        console.warn(`[SYNC] PDF fetch failed: ${err.message}`);
                                    }
                                }

                                // Fallback: try legacy Download button if pdfBuffer still empty
                                if (!pdfBuffer) {
                                    const oldBtn = await rowToClick.$('.btn-success[title="Download"]');
                                    if (oldBtn) {
                                        console.log(`[SYNC] Using legacy download fallback...`);
                                        const newTargetPromise = browser.waitForTarget((t: any) => t.opener() === page.target());
                                        await oldBtn.click();
                                        const newTarget = await newTargetPromise;
                                        const newPage = await newTarget.page();
                                        if (newPage) {
                                            await newPage.waitForSelector('body', { timeout: 10000 }).catch(() => { });

                                            // PREVENT CAPTURING ERROR PAGES AS PDFS
                                            const pageText = await newPage.evaluate(() => document.body.innerText || '');
                                            if (pageText.includes('405 Method Not Allowed') || pageText.includes('Failed') || pageText.includes('Error')) {
                                                console.error('[SYNC] Fallback opened an error page. Skipping PDF capture.');
                                            } else {
                                                pdfBuffer = await newPage.pdf({ format: 'A4', printBackground: true }) as Buffer;
                                            }

                                            await newPage.close();
                                        }
                                    }
                                }
                            }

                            if (pdfBuffer) {
                                pdfCache.set(report.invoiceId, pdfBuffer);
                                fs.writeFileSync(safePath, pdfBuffer);
                            }
                        }

                        if (pdfBuffer) {
                            if (!aiCache.has(report.invoiceId)) {
                                console.log(`[SYNC] Processing ${report.title} with AI...`);
                                const aiResults = await ocrService.analyzeImage(safePath);
                                if (aiResults && Array.isArray(aiResults)) aiCache.set(report.invoiceId, aiResults);
                            }

                            const aiResults = aiCache.get(report.invoiceId);

                            if (aiResults && aiResults.length > 0) {
                                // Iterate through each extracted test from the AI and save it as a separate investigation
                                for (const aiRes of aiResults) {
                                    const testTitle = aiRes.title;
                                    const extractedResult = aiRes.results;

                                    // Check if this specific test already exists for this invoice
                                    const existingTest = await this.prisma.investigation.findFirst({
                                        where: {
                                            patientId,
                                            title: testTitle,
                                            externalId: report.accNo
                                        }
                                    });

                                    const invData = {
                                        status: 'FINAL' as any,
                                        pdfFilename: filename,
                                        result: extractedResult as any,
                                        impression: null
                                    };

                                    let inv;
                                    if (existingTest) {
                                        // Update existing test
                                        inv = await this.prisma.investigation.update({ where: { id: existingTest.id }, data: invData as any });
                                    } else {
                                        // Create new test using the AI title (e.g., 'CBC', 'Procalcitonin') instead of the portal title (Patient Name)
                                        inv = await this.prisma.investigation.create({
                                            data: {
                                                ...invData,
                                                patientId, authorId: validAuthorId, title: testTitle, type: 'LAB',
                                                category: 'External', externalId: report.accNo, conductedAt: this.parseDate(report.date)
                                            } as any
                                        });
                                    }
                                    results.push(inv);
                                }
                            } else {
                                // Fallback if AI extraction fails: save generic entry using portal title (Better than nothing)
                                const invData = {
                                    status: 'FINAL' as any,
                                    pdfFilename: filename,
                                    result: null,
                                    impression: 'Failed to extract results.'
                                };

                                let inv;
                                if (existing) {
                                    inv = await this.prisma.investigation.update({ where: { id: existing.id }, data: invData as any });
                                } else {
                                    inv = await this.prisma.investigation.create({
                                        data: {
                                            ...invData,
                                            patientId, authorId: validAuthorId, title: report.title, type: 'LAB',
                                            category: 'External', externalId: report.accNo, conductedAt: this.parseDate(report.date)
                                        } as any
                                    });
                                }
                                results.push(inv);
                            }
                        }
                    } catch (e: any) {
                        console.error(`[SYNC] Report extraction error (${report.invoiceId}):`, e.message);
                    }
                }
            }
            await page.close();
            if (!browserInstance) await browser.close();
            return results;
        } catch (error) {
            console.error('[SYNC] Synchronous flow error:', error);
            await page.close();
            if (!browserInstance && browser) await browser.close();
            throw error;
        }
    }

    async syncAllActivePatients(authorId: string): Promise<void> {
        const activeAdmissions = await this.prisma.admission.findMany({
            where: { dischargedAt: null },
            include: { patient: true }
        });

        const browser = await this.launchBrowser();
        try {
            for (const admission of activeAdmissions) {
                if (!admission.patient) continue;
                try {
                    await this.syncAndSavePatientLabs(admission.patient.mrn, admission.patient.id, authorId, admission.patient.name, browser);
                } catch (e: any) {
                    console.error(`Sync failure for ${admission.patient.name}:`, e.message);
                }
            }
        } finally {
            await browser.close();
        }
    }

    private parseDate(s: string): Date {
        const parts = s.split('/');
        if (parts.length === 3) {
            return new Date(parseInt(parts[2]), parseInt(parts[1]) - 1, parseInt(parts[0]));
        }
        return new Date();
    }
}
