# Setup Instructions

I encountered issues running commands on your machine due to PowerShell execution policies blocking your profile script.
Please run the following commands manually in your terminal (Command Prompt or PowerShell) to finish the setup:

1.  **Navigate to the server directory:**
    ```bash
    cd server
    ```

2.  **Install dependencies (if not already done):**
    ```bash
    npm install
    ```

3.  **Run Database Migrations:**
    *   Ensure your PostgreSQL database is running.
    *   Run the migration command:
        ```bash
        npx prisma migrate dev --name init
        ```
    *   If `npx` fails, try:
        ```bash
        node_modules/.bin/prisma migrate dev --name init
        ```

4.  **Start the Server:**
    ```bash
    npm run dev
    ```

5.  **Verify:**
    *   Open `http://localhost:3000/api/patients` in your browser. It should return `[]`.

## Note on PowerShell Policy
To fix the "running scripts is disabled" error globally, you may need to run this in an Administrator PowerShell:
```powershell
Set-ExecutionPolicy RemoteSigned -Scope CurrentUser
```
