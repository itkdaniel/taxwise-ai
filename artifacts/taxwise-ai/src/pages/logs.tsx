import { useState, useEffect } from "react";
import { useListLogs } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, RefreshCcw } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function Logs() {
  const [refreshKey, setRefreshKey] = useState(0);
  const { data: logs, isLoading, refetch } = useListLogs({ limit: 100 }, { query: { queryKey: ['logs', refreshKey] as any } });

  const handleRefresh = () => {
    setRefreshKey(prev => prev + 1);
  };

  useEffect(() => {
    const interval = setInterval(handleRefresh, 5000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-6 h-[calc(100vh-2rem)] flex flex-col">
      <div className="flex items-center justify-between flex-shrink-0">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">System Logs</h1>
          <p className="text-muted-foreground">Live streaming infrastructure logs.</p>
        </div>
        <Button variant="outline" size="sm" onClick={handleRefresh}>
          <RefreshCcw className={`w-4 h-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      <Card className="flex-1 flex flex-col overflow-hidden">
        <CardHeader className="py-3 px-4 flex-shrink-0 border-b bg-muted/50">
          <div className="flex gap-2">
            <div className="h-3 w-3 rounded-full bg-red-500"></div>
            <div className="h-3 w-3 rounded-full bg-yellow-500"></div>
            <div className="h-3 w-3 rounded-full bg-green-500"></div>
          </div>
        </CardHeader>
        <CardContent className="flex-1 bg-[#0a0a0a] text-gray-300 font-mono text-xs p-4 overflow-y-auto m-0 rounded-b-xl">
          {isLoading && !logs ? (
            <div className="flex justify-center p-8"><Loader2 className="h-8 w-8 animate-spin text-white" /></div>
          ) : (
            <div className="space-y-1">
              {logs?.map(log => (
                <div key={log.id} className="flex gap-4 hover:bg-white/5 py-0.5 px-2 rounded -mx-2 transition-colors">
                  <span className="text-gray-500 min-w-[170px] select-none">{new Date(log.timestamp).toISOString()}</span>
                  <span className={`min-w-[70px] font-bold select-none ${
                    log.level === 'error' || log.level === 'critical' ? 'text-red-500' :
                    log.level === 'warn' ? 'text-yellow-500' :
                    log.level === 'info' ? 'text-blue-400' : 'text-gray-500'
                  }`}>[{log.level.toUpperCase()}]</span>
                  <span className="text-purple-400 min-w-[120px] select-none truncate">{log.service}</span>
                  <span className={`flex-1 break-all ${
                    log.level === 'critical' ? 'text-red-500 font-bold' :
                    log.level === 'error' ? 'text-red-400' : 'text-gray-100'
                  }`}>{log.message}</span>
                </div>
              ))}
              {logs?.length === 0 && (
                <div className="text-gray-500 py-4 text-center">No logs available.</div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
