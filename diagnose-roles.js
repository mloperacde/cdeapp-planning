
import { createClient } from '@base44/sdk';
import fs from 'fs';

const TOKEN = '690cdd4205782920ba2297c8';
const LOG_FILE = 'diagnosis.log';
const base44 = createClient({ token: TOKEN });

function log(msg) {
    console.log(msg);
    fs.appendFileSync(LOG_FILE, msg + '\n');
}

async function diagnose() {
    fs.writeFileSync(LOG_FILE, "Starting Diagnosis...\n");
    log("Starting Roles Diagnosis...");
    
    // 1. Simulate DataProvider Fetch
    try {
        log("Fetching roles_config...");
        // Pass token as second argument (overrides) or relying on env? 
        // Usually sdk methods take (params, overrideToken).
        
        const [byConfigKey, byKey, recentItems] = await Promise.all([
            base44.entities.AppConfig.filter({ config_key: 'roles_config' }, TOKEN).catch(e => { log("Filter by config_key failed: " + e.message); return []; }),
            base44.entities.AppConfig.filter({ key: 'roles_config' }, TOKEN).catch(e => { log("Filter by key failed: " + e.message); return []; }),
            base44.entities.AppConfig.list('-updated_at', 50, TOKEN).catch(e => { log("List failed: " + e.message); return []; })
        ]);

        log(`Found: byConfigKey=${byConfigKey.length}, byKey=${byKey.length}, recent=${recentItems.length}`);
        
        const candidates = [...byConfigKey, ...byKey, ...recentItems];
        const unique = Array.from(new Map(candidates.map(c => [c.id, c])).values());
        
        log(`Unique candidates: ${unique.length}`);

        unique.forEach(c => {
            log(`--- Record ${c.id} ---`);
            log(`Updated: ${c.updated_at}, Created: ${c.created_at}`);
            log(`Value starts with: ${c.value ? c.value.substring(0, 50) : 'N/A'}`);
            
            // Internal TS check
            try {
                const p = JSON.parse(c.value);
                log(`Internal TS: ${p._ts || p.timestamp || 'None'}`);
                log(`Version: ${p._v || p.v || 'N/A'}`);
                if (p._chunk_ids) log(`Chunks: ${p._chunk_ids.length}`);
            } catch(e) {
                log("JSON Parse Error or not JSON");
            }
        });

        // Sort Logic Test
        unique.sort((a, b) => {
            const getTs = (item) => {
                try {
                    const val = item.value || item.description || item.app_subtitle;
                    if (val && val.startsWith('{')) {
                        const p = JSON.parse(val);
                        if (p._ts) return p._ts;
                        if (p.timestamp) return p.timestamp;
                    }
                } catch(e) {}
                const d = new Date(item.updated_at || item.created_at || 0);
                return isNaN(d.getTime()) ? 0 : d.getTime();
            };
            return getTs(b) - getTs(a);
        });

        const top = unique[0];
        log(`\nWinner: ${top ? top.id : 'None'}`);

        if (top) {
            const p = JSON.parse(top.value);
            if (p._v === 8 && p._chunk_ids) {
                log("Attempting v8 chunk retrieval...");
                const chunkPromises = p._chunk_ids.map(id => base44.entities.AppConfig.get(id, TOKEN));
                const results = await Promise.all(chunkPromises);
                log(`Chunks retrieved: ${results.length}`);
                let full = "";
                results.forEach(r => full += (r.value || r.description));
                log(`Reassembled Length: ${full.length}`);
                log(`Reassembled Start: ${full.substring(0, 50)}`);
            }
        }

    } catch (e) {
        log("Diagnosis failed: " + e.message);
    }
}

diagnose();
