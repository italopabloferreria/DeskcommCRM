"use client";

import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  CAMPOS_DOCUMENTO,
  modeloSchema,
  paginarContrato,
  type CampoDocumento,
  type ModeloDocumento,
} from "@/lib/documentos/modelos";
import type { PreviaDocumento } from "@/lib/documentos/previa";

type Versao = { id: string; versao: string; nome: string; criadoEm: string };
async function consultar(url: string, init?: RequestInit) {
  const response = await fetch(url, { ...init, credentials: "same-origin", cache: "no-store" });
  const body = await response.json();
  if (!response.ok) throw new Error(body.error?.message ?? "Não foi possível concluir a operação.");
  return body.data;
}

export function ModelosDocumentos({
  documento,
  aplicar,
  valores,
  preencher,
  inserir,
}: {
  documento: PreviaDocumento;
  aplicar: (documento: PreviaDocumento) => void;
  valores: Partial<Record<CampoDocumento, string>>;
  preencher: (campo: CampoDocumento, valor: string) => void;
  inserir: (campo: CampoDocumento) => void;
}) {
  const [nome, setNome] = useState("");
  const [id, setId] = useState<string | null>(null);
  const [origem, setOrigem] = useState<ModeloDocumento["origem"]>(null);
  const [versoes, setVersoes] = useState<Versao[]>([]);
  const [proximoOffset, setProximoOffset] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);
  const [lendo, setLendo] = useState(false);
  const [mensagem, setMensagem] = useState("");
  const [erro, setErro] = useState("");
  const [arquivo, setArquivo] = useState<File | null>(null);
  const [busca, setBusca] = useState("");
  const [clientes, setClientes] = useState<Record<string, string | null>[]>([]);
  const controller = useRef<AbortController | null>(null);
  const mounted = useRef(true);
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
      controller.current?.abort();
    };
  }, []);
  async function executar(action: () => Promise<void>) {
    setBusy(true);
    setErro("");
    setMensagem("");
    try {
      await action();
    } catch (e) {
      if (mounted.current) setErro(e instanceof Error ? e.message : "Falha na operação.");
    } finally {
      if (mounted.current) {
        setBusy(false);
        setLendo(false);
      }
    }
  }
  async function ler() {
    if (!arquivo) throw new Error("Escolha o contrato primeiro.");
    setLendo(true);
    const abort = new AbortController();
    controller.current = abort;
    const { extrairContrato } = await import("@/lib/documentos/ocr-browser");
    const resultado = await extrairContrato(
      arquivo,
      (texto) => {
        if (mounted.current) setMensagem(texto);
      },
      abort.signal,
    );
    if (!mounted.current || abort.signal.aborted) return;
    const paginas = paginarContrato(resultado.paginas.map((p) => p.texto));
    aplicar({
      ...documento,
      destinatario: "{{cliente.nome}}",
      paginas: paginas.map((texto) => ({ texto })),
      assinaturas: [],
    });
    setId(null);
    setNome(arquivo.name.replace(/\.[^.]+$/, "").slice(0, 120));
    setOrigem({
      sha256: resultado.sha256,
      motor: resultado.paginas.some((p) => p.motor === "tesseract_por")
        ? "tesseract_por"
        : "pdf_texto",
      revisado: false,
    });
    const baixas = resultado.paginas
      .filter((p) => p.confianca !== null && p.confianca < 80)
      .map((p) => p.pagina);
    setMensagem(
      `Texto extraído em ${paginas.length} página(s) do editor. Revise nomes, valores e cláusulas.${baixas.length ? ` Atenção especial às páginas de origem: ${baixas.join(", ")}.` : ""}`,
    );
  }
  async function salvar() {
    const modelo = modeloSchema.parse({ id: id ?? crypto.randomUUID(), nome, documento, origem });
    if (origem && !origem.revisado) throw new Error("Confirme a revisão do texto antes de salvar.");
    // Retain identifier on network failure so a retry is idempotent.
    setId(modelo.id);
    const saved = await consultar("/api/v1/documents/models", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(modelo),
    });
    setId(saved.id);
    setMensagem("Modelo salvo com as imagens e posições. A versão anterior permanece preservada.");
    await buscarModelos();
  }
  async function buscarModelos(offset = 0) {
    const acervo = await consultar(`/api/v1/documents/models?offset=${offset}`);
    setVersoes((anteriores) =>
      offset === 0
        ? acervo.modelos
        : [...anteriores, ...acervo.modelos].filter(
            (v, n, todas) =>
              todas.findIndex((item) => item.id === v.id && item.versao === v.versao) === n,
          ),
    );
    setProximoOffset(acervo.proximoOffset);
  }
  async function carregar(versao: Versao) {
    const modelo = modeloSchema.parse(
      await consultar(
        `/api/v1/documents/models?id=${encodeURIComponent(versao.id)}&versao=${versao.versao}`,
      ),
    );
    aplicar(modelo.documento);
    setId(modelo.id);
    setNome(modelo.nome);
    setOrigem(modelo.origem);
    setMensagem("Modelo carregado. Preencha os dados do cliente para gerar o documento.");
  }
  return (
    <section className="space-y-4 rounded-lg border p-4" aria-label="Modelos de documentos">
      <h2 className="text-lg font-semibold">Contratos e modelos reutilizáveis</h2>
      <p className="text-sm text-muted-foreground">
        O arquivo é lido neste navegador. Revise o texto e substitua dados pessoais por campos do
        cliente antes de salvar o modelo. O arquivo original não é enviado nem arquivado.
      </p>
      <Label htmlFor="contrato-origem">
        Contrato em PDF ou imagem (até 10 MB; PDF até 20 páginas)
      </Label>
      <Input
        id="contrato-origem"
        type="file"
        accept="application/pdf,image/png,image/jpeg"
        disabled={busy}
        onChange={(e) => setArquivo(e.target.files?.[0] ?? null)}
      />
      <div className="flex flex-wrap gap-2">
        <Button variant="outline" disabled={busy || !arquivo} onClick={() => void executar(ler)}>
          Ler contrato / OCR
        </Button>
        {busy && lendo ? (
          <Button variant="outline" onClick={() => controller.current?.abort()}>
            Cancelar leitura
          </Button>
        ) : null}
        <Button
          variant="outline"
          disabled={busy}
          onClick={() =>
            void executar(async () => {
              await buscarModelos();
              setMensagem("Acervo atualizado.");
            })
          }
        >
          Buscar modelos salvos
        </Button>
      </div>
      {origem ? (
        <Label className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={origem.revisado}
            onChange={(e) => setOrigem({ ...origem, revisado: e.target.checked })}
          />
          Revisei o texto extraído e os campos do modelo
        </Label>
      ) : null}
      <Label htmlFor="modelo-nome">Nome do modelo</Label>
      <Input
        id="modelo-nome"
        value={nome}
        maxLength={120}
        onChange={(e) => setNome(e.target.value)}
      />
      <Button
        disabled={busy || !nome.trim() || Boolean(origem && !origem.revisado)}
        onClick={() => void executar(salvar)}
      >
        Salvar modelo e imagens
      </Button>
      <Button
        variant="outline"
        disabled={busy}
        onClick={() => {
          setId(null);
          setNome("");
          setMensagem(
            "O conteúdo foi mantido para criar outro modelo. Escolha um novo nome e salve.",
          );
        }}
      >
        Criar outro modelo com este conteúdo
      </Button>
      {versoes.length ? (
        <ul className="space-y-2">
          {versoes.map((v) => (
            <li key={`${v.id}-${v.versao}`}>
              <Button
                variant="outline"
                disabled={busy}
                onClick={() => void executar(() => carregar(v))}
              >
                {v.nome} · {v.criadoEm ? new Date(v.criadoEm).toLocaleString("pt-BR") : ""} ·{" "}
                {v.versao.slice(0, 8)}
              </Button>
            </li>
          ))}
        </ul>
      ) : null}
      <h3 className="font-medium">Campos para preencher por cliente</h3>
      {proximoOffset !== null ? (
        <Button
          variant="outline"
          disabled={busy}
          onClick={() => void executar(() => buscarModelos(proximoOffset))}
        >
          Carregar mais modelos
        </Button>
      ) : null}
      <Label htmlFor="buscar-cliente-doc">Buscar cliente cadastrado</Label>
      <div className="flex gap-2">
        <Input
          id="buscar-cliente-doc"
          value={busca}
          maxLength={100}
          onChange={(e) => setBusca(e.target.value)}
        />
        <Button
          variant="outline"
          disabled={busy || !busca.trim()}
          onClick={() =>
            void executar(async () => {
              setClientes(
                await consultar(`/api/v1/companies?search=${encodeURIComponent(busca)}&limit=20`),
              );
              setMensagem("Busca concluída. Selecione a empresa desejada.");
            })
          }
        >
          Buscar cliente
        </Button>
      </div>
      {clientes.length ? (
        <ul>
          {clientes.map((cliente) => (
            <li key={cliente.id}>
              <Button
                variant="outline"
                onClick={() => {
                  preencher("cliente.nome", cliente.legal_name || cliente.trade_name || "");
                  preencher("cliente.documento", cliente.cnpj || "");
                  preencher("cliente.telefone", cliente.phone || "");
                  preencher(
                    "cliente.endereco",
                    [
                      cliente.street,
                      cliente.number,
                      cliente.complement,
                      cliente.district,
                      cliente.city,
                      cliente.state,
                      cliente.zip_code,
                    ]
                      .filter(Boolean)
                      .join(", "),
                  );
                  setMensagem("Dados do cliente preenchidos. Confira antes de gerar o PDF.");
                }}
              >
                {cliente.legal_name || cliente.trade_name} {cliente.cnpj}
              </Button>
            </li>
          ))}
        </ul>
      ) : null}
      <p className="text-sm text-muted-foreground">
        Insira o campo no texto da última página. Seus valores preenchem o PDF sem modificar o
        modelo salvo.
      </p>
      <div className="grid gap-3 sm:grid-cols-2">
        {(Object.entries(CAMPOS_DOCUMENTO) as [CampoDocumento, string][]).map(([campo, label]) => (
          <div key={campo} className="space-y-1">
            <Label htmlFor={`campo-${campo}`}>{label}</Label>
            <div className="flex gap-2">
              <Input
                id={`campo-${campo}`}
                maxLength={500}
                value={valores[campo] ?? ""}
                onChange={(e) => preencher(campo, e.target.value)}
              />
              <Button
                variant="outline"
                aria-label={`Inserir campo ${label}`}
                onClick={() => inserir(campo)}
              >
                Inserir
              </Button>
            </div>
          </div>
        ))}
      </div>
      {mensagem ? (
        <p role="status" className="text-sm">
          {mensagem}
        </p>
      ) : null}
      {erro ? (
        <p role="alert" className="text-destructive">
          {erro}
        </p>
      ) : null}
    </section>
  );
}
