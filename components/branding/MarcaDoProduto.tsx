import { LOGOTIPO, SIMBOLO } from "@/lib/branding/desenho";
import { cn } from "@/lib/utils";

/** Marca padrão do produto, desenhada inline para preservar o white-label. */
type Props = {
  readonly nome: string;
  readonly className?: string;
  readonly decorativo?: boolean;
};

const SIMBOLO_CLARO_ESCURO = "fill-[#6d28d9] dark:fill-[#a78bfa]";
const NOME_CLARO_ESCURO = "fill-[#111111] dark:fill-[#f5f5f5]";
const SUFIXO_CLARO_ESCURO = "fill-[#2563eb] dark:fill-[#b6ff4d]";

export const CLASSES_DE_COR = {
  simbolo: SIMBOLO_CLARO_ESCURO,
  nome: NOME_CLARO_ESCURO,
  sufixo: SUFIXO_CLARO_ESCURO,
} as const;

function acessibilidade(nome: string, decorativo: boolean) {
  return decorativo ? ({ "aria-hidden": true } as const) : ({ role: "img", "aria-label": nome } as const);
}

export function SimboloDoProduto({ nome, className, decorativo = false }: Props) {
  return (
    <svg viewBox={SIMBOLO.viewBox} className={cn("shrink-0", className)} {...acessibilidade(nome, decorativo)}>
      <rect width="216" height="216" rx="48" className="fill-[#080808]" />
      <path className={SIMBOLO_CLARO_ESCURO} d={SIMBOLO.d} />
      <text x="108" y="128" textAnchor="middle" className="fill-[#f5f5f5]" style={{ font: "700 58px var(--font-atkinson), system-ui, sans-serif" }}>
        !AI
      </text>
      <rect {...SIMBOLO.modulo} className={SUFIXO_CLARO_ESCURO} />
    </svg>
  );
}

export function LogotipoDoProduto({ nome, className, decorativo = false }: Props) {
  return (
    <svg viewBox={LOGOTIPO.viewBox} className={cn("shrink-0", className)} {...acessibilidade(nome, decorativo)}>
      <g transform={LOGOTIPO.simbolo.transform}>
        <rect width="216" height="216" rx="48" className="fill-[#080808]" />
        <path className={SIMBOLO_CLARO_ESCURO} d={SIMBOLO.d} />
        <text x="108" y="128" textAnchor="middle" className="fill-[#f5f5f5]" style={{ font: "700 58px var(--font-atkinson), system-ui, sans-serif" }}>
          !AI
        </text>
        <rect {...LOGOTIPO.simbolo.modulo} className={SUFIXO_CLARO_ESCURO} />
      </g>
      <text x="252" y="104" className={NOME_CLARO_ESCURO} style={{ font: "700 54px var(--font-atkinson), system-ui, sans-serif" }}>
        I Can't Believe
      </text>
      <text x="254" y="158" className={SUFIXO_CLARO_ESCURO} style={{ font: "500 38px var(--font-mono), ui-monospace, monospace" }}>
        CRM
      </text>
    </svg>
  );
}
