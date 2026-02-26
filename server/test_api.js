async function testApi() {
    try {
        const id = '68baae90-91be-4b76-9d3b-7e5e423a0523';
        const res = await fetch(`http://161.35.216.33:3001/api/vitals/${id}`);
        const text = await res.text();
        console.log(`GET /api/vitals/${id} -> ${res.status}`);
        console.log("Body:", text);
    } catch (e) {
        console.error(e.message);
    }
}
testApi();
