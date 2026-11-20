import { Router } from 'express';
import path from 'path';
import fs from 'fs';

const router = Router();

const REPORT_MAX_AGE_MS = 24 * 60 * 60 * 1000;

// Reports are only needed long enough to print them.
function pruneOldReports(dir: string) {
    try {
        const cutoff = Date.now() - REPORT_MAX_AGE_MS;
        for (const name of fs.readdirSync(dir)) {
            const file = path.join(dir, name);
            if (fs.statSync(file).mtimeMs < cutoff) fs.unlinkSync(file);
        }
    } catch (error) {
        console.error('Report cleanup error:', (error as Error)?.message || error);
    }
}

// Host a self-contained HTML report so a mobile client can open it as a real
// http(s) page in the device browser (reliable Print / Save-as-PDF).
// Reports are ephemeral: written under uploads/reports and served statically.
router.post('/', (req, res) => {
    try {
        const { html, name } = req.body || {};
        if (!html || typeof html !== 'string') {
            return res.status(400).json({ error: 'html string is required' });
        }
        // Cap size to avoid abuse (reports are small tables)
        if (html.length > 2_000_000) {
            return res.status(413).json({ error: 'Report too large' });
        }

        const dir = path.join(__dirname, '../../uploads/reports');
        if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
        pruneOldReports(dir);

        const safeName = String(name || 'report').replace(/[^a-zA-Z0-9._-]/g, '-').slice(0, 40);
        const unique = Date.now() + '-' + Math.round(Math.random() * 1e9);
        const filename = `${safeName}-${unique}.html`;
        fs.writeFileSync(path.join(dir, filename), html, 'utf8');

        res.status(201).json({ url: `/uploads/reports/${filename}`, filename });
    } catch (error) {
        console.error('Report host error:', error);
        res.status(500).json({ error: 'Failed to host report' });
    }
});

export default router;
