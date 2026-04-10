import React from "react";
import { AlertCircle, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";

export default class TabErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error(`[TabErrorBoundary] Erro na aba "${this.props.tabName || "desconhecida"}":`, error, errorInfo);
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex flex-col items-center justify-center py-16 px-4">
          <div className="bg-white border border-red-200 rounded-xl p-6 max-w-md w-full text-center shadow-sm">
            <div className="w-12 h-12 bg-red-50 text-red-500 rounded-full flex items-center justify-center mx-auto mb-4">
              <AlertCircle className="h-6 w-6" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-1">
              Erro ao carregar {this.props.tabName || "esta aba"}
            </h3>
            <p className="text-sm text-gray-500 mb-4">
              Ocorreu um problema inesperado. Tente novamente.
            </p>
            <Button size="sm" onClick={this.handleRetry} className="gap-2">
              <RefreshCw className="w-3.5 h-3.5" />
              Tentar novamente
            </Button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}