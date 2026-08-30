CREATE TYPE "public"."payment_method" AS ENUM('cash', 'card', 'transfer');--> statement-breakpoint
CREATE TYPE "public"."sale_status" AS ENUM('completed', 'cancelled');--> statement-breakpoint
CREATE TABLE "sale_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"company_id" uuid NOT NULL,
	"sale_id" uuid NOT NULL,
	"service_id" uuid NOT NULL,
	"employee_id" uuid NOT NULL,
	"service_code" varchar(48) NOT NULL,
	"service_name" varchar(160) NOT NULL,
	"employee_name" varchar(160) NOT NULL,
	"quantity" integer DEFAULT 1 NOT NULL,
	"unit_price_cents" integer NOT NULL,
	"line_total_cents" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "sale_items_quantity_chk" CHECK ("sale_items"."quantity" > 0),
	CONSTRAINT "sale_items_amounts_chk" CHECK ("sale_items"."unit_price_cents" >= 0 and "sale_items"."line_total_cents" >= 0)
);
--> statement-breakpoint
CREATE TABLE "sale_payments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"company_id" uuid NOT NULL,
	"sale_id" uuid NOT NULL,
	"method" "payment_method" NOT NULL,
	"amount_cents" integer NOT NULL,
	"reference" varchar(160),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "sale_payments_amount_positive_chk" CHECK ("sale_payments"."amount_cents" > 0)
);
--> statement-breakpoint
CREATE TABLE "sales" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"company_id" uuid NOT NULL,
	"branch_id" uuid NOT NULL,
	"customer_id" uuid,
	"appointment_id" uuid,
	"created_by_user_id" uuid,
	"folio" varchar(40) NOT NULL,
	"status" "sale_status" DEFAULT 'completed' NOT NULL,
	"subtotal_cents" integer NOT NULL,
	"discount_cents" integer DEFAULT 0 NOT NULL,
	"tax_cents" integer DEFAULT 0 NOT NULL,
	"total_cents" integer NOT NULL,
	"paid_cents" integer NOT NULL,
	"change_cents" integer DEFAULT 0 NOT NULL,
	"currency" varchar(3) DEFAULT 'MXN' NOT NULL,
	"notes" text,
	"cancelled_at" timestamp with time zone,
	"cancelled_by_user_id" uuid,
	"cancellation_reason" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "sales_tenant_ref_uq" UNIQUE("company_id","id"),
	CONSTRAINT "sales_amounts_chk" CHECK ("sales"."subtotal_cents" >= 0 and "sales"."discount_cents" >= 0 and "sales"."tax_cents" >= 0 and "sales"."total_cents" >= 0 and "sales"."paid_cents" >= 0 and "sales"."change_cents" >= 0)
);
--> statement-breakpoint
ALTER TABLE "sale_items" ADD CONSTRAINT "sale_items_sale_tenant_fk" FOREIGN KEY ("company_id","sale_id") REFERENCES "public"."sales"("company_id","id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sale_items" ADD CONSTRAINT "sale_items_service_tenant_fk" FOREIGN KEY ("company_id","service_id") REFERENCES "public"."services"("company_id","id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sale_items" ADD CONSTRAINT "sale_items_employee_tenant_fk" FOREIGN KEY ("company_id","employee_id") REFERENCES "public"."employees"("company_id","id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sale_payments" ADD CONSTRAINT "sale_payments_sale_tenant_fk" FOREIGN KEY ("company_id","sale_id") REFERENCES "public"."sales"("company_id","id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sales" ADD CONSTRAINT "sales_created_by_user_id_app_users_id_fk" FOREIGN KEY ("created_by_user_id") REFERENCES "public"."app_users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sales" ADD CONSTRAINT "sales_cancelled_by_user_id_app_users_id_fk" FOREIGN KEY ("cancelled_by_user_id") REFERENCES "public"."app_users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sales" ADD CONSTRAINT "sales_branch_tenant_fk" FOREIGN KEY ("company_id","branch_id") REFERENCES "public"."branches"("company_id","id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sales" ADD CONSTRAINT "sales_customer_tenant_fk" FOREIGN KEY ("company_id","customer_id") REFERENCES "public"."customers"("company_id","id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sales" ADD CONSTRAINT "sales_appointment_tenant_fk" FOREIGN KEY ("company_id","appointment_id") REFERENCES "public"."appointments"("company_id","id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "sale_items_sale_idx" ON "sale_items" USING btree ("company_id","sale_id");--> statement-breakpoint
CREATE INDEX "sale_items_employee_idx" ON "sale_items" USING btree ("company_id","employee_id");--> statement-breakpoint
CREATE INDEX "sale_payments_sale_idx" ON "sale_payments" USING btree ("company_id","sale_id");--> statement-breakpoint
CREATE INDEX "sale_payments_method_idx" ON "sale_payments" USING btree ("company_id","method");--> statement-breakpoint
CREATE UNIQUE INDEX "sales_company_folio_uidx" ON "sales" USING btree ("company_id","folio");--> statement-breakpoint
CREATE UNIQUE INDEX "sales_company_appointment_uidx" ON "sales" USING btree ("company_id","appointment_id") WHERE "sales"."appointment_id" is not null;--> statement-breakpoint
CREATE INDEX "sales_company_time_idx" ON "sales" USING btree ("company_id","created_at");--> statement-breakpoint
CREATE INDEX "sales_branch_time_idx" ON "sales" USING btree ("company_id","branch_id","created_at");