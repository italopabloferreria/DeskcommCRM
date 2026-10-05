"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import type { reviewImportedIdentities } from "@/lib/crm-b2b/identity-review";

type Review = ReturnType<typeof reviewImportedIdentities> & { complete: boolean };
export default function IdentityReviewPage() {
  const [data, setData] = useState<Review | null>(null);
  const [error, setError] = useState("");
  const [limit, setLimit] = useState(20);
  useEffect(() => {
    const controller = new AbortController();
    void fetch("/api/v1/imports/identity-review", { signal: controller.signal })
      .then(async (response) => {
        const json = await response.json();
        if (!response.ok) throw new Error(json.error?.message ?? "Falha ao revisar base.");
        if (!controller.signal.aborted) setData(json.data);
      })
      .catch((error) => {
        if (!controller.signal.aborted)
          setError(error instanceof Error ? error.message : "Falha ao revisar base.");
      });
    return () => controller.abort();
  }, []);
  return (
    <main className="mx-auto max-w-5xl space-y-4 p-6">
      <Link href="/app/imports" className="underline">
        Voltar às importações
      </Link>
      <h1 className="text-2xl font-semibold">Revisão de identidades da planilha</h1>
      <p>
        Registros com o mesmo nome, endereço e telefone original. São candidatos à revisão:
        atendimentos diferentes continuam preservados. Nenhum contato é unido automaticamente.
      </p>
      {error && <p role="alert">{error}</p>}
      {!data && !error && <p role="status">Conferindo os contatos importados…</p>}
      {data && (
        <>
          <p role="status">
            {data.reviewed} contatos conferidos · {data.groups.length} grupos para revisão
          </p>
          {!data.complete && (
            <p role="alert">
              A revisão atingiu o limite de 10.000 contatos. O resultado é parcial.
            </p>
          )}
          {data.groups.slice(0, limit).map((group) => (
            <Card key={group.key} className="space-y-2 p-4">
              <h2 className="font-semibold">
                {group.contacts[0]!.name} · {group.contacts.length} registros
              </h2>
              <p>{group.contacts[0]!.address}</p>
              <ul className="space-y-2">
                {group.contacts.map((contact) => (
                  <li key={contact.id}>
                    <Link href={`/app/contacts/${contact.id}`} className="underline">
                      {contact.sheet}, linha {contact.row}
                    </Link>
                    {" · "}
                    {contact.phone}
                  </li>
                ))}
              </ul>
            </Card>
          ))}
          {limit < data.groups.length && (
            <Button onClick={() => setLimit((value) => value + 20)}>Mostrar mais grupos</Button>
          )}
          {!data.groups.length && <p>Nenhum grupo com os três campos coincidentes encontrado.</p>}
        </>
      )}
    </main>
  );
}
