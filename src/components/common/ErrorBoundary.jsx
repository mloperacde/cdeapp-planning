import React from 'react';
import { AlertCircle, RefreshCcw, Home } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { 
      hasError: false, 
      error: null, 
      errorInfo: null 
    };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo);
    this.setState({
      error,
      errorInfo
    });
    
    // Optional: Send error to logging service
    // logErrorToService(error, errorInfo);
  }

  handleReset = () => {
    this.setState({ 
      hasError: false, 
      error: null, 
      errorInfo: null 
    });
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-red-50 to-orange-50 p-4">
          <Card className="max-w-md w-full shadow-2xl border-red-200">
            <CardHeader className="text-center border-b border-red-100 bg-gradient-to-br from-red-50 to-red-100">
              <div className="w-16 h-16 mx-auto mb-4 bg-red-500 rounded-full flex items-center justify-center">
                <AlertCircle className="w-10 h-10 text-white" />
              </div>
              <CardTitle className="text-2xl text-red-900">
                ¡Algo salió mal!
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6 space-y-4">
              <p className="text-slate-700 text-center">
                Lo sentimos, ha ocurrido un error inesperado en la aplicación.
              </p>
              
              {process.env.NODE_ENV === 'development' && this.state.error && (
                <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg">
                  <p className="text-xs font-mono text-red-800 mb-2">
                    <strong>Error:</strong> {this.state.error.toString()}
                  </p>
                  {this.state.errorInfo && (
                    <details className="mt-2">
                      <summary className="cursor-pointer text-xs text-red-700 hover:text-red-900">
                        Ver detalles técnicos
                      </summary>
                      <pre className="mt-2 text-xs overflow-auto max-h-40 bg-white p-2 rounded border border-red-200">
                        {this.state.errorInfo.componentStack}
                      </pre>
                    </details>
                  )}
                </div>
              )}

              <div className="flex flex-col gap-2 mt-6">
                <Button 
                  onClick={this.handleReset}
                  className="w-full bg-red-600 hover:bg-red-700"
                >
                  <RefreshCcw className="w-4 h-4 mr-2" />
                  Intentar de Nuevo
                </Button>
                
                <Button 
                  onClick={() => window.location.href = '/'}
                  variant="outline"
                  className="w-full"
                >
                  <Home className="w-4 h-4 mr-2" />
                  Ir al Inicio
                </Button>
              </div>

              <p className="text-xs text-center text-slate-500 mt-4">
                Si el problema persiste, contacta con el administrador del sistema.
              </p>
            </CardContent>
          </Card>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;