import { useState } from 'react';
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Trash2, Loader2, AlertTriangle } from 'lucide-react';

export default function DeleteAccountDialog({ open, onOpenChange, onConfirm }) {
  const [confirmText, setConfirmText] = useState('');
  const [loading, setLoading] = useState(false);

  const handleClose = () => {
    if (loading) return;
    setConfirmText('');
    onOpenChange(false);
  };

  const handleConfirm = async () => {
    if (confirmText !== 'ELIMINAR' || loading) return;
    setLoading(true);
    try {
      await onConfirm?.();
    } finally {
      setLoading(false);
      handleClose();
    }
  };

  const ready = confirmText === 'ELIMINAR';

  return (
    <AlertDialog open={open} onOpenChange={handleClose}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2 text-red-600">
            <Trash2 className="w-5 h-5" /> Eliminar Cuenta
          </AlertDialogTitle>
          <AlertDialogDescription asChild>
            <div className="space-y-3">
              <div className="flex gap-2 p-3 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 rounded-lg">
                <AlertTriangle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
                <span className="text-sm text-red-700 dark:text-red-400">
                  Esta acción es <strong>irreversible</strong>. Se eliminará toda tu información y no podrás recuperar el acceso.
                </span>
              </div>
              <p className="text-sm text-slate-600 dark:text-slate-400">
                Escribe <strong className="text-slate-900 dark:text-slate-200">ELIMINAR</strong> para confirmar:
              </p>
              <Input
                value={confirmText}
                onChange={e => setConfirmText(e.target.value)}
                placeholder="ELIMINAR"
                disabled={loading}
                className={`transition-colors ${ready ? 'border-red-400 focus-visible:ring-red-400' : ''}`}
                autoComplete="off"
              />
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel onClick={handleClose} disabled={loading}>Cancelar</AlertDialogCancel>
          <Button
            disabled={!ready || loading}
            onClick={handleConfirm}
            className="bg-red-600 hover:bg-red-700 disabled:opacity-40 gap-2"
          >
            {loading ? (
              <><Loader2 className="w-4 h-4 animate-spin" /> Eliminando...</>
            ) : (
              <><Trash2 className="w-4 h-4" /> Eliminar cuenta</>
            )}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}