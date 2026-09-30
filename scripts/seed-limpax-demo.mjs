/**
 * Vitrine fictícia do LimpaxCRM. Rode com:
 *   node --env-file=.env.local scripts/seed-limpax-demo.mjs          (plano)
 *   node --env-file=.env.local scripts/seed-limpax-demo.mjs --apply  (grava)
 *
 * Só aceita o Supabase isolado e a organização Limpax. Todas as linhas são
 * marcadas [DEMO], sem identificadores, telefones ou endereços reais.
 * Reexecução completa os registros faltantes sem duplicar os existentes.
 */
import { createClient } from "@supabase/supabase-js";

const PROJECT_URL = "https://bzretxzwnudtpxmoqjyv.supabase.co";
const ORG_ID = "d904bd67-fc0f-4569-b720-fa7700585b90";
const APPLY = process.argv.includes("--apply");
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (process.env.NEXT_PUBLIC_SUPABASE_URL !== PROJECT_URL || !key) {
  throw new Error("Destino recusado: use somente o Supabase isolado do LimpaxCRM.");
}

const client = createClient(PROJECT_URL, key, {
  auth: { autoRefreshToken: false, persistSession: false },
});
const check = (result, label) => {
  if (result.error) throw new Error(`${label}: ${result.error.message}`);
  return result.data;
};

const cases = [
  ["Horizonte Azul Operações", "Camila Nogueira", "Gerente de operações", "Novo contato"],
  ["Ponte Clara Comércio", "Rafael Martins", "Coordenador comercial", "Em andamento"],
  ["Vento Sul Serviços", "Juliana Ribeiro", "Diretora administrativa", "Novo contato"],
  ["Aurora Ponto Distribuição", "Lucas Almeida", "Responsável de compras", "Em andamento"],
  ["Trilha Norte Equipamentos", "Fernanda Costa", "Gerente geral", "Novo contato"],
  ["Rio Sereno Indústria", "Bruno Oliveira", "Analista de operações", "Em andamento"],
  ["Nuvem Branca Varejo", "Mariana Souza", "Sócia", "Novo contato"],
  ["Estação Nova Projetos", "Pedro Lima", "Diretor comercial", "Em andamento"],
  ["Vale Claro Suprimentos", "Beatriz Carvalho", "Supervisora", "Novo contato"],
  ["Atlas Verde Negócios", "Gustavo Rocha", "Gestor de contratos", "Em andamento"],
  ["Portal Leste Tecnologia", "Aline Barbosa", "Coordenadora", "Novo contato"],
  ["Lagoa Serena Soluções", "Diego Ferreira", "Sócio", "Em andamento"],
];

const org = check(
  await client.from("organizations").select("id,display_name").eq("id", ORG_ID).single(),
  "organização",
);
if (!/limpax/i.test(org.display_name ?? "")) {
  throw new Error("Destino recusado: organização não identificada como Limpax.");
}
const pipeline = check(
  await client.from("crm_pipelines").select("id").eq("organization_id", ORG_ID).eq("slug", "teste").single(),
  "funil de demonstração",
);
const stages = check(
  await client.from("crm_stages").select("id,slug").eq("organization_id", ORG_ID).eq("pipeline_id", pipeline.id),
  "etapas",
);
const stageBySlug = Object.fromEntries(stages.map((stage) => [stage.slug, stage.id]));
if (!stageBySlug.novo || !stageBySlug.em_andamento) throw new Error("Etapas de demonstração ausentes.");

const counts = { companies: 0, people: 0, links: 0, contacts: 0, leads: 0, lead_links: 0 };
for (const [business, personName, role, progress] of cases) {
  const tradeName = `[DEMO] ${business}`;
  const fullName = `[DEMO] ${personName}`;
  const title = `[DEMO] ${business} — ${progress}`;
  let company = check(
    await client.from("companies").select("id").eq("organization_id", ORG_ID).eq("trade_name", tradeName).maybeSingle(),
    "buscar empresa",
  );
  let person = check(
    await client.from("people").select("id").eq("organization_id", ORG_ID).eq("full_name", fullName).maybeSingle(),
    "buscar pessoa",
  );
  let contact = check(
    await client.from("contacts").select("id").eq("organization_id", ORG_ID).eq("name", fullName).maybeSingle(),
    "buscar contato",
  );
  let lead = check(
    await client.from("crm_leads").select("id,contact_id").eq("organization_id", ORG_ID).eq("title", title).maybeSingle(),
    "buscar oportunidade",
  );

  if (!company) {
    counts.companies++;
    if (APPLY) company = check(
      await client.from("companies").insert({ organization_id: ORG_ID, trade_name: tradeName, legal_name: tradeName }).select("id").single(),
      "criar empresa",
    );
  }
  if (!person) {
    counts.people++;
    if (APPLY) person = check(
      await client.from("people").insert({ organization_id: ORG_ID, full_name: fullName, notes: "[DEMO] Pessoa fictícia para apresentação." }).select("id").single(),
      "criar pessoa",
    );
  }
  if (!contact) {
    counts.contacts++;
    if (APPLY) contact = check(
      await client.from("contacts").insert({
        organization_id: ORG_ID,
        name: fullName,
        display_name: fullName,
        kind: "person",
        source: "manual",
        source_metadata: { demo: true, source: "limpax_showcase" },
        tags: ["demo"],
      }).select("id").single(),
      "criar contato",
    );
  }
  if (company && person) {
    const link = check(
      await client.from("company_people").select("id").eq("organization_id", ORG_ID).eq("company_id", company.id).eq("person_id", person.id).maybeSingle(),
      "buscar vínculo",
    );
    if (!link) {
      counts.links++;
      if (APPLY) check(
        await client.from("company_people").insert({ organization_id: ORG_ID, company_id: company.id, person_id: person.id, job_title: role, is_decision_maker: true, is_primary: true }).select("id").single(),
        "vincular pessoa",
      );
    }
  } else {
    counts.links++;
  }
  if (!lead) {
    counts.leads++;
    if (APPLY) lead = check(
      await client.from("crm_leads").insert({
        organization_id: ORG_ID,
        pipeline_id: pipeline.id,
        stage_id: progress === "Novo contato" ? stageBySlug.novo : stageBySlug.em_andamento,
        contact_id: contact?.id ?? null,
        title,
        description: "[DEMO] Oportunidade fictícia para apresentação do LimpaxCRM.",
        status: "open",
        source: "manual",
        source_metadata: { demo: true, source: "limpax_showcase" },
      }).select("id,contact_id").single(),
      "criar oportunidade",
    );
  }
  if (lead && !lead.contact_id && contact) {
    counts.lead_links++;
    if (APPLY) check(
      await client.from("crm_leads").update({ contact_id: contact.id }).eq("id", lead.id).eq("organization_id", ORG_ID).select("id").single(),
      "vincular oportunidade ao contato",
    );
  }
}

console.log(`${APPLY ? "Aplicado" : "Plano"}: ${JSON.stringify(counts)}`);
