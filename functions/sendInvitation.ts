import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    
    const user = await base44.auth.me();
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { email, nombre_completo, role_id, employee_id, plataformas_habilitadas, notas } = await req.json();

    if (!email || !nombre_completo || !role_id) {
      return Response.json({ error: 'Email, nombre y rol son requeridos' }, { status: 400 });
    }

    // Generar token único
    const invitation_token = crypto.randomUUID();
    
    // Expiración: 7 días
    const token_expiration = new Date();
    token_expiration.setDate(token_expiration.getDate() + 7);

    // Obtener nombre del rol
    const roles = await base44.asServiceRole.entities.UserRole.list();
    const role = roles.find(r => r.id === role_id);
    const role_name = role?.role_name || role?.name || 'Usuario';

    // Crear invitación
    const invitation = await base44.asServiceRole.entities.UserInvitation.create({
      email,
      nombre_completo,
      role_id,
      role_name,
      employee_id: employee_id || null,
      plataformas_habilitadas: plataformas_habilitadas || ['web'],
      invitation_token,
      token_expiration: token_expiration.toISOString(),
      estado: 'Pendiente',
      invited_by: user.email,
      invited_by_name: user.full_name,
      notas: notas || '',
      invitation_link: `${new URL(req.url).origin}/accept-invitation?token=${invitation_token}`
    });

    // Enviar email
    const platformText = (plataformas_habilitadas || ['web']).includes('movil') 
      ? 'aplicación web y móvil' 
      : 'aplicación web';

    await base44.asServiceRole.integrations.Core.SendEmail({
      from_name: 'CdeApp Planning',
      to: email,
      subject: `Invitación a CdeApp Planning - ${role_name}`,
      body: `
Hola ${nombre_completo},

Has sido invitado/a a acceder a CdeApp Planning con el rol de ${role_name}.

Para aceptar la invitación y crear tu cuenta, haz clic en el siguiente enlace:

${invitation.invitation_link}

Este enlace es válido hasta el ${new Date(token_expiration).toLocaleDateString('es-ES')}.

Podrás acceder desde: ${platformText}

Invitado por: ${user.full_name} (${user.email})

Saludos,
Equipo CdeApp Planning
      `
    });

    return Response.json({
      success: true,
      invitation_id: invitation.id,
      invitation_link: invitation.invitation_link,
      token: invitation_token
    });

  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});