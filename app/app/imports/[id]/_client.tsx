"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useT } from "@/hooks/i18n/useT";
import { randomId } from "@/lib/random-id";
import { historyReversalReceiptSchema } from "@/lib/crm-b2b/historical-process";
export function ImportDetailClient({ id }: { id: string }) {
  const t = useT();
  const [batch, setBatch] = useState<Record<string, unknown> | null>(null),
    [rows, setRows] = useState<Array<Record<string, unknown>>>([]);
  const [onlyConflicts, setOnlyConflicts] = useState(false),
    [busy, setBusy] = useState(true),
    [message, setMessage] = useState("");
  const [next, setNext] = useState<number | null>(null),
    [cursor, setCursor] = useState(0),
    [previous, setPrevious] = useState<number[]>([]);
  const [receipt, setReceipt] = useState<{
    id: string;
    service_rows: number;
    locations_created: number;
    auxiliary_rows: number;
    reversed_at: string | null;
  } | null>(null);
  const [canReverse, setCanReverse] = useState(false),
    [accepted, setAccepted] = useState(false);
  const reverseKey = useRef<string | null>(null),
    abort = useRef<AbortController | null>(null);
  const load = useCallback(
    async (signal: AbortSignal) => {
      const qs = new URLSearchParams({ after: String(cursor) });
      if (onlyConflicts) qs.set("status", "conflict");
      const res = await fetch("/api/v1/imports/" + id + "?" + qs, { signal });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error?.message ?? "Falha ao carregar lote.");
      return json.data;
    },
    [id, onlyConflicts, cursor],
  );
  const receive = useCallback(
    (controller: AbortController) => {
      return load(controller.signal)
        .then((data) => {
          if (controller.signal.aborted) return;
          setBatch(data.batch);
          setRows(data.rows ?? []);
          setReceipt(data.receipt ?? null);
          setCanReverse(data.can_reverse === true);
          setNext(data.next_after ?? null);
        })
        .catch((error: unknown) => {
          if (!controller.signal.aborted)
            setMessage(error instanceof Error ? error.message : "Falha ao carregar lote.");
        })
        .finally(() => {
          if (!controller.signal.aborted) setBusy(false);
        });
    },
    [load],
  );
  useEffect(() => {
    abort.current?.abort();
    const controller = new AbortController();
    abort.current = controller;
    void receive(controller);
    return () => controller.abort();
  }, [receive]);
  function refresh() {
    setBusy(true);
    setMessage("");
    abort.current?.abort();
    const controller = new AbortController();
    abort.current = controller;
    void receive(controller);
  }
  async function reverse() {
    if (!canReverse || !accepted || busy) return;
    setBusy(true);
    setMessage("");
    reverseKey.current ??= randomId();
    const controller = new AbortController();
    abort.current = controller;
    try {
      const res = await fetch("/api/v1/imports/" + id + "/history-reversal", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ request_id: reverseKey.current, confirm: true }),
        signal: controller.signal,
      });
      const json = await res.json();
      if (controller.signal.aborted) return;
      if (!res.ok) throw new Error(json.error?.message ?? "Falha ao reverter lote.");
      if (!historyReversalReceiptSchema.safeParse(json.data).success)
        throw new Error(
          "O banco não confirmou a reversão. Confira o lote antes de tentar novamente.",
        );
      setAccepted(false);
      reverseKey.current = null;
      const loaded = await load(controller.signal);
      if (controller.signal.aborted) return;
      setBatch(loaded.batch);
      setRows(loaded.rows ?? []);
      setReceipt(loaded.receipt ?? null);
      setCanReverse(loaded.can_reverse === true);
      setNext(loaded.next_after ?? null);
      setMessage("Serviços do lote anulados. Cadastros, locais e origem foram preservados.");
    } catch (error) {
      if (!controller.signal.aborted)
        setMessage(error instanceof Error ? error.message : "Falha ao reverter lote.");
    } finally {
      if (!controller.signal.aborted) setBusy(false);
    }
  }
  return (
    <div className="flex flex-col gap-4 p-4 md:p-6">
      <Link href="/app/imports" className="text-sm text-muted-foreground hover:underline">
        ← {t("Importações")}
      </Link>
      <p role="status" aria-live="polite" className="text-sm">
        {busy ? t("Carregando…") : message}
      </p>
      {message && !busy && <Button onClick={refresh}>{t("Tentar novamente")}</Button>}
      {batch && (
        <>
          <div>
            <h1 className="text-xl font-semibold">{batch.filename as string}</h1>
            <p className="text-sm text-muted-foreground">
              {batch.status as string} · {batch.successful_rows as number} {t("certas")} ·{" "}
              {batch.conflict_rows as number} {t("conflitos")} · {batch.failed_rows as number}{" "}
              {t("falhas")}
            </p>
          </div>
          {receipt && (
            <Card className="space-y-2 p-3 text-sm">
              <p>
                {t("Recibo")}: <span className="font-mono break-all">{receipt.id}</span>
              </p>
              <p>
                {t("Serviços")}: {receipt.service_rows} · {t("Locais criados")}:{" "}
                {receipt.locations_created} · {t("Auxiliares preservados")}:{" "}
                {receipt.auxiliary_rows}
              </p>
              {receipt.reversed_at && <p>{t("Lote revertido")}</p>}
            </Card>
          )}
          {canReverse && (
            <fieldset disabled={busy} className="space-y-2 rounded-md border p-3">
              <legend>{t("Reverter histórico do lote")}</legend>
              <p className="text-sm">
                {t(
                  "A reversão anula serviços, preserva cadastros e origem e recusa serviços já corrigidos. Não pode ser desfeita por reenvio.",
                )}
              </p>
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={accepted}
                  onChange={(e) => setAccepted(e.target.checked)}
                />
                {t("Confirmo a reversão deste lote.")}
              </label>
              <Button
                variant="destructive"
                disabled={busy || !accepted}
                onClick={() => void reverse()}
              >
                {t("Reverter lote")}
              </Button>
            </fieldset>
          )}
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              disabled={busy}
              checked={onlyConflicts}
              onChange={(e) => {
                setBusy(true);
                setMessage("");
                setOnlyConflicts(e.target.checked);
                setCursor(0);
                setPrevious([]);
              }}
            />
            {t("Só conflitos")}
          </label>
          <Card className="overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>#</TableHead>
                  <TableHead>{t("Status")}</TableHead>
                  <TableHead>{t("Erro")}</TableHead>
                  <TableHead>{t("Empresa")}</TableHead>
                  <TableHead>{t("Pessoa")}</TableHead>
                  <TableHead>{t("Contato")}</TableHead>
                  <TableHead>{t("Dados originais")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((row) => (
                  <TableRow key={row.id as string}>
                    <TableCell>{row.row_number as number}</TableCell>
                    <TableCell>{row.status as string}</TableCell>
                    <TableCell className="max-w-xs truncate text-xs">
                      {(row.error as string) || "—"}
                    </TableCell>
                    <TableCell className="font-mono text-xs">
                      {(row.company_id as string)?.slice(0, 8) || "—"}
                    </TableCell>
                    <TableCell className="font-mono text-xs">
                      {(row.person_id as string)?.slice(0, 8) || "—"}
                    </TableCell>
                    <TableCell className="font-mono text-xs">
                      {(row.contact_id as string)?.slice(0, 8) || "—"}
                    </TableCell>
                    <TableCell className="max-w-xl min-w-64 whitespace-normal">
                      <OriginalRow raw={row.raw_data} />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Card>
          <div className="flex gap-2">
            <Button
              disabled={busy || previous.length === 0}
              onClick={() => {
                setBusy(true);
                setMessage("");
                setCursor(previous.at(-1)!);
                setPrevious((p) => p.slice(0, -1));
              }}
            >
              {t("Página anterior")}
            </Button>
            <Button
              disabled={busy || next === null}
              onClick={() => {
                setBusy(true);
                setMessage("");
                setPrevious((p) => [...p, cursor]);
                setCursor(next!);
              }}
            >
              {t("Próxima página")}
            </Button>
          </div>
        </>
      )}
    </div>
  );
}

function OriginalRow({ raw }: { raw: unknown }) {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return <>—</>;
  const data = raw as Record<string, unknown>;
  const source = data.workbook_source;
  if (source && typeof source === "object" && !Array.isArray(source)) {
    const workbook = source as Record<string, unknown>;
    const cells = Array.isArray(workbook.cells) ? workbook.cells : [];
    return (
      <details>
        <summary className="cursor-pointer rounded focus-visible:outline-2">
          {typeof workbook.sheet === "string" ? workbook.sheet : "Planilha"} · linha{" "}
          {String(workbook.row ?? "")}
        </summary>
        <dl className="mt-2 space-y-1 text-xs">
          {cells.map((cell: unknown, index) => {
            if (!cell || typeof cell !== "object") return null;
            const c = cell as Record<string, unknown>;
            const stored = c.value;
            const value =
              stored && typeof stored === "object" && "value" in stored
                ? (stored as Record<string, unknown>).value
                : stored;
            if (value === null || value === undefined || value === "") return null;
            return (
              <div key={index}>
                <dt className="font-medium">{String(c.coordinate ?? index + 1)}</dt>
                <dd className="break-words">
                  {typeof value === "object" ? JSON.stringify(value) : String(value)}
                </dd>
              </div>
            );
          })}
        </dl>
      </details>
    );
  }
  return (
    <details>
      <summary className="cursor-pointer rounded focus-visible:outline-2">
        Ver dados da linha
      </summary>
      <dl className="mt-2 space-y-1 text-xs">
        {Object.entries(data).map(([key, value]) => (
          <div key={key}>
            <dt className="font-medium">{key}</dt>
            <dd className="break-words">
              {typeof value === "object" ? JSON.stringify(value) : String(value ?? "")}
            </dd>
          </div>
        ))}
      </dl>
    </details>
  );
}
