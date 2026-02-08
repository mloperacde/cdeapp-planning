import { createClient } from '@base44/sdk';

const APP_ID = "690cdd4205782920ba2297c8"; // Existing ID we are trying to use
const TOKEN = "9841e97309b042b8be82e6c7846d03e4";

console.log("Initializing Base44 SDK...");
const base44 = createClient({
    appId: APP_ID,
    token: TOKEN,
    requiresAuth: true
});

async function testConnection() {
    console.log("Testing Base44 Connection...");
    console.log(`Token: ${TOKEN.substring(0, 5)}...`);

    // 1. Check Identity
    try {
        console.log("Checking Identity (auth.me)...");
        const me = await base44.auth.me();
        console.log("Identity verified:", JSON.stringify(me, null, 2));
    } catch (e) {
        console.error("Identity Check Failed:", e.message);
    }

    // 2. Try to list AppConfig
    try {
        console.log(`Listing AppConfig for App ID ${APP_ID}...`);
        const configs = await base44.entities.AppConfig.list(undefined, 5);
        console.log(`Success! Found ${configs.length} configs.`);
    } catch (e) {
        console.error("AppConfig List Failed:", e.message);
        if (e.response && e.response.data) {
             console.error("Details:", JSON.stringify(e.response.data, null, 2));
        }
    }
}

testConnection();
