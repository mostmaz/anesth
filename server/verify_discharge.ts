
import http from 'http';

function request(method: string, path: string, data?: any): Promise<any> {
    return new Promise((resolve, reject) => {
        const options = {
            hostname: 'localhost',
            port: 3001,
            path: '/api' + path,
            method: method,
            headers: {
                'Content-Type': 'application/json'
            }
        };

        const req = http.request(options, (res) => {
            let body = '';
            res.on('data', (chunk) => body += chunk);
            res.on('end', () => {
                try {
                    if (res.statusCode && res.statusCode >= 200 && res.statusCode < 300) {
                        resolve(JSON.parse(body));
                    } else {
                        reject({ statusCode: res.statusCode, body: body });
                    }
                } catch (e) {
                    resolve(body); // or reject
                }
            });
        });

        req.on('error', (e) => reject(e));
        if (data) {
            req.write(JSON.stringify(data));
        }
        req.end();
    });
}

async function run() {
    try {
        console.log('1. Fetching patients...');
        const patients = await request('GET', '/patients');

        // Find a patient with an active admission (dischargedAt is null)
        let targetPatient = null;
        if (Array.isArray(patients)) {
            for (const p of patients) {
                if (p.admissions && p.admissions.length > 0) {
                    const active = p.admissions.find((a: any) => !a.dischargedAt);
                    if (active) {
                        targetPatient = p;
                        break;
                    }
                }
            }
        }

        if (!targetPatient) {
            console.log('No active admission found. Trying to verify Hikmat (139494) or create new...');
            // Create a dummy patient if needed
            const newMrn = 'TEST-' + Date.now();
            targetPatient = await request('POST', '/patients', {
                mrn: newMrn,
                firstName: 'Test',
                lastName: 'Discharge',
                dob: '1990-01-01',
                gender: 'Male',
                diagnosis: 'Test'
            });
            console.log('Created patient:', targetPatient);
            // We need to admit them. But we don't have an endpoint for explicit admission in the routes file I saw?
            // The seed data usually has admissions.
            // If I just created a patient, they have NO admissions.
            // So I can't discharge them via the API I built (which looks for active admission).

            // I must find an existing one. 
            // If `patients` list was empty or no active admissions, I might be stuck unless I seed.
            // But Hikmat should be there.
        }

        if (targetPatient) {
            console.log(`Targeting Patient: ${targetPatient.firstName} ${targetPatient.lastName} (${targetPatient.id})`);

            // Check for admission again (if I just created, it might be empty)
            if (!targetPatient.admissions || targetPatient.admissions.length === 0) {
                console.log("Patient has no admissions. Cannot test discharge.");
                // Manually create admission via Prisma if necessary? 
                // No, I should rely on existing data.
                // Hikmat (139494) from seed puts him in admitted state.
            } else {
                const active = targetPatient.admissions.find((a: any) => !a.dischargedAt);
                if (active) {
                    console.log(`Found active admission: ${active.id}`);
                    console.log(`2. Discharging patient ${targetPatient.id}...`);

                    const dischargeRes = await request('PATCH', `/patients/${targetPatient.id}/discharge`, {
                        dischargedAt: new Date().toISOString()
                    });

                    console.log('Discharge Response:', dischargeRes);

                    if (dischargeRes.success) {
                        console.log('3. Verifying status...');
                        const updatedPatient = await request('GET', `/patients/${targetPatient.id}`);
                        const stillActive = updatedPatient.admissions.find((a: any) => !a.dischargedAt);

                        if (!stillActive) {
                            console.log('SUCCESS: Patient discharged.');
                        } else {
                            console.error('FAILURE: Admission still active.');
                        }
                    }
                } else {
                    console.log("Patient has admissions but none are active.");
                }
            }
        } else {
            console.log("Could not find or create a patient.");
        }

    } catch (error: any) {
        console.error('Verification Error:', error);
    }
}

run();
