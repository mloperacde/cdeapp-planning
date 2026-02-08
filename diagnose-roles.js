
import { createClient } from '@base44/sdk';
import fs from 'fs';
import path from 'path';

// CONFIGURACIÓN DE DIAGNÓSTICO
const APP_ID = '690cdd4205782920ba2297c8';
const API_KEY = '9841e97309b042b8be82e6c7846d03e4'; // NUEVA API KEY
const LOG_FILE = path.join(process.cwd(), 'diagnosis.log');

// Setup logging
const logStream = fs.createWriteStream(LOG_FILE, { flags: 'a' });
function log(msg) {
    const timestamp = new Date().toISOString();
    const formatted = `[${timestamp}] ${msg}`;
    console.log(formatted);
    logStream.write(formatted + '\n');
}

log("=== INICIO DE DIAGNÓSTICO DE ROLES (DEEP SCAN) ===");
log(`App ID: ${APP_ID}`);
log(`API Key: ${API_KEY.substring(0, 5)}...`);

// CREATE CLIENT DIRECTLY
const base44 = createClient({
    appId: APP_ID,
    token: API_KEY,
    requiresAuth: true
});

async function run() {
    try {
        log("1. Probando conexión y listado de AppConfig...");
        
        // Try to filter by roles_config
        const configs = await base44.entities.AppConfig.list();
        log(`Records encontrados (Total): ${configs.length}`);
        
        const rolesConfigs = configs.filter(c => c.key === 'roles_config' || c.config_key === 'roles_config');
        log(`Registros 'roles_config' encontrados: ${rolesConfigs.length}`);
        
        rolesConfigs.forEach(c => {
            log(`- ID: ${c.id}, Updated: ${c.updated_at}, Key: ${c.key}`);
            const val = c.value || c.description || c.app_subtitle;
            log(`  Content Start: ${val ? val.substring(0, 50) : 'EMPTY'}`);
            try {
                if (val && val.startsWith('{')) {
                    const p = JSON.parse(val);
                    log(`  Parsed: v=${p._v}, ts=${p._ts}, isChunked=${p._is_chunked}`);
                }
            } catch(e) {
                log(`  Parse Error: ${e.message}`);
            }
        });
        
        if (rolesConfigs.length === 0) {
            log("ADVERTENCIA: No se encontraron configuraciones de roles. Es posible que el filtrado falle o no existan.");
        }

    } catch (e) {
        log(`ERROR FATAL: ${e.message}`);
        if (e.response) {
            log(`Status: ${e.response.status}`);
            log(`Data: ${JSON.stringify(e.response.data)}`);
        }
    } finally {
        log("=== FIN DEL DIAGNÓSTICO ===");
        logStream.end();
    }
}

run();
