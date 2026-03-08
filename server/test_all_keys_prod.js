const { GoogleGenerativeAI } = require('@google/generative-ai');

const keys = [
    'AIzaSyBB4SAZuwcLnGs085wAj98kWT7sp1tTLO0',
    'AIzaSyCcq8sVzOI2kgjEIO57bWWd2tAtEnSQBwc',
    'AIzaSyDS2Wm2vv2Yur3kDgsSdepuvowgFfCQA7M'
];

async function testKey(key) {
    console.log(`Testing key: ${key.substring(0, 10)}...`);
    try {
        const genAI = new GoogleGenerativeAI(key);
        const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
        const result = await model.generateContent("test");
        const text = result.response.text();
        console.log(`  SUCCESS! Response: ${text.substring(0, 20)}`);
        return true;
    } catch (e) {
        console.log(`  FAILED: ${e.message || e}`);
        return false;
    }
}

async function run() {
    for (const key of keys) {
        await testKey(key);
    }
}

run();
