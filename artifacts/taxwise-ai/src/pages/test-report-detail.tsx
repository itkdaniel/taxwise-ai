import { useParams } from "wouter";
import { useGetTestReport } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Loader2, Download, ArrowLeft, CheckCircle2, XCircle, AlertCircle } from "lucide-react";
import { Link } from "wouter";

export default function TestReportDetail() {
  const params = useParams();
  const id = parseInt(params.id || "0", 10);
  const { data: report, isLoading } = useGetTestReport(id, { query: { enabled: !!id } });

  const getStatusIcon = (status: string) => {
    switch(status) {
      case 'passed': return <CheckCircle2 className="w-5 h-5 text-green-500" />;
      case 'failed': return <XCircle className="w-5 h-5 text-red-500" />;
      default: return <AlertCircle className="w-5 h-5 text-yellow-500" />;
    }
  };

  if (isLoading || !report) {
    return <div className="flex h-[50vh] justify-center items-center"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
  }

  return (
    <div className="p-8 max-w-5xl mx-auto space-y-6">
      <div className="flex items-center gap-4 mb-2">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/test-reports"><ArrowLeft className="w-4 h-4" /></Link>
        </Button>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{report.name}</h1>
          <p className="text-muted-foreground">
            Executed on {new Date(report.createdAt).toLocaleString()} • {report.environment || 'Default Env'}
          </p>
        </div>
        <div className="ml-auto">
          <Button variant="outline">
            <Download className="w-4 h-4 mr-2" />
            Export
          </Button>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Status</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-xl font-bold uppercase flex items-center gap-2">
              {getStatusIcon(report.status)}
              {report.status}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Tests</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{report.totalTests}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Passed</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-500">{report.passedTests}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Failed</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-500">{report.failedTests}</div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Test Cases</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {report.testCases?.map((tc) => (
              <div key={tc.id} className="p-4 border rounded-lg flex items-start gap-4 bg-background">
                {getStatusIcon(tc.status)}
                <div className="flex-1">
                  <div className="flex justify-between">
                    <h3 className="font-semibold">{tc.name}</h3>
                    <div className="text-xs text-muted-foreground">{tc.duration}ms</div>
                  </div>
                  {tc.description && <p className="text-sm text-muted-foreground mt-1">{tc.description}</p>}
                  
                  {tc.status === 'failed' && tc.errorMessage && (
                    <div className="mt-3 p-3 bg-red-500/10 text-red-600 border border-red-500/20 rounded-md text-sm font-mono whitespace-pre-wrap break-all">
                      {tc.errorMessage}
                    </div>
                  )}
                </div>
              </div>
            ))}
            
            {(!report.testCases || report.testCases.length === 0) && (
              <div className="text-center py-8 text-muted-foreground">
                No test cases associated with this report.
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
