CREATE EXTENSION IF NOT EXISTS "btree_gist";--> statement-breakpoint
CREATE TYPE "public"."appointment_source" AS ENUM('internal', 'public_booking', 'integration');--> statement-breakpoint
CREATE TYPE "public"."appointment_status" AS ENUM('pending', 'confirmed', 'waiting', 'in_service', 'completed', 'cancelled', 'no_show');--> statement-breakpoint
CREATE TYPE "public"."company_status" AS ENUM('active', 'suspended', 'archived');--> statement-breakpoint
CREATE TYPE "public"."schedule_exception_type" AS ENUM('closed', 'special_hours', 'absence', 'break', 'blocked');--> statement-breakpoint
CREATE TYPE "public"."membership_role" AS ENUM('owner', 'admin', 'manager', 'receptionist', 'employee');--> statement-breakpoint
CREATE TYPE "public"."membership_status" AS ENUM('invited', 'active', 'suspended');--> statement-breakpoint
CREATE TYPE "public"."platform_role" AS ENUM('user', 'platform_admin');--> statement-breakpoint
CREATE TYPE "public"."record_status" AS ENUM('active', 'inactive');--> statement-breakpoint
CREATE TYPE "public"."schedule_scope" AS ENUM('branch', 'employee');--> statement-breakpoint
CREATE TABLE "app_users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"auth_user_id" text NOT NULL,
	"email" varchar(320) NOT NULL,
	"name" varchar(160) NOT NULL,
	"avatar_url" text,
	"platform_role" "platform_role" DEFAULT 'user' NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "app_users_auth_user_id_unique" UNIQUE("auth_user_id")
);
--> statement-breakpoint
CREATE TABLE "appointment_services" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"company_id" uuid NOT NULL,
	"appointment_id" uuid NOT NULL,
	"service_id" uuid NOT NULL,
	"service_name" varchar(160) NOT NULL,
	"duration_minutes" integer NOT NULL,
	"price_cents" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "appointment_services_duration_positive_chk" CHECK ("appointment_services"."duration_minutes" > 0),
	CONSTRAINT "appointment_services_price_nonnegative_chk" CHECK ("appointment_services"."price_cents" >= 0)
);
--> statement-breakpoint
CREATE TABLE "appointments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"company_id" uuid NOT NULL,
	"branch_id" uuid NOT NULL,
	"customer_id" uuid NOT NULL,
	"employee_id" uuid NOT NULL,
	"created_by_user_id" uuid,
	"starts_at" timestamp with time zone NOT NULL,
	"ends_at" timestamp with time zone NOT NULL,
	"status" "appointment_status" DEFAULT 'pending' NOT NULL,
	"source" "appointment_source" DEFAULT 'internal' NOT NULL,
	"notes" text,
	"estimated_total_cents" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "appointments_tenant_ref_uq" UNIQUE("company_id","id"),
	CONSTRAINT "appointments_range_chk" CHECK ("appointments"."starts_at" < "appointments"."ends_at"),
	CONSTRAINT "appointments_total_nonnegative_chk" CHECK ("appointments"."estimated_total_cents" >= 0)
);
--> statement-breakpoint
CREATE TABLE "audit_logs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"company_id" uuid,
	"actor_user_id" uuid,
	"action" varchar(120) NOT NULL,
	"entity_type" varchar(80) NOT NULL,
	"entity_id" text,
	"metadata" jsonb DEFAULT '{}'::jsonb,
	"occurred_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "branch_access" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"company_id" uuid NOT NULL,
	"branch_id" uuid NOT NULL,
	"membership_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "branches" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"company_id" uuid NOT NULL,
	"name" varchar(160) NOT NULL,
	"slug" varchar(100) NOT NULL,
	"timezone" varchar(80),
	"address" text,
	"phone" varchar(32),
	"email" varchar(320),
	"status" "record_status" DEFAULT 'active' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "branches_tenant_ref_uq" UNIQUE("company_id","id")
);
--> statement-breakpoint
CREATE TABLE "companies" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"auth_organization_id" text,
	"name" varchar(160) NOT NULL,
	"slug" varchar(100) NOT NULL,
	"timezone" varchar(80) DEFAULT 'America/Hermosillo' NOT NULL,
	"currency" varchar(3) DEFAULT 'MXN' NOT NULL,
	"status" "company_status" DEFAULT 'active' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "companies_auth_organization_id_unique" UNIQUE("auth_organization_id"),
	CONSTRAINT "companies_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "company_memberships" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"company_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"role" "membership_role" NOT NULL,
	"status" "membership_status" DEFAULT 'active' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "company_memberships_tenant_ref_uq" UNIQUE("company_id","id")
);
--> statement-breakpoint
CREATE TABLE "customers" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"company_id" uuid NOT NULL,
	"name" varchar(160) NOT NULL,
	"phone" varchar(32),
	"email" varchar(320),
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "customers_tenant_ref_uq" UNIQUE("company_id","id")
);
--> statement-breakpoint
CREATE TABLE "employee_branches" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"company_id" uuid NOT NULL,
	"employee_id" uuid NOT NULL,
	"branch_id" uuid NOT NULL,
	"is_primary" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "employee_services" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"company_id" uuid NOT NULL,
	"employee_id" uuid NOT NULL,
	"service_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "employees" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"company_id" uuid NOT NULL,
	"user_id" uuid,
	"name" varchar(160) NOT NULL,
	"email" varchar(320),
	"phone" varchar(32),
	"color" varchar(24) DEFAULT '#6366f1' NOT NULL,
	"status" "record_status" DEFAULT 'active' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "employees_tenant_ref_uq" UNIQUE("company_id","id")
);
--> statement-breakpoint
CREATE TABLE "schedule_exceptions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"company_id" uuid NOT NULL,
	"branch_id" uuid NOT NULL,
	"employee_id" uuid,
	"type" "schedule_exception_type" NOT NULL,
	"starts_at" timestamp with time zone NOT NULL,
	"ends_at" timestamp with time zone NOT NULL,
	"reason" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "schedule_exceptions_range_chk" CHECK ("schedule_exceptions"."starts_at" < "schedule_exceptions"."ends_at")
);
--> statement-breakpoint
CREATE TABLE "service_categories" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"company_id" uuid NOT NULL,
	"name" varchar(120) NOT NULL,
	"slug" varchar(100) NOT NULL,
	"status" "record_status" DEFAULT 'active' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "service_categories_tenant_ref_uq" UNIQUE("company_id","id")
);
--> statement-breakpoint
CREATE TABLE "services" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"company_id" uuid NOT NULL,
	"category_id" uuid,
	"code" varchar(48) NOT NULL,
	"name" varchar(160) NOT NULL,
	"description" text,
	"duration_minutes" integer NOT NULL,
	"price_cents" integer NOT NULL,
	"currency" varchar(3) DEFAULT 'MXN' NOT NULL,
	"is_public" boolean DEFAULT true NOT NULL,
	"status" "record_status" DEFAULT 'active' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "services_tenant_ref_uq" UNIQUE("company_id","id"),
	CONSTRAINT "services_duration_positive_chk" CHECK ("services"."duration_minutes" > 0),
	CONSTRAINT "services_price_nonnegative_chk" CHECK ("services"."price_cents" >= 0)
);
--> statement-breakpoint
CREATE TABLE "weekly_schedules" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"company_id" uuid NOT NULL,
	"branch_id" uuid NOT NULL,
	"employee_id" uuid,
	"scope" "schedule_scope" NOT NULL,
	"day_of_week" smallint NOT NULL,
	"start_minute" smallint NOT NULL,
	"end_minute" smallint NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "weekly_schedules_scope_chk" CHECK (("weekly_schedules"."scope" = 'branch' and "weekly_schedules"."employee_id" is null) or ("weekly_schedules"."scope" = 'employee' and "weekly_schedules"."employee_id" is not null)),
	CONSTRAINT "weekly_schedules_day_chk" CHECK ("weekly_schedules"."day_of_week" between 0 and 6),
	CONSTRAINT "weekly_schedules_minutes_chk" CHECK ("weekly_schedules"."start_minute" >= 0 and "weekly_schedules"."end_minute" <= 1440 and "weekly_schedules"."start_minute" < "weekly_schedules"."end_minute")
);
--> statement-breakpoint
ALTER TABLE "appointment_services" ADD CONSTRAINT "appointment_services_appointment_tenant_fk" FOREIGN KEY ("company_id","appointment_id") REFERENCES "public"."appointments"("company_id","id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "appointment_services" ADD CONSTRAINT "appointment_services_service_tenant_fk" FOREIGN KEY ("company_id","service_id") REFERENCES "public"."services"("company_id","id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "appointments" ADD CONSTRAINT "appointments_created_by_user_id_app_users_id_fk" FOREIGN KEY ("created_by_user_id") REFERENCES "public"."app_users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "appointments" ADD CONSTRAINT "appointments_branch_tenant_fk" FOREIGN KEY ("company_id","branch_id") REFERENCES "public"."branches"("company_id","id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "appointments" ADD CONSTRAINT "appointments_customer_tenant_fk" FOREIGN KEY ("company_id","customer_id") REFERENCES "public"."customers"("company_id","id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "appointments" ADD CONSTRAINT "appointments_employee_tenant_fk" FOREIGN KEY ("company_id","employee_id") REFERENCES "public"."employees"("company_id","id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_actor_user_id_app_users_id_fk" FOREIGN KEY ("actor_user_id") REFERENCES "public"."app_users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "branch_access" ADD CONSTRAINT "branch_access_branch_tenant_fk" FOREIGN KEY ("company_id","branch_id") REFERENCES "public"."branches"("company_id","id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "branch_access" ADD CONSTRAINT "branch_access_membership_tenant_fk" FOREIGN KEY ("company_id","membership_id") REFERENCES "public"."company_memberships"("company_id","id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "branches" ADD CONSTRAINT "branches_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "company_memberships" ADD CONSTRAINT "company_memberships_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "company_memberships" ADD CONSTRAINT "company_memberships_user_id_app_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."app_users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "customers" ADD CONSTRAINT "customers_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "employee_branches" ADD CONSTRAINT "employee_branches_employee_tenant_fk" FOREIGN KEY ("company_id","employee_id") REFERENCES "public"."employees"("company_id","id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "employee_branches" ADD CONSTRAINT "employee_branches_branch_tenant_fk" FOREIGN KEY ("company_id","branch_id") REFERENCES "public"."branches"("company_id","id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "employee_services" ADD CONSTRAINT "employee_services_employee_tenant_fk" FOREIGN KEY ("company_id","employee_id") REFERENCES "public"."employees"("company_id","id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "employee_services" ADD CONSTRAINT "employee_services_service_tenant_fk" FOREIGN KEY ("company_id","service_id") REFERENCES "public"."services"("company_id","id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "employees" ADD CONSTRAINT "employees_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "employees" ADD CONSTRAINT "employees_user_id_app_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."app_users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "schedule_exceptions" ADD CONSTRAINT "schedule_exceptions_branch_tenant_fk" FOREIGN KEY ("company_id","branch_id") REFERENCES "public"."branches"("company_id","id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "schedule_exceptions" ADD CONSTRAINT "schedule_exceptions_employee_tenant_fk" FOREIGN KEY ("company_id","employee_id") REFERENCES "public"."employees"("company_id","id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "service_categories" ADD CONSTRAINT "service_categories_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "services" ADD CONSTRAINT "services_category_tenant_fk" FOREIGN KEY ("company_id","category_id") REFERENCES "public"."service_categories"("company_id","id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "weekly_schedules" ADD CONSTRAINT "weekly_schedules_branch_tenant_fk" FOREIGN KEY ("company_id","branch_id") REFERENCES "public"."branches"("company_id","id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "weekly_schedules" ADD CONSTRAINT "weekly_schedules_employee_tenant_fk" FOREIGN KEY ("company_id","employee_id") REFERENCES "public"."employees"("company_id","id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "app_users_email_idx" ON "app_users" USING btree ("email");--> statement-breakpoint
CREATE INDEX "app_users_auth_user_idx" ON "app_users" USING btree ("auth_user_id");--> statement-breakpoint
CREATE INDEX "appointment_services_appointment_idx" ON "appointment_services" USING btree ("company_id","appointment_id");--> statement-breakpoint
CREATE INDEX "appointments_calendar_lookup_idx" ON "appointments" USING btree ("company_id","branch_id","starts_at","employee_id");--> statement-breakpoint
CREATE INDEX "appointments_customer_idx" ON "appointments" USING btree ("company_id","customer_id");--> statement-breakpoint
CREATE INDEX "audit_logs_company_time_idx" ON "audit_logs" USING btree ("company_id","occurred_at");--> statement-breakpoint
CREATE INDEX "audit_logs_actor_time_idx" ON "audit_logs" USING btree ("actor_user_id","occurred_at");--> statement-breakpoint
CREATE UNIQUE INDEX "branch_access_membership_branch_uidx" ON "branch_access" USING btree ("membership_id","branch_id");--> statement-breakpoint
CREATE UNIQUE INDEX "branches_company_slug_uidx" ON "branches" USING btree ("company_id","slug");--> statement-breakpoint
CREATE INDEX "branches_company_status_idx" ON "branches" USING btree ("company_id","status");--> statement-breakpoint
CREATE UNIQUE INDEX "companies_tenant_ref_uidx" ON "companies" USING btree ("id","slug");--> statement-breakpoint
CREATE INDEX "companies_status_idx" ON "companies" USING btree ("status");--> statement-breakpoint
CREATE UNIQUE INDEX "company_memberships_company_user_uidx" ON "company_memberships" USING btree ("company_id","user_id");--> statement-breakpoint
CREATE INDEX "company_memberships_user_status_idx" ON "company_memberships" USING btree ("user_id","status");--> statement-breakpoint
CREATE INDEX "customers_company_name_idx" ON "customers" USING btree ("company_id","name");--> statement-breakpoint
CREATE INDEX "customers_company_phone_idx" ON "customers" USING btree ("company_id","phone");--> statement-breakpoint
CREATE UNIQUE INDEX "employee_branches_employee_branch_uidx" ON "employee_branches" USING btree ("employee_id","branch_id");--> statement-breakpoint
CREATE INDEX "employee_branches_company_branch_idx" ON "employee_branches" USING btree ("company_id","branch_id");--> statement-breakpoint
CREATE UNIQUE INDEX "employee_services_employee_service_uidx" ON "employee_services" USING btree ("employee_id","service_id");--> statement-breakpoint
CREATE UNIQUE INDEX "employees_company_user_uidx" ON "employees" USING btree ("company_id","user_id") WHERE "employees"."user_id" is not null;--> statement-breakpoint
CREATE INDEX "employees_company_status_idx" ON "employees" USING btree ("company_id","status");--> statement-breakpoint
CREATE INDEX "schedule_exceptions_lookup_idx" ON "schedule_exceptions" USING btree ("company_id","branch_id","employee_id","starts_at");--> statement-breakpoint
CREATE UNIQUE INDEX "service_categories_company_slug_uidx" ON "service_categories" USING btree ("company_id","slug");--> statement-breakpoint
CREATE UNIQUE INDEX "services_company_code_uidx" ON "services" USING btree ("company_id","code");--> statement-breakpoint
CREATE INDEX "services_company_status_idx" ON "services" USING btree ("company_id","status");--> statement-breakpoint
CREATE INDEX "weekly_schedules_lookup_idx" ON "weekly_schedules" USING btree ("company_id","branch_id","employee_id","day_of_week");--> statement-breakpoint
ALTER TABLE "appointments" ADD CONSTRAINT "appointments_employee_time_excl" EXCLUDE USING gist (
  "company_id" WITH =,
  "employee_id" WITH =,
  tstzrange("starts_at", "ends_at", '[)') WITH &&
) WHERE ("status" NOT IN ('cancelled', 'no_show'));
