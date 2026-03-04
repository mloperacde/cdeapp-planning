
// Script para probar la lógica de sincronización localmente
// Requiere instalar dependencias si no están: npm install node-fetch

const API_KEY = 'k9fKmKcVCRc44Rf7dpkxhnfU9z9t0XsgrYgkGQSr9unWFZPOKsySznPHb7bUJzBc';
const API_BASE_V2 = "https://cuco360.cucorent.com/api/apiv2";

// Simulamos un empleado para no depender de la DB local en este test puro de conectividad
const testEmployee = {
    id: "local_test_1",
    nombre: "PRUEBA CONEXION",
    codigo_empleado: "76", // PROBANDO CON COD_INT_EMPLEADO (Tu código interno)
    dni_nie: "12345678Z",
    email: "test@example.com"
};

async function runTest() {
    console.log("--- INICIANDO TEST DE CONEXIÓN CUCO360 (DRY RUN) ---");
    
    const externalId = testEmployee.codigo_empleado;
    const headers = { 
        "Content-Type": "application/json",
        "accept": "application/json",
        "APIkey": API_KEY,
        "X-CSRF-TOKEN": ""
    };

    const checkUrl = `${API_BASE_V2}/employees/${externalId}`;
    console.log(`[Test] Verificando existencia en: ${checkUrl}`);

    try {
        const checkRes = await fetch(checkUrl, { 
            method: "GET", 
            headers
        });

        console.log(`[Response] Status: ${checkRes.status}`);
        
        if (checkRes.ok) {
            const data = await checkRes.json();
            console.log("✅ El empleado EXISTE en Cuco360.");
            console.log("Datos:", JSON.stringify(data, null, 2));
            console.log("Acción sugerida: UPDATE (PUT)");
        } else if (checkRes.status === 404) {
            console.log("ℹ️ El empleado NO EXISTE en Cuco360 (404 Not Found).");
            console.log("Acción sugerida: CREATE (POST)");
        } else {
            const text = await checkRes.text();
            console.error("❌ Error en la API:", text);
        }

    } catch (err) {
        console.error("❌ Error de red:", err.message);
    }
}

runTest();
