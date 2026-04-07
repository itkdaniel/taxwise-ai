import { useGetAiAgentConfig, useListAiModels, useUpdateAiAgentConfig } from "@workspace/api-client-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";
import { useState, useEffect } from "react";

export default function AiAgent() {
  const { data: config, isLoading: isConfigLoading } = useGetAiAgentConfig();
  const { data: models, isLoading: isModelsLoading } = useListAiModels();
  const updateConfig = useUpdateAiAgentConfig();
  const { toast } = useToast();

  const [localConfig, setLocalConfig] = useState<any>(null);

  useEffect(() => {
    if (config) setLocalConfig(config);
  }, [config]);

  const handleSave = async () => {
    if (!localConfig) return;
    try {
      await updateConfig.mutateAsync({ data: localConfig });
      toast({ title: "Settings saved", description: "AI Agent configuration updated." });
    } catch (e: any) {
      toast({ title: "Failed to save", description: e.message, variant: "destructive" });
    }
  };

  if (isConfigLoading || isModelsLoading || !localConfig) {
    return <div className="flex h-64 items-center justify-center"><Loader2 className="w-8 h-8 animate-spin" /></div>;
  }

  return (
    <div className="p-8 max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">AI Agent Config</h1>
        <p className="text-muted-foreground">Manage the extraction models and heuristics engine.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Model Selection</CardTitle>
          <CardDescription>Choose the OpenRouter models used for OCR and logic.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <Label>Primary Model</Label>
            <Select value={localConfig.primaryModel} onValueChange={v => setLocalConfig({...localConfig, primaryModel: v})}>
              <SelectTrigger>
                <SelectValue placeholder="Select model" />
              </SelectTrigger>
              <SelectContent>
                {models?.map(m => (
                  <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>
                ))}
                {!models?.length && <SelectItem value="openai/gpt-4o">GPT-4o (Fallback)</SelectItem>}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-4">
            <div className="flex justify-between">
              <Label>Temperature: {localConfig.temperature}</Label>
            </div>
            <Slider 
              value={[localConfig.temperature]} 
              min={0} max={1} step={0.1}
              onValueChange={v => setLocalConfig({...localConfig, temperature: v[0]})}
            />
          </div>

          <div className="flex items-center justify-between border p-4 rounded-lg">
            <div className="space-y-0.5">
              <Label>Enable OCR Extraction</Label>
              <p className="text-sm text-muted-foreground">Use vision models to read W-2s.</p>
            </div>
            <Switch 
              checked={localConfig.enableOcr} 
              onCheckedChange={v => setLocalConfig({...localConfig, enableOcr: v})} 
            />
          </div>

          <Button onClick={handleSave} disabled={updateConfig.isPending}>
            {updateConfig.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            Save Configuration
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
