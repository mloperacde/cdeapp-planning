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

            // E. Tokenizar Nombre y Descripción para indexar partes (ej: IDs incrustados)
            // Esto permite que si la máquina se llama "011C 152 - PERFECT", el token "152" apunte a ella.
            const tokenizeAndIndex = (str) => {
                if (!str) return;
                // Dividir por espacios, guiones, paréntesis, corchetes
                const tokens = normStr(str).split(/[\s\-\(\)\[\]\.\:]+/);
                tokens.forEach(t => {
                    // Ignorar tokens muy cortos o comunes para evitar ruido, EXCEPTO si parecen IDs numéricos
                    const isNumeric = /^\d+$/.test(t);
                    if (t.length < 2 && !isNumeric) return; 
                    if (['maq', 'maquina', 'linea', 'sala', 'nave', 'cde'].includes(t)) return;
                    
                    // Solo indexar si no existe ya (para no sobrescribir claves más fuertes)
                    // Ojo: Si "152" es un token en dos máquinas, esto causará colisión.
                    // Pero asumimos que los IDs son únicos.
                    if (!lookup.has(t)) addToIndex(t, mid);
                });
            };
            tokenizeAndIndex(m.nombre);
            tokenizeAndIndex(m.descripcion);
            tokenizeAndIndex(m.codigo_maquina);
            tokenizeAndIndex(getMachineAlias(m));
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

        // 5. Estrategia Tokenizada Agresiva (Último recurso)
        // Divide el input por espacios y busca cualquier token que sea una clave exacta conocida
        // Ej: "011C 152 PERFECT 360" -> Busca "011C", "152", "PERFECT", "360"
        const allTokens = nName.split(/[\s\-]+/);
        for (const token of allTokens) {
            // Ignorar tokens cortos o comunes que puedan dar falsos positivos
            if (token.length < 3) continue;
            if (['maq', 'maquina', 'linea', 'sala', 'nave'].includes(token)) continue;

            if (lookup.has(token)) return lookup.get(token);
        }

        // 6. Búsqueda Parcial (Contiene) - PELIGROSO - Solo usar si tokenización falló
        // Solo buscamos si el input contiene el nombre de una máquina CONOCIDA
        // NO al revés (no si la máquina contiene el input) para evitar que "1" coincida con "11"
        for (const [key, id] of lookup.entries()) {
            if (key.startsWith("STRICT:")) continue; 
            if (key.length < 4) continue; // Requiere claves más largas para evitar falsos positivos
            
            // Si el nombre de entrada contiene la clave de la máquina completa
            // Ej: Input="LINEA 110 ENVASADO", Key="110" -> MATCH
            const regex = new RegExp(`\\b${key}\\b`, 'i');
            if (regex.test(nName)) return id;
        }

        return null;
    };

    return { resolveMachine, machinesRaw };
};
