import { Switch, Route, Router as WouterRouter } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeProvider } from "@/components/theme-provider";
import { AppLayout } from "@/components/layout/app-layout";
import NotFound from "@/pages/not-found";

import Login from "@/pages/login";
import Dashboard from "@/pages/dashboard";
import TaxReturns from "@/pages/tax-returns";
import TaxReturnDetail from "@/pages/tax-return-detail";
import W2Upload from "@/pages/w2-upload";
import AiAgent from "@/pages/ai-agent";
import KnowledgeGraph from "@/pages/knowledge-graph";
import TestReports from "@/pages/test-reports";
import TestReportDetail from "@/pages/test-report-detail";
import Logs from "@/pages/logs";
import Settings from "@/pages/settings";

const queryClient = new QueryClient();

function ProtectedRouter() {
  return (
    <AppLayout>
      <Switch>
        <Route path="/" component={Dashboard} />
        <Route path="/tax-returns" component={TaxReturns} />
        <Route path="/tax-returns/:id" component={TaxReturnDetail} />
        <Route path="/w2-upload" component={W2Upload} />
        <Route path="/ai-agent" component={AiAgent} />
        <Route path="/knowledge-graph" component={KnowledgeGraph} />
        <Route path="/test-reports" component={TestReports} />
        <Route path="/test-reports/:id" component={TestReportDetail} />
        <Route path="/logs" component={Logs} />
        <Route path="/settings" component={Settings} />
        <Route component={NotFound} />
      </Switch>
    </AppLayout>
  );
}

function Router() {
  return (
    <Switch>
      <Route path="/login" component={Login} />
      <Route path="/:rest*">
        <ProtectedRouter />
      </Route>
    </Switch>
  );
}

function App() {
  return (
    <ThemeProvider defaultTheme="dark" storageKey="taxwise-theme">
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
            <Router />
          </WouterRouter>
          <Toaster />
        </TooltipProvider>
      </QueryClientProvider>
    </ThemeProvider>
  );
}

export default App;
