import React, { useEffect, useMemo, useState } from "react";
import { TabView, TabPanel } from "primereact/tabview";
import { Link, useNavigate } from "react-router-dom";
import { ORGANISATEURS, Organisateur, organisateurCls, organisateurLabel, organisateurOf } from "../lib/organisateur";
import ExportButtons from "../components/common/ExportButtons";
import type { TableExport } from "../lib/exportTable";

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
  anneeScolaire?: string;

  // ============================================================
  // CATÉGORIES FINANCIÈRES
  // ============================================================
  sawaedAlKhayr?: boolean;
  montantDegresDefinis?: number;
  montantMouawiz?: number;
  montantSawaedAlKhayr?: number;
  montantNonVentile?: number;
  caisseNom?: string | null;
  caisseChargeNom?: string | null;
  organisateur?: string;
}

interface TypeStat {
  typeId: number;
  typeName: string;
  count: number;
  montantDegresDefinis: number;
  montantMouawiz: number;
  montantSawaedAlKhayr: number;
  montantNonVentile: number;
}

interface Stats {
  anneeScolaire?: string;
  totalEvents: number;

  // IMPORTANT :
  // on garde quatre montants séparés.
  totalMontantDegresDefinis: number;
  totalMontantMouawiz: number;
  totalMontantSawaedAlKhayr: number;
  totalMontantNonVentile: number;

  types: TypeStat[];
}

const CIBLE_LABELS: Record<string, string> = {
  MERE: "أم",
  ENFANT: "طفل",
  FAMILLE: "عائلة",
};

const TYPE_TONES = [
  {
    bg: "bg-indigo-50 dark:bg-indigo-500/10",
    text: "text-indigo-700 dark:text-indigo-300",
    border: "border-indigo-200 dark:border-indigo-500/20",
    dot: "bg-indigo-500",
  },
  {
    bg: "bg-emerald-50 dark:bg-emerald-500/10",
    text: "text-emerald-700 dark:text-emerald-300",
    border: "border-emerald-200 dark:border-emerald-500/20",
    dot: "bg-emerald-500",
  },
  {
    bg: "bg-amber-50 dark:bg-amber-500/10",
    text: "text-amber-700 dark:text-amber-300",
    border: "border-amber-200 dark:border-amber-500/20",
    dot: "bg-amber-500",
  },
  {
    bg: "bg-rose-50 dark:bg-rose-500/10",
    text: "text-rose-700 dark:text-rose-300",
    border: "border-rose-200 dark:border-rose-500/20",
    dot: "bg-rose-500",
  },
];

type MoneyTone = "defined" | "mouawiz" | "sawaed" | "unallocated";

const MONEY_TONES: Record<
  MoneyTone,
  {
    card: string;
    label: string;
    value: string;
    dot: string;
    soft: string;
  }
> = {
  defined: {
    card: "border-blue-200 bg-blue-50 dark:border-blue-500/20 dark:bg-blue-500/10",
    label: "text-blue-700 dark:text-blue-300",
    value: "text-blue-900 dark:text-blue-100",
    dot: "bg-blue-500",
    soft: "bg-blue-100 text-blue-700 dark:bg-blue-500/20 dark:text-blue-300",
  },
  mouawiz: {
    card: "border-orange-200 bg-orange-50 dark:border-orange-500/20 dark:bg-orange-500/10",
    label: "text-orange-700 dark:text-orange-300",
    value: "text-orange-900 dark:text-orange-100",
    dot: "bg-orange-500",
    soft: "bg-orange-100 text-orange-700 dark:bg-orange-500/20 dark:text-orange-300",
  },
  sawaed: {
    card: "border-violet-200 bg-violet-50 dark:border-violet-500/20 dark:bg-violet-500/10",
    label: "text-violet-700 dark:text-violet-300",
    value: "text-violet-900 dark:text-violet-100",
    dot: "bg-violet-500",
    soft: "bg-violet-100 text-violet-700 dark:bg-violet-500/20 dark:text-violet-300",
  },
  unallocated: {
    card: "border-slate-200 bg-slate-50 dark:border-slate-700 dark:bg-slate-800/70",
    label: "text-slate-600 dark:text-slate-300",
    value: "text-slate-900 dark:text-white",
    dot: "bg-slate-400",
    soft: "bg-slate-200 text-slate-700 dark:bg-slate-700 dark:text-slate-200",
  },
};

const formatMoney = (n: number | undefined | null) =>
  `${Number(n || 0).toLocaleString("fr-FR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })} DH`;

const formatDate = (value?: string) => {
  if (!value) return "-";

  const date = new Date(`${value}T00:00:00`);

  if (Number.isNaN(date.getTime())) return value;

  return new Intl.DateTimeFormat("ar-MA", {
    year: "numeric",
    month: "short",
    day: "numeric",
  }).format(date);
};

const numberValue = (value: unknown) => Number(value ?? 0) || 0;

const now = new Date();
const currentCalendarYear = now.getFullYear();
const currentMonth = now.getMonth();

const currentSchoolStartYear =
  currentMonth >= 8 ? currentCalendarYear : currentCalendarYear - 1;

const CURRENT_SCHOOL_YEAR =
  `${currentSchoolStartYear}/${currentSchoolStartYear + 1}`;

const SCHOOL_YEARS = Array.from({ length: 8 }, (_, i) => {
  const start = currentSchoolStartYear - i;
  return `${start}/${start + 1}`;
});

// ============================================================================
// PETITES COMPOSANTES D'AFFICHAGE FINANCIER
// ============================================================================

const MoneySummaryCard: React.FC<{
  title: string;
  subtitle: string;
  value: number;
  tone: MoneyTone;
  loading?: boolean;
}> = ({ title, subtitle, value, tone, loading = false }) => {
  const style = MONEY_TONES[tone];

  return (
    <div className={`rounded-2xl border p-5 shadow-sm ${style.card}`}>
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className={`text-xs font-black ${style.label}`}>{title}</p>

          <p className={`mt-2 text-xl font-black ${style.value}`}>
            {loading ? "—" : formatMoney(value)}
          </p>

          <p className="mt-1 text-[11px] font-bold text-slate-400">
            {subtitle}
          </p>
        </div>

        <span
          className={`mt-1 h-3 w-3 shrink-0 rounded-full ${style.dot}`}
        />
      </div>
    </div>
  );
};

const MoneyLine: React.FC<{
  label: string;
  value: number;
  tone: MoneyTone;
  compact?: boolean;
}> = ({ label, value, tone, compact = false }) => {
  const style = MONEY_TONES[tone];

  return (
    <div
      className={`flex items-center justify-between gap-4 rounded-xl border ${
        compact ? "px-3 py-2.5" : "px-4 py-3"
      } ${style.card}`}
    >
      <div className="flex min-w-0 items-center gap-2">
        <span className={`h-2 w-2 shrink-0 rounded-full ${style.dot}`} />
        <span className={`truncate text-xs font-black ${style.label}`}>
          {label}
        </span>
      </div>

      <span className={`shrink-0 text-sm font-black ${style.value}`}>
        {formatMoney(value)}
      </span>
    </div>
  );
};

const EventFinancialBreakdown: React.FC<{
  event: CalendarEvent;
}> = ({ event }) => {
  const defined = numberValue(event.montantDegresDefinis);
  const mouawiz = numberValue(event.montantMouawiz);
  const sawaed = numberValue(event.montantSawaedAlKhayr);
  const unallocated = numberValue(event.montantNonVentile);
  const total = defined + mouawiz + sawaed + unallocated;

  const chips: { label: string; value: number; cls: string }[] = event.caisseNom
    ? [{ label: event.caisseNom, value: total, cls: "bg-emerald-50 text-emerald-700" }]
    : [
        { label: "الأيتام", value: defined, cls: "bg-blue-50 text-blue-700" },
        { label: "المعوز", value: mouawiz, cls: "bg-orange-50 text-orange-700" },
        { label: "سواعد الخير", value: sawaed, cls: "bg-violet-50 text-violet-700" },
        { label: "غير موزع", value: unallocated, cls: "bg-amber-50 text-amber-700" },
      ].filter((c) => c.value > 0);

  return (
    <div className="flex flex-wrap items-center justify-between gap-2">
      <span className="text-lg font-black text-slate-900 dark:text-white">{formatMoney(total)}</span>
      <div className="flex flex-wrap gap-1.5">
        {chips.length === 0 ? (
          <span className="text-[11px] font-bold text-slate-400">لا توجد مصاريف بعد</span>
        ) : (
          chips.map((c) => (
            <span key={c.label} className={`rounded-full px-2.5 py-1 text-[11px] font-black ${c.cls}`}>
              {c.label}: {formatMoney(c.value)}
            </span>
          ))
        )}
      </div>
    </div>
  );
};

// ============================================================================
// PAGE
// ============================================================================

const ListeEvents: React.FC = () => {
  const navigate = useNavigate();

  const [eventTypes, setEventTypes] = useState<EventType[]>([]);

  const [eventsByType, setEventsByType] = useState<
    Record<number, CalendarEvent[]>
  >({});

  const [stats, setStats] = useState<Stats | null>(null);

  const [loading, setLoading] = useState<boolean>(false);

  const [error, setError] = useState<string>("");

  // "" = tous les organisateurs
  const [organisateurFilter, setOrganisateurFilter] = useState<Organisateur | "">("");

  const [selectedAnneeScolaire, setSelectedAnneeScolaire] =
    useState<string>(CURRENT_SCHOOL_YEAR);

  // ==========================================================================
  // TYPES D'ACTIVITÉS
  // ==========================================================================

  useEffect(() => {
    fetch(`${API}/events/event-types`)
      .then((res) => {
        if (!res.ok) {
          throw new Error("event-types");
        }

        return res.json();
      })
      .then((data) => {
        setEventTypes(Array.isArray(data) ? data : []);
      })
      .catch((err) => {
        console.error("Erreur chargement types :", err);
        setError("تعذر تحميل أنواع الأنشطة");
      });
  }, []);

  // ==========================================================================
  // ÉVÉNEMENTS + STATISTIQUES
  // ==========================================================================

  useEffect(() => {
    if (eventTypes.length === 0) {
      return;
    }

    let cancelled = false;

    setLoading(true);
    setError("");

    const encodedAnneeScolaire =
      encodeURIComponent(selectedAnneeScolaire);

    const loadEvents = Promise.all(
      eventTypes.map((type) =>
        fetch(
          `${API}/events/by-type/${type.id}?anneeScolaire=${encodedAnneeScolaire}`
        )
          .then((res) => {
            if (!res.ok) {
              throw new Error(
                `Erreur événements du type ${type.id}`
              );
            }

            return res.json();
          })
          .then((data) => {
            const normalized: CalendarEvent[] =
              (Array.isArray(data) ? data : []).map((event: any) => ({
                ...event,
                sawaedAlKhayr: Boolean(event.sawaedAlKhayr),
                montantDegresDefinis:
                  numberValue(event.montantDegresDefinis),
                montantMouawiz:
                  numberValue(event.montantMouawiz),
                montantSawaedAlKhayr:
                  numberValue(event.montantSawaedAlKhayr),
                montantNonVentile:
                  numberValue(event.montantNonVentile),
              }));

            return [type.id, normalized] as const;
          })
          .catch((err) => {
            console.error(err);
            return [type.id, []] as const;
          })
      )
    );

    const loadStats = fetch(
      `${API}/events/stats?anneeScolaire=${encodedAnneeScolaire}`
    )
      .then((res) => {
        if (!res.ok) {
          throw new Error("Erreur statistiques");
        }

        return res.json();
      })
      .then((data) => {
        if (!data) return null;

        const normalized: Stats = {
          anneeScolaire: data.anneeScolaire,
          totalEvents: numberValue(data.totalEvents),
          totalMontantDegresDefinis:
            numberValue(data.totalMontantDegresDefinis),
          totalMontantMouawiz:
            numberValue(data.totalMontantMouawiz),
          totalMontantSawaedAlKhayr:
            numberValue(data.totalMontantSawaedAlKhayr),
          totalMontantNonVentile:
            numberValue(data.totalMontantNonVentile),
          types: Array.isArray(data.types)
            ? data.types.map((item: any) => ({
                typeId: numberValue(item.typeId),
                typeName: String(item.typeName ?? ""),
                count: numberValue(item.count),
                montantDegresDefinis:
                  numberValue(item.montantDegresDefinis),
                montantMouawiz:
                  numberValue(item.montantMouawiz),
                montantSawaedAlKhayr:
                  numberValue(item.montantSawaedAlKhayr),
                montantNonVentile:
                  numberValue(item.montantNonVentile),
              }))
            : [],
        };

        return normalized;
      })
      .catch((err) => {
        console.error(err);
        return null;
      });

    Promise.all([loadEvents, loadStats])
      .then(([entries, statsData]) => {
        if (cancelled) {
          return;
        }

        setEventsByType(
          Object.fromEntries(entries) as Record<
            number,
            CalendarEvent[]
          >
        );

        setStats(statsData);

        if (!statsData) {
          setError("تعذر تحميل الإحصائيات");
        }
      })
      .finally(() => {
        if (!cancelled) {
          setLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [eventTypes, selectedAnneeScolaire]);

  // ==========================================================================
  // DONNÉES CALCULÉES
  // ==========================================================================

  const rows = useMemo(
    () =>
      eventTypes.map((type) => {
        const stat = stats?.types?.find(
          (item) => item.typeId === type.id
        );

        return {
          typeId: type.id,
          typeName: type.name,
          count: numberValue(stat?.count),

          // IMPORTANT :
          // aucun montant global mélangé.
          montantDegresDefinis:
            numberValue(stat?.montantDegresDefinis),

          montantMouawiz:
            numberValue(stat?.montantMouawiz),

          montantSawaedAlKhayr:
            numberValue(stat?.montantSawaedAlKhayr),

          montantNonVentile:
            numberValue(stat?.montantNonVentile),
        };
      }),
    [eventTypes, stats]
  );

  const totalEvents =
    numberValue(stats?.totalEvents);

  const totalMontantDegresDefinis =
    numberValue(stats?.totalMontantDegresDefinis);

  const totalMontantMouawiz =
    numberValue(stats?.totalMontantMouawiz);

  const totalMontantSawaedAlKhayr =
    numberValue(stats?.totalMontantSawaedAlKhayr);

  const totalMontantNonVentile =
    numberValue(stats?.totalMontantNonVentile);

  const allEvents = useMemo(
    () => Object.values(eventsByType).flat(),
    [eventsByType]
  );

  const getTone = (index: number) =>
    TYPE_TONES[index % TYPE_TONES.length];

  // Export : activités affichées (année + organisateur choisis)
  const buildExport = (): TableExport => {
    const rows = eventTypes.flatMap((type) =>
      (eventsByType[type.id] || [])
        .filter((e) => !organisateurFilter || organisateurOf(e.organisateur) === organisateurFilter)
        .map((e) => {
          const total =
            numberValue(e.montantDegresDefinis) +
            numberValue(e.montantMouawiz) +
            numberValue(e.montantSawaedAlKhayr) +
            numberValue(e.montantNonVentile);
          return [
            e.title,
            type.name,
            organisateurLabel(e.organisateur),
            e.endDate && e.endDate !== e.startDate ? `${e.startDate} ← ${e.endDate}` : e.startDate,
            e.place || "",
            (e.cibles || []).map((c) => CIBLE_LABELS[c] || c).join("، "),
            e.caisseNom || (e.sawaedAlKhayr ? "سواعد الخير" : "توزيع تلقائي"),
            total,
          ];
        })
    );
    const total = rows.reduce((a, r) => a + Number(r[7] || 0), 0);
    const orgLabel = ORGANISATEURS.find((o) => o.value === organisateurFilter)?.label;
    return {
      kind: "لائحة الأنشطة",
      title: `الأنشطة — ${selectedAnneeScolaire}`,
      chips: [`السنة الدراسية: ${selectedAnneeScolaire}`, `الجهة المنظمة: ${orgLabel || "الكل"}`],
      summary: [
        { label: "عدد الأنشطة", value: String(rows.length), tone: "blue" },
        { label: "مجموع المصاريف", value: formatMoney(total), tone: "green" },
      ],
      sections: [
        {
          title: "الأنشطة",
          columns: [
            { label: "النشاط", align: "start" },
            { label: "النوع" },
            { label: "الجهة المنظمة" },
            { label: "التاريخ" },
            { label: "المكان" },
            { label: "الفئة" },
            { label: "الصندوق" },
            { label: "المبلغ", money: true, numeric: true },
          ],
          rows,
          totals: ["المجموع", "", "", "", "", "", "", total],
        },
      ],
      fileName: `الأنشطة_${selectedAnneeScolaire.replace("/", "-")}`,
      orientation: "landscape",
    };
  };

  // ==========================================================================
  // UI
  // ==========================================================================

  return (
    <>
      <style>{`
        .events-tabs .p-tabview-nav {
          gap: 8px;
          border: 0 !important;
          background: transparent !important;
          padding: 0;
          flex-wrap: wrap;
        }

        .events-tabs .p-tabview-nav li {
          margin: 0 !important;
        }

        .events-tabs .p-tabview-nav li .p-tabview-nav-link {
          border: 1px solid #e2e8f0 !important;
          background: #ffffff !important;
          border-radius: 12px !important;
          padding: 0.8rem 1rem !important;
          color: #64748b !important;
          font-size: 0.82rem;
          font-weight: 800;
          box-shadow: none !important;
          transition: all 180ms ease !important;
        }

        .events-tabs .p-tabview-nav li .p-tabview-nav-link:hover {
          background: #f8fafc !important;
          border-color: #cbd5e1 !important;
          color: #334155 !important;
        }

        .events-tabs .p-tabview-nav li.p-highlight .p-tabview-nav-link {
          background: #eef2ff !important;
          border-color: #a5b4fc !important;
          color: #4f46e5 !important;
        }

        .events-tabs .p-tabview-panels {
          background: transparent !important;
          padding: 1.5rem 0 0 !important;
        }

        .dark .events-tabs .p-tabview-nav li .p-tabview-nav-link {
          background: #111827 !important;
          border-color: #334155 !important;
          color: #cbd5e1 !important;
        }

        .dark .events-tabs .p-tabview-nav li .p-tabview-nav-link:hover {
          background: #1e293b !important;
          border-color: #475569 !important;
          color: #f8fafc !important;
        }

        .dark .events-tabs .p-tabview-nav li.p-highlight .p-tabview-nav-link {
          background: rgba(79, 70, 229, 0.18) !important;
          border-color: #6366f1 !important;
          color: #c7d2fe !important;
        }

        .events-tabs .p-tabview-ink-bar {
          display: none !important;
        }

        @media (max-width: 768px) {
          .events-tabs .p-tabview-nav {
            flex-wrap: nowrap;
            overflow-x: auto;
            padding-bottom: 4px;
          }

          .events-tabs .p-tabview-nav li {
            flex: 0 0 auto;
          }
        }
      `}</style>

      <div className="space-y-6" dir="rtl">
        {/* =========================================================
            HERO
        ========================================================= */}

        <section className="relative overflow-hidden rounded-3xl border border-indigo-100 bg-gradient-to-l from-indigo-600 via-indigo-600 to-violet-600 px-6 py-7 text-white shadow-[0_18px_50px_-20px_rgba(79,70,229,0.55)] md:px-8">
          <div className="absolute -left-16 -top-20 h-48 w-48 rounded-full bg-white/10 blur-2xl" />
          <div className="absolute -bottom-24 right-1/3 h-48 w-48 rounded-full bg-violet-300/20 blur-3xl" />

          <div className="relative flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1.5 text-xs font-bold text-indigo-50 backdrop-blur">
                <span className="h-2 w-2 rounded-full bg-emerald-300" />
                متابعة الأنشطة والإحصائيات
              </div>

              <h1 className="text-2xl font-black tracking-tight md:text-3xl">
                قائمة الأنشطة
              </h1>

              <p className="mt-2 max-w-2xl text-sm leading-6 text-indigo-100">
                استعرض الأنشطة حسب النوع والسنة الدراسية، مع فصل مصاريف
                الدرجات المحددة، معوز وسواعد الخير بشكل كامل.
              </p>
            </div>

            <button
              type="button"
              onClick={() => navigate("/calendar")}
              className="inline-flex h-11 w-fit items-center gap-2 rounded-xl bg-white px-5 text-sm font-black text-indigo-700 shadow-lg shadow-indigo-900/10 transition hover:-translate-y-0.5 hover:bg-indigo-50"
            >
              <svg
                className="h-4 w-4"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <rect x="3" y="5" width="18" height="16" rx="2" />
                <path d="M16 3v4M8 3v4M3 10h18" />
              </svg>

              عرض التقويم
            </button>
          </div>
        </section>

        {/* =========================================================
            FILTER
        ========================================================= */}

        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="text-xs font-black uppercase tracking-wider text-slate-400">
                التصفية
              </p>

              <h2 className="mt-1 text-base font-black text-slate-800 dark:text-white">
                اختر السنة الدراسية
              </h2>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
              <div className="relative min-w-[190px]">
                <select
                  id="anneeScolaire"
                  value={selectedAnneeScolaire}
                  onChange={(e) =>
                    setSelectedAnneeScolaire(
                      e.target.value
                    )
                  }
                  className="h-11 w-full appearance-none rounded-xl border border-slate-200 bg-white px-4 pl-10 text-sm font-black text-slate-700 outline-none transition focus:border-indigo-400 focus:ring-4 focus:ring-indigo-500/10 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                >
                  {SCHOOL_YEARS.map((year) => (
                    <option
                      key={year}
                      value={year}
                    >
                      {year}
                    </option>
                  ))}
                </select>

                <svg
                  className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <path d="m6 9 6 6 6-6" />
                </svg>
              </div>

              <div className="rounded-xl bg-indigo-50 px-4 py-2.5 text-xs font-black text-indigo-700 dark:bg-indigo-500/10 dark:text-indigo-300">
                السنة المختارة: {selectedAnneeScolaire}
              </div>
            </div>
          </div>
        </section>

        {/* =========================================================
            ERROR
        ========================================================= */}

        {error && (
          <div className="flex items-start gap-3 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700 dark:border-red-900/40 dark:bg-red-500/10 dark:text-red-300">
            <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-red-100 font-black dark:bg-red-500/20">
              !
            </span>

            <div>
              <p className="font-black">
                تعذر تحميل بعض البيانات
              </p>

              <p className="mt-1 text-xs opacity-80">
                {error}
              </p>
            </div>
          </div>
        )}

        {/* =========================================================
            SUMMARY
            AUCUN TOTAL FINANCIER MÉLANGÉ
        ========================================================= */}

        <section className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {/* Année */}

          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs font-bold text-slate-400">
                  السنة الدراسية
                </p>

                <p className="mt-2 text-2xl font-black text-slate-900 dark:text-white">
                  {selectedAnneeScolaire}
                </p>
              </div>

              <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-600 dark:bg-indigo-500/10 dark:text-indigo-300">
                <svg
                  className="h-5 w-5"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.9"
                >
                  <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
                  <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2Z" />
                </svg>
              </span>
            </div>
          </div>

          {/* Nombre événements */}

          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs font-bold text-slate-400">
                  عدد الأنشطة
                </p>

                <p className="mt-2 text-3xl font-black text-slate-900 dark:text-white">
                  {loading ? "—" : totalEvents}
                </p>
              </div>

              <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-300">
                <svg
                  className="h-5 w-5"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.9"
                >
                  <rect
                    x="3"
                    y="5"
                    width="18"
                    height="16"
                    rx="2"
                  />
                  <path d="M16 3v4M8 3v4M3 10h18" />
                </svg>
              </span>
            </div>
          </div>

          <MoneySummaryCard
            title="الدرجات المحددة"
            subtitle="مصاريف المستفيدين ذوي الدرجة 1 / 2 / 3"
            value={totalMontantDegresDefinis}
            tone="defined"
            loading={loading}
          />

          <MoneySummaryCard
            title="معوز"
            subtitle="مصاريف المستفيدين بدون درجة محددة"
            value={totalMontantMouawiz}
            tone="mouawiz"
            loading={loading}
          />

          <MoneySummaryCard
            title="سواعد الخير"
            subtitle="ميزانية مستقلة لأنشطة سواعد الخير"
            value={totalMontantSawaedAlKhayr}
            tone="sawaed"
            loading={loading}
          />

          <MoneySummaryCard
            title="مبلغ غير موزع"
            subtitle="مبالغ لا يمكن تصنيفها دون خلط"
            value={totalMontantNonVentile}
            tone="unallocated"
            loading={loading}
          />
        </section>

        {/* =========================================================
            CONTENT
        ========================================================= */}

        <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900 md:p-6">
          <div className="mb-5 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div>
              <h2 className="text-lg font-black text-slate-900 dark:text-white">
                تفاصيل الأنشطة
              </h2>

              <p className="mt-1 text-xs text-slate-400">
                كل فئة مالية معروضة بشكل مستقل دون جمعها مع الفئات الأخرى.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <ExportButtons build={buildExport} disabled={loading} compact />
              <div className="flex gap-1 rounded-xl bg-slate-100 p-1 text-xs font-bold dark:bg-slate-800">
                {[{ value: "" as const, label: "كل الجهات" }, ...ORGANISATEURS].map((o) => (
                  <button
                    key={o.value || "all"}
                    type="button"
                    onClick={() => setOrganisateurFilter(o.value)}
                    className={`rounded-lg px-3 py-2 transition ${
                      organisateurFilter === o.value
                        ? "bg-white text-indigo-700 shadow-sm dark:bg-slate-700 dark:text-white"
                        : "text-slate-500"
                    }`}
                  >
                    {o.label}
                  </button>
                ))}
              </div>
              {!loading && (
                <div className="rounded-xl bg-slate-50 px-4 py-2 text-xs font-bold text-slate-500 dark:bg-slate-800 dark:text-slate-300">
                  {organisateurFilter
                    ? allEvents.filter((e) => organisateurOf(e.organisateur) === organisateurFilter).length
                    : allEvents.length}{" "}
                  نشاط
                </div>
              )}
            </div>
          </div>

          <div className="events-tabs">
            <TabView>
              {/* ===================================================
                  STATISTIQUES
              =================================================== */}

              <TabPanel header="📊 الإحصائيات">
                {loading ? (
                  <div className="space-y-4">
                    {[1, 2, 3].map((item) => (
                      <div
                        key={item}
                        className="h-24 animate-pulse rounded-2xl bg-slate-100 dark:bg-slate-800"
                      />
                    ))}
                  </div>
                ) : (
                  <div className="space-y-6">
                    {/* =============================================
                        TYPE CARDS
                    ============================================= */}

                    <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
                      {rows.map((row, index) => {
                        const tone = getTone(index);

                        return (
                          <div
                            key={row.typeId}
                            className={`rounded-2xl border p-4 ${tone.bg} ${tone.border}`}
                          >
                            <div className="flex items-center justify-between">
                              <span
                                className={`text-sm font-black ${tone.text}`}
                              >
                                {row.typeName}
                              </span>

                              <span
                                className={`h-2.5 w-2.5 rounded-full ${tone.dot}`}
                              />
                            </div>

                            <div className="mt-4 flex items-end justify-between gap-3">
                              <div>
                                <p className="text-2xl font-black text-slate-900 dark:text-white">
                                  {row.count}
                                </p>

                                <p className="text-[11px] font-bold text-slate-400">
                                  نشاط
                                </p>
                              </div>
                            </div>

                            <div className="mt-4 space-y-2">
                              <MoneyLine
                                label="الدرجات المحددة"
                                value={row.montantDegresDefinis}
                                tone="defined"
                                compact
                              />

                              <MoneyLine
                                label="معوز"
                                value={row.montantMouawiz}
                                tone="mouawiz"
                                compact
                              />

                              <MoneyLine
                                label="سواعد الخير"
                                value={row.montantSawaedAlKhayr}
                                tone="sawaed"
                                compact
                              />

                              {row.montantNonVentile > 0 && (
                                <MoneyLine
                                  label="غير موزع"
                                  value={row.montantNonVentile}
                                  tone="unallocated"
                                  compact
                                />
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    {/* =============================================
                        TABLEAU
                    ============================================= */}

                    <div className="overflow-hidden rounded-2xl border border-slate-200 dark:border-slate-700">
                      <div className="overflow-x-auto">
                        <table className="min-w-[950px] w-full text-right text-sm">
                          <thead className="bg-slate-50 dark:bg-slate-800/70">
                            <tr>
                              <th className="px-5 py-4 text-xs font-black text-slate-500 dark:text-slate-300">
                                نوع النشاط
                              </th>

                              <th className="px-5 py-4 text-center text-xs font-black text-slate-500 dark:text-slate-300">
                                عدد الأنشطة
                              </th>

                              <th className="px-5 py-4 text-xs font-black text-blue-700 dark:text-blue-300">
                                الدرجات المحددة
                              </th>

                              <th className="px-5 py-4 text-xs font-black text-orange-700 dark:text-orange-300">
                                معوز
                              </th>

                              <th className="px-5 py-4 text-xs font-black text-violet-700 dark:text-violet-300">
                                سواعد الخير
                              </th>

                              <th className="px-5 py-4 text-xs font-black text-slate-500 dark:text-slate-300">
                                غير موزع
                              </th>
                            </tr>
                          </thead>

                          <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                            {rows.map((row, index) => {
                              const tone = getTone(index);

                              return (
                                <tr
                                  key={row.typeId}
                                  className="bg-white transition hover:bg-slate-50/70 dark:bg-slate-900 dark:hover:bg-slate-800/50"
                                >
                                  <td className="px-5 py-4">
                                    <div className="flex items-center gap-3">
                                      <span
                                        className={`h-2.5 w-2.5 rounded-full ${tone.dot}`}
                                      />

                                      <span className="font-black text-slate-700 dark:text-slate-200">
                                        {row.typeName}
                                      </span>
                                    </div>
                                  </td>

                                  <td className="px-5 py-4 text-center">
                                    <span className="inline-flex min-w-9 items-center justify-center rounded-lg bg-slate-100 px-2.5 py-1 text-xs font-black text-slate-700 dark:bg-slate-800 dark:text-slate-200">
                                      {row.count}
                                    </span>
                                  </td>

                                  <td className="px-5 py-4 font-black text-blue-700 dark:text-blue-300">
                                    {formatMoney(
                                      row.montantDegresDefinis
                                    )}
                                  </td>

                                  <td className="px-5 py-4 font-black text-orange-700 dark:text-orange-300">
                                    {formatMoney(
                                      row.montantMouawiz
                                    )}
                                  </td>

                                  <td className="px-5 py-4 font-black text-violet-700 dark:text-violet-300">
                                    {formatMoney(
                                      row.montantSawaedAlKhayr
                                    )}
                                  </td>

                                  <td className="px-5 py-4 font-black text-slate-500 dark:text-slate-300">
                                    {formatMoney(
                                      row.montantNonVentile
                                    )}
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>

                          <tfoot className="border-t border-slate-200 bg-slate-50/80 dark:border-slate-700 dark:bg-slate-800/70">
                            <tr>
                              <td className="px-5 py-4 font-black text-slate-900 dark:text-white">
                                المجموع حسب الفئة
                              </td>

                              <td className="px-5 py-4 text-center font-black text-slate-900 dark:text-white">
                                {totalEvents}
                              </td>

                              <td className="px-5 py-4 font-black text-blue-700 dark:text-blue-300">
                                {formatMoney(
                                  totalMontantDegresDefinis
                                )}
                              </td>

                              <td className="px-5 py-4 font-black text-orange-700 dark:text-orange-300">
                                {formatMoney(
                                  totalMontantMouawiz
                                )}
                              </td>

                              <td className="px-5 py-4 font-black text-violet-700 dark:text-violet-300">
                                {formatMoney(
                                  totalMontantSawaedAlKhayr
                                )}
                              </td>

                              <td className="px-5 py-4 font-black text-slate-600 dark:text-slate-300">
                                {formatMoney(
                                  totalMontantNonVentile
                                )}
                              </td>
                            </tr>
                          </tfoot>
                        </table>
                      </div>
                    </div>

                    {/* Pas de somme globale volontairement */}
                    <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-5 py-4 text-xs font-bold leading-6 text-slate-500 dark:border-slate-700 dark:bg-slate-800/40 dark:text-slate-300">
                      يتم عرض مصاريف «الدرجات المحددة»، «معوز» و«سواعد الخير»
                      بشكل مستقل. لا يتم جمع هذه الميزانيات في مبلغ مالي واحد.
                    </div>
                  </div>
                )}
              </TabPanel>

              {/* ===================================================
                  ONGLET PAR TYPE
              =================================================== */}

              {eventTypes.map((type, typeIndex) => {
                const list = (eventsByType[type.id] || []).filter(
                  (event) =>
                    !organisateurFilter ||
                    organisateurOf(event.organisateur) === organisateurFilter
                );

                const tone =
                  getTone(typeIndex);

                // IMPORTANT :
                // quatre sommes séparées.
                const totalDefined =
                  list.reduce(
                    (sum, event) =>
                      sum +
                      numberValue(
                        event.montantDegresDefinis
                      ),
                    0
                  );

                const totalMouawiz =
                  list.reduce(
                    (sum, event) =>
                      sum +
                      numberValue(
                        event.montantMouawiz
                      ),
                    0
                  );

                const totalSawaed =
                  list.reduce(
                    (sum, event) =>
                      sum +
                      numberValue(
                        event.montantSawaedAlKhayr
                      ),
                    0
                  );

                const totalUnallocated =
                  list.reduce(
                    (sum, event) =>
                      sum +
                      numberValue(
                        event.montantNonVentile
                      ),
                    0
                  );

                return (
                  <TabPanel
                    key={type.id}
                    header={`${type.name} (${list.length})`}
                  >
                    {loading ? (
                      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                        {[1, 2, 3, 4].map(
                          (item) => (
                            <div
                              key={item}
                              className="h-44 animate-pulse rounded-2xl bg-slate-100 dark:bg-slate-800"
                            />
                          )
                        )}
                      </div>
                    ) : list.length === 0 ? (
                      <div className="flex min-h-[260px] flex-col items-center justify-center rounded-3xl border border-dashed border-slate-200 bg-slate-50/60 px-6 text-center dark:border-slate-700 dark:bg-slate-800/30">
                        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white text-slate-400 shadow-sm dark:bg-slate-800">
                          <svg
                            className="h-7 w-7"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="1.7"
                          >
                            <rect
                              x="3"
                              y="5"
                              width="18"
                              height="16"
                              rx="2"
                            />
                            <path d="M16 3v4M8 3v4M3 10h18" />
                          </svg>
                        </div>

                        <h3 className="mt-4 font-black text-slate-700 dark:text-slate-200">
                          لا توجد أنشطة
                        </h3>

                        <p className="mt-2 max-w-md text-sm leading-6 text-slate-400">
                          لا توجد أنشطة من نوع{" "}
                          <strong>
                            {type.name}
                          </strong>{" "}
                          خلال السنة الدراسية{" "}
                          <strong>
                            {selectedAnneeScolaire}
                          </strong>
                          .
                        </p>
                      </div>
                    ) : (
                      <div className="space-y-5">
                        {/* =========================================
                            RÉSUMÉ DU TYPE
                        ========================================= */}

                        <div
                          className={`rounded-2xl border p-5 ${tone.bg} ${tone.border}`}
                        >
                          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                            <div>
                              <p
                                className={`text-xs font-black ${tone.text}`}
                              >
                                ملخص {type.name}
                              </p>

                              <p className="mt-1 text-2xl font-black text-slate-900 dark:text-white">
                                {list.length} نشاط
                              </p>

                              <p className="mt-1 text-xs font-bold text-slate-400">
                                السنة الدراسية{" "}
                                {selectedAnneeScolaire}
                              </p>
                            </div>

                            <div className="grid flex-1 grid-cols-1 gap-2 sm:grid-cols-2 xl:max-w-3xl xl:grid-cols-4">
                              <MoneyLine
                                label="الدرجات المحددة"
                                value={totalDefined}
                                tone="defined"
                                compact
                              />

                              <MoneyLine
                                label="معوز"
                                value={totalMouawiz}
                                tone="mouawiz"
                                compact
                              />

                              <MoneyLine
                                label="سواعد الخير"
                                value={totalSawaed}
                                tone="sawaed"
                                compact
                              />

                              <MoneyLine
                                label="غير موزع"
                                value={totalUnallocated}
                                tone="unallocated"
                                compact
                              />
                            </div>
                          </div>
                        </div>

                        {/* =========================================
                            LISTE DES ÉVÉNEMENTS
                        ========================================= */}

                        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                          {list.map((event) => (
                            <Link
                              to={`/event-details/${event.id}`}
                              key={event.id}
                              className="group block"
                            >
                              <article className="h-full overflow-hidden rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition duration-200 hover:-translate-y-1 hover:border-indigo-200 hover:shadow-lg hover:shadow-slate-200/50 dark:border-slate-700 dark:bg-slate-900 dark:hover:border-indigo-500/40 dark:hover:shadow-none">
                                {/* Header */}

                                <div className="flex items-start justify-between gap-4">
                                  <div className="min-w-0">
                                    <div className="mb-2 flex flex-wrap items-center gap-2">
                                      <span
                                        className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-black ${tone.bg} ${tone.text}`}
                                      >
                                        <span
                                          className={`h-1.5 w-1.5 rounded-full ${tone.dot}`}
                                        />

                                        {type.name}
                                      </span>

                                      <span className={`rounded-full px-2.5 py-1 text-[10px] font-black ${organisateurCls(event.organisateur)}`}>
                                        {organisateurLabel(event.organisateur)}
                                      </span>

                                      <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[10px] font-black text-slate-500 dark:bg-slate-800 dark:text-slate-300">
                                        {event.anneeScolaire ||
                                          selectedAnneeScolaire}
                                      </span>

                                      {event.sawaedAlKhayr && (
                                        <span className="inline-flex items-center gap-1 rounded-full bg-violet-100 px-2.5 py-1 text-[10px] font-black text-violet-700 dark:bg-violet-500/20 dark:text-violet-300">
                                          <span className="h-1.5 w-1.5 rounded-full bg-violet-500" />
                                          سواعد الخير
                                        </span>
                                      )}
                                    </div>

                                    <h3 className="truncate text-lg font-black text-slate-900 transition group-hover:text-indigo-600 dark:text-white dark:group-hover:text-indigo-300">
                                      {event.title}
                                    </h3>
                                  </div>

                                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-slate-50 text-slate-400 transition group-hover:bg-indigo-50 group-hover:text-indigo-600 dark:bg-slate-800 dark:group-hover:bg-indigo-500/10 dark:group-hover:text-indigo-300">
                                    <svg
                                      className="h-4 w-4"
                                      viewBox="0 0 24 24"
                                      fill="none"
                                      stroke="currentColor"
                                      strokeWidth="2"
                                    >
                                      <path d="m9 18 6-6-6-6" />
                                    </svg>
                                  </span>
                                </div>

                                {/* Basic infos */}

                                <div className="mt-5 grid grid-cols-1 gap-3 text-xs text-slate-500 sm:grid-cols-3 dark:text-slate-400">
                                  {/* Date */}

                                  <div className="flex items-center gap-2">
                                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-slate-50 text-slate-400 dark:bg-slate-800">
                                      <svg
                                        className="h-4 w-4"
                                        viewBox="0 0 24 24"
                                        fill="none"
                                        stroke="currentColor"
                                        strokeWidth="1.8"
                                      >
                                        <path d="M8 2v4M16 2v4M3 10h18" />
                                        <rect
                                          x="3"
                                          y="4"
                                          width="18"
                                          height="18"
                                          rx="2"
                                        />
                                      </svg>
                                    </span>

                                    <div>
                                      <p className="text-[10px] font-bold text-slate-400">
                                        التاريخ
                                      </p>

                                      <p className="mt-0.5 font-black text-slate-700 dark:text-slate-200">
                                        {formatDate(
                                          event.startDate
                                        )}
                                        {event.endDate &&
                                          event.endDate !== event.startDate &&
                                          ` ← ${formatDate(event.endDate)}`}
                                      </p>
                                    </div>
                                  </div>

                                  {/* Place */}

                                  <div className="flex items-center gap-2">
                                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-slate-50 text-slate-400 dark:bg-slate-800">
                                      <svg
                                        className="h-4 w-4"
                                        viewBox="0 0 24 24"
                                        fill="none"
                                        stroke="currentColor"
                                        strokeWidth="1.8"
                                      >
                                        <path d="M12 21s7-6.2 7-13a7 7 0 1 0-14 0c0 6.8 7 13 7 13Z" />
                                        <circle
                                          cx="12"
                                          cy="8"
                                          r="2"
                                        />
                                      </svg>
                                    </span>

                                    <div className="min-w-0">
                                      <p className="text-[10px] font-bold text-slate-400">
                                        المكان
                                      </p>

                                      <p className="mt-0.5 truncate font-black text-slate-700 dark:text-slate-200">
                                        {event.place ||
                                          "-"}
                                      </p>
                                    </div>
                                  </div>

                                  {/* Cibles */}

                                  <div className="flex items-center gap-2">
                                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-slate-50 text-slate-400 dark:bg-slate-800">
                                      <svg
                                        className="h-4 w-4"
                                        viewBox="0 0 24 24"
                                        fill="none"
                                        stroke="currentColor"
                                        strokeWidth="1.8"
                                      >
                                        <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
                                        <circle
                                          cx="9"
                                          cy="7"
                                          r="4"
                                        />
                                        <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
                                      </svg>
                                    </span>

                                    <div>
                                      <p className="text-[10px] font-bold text-slate-400">
                                        الفئة
                                      </p>

                                      <p className="mt-0.5 font-black text-slate-700 dark:text-slate-200">
                                        {(event.cibles ||
                                          [])
                                          .map(
                                            (cible) =>
                                              CIBLE_LABELS[
                                                cible
                                              ] ||
                                              cible
                                          )
                                          .join(
                                            "، "
                                          ) ||
                                          "-"}
                                      </p>
                                    </div>
                                  </div>
                                </div>

                                {/* =================================
                                    FINANCES SÉPARÉES
                                ================================= */}

                                <div className="mt-4 border-t border-slate-100 pt-4 dark:border-slate-800">
                                  <EventFinancialBreakdown
                                    event={event}
                                  />
                                </div>
                              </article>
                            </Link>
                          ))}
                        </div>
                      </div>
                    )}
                  </TabPanel>
                );
              })}
            </TabView>
          </div>
        </section>
      </div>
    </>
  );
};

export default ListeEvents;
