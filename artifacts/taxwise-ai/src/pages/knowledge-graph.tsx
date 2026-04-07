import { useState, useCallback, useMemo } from "react";
import { useGetFullGraph, useListEntities } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Loader2, Search } from "lucide-react";
import ForceGraph3D from "react-force-graph-3d";
import ForceGraph2D from "react-force-graph-2d";

// Fallback for D3 to just use 2D for simplicity in this mockup, or we could implement a custom D3
export default function KnowledgeGraph() {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedEntityId, setSelectedEntityId] = useState<number | null>(null);
  const [viewMode, setViewMode] = useState("3d");

  const { data: graphData, isLoading: isGraphLoading } = useGetFullGraph();
  const { data: entities, isLoading: isEntitiesLoading } = useListEntities({ search: searchTerm });

  const selectedEntity = useMemo(() => {
    if (!selectedEntityId || !graphData) return null;
    const entity = graphData.nodes.find(n => n.id === selectedEntityId);
    if (!entity) return null;
    const connections = graphData.edges.filter(e => e.sourceId === selectedEntityId || e.targetId === selectedEntityId);
    return { ...entity, connections };
  }, [selectedEntityId, graphData]);

  const handleNodeClick = useCallback((node: any) => {
    setSelectedEntityId(node.id);
  }, []);

  const graphNodes = useMemo(() => {
    if (!graphData) return [];
    return graphData.nodes.map(n => ({
      ...n,
      color: n.type === 'person' ? '#3b82f6' : n.type === 'company' ? '#10b981' : '#f59e0b',
      val: n.connectionCount || 1,
    }));
  }, [graphData]);

  const graphLinks = useMemo(() => {
    if (!graphData) return [];
    return graphData.edges.map(e => ({
      source: e.sourceId,
      target: e.targetId,
      name: e.relationshipType
    }));
  }, [graphData]);

  return (
    <div className="flex h-full w-full">
      <div className="flex-1 flex flex-col h-full overflow-hidden">
        <div className="p-4 border-b bg-background flex items-center justify-between z-10 relative">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Knowledge Graph</h1>
            <p className="text-muted-foreground text-sm">Visualize entities and relationships</p>
          </div>
          <Tabs value={viewMode} onValueChange={setViewMode}>
            <TabsList>
              <TabsTrigger value="3d">3D View</TabsTrigger>
              <TabsTrigger value="2d">2D View</TabsTrigger>
            </TabsList>
          </Tabs>
        </div>

        <div className="flex-1 relative bg-black/5">
          {isGraphLoading ? (
            <div className="absolute inset-0 flex items-center justify-center">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
          ) : graphData ? (
            <div className="w-full h-full overflow-hidden">
              {viewMode === '3d' ? (
                <ForceGraph3D
                  graphData={{ nodes: graphNodes, links: graphLinks }}
                  nodeLabel="name"
                  nodeColor="color"
                  onNodeClick={handleNodeClick}
                  linkDirectionalArrowLength={3.5}
                  linkDirectionalArrowRelPos={1}
                />
              ) : (
                <ForceGraph2D
                  graphData={{ nodes: graphNodes, links: graphLinks }}
                  nodeLabel="name"
                  nodeColor="color"
                  onNodeClick={handleNodeClick}
                  linkDirectionalArrowLength={3.5}
                  linkDirectionalArrowRelPos={1}
                />
              )}
            </div>
          ) : null}
        </div>
      </div>

      <div className="w-80 border-l bg-background flex flex-col h-full flex-shrink-0">
        <div className="p-4 border-b">
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input 
              type="search" 
              placeholder="Search entities..." 
              className="pl-8"
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4">
          {selectedEntity ? (
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-bold">{selectedEntity.name}</h3>
                <div className="text-sm text-muted-foreground capitalize">{selectedEntity.type}</div>
              </div>
              
              {selectedEntity.description && (
                <div>
                  <h4 className="text-sm font-medium mb-1">Description</h4>
                  <p className="text-sm text-muted-foreground">{selectedEntity.description}</p>
                </div>
              )}

              {selectedEntity.properties && Object.keys(selectedEntity.properties).length > 0 && (
                <div>
                  <h4 className="text-sm font-medium mb-2">Properties</h4>
                  <div className="bg-muted p-3 rounded-md text-sm space-y-2">
                    {Object.entries(selectedEntity.properties).map(([key, value]) => (
                      <div key={key} className="flex justify-between">
                        <span className="text-muted-foreground">{key}:</span>
                        <span className="font-medium text-right max-w-[150px] truncate" title={String(value)}>{String(value)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div>
                <h4 className="text-sm font-medium mb-2">Connections ({selectedEntity.connections?.length || 0})</h4>
                <div className="space-y-2">
                  {selectedEntity.connections?.map(conn => {
                    const isSource = conn.sourceId === selectedEntity.id;
                    const otherId = isSource ? conn.targetId : conn.sourceId;
                    const otherNode = graphData?.nodes.find(n => n.id === otherId);
                    return (
                      <div key={conn.id} className="p-2 border rounded-md text-sm cursor-pointer hover:bg-muted transition-colors" onClick={() => setSelectedEntityId(otherId)}>
                        <div className="text-xs text-muted-foreground">{conn.relationshipType}</div>
                        <div className="font-medium">{otherNode?.name || `Entity #${otherId}`}</div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          ) : (
            <div className="text-center text-muted-foreground py-8">
              Select a node to view details
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
