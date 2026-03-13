import puppeteer, { Page } from 'puppeteer';
import { PrismaClient, InvestigationStatus } from '@prisma/client';
import path from 'path';
import fs from 'fs';
import { broadcastNotification } from '../routes/notifications.routes';

export class LabImportService {
    private static BASE_URL = 'https://amrlab.net/referral/auth/login';
    private prisma = new PrismaClient();

    async launchBrowser() {
        return await puppeteer.launch({
            executablePath: fs.existsSync('/usr/bin/google-chrome') ? '/usr/bin/google-chrome' : undefined,
            headless: true,
            defaultViewport: { width: 1920, height: 1080 },
            args: ['--no-sandbox', '--disable-setuid-sandbox', '--window-size=1920,1080']
        });
    }

    async login(page: Page, username: string, password: string) {
        console.log(`Attempting login to ${LabImportService.BASE_URL} as ${username}...`);
        await page.goto(LabImportService.BASE_URL, { waitUntil: 'networkidle2', timeout: 60000 });

        try {
            const usernameSelector = 'input[name="identity"], input[name="email"]';
            await page.waitForSelector(usernameSelector, { timeout: 10000 });
            console.log('Login form detected. Typing credentials...');
            const usernameHandle = await page.$(usernameSelector);
            if (usernameHandle) {
                await usernameHandle.type(username);
            }
            await page.type('input[name="password"]', password);
            await page.click('button[type="submit"]');
            await page.waitForNavigation({ waitUntil: 'networkidle2' });
            console.log(`Login navigation complete. Current URL: ${page.url()}`);
        } catch (err) {
            console.log('Login fields not found, possibly already logged in or page structure changed.');
            console.log(`Current URL: ${page.url()}`);
        }
    }

    async getPatients(username: string, password: string, forceRefresh: boolean = false, browserInstance?: any, search?: string): Promise<any[]> {
        const browser = browserInstance || await this.launchBrowser();
        const page = await browser.newPage();

        try {
            if (!browserInstance) {
                await this.login(page, username, password);
            }

            // Explicitly navigate to invoices page
            console.log('Explicitly navigating to Invoices page...');
            await page.goto('https://amrlab.net/referral/invoices', { waitUntil: 'networkidle2', timeout: 60000 });

            // Ensure we didn't get redirected to login again due to session failure
            if (page.url().includes('/auth/login')) {
                console.log('Session rejected. Attempting re-login natively inside flow...');
                await this.login(page, username, password);
                await page.goto('https://amrlab.net/referral/invoices', { waitUntil: 'networkidle2', timeout: 60000 });
            }

            // Wait for the search input as a signal that the page is loaded
            console.log('Waiting for search input to appear...');
            const searchSelector = 'input[type="search"], .dataTables_filter input';
            try {
                await page.waitForSelector(searchSelector, { timeout: 30000 });
            } catch (timeoutErr: any) {
                console.error(`Search input timeout at URL: ${page.url()}`);
                const screenName = `fail_search_${Date.now()}.png`;
                await page.screenshot({ path: path.join(process.cwd(), 'uploads', screenName) });
                console.log(`Saved failure screenshot: ${screenName}`);
                throw timeoutErr;
            }

            if (search) {
                const searchTokens = search.replace(/،/g, '').trim().split(/\s+/);
                const portalQuery = searchTokens.slice(0, 2).join(' ').trim();

                console.log(`Starting search for: "${portalQuery}" (Original: "${search}")...`);

                await page.evaluate((sel: string) => {
                    const el = document.querySelector(sel) as HTMLInputElement;
                    if (el) el.value = '';
                }, searchSelector);

                await page.type(searchSelector, portalQuery, { delay: 100 });
                console.log('Typing complete. Waiting for table update...');
                await new Promise(r => setTimeout(r, 15000));
            }

            let records = await this.scrapeTable(page);

            // Fallback: If no records found and we used a specific search, try a broader search
            if (records.length === 0 && search && search.trim().split(/\s+/).length > 1) {
                const broaderQuery = search.trim().split(/\s+/)[0];
                console.log(`No results for restricted query. Trying broader search for "${broaderQuery}"...`);
                await page.evaluate(() => (document.querySelector('input[type="search"]') as HTMLInputElement).value = '');
                await page.type('input[type="search"]', broaderQuery, { delay: 100 });
                await new Promise(r => setTimeout(r, 10000));
                records = await this.scrapeTable(page);
            }

            // Filter strictly by name in JS if search was provided
            if (search && records.length > 0) {
                records = records.filter(r => this.isNameMatch(search, r.name));
            }

            return records;
        } finally {
            if (!browserInstance) await browser.close();
            else await page.close();
        }
    }

    private async scrapeTable(page: Page): Promise<any[]> {
        return await page.evaluate(() => {
            const rows = Array.from(document.querySelectorAll('table.dataTable > tbody > tr'));
            const records: any[] = [];
            rows.forEach((row) => {
                const cells = Array.from(row.querySelectorAll('td'));
                // Prevent error if some responsive/child rows appear
                if (cells.length < 5) return;

                const dateStr = (cells[1] as HTMLElement).innerText.trim();
                const accNo = (cells[2] as HTMLElement).innerText.trim().split('\n')[0];
                const name = cells[3].querySelector('.card-title')?.textContent?.trim() || cells[3].innerText.trim();
                const invoiceId = cells[2].querySelector('.invoice_samples')?.getAttribute('invoice_id') || '';

                const invCell = cells[4];
                const testRows = Array.from(invCell.querySelectorAll('table tr'));
                const tests = testRows.map(tr => {
                    const allTds = Array.from(tr.querySelectorAll('td'));
                    // Check for common status classes
                    const statusTd = tr.querySelector('td.text-success, td.text-danger, td.text-warning, td.text-info, td.text-primary');

                    // Title is the colored cell, or the first cell if no color is used
                    let title = statusTd?.textContent?.trim();
                    if (!title && allTds.length > 0) {
                        title = allTds[0].textContent?.trim() || 'Lab Report';
                    } else if (!title) {
                        title = 'Lab Report';
                    }

                    // Check ALL cells in the row for processing keywords
                    const isProcessing = (statusTd && (statusTd.className.includes('text-warning') || statusTd.className.includes('text-info'))) ||
                        allTds.some(td => {
                            const t = (td as HTMLElement).innerText?.toLowerCase() || '';
                            return t.includes('processing') || t.includes('pending') || t.includes('wait');
                        });

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
            return records;
        });
    }

    public isNameMatch(searchName: string, portalName: string): boolean {
        const normalize = (n: string) => n.replace(/،/g, '').trim().replace(/\s+/g, ' ').split(' ').slice(0, 2).join(' ');
        return normalize(searchName) === normalize(portalName);
    }

    async syncAndSavePatientLabs(mrn: string, patientId: string, authorId: string, patientName: string, browserInstance?: any, cachedReports?: any[]): Promise<any[]> {
        const username = 'icu@amrlab.net';
        const password = process.env.LAB_PASSWORD || '1989';

        console.log(`Starting New Sync for ${patientName}...`);
        const reports = cachedReports || await this.getPatients(username, password, true, browserInstance, patientName);
        console.log(`Found ${reports.length} matching report tests for ${patientName}.`);

        const results: any[] = [];
        for (const report of reports) {
            const existing = await this.prisma.investigation.findFirst({
                where: {
                    patientId,
                    OR: [
                        { pdfFilename: `INVOICE_${report.invoiceId}` },
                        { externalId: report.accNo, title: report.title }
                    ]
                } as any
            });

            if (existing && (existing.status as any) === 'FINAL') continue;
            if (existing && (existing.status as any) === 'PROCESSING' && report.portalStatus === 'PROCESSING') continue;

            if (report.portalStatus === 'PROCESSING') {
                const inv = await this.prisma.investigation.upsert({
                    where: { id: existing?.id || 'new' },
                    create: {
                        patientId, authorId, title: report.title, type: 'LAB',
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
                    console.log(`Finalizing/Importing report: ${report.title} (Acc: ${report.accNo})`);
                    const browser = browserInstance || await this.launchBrowser();
                    const printUrl = `https://amrlab.net/referral/invoices/print_medical_report/${report.invoiceId}`;
                    const page = await browser.newPage();
                    await this.login(page, username, password);

                    console.log(`Visiting print report URL: ${printUrl}`);
                    await page.goto(printUrl, { waitUntil: 'networkidle2', timeout: 60000 });

                    const frame = page.frames().find((f: any) => f.url().includes('print'));
                    const targetFrame = frame || page.mainFrame();

                    await targetFrame.waitForSelector('.print_button, button[onclick="window.print()"]', { timeout: 30000 }).catch(() => console.log('Print button not found visually, but proceeding.'));

                    const screenshotBuffer = await targetFrame.screenshot({ fullPage: true });
                    const filename = `INVOICE_${report.invoiceId}`;
                    const customName = `${filename}.png`;
                    const uploadDir = path.join(__dirname, '../../uploads');
                    if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });
                    const safePath = path.join(uploadDir, customName);
                    fs.writeFileSync(safePath, screenshotBuffer);

                    const isNew = !existing;
                    const inv = await this.prisma.investigation.upsert({
                        where: { id: existing?.id || 'new' },
                        create: {
                            patientId, authorId, title: report.title, type: 'LAB',
                            status: 'FINAL' as any, category: 'External',
                            externalId: report.accNo, conductedAt: this.parseDate(report.date),
                            imageUrl: `/uploads/${customName}`,
                            pdfFilename: filename
                        } as any,
                        update: {
                            status: 'FINAL' as any,
                            imageUrl: `/uploads/${customName}`,
                            pdfFilename: filename,
                            impression: null
                        } as any
                    });

                    // Broadcast SSE notification for new or newly finalized investigations
                    if (isNew || (existing && (existing.status as any) === 'PROCESSING')) {
                        broadcastNotification('new_investigation', {
                            type: 'new_investigation',
                            patientName,
                            patientId,
                            title: report.title,
                            investigationId: inv.id
                        });
                    }

                    results.push(inv);

                    if (!browserInstance) await browser.close();
                    else await page.close();
                } catch (e: any) {
                    console.error(`Error importing report ${report.title}:`, e.message);
                }
            }
        }
        return results;
    }

    async syncAllActivePatients(authorId: string): Promise<void> {
        console.log('Starting explicit full sync of active patients (Rewrite Logic)...');
        const activeAdmissions = await this.prisma.admission.findMany({
            where: { dischargedAt: null },
            include: { patient: true }
        });

        const browser = await this.launchBrowser();
        try {
            for (const admission of activeAdmissions) {
                if (!admission.patient) continue;
                console.log(`Checking automated background sync for ${admission.patient.name}...`);
                try {
                    await this.syncAndSavePatientLabs(
                        admission.patient.mrn,
                        admission.patient.id,
                        authorId,
                        admission.patient.name,
                        browser
                    );
                } catch (e: any) {
                    console.error(`Error syncing patient ${admission.patient.name}:`, e.message);
                }
            }
        } finally {
            await browser.close();
        }
        console.log('Finished full sync.');
    }

    async importReport(username: string, password: string, patient: any, browserInstance?: any) {
        const browser = browserInstance || await this.launchBrowser();
        const page = await browser.newPage();
        try {
            await this.login(page, username, password);
            const reports = await this.getPatients(username, password, true, browserInstance, patient.name);
            if (!reports || reports.length === 0) {
                throw new Error("No reports found for patient " + patient.name);
            }

            // just take the first final report for the old OCR flow
            const report = reports.find((r: any) => r.portalStatus === 'FINAL') || reports[0];
            const printUrl = `https://amrlab.net/referral/invoices/print_medical_report/${report.invoiceId}`;
            await page.goto(printUrl, { waitUntil: 'networkidle2', timeout: 60000 });

            const frame = page.frames().find((f: any) => f.url().includes('print'));
            const targetFrame = frame || page.mainFrame();

            await targetFrame.waitForSelector('.print_button, button[onclick="window.print()"]', { timeout: 30000 }).catch(() => console.log('Print btn not found'));

            const screenshotBuffer = await targetFrame.screenshot({ fullPage: true });
            const filename = `INVOICE_${report.invoiceId}.png`;
            const uploadDir = path.join(__dirname, '../../uploads');
            if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });
            const safePath = path.join(uploadDir, filename);
            fs.writeFileSync(safePath, screenshotBuffer);

            return {
                pdfFilename: `INVOICE_${report.invoiceId}`,
                imageUrl: `/uploads/${filename}`,
                absolutePath: safePath,
                accNo: report.accNo
            };
        } finally {
            if (!browserInstance) await browser.close();
            else await page.close();
        }
    }

    private parseDate(s: string): Date {
        if (!s) return new Date();
        // Handle DD/MM/YYYY format (Arabic portal format)
        if (s.includes('/')) {
            const parts = s.trim().split('/');
            if (parts.length === 3) {
                const [a, b, c] = parts;
                // If first part > 12, it must be a day (DD/MM/YYYY)
                if (parseInt(a, 10) > 12) {
                    const iso = `${c}-${b.padStart(2,'0')}-${a.padStart(2,'0')}`;
                    const d = new Date(iso);
                    if (!isNaN(d.getTime())) return d;
                }
                // Try MM/DD/YYYY
                const d = new Date(s);
                if (!isNaN(d.getTime())) return d;
                // Fallback: assume DD/MM/YYYY
                const iso = `${c}-${b.padStart(2,'0')}-${a.padStart(2,'0')}`;
                const d2 = new Date(iso);
                if (!isNaN(d2.getTime())) return d2;
            }
        }
        // Handle DD-MM-YYYY
        if (s.includes('-')) {
            const parts = s.trim().split('-');
            if (parts.length === 3 && parts[0].length <= 2) {
                const [d, m, y] = parts;
                const iso = `${y}-${m.padStart(2,'0')}-${d.padStart(2,'0')}`;
                const date = new Date(iso);
                if (!isNaN(date.getTime())) return date;
            }
        }
        const d = new Date(s);
        return isNaN(d.getTime()) ? new Date() : d;
    }
}
