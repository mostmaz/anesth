async function test() {
    console.log("--- Testing Network ---");
    try {
        console.log("1. Fetching google.com...");
        const r1 = await fetch("https://www.google.com");
        console.log("Google Status:", r1.status);

        console.log("2. Fetching Gemini API endpoint (generativelanguage.googleapis.com)...");
        const r2 = await fetch("https://generativelanguage.googleapis.com");
        console.log("Gemini Endpoint Status:", r2.status);
    } catch (e) {
        console.error("Network Test Failed:", e);
    }
}
test();
