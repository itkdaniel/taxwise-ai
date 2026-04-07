import { useParams } from "wouter";
import { useGetTaxReturn, useListW2Documents, useCalculateTaxReturn, useValidateTaxReturn } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatCurrency } from "@/lib/utils";
import { Loader2, Calculator, CheckCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";

export default function TaxReturnDetail() {
  const params = useParams();
  const id = parseInt(params.id || "0", 10);
  const { data: taxReturn, isLoading } = useGetTaxReturn(id, { query: { enabled: !!id } });
  const { data: w2s, isLoading: isW2Loading } = useListW2Documents({ taxReturnId: id }, { query: { enabled: !!id } });
  const calculateMutation = useCalculateTaxReturn();
  const validateMutation = useValidateTaxReturn();
  const { toast } = useToast();

  const handleCalculate = async () => {
    try {
      await calculateMutation.mutateAsync({ data: undefined as any }, { request: { method: 'POST', url: `/api/tax-returns/${id}/calculate` } as any } as any);
      toast({ title: "Calculation complete", description: "Tax return calculated successfully." });
    } catch (err: any) {
      toast({ title: "Calculation failed", description: err.message, variant: "destructive" });
    }
  };

  const handleValidate = async () => {
    try {
      await validateMutation.mutateAsync({ data: undefined as any }, { request: { method: 'POST', url: `/api/tax-returns/${id}/validate` } as any } as any);
      toast({ title: "Validation complete", description: "Tax return validated successfully." });
    } catch (err: any) {
      toast({ title: "Validation failed", description: err.message, variant: "destructive" });
    }
  };

  if (isLoading || !taxReturn) {
    return <div className="flex h-[50vh] justify-center items-center"><Loader2 className="h-8 w-8 animate-spin" /></div>;
  }

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Tax Return #{taxReturn.id}</h1>
          <p className="text-muted-foreground">Tax Year {taxReturn.taxYear} • {taxReturn.filingStatus.replace(/_/g, ' ')}</p>
        </div>
        <div className="flex gap-3">
          <Button onClick={handleCalculate} disabled={calculateMutation.isPending} variant="outline">
            {calculateMutation.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Calculator className="mr-2 h-4 w-4" />}
            Calculate
          </Button>
          <Button onClick={handleValidate} disabled={validateMutation.isPending}>
            {validateMutation.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <CheckCircle className="mr-2 h-4 w-4" />}
            Validate
          </Button>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Summary</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Status</span>
              <Badge>{taxReturn.status}</Badge>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Total Wages</span>
              <span className="font-medium">{formatCurrency(taxReturn.totalWages)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Fed. Withheld</span>
              <span className="font-medium">{formatCurrency(taxReturn.federalTaxWithheld)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Est. Refund</span>
              <span className="font-medium text-green-500">{formatCurrency(taxReturn.estimatedRefund)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Est. Owed</span>
              <span className="font-medium text-red-500">{formatCurrency(taxReturn.estimatedOwed)}</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>W-2 Documents</CardTitle>
          </CardHeader>
          <CardContent>
            {isW2Loading ? (
              <Loader2 className="h-6 w-6 animate-spin mx-auto" />
            ) : w2s?.length ? (
              <div className="space-y-4">
                {w2s.map(w2 => (
                  <div key={w2.id} className="flex justify-between items-center p-3 border rounded-md">
                    <div>
                      <div className="font-medium">{w2.employerName}</div>
                      <div className="text-xs text-muted-foreground">EIN: {w2.employerEin || 'N/A'} • {formatCurrency(w2.wagesAndTips)}</div>
                    </div>
                    <Badge variant="outline">{w2.status}</Badge>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center text-muted-foreground py-4">No W-2 documents found.</div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
