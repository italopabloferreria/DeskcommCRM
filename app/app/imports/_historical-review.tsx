"use client";
import Link from "next/link";
import { historicalReceiptSchema, type HistoricalReceipt } from "@/lib/crm-b2b/historical-process";
import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useT } from "@/hooks/i18n/useT";
import {
  historicalDate,
  historicalValue,
  type historicalRowsForReview,
} from "@/lib/crm-b2b/historical-preview";
type Row = ReturnType<typeof historicalRowsForReview>["rows"][number];
type Kind = "company" | "person";
type Choice = {
  customer: { kind: Kind; id: string; label: string };
  location: "none" | "create_from_original";
  accept_original_date: boolean;
  accept_original_value: boolean;
};
type Page = { page: number; total_pages: number; rows: Row[] };
export function HistoricalReviewEditor({ file, sourceHash }: { file: File; sourceHash: string }) {
  const t = useT();
  const [page, setPage] = useState<Page | null>(null),
    [choices, setChoices] = useState<Record<number, Choice>>({});
  const [busy, setBusy] = useState(false),
    [message, setMessage] = useState("");
  const [kind, setKind] = useState<Kind>("company"),
    [search, setSearch] = useState("");
  const [matches, setMatches] = useState<{ id: string; label: string }[]>([]);
  const [reviewReady, setReviewReady] = useState(false),
    [accepted, setAccepted] = useState(false);
  const [receipt, setReceipt] = useState<HistoricalReceipt | null>(null);
  function invalidateReview() {
    setReviewReady(false);
    setAccepted(false);
  }
  function reviewPayload() {
    return {
      source_sha256: sourceHash,
      decisions: Object.entries(choices).map(([index, choice]) => ({
        data_row_index: Number(index),
        customer: { kind: choice.customer.kind, id: choice.customer.id },
        location: { kind: choice.location },
        accept_original_date: choice.accept_original_date,
        accept_original_value: choice.accept_original_value,
      })),
    };
  }
  async function confirm() {
    if (busy || !reviewReady || !accepted || receipt) return;
    setBusy(true);
    setMessage("");
    const controller = new AbortController();
    abort.current = controller;
    try {
      const form = new FormData();
      form.set("file", file);
      form.set("historical_confirm", "true");
      form.set("historical_review", JSON.stringify(reviewPayload()));
      const response = await fetch("/api/v1/imports", {
        method: "POST",
        body: form,
        signal: controller.signal,
      });
      const json = await response.json();
      if (controller.signal.aborted) return;
      if (!response.ok) throw new Error(json.error?.message ?? "Falha ao confirmar histórico.");
      const parsed = historicalReceiptSchema.safeParse(json.data);
      if (!parsed.success)
        throw new Error(
          "O banco não confirmou o recibo. Confira o lote antes de tentar novamente.",
        );
      setReceipt(parsed.data);
      setMessage(
        parsed.data.reversed_at
          ? "Este lote já foi revertido. O reenvio não recria serviços."
          : parsed.data.reused
            ? "Lote já confirmado. Nenhuma linha foi repetida."
            : "Histórico confirmado.",
      );
    } catch (error) {
      if (!controller.signal.aborted)
        setMessage(
          error instanceof Error &&
            error.message !== "Failed to fetch" &&
            error.message !== "rede indisponível"
            ? error.message
            : "Não foi possível conferir o recibo. Reenvie o mesmo arquivo e as mesmas decisões.",
        );
    } finally {
      if (!controller.signal.aborted) setBusy(false);
    }
  }
  const abort = useRef<AbortController | null>(null);
  async function analyze(number: number, validate = false) {
    abort.current?.abort();
    const controller = new AbortController();
    abort.current = controller;
    setBusy(true);
    setMessage("");
    try {
      const form = new FormData();
      form.set("file", file);
      form.set("preview", "true");
      form.set("historical_page", String(number));
      if (validate) form.set("historical_review", JSON.stringify(reviewPayload()));
      const response = await fetch("/api/v1/imports", {
        method: "POST",
        body: form,
        signal: controller.signal,
      });
      const json = await response.json();
      if (controller.signal.aborted) return;
      if (!response.ok) throw new Error(json.error?.message ?? "Falha ao revisar.");
      if (json.data?.source_sha256 !== sourceHash)
        throw new Error("O arquivo mudou. Analise novamente.");
      if (!json.data.historical_page)
        throw new Error("A revisão por páginas ainda não está disponível.");
      setPage(json.data.historical_page);
      if (validate) {
        const result = json.data.reviewed_draft;
        if (!result || result.ownership_verified !== false)
          throw new Error("Resultado de revisão inválido.");
        setReviewReady(result.review_required_rows === 0);
        setAccepted(false);
        setMessage(
          result.review_required_rows > 0
            ? result.review_required_rows + " linhas ainda precisam de revisão."
            : "Decisões analisadas. Confira e confirme o lote; os vínculos serão verificados no banco.",
        );
      }
    } catch (error) {
      if (!controller.signal.aborted)
        setMessage(error instanceof Error ? error.message : "Falha ao revisar.");
    } finally {
      if (!controller.signal.aborted) setBusy(false);
    }
  }
  async function find() {
    abort.current?.abort();
    const controller = new AbortController();
    abort.current = controller;
    setBusy(true);
    setMessage("");
    setMatches([]);
    try {
      const response = await fetch(
        "/api/v1/" +
          (kind === "company" ? "companies" : "people") +
          "?search=" +
          encodeURIComponent(search.trim()) +
          "&limit=20",
        { signal: controller.signal },
      );
      const json = await response.json();
      if (controller.signal.aborted) return;
      if (!response.ok) throw new Error(json.error?.message ?? "Falha ao buscar clientes.");
      setMatches(
        (Array.isArray(json.data) ? json.data : []).flatMap(
          (item: {
            id?: string;
            trade_name?: string;
            legal_name?: string;
            full_name?: string;
            cnpj?: string;
          }) => {
            const name = kind === "company" ? item.trade_name || item.legal_name : item.full_name;
            return item.id && name
              ? [{ id: item.id, label: name + " · " + (item.cnpj || item.id.slice(-8)) }]
              : [];
          },
        ),
      );
      setMessage("Até 20 resultados. Refine a busca para distinguir clientes de mesmo nome.");
    } catch (error) {
      if (!controller.signal.aborted)
        setMessage(error instanceof Error ? error.message : "Falha na busca.");
    } finally {
      if (!controller.signal.aborted) setBusy(false);
    }
  }
  function change(index: number, patch: Partial<Choice>) {
    invalidateReview();
    setChoices((current) => ({ ...current, [index]: { ...current[index]!, ...patch } }));
    setMessage("");
  }
  useEffect(() => () => abort.current?.abort(), []);
  return (
    <section
      aria-label={t("Revisar vínculos do histórico")}
      className="space-y-4 rounded-md border p-3"
    >
      <h3 className="font-medium">{t("Escolha os clientes do histórico")}</h3>
      <p className="text-sm text-muted-foreground">
        {t(
          "As decisões ficam nesta tela enquanto o arquivo estiver aberto. Trocar o arquivo ou sair descarta a revisão. A análise não grava. Somente a confirmação explícita salva locais e serviços para os clientes escolhidos.",
        )}{" "}
      </p>
      {!page && !receipt && (
        <Button disabled={busy} onClick={() => void analyze(1)}>
          {t("Abrir revisão por linhas")}
        </Button>
      )}
      <fieldset disabled={busy || receipt !== null} className="flex flex-wrap items-end gap-2">
        <legend className="sr-only">{t("Buscar cliente cadastrado")}</legend>
        <label>
          {t("Tipo de cliente")}{" "}
          <select
            className="block rounded-md border p-2"
            value={kind}
            onChange={(event) => {
              setKind(event.target.value as Kind);
              setMatches([]);
            }}
          >
            <option value="company">{t("Empresa")}</option>
            <option value="person">{t("Pessoa")}</option>
          </select>
        </label>
        <label>
          {t("Buscar cliente")}{" "}
          <Input
            value={search}
            maxLength={200}
            onChange={(event) => {
              setSearch(event.target.value);
              setMatches([]);
            }}
          />
        </label>
        <Button disabled={busy || search.trim().length < 2} onClick={() => void find()}>
          {t("Buscar cadastrados")}
        </Button>
      </fieldset>
      <p role="status" aria-live="polite" className="text-sm">
        {busy ? t("Consultando…") : message}
      </p>
      {page?.rows.map((row) => {
        const active = [row.raw.address, row.raw.value, row.raw.service_date, row.raw.notes].some(
          (value) => value.trim() !== "",
        );
        const choice = choices[row.data_row_index];
        return (
          <fieldset
            key={row.data_row_index}
            disabled={busy || receipt !== null}
            className="grid gap-3 rounded-md border p-3 sm:grid-cols-2"
          >
            <legend>
              {t("Linha")} {row.data_row_index} · {row.raw.name || t("Sem nome identificado")}
            </legend>
            <p className="text-sm break-words sm:col-span-2">
              {row.raw.address || t("Sem endereço")} · {row.raw.service_date || t("Sem data")} ·{" "}
              {row.raw.value || t("Sem valor")} · {row.raw.notes || t("Sem observação")}
            </p>
            {!active ? (
              <p className="text-sm">
                {t("Linha auxiliar: conteúdo preservado; não cria atendimento.")}
              </p>
            ) : (
              <>
                <label>
                  {t("Cliente da linha")} {row.data_row_index}
                  <select
                    className="block w-full rounded-md border p-2"
                    value={choice ? choice.customer.kind + ":" + choice.customer.id : ""}
                    onChange={(event) => {
                      invalidateReview();
                      const selected = matches.find(
                        (item) => kind + ":" + item.id === event.target.value,
                      );
                      if (selected) {
                        setChoices((current) => ({
                          ...current,
                          [row.data_row_index]: {
                            customer: { kind, id: selected.id, label: selected.label },
                            location: row.raw.address.trim() ? "create_from_original" : "none",
                            accept_original_date: false,
                            accept_original_value: false,
                          },
                        }));
                      } else
                        setChoices((current) => {
                          const next = { ...current };
                          delete next[row.data_row_index];
                          return next;
                        });
                      setMessage("");
                    }}
                  >
                    <option value="">{t("Escolha um cliente cadastrado")}</option>
                    {choice && (
                      <option value={choice.customer.kind + ":" + choice.customer.id}>
                        {choice.customer.label}
                      </option>
                    )}
                    {matches
                      .filter(
                        (item) =>
                          !(choice?.customer.kind === kind && choice.customer.id === item.id),
                      )
                      .map((item) => (
                        <option key={item.id} value={kind + ":" + item.id}>
                          {item.label}
                        </option>
                      ))}
                  </select>
                </label>
                {choice && (
                  <>
                    <label>
                      {t("Local da linha")} {row.data_row_index}
                      <select
                        className="block w-full rounded-md border p-2"
                        value={choice.location}
                        onChange={(event) =>
                          change(row.data_row_index, {
                            location: event.target.value as Choice["location"],
                          })
                        }
                      >
                        <option value="none">{t("Sem local")}</option>
                        {row.raw.address.trim() && (
                          <option value="create_from_original">
                            {t("Preservar endereço como novo local")}{" "}
                          </option>
                        )}
                      </select>
                    </label>
                    {historicalDate(row.raw.service_date).status === "parsed" && (
                      <label className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={choice.accept_original_date}
                          onChange={(event) =>
                            change(row.data_row_index, {
                              accept_original_date: event.target.checked,
                            })
                          }
                        />
                        {t("Aceito a data da linha")} {row.data_row_index}
                      </label>
                    )}
                    {historicalValue(row.raw.value).status === "parsed" && (
                      <label className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={choice.accept_original_value}
                          onChange={(event) =>
                            change(row.data_row_index, {
                              accept_original_value: event.target.checked,
                            })
                          }
                        />
                        {t("Aceito o valor da linha")} {row.data_row_index}
                      </label>
                    )}
                  </>
                )}
              </>
            )}
          </fieldset>
        );
      })}
      {page && !receipt && (
        <div className="flex flex-wrap items-center gap-2">
          <Button disabled={busy || page.page <= 1} onClick={() => void analyze(page.page - 1)}>
            {t("Página anterior")}{" "}
          </Button>
          <span>
            {t("Página")} {page.page} {t("de")} {page.total_pages}
          </span>
          <Button
            disabled={busy || page.page >= page.total_pages}
            onClick={() => void analyze(page.page + 1)}
          >
            {t("Próxima página")}{" "}
          </Button>
          <Button disabled={busy} onClick={() => void analyze(page.page, true)}>
            {t("Validar decisões sem gravar")}{" "}
          </Button>
        </div>
      )}
      {reviewReady && !receipt && (
        <div className="space-y-2 rounded-md border p-3">
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              disabled={busy}
              checked={accepted}
              onChange={(event) => setAccepted(event.target.checked)}
            />
            {t("Conferi os clientes e autorizo gravar este lote.")}
          </label>
          <Button disabled={busy || !accepted} onClick={() => void confirm()}>
            {t("Confirmar histórico")}
          </Button>
        </div>
      )}
      {receipt && (
        <div className="space-y-2 rounded-md border p-3 text-sm">
          <p>
            {t("Recibo")}: <span className="font-mono break-all">{receipt.receipt_id}</span>
          </p>
          <p>
            {t("Linhas")}: {receipt.total_rows} · {t("Serviços")}: {receipt.service_rows} ·{" "}
            {t("Locais criados")}: {receipt.locations_created} · {t("Auxiliares preservados")}:{" "}
            {receipt.auxiliary_rows}
          </p>
          <Link className="underline" href={"/app/imports/" + receipt.batch_id}>
            {t("Abrir lote confirmado")}
          </Link>
        </div>
      )}
    </section>
  );
}
