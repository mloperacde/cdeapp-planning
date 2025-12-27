import { ServicesProvider } from '@/contexts/ServicesContext';
import React from 'react'
import ReactDOM from 'react-dom/client'
import App from '@/App.jsx'
import '@/index.css'

// Luego envuelve tu aplicación con ServicesProvider:
export default function Layout({ children, currentPageName }) {
  return (
    <ErrorBoundary>
      <ThemeProvider>
        <ServicesProvider> {/* ← Agrega esto aquí */}
          <SidebarProvider>
ReactDOM.createRoot(document.getElementById('root')).render(
  // <React.StrictMode>
    <App />
  // </React.StrictMode>,
)

if (import.meta.hot) {
  import.meta.hot.on('vite:beforeUpdate', () => {
    window.parent?.postMessage({ type: 'sandbox:beforeUpdate' }, '*');
  });
  import.meta.hot.on('vite:afterUpdate', () => {
    window.parent?.postMessage({ type: 'sandbox:afterUpdate' }, '*');
  });
}
 </SidebarProvider>
        </ServicesProvider> {/* ← Cierra aquí */}
      </ThemeProvider>
    </ErrorBoundary>
  );
}


