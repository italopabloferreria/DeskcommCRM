/**
 * Desenho da marca do produto !AI para o fork I Can't Believe CRM.
 *
 * A geometria fica em TypeScript para continuar respeitando o white-label: ela
 * só aparece quando a instalação usa a marca padrão do produto.
 */

export const SIMBOLO = {
  viewBox: "0 0 216 216",
  transform: "",
  d: "M108 14 194 64v88l-86 50-86-50V64l86-50Z",
  modulo: { x: 88, y: 150, width: 40, height: 12, rx: 6 },
} as const;

export const LOGOTIPO = {
  viewBox: "0 0 760 216",
  proporcao: 760 / 216,
  simbolo: { transform: "translate(0 0)", d: SIMBOLO.d, modulo: SIMBOLO.modulo },
} as const;

/** Cores do produto, copiadas da paleta !AI em app/globals.css. */
export const CORES_DA_MARCA = {
  claro: { simbolo: "#6d28d9", nome: "#111111", sufixo: "#2563eb" },
  escuro: { simbolo: "#a78bfa", nome: "#f5f5f5", sufixo: "#b6ff4d" },
} as const;
