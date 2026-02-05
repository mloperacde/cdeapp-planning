export const getMachineAlias = (machine) => {
    if (!machine) return '';
    
    // Optimization: If alias is already computed/stored, use it
    if (machine.alias) return machine.alias;
    
    // Handle various field names for compatibility across modules
    const sala = (machine.ubicacion || machine.room || machine.room_name || machine.sala || '').trim();
    const codigo = (machine.codigo_maquina || machine.codigo || machine.code || '').trim();
    const nombre = (machine.nombre || machine.name || machine.description || machine.machine_name || '').trim();
    const nombreCorto = (machine.nombre_maquina || '').trim();
    
    const parts = [sala, codigo].filter(Boolean);
    const prefix = parts.join(" ");
    
    let alias = nombre;
    if (prefix) {
        if (nombreCorto) {
            alias = `(${prefix} - ${nombreCorto})`;
        } else {
            const normalizedName = nombre.toLowerCase();
            const normalizedPrefix = prefix.toLowerCase();
            
            // Avoid redundancy if name already starts with prefix (e.g. "101 Machine" vs prefix "101")
            if (normalizedName.startsWith(normalizedPrefix)) {
                 alias = `(${nombre})`;
            } else {
                 alias = `(${prefix} - ${nombre})`;
            }
        }
    } else {
        // If no prefix (no sala/codigo), just wrap name in parens if desired, or leave as is?
        // Based on "Standardize machine identification ... using the (sala codigo - nombre) alias format"
        // If sala/codigo are missing, maybe just (nombre)? Or just nombre.
        // Let's stick to the logic from MachineMaster: just use nombre if no prefix, or (nombre) if we want consistency.
        // MachineMaster logic was: let alias = nombre; if (prefix) { ... }
        // So if no prefix, alias = nombre.
    }

    return alias || nombre;
};
