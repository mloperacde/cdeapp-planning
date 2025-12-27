// src/components/ui/toaster.jsx
import { useState, useEffect } from 'react';

// Componente Toaster que muestra notificaciones
export function Toaster() {
  const [toasts, setToasts] = useState([]);

  // Función para eliminar un toast
  const removeToast = (id) => {
    setToasts((prevToasts) => prevToasts.filter((toast) => toast.id !== id));
  };

  // Escuchar eventos personalizados para agregar toasts
  useEffect(() => {
    const handleAddToast = (event) => {
      const { title, description, variant = 'default', duration = 5000 } = event.detail;
      const id = Date.now() + Math.random();
      
      setToasts((prevToasts) => [
        ...prevToasts,
        { id, title, description, variant }
      ]);

      // Eliminar automáticamente después de la duración
      setTimeout(() => {
        removeToast(id);
      }, duration);
    };

    window.addEventListener('toast', handleAddToast);

    return () => {
      window.removeEventListener('toast', handleAddToast);
    };
  }, []);

  // Colores según la variante
  const variantClasses = {
    default: 'bg-white border-gray-200 text-gray-800',
    destructive: 'bg-red-50 border-red-200 text-red-800',
    success: 'bg-green-50 border-green-200 text-green-800',
    warning: 'bg-yellow-50 border-yellow-200 text-yellow-800',
  };

  return (
    <div className="fixed bottom-0 right-0 z-50 p-4 w-full max-w-sm">
      <div className="space-y-2">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className={`p-4 rounded-lg shadow-lg border ${variantClasses[toast.variant]} animate-in slide-in-from-right`}
          >
            <div className="flex justify-between items-start">
              <div>
                {toast.title && <h4 className="font-semibold">{toast.title}</h4>}
                {toast.description && (
                  <p className="text-sm mt-1">{toast.description}</p>
                )}
              </div>
              <button
                className="text-gray-400 hover:text-gray-600 text-xl"
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

// Función helper para mostrar toasts (dispara un evento personalizado)
export function toast({ title, description, variant, duration }) {
  const event = new CustomEvent('toast', {
    detail: { title, description, variant, duration }
  });
  window.dispatchEvent(event);
}
