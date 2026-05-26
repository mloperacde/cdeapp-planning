import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

/**
 * Detecta actividades sugeridas para un artículo basándose en:
 * 1. Sus componentes (materias primas)
 * 2. El historial de aprendizaje (ProcessLearningLog)
 * 3. Artículos similares ya configurados
 * Usa IA (InvokeLLM) para análisis inteligente.
 */
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json();
    const { article_id, article_code, article_name, article_type, action } = body;

    // === ACCIÓN: salvar corrección manual para aprendizaje ===
    if (action === 'save_correction') {
      const { suggested_activities, final_activities, components_snapshot, process_code, total_time_seconds } = body;
      
      const corrections = [];
      const suggestedSet = new Set(suggested_activities || []);
      const finalSet = new Set(final_activities || []);
      
      for (const id of finalSet) {
        if (!suggestedSet.has(id)) corrections.push({ action: 'added', activity_id: id });
      }
      for (const id of suggestedSet) {
        if (!finalSet.has(id)) corrections.push({ action: 'removed', activity_id: id });
      }

      // Buscar log existente para este artículo
      const existing = await base44.asServiceRole.entities.ProcessLearningLog.filter({ article_id });
      
      if (existing?.length > 0) {
        await base44.asServiceRole.entities.ProcessLearningLog.update(existing[0].id, {
          final_activities,
          corrections_made: corrections,
          process_code,
          total_time_seconds,
          reviewed_by: user.email,
          review_date: new Date().toISOString(),
          status: 'reviewed'
        });
      } else {
        await base44.asServiceRole.entities.ProcessLearningLog.create({
          article_id,
          article_code,
          article_name,
          article_type,
          components_snapshot,
          suggested_activities: suggested_activities || [],
          final_activities,
          corrections_made: corrections,
          process_code,
          total_time_seconds,
          reviewed_by: user.email,
          review_date: new Date().toISOString(),
          status: 'reviewed',
          confidence_score: 1.0
        });
      }

      return Response.json({ success: true, corrections_count: corrections.length });
    }

    // === ACCIÓN: detectar actividades sugeridas ===
    if (!article_id && !article_code) {
      return Response.json({ error: 'article_id or article_code required' }, { status: 400 });
    }

    // 1. Obtener componentes del artículo
    let components = [];
    if (body.components) {
      components = body.components;
    } else {
      const cdeId = body.article_cde_id;
      if (cdeId) {
        components = await base44.asServiceRole.entities.ArticleComponent.filter({ article_cde_id: Number(cdeId) });
      }
    }

    // 2. Obtener todas las actividades definidas
    const allActivities = await base44.asServiceRole.entities.Activity.filter({ active: true });

    // 3. Buscar artículos similares en el historial de aprendizaje
    const learningLogs = await base44.asServiceRole.entities.ProcessLearningLog.list('-review_date', 200);
    const reviewedLogs = (learningLogs || []).filter(l => l.status === 'reviewed' && l.final_activities?.length > 0);

    // 4. Buscar artículos con configuración similar (mismo tipo o proceso parecido)
    let similarArticles = [];
    if (article_type) {
      const articlesOfType = await base44.asServiceRole.entities.Article.filter({ type: article_type });
      // Filtrar los que tengan actividades asignadas
      similarArticles = (articlesOfType || []).filter(a => a.selected_activities?.length > 0);
    }

    // 5. Análisis por reglas simples (coincidencia de keywords en componentes)
    const ruleBasedSuggestions = [];
    const componentNames = components.map(c => (c.name_component || '').toLowerCase());
    const componentCodes = components.map(c => (c.code_component || '').toUpperCase());

    for (const activity of allActivities) {
      let matched = false;
      
      // Chequear keywords en nombres de componentes
      if (activity.component_keywords?.length > 0) {
        for (const kw of activity.component_keywords) {
          if (componentNames.some(cn => cn.includes(kw.toLowerCase()))) {
            matched = true;
            break;
          }
        }
      }
      
      // Chequear patrones de código de componente
      if (!matched && activity.component_code_patterns?.length > 0) {
        for (const pattern of activity.component_code_patterns) {
          if (componentCodes.some(cc => cc.startsWith(pattern.toUpperCase()))) {
            matched = true;
            break;
          }
        }
      }
      
      if (matched) ruleBasedSuggestions.push(activity.id);
    }

    // 6. Invocar IA para análisis inteligente
    const componentsList = components.map(c => `- ${c.code_component}: ${c.name_component}`).join('\n');
    const activitiesList = allActivities.map(a => 
      `- ID:${a.id} | "${a.name}" | Tipo:${a.type} | ${a.interactions_per_minute} uds/min | Keywords:[${(a.component_keywords||[]).join(',')}]`
    ).join('\n');
    
    const similarExamples = reviewedLogs.slice(0, 10).map(l => 
      `Artículo "${l.article_name}" (tipo: ${l.article_type}): actividades finales [${(l.final_activities||[]).join(',')}]`
    ).join('\n');

    const similarByType = similarArticles.slice(0, 5).map(a =>
      `"${a.name}" (${a.type}): actividades [${(a.selected_activities||[]).join(',')}]`
    ).join('\n');

    const aiPrompt = `Eres un experto en procesos de fabricación y envasado industrial. 
    
Artículo a analizar:
- Código: ${article_code}
- Nombre: ${article_name}
- Tipo: ${article_type || 'desconocido'}

Componentes (materias primas) del artículo:
${componentsList || 'No hay componentes disponibles'}

Actividades disponibles en el sistema:
${activitiesList || 'No hay actividades definidas'}

Ejemplos de artículos similares ya configurados (historial aprendizaje):
${similarExamples || 'Sin ejemplos previos'}

Artículos del mismo tipo ya configurados:
${similarByType || 'Ninguno'}

TAREA: Basándote en los componentes del artículo, determina qué actividades son necesarias para su proceso de envasado/acondicionamiento. 

REGLAS:
1. Si hay un ESTUCHE → necesita: alimentar estuche, montar estuche, introducir producto en estuche, cerrar estuche
2. Si hay ETIQUETA → necesita: colocar etiqueta
3. Si hay TAPA o TAPÓN → necesita: alimentar tapones, taponado
4. Si hay ENVASE (frasco, bote, tubo) → necesita: alimentar envases vacíos, llenado
5. Si hay CAJA → necesita: caja grupo primaria, caja grupo secundaria, etiqueta de caja
6. Siempre incluir: loteado y etiqueta de palé si hay caja

Responde SOLO con JSON válido:
{
  "suggested_activity_ids": ["id1", "id2", ...],
  "confidence": 0.85,
  "reasoning": "Explicación breve",
  "similar_article_match": "nombre del artículo más similar si lo hay o null",
  "process_pattern": "descripción del patrón detectado"
}`;

    let aiResult = { suggested_activity_ids: ruleBasedSuggestions, confidence: 0.5, reasoning: 'Detección por reglas', similar_article_match: null, process_pattern: 'Detección automática por reglas' };
    
    try {
      const aiResponse = await base44.asServiceRole.integrations.Core.InvokeLLM({
        prompt: aiPrompt,
        response_json_schema: {
          type: "object",
          properties: {
            suggested_activity_ids: { type: "array", items: { type: "string" } },
            confidence: { type: "number" },
            reasoning: { type: "string" },
            similar_article_match: { type: "string" },
            process_pattern: { type: "string" }
          }
        }
      });
      if (aiResponse?.suggested_activity_ids) {
        aiResult = aiResponse;
      }
    } catch (aiErr) {
      console.warn('AI analysis failed, using rule-based:', aiErr.message);
    }

    // 7. Calcular velocidad estimada del proceso
    const suggestedActivities = allActivities.filter(a => aiResult.suggested_activity_ids.includes(a.id));
    const speedEstimation = calculateProcessSpeed(suggestedActivities);

    // 8. Detectar artículos con proceso idéntico/similar
    const identicalArticles = findSimilarArticles(aiResult.suggested_activity_ids, reviewedLogs, similarArticles);

    // 9. Guardar log de sugerencia (sin revisión aún)
    const existingLog = await base44.asServiceRole.entities.ProcessLearningLog.filter({ article_id });
    if (!existingLog?.length) {
      await base44.asServiceRole.entities.ProcessLearningLog.create({
        article_id,
        article_code,
        article_name,
        article_type,
        components_snapshot: components,
        suggested_activities: aiResult.suggested_activity_ids,
        confidence_score: aiResult.confidence,
        similar_article_ids: identicalArticles.map(a => a.id || a.article_id),
        status: 'pending_review'
      });
    }

    return Response.json({
      suggested_activity_ids: aiResult.suggested_activity_ids,
      suggested_activities: suggestedActivities,
      confidence: aiResult.confidence,
      reasoning: aiResult.reasoning,
      process_pattern: aiResult.process_pattern,
      similar_article_match: aiResult.similar_article_match,
      similar_articles: identicalArticles,
      speed_estimation: speedEstimation,
      components_analyzed: components.length,
      rule_based_count: ruleBasedSuggestions.length
    });

  } catch (error) {
    console.error('detectActivitySuggestions error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});

function calculateProcessSpeed(activities) {
  if (!activities.length) return { uds_per_minute: 0, bottleneck: null, total_time_seconds: 0 };
  
  // La velocidad del proceso está limitada por el cuello de botella (actividad más lenta)
  let bottleneck = null;
  let minSpeed = Infinity;
  let totalTime = 0;

  for (const act of activities) {
    const speed = act.interactions_per_minute || 0;
    const timePerUnit = act.time_seconds || (speed > 0 ? 60 / speed : 0);
    totalTime += timePerUnit;
    
    if (speed > 0 && speed < minSpeed) {
      minSpeed = speed;
      bottleneck = { id: act.id, name: act.name, interactions_per_minute: speed };
    }
  }

  return {
    uds_per_minute: minSpeed === Infinity ? 0 : minSpeed,
    bottleneck,
    total_time_seconds: totalTime,
    activities_count: activities.length
  };
}

function findSimilarArticles(suggestedIds, learningLogs, configuredArticles) {
  const suggestedSet = new Set(suggestedIds);
  const similar = [];

  // Buscar en historial de aprendizaje
  for (const log of learningLogs) {
    const logSet = new Set(log.final_activities || []);
    if (logSet.size === 0) continue;
    
    const intersection = [...suggestedSet].filter(id => logSet.has(id));
    const union = new Set([...suggestedSet, ...logSet]);
    const similarity = intersection.length / union.size;
    
    if (similarity >= 0.7) {
      similar.push({
        article_id: log.article_id,
        article_code: log.article_code,
        article_name: log.article_name,
        similarity_score: similarity,
        matching_activities: intersection.length,
        source: 'learning_log'
      });
    }
  }

  // Buscar en artículos configurados directamente
  for (const article of configuredArticles) {
    const artSet = new Set(article.selected_activities || []);
    if (artSet.size === 0) continue;
    
    const intersection = [...suggestedSet].filter(id => artSet.has(id));
    const union = new Set([...suggestedSet, ...artSet]);
    const similarity = intersection.length / union.size;
    
    if (similarity >= 0.7 && !similar.find(s => s.article_id === article.id)) {
      similar.push({
        article_id: article.id,
        article_code: article.code,
        article_name: article.name,
        similarity_score: similarity,
        matching_activities: intersection.length,
        source: 'configured_article'
      });
    }
  }

  return similar.sort((a, b) => b.similarity_score - a.similarity_score).slice(0, 5);
}