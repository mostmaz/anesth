"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const prisma_1 = __importDefault(require("../prisma"));
const router = (0, express_1.Router)();
// GET all governorates
router.get('/', async (req, res) => {
    try {
        const governorates = await prisma_1.default.governorate.findMany({
            orderBy: { name: 'asc' }
        });
        res.json(governorates);
    }
    catch (error) {
        console.error('Error fetching governorates:', error);
        res.status(500).json({ error: 'Failed to fetch governorates' });
    }
});
// POST new governorate
router.post('/', async (req, res) => {
    try {
        const { name } = req.body;
        if (!name) {
            return res.status(400).json({ error: 'Name is required' });
        }
        const governorate = await prisma_1.default.governorate.create({
            data: { name }
        });
        res.status(201).json(governorate);
    }
    catch (error) {
        res.status(500).json({ error: 'Failed to create governorate' });
    }
});
// PUT update governorate
router.put('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { name } = req.body;
        const governorate = await prisma_1.default.governorate.update({
            where: { id },
            data: { name }
        });
        res.json(governorate);
    }
    catch (error) {
        res.status(500).json({ error: 'Failed to update governorate' });
    }
});
// DELETE governorate
router.delete('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        await prisma_1.default.governorate.delete({
            where: { id }
        });
        res.status(204).send();
    }
    catch (error) {
        res.status(500).json({ error: 'Failed to delete governorate' });
    }
});
exports.default = router;
