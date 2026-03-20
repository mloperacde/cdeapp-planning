import { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Plus, Trash2, Upload, Image, FileText } from 'lucide-react';

function EvidenceCard({ evidence, onChange, onDelete }) {
  return (
    <div className="border border-slate-200 dark:border-border rounded-lg p-3 space-y-2 bg-white dark:bg-card">
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1">
          {evidence.type === 'image' && evidence.url ? (
            <img src={evidence.url} alt={evidence.caption} className="w-full h-36 object-cover rounded-md bg-slate-100" onError={(e) => e.target.style.display='none'} />
          ) : (
            <div className="w-full h-20 bg-slate-100 dark:bg-slate-800 rounded-md flex items-center justify-center">
              <FileText className="w-8 h-8 text-slate-300" />
            </div>
          )}
        </div>
        <Button variant="ghost" size="icon" onClick={onDelete} className="h-7 w-7 text-red-500 hover:text-red-700 flex-shrink-0">
          <Trash2 className="w-3.5 h-3.5" />
        </Button>
      </div>
      <div>
        <Label className="text-xs">Descripción / Pie de foto</Label>
        <Input value={evidence.caption || ''} onChange={(e) => onChange({ ...evidence, caption: e.target.value })} className="mt-1 h-8 text-sm" placeholder="Ej: Vista general del equipo..." />
      </div>
      <div>
        <Label className="text-xs">URL de la imagen/documento</Label>
        <Input value={evidence.url || ''} onChange={(e) => onChange({ ...evidence, url: e.target.value })} className="mt-1 h-8 text-sm" placeholder="https://..." />
      </div>
    </div>
  );
}

export default function ReportEvidences({ data, onChange }) {
  const [uploading, setUploading] = useState(false);
  const evidences = data.evidencias || [];

  const addEvidence = (type = 'image') => {
    const newE = { id: `e-${Date.now()}`, type, url: '', caption: '', timestamp: new Date().toISOString() };
    onChange({ evidencias: [...evidences, newE] });
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    const { file_url } = await base44.integrations.Core.UploadFile({ file });
    const type = file.type.startsWith('image/') ? 'image' : 'document';
    const newE = { id: `e-${Date.now()}`, type, url: file_url, caption: file.name, timestamp: new Date().toISOString() };
    onChange({ evidencias: [...evidences, newE] });
    setUploading(false);
  };

  const updateEvidence = (index, updated) => {
    const list = [...evidences];
    list[index] = updated;
    onChange({ evidencias: list });
  };

  const deleteEvidence = (index) => {
    onChange({ evidencias: evidences.filter((_, i) => i !== index) });
  };

  return (
    <div className="max-w-4xl space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-semibold text-slate-800 dark:text-white">Evidencias</h3>
          <p className="text-xs text-slate-500">{evidences.length} evidencia(s) adjunta(s)</p>
        </div>
        <div className="flex gap-2">
          <label className="cursor-pointer">
            <input type="file" accept="image/*,video/*,.pdf,.doc,.docx" className="hidden" onChange={handleFileUpload} />
            <Button variant="outline" size="sm" className="gap-1" asChild>
              <span>
                {uploading ? <span className="animate-spin">⏳</span> : <Upload className="w-4 h-4" />}
                {uploading ? 'Subiendo...' : 'Subir archivo'}
              </span>
            </Button>
          </label>
          <Button onClick={() => addEvidence('image')} size="sm" variant="outline" className="gap-1">
            <Plus className="w-4 h-4" /> URL
          </Button>
        </div>
      </div>

      {evidences.length === 0 ? (
        <div className="text-center py-12 border-2 border-dashed border-slate-200 dark:border-border rounded-xl">
          <Image className="w-10 h-10 mx-auto mb-2 text-slate-300" />
          <p className="text-slate-400 text-sm">No hay evidencias adjuntas</p>
          <p className="text-xs text-slate-400 mt-1">Sube imágenes, documentos o añade URLs</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {evidences.map((e, i) => (
            <EvidenceCard
              key={e.id || i}
              evidence={e}
              onChange={(updated) => updateEvidence(i, updated)}
              onDelete={() => deleteEvidence(i)}
            />
          ))}
        </div>
      )}
    </div>
  );
}