import { ReactNode } from "react";
import { Sidebar } from "./sidebar";
import { useAuth } from "@workspace/replit-auth-web";
import { Redirect } from "wouter";
import { Loader2 } from "lucide-react";
import { motion } from "framer-motion";

export function AppLayout({ children }: { children: ReactNode }) {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Redirect to="/login" />;
  }

  return (
    <div className="flex h-[100dvh] w-full overflow-hidden bg-background text-foreground">
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
  );
}
