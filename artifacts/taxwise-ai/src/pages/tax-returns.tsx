import { useListTaxReturns } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { formatCurrency } from "@/lib/utils";
import { Link } from "wouter";
import { Loader2 } from "lucide-react";
import { motion } from "framer-motion";

export default function TaxReturns() {
  const { data: returns, isLoading } = useListTaxReturns();

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Tax Returns</h1>
          <p className="text-muted-foreground">Manage all federal tax returns.</p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>All Returns</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center p-8">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>ID</TableHead>
                  <TableHead>Tax Year</TableHead>
                  <TableHead>Filing Status</TableHead>
                  <TableHead>Est. Refund</TableHead>
                  <TableHead>Est. Owed</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {returns?.map((ret) => (
                  <TableRow key={ret.id}>
                    <TableCell>
                      <Link href={`/tax-returns/${ret.id}`} className="font-medium text-primary hover:underline">
                        #{ret.id}
                      </Link>
                    </TableCell>
                    <TableCell>{ret.taxYear}</TableCell>
                    <TableCell className="capitalize">{ret.filingStatus.replace(/_/g, ' ')}</TableCell>
                    <TableCell className="text-green-500">{formatCurrency(ret.estimatedRefund)}</TableCell>
                    <TableCell className="text-red-500">{formatCurrency(ret.estimatedOwed)}</TableCell>
                    <TableCell>
                      <Badge variant={ret.status === 'complete' ? 'default' : ret.status === 'error' ? 'destructive' : 'secondary'}>
                        {ret.status}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
                {returns?.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                      No tax returns found.
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
