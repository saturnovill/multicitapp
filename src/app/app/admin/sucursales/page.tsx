import type { Metadata } from "next";
import { AdminPageHeader } from "@/components/admin-page-header";
import { BranchDirectory } from "@/components/branch-directory";
export const metadata: Metadata = { title: "Sucursales | Superadministración" };
export default function AdminBranchesPage() { return <main className="mx-auto max-w-[1600px] px-5 py-8 sm:px-8"><AdminPageHeader eyebrow="Operación global" title="Sucursales" description="Administra ubicaciones, contactos y horarios generales de todas las empresas." /><BranchDirectory detailBasePath="/app/admin/sucursales" canManage showCompany /></main>; }
