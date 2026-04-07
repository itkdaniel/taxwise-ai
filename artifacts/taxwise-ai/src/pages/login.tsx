import { useAuth } from "@workspace/replit-auth-web";
import { Redirect } from "wouter";
import { Button } from "@/components/ui/button";
import { BrainCircuit } from "lucide-react";

export default function Login() {
  const { isAuthenticated, login, isLoading } = useAuth();

  if (isAuthenticated) {
    return <Redirect to="/" />;
  }

  return (
    <div className="min-h-[100dvh] w-full flex items-center justify-center bg-background text-foreground">
      <div className="w-full max-w-md p-8 space-y-8 bg-card border rounded-xl shadow-lg">
        <div className="flex flex-col items-center text-center space-y-2">
          <div className="h-12 w-12 bg-primary/10 rounded-full flex items-center justify-center mb-4">
            <BrainCircuit className="h-6 w-6 text-primary" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight">Welcome to TaxWise AI</h1>
          <p className="text-muted-foreground text-sm">
            Enterprise-grade W-2 tax return automation
          </p>
        </div>

        <Button 
          className="w-full" 
          size="lg" 
          onClick={() => login()}
          disabled={isLoading}
        >
          {isLoading ? "Loading..." : "Log in to continue"}
        </Button>
      </div>
    </div>
  );
}
