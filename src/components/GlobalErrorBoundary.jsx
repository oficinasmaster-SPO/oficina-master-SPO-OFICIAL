import React from 'react';

class GlobalErrorBoundary extends React.Component {
    constructor(props) {
        super(props);
        this.state = { hasError: false, error: null, errorInfo: null };
    }

    static getDerivedStateFromError(error) {
        return { hasError: true, error };
    }

    componentDidCatch(error, errorInfo) {
        console.error("Uncaught error:", error, errorInfo);
        this.setState({ errorInfo });
    }

    render() {
        if (this.state.hasError) {
            return (
                <div className="min-h-screen flex items-center justify-center bg-red-50 p-6">
                    <div className="max-w-3xl w-full bg-white rounded-lg shadow-xl border border-red-200 p-8">
                        <h1 className="text-2xl font-bold text-red-700 mb-4">Something went wrong 😭</h1>
                        <p className="text-gray-600 mb-6">
                            The application crashed. Please share this error with the developer:
                        </p>

                        <div className="bg-slate-900 rounded-lg p-4 overflow-auto max-h-96">
                            <code className="text-red-400 block mb-2 font-mono text-sm">
                                {this.state.error && this.state.error.toString()}
                            </code>
                            <code className="text-gray-400 block whitespace-pre-wrap font-mono text-xs">
                                {this.state.errorInfo && this.state.errorInfo.componentStack}
                            </code>
                        </div>

                        <button
                            onClick={() => window.location.reload()}
                            className="mt-6 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 transition-colors"
                        >
                            Reload Page
                        </button>
                    </div>
                </div>
            );
        }

        return this.props.children;
    }
}

export default GlobalErrorBoundary;
