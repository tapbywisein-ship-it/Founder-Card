import { Link, useLocation } from "react-router-dom";
import { useEffect } from "react";
import { Compass, Home } from "lucide-react";
import { Logo } from "@/components/Logo";
import { Button } from "@/components/ui/button";

const NotFound = () => {
  const location = useLocation();

  useEffect(() => {
    document.title = "Page not found | TapByWisein";
    console.error("404 Error: route not found:", location.pathname);
  }, [location.pathname]);

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <header className="px-6 py-5 max-w-xwide mx-auto w-full">
        <Logo size="md" />
      </header>
      <main className="flex-1 flex items-center justify-center px-6 py-12">
        <div className="text-center max-w-md space-y-5">
          <p className="text-7xl font-bold tracking-tight text-primary">404</p>
          <h1 className="text-2xl font-semibold text-foreground">This page wandered off</h1>
          <p className="text-sm text-muted-foreground">
            The link may be broken or the page may have moved. Let's get you back to the action.
          </p>
          <div className="flex items-center justify-center gap-3 pt-2">
            <Button asChild>
              <Link to="/"><Home className="w-4 h-4 mr-1.5" /> Home</Link>
            </Button>
            <Button asChild variant="outline">
              <Link to="/discover"><Compass className="w-4 h-4 mr-1.5" /> Discover events</Link>
            </Button>
          </div>
        </div>
      </main>
    </div>
  );
};

export default NotFound;
