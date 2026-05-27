import { useState } from "react";
import { Switch, Route, Router as WouterRouter } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import Header from "@/components/Header";
import Dashboard from "@/pages/Dashboard";
import Scan from "@/pages/Scan";
import Review from "@/pages/Review";
import Contacts from "@/pages/Contacts";
import ContactDetail from "@/pages/ContactDetail";
import Events from "@/pages/Events";
import NotFound from "@/pages/not-found";
import type { AnalysisResult } from "@/lib/gemini";
import { useAuth } from "@workspace/replit-auth-web";
import { Loader2, ScanLine } from "lucide-react";
import { Button } from "@/components/ui/button";

const dmLogo = import.meta.env.BASE_URL + "datamines-logo.png";

const queryClient = new QueryClient();

function AppRoutes() {
  const [analysisResult, setAnalysisResult] = useState<AnalysisResult | null>(null);
  const [scannedImageUrl, setScannedImageUrl] = useState<string>("");

  function handleAnalyzed(result: AnalysisResult, imageUrl: string) {
    setAnalysisResult(result);
    setScannedImageUrl(imageUrl);
  }

  return (
    <>
      <Header />
      <Switch>
        <Route path="/" component={Dashboard} />
        <Route path="/contacts" component={Contacts} />
        <Route path="/contacts/:id">
          {(params) => <ContactDetail id={params?.id ?? ""} />}
        </Route>
        <Route path="/events" component={Events} />
        <Route path="/scan">
          {() => <Scan onAnalyzed={handleAnalyzed} />}
        </Route>
        <Route path="/review">
          {() => (
            <Review
              extractedData={analysisResult?.card ?? null}
              geoData={analysisResult?.geo ?? null}
              imageUrl={scannedImageUrl}
            />
          )}
        </Route>
        <Route component={NotFound} />
      </Switch>
    </>
  );
}

function AuthGate({ children }: { children: React.ReactNode }) {
  const { isLoading, isAuthenticated, login } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="flex flex-col items-center gap-3 text-muted-foreground">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-sm">Loading...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center px-6">
        <div className="text-center max-w-xs w-full flex flex-col items-center">
          <img
            src={dmLogo}
            alt="Data Mines"
            className="w-36 h-auto mb-8 select-none"
            draggable={false}
          />

          <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-4">
            <ScanLine className="h-6 w-6 text-primary" />
          </div>
          <h1 className="text-xl font-bold text-foreground mb-1.5">CardScan AI</h1>
          <p className="text-muted-foreground mb-8 text-sm leading-relaxed">
            Scan business cards, manage contacts, and track networking events — all in one place.
          </p>

          <Button className="w-full h-11 font-semibold text-base" onClick={login}>
            Log in to get started
          </Button>
        </div>

        <p className="mt-10 text-xs text-muted-foreground/60 tracking-wide select-none">
          by{" "}
          <span className="font-semibold text-muted-foreground/80">Data Mines</span>
          {" "}· Data that flows. Insight that grows.
        </p>
      </div>
    );
  }

  return <>{children}</>;
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
          <AuthGate>
            <AppRoutes />
          </AuthGate>
        </WouterRouter>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
