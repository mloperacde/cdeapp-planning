// src/main.jsx - Solo esto, nada más
console.log('📦 main.jsx cargado por Base44');

// Importar la aplicación principal
import('./App.jsx').then(module => {
    console.log('✅ App.jsx cargado exitosamente');
}).catch(error => {
    console.error('❌ Error cargando App.jsx:', error);
    
    // Mostrar error en pantalla si es posible
    if (window.React && window.ReactDOM) {
        const root = document.getElementById('app') || document.getElementById('root');
        if (root) {
            const errorElement = window.React.createElement('div', {
                style: {
                    padding: '40px',
                    textAlign: 'center',
                    color: '#dc2626'
                }
            },
                window.React.createElement('h1', null, '❌ Error cargando la aplicación'),
                window.React.createElement('p', null, error.message),
                window.React.createElement('button', {
                    onClick: () => window.location.reload(),
                    style: {
                        padding: '12px 24px',
                        background: '#dc2626',
                        color: 'white',
                        border: 'none',
                        borderRadius: '6px',
                        cursor: 'pointer'
                    }
                }, 'Recargar')
            );
            
            window.ReactDOM.render(errorElement, root);
        }
    }
});

// HMR para Vite
if (import.meta.hot) {
    import.meta.hot.accept();
}
