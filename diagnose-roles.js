import { createClient } from '@base44/sdk';
import fs from 'fs';

// App ID confirmed from src/api/base44Client.js
const APP_ID = '690cdd4205782920ba2297c8';
// Token from .env VITE_CDEAPP_API_KEY (Attempting to use as auth token)
const TOKEN = '1oeV2Wg9g6gmY8rAGF4qxtBme4DsX7exYoiFFCf4xVQXDKDYp4Xc9CPSlm2ZzxSJ';
const LOG_FILE = 'diagnosis.log';

// Initialize client with explicit App ID and Token
const base44 = createClient({ 
    appId: APP_ID, 
    token: TOKEN,
    // Add baseUrl if needed, but default should work for production
});

function log(msg) {
    console.log(msg);
    fs.appendFileSync(LOG_FILE, msg + '\n');
}

async function diagnose() {
    fs.writeFileSync(LOG_FILE, "Starting Diagnosis...\n");
    log(`Starting Roles Diagnosis for App ID: ${APP_ID}...`);
    
    try {
        log("Fetching roles_config...");
        
        // Parallel fetch strategy
        // Note: remove explicit TOKEN arg from calls as it's in the client
        const [byConfigKey, byKey, recentItems] = await Promise.all([
            base44.entities.AppConfig.filter({ config_key: 'roles_config' }).catch(e => { log("Filter by config_key failed: " + e.message); return []; }),
            base44.entities.AppConfig.filter({ key: 'roles_config' }).catch(e => { log("Filter by key failed: " + e.message); return []; }),
            base44.entities.AppConfig.list('-updated_at', 50).catch(e => { log("List failed: " + e.message); return []; })
        ]);

        log(`Found: byConfigKey=${byConfigKey.length}, byKey=${byKey.length}, recent=${recentItems.length}`);
        
        const candidates = [...byConfigKey, ...byKey, ...recentItems];
        // Deduplicate by ID
        const unique = Array.from(new Map(candidates.map(c => [c.id, c])).values());
        
        log(`Unique candidates: ${unique.length}`);

        unique.forEach(c => {
            log(`--- Record ${c.id} ---`);
            log(`Updated (Server): ${c.updated_at}`);
            
            // Analyze value/content
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

        // Sort Logic Test (matching DataProvider)
        unique.sort((a, b) => {
            const getTs = (item) => {
                try {
                    const val = item.value || item.description || item.app_subtitle;
                    if (val && val.startsWith('{')) {
                        const p = JSON.parse(val);
                        // Check multiple timestamp fields
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
                    const chunkPromises = chunkIds.map(id => base44.entities.AppConfig.get(id).catch(e => {
                        log(`Chunk ${id} failed: ${e.message}`);
                        return null;
                    }));
                    
                    const results = await Promise.all(chunkPromises);
                    const validResults = results.filter(r => r !== null);
                    log(`Chunks retrieved: ${validResults.length}/${chunkIds.length}`);
                    
                    let full = "";
                    validResults.forEach(r => {
                        // Logic from usePersistentAppConfig
                        let val = r.value || r.description || (r.app_subtitle !== "chunk" ? r.app_subtitle : "") || "";
                        full += val;
                    });
                    
                    log(`Reassembled Length: ${full.length}`);
                    try {
                        const fullJson = JSON.parse(full);
                        log(`Reassembled JSON: Valid`);
                        // Check if it has roles
                        if (fullJson.roles) {
                            log(`Roles found: ${Object.keys(fullJson.roles).join(', ')}`);
                        } else {
                            log(`Roles key missing in reassembled JSON`);
                        }
                    } catch(e) {
                        log(`Reassembled JSON: Invalid`);
                    }
                } else {
                    // Direct content check
                    if (p.roles) {
                         log(`Roles found (Direct): ${Object.keys(p.roles).join(', ')}`);
                    }
                }
            }
        }

    } catch (e) {
        log("Diagnosis failed: " + e.message);
        console.error(e);
    }
}

diagnose();
