// VERSIÓN SIMPLIFICADA Y FUNCIONAL
import { Toaster as Sonner } from "sonner";

export function Toaster() {
  return (
    <Sonner
      position="bottom-right"
      expand={false}
      richColors
      closeButton
      toastOptions={{
        style: {
          background: 'var(--background)',
          color: 'var(--foreground)',
          border: '1px solid var(--border)',
          fontSize: '14px',
        },
      }}
    />
  );
}

// Si necesitas usar toast en otros componentes, exporta la función
export { toast } from "sonner";
