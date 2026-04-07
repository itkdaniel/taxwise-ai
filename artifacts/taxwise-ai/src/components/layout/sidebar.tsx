import { Link, useLocation } from "wouter";
import { cn } from "@/lib/utils";
import { useAuth } from "@workspace/replit-auth-web";
import { 
  LayoutDashboard, 
  FileText, 
  Upload, 
  BrainCircuit, 
  Network, 
  Activity, 
  TerminalSquare, 
  Settings,
  LogOut
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

const navItems = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard },
  { href: "/tax-returns", label: "Tax Returns", icon: FileText },
  { href: "/w2-upload", label: "W-2 Upload", icon: Upload },
  { href: "/ai-agent", label: "AI Agent", icon: BrainCircuit },
  { href: "/knowledge-graph", label: "Knowledge Graph", icon: Network },
  { href: "/test-reports", label: "Test Reports", icon: Activity },
  { href: "/logs", label: "System Logs", icon: TerminalSquare },
];

export function Sidebar() {
  const [location] = useLocation();
  const { user, logout } = useAuth();

  return (
    <aside className="w-64 border-r bg-card flex flex-col h-full flex-shrink-0">
      <div className="p-6">
        <h1 className="text-xl font-bold tracking-tight text-primary flex items-center gap-2">
          <BrainCircuit className="h-6 w-6" />
          TaxWise AI
        </h1>
      </div>
      
      <nav className="flex-1 px-4 space-y-1 overflow-y-auto">
        {navItems.map((item) => {
          const isActive = location === item.href || (item.href !== "/" && location.startsWith(item.href));
          return (
            <Link 
              key={item.href} 
              href={item.href}
              className={cn(
                "flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors",
                isActive 
                  ? "bg-primary/10 text-primary" 
                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
              )}
            >
              <item.icon className="h-4 w-4" />
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="p-4 border-t mt-auto space-y-4">
        <Link 
          href="/settings"
          className={cn(
            "flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors",
            location.startsWith("/settings")
              ? "bg-primary/10 text-primary" 
              : "text-muted-foreground hover:bg-muted hover:text-foreground"
          )}
        >
          <Settings className="h-4 w-4" />
          Settings
        </Link>
        
        {user && (
          <div className="flex items-center gap-3 px-3 py-2">
            <Avatar className="h-8 w-8">
              <AvatarImage src={user.profileImageUrl || undefined} />
              <AvatarFallback>{user.firstName?.[0] || 'U'}</AvatarFallback>
            </Avatar>
            <div className="flex-1 overflow-hidden">
              <p className="text-sm font-medium truncate">{user.firstName} {user.lastName}</p>
              <p className="text-xs text-muted-foreground truncate">{user.email}</p>
            </div>
            <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground" onClick={() => logout()}>
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        )}
      </div>
    </aside>
  );
}
