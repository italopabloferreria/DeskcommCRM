"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { useT } from "@/hooks/i18n/useT";
import {
  historyViewSchema,
  historyCommandSchema,
  formatHistoryMoney,
  parseHistoryMoney,
  type HistoryView,
} from "@/lib/crm-b2b/history-management";
type Item = HistoryView["items"][number];
type Editing = { action: "correct" | "void" | "redact_person"; item: Item | null; key: string };
type Props = { kind: "person" | "company"; id: string; onChanged?: () => void };
export function CustomerHistory(props: Props) {
  return <CustomerHistoryPanel key={props.kind + props.id} {...props} />;
}
function CustomerHistoryPanel({ kind, id, onChanged }: Props) {
  const t = useT();
  const [data, setData] = useState<HistoryView | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true),
    [busy, setBusy] = useState(false);
  const [pages, setPages] = useState<Array<string | null>>([null]);
  const [edit, setEdit] = useState<Editing | null>(null);
  const [date, setDate] = useState(""),
    [money, setMoney] = useState(""),
    [currency, setCurrency] = useState("");
  const [notes, setNotes] = useState(""),
    [location, setLocation] = useState("");
  const [reason, setReason] = useState("source_review"),
    [confirmed, setConfirmed] = useState(false);
  const readController = useRef<AbortController | null>(null);
  const base = "/api/v1/customer-history/" + kind + "/" + id;
  const after = pages[pages.length - 1];
  const load = useCallback(async () => {
    readController.current?.abort();
    const controller = new AbortController();
    readController.current = controller;
    setLoading(true);
    setError("");
    try {
      const response = await fetch(base + (after ? "?after=" + after : ""), {
        signal: controller.signal,
      });
      const json = await response.json();
      if (!response.ok)
        throw new Error(json.error?.message ?? t("Não foi possível carregar o histórico."));
      const parsed = historyViewSchema.safeParse(json.data);
      if (!parsed.success) throw new Error(t("Resposta inválida do histórico."));
      if (!controller.signal.aborted) setData(parsed.data);
    } catch (e) {
      if (!controller.signal.aborted)
        setError(e instanceof Error ? e.message : t("Falha ao carregar."));
    } finally {
      if (!controller.signal.aborted) setLoading(false);
    }
  }, [base, after, t]);
  useEffect(() => {
    let cancelled = false;
    void Promise.resolve().then(() => {
      if (!cancelled) void load();
    });
    return () => {
      cancelled = true;
      readController.current?.abort();
    };
  }, [load]);
  function open(action: Editing["action"], item: Item | null) {
    setEdit({ action, item, key: crypto.randomUUID() });
    setConfirmed(false);
    setError("");
    setDate(item?.service_date ?? "");
    setMoney(formatHistoryMoney(item?.value_cents ?? null));
    setCurrency(item?.currency ?? "");
    setNotes(item?.notes_current ?? "");
    setLocation(item?.location_id ?? "");
    setReason(action === "void" ? "duplicate" : "source_review");
  }
  async function save() {
    if (!edit) return;
    setBusy(true);
    setError("");
    try {
      const body = historyCommandSchema.parse(
        edit.action === "redact_person"
          ? { action: edit.action, request_id: edit.key, confirm: confirmed }
          : edit.action === "void"
            ? {
                action: edit.action,
                request_id: edit.key,
                expected_version: edit.item?.revision,
                reason,
              }
            : {
                action: edit.action,
                request_id: edit.key,
                expected_version: edit.item?.revision,
                reason,
                patch: {
                  service_date: date || null,
                  value_cents: parseHistoryMoney(money),
                  currency: currency || null,
                  notes_current: notes,
                  location_id: location || null,
                },
              },
      );
      const url =
        edit.action === "redact_person"
          ? base
          : "/api/v1/customer-history/service/" + edit.item?.id;
      const response = await fetch(url, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(body),
      });
      const json = await response.json();
      if (!response.ok)
        throw new Error(json.error?.message ?? t("Não foi possível concluir a operação."));
      setEdit(null);
      await load();
      onChanged?.();
    } catch (e) {
      setError(e instanceof Error ? e.message : t("Dados inválidos."));
    } finally {
      setBusy(false);
    }
  }
  async function download() {
    setBusy(true);
    setError("");
    try {
      const response = await fetch(base + "?export=person");
      const json = await response.json();
      if (!response.ok) throw new Error(json.error?.message ?? t("Não foi possível exportar."));
      const url = URL.createObjectURL(
        new Blob([JSON.stringify(json.data, null, 2)], { type: "application/json" }),
      );
      const a = document.createElement("a");
      a.href = url;
      a.download = "dados-pessoa-historico.json";
      a.click();
      setTimeout(() => URL.revokeObjectURL(url), 0);
    } catch (e) {
      setError(e instanceof Error ? e.message : t("Falha ao exportar."));
    } finally {
      setBusy(false);
    }
  }
  const items = data?.items.slice(0, 25) ?? [];
  return (
    <Card className="space-y-4 p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="font-medium">{t("Histórico de serviços")}</h2>
        <div className="flex flex-wrap gap-2">
          {kind === "person" && data?.available && data.can_export && (
            <Button variant="outline" disabled={busy || loading} onClick={() => void download()}>
              {t("Exportar pessoa e histórico")}
            </Button>
          )}
          {kind === "person" && data?.available && data.can_redact && !data.redacted && (
            <Button
              variant="outline"
              disabled={busy || loading}
              onClick={() => open("redact_person", null)}
            >
              {t("Anonimizar pessoa")}
            </Button>
          )}
        </div>
      </div>
      {error && !edit && (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      )}
      {loading && (
        <p role="status" className="text-sm text-muted-foreground">
          {t("Carregando histórico…")}
        </p>
      )}
      {!loading && data && !data.available && (
        <p className="text-sm text-muted-foreground">
          {t("O módulo de histórico ainda não está instalado. Nenhum dado foi alterado.")}
        </p>
      )}
      {!loading && data?.available && items.length === 0 && (
        <p className="text-sm text-muted-foreground">{t("Nenhum serviço histórico registrado.")}</p>
      )}
      {items.map((item) => (
        <div key={item.id} className="flex flex-wrap justify-between gap-3 rounded-md border p-3">
          <div className="min-w-0 space-y-1">
            <p>
              {item.service_date ?? t("Data não informada")} ·{" "}
              <span>
                {item.value_cents === null
                  ? t("Valor não informado")
                  : formatHistoryMoney(item.value_cents)}
              </span>
              {item.currency ? " " + item.currency : ""}
            </p>
            <p className="text-sm break-words whitespace-pre-wrap">{item.notes_current}</p>
            <p className="text-xs text-muted-foreground">
              {t("Versão")} {item.revision}
              {item.voided_at ? " · " + t("Excluído da operação") : ""}
              {item.redacted_at ? " · " + t("Conteúdo anonimizado") : ""}
            </p>
          </div>
          {!item.voided_at && !item.redacted_at && (
            <div className="flex gap-2">
              {data?.can_correct && (
                <Button
                  size="sm"
                  variant="outline"
                  disabled={busy || loading}
                  onClick={() => open("correct", item)}
                >
                  {t("Corrigir")}
                </Button>
              )}
              {data?.can_void && (
                <Button
                  size="sm"
                  variant="outline"
                  disabled={busy || loading}
                  onClick={() => open("void", item)}
                >
                  {t("Excluir da operação")}
                </Button>
              )}
            </div>
          )}
        </div>
      ))}
      {data?.available && (
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            disabled={loading || busy || pages.length === 1}
            onClick={() => setPages((p) => p.slice(0, -1))}
          >
            {t("Anterior")}
          </Button>
          <span className="text-sm">
            {t("Página")} {pages.length}
          </span>
          <Button
            variant="outline"
            disabled={loading || busy || data.items.length <= 25}
            onClick={() => setPages((p) => [...p, items[24]?.id ?? null])}
          >
            {t("Próxima")}
          </Button>
        </div>
      )}
      <Dialog
        open={!!edit}
        onOpenChange={(open) => {
          if (!open && !busy) setEdit(null);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {t(
                edit?.action === "correct"
                  ? "Corrigir serviço"
                  : edit?.action === "void"
                    ? "Excluir da operação"
                    : "Anonimizar pessoa",
              )}
            </DialogTitle>
            <DialogDescription>
              {t(
                edit?.action === "correct"
                  ? "A correção preserva os dados originais e cria uma nova versão."
                  : edit?.action === "void"
                    ? "O serviço será marcado como excluído da operação. A origem permanecerá preservada."
                    : "Os dados da pessoa e suas cópias no histórico serão limpos de forma irreversível. Arquivos e backups têm tratamento separado.",
              )}
            </DialogDescription>
          </DialogHeader>
          {edit?.action === "correct" && (
            <div className="grid gap-3">
              <Label htmlFor="history-date">{t("Data do serviço")}</Label>
              <Input
                id="history-date"
                type="date"
                value={date}
                disabled={busy}
                onChange={(e) => setDate(e.target.value)}
              />
              <Label htmlFor="history-money">{t("Valor")}</Label>
              <Input
                id="history-money"
                inputMode="decimal"
                value={money}
                disabled={busy}
                onChange={(e) => setMoney(e.target.value)}
              />
              <Label htmlFor="history-currency">{t("Moeda (opcional)")}</Label>
              <Input
                id="history-currency"
                maxLength={3}
                value={currency}
                disabled={busy}
                onChange={(e) => setCurrency(e.target.value.toUpperCase())}
              />
              <Label htmlFor="history-notes">{t("Observações correntes")}</Label>
              <textarea
                id="history-notes"
                className="min-h-24 rounded-md border bg-background p-2 focus-visible:outline focus-visible:outline-2"
                maxLength={16000}
                value={notes}
                disabled={busy}
                onChange={(e) => setNotes(e.target.value)}
              />
              <Label htmlFor="history-location">{t("Local do cliente")}</Label>
              <select
                id="history-location"
                className="rounded-md border bg-background p-2"
                value={location}
                disabled={busy}
                onChange={(e) => setLocation(e.target.value)}
              >
                <option value="">{t("Sem local vinculado")}</option>
                {edit.item?.location_id &&
                  !data?.locations.some((l) => l.id === edit.item?.location_id) && (
                    <option value={edit.item.location_id}>{t("Manter local atual")}</option>
                  )}
                {data?.locations.slice(0, 200).map((l) => (
                  <option key={l.id} value={l.id}>
                    {l.address_original}
                  </option>
                ))}
              </select>
              {data?.locations_truncated && (
                <p className="text-sm">
                  {t(
                    "Há mais locais do que o limite desta lista. O local atual pode ser mantido; nenhum endereço foi apagado.",
                  )}
                </p>
              )}
            </div>
          )}
          {edit?.action !== "redact_person" && (
            <>
              <Label htmlFor="history-reason">{t("Motivo")}</Label>
              <select
                id="history-reason"
                className="rounded-md border bg-background p-2"
                value={reason}
                disabled={busy}
                onChange={(e) => setReason(e.target.value)}
              >
                {edit?.action === "void" ? (
                  <>
                    <option value="duplicate">{t("Registro duplicado")}</option>
                    <option value="cancelled">{t("Cancelamento")}</option>
                    <option value="source_error">{t("Erro na origem")}</option>
                  </>
                ) : (
                  <>
                    <option value="source_review">{t("Revisão da origem")}</option>
                    <option value="data_entry">{t("Erro de preenchimento")}</option>
                    <option value="wrong_location">{t("Local incorreto")}</option>
                  </>
                )}
              </select>
            </>
          )}
          {edit?.action === "redact_person" && (
            <Label className="flex items-start gap-2">
              <input
                type="checkbox"
                checked={confirmed}
                disabled={busy}
                onChange={(e) => setConfirmed(e.target.checked)}
              />
              {t("Confirmo a limpeza irreversível dos dados pessoais.")}
            </Label>
          )}
          {error && edit && (
            <p role="alert" className="text-sm text-destructive">
              {error}
            </p>
          )}
          <DialogFooter>
            <Button variant="outline" disabled={busy} onClick={() => setEdit(null)}>
              {t("Cancelar")}
            </Button>
            <Button
              disabled={busy || (edit?.action === "redact_person" && !confirmed)}
              onClick={() => void save()}
            >
              {t(
                edit?.action === "correct"
                  ? "Salvar correção"
                  : edit?.action === "void"
                    ? "Confirmar exclusão"
                    : "Anonimizar definitivamente",
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
