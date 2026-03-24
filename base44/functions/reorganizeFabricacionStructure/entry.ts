import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();

        if (!user || user.role !== 'admin') {
            return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
        }

        const results = {
            departmentsUpdated: [],
            positionsCreated: [],
            positionsMoved: [],
            employeesMoved: [],
            departmentsDeleted: [],
            errors: []
        };

        // 1. Buscar departamentos actuales
        const allDepartments = await base44.asServiceRole.entities.Department.list();
        const allPositions = await base44.asServiceRole.entities.Position.list();
        const allEmployees = await base44.asServiceRole.entities.EmployeeMasterDatabase.list();

        const fabricacionDept = allDepartments.find(d => d.name === "FABRICACION");
        const produccionDepts = allDepartments.filter(d => d.name === "PRODUCCIÓN");
        const almacenDept = allDepartments.find(d => d.name === "ALMACEN");
        const mantenimientoDept = allDepartments.find(d => d.name === "MANTENIMIENTO");

        if (!fabricacionDept) {
            throw new Error("No se encontró el departamento FABRICACION");
        }

        // 2. Crear puesto "Director de Fabricación" en FABRICACION si no existe
        const directorPuesto = allPositions.find(p => 
            p.department_id === fabricacionDept.id && 
            p.name === "DIRECTOR DE FABRICACION"
        );

        if (!directorPuesto) {
            await base44.asServiceRole.entities.Position.create({
                name: "DIRECTOR DE FABRICACION",
                department_id: fabricacionDept.id,
                department_name: "FABRICACION",
                max_headcount: 1,
                level: "Director",
                orden: 0
            });
            results.positionsCreated.push("DIRECTOR DE FABRICACION en FABRICACION");
        }

        // 3. Unificar departamentos PRODUCCIÓN - usar el primero y eliminar duplicados
        let produccionDept = produccionDepts[0];
        
        if (produccionDepts.length > 1) {
            // Mover posiciones de los duplicados al primero
            for (let i = 1; i < produccionDepts.length; i++) {
                const duplicateDept = produccionDepts[i];
                const duplicatePositions = allPositions.filter(p => p.department_id === duplicateDept.id);
                
                for (const pos of duplicatePositions) {
                    // Verificar si ya existe en el departamento principal
                    const existsInMain = allPositions.find(p => 
                        p.department_id === produccionDept.id && 
                        p.name === pos.name
                    );
                    
                    if (!existsInMain) {
                        await base44.asServiceRole.entities.Position.update(pos.id, {
                            department_id: produccionDept.id,
                            department_name: "PRODUCCIÓN"
                        });
                        results.positionsMoved.push(`${pos.name} de dept duplicado a PRODUCCIÓN principal`);
                    }
                }
                
                // Eliminar departamento duplicado
                await base44.asServiceRole.entities.Department.delete(duplicateDept.id);
                results.departmentsDeleted.push(duplicateDept.id);
            }
        }

        // 4. Asegurar que PRODUCCIÓN sea subdepartamento de FABRICACION
        if (produccionDept.parent_id !== fabricacionDept.id) {
            await base44.asServiceRole.entities.Department.update(produccionDept.id, {
                parent_id: fabricacionDept.id,
                parent_name: "FABRICACION"
            });
            results.departmentsUpdated.push("PRODUCCIÓN ahora es subdepartamento de FABRICACION");
        }

        // 5. Asegurar que ALMACEN y MANTENIMIENTO sean subdepartamentos de FABRICACION
        if (almacenDept && almacenDept.parent_id !== fabricacionDept.id) {
            await base44.asServiceRole.entities.Department.update(almacenDept.id, {
                parent_id: fabricacionDept.id,
                parent_name: "FABRICACION"
            });
            results.departmentsUpdated.push("ALMACEN ahora es subdepartamento de FABRICACION");
        }

        if (mantenimientoDept && mantenimientoDept.parent_id !== fabricacionDept.id) {
            await base44.asServiceRole.entities.Department.update(mantenimientoDept.id, {
                parent_id: fabricacionDept.id,
                parent_name: "FABRICACION"
            });
            results.departmentsUpdated.push("MANTENIMIENTO ahora es subdepartamento de FABRICACION");
        }

        // 6. Crear puestos en PRODUCCIÓN si no existen
        const puestosProduccion = [
            { name: "RESPONSABLE DE LINEA", orden: 1, max_headcount: 30 },
            { name: "SEGUNDA DE LINEA", orden: 2, max_headcount: 35 },
            { name: "OPERARIA DE LINEA", orden: 3, max_headcount: 50 },
            { name: "TECNICO DE PROCESOS", orden: 4, max_headcount: 5 }
        ];

        for (const puesto of puestosProduccion) {
            const exists = allPositions.find(p => 
                p.department_id === produccionDept.id && 
                p.name === puesto.name
            );
            
            if (!exists) {
                await base44.asServiceRole.entities.Position.create({
                    name: puesto.name,
                    department_id: produccionDept.id,
                    department_name: "PRODUCCIÓN",
                    max_headcount: puesto.max_headcount,
                    level: "Mid",
                    orden: puesto.orden
                });
                results.positionsCreated.push(`${puesto.name} en PRODUCCIÓN`);
            }
        }

        // 7. Mover empleados de FABRICACION a PRODUCCIÓN (excepto Director de Fabricación)
        const fabricacionEmps = allEmployees.filter(e => 
            e.departamento === "FABRICACION" || e.departamento === "Fabricación"
        );

        for (const emp of fabricacionEmps) {
            if (emp.puesto !== "DIRECTOR DE FABRICACION" && emp.puesto !== "Director de Fabricación") {
                await base44.asServiceRole.entities.EmployeeMasterDatabase.update(emp.id, {
                    departamento: "PRODUCCIÓN"
                });
                results.employeesMoved.push(`${emp.nombre} (${emp.codigo_empleado})`);
            }
        }

        // 8. Mover posiciones de FABRICACION a PRODUCCIÓN (excepto Director)
        const fabricacionPositions = allPositions.filter(p => 
            p.department_id === fabricacionDept.id && 
            p.name !== "DIRECTOR DE FABRICACION"
        );

        for (const pos of fabricacionPositions) {
            // Ver si existe en producción
            const existsInProd = allPositions.find(p => 
                p.department_id === produccionDept.id && 
                p.name === pos.name
            );
            
            if (existsInProd) {
                // Eliminar el duplicado de fabricación
                await base44.asServiceRole.entities.Position.delete(pos.id);
                results.positionsMoved.push(`${pos.name} eliminado de FABRICACION (ya existe en PRODUCCIÓN)`);
            } else {
                // Mover a producción
                await base44.asServiceRole.entities.Position.update(pos.id, {
                    department_id: produccionDept.id,
                    department_name: "PRODUCCIÓN"
                });
                results.positionsMoved.push(`${pos.name} movido de FABRICACION a PRODUCCIÓN`);
            }
        }

        return Response.json({
            success: true,
            message: "Reorganización completada",
            summary: {
                departmentsUpdated: results.departmentsUpdated.length,
                positionsCreated: results.positionsCreated.length,
                positionsMoved: results.positionsMoved.length,
                employeesMoved: results.employeesMoved.length,
                departmentsDeleted: results.departmentsDeleted.length,
                errors: results.errors.length
            },
            details: results
        });

    } catch (error) {
        console.error('Error:', error);
        return Response.json({ 
            success: false,
            error: error.message,
            stack: error.stack
        }, { status: 500 });
    }
});