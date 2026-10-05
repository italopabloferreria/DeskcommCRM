"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { useT } from "@/hooks/i18n/useT";
import { useTagDeIdioma } from "@/hooks/i18n/useLocaleDeData";
import { randomId } from "@/lib/random-id";
import { previaSchema, type PreviaDocumento } from "@/lib/documentos/previa";

const arquivoSchema = z.object({
  id: z.uuid(),
  titulo: z.string(),
  destinatario: z.string(),
  criadoEm: z.iso.datetime(),
});
const listaSchema = z.object({
  documentos: z.array(arquivoSchema),
  proximoOffset: z.number().int().nonnegative().nullable(),
});
type Arquivo = z.infer<typeof arquivoSchema>;

export function ArquivosDocumentos({
  preparar,
  contatoId,
}: {
  preparar: () => PreviaDocumento;
  contatoId: string | null;
}) {
  const t = useT();
  const idioma = useTagDeIdioma();
  const [arquivos, setArquivos] = useState<Arquivo[]>([]);
  const [offset, setOffset] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);
  const [erro, setErro] = useState("");
  const [mensagem, setMensagem] = useState("");
  const tentativa = useRef<{ conteudo: string; id: string } | null>(null);
  const mounted = useRef(true);
  const controller = useRef<AbortController | null>(null);

  const listar = useCallback(async (inicio = 0, signal?: AbortSignal) => {
    const response = await fetch(`/api/v1/documents/archive?offset=${inicio}`, {
      credentials: "same-origin",
      cache: "no-store",
      signal,
    });
    const body = await response.json();
    if (!response.ok)
      throw new Error(body.error?.message ?? "Não foi possível consultar os arquivos.");
    const data = listaSchema.parse(body.data);
    if (mounted.current) {
      setArquivos((anteriores) =>
        inicio === 0 ? data.documentos : [...anteriores, ...data.documentos],
      );
      setOffset(data.proximoOffset);
    }
  }, []);

  useEffect(() => {
    mounted.current = true;
    const abort = new AbortController();
    controller.current = abort;
    void listar(0, abort.signal).catch((error: unknown) => {
      if (!abort.signal.aborted && mounted.current)
        setErro(error instanceof Error ? error.message : "Falha ao consultar arquivos.");
    });
    return () => {
      mounted.current = false;
      controller.current?.abort();
    };
  }, [listar]);

  async function executar(action: (signal: AbortSignal) => Promise<void>) {
    setBusy(true);
    setErro("");
    setMensagem("");
    controller.current?.abort();
    const abort = new AbortController();
    controller.current = abort;
    try {
      await action(abort.signal);
    } catch (error) {
      if (!abort.signal.aborted && mounted.current)
        setErro(error instanceof z.ZodError
          ? error.issues[0]?.message ?? "Revise os campos do documento."
          : error instanceof Error ? error.message : "Falha ao arquivar o documento.");
    } finally {
      if (mounted.current) setBusy(false);
    }
  }

  async function salvar(signal: AbortSignal) {
    const parsed = previaSchema.safeParse(preparar());
    if (!parsed.success) throw new Error(parsed.error.issues[0]?.message ?? "Revise os campos.");
    const contact_id = z.uuid().nullable().parse(contatoId);
    const conteudo = JSON.stringify({ documento: parsed.data, contact_id });
    if (!tentativa.current || tentativa.current.conteudo !== conteudo)
      tentativa.current = { conteudo, id: randomId() };
    const response = await fetch("/api/v1/documents/archive", {
      method: "POST",
      credentials: "same-origin",
      signal,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: tentativa.current.id, documento: parsed.data, contact_id }),
    });
    const body = await response.json();
    if (!response.ok) throw new Error(body.error?.message ?? "Não foi possível salvar o PDF.");
    z.object({ id: z.uuid(), repetido: z.boolean() }).parse(body.data);
    if (mounted.current) setMensagem("PDF arquivado. Você pode baixá-lo na lista abaixo.");
    await listar(0, signal);
  }

  return (
    <section className="space-y-4 rounded-lg border p-4" aria-labelledby="doc-arquivos">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 id="doc-arquivos" className="font-semibold">
          {t("PDFs arquivados")}
        </h2>
        <div className="flex flex-wrap gap-2">
          <Button disabled={busy} onClick={() => void executar(salvar)}>
            {t("Salvar PDF no CRM")}
          </Button>
          <Button
            variant="outline"
            disabled={busy}
            onClick={() => void executar((signal) => listar(0, signal))}
          >
            {t("Atualizar arquivos")}
          </Button>
        </div>
      </div>
      <p className="text-sm text-muted-foreground">
        {t(
          "O arquivo guarda a prévia preenchida como estava ao salvar, incluindo assinatura e carimbo. Alterar o modelo depois não altera os PDFs arquivados.",
        )}
      </p>
      <p className="text-sm text-muted-foreground">
        {contatoId
          ? t("Este PDF será vinculado ao contato selecionado.")
          : t(
              "Selecione um contato acima para vincular o arquivo ao seu cadastro. Sem seleção, o PDF guarda somente os dados preenchidos.",
            )}
      </p>
      {busy ? <p role="status">{t("Processando arquivo…")}</p> : null}
      {mensagem ? <p role="status">{t(mensagem)}</p> : null}
      {erro ? (
        <p role="alert" className="text-destructive">
          {erro}
        </p>
      ) : null}
      {arquivos.length ? (
        <ul className="divide-y">
          {arquivos.map((arquivo) => (
            <li key={arquivo.id} className="flex flex-wrap items-center justify-between gap-2 py-3">
              <div>
                <p className="font-medium">{arquivo.titulo}</p>
                <p className="text-sm text-muted-foreground">
                  {arquivo.destinatario} · {new Date(arquivo.criadoEm).toLocaleString(idioma)}
                </p>
              </div>
              <a
                className="underline underline-offset-4"
                href={`/api/v1/documents/archive?id=${encodeURIComponent(arquivo.id)}`}
              >
                {t("Baixar PDF arquivado")}
              </a>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-sm text-muted-foreground">{t("Nenhum PDF arquivado ainda.")}</p>
      )}
      {offset !== null ? (
        <Button
          variant="outline"
          disabled={busy}
          onClick={() => void executar((signal) => listar(offset, signal))}
        >
          {t("Carregar mais arquivos")}
        </Button>
      ) : null}
    </section>
  );
}
