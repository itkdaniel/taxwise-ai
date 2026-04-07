import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Upload, FilePlus, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ObjectUploader } from "@workspace/object-storage-web";
import { useToast } from "@/hooks/use-toast";
import { useCreateW2Document, useCreateTaxReturn } from "@workspace/api-client-react";

export default function W2Upload() {
  const { toast } = useToast();
  const [taxReturnId, setTaxReturnId] = useState<string>("1");
  const createW2Mutation = useCreateW2Document();

  const handleUploadComplete = async (result: any) => {
    try {
      await createW2Mutation.mutateAsync({
        data: {
          taxReturnId: parseInt(taxReturnId, 10),
          employerName: "Extracted from PDF",
          taxYear: 2024,
          objectPath: result.objectPath
        }
      });
      toast({ title: "W-2 Uploaded", description: "Document sent for extraction." });
    } catch (err: any) {
      toast({ title: "Failed to attach W-2", description: err.message, variant: "destructive" });
    }
  };

  return (
    <div className="p-8 max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">W-2 Upload</h1>
        <p className="text-muted-foreground">Upload your W-2 documents for AI extraction or enter manually.</p>
      </div>

      <div className="mb-6 max-w-sm">
        <Label htmlFor="taxReturnId">Tax Return ID</Label>
        <Input 
          id="taxReturnId" 
          type="number" 
          value={taxReturnId} 
          onChange={e => setTaxReturnId(e.target.value)} 
          placeholder="Enter ID"
        />
      </div>

      <Tabs defaultValue="upload" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="upload"><Upload className="w-4 h-4 mr-2" /> PDF Upload</TabsTrigger>
          <TabsTrigger value="manual"><FilePlus className="w-4 h-4 mr-2" /> Manual Entry</TabsTrigger>
        </TabsList>
        <TabsContent value="upload">
          <Card>
            <CardHeader>
              <CardTitle>Drag & Drop</CardTitle>
              <CardDescription>Upload a PDF W-2 for automated data extraction.</CardDescription>
            </CardHeader>
            <CardContent className="flex justify-center p-12 border-2 border-dashed rounded-lg m-6 mt-0">
              <ObjectUploader
                onGetUploadParameters={async (file) => {
                  const res = await fetch("/api/storage/uploads/request-url", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                      name: file.name,
                      size: file.size,
                      contentType: file.type,
                    }),
                  });
                  const { uploadURL } = await res.json();
                  return { method: "PUT", url: uploadURL, headers: { "Content-Type": file.type } };
                }}
                onComplete={handleUploadComplete}
              >
                Select W-2 File
              </ObjectUploader>
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="manual">
          <Card>
            <CardHeader>
              <CardTitle>Manual Entry</CardTitle>
              <CardDescription>Enter your W-2 details manually if you don't have a digital copy.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Employer Name</Label>
                  <Input placeholder="Acme Corp" />
                </div>
                <div className="space-y-2">
                  <Label>Employer EIN</Label>
                  <Input placeholder="XX-XXXXXXX" />
                </div>
                <div className="space-y-2">
                  <Label>Wages, Tips, Other Comp</Label>
                  <Input type="number" placeholder="0.00" />
                </div>
                <div className="space-y-2">
                  <Label>Federal Income Tax Withheld</Label>
                  <Input type="number" placeholder="0.00" />
                </div>
              </div>
              <Button className="w-full mt-4">Save Manual Entry</Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
