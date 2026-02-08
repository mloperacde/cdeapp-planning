import { createClient } from '@base44/sdk';
import fs from 'fs';
import https from 'https';

const APP_ID = '690cdd4205782920ba2297c8';
const TOKEN = "9841e97309b042b8be82e6c7846d03e4"; // API Key proporcionada por el usuario
const LOG_FILE = 'diagnosis.log';

function log(msg) {
    console.log(msg);
    fs.appendFileSync(LOG_FILE, msg + '\n');
}

async function diagnose() {
    fs.writeFileSync(LOG_FILE, "Starting Deep Diagnosis (Round 2)...\n");
    log(`App ID: ${APP_ID}`);
    log(`Token: ${TOKEN.substring(0, 4)}... (Length: ${TOKEN.length})`);

    // TEST 7: SDK Token (User)
    log("\n--- TEST 7: SDK Token (User) ---");
    try {
        const client = createClient({ 
            appId: APP_ID, 
            token: TOKEN, // Try as user token
            requiresAuth: true
        });
        
        const res = await client.entities.AppConfig.list(undefined, 1);
        log(`Success! Found ${res.length} items using User Token.`);
        
        // If successful, proceed with full diagnosis
        await fullDiagnosis(client);
        return; 
    } catch (e) { log(`Failed: ${e.message}`); }

    // TEST 7b: SDK Service Token
    log("\n--- TEST 7b: SDK Service Token ---");
    try {
        const client = createClient({ 
            appId: APP_ID, 
            serviceToken: TOKEN 
        });

        // Note: accessing asServiceRole
        const res = await client.asServiceRole.entities.AppConfig.list(undefined, 1);
        log(`Success! Found ${res.length} items using Service Role.`);
        
        // If successful, proceed with full diagnosis
        await fullDiagnosis(client.asServiceRole);
        return; 
    } catch (e) { log(`Failed: ${e.message}`); }

    // TEST 8: Custom Header X-Api-Key
    log("\n--- TEST 8: SDK with X-Api-Key Header ---");
    try {
        const client = createClient({ 
            appId: APP_ID, 
            headers: { "X-Api-Key": TOKEN }
        });
        const res = await client.entities.AppConfig.list(undefined, 1);
        log(`Success! Found ${res.length} items using X-Api-Key.`);
        
        await fullDiagnosis(client);
        return;
    } catch (e) { log(`Failed: ${e.message}`); }

    // TEST 9: Custom Header Authorization: ApiKey
    log("\n--- TEST 9: SDK with Authorization: ApiKey ---");
    try {
        const client = createClient({ 
            appId: APP_ID, 
            headers: { "Authorization": `ApiKey ${TOKEN}` }
        });
        const res = await client.entities.AppConfig.list(undefined, 1);
        log(`Success! Found ${res.length} items using Authorization: ApiKey.`);
        
        await fullDiagnosis(client);
        return;
    } catch (e) { log(`Failed: ${e.message}`); }
}

async function fullDiagnosis(apiClient) {
    log("\n>>> STARTING FULL DATA ANALYSIS <<<");
    
    try {
        log("Fetching roles_config...");
        
        const [byConfigKey, byKey, recentItems] = await Promise.all([
            apiClient.entities.AppConfig.filter({ config_key: 'roles_config' }).catch(e => { log("Filter by config_key failed: " + e.message); return []; }),
            apiClient.entities.AppConfig.filter({ key: 'roles_config' }).catch(e => { log("Filter by key failed: " + e.message); return []; }),
            apiClient.entities.AppConfig.list('-updated_at', 50).catch(e => { log("List failed: " + e.message); return []; })
        ]);

        log(`Found: byConfigKey=${byConfigKey.length}, byKey=${byKey.length}, recent=${recentItems.length}`);
        
        const candidates = [...byConfigKey, ...byKey, ...recentItems];
        const unique = Array.from(new Map(candidates.map(c => [c.id, c])).values());
        
        log(`Unique candidates: ${unique.length}`);

        unique.forEach(c => {
            log(`--- Record ${c.id} ---`);
            log(`Updated (Server): ${c.updated_at}`);
            
            let content = c.value || c.description || c.app_subtitle || "";
            log(`Content Preview: ${content.substring(0, 100)}...`);
            
            try {
                const p = JSON.parse(content);
                log(`Parsed JSON: Valid`);
                log(`_ts: ${p._ts}`);
                log(`timestamp: ${p.timestamp}`);
                log(`version: ${p.version || p.v || p._v}`);
                
                if (p.chunkIds || p._chunk_ids) {
                    const ids = p.chunkIds || p._chunk_ids;
                    log(`Chunk IDs: ${ids.length} (${ids.join(', ')})`);
                }
            } catch(e) {
                log(`Parsed JSON: Invalid/Not JSON`);
            }
        });

        unique.sort((a, b) => {
            const getTs = (item) => {
                try {
                    const val = item.value || item.description || item.app_subtitle;
                    if (val && val.startsWith('{')) {
                        const p = JSON.parse(val);
                        if (p._ts) return Number(p._ts);
                        if (p.timestamp) return Number(p.timestamp);
                    }
                } catch(e) {}
                const d = new Date(item.updated_at || 0);
                return isNaN(d.getTime()) ? 0 : d.getTime();
            };
            return getTs(b) - getTs(a);
        });

        const top = unique[0];
        log(`\nWinner (Best Candidate): ${top ? top.id : 'None'}`);

        if (top) {
            let content = top.value || top.description || top.app_subtitle || "";
            let p = null;
            try { p = JSON.parse(content); } catch(e) {}
            
            if (p) {
                const chunkIds = p.chunkIds || p._chunk_ids;
                if (chunkIds && chunkIds.length > 0) {
                    log("Attempting chunk retrieval...");
                    const chunkPromises = chunkIds.map(id => apiClient.entities.AppConfig.get(id).catch(e => {
                        log(`Chunk ${id} failed: ${e.message}`);
                        return null;
                    }));
                    const chunkResults = await Promise.all(chunkPromises);
                    const chunks = chunkResults.map(c => c ? c.value || c.description || "" : "");
                    const fullContent = chunks.join('');
                    log(`Reassembled Content Length: ${fullContent.length}`);
                }
            }
        }

        log("Diagnosis Complete!");
    } catch (e) {
        log(`Diagnosis Failed: ${e.message}`);
        console.error(e);
    }
}

diagnose();
