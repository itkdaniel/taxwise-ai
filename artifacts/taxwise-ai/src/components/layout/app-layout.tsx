import { ReactNode } from "react";
import { Sidebar } from "./sidebar";
import { useAuth } from "@workspace/replit-auth-web";
import { useGuestSession } from "@/hooks/use-guest-session";
import { Redirect } from "wouter";
import { Loader2, AlertTriangle, LogIn } from "lucide-react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Link } from "wouter";

export function AppLayout({ children }: { children: ReactNode }) {
  const { isAuthenticated, isLoading } = useAuth();
  const { isGuest, trialDaysRemaining, trialExpired } = useGuestSession();

  if (isLoading) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!isAuthenticated && !isGuest) {
    return <Redirect to="/login" />;
  }

  return (
    <div className="flex h-[100dvh] w-full overflow-hidden bg-background text-foreground flex-col">
      {isGuest && (
        <div className="flex-shrink-0 bg-amber-500/10 border-b border-amber-500/20 px-4 py-2 flex items-center justify-between text-xs text-amber-700 dark:text-amber-400">
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-3.5 w-3.5" />
            {trialExpired ? (
              <span>Your 14-day trial has expired. Sign in to continue.</span>
            ) : (
              <span>
                Guest mode — <strong>{trialDaysRemaining} day{trialDaysRemaining !== 1 ? "s" : ""}</strong> remaining in your free trial.
                Data is stored locally only.
              </span>
            )}
          </div>
          <Link href="/login">
            <Button variant="outline" size="sm" className="h-6 text-xs border-amber-500/40 text-amber-700 dark:text-amber-400 hover:bg-amber-500/10">
              <LogIn className="h-3 w-3 mr-1" />
              Sign in
            </Button>
          </Link>
        </div>
      )}
      <div className="flex flex-1 overflow-hidden">
        <Sidebar />
        <main className="flex-1 overflow-y-auto bg-muted/20">
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
            className="h-full"
          >
            {children}
          </motion.div>
        </main>
      </div>
    </div>
  );
}
