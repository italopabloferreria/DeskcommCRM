"use client";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { apiClient } from "@/lib/api/client";
import { useT } from "@/hooks/i18n/useT";
import type { savedWorkbookRow } from "@/lib/crm-b2b/saved-workbook-row";

export function WorkbookContactHistory({ contactId }: { contactId: string }) {
  const t = useT();
  const [offset, setOffset] = useState(0);
  const query = useQuery({
    queryKey: ["contact-workbook", contactId, offset],
    queryFn: () =>
      apiClient.get<{
        data: {
          rows: { id: string; batch_id: string; source: ReturnType<typeof savedWorkbookRow> }[];
          next_offset: number | null;
        };
      }>(`/api/v1/contacts/${contactId}/workbook?offset=${offset}`),
  });
  if (query.isPending) return <p role="status">{t("Carregando…")}</p>;
  if (query.isError)
    return (
      <div role="alert">
        <p>{t("Não foi possível carregar o histórico da planilha.")}</p>
        <Button onClick={() => void query.refetch()}>{t("Tentar novamente")}</Button>
      </div>
    );
  const data = query.data.data;
  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        {t(
          "Registros originais vinculados a este contato. Valores não confirmam pagamento; datas e observações mantêm o conteúdo da planilha.",
        )}
      </p>
      {!data.rows.length && <p>{t("Nenhum registro de planilha vinculado a este contato.")}</p>}
      {data.rows.map((row) => (
        <Card key={row.id} className="space-y-3 p-4">
          <Link className="underline focus-visible:outline-2" href={`/app/imports/${row.batch_id}`}>
            {row.source?.sheet ?? t("Importação")} · {t("linha")} {row.source?.row ?? "—"}
          </Link>
          <dl className="grid gap-3 sm:grid-cols-2">
            {row.source?.fields.map((field) => (
              <div key={field.coordinate}>
                <dt className="text-xs text-muted-foreground">{field.label}</dt>
                <dd className="break-words whitespace-pre-wrap">{field.value}</dd>
              </div>
            ))}
          </dl>
        </Card>
      ))}
      <div className="flex gap-2">
        <Button disabled={offset === 0} onClick={() => setOffset(Math.max(0, offset - 50))}>
          {t("Página anterior")}
        </Button>
        <Button disabled={data.next_offset === null} onClick={() => setOffset(data.next_offset!)}>
          {t("Próxima página")}
        </Button>
      </div>
    </div>
  );
}
