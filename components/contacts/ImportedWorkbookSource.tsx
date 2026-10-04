"use client";

import Link from "next/link";
import { Card } from "@/components/ui/card";
import { useT } from "@/hooks/i18n/useT";

interface Props {
  metadata: Record<string, unknown> | null | undefined;
  isAnonymized: boolean;
}

function text(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value : null;
}

/** Read only: the original workbook values remain separate from edited contact fields. */
export function ImportedWorkbookSource({ metadata, isAnonymized }: Props) {
  const t = useT();
  const origin = metadata?.workbook_origin;
  if (isAnonymized || !origin || typeof origin !== "object" || Array.isArray(origin)) return null;
  const source = origin as Record<string, unknown>;
  const sheet = text(source.sheet);
  const row =
    typeof source.row === "number" && Number.isSafeInteger(source.row) && source.row > 0
      ? source.row
      : null;
  if (!sheet || !row) return null;
  const address = text(metadata?.address_original);
  const phone = text(metadata?.phone_original);
  const legacyId = text(metadata?.legacy_id);
  const batch = text(metadata?.import_batch_id);
  const batchId =
    batch &&
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(batch)
      ? batch
      : null;

  return (
    <Card className="mt-4 space-y-3 p-4">
      <h2 className="font-semibold">{t("Dados da planilha original")}</h2>
      <dl className="grid gap-4 text-sm sm:grid-cols-2">
        {address && (
          <div>
            <dt className="text-muted-foreground">{t("Endereço original")}</dt>
            <dd className="break-words whitespace-pre-wrap">{address}</dd>
          </div>
        )}
        {phone && (
          <div>
            <dt className="text-muted-foreground">{t("Telefone original")}</dt>
            <dd className="break-words whitespace-pre-wrap">{phone}</dd>
          </div>
        )}
        {legacyId && (
          <div>
            <dt className="text-muted-foreground">{t("Código na planilha")}</dt>
            <dd className="break-words">{legacyId}</dd>
          </div>
        )}
        <div>
          <dt className="text-muted-foreground">{t("Origem na planilha")}</dt>
          <dd className="break-words">
            {sheet} · {t("Linha")} {row}
          </dd>
        </div>
      </dl>
      {metadata?.phone_requires_review === true && (
        <p className="rounded-md border p-3 text-sm text-muted-foreground">
          {t(
            "Telefone pendente de revisão. Confira o número original antes de cadastrar um telefone para este contato.",
          )}
        </p>
      )}
      {batchId && (
        <Link
          href={`/app/imports/${batchId}`}
          className="inline-block text-sm underline underline-offset-4 focus-visible:outline-2 focus-visible:outline-offset-4"
        >
          {t("Ver lote da importação")}
        </Link>
      )}
    </Card>
  );
}
