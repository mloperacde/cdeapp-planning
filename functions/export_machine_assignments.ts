import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';
import * as XLSX from 'npm:xlsx';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();

        if (!user) {
            return Response.json({ error: 'Unauthorized' }, { status: 401 });
        }

        // Fetch Data in parallel
        const [employees, machines, assignments, teamConfigs] = await Promise.all([
            base44.entities.EmployeeMasterDatabase.list('nombre', 1000),
            base44.entities.Machine.list('orden', 1000),
            base44.entities.MachineAssignment.list(),
            base44.entities.TeamConfig.list()
        ]);

        const workbook = XLSX.utils.book_new();

        // --- Sheet 1: Por Empleados ---
        const employeesData = employees
            .filter(e => e.departamento === 'FABRICACION')
            .map(e => {
                const row = {
                    "Nombre": e.nombre,
                    "Equipo": e.equipo || "",
                    "Puesto": e.puesto || "",
                    "Categoría": e.categoria || "",
                };
                
                for(let i=1; i<=10; i++) {
                    const machineId = e[`maquina_${i}`];
                    const machine = machineId ? machines.find(m => m.id === machineId) : null;
                    row[`Máquina ${i}`] = machine ? machine.nombre : "";
                }
                return row;
            });

        const wsEmployees = XLSX.utils.json_to_sheet(employeesData);
        XLSX.utils.book_append_sheet(workbook, wsEmployees, "Por Empleados");


        // --- Sheet 2: Por Máquinas (Habilidades) ---
        const machinesData = machines.map(m => {
            // Find employees with this machine assigned
            const staff = employees.filter(e => 
                e.departamento === 'FABRICACION' &&
                [1,2,3,4,5,6,7,8,9,10].some(i => e[`maquina_${i}`] === m.id)
            );

            // Group by Role
            const responsables = staff.filter(e => (e.puesto || "").toUpperCase().includes("RESPONSABLE")).map(e => e.nombre).join(", ");
            const segundas = staff.filter(e => (e.puesto || "").toUpperCase().includes("SEGUNDA") || (e.puesto || "").includes("2ª")).map(e => e.nombre).join(", ");
            const operarios = staff.filter(e => (e.puesto || "").toUpperCase().includes("OPERARI")).map(e => e.nombre).join(", ");

            return {
                "Máquina": m.nombre,
                "Código": m.codigo || "",
                "Responsables (Habilidad)": responsables,
                "Segundas (Habilidad)": segundas,
                "Operarios (Habilidad)": operarios
            };
        });

        const wsMachines = XLSX.utils.json_to_sheet(machinesData);
        XLSX.utils.book_append_sheet(workbook, wsMachines, "Por Máquinas");


        // --- Sheet 3: Asignación Ideal ---
        // Flatten assignments per machine per team
        const idealData = [];
        
        assignments.forEach(a => {
            const machine = machines.find(m => m.id === a.machine_id);
            const team = teamConfigs.find(t => t.team_key === a.team_key);
            
            if (!machine) return;

            const getName = (id) => {
                if (!id) return "";
                const e = employees.find(emp => emp.id === id);
                return e ? e.nombre : "Desconocido";
            };

            const row = {
                "Máquina": machine.nombre,
                "Equipo": team ? team.team_name : a.team_key,
                "Responsable Línea": Array.isArray(a.responsable_linea) ? getName(a.responsable_linea[0]) : getName(a.responsable_linea),
                "Segunda Línea": Array.isArray(a.segunda_linea) ? getName(a.segunda_linea[0]) : getName(a.segunda_linea),
            };

            for(let i=1; i<=8; i++) {
                row[`Operador ${i}`] = getName(a[`operador_${i}`]);
            }

            idealData.push(row);
        });

        // Sort ideal data by Team then Machine
        idealData.sort((a, b) => {
            if (a.Equipo !== b.Equipo) return a.Equipo.localeCompare(b.Equipo);
            return a["Máquina"].localeCompare(b["Máquina"]);
        });

        const wsIdeal = XLSX.utils.json_to_sheet(idealData);
        XLSX.utils.book_append_sheet(workbook, wsIdeal, "Asignación Ideal");

        // Generate Buffer and Convert to Base64
        const wbout = XLSX.write(workbook, { bookType: 'xlsx', type: 'base64' });

        return Response.json({ file_base64: wbout });

    } catch (error) {
        return Response.json({ error: error.message }, { status: 500 });
    }
});