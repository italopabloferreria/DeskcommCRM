import React from "react";
import { Document, Image, Page, Text, View, renderToBuffer } from "@react-pdf/renderer";
import { linhasDoTexto, type PreviaDocumento } from "./previa";
import { validarPngDaAssinatura } from "./png";

const mm = (value: number) => (value * 72) / 25.4;
export async function renderizarPrevia(
  documento: PreviaDocumento,
  organizacao: string,
): Promise<Buffer> {
  const imagens = documento.assinaturas.map((s) => validarPngDaAssinatura(s.png));
  return renderToBuffer(
    <Document title={documento.titulo} author={organizacao}>
      {documento.paginas.map((pagina, i) => (
        <Page key={i} size="A4" style={{ padding: mm(15), fontSize: 10 }}>
          <Text style={{ fontSize: 10, color: "#555", marginBottom: 8 }}>{organizacao}</Text>
          <Text style={{ fontSize: 17, marginBottom: 8 }}>{documento.titulo}</Text>
          <Text style={{ marginBottom: 15 }}>Destinatário: {documento.destinatario}</Text>
          <View style={{ height: mm(180) }}>
            {linhasDoTexto(pagina.texto).map((linha, n) => (
              <Text key={n} style={{ lineHeight: 1.35 }}>
                {linha || " "}
              </Text>
            ))}
          </View>
          {documento.assinaturas.flatMap((s, j) =>
            s.pagina === i + 1
              ? [
                  <Image
                    key={`imagem-${j}`}
                    src={imagens[j]}
                    style={{
                      position: "absolute",
                      left: mm(s.x),
                      top: mm(s.y),
                      width: mm(s.largura),
                      height: mm(s.altura),
                      objectFit: "contain",
                    }}
                  />,
                  <Text
                    key={`nome-${j}`}
                    style={{
                      position: "absolute",
                      left: mm(s.x),
                      top: mm(s.y + s.altura + 1),
                      width: mm(s.largura),
                      fontSize: 8,
                    }}
                  >
                    {s.nome}
                  </Text>,
                  <Text
                    key={`cargo-${j}`}
                    style={{
                      position: "absolute",
                      left: mm(s.x),
                      top: mm(s.y + s.altura + 6),
                      width: mm(s.largura),
                      fontSize: 7,
                    }}
                  >
                    {s.qualificacao}
                  </Text>,
                ]
              : [],
          )}
          <Text
            style={{
              position: "absolute",
              bottom: mm(12),
              left: mm(15),
              right: mm(15),
              fontSize: 8,
              color: "#555",
            }}
          >
            PRÉVIA — SEM VALOR FISCAL —{" "}
            {documento.assinaturas.length
              ? "imagens em PNG, sem certificação digital"
              : "sem assinatura"}{" "}
            — página {i + 1}/{documento.paginas.length}
          </Text>
        </Page>
      ))}
    </Document>,
  );
}
