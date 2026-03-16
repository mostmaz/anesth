
import { LabImportService } from './src/services/labImportService';
import { PrismaClient } from '@prisma/client';
import * as dotenv from 'dotenv';
dotenv.config();

const prisma = new PrismaClient();
const lab = new LabImportService();

async function testSync() {
    console.log("Starting testSync function...");
    const patientName = "يثرب سعد حمودي ياسين";
    const patientId = "ac2b8db5-9e74-4fd9-a21f-0daace86fdd9";
    const mrn = "316506-3";
    const authorId = "a2497fb8-1acf-44d4-a3bf-9289be25efe9";

    console.log(`Starting clean test sync for ${patientName}...`);

    await prisma.investigation.deleteMany({
        where: {
            patientId,
            type: 'LAB'
        }
    });
    console.log(`Deleted all LAB investigations to force re-sync.`);

    try {
        // Trigger sync
        const results = await lab.syncAndSavePatientLabs(mrn, patientId, authorId, patientName);
        console.log(`Sync complete. ${results.length} investigations processed.`);

        // Verify results
        const investigations = await prisma.investigation.findMany({
            where: { patientId },
            orderBy: { updatedAt: 'desc' },
            take: 20
        });

        console.log(`Found ${investigations.length} investigations:`);
        investigations.forEach(inv => {
            if (inv.result) {
                console.log(`- [MATCH] ${inv.title}: ${JSON.stringify(inv.result)}`);
            } else {
                console.log(`- [NO_RESULT] ${inv.title}`);
            }
        });

        const proc = investigations.find(i => i.title.includes("Procalcitonin") || i.title.includes("Albumin"));
        if (proc && proc.result) {
            console.log("SUCCESS: Results extracted and saved!");
        } else {
            console.log("FAILURE: Results not found or empty.");
        }
    } catch (e) {
        console.error("Sync test failed:", e);
    }
}

testSync().then(() => process.exit(0));
