$null = New-Item -ItemType Directory -Force -Path "C:\Users\Administrator\AppData\Local\Android\Sdk\cmdline-tools\latest"
Expand-Archive -Path "C:\Users\Administrator\AppData\Local\Temp\cmdline-tools.zip" -DestinationPath "C:\Users\Administrator\AppData\Local\Temp\cmdline-extract" -Force
Copy-Item -Path "C:\Users\Administrator\AppData\Local\Temp\cmdline-extract\cmdline-tools\*" -Destination "C:\Users\Administrator\AppData\Local\Android\Sdk\cmdline-tools\latest\" -Recurse -Force
Write-Host "Done extracting cmdline-tools"
