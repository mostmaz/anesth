"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const prisma_1 = __importDefault(require("../prisma"));
const router = (0, express_1.Router)();
// Get Notes for a Patient
router.get('/:patientId', async (req, res) => {
    try {
        const { patientId } = req.params;
        const { type } = req.query;
        const where = { patientId };
        if (type)
            where.type = type;
        const notes = await prisma_1.default.clinicalNote.findMany({
            where,
            orderBy: { createdAt: 'desc' },
            include: {
                author: { select: { name: true, role: true } }
            }
        });
        res.json(notes);
    }
    catch (error) {
        console.error('Error fetching notes:', error);
        res.status(500).json({ error: 'Failed to fetch notes' });
    }
});
// Create Note
router.post('/', async (req, res) => {
    try {
        const { patientId, authorId, type, title, content, data } = req.body;
        const note = await prisma_1.default.clinicalNote.create({
            data: {
                patientId,
                authorId,
                type,
                title,
                content,
                data: data || {}
            },
            include: {
                author: { select: { name: true, role: true } }
            }
        });
        res.status(201).json(note);
    }
    catch (error) {
        console.error('Error creating note:', error);
        res.status(500).json({ error: 'Failed to create note' });
    }
});
exports.default = router;
