import { createClient } from '@base44/sdk';

const APP_ID = "690cdd4205782920ba2297c8";
const TOKEN = process.env.BASE44_TOKEN;

if (!TOKEN) {
    console.error("\x1b[31mError: BASE44_TOKEN environment variable is required.\x1b[0m");
    console.log("Usage (PowerShell): $env:BASE44_TOKEN='your_token_here'; node scripts/diagnose-base44.js");
    process.exit(1);
}

// Configuración del cliente
// Intentamos usar la URL de producción por defecto, o la que se indique
const BASE_URL = process.env.BASE44_API_URL || "https://api.base44.app";

console.log(`\x1b[36mInitializing Base44 Client for App: ${APP_ID}\x1b[0m`);
console.log(`Target API: ${BASE_URL}`);

const client = createClient({
    appId: APP_ID,
    token: TOKEN,
    baseUrl: BASE_URL,
    requiresAuth: true
});

async function run() {
    console.log("\x1b[36mStarting Deep Diagnosis...\x1b[0m");
    
    try {
        // 1. Verify Auth
        console.log("Verifying authentication...");
        const me = await client.auth.me().catch(e => {
            console.error("\x1b[31mAuth Failed:\x1b[0m", e.message || e);
            if (e.status === 401) console.log("Token expired or invalid.");
            process.exit(1);
        });
        console.log(`\x1b[32mAuthenticated as: ${me.name} (${me.email})\x1b[0m`);

        // 2. Scan AppConfig
        // Buscamos tanto por 'roles_config' como por 'onboarding_training_resources' que son los problemáticos
        const keysToScan = ['roles_config', 'onboarding_training_resources'];
        
        for (const key of keysToScan) {
            console.log(`\n----------------------------------------`);
            console.log(`Scanning for key: \x1b[33m${key}\x1b[0m`);
            console.log(`----------------------------------------`);

            let allRecords = [];
            
            // Estrategia 1: config_key (Nuevo estándar)
            try {
                const res = await client.entities.AppConfig.filter({ config_key: key });
                console.log(`Query (config_key='${key}'): Found ${res.length}`);
                allRecords = [...allRecords, ...res];
            } catch (e) {
                console.log(`Query (config_key) failed: ${e.message}`);
            }

            // Estrategia 2: key (Legacy)
            try {
                const res = await client.entities.AppConfig.filter({ key: key });
                console.log(`Query (key='${key}'): Found ${res.length}`);
                allRecords = [...allRecords, ...res];
            } catch (e) {
                console.log(`Query (key) failed: ${e.message}`);
            }

            // Deduplicar
            const unique = Array.from(new Map(allRecords.map(item => [item.id, item])).values());
            
            // Ordenar por fecha actualización desc
            unique.sort((a, b) => new Date(b.updated_at) - new Date(a.updated_at));

            console.log(`\nTotal Unique Records: \x1b[1m${unique.length}\x1b[0m`);

            if (unique.length === 0) {
                console.log("\x1b[31m[CRITICAL] No records found for this configuration!\x1b[0m");
                continue;
            }

            if (unique.length > 1) {
                console.log("\x1b[31m[CRITICAL] DUPLICATES DETECTED! This explains the persistence failure.\x1b[0m");
                console.log("The system might be reading an old record instead of the new one.");
            }

            // Analyze each record
            unique.forEach((r, idx) => {
                const isFirst = idx === 0;
                const color = isFirst ? "\x1b[32m" : "\x1b[90m"; // Green for newest, Gray for others
                const reset = "\x1b[0m";
                
                console.log(`${color}\n[${idx + 1}] ID: ${r.id} ${isFirst ? "(NEWEST)" : "(OBSOLETE)"}${reset}`);
                console.log(`    Updated: ${new Date(r.updated_at).toLocaleString()}`);
                console.log(`    Created: ${new Date(r.created_at).toLocaleString()}`);
                console.log(`    Fields: key='${r.key}', config_key='${r.config_key}'`);
                
                // Content Analysis
                const rawVal = r.value || r.description || r.app_subtitle;
                if (!rawVal) {
                    console.log(`    Content: [EMPTY/NULL]`);
                } else {
                    try {
                        if (rawVal.startsWith('{') || rawVal.startsWith('[')) {
                            const parsed = JSON.parse(rawVal);
                            console.log(`    Type: JSON`);
                            if (parsed._v) console.log(`    Version: v${parsed._v}`);
                            else console.log(`    Version: Legacy/Unknown`);
                            
                            if (parsed._is_chunked) {
                                console.log(`    Mode: CHUNKED`);
                                console.log(`    Chunks: ${parsed._chunk_ids?.length || 0}`);
                                console.log(`    Verify Code: ${parsed._verify_code || 'N/A'}`);
                            } else {
                                console.log(`    Mode: DIRECT CONTENT`);
                            }
                        } else {
                            console.log(`    Type: STRING (First 50 chars): ${rawVal.substring(0, 50)}...`);
                        }
                    } catch (e) {
                        console.log(`    Type: INVALID JSON (${e.message})`);
                    }
                }
            });
        }

    } catch (e) {
        console.error("Diagnosis Error:", e);
    }
}

run();
