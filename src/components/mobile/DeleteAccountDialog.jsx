import { useState } from 'react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Input } from '@/components/ui/input';
import { Trash2 } from 'lucide-react';

export default function DeleteAccountDialog({ open, onOpenChange, onConfirm }) {
  const [confirmText, setConfirmText] = useState('');

  const handleClose = () => {
    setConfirmText('');
    onOpenChange(false);
  };

  const handleConfirm = () => {
    if (confirmText !== 'ELIMINAR') return;
    handleClose();
    onConfirm?.();
  };

  return (
    <AlertDialog open={open} onOpenChange={handleClose}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2 text-red-600">
            <Trash2 className="w-5 h-5" /> Eliminar Cuenta
          </AlertDialogTitle>
          <AlertDialogDescription className="space-y-3">
            <span className="block">Esta acción es <strong>irreversible</strong>. Se eliminará toda tu información y no podrás recuperar el acceso.</span>
            <span className="block">Escribe <strong>ELIMINAR</strong> para confirmar:</span>
            <Input
              value={confirmText}
              onChange={e => setConfirmText(e.target.value)}
              placeholder="ELIMINAR"
              className="mt-1"
            />
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel onClick={handleClose}>Cancelar</AlertDialogCancel>
          <AlertDialogAction
            disabled={confirmText !== 'ELIMINAR'}
            onClick={handleConfirm}
            className="bg-red-600 hover:bg-red-700 disabled:opacity-40"
          >
            Eliminar cuenta
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}