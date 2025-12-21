import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    
    // Verify admin access
    const user = await base44.auth.me();
    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Unauthorized - Admin only' }, { status: 401 });
    }

    // Get all roles
    const allRoles = await base44.asServiceRole.entities.Role.list('code');
    
    // Group by code
    const rolesByCode = {};
    for (const role of allRoles) {
      if (!rolesByCode[role.code]) {
        rolesByCode[role.code] = [];
      }
      rolesByCode[role.code].push(role);
    }

    const deleted = [];
    
    // For each code that has duplicates, keep only the newest
    for (const [code, rolesGroup] of Object.entries(rolesByCode)) {
      if (rolesGroup.length > 1) {
        // Sort by created_date descending
        rolesGroup.sort((a, b) => new Date(b.created_date) - new Date(a.created_date));
        
        // Keep the first (newest), delete the rest
        for (let i = 1; i < rolesGroup.length; i++) {
          await base44.asServiceRole.entities.Role.delete(rolesGroup[i].id);
          deleted.push({
            code: rolesGroup[i].code,
            name: rolesGroup[i].name,
            id: rolesGroup[i].id
          });
        }
      }
    }

    return Response.json({ 
      success: true, 
      deleted: deleted.length,
      deletedRoles: deleted 
    });

  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});