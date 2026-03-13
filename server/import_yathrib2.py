import paramiko
import sys

host = "161.35.216.33"
user = "root"
password = "150893412C@c"
patient_id = "a5c4839d-c071-4c89-a204-b390ad8e8af4"

client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
client.connect(host, username=user, password=password, timeout=30)

cmd = f'docker exec icu_postgres_prod psql -U postgres -d icu_db -c "SELECT * FROM \\"Patient\\" WHERE id=\'{patient_id}\';"'
stdin, stdout, stderr = client.exec_command(cmd)
out = stdout.read()
err = stderr.read()
sys.stdout.buffer.write(b"PATIENT:\n" + out + b"\n")
if err:
    sys.stdout.buffer.write(b"ERR: " + err[:300] + b"\n")

cmd2 = f'docker exec icu_postgres_prod psql -U postgres -d icu_db -c "SELECT * FROM \\"Admission\\" WHERE \\"patientId\\"=\'{patient_id}\';"'
stdin, stdout, stderr = client.exec_command(cmd2)
out2 = stdout.read()
sys.stdout.buffer.write(b"ADMISSIONS:\n" + out2 + b"\n")

client.close()
