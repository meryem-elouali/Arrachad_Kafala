import { useEffect, useMemo, useState } from "react";
import PageBreadcrumb from "../components/common/PageBreadCrumb";
import PageMeta from "../components/common/PageMeta";

const API = "http://localhost:8080/api/degre-famille";

type Degre = Record<string, number>;

const DEFAULTS: Degre = {
  pointParEnfant: 0,
  pointEnfantMalade: 0,
  pointHabitationPropriete: 0,
  pointHabitationRahn: 0,
  pointHabitationLoyer: 0,
  pointMereTravailleOui: 0,
  pointMereTravailleNon: 0,
  pointMereMaladeOui: 0,
  pointMereMaladeNon: 0,
  pointAideFamilleOui: 0,
  pointAideFamilleNon: 0,
  pointRevenuMensuelOui: 0,
  pointRevenuMensuelNon: 0,
  pointAutreAssociationOui: 0,
  pointAutreAssociationNon: 0,
  pointPossedeMaladeOui: 0,
  pointPossedeMaladeNon: 0,
};

interface Group {
  title: string;
  subtitle: string;
  tone: string;
  fields: { label: string; name: string }[];
}

const GROUPS: Group[] = [
  {
    title: "الأبناء",
    subtitle: "النقط المرتبطة بعدد الأبناء وحالتهم الصحية",
    tone: "bg-indigo-50 text-indigo-600",
    fields: [
      { label: "نقطة لكل ابن", name: "pointParEnfant" },
      { label: "نقطة لكل ابن مريض", name: "pointEnfantMalade" },
    ],
  },
  {
    title: "السكن",
    subtitle: "نقط حسب نوع السكن",
    tone: "bg-amber-50 text-amber-600",
    fields: [
      { label: "ملك", name: "pointHabitationPropriete" },
      { label: "رهن", name: "pointHabitationRahn" },
      { label: "كراء", name: "pointHabitationLoyer" },
    ],
  },
  {
    title: "الأم",
    subtitle: "العمل والحالة الصحية للأم",
    tone: "bg-pink-50 text-pink-600",
    fields: [
      { label: "الأم تعمل: نعم", name: "pointMereTravailleOui" },
      { label: "الأم تعمل: لا", name: "pointMereTravailleNon" },
      { label: "الأم مريضة: نعم", name: "pointMereMaladeOui" },
      { label: "الأم مريضة: لا", name: "pointMereMaladeNon" },
    ],
  },
  {
    title: "الدخل والمساعدات",
    subtitle: "المساعدات والدخل الشهري والجمعيات",
    tone: "bg-emerald-50 text-emerald-600",
    fields: [
      { label: "مساعدة العائلة: نعم", name: "pointAideFamilleOui" },
      { label: "مساعدة العائلة: لا", name: "pointAideFamilleNon" },
      { label: "دخل مالي شهري: نعم", name: "pointRevenuMensuelOui" },
      { label: "دخل مالي شهري: لا", name: "pointRevenuMensuelNon" },
      { label: "جمعية أخرى: نعم", name: "pointAutreAssociationOui" },
      { label: "جمعية أخرى: لا", name: "pointAutreAssociationNon" },
    ],
  },
  {
    title: "المرض في المنزل",
    subtitle: "العناية بشخص مريض داخل الأسرة",
    tone: "bg-red-50 text-red-600",
    fields: [
      { label: "تعتني بشخص مريض: نعم", name: "pointPossedeMaladeOui" },
      { label: "تعتني بشخص مريض: لا", name: "pointPossedeMaladeNon" },
    ],
  },
];

const inputCls =
  "h-11 w-full rounded-xl border border-gray-200 bg-gray-50 px-3.5 text-center text-sm font-bold text-gray-800 outline-none transition focus:border-indigo-300 focus:bg-white focus:ring-4 focus:ring-indigo-500/10";

export default function DegreFamillePage() {
  const [degre, setDegre] = useState<Degre>(DEFAULTS);
  const [initial, setInitial] = useState<Degre>(DEFAULTS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState<{ type: "ok" | "error"; msg: string } | null>(null);

  useEffect(() => {
    fetch(API)
      .then((res) => {
        if (!res.ok) throw new Error();
        return res.json();
      })
      .then((data) => {
        const merged = { ...DEFAULTS, ...data };
        setDegre(merged);
        setInitial(merged);
      })
      .catch(() => setStatus({ type: "error", msg: "تعذر تحميل النقط" }))
      .finally(() => setLoading(false));
  }, []);

  const dirty = useMemo(
    () => Object.keys(DEFAULTS).some((k) => Number(degre[k]) !== Number(initial[k])),
    [degre, initial]
  );

  const handleChange = (name: string, value: string) => {
    setDegre((p) => ({ ...p, [name]: value === "" ? 0 : Number(value) }));
    setStatus(null);
  };

  const save = async () => {
    setSaving(true);
    setStatus(null);
    try {
      const res = await fetch(API, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(degre),
      });
      if (!res.ok) throw new Error();
      setInitial(degre);
      setStatus({ type: "ok", msg: "تم حفظ النقط بنجاح" });
    } catch {
      setStatus({ type: "error", msg: "تعذر حفظ النقط، حاول مرة أخرى" });
    } finally {
      setSaving(false);
    }
  };

  const reset = () => {
    setDegre(initial);
    setStatus(null);
  };

  return (
    <div dir="rtl">
      <PageMeta title="درجات العائلة" description="إعداد نقط احتساب درجة العائلة" />
      <PageBreadcrumb pageTitle="درجات العائلة" />

      <div className="mx-auto max-w-5xl space-y-6 pb-28">
        {/* HEADER */}
        <div className="rounded-3xl bg-gradient-to-l from-indigo-600 via-indigo-600 to-blue-500 p-6 text-white shadow-lg">
          <p className="text-xs font-semibold text-white/70">إعدادات النظام</p>
          <h1 className="mt-1 text-2xl font-extrabold">نقط احتساب درجة العائلة</h1>
          <p className="mt-1 text-sm text-white/80">
            تُجمع هذه النقط لكل عائلة، ويحدد المجموع درجتها تلقائياً.
          </p>
        </div>

        {/* BARÈME */}
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <div className="rounded-2xl border border-green-100 bg-green-50 p-4 text-center">
            <p className="text-xs font-semibold text-green-700">الدرجة 1</p>
            <p className="mt-1 text-lg font-extrabold text-green-700">المجموع ≥ 7</p>
          </div>
          <div className="rounded-2xl border border-amber-100 bg-amber-50 p-4 text-center">
            <p className="text-xs font-semibold text-amber-700">الدرجة 2</p>
            <p className="mt-1 text-lg font-extrabold text-amber-700">من 4 إلى 6</p>
          </div>
          <div className="rounded-2xl border border-red-100 bg-red-50 p-4 text-center">
            <p className="text-xs font-semibold text-red-700">الدرجة 3</p>
            <p className="mt-1 text-lg font-extrabold text-red-700">أقل من 4</p>
          </div>
        </div>

        {status && (
          <div
            className={`rounded-2xl border px-5 py-3 text-sm font-bold ${
              status.type === "ok"
                ? "border-green-200 bg-green-50 text-green-700"
                : "border-red-200 bg-red-50 text-red-700"
            }`}
          >
            {status.msg}
          </div>
        )}

        {/* GROUPES */}
        {loading ? (
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-40 animate-pulse rounded-3xl bg-gray-100" />
            ))}
          </div>
        ) : (
          GROUPS.map((g) => (
            <section key={g.title} className="rounded-3xl border border-gray-200 bg-white shadow-sm">
              <div className="flex items-center gap-3 border-b border-gray-100 px-6 py-5">
                <span className={`flex h-10 w-10 items-center justify-center rounded-xl text-base font-extrabold ${g.tone}`}>
                  {g.fields.length}
                </span>
                <div>
                  <h3 className="text-lg font-extrabold text-gray-800">{g.title}</h3>
                  <p className="text-xs text-gray-400">{g.subtitle}</p>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4 p-6 sm:grid-cols-2 lg:grid-cols-3">
                {g.fields.map((f) => (
                  <label key={f.name} className="block">
                    <span className="mb-1.5 block text-xs font-semibold text-gray-500">{f.label}</span>
                    <input
                      type="number"
                      step="0.5"
                      value={degre[f.name] ?? 0}
                      onChange={(e) => handleChange(f.name, e.target.value)}
                      className={inputCls}
                    />
                  </label>
                ))}
              </div>
            </section>
          ))
        )}
      </div>

      {/* BARRE D'ENREGISTREMENT */}
      <div className="sticky bottom-4 z-30 mx-auto max-w-5xl">
        <div className="flex items-center justify-between gap-3 rounded-2xl border border-gray-200 bg-white/95 p-3 shadow-xl backdrop-blur">
          <span className={`px-2 text-sm ${dirty ? "font-bold text-amber-600" : "text-gray-400"}`}>
            {dirty ? "توجد تعديلات غير محفوظة" : "لا توجد تعديلات"}
          </span>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={reset}
              disabled={!dirty || saving}
              className="h-11 rounded-xl border border-gray-200 px-5 text-sm font-semibold text-gray-600 hover:bg-gray-50 disabled:opacity-40"
            >
              تراجع
            </button>
            <button
              type="button"
              onClick={save}
              disabled={!dirty || saving}
              className="h-11 rounded-xl bg-indigo-600 px-8 text-sm font-bold text-white shadow-sm transition hover:bg-indigo-700 disabled:opacity-40"
            >
              {saving ? "جاري الحفظ..." : "حفظ النقط"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}