import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Obtener todos los empleados
    const employees = await base44.asServiceRole.entities.Employee.list();
    
    // Obtener datos de referencia
    const teams = await base44.asServiceRole.entities.TeamConfig.list();
    const lockerConfigs = await base44.asServiceRole.entities.LockerRoomConfig.list();
    const machines = await base44.asServiceRole.entities.Machine.list();
    const masterEmployees = await base44.asServiceRole.entities.EmployeeMasterDatabase.list();

    let updatedCount = 0;
    let errors = [];

    // Departamentos y puestos por defecto según categoría
    const departmentsByCategory = {
      '1': { departamento: 'PRODUCCIÓN', puesto: 'Operario/a de Producción' },
      '2': { departamento: 'PRODUCCIÓN', puesto: 'Segunda de Línea' },
      '3': { departamento: 'PRODUCCIÓN', puesto: 'Responsable de Línea' },
      '4': { departamento: 'PRODUCCIÓN', puesto: 'Operario/a de Producción' },
    };

    for (const employee of employees) {
      try {
        const updates = {};
        let needsUpdate = false;

        // Buscar en base maestra
        let masterData = null;
        if (employee.codigo_empleado) {
          const masterResults = await base44.asServiceRole.entities.EmployeeMasterDatabase.filter({
            codigo_empleado: employee.codigo_empleado
          });
          masterData = masterResults[0];
        }

        // 1. COMPLETAR DEPARTAMENTO Y PUESTO
        if (!employee.departamento || !employee.puesto) {
          const categoryInfo = departmentsByCategory[employee.categoria] || departmentsByCategory['1'];
          if (!employee.departamento) {
            updates.departamento = categoryInfo.departamento;
            needsUpdate = true;
          }
          if (!employee.puesto) {
            updates.puesto = categoryInfo.puesto;
            needsUpdate = true;
          }
        }

        // 2. ASIGNAR EQUIPO si es rotativo
        if (!employee.equipo && employee.tipo_turno === 'Rotativo' && teams.length > 0) {
          // Distribuir equitativamente entre equipos
          const teamIndex = updatedCount % teams.length;
          updates.equipo = teams[teamIndex].team_name;
          needsUpdate = true;
        }

        // 3. ASIGNAR VESTUARIO Y TAQUILLA
        if (!employee.taquilla_vestuario || !employee.taquilla_numero) {
          const isFemale = employee.sexo === 'Femenino';
          
          // Determinar vestuario
          let vestuario;
          if (isFemale) {
            // Asignar aleatoriamente entre planta baja y alta
            vestuario = Math.random() > 0.7 
              ? 'Vestuario Femenino Planta Baja'
              : 'Vestuario Femenino Planta Alta';
          } else {
            vestuario = 'Vestuario Masculino Planta Baja';
          }
          
          if (!employee.taquilla_vestuario) {
            updates.taquilla_vestuario = vestuario;
            needsUpdate = true;
          }

          // Asignar número de taquilla disponible
          if (!employee.taquilla_numero) {
            const lockerConfig = lockerConfigs.find(lc => lc.vestuario === vestuario);
            if (lockerConfig && lockerConfig.identificadores_taquillas?.length > 0) {
              // Obtener taquillas ya asignadas
              const assignedLockers = employees
                .filter(e => e.taquilla_vestuario === vestuario && e.taquilla_numero)
                .map(e => e.taquilla_numero);
              
              // Buscar primera disponible
              const availableLocker = lockerConfig.identificadores_taquillas
                .find(num => !assignedLockers.includes(num));
              
              if (availableLocker) {
                updates.taquilla_numero = availableLocker;
                needsUpdate = true;
              }
            }
          }
        }

        // 4. NORMALIZAR FECHAS (convertir dd/mm/yyyy a yyyy-mm-dd)
        const dateFields = ['fecha_nacimiento', 'fecha_alta', 'fecha_fin_contrato', 'fecha_baja'];
        for (const field of dateFields) {
          if (employee[field] && typeof employee[field] === 'string' && employee[field].includes('/')) {
            const parts = employee[field].split('/');
            if (parts.length === 3) {
              const [day, month, year] = parts;
              updates[field] = `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
              needsUpdate = true;
            }
          }
        }

        // 5. COMPLETAR NACIONALIDAD SI ESTÁ COMO ID
        if (employee.nacionalidad && employee.nacionalidad.length === 24 && employee.nacionalidad.match(/^[0-9a-f]{24}$/)) {
          // Es un ID, convertir a texto
          const commonNationalities = {
            'e8': 'Española',
            'e7': 'Búlgara',
            'e9': 'Rumana',
            'f3': 'Venezolana',
            'f4': 'Venezolana',
            'f5': 'Venezolana',
            'f6': 'Búlgara',
          };
          
          const lastChars = employee.nacionalidad.slice(-2);
          const nationality = commonNationalities[lastChars] || 'Española';
          updates.nacionalidad = nationality;
          needsUpdate = true;
        }

        // 6. ASIGNAR MÁQUINAS DISPONIBLES si no tiene ninguna
        const hasMachines = [1,2,3,4,5,6,7,8,9,10].some(i => employee[`maquina_${i}`]);
        if (!hasMachines && employee.departamento === 'PRODUCCIÓN' && machines.length > 0) {
          // Asignar 2-3 máquinas aleatorias
          const availableMachines = machines.filter(m => m.estado !== 'No disponible');
          const numMachines = Math.min(3, availableMachines.length);
          
          for (let i = 0; i < numMachines; i++) {
            const randomIndex = Math.floor(Math.random() * availableMachines.length);
            updates[`maquina_${i + 1}`] = availableMachines[randomIndex].id;
          }
          needsUpdate = true;
        }

        // 7. DATOS DESDE MASTER DATABASE
        if (masterData) {
          if (masterData.direccion && !employee.direccion) {
            updates.direccion = masterData.direccion;
            needsUpdate = true;
          }
          if (masterData.formacion && !employee.formacion) {
            updates.formacion = masterData.formacion;
            needsUpdate = true;
          }
          if (masterData.contacto_emergencia_nombre && !employee.contacto_emergencia_nombre) {
            updates.contacto_emergencia_nombre = masterData.contacto_emergencia_nombre;
            needsUpdate = true;
          }
          if (masterData.contacto_emergencia_telefono && !employee.contacto_emergencia_telefono) {
            updates.contacto_emergencia_telefono = masterData.contacto_emergencia_telefono;
            needsUpdate = true;
          }
        }

        // 8. COMPLETAR HORARIOS ESTÁNDAR si faltan
        if (!employee.horario_manana_inicio && employee.tipo_jornada === 'Jornada Completa') {
          updates.horario_manana_inicio = '07:00';
          updates.horario_manana_fin = '15:00';
          updates.horario_tarde_inicio = '14:00';
          updates.horario_tarde_fin = '22:00';
          needsUpdate = true;
        }

        // Actualizar si hay cambios
        if (needsUpdate && Object.keys(updates).length > 0) {
          await base44.asServiceRole.entities.Employee.update(employee.id, updates);
          updatedCount++;
        }

      } catch (error) {
        errors.push({
          employee: employee.nombre,
          error: error.message
        });
      }
    }

    return Response.json({
      success: true,
      message: `✅ Completado: ${updatedCount} empleados actualizados`,
      total_employees: employees.length,
      updated: updatedCount,
      errors: errors.length,
      error_details: errors
    });

  } catch (error) {
    return Response.json({
      success: false,
      error: error.message
    }, { status: 500 });
  }
});