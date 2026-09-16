"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Icon } from "@/components/icons";
import { Modal, ErrorBanner } from "@/components/modal";
import { apiFetch } from "@/lib/client";

export function CsvTools() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [importOpen, setImportOpen] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [previewRows, setPreviewRows] = useState<Array<Record<string, string>>>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const handleExport = () => {
    const params = new URLSearchParams(searchParams?.toString() ?? "");
    window.open(`/api/transactions/export?${params.toString()}`, "_blank");
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setError(null);
    setSuccess(null);
    const f = e.target.files?.[0];
    if (!f) return;
    setFile(f);

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      if (!text) return;
      const lines = text.split(/\r?\n/).filter((l) => l.trim().length > 0);
      if (lines.length < 2) {
        setError("The selected CSV file must have a header and at least 1 record row.");
        return;
      }

      const headers = lines[0].split(",").map((h) => h.trim().replace(/^"|"$/g, "").toLowerCase());
      const parsed = lines.slice(1, 6).map((line) => {
        const values = line.split(",").map((v) => v.trim().replace(/^"|"$/g, ""));
        const row: Record<string, string> = {};
        headers.forEach((h, i) => {
          row[h] = values[i] ?? "";
        });
        return row;
      });

      setPreviewRows(parsed);
    };
    reader.readAsText(f);
  };

  const executeImport = async () => {
    if (!file) return;
    setLoading(true);
    setError(null);
    setSuccess(null);

    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const text = event.target?.result as string;
        const lines = text.split(/\r?\n/).filter((l) => l.trim().length > 0);
        if (lines.length < 2) throw new Error("File contains no records");

        const headers = lines[0].split(",").map((h) => h.trim().replace(/^"|"$/g, "").toLowerCase());

        const dateIdx = headers.findIndex((h) => h.includes("date") || h === "occurredon");
        const typeIdx = headers.findIndex((h) => h === "type");
        const amountIdx = headers.findIndex((h) => h.includes("amount") || h === "cents");
        const catIdx = headers.findIndex((h) => h.includes("category"));
        const noteIdx = headers.findIndex((h) => h.includes("note") || h.includes("desc"));

        if (dateIdx === -1 || amountIdx === -1) {
          throw new Error("CSV must include at least 'Date' and 'Amount' columns.");
        }

        const rows = lines.slice(1).map((line) => {
          const cols = line.split(",").map((v) => v.trim().replace(/^"|"$/g, ""));
          return {
            occurredOn: cols[dateIdx],
            type: (typeIdx !== -1 && cols[typeIdx].toLowerCase() === "income") ? "income" : "expense",
            amount: cols[amountIdx],
            category: catIdx !== -1 ? cols[catIdx] : null,
            note: noteIdx !== -1 ? cols[noteIdx] : null,
          };
        }).filter((r) => r.occurredOn && r.amount);

        const result = await apiFetch<{ importedCount: number; categoriesCreated: number }>(
          "/api/transactions/import",
          {
            method: "POST",
            body: JSON.stringify({ rows }),
          }
        );

        if (!result.ok) {
          setError(result.error);
          setLoading(false);
          return;
        }

        setSuccess(`Successfully imported ${result.data.importedCount} transactions.`);
        setFile(null);
        setPreviewRows([]);
        setTimeout(() => {
          setImportOpen(false);
          router.refresh();
        }, 1200);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to process CSV file.");
      } finally {
        setLoading(false);
      }
    };
    reader.readAsText(file);
  };

  return (
    <>
      <div className="flex items-center gap-1.5">
        <button
          type="button"
          onClick={handleExport}
          title="Export transactions as CSV"
          className="btn-ghost btn-sm"
        >
          <Icon name="arrowDown" className="h-3.5 w-3.5" />
          Export CSV
        </button>
        <button
          type="button"
          onClick={() => {
            setError(null);
            setSuccess(null);
            setFile(null);
            setPreviewRows([]);
            setImportOpen(true);
          }}
          title="Import transactions from CSV"
          className="btn-ghost btn-sm"
        >
          <Icon name="arrowUp" className="h-3.5 w-3.5" />
          Import CSV
        </button>
      </div>

      <Modal
        open={importOpen}
        onClose={() => setImportOpen(false)}
        title="Import Transactions from CSV"
        description="Upload a CSV ledger file. Existing and new categories will be mapped automatically."
      >
        <div className="space-y-4">
          <ErrorBanner message={error} />

          {success ? (
            <div className="rounded-lg border border-emerald-200 bg-[var(--color-income-soft)] p-3 text-[13px] font-medium text-[var(--color-income)]">
              {success}
            </div>
          ) : null}

          <div className="flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-[var(--color-line)] p-6 text-center hover:bg-[var(--color-line-soft)]/50">
            <Icon name="inbox" className="h-8 w-8 text-[var(--color-muted)]" />
            <p className="mt-2 text-[13.5px] font-semibold">Choose CSV File</p>
            <p className="text-[12px] text-[var(--color-muted)]">
              Headers should include: Date, Type, Amount, Category, Note
            </p>
            <input
              type="file"
              accept=".csv"
              onChange={handleFileChange}
              className="mt-3 block w-full text-[12.5px] text-[var(--color-muted)] file:mr-3 file:rounded-lg file:border-0 file:bg-[var(--color-brand)] file:px-3 file:py-1.5 file:text-[12px] file:font-semibold file:text-[var(--color-on-brand)] hover:file:opacity-90 cursor-pointer"
            />
          </div>

          {previewRows.length > 0 ? (
            <div className="space-y-2">
              <p className="text-[12px] font-semibold uppercase tracking-wider text-[var(--color-muted)]">
                Preview (First {previewRows.length} rows)
              </p>
              <div className="overflow-x-auto rounded-lg border border-[var(--color-line)]">
                <table className="w-full text-left text-[12px]">
                  <thead className="border-b border-[var(--color-line)] bg-[var(--color-line-soft)]">
                    <tr>
                      {Object.keys(previewRows[0]).map((k) => (
                        <th key={k} className="px-3 py-1.5 font-semibold capitalize">
                          {k}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[var(--color-line)]">
                    {previewRows.map((row, i) => (
                      <tr key={i}>
                        {Object.values(row).map((val, j) => (
                          <td key={j} className="px-3 py-1.5 text-[var(--color-ink-soft)]">
                            {val}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ) : null}

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              className="btn-ghost"
              onClick={() => setImportOpen(false)}
              disabled={loading}
            >
              Cancel
            </button>
            <button
              type="button"
              className="btn-primary"
              onClick={executeImport}
              disabled={loading || !file}
            >
              {loading ? "Importing…" : "Upload & Process"}
            </button>
          </div>
        </div>
      </Modal>
    </>
  );
}
