import { randomUUID } from "node:crypto";
import { neon } from "@neondatabase/serverless";

if (process.env.ALLOW_DEMO_SEED !== "true") {
  throw new Error("Define ALLOW_DEMO_SEED=true para autorizar la carga de datos demo");
}
const connectionString = process.env.DATABASE_URL_UNPOOLED ?? process.env.DATABASE_URL;
if (!connectionString) throw new Error("DATABASE_URL_UNPOOLED o DATABASE_URL no está configurada");
const sql = neon(connectionString);
const companyName = process.argv.find((arg) => arg.startsWith("--company="))?.slice(10) || "cuatrocero";

const companies = await sql.query("select id, name, currency, timezone from companies where lower(name)=lower($1) or slug=$1 limit 1", [companyName]);
const company = companies[0];
if (!company) throw new Error(`No se encontró la empresa ${companyName}`);
const branches = await sql.query("select id, name, coalesce(timezone,$2) timezone from branches where company_id=$1 and status='active' order by created_at", [company.id, company.timezone]);
if (!branches.length) throw new Error("La empresa no tiene sucursales activas");
const [actor] = await sql.query("select id from app_users where platform_role='platform_admin' and is_active=true order by created_at limit 1", []);

const categoryId = randomUUID();
await sql.query("insert into service_categories(id,company_id,name,slug,status) values($1,$2,'Servicios demo','servicios-demo','active') on conflict(company_id,slug) do update set name=excluded.name,status='active',updated_at=now()", [categoryId, company.id]);
const [category] = await sql.query("select id from service_categories where company_id=$1 and slug='servicios-demo'", [company.id]);
const serviceDefinitions = [
  ["DEMO-CONSULTA", "Consulta inicial", "Evaluación y plan personalizado", 45, 5, 5, 65000, 1600],
  ["DEMO-SESION", "Sesión estándar", "Servicio general adaptable a cualquier giro", 60, 0, 10, 85000, 1600],
  ["DEMO-PREMIUM", "Experiencia premium", "Atención extendida con preparación", 90, 10, 15, 145000, 1600],
  ["DEMO-EXPRESS", "Servicio express", "Atención breve para clientes recurrentes", 30, 0, 5, 45000, 1600],
];
for (const [code, name, description, duration, preparation, cleanup, price, tax] of serviceDefinitions) {
  await sql.query("insert into services(id,company_id,category_id,code,name,description,duration_minutes,preparation_minutes,cleanup_minutes,price_cents,tax_basis_points,currency,is_public,status) values($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,true,'active') on conflict(company_id,code) do update set category_id=excluded.category_id,name=excluded.name,description=excluded.description,duration_minutes=excluded.duration_minutes,preparation_minutes=excluded.preparation_minutes,cleanup_minutes=excluded.cleanup_minutes,price_cents=excluded.price_cents,tax_basis_points=excluded.tax_basis_points,is_public=true,status='active',updated_at=now()", [randomUUID(), company.id, category.id, code, name, description, duration, preparation, cleanup, price, tax, company.currency]);
}
const services = await sql.query("select id,code,name,duration_minutes+preparation_minutes+cleanup_minutes duration_minutes,price_cents from services where company_id=$1 and code like 'DEMO-%' order by code", [company.id]);
for (const branch of branches) for (const service of services) {
  const premium = service.code === "DEMO-PREMIUM" && branches.indexOf(branch) === 0 ? service.price_cents + 10000 : null;
  await sql.query("insert into service_branches(company_id,service_id,branch_id,is_available,price_override_cents) values($1,$2,$3,true,$4) on conflict(service_id,branch_id) do update set is_available=true,price_override_cents=excluded.price_override_cents,updated_at=now()", [company.id, service.id, branch.id, premium]);
}

const customerDefinitions = [
  ["Ana Demo", "+52 662 100 1001", "ana.demo@multicitapp.test"],
  ["Carlos Demo", "+52 662 100 1002", "carlos.demo@multicitapp.test"],
  ["Mariana Demo", "+52 662 100 1003", "mariana.demo@multicitapp.test"],
  ["Luis Demo", "+52 662 100 1004", "luis.demo@multicitapp.test"],
  ["Sofía Demo", "+52 662 100 1005", "sofia.demo@multicitapp.test"],
  ["Diego Demo", "+52 662 100 1006", "diego.demo@multicitapp.test"],
];
for (const [name, phone, email] of customerDefinitions) {
  const existing = await sql.query("select id from customers where company_id=$1 and email=$2 limit 1", [company.id, email]);
  if (!existing.length) await sql.query("insert into customers(id,company_id,name,phone,email,notes) values($1,$2,$3,$4,$5,'Cliente generado por db:seed:demo')", [randomUUID(), company.id, name, phone, email]);
}
const customers = await sql.query("select id,name from customers where company_id=$1 and email like '%@multicitapp.test' order by name", [company.id]);

for (const branch of branches) {
  await sql.query("insert into weekly_schedules(company_id,branch_id,employee_id,scope,day_of_week,start_minute,end_minute) select $1,$2,null,'branch',day,480,1200 from generate_series(1,6) day where not exists(select 1 from weekly_schedules where company_id=$1 and branch_id=$2 and scope='branch')", [company.id, branch.id]);
  const employees = await sql.query("select e.id,e.name from employees e join employee_branches eb on eb.company_id=e.company_id and eb.employee_id=e.id where e.company_id=$1 and eb.branch_id=$2 and e.status='active' order by e.name", [company.id, branch.id]);
  for (const employee of employees) for (const service of services) await sql.query("insert into employee_services(company_id,employee_id,service_id) values($1,$2,$3) on conflict(employee_id,service_id) do nothing", [company.id, employee.id, service.id]);
  for (const employee of employees) await sql.query("insert into weekly_schedules(company_id,branch_id,employee_id,scope,day_of_week,start_minute,end_minute) select $1,$2,$3,'employee',day,480,1200 from generate_series(1,6) day where not exists(select 1 from weekly_schedules where company_id=$1 and branch_id=$2 and employee_id=$3 and scope='employee')", [company.id, branch.id, employee.id]);

  for (let index = 0; index < Math.min(4, employees.length); index += 1) {
    const employee = employees[index]; const customer = customers[(branches.indexOf(branch) * 4 + index) % customers.length]; const service = services[index % services.length];
    const marker = `[DEMO-SEED] ${branch.id.slice(0, 6)}-${index}`;
    const existing = await sql.query("select id from appointments where company_id=$1 and notes=$2 limit 1", [company.id, marker]);
    if (existing.length) continue;
    const appointmentId = randomUUID(); const hour = 9 + index * 2; const dayOffset = index % 3;
    try {
      const inserted = await sql.query("insert into appointments(id,company_id,branch_id,customer_id,employee_id,created_by_user_id,starts_at,ends_at,status,notes,estimated_total_cents) select $1,$2,$3,$4,$5,$6,((current_date+$7::int)+make_time($8,0,0)) at time zone $9,(((current_date+$7::int)+make_time($8,0,0)) at time zone $9)+($10::text||' minutes')::interval,$11,$12,$13 returning id", [appointmentId, company.id, branch.id, customer.id, employee.id, actor?.id ?? null, dayOffset, hour, branch.timezone, service.duration_minutes, index === 0 ? "waiting" : index === 1 ? "pending" : "confirmed", marker, service.price_cents]);
      if (inserted.length) await sql.query("insert into appointment_services(company_id,appointment_id,service_id,service_name,duration_minutes,price_cents) values($1,$2,$3,$4,$5,$6)", [company.id, appointmentId, service.id, service.name, service.duration_minutes, service.price_cents]);
    } catch { console.warn(`Se omitió una cita demo por conflicto: ${branch.name}/${employee.name}`); }
  }

  await sql.query("insert into cash_register_sessions(id,company_id,branch_id,opened_by_user_id,status,opening_balance_cents,opening_notes) select $1,$2,$3,$4,'open',200000,'Caja demo' where not exists(select 1 from cash_register_sessions where company_id=$2 and branch_id=$3 and status='open')", [randomUUID(), company.id, branch.id, actor?.id ?? null]);
  const [session] = await sql.query("select id from cash_register_sessions where company_id=$1 and branch_id=$2 and status='open' limit 1", [company.id, branch.id]);
  const folio = `DEMO-${branch.id.slice(0, 8).toUpperCase()}`; const [existingSale] = await sql.query("select id from sales where company_id=$1 and folio=$2 limit 1", [company.id, folio]);
  if (!existingSale && employees.length && services.length && customers.length) {
    const saleId = randomUUID(); const service = services[branches.indexOf(branch) % services.length]; const employee = employees[0]; const customer = customers[branches.indexOf(branch) % customers.length]; const tax = Math.round(service.price_cents * 0.16); const total = service.price_cents + tax;
    await sql.query("insert into sales(id,company_id,branch_id,customer_id,cash_session_id,created_by_user_id,folio,status,subtotal_cents,discount_cents,tax_cents,total_cents,paid_cents,change_cents,currency,notes) values($1,$2,$3,$4,$5,$6,$7,'completed',$8,0,$9,$10,$10,0,$11,'Venta de demostración')", [saleId, company.id, branch.id, customer.id, session.id, actor?.id ?? null, folio, service.price_cents, tax, total, company.currency]);
    await sql.query("insert into sale_items(company_id,sale_id,service_id,employee_id,service_code,service_name,employee_name,quantity,unit_price_cents,line_total_cents) values($1,$2,$3,$4,$5,$6,$7,1,$8,$8)", [company.id, saleId, service.id, employee.id, service.code, service.name, employee.name, service.price_cents]);
    await sql.query("insert into sale_payments(company_id,sale_id,method,amount_cents,reference) values($1,$2,'card',$3,'DEMO')", [company.id, saleId, total]);
    await sql.query("insert into cash_movements(company_id,session_id,sale_id,actor_user_id,type,method,amount_cents,category,reason) values($1,$2,$3,$4,'sale','card',$5,'Venta demo',$6)", [company.id, session.id, saleId, actor?.id ?? null, total, folio]);
  }
}

for (let index = 0; index < 3; index += 1) {
  const customer = customers[index % customers.length]; const code = `DEMO-GC-${String(index + 1).padStart(3, "0")}`; const balance = [50000, 100000, 150000][index];
  await sql.query("insert into gift_cards(id,company_id,customer_id,created_by_user_id,code,initial_balance_cents,balance_cents,currency,status,expires_on,notes) values($1,$2,$3,$4,$5,$6,$6,$7,'active',current_date+interval '1 year','Gift card de demostración') on conflict(company_id,code) do update set customer_id=excluded.customer_id,balance_cents=excluded.balance_cents,status='active',expires_on=excluded.expires_on,updated_at=now()", [randomUUID(), company.id, customer.id, actor?.id ?? null, code, balance, company.currency]);
}

const [demoRule] = await sql.query("select id from commission_rules where company_id=$1 and name='Comisión demo 12%' limit 1", [company.id]);
if (!demoRule) await sql.query("insert into commission_rules(id,company_id,name,rate_basis_points,fixed_cents,priority,status) values($1,$2,'Comisión demo 12%',1200,0,10,'active')", [randomUUID(), company.id]);

console.log(JSON.stringify({ company: company.name, branches: branches.length, services: services.length, customers: customers.length, appointmentsPerBranch: 4, salesPerBranch: 1, giftCards: 3, result: "Datos demo listos" }, null, 2));
