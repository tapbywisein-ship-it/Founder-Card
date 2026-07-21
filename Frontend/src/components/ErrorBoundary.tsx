import { Component, type ReactNode, type ErrorInfo } from 'react';
import { AlertCircle, RotateCcw, Home } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface Props { children: ReactNode }
interface State { error: Error | null }

export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('[ErrorBoundary]', error, info.componentStack);
  }

  render() {
    if (!this.state.error) return this.props.children;

    return (
      <div className="min-h-screen bg-background flex items-center justify-center px-6">
        <div className="max-w-md w-full text-center space-y-5">
          <div className="w-14 h-14 rounded-2xl bg-destructive/10 flex items-center justify-center mx-auto">
            <AlertCircle className="w-7 h-7 text-destructive" />
          </div>
          <div>
            <h1 className="text-xl font-semibold text-foreground mb-2">Something went wrong</h1>
            <p className="text-sm text-muted-foreground">
              An unexpected error occurred. You can try refreshing the page or go back home.
            </p>
            {import.meta.env.DEV && (
              <pre className="mt-3 text-left text-xs bg-muted/50 rounded-xl p-3 overflow-auto max-h-40 text-destructive">
                {this.state.error.message}
              </pre>
            )}
          </div>
          <div className="flex items-center justify-center gap-3">
            <Button onClick={() => { this.setState({ error: null }); window.location.reload(); }}>
              <RotateCcw className="w-4 h-4 mr-1.5" /> Refresh
            </Button>
            {/* Plain anchor, not react-router <Link>: this boundary sits ABOVE
                <BrowserRouter> in App, so a <Link> here has no router context
                and throws while rendering the fallback — turning a caught error
                into a blank white screen. A full-load home works from any state. */}
            <Button variant="outline" asChild>
              <a href="/">
                <Home className="w-4 h-4 mr-1.5" /> Home
              </a>
            </Button>
          </div>
        </div>
      </div>
    );
  }
}
