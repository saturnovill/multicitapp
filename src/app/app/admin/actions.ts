"use server";

import { randomUUID } from "node:crypto";
import { and, asc, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod";

import { getDb } from "@/db";
import {
  appUsers,
  auditLogs,
  branches,
  companies,
  companyMemberships,
  employeeBranches,
  employees,
} from "@/db/schema";
import { auth } from "@/lib/auth/server";
import { requirePlatformAdmin } from "@/lib/platform-admin";

export type AdminActionState = {
  status: "idle" | "success" | "error";
  message?: string;
};

const companySchema = z.object({
  companyName: z.string().trim().min(2).max(160),
  branchName: z.string().trim().min(2).max(160),
  timezone: z.string().trim().min(3).max(80),
});

const userSchema = z.object({
  name: z.string().trim().min(2).max(160),
  email: z.email().trim().toLowerCase(),
  password: z.string().min(12).max(128),
  companyId: z.uuid(),
  role: z.enum(["owner", "admin", "manager", "receptionist", "employee"]),
});

const passwordSchema = z
  .object({
    password: z.string().min(12).max(128),
    confirmation: z.string(),
  })
  .refine((values) => values.password === values.confirmation, {
    message: "Las contraseñas no coinciden",
    path: ["confirmation"],
  });
const accessSchema = z.object({ appUserId: z.uuid(), membershipId: z.uuid(), role: z.enum(["owner", "admin", "manager", "receptionist", "employee"]), status: z.enum(["active", "suspended"]) });
const resetPasswordSchema = z.object({ appUserId: z.uuid(), password: z.string().min(12).max(128) });

function toSlug(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
    .slice(0, 72);
}

function invalid(message = "Revisa los datos del formulario"): AdminActionState {
  return { status: "error", message };
}

export async function createCompanyAction(
  _previousState: AdminActionState,
  formData: FormData,
): Promise<AdminActionState> {
  try {
    const admin = await requirePlatformAdmin();
    const parsed = companySchema.safeParse({
      companyName: formData.get("companyName"),
      branchName: formData.get("branchName"),
      timezone: formData.get("timezone"),
    });

    if (!parsed.success) return invalid();

    const companyId = randomUUID();
    const branchId = randomUUID();
    const suffix = companyId.slice(0, 6);
    const db = getDb();

    await db.batch([
      db.insert(companies).values({
        id: companyId,
        name: parsed.data.companyName,
        slug: `${toSlug(parsed.data.companyName) || "empresa"}-${suffix}`,
        timezone: parsed.data.timezone,
      }),
      db.insert(branches).values({
        id: branchId,
        companyId,
        name: parsed.data.branchName,
        slug: toSlug(parsed.data.branchName) || "principal",
        timezone: parsed.data.timezone,
      }),
      db.insert(auditLogs).values({
        companyId,
        actorUserId: admin.appUser.id,
        action: "platform.company.created",
        entityType: "company",
        entityId: companyId,
        metadata: { source: "platform_admin" },
      }),
    ]);

    revalidatePath("/app/admin", "layout");
    return { status: "success", message: "Empresa y sucursal creadas" };
  } catch (error) {
    console.error("[admin:create-company] failed", { error: String(error) });
    return invalid("No fue posible crear la empresa");
  }
}

export async function createUserAction(
  _previousState: AdminActionState,
  formData: FormData,
): Promise<AdminActionState> {
  try {
    const admin = await requirePlatformAdmin();
    const parsed = userSchema.safeParse({
      name: formData.get("name"),
      email: formData.get("email"),
      password: formData.get("password"),
      companyId: formData.get("companyId"),
      role: formData.get("role"),
    });

    if (!parsed.success) return invalid();

    const db = getDb();
    const [company] = await db
      .select({ id: companies.id })
      .from(companies)
      .where(eq(companies.id, parsed.data.companyId))
      .limit(1);
    if (!company) return invalid("La empresa seleccionada no existe");

    const [branch] = await db
      .select({ id: branches.id })
      .from(branches)
      .where(eq(branches.companyId, company.id))
      .orderBy(asc(branches.createdAt))
      .limit(1);
    if (!branch) return invalid("La empresa necesita al menos una sucursal");

    const authResult = await auth.admin.createUser({
      name: parsed.data.name,
      email: parsed.data.email,
      password: parsed.data.password,
      role: "user",
    });

    if (authResult.error || !authResult.data?.user) {
      return invalid(
        authResult.error?.message ?? "Neon Auth no pudo crear el usuario",
      );
    }

    const authUser = authResult.data.user;
    const appUserId = randomUUID();
    const membershipId = randomUUID();
    const employeeId = randomUUID();
    const queries = [
      db.insert(appUsers).values({
        id: appUserId,
        authUserId: authUser.id,
        name: parsed.data.name,
        email: parsed.data.email,
        avatarUrl: authUser.image,
      }),
      db.insert(companyMemberships).values({
        id: membershipId,
        companyId: company.id,
        userId: appUserId,
        role: parsed.data.role,
      }),
      ...(parsed.data.role === "employee"
        ? [
            db.insert(employees).values({
              id: employeeId,
              companyId: company.id,
              userId: appUserId,
              name: parsed.data.name,
              email: parsed.data.email,
            }),
            db.insert(employeeBranches).values({
              companyId: company.id,
              employeeId,
              branchId: branch.id,
              isPrimary: true,
            }),
          ]
        : []),
      db.insert(auditLogs).values({
        companyId: company.id,
        actorUserId: admin.appUser.id,
        action: "platform.user.created",
        entityType: "app_user",
        entityId: appUserId,
        metadata: { role: parsed.data.role },
      }),
    ];

    try {
      await db.batch(queries as [typeof queries[number], ...typeof queries]);
    } catch (error) {
      await auth.admin.removeUser({ userId: authUser.id }).catch(() => undefined);
      throw error;
    }

    revalidatePath("/app/admin", "layout");
    return { status: "success", message: "Usuario creado y asignado" };
  } catch (error) {
    console.error("[admin:create-user] failed", { error: String(error) });
    return invalid("No fue posible crear el usuario");
  }
}

export async function changeAdminPasswordAction(
  _previousState: AdminActionState,
  formData: FormData,
): Promise<AdminActionState> {
  try {
    const admin = await requirePlatformAdmin();
    const parsed = passwordSchema.safeParse({
      password: formData.get("password"),
      confirmation: formData.get("confirmation"),
    });

    if (!parsed.success) {
      return invalid(parsed.error.issues[0]?.message);
    }

    const result = await auth.admin.setUserPassword({
      userId: admin.session.user.id,
      newPassword: parsed.data.password,
    });
    if (result.error) return invalid(result.error.message);

    return { status: "success", message: "Contraseña actualizada" };
  } catch (error) {
    console.error("[admin:change-password] failed", { error: String(error) });
    return invalid("No fue posible cambiar la contraseña");
  }
}

export async function updateUserAccessAction(_state: AdminActionState, formData: FormData): Promise<AdminActionState> {
  try {
    const admin = await requirePlatformAdmin();
    const parsed = accessSchema.safeParse({ appUserId: formData.get("appUserId"), membershipId: formData.get("membershipId"), role: formData.get("role"), status: formData.get("status") });
    if (!parsed.success) return invalid("Revisa el rol y estado seleccionados");
    if (parsed.data.appUserId === admin.appUser.id) return invalid("No puedes modificar tu propio acceso de superadministrador");
    const db = getDb();
    const [membership] = await db.select({ id: companyMemberships.id, companyId: companyMemberships.companyId }).from(companyMemberships).where(and(eq(companyMemberships.id, parsed.data.membershipId), eq(companyMemberships.userId, parsed.data.appUserId))).limit(1);
    if (!membership) return invalid("La asignación ya no existe");
    await db.batch([
      db.update(companyMemberships).set({ role: parsed.data.role, status: parsed.data.status, updatedAt: new Date() }).where(eq(companyMemberships.id, membership.id)),
      db.update(appUsers).set({ isActive: parsed.data.status === "active", updatedAt: new Date() }).where(eq(appUsers.id, parsed.data.appUserId)),
      db.insert(auditLogs).values({ companyId: membership.companyId, actorUserId: admin.appUser.id, action: "platform.user.access_updated", entityType: "app_user", entityId: parsed.data.appUserId, metadata: { role: parsed.data.role, status: parsed.data.status } }),
    ]);
    revalidatePath("/app/admin/usuarios");
    return { status: "success", message: "Acceso actualizado" };
  } catch (error) { console.error("[admin:update-user-access] failed", { error: String(error) }); return invalid("No fue posible actualizar el acceso"); }
}

export async function resetUserPasswordAction(_state: AdminActionState, formData: FormData): Promise<AdminActionState> {
  try {
    const admin = await requirePlatformAdmin();
    const parsed = resetPasswordSchema.safeParse({ appUserId: formData.get("appUserId"), password: formData.get("password") });
    if (!parsed.success) return invalid("La contraseña debe tener al menos 12 caracteres");
    if (parsed.data.appUserId === admin.appUser.id) return invalid("Cambia tu contraseña desde la sección Seguridad");
    const db = getDb();
    const [target] = await db.select({ authUserId: appUsers.authUserId }).from(appUsers).where(eq(appUsers.id, parsed.data.appUserId)).limit(1);
    if (!target) return invalid("El usuario ya no existe");
    const result = await auth.admin.setUserPassword({ userId: target.authUserId, newPassword: parsed.data.password });
    if (result.error) return invalid(result.error.message);
    const [membership] = await db.select({ companyId: companyMemberships.companyId }).from(companyMemberships).where(eq(companyMemberships.userId, parsed.data.appUserId)).limit(1);
    if (membership) await db.insert(auditLogs).values({ companyId: membership.companyId, actorUserId: admin.appUser.id, action: "platform.user.password_reset", entityType: "app_user", entityId: parsed.data.appUserId, metadata: { source: "platform_admin" } });
    return { status: "success", message: "Contraseña restablecida" };
  } catch (error) { console.error("[admin:reset-user-password] failed", { error: String(error) }); return invalid("No fue posible restablecer la contraseña"); }
}
