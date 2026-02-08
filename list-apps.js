
import axios from 'axios';

const TOKEN = "9841e97309b042b8be82e6c7846d03e4";
// Base URL por defecto de Base44 (asumida, puede variar si es on-prem o custom, pero probaremos la estándar)
// Revisando base44Client.js podría ver la URL base, pero usaremos la común de SaaS.
// Si no funciona, miraré el código para ver qué URL usan.
const BASE_URL = 'https://engine.base44.com/api/v1'; 

async function listApps() {
    console.log("Attempting direct API discovery...");
    
    try {
        // 1. Probar /users/me o similar para verificar token
        console.log("Checking Token validity...");
        // Intentaremos listar apps, que es lo más directo
        const res = await axios.get(`${BASE_URL}/apps`, {
            headers: {
                'Authorization': `Bearer ${TOKEN}`,
                'Content-Type': 'application/json'
            }
        });

        console.log("Apps found:", res.data);
        if (Array.isArray(res.data)) {
            res.data.forEach(app => {
                console.log(`- App: ${app.name} (ID: ${app.id})`);
            });
        }
    } catch (e) {
        console.log("Direct API call failed:");
        console.log("Status:", e.response?.status);
        console.log("Data:", JSON.stringify(e.response?.data, null, 2));
        
        // Intento secundario con header X-Api-Key
        console.log("\nRetrying with X-Api-Key...");
        try {
             const res2 = await axios.get(`${BASE_URL}/apps`, {
                headers: {
                    'X-Api-Key': TOKEN,
                    'Content-Type': 'application/json'
                }
            });
            console.log("Apps found (X-Api-Key):", res2.data);
        } catch (e2) {
             console.log("X-Api-Key failed too:", e2.response?.status);
        }
    }
}

listApps();
