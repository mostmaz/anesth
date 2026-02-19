
async function main() {
    try {
        const response = await fetch('https://www.labforme.com/Login/');
        const text = await response.text();
        console.log(text);
    } catch (error) {
        console.error('Error fetching page:', error);
    }
}

main();
