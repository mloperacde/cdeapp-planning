import React from 'react';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { RefreshCw, AlertTriangle } from "lucide-react";

class GlobalErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error("Global Error Boundary Caught:", error, errorInfo);
    this.setState({ errorInfo });
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex flex-col items-center justify-center min-h-screen bg-slate-50 p-4">
          <div className="max-w-md w-full space-y-4">
            <div className="flex justify-center mb-6">
               <div className="h-12 w-12 bg-red-100 rounded-full flex items-center justify-center">
                 <AlertTriangle className="h-6 w-6 text-red-600" />
               </div>
            </div>
            
            <h1 className="text-xl font-bold text-center text-slate-900">Algo salió mal</h1>
            <p className="text-center text-slate-600 mb-4">
              La aplicación ha encontrado un error inesperado.
            </p>

            <Alert variant="destructive" className="bg-white border-red-200 shadow-sm">
              <AlertTitle className="font-mono text-xs mb-2">Detalles del Error</AlertTitle>
              <AlertDescription className="font-mono text-xs overflow-auto max-h-[200px] whitespace-pre-wrap">
                {this.state.error && this.state.error.toString()}
                {this.state.errorInfo && this.state.errorInfo.componentStack && (
                    <div className="mt-2 text-slate-400">
                        {this.state.errorInfo.componentStack.slice(0, 300)}...
                    </div>
                )}
              </AlertDescription>
            </Alert>

            <div className="flex justify-center pt-4">
              <Button onClick={this.handleReset} className="w-full">
                <RefreshCw className="mr-2 h-4 w-4" /> Recargar Aplicación
              </Button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default GlobalErrorBoundary;
