/** Real Storage acceptance: synthetic objects only, cleanup, no auth user/schema creation. */
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { readFileSync, writeFileSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";
import pg from "pg";
import {
  BUCKET_DOCUMENTOS,
  caminhoModelo,
  salvarModelo,
  lerModelo,
  listarModelos,
} from "../lib/documentos/acervo";
import { modeloSchema, type ModeloDocumento } from "../lib/documentos/modelos";

async function main() {
  const project = process.env.DOCUMENT_STORAGE_PROJECT;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (
    !process.argv.includes("--execute-synthetic") ||
    !project ||
    url !== `https://${project}.supabase.co`
  )
    throw new Error("Explicit synthetic execution and matching project are required.");
  const databaseUrl = new URL(process.env.DATABASE_URL!);
  assert.equal(decodeURIComponent(databaseUrl.username), `postgres.${project}`);
  databaseUrl.password = process.env.DOCUMENT_STORAGE_DB_PASSWORD!;
  const db = new pg.Client({
    connectionString: databaseUrl.toString(),
    ssl: {
      ca: readFileSync(process.env.DOCUMENT_STORAGE_DB_CA!, "utf8"),
      rejectUnauthorized: true,
    },
    connectionTimeoutMillis: 10000,
    statement_timeout: 10000,
  });
  const options = { auth: { persistSession: false, autoRefreshToken: false } };
  const admin = createClient(url, process.env.SUPABASE_SERVICE_ROLE_KEY!, options);
  const anon = createClient(url, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, options);
  const modeloId = randomUUID();
  let org: string | null = null;
  let stage = "preflight";
  const cleanup = new Set<string>();
  const proof: Record<string, unknown> = {
    project,
    syntheticOnly: true,
    testedAt: new Date().toISOString(),
  };
  try {
    await db.connect();
    const { rows } = await db.query(
      "select uo.organization_id, uo.user_id from public.user_organizations uo join auth.users u on u.id=uo.user_id where u.email=$1 and uo.role='admin' and uo.revoked_at is null",
      [process.env.DOCUMENT_STORAGE_OWNER_EMAIL],
    );
    assert.equal(rows.length, 1, "An unambiguous active administrator is required.");
    org = String(rows[0].organization_id);
    const rls = await db.query(
      "select relrowsecurity from pg_class where oid='storage.objects'::regclass",
    );
    assert.equal(rls.rows[0].relrowsecurity, true);
    const policies = await db.query(
      "select policyname, permissive, cmd, qual, with_check from pg_policies where schemaname='storage' and tablename='objects'",
    );
    // Existing permissive rules must all name another bucket; never assume a private flag alone is sufficient.
    for (const policy of policies.rows.filter((p) => p.permissive === "PERMISSIVE")) {
      const predicates = `${policy.qual ?? ""} ${policy.with_check ?? ""}`;
      assert.match(
        predicates,
        /bucket_id\s*=\s*'(?:propostas|skill-assets|ai-policy|lgpd-exports)'/,
      );
      assert.ok(!predicates.includes(BUCKET_DOCUMENTOS));
    }
    proof.existingStoragePoliciesChecked = policies.rows.length;
    const png =
      "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAIAAAABCAYAAAD0In+KAAAAC0lEQVR4nGNggAIAAAkAAftSuKkAAAAASUVORK5CYII=";
    const assinatura = {
      tipo: "assinatura" as const,
      nome: "Emissor fictício",
      qualificacao: "TESTE",
      png,
      pagina: 1,
      x: 120,
      y: 235,
      largura: 65,
      altura: 20,
    };
    const modelo: ModeloDocumento = {
      id: modeloId,
      nome: "[TESTE TEMPORÁRIO] Contrato fictício",
      origem: null,
      documento: {
        titulo: "Contrato fictício",
        destinatario: "{{cliente.nome}}",
        paginas: [{ texto: "Teste sintético. Cliente: {{cliente.nome}}" }],
        assinaturas: [assinatura, { ...assinatura, tipo: "carimbo", x: 20 }],
      },
    };
    stage = "save_read_replay";
    // Register expected paths before uploads, including failed/ambiguous requests.
    const { createHash } = await import("node:crypto");
    const track = (m: ModeloDocumento) =>
      cleanup.add(
        caminhoModelo(
          org!,
          m.id,
          createHash("sha256")
            .update(JSON.stringify(modeloSchema.parse(m)))
            .digest("hex"),
        ),
      );
    track(modelo);
    const saved = await salvarModelo(admin, org, modelo, String(rows[0].user_id));
    const path = caminhoModelo(org, modelo.id, saved.versao);
    cleanup.add(path);
    assert.equal(saved.repetido, false);
    assert.deepEqual(await lerModelo(admin, org, modelo.id, saved.versao), modelo);
    assert.equal((await salvarModelo(admin, org, modelo, String(rows[0].user_id))).repetido, true);
    const listado = await listarModelos(admin, org);
    assert.ok(listado.modelos.some((m) => m.id === modeloId && m.nome === modelo.nome));
    const revisado = { ...modelo, nome: "[TESTE TEMPORÁRIO] Versão revisada" };
    track(revisado);
    const segunda = await salvarModelo(admin, org, revisado, String(rows[0].user_id));
    cleanup.add(caminhoModelo(org, modelo.id, segunda.versao));
    assert.notEqual(segunda.versao, saved.versao);
    assert.deepEqual(await lerModelo(admin, org, modelo.id, saved.versao), modelo);
    proof.pngRoundTrip = true;
    proof.immutableVersions = true;
    proof.replayIdempotent = true;
    proof.catalogNameVerified = true;
    stage = "isolation";
    await assert.rejects(lerModelo(admin, randomUUID(), modeloId, saved.versao));
    assert.ok((await anon.storage.from(BUCKET_DOCUMENTOS).download(path)).error);
    const attempt = `${org}/modelos/${modeloId}-anonymous-probe.json`;
    cleanup.add(attempt);
    assert.ok(
      (
        await anon.storage
          .from(BUCKET_DOCUMENTOS)
          .upload(attempt, Buffer.from("{}"), { contentType: "application/json" })
      ).error,
    );
    const publicResponse = await fetch(
      `${url}/storage/v1/object/public/${BUCKET_DOCUMENTOS}/${path}`,
    );
    assert.ok(!publicResponse.ok);
    await db.query("BEGIN");
    try {
      await db.query("select set_config('request.jwt.claims',$1,true)", [
        JSON.stringify({ sub: rows[0].user_id, role: "authenticated" }),
      ]);
      await db.query("SET LOCAL ROLE authenticated");
      const visible = await db.query(
        "select count(*)::integer as n from storage.objects where bucket_id=$1 and name=$2",
        [BUCKET_DOCUMENTOS, path],
      );
      assert.equal(visible.rows[0].n, 0);
    } finally {
      await db.query("ROLLBACK");
    }
    proof.crossOrganizationDenied = true;
    proof.anonymousReadWriteDenied = true;
    proof.publicDownloadDenied = true;
    proof.authenticatedDirectSqlReadDenied = true;
    proof.authenticatedHttpAcceptance =
      "Still pending: no new identity/session created by this script.";
    proof.privateBucket = (await admin.storage.getBucket(BUCKET_DOCUMENTOS)).data?.public === false;
    assert.equal(proof.privateBucket, true);
    proof.ok = true;
  } catch (error) {
    proof.ok = false;
    proof.failedStage = stage;
    proof.errorCode =
      error instanceof Error && "code" in error ? String(error.code) : "verification_failed";
    process.exitCode = 1;
  } finally {
    if (org && cleanup.size) {
      const paths = [...cleanup];
      assert.ok(
        paths.every((p) => p.startsWith(`${org}/modelos/${modeloId}-`)),
        "Cleanup must stay inside this synthetic model.",
      );
      const removed = await admin.storage.from(BUCKET_DOCUMENTOS).remove(paths);
      proof.cleanup = !removed.error;
      if (removed.error) process.exitCode = 1;
      const remaining = await db.query(
        "select count(*)::integer as n from storage.objects where bucket_id=$1 and name like $2",
        [BUCKET_DOCUMENTOS, `${org}/modelos/${modeloId}-%`],
      );
      proof.cleanupRemainingObjects = remaining.rows[0].n;
      if (remaining.rows[0].n !== 0) {
        proof.cleanup = false;
        process.exitCode = 1;
      }
    }
    await db.end();
    if (process.env.DOCUMENT_STORAGE_RECEIPT)
      writeFileSync(process.env.DOCUMENT_STORAGE_RECEIPT, JSON.stringify(proof, null, 2) + "\n");
    console.info(JSON.stringify(proof));
  }
}
void main().catch(() => {
  console.error("Document storage verification could not start or clean up.");
  process.exitCode = 1;
});
