import { useAuth } from "@workspace/replit-auth-web";
import { Redirect, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { BrainCircuit, UserCheck, Shield, Clock } from "lucide-react";
import { useGuestSession } from "@/hooks/use-guest-session";
import { useState } from "react";

export default function Login() {
  const { isAuthenticated, login, isLoading } = useAuth();
  const { isGuest, startGuestSession } = useGuestSession();
  const [, navigate] = useLocation();
  const [startingGuest, setStartingGuest] = useState(false);

  if (isAuthenticated || isGuest) {
    return <Redirect to="/" />;
  }

  function handleGuest() {
    setStartingGuest(true);
    startGuestSession();
    navigate("/onboarding");
  }

  return (
    <div className="min-h-[100dvh] w-full flex items-center justify-center bg-background text-foreground">
      <div className="w-full max-w-md p-8 space-y-8 bg-card border rounded-xl shadow-lg">
        <div className="flex flex-col items-center text-center space-y-2">
          <div className="h-14 w-14 bg-primary/10 rounded-full flex items-center justify-center mb-2">
            <BrainCircuit className="h-7 w-7 text-primary" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight">Welcome to TaxWise AI</h1>
          <p className="text-muted-foreground text-sm">
            Enterprise-grade W-2 tax return automation, powered by AI
          </p>
        </div>

        <div className="space-y-3">
          <div className="grid grid-cols-3 gap-3 text-center text-xs text-muted-foreground">
            <div className="flex flex-col items-center gap-1">
              <Shield className="h-4 w-4 text-primary" />
              <span>Bank-level security</span>
            </div>
            <div className="flex flex-col items-center gap-1">
              <UserCheck className="h-4 w-4 text-primary" />
              <span>IRS e-file ready</span>
            </div>
            <div className="flex flex-col items-center gap-1">
              <Clock className="h-4 w-4 text-primary" />
              <span>~21 day refund</span>
            </div>
          </div>
        </div>

        <div className="space-y-3">
          <Button
            className="w-full"
            size="lg"
            onClick={() => login()}
            disabled={isLoading}
          >
            {isLoading ? "Loading..." : "Sign in / Register"}
          </Button>

          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-card px-2 text-muted-foreground">or</span>
            </div>
          </div>

          <Button
            variant="outline"
            className="w-full"
            size="lg"
            onClick={handleGuest}
            disabled={startingGuest}
          >
            Continue as Guest
            <span className="ml-2 text-xs text-muted-foreground font-normal">
              — 14-day free trial
            </span>
          </Button>
        </div>

        <p className="text-center text-xs text-muted-foreground">
          By continuing, you agree to our{" "}
          <a
            href="https://www.irs.gov/privacy-disclosure/irs-privacy-policy"
            target="_blank"
            rel="noopener noreferrer"
            className="underline hover:text-foreground"
          >
            Privacy Policy
          </a>{" "}
          and{" "}
          <a href="#" className="underline hover:text-foreground">
            Terms of Service
          </a>
        </p>
      </div>
    </div>
  );
}
