import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/components/ui/use-toast';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Field } from '@/components/mobility/pmst/PmstSection';
import { NEGOTIATION_TYPES } from '@/components/mobility/pmst/pmstRequirements';
import { FileText, Plus, Pencil, Trash2, Check, X, Paperclip, Download } from 'lucide-react';

export default function NegotiationSection({ plan, updatePlan, isAdmin, saving }) {
  const { toast } = useToast();
  const [editing, setEditing] = useState(null);
  const actos = plan?.negociacion || [];

  const saveActo = (acto) => {
    const withId = { ...acto, id: acto.id || crypto.randomUUID() };
    const exists = actos.some((a) => a.id === withId.id);
    const newActos = exists ? actos.map((a) => (a.id === withId.id ? withId : a)) : [...actos, withId];
    updatePlan({ negociacion: newActos });
    setEditing(null);
  };

  const newActo = () => ({ id: crypto.randomUUID(), fecha: new Date().toISOString().slice(0, 10), tipo: 'Reunión', participantes: '', resumen: '', documento_nombre: '', documento_uri: '' });

  const viewDoc = async (uri) => {
    try {
      const res = await base44.integrations.Core.CreateFileSignedUrl({ file_uri: uri, expires_in: 300 });
      window.open(res.signed_url, '_blank');
    } catch (e) { toast({ title: 'No se pudo abrir el documento', description: e.message, variant: 'destructive' }); }
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <CardTitle className="text-base flex items-center gap-2"><FileText className="w-4 h-4 text-primary" /> Negociación con la representación legal</CardTitle>
          {isAdmin && <Button size="sm" variant="outline" onClick={() => setEditing(newActo())} disabled={saving}><Plus className="w-4 h-4 mr-1" /> Registrar acto</Button>}
        </div>
        <p className="text-xs text-muted-foreground mt-1">Documenta reuniones, aportaciones y acuerdos con la representación legal, con evidencia adjunta.</p>
      </CardHeader>
      <CardContent className="space-y-2">
        {actos.length === 0 && <p className="text-sm text-muted-foreground">Sin actos registrados.</p>}
        {actos.map((a) => (
          <div key={a.id} className="border rounded-lg p-3">
            <div className="flex items-center gap-2 mb-1 flex-wrap">
              <Badge variant="outline" className="text-xs">{a.tipo}</Badge>
              <span className="text-xs text-muted-foreground">{a.fecha}</span>
              {a.documento_uri && (
                <button className="text-xs text-primary inline-flex items-center gap-1 hover:underline" onClick={() => viewDoc(a.documento_uri)}>
                  <Download className="w-3 h-3" /> {a.documento_nombre || 'Evidencia'}
                </button>
              )}
              {isAdmin && (
                <div className="ml-auto flex gap-1">
                  <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => setEditing(a)}><Pencil className="w-3.5 h-3.5" /></Button>
                  <Button size="icon" variant="ghost" className="h-7 w-7 text-red-600" onClick={() => updatePlan({ negociacion: actos.filter((x) => x.id !== a.id) })}><Trash2 className="w-3.5 h-3.5" /></Button>
                </div>
              )}
            </div>
            {a.participantes && <p className="text-xs text-muted-foreground">Participantes: {a.participantes}</p>}
            {a.resumen && <p className="text-xs mt-1">{a.resumen}</p>}
          </div>
        ))}

        {editing && (
          <Dialog open onOpenChange={(o) => !o && setEditing(null)}>
            <ActoDialog acto={editing} onSave={saveActo} onClose={() => setEditing(null)} />
          </Dialog>
        )}
      </CardContent>
    </Card>
  );
}

function ActoDialog({ acto, onSave, onClose }) {
  const { toast } = useToast();
  const [a, setA] = useState(acto);
  const [uploading, setUploading] = useState(false);

  const upload = async (file) => {
    if (!file) return;
    setUploading(true);
    try {
      const res = await base44.integrations.Core.UploadPrivateFile({ file });
      setA((prev) => ({ ...prev, documento_nombre: file.name, documento_uri: res.file_uri }));
      toast({ title: 'Evidencia adjuntada' });
    } catch (e) { toast({ title: 'Error al subir', description: e.message, variant: 'destructive' }); }
    setUploading(false);
  };

  return (
    <DialogContent className="!w-[min(90vw,650px)] !max-w-none">
      <DialogHeader><DialogTitle>Acta de negociación</DialogTitle></DialogHeader>
      <div className="space-y-3 max-h-[60vh] overflow-y-auto pr-1">
        <div className="grid grid-cols-2 gap-3">
          <Field label="Fecha"><Input type="date" value={a.fecha || ''} onChange={(e) => setA({ ...a, fecha: e.target.value })} /></Field>
          <Field label="Tipo">
            <Select value={a.tipo} onValueChange={(v) => setA({ ...a, tipo: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{NEGOTIATION_TYPES.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
            </Select>
          </Field>
        </div>
        <Field label="Participantes"><Input value={a.participantes} onChange={(e) => setA({ ...a, participantes: e.target.value })} placeholder="Representación legal, RR. HH., ..." /></Field>
        <Field label="Resumen y acuerdos"><Textarea rows={4} value={a.resumen} onChange={(e) => setA({ ...a, resumen: e.target.value })} /></Field>
        <Field label="Evidencia documental" hint="Documento almacenado de forma privada">
          <div className="flex items-center gap-2">
            <Input type="file" onChange={(e) => upload(e.target.files?.[0])} disabled={uploading} />
            {a.documento_nombre && <Badge variant="secondary" className="gap-1"><Paperclip className="w-3 h-3" /> {a.documento_nombre}</Badge>}
          </div>
        </Field>
      </div>
      <DialogFooter>
        <Button variant="outline" onClick={onClose}><X className="w-4 h-4 mr-1" /> Cancelar</Button>
        <Button onClick={() => onSave(a)} disabled={uploading}><Check className="w-4 h-4 mr-1" /> Guardar</Button>
      </DialogFooter>
    </DialogContent>
  );
}