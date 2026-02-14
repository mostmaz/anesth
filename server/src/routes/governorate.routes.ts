import { Router } from 'express';
import prisma from '../prisma';

const router = Router();

// GET all governorates
router.get('/', async (req, res) => {
    try {
        const governorates = await prisma.governorate.findMany({
            orderBy: { name: 'asc' }
        });
        res.json(governorates);
    } catch (error) {
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
        const governorate = await prisma.governorate.create({
            data: { name }
        });
        res.status(201).json(governorate);
    } catch (error) {
        res.status(500).json({ error: 'Failed to create governorate' });
    }
});

// PUT update governorate
router.put('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { name } = req.body;
        const governorate = await prisma.governorate.update({
            where: { id },
            data: { name }
        });
        res.json(governorate);
    } catch (error) {
        res.status(500).json({ error: 'Failed to update governorate' });
    }
});

// DELETE governorate
router.delete('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        await prisma.governorate.delete({
            where: { id }
        });
        res.status(204).send();
    } catch (error) {
        res.status(500).json({ error: 'Failed to delete governorate' });
    }
});

export default router;
