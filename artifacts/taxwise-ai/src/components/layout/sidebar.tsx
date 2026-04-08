import { Link, useLocation } from "wouter";
import { cn } from "@/lib/utils";
import { useAuth } from "@workspace/replit-auth-web";
import { useGuestSession } from "@/hooks/use-guest-session";
import { useTheme } from "@/components/theme-provider";
import {
  LayoutDashboard,
  FileText,
  Upload,
  BrainCircuit,
  Network,
  Activity,
  TerminalSquare,
  Settings,
  LogOut,
  Sun,
  Moon,
  Monitor,
  ShieldCheck,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const navItems = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard },
  { href: "/tax-returns", label: "Tax Returns", icon: FileText },
  { href: "/w2-upload", label: "W-2 Upload", icon: Upload },
  { href: "/ai-agent", label: "AI Agent", icon: BrainCircuit },
  { href: "/knowledge-graph", label: "Knowledge Graph", icon: Network },
  { href: "/test-reports", label: "Test Reports", icon: Activity },
  { href: "/logs", label: "System Logs", icon: TerminalSquare },
];

function ThemeToggle() {
  const { theme, setTheme } = useTheme();

  const icon =
    theme === "dark" ? (
      <Moon className="h-4 w-4" />
    ) : theme === "light" ? (
      <Sun className="h-4 w-4" />
    ) : (
      <Monitor className="h-4 w-4" />
    );

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 text-muted-foreground"
          title="Toggle theme"
        >
          {icon}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" side="right">
        <DropdownMenuItem onClick={() => setTheme("light")}>
          <Sun className="h-4 w-4 mr-2" /> Light
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => setTheme("dark")}>
          <Moon className="h-4 w-4 mr-2" /> Dark
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => setTheme("system")}>
          <Monitor className="h-4 w-4 mr-2" /> System
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export function Sidebar() {
  const [location] = useLocation();
  const { user, logout } = useAuth();
  const { isGuest, clearGuestSession } = useGuestSession();

  const adminIds = (import.meta.env.VITE_ADMIN_USER_IDS || "").split(",").map((s: string) => s.trim());
  const isAdmin =
    !!user &&
    (adminIds.includes(user.id) ||
      (import.meta.env.VITE_ADMIN_EMAILS || "")
        .split(",")
        .map((s: string) => s.trim())
        .includes(user.email || ""));

  function handleLogout() {
    if (isGuest) {
      clearGuestSession();
    } else {
      logout();
    }
  }

  const displayName = isGuest
    ? "Guest User"
    : user
      ? `${user.firstName || ""} ${user.lastName || ""}`.trim() || "User"
      : "";

  const displayEmail = isGuest ? "14-day trial" : user?.email || "";
  const avatarFallback = isGuest ? "G" : user?.firstName?.[0] || "U";

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
          const isActive =
            location === item.href ||
            (item.href !== "/" && location.startsWith(item.href));
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

        {isAdmin && (
          <Link
            href="/admin"
            className={cn(
              "flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors",
              location.startsWith("/admin")
                ? "bg-primary/10 text-primary"
                : "text-muted-foreground hover:bg-muted hover:text-foreground"
            )}
          >
            <ShieldCheck className="h-4 w-4" />
            Admin Panel
          </Link>
        )}
      </nav>

      <div className="p-4 border-t mt-auto space-y-3">
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

        <div className="flex items-center gap-3 px-3 py-2">
          <Avatar className="h-8 w-8">
            {!isGuest && user?.profileImageUrl && (
              <AvatarImage src={user.profileImageUrl} />
            )}
            <AvatarFallback>{avatarFallback}</AvatarFallback>
          </Avatar>
          <div className="flex-1 overflow-hidden">
            <p className="text-sm font-medium truncate">{displayName}</p>
            <p className="text-xs text-muted-foreground truncate">{displayEmail}</p>
          </div>
          <ThemeToggle />
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-muted-foreground"
            onClick={handleLogout}
            title={isGuest ? "Exit guest mode" : "Log out"}
          >
            <LogOut className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </aside>
  );
}
