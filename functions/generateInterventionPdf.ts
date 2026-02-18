import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';
import { jsPDF } from 'npm:jspdf@2.5.1';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) {
      return Response.json({ error: 'No autorizado' }, { status: 401 });
    }

    const body = await req.json();
    const { intervention, sendEmail, recipients } = body;

    if (!intervention) {
      return Response.json({ error: 'Datos de intervención requeridos' }, { status: 400 });
    }

    // Generate PDF
    const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
    const pageW = 210;
    const margin = 15;
    const contentW = pageW - margin * 2;
    let y = 15;

    const addText = (text, x, yPos, options = {}) => {
      doc.setFontSize(options.size || 10);
      doc.setFont('helvetica', options.style || 'normal');
      if (options.color) doc.setTextColor(...options.color);
      else doc.setTextColor(30, 30, 30);
      doc.text(String(text || ''), x, yPos, options);
      return yPos;
    };

    const addLine = (yPos, color = [200, 200, 200]) => {
      doc.setDrawColor(...color);
      doc.setLineWidth(0.3);
      doc.line(margin, yPos, pageW - margin, yPos);
    };

    const checkNewPage = (currentY, needed = 20) => {
      if (currentY + needed > 275) {
        doc.addPage();
        return 15;
      }
      return currentY;
    };

    // ===== CABECERA =====
    doc.setFillColor(30, 64, 175);
    doc.rect(0, 0, pageW, 40, 'F');

    addText('ORDEN DE TRABAJO - INTERVENCIÓN', margin, 15, { size: 16, style: 'bold', color: [255, 255, 255] });
    addText(`Nº ${intervention.numero_orden || 'INT-' + (intervention.id || 'DRAFT').substring(0, 8).toUpperCase()}`, margin, 25, { size: 10, color: [180, 210, 255] });
    
    const fechaSolicitud = intervention.fecha_solicitud
      ? new Date(intervention.fecha_solicitud).toLocaleDateString('es-ES')
      : new Date().toLocaleDateString('es-ES');
    addText(`Fecha: ${fechaSolicitud}`, pageW - margin - 40, 20, { size: 9, color: [200, 220, 255] });

    // Estado badge
    const estadoColors = {
      'Pendiente': [234, 179, 8],
      'En Progreso': [59, 130, 246],
      'En Revisión': [168, 85, 247],
      'Completada': [34, 197, 94],
      'Cancelada': [239, 68, 68]
    };
    const estadoColor = estadoColors[intervention.estado] || [100, 100, 100];
    doc.setFillColor(...estadoColor);
    doc.roundedRect(pageW - margin - 35, 27, 35, 8, 2, 2, 'F');
    addText(intervention.estado || 'Pendiente', pageW - margin - 32, 33, { size: 8, style: 'bold', color: [255, 255, 255] });

    y = 50;

    // ===== SECCIÓN: INFORMACIÓN GENERAL =====
    doc.setFillColor(241, 245, 249);
    doc.rect(margin, y, contentW, 8, 'F');
    addText('INFORMACIÓN GENERAL', margin + 2, y + 5.5, { size: 9, style: 'bold', color: [30, 64, 175] });
    y += 12;

    // Título
    addText('Título:', margin, y, { size: 9, style: 'bold' });
    addText(intervention.titulo || '', margin + 25, y, { size: 9 });
    y += 6;

    // Tipo y Prioridad en columnas
    addText('Tipo:', margin, y, { size: 9, style: 'bold' });
    addText(intervention.tipo || '', margin + 25, y, { size: 9 });
    addText('Prioridad:', margin + 100, y, { size: 9, style: 'bold' });
    const prioColors = { 'Baja': [34, 197, 94], 'Media': [234, 179, 8], 'Alta': [249, 115, 22], 'Crítica': [239, 68, 68] };
    const prioColor = prioColors[intervention.prioridad] || [100, 100, 100];
    doc.setFillColor(...prioColor);
    doc.roundedRect(margin + 120, y - 4, 30, 6, 1, 1, 'F');
    addText(intervention.prioridad || '', margin + 122, y, { size: 8, style: 'bold', color: [255, 255, 255] });
    y += 8;

    // Fechas
    if (intervention.fecha_inicio_prevista || intervention.fecha_fin_prevista) {
      if (intervention.fecha_inicio_prevista) {
        addText('Inicio Previsto:', margin, y, { size: 9, style: 'bold' });
        addText(new Date(intervention.fecha_inicio_prevista).toLocaleDateString('es-ES'), margin + 35, y, { size: 9 });
      }
      if (intervention.fecha_fin_prevista) {
        addText('Fin Previsto:', margin + 90, y, { size: 9, style: 'bold' });
        addText(new Date(intervention.fecha_fin_prevista).toLocaleDateString('es-ES'), margin + 120, y, { size: 9 });
      }
      y += 8;
    }

    addLine(y);
    y += 6;

    // ===== SECCIÓN: SOLICITANTE =====
    doc.setFillColor(241, 245, 249);
    doc.rect(margin, y, contentW, 8, 'F');
    addText('SOLICITANTE', margin + 2, y + 5.5, { size: 9, style: 'bold', color: [30, 64, 175] });
    y += 12;

    addText('Nombre:', margin, y, { size: 9, style: 'bold' });
    addText(intervention.solicitante_nombre || user.full_name || '', margin + 25, y, { size: 9 });
    y += 6;

    if (intervention.solicitante_email) {
      addText('Email:', margin, y, { size: 9, style: 'bold' });
      addText(intervention.solicitante_email || '', margin + 25, y, { size: 9 });
      y += 6;
    }

    if (intervention.solicitante_departamento) {
      addText('Dpto.:', margin, y, { size: 9, style: 'bold' });
      addText(intervention.solicitante_departamento || '', margin + 25, y, { size: 9 });
      y += 6;
    }

    y += 4;
    addLine(y);
    y += 6;

    // ===== SECCIÓN: OBJETIVO =====
    doc.setFillColor(241, 245, 249);
    doc.rect(margin, y, contentW, 8, 'F');
    addText('OBJETIVO DE LA INTERVENCIÓN', margin + 2, y + 5.5, { size: 9, style: 'bold', color: [30, 64, 175] });
    y += 12;

    addText('Tipo Objetivo:', margin, y, { size: 9, style: 'bold' });
    addText(intervention.objetivo_tipo || '', margin + 35, y, { size: 9 });
    y += 6;

    if (intervention.objetivo_maquina_nombre) {
      addText('Máquina:', margin, y, { size: 9, style: 'bold' });
      addText(intervention.objetivo_maquina_nombre, margin + 25, y, { size: 9 });
      y += 6;
    }
    if (intervention.objetivo_area) {
      addText('Área:', margin, y, { size: 9, style: 'bold' });
      addText(intervention.objetivo_area, margin + 25, y, { size: 9 });
      y += 6;
    }
    if (intervention.objetivo_sala) {
      addText('Sala:', margin, y, { size: 9, style: 'bold' });
      addText(intervention.objetivo_sala, margin + 25, y, { size: 9 });
      y += 6;
    }
    if (intervention.objetivo_descripcion_manual) {
      addText('Descripción:', margin, y, { size: 9, style: 'bold' });
      const lines = doc.splitTextToSize(intervention.objetivo_descripcion_manual, contentW - 30);
      lines.forEach(line => {
        addText(line, margin + 30, y, { size: 9 });
        y += 5;
      });
    }

    y += 4;
    addLine(y);
    y += 6;

    // ===== SECCIÓN: DESCRIPCIÓN =====
    y = checkNewPage(y, 30);
    doc.setFillColor(241, 245, 249);
    doc.rect(margin, y, contentW, 8, 'F');
    addText('DESCRIPCIÓN DE LA INTERVENCIÓN', margin + 2, y + 5.5, { size: 9, style: 'bold', color: [30, 64, 175] });
    y += 12;

    const descLines = doc.splitTextToSize(intervention.descripcion || '', contentW);
    descLines.forEach(line => {
      y = checkNewPage(y, 6);
      addText(line, margin, y, { size: 9 });
      y += 5;
    });

    y += 4;
    addLine(y);
    y += 6;

    // ===== SECCIÓN: DESTINATARIOS =====
    if (intervention.destinatarios && intervention.destinatarios.length > 0) {
      y = checkNewPage(y, 30);
      doc.setFillColor(241, 245, 249);
      doc.rect(margin, y, contentW, 8, 'F');
      addText('DESTINATARIOS / RESPONSABLES', margin + 2, y + 5.5, { size: 9, style: 'bold', color: [30, 64, 175] });
      y += 12;

      intervention.destinatarios.forEach((dest, i) => {
        y = checkNewPage(y, 8);
        doc.setFillColor(i % 2 === 0 ? 248 : 255, i % 2 === 0 ? 250 : 255, i % 2 === 0 ? 252 : 255);
        doc.rect(margin, y - 4, contentW, 7, 'F');
        addText(`${i + 1}. ${dest.nombre || ''}`, margin + 2, y, { size: 9, style: 'bold' });
        addText(dest.email || '', margin + 80, y, { size: 9 });
        addText(dest.rol || '', margin + 140, y, { size: 9, color: [100, 116, 139] });
        y += 7;
      });

      y += 4;
      addLine(y);
      y += 6;
    }

    // ===== SECCIÓN: NECESIDADES =====
    if (intervention.necesidades && intervention.necesidades.length > 0) {
      y = checkNewPage(y, 40);
      doc.setFillColor(241, 245, 249);
      doc.rect(margin, y, contentW, 8, 'F');
      addText('RECURSOS Y NECESIDADES', margin + 2, y + 5.5, { size: 9, style: 'bold', color: [30, 64, 175] });
      y += 12;

      // Header table
      doc.setFillColor(30, 64, 175);
      doc.rect(margin, y - 4, contentW, 7, 'F');
      addText('Tipo', margin + 2, y, { size: 8, style: 'bold', color: [255, 255, 255] });
      addText('Descripción', margin + 35, y, { size: 8, style: 'bold', color: [255, 255, 255] });
      addText('Cantidad', margin + 120, y, { size: 8, style: 'bold', color: [255, 255, 255] });
      addText('Disponible', margin + 150, y, { size: 8, style: 'bold', color: [255, 255, 255] });
      y += 7;

      intervention.necesidades.forEach((nec, i) => {
        y = checkNewPage(y, 8);
        doc.setFillColor(i % 2 === 0 ? 248 : 255, i % 2 === 0 ? 250 : 255, i % 2 === 0 ? 252 : 255);
        doc.rect(margin, y - 4, contentW, 7, 'F');
        addText(nec.tipo || '', margin + 2, y, { size: 8 });
        const descNecLines = doc.splitTextToSize(nec.descripcion || '', 80);
        addText(descNecLines[0] || '', margin + 35, y, { size: 8 });
        addText(nec.cantidad || '-', margin + 120, y, { size: 8 });
        addText(nec.disponible ? '✓ Sí' : '✗ No', margin + 150, y, { size: 8, style: 'bold', color: nec.disponible ? [34, 197, 94] : [239, 68, 68] });
        y += 7;
      });

      y += 6;
      addLine(y);
      y += 6;
    }

    // ===== SECCIÓN: TABLA DE PROGRESO =====
    y = checkNewPage(y, 60);
    doc.setFillColor(241, 245, 249);
    doc.rect(margin, y, contentW, 8, 'F');
    addText('REGISTRO DE PROGRESO Y SEGUIMIENTO', margin + 2, y + 5.5, { size: 9, style: 'bold', color: [30, 64, 175] });
    y += 12;

    // Header
    doc.setFillColor(30, 64, 175);
    doc.rect(margin, y - 4, contentW, 7, 'F');
    addText('Fecha', margin + 2, y, { size: 8, style: 'bold', color: [255, 255, 255] });
    addText('Descripción del Progreso', margin + 32, y, { size: 8, style: 'bold', color: [255, 255, 255] });
    addText('%', margin + 130, y, { size: 8, style: 'bold', color: [255, 255, 255] });
    addText('Registrado por', margin + 145, y, { size: 8, style: 'bold', color: [255, 255, 255] });
    y += 7;

    const progressRows = (intervention.progreso && intervention.progreso.length > 0)
      ? intervention.progreso
      : [null, null, null, null]; // 4 filas vacías para rellenar

    progressRows.forEach((prog, i) => {
      y = checkNewPage(y, 10);
      const rowH = 10;
      doc.setFillColor(i % 2 === 0 ? 248 : 255, i % 2 === 0 ? 250 : 255, i % 2 === 0 ? 252 : 255);
      doc.rect(margin, y - 4, contentW, rowH, 'F');
      doc.setDrawColor(220, 220, 220);
      doc.setLineWidth(0.2);
      doc.rect(margin, y - 4, contentW, rowH);

      if (prog) {
        addText(prog.fecha ? new Date(prog.fecha).toLocaleDateString('es-ES') : '', margin + 2, y + 1, { size: 8 });
        const pDescLines = doc.splitTextToSize(prog.descripcion || '', 95);
        addText(pDescLines[0] || '', margin + 32, y + 1, { size: 8 });
        addText(prog.porcentaje != null ? `${prog.porcentaje}%` : '', margin + 130, y + 1, { size: 8 });
        addText(prog.registrado_por_nombre || prog.registrado_por || '', margin + 145, y + 1, { size: 8 });
      }
      y += rowH;
    });

    y += 8;

    // ===== SECCIÓN: CONFIRMACIÓN Y FIRMA =====
    y = checkNewPage(y, 60);
    doc.setFillColor(241, 245, 249);
    doc.rect(margin, y, contentW, 8, 'F');
    addText('CONFIRMACIÓN Y CIERRE DE INTERVENCIÓN', margin + 2, y + 5.5, { size: 9, style: 'bold', color: [30, 64, 175] });
    y += 12;

    // Resolution block
    if (intervention.resolucion?.descripcion) {
      addText('Detalles de Resolución:', margin, y, { size: 9, style: 'bold' });
      y += 5;
      const resLines = doc.splitTextToSize(intervention.resolucion.descripcion, contentW);
      resLines.forEach(line => {
        y = checkNewPage(y, 6);
        addText(line, margin, y, { size: 9 });
        y += 5;
      });
      y += 4;
    }

    // Resultado field
    addText('Resultado Final:', margin, y, { size: 9, style: 'bold' });
    doc.setDrawColor(30, 64, 175);
    doc.setLineWidth(0.3);
    doc.rect(margin + 35, y - 4, 80, 8);
    if (intervention.resolucion?.satisfactorio !== undefined) {
      addText(intervention.resolucion.satisfactorio ? '✓ Satisfactorio' : '✗ No Satisfactorio', margin + 37, y, { size: 9, style: 'bold', color: intervention.resolucion.satisfactorio ? [34, 197, 94] : [239, 68, 68] });
    }
    y += 12;

    // Signature blocks
    const sigW = (contentW - 10) / 2;
    // Solicitante
    doc.setDrawColor(30, 64, 175);
    doc.setLineWidth(0.3);
    doc.rect(margin, y, sigW, 30);
    addText('SOLICITANTE', margin + sigW / 2, y + 5, { size: 8, style: 'bold', color: [30, 64, 175], align: 'center' });
    addText('Nombre:', margin + 2, y + 12, { size: 8 });
    addText(intervention.solicitante_nombre || '', margin + 20, y + 12, { size: 8 });
    doc.line(margin + 2, y + 23, margin + sigW - 2, y + 23);
    addText('Firma y Fecha', margin + sigW / 2, y + 28, { size: 7, color: [150, 150, 150], align: 'center' });

    // Responsable
    doc.rect(margin + sigW + 10, y, sigW, 30);
    addText('RESPONSABLE / EJECUTOR', margin + sigW + 10 + sigW / 2, y + 5, { size: 8, style: 'bold', color: [30, 64, 175], align: 'center' });
    const respNombre = intervention.resolucion?.firmado_por_nombre || (intervention.destinatarios?.[0]?.nombre || '');
    addText('Nombre:', margin + sigW + 12, y + 12, { size: 8 });
    addText(respNombre, margin + sigW + 30, y + 12, { size: 8 });
    doc.line(margin + sigW + 12, y + 23, margin + contentW - 2, y + 23);
    addText('Firma y Fecha', margin + sigW + 10 + sigW / 2, y + 28, { size: 7, color: [150, 150, 150], align: 'center' });

    y += 38;

    // Footer
    doc.setFillColor(30, 64, 175);
    doc.rect(0, 285, pageW, 12, 'F');
    addText(`Orden de Trabajo generada el ${new Date().toLocaleDateString('es-ES')} - Sistema de Gestión CDE PlanApp`, pageW / 2, 292, { size: 7, color: [200, 220, 255], align: 'center' });

    const pdfOutput = doc.output('arraybuffer');

    // Send email if requested
    if (sendEmail && recipients && recipients.length > 0) {
      const interventionRef = intervention.numero_orden || `INT-${(intervention.id || 'DRAFT').substring(0, 8).toUpperCase()}`;
      
      for (const recipient of recipients) {
        if (recipient.email) {
          try {
            await base44.asServiceRole.integrations.Core.SendEmail({
              to: recipient.email,
              subject: `Orden de Trabajo: ${intervention.titulo} [${interventionRef}]`,
              body: `
<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #e2e8f0; border-radius: 8px; overflow: hidden;">
  <div style="background: #1e40af; padding: 24px; color: white;">
    <h1 style="margin: 0; font-size: 20px;">Orden de Trabajo - Intervención de Mantenimiento</h1>
    <p style="margin: 8px 0 0; opacity: 0.8; font-size: 14px;">${interventionRef}</p>
  </div>
  <div style="padding: 24px;">
    <p style="color: #374151;">Estimado/a <strong>${recipient.nombre || recipient.email}</strong>,</p>
    <p style="color: #374151;">Se le ha asignado la siguiente intervención de mantenimiento:</p>
    
    <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 6px; padding: 16px; margin: 16px 0;">
      <table style="width: 100%; border-collapse: collapse;">
        <tr><td style="font-weight: bold; color: #1e40af; padding: 4px 8px 4px 0; width: 140px;">Título:</td><td style="color: #374151;">${intervention.titulo}</td></tr>
        <tr><td style="font-weight: bold; color: #1e40af; padding: 4px 8px 4px 0;">Tipo:</td><td style="color: #374151;">${intervention.tipo}</td></tr>
        <tr><td style="font-weight: bold; color: #1e40af; padding: 4px 8px 4px 0;">Prioridad:</td><td style="color: #374151;">${intervention.prioridad}</td></tr>
        <tr><td style="font-weight: bold; color: #1e40af; padding: 4px 8px 4px 0;">Estado:</td><td style="color: #374151;">${intervention.estado}</td></tr>
        <tr><td style="font-weight: bold; color: #1e40af; padding: 4px 8px 4px 0;">Solicitante:</td><td style="color: #374151;">${intervention.solicitante_nombre || ''}</td></tr>
        ${intervention.fecha_inicio_prevista ? `<tr><td style="font-weight: bold; color: #1e40af; padding: 4px 8px 4px 0;">Inicio Previsto:</td><td style="color: #374151;">${new Date(intervention.fecha_inicio_prevista).toLocaleDateString('es-ES')}</td></tr>` : ''}
      </table>
    </div>
    
    <div style="margin: 16px 0;">
      <p style="font-weight: bold; color: #1e40af; margin-bottom: 8px;">Descripción:</p>
      <p style="color: #374151; background: #f8fafc; padding: 12px; border-radius: 4px; border-left: 3px solid #1e40af;">${intervention.descripcion}</p>
    </div>
    
    <p style="color: #374151;">Se adjunta la orden de trabajo en formato PDF para su impresión y seguimiento.</p>
    
    <div style="background: #fef3c7; border: 1px solid #f59e0b; border-radius: 6px; padding: 12px; margin: 16px 0;">
      <p style="color: #92400e; margin: 0; font-size: 14px;">⚠️ Por favor, confirme la recepción de esta orden y mantenga actualizado el estado de la intervención en el sistema.</p>
    </div>
  </div>
  <div style="background: #f8fafc; padding: 16px; text-align: center; color: #6b7280; font-size: 12px; border-top: 1px solid #e2e8f0;">
    CDE PlanApp - Sistema de Gestión de Mantenimiento
  </div>
</div>
              `
            });
          } catch (emailErr) {
            console.error(`Error enviando email a ${recipient.email}:`, emailErr);
          }
        }
      }
    }

    return new Response(pdfOutput, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="OT-${intervention.numero_orden || intervention.id || 'draft'}.pdf"`
      }
    });

  } catch (error) {
    console.error('Error generando PDF:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});