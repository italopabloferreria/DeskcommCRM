"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { CustomerHistory } from "@/components/crm-b2b/customer-history";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useT } from "@/hooks/i18n/useT";

interface Props {
  id: string;
}

export function CompanyDetailClient({ id }: Props) {
  const t = useT();
  const [data, setData] = useState<{
    company: Record<string, unknown>;
    people: Array<Record<string, unknown>>;
    contacts: Array<Record<string, unknown>>;
  } | null>(null);
  const [enriching, setEnriching] = useState(false);
  const [linkOpen, setLinkOpen] = useState(false);
  const [people, setPeople] = useState<Array<{ id: string; full_name: string }>>([]);
  const [selectedPerson, setSelectedPerson] = useState("");
  const [jobTitle, setJobTitle] = useState("");
  const [linking, setLinking] = useState(false);
  const [linkError, setLinkError] = useState("");
  const load = useCallback(async () => {
    const res = await fetch(`/api/v1/companies/${id}`);
    const json = await res.json();
    if (res.ok) setData(json.data);
  }, [id]);

  useEffect(() => {
    void load();
  }, [load]);

  async function enrich() {
    setEnriching(true);
    await fetch(`/api/v1/companies/${id}/enrich`, { method: "POST" });
    setEnriching(false);
    void load();
  }

  async function openLink() {
    setLinkError("");
    setSelectedPerson("");
    setJobTitle("");
    setLinkOpen(true);
    try {
      const res = await fetch("/api/v1/people?limit=100");
      if (!res.ok) throw new Error("people_request_failed");
      const json = await res.json();
      setPeople(Array.isArray(json.data) ? json.data : []);
    } catch {
      setLinkError(t("Não foi possível carregar as pessoas. Tente novamente."));
    }
  }

  async function linkPerson() {
    if (!selectedPerson) return;
    setLinking(true);
    setLinkError("");
    try {
      const res = await fetch("/api/v1/company-people", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ company_id: id, person_id: selectedPerson, job_title: jobTitle || null }),
      });
      if (!res.ok) throw new Error("link_request_failed");
      setLinkOpen(false);
      await load();
    } catch {
      setLinkError(t("Não foi possível vincular a pessoa. Verifique se ela já está vinculada."));
    } finally {
      setLinking(false);
    }
  }

  if (!data) {
    return <div className="p-6 text-muted-foreground">{t("Carregando…")}</div>;
  }

  const c = data.company;

  return (
    <div className="flex flex-col gap-4 p-4 md:p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <Link href="/app/companies" className="text-sm text-muted-foreground hover:underline">
            ← {t("Empresas")}
          </Link>
          <h1 className="text-xl font-semibold">
            {(c.trade_name as string) || (c.legal_name as string) || t("Empresa")}
          </h1>
          <p className="font-mono text-sm text-muted-foreground">{(c.cnpj as string) || "—"}</p>
        </div>
        <Button variant="outline" onClick={() => void enrich()} disabled={enriching}>
          {enriching ? t("Enriquecendo…") : t("Enriquecer CNPJ")}
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card className="space-y-2 p-4">
          <h2 className="font-medium">{t("Dados cadastrais")}</h2>
          <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-sm">
            <dt className="text-muted-foreground">{t("Razão social")}</dt>
            <dd>{(c.legal_name as string) || "—"}</dd>
            <dt className="text-muted-foreground">{t("Situação")}</dt>
            <dd>{(c.registration_status as string) || "—"}</dd>
            <dt className="text-muted-foreground">{t("Porte")}</dt>
            <dd>{(c.company_size as string) || "—"}</dd>
            <dt className="text-muted-foreground">CNAE</dt>
            <dd>
              {[c.main_cnae_code, c.main_cnae_description].filter(Boolean).join(" — ") || "—"}
            </dd>
            <dt className="text-muted-foreground">{t("Endereço")}</dt>
            <dd>
              {[c.street, c.number, c.district, c.city, c.state, c.zip_code]
                .filter(Boolean)
                .join(", ") || "—"}
            </dd>
            <dt className="text-muted-foreground">{t("Enriquecimento")}</dt>
            <dd>
              {(c.enrichment_status as string) || "—"}
              {c.enrichment_error ? ` — ${c.enrichment_error}` : ""}
            </dd>
          </dl>
        </Card>

        <Card className="space-y-2 p-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="font-medium">{t("Pessoas / decisores")}</h2>
            <Button variant="outline" size="sm" onClick={() => void openLink()}>
              {t("Vincular pessoa")}
            </Button>
          </div>
          {data.people.length === 0 ? (
            <p className="text-sm text-muted-foreground">{t("Nenhuma pessoa vinculada.")}</p>
          ) : (
            <ul className="space-y-2 text-sm">
              {data.people.map((p) => {
                const person = p.people as { id: string; full_name: string; email?: string } | null;
                return (
                  <li key={p.id as string} className="flex justify-between gap-2 border-b pb-2">
                    <div>
                      {person ? (
                        <Link className="font-medium hover:underline" href={`/app/people/${person.id}`}>
                          {person.full_name}
                        </Link>
                      ) : (
                        "—"
                      )}
                      <div className="text-muted-foreground">{(p.job_title as string) || ""}</div>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </Card>

        <Card className="space-y-2 p-4 md:col-span-2">
          <h2 className="font-medium">{t("Telefones")}</h2>
          {data.contacts.length === 0 ? (
            <p className="text-sm text-muted-foreground">{t("Nenhum telefone ligado às pessoas desta empresa.")}</p>
          ) : (
            <ul className="grid gap-2 sm:grid-cols-2 text-sm">
              {data.contacts.map((ct) => (
                <li key={ct.id as string} className="rounded-md border px-3 py-2">
                  <Link href={`/app/contacts/${ct.id}`} className="font-mono hover:underline">
                    {(ct.phone_number as string) || "—"}
                  </Link>
                  <div className="text-muted-foreground">
                    {(ct.display_name as string) || (ct.name as string) || ""}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Card>

      </div>
      <Dialog open={linkOpen} onOpenChange={setLinkOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("Vincular pessoa à empresa")}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-3">
            <div className="grid gap-1.5">
              <Label htmlFor="company-person-select">{t("Pessoa")}</Label>
              <select
                id="company-person-select"
                className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring"
                value={selectedPerson}
                onChange={(event) => setSelectedPerson(event.target.value)}
              >
                <option value="">{t("Selecione uma pessoa")}</option>
                {people
                  .filter((person) => !data.people.some((link) => (link.people as { id?: string } | null)?.id === person.id))
                  .map((person) => (
                    <option key={person.id} value={person.id}>{person.full_name}</option>
                  ))}
              </select>
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="company-person-job">{t("Cargo (opcional)")}</Label>
              <Input id="company-person-job" value={jobTitle} maxLength={200} onChange={(event) => setJobTitle(event.target.value)} />
            </div>
            {linkError && <p role="alert" className="text-sm text-destructive">{linkError}</p>}
            <Link href="/app/people" className="text-sm underline underline-offset-2">
              {t("Cadastrar nova pessoa")}
            </Link>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setLinkOpen(false)}>{t("Cancelar")}</Button>
            <Button disabled={!selectedPerson || linking} onClick={() => void linkPerson()}>
              {linking ? t("Vinculando…") : t("Vincular")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <CustomerHistory key={id} kind="company" id={id} onChanged={() => void load()} />
    </div>
  );
}
