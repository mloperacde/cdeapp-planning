export const getMachineAlias = (machine) => {
    if (!machine) return '';
    
    if (machine.alias) return machine.alias;
    
    const sala = (machine.ubicacion || machine.room || machine.room_name || machine.sala || '').trim();
    const codigo = (machine.codigo_maquina || machine.codigo || machine.code || '').trim();
    const nombre = (machine.nombre || machine.name || machine.description || machine.machine_name || '').trim();
    const nombreCorto = (machine.nombre_maquina || '').trim();
    
    const parts = [sala, codigo].filter(Boolean);
    const prefix = parts.join(" ");

    const compactName = nombre || nombreCorto;

    // Si ya tiene el formato final esperado (sin paréntesis), devolver tal cual
    if (compactName && /^\w/.test(compactName) && compactName.includes(' - ') && !sala && !codigo) {
        return compactName;
    }

    if (!prefix && compactName) {
        return compactName;
    }

    if (!prefix) {
        return nombre || nombreCorto || '';
    }

    const baseName = nombreCorto || nombre;
    if (!baseName) {
        return prefix;
    }

    return `${prefix} - ${baseName}`;
};