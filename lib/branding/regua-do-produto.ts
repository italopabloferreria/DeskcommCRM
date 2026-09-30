/**
 * Régua congelada do design system !AI.
 *
 * Mantém em runtime a mesma paleta declarada em app/globals.css, inclusive na
 * imagem standalone de produção onde o CSS fonte não existe no contêiner.
 */

import type { Regua } from "./contraste";

export const REGUA_DO_PRODUTO: Regua = {
  rampaDoProduto: [
    "#f5f3ff",
    "#ede9fe",
    "#ddd6fe",
    "#c4b5fd",
    "#a78bfa",
    "#8b5cf6",
    "#6d28d9",
    "#5b21b6",
    "#4c1d95",
    "#2e1065",
    "#180832",
  ],
  claro: {
    nome: "claro",
    base: [
      { chave: "--color-bg", hex: "#f8fafc" },
      { chave: "--color-surface", hex: "#ffffff" },
      { chave: "--color-surface-elevated", hex: "#eef2ff" },
    ],
    tingidas: [{ chave: "--color-accent-soft", fonte: { tipo: "grau", indice: 1, alfa: 1 } }],
    papeis: [
      { token: "--color-accent", tipo: "componente", fonte: { tipo: "grau", indice: 6, alfa: 1 }, contra: null },
      { token: "--color-accent-fg", tipo: "texto", fonte: { tipo: "frenteCalculada", sobre: { tipo: "grau", indice: 6, alfa: 1 } }, contra: [{ tipo: "grau", indice: 6, alfa: 1 }] },
      { token: "--color-accent-hover", tipo: "componente", fonte: { tipo: "grau", indice: 7, alfa: 1 }, contra: null },
      { token: "--ring", tipo: "componente", fonte: { tipo: "grau", indice: 5, alfa: 1 }, contra: null },
      { token: "::selection/color", tipo: "texto", fonte: { tipo: "grau", indice: 10, alfa: 1 }, contra: [{ tipo: "grau", indice: 2, alfa: 1 }] },
      { token: ":focus-visible/outline", tipo: "componente", fonte: { tipo: "grau", indice: 5, alfa: 1 }, contra: null },
    ],
    semanticas: [
      { nome: "success", hex: "#5a8a5f" },
      { nome: "warning", hex: "#b07a2b" },
      { nome: "error", hex: "#a94a3c" },
      { nome: "info", hex: "#4a7a93" },
    ],
    neutros: ["#f5f5f5", "#e5e7eb", "#d1d5db", "#9ca3af", "#6b7280", "#4b5563", "#374151", "#1f2937", "#1b1b1b", "#111111", "#080808"],
    indices: { accent: 6, hover: 7, soft: 1 },
    alfaDoSoft: 1,
  },
  escuro: {
    nome: "escuro",
    base: [
      { chave: "--color-bg", hex: "#080808" },
      { chave: "--color-surface", hex: "#111111" },
      { chave: "--color-surface-elevated", hex: "#1b1b1b" },
    ],
    tingidas: [{ chave: "--color-accent-soft", fonte: { tipo: "literal", hex: "#a78bfa", alfa: 0.18 } }],
    papeis: [
      { token: "--color-accent", tipo: "componente", fonte: { tipo: "grau", indice: 4, alfa: 1 }, contra: null },
      { token: "--color-accent-fg", tipo: "texto", fonte: { tipo: "frenteCalculada", sobre: { tipo: "grau", indice: 4, alfa: 1 } }, contra: [{ tipo: "grau", indice: 4, alfa: 1 }] },
      { token: "--color-accent-hover", tipo: "componente", fonte: { tipo: "grau", indice: 3, alfa: 1 }, contra: null },
      { token: "--ring", tipo: "componente", fonte: { tipo: "grau", indice: 4, alfa: 1 }, contra: null },
      { token: '[data-theme="dark"] ::selection/color', tipo: "texto", fonte: { tipo: "grau", indice: 0, alfa: 1 }, contra: [{ tipo: "grau", indice: 7, alfa: 1 }] },
      { token: '[data-theme="dark"] :focus-visible/outline-color', tipo: "componente", fonte: { tipo: "grau", indice: 4, alfa: 1 }, contra: null },
    ],
    semanticas: [
      { nome: "success", hex: "#b6ff4d" },
      { nome: "warning", hex: "#d09455" },
      { nome: "error", hex: "#c87263" },
      { nome: "info", hex: "#60a5fa" },
    ],
    neutros: ["#f5f5f5", "#e5e7eb", "#c7d2fe", "#94a3b8", "#64748b", "#475569", "#3b3b4a", "#2b2b35", "#1b1b1b", "#111111", "#080808"],
    indices: { accent: 4, hover: 3, soft: null },
    alfaDoSoft: 0.18,
  },
} as const;
