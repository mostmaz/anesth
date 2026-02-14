import { Router } from 'express';
import { ocrService } from '../services/ocrService';
import path from 'path';

const router = Router();

router.post('/analyze', async (req, res) => {
    try {
        const { filePath } = req.body;

        if (!filePath) {
            return res.status(400).json({ error: 'File path is required' });
        }

        // Compute absolute path based on where we save uploads
        // filePath from client might be like "/uploads/filename.jpeg" or "uploads/filename.jpeg"
        // We need to ensure it's treated as relative to project root
        const normalizedPath = filePath.replace(/^[/\\]/, '');
        const absolutePath = path.join(__dirname, '../../', normalizedPath);

        console.log(`OCR Analysis Request: ${filePath} -> ${absolutePath}`);

        const data = await ocrService.analyzeImage(absolutePath);
        res.json(data);
    } catch (error) {
        console.error('OCR Error:', error);
        res.status(500).json({ error: 'Failed to analyze image' });
    }
});

export default router;
