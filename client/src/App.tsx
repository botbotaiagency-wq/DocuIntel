import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useAuth } from "@/hooks/use-auth";
import { Loader2 } from "lucide-react";

// Components
import { Layout } from "@/components/Layout";
import NotFound from "@/pages/not-found";

// Pages
import Landing from "@/pages/Landing";
import Dashboard from "@/pages/Dashboard";
import Upload from "@/pages/Upload";
import Review from "@/pages/Review";
import AuditLog from "@/pages/AuditLog";
import Admin from "@/pages/Admin";
import ReviewQueue from "@/pages/ReviewQueue";

function Router() {
  return (
    <Switch>
      <Route path="/" component={Dashboard} />
      <Route path="/review" component={ReviewQueue} />
      <Route path="/upload" component={Upload} />
      <Route path="/documents/:id" component={Review} />
      <Route path="/admin/schemas" component={Admin} />
      <Route path="/admin/settings" component={Admin} />
      <Route path="/audit" component={AuditLog} />
      <Route component={NotFound} />
    </Switch>
  );
}

function MainApp() {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center text-foreground">
        <Loader2 className="h-10 w-10 animate-spin text-primary mb-4" />
        <p className="text-muted-foreground font-medium animate-pulse">Initializing Secure Environment...</p>
      </div>
    );
  }

  if (!user) {
    return <Landing />;
  }

  return (
    <Layout>
      <Router />
    </Layout>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <MainApp />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
