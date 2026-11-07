import { StatusPill } from "@/components/StatusPill";
import { formatDateTime } from "@/lib/constants";
import { getOverview } from "@/lib/queries";

export default async function EventsPage() {
  const { events } = await getOverview();
  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-semibold text-navy">Events</h1>
        <p className="text-sm text-muted">Two webinars and one business breakfast. Registrations come from the calling desk and the public registration website.</p>
      </div>
      <div className="grid gap-4 lg:grid-cols-3">
        {events.map((event) => {
          const pct = Math.round((event.registered / event.capacity) * 100);
          return (
            <article key={event.id} className="rounded-xl border border-line bg-white p-4">
              <div className="flex items-start justify-between gap-2">
                <h2 className="font-semibold text-navy">{event.name}</h2>
                <StatusPill value={event.type} />
              </div>
              <p className="mt-2 text-sm text-muted">{formatDateTime(event.event_date)}</p>
              <p className="text-sm text-muted">{event.venue}</p>
              <div className="mt-4 h-2 overflow-hidden rounded-full bg-line">
                <div className="h-full bg-teal" style={{ width: `${Math.min(100, pct)}%` }} />
              </div>
              <p className="mt-2 text-sm">
                <span className="font-semibold text-navy">{event.registered}</span>
                <span className="text-muted"> / {event.capacity} registered ({pct}%)</span>
              </p>
            </article>
          );
        })}
      </div>
    </div>
  );
}
