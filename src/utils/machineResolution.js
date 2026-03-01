import { getMachineAlias } from "./machineAlias";

/**
 * Normaliza string para comparación: minúsculas, sin tildes, sin paréntesis, solo alfanumérico y espacios
 */
export const normStr = (s) => String(s || '').toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, '').replace(/[()]/g, '').replace(/[^a-z0-9 ]/g, ' ').replace(/\s+/g, ' ').trim();

/**
 * Construye un mapa de máquinas y devuelve una función de resolución robusta.
 * @param {Array} machinesRaw Lista de máquinas de la base de datos
 */
export const buildMachinesMap = (machinesRaw) => {
    const map = new Map();
    const cdeIdMap = new Map(); // ID numérico CDE → ID base44

    if (Array.isArray(machinesRaw)) {
        machinesRaw.forEach(m => {
            // Mapa por ID de BD directo
            if (m.id) map.set(m.id, m.id);
            // Mapa por nombre normalizado
            [m.nombre, m.codigo_maquina, m.codigo, m.descripcion, m.nombre_maquina].forEach(v => {
                if (v) map.set(normStr(v), m.id);
            });
            const alias = getMachineAlias(m);
            if (alias) map.set(normStr(alias), m.id);
            // Mapa por cde_machine_id explícito
            if (m.cde_machine_id) cdeIdMap.set(String(m.cde_machine_id).trim(), m.id);
            // Mapa por orden_visualizacion (suele coincidir con ID CDE)
            if (m.orden_visualizacion != null) cdeIdMap.set(String(Math.round(m.orden_visualizacion)), m.id);
        });
    }

    /**
     * Resuelve un ID de máquina a partir de su nombre o ID de origen.
     */
    const resolveMachine = (machineName, machineIdSource) => {
        // PRIORIDAD 0: solo usar cdeIdMap si la máquina tiene cde_machine_id explícito en BD
        if (machineIdSource != null) {
            const src = String(machineIdSource).trim();
            if (cdeIdMap.has(src)) return cdeIdMap.get(src);
        }

        const name = String(machineName || '');
        // Limpiar paréntesis envolventes: "(1SANI - X)" → "1SANI - X"
        const cleanName = name.replace(/^\(+/, '').replace(/\)+$/, '').trim();
        const s = normStr(cleanName);

        // 1. Exacto por nombre normalizado
        if (s && map.has(s)) return map.get(s);

        // 2. Formato "SALA CODIGO - NOMBRE_MAQUINA": buscar por la parte después del " - "
        if (cleanName.includes(' - ')) {
            const parts = cleanName.split(' - ');
            // Parte derecha (nombre de máquina real)
            const afterDash = normStr(parts.slice(1).join(' - '));
            // Último token de la parte izquierda (suele ser el código numérico)
            const beforeTokens = parts[0].trim().split(/\s+/);
            const codeToken = normStr(beforeTokens[beforeTokens.length - 1]);
            const beforeAll = normStr(parts[0]);

            if (afterDash && map.has(afterDash)) return map.get(afterDash);
            if (codeToken && map.has(codeToken)) return map.get(codeToken);
            if (beforeAll && map.has(beforeAll)) return map.get(beforeAll);
        }

        // 3. Fuzzy: alguna clave del mapa está contenida en el nombre o viceversa
        if (s.length >= 3) {
            for (const [key, id] of map.entries()) {
                if (key.length < 3) continue;
                if (s.includes(key) || key.includes(s)) return id;
            }
        }

        return null;
    };

    return { resolveMachine, machinesRaw };
};
