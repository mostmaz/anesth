
const { LabImportService } = require('./dist/services/labImportService');
const service = new LabImportService();
const username = 'icu@amrlab.net';
const password = process.env.LAB_PASSWORD || '1989';

async function run() {
    try {
        const allReports = await service.getPatients(username, password, true, null, 'هاشم ياسين خليل يونس');
        console.log('--- HASHIM YASIN REPORTS ON PORTAL ---');
        allReports.forEach(r => {
            console.log(`ACC:${r.accNo} | DATE:${r.date} | TITLE:${r.title} | NAME:${r.name}`);
        });
    } catch (err) {
        console.error(err);
    }
}
run();
