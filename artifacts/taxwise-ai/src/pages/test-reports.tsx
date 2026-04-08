import { useState } from "react";
import { useListTestReports, useGetTestStats } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Link } from "wouter";
import { Loader2, Search, Download, PlayCircle } from "lucide-react";
import { formatCurrency } from "@/lib/utils";


export default function TestReports() {
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  
  const { data: stats, isLoading: isStatsLoading } = useGetTestStats();
  const { data: reports, isLoading: isReportsLoading } = useListTestReports();

  const getPriorityColor = (p: string) => {
    switch (p) {
      case 'critical': return 'bg-red-500 hover:bg-red-600';
      case 'high': return 'bg-orange-500 hover:bg-orange-600';
      case 'medium': return 'bg-yellow-500 text-black hover:bg-yellow-600';
      case 'low': return 'bg-blue-500 hover:bg-blue-600';
      default: return 'bg-gray-500';
    }
  };

  const getStatusColor = (s: string) => {
    switch (s) {
      case 'passed': return 'bg-green-500 hover:bg-green-600';
      case 'failed': return 'bg-red-500 hover:bg-red-600';
      case 'partial': return 'bg-yellow-500 text-black hover:bg-yellow-600';
      case 'running': return 'bg-blue-500 hover:bg-blue-600';
      case 'error': return 'bg-red-500 hover:bg-red-600';
      default: return 'bg-gray-500 hover:bg-gray-600';
    }
  };

  const filteredReports = reports?.filter(r => {
    const matchesSearch = r.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || r.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Test Reports</h1>
          <p className="text-muted-foreground">QA and validation test execution history.</p>
        </div>
        <Button>
          <PlayCircle className="w-4 h-4 mr-2" />
          Run Tests
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Reports</CardTitle>
          </CardHeader>
          <CardContent>
            {isStatsLoading ? <div className="h-8 w-16 bg-muted animate-pulse rounded"></div> : (
              <div className="text-2xl font-bold">{stats?.totalReports || 0}</div>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Tests</CardTitle>
          </CardHeader>
          <CardContent>
            {isStatsLoading ? <div className="h-8 w-16 bg-muted animate-pulse rounded"></div> : (
              <div className="text-2xl font-bold">{stats?.totalTests || 0}</div>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Pass Rate</CardTitle>
          </CardHeader>
          <CardContent>
            {isStatsLoading ? <div className="h-8 w-16 bg-muted animate-pulse rounded"></div> : (
              <div className="text-2xl font-bold text-green-500">{stats?.passRate || 0}%</div>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Execution History</CardTitle>
            <div className="flex gap-2">
              <div className="relative w-64">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input 
                  placeholder="Search reports..." 
                  className="pl-8" 
                  value={searchTerm}
                  onChange={e => setSearchTerm(e.target.value)}
                />
              </div>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-40">
                  <SelectValue placeholder="Filter Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value="passed">Passed</SelectItem>
                  <SelectItem value="failed">Failed</SelectItem>
                  <SelectItem value="running">Running</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isReportsLoading ? (
            <div className="flex justify-center p-8"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Priority</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Pass Rate</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredReports?.map(report => (
                  <TableRow key={report.id}>
                    <TableCell>
                      <Link href={`/test-reports/${report.id}`} className="font-medium text-primary hover:underline">
                        {report.name}
                      </Link>
                      <div className="text-xs text-muted-foreground">{new Date(report.createdAt).toLocaleString()}</div>
                    </TableCell>
                    <TableCell className="capitalize">{report.type}</TableCell>
                    <TableCell>
                      <Badge className={getPriorityColor(report.priority)}>{report.priority}</Badge>
                    </TableCell>
                    <TableCell>
                      <Badge className={getStatusColor(report.status)}>
                        {report.status}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {report.totalTests > 0 ? (
                        <div className="flex items-center gap-2">
                          <div className="w-16 h-2 bg-muted rounded-full overflow-hidden">
                            <div 
                              className={`h-full ${report.passedTests === report.totalTests ? 'bg-green-500' : 'bg-red-500'}`} 
                              style={{ width: `${(report.passedTests / report.totalTests) * 100}%` }}
                            />
                          </div>
                          <span className="text-xs">{Math.round((report.passedTests / report.totalTests) * 100)}%</span>
                        </div>
                      ) : 'N/A'}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="icon">
                        <Download className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
                {filteredReports?.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                      No test reports found matching criteria.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
