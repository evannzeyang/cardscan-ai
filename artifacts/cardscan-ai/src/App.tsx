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
import NotFound from "@/pages/not-found";
import type { AnalysisResult } from "@/lib/gemini";

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

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
          <AppRoutes />
        </WouterRouter>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
