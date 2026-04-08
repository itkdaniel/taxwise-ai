import { useGetTaxReturnSummary, useListTaxReturns } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FileText, DollarSign, AlertCircle, Upload } from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import { Link } from "wouter";
import { Badge } from "@/components/ui/badge";

export default function Dashboard() {
  const { data: summary, isLoading: isSummaryLoading } = useGetTaxReturnSummary();
  const { data: recentReturns, isLoading: isReturnsLoading } = useListTaxReturns();

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground">Overview of tax return processing and automation.</p>
      </div>

      {isSummaryLoading ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 animate-pulse">
          {[1,2,3,4].map(i => <div key={i} className="h-32 bg-muted rounded-xl"></div>)}
        </div>
      ) : summary ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Returns</CardTitle>
              <FileText className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{summary.totalReturns}</div>
              <p className="text-xs text-muted-foreground">
                {summary.completedReturns} completed
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Est. Refunds</CardTitle>
              <DollarSign className="h-4 w-4 text-green-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-500">{formatCurrency(summary.totalEstimatedRefunds)}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Est. Owed</CardTitle>
              <DollarSign className="h-4 w-4 text-red-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-500">{formatCurrency(summary.totalEstimatedOwed)}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Pending Action</CardTitle>
              <AlertCircle className="h-4 w-4 text-orange-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{summary.pendingReturns}</div>
            </CardContent>
          </Card>
        </div>
      ) : null}

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
        <Card className="col-span-4">
          <CardHeader>
            <CardTitle>Recent Activity</CardTitle>
          </CardHeader>
          <CardContent>
            {isReturnsLoading ? (
              <div className="space-y-4 animate-pulse">
                {[1,2,3].map(i => <div key={i} className="h-12 bg-muted rounded-md"></div>)}
              </div>
            ) : recentReturns?.length ? (
              <div className="space-y-4">
                {recentReturns.map(ret => (
                  <div key={ret.id} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex flex-col">
                      <Link href={`/tax-returns/${ret.id}`} className="font-medium hover:underline">
                        Return #{ret.id} - {ret.taxYear}
                      </Link>
                      <span className="text-xs text-muted-foreground">{new Date(ret.createdAt).toLocaleDateString()}</span>
                    </div>
                    <Badge variant={ret.status === 'complete' ? 'default' : ret.status === 'error' ? 'destructive' : 'secondary'}>
                      {ret.status}
                    </Badge>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">No recent activity.</div>
            )}
          </CardContent>
        </Card>
        
        <Card className="col-span-3">
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Link href="/w2-upload" className="flex items-center gap-3 p-4 border rounded-lg hover:bg-muted transition-colors">
              <div className="bg-primary/10 p-2 rounded-full"><Upload className="h-5 w-5 text-primary" /></div>
              <div>
                <div className="font-medium">Upload W-2</div>
                <div className="text-xs text-muted-foreground">Process new documents</div>
              </div>
            </Link>
            <Link href="/tax-returns" className="flex items-center gap-3 p-4 border rounded-lg hover:bg-muted transition-colors">
              <div className="bg-primary/10 p-2 rounded-full"><FileText className="h-5 w-5 text-primary" /></div>
              <div>
                <div className="font-medium">View Returns</div>
                <div className="text-xs text-muted-foreground">Manage all tax returns</div>
              </div>
            </Link>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
