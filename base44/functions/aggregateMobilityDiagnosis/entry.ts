import { createClientFromRequest } from 'npm:@base44/sdk@0.8.52';
import {
  buscarMunicipio,
  distanciaLineaRecta,
  extraeCodigoPostal,
  municipioPorNombre,
  DISTANCIA_INTRAMUNICIPAL_KM,
  FACTOR_CARRETERA
} from '../../shared/mobilityGeo.ts';

const MAX_PAGINAS = 20;

export default async function (req: Request): Promise<Response> {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    if (String(user.role || '').toLowerCase() !== 'admin') {
      return Response.json({ error: 'Solo administración puede recalcular el diagnóstico' }, { status: 403 });
    }

    const body = await req.json().catch(() => ({}));
    const planId = String(body?.plan_id || '').trim();
    if (!planId) return Response.json({ error: 'plan_id requerido' }, { status: 400 });

    const plan = await base44.asServiceRole.entities.MobilityPlan.get(planId).catch(() => null);
    if (!plan) return Response.json({ error: 'Plan PMST no encontrado' }, { status: 404 });

    const centro = plan.work_center_id
      ? await base44.asServiceRole.entities.MobilityWorkCenter.get(plan.work_center_id).catch(() => null)
      : null;

    // ── 1. Plantilla en alta ──
    const empleados: any[] = [];
    let cursor: any = undefined;
    for (let pagina = 0; pagina < MAX_PAGINAS; pagina += 1) {
      const res = await base44.asServiceRole.entities.EmployeeMasterDatabase.filter(
        { estado_empleado: 'Alta' },
        { sort: '-created_date', limit: 500, fields: ['direccion', 'estado_empleado'], cursor }
      );
      empleados.push(...(res?.items || []));
      if (!res?.has_more) break;
      cursor = res.next_cursor;
    }

    const totalActivos = empleados.length;
    const domicilios = empleados
      .map((e) => String(e.direccion || '').trim())
      .filter((d) => d.length > 0);

    // ── 2. Código postal -> municipio, deducido de los propios domicilios ──
    const votosCp: Record<string, Record<string, number>> = {};
    for (const direccion of domicilios) {
      const municipio = municipioPorNombre(direccion);
      const cp = extraeCodigoPostal(direccion);
      if (!municipio || !cp) continue;
      const votos = votosCp[cp] || (votosCp[cp] = {});
      votos[municipio.nombre] = (votos[municipio.nombre] || 0) + 1;
    }
    const municipioPorCp = (cp: string): string => {
      const votos = votosCp[cp];
      if (!votos) return '';
      const orden = Object.entries(votos).sort((a, b) => b[1] - a[1]);
      return orden[0] ? orden[0][0] : '';
    };

    // ── 3. Clasificación por municipio y distancia estimada al centro ──
    const municipioCentro =
      municipioPorNombre(centro?.municipio || '') || buscarMunicipio(centro?.municipio || '');
    const latCentro = Number(centro?.latitud) || municipioCentro?.lat || 0;
    const lonCentro = Number(centro?.longitud) || municipioCentro?.lon || 0;

    const conteo: Record<string, number> = {};
    const cpsZona: Record<string, Set<string>> = {};
    const kmZona: Record<string, number | null> = {};
    let identificados = 0;
    let distanciaBase = 0;
    let sumaKm = 0;
    let bajo15 = 0;

    for (const direccion of domicilios) {
      const municipio = municipioPorNombre(direccion);
      const cp = extraeCodigoPostal(direccion);
      const zona = municipio?.nombre || municipioPorCp(cp);
      if (!zona) continue;

      identificados += 1;
      conteo[zona] = (conteo[zona] || 0) + 1;
      if (cp) {
        const set = cpsZona[zona] || (cpsZona[zona] = new Set<string>());
        set.add(cp);
      }

      if (kmZona[zona] === undefined) {
        const tabla = buscarMunicipio(zona);
        let km: number | null = null;
        if (tabla && latCentro && lonCentro) {
          km = municipioCentro && tabla.nombre === municipioCentro.nombre
            ? DISTANCIA_INTRAMUNICIPAL_KM
            : Math.round(distanciaLineaRecta(latCentro, lonCentro, tabla.lat, tabla.lon) * FACTOR_CARRETERA * 10) / 10;
        }
        kmZona[zona] = km;
      }

      const km = kmZona[zona];
      if (km != null) {
        distanciaBase += 1;
        sumaKm += km;
        if (km <= 15) bajo15 += 1;
      }
    }

    if (identificados === 0) {
      return Response.json(
        { error: 'No se ha podido identificar el municipio de origen de ningún domicilio. Revisa que la base maestra tenga direcciones cumplimentadas.' },
        { status: 422 }
      );
    }

    // ── 4. Agregados ──
    const pct = (parte: number) => Math.round((parte / identificados) * 1000) / 10;
    const zonasDetalle = Object.entries(conteo)
      .sort((a, b) => b[1] - a[1])
      .map(([zona, personas]) => ({
        zona,
        personas,
        porcentaje: pct(personas),
        km: kmZona[zona] ?? null,
        cp: Array.from(cpsZona[zona] || []).sort()
      }));

    const origenZonas = zonasDetalle.slice(0, 12).map((z) => ({ zona: z.zona, porcentaje: z.porcentaje }));
    const restoPersonas = zonasDetalle.slice(12).reduce((acc, z) => acc + z.personas, 0);
    if (restoPersonas > 0) origenZonas.push({ zona: 'Otros municipios', porcentaje: pct(restoPersonas) });

    const distanciaMedia = distanciaBase > 0 ? Math.round((sumaKm / distanciaBase) * 10) / 10 : null;
    const pctCercanos = distanciaBase > 0 ? Math.round((bajo15 / distanciaBase) * 100) : 0;
    const ahora = new Date();
    const fechaCorta = `${String(ahora.getDate()).padStart(2, '0')}/${String(ahora.getMonth() + 1).padStart(2, '0')}/${ahora.getFullYear()}`;

    const fuentesDatos = `Base maestra de empleados (agregado de ${fechaCorta}): ${totalActivos} personas en alta, ${domicilios.length} con domicilio registrado y ${identificados} con municipio de origen identificable (${Math.round((identificados / Math.max(totalActivos, 1)) * 100)}% de la plantilla). Datos agregados por municipio y código postal, sin direcciones completas ni datos identificativos.`;

    const primera = zonasDetalle[0];
    const segunda = zonasDetalle[1];
    const conclusiones: string[] = [];
    conclusiones.push(`El ${primera.porcentaje}% de los domicilios identificados (${primera.personas} personas) se sitúa en ${primera.zona}${segunda ? `, seguido de ${segunda.zona} (${segunda.personas} personas, ${segunda.porcentaje}%)` : ''}.`);
    conclusiones.push(`Se han identificado ${zonasDetalle.length} municipios de origen en el conjunto de la plantilla.`);
    if (distanciaMedia != null) {
      conclusiones.push(`La distancia media estimada de desplazamiento al centro es de ${distanciaMedia} km (calculada sobre ${distanciaBase} domicilios) y ${bajo15} personas (${pctCercanos}%) residen a 15 km o menos.`);
      conclusiones.push(pctCercanos >= 50
        ? 'La concentración de la plantilla en el entorno próximo al centro hace viables las medidas de movilidad activa, transporte colectivo y coche compartido.'
        : 'La dispersión de los domicilios obliga a combinar movilidad activa con transporte colectivo y medidas de flexibilidad horaria.');
    }
    conclusiones.push('El reparto modal por medio de transporte y las emisiones asociadas se completan con la encuesta anónima a la plantilla y se incorporarán a este diagnóstico al cerrarla.');

    const plazas = Number(plan?.alcance?.plazas_aparcamiento) || 0;
    const aparcamiento = plazas > 0
      ? `${plazas} plazas de aparcamiento registradas en el centro para ${totalActivos} personas en alta (${Math.round((plazas / Math.max(totalActivos, 1)) * 100) / 100} plazas por persona).`
      : undefined;

    const diagnostico = {
      ...(plan.diagnostico || {}),
      origen_zonas: origenZonas,
      zonas_detalle: zonasDetalle,
      ...(distanciaMedia != null ? { distancia_media_km: distanciaMedia } : {}),
      ...(aparcamiento ? { aparcamiento } : {}),
      fuentes_datos: fuentesDatos,
      conclusiones: conclusiones.join(' '),
      datos_plantilla: {
        generado_el: ahora.toISOString(),
        total_activos: totalActivos,
        con_domicilio: domicilios.length,
        identificados,
        sin_identificar: domicilios.length - identificados,
        sin_domicilio: totalActivos - domicilios.length,
        cobertura_pct: Math.round((identificados / Math.max(totalActivos, 1)) * 100),
        municipios_detectados: zonasDetalle.length,
        distancia_media_km: distanciaMedia,
        distancia_base_domicilios: distanciaBase,
        fuente: 'Base maestra de empleados (EmployeeMasterDatabase)',
        metodo: 'Agregación de los domicilios de la plantilla en alta por municipio y código postal. Distancia estimada desde el núcleo del municipio de residencia con un factor de corrección viaria de 1,25 y 3 km para el propio municipio del centro. Sin conservar direcciones completas.'
      }
    };

    return Response.json({ ok: true, diagnostico });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}