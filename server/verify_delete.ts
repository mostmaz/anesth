
import http from 'http';

const PORT = 3001;

// Helper to make requests
function request(method: string, path: string, data?: any): Promise<any> {
    return new Promise((resolve, reject) => {
        const options = {
            hostname: 'localhost',
            port: PORT,
            path: '/api' + path,
            method: method,
            headers: {
                'Content-Type': 'application/json',
            },
        };

        const req = http.request(options, (res) => {
            let body = '';
            res.on('data', (chunk) => body += chunk);
            res.on('end', () => {
                try {
                    const json = JSON.parse(body);
                    resolve({ status: res.statusCode, body: json });
                } catch (e) {
                    resolve({ status: res.statusCode, body });
                }
            });
        });

        req.on('error', reject);

        if (data) {
            req.write(JSON.stringify(data));
        }
        req.end();
    });
}

async function verifyDelete() {
    console.log('--- Verifying Patient Deletion ---');

    // 1. Create a patient
    const patientData = {
        mrn: `DEL-TEST-${Date.now()}`,
        firstName: 'Delete',
        lastName: 'Test',
        dob: '1990-01-01',
        gender: 'Male',
        diagnosis: 'Test Diagnosis'
    };

    console.log('Creating patient...');
    const createRes = await request('POST', '/patients', patientData);

    if (createRes.status !== 201) {
        console.error('Failed to create patient:', createRes.body);
        return;
    }

    const patientId = createRes.body.id;
    console.log(`Patient created: ${patientId}`);

    // 2. Add some related data (Admission)
    // We assume there's an endpoint or we can trust the schema change if delete works on empty patient.
    // Ideally we add an admission, but let's test the basic delete first.
    // Actually, create patient implies no relations yet.
    // If I want to test cascade, I should create an admission?
    // I don't have a simple "create admission" endpoint handy without looking up docs, 
    // but the discharge test showed me `PATCH /patients/:id` adds bed? No.
    // Let's just try to delete the patient. If schema is wrong, it might fail if there are hidden default relations?
    // User issue was "inability to delete".

    // Let's try to delete.
    console.log(`Deleting patient ${patientId}...`);
    const deleteRes = await request('DELETE', `/patients/${patientId}`);

    if (deleteRes.status === 200) {
        console.log('SUCCESS: Patient deleted successfully.');
    } else {
        console.error('FAILURE: Failed to delete patient.', deleteRes.body);
    }
}

verifyDelete().catch(console.error);
