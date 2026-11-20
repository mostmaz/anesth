
import { Router } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';

const router = Router();

// Photos and PDFs only. SVG and HTML are excluded on purpose: they can carry scripts.
const ALLOWED_TYPES: Record<string, string> = {
    'image/jpeg': '.jpg',
    'image/png': '.png',
    'image/webp': '.webp',
    'image/gif': '.gif',
    'image/heic': '.heic',
    'image/heif': '.heif',
    'application/pdf': '.pdf',
};

// Configure storage
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        const uploadDir = path.join(__dirname, '../../uploads');
        if (!fs.existsSync(uploadDir)) {
            fs.mkdirSync(uploadDir, { recursive: true });
        }
        cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
        // Unique name; the extension comes from the verified type, never from
        // the client-supplied filename.
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, `${file.fieldname}-${uniqueSuffix}${ALLOWED_TYPES[file.mimetype] || ''}`);
    }
});

const upload = multer({
    storage: storage,
    limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
    fileFilter: (req, file, cb) => {
        if (ALLOWED_TYPES[file.mimetype]) {
            cb(null, true);
        } else {
            cb(new Error('Only JPEG/PNG/WebP/GIF/HEIC images and PDFs are allowed'));
        }
    }
});

// Multi file upload route
router.post('/', (req, res, next) => {
    // Turn upload rejections (wrong type, too large) into a clear 400 instead of a 500.
    upload.array('files', 3)(req, res, (err: any) => {
        if (err) return res.status(400).json({ error: err.message || 'Upload rejected' });
        next();
    });
}, (req, res) => {
    try {
        if (!req.files || (req.files as Express.Multer.File[]).length === 0) {
            return res.status(400).json({ error: 'No files uploaded' });
        }

        const files = req.files as Express.Multer.File[];
        const uploadedFiles = files.map(file => ({
            url: `/uploads/${file.filename}`,
            filename: file.filename,
            originalName: file.originalname,
            size: file.size
        }));

        res.json(uploadedFiles);
    } catch (error) {
        console.error('Upload error:', error);
        res.status(500).json({ error: 'Failed to upload files' });
    }
});

export default router;
