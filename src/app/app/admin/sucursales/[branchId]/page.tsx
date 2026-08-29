import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { z } from "zod";
import { BranchDetail } from "@/components/branch-detail";
export const metadata: Metadata = { title: "Sucursal | Superadministración" };
export default async function AdminBranchPage({ params }: { params: Promise<{ branchId: string }> }) { const { branchId } = await params; if (!z.uuid().safeParse(branchId).success) notFound(); return <BranchDetail branchId={branchId} backHref="/app/admin/sucursales" canManage />; }
