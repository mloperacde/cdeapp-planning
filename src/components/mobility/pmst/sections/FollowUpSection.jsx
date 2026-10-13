import React, { useState, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import PmstSection, { Field } from '@/components/mobility/pmst/PmstSection';
import { CalendarCheck, Plus, Trash2, TrendingUp } from 'lucide-react';

export default function FollowUpSection({ plan, updatePlan, isAdmin, saving }) {
  const [proximo, setProximo] = useState('');
  const [indicadores, setIndicadores] = useState([]);
  const [informe, setInforme] = useState({ fecha_informe: '', periodo: '', nivel_implantacion: '', conclusiones: '', elaborado_por: '' });

  useEffect(() => {
    setProximo(plan?.proximo_seguimiento || '');
    setIndicadores(plan?.indicadores || []);
  }, [plan?.id]);

  const num = (v) => (v === '' ? undefined : Number(v));
  const setInd = (i, k, v) => setIndicadores((p) => p.map((x, j) => (j === i ? { ...x, [k]: v } : x)));

  const addInforme = () => {
    const nuevo = { ...informe, nivel_implantacion: informe.nivel_implantacion === '' ? undefined : Number(informe.nivel_implantacion) };
    updatePlan({ seguimientos: [...(plan?.seguimientos || []), nuevo] });
    setInforme({ fecha_informe: '', periodo: '', nivel_implantacion: '', conclusiones: '', elaborado_por: '' });
  };

  const seguimientos = plan?.seguimientos || [];

  return (
    <div className="space-y-4">
      <PmstSection
        title="Indicadores y calendario de seguimiento"
        description="Mide el avance del plan y programa el informe periódico (habitualmente bienal)."
        icon={TrendingUp}
        isAdmin={isAdmin}
        saving={saving}
        onSave={() => updatePlan({ indicadores, proximo_seguimiento: proximo })}
      >
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <Field label="Próximo informe de seguimiento" hint="Periodicidad de referencia: bienal">
            <Input type="date" value={proximo} onChange={(e) => setProximo(e.target.value)} />
          </Field>
        </div>

        <div className="space-y-2">
          <label className="text-xs font-medium">Indicadores</label>
          {indicadores.map((ind, i) => (
            <div key={i} className="grid grid-cols-2 md:grid-cols-6 gap-2 items-center">
              <Input className="md:col-span-2" placeholder="Indicador" value={ind.nombre || ''} onChange={(e) => setInd(i, 'nombre', e.target.value)} />
              <Input placeholder="Unidad" value={ind.unidad || ''} onChange={(e) => setInd(i, 'unidad', e.target.value)} />
              <Input type="number" placeholder="Base" value={ind.valor_base ?? ''} onChange={(e) => setInd(i, 'valor_base', num(e.target.value))} />
              <Input type="number" placeholder="Actual" value={ind.valor_actual ?? ''} onChange={(e) => setInd(i, 'valor_actual', num(e.target.value))} />
              <div className="flex gap-1">
                <Input type="number" placeholder="Meta" value={ind.meta ?? ''} onChange={(e) => setInd(i, 'meta', num(e.target.value))} />
                {isAdmin && <Button size="icon" variant="ghost" className="text-red-600 flex-shrink-0" onClick={() => setIndicadores((p) => p.filter((_, j) => j !== i))}><Trash2 className="w-4 h-4" /></Button>}
              </div>
            </div>
          ))}
          {isAdmin && (
            <Button size="sm" variant="outline" onClick={() => setIndicadores((p) => [...p, { id: crypto.randomUUID(), nombre: '', unidad: '', valor_base: '', valor_actual: '', meta: '', frecuencia: 'Anual' }])}>
              <Plus className="w-4 h-4 mr-1" /> Añadir indicador
            </Button>
          )}
        </div>
      </PmstSection>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2"><CalendarCheck className="w-4 h-4 text-primary" /> Informes de seguimiento</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {seguimientos.length === 0 && <p className="text-sm text-muted-foreground">Sin informes registrados.</p>}
          {seguimientos.map((s, i) => (
            <div key={i} className="border rounded-lg p-3 text-sm flex items-start justify-between gap-2">
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground">{s.fecha_informe}</span>
                  {s.periodo && <Badge variant="outline" className="text-xs">{s.periodo}</Badge>}
                  {s.nivel_implantacion != null && <Badge variant="secondary" className="text-xs">{s.nivel_implantacion}% implantación</Badge>}
                </div>
                {s.conclusiones && <p className="text-xs mt-1">{s.conclusiones}</p>}
                {s.elaborado_por && <p className="text-xs text-muted-foreground">Elaborado por: {s.elaborado_por}</p>}
              </div>
              {isAdmin && <Button size="icon" variant="ghost" className="h-7 w-7 text-red-600" onClick={() => updatePlan({ seguimientos: seguimientos.filter((_, j) => j !== i) })}><Trash2 className="w-3.5 h-3.5" /></Button>}
            </div>
          ))}

          {isAdmin && (
            <div className="border-t pt-3 space-y-3">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <Field label="Fecha del informe"><Input type="date" value={informe.fecha_informe} onChange={(e) => setInforme({ ...informe, fecha_informe: e.target.value })} /></Field>
                <Field label="Periodo"><Input value={informe.periodo} onChange={(e) => setInforme({ ...informe, periodo: e.target.value })} placeholder="2026-2028" /></Field>
                <Field label="Nivel de implantación (%)"><Input type="number" min="0" max="100" value={informe.nivel_implantacion} onChange={(e) => setInforme({ ...informe, nivel_implantacion: e.target.value })} /></Field>
              </div>
              <Field label="Conclusiones"><Textarea rows={3} value={informe.conclusiones} onChange={(e) => setInforme({ ...informe, conclusiones: e.target.value })} /></Field>
              <Field label="Elaborado por"><Input value={informe.elaborado_por} onChange={(e) => setInforme({ ...informe, elaborado_por: e.target.value })} /></Field>
              <Button size="sm" onClick={addInforme}><Plus className="w-4 h-4 mr-1" /> Añadir informe</Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}