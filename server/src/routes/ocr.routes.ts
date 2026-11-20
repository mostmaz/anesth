import { Router } from 'express';
import { ocrService } from '../services/ocrService';
import path from 'path';

const router = Router();

router.post('/analyze', async (req, res) => {
    try {
        const { filePath, mode } = req.body;

        if (!filePath) {
            return res.status(400).json({ error: 'File path is required' });
        }

        // Compute absolute path based on where we save uploads
        // filePath from client might be like "/uploads/filename.jpeg" or "uploads/filename.jpeg"
        // We need to ensure it's treated as relative to project root
        const uploadsDir = path.resolve(__dirname, '../../uploads');
        const relative = String(filePath).replace(/^[/\\]+/, '').replace(/^uploads[/\\]/, '');
        const absolutePath = path.resolve(uploadsDir, relative);
        if (!absolutePath.startsWith(uploadsDir + path.sep)) {
            return res.status(400).json({ error: 'Invalid file path' });
        }

        console.log(`OCR Analysis Request [Mode: ${mode || 'LAB'}]`);

        const data = await ocrService.analyzeImage(absolutePath, mode);
        res.json(data);
    } catch (error) {
        console.error('OCR Error:', error);
        res.status(500).json({ error: 'Failed to analyze image' });
    }
});

export default router;
