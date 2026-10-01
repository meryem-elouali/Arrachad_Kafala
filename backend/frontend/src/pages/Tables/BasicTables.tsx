import React, { useEffect, useMemo, useState } from "react";
import axios from "axios";
import ExcelJS from "exceljs";
import { useNavigate } from "react-router-dom";

const API = "http://localhost:8080/api";
const UNDEF = "غير محددة";

type ExportType = "FAMILLES" | "MERES" | "ENFANTS" | "CONSO" | "PARTICIPATIONS";
type ExportFormat = "EXCEL" | "PDF";

const EXPORT_LABELS: Record<ExportType, string> = {
  FAMILLES: "العائلات",
  MERES: "الأمهات",
  ENFANTS: "الأطفال",
  CONSO: "المبالغ المصروفة",
  PARTICIPATIONS: "مشاركات الأنشطة",
};

const fmt = (n: any) =>
  `${Number(n || 0).toLocaleString("fr-FR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })} DH`;

const currentYear = new Date().getFullYear();
const YEARS = Array.from({ length: 6 }, (_, i) => String(currentYear - i));

const AVATARS = [
  "from-blue-500 to-indigo-500",
  "from-emerald-500 to-teal-500",
  "from-amber-500 to-orange-500",
  "from-pink-500 to-rose-500",
  "from-purple-500 to-fuchsia-500",
  "from-cyan-500 to-sky-500",
];

const colLetter = (n: number) => {
  let s = "";
  while (n > 0) {
    const m = (n - 1) % 26;
    s = String.fromCharCode(65 + m) + s;
    n = Math.floor((n - 1) / 26);
  }
  return s;
};

const downloadBlob = (blob: Blob, filename: string) => {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
};

const printPdf = (title: string, params: string[], headers: string[], rows: any[][]) => {
  const w = window.open("", "_blank");
  if (!w) {
    alert("اسمح بالنوافذ المنبثقة لتصدير PDF");
    return;
  }
  const esc = (v: any) =>
    String(v ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  w.document.write(`<!DOCTYPE html><html dir="rtl" lang="ar"><head><meta charset="utf-8">
<title>${esc(title)}</title>
<style>
  body{font-family:Arial,Tahoma,sans-serif;margin:24px;color:#111}
  h1{background:#1e3a8a;color:#fff;text-align:center;padding:14px;border-radius:8px;font-size:20px}
  .info{background:#eff6ff;text-align:center;padding:8px;border-radius:6px;font-weight:bold;font-size:13px;margin-bottom:14px}
  table{width:100%;border-collapse:collapse;font-size:12px}
  th{background:#2563eb;color:#fff;padding:8px;border:1px solid #d1d5db}
  td{padding:7px;border:1px solid #d1d5db;text-align:center}
  tr:nth-child(even) td{background:#f9fafb}
  thead{display:table-header-group}
  tr{page-break-inside:avoid}
  @page{size:A4 landscape;margin:12mm}
</style></head><body>
<h1>${esc(title)}</h1>
<div class="info">${esc(params.join("   |   "))}</div>
<table><thead><tr><th>#</th>${headers.map((h) => `<th>${esc(h)}</th>`).join("")}</tr></thead>
<tbody>${rows
    .map((r, i) => `<tr><td>${i + 1}</td>${r.map((c) => `<td>${esc(c)}</td>`).join("")}</tr>`)
    .join("")}</tbody></table>
</body></html>`);
  w.document.close();
  w.focus();
  setTimeout(() => w.print(), 400);
};

const StatCard = ({
  label,
  value,
  color,
}: {
  label: string;
  value: React.ReactNode;
  color: string;
}) => (
  <div className={`rounded-2xl border p-5 ${color}`}>
    <p className="text-sm text-gray-500">{label}</p>
    <p className="mt-1 text-2xl font-bold">{value}</p>
  </div>
);

export default function FamillesTable() {
  const navigate = useNavigate();
  const [familles, setFamilles] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // ===== Filtres / tri / pagination =====
  const [search, setSearch] = useState("");
  const [fType, setFType] = useState("");
  const [fDegre, setFDegre] = useState("");
   const [fInscription, setFInscription] = useState("");
  const [sort, setSort] = useState<{ key: string; dir: 1 | -1 }>({ key: "nomFamille", dir: 1 });
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);

  // ===== Année + consommation =====
  const [year, setYear] = useState<string>(String(currentYear));
  const [conso, setConso] = useState<Record<string, any>>({});
  const [detailFamille, setDetailFamille] = useState<any | null>(null);

  // ===== Export =====
  const [exportOpen, setExportOpen] = useState(false);
  const [exportType, setExportType] = useState<ExportType>("FAMILLES");
  const [exportFormat, setExportFormat] = useState<ExportFormat>("EXCEL");
  const [exportDegres, setExportDegres] = useState<string[]>([]);
  const [exportTypeFamille, setExportTypeFamille] = useState<string | null>(null);
  const [ageMin, setAgeMin] = useState<string>("");
  const [ageMax, setAgeMax] = useState<string>("");
  const [enfants, setEnfants] = useState<any[]>([]);
  const [enfantsLoading, setEnfantsLoading] = useState(false);

  // ===== Chargement des familles =====
  useEffect(() => {
    axios
      .get(`${API}/famille`)
      .then((res) => {
        const data = (Array.isArray(res.data) ? res.data : []).map((f: any) => {
          const degre = f.degreFamille?.nom ?? f.degreFamille ?? f.degre ?? null;
          return {
            ...f,
            nomFamille: f.pere?.nom || f.mere?.nom || "—",
            nomCompletMere: f.mere
              ? `${f.mere.nom ?? ""} ${f.mere.prenom ?? ""}`.trim()
              : "—",
            nombreEnfants: Number(f.nombreEnfants || 0),
            typeFamilleNom: f.typeFamille?.nom || "—",
            degreFamille: degre != null && degre !== "" ? String(degre) : UNDEF,
            anneeInscription: (() => {
              const m = String(f.dateInscription ?? "").match(/(\d{4})/);
              return m ? m[1] : "";
            })(),
          };
        });
        setFamilles(data);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  // ===== Consommation par année =====
  useEffect(() => {
    axios
      .get(`${API}/events/stats/familles`, { params: year === "all" ? {} : { year } })
      .then((res) => {
        const m: Record<string, any> = {};
        (Array.isArray(res.data) ? res.data : []).forEach(
          (s: any) => (m[String(s.familleId)] = s)
        );
        setConso(m);
      })
      .catch(() => setConso({}));
  }, [year]);

  const getConso = (f: any) =>
    conso[String(f.id)] || { total: 0, presentCount: 0, absentCount: 0, events: [] };

  // Enfants : chargés à l'ouverture de la fenêtre d'export
  useEffect(() => {
    if (!exportOpen || enfants.length > 0) return;
    setEnfantsLoading(true);
    axios
      .get(`${API}/enfant`)
      .then((res) => setEnfants(Array.isArray(res.data) ? res.data : []))
      .catch(console.error)
      .finally(() => setEnfantsLoading(false));
  }, [exportOpen]);

  // ===== Statistiques =====
  const stats = useMemo(() => {
    const totalEnfants = familles.reduce((s, f) => s + f.nombreEnfants, 0);
    const countBy = (key: string) => {
      const m: Record<string, number> = {};
      familles.forEach((f) => {
        const k = f[key] || UNDEF;
        m[k] = (m[k] || 0) + 1;
      });
      return Object.entries(m).sort((a, b) => b[1] - a[1]);
    };
    return {
      totalFamilles: familles.length,
      totalEnfants,
      totalMeres: familles.filter((f) => f.mere).length,
      moyenne: familles.length ? totalEnfants / familles.length : 0,
      sansDegre: familles.filter((f) => f.degreFamille === UNDEF).length,
      sansEnfants: familles.filter((f) => f.nombreEnfants === 0).length,
      parDegre: countBy("degreFamille").sort((a, b) =>
        a[0].localeCompare(b[0], undefined, { numeric: true })
      ),
      parType: countBy("typeFamilleNom").filter(([k]) => k !== "—"),
      totalDepense: Object.values(conso).reduce(
        (s: number, c: any) => s + Number(c.total || 0),
        0
      ),
    };
  }, [familles, conso]);

  const typesFamille = useMemo(
    () => stats.parType.map(([k]) => ({ label: k, value: k })),
    [stats]
  );
  const degresList = useMemo(() => stats.parDegre.map(([k]) => k), [stats]);
const anneesInscription = useMemo(
  () =>
    Array.from(new Set(familles.map((f) => f.anneeInscription).filter(Boolean))).sort(
      (a, b) => Number(b) - Number(a)
    ),
  [familles]
);
 const hasFilter = !!(search || fType || fDegre || fInscription);
 const resetFilters = () => {
   setSearch("");
   setFType("");
   setFDegre("");
   setFInscription("");
 };
const sortedFamilles = useMemo(() => {
  const s = search.trim().toLowerCase();

  const list = familles.filter(
    (f) =>
      (year === "all" || f.anneeInscription === year) &&
      (!fType || f.typeFamilleNom === fType) &&
      (!fDegre || f.degreFamille === fDegre) &&
      (!fInscription || f.anneeInscription === fInscription) &&
      (!s ||
        f.nomFamille?.toLowerCase().includes(s) ||
        f.nomCompletMere?.toLowerCase().includes(s))
  );

  const val = (f: any) =>
    sort.key === "total"
      ? Number(getConso(f).total)
      : f[sort.key];

  return [...list].sort((a, b) => {
    const x = val(a);
    const y = val(b);

    if (typeof x === "number" && typeof y === "number") {
      return (x - y) * sort.dir;
    }

    return (
      String(x ?? "").localeCompare(String(y ?? ""), "ar", {
        numeric: true,
      }) * sort.dir
    );
  });
}, [
  familles,
  search,
  fType,
  fDegre,
  fInscription,
  year,
  sort,
  conso,
]);

useEffect(() => {
  setPage(0);
}, [search, fType, fDegre, fInscription, year, rowsPerPage]);

const pageCount = Math.max(
  1,
  Math.ceil(sortedFamilles.length / rowsPerPage)
);

const pageRows = sortedFamilles.slice(
  page * rowsPerPage,
  (page + 1) * rowsPerPage
);

const maxConso = Math.max(
  ...familles.map((f) => Number(getConso(f).total)),
  1
);

const toggleSort = (key: string) =>
  setSort((s) =>
    s.key === key
      ? { key, dir: (s.dir * -1) as 1 | -1 }
      : { key, dir: 1 }
  );
  // ===== Lien enfant -> famille =====
  const familleOfEnfant = useMemo(() => {
    const byId: Record<string, any> = {};
    const byMere: Record<string, any> = {};
    const byEnfant: Record<string, any> = {};
    familles.forEach((f) => {
      byId[String(f.id)] = f;
      if (f.mere?.id != null) byMere[String(f.mere.id)] = f;
      if (Array.isArray(f.enfants))
        f.enfants.forEach((e: any) => (byEnfant[String(e.id)] = f));
    });
    return (e: any) =>
      byEnfant[String(e.id)] ||
      e.famille ||
      byId[String(e.familleId)] ||
      byMere[String(e.mere?.id ?? e.mereId)] ||
      null;
  }, [familles]);

  // ===== Données à exporter =====
  const exportData = useMemo(() => {
    const degreOk = (d: string) => exportDegres.length === 0 || exportDegres.includes(d);
    const typeOk = (t: string) => !exportTypeFamille || t === exportTypeFamille;
    const famFiltered = familles.filter(
      (f) => degreOk(f.degreFamille) && typeOk(f.typeFamilleNom)
    );

    if (exportType === "FAMILLES") {
      return {
        headers: ["اسم العائلة", "اسم الأم", "عدد الأطفال", "نوع العائلة", "الدرجة"],
        rows: famFiltered.map((f) => [
          `عائلة ${f.nomFamille}`,
          f.nomCompletMere,
          f.nombreEnfants,
          f.typeFamilleNom,
          f.degreFamille,
        ]),
      };
    }

    if (exportType === "MERES") {
      return {
        headers: ["الاسم", "اللقب", "اسم عائلة الأطفال", "عدد الأطفال", "الدرجة"],
        rows: famFiltered
          .filter((f) => f.mere)
          .map((f) => [
            f.mere.nom ?? "",
            f.mere.prenom ?? "",
            f.pere?.nom ?? "-",
            f.nombreEnfants,
            f.degreFamille,
          ]),
      };
    }

    if (exportType === "CONSO") {
      return {
        headers: [
          "اسم العائلة",
          "الدرجة",
          "نوع العائلة",
          "عدد المشاركات",
          "حضور",
          "غياب",
          "المبلغ المصروف",
        ],
        rows: famFiltered.map((f) => {
          const c = getConso(f);
          return [
            `عائلة ${f.nomFamille}`,
            f.degreFamille,
            f.typeFamilleNom,
            c.events.length,
            c.presentCount,
            c.absentCount,
            fmt(c.total),
          ];
        }),
      };
    }

    if (exportType === "PARTICIPATIONS") {
      const rows: any[][] = [];
      famFiltered.forEach((f) => {
        getConso(f).events.forEach((ev: any) => {
          rows.push([
            `عائلة ${f.nomFamille}`,
            ev.title,
            ev.startDate,
            ev.type || "-",
            ev.participant,
            ev.present ? "حاضر" : "غائب",
            ev.present ? "" : ev.motif || "",
            fmt(ev.montant),
          ]);
        });
      });
      return {
        headers: ["العائلة", "النشاط", "التاريخ", "النوع", "المشارك", "الحالة", "سبب الغياب", "المبلغ"],
        rows,
      };
    }

    // ENFANTS
    const min = ageMin !== "" ? Number(ageMin) : null;
    const max = ageMax !== "" ? Number(ageMax) : null;
    const rows = enfants
      .map((e) => {
        const f = familleOfEnfant(e);
        return { e, f, degre: f?.degreFamille ?? UNDEF };
      })
      .filter(({ e, f, degre }) => {
        const age = e.age != null ? Number(e.age) : null;
        if (min !== null && (age === null || age < min)) return false;
        if (max !== null && (age === null || age > max)) return false;
        return degreOk(degre) && (!exportTypeFamille || f?.typeFamilleNom === exportTypeFamille);
      })
      .sort((a, b) => Number(a.e.age ?? 0) - Number(b.e.age ?? 0))
      .map(({ e, f, degre }) => [
        e.nom ?? "",
        e.prenom ?? "",
        e.age ?? "-",
        f?.pere?.nom ?? e.pere?.nom ?? "-",
        degre,
      ]);
    return { headers: ["الاسم", "اللقب", "السن", "اسم العائلة", "الدرجة"], rows };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [exportType, exportDegres, exportTypeFamille, ageMin, ageMax, familles, enfants, familleOfEnfant, conso]);

  const toggleDegre = (d: string) =>
    setExportDegres((prev) => (prev.includes(d) ? prev.filter((x) => x !== d) : [...prev, d]));

  // ===== Génération =====
  const runExport = async () => {
    const { headers, rows } = exportData;
    if (rows.length === 0) return;

    const params: string[] = [`العدد: ${rows.length}`];
    if (exportType === "CONSO" || exportType === "PARTICIPATIONS")
      params.push(`السنة: ${year === "all" ? "كل السنوات" : year}`);
    if (exportDegres.length) params.push(`الدرجات: ${exportDegres.join("، ")}`);
    if (exportTypeFamille) params.push(`نوع العائلة: ${exportTypeFamille}`);
    if (exportType === "ENFANTS" && (ageMin || ageMax))
      params.push(`السن: ${ageMin || "0"} - ${ageMax || "∞"}`);
    if (exportType === "CONSO") params.push(`المجموع: ${fmt(stats.totalDepense)}`);

    const title = `لائحة ${EXPORT_LABELS[exportType]}`;

    if (exportFormat === "PDF") {
      printPdf(title, params, headers, rows);
      setExportOpen(false);
      return;
    }

    const all = ["#", ...headers];
    const lastCol = colLetter(all.length);
    const wb = new ExcelJS.Workbook();
    const ws = wb.addWorksheet(EXPORT_LABELS[exportType], {
      views: [{ rightToLeft: true, state: "frozen", ySplit: 4 }],
      pageSetup: { orientation: "landscape", fitToPage: true, fitToWidth: 1, fitToHeight: 0 },
    });

    const thin = { style: "thin" as const, color: { argb: "FFD1D5DB" } };
    const border = { top: thin, left: thin, bottom: thin, right: thin };
    ws.columns = all.map((_, i) => ({ width: i === 0 ? 6 : 24 }));

    ws.mergeCells(`A1:${lastCol}1`);
    const t = ws.getCell("A1");
    t.value = title;
    t.font = { name: "Arial", size: 16, bold: true, color: { argb: "FFFFFFFF" } };
    t.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF1E3A8A" } };
    t.alignment = { horizontal: "center", vertical: "middle" };
    ws.getRow(1).height = 34;

    ws.mergeCells(`A2:${lastCol}2`);
    const info = ws.getCell("A2");
    info.value = params.join("   |   ");
    info.font = { name: "Arial", size: 11, bold: true, color: { argb: "FF374151" } };
    info.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFEFF6FF" } };
    info.alignment = { horizontal: "center", vertical: "middle" };
    ws.getRow(2).height = 24;
    ws.getRow(3).height = 8;

    const hr = ws.getRow(4);
    all.forEach((h, i) => (hr.getCell(i + 1).value = h));
    hr.height = 26;
    hr.eachCell((c) => {
      c.font = { name: "Arial", size: 11, bold: true, color: { argb: "FFFFFFFF" } };
      c.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF2563EB" } };
      c.alignment = { horizontal: "center", vertical: "middle", wrapText: true };
      c.border = border;
    });

    rows.forEach((r, i) => {
      const row = ws.addRow([i + 1, ...r]);
      row.height = 22;
      const zebra = i % 2 === 0 ? "FFFFFFFF" : "FFF9FAFB";
      row.eachCell({ includeEmpty: true }, (c, n) => {
        if (n > all.length) return;
        c.font = { name: "Arial", size: 11 };
        c.border = border;
        c.fill = { type: "pattern", pattern: "solid", fgColor: { argb: zebra } };
        c.alignment = { horizontal: "center", vertical: "middle", wrapText: true };
      });
    });

    const buffer = await wb.xlsx.writeBuffer();
    downloadBlob(
      new Blob([buffer], {
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      }),
      `${EXPORT_LABELS[exportType]}.xlsx`
    );
    setExportOpen(false);
  };

  // ===== UI =====
  const maxDegre = Math.max(...stats.parDegre.map(([, n]) => n), 1);
  const maxType = Math.max(...stats.parType.map(([, n]) => n), 1);

  return (
    <div dir="rtl" className="px-6 py-4">
      <div className="mx-auto max-w-7xl space-y-6">
        {/* ===== HEADER ===== */}
        <div className="flex flex-col gap-4 rounded-3xl border border-gray-200 bg-white p-6 shadow-sm md:flex-row md:items-center md:justify-between">
          <div>
            <p className="mb-1 text-xs font-semibold text-blue-600">إدارة العائلات</p>
            <h1 className="text-2xl font-bold text-gray-900">قائمة العائلات</h1>
            <p className="mt-1 text-sm text-gray-400">
              عرض، بحث، تصفية وتصدير بيانات العائلات والأمهات والأطفال والمبالغ المصروفة
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <select
              value={year}
              onChange={(e) => setYear(e.target.value)}
              className="h-11 rounded-xl border border-gray-200 bg-white px-3 text-sm font-semibold"
            >
              <option value="all">كل السنوات</option>
              {YEARS.map((y) => (
                <option key={y} value={y}>
                  {y}
                </option>
              ))}
            </select>

            {hasFilter && (
              <button
                type="button"
                onClick={resetFilters}
                className="h-11 rounded-xl border border-gray-200 bg-white px-5 text-sm font-semibold text-gray-600 hover:bg-gray-50"
              >
                إلغاء التصفية
              </button>
            )}

            <button
              type="button"
              onClick={() => setExportOpen(true)}
              className="inline-flex h-11 items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-5 text-sm font-semibold text-emerald-700 transition hover:-translate-y-0.5 hover:bg-emerald-100"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M12 3v12" />
                <path d="m7 10 5 5 5-5" />
                <path d="M5 21h14" />
              </svg>
              تصدير
            </button>
          </div>
        </div>

        {/* ===== STATS ===== */}
        <div className="grid grid-cols-2 gap-4 md:grid-cols-4 lg:grid-cols-7">
          <StatCard label="عدد العائلات" value={stats.totalFamilles} color="bg-blue-50 text-blue-700 border-blue-100" />
          <StatCard label="الأمهات" value={stats.totalMeres} color="bg-purple-50 text-purple-700 border-purple-100" />
          <StatCard label="إجمالي الأطفال" value={stats.totalEnfants} color="bg-indigo-50 text-indigo-700 border-indigo-100" />
          <StatCard label="معدل الأطفال/عائلة" value={stats.moyenne.toFixed(1)} color="bg-green-50 text-green-700 border-green-100" />
          <StatCard label="عائلات بدون أطفال" value={stats.sansEnfants} color="bg-amber-50 text-amber-700 border-amber-100" />
          <StatCard label="درجة غير محددة" value={stats.sansDegre} color="bg-red-50 text-red-700 border-red-100" />
          <StatCard
            label={`المبلغ المصروف ${year === "all" ? "" : year}`}
            value={fmt(stats.totalDepense)}
            color="bg-emerald-50 text-emerald-700 border-emerald-100"
          />
        </div>

        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          {/* Par degré */}
          <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
            <h4 className="mb-1 font-bold text-gray-800">التوزيع حسب الدرجة</h4>
            <p className="mb-4 text-xs text-gray-400">اضغط على درجة لتصفية الجدول</p>
            <div className="space-y-3">
              {stats.parDegre.map(([d, n]) => (
                <button
                  key={d}
                  type="button"
                  onClick={() => setFDegre(fDegre === d ? "" : d)}
                  className={`block w-full rounded-lg p-1 text-right transition ${
                    fDegre === d ? "bg-amber-50" : ""
                  }`}
                >
                  <div className="mb-1 flex justify-between text-sm">
                    <span className="font-semibold text-gray-700">
                      {d === UNDEF ? d : `الدرجة ${d}`}
                    </span>
                    <span className="text-gray-500">{n}</span>
                  </div>
                  <div className="h-2 w-full overflow-hidden rounded bg-gray-100">
                    <div
                      className={`h-2 rounded ${d === UNDEF ? "bg-red-400" : "bg-amber-500"}`}
                      style={{ width: `${(n / maxDegre) * 100}%` }}
                    />
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Par type */}
          <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
            <h4 className="mb-1 font-bold text-gray-800">التوزيع حسب نوع العائلة</h4>
            <p className="mb-4 text-xs text-gray-400">اضغط على نوع لتصفية الجدول</p>
            <div className="space-y-3">
              {stats.parType.map(([tp, n]) => (
                <button
                  key={tp}
                  type="button"
                  onClick={() => setFType(fType === tp ? "" : tp)}
                  className={`block w-full rounded-lg p-1 text-right transition ${
                    fType === tp ? "bg-blue-50" : ""
                  }`}
                >
                  <div className="mb-1 flex justify-between text-sm">
                    <span className="font-semibold text-gray-700">{tp}</span>
                    <span className="text-gray-500">{n}</span>
                  </div>
                  <div className="h-2 w-full overflow-hidden rounded bg-gray-100">
                    <div className="h-2 rounded bg-blue-500" style={{ width: `${(n / maxType) * 100}%` }} />
                  </div>
                </button>
              ))}
              {stats.parType.length === 0 && <p className="text-sm text-gray-400">لا توجد بيانات</p>}
            </div>
          </div>
        </div>

        {/* ===== TABLE ===== */}
        <div className="overflow-hidden rounded-3xl border border-gray-200 bg-white shadow-sm">
          {/* Barre d'outils */}
          <div className="flex flex-col gap-3 border-b border-gray-100 p-4 md:flex-row md:items-center">
            <div className="relative flex-1">
              <i className="pi pi-search absolute right-4 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="ابحث باسم العائلة أو الأم..."
                className="h-11 w-full rounded-xl border border-gray-200 bg-gray-50 pr-11 pl-4 text-sm outline-none transition focus:border-indigo-300 focus:bg-white focus:ring-4 focus:ring-indigo-500/10"
              />
            </div>

            <select
              value={fType}
              onChange={(e) => setFType(e.target.value)}
              className="h-11 rounded-xl border border-gray-200 bg-gray-50 px-3 text-sm"
            >
              <option value="">كل الأنواع</option>
              {typesFamille.map((t) => (
                <option key={t.value} value={t.value}>
                  {t.label}
                </option>
              ))}
            </select>

            <select
              value={fDegre}
              onChange={(e) => setFDegre(e.target.value)}
              className="h-11 rounded-xl border border-gray-200 bg-gray-50 px-3 text-sm"
            >
              <option value="">كل الدرجات</option>
              {degresList.map((d) => (
                <option key={d} value={d}>
                  {d === UNDEF ? d : `الدرجة ${d}`}
                </option>
              ))}
            </select>
<select
  value={fInscription}
  onChange={(e) => setFInscription(e.target.value)}
  className="h-11 rounded-xl border border-gray-200 bg-gray-50 px-3 text-sm"
>
  <option value="">كل سنوات التسجيل</option>
  {anneesInscription.map((y) => (
    <option key={y} value={y}>
      سجلت في {y}
    </option>
  ))}
</select>
            <span className="whitespace-nowrap rounded-lg bg-indigo-50 px-3 py-2 text-xs font-bold text-indigo-700">
              {sortedFamilles.length} عائلة
            </span>
          </div>

          {/* Tableau */}
          <div className="overflow-x-auto">
            <table className="min-w-full text-right">
              <thead>
                <tr className="bg-gray-50/70 text-xs font-semibold text-gray-500">
                  {[
                    ["nomFamille", "العائلة"],
                    ["nombreEnfants", "الأطفال"],
                    ["typeFamilleNom", "النوع"],
                    ["degreFamille", "الدرجة"],
                    ["total", "المبلغ المصروف"],
                  ].map(([key, label]) => (
                    <th key={key} className="px-5 py-4">
                      <button
                        type="button"
                        onClick={() => toggleSort(key)}
                        className="inline-flex items-center gap-1 hover:text-indigo-600"
                      >
                        {label}
                        <span className={sort.key === key ? "text-indigo-600" : "text-gray-300"}>
                          {sort.key === key ? (sort.dir === 1 ? "▲" : "▼") : "↕"}
                        </span>
                      </button>
                    </th>
                  ))}
                  <th className="px-5 py-4">الحضور / الغياب</th>
                  <th className="px-5 py-4 text-center">الإجراء</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-gray-100">
                {loading && (
                  <tr>
                    <td colSpan={7} className="py-16 text-center text-gray-400">
                      جاري التحميل...
                    </td>
                  </tr>
                )}

                {!loading && pageRows.length === 0 && (
                  <tr>
                    <td colSpan={7} className="py-16 text-center text-gray-400">
                      لا توجد نتائج
                    </td>
                  </tr>
                )}

                {pageRows.map((row) => {
                  const c = getConso(row);
                  const grad = AVATARS[Number(row.id) % AVATARS.length];
                  return (
                    <tr key={row.id} className="group transition hover:bg-indigo-50/40">
                      {/* Famille */}
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-3">
                          <span
                            className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br ${grad} text-base font-bold text-white shadow-sm`}
                          >
                            {row.nomFamille?.charAt(0) || "ع"}
                          </span>
                          <div className="min-w-0">
                            <p className="truncate font-bold text-gray-800">عائلة {row.nomFamille}</p>
                            <p className="truncate text-xs text-gray-400">{row.nomCompletMere}</p>
                          </div>
                        </div>
                      </td>

                      {/* Enfants */}
                      <td className="px-5 py-4">
                        <span className="inline-flex items-center gap-1 rounded-full bg-indigo-50 px-3 py-1 text-xs font-bold text-indigo-700">
                          <i className="pi pi-users text-[10px]" />
                          {row.nombreEnfants}
                        </span>
                      </td>

                      {/* Type */}
                      <td className="px-5 py-4">
                        <span className="rounded-full bg-sky-50 px-3 py-1 text-xs font-semibold text-sky-700">
                          {row.typeFamilleNom}
                        </span>
                      </td>

                      {/* Degré */}
                      <td className="px-5 py-4">
                        <span
                          className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-bold ${
                            row.degreFamille === UNDEF
                              ? "bg-red-50 text-red-600"
                              : "bg-amber-50 text-amber-700"
                          }`}
                        >
                          <span
                            className={`h-1.5 w-1.5 rounded-full ${
                              row.degreFamille === UNDEF ? "bg-red-500" : "bg-amber-500"
                            }`}
                          />
                          {row.degreFamille === UNDEF ? row.degreFamille : `الدرجة ${row.degreFamille}`}
                        </span>
                      </td>

                      {/* Montant */}
                      <td className="px-5 py-4">
                        <p className="whitespace-nowrap text-sm font-bold text-emerald-700">
                          {fmt(c.total)}
                        </p>
                        <div className="mt-1.5 h-1.5 w-28 overflow-hidden rounded-full bg-gray-100">
                          <div
                            className="h-1.5 rounded-full bg-emerald-500"
                            style={{ width: `${(Number(c.total) / maxConso) * 100}%` }}
                          />
                        </div>
                      </td>

                      {/* Présences */}
                      <td className="px-5 py-4">
                        <div className="flex gap-2">
                          <span className="inline-flex items-center gap-1 rounded-full bg-green-50 px-2.5 py-1 text-xs font-bold text-green-700">
                            ✓ {c.presentCount}
                          </span>
                          <span className="inline-flex items-center gap-1 rounded-full bg-red-50 px-2.5 py-1 text-xs font-bold text-red-600">
                            ✗ {c.absentCount}
                          </span>
                        </div>
                      </td>

                      {/* Actions */}
                      <td className="px-5 py-4">
                        <div className="flex justify-center gap-1">
                          <button
                            type="button"
                            title="الأنشطة والمبالغ"
                            onClick={() => setDetailFamille(row)}
                            className="flex h-9 w-9 items-center justify-center rounded-xl text-gray-400 transition hover:bg-emerald-50 hover:text-emerald-600"
                          >
                            <i className="pi pi-list" />
                          </button>
                          <button
                            type="button"
                            title="عرض الملف"
                            onClick={() => navigate(`/familleprofile/${row.id}`)}
                            className="flex h-9 w-9 items-center justify-center rounded-xl text-gray-400 transition hover:bg-indigo-50 hover:text-indigo-600"
                          >
                            <i className="pi pi-eye" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          <div className="flex flex-col items-center justify-between gap-3 border-t border-gray-100 px-5 py-4 text-sm text-gray-500 md:flex-row">
            <span>
              {sortedFamilles.length === 0
                ? "0"
                : `${page * rowsPerPage + 1} - ${Math.min(
                    (page + 1) * rowsPerPage,
                    sortedFamilles.length
                  )}`}{" "}
              من {sortedFamilles.length}
            </span>

            <div className="flex items-center gap-2">
              <button
                type="button"
                disabled={page === 0}
                onClick={() => setPage(page - 1)}
                className="h-9 rounded-xl border border-gray-200 px-4 font-semibold transition hover:bg-gray-50 disabled:opacity-40"
              >
                السابق
              </button>
              <span className="rounded-xl bg-indigo-600 px-4 py-2 text-xs font-bold text-white">
                {page + 1} / {pageCount}
              </span>
              <button
                type="button"
                disabled={page >= pageCount - 1}
                onClick={() => setPage(page + 1)}
                className="h-9 rounded-xl border border-gray-200 px-4 font-semibold transition hover:bg-gray-50 disabled:opacity-40"
              >
                التالي
              </button>
            </div>

            <select
              value={rowsPerPage}
              onChange={(e) => setRowsPerPage(Number(e.target.value))}
              className="h-9 rounded-xl border border-gray-200 px-2"
            >
              {[5, 10, 20, 50].map((n) => (
                <option key={n} value={n}>
                  {n} / صفحة
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* ===== MODAL EXPORT ===== */}
      {exportOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div dir="rtl" className="max-h-[90vh] w-[680px] max-w-full overflow-y-auto rounded-2xl bg-white shadow-xl">
            <div className="border-b p-5">
              <h3 className="text-xl font-bold text-gray-800">تصدير البيانات</h3>
              <p className="mt-1 text-xs text-gray-400">اختر ما تريد تصديره والصيغة والمعايير</p>
            </div>

            <div className="space-y-5 p-5">
              {/* Type */}
              <div>
                <label className="mb-2 block text-sm font-semibold text-gray-700">ماذا تريد تصديره؟</label>
                <div className="grid grid-cols-2 gap-2 md:grid-cols-5">
                  {(Object.keys(EXPORT_LABELS) as ExportType[]).map((k) => (
                    <button
                      key={k}
                      type="button"
                      onClick={() => setExportType(k)}
                      className={`rounded-xl border px-2 py-3 text-xs font-semibold transition ${
                        exportType === k
                          ? "border-indigo-300 bg-indigo-50 text-indigo-700"
                          : "border-gray-200 text-gray-600 hover:bg-gray-50"
                      }`}
                    >
                      {EXPORT_LABELS[k]}
                    </button>
                  ))}
                </div>
                {(exportType === "CONSO" || exportType === "PARTICIPATIONS") && (
                  <p className="mt-2 text-xs text-gray-400">
                    السنة المعتمدة: {year === "all" ? "كل السنوات" : year} (غيّرها من أعلى الصفحة)
                  </p>
                )}
              </div>

              {/* Format */}
              <div>
                <label className="mb-2 block text-sm font-semibold text-gray-700">الصيغة</label>
                <div className="grid grid-cols-2 gap-2">
                  {(["EXCEL", "PDF"] as ExportFormat[]).map((f) => (
                    <button
                      key={f}
                      type="button"
                      onClick={() => setExportFormat(f)}
                      className={`rounded-xl border px-3 py-3 text-sm font-semibold transition ${
                        exportFormat === f
                          ? "border-indigo-300 bg-indigo-50 text-indigo-700"
                          : "border-gray-200 text-gray-600 hover:bg-gray-50"
                      }`}
                    >
                      {f === "EXCEL" ? "Excel" : "PDF"}
                    </button>
                  ))}
                </div>
              </div>

              {/* Degrés */}
              <div>
                <label className="mb-2 block text-sm font-semibold text-gray-700">
                  الدرجة <span className="font-normal text-gray-400">(بدون اختيار = الكل)</span>
                </label>
                <div className="flex flex-wrap gap-2">
                  {degresList.map((d) => (
                    <button
                      key={d}
                      type="button"
                      onClick={() => toggleDegre(d)}
                      className={`rounded-lg border px-3 py-1.5 text-xs font-bold transition ${
                        exportDegres.includes(d)
                          ? "border-amber-300 bg-amber-100 text-amber-800"
                          : "border-gray-200 text-gray-600 hover:bg-gray-50"
                      }`}
                    >
                      {d === UNDEF ? d : `الدرجة ${d}`}
                    </button>
                  ))}
                </div>
              </div>

              {/* Type famille */}
              <div>
                <label className="mb-2 block text-sm font-semibold text-gray-700">نوع العائلة</label>
                <select
                  value={exportTypeFamille ?? ""}
                  onChange={(e) => setExportTypeFamille(e.target.value || null)}
                  className="w-full rounded-lg border px-3 py-2"
                >
                  <option value="">الكل</option>
                  {typesFamille.map((t) => (
                    <option key={t.value} value={t.value}>
                      {t.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Âge */}
              {exportType === "ENFANTS" && (
                <div>
                  <label className="mb-2 block text-sm font-semibold text-gray-700">الفئة العمرية</label>
                  <div className="grid grid-cols-2 gap-3">
                    <input
                      type="number"
                      min="0"
                      placeholder="من (سنة)"
                      value={ageMin}
                      onChange={(e) => setAgeMin(e.target.value)}
                      className="rounded-lg border px-3 py-2"
                    />
                    <input
                      type="number"
                      min="0"
                      placeholder="إلى (سنة)"
                      value={ageMax}
                      onChange={(e) => setAgeMax(e.target.value)}
                      className="rounded-lg border px-3 py-2"
                    />
                  </div>
                </div>
              )}

              {/* Aperçu */}
              <div className="rounded-xl bg-green-50 p-4 text-sm">
                {exportType === "ENFANTS" && enfantsLoading ? (
                  <span className="text-gray-500">جاري تحميل الأطفال...</span>
                ) : (
                  <span className="font-bold text-green-700">
                    سيتم تصدير {exportData.rows.length} سطر ({EXPORT_LABELS[exportType]})
                  </span>
                )}
              </div>
            </div>

            <div className="flex justify-end gap-2 border-t p-5">
              <button className="rounded-lg bg-gray-200 px-4 py-2" onClick={() => setExportOpen(false)}>
                إلغاء
              </button>
              <button
                disabled={exportData.rows.length === 0}
                onClick={runExport}
                className="rounded-lg bg-emerald-600 px-5 py-2 font-semibold text-white disabled:opacity-40"
              >
                {exportFormat === "PDF" ? "طباعة / PDF" : "تصدير Excel"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ===== MODAL DETAIL FAMILLE ===== */}
      {detailFamille &&
        (() => {
          const c = getConso(detailFamille);
          return (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
              <div dir="rtl" className="max-h-[90vh] w-[760px] max-w-full overflow-y-auto rounded-2xl bg-white shadow-xl">
                <div className="border-b p-5">
                  <h3 className="text-xl font-bold text-gray-800">عائلة {detailFamille.nomFamille}</h3>
                  <p className="mt-1 text-xs text-gray-400">
                    السنة: {year === "all" ? "كل السنوات" : year}
                  </p>
                  <div className="mt-3 grid grid-cols-3 gap-3 text-center">
                    <div className="rounded-xl bg-emerald-50 p-3">
                      <p className="text-xs text-gray-500">المبلغ المصروف</p>
                      <p className="font-bold text-emerald-700">{fmt(c.total)}</p>
                    </div>
                    <div className="rounded-xl bg-green-50 p-3">
                      <p className="text-xs text-gray-500">حضور</p>
                      <p className="font-bold text-green-700">{c.presentCount}</p>
                    </div>
                    <div className="rounded-xl bg-red-50 p-3">
                      <p className="text-xs text-gray-500">غياب</p>
                      <p className="font-bold text-red-600">{c.absentCount}</p>
                    </div>
                  </div>
                </div>

                <div className="p-5">
                  {c.events.length === 0 ? (
                    <p className="text-center text-gray-500">لا توجد مشاركات في هذه السنة</p>
                  ) : (
                    <table className="min-w-full border border-gray-300 text-right text-sm">
                      <thead className="bg-gray-100 font-semibold">
                        <tr>
                          <th className="border p-2">النشاط</th>
                          <th className="border p-2">التاريخ</th>
                          <th className="border p-2">المشارك</th>
                          <th className="border p-2">الحالة</th>
                          <th className="border p-2">المبلغ</th>
                        </tr>
                      </thead>
                      <tbody>
                        {c.events.map((ev: any, i: number) => (
                          <tr key={i} className="border-b">
                            <td className="border p-2 font-semibold">{ev.title}</td>
                            <td className="border p-2">{ev.startDate}</td>
                            <td className="border p-2">{ev.participant}</td>
                            <td className="border p-2">
                              {ev.present ? (
                                <span className="font-bold text-green-700">حاضر</span>
                              ) : (
                                <span className="font-bold text-red-600">
                                  غائب{ev.motif ? ` (${ev.motif})` : ""}
                                </span>
                              )}
                            </td>
                            <td className="border p-2 font-semibold text-emerald-700">
                              {fmt(ev.montant)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>

                <div className="flex justify-end border-t p-5">
                  <button className="rounded-lg bg-gray-200 px-4 py-2" onClick={() => setDetailFamille(null)}>
                    إغلاق
                  </button>
                </div>
              </div>
            </div>
          );
        })()}
    </div>
  );
}