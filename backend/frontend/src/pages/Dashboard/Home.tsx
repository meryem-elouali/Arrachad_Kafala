import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import PageMeta from "../../components/common/PageMeta";
import { besoinLabel, BESOINS } from "../../lib/prisesEnCharge";
import { CATEGORIES_PLANNING, STATUTS_PLANNING, clsOf, labelOf } from "../../lib/labels";
import { PlanningAction, heureCourte } from "../../lib/planning";
import { currentSchoolYear, schoolYearsList } from "../../lib/schoolYear";

const API = "http://localhost:8080/api";

/* ============================== Types ============================== */

interface FundSummary {
  fundId: number;
  code: string;
  nom: string;
  entrees: number;
  totalSorties: number;
  solde: number;
}

interface Alerte {
  niveau: "INFO" | "WARNING" | "DANGER";
  titre: string;
  valeur: string;
  lien: string;
}

interface DashboardData {
  anneeScolaire: string;
  familles: { total: number; parType: Record<string, number>; prisesEnCharge: number; avecMalade: number };
  enfants: {
    total: number;
    filles: number;
    garcons: number;
    sexeNonRenseigne: number;
    malades: number;
    scolarisesAnnee: number;
    enCoursEtudes: number;
    arretEtudes: number;
    sansSuiviScolaire: number;
    redoublants: number;
    moyenneGenerale: number | null;
  };
  evenements: {
    total: number;
    realises: number;
    participants: number;
    aVenir: { id: number; title: string; startDate: string; place?: string; type?: string; participants: number }[];
  };
  finances: { totalEntrees: number; totalSorties: number; solde: number; nonVentile: number; fonds: FundSummary[] };
  prisesEnCharge: { parrainsActifs: number; prisesActives: number; famillesPrises: number; parBesoin: Record<string, number> };
  alertes: Alerte[];
  planning: {
    total: number;
    termine: number;
    enCours: number;
    nonCommence: number;
    annule: number;
    retard: number;
    progression: number;
    aujourdhui: PlanningAction[];
    semaine: PlanningAction[];
    enRetard: PlanningAction[];
    prochaines: PlanningAction[];
  };
  reunions: {
    total: number;
    realisees: number;
    tauxPresence: number | null;
    sansCompteRendu: number;
    prochaines: { id: number; titre: string; date: string; heure?: string | null; lieu?: string | null }[];
  };
}

/** Ligne compacte d'une action du planning (Dashboard). */
const ActionLine = ({ a }: { a: PlanningAction }) => (
  <li className="flex items-center gap-3 py-2">
    <span className={`h-2 w-2 shrink-0 rounded-full ${a.enRetard ? "bg-red-500" : "bg-indigo-400"}`} />
    <span className="min-w-0 flex-1">
      <span className="block truncate text-sm font-bold text-gray-800 dark:text-white">{a.titre}</span>
      <span className="block truncate text-[11px] text-gray-400">
        {formatDate(a.datePrevue)}
        {a.heure ? ` · ${heureCourte(a.heure)}` : ""}
        {a.responsable ? ` · ${a.responsable.nom}` : ""}
        {` · ${labelOf(CATEGORIES_PLANNING, a.categorie)}`}
      </span>
    </span>
    <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-black ${clsOf(STATUTS_PLANNING, a.statut)}`}>
      {labelOf(STATUTS_PLANNING, a.statut)}
    </span>
  </li>
);

/* ============================== Helpers ============================== */

const money = (v: unknown) =>
  `${Number(v || 0).toLocaleString("fr-FR", { minimumFractionDigits: 0, maximumFractionDigits: 0 })} DH`;


const formatDate = (iso: string) => {
  const d = new Date(`${iso}T00:00:00`);
  return Number.isNaN(d.getTime())
    ? iso
    : new Intl.DateTimeFormat("ar-MA", { weekday: "short", day: "numeric", month: "short" }).format(d);
};


// Ordre fixe des catégories de familles (couleur liée à la catégorie, jamais au rang)
const TYPE_ORDER = ["أيتام", "معوز", "لطيم"];

/* ============================== UI ============================== */

const Tile = ({
  label,
  value,
  detail,
  to,
}: {
  label: string;
  value: string | number;
  detail?: React.ReactNode;
  to?: string;
}) => {
  const body = (
    <div className="h-full rounded-2xl border border-gray-200 bg-white p-5 transition hover:border-indigo-200 hover:shadow-md dark:border-gray-800 dark:bg-gray-900">
      <p className="text-xs font-bold text-gray-500 dark:text-gray-400">{label}</p>
      <p className="mt-2 text-3xl font-black tabular-nums text-gray-900 dark:text-white">{value}</p>
      {detail && <div className="mt-2 text-xs text-gray-500 dark:text-gray-400">{detail}</div>}
    </div>
  );
  return to ? (
    <Link to={to} className="block h-full">
      {body}
    </Link>
  ) : (
    body
  );
};

const Card = ({
  title,
  action,
  children,
}: {
  title: string;
  action?: React.ReactNode;
  children: React.ReactNode;
}) => (
  <section className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-gray-900">
    <div className="mb-4 flex items-center justify-between gap-3">
      <h3 className="text-base font-extrabold text-gray-900 dark:text-white">{title}</h3>
      {action}
    </div>
    {children}
  </section>
);

/* ============================== Page ============================== */

export default function Home() {
  const [annee, setAnnee] = useState(currentSchoolYear());
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const user = useMemo(() => {
    try {
      return JSON.parse(localStorage.getItem("lajna_user") || "{}");
    } catch {
      return {};
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError("");
    fetch(`${API}/dashboard?annee=${encodeURIComponent(annee)}`)
      .then((r) => {
        if (!r.ok) throw new Error();
        return r.json();
      })
      .then((d) => !cancelled && setData(d))
      .catch(() => !cancelled && setError("تعذر تحميل لوحة القيادة"))
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [annee]);

  const types = useMemo(() => {
    if (!data) return [];
    const entries = Object.entries(data.familles.parType);
    return entries.sort(
      (a, b) =>
        (TYPE_ORDER.indexOf(a[0]) === -1 ? 99 : TYPE_ORDER.indexOf(a[0])) -
        (TYPE_ORDER.indexOf(b[0]) === -1 ? 99 : TYPE_ORDER.indexOf(b[0]))
    );
  }, [data]);

  const maxFund = useMemo(
    () => Math.max(1, ...(data?.finances.fonds ?? []).map((f) => Math.max(Number(f.entrees), Number(f.totalSorties)))),
    [data]
  );

  const besoins = useMemo(
    () =>
      Object.entries(data?.prisesEnCharge.parBesoin ?? {}).sort(
        (a, b) => BESOINS.findIndex((x) => x.value === a[0]) - BESOINS.findIndex((x) => x.value === b[0])
      ),
    [data]
  );
  const maxBesoin = Math.max(1, ...besoins.map(([, n]) => n));

  return (
    <>
      <PageMeta title="لوحة القيادة | الرشاد للكفالة" description="نظرة عامة على وضعية الجمعية" />

      {/* Couleurs des catégories (validées en clair et en sombre) */}
      <style>{`
        .dash{--s1:#2a78d6;--s2:#eb6834;--s3:#1baf7a;--s4:#eda100;--s5:#e87ba4;--good:#0ca30c;--critical:#d03b3b;--track:#eef0f3}
        .dark .dash{--s1:#3987e5;--s2:#d95926;--s3:#199e70;--s4:#c98500;--s5:#d55181;--track:#1f2937}
      `}</style>

      <div dir="rtl" className="dash space-y-6">
        {/* ---------------- Accueil ---------------- */}
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-l from-indigo-700 via-indigo-600 to-sky-600 p-6 text-white shadow-lg lg:p-8">
          <div className="absolute -left-16 -top-16 h-56 w-56 rounded-full bg-white/10" />
          <div className="absolute -bottom-20 left-1/3 h-64 w-64 rounded-full bg-white/5" />
          <div className="relative flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="text-sm font-semibold text-white/75">الرشاد للكفالة · اللجنة الاجتماعية</p>
              <h1 className="mt-1 text-3xl font-black lg:text-4xl">لوحة القيادة</h1>
              <p className="mt-2 max-w-xl text-sm text-white/80">
                مؤشرات المتابعة للسنة الدراسية {annee}{user?.nomComplet ? ` · ${user.nomComplet}` : ""}
              </p>
              <div className="mt-5 flex flex-wrap gap-2">
                {[
                  ["+ أسرة جديدة", "/form-elements"],
                  ["+ نشاط", "/calendar"],
                  ["الإدارة المالية", "/gestion-economique"],
                  ["الوسطاء", "/parrains"],
                ].map(([l, to]) => (
                  <Link
                    key={to}
                    to={to}
                    className="rounded-xl bg-white/15 px-4 py-2 text-sm font-bold backdrop-blur transition hover:bg-white/25"
                  >
                    {l}
                  </Link>
                ))}
              </div>
            </div>

            <label className="flex items-center gap-2 self-start rounded-2xl bg-white/15 px-4 py-2 text-sm font-bold backdrop-blur lg:self-end">
              السنة الدراسية
              <select
                value={annee}
                onChange={(e) => setAnnee(e.target.value)}
                className="rounded-lg bg-white px-2 py-1 text-sm font-bold text-indigo-700 outline-none"
              >
                {schoolYearsList(5).map((y) => (
                  <option key={y} value={y}>
                    {y}
                  </option>
                ))}
              </select>
            </label>
          </div>
        </div>

        {error && <p className="rounded-2xl bg-red-50 p-4 text-sm font-bold text-red-700">{error}</p>}
        {loading && !data && <p className="py-10 text-center text-sm text-gray-400">جاري التحميل…</p>}

        {data && (
          <>
            {/* ---------------- Planning : ce qui doit être fait ---------------- */}
            <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
              <div className="xl:col-span-2">
                <Card
                  title="المخطط السنوي"
                  action={
                    <Link to="/planning" className="text-xs font-bold text-indigo-600">
                      المخطط كاملا ←
                    </Link>
                  }
                >
                  {data.planning.total === 0 ? (
                    <p className="text-sm text-gray-400">
                      لا توجد مهام مبرمجة لهذه السنة.{" "}
                      <Link to="/planning" className="font-bold text-indigo-600">
                        إعداد المخطط السنوي
                      </Link>
                    </p>
                  ) : (
                    <>
                      <div className="flex flex-wrap items-end justify-between gap-4">
                        <div>
                          <p className="text-3xl font-black tabular-nums text-gray-900 dark:text-white">{data.planning.progression}%</p>
                          <p className="text-xs text-gray-500">نسبة الإنجاز (دون المهام الملغاة)</p>
                        </div>
                        <div className="grid grid-cols-4 gap-4 text-center text-xs">
                          {[
                            ["المبرمجة", data.planning.total, "text-gray-900"],
                            ["المنجزة", data.planning.termine, "text-emerald-700"],
                            ["الجارية", data.planning.enCours, "text-indigo-700"],
                            ["لم تبدأ", data.planning.nonCommence, "text-gray-600"],
                          ].map(([l, v, c]) => (
                            <div key={l as string}>
                              <p className={`text-lg font-black tabular-nums dark:text-white ${c}`}>{v}</p>
                              <p className="text-gray-500">{l}</p>
                            </div>
                          ))}
                        </div>
                      </div>
                      <div
                        className="mt-3 h-2.5 w-full rounded-full"
                        style={{ background: "var(--track)" }}
                        title={`${data.planning.termine} منجز من ${data.planning.total - data.planning.annule}`}
                      >
                        <div className="h-2.5 rounded-full" style={{ width: `${data.planning.progression}%`, background: "var(--s3)" }} />
                      </div>

                      <div className="mt-5 grid grid-cols-1 gap-5 md:grid-cols-2">
                        <div>
                          <p className="text-xs font-black text-gray-500">اليوم</p>
                          {data.planning.aujourdhui.length === 0 ? (
                            <p className="mt-2 text-xs text-gray-400">لا توجد مهام مبرمجة اليوم</p>
                          ) : (
                            <ul className="divide-y divide-gray-100 dark:divide-gray-800">
                              {data.planning.aujourdhui.map((a) => (
                                <ActionLine key={a.id} a={a} />
                              ))}
                            </ul>
                          )}
                          <p className="mt-4 text-xs font-black text-gray-500">هذا الأسبوع</p>
                          {data.planning.semaine.length === 0 ? (
                            <p className="mt-2 text-xs text-gray-400">لا توجد مهام خلال الأيام القادمة</p>
                          ) : (
                            <ul className="divide-y divide-gray-100 dark:divide-gray-800">
                              {data.planning.semaine.map((a) => (
                                <ActionLine key={a.id} a={a} />
                              ))}
                            </ul>
                          )}
                        </div>
                        <div>
                          <p className={`text-xs font-black ${data.planning.retard ? "text-red-600" : "text-gray-500"}`}>
                            متأخرة {data.planning.retard ? `(${data.planning.retard})` : ""}
                          </p>
                          {data.planning.enRetard.length === 0 ? (
                            <p className="mt-2 text-xs text-gray-400">لا توجد مهام متأخرة</p>
                          ) : (
                            <ul className="divide-y divide-gray-100 dark:divide-gray-800">
                              {data.planning.enRetard.map((a) => (
                                <ActionLine key={a.id} a={a} />
                              ))}
                            </ul>
                          )}
                          {data.planning.prochaines.length > 0 && (
                            <>
                              <p className="mt-4 text-xs font-black text-gray-500">لاحقا</p>
                              <ul className="divide-y divide-gray-100 dark:divide-gray-800">
                                {data.planning.prochaines.map((a) => (
                                  <ActionLine key={a.id} a={a} />
                                ))}
                              </ul>
                            </>
                          )}
                        </div>
                      </div>
                    </>
                  )}
                </Card>
              </div>

              <Card
                title="الاجتماعات"
                action={
                  <Link to="/reunions" className="text-xs font-bold text-indigo-600">
                    السجل ←
                  </Link>
                }
              >
                <div className="grid grid-cols-2 gap-2 text-center">
                  <div className="rounded-xl bg-gray-50 p-3 dark:bg-gray-800">
                    <p className="text-xl font-black text-gray-900 dark:text-white">
                      {data.reunions.realisees}
                      <span className="text-xs font-bold text-gray-400"> / {data.reunions.total}</span>
                    </p>
                    <p className="text-[11px] text-gray-500">منعقدة هذه السنة</p>
                  </div>
                  <div className="rounded-xl bg-gray-50 p-3 dark:bg-gray-800">
                    <p className="text-xl font-black text-gray-900 dark:text-white">
                      {data.reunions.tauxPresence != null ? `${data.reunions.tauxPresence}%` : "—"}
                    </p>
                    <p className="text-[11px] text-gray-500">نسبة الحضور</p>
                  </div>
                </div>
                <p className="mt-4 text-xs font-black text-gray-500">الاجتماعات القادمة</p>
                {data.reunions.prochaines.length === 0 ? (
                  <p className="mt-2 text-xs text-gray-400">لا توجد اجتماعات مبرمجة</p>
                ) : (
                  <ul className="mt-1 divide-y divide-gray-100 dark:divide-gray-800">
                    {data.reunions.prochaines.map((r) => (
                      <li key={r.id}>
                        <Link to={`/reunions/${r.id}`} className="flex items-center gap-3 py-2">
                          <span className="w-20 shrink-0 rounded-lg bg-indigo-50 px-2 py-1.5 text-center text-[11px] font-black text-indigo-700 dark:bg-indigo-500/10 dark:text-indigo-300">
                            {formatDate(r.date)}
                          </span>
                          <span className="min-w-0">
                            <span className="block truncate text-sm font-bold text-gray-800 dark:text-white">{r.titre}</span>
                            <span className="block truncate text-[11px] text-gray-400">
                              {[r.heure ? heureCourte(r.heure) : "", r.lieu].filter(Boolean).join(" · ")}
                            </span>
                          </span>
                        </Link>
                      </li>
                    ))}
                  </ul>
                )}
              </Card>
            </div>

            {/* ---------------- Chiffres clés ---------------- */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
              <Tile
                label="الأسر المستفيدة"
                value={data.familles.total}
                to="/basic-tables"
                detail={
                  <>
                    {types.map(([t, n]) => `${t} ${n}`).join(" · ") || "—"}
                    {data.familles.prisesEnCharge > 0 && (
                      <span className="block">منها {data.familles.prisesEnCharge} بتكفل خارجي</span>
                    )}
                  </>
                }
              />
              <Tile
                label="الأطفال"
                value={data.enfants.total}
                to="/suivi-etudes"
                detail={
                  <>
                    بنات {data.enfants.filles} · أولاد {data.enfants.garcons}
                    {data.enfants.sexeNonRenseigne > 0 && (
                      <span className="block text-amber-600">{data.enfants.sexeNonRenseigne} بدون تحديد الجنس</span>
                    )}
                  </>
                }
              />
              <Tile
                label="الأنشطة هذه السنة"
                value={data.evenements.total}
                to="/listeevents"
                detail={`${data.evenements.realises} منجزة · ${data.evenements.participants} مشاركة`}
              />
              <Tile
                label="الرصيد الإجمالي للصناديق"
                value={money(data.finances.solde)}
                to="/gestion-economique"
                detail={`مداخيل ${money(data.finances.totalEntrees)} · مصاريف ${money(data.finances.totalSorties)}`}
              />
            </div>

            <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
              {/* ---------------- Caisses ---------------- */}
              <div className="xl:col-span-2">
                <Card
                  title="الصناديق"
                  action={
                    <Link to="/gestion-economique" className="text-xs font-bold text-indigo-600">
                      التفاصيل ←
                    </Link>
                  }
                >
                  {data.finances.fonds.length === 0 ? (
                    <p className="text-sm text-gray-400">لا توجد صناديق مفعلة</p>
                  ) : (
                    <div className="space-y-4">
                      <div className="flex items-center gap-4 text-[11px] font-bold text-gray-500">
                        <span className="flex items-center gap-1.5">
                          <span className="h-2.5 w-2.5 rounded-sm" style={{ background: "var(--s1)" }} /> المداخيل
                        </span>
                        <span className="flex items-center gap-1.5">
                          <span className="h-2.5 w-2.5 rounded-sm" style={{ background: "var(--s2)" }} /> المصاريف
                        </span>
                      </div>
                      {data.finances.fonds.map((f) => {
                        const neg = Number(f.solde) < 0;
                        return (
                          <div key={f.fundId} className="grid grid-cols-12 items-center gap-3">
                            <p className="col-span-12 truncate text-sm font-bold text-gray-800 dark:text-gray-100 sm:col-span-3">{f.nom}</p>
                            <div className="col-span-8 space-y-[2px] sm:col-span-6">
                              {[
                                ["المداخيل", f.entrees, "var(--s1)"],
                                ["المصاريف", f.totalSorties, "var(--s2)"],
                              ].map(([label, v, color]) => (
                                <div
                                  key={label as string}
                                  title={`${label}: ${money(v)}`}
                                  className="h-2.5 rounded-full"
                                  style={{ background: "var(--track)" }}
                                >
                                  <div
                                    className="h-2.5 rounded-full"
                                    style={{
                                      width: `${Math.max(Number(v) > 0 ? 2 : 0, (Number(v) / maxFund) * 100)}%`,
                                      background: color as string,
                                    }}
                                  />
                                </div>
                              ))}
                            </div>
                            <div className="col-span-4 text-left sm:col-span-3">
                              <p className={`text-sm font-black tabular-nums ${neg ? "text-red-700 dark:text-red-400" : "text-gray-900 dark:text-white"}`}>
                                {money(f.solde)}
                              </p>
                              <p className="text-[11px] text-gray-400">{neg ? "رصيد سالب" : "الرصيد"}</p>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </Card>
              </div>

              {/* ---------------- Points d'attention ---------------- */}
              <Card title="نقاط تستحق الانتباه">
                {data.alertes.length === 0 ? (
                  <div className="flex items-center gap-3 rounded-xl bg-emerald-50 p-4 text-sm font-bold text-emerald-700 dark:bg-emerald-500/10">
                    لا توجد تنبيهات حاليا
                  </div>
                ) : (
                  <ul className="space-y-2">
                    {data.alertes.map((a, i) => (
                      <li key={i}>
                        <Link
                          to={a.lien}
                          className={`flex items-start gap-3 rounded-xl border p-3 text-sm transition hover:shadow-sm ${
                            a.niveau === "DANGER"
                              ? "border-red-200 bg-red-50 text-red-800"
                              : a.niveau === "WARNING"
                                ? "border-amber-200 bg-amber-50 text-amber-800"
                                : "border-sky-200 bg-sky-50 text-sky-800"
                          }`}
                        >
                          <span className="shrink-0 rounded-md bg-white/70 px-2 py-0.5 text-[11px] font-black">{a.niveau === "DANGER" ? "عاجل" : a.niveau === "WARNING" ? "تنبيه" : "معلومة"}</span>
                          <span className="flex-1">
                            <span className="block font-bold">{a.titre}</span>
                            <span className="text-xs opacity-80">{a.valeur}</span>
                          </span>
                        </Link>
                      </li>
                    ))}
                  </ul>
                )}
              </Card>
            </div>

            <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
              {/* ---------------- Composition des familles ---------------- */}
              <Card title="تركيبة الأسر">
                {data.familles.total === 0 ? (
                  <p className="text-sm text-gray-400">لا توجد أسر مسجلة</p>
                ) : (
                  <>
                    <div className="flex h-3 w-full gap-[2px] overflow-hidden rounded-full">
                      {types.map(([t, n], i) => (
                        <div
                          key={t}
                          title={`${t}: ${n}`}
                          className="h-3 first:rounded-r-full last:rounded-l-full"
                          style={{ width: `${(n / data.familles.total) * 100}%`, background: `var(--s${Math.min(i + 1, 5)})` }}
                        />
                      ))}
                    </div>
                    <ul className="mt-4 space-y-2">
                      {types.map(([t, n], i) => (
                        <li key={t} className="flex items-center justify-between text-sm">
                          <span className="flex items-center gap-2 font-bold text-gray-700 dark:text-gray-200">
                            <span className="h-2.5 w-2.5 rounded-sm" style={{ background: `var(--s${Math.min(i + 1, 5)})` }} />
                            {t}
                          </span>
                          <span className="tabular-nums text-gray-600 dark:text-gray-300">
                            {n} <span className="text-xs text-gray-400">({Math.round((n / data.familles.total) * 100)}%)</span>
                          </span>
                        </li>
                      ))}
                    </ul>
                    <div className="mt-4 grid grid-cols-2 gap-2 text-xs">
                      <div className="rounded-xl bg-gray-50 p-3 dark:bg-gray-800">
                        <p className="text-gray-500">أسر بها مريض</p>
                        <p className="mt-1 text-lg font-black text-gray-900 dark:text-white">{data.familles.avecMalade}</p>
                      </div>
                      <div className="rounded-xl bg-gray-50 p-3 dark:bg-gray-800">
                        <p className="text-gray-500">أطفال مرضى</p>
                        <p className="mt-1 text-lg font-black text-gray-900 dark:text-white">{data.enfants.malades}</p>
                      </div>
                    </div>
                  </>
                )}
              </Card>

              {/* ---------------- Scolarité ---------------- */}
              <Card
                title="التمدرس"
                action={
                  <Link to="/suivi-etudes" className="text-xs font-bold text-indigo-600">
                    تتبع الدراسة ←
                  </Link>
                }
              >
                <ul className="mb-3 space-y-1.5 text-sm">
                  {[
                    ["يتابعون دراستهم", data.enfants.enCoursEtudes],
                    ["توقفوا عن الدراسة", data.enfants.arretEtudes],
                    ["بدون تتبع دراسي", data.enfants.sansSuiviScolaire],
                  ].map(([l, v]) => (
                    <li key={l as string} className="flex items-center justify-between">
                      <span className="text-gray-600 dark:text-gray-300">{l}</span>
                      <span className="font-black tabular-nums text-gray-900 dark:text-white">{v}</span>
                    </li>
                  ))}
                </ul>
                <div className="grid grid-cols-2 gap-3">
                  <div className="rounded-xl bg-gray-50 p-4 dark:bg-gray-800">
                    <p className="text-xs text-gray-500">مسجلون هذه السنة</p>
                    <p className="mt-1 text-2xl font-black text-gray-900 dark:text-white">{data.enfants.scolarisesAnnee}</p>
                  </div>
                  <div className="rounded-xl bg-gray-50 p-4 dark:bg-gray-800">
                    <p className="text-xs text-gray-500">المعدل العام</p>
                    <p className="mt-1 text-2xl font-black text-gray-900 dark:text-white">
                      {data.enfants.moyenneGenerale != null ? data.enfants.moyenneGenerale : "—"}
                    </p>
                  </div>
                  <div className="col-span-2 rounded-xl bg-gray-50 p-4 dark:bg-gray-800">
                    <p className="text-xs text-gray-500">حالات التكرار</p>
                    <p className="mt-1 text-2xl font-black text-gray-900 dark:text-white">{data.enfants.redoublants}</p>
                  </div>
                </div>
              </Card>

              {/* ---------------- Prises en charge ---------------- */}
              <Card
                title="التكفل الخارجي"
                action={
                  <Link to="/parrains" className="text-xs font-bold text-indigo-600">
                    الوسطاء ←
                  </Link>
                }
              >
                <div className="grid grid-cols-3 gap-2 text-center">
                  {[
                    ["وسطاء", data.prisesEnCharge.parrainsActifs],
                    ["أسر", data.prisesEnCharge.famillesPrises],
                    ["كفالات", data.prisesEnCharge.prisesActives],
                  ].map(([l, v]) => (
                    <div key={l as string} className="rounded-xl bg-gray-50 p-3 dark:bg-gray-800">
                      <p className="text-xl font-black text-gray-900 dark:text-white">{v}</p>
                      <p className="text-[11px] text-gray-500">{l}</p>
                    </div>
                  ))}
                </div>
                {besoins.length === 0 ? (
                  <p className="mt-4 text-xs text-gray-400">لا توجد كفالات نشطة</p>
                ) : (
                  <ul className="mt-4 space-y-2">
                    {besoins.map(([b, n]) => (
                      <li key={b} className="grid grid-cols-12 items-center gap-2 text-xs" title={`${besoinLabel(b)}: ${n}`}>
                        <span className="col-span-4 truncate font-bold text-gray-600 dark:text-gray-300">{besoinLabel(b)}</span>
                        <span className="col-span-7 h-2 rounded-full" style={{ background: "var(--track)" }}>
                          <span className="block h-2 rounded-full" style={{ width: `${(n / maxBesoin) * 100}%`, background: "var(--s1)" }} />
                        </span>
                        <span className="col-span-1 text-left tabular-nums text-gray-600 dark:text-gray-300">{n}</span>
                      </li>
                    ))}
                  </ul>
                )}
                <p className="mt-3 text-[11px] text-gray-400">لا تُحتسب ضمن مصاريف الجمعية.</p>
              </Card>
            </div>

            {/* ---------------- Activités à venir ---------------- */}
            <Card
              title="الأنشطة القادمة"
              action={
                <Link to="/calendar" className="text-xs font-bold text-indigo-600">
                  التقويم ←
                </Link>
              }
            >
              {data.evenements.aVenir.length === 0 ? (
                <p className="text-sm text-gray-400">لا توجد أنشطة مبرمجة</p>
              ) : (
                <ul className="divide-y divide-gray-100 dark:divide-gray-800">
                  {data.evenements.aVenir.map((e) => (
                    <li key={e.id}>
                      <Link to={`/event-details/${e.id}`} className="flex items-center gap-4 py-3 hover:bg-gray-50/60 dark:hover:bg-white/[0.02]">
                        <span className="w-24 shrink-0 rounded-xl bg-indigo-50 px-2 py-2 text-center text-xs font-black text-indigo-700 dark:bg-indigo-500/10 dark:text-indigo-300">
                          {formatDate(e.startDate)}
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="block truncate font-bold text-gray-900 dark:text-white">{e.title}</span>
                          <span className="block truncate text-xs text-gray-400">
                            {[e.type, e.place].filter(Boolean).join(" · ")}
                          </span>
                        </span>
                        <span className="shrink-0 text-xs font-bold text-gray-500">{e.participants} مشارك</span>
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </Card>
          </>
        )}
      </div>
    </>
  );
}
