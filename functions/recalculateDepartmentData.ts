import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();

        if (!user || user.role !== 'admin') {
            return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
        }

        // Fetch all departments
        const departments = await base44.asServiceRole.entities.Department.list();
        const employees = await base44.asServiceRole.entities.EmployeeMasterDatabase.list();

        const updates = [];
        
        // Update parent_name for all departments
        for (const dept of departments) {
            const updateData = {};
            let needsUpdate = false;

            // Set parent_name if has parent_id
            if (dept.parent_id) {
                const parent = departments.find(d => d.id === dept.parent_id);
                if (parent && dept.parent_name !== parent.name) {
                    updateData.parent_name = parent.name;
                    needsUpdate = true;
                }
            } else if (dept.parent_name) {
                // Clear parent_name if no parent_id
                updateData.parent_name = null;
                needsUpdate = true;
            }

            // Calculate total_employee_count recursively
            const calculateEmployeeCount = (deptId) => {
                const currentDept = departments.find(d => d.id === deptId);
                if (!currentDept) return 0;

                // Count direct employees
                const directCount = employees.filter(e => e.departamento === currentDept.name).length;

                // Count employees in child departments
                const children = departments.filter(d => d.parent_id === deptId);
                const childCount = children.reduce((sum, child) => sum + calculateEmployeeCount(child.id), 0);

                return directCount + childCount;
            };

            const totalCount = calculateEmployeeCount(dept.id);
            if (dept.total_employee_count !== totalCount) {
                updateData.total_employee_count = totalCount;
                needsUpdate = true;
            }

            if (needsUpdate) {
                updates.push({
                    id: dept.id,
                    name: dept.name,
                    data: updateData
                });
            }
        }

        // Execute updates
        const results = [];
        for (const update of updates) {
            const result = await base44.asServiceRole.entities.Department.update(update.id, update.data);
            results.push({
                department: update.name,
                updated: update.data
            });
        }

        return Response.json({
            success: true,
            message: `${results.length} departamentos actualizados`,
            departments_updated: results.length,
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