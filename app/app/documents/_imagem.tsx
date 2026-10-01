"use client";

import Image from "next/image";
import { useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { PreviaDocumento } from "@/lib/documentos/previa";

export type ImagemDocumento = PreviaDocumento["assinaturas"][number];
export function EditorImagem({
  imagem,
  atualizar,
  erro,
  paginas,
}: {
  imagem: ImagemDocumento;
  atualizar: (imagem: Partial<ImagemDocumento>) => void;
  erro: (texto: string) => void;
  paginas: number;
}) {
  const leitura = useRef(0);
  const input = useRef<HTMLInputElement>(null);
  useEffect(
    () => () => {
      leitura.current++;
    },
    [],
  );
  const titulo = imagem.tipo === "carimbo" ? "Carimbo" : "Assinatura";
  const prefixo = `doc-${imagem.tipo}`;
  function limpar() {
    leitura.current++;
    if (input.current) input.current.value = "";
    atualizar({ png: "" });
  }
  function carregar(file?: File) {
    limpar();
    erro("");
    if (!file) return;
    if (file.size > 128 * 1024 || file.type !== "image/png") {
      erro("Use PNG transparente com até 128 KB.");
      return;
    }
    const atual = leitura.current;
    const reader = new FileReader();
    reader.onerror = () => {
      if (atual === leitura.current) erro("Não foi possível ler o PNG.");
    };
    reader.onload = () => {
      if (atual === leitura.current) atualizar({ png: String(reader.result) });
    };
    reader.readAsDataURL(file);
  }
  return (
    <fieldset className="space-y-4 rounded-lg border p-4">
      <legend className="px-2 font-medium">{titulo} opcional</legend>
      <p className="text-sm text-muted-foreground">
        PNG transparente RGBA de até 128 KB e 1024 × 512 pixels. Confira no PDF se a imagem cobre
        algum texto.
      </p>
      <Label htmlFor={`${prefixo}-png`}>PNG de {titulo.toLowerCase()}</Label>
      <Input
        ref={input}
        id={`${prefixo}-png`}
        type="file"
        accept="image/png"
        onChange={(e) => carregar(e.target.files?.[0])}
      />
      {imagem.png ? (
        <div className="rounded border bg-white p-3">
          <Image
            src={imagem.png}
            alt={`Prévia de ${titulo.toLowerCase()}`}
            width={320}
            height={160}
            unoptimized
            className="h-24 w-auto object-contain"
          />
        </div>
      ) : null}
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <Label htmlFor={`${prefixo}-nome`}>
            {imagem.tipo === "carimbo" ? "Identificação do emissor" : "Signatário"}
          </Label>
          <Input
            id={`${prefixo}-nome`}
            value={imagem.nome}
            maxLength={120}
            onChange={(e) => atualizar({ ...imagem, nome: e.target.value })}
          />
        </div>
        <div>
          <Label htmlFor={`${prefixo}-qualificacao`}>Cargo ou qualificação</Label>
          <Input
            id={`${prefixo}-qualificacao`}
            value={imagem.qualificacao}
            maxLength={120}
            onChange={(e) => atualizar({ ...imagem, qualificacao: e.target.value })}
          />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-5">
        {(
          [
            ["pagina", "Página", 1, paginas],
            ["x", "Esquerda (mm)", 10, 200],
            ["y", "Topo (mm)", 35, 255],
            ["largura", "Largura (mm)", 15, 90],
            ["altura", "Altura (mm)", 5, 35],
          ] as const
        ).map(([key, label, min, max]) => (
          <div key={key}>
            <Label htmlFor={`${prefixo}-${key}`}>{label}</Label>
            <Input
              id={`${prefixo}-${key}`}
              type="number"
              min={min}
              max={max}
              step={key === "pagina" ? 1 : 0.5}
              value={imagem[key]}
              onChange={(e) => atualizar({ ...imagem, [key]: Number(e.target.value) })}
            />
          </div>
        ))}
      </div>
      {imagem.png ? (
        <Button variant="outline" onClick={limpar}>
          Retirar {titulo.toLowerCase()}
        </Button>
      ) : null}
    </fieldset>
  );
}
