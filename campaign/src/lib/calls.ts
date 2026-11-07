import { sql } from "./db";

const STATUS_FROM_OUTCOME: Record<string, string> = {
  connected: "contacted",
  voicemail: "contacted",
  interested: "interested",
  callback: "callback",
  registered: "registered",
  converted: "converted",
  not_interested: "not_interested",
};

export async function logCall(input: {
  customerId: number;
  callerId: string;
  outcome: string;
  notes?: string;
  durationSeconds?: number;
}): Promise<void> {
  await sql(
    `insert into call_logs (customer_id, caller_id, called_at, outcome, duration_seconds, notes, next_follow_up)
     values ($1, $2, now(), $3, $4, $5, case when $3 = 'callback' then (now()::date + 1) else null end)`,
    [input.customerId, input.callerId, input.outcome, input.durationSeconds ?? null, input.notes ?? null],
  );

  const nextStatus = STATUS_FROM_OUTCOME[input.outcome];
  if (nextStatus) {
    await sql(
      `update customers
          set status = $1,
              assigned_caller_id = $2,
              last_contacted_at = now()
        where id = $3 and status <> 'converted'`,
      [nextStatus, input.callerId, input.customerId],
    );
  } else {
    await sql("update customers set last_contacted_at = now(), assigned_caller_id = $1 where id = $2", [
      input.callerId,
      input.customerId,
    ]);
  }

  await sql(
    `update allocations
        set status = 'called'
      where customer_id = $1 and allocation_date = (now() at time zone 'Asia/Dubai')::date`,
    [input.customerId],
  );

  if (input.outcome === "converted") {
    const existing = await sql<{ n: number }>(
      "select count(*)::int as n from conversions where customer_id = $1",
      [input.customerId],
    );
    if ((existing[0]?.n ?? 0) === 0) {
      await sql(
        `insert into conversions (customer_id, service_line, value_aed, notes)
         values ($1, 'E-invoicing advisory', 25000, $2)`,
        [input.customerId, input.notes ?? "Converted from calling desk"],
      );
    }
  }

  if (input.outcome === "registered") {
    const already = await sql<{ n: number }>(
      "select count(*)::int as n from event_registrations where customer_id = $1 and event_id = 'webinar-1'",
      [input.customerId],
    );
    if ((already[0]?.n ?? 0) === 0) {
      await sql("insert into event_registrations (event_id, customer_id, attendees) values ('webinar-1', $1, 1)", [
        input.customerId,
      ]);
    }
  }
}
