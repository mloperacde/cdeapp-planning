import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

declare const Deno: {
  serve: (handler: (req: Request) => Promise<Response> | Response) => void;
};

Deno.serve(async (req: Request) => {
  try {
    const base44 = createClientFromRequest(req);

    const user = await base44.auth.me();
    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }
    
    // 1. Obtener configuración actual de roles
    const configs = await base44.asServiceRole.entities.AppConfig.filter({ config_key: "roles_config" });
    
    if (configs.length === 0) {
        return Response.json({ error: "No roles_config found" });
    }

    const configRecord = configs[0];
    let rolesConfig = typeof configRecord.value === 'string' ? JSON.parse(configRecord.value) : configRecord.value;

    // 2. Asegurar que 'admin' tiene permisos para las nuevas páginas
    if (!rolesConfig.roles.admin.page_permissions) {
        rolesConfig.roles.admin.page_permissions = {};
    }

    // Conceder acceso explícito
    rolesConfig.roles.admin.page_permissions['/Breaks'] = true;
    rolesConfig.roles.admin.page_permissions['/BreaksDebug'] = true;

    // 3. Guardar cambios (Triple Write Strategy para seguridad)
    const jsonStr = JSON.stringify(rolesConfig);
    await base44.asServiceRole.entities.AppConfig.update(configRecord.id, {
        value: rolesConfig,      // JSON object for modern clients
        description: jsonStr,    // String backup
        app_subtitle: jsonStr    // Extra backup
    });

    return Response.json({ 
        success: true, 
        message: "Permissions granted for /Breaks and /BreaksDebug to admin role",
        updated_config: rolesConfig.roles.admin.page_permissions
    });

  } catch (error: any) {
    return Response.json({ success: false, error: error.message }, { status: 500 });
  }
});