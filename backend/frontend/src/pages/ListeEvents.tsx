import React, { useEffect, useMemo, useState } from "react";
import { TabView, TabPanel } from "primereact/tabview";
import { Link } from "react-router-dom";

const API = "http://localhost:8080/api";

interface EventType {
  id: number;
  name: string;
}

interface CalendarEvent {
  id: number;
  title: string;
  startDate: string;
  endDate: string;
  place?: string;
  cibles?: string[];
  montantTotal?: number;
}

interface TypeStat {
  typeId: number;
  typeName: string;
  count: number;
  montantTotal: number;
}

interface Stats {
  totalEvents: number;
  totalMontant: number;
  types: TypeStat[];
}

const CIBLE_LABELS: Record<string, string> = {
  MERE: "أم",
  ENFANT: "طفل",
  FAMILLE: "عائلة",
};

const formatMoney = (n: number | undefined | null) =>
  `${Number(n || 0).toLocaleString("fr-FR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })} DH`;

const currentYear = new Date().getFullYear();
const YEARS = Array.from({ length: 6 }, (_, i) => String(currentYear - i));

const ListeEvents: React.FC = () => {
  const [eventTypes, setEventTypes] = useState<EventType[]>([]);
  const [eventsByType, setEventsByType] = useState<Record<number, CalendarEvent[]>>({});
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string>("");
  const [selectedYear, setSelectedYear] = useState<string>(String(currentYear));

  // 1) Types d'événements (une seule fois)
  useEffect(() => {
    fetch(`${API}/events/event-types`)
      .then((res) => {
        if (!res.ok) throw new Error("event-types");
        return res.json();
      })
      .then((data) => setEventTypes(Array.isArray(data) ? data : []))
      .catch(() => setError("تعذر تحميل أنواع الأنشطة"));
  }, []);

  // 2) Événements + statistiques à chaque changement d'année ou de types
  useEffect(() => {
    if (eventTypes.length === 0) return;

    let cancelled = false;
    setLoading(true);
    setError("");

    const loadEvents = Promise.all(
      eventTypes.map((t) =>
        fetch(`${API}/events/by-type/${t.id}?year=${selectedYear}`)
          .then((res) => (res.ok ? res.json() : []))
          .then((data) => [t.id, Array.isArray(data) ? data : []] as const)
          .catch(() => [t.id, []] as const)
      )
    );

    const loadStats = fetch(`${API}/events/stats?year=${selectedYear}`)
      .then((res) => (res.ok ? res.json() : null))
      .catch(() => null);

    Promise.all([loadEvents, loadStats])
      .then(([entries, statsData]) => {
        if (cancelled) return;
        setEventsByType(Object.fromEntries(entries));
        setStats(statsData);
        if (!statsData) setError("تعذر تحميل الإحصائيات");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    // évite qu'une ancienne réponse écrase la nouvelle
    return () => {
      cancelled = true;
    };
  }, [eventTypes, selectedYear]);

  // Lignes de stats : tous les types, même ceux à 0
  const rows = useMemo(
    () =>
      eventTypes.map((t) => {
        const s = stats?.types.find((x) => x.typeId === t.id);
        return {
          typeId: t.id,
          typeName: t.name,
          count: s?.count ?? 0,
          montantTotal: Number(s?.montantTotal ?? 0),
        };
      }),
    [eventTypes, stats]
  );

  const totalMontant = Number(stats?.totalMontant ?? 0);
  const totalEvents = stats?.totalEvents ?? 0;
  const maxMontant = Math.max(...rows.map((r) => r.montantTotal), 1);

  return (
    <div className="etudes-table" dir="rtl">
      <div className="mb-6 rounded-xl border border-gray-200 bg-white p-6 shadow-md dark:border-gray-700 dark:bg-gray-900">
        <h1 className="mb-1 text-3xl font-bold text-gray-800 dark:text-white">
          قائمة الانشطة
        </h1>
        <p className="text-gray-500 dark:text-gray-400">
          عرض الأنشطة حسب النوع والسنة مع الإحصائيات والمبالغ المصروفة.
        </p>
      </div>

      <div className="p-6">
        {/* FILTRE ANNEE */}
        <div className="mb-4 flex items-center gap-2">
          <label className="font-semibold">السنة:</label>
          <select
            value={selectedYear}
            onChange={(e) => setSelectedYear(e.target.value)}
            className="rounded border px-3 py-1"
          >
            {YEARS.map((y) => (
              <option key={y} value={y}>
                {y}
              </option>
            ))}
          </select>
        </div>

        {error && (
          <p className="mb-4 rounded-lg bg-red-50 px-4 py-2 text-sm text-red-600">
            {error}
          </p>
        )}

        <div className="card">
          <TabView>
            {/* ================= ONGLET STATISTIQUES ================= */}
            <TabPanel header="📊 الإحصائيات">
              {loading ? (
                <p>جاري التحميل...</p>
              ) : (
                <div className="space-y-6">
                  {/* Cartes globales */}
                  <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                    <div className="rounded-xl border bg-blue-50 p-5">
                      <p className="text-sm text-gray-500">السنة</p>
                      <p className="text-2xl font-bold text-blue-700">{selectedYear}</p>
                    </div>
                    <div className="rounded-xl border bg-indigo-50 p-5">
                      <p className="text-sm text-gray-500">عدد الأنشطة</p>
                      <p className="text-2xl font-bold text-indigo-700">{totalEvents}</p>
                    </div>
                    <div className="rounded-xl border bg-green-50 p-5">
                      <p className="text-sm text-gray-500">المبلغ الإجمالي المصروف</p>
                      <p className="text-2xl font-bold text-green-700">
                        {formatMoney(totalMontant)}
                      </p>
                    </div>
                  </div>

                  {/* Détail par type */}
                  <div className="overflow-x-auto">
                    <table className="min-w-full border border-gray-300 text-right text-sm">
                      <thead className="bg-gray-100 font-semibold text-gray-800">
                        <tr>
                          <th className="border p-3">نوع النشاط</th>
                          <th className="border p-3">عدد الأنشطة</th>
                          <th className="border p-3">المبلغ المصروف</th>
                          <th className="border p-3">النسبة</th>
                        </tr>
                      </thead>
                      <tbody>
                        {rows.map((r) => {
                          const pct = totalMontant > 0 ? (r.montantTotal / totalMontant) * 100 : 0;
                          return (
                            <tr key={r.typeId} className="border-b">
                              <td className="border p-3 font-semibold">{r.typeName}</td>
                              <td className="border p-3 text-center">{r.count}</td>
                              <td className="border p-3">
                                <div className="mb-1 font-semibold text-green-700">
                                  {formatMoney(r.montantTotal)}
                                </div>
                                <div className="h-2 w-full overflow-hidden rounded bg-gray-100">
                                  <div
                                    className="h-2 rounded bg-green-500"
                                    style={{ width: `${(r.montantTotal / maxMontant) * 100}%` }}
                                  />
                                </div>
                              </td>
                              <td className="border p-3 text-center">{pct.toFixed(1)}%</td>
                            </tr>
                          );
                        })}
                      </tbody>
                      <tfoot className="bg-green-50 font-bold">
                        <tr>
                          <td className="border p-3">المجموع</td>
                          <td className="border p-3 text-center">{totalEvents}</td>
                          <td className="border p-3 text-green-700">{formatMoney(totalMontant)}</td>
                          <td className="border p-3 text-center">100%</td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                </div>
              )}
            </TabPanel>

            {/* ================= ONGLETS PAR TYPE ================= */}
            {eventTypes.map((t) => {
              const list = eventsByType[t.id] || [];
              const total = list.reduce((s, e) => s + Number(e.montantTotal || 0), 0);

              return (
                <TabPanel key={t.id} header={`${t.name} (${list.length})`}>
                  {loading && <p>جاري التحميل...</p>}

                  {!loading && list.length === 0 && (
                    <p>لا توجد أنشطة لهذه السنة وهذا النوع.</p>
                  )}

                  {!loading && list.length > 0 && (
                    <>
                      <p className="mb-4 font-semibold text-green-700">
                        المبلغ المصروف في هذا النوع: {formatMoney(total)}
                      </p>

                      <div className="space-y-4">
                        {list.map((ev) => (
                          <Link to={`/event-details/${ev.id}`} key={ev.id}>
                            <div className="mb-4 cursor-pointer rounded-lg border bg-white p-4 shadow hover:bg-gray-100">
                              <h3 className="text-lg font-bold">{ev.title}</h3>
                              <div className="mt-1 flex flex-wrap gap-x-6 gap-y-1 text-sm text-gray-600">
                                <p>
                                  الفئة:{" "}
                                  {(ev.cibles || []).map((c) => CIBLE_LABELS[c] || c).join("، ") || "-"}
                                </p>
                                <p>البداية: {ev.startDate}</p>
                                <p>النهاية: {ev.endDate}</p>
                                <p className="font-semibold text-green-700">
                                  المبلغ: {formatMoney(ev.montantTotal)}
                                </p>
                              </div>
                            </div>
                          </Link>
                        ))}
                      </div>
                    </>
                  )}
                </TabPanel>
              );
            })}
          </TabView>
        </div>
      </div>
    </div>
  );
};

export default ListeEvents;