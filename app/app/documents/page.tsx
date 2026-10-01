import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { requireAuth, resolveActiveOrg } from "@/lib/auth/server";
import { roleAtLeast } from "@/lib/auth/types";
import { DocumentsClient } from "./_client";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Documentos" };
export default async function DocumentsPage() {
  const user = await requireAuth();
  const org = await resolveActiveOrg(user);
  if (!org || !roleAtLeast(org.role, "agent")) redirect("/app");
  return <DocumentsClient key={org.orgId} podeUsarPng={roleAtLeast(org.role, "admin")} />;
}
