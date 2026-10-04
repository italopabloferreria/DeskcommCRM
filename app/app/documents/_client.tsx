"use client";
import { useT } from "@/hooks/i18n/useT";

import Link from "next/link";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { previaSchema } from "@/lib/documentos/previa";
import { EditorImagem, type ImagemDocumento } from "./_imagem";
import { ModelosDocumentos } from "./_modelos";
import { preencherModelo, type CampoDocumento } from "@/lib/documentos/modelos";
import type { PreviaDocumento } from "@/lib/documentos/previa";
import { ArquivosDocumentos } from "./_arquivos";

export function DocumentsClient({ podeUsarPng }: { podeUsarPng: boolean }) {
  const t = useT();
  const [titulo, setTitulo] = useState("Ordem de serviço");
  const [destinatario, setDestinatario] = useState("");
  const [paginas, setPaginas] = useState([""]);
  const [imagens, setImagens] = useState<ImagemDocumento[]>([
    {
      tipo: "assinatura",
      nome: "",
      qualificacao: "",
      png: "",
      pagina: 1,
      x: 120,
      y: 235,
      largura: 65,
      altura: 20,
    },
    {
      tipo: "carimbo",
      nome: "",
      qualificacao: "",
      png: "",
      pagina: 1,
      x: 20,
      y: 235,
      largura: 65,
      altura: 20,
    },
  ]);
  const [erro, setErro] = useState("");
  const [busy, setBusy] = useState(false);
  const [valores, setValores] = useState<Partial<Record<CampoDocumento, string>>>({});
  const [contatoId, setContatoId] = useState<string | null>(null);
  const documento = {
    titulo,
    destinatario,
    paginas: paginas.map((texto) => ({ texto })),
    assinaturas: imagens.filter((s) => s.png),
  };
  function aplicar(doc: PreviaDocumento) {
    setContatoId(null);
    setTitulo(doc.titulo);
    setDestinatario(doc.destinatario);
    setPaginas(doc.paginas.map((p) => p.texto));
    setImagens((anteriores) =>
      anteriores.map(
        (s) => doc.assinaturas.find((a) => a.tipo === s.tipo) ?? { ...s, png: "", pagina: 1 },
      ),
    );
  }
  async function baixar() {
    setErro("");
    const parsed = previaSchema.safeParse({
      titulo,
      destinatario,
      paginas: paginas.map((texto) => ({ texto })),
      assinaturas: imagens.filter((s) => s.png),
    });
    if (!parsed.success) {
      setErro(parsed.error.issues[0]?.message ?? "Revise os campos.");
      return;
    }
    setBusy(true);
    try {
      const preenchido = preencherModelo(parsed.data, valores);
      const response = await fetch("/api/v1/documents/preview", {
        method: "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(preenchido),
      });
      if (!response.ok) {
        const body = await response.json();
        throw new Error(body.error?.message ?? "Não foi possível gerar a prévia.");
      }
      const url = URL.createObjectURL(await response.blob());
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = "documento-previa.pdf";
      anchor.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch (error) {
      setErro(error instanceof Error ? error.message : "Falha ao gerar o documento.");
    } finally {
      setBusy(false);
    }
  }
  return (
    <main className="mx-auto max-w-4xl space-y-6 p-4 sm:p-8">
      <div>
        <h1 className="text-2xl font-semibold">{t("Documentos")}</h1>
        <p className="text-muted-foreground">
          {t("Prepare uma prévia em PDF com assinatura e carimbo nas posições escolhidas.")}{" "}
        </p>
      </div>
      <div className="rounded-lg border p-4 text-sm">
        {t(
          "Salve o modelo para reutilizar texto, assinatura, carimbo e posições. O PDF identifica o rascunho e não é uma nota fiscal. Salvar um modelo não arquiva os PDFs emitidos.",
        )}{" "}
      </div>
      {podeUsarPng ? (
        <ModelosDocumentos
          documento={documento}
          aplicar={aplicar}
          valores={valores}
          selecionarContato={setContatoId}
          preencher={(campo, valor) => {
            if (campo.startsWith("cliente.")) setContatoId(null);
            setValores((v) => ({ ...v, [campo]: valor }));
          }}
          inserir={(campo) =>
            setPaginas((p) =>
              p.map((texto, n) => (n === p.length - 1 ? `${texto}{{${campo}}}` : texto)),
            )
          }
        />
      ) : null}
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="doc-titulo">{t("Título")}</Label>
          <Input
            id="doc-titulo"
            value={titulo}
            maxLength={120}
            onChange={(e) => setTitulo(e.target.value)}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="doc-destinatario">{t("Cliente ou destinatário")}</Label>
          <Input
            id="doc-destinatario"
            value={destinatario}
            maxLength={180}
            onChange={(e) => {
              setContatoId(null);
              setDestinatario(e.target.value);
            }}
          />
        </div>
      </div>
      {paginas.map((texto, i) => (
        <div key={i} className="space-y-2">
          <Label htmlFor={`doc-pagina-${i}`}>
            {t("Texto da página")} {i + 1}
          </Label>
          <Textarea
            id={`doc-pagina-${i}`}
            rows={9}
            value={texto}
            maxLength={2500}
            onChange={(e) => setPaginas((p) => p.map((t, n) => (n === i ? e.target.value : t)))}
          />
          <p className="text-xs text-muted-foreground">
            {t("Até 32 linhas de 50 caracteres; divida textos maiores entre páginas.")}{" "}
          </p>
        </div>
      ))}
      <div className="flex gap-2">
        <Button
          variant="outline"
          disabled={paginas.length >= 40}
          onClick={() => setPaginas((p) => [...p, ""])}
        >
          {t("Adicionar página")}{" "}
        </Button>
        {paginas.length > 1 ? (
          <Button
            variant="outline"
            onClick={() => {
              setPaginas((p) => p.slice(0, -1));
              setImagens((s) =>
                s.map((imagem) => ({
                  ...imagem,
                  pagina: Math.min(imagem.pagina, paginas.length - 1),
                })),
              );
            }}
          >
            {t("Remover última página")}{" "}
          </Button>
        ) : null}
      </div>
      {podeUsarPng
        ? imagens.map((imagem, i) => (
            <EditorImagem
              key={imagem.tipo}
              imagem={imagem}
              paginas={paginas.length}
              erro={setErro}
              atualizar={(value) =>
                setImagens((s) => s.map((atual, n) => (n === i ? { ...atual, ...value } : atual)))
              }
            />
          ))
        : null}
      {erro ? (
        <p role="alert" className="text-destructive">
          {erro}
        </p>
      ) : null}
      <Button disabled={busy} onClick={() => void baixar()}>
        {busy ? t("Gerando PDF…") : t("Baixar prévia em PDF")}
      </Button>
      {podeUsarPng ? (
        <ArquivosDocumentos
          preparar={() => preencherModelo(documento, valores)}
          contatoId={contatoId}
        />
      ) : null}
      <div className="flex flex-wrap gap-4 border-t pt-4 text-sm">
        <Link className="underline" href="/app/proposals">
          {t("Propostas comerciais")}{" "}
        </Link>
        <a
          className="underline"
          href="https://assinador.iti.br/"
          target="_blank"
          rel="noopener noreferrer"
        >
          {t("Portal de assinatura Gov.br")}{" "}
        </a>
        <a
          className="underline"
          href="https://validar.iti.gov.br/"
          target="_blank"
          rel="noopener noreferrer"
        >
          {t("Validar assinatura no ITI")}{" "}
        </a>
      </div>
      <p className="text-sm text-muted-foreground">
        {t(
          "DocuSign ainda não está conectado. O portal Gov.br abre separadamente; o CRM não envia este arquivo automaticamente.",
        )}{" "}
      </p>
    </main>
  );
}
