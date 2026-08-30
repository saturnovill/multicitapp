CREATE TYPE "public"."cash_movement_type" AS ENUM('sale', 'income', 'withdrawal', 'refund', 'adjustment');--> statement-breakpoint
CREATE TYPE "public"."cash_session_status" AS ENUM('open', 'closed');--> statement-breakpoint
CREATE TYPE "public"."commission_run_status" AS ENUM('draft', 'approved');--> statement-breakpoint
CREATE TYPE "public"."gift_card_movement_type" AS ENUM('issue', 'redeem', 'refund', 'adjustment', 'cancel');--> statement-breakpoint
CREATE TYPE "public"."gift_card_status" AS ENUM('active', 'depleted', 'cancelled', 'expired');--> statement-breakpoint
ALTER TYPE "public"."payment_method" ADD VALUE 'giftcard';--> statement-breakpoint
CREATE TABLE "cash_movements" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"company_id" uuid NOT NULL,
	"session_id" uuid NOT NULL,
	"sale_id" uuid,
	"actor_user_id" uuid,
	"type" "cash_movement_type" NOT NULL,
	"method" "payment_method" DEFAULT 'cash' NOT NULL,
	"amount_cents" integer NOT NULL,
	"category" varchar(100),
	"reason" text,
	"occurred_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "cash_movements_amount_positive_chk" CHECK ("cash_movements"."amount_cents" > 0)
);
--> statement-breakpoint
CREATE TABLE "cash_register_sessions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"company_id" uuid NOT NULL,
	"branch_id" uuid NOT NULL,
	"opened_by_user_id" uuid,
	"closed_by_user_id" uuid,
	"status" "cash_session_status" DEFAULT 'open' NOT NULL,
	"opening_balance_cents" integer DEFAULT 0 NOT NULL,
	"expected_cash_cents" integer,
	"counted_cash_cents" integer,
	"difference_cents" integer,
	"opening_notes" text,
	"closing_notes" text,
	"opened_at" timestamp with time zone DEFAULT now() NOT NULL,
	"closed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "cash_register_sessions_tenant_ref_uq" UNIQUE("company_id","id"),
	CONSTRAINT "cash_sessions_opening_nonnegative_chk" CHECK ("cash_register_sessions"."opening_balance_cents" >= 0)
);
--> statement-breakpoint
CREATE TABLE "commission_adjustments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"company_id" uuid NOT NULL,
	"run_id" uuid NOT NULL,
	"employee_id" uuid NOT NULL,
	"actor_user_id" uuid,
	"amount_cents" integer NOT NULL,
	"reason" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "commission_adjustments_nonzero_chk" CHECK ("commission_adjustments"."amount_cents" <> 0)
);
--> statement-breakpoint
CREATE TABLE "commission_entries" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"company_id" uuid NOT NULL,
	"run_id" uuid NOT NULL,
	"employee_id" uuid NOT NULL,
	"sale_id" uuid NOT NULL,
	"sale_item_id" uuid NOT NULL,
	"rule_id" uuid NOT NULL,
	"base_cents" integer NOT NULL,
	"commission_cents" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "commission_entries_amounts_chk" CHECK ("commission_entries"."base_cents" >= 0 and "commission_entries"."commission_cents" >= 0)
);
--> statement-breakpoint
CREATE TABLE "commission_rules" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"company_id" uuid NOT NULL,
	"employee_id" uuid,
	"service_id" uuid,
	"category_id" uuid,
	"name" varchar(160) NOT NULL,
	"rate_basis_points" integer DEFAULT 0 NOT NULL,
	"fixed_cents" integer DEFAULT 0 NOT NULL,
	"priority" integer DEFAULT 0 NOT NULL,
	"status" "record_status" DEFAULT 'active' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "commission_rules_tenant_ref_uq" UNIQUE("company_id","id"),
	CONSTRAINT "commission_rules_values_chk" CHECK ("commission_rules"."rate_basis_points" between 0 and 10000 and "commission_rules"."fixed_cents" >= 0 and ("commission_rules"."rate_basis_points" > 0 or "commission_rules"."fixed_cents" > 0))
);
--> statement-breakpoint
CREATE TABLE "commission_runs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"company_id" uuid NOT NULL,
	"branch_id" uuid,
	"created_by_user_id" uuid,
	"approved_by_user_id" uuid,
	"status" "commission_run_status" DEFAULT 'draft' NOT NULL,
	"period_from" date NOT NULL,
	"period_to" date NOT NULL,
	"total_cents" integer DEFAULT 0 NOT NULL,
	"approved_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "commission_runs_tenant_ref_uq" UNIQUE("company_id","id"),
	CONSTRAINT "commission_runs_period_chk" CHECK ("commission_runs"."period_from" <= "commission_runs"."period_to"),
	CONSTRAINT "commission_runs_total_nonnegative_chk" CHECK ("commission_runs"."total_cents" >= 0)
);
--> statement-breakpoint
CREATE TABLE "gift_card_movements" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"company_id" uuid NOT NULL,
	"gift_card_id" uuid NOT NULL,
	"sale_id" uuid,
	"actor_user_id" uuid,
	"type" "gift_card_movement_type" NOT NULL,
	"amount_cents" integer NOT NULL,
	"balance_after_cents" integer NOT NULL,
	"notes" text,
	"occurred_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "gift_card_movements_balance_chk" CHECK ("gift_card_movements"."balance_after_cents" >= 0),
	CONSTRAINT "gift_card_movements_amount_nonzero_chk" CHECK ("gift_card_movements"."amount_cents" <> 0)
);
--> statement-breakpoint
CREATE TABLE "gift_cards" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"company_id" uuid NOT NULL,
	"customer_id" uuid,
	"created_by_user_id" uuid,
	"code" varchar(40) NOT NULL,
	"initial_balance_cents" integer NOT NULL,
	"balance_cents" integer NOT NULL,
	"currency" varchar(3) DEFAULT 'MXN' NOT NULL,
	"status" "gift_card_status" DEFAULT 'active' NOT NULL,
	"expires_on" date,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "gift_cards_tenant_ref_uq" UNIQUE("company_id","id"),
	CONSTRAINT "gift_cards_balances_chk" CHECK ("gift_cards"."initial_balance_cents" > 0 and "gift_cards"."balance_cents" >= 0)
);
--> statement-breakpoint
ALTER TABLE "sale_payments" ADD COLUMN "gift_card_id" uuid;--> statement-breakpoint
ALTER TABLE "sales" ADD COLUMN "cash_session_id" uuid;--> statement-breakpoint
ALTER TABLE "cash_movements" ADD CONSTRAINT "cash_movements_actor_user_id_app_users_id_fk" FOREIGN KEY ("actor_user_id") REFERENCES "public"."app_users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cash_movements" ADD CONSTRAINT "cash_movements_session_tenant_fk" FOREIGN KEY ("company_id","session_id") REFERENCES "public"."cash_register_sessions"("company_id","id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cash_movements" ADD CONSTRAINT "cash_movements_sale_tenant_fk" FOREIGN KEY ("company_id","sale_id") REFERENCES "public"."sales"("company_id","id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cash_register_sessions" ADD CONSTRAINT "cash_register_sessions_opened_by_user_id_app_users_id_fk" FOREIGN KEY ("opened_by_user_id") REFERENCES "public"."app_users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cash_register_sessions" ADD CONSTRAINT "cash_register_sessions_closed_by_user_id_app_users_id_fk" FOREIGN KEY ("closed_by_user_id") REFERENCES "public"."app_users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cash_register_sessions" ADD CONSTRAINT "cash_sessions_branch_tenant_fk" FOREIGN KEY ("company_id","branch_id") REFERENCES "public"."branches"("company_id","id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "commission_adjustments" ADD CONSTRAINT "commission_adjustments_actor_user_id_app_users_id_fk" FOREIGN KEY ("actor_user_id") REFERENCES "public"."app_users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "commission_adjustments" ADD CONSTRAINT "commission_adjustments_run_tenant_fk" FOREIGN KEY ("company_id","run_id") REFERENCES "public"."commission_runs"("company_id","id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "commission_adjustments" ADD CONSTRAINT "commission_adjustments_employee_tenant_fk" FOREIGN KEY ("company_id","employee_id") REFERENCES "public"."employees"("company_id","id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "commission_entries" ADD CONSTRAINT "commission_entries_run_tenant_fk" FOREIGN KEY ("company_id","run_id") REFERENCES "public"."commission_runs"("company_id","id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "commission_entries" ADD CONSTRAINT "commission_entries_employee_tenant_fk" FOREIGN KEY ("company_id","employee_id") REFERENCES "public"."employees"("company_id","id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "commission_entries" ADD CONSTRAINT "commission_entries_sale_tenant_fk" FOREIGN KEY ("company_id","sale_id") REFERENCES "public"."sales"("company_id","id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sale_items" ADD CONSTRAINT "sale_items_tenant_ref_uq" UNIQUE("company_id","id");--> statement-breakpoint
ALTER TABLE "commission_entries" ADD CONSTRAINT "commission_entries_sale_item_tenant_fk" FOREIGN KEY ("company_id","sale_item_id") REFERENCES "public"."sale_items"("company_id","id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "commission_entries" ADD CONSTRAINT "commission_entries_rule_tenant_fk" FOREIGN KEY ("company_id","rule_id") REFERENCES "public"."commission_rules"("company_id","id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "commission_rules" ADD CONSTRAINT "commission_rules_employee_tenant_fk" FOREIGN KEY ("company_id","employee_id") REFERENCES "public"."employees"("company_id","id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "commission_rules" ADD CONSTRAINT "commission_rules_service_tenant_fk" FOREIGN KEY ("company_id","service_id") REFERENCES "public"."services"("company_id","id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "commission_rules" ADD CONSTRAINT "commission_rules_category_tenant_fk" FOREIGN KEY ("company_id","category_id") REFERENCES "public"."service_categories"("company_id","id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "commission_runs" ADD CONSTRAINT "commission_runs_created_by_user_id_app_users_id_fk" FOREIGN KEY ("created_by_user_id") REFERENCES "public"."app_users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "commission_runs" ADD CONSTRAINT "commission_runs_approved_by_user_id_app_users_id_fk" FOREIGN KEY ("approved_by_user_id") REFERENCES "public"."app_users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "commission_runs" ADD CONSTRAINT "commission_runs_branch_tenant_fk" FOREIGN KEY ("company_id","branch_id") REFERENCES "public"."branches"("company_id","id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "gift_card_movements" ADD CONSTRAINT "gift_card_movements_actor_user_id_app_users_id_fk" FOREIGN KEY ("actor_user_id") REFERENCES "public"."app_users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "gift_card_movements" ADD CONSTRAINT "gift_card_movements_card_tenant_fk" FOREIGN KEY ("company_id","gift_card_id") REFERENCES "public"."gift_cards"("company_id","id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "gift_card_movements" ADD CONSTRAINT "gift_card_movements_sale_tenant_fk" FOREIGN KEY ("company_id","sale_id") REFERENCES "public"."sales"("company_id","id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "gift_cards" ADD CONSTRAINT "gift_cards_created_by_user_id_app_users_id_fk" FOREIGN KEY ("created_by_user_id") REFERENCES "public"."app_users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "gift_cards" ADD CONSTRAINT "gift_cards_customer_tenant_fk" FOREIGN KEY ("company_id","customer_id") REFERENCES "public"."customers"("company_id","id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "cash_movements_session_time_idx" ON "cash_movements" USING btree ("company_id","session_id","occurred_at");--> statement-breakpoint
CREATE UNIQUE INDEX "cash_register_sessions_one_open_uidx" ON "cash_register_sessions" USING btree ("company_id","branch_id") WHERE "cash_register_sessions"."status" = 'open';--> statement-breakpoint
CREATE INDEX "cash_register_sessions_branch_time_idx" ON "cash_register_sessions" USING btree ("company_id","branch_id","opened_at");--> statement-breakpoint
CREATE INDEX "commission_adjustments_run_idx" ON "commission_adjustments" USING btree ("company_id","run_id");--> statement-breakpoint
CREATE UNIQUE INDEX "commission_entries_run_item_uidx" ON "commission_entries" USING btree ("run_id","sale_item_id");--> statement-breakpoint
CREATE INDEX "commission_entries_employee_idx" ON "commission_entries" USING btree ("company_id","run_id","employee_id");--> statement-breakpoint
CREATE INDEX "commission_rules_lookup_idx" ON "commission_rules" USING btree ("company_id","status","priority");--> statement-breakpoint
CREATE INDEX "commission_runs_period_idx" ON "commission_runs" USING btree ("company_id","period_from","period_to");--> statement-breakpoint
CREATE INDEX "gift_card_movements_card_time_idx" ON "gift_card_movements" USING btree ("company_id","gift_card_id","occurred_at");--> statement-breakpoint
CREATE UNIQUE INDEX "gift_cards_company_code_uidx" ON "gift_cards" USING btree ("company_id","code");--> statement-breakpoint
CREATE INDEX "gift_cards_company_status_idx" ON "gift_cards" USING btree ("company_id","status");--> statement-breakpoint
ALTER TABLE "sale_payments" ADD CONSTRAINT "sale_payments_gift_card_tenant_fk" FOREIGN KEY ("company_id","gift_card_id") REFERENCES "public"."gift_cards"("company_id","id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sales" ADD CONSTRAINT "sales_cash_session_tenant_fk" FOREIGN KEY ("company_id","cash_session_id") REFERENCES "public"."cash_register_sessions"("company_id","id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sale_payments" ADD CONSTRAINT "sale_payments_gift_card_chk" CHECK (("sale_payments"."method"::text = 'giftcard' and "sale_payments"."gift_card_id" is not null) or ("sale_payments"."method"::text <> 'giftcard' and "sale_payments"."gift_card_id" is null));
