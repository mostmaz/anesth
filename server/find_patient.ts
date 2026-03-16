
import { LabImportService } from './src/services/labImportService';
import * as dotenv from 'dotenv';
dotenv.config();

const lab = new LabImportService();
const username = 'icu@amrlab.net';
const password = process.env.LAB_PASSWORD || '1989';

async function find() {
    console.log("Searching for patient...");
    try {
        const patients = await lab.getPatients(username, password, true);
        const target = patients.find(p => p.name.includes('يثرب'));
        if (target) {
            console.log("FOUND_PATIENT:" + JSON.stringify(target));
        } else {
            console.log("Patient not found in the list of " + patients.length + " patients.");
        }
    } catch (e) {
        console.error("Error finding patient:", e);
    }
}

find().then(() => process.exit(0));
