import { getMachineAlias } from "./machineAlias";

/**
 * Normaliza string para comparación: minúsculas, sin tildes, sin paréntesis, solo alfanumérico y espacios
 */
export const normStr = (s) => String(s || '').toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, '').trim();

/**
 * Construye un mapa de máquinas y devuelve una función de resolución robusta.
 * @param {Array} machinesRaw Lista de máquinas de la base de datos
 */
export const buildMachinesMap = (machinesRaw) => {
    // 1. Indexar máquinas por múltiples claves
    const lookup = new Map();

    const addToIndex = (key, machineId) => {
        if (!key) return;
        const nKey = normStr(key);
        if (nKey) lookup.set(nKey, machineId);
        
        // Indexar también sin espacios ni símbolos para robustez extrema
        const strictKey = nKey.replace(/[^a-z0-9]/g, '');
        if (strictKey && strictKey.length > 2) lookup.set("STRICT:" + strictKey, machineId);
    };

    if (Array.isArray(machinesRaw)) {
        machinesRaw.forEach(m => {
            const mid = String(m.id);
            // A. Claves explícitas directas
            addToIndex(m.id, mid);
            addToIndex(m.codigo_maquina, mid);
            addToIndex(m.codigo, mid);
            
            // B. Nombres y descripciones
            addToIndex(m.nombre, mid);
            addToIndex(m.nombre_maquina, mid);
            addToIndex(m.descripcion, mid);
            
            // C. Alias calculado
            addToIndex(getMachineAlias(m), mid);

            // D. IDs Externos (CDE / Importación)
            if (m.cde_machine_id) addToIndex(String(m.cde_machine_id), mid);
            if (m.orden_visualizacion) addToIndex(String(Math.round(m.orden_visualizacion)), mid);
        });
    }

    /**
     * Resuelve un ID de máquina a partir de su nombre o ID de origen.
     */
    const resolveMachine = (machineName, machineIdSource) => {
        // 1. Intentar por ID Fuente directo (cde_machine_id, orden, etc)
        if (machineIdSource) {
            const src = normStr(String(machineIdSource));
            if (lookup.has(src)) return lookup.get(src);
        }

        const rawName = String(machineName || '');
        if (!rawName) return null;

        // 2. Normalización básica
        const nName = normStr(rawName);
        if (lookup.has(nName)) return lookup.get(nName);

        // 3. Estrategia de Descomposición "CODIGO - NOMBRE"
        // Ej: "119 - MAQUINA X" -> Buscar "119" o "MAQUINA X"
        // Ej: "011C 152 - MAQUINA X" -> Buscar "011C", "152", "MAQUINA X"
        if (rawName.includes('-')) {
            const parts = rawName.split('-').map(p => normStr(p));
            // Parte Izquierda (Suele ser código o sala)
            const leftPart = parts[0];
            if (leftPart) {
                if (lookup.has(leftPart)) return lookup.get(leftPart);
                
                // Sub-estrategia: Tokenizar parte izquierda por espacios
                // Ej: "011C 152" -> "011C" y "152"
                const tokens = leftPart.split(/\s+/);
                for (const token of tokens) {
                    if (token.length > 1 && lookup.has(token)) return lookup.get(token);
                }
            }

            // Parte Derecha (Suele ser nombre)
            const rightPart = parts.slice(1).join(' '); // Re-unir resto
            if (rightPart && lookup.has(normStr(rightPart))) return lookup.get(normStr(rightPart));
        }

        // 4. Estrategia "Strict" (Sin espacios ni símbolos)
        const strictName = nName.replace(/[^a-z0-9]/g, '');
        if (lookup.has("STRICT:" + strictName)) return lookup.get("STRICT:" + strictName);

        // 5. Búsqueda Parcial (Contiene) - Solo si es seguro (> 3 chars)
        // Iterar sobre las claves conocidas (lento, usar solo como último recurso)
        // Preferimos claves cortas que estén contenidas en el nombre largo
        // Ej: DB tiene "MAQUINA X", input es "SALA 1 - MAQUINA X (NUEVA)"
        for (const [key, id] of lookup.entries()) {
            if (key.startsWith("STRICT:")) continue; // Skip strict keys
            if (key.length < 3) continue; // Skip short noise
            
            // Si la clave de DB está contenida en el nombre del input
            // Ej: key="119", input="119 - TORNO" -> MATCH
            // Ej: key="TORNO", input="119 - TORNO" -> MATCH
            // Usamos límites de palabra para evitar falsos positivos (ej: "1" en "11")
            const regex = new RegExp(`\\b${key}\\b`, 'i');
            if (regex.test(nName)) return id;
        }

        return null;
    };

    return { resolveMachine, machinesRaw };
};
