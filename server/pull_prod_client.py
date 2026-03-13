import paramiko
import os
import stat
import sys

host = "161.35.216.33"
user = "root"
password = "150893412C@c"

client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
client.connect(host, username=user, password=password, timeout=30)

# Find client src on the production server
stdin, stdout, stderr = client.exec_command(
    "find /root/anesth/client/src -name '*.tsx' -o -name '*.ts' | head -5"
)
out = stdout.read().decode()
print("Sample files:", out)

sftp = client.open_sftp()

remote_base = "/root/anesth/client/src"
local_base = "E:/claude/anesth/client/src"

EXCLUDE = {"node_modules", ".vite", "dist"}

def sftp_walk(sftp, remote_path):
    try:
        items = sftp.listdir_attr(remote_path)
    except Exception:
        return
    for item in items:
        remote_item = remote_path + "/" + item.filename
        if stat.S_ISDIR(item.st_mode):
            yield from sftp_walk(sftp, remote_item)
        else:
            yield remote_item

downloaded = 0
skipped = 0

for remote_file in sftp_walk(sftp, remote_base):
    rel = remote_file[len(remote_base):].lstrip("/")
    parts = rel.split("/")
    if any(p in EXCLUDE for p in parts):
        skipped += 1
        continue

    local_file = os.path.join(local_base.replace("/", os.sep), *parts)
    os.makedirs(os.path.dirname(local_file), exist_ok=True)
    sftp.get(remote_file, local_file)
    sys.stdout.buffer.write(("  OK " + rel + "\n").encode("utf-8"))
    sys.stdout.buffer.flush()
    downloaded += 1

sftp.close()
client.close()
sys.stdout.buffer.write(("\nDone: " + str(downloaded) + " files, " + str(skipped) + " skipped.\n").encode("utf-8"))
