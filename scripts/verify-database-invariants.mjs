import { randomUUID } from "node:crypto";
import { neon } from "@neondatabase/serverless";

if (process.env.ALLOW_DB_INVARIANT_TEST !== "true") throw new Error("Define ALLOW_DB_INVARIANT_TEST=true para ejecutar esta prueba temporal");
const connectionString = process.env.DATABASE_URL_UNPOOLED ?? process.env.DATABASE_URL;
if (!connectionString) throw new Error("No hay conexión de base de datos configurada");
const sql = neon(connectionString); const marker = `[INVARIANT-TEST] ${randomUUID()}`;
const [scope] = await sql.query("select c.id company_id,b.id branch_id,e.id employee_id,cu.id customer_id from companies c join branches b on b.company_id=c.id join employee_branches eb on eb.company_id=c.id and eb.branch_id=b.id join employees e on e.company_id=c.id and e.id=eb.employee_id join customers cu on cu.company_id=c.id where c.status='active' and b.status='active' and e.status='active' limit 1", []);
if (!scope) throw new Error("Se necesitan empresa, sucursal, empleado y cliente para la prueba");

const insert = (id) => sql.query("insert into appointments(id,company_id,branch_id,customer_id,employee_id,starts_at,ends_at,status,notes,estimated_total_cents) values($1,$2,$3,$4,$5,'2099-01-15T16:00:00Z','2099-01-15T17:00:00Z','confirmed',$6,0)", [id, scope.company_id, scope.branch_id, scope.customer_id, scope.employee_id, marker]);
const concurrency = await Promise.allSettled([insert(randomUUID()), insert(randomUUID())]);
const successes = concurrency.filter((result) => result.status === "fulfilled").length; const conflicts = concurrency.filter((result) => result.status === "rejected").length;
await sql.query("delete from appointments where company_id=$1 and notes=$2", [scope.company_id, marker]);
if (successes !== 1 || conflicts !== 1) throw new Error(`La exclusión de traslapes falló: éxitos=${successes}, conflictos=${conflicts}`);

let isolationRejected = false;
try {
  await sql.query("insert into appointments(id,company_id,branch_id,customer_id,employee_id,starts_at,ends_at,status,notes,estimated_total_cents) values($1,$2,$3,$4,$5,'2099-01-16T16:00:00Z','2099-01-16T17:00:00Z','confirmed',$6,0)", [randomUUID(), randomUUID(), scope.branch_id, scope.customer_id, scope.employee_id, marker]);
} catch { isolationRejected = true; }
if (!isolationRejected) throw new Error("Las claves tenant permitieron mezclar datos entre empresas");
console.log(JSON.stringify({ concurrentBooking: "rejected", crossTenantWrite: "rejected", cleanup: "complete" }, null, 2));
