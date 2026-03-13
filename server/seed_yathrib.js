const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  // 1. Ensure a Doctor exists
  let doctor = await prisma.doctor.findFirst();
  if (!doctor) {
    doctor = await prisma.doctor.create({
      data: { name: 'Dr. Default' }
    });
    console.log('Created doctor:', doctor.name);
  }

  // 2. Ensure a Specialty exists
  let specialty = await prisma.specialty.findFirst();
  if (!specialty) {
    specialty = await prisma.specialty.create({
      data: { name: 'General' }
    });
    console.log('Created specialty:', specialty.name);
  }

  // 3. Create the patient
  const existing = await prisma.patient.findFirst({ where: { mrn: '3434' } });
  if (existing) {
    console.log('Patient already exists:', existing.name);
    return;
  }

  const patient = await prisma.patient.create({
    data: {
      id: 'a5c4839d-c071-4c89-a204-b390ad8e8af4',
      mrn: '3434',
      name: 'يثرب سعد حمودي',
      dob: new Date('1996-03-11T12:21:26.503Z'),
      gender: 'Female',
      comorbidities: [],
      diagnosis: 'OHSS',
    }
  });
  console.log('Created patient:', patient.name);

  // 4. Create an active admission
  const admission = await prisma.admission.create({
    data: {
      id: '6e406f24-537f-425a-9db3-67b12f45a7e5',
      patientId: patient.id,
      bed: 'ICU-bed-1',
      diagnosis: 'Shock',
      doctorId: doctor.id,
      specialtyId: specialty.id,
      admittedAt: new Date('2026-03-11T12:21:28.467Z'),
    }
  });
  console.log('Created admission:', admission.id);
}

main().catch(console.error).finally(() => prisma.$disconnect());
