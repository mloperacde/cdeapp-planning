export const getMachineAlias = (machine) => {
    if (!machine) return '';

    const sala = (machine.ubicacion || machine.room_name || machine.sala || '').trim();
    const codigo = (machine.codigo_maquina || machine.codigo || machine.code || '').trim();
    const nombre = (machine.nombre || machine.name || machine.machine_name || '').trim();

    const prefix = [sala, codigo].filter(Boolean).join(' ');

    if (prefix && nombre) return `${prefix} - ${nombre}`;
    if (prefix) return prefix;
    return nombre;
};