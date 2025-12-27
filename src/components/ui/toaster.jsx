// src/components/ui/toaster.jsx - VERSIÓN COMPLETA AUTÓNOMA
export function Toaster() {
  return (
    <div className="fixed bottom-0 right-0 z-50 p-4 w-full max-w-sm">
      {/* Contenedor para toasts */}
      <div className="space-y-2" id="toast-container">
        {/* Los toasts se agregarán aquí dinámicamente */}
      </div>
    </div>
  );
}

// Función helper para mostrar toasts (opcional)
export function toast({ title, description, variant = "default" }) {
  const container = document.getElementById('toast-container');
  if (!container) return;
  
  const colors = {
    default: 'bg-white border',
    destructive: 'bg-red-50 border-red-200 text-red-800',
    success: 'bg-green-50 border-green-200 text-green-800',
  };
  
  const toastEl = document.createElement('div');
  toastEl.className = `p-4 rounded-lg shadow-lg border ${colors[variant]} animate-in slide-in-from-right`;
  toastEl.innerHTML = `
    <div class="flex justify-between items-start">
      <div>
        ${title ? `<h4 class="font-semibold">${title}</h4>` : ''}
        ${description ? `<p class="text-sm mt-1">${description}</p>` : ''}
      </div>
      <button class="text-gray-400 hover:text-gray-600" onclick="this.parentElement.parentElement.remove()">×</button>
    </div>
  `;
  
  container.appendChild(toastEl);
  
  // Auto-remove after 5 seconds
  setTimeout(() => {
    if (toastEl.parentElement) {
      toastEl.remove();
    }
  }, 5000);
}
