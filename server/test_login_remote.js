async function testLogin() {
    try {
        console.log("Testing POST to http://161.35.216.33:3001/api/auth/login");
        const res = await fetch("http://161.35.216.33:3001/api/auth/login", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ username: "senior", password: "password" })
        });
        const text = await res.text();
        console.log("Status:", res.status);
        console.log("Body:", text);
    } catch (e) {
        console.error("Fetch Error:", e.message);
    }
}
testLogin();
