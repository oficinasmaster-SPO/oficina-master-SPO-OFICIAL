import React from "react";
import { AlertCircle, RefreshCcw, Home } from "lucide-react";
import { Button } from "@/components/ui/button";

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error) {
    // Atualiza o state para que a próxima renderização mostre a UI de fallback.
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    // Você também pode registrar o erro em um serviço de log de erros
    console.error("ErrorBoundary capturou um erro:", error, errorInfo);
    this.setState({ errorInfo });
  }

  handleReload = () => {
    window.location.reload();
  };

  handleGoHome = () => {
    window.location.href = "/";
  };

  render() {
    if (this.state.hasError) {
      // Você pode renderizar qualquer UI de fallback personalizada
      return (
        <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-4">
          <div className="bg-white p-8 rounded-xl shadow-lg max-w-lg w-full text-center border border-gray-100">
            <div className="w-16 h-16 bg-red-50 text-red-500 rounded-full flex items-center justify-center mx-auto mb-6">
              <AlertCircle className="h-8 w-8" />
            </div>
            
            <h2 className="text-2xl font-bold text-gray-900 mb-3">
              Ops! Algo deu errado.
            </h2>
            
            <p className="text-gray-600 mb-8">
              Encontramos um erro inesperado ao carregar esta página. Nossa equipe técnica já foi notificada.
            </p>

            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Button 
                onClick={this.handleReload} 
                className="flex items-center gap-2"
              >
                <RefreshCcw className="w-4 h-4" />
                Tentar novamente
              </Button>
              <Button 
                variant="outline" 
                onClick={this.handleGoHome}
                className="flex items-center gap-2"
              >
                <Home className="w-4 h-4" />
                Voltar ao Início
              </Button>
            </div>

            {import.meta.env.DEV && this.state.error && (
              <div className="mt-8 p-4 bg-gray-100 rounded-lg text-left overflow-auto max-h-48">
                <p className="text-sm font-mono text-red-600 font-semibold mb-2">
                  {this.state.error.toString()}
                </p>
                <pre className="text-xs font-mono text-gray-700 whitespace-pre-wrap">
                  {this.state.errorInfo?.componentStack}
                </pre>
              </div>
            )}
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;