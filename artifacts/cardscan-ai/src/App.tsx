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
import { AuthProvider, useAuth } from "@workspace/replit-auth-web";
import { Loader2 } from "lucide-react";
import AuthPage from "@/components/AuthPage";

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
  const { isLoading, isAuthenticated } = useAuth();

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
    return <AuthPage />;
  }

  return <>{children}</>;
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <TooltipProvider>
          <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
            <AuthGate>
              <AppRoutes />
            </AuthGate>
          </WouterRouter>
          <Toaster />
        </TooltipProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;
