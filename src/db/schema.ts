import { sql } from "drizzle-orm";
import {
  boolean,
  check,
  foreignKey,
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  smallint,
  text,
  timestamp,
  unique,
  uniqueIndex,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";

const timestamps = {
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
};

export const companyStatusEnum = pgEnum("company_status", [
  "active",
  "suspended",
  "archived",
]);

export const platformRoleEnum = pgEnum("platform_role", [
  "user",
  "platform_admin",
]);

export const membershipRoleEnum = pgEnum("membership_role", [
  "owner",
  "admin",
  "manager",
  "receptionist",
  "employee",
]);

export const membershipStatusEnum = pgEnum("membership_status", [
  "invited",
  "active",
  "suspended",
]);

export const recordStatusEnum = pgEnum("record_status", [
  "active",
  "inactive",
]);

export const scheduleScopeEnum = pgEnum("schedule_scope", [
  "branch",
  "employee",
]);

export const exceptionTypeEnum = pgEnum("schedule_exception_type", [
  "closed",
  "special_hours",
  "absence",
  "break",
  "blocked",
]);

export const appointmentStatusEnum = pgEnum("appointment_status", [
  "pending",
  "confirmed",
  "waiting",
  "in_service",
  "completed",
  "cancelled",
  "no_show",
]);

export const appointmentSourceEnum = pgEnum("appointment_source", [
  "internal",
  "public_booking",
  "integration",
]);

export const companies = pgTable(
  "companies",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    authOrganizationId: text("auth_organization_id").unique(),
    name: varchar("name", { length: 160 }).notNull(),
    slug: varchar("slug", { length: 100 }).notNull().unique(),
    timezone: varchar("timezone", { length: 80 })
      .default("America/Hermosillo")
      .notNull(),
    currency: varchar("currency", { length: 3 }).default("MXN").notNull(),
    status: companyStatusEnum("status").default("active").notNull(),
    ...timestamps,
  },
  (table) => [
    uniqueIndex("companies_tenant_ref_uidx").on(table.id, table.slug),
    index("companies_status_idx").on(table.status),
  ],
);

export const appUsers = pgTable(
  "app_users",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    authUserId: text("auth_user_id").notNull().unique(),
    email: varchar("email", { length: 320 }).notNull(),
    name: varchar("name", { length: 160 }).notNull(),
    avatarUrl: text("avatar_url"),
    platformRole: platformRoleEnum("platform_role").default("user").notNull(),
    isActive: boolean("is_active").default(true).notNull(),
    ...timestamps,
  },
  (table) => [
    index("app_users_email_idx").on(table.email),
    index("app_users_auth_user_idx").on(table.authUserId),
  ],
);

export const companyMemberships = pgTable(
  "company_memberships",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    companyId: uuid("company_id")
      .notNull()
      .references(() => companies.id, { onDelete: "cascade" }),
    userId: uuid("user_id")
      .notNull()
      .references(() => appUsers.id, { onDelete: "cascade" }),
    role: membershipRoleEnum("role").notNull(),
    status: membershipStatusEnum("status").default("active").notNull(),
    ...timestamps,
  },
  (table) => [
    uniqueIndex("company_memberships_company_user_uidx").on(
      table.companyId,
      table.userId,
    ),
    unique("company_memberships_tenant_ref_uq").on(
      table.companyId,
      table.id,
    ),
    index("company_memberships_user_status_idx").on(
      table.userId,
      table.status,
    ),
  ],
);

export const branches = pgTable(
  "branches",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    companyId: uuid("company_id")
      .notNull()
      .references(() => companies.id, { onDelete: "cascade" }),
    name: varchar("name", { length: 160 }).notNull(),
    slug: varchar("slug", { length: 100 }).notNull(),
    timezone: varchar("timezone", { length: 80 }),
    address: text("address"),
    phone: varchar("phone", { length: 32 }),
    email: varchar("email", { length: 320 }),
    status: recordStatusEnum("status").default("active").notNull(),
    ...timestamps,
  },
  (table) => [
    uniqueIndex("branches_company_slug_uidx").on(table.companyId, table.slug),
    unique("branches_tenant_ref_uq").on(table.companyId, table.id),
    index("branches_company_status_idx").on(table.companyId, table.status),
  ],
);

export const branchAccess = pgTable(
  "branch_access",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    companyId: uuid("company_id").notNull(),
    branchId: uuid("branch_id").notNull(),
    membershipId: uuid("membership_id").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    uniqueIndex("branch_access_membership_branch_uidx").on(
      table.membershipId,
      table.branchId,
    ),
    foreignKey({
      name: "branch_access_branch_tenant_fk",
      columns: [table.companyId, table.branchId],
      foreignColumns: [branches.companyId, branches.id],
    }).onDelete("cascade"),
    foreignKey({
      name: "branch_access_membership_tenant_fk",
      columns: [table.companyId, table.membershipId],
      foreignColumns: [companyMemberships.companyId, companyMemberships.id],
    }).onDelete("cascade"),
  ],
);

export const employees = pgTable(
  "employees",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    companyId: uuid("company_id")
      .notNull()
      .references(() => companies.id, { onDelete: "cascade" }),
    userId: uuid("user_id").references(() => appUsers.id, {
      onDelete: "set null",
    }),
    name: varchar("name", { length: 160 }).notNull(),
    email: varchar("email", { length: 320 }),
    phone: varchar("phone", { length: 32 }),
    color: varchar("color", { length: 24 }).default("#6366f1").notNull(),
    status: recordStatusEnum("status").default("active").notNull(),
    ...timestamps,
  },
  (table) => [
    unique("employees_tenant_ref_uq").on(table.companyId, table.id),
    uniqueIndex("employees_company_user_uidx")
      .on(table.companyId, table.userId)
      .where(sql`${table.userId} is not null`),
    index("employees_company_status_idx").on(table.companyId, table.status),
  ],
);

export const employeeBranches = pgTable(
  "employee_branches",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    companyId: uuid("company_id").notNull(),
    employeeId: uuid("employee_id").notNull(),
    branchId: uuid("branch_id").notNull(),
    isPrimary: boolean("is_primary").default(false).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    uniqueIndex("employee_branches_employee_branch_uidx").on(
      table.employeeId,
      table.branchId,
    ),
    index("employee_branches_company_branch_idx").on(
      table.companyId,
      table.branchId,
    ),
    foreignKey({
      name: "employee_branches_employee_tenant_fk",
      columns: [table.companyId, table.employeeId],
      foreignColumns: [employees.companyId, employees.id],
    }).onDelete("cascade"),
    foreignKey({
      name: "employee_branches_branch_tenant_fk",
      columns: [table.companyId, table.branchId],
      foreignColumns: [branches.companyId, branches.id],
    }).onDelete("cascade"),
  ],
);

export const serviceCategories = pgTable(
  "service_categories",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    companyId: uuid("company_id")
      .notNull()
      .references(() => companies.id, { onDelete: "cascade" }),
    name: varchar("name", { length: 120 }).notNull(),
    slug: varchar("slug", { length: 100 }).notNull(),
    status: recordStatusEnum("status").default("active").notNull(),
    ...timestamps,
  },
  (table) => [
    uniqueIndex("service_categories_company_slug_uidx").on(
      table.companyId,
      table.slug,
    ),
    unique("service_categories_tenant_ref_uq").on(
      table.companyId,
      table.id,
    ),
  ],
);

export const services = pgTable(
  "services",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    companyId: uuid("company_id").notNull(),
    categoryId: uuid("category_id"),
    code: varchar("code", { length: 48 }).notNull(),
    name: varchar("name", { length: 160 }).notNull(),
    description: text("description"),
    durationMinutes: integer("duration_minutes").notNull(),
    priceCents: integer("price_cents").notNull(),
    currency: varchar("currency", { length: 3 }).default("MXN").notNull(),
    isPublic: boolean("is_public").default(true).notNull(),
    status: recordStatusEnum("status").default("active").notNull(),
    ...timestamps,
  },
  (table) => [
    uniqueIndex("services_company_code_uidx").on(table.companyId, table.code),
    unique("services_tenant_ref_uq").on(table.companyId, table.id),
    index("services_company_status_idx").on(table.companyId, table.status),
    foreignKey({
      name: "services_category_tenant_fk",
      columns: [table.companyId, table.categoryId],
      foreignColumns: [serviceCategories.companyId, serviceCategories.id],
    }).onDelete("set null"),
    check("services_duration_positive_chk", sql`${table.durationMinutes} > 0`),
    check("services_price_nonnegative_chk", sql`${table.priceCents} >= 0`),
  ],
);

export const employeeServices = pgTable(
  "employee_services",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    companyId: uuid("company_id").notNull(),
    employeeId: uuid("employee_id").notNull(),
    serviceId: uuid("service_id").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    uniqueIndex("employee_services_employee_service_uidx").on(
      table.employeeId,
      table.serviceId,
    ),
    foreignKey({
      name: "employee_services_employee_tenant_fk",
      columns: [table.companyId, table.employeeId],
      foreignColumns: [employees.companyId, employees.id],
    }).onDelete("cascade"),
    foreignKey({
      name: "employee_services_service_tenant_fk",
      columns: [table.companyId, table.serviceId],
      foreignColumns: [services.companyId, services.id],
    }).onDelete("cascade"),
  ],
);

export const weeklySchedules = pgTable(
  "weekly_schedules",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    companyId: uuid("company_id").notNull(),
    branchId: uuid("branch_id").notNull(),
    employeeId: uuid("employee_id"),
    scope: scheduleScopeEnum("scope").notNull(),
    dayOfWeek: smallint("day_of_week").notNull(),
    startMinute: smallint("start_minute").notNull(),
    endMinute: smallint("end_minute").notNull(),
    isActive: boolean("is_active").default(true).notNull(),
    ...timestamps,
  },
  (table) => [
    index("weekly_schedules_lookup_idx").on(
      table.companyId,
      table.branchId,
      table.employeeId,
      table.dayOfWeek,
    ),
    foreignKey({
      name: "weekly_schedules_branch_tenant_fk",
      columns: [table.companyId, table.branchId],
      foreignColumns: [branches.companyId, branches.id],
    }).onDelete("cascade"),
    foreignKey({
      name: "weekly_schedules_employee_tenant_fk",
      columns: [table.companyId, table.employeeId],
      foreignColumns: [employees.companyId, employees.id],
    }).onDelete("cascade"),
    check(
      "weekly_schedules_scope_chk",
      sql`(${table.scope} = 'branch' and ${table.employeeId} is null) or (${table.scope} = 'employee' and ${table.employeeId} is not null)`,
    ),
    check(
      "weekly_schedules_day_chk",
      sql`${table.dayOfWeek} between 0 and 6`,
    ),
    check(
      "weekly_schedules_minutes_chk",
      sql`${table.startMinute} >= 0 and ${table.endMinute} <= 1440 and ${table.startMinute} < ${table.endMinute}`,
    ),
  ],
);

export const scheduleExceptions = pgTable(
  "schedule_exceptions",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    companyId: uuid("company_id").notNull(),
    branchId: uuid("branch_id").notNull(),
    employeeId: uuid("employee_id"),
    type: exceptionTypeEnum("type").notNull(),
    startsAt: timestamp("starts_at", { withTimezone: true }).notNull(),
    endsAt: timestamp("ends_at", { withTimezone: true }).notNull(),
    reason: text("reason"),
    ...timestamps,
  },
  (table) => [
    index("schedule_exceptions_lookup_idx").on(
      table.companyId,
      table.branchId,
      table.employeeId,
      table.startsAt,
    ),
    foreignKey({
      name: "schedule_exceptions_branch_tenant_fk",
      columns: [table.companyId, table.branchId],
      foreignColumns: [branches.companyId, branches.id],
    }).onDelete("cascade"),
    foreignKey({
      name: "schedule_exceptions_employee_tenant_fk",
      columns: [table.companyId, table.employeeId],
      foreignColumns: [employees.companyId, employees.id],
    }).onDelete("cascade"),
    check(
      "schedule_exceptions_range_chk",
      sql`${table.startsAt} < ${table.endsAt}`,
    ),
  ],
);

export const customers = pgTable(
  "customers",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    companyId: uuid("company_id")
      .notNull()
      .references(() => companies.id, { onDelete: "cascade" }),
    name: varchar("name", { length: 160 }).notNull(),
    phone: varchar("phone", { length: 32 }),
    email: varchar("email", { length: 320 }),
    notes: text("notes"),
    ...timestamps,
  },
  (table) => [
    unique("customers_tenant_ref_uq").on(table.companyId, table.id),
    index("customers_company_name_idx").on(table.companyId, table.name),
    index("customers_company_phone_idx").on(table.companyId, table.phone),
  ],
);

export const appointments = pgTable(
  "appointments",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    companyId: uuid("company_id").notNull(),
    branchId: uuid("branch_id").notNull(),
    customerId: uuid("customer_id").notNull(),
    employeeId: uuid("employee_id").notNull(),
    createdByUserId: uuid("created_by_user_id").references(() => appUsers.id, {
      onDelete: "set null",
    }),
    startsAt: timestamp("starts_at", { withTimezone: true }).notNull(),
    endsAt: timestamp("ends_at", { withTimezone: true }).notNull(),
    status: appointmentStatusEnum("status").default("pending").notNull(),
    source: appointmentSourceEnum("source").default("internal").notNull(),
    notes: text("notes"),
    estimatedTotalCents: integer("estimated_total_cents").default(0).notNull(),
    ...timestamps,
  },
  (table) => [
    unique("appointments_tenant_ref_uq").on(table.companyId, table.id),
    index("appointments_calendar_lookup_idx").on(
      table.companyId,
      table.branchId,
      table.startsAt,
      table.employeeId,
    ),
    index("appointments_customer_idx").on(table.companyId, table.customerId),
    foreignKey({
      name: "appointments_branch_tenant_fk",
      columns: [table.companyId, table.branchId],
      foreignColumns: [branches.companyId, branches.id],
    }).onDelete("restrict"),
    foreignKey({
      name: "appointments_customer_tenant_fk",
      columns: [table.companyId, table.customerId],
      foreignColumns: [customers.companyId, customers.id],
    }).onDelete("restrict"),
    foreignKey({
      name: "appointments_employee_tenant_fk",
      columns: [table.companyId, table.employeeId],
      foreignColumns: [employees.companyId, employees.id],
    }).onDelete("restrict"),
    check("appointments_range_chk", sql`${table.startsAt} < ${table.endsAt}`),
    check(
      "appointments_total_nonnegative_chk",
      sql`${table.estimatedTotalCents} >= 0`,
    ),
  ],
);

export const appointmentServices = pgTable(
  "appointment_services",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    companyId: uuid("company_id").notNull(),
    appointmentId: uuid("appointment_id").notNull(),
    serviceId: uuid("service_id").notNull(),
    serviceName: varchar("service_name", { length: 160 }).notNull(),
    durationMinutes: integer("duration_minutes").notNull(),
    priceCents: integer("price_cents").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    index("appointment_services_appointment_idx").on(
      table.companyId,
      table.appointmentId,
    ),
    foreignKey({
      name: "appointment_services_appointment_tenant_fk",
      columns: [table.companyId, table.appointmentId],
      foreignColumns: [appointments.companyId, appointments.id],
    }).onDelete("cascade"),
    foreignKey({
      name: "appointment_services_service_tenant_fk",
      columns: [table.companyId, table.serviceId],
      foreignColumns: [services.companyId, services.id],
    }).onDelete("restrict"),
    check(
      "appointment_services_duration_positive_chk",
      sql`${table.durationMinutes} > 0`,
    ),
    check(
      "appointment_services_price_nonnegative_chk",
      sql`${table.priceCents} >= 0`,
    ),
  ],
);

export const auditLogs = pgTable(
  "audit_logs",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    companyId: uuid("company_id").references(() => companies.id, {
      onDelete: "set null",
    }),
    actorUserId: uuid("actor_user_id").references(() => appUsers.id, {
      onDelete: "set null",
    }),
    action: varchar("action", { length: 120 }).notNull(),
    entityType: varchar("entity_type", { length: 80 }).notNull(),
    entityId: text("entity_id"),
    metadata: jsonb("metadata").$type<Record<string, unknown>>().default({}),
    occurredAt: timestamp("occurred_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    index("audit_logs_company_time_idx").on(
      table.companyId,
      table.occurredAt,
    ),
    index("audit_logs_actor_time_idx").on(
      table.actorUserId,
      table.occurredAt,
    ),
  ],
);

export type Company = typeof companies.$inferSelect;
export type AppUser = typeof appUsers.$inferSelect;
export type CompanyMembership = typeof companyMemberships.$inferSelect;
export type Branch = typeof branches.$inferSelect;
export type Employee = typeof employees.$inferSelect;
export type Service = typeof services.$inferSelect;
export type Appointment = typeof appointments.$inferSelect;
