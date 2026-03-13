import paramiko
import sys

host = "161.35.216.33"
user = "root"
password = "150893412C@c"
patient_id = "a5c4839d-c071-4c89-a204-b390ad8e8af4"

client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
client.connect(host, username=user, password=password, timeout=30)

# Run a pg_dump of just this patient's data as INSERT statements
cmd = (
    f'docker exec icu_postgres_prod pg_dump -U postgres icu_db '
    f'--data-only --inserts '
    f'-t \'"Patient"\' -t \'"Admission"\' -t \'"Investigation"\' '
    f'--where=\'"Patient".id=\'\\\'\\\'\\\'\\\'a5c4839d-c071-4c89-a204-b390ad8e8af4\\\'\\\'\\\'\\\'\' '
)

# Simpler approach - just raw SQL queries
queries = [
    f'SELECT * FROM "Patient" WHERE id=\'{patient_id}\'',
    f'SELECT * FROM "Admission" WHERE "patientId"=\'{patient_id}\'',
    f'SELECT id, "patientId", "testType", title, status, "resultData", "reportDate", "externalId", "createdAt" FROM "Investigation" WHERE "patientId"=\'{patient_id}\' LIMIT 5',
]

for q in queries:
    stdin, stdout, stderr = client.exec_command(
        f"docker exec icu_postgres_prod psql -U postgres -d icu_db -c \"{q}\""
    )
    out = stdout.read()
    sys.stdout.buffer.write(out + b'\n')

client.close()
