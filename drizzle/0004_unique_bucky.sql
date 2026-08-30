CREATE TABLE "auth_rate_limits" (
	"key_hash" varchar(64) PRIMARY KEY NOT NULL,
	"attempts" smallint DEFAULT 0 NOT NULL,
	"window_started_at" timestamp with time zone DEFAULT now() NOT NULL,
	"blocked_until" timestamp with time zone,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "auth_rate_limits_attempts_chk" CHECK ("auth_rate_limits"."attempts" >= 0)
);
--> statement-breakpoint
CREATE TABLE "service_branches" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"company_id" uuid NOT NULL,
	"service_id" uuid NOT NULL,
	"branch_id" uuid NOT NULL,
	"is_available" boolean DEFAULT true NOT NULL,
	"price_override_cents" integer,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "service_branches_price_chk" CHECK ("service_branches"."price_override_cents" is null or "service_branches"."price_override_cents" >= 0)
);
--> statement-breakpoint
ALTER TABLE "companies" ADD COLUMN "appointment_interval_minutes" smallint DEFAULT 15 NOT NULL;--> statement-breakpoint
ALTER TABLE "companies" ADD COLUMN "booking_lead_minutes" smallint DEFAULT 30 NOT NULL;--> statement-breakpoint
ALTER TABLE "services" ADD COLUMN "preparation_minutes" smallint DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "services" ADD COLUMN "cleanup_minutes" smallint DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "services" ADD COLUMN "tax_basis_points" smallint DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "service_branches" ADD CONSTRAINT "service_branches_service_tenant_fk" FOREIGN KEY ("company_id","service_id") REFERENCES "public"."services"("company_id","id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "service_branches" ADD CONSTRAINT "service_branches_branch_tenant_fk" FOREIGN KEY ("company_id","branch_id") REFERENCES "public"."branches"("company_id","id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "auth_rate_limits_updated_idx" ON "auth_rate_limits" USING btree ("updated_at");--> statement-breakpoint
CREATE UNIQUE INDEX "service_branches_service_branch_uidx" ON "service_branches" USING btree ("service_id","branch_id");--> statement-breakpoint
CREATE INDEX "service_branches_company_branch_idx" ON "service_branches" USING btree ("company_id","branch_id","is_available");--> statement-breakpoint
ALTER TABLE "companies" ADD CONSTRAINT "companies_appointment_interval_chk" CHECK ("companies"."appointment_interval_minutes" in (5, 10, 15, 20, 30, 60));--> statement-breakpoint
ALTER TABLE "companies" ADD CONSTRAINT "companies_booking_lead_chk" CHECK ("companies"."booking_lead_minutes" between 0 and 10080);--> statement-breakpoint
ALTER TABLE "services" ADD CONSTRAINT "services_buffer_minutes_chk" CHECK ("services"."preparation_minutes" between 0 and 240 and "services"."cleanup_minutes" between 0 and 240);--> statement-breakpoint
ALTER TABLE "services" ADD CONSTRAINT "services_tax_rate_chk" CHECK ("services"."tax_basis_points" between 0 and 10000);