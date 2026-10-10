"use client";

import { downloadFile, toCSV } from "@/lib/csv";
import type { ReportData } from "../actions";

const PERIOD_LABEL = { daily: "Rapport journalier", weekly: "Rapport hebdomadaire", monthly: "Rapport mensuel", yearly: "Rapport annuel" } as const;
// jsPDF's built-in fonts can't draw the narrow no-break space Intl uses in fr-FR, so money is formatted by hand.
const eur = (n: number) => `${n.toFixed(2).replace(".", ",").replace(/\B(?=(\d{3})+(?!\d))/g, " ")} €`;
const fileBase = (d: ReportData) => `wissnails-${d.period}-${d.label.replace(/[^\d]+/g, "-").replace(/-$/, "")}`;

export function exportReportCSV(d: ReportData) {
  const summary = toCSV([
    { indicateur: "Chiffre d'affaires", valeur: d.summary.revenue },
    { indicateur: "Dépenses", valeur: d.summary.expenses },
    { indicateur: "Bénéfice", valeur: d.summary.profit },
    { indicateur: `${d.summary.taxLabel} estimé (${d.summary.taxRate} %)`, valeur: d.summary.taxes },
    { indicateur: "Coût produits", valeur: d.summary.productCost },
    { indicateur: "Rendez-vous terminés", valeur: d.summary.appointments },
    { indicateur: "Annulations", valeur: d.summary.cancelled },
    { indicateur: "Panier moyen", valeur: d.summary.averageBasket },
    { indicateur: "Clientes", valeur: d.summary.clients },
  ]);
  const appts = toCSV(d.appointmentRows, [
    { key: "date", label: "Date" }, { key: "client", label: "Cliente" }, { key: "service", label: "Prestation" },
    { key: "status", label: "Statut" }, { key: "payment", label: "Paiement" }, { key: "total", label: "Total" },
    { key: "product_cost", label: "Coût produits" }, { key: "profit", label: "Marge" },
  ]).replace(/^\uFEFF/, "");
  const exps = toCSV(d.expenseRows, [
    { key: "date", label: "Date" }, { key: "category", label: "Catégorie" }, { key: "label", label: "Libellé" },
    { key: "supplier", label: "Fournisseur" }, { key: "amount", label: "Montant" },
  ]).replace(/^\uFEFF/, "");
  downloadFile(`${summary}\r\n\r\nRENDEZ-VOUS\r\n${appts}\r\n\r\nDÉPENSES\r\n${exps}`, `${fileBase(d)}.csv`);
}

export async function exportReportExcel(d: ReportData) {
  const ExcelJS = (await import("exceljs")).default;
  const wb = new ExcelJS.Workbook();
  wb.creator = "WissNails Studio";
  wb.created = new Date();
  const header = { font: { bold: true, color: { argb: "FFFFFFFF" } }, fill: { type: "pattern" as const, pattern: "solid" as const, fgColor: { argb: "FFB76E79" } } };
  const money = '#,##0.00 "€"';

  const style = (ws: import("exceljs").Worksheet, moneyCols: number[]) => {
    ws.getRow(1).eachCell((c) => { c.font = header.font; c.fill = header.fill; });
    ws.views = [{ state: "frozen", ySplit: 1 }];
    moneyCols.forEach((i) => { ws.getColumn(i).numFmt = money; });
  };

  const s = wb.addWorksheet("Synthèse");
  s.columns = [{ header: `${PERIOD_LABEL[d.period]} · ${d.label}`, width: 42 }, { header: "", width: 18 }];
  s.addRows([
    ["Chiffre d'affaires", d.summary.revenue], ["Dépenses", d.summary.expenses], ["Bénéfice", d.summary.profit],
    [`${d.summary.taxLabel} estimé (${d.summary.taxRate} %)`, d.summary.taxes], ["Coût produits", d.summary.productCost],
    ["Panier moyen", d.summary.averageBasket], ["Rendez-vous terminés", d.summary.appointments],
    ["Annulations", d.summary.cancelled], ["Clientes servies", d.summary.clients],
  ]);
  style(s, []);
  for (let r = 2; r <= 7; r++) s.getCell(`B${r}`).numFmt = money;

  const a = wb.addWorksheet("Rendez-vous");
  a.columns = [
    { header: "Date", key: "date", width: 18 }, { header: "Cliente", key: "client", width: 24 }, { header: "Prestation", key: "service", width: 32 },
    { header: "Statut", key: "status", width: 12 }, { header: "Paiement", key: "payment", width: 14 }, { header: "Total", key: "total", width: 12 },
    { header: "Coût produits", key: "product_cost", width: 14 }, { header: "Marge", key: "profit", width: 12 },
  ];
  a.addRows(d.appointmentRows);
  style(a, [6, 7, 8]);

  const e = wb.addWorksheet("Dépenses");
  e.columns = [
    { header: "Date", key: "date", width: 12 }, { header: "Catégorie", key: "category", width: 16 }, { header: "Libellé", key: "label", width: 36 },
    { header: "Fournisseur", key: "supplier", width: 20 }, { header: "Montant", key: "amount", width: 12 },
  ];
  e.addRows(d.expenseRows);
  style(e, [5]);

  const t = wb.addWorksheet("Prestations");
  t.columns = [{ header: "Prestation", key: "name", width: 34 }, { header: "Nombre", key: "count", width: 10 }, { header: "CA", key: "revenue", width: 14 }, { header: "Marge", key: "profit", width: 14 }];
  t.addRows(d.topServices);
  style(t, [3, 4]);

  const buf = await wb.xlsx.writeBuffer();
  downloadFile(buf as ArrayBuffer, `${fileBase(d)}.xlsx`, "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
}

export async function exportReportPDF(d: ReportData) {
  const { jsPDF } = await import("jspdf");
  const autoTable = (await import("jspdf-autotable")).default;
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const W = doc.internal.pageSize.getWidth();
  const rose: [number, number, number] = [183, 110, 121];
  const lastY = () => (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY;

  // header band
  doc.setFillColor(250, 215, 230);
  doc.rect(0, 0, W, 34, "F");
  doc.setTextColor(59, 42, 50);
  doc.setFont("times", "bold"); doc.setFontSize(22);
  doc.text(d.salon?.name ?? "WissNails", 14, 16);
  doc.setFont("helvetica", "normal"); doc.setFontSize(10);
  doc.text(`${PERIOD_LABEL[d.period]} · ${d.label}`, 14, 24);
  doc.text(`Généré le ${new Date().toLocaleDateString("fr-FR")}`, W - 14, 24, { align: "right" });

  // KPI tiles
  const kpis: [string, string][] = [
    ["Chiffre d'affaires", eur(d.summary.revenue)], ["Dépenses", eur(d.summary.expenses)], ["Bénéfice", eur(d.summary.profit)],
    [`${d.summary.taxLabel} estimé`, eur(d.summary.taxes)], ["Rendez-vous", String(d.summary.appointments)], ["Panier moyen", eur(d.summary.averageBasket)],
  ];
  const tileW = (W - 28 - 10) / 3;
  kpis.forEach(([label, value], i) => {
    const x = 14 + (i % 3) * (tileW + 5);
    const y = 42 + Math.floor(i / 3) * 24;
    doc.setDrawColor(240, 220, 228); doc.setFillColor(255, 246, 250);
    doc.roundedRect(x, y, tileW, 19, 3, 3, "FD");
    doc.setFontSize(8); doc.setTextColor(141, 122, 131); doc.text(label, x + 4, y + 6);
    doc.setFontSize(14); doc.setTextColor(59, 42, 50); doc.setFont("helvetica", "bold"); doc.text(value, x + 4, y + 14);
    doc.setFont("helvetica", "normal");
  });

  const table = (title: string, startY: number, head: string[], body: (string | number)[][], right: number[] = []) => {
    doc.setFont("times", "bold"); doc.setFontSize(13); doc.setTextColor(59, 42, 50);
    doc.text(title, 14, startY);
    autoTable(doc, {
      startY: startY + 3, head: [head], body, theme: "plain",
      styles: { fontSize: 8.5, cellPadding: 2, textColor: [59, 42, 50] },
      headStyles: { fillColor: rose, textColor: 255, fontStyle: "bold" },
      alternateRowStyles: { fillColor: [255, 246, 250] },
      columnStyles: Object.fromEntries(right.map((i) => [i, { halign: "right" as const }])),
      margin: { left: 14, right: 14 },
    });
    return lastY() + 10;
  };

  let y = 98;
  if (d.topServices.length) y = table("Prestations", y, ["Prestation", "Nombre", "CA", "Marge"], d.topServices.map((s) => [s.name, s.count, eur(s.revenue), eur(s.profit)]), [1, 2, 3]);
  if (d.paymentMethods.length) y = table("Encaissements", y, ["Moyen de paiement", "Montant"], d.paymentMethods.map((p) => [p.method, eur(p.amount)]), [1]);
  if (d.expenseBreakdown.length) y = table("Dépenses par catégorie", y, ["Catégorie", "Montant"], d.expenseBreakdown.map((e) => [e.label, eur(e.amount)]), [1]);
  if (d.topClients.length) y = table("Meilleures clientes", y, ["Cliente", "Visites", "Dépensé"], d.topClients.map((c) => [c.name, c.visits, eur(c.spent)]), [1, 2]);
  if (d.appointmentRows.length) {
    y = table("Détail des rendez-vous", y, ["Date", "Cliente", "Prestation", "Statut", "Total"],
      d.appointmentRows.map((r) => [r.date, r.client, r.service, r.status, eur(r.total)]), [4]);
  }
  if (d.expenseRows.length) table("Détail des dépenses", y, ["Date", "Catégorie", "Libellé", "Montant"], d.expenseRows.map((r) => [r.date, r.category, r.label, eur(r.amount)]), [3]);

  const pages = doc.getNumberOfPages();
  for (let p = 1; p <= pages; p++) {
    doc.setPage(p);
    doc.setFontSize(8); doc.setTextColor(141, 122, 131);
    doc.text(`${d.salon?.name ?? "WissNails"}${d.salon?.siret ? ` · SIRET ${d.salon.siret}` : ""}`, 14, 290);
    doc.text(`${p} / ${pages}`, W - 14, 290, { align: "right" });
  }
  doc.save(`${fileBase(d)}.pdf`);
}
