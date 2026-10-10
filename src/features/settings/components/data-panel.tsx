"use client";

import Link from "next/link";
import { DatabaseBackup, Download, FileBarChart, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { useServerAction } from "@/hooks/use-server-action";
import { downloadFile } from "@/lib/csv";
import { exportBackup, loadDemoData } from "../actions";

export function DataPanel({ hasClients }: { hasClients: boolean }) {
  const { run, pending } = useServerAction();
  return (
    <div className="space-y-5">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><DatabaseBackup className="h-5 w-5 text-primary" />Backup</CardTitle>
          <CardDescription>Download everything (clients, appointments, stock, finance, gallery links) as one JSON file. Keep it somewhere safe.</CardDescription>
        </CardHeader>
        <CardContent>
          <Button loading={pending} onClick={() => run(() => exportBackup(), {
            refresh: false,
            onSuccess: (json) => { downloadFile(json, `wissnails-backup-${new Date().toISOString().slice(0, 10)}.json`, "application/json"); toast.success("Backup downloaded"); },
          })}><Download />Download backup</Button>
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><FileBarChart className="h-5 w-5 text-primary" />Exports</CardTitle>
          <CardDescription>CSV exports are on each page; full reports in PDF and Excel are in Reports.</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-2">
          <Button variant="outline" asChild><Link href="/clients">Clients CSV</Link></Button>
          <Button variant="outline" asChild><Link href="/appointments">Appointments CSV</Link></Button>
          <Button variant="outline" asChild><Link href="/stock">Stock CSV</Link></Button>
          <Button variant="outline" asChild><Link href="/reports">Reports</Link></Button>
        </CardContent>
      </Card>
      {!hasClients && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><Sparkles className="h-5 w-5 text-primary" />Try with demo data</CardTitle>
            <CardDescription>Fills this empty account with 12 clients, 6 months of appointments, stock, expenses and reviews to explore the studio.</CardDescription>
          </CardHeader>
          <CardContent>
            <ConfirmDialog title="Load demo data?" description="Only possible on an account without clients. You can delete the demo clients afterwards."
              confirmLabel="Load demo data" destructive={false}
              onConfirm={() => run(() => loadDemoData(), { success: "Demo data loaded" })}
              trigger={<Button variant="secondary">Load demo data</Button>} />
          </CardContent>
        </Card>
      )}
    </div>
  );
}
