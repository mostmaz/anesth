import fs from 'fs';
import path from 'path';
import prisma from '../prisma';

// Daily clean-up of things that are only useful for a short time.

const DAY = 24 * 60 * 60_000;

async function pruneDatabase() {
    const now = Date.now();
    // Retry keys from the phone app are only needed while an entry may be re-sent.
    const requests = await prisma.processedRequest.deleteMany({ where: { createdAt: { lt: new Date(now - 7 * DAY) } } });
    const errors = await prisma.clientError.deleteMany({ where: { createdAt: { lt: new Date(now - 90 * DAY) } } });
    if (requests.count || errors.count) {
        console.log(`[Housekeeping] removed ${requests.count} retry key(s), ${errors.count} old error report(s)`);
    }
}

// Lab-portal debug screenshots older than a week.
function pruneDebugScreenshots() {
    const dir = path.join(__dirname, '../../uploads');
    if (!fs.existsSync(dir)) return;
    const cutoff = Date.now() - 7 * DAY;
    let removed = 0;
    for (const name of fs.readdirSync(dir)) {
        const m = name.match(/^(LOGIN_FAIL|ERROR_DATA)_(\d{13})\.png$/);
        if (!m || Number(m[2]) > cutoff) continue;
        try { fs.unlinkSync(path.join(dir, name)); removed++; } catch { /* ignore */ }
    }
    if (removed) console.log(`[Housekeeping] removed ${removed} old lab debug screenshot(s)`);
}

export async function runHousekeeping() {
    try { await pruneDatabase(); } catch (e: any) { console.error('[Housekeeping] database clean-up failed:', e?.message || e); }
    try { pruneDebugScreenshots(); } catch (e: any) { console.error('[Housekeeping] file clean-up failed:', e?.message || e); }
}

export function startHousekeeping() {
    // Shortly after start, then once a day.
    setTimeout(runHousekeeping, 5 * 60_000);
    setInterval(runHousekeeping, DAY);
}
