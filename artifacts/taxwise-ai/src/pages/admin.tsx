import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@workspace/replit-auth-web";
import { Redirect } from "wouter";
import {
  Users,
  FileText,
  DollarSign,
  TrendingUp,
  ShieldCheck,
  Loader2,
  AlertTriangle,
  Upload,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

function getAdminUser() {
  const adminIds = (import.meta.env.VITE_ADMIN_USER_IDS || "").split(",").map((s: string) => s.trim());
  const adminEmails = (import.meta.env.VITE_ADMIN_EMAILS || "").split(",").map((s: string) => s.trim());
  return { adminIds, adminEmails };
}

interface AdminStats {
  totals: {
    users: number;
    taxReturns: number;
    w2Documents: number;
    totalRefunds: number;
    totalOwed: number;
  };
  statusBreakdown: { status: string; count: number }[];
  recentUsers: { id: string; email: string | null; firstName: string | null; lastName: string | null; createdAt: string }[];
  recentReturns: { id: number; userId: string; taxYear: number; status: string; createdAt: string; estimatedRefund: string | null; estimatedOwed: string | null }[];
}

function formatCurrency(n: number) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(n);
}

const STATUS_COLORS: Record<string, string> = {
  draft: "#94a3b8",
  processing: "#f59e0b",
  validated: "#6366f1",
  complete: "#22c55e",
  error: "#ef4444",
};

function StatusBadge({ status }: { status: string }) {
  const variantMap: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
    draft: "outline",
    processing: "secondary",
    validated: "default",
    complete: "default",
    error: "destructive",
  };
  return (
    <Badge
      variant={variantMap[status] || "outline"}
      className={status === "complete" ? "bg-green-500/15 text-green-600 hover:bg-green-500/20 border-green-500/30" : ""}
    >
      {status}
    </Badge>
  );
}

export default function Admin() {
  const { user, isLoading: authLoading } = useAuth();

  const { adminIds, adminEmails } = getAdminUser();
  const isAdmin =
    !!user &&
    (adminIds.includes(user.id) ||
      adminEmails.includes(user.email || ""));

  const { data, isLoading, error } = useQuery<AdminStats>({
    queryKey: ["admin-stats"],
    queryFn: async () => {
      const res = await fetch(`${BASE}/api/admin/stats`, { credentials: "include" });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return res.json();
    },
    enabled: isAdmin && !authLoading,
    staleTime: 30_000,
  });

  if (authLoading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user || !isAdmin) {
    return <Redirect to="/" />;
  }

  if (isLoading) {
    return (
      <div className="flex h-full items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="flex h-full items-center justify-center p-8">
        <div className="text-center space-y-2">
          <AlertTriangle className="h-8 w-8 text-destructive mx-auto" />
          <p className="text-muted-foreground text-sm">Failed to load admin stats</p>
        </div>
      </div>
    );
  }

  const statCards = [
    { label: "Total Users", value: data.totals.users, icon: Users, color: "text-blue-500" },
    { label: "Tax Returns", value: data.totals.taxReturns, icon: FileText, color: "text-purple-500" },
    { label: "W-2 Documents", value: data.totals.w2Documents, icon: Upload, color: "text-orange-500" },
    {
      label: "Total Refunds",
      value: formatCurrency(data.totals.totalRefunds),
      icon: DollarSign,
      color: "text-green-500",
    },
    {
      label: "Total Owed",
      value: formatCurrency(data.totals.totalOwed),
      icon: TrendingUp,
      color: "text-red-500",
    },
  ];

  return (
    <div className="p-6 space-y-6 max-w-7xl">
      <div className="flex items-center gap-3">
        <ShieldCheck className="h-6 w-6 text-primary" />
        <div>
          <h1 className="text-2xl font-bold">Admin Panel</h1>
          <p className="text-muted-foreground text-sm">Platform overview and management</p>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
        {statCards.map((card) => (
          <Card key={card.label}>
            <CardContent className="pt-6 pb-4">
              <div className="flex items-center justify-between mb-2">
                <p className="text-xs font-medium text-muted-foreground">{card.label}</p>
                <card.icon className={`h-4 w-4 ${card.color}`} />
              </div>
              <p className="text-2xl font-bold">{card.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Returns by Status</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={data.statusBreakdown} margin={{ top: 4, right: 4, bottom: 4, left: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="status" tick={{ fontSize: 11 }} />
                <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
                <Tooltip
                  contentStyle={{
                    background: "hsl(var(--card))",
                    border: "1px solid hsl(var(--border))",
                    borderRadius: 8,
                    fontSize: 12,
                  }}
                />
                <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                  {data.statusBreakdown.map((entry) => (
                    <Cell key={entry.status} fill={STATUS_COLORS[entry.status] || "#94a3b8"} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Recent Users</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-xs">Name</TableHead>
                  <TableHead className="text-xs">Email</TableHead>
                  <TableHead className="text-xs">Joined</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.recentUsers.slice(0, 6).map((u) => (
                  <TableRow key={u.id}>
                    <TableCell className="text-sm font-medium">
                      {[u.firstName, u.lastName].filter(Boolean).join(" ") || "—"}
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">{u.email || "—"}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {new Date(u.createdAt).toLocaleDateString()}
                    </TableCell>
                  </TableRow>
                ))}
                {data.recentUsers.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={3} className="text-center text-muted-foreground text-sm py-6">
                      No users yet
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Recent Tax Returns</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="text-xs">ID</TableHead>
                <TableHead className="text-xs">User</TableHead>
                <TableHead className="text-xs">Year</TableHead>
                <TableHead className="text-xs">Status</TableHead>
                <TableHead className="text-xs text-right">Refund</TableHead>
                <TableHead className="text-xs text-right">Owed</TableHead>
                <TableHead className="text-xs">Filed</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.recentReturns.map((r) => (
                <TableRow key={r.id}>
                  <TableCell className="font-mono text-xs">#{r.id}</TableCell>
                  <TableCell className="text-xs text-muted-foreground truncate max-w-[80px]">{r.userId.slice(0, 8)}…</TableCell>
                  <TableCell className="text-sm">{r.taxYear}</TableCell>
                  <TableCell><StatusBadge status={r.status} /></TableCell>
                  <TableCell className="text-xs text-right text-green-600 dark:text-green-400 font-medium">
                    {r.estimatedRefund ? formatCurrency(Number(r.estimatedRefund)) : "—"}
                  </TableCell>
                  <TableCell className="text-xs text-right text-red-500 font-medium">
                    {r.estimatedOwed ? formatCurrency(Number(r.estimatedOwed)) : "—"}
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    {new Date(r.createdAt).toLocaleDateString()}
                  </TableCell>
                </TableRow>
              ))}
              {data.recentReturns.length === 0 && (
                <TableRow>
                  <TableCell colSpan={7} className="text-center text-muted-foreground text-sm py-6">
                    No returns yet
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
