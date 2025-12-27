// src/components/ui/toaster.jsx - VERSIÓN MEJORADA
import { useEffect, useState } from 'react';

export function Toaster() {
  const [toasts, setToasts] = useState([]);

  const removeToast = (id) => {
    setToasts(prev => prev.filter(toast => toast.id !== id));
  };

  // Ejemplo: auto-agregar un toast de demostración (opcional)
  useEffect(() => {
    const timeout = setTimeout(() => {
      // Solo para demostración - elimina esto en producción
      toast({
        title: "Sistema listo",
        description: "La aplicación se ha cargado correctamente",
        variant: "success"
      });
    }, 1000);

    return () => clearTimeout(timeout);
  }, []);

  return (
    <div className="fixed bottom-0 right-0 z-50 p-4 w-full max-w-sm">
      <div className="space-y-2">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className={`p-4 rounded-lg shadow-lg border animate-in slide-in-from-right ${
              toast.variant === 'destructive' 
                ? 'bg-red-50 border-red-200 text-red-800' 
                : toast.variant === 'success'
                ? 'bg-green-50 border-green-200 text-green-800'
                : 'bg-white border-gray-200'
            }`}
          >
            <div className="flex justify-between items-start">
              <div>
                {toast.title && <h4 className="font-semibold">{toast.title}</h4>}
                {toast.description && <p className="text-sm mt-1">{toast.description}</p>}
              </div>
              <button 
                className="text-gray-400 hover:text-gray-600 text-lg"
                onClick={() => removeToast(toast.id)}
              >
                ×
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// Sistema global de toasts
let toastId = 0;
const toastCallbacks = [];

export function toast({ title, description, variant = "default" }) {
  const id = ++toastId;
  
  // Notificar a todos los componentes Toaster
  toastCallbacks.forEach(callback => {
    callback({
      id,
      title,
      description,
      variant,
      timestamp: Date.now()
    });
  });

  // Auto-remover después de 5 segundos
  setTimeout(() => {
    toastCallbacks.forEach(callback => {
      callback({ id, remove: true });
    });
  }, 5000);

  return id;
}

// Para usar dentro del componente Toaster
export function useToaster() {
  const [toasts, setToasts] = useState([]);

  useEffect(() => {
    const handleNewToast = (newToast) => {
      if (newToast.remove) {
        setToasts(prev => prev.filter(t => t.id !== newToast.id));
      } else {
        setToasts(prev => [...prev, newToast]);
      }
    };

    toastCallbacks.push(handleNewToast);

    return () => {
      const index = toastCallbacks.indexOf(handleNewToast);
      if (index > -1) {
        toastCallbacks.splice(index, 1);
      }
    };
  }, []);

  return toasts;
}
