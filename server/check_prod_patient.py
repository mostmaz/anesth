import paramiko
import sys

host = "161.35.216.33"
user = "root"
password = "150893412C@c"

client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
client.connect(host, username=user, password=password, timeout=20)

# List all patients from prod DB
stdin, stdout, stderr = client.exec_command(
    "docker exec icu_postgres_prod psql -U postgres -d icu_db -c \"SELECT id, name, mrn FROM \\\"Patient\\\" ORDER BY name;\""
)
out = stdout.read()
err = stderr.read()
sys.stdout.buffer.write(out)
sys.stdout.buffer.write(err[:300])
client.close()
