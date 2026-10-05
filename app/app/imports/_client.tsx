"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { HistoricalReviewEditor } from "./_historical-review";
import { Input } from "@/components/ui/input";
import { useT } from "@/hooks/i18n/useT";

import {
  IMPORT_FIELDS,
  uncoveredImportColumns,
  type ImportColumnCoverage,
} from "@/lib/crm-b2b/import-preview";
import type { MappingField, WorkbookAnalysis } from "@/lib/crm-b2b/spreadsheet";
import type { historicalPreview } from "@/lib/crm-b2b/historical-preview";
interface Preview {
  operational_review?: {
    total_rows: number;
    counts: { header: number; closure: number; record: number; review: number };
    dates_for_review: number;
    sample: { data_row_index: number; kind: string; date_raw: string; date_status: string }[];
  };
  operational_columns?: { header: string; destination: string; populated_rows: number }[];
  workbook?: WorkbookAnalysis;
  source_sha256?: string;
  headers: string[];
  total_rows: number;
  mapping: Partial<Record<MappingField, string>>;
  raw_sample: string[][];
  sample: Record<MappingField, string>[];
  column_coverage: ImportColumnCoverage[];
  historical_review: ReturnType<typeof historicalPreview>;
}
interface BatchRow {
  column_mapping?: { sheet?: string } | null;
  id: string;
  filename: string;
  status: string;
  total_rows: number;
  successful_rows: number;
  failed_rows: number;
  conflict_rows: number;
  created_at: string;
  completed_at: string | null;
}

export function ImportsListClient() {
  const t = useT();
  const [rows, setRows] = useState<BatchRow[]>([]);
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [preview, setPreview] = useState<Preview | null>(null);
  const [mapping, setMapping] = useState<Partial<Record<MappingField, string>>>({});
  const [message, setMessage] = useState<string | null>(null);
  const uncovered = preview ? uncoveredImportColumns(preview.column_coverage ?? [], mapping) : [];

  const load = useCallback(async () => {
    const res = await fetch("/api/v1/imports");
    const json = await res.json();
    if (!res.ok) throw new Error(json.error?.message ?? "Falha ao carregar importações.");
    return Array.isArray(json.data) ? (json.data as BatchRow[]) : [];
  }, []);

  useEffect(() => {
    let active = true;
    void load()
      .then((data) => {
        if (active) setRows(data);
      })
      .catch((err) => {
        if (active)
          setMessage(err instanceof Error ? err.message : "Falha ao carregar importações.");
      });
    return () => {
      active = false;
    };
  }, [load]);

  async function upload(analyze: boolean, worksheet?: string) {
    if (!file) return;
    setUploading(true);
    setMessage(null);
    try {
      const fd = new FormData();
      fd.set("file", file);
      if (worksheet) fd.set("worksheet", worksheet);
      if (analyze) fd.set("preview", "true");
      else {
        fd.set("mapping", JSON.stringify(mapping));
        fd.set("enrich", "false");
      }
      const res = await fetch("/api/v1/imports", { method: "POST", body: fd });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error?.message ?? t("Falha na importação."));
      if (analyze) {
        setPreview(json.data);
        setMapping(json.data.mapping);
        return;
      }
      setMessage(
        (json.data.reused
          ? t("Esta planilha já foi processada; nenhum cadastro foi repetido")
          : t("Lote processado")) +
          `: ${json.data.successful_rows} ok, ${json.data.conflict_rows} conflitos, ${json.data.failed_rows} falhas.`,
      );
      setFile(null);
      setPreview(null);
      setRows(await load());
    } catch (err) {
      setMessage(err instanceof Error ? err.message : t("Falha na importação."));
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="flex flex-col gap-4 p-4 md:p-6">
      <div>
        <h1 className="text-xl font-semibold">{t("Importações")}</h1>
        <Link href="/app/imports/identity-review" className="text-sm underline">
          {t("Revisar identidades da base importada")}
        </Link>
        <p className="text-sm text-muted-foreground">
          {t("CSV ou XLSX para importação. XLSM para analisar as abas, sem executar macros.")}{" "}
          {t("Análise: até 10.000 linhas. Gravação CSV/XLSX: lotes de até 2.000 linhas.")}
        </p>
      </div>

      <div className="flex flex-wrap gap-2">
        <a
          download
          className="rounded-md border px-3 py-2 text-sm hover:bg-muted focus-visible:outline-2"
          href="/api/v1/imports/export?kind=companies"
        >
          {t("Exportar empresas (CSV)")}
        </a>
        <a
          download
          className="rounded-md border px-3 py-2 text-sm hover:bg-muted focus-visible:outline-2"
          href="/api/v1/imports/export?kind=people"
        >
          {t("Exportar pessoas (CSV)")}
        </a>
        <a
          download
          className="rounded-md border px-3 py-2 text-sm hover:bg-muted focus-visible:outline-2"
          href="/api/v1/imports/export?kind=contacts"
        >
          {t("Exportar contatos (CSV)")}
        </a>
      </div>
      <Card className="flex flex-wrap items-end gap-3 p-4">
        <div className="grid gap-1.5">
          <label className="text-sm font-medium">{t("Arquivo")}</label>
          <Input
            type="file"
            accept=".csv,.xlsx,.xlsm,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel.sheet.macroEnabled.12,text/csv"
            onChange={(e) => {
              setFile(e.target.files?.[0] ?? null);
              setPreview(null);
              setMapping({});
              setMessage(null);
            }}
          />
        </div>
        <Button disabled={!file || uploading} onClick={() => void upload(true)}>
          {uploading ? t("Analisando…") : t("Analisar planilha")}
        </Button>
        {message ? <p className="w-full text-sm text-muted-foreground">{message}</p> : null}
      </Card>

      {preview && (
        <Card className="space-y-4 p-4">
          {preview.workbook && (
            <section className="space-y-2 rounded-md border p-3" aria-label={t("Análise XLSM")}>
              <p role="status" className="text-sm">
                {t(
                  "Somente análise: nenhuma macro foi executada ou fórmula recalculada. Cada aba é analisada separadamente; nenhuma linha desta aba foi cortada.",
                )}
              </p>
              <label className="grid gap-1 text-sm">
                {t("Aba da planilha")}
                <select
                  className="rounded-md border bg-background p-2 focus-visible:outline-2"
                  value={preview.workbook.selected_sheet}
                  disabled={uploading}
                  onChange={(e) => void upload(true, e.target.value)}
                >
                  {preview.workbook.sheets.map((name) => (
                    <option key={name} value={name}>
                      {name}
                    </option>
                  ))}
                </select>
              </label>
              <p className="text-sm">
                {preview.workbook.sheets.length} {t("abas no arquivo")}
              </p>
              <p className="text-sm text-muted-foreground">
                {t(
                  "A carga integral desta planilha exige lotes revisados e recuperação validada. Esta tela não importa o XLSM.",
                )}
              </p>
            </section>
          )}
          <h2 className="font-semibold">
            {t("Revise as colunas antes de importar")} · {preview.total_rows} {t("linhas")}
          </h2>
          <p className="text-sm text-muted-foreground">
            {t(
              "Esta análise não gravou clientes. Sem telefone, o registro fica em Empresas/Pessoas. Não cria oportunidades nem envia mensagens.",
            )}
          </p>
          <p className="text-sm text-muted-foreground">
            {t(
              "Cliente pode ser pessoa ou empresa. Uma coluna NOME não determina o tipo. Não use o mesmo nome como empresa e pessoa sem revisar.",
            )}
          </p>
          {[
            { title: "Pessoa / contato", keys: ["person_name", "job_title", "phone", "email"] },
            {
              title: "Empresa — somente quando aplicável",
              keys: ["company_name", "legal_name", "trade_name", "cnpj"],
            },
          ].map((group) => (
            <fieldset key={group.title} className="rounded-md border p-3">
              <legend className="px-2 font-medium">{t(group.title)}</legend>
              <div className="grid gap-3 sm:grid-cols-2">
                {IMPORT_FIELDS.filter((field) => group.keys.includes(field.key)).map((field) => (
                  <label key={field.key} className="grid gap-1 text-sm">
                    {t(field.label)}
                    <select
                      className="rounded-md border bg-background p-2 focus-visible:outline-2"
                      value={mapping[field.key] ?? ""}
                      disabled={uploading}
                      onChange={(e) =>
                        setMapping((current) => ({ ...current, [field.key]: e.target.value }))
                      }
                    >
                      <option value="">{t("Não importar este campo")}</option>
                      {preview.headers.map((header) => (
                        <option key={header} value={header}>
                          {header}
                        </option>
                      ))}
                    </select>
                  </label>
                ))}
              </div>
            </fieldset>
          ))}
          {preview.operational_review && (
            <section className="space-y-2 rounded-md border p-3">
              <h3 className="font-medium">{t("Revisão de linhas operacionais")}</h3>
              <p className="text-sm">
                {t("Possíveis registros")}: {preview.operational_review.counts.record} ·{" "}
                {t("Cabeçalhos repetidos")}: {preview.operational_review.counts.header} ·{" "}
                {t("Possíveis fechamentos")}: {preview.operational_review.counts.closure} ·{" "}
                {t("Linhas para revisão")}: {preview.operational_review.counts.review}
              </p>
              <p className="text-sm">
                {t("Datas para revisão")}: {preview.operational_review.dates_for_review}
              </p>
              <p className="text-sm text-muted-foreground">
                {t(
                  "Nenhuma linha foi excluída. Cabeçalhos e fechamentos são sugestões de classificação; datas numéricas do Excel e intervalos permanecem no original para revisão.",
                )}
              </p>
            </section>
          )}
          {preview.operational_columns && (
            <section className="space-y-2 rounded-md border p-3">
              <h3 className="font-medium">{t("Correlação operacional — somente análise")}</h3>
              <p className="text-sm">
                {t(
                  "Estes destinos são sugestões de revisão. Não criam clientes, serviços, pagamentos ou notas fiscais.",
                )}
              </p>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{t("Coluna")}</TableHead>
                      <TableHead>{t("Destino sugerido")}</TableHead>
                      <TableHead>{t("Linhas preenchidas")}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {preview.operational_columns.map((column) => (
                      <TableRow key={column.header}>
                        <TableCell>{column.header}</TableCell>
                        <TableCell>{t(column.destination)}</TableCell>
                        <TableCell>{column.populated_rows}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </section>
          )}
          {preview.historical_review && (
            <section
              aria-label={t("Locais e histórico de serviços")}
              className="space-y-3 rounded-md border p-3"
            >
              <h3 className="font-medium">
                {t("Locais e histórico de serviços — somente revisão")}
              </h3>
              <p className="text-sm">
                {preview.historical_review.address_rows} {t("linhas com endereço")} ·{" "}
                {preview.historical_review.service_rows} {t("linhas com dados de serviço")} ·{" "}
                {preview.historical_review.unnamed_rows} {t("linhas sem nome identificado")}
              </p>
              <p className="text-sm text-muted-foreground">
                {t(
                  "Estes dados ainda não serão importados. Não unimos clientes, criamos compromissos nem registramos pagamentos. A posição indica a linha de dados lida, não a linha original do Excel.",
                )}
              </p>
              <p className="text-sm">
                {preview.historical_review.value_review_rows} {t("valores para revisão")} ·{" "}
                {preview.historical_review.date_review_rows} {t("datas para revisão")}
              </p>
              {preview.historical_review.ambiguous_fields.length > 0 && (
                <p role="status" className="text-sm">
                  {t(
                    "Há colunas com significados repetidos; a identificação automática ficou pendente nesses campos.",
                  )}
                </p>
              )}
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      {[
                        t("Posição"),
                        t("Nome original"),
                        t("Endereço original"),
                        t("Data original"),
                        t("Valor original"),
                        t("Observação original"),
                      ].map((label) => (
                        <TableHead key={label}>{label}</TableHead>
                      ))}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {preview.historical_review.sample.map((row) => (
                      <TableRow key={row.data_row_index}>
                        <TableCell>{row.data_row_index}</TableCell>
                        <TableCell>{row.raw.name || "—"}</TableCell>
                        <TableCell>{row.raw.address || "—"}</TableCell>
                        <TableCell>{row.raw.service_date || "—"}</TableCell>
                        <TableCell>{row.raw.value || "—"}</TableCell>
                        <TableCell>{row.raw.notes || "—"}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </section>
          )}
          {file &&
            !preview.workbook?.analysis_only &&
            preview.historical_review &&
            preview.source_sha256 && (
              <HistoricalReviewEditor
                key={preview.source_sha256}
                file={file}
                sourceHash={preview.source_sha256}
              />
            )}
          {uncovered.length > 0 && (
            <div role="status" className="rounded-md border p-3 text-sm">
              <p className="font-medium">{t("Importação bloqueada: há colunas sem destino.")}</p>
              <p>
                {t(
                  "Revise o mapeamento. Endereços e histórico de serviços precisam de um fluxo próprio; não os relacione a campos de nome ou telefone.",
                )}
              </p>
              <ul className="mt-2 list-inside list-disc">
                {uncovered.map((column) => (
                  <li key={column.header}>
                    {column.header}: {column.populated_rows} {t("linhas preenchidas")}
                  </li>
                ))}
              </ul>
            </div>
          )}
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  {IMPORT_FIELDS.map((field) => (
                    <TableHead key={field.key}>{t(field.label)}</TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {preview.sample.map((_, index) => (
                  <TableRow key={index}>
                    {IMPORT_FIELDS.map((field) => (
                      <TableCell key={field.key}>
                        {(() => {
                          const column = preview.headers.indexOf(mapping[field.key] ?? "");
                          return column >= 0 ? preview.raw_sample[index]?.[column] : "—";
                        })()}
                      </TableCell>
                    ))}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          {preview.total_rows > 2000 && (
            <p className="text-sm text-muted-foreground">
              {t(
                "Todas as linhas foram analisadas. A gravação exige lotes de até 2.000 linhas; esta análise não salvou clientes.",
              )}
            </p>
          )}
          <Button
            disabled={
              uploading ||
              preview.total_rows > 2000 ||
              preview.workbook?.analysis_only ||
              !Array.isArray(preview.column_coverage) ||
              !Object.values(mapping).some(Boolean) ||
              (preview.historical_review?.blocked_columns.length ?? 0) > 0 ||
              uncovered.length > 0
            }
            onClick={() => void upload(false)}
          >
            {uploading ? t("Importando…") : t("Confirmar importação")}
          </Button>
        </Card>
      )}
      <Card className="overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t("Arquivo")}</TableHead>
              <TableHead>{t("Status")}</TableHead>
              <TableHead>{t("Linhas")}</TableHead>
              <TableHead>{t("Sucesso")}</TableHead>
              <TableHead>{t("Conflitos")}</TableHead>
              <TableHead>{t("Falhas")}</TableHead>
              <TableHead>{t("Data")}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-muted-foreground">
                  {t("Nenhuma importação ainda.")}
                </TableCell>
              </TableRow>
            ) : (
              rows.map((b) => (
                <TableRow key={b.id}>
                  <TableCell>
                    <Link className="hover:underline" href={`/app/imports/${b.id}`}>
                      {b.filename}
                      {typeof b.column_mapping?.sheet === "string" && (
                        <span className="block text-xs text-muted-foreground">
                          {b.column_mapping.sheet}
                        </span>
                      )}
                    </Link>
                  </TableCell>
                  <TableCell>{b.status}</TableCell>
                  <TableCell>{b.total_rows}</TableCell>
                  <TableCell>{b.successful_rows}</TableCell>
                  <TableCell>{b.conflict_rows}</TableCell>
                  <TableCell>{b.failed_rows}</TableCell>
                  <TableCell className="text-xs">
                    {new Date(b.created_at).toLocaleString()}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
}
