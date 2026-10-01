import React, { useEffect, useMemo, useState } from "react";
import axios from "axios";
import ExcelJS from "exceljs";
import { useNavigate } from "react-router-dom";

const API = "http://localhost:8080/api";
const UNDEF = "غير محددة";

/* ============================== EXPORT : CONFIG ============================== */
type ExportType = "FAMILLES" | "CONSO" | "MERES" | "PERES" | "ENFANTS" | "PARTICIPATIONS";
type ExportFormat = "EXCEL" | "PDF";
type Orientation = "landscape" | "portrait";
type Group = "FAMILLE" | "PARENT" | "ENFANT" | "PARTICIPATION";
type FieldDef = { key: string; label: string; kind?: "money" | "number" };

const EXPORT_TYPES: { value: ExportType; label: string; group: Group; hint: string }[] = [
  { value: "FAMILLES", label: "العائلات", group: "FAMILLE", hint: "لائحة العائلات" },
  { value: "CONSO", label: "المبالغ المصروفة", group: "FAMILLE", hint: "المصروف لكل عائلة" },
  { value: "MERES", label: "الأمهات", group: "PARENT", hint: "بيانات الأمهات" },
  { value: "PERES", label: "الآباء", group: "PARENT", hint: "بيانات الآباء" },
  { value: "ENFANTS", label: "الأطفال", group: "ENFANT", hint: "بيانات الأطفال" },
  { value: "PARTICIPATIONS", label: "مشاركات الأنشطة", group: "PARTICIPATION", hint: "سطر لكل مشاركة" },
];

const FIELDS: Record<Group, FieldDef[]> = {
  FAMILLE: [
    { key: "nomFamille", label: "اسم العائلة" },
    { key: "mere", label: "اسم الأم" },
    { key: "pere", label: "اسم الأب" },
    { key: "phone", label: "الهاتف" },
    { key: "adresse", label: "العنوان" },
    { key: "typeFamille", label: "نوع العائلة" },
    { key: "habitation", label: "نوع السكن" },
    { key: "degre", label: "الدرجة" },
    { key: "nombreEnfants", label: "عدد الأطفال", kind: "number" },
    { key: "dateInscription", label: "تاريخ التسجيل" },
    { key: "aide", label: "تستفيد من مساعدة" },
    { key: "revenu", label: "دخل شهري" },
    { key: "autreAssociation", label: "جمعية أخرى" },
    { key: "malade", label: "شخص مريض بالمنزل" },
    { key: "nbParticipations", label: "عدد المشاركات", kind: "number" },
    { key: "present", label: "حضور", kind: "number" },
    { key: "absent", label: "غياب", kind: "number" },
    { key: "total", label: "المبلغ المصروف", kind: "money" },
  ],
  PARENT: [
    { key: "nom", label: "الاسم" },
    { key: "prenom", label: "اللقب" },
    { key: "familleNom", label: "اسم العائلة" },
    { key: "cin", label: "البطاقة الوطنية" },
    { key: "phone", label: "الهاتف" },
    { key: "dateNaissance", label: "تاريخ الازدياد" },
    { key: "villeNaissance", label: "مكان الازدياد" },
    { key: "estMalade", label: "مريض" },
    { key: "typeMaladie", label: "نوع المرض" },
    { key: "estTravaille", label: "يعمل" },
    { key: "typeTravail", label: "نوع العمل" },
    { key: "estDecedee", label: "متوفى" },
    { key: "dateDeces", label: "تاريخ الوفاة" },
    { key: "nombreEnfants", label: "عدد الأطفال", kind: "number" },
    { key: "degre", label: "الدرجة" },
    { key: "typeFamille", label: "نوع العائلة" },
  ],
  ENFANT: [
    { key: "nom", label: "الاسم" },
    { key: "prenom", label: "اللقب" },
    { key: "age", label: "السن", kind: "number" },
    { key: "dateNaissance", label: "تاريخ الازدياد" },
    { key: "estMalade", label: "مريض" },
    { key: "typeMaladie", label: "نوع المرض" },
    { key: "familleNom", label: "اسم العائلة" },
    { key: "mere", label: "اسم الأم" },
    { key: "degre", label: "الدرجة" },
    { key: "typeFamille", label: "نوع العائلة" },
  ],
  PARTICIPATION: [
    { key: "familleNom", label: "العائلة" },
    { key: "activite", label: "النشاط" },
    { key: "date", label: "التاريخ" },
    { key: "type", label: "نوع النشاط" },
    { key: "participant", label: "المشارك" },
    { key: "statut", label: "الحالة" },
    { key: "motif", label: "سبب الغياب" },
    { key: "montant", label: "المبلغ", kind: "money" },
    { key: "degre", label: "الدرجة" },
    { key: "typeFamille", label: "نوع العائلة" },
  ],
};

const DEFAULT_FIELDS: Record<ExportType, string[]> = {
  FAMILLES: ["nomFamille", "mere", "nombreEnfants", "typeFamille", "degre"],
  CONSO: ["nomFamille", "degre", "typeFamille", "nbParticipations", "present", "absent", "total"],
  MERES: ["nom", "prenom", "familleNom", "nombreEnfants", "degre"],
  PERES: ["nom", "prenom", "familleNom", "nombreEnfants", "degre"],
  ENFANTS: ["nom", "prenom", "age", "familleNom", "degre"],
  PARTICIPATIONS: ["familleNom", "activite", "date", "type", "participant", "statut", "motif", "montant"],
};

type Crit = {
  scope: "current" | "all";
  year: string;
  search: string;
  degres: string[];
  typeFamille: string;
  inscription: string;
  enfMin: string;
  enfMax: string;
  health: "all" | "sick" | "healthy";
  part: "all" | "with" | "without";
  status: "all" | "present" | "absent";
  amtMin: string;
  amtMax: string;
  ageMin: string;
  ageMax: string;
};

const INIT_CRIT: Crit = {
  scope: "current",
  year: "all",
  search: "",
  degres: [],
  typeFamille: "",
  inscription: "",
  enfMin: "",
  enfMax: "",
  health: "all",
  part: "all",
  status: "all",
  amtMin: "",
  amtMax: "",
  ageMin: "",
  ageMax: "",
};

/* ============================== HELPERS ============================== */
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

const yn = (v: any) => (v ? "نعم" : "لا");

const fmtDate = (d?: string) => {
  const s = String(d ?? "");
  const m = s.match(/^(\d{4})-(\d{2})-(\d{2})/);
  return m ? `${m[3]}/${m[2]}/${m[1]}` : s || "-";
};

const ageOf = (d?: string): number | "" => {
  const s = String(d ?? "");
  let y = 0, mo = 0, da = 0;
  const a = s.match(/^(\d{4})-(\d{2})-(\d{2})/);
  const b = s.match(/^(\d{2})\/(\d{2})\/(\d{4})/);
  if (a) { y = +a[1]; mo = +a[2]; da = +a[3]; }
  else if (b) { da = +b[1]; mo = +b[2]; y = +b[3]; }
  else return "";
  const n = new Date();
  let age = n.getFullYear() - y;
  if (n.getMonth() + 1 < mo || (n.getMonth() + 1 === mo && n.getDate() < da)) age--;
  return age >= 0 ? age : "";
};

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

const cellText = (v: any, d: FieldDef) =>
  d.kind === "money" ? fmt(v) : v === "" || v === null || v === undefined ? "-" : String(v);

const esc = (v: any) =>
  String(v ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

/* ============================== PDF (impression) ============================== */
const printPdf = (
  title: string,
  params: string[],
  headers: string[],
  rows: string[][],
  totals: string[] | null,
  orientation: Orientation,
  cards: { label: string; value: string; color: string }[]
) => {
  const w = window.open("", "_blank");
  if (!w) {
    alert("اسمح بالنوافذ المنبثقة لتصدير PDF");
    return;
  }
  const generatedAt = new Date().toLocaleString("fr-FR");

  w.document.write(`<!DOCTYPE html><html dir="rtl" lang="ar"><head><meta charset="utf-8">
<title>${esc(title)}</title>
<style>
  *{box-sizing:border-box;-webkit-print-color-adjust:exact;print-color-adjust:exact}
  body{font-family:Tahoma,Arial,sans-serif;margin:0;padding:24px;color:#111827}
  .hero{background:linear-gradient(270deg,#4f46e5,#3b82f6);color:#fff;border-radius:16px;padding:18px 22px;margin-bottom:12px}
  .hero small{opacity:.8;font-size:11px}
  .hero h1{margin:4px 0 0;font-size:22px}
  .info{display:flex;flex-wrap:wrap;gap:6px;margin-bottom:12px}
  .chip{border:1px solid #e5e7eb;background:#f9fafb;border-radius:99px;padding:5px 11px;font-size:10px;font-weight:bold;color:#374151}
  .cards{display:grid;grid-template-columns:repeat(4,1fr);gap:10px;margin-bottom:14px}
  .card{border-radius:12px;padding:10px;text-align:center;border:1px solid #e5e7eb}
  .card b{display:block;font-size:15px}
  .card span{font-size:9px;color:#6b7280}
  table{width:100%;border-collapse:collapse;font-size:11px}
  th{background:#2563eb;color:#fff;padding:8px;border:1px solid #d1d5db}
  td{padding:7px;border:1px solid #e5e7eb;text-align:center}
  tbody tr:nth-child(even) td{background:#f9fafb}
  tfoot td{background:#d1fae5;font-weight:bold;color:#065f46}
  thead{display:table-header-group} tr{page-break-inside:avoid}
  .foot{margin-top:14px;display:flex;justify-content:space-between;font-size:9px;color:#9ca3af}
  @page{size:A4 ${orientation};margin:10mm}
</style></head><body>
<div class="hero"><small>تقرير مخصص</small><h1>${esc(title)}</h1></div>
<div class="info">${params.map((p) => `<span class="chip">${esc(p)}</span>`).join("")}</div>
${
  cards.length
    ? `<div class="cards">${cards
        .map((c) => `<div class="card" style="background:${c.color}"><b>${esc(c.value)}</b><span>${esc(c.label)}</span></div>`)
        .join("")}</div>`
    : ""
}
<table>
<thead><tr><th>#</th>${headers.map((h) => `<th>${esc(h)}</th>`).join("")}</tr></thead>
<tbody>${rows.map((r, i) => `<tr><td>${i + 1}</td>${r.map((c) => `<td>${esc(c)}</td>`).join("")}</tr>`).join("")}</tbody>
${totals ? `<tfoot><tr><td>المجموع</td>${totals.map((t) => `<td>${esc(t)}</td>`).join("")}</tr></tfoot>` : ""}
</table>
<div class="foot"><span>إدارة العائلات</span><span>تم إنشاء التقرير: ${esc(generatedAt)}</span></div>
</body></html>`);
  w.document.close();
  w.focus();
  setTimeout(() => w.print(), 450);
};

/* ============================== EXCEL ============================== */
const exportExcel = async (
  title: string,
  params: string[],
  defs: FieldDef[],
  records: any[],
  fileName: string
) => {
  const all = ["#", ...defs.map((d) => d.label)];
  const lastCol = colLetter(all.length);
  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet("البيانات", {
    views: [{ rightToLeft: true, state: "frozen", ySplit: 4 }],
    pageSetup: { orientation: "landscape", fitToPage: true, fitToWidth: 1, fitToHeight: 0 },
  });

  const thin = { style: "thin" as const, color: { argb: "FFD1D5DB" } };
  const border = { top: thin, left: thin, bottom: thin, right: thin };
  ws.columns = all.map((h, i) => ({ width: i === 0 ? 6 : Math.max(16, Math.min(34, h.length + 10)) }));

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
  info.font = { name: "Arial", size: 10, bold: true, color: { argb: "FF374151" } };
  info.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFEFF6FF" } };
  info.alignment = { horizontal: "center", vertical: "middle", wrapText: true };
  ws.getRow(2).height = 36;
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

  records.forEach((r, i) => {
    const row = ws.addRow([
      i + 1,
      ...defs.map((d) =>
        d.kind ? Number(r[d.key] || 0) : r[d.key] === "" || r[d.key] == null ? "-" : r[d.key]
      ),
    ]);
    row.height = 22;
    const zebra = i % 2 === 0 ? "FFFFFFFF" : "FFF9FAFB";
    row.eachCell({ includeEmpty: true }, (c, n) => {
      if (n > all.length) return;
      c.font = { name: "Arial", size: 11 };
      c.border = border;
      c.fill = { type: "pattern", pattern: "solid", fgColor: { argb: zebra } };
      c.alignment = { horizontal: "center", vertical: "middle", wrapText: true };
      if (defs[n - 2]?.kind === "money") c.numFmt = '#,##0.00 "DH"';
    });
  });

  if (defs.some((d) => d.kind === "money")) {
    const tr = ws.addRow([
      "المجموع",
      ...defs.map((d) =>
        d.kind === "money" ? records.reduce((s, r) => s + Number(r[d.key] || 0), 0) : ""
      ),
    ]);
    tr.height = 26;
    tr.eachCell({ includeEmpty: true }, (c, n) => {
      if (n > all.length) return;
      c.font = { name: "Arial", size: 11, bold: true, color: { argb: "FF065F46" } };
      c.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFD1FAE5" } };
      c.border = border;
      c.alignment = { horizontal: "center", vertical: "middle" };
      if (defs[n - 2]?.kind === "money") c.numFmt = '#,##0.00 "DH"';
    });
  }

  const buffer = await wb.xlsx.writeBuffer();
  downloadBlob(
    new Blob([buffer], {
      type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    }),
    `${(fileName || "export").trim().replace(/[\\/:*?"<>|]+/g, "_") || "export"}.xlsx`
  );
};

/* ============================== UI BRIQUES ============================== */
const StatCard = ({ label, value, color }: { label: string; value: React.ReactNode; color: string }) => (
  <div className={`rounded-2xl border p-5 ${color}`}>
    <p className="text-sm text-gray-500">{label}</p>
    <p className="mt-1 text-2xl font-bold">{value}</p>
  </div>
);

const RangeBox = ({
  title,
  min,
  max,
  onMin,
  onMax,
  tone,
}: {
  title: string;
  min: string;
  max: string;
  onMin: (v: string) => void;
  onMax: (v: string) => void;
  tone: string;
}) => (
  <div className={`rounded-2xl border p-4 ${tone}`}>
    <p className="mb-3 text-xs font-black text-gray-700">{title}</p>
    <div className="grid grid-cols-2 gap-2">
      <input
        type="number"
        min="0"
        value={min}
        onChange={(e) => onMin(e.target.value)}
        placeholder="من"
        className="h-10 min-w-0 rounded-xl border border-gray-200 bg-white px-3 text-sm outline-none"
      />
      <input
        type="number"
        min="0"
        value={max}
        onChange={(e) => onMax(e.target.value)}
        placeholder="إلى"
        className="h-10 min-w-0 rounded-xl border border-gray-200 bg-white px-3 text-sm outline-none"
      />
    </div>
  </div>
);

const Section = ({
  n,
  title,
  sub,
  children,
}: {
  n: number;
  title: string;
  sub?: string;
  children: React.ReactNode;
}) => (
  <section className="rounded-3xl border border-gray-200 bg-white p-5 shadow-sm">
    <div className="mb-4">
      <h5 className="font-black text-gray-800">
        {n}. {title}
      </h5>
      {sub && <p className="mt-1 text-xs text-gray-400">{sub}</p>}
    </div>
    {children}
  </section>
);

const selectCls =
  "h-11 w-full rounded-xl border border-gray-200 bg-gray-50 px-3 text-sm outline-none focus:border-indigo-300 focus:bg-white";
const labelCls = "mb-1.5 block text-xs font-bold text-gray-600";

/* ============================== PAGE ============================== */
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
  const [exportFormat, setExportFormat] = useState<ExportFormat>("PDF");
  const [orientation, setOrientation] = useState<Orientation>("landscape");
  const [exportTitle, setExportTitle] = useState("");
  const [exportFileName, setExportFileName] = useState("");
  const [crit, setCrit] = useState<Crit>(INIT_CRIT);
  const setC = (patch: Partial<Crit>) => setCrit((p) => ({ ...p, ...patch }));
  const [selectedFields, setSelectedFields] = useState<Record<ExportType, string[]>>(DEFAULT_FIELDS);
  const [exportConso, setExportConso] = useState<Record<string, any>>({});
  const [exportConsoLoading, setExportConsoLoading] = useState(false);
  const [enfantsApi, setEnfantsApi] = useState<any[]>([]);

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
            nomCompletMere: f.mere ? `${f.mere.nom ?? ""} ${f.mere.prenom ?? ""}`.trim() : "—",
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

  // ===== Consommation (année de la page) =====
  useEffect(() => {
    axios
      .get(`${API}/events/stats/familles`, { params: year === "all" ? {} : { year } })
      .then((res) => {
        const m: Record<string, any> = {};
        (Array.isArray(res.data) ? res.data : []).forEach((s: any) => (m[String(s.familleId)] = s));
        setConso(m);
      })
      .catch(() => setConso({}));
  }, [year]);

  // ===== Consommation (année choisie dans l'export) =====
  useEffect(() => {
    if (!exportOpen) return;
    let cancelled = false;
    setExportConsoLoading(true);
    axios
      .get(`${API}/events/stats/familles`, { params: crit.year === "all" ? {} : { year: crit.year } })
      .then((res) => {
        if (cancelled) return;
        const m: Record<string, any> = {};
        (Array.isArray(res.data) ? res.data : []).forEach((s: any) => (m[String(s.familleId)] = s));
        setExportConso(m);
      })
      .catch(() => !cancelled && setExportConso({}))
      .finally(() => !cancelled && setExportConsoLoading(false));
    return () => {
      cancelled = true;
    };
  }, [exportOpen, crit.year]);

  // ===== Enfants : seulement si le backend ne les inclut pas dans /famille =====
  const enfantsEmbedded = useMemo(
    () => familles.some((f) => Array.isArray(f.enfants) && f.enfants.length > 0),
    [familles]
  );

  useEffect(() => {
    if (!exportOpen || exportType !== "ENFANTS" || enfantsEmbedded || enfantsApi.length > 0) return;
    axios
      .get(`${API}/enfant`)
      .then((res) => setEnfantsApi(Array.isArray(res.data) ? res.data : []))
      .catch(console.error);
  }, [exportOpen, exportType, enfantsEmbedded, enfantsApi.length]);

  const getConso = (f: any) =>
    conso[String(f.id)] || { total: 0, presentCount: 0, absentCount: 0, events: [] };

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
      totalDepense: Object.values(conso).reduce((s: number, c: any) => s + Number(c.total || 0), 0),
    };
  }, [familles, conso]);

  const typesFamille = useMemo(() => stats.parType.map(([k]) => ({ label: k, value: k })), [stats]);
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
    const val = (f: any) => (sort.key === "total" ? Number(getConso(f).total) : f[sort.key]);
    return [...list].sort((a, b) => {
      const x = val(a);
      const y = val(b);
      if (typeof x === "number" && typeof y === "number") return (x - y) * sort.dir;
      return String(x ?? "").localeCompare(String(y ?? ""), "ar", { numeric: true }) * sort.dir;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [familles, search, fType, fDegre, fInscription, year, sort, conso]);

  useEffect(() => setPage(0), [search, fType, fDegre, fInscription, year, rowsPerPage]);

  const pageCount = Math.max(1, Math.ceil(sortedFamilles.length / rowsPerPage));
  const pageRows = sortedFamilles.slice(page * rowsPerPage, (page + 1) * rowsPerPage);
  const maxConso = Math.max(...familles.map((f) => Number(getConso(f).total)), 1);

  const toggleSort = (key: string) =>
    setSort((s) => (s.key === key ? { key, dir: (s.dir * -1) as 1 | -1 } : { key, dir: 1 }));

  /* ============================== EXPORT : DONNÉES ============================== */
  const typeInfo = EXPORT_TYPES.find((t) => t.value === exportType)!;
  const fieldDefs = FIELDS[typeInfo.group];
  const chosenKeys = selectedFields[exportType];
  const chosenDefs = fieldDefs.filter((d) => chosenKeys.includes(d.key));

  const exportFamilles = useMemo(() => {
    const base = crit.scope === "current" ? sortedFamilles : familles;
    const mn = crit.enfMin === "" ? null : Number(crit.enfMin);
    const mx = crit.enfMax === "" ? null : Number(crit.enfMax);
    return base.filter(
      (f) =>
        (crit.degres.length === 0 || crit.degres.includes(f.degreFamille)) &&
        (!crit.typeFamille || f.typeFamilleNom === crit.typeFamille) &&
        (!crit.inscription || f.anneeInscription === crit.inscription) &&
        (mn === null || f.nombreEnfants >= mn) &&
        (mx === null || f.nombreEnfants <= mx)
    );
  }, [crit, sortedFamilles, familles]);

  const records = useMemo(() => {
    const cf = (f: any) =>
      exportConso[String(f.id)] || { total: 0, presentCount: 0, absentCount: 0, events: [] };
    const base = (f: any) => ({
      familleNom: `عائلة ${f.nomFamille}`,
      degre: f.degreFamille,
      typeFamille: f.typeFamilleNom,
      nombreEnfants: f.nombreEnfants,
      _fam: f,
    });

    let recs: any[] = [];

    if (exportType === "FAMILLES" || exportType === "CONSO") {
      recs = exportFamilles.map((f) => {
        const c = cf(f);
        return {
          ...base(f),
          nomFamille: `عائلة ${f.nomFamille}`,
          mere: f.nomCompletMere,
          pere: [f.pere?.nom, f.pere?.prenom].filter(Boolean).join(" ") || "-",
          phone: f.phone || "-",
          adresse: f.adresseFamille || "-",
          habitation: f.habitationFamille?.nom || "-",
          dateInscription: fmtDate(f.dateInscription),
          aide: yn(f.aideFamille),
          revenu: yn(f.revenuMensuel),
          autreAssociation: yn(f.beneficieAutreAssociation),
          malade: yn(f.possedeMalade),
          nbParticipations: c.events.length,
          present: c.presentCount,
          absent: c.absentCount,
          total: Number(c.total || 0),
          _sick: !!f.possedeMalade,
        };
      });
      if (crit.part === "with") recs = recs.filter((r) => r.nbParticipations > 0);
      if (crit.part === "without") recs = recs.filter((r) => r.nbParticipations === 0);
    } else if (exportType === "MERES" || exportType === "PERES") {
      const role = exportType === "MERES" ? "mere" : "pere";
      recs = exportFamilles
        .filter((f) => f[role])
        .map((f) => {
          const p = f[role];
          return {
            ...base(f),
            nom: p.nom ?? "",
            prenom: p.prenom ?? "",
            cin: p.cin || "-",
            phone: p.phone || "-",
            dateNaissance: fmtDate(p.dateNaissance),
            villeNaissance: p.villeNaissance || "-",
            estMalade: yn(p.estMalade),
            typeMaladie: p.estMalade ? p.typeMaladie || "-" : "-",
            estTravaille: yn(p.estTravaille),
            typeTravail: p.estTravaille ? p.typeTravail || "-" : "-",
            estDecedee: yn(p.estDecedee),
            dateDeces: p.estDecedee ? fmtDate(p.dateDeces) : "-",
            _sick: !!p.estMalade,
          };
        });
    } else if (exportType === "ENFANTS") {
      const list: { e: any; f: any }[] = enfantsEmbedded
        ? exportFamilles.flatMap((f) => (f.enfants || []).map((e: any) => ({ e, f })))
        : enfantsApi
            .map((e) => ({
              e,
              f:
                familles.find(
                  (f) =>
                    (e.famille && f.id === e.famille.id) ||
                    String(f.id) === String(e.familleId) ||
                    (f.mere?.id != null && String(f.mere.id) === String(e.mere?.id ?? e.mereId))
                ) || null,
            }))
            .filter(({ f }) => !f || exportFamilles.includes(f));

      const mn = crit.ageMin === "" ? null : Number(crit.ageMin);
      const mx = crit.ageMax === "" ? null : Number(crit.ageMax);

      recs = list
        .map(({ e, f }) => {
          const age = e.age != null && e.age !== "" ? Number(e.age) : ageOf(e.dateNaissance);
          return {
            nom: e.nom ?? "",
            prenom: e.prenom ?? "",
            age,
            dateNaissance: fmtDate(e.dateNaissance),
            estMalade: yn(e.estMalade),
            typeMaladie: e.estMalade ? e.typeMaladie || "-" : "-",
            familleNom: f ? `عائلة ${f.nomFamille}` : "-",
            mere: f?.nomCompletMere || "-",
            degre: f?.degreFamille ?? UNDEF,
            typeFamille: f?.typeFamilleNom ?? "-",
            nombreEnfants: f?.nombreEnfants ?? 0,
            _sick: !!e.estMalade,
            _fam: f,
          };
        })
        .filter((r) => {
          if (mn !== null && (r.age === "" || r.age < mn)) return false;
          if (mx !== null && (r.age === "" || r.age > mx)) return false;
          return true;
        })
        .sort((a, b) => Number(a.age || 0) - Number(b.age || 0));
    } else {
      recs = exportFamilles.flatMap((f) =>
        cf(f).events.map((ev: any) => ({
          ...base(f),
          activite: ev.title,
          date: fmtDate(ev.startDate),
          type: ev.type || "-",
          participant: ev.participant,
          statut: ev.present ? "حاضر" : "غائب",
          motif: ev.present ? "" : ev.motif || "",
          montant: Number(ev.montant || 0),
          _present: !!ev.present,
          _sick: !!f.possedeMalade,
        }))
      );
      if (crit.status === "present") recs = recs.filter((r) => r._present);
      if (crit.status === "absent") recs = recs.filter((r) => !r._present);
    }

    // santé
    if (crit.health === "sick") recs = recs.filter((r) => r._sick);
    if (crit.health === "healthy") recs = recs.filter((r) => !r._sick);

    // montants
    const amtKey = exportType === "PARTICIPATIONS" ? "montant" : exportType === "CONSO" || exportType === "FAMILLES" ? "total" : null;
    if (amtKey) {
      if (crit.amtMin !== "") recs = recs.filter((r) => r[amtKey] >= Number(crit.amtMin));
      if (crit.amtMax !== "") recs = recs.filter((r) => r[amtKey] <= Number(crit.amtMax));
    }

    // recherche libre
    const q = crit.search.trim().toLowerCase();
    if (q) {
      recs = recs.filter((r) =>
        Object.entries(r)
          .filter(([k]) => !k.startsWith("_"))
          .map(([, v]) => String(v))
          .join(" ")
          .toLowerCase()
          .includes(q)
      );
    }
    return recs;
  }, [exportType, exportFamilles, exportConso, crit, enfantsEmbedded, enfantsApi, familles]);

  const exportSummary = useMemo(() => {
    const isPart = exportType === "PARTICIPATIONS";
    const isFam = exportType === "FAMILLES" || exportType === "CONSO";
    const famIds = new Set(records.map((r) => r._fam?.id).filter((x) => x != null));
    return {
      count: records.length,
      familles: famIds.size,
      hasAmount: isPart || isFam,
      amount: records.reduce((s, r) => s + Number((isPart ? r.montant : r.total) || 0), 0),
      present: isPart
        ? records.filter((r) => r._present).length
        : records.reduce((s, r) => s + Number(r.present || 0), 0),
      absent: isPart
        ? records.filter((r) => !r._present).length
        : records.reduce((s, r) => s + Number(r.absent || 0), 0),
    };
  }, [records, exportType]);

  const criteriaLabels = useMemo(() => {
    const l: string[] = [];
    l.push(`الفترة: ${crit.year === "all" ? "كل السنوات" : crit.year}`);
    l.push(crit.scope === "current" ? "النطاق: نتائج الجدول الحالية" : "النطاق: كل العائلات");
    if (crit.search.trim()) l.push(`بحث: ${crit.search.trim()}`);
    if (crit.degres.length) l.push(`الدرجات: ${crit.degres.join("، ")}`);
    if (crit.typeFamille) l.push(`نوع العائلة: ${crit.typeFamille}`);
    if (crit.inscription) l.push(`سنة التسجيل: ${crit.inscription}`);
    if (crit.enfMin || crit.enfMax) l.push(`عدد الأطفال: ${crit.enfMin || "0"} - ${crit.enfMax || "∞"}`);
    if (crit.health === "sick") l.push("الحالة الصحية: مرضى فقط");
    if (crit.health === "healthy") l.push("الحالة الصحية: غير مرضى");
    if (crit.part === "with") l.push("المشاركات: لهم مشاركات");
    if (crit.part === "without") l.push("المشاركات: بدون مشاركات");
    if (exportType === "PARTICIPATIONS" && crit.status !== "all")
      l.push(crit.status === "present" ? "الحالة: حاضر فقط" : "الحالة: غائب فقط");
    if (crit.amtMin || crit.amtMax) l.push(`المبلغ: ${crit.amtMin || "0"} - ${crit.amtMax || "∞"} DH`);
    if (exportType === "ENFANTS" && (crit.ageMin || crit.ageMax))
      l.push(`السن: ${crit.ageMin || "0"} - ${crit.ageMax || "∞"}`);
    return l;
  }, [crit, exportType]);

  const toggleField = (key: string) =>
    setSelectedFields((p) => ({
      ...p,
      [exportType]: p[exportType].includes(key)
        ? p[exportType].filter((k) => k !== key)
        : [...p[exportType], key],
    }));

  const openExport = () => {
    setCrit({ ...INIT_CRIT, year });
    setExportOpen(true);
  };

  const runExport = async () => {
    if (chosenDefs.length === 0) {
      alert("اختر عمودا واحدا على الأقل");
      return;
    }
    if (records.length === 0) {
      alert("لا توجد بيانات مطابقة");
      return;
    }

    const title = exportTitle.trim() || `لائحة ${typeInfo.label}`;
    const params = [`العدد: ${records.length}`, ...criteriaLabels];
    if (exportSummary.hasAmount) params.push(`المجموع: ${fmt(exportSummary.amount)}`);

    if (exportFormat === "EXCEL") {
      await exportExcel(title, params, chosenDefs, records, exportFileName.trim() || typeInfo.label);
      setExportOpen(false);
      return;
    }

    const rows = records.map((r) => chosenDefs.map((d) => cellText(r[d.key], d)));
    const totals = chosenDefs.some((d) => d.kind === "money")
      ? chosenDefs.map((d) =>
          d.kind === "money" ? fmt(records.reduce((s, r) => s + Number(r[d.key] || 0), 0)) : ""
        )
      : null;

    const cards = [
      { label: "عدد السجلات", value: String(records.length), color: "#eef2ff" },
      { label: "عدد العائلات", value: String(exportSummary.familles), color: "#f0f9ff" },
      ...(exportSummary.hasAmount
        ? [{ label: "المبلغ المصروف", value: fmt(exportSummary.amount), color: "#ecfdf5" }]
        : []),
      ...(exportSummary.hasAmount
        ? [{ label: "حضور / غياب", value: `${exportSummary.present} / ${exportSummary.absent}`, color: "#fffbeb" }]
        : []),
    ];

    printPdf(title, params, chosenDefs.map((d) => d.label), rows, totals, orientation, cards);
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
              onClick={openExport}
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
          <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
            <h4 className="mb-1 font-bold text-gray-800">التوزيع حسب الدرجة</h4>
            <p className="mb-4 text-xs text-gray-400">اضغط على درجة لتصفية الجدول</p>
            <div className="space-y-3">
              {stats.parDegre.map(([d, n]) => (
                <button
                  key={d}
                  type="button"
                  onClick={() => setFDegre(fDegre === d ? "" : d)}
                  className={`block w-full rounded-lg p-1 text-right transition ${fDegre === d ? "bg-amber-50" : ""}`}
                >
                  <div className="mb-1 flex justify-between text-sm">
                    <span className="font-semibold text-gray-700">{d === UNDEF ? d : `الدرجة ${d}`}</span>
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

          <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
            <h4 className="mb-1 font-bold text-gray-800">التوزيع حسب نوع العائلة</h4>
            <p className="mb-4 text-xs text-gray-400">اضغط على نوع لتصفية الجدول</p>
            <div className="space-y-3">
              {stats.parType.map(([tp, n]) => (
                <button
                  key={tp}
                  type="button"
                  onClick={() => setFType(fType === tp ? "" : tp)}
                  className={`block w-full rounded-lg p-1 text-right transition ${fType === tp ? "bg-blue-50" : ""}`}
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

            <select value={fType} onChange={(e) => setFType(e.target.value)} className="h-11 rounded-xl border border-gray-200 bg-gray-50 px-3 text-sm">
              <option value="">كل الأنواع</option>
              {typesFamille.map((t) => (
                <option key={t.value} value={t.value}>
                  {t.label}
                </option>
              ))}
            </select>

            <select value={fDegre} onChange={(e) => setFDegre(e.target.value)} className="h-11 rounded-xl border border-gray-200 bg-gray-50 px-3 text-sm">
              <option value="">كل الدرجات</option>
              {degresList.map((d) => (
                <option key={d} value={d}>
                  {d === UNDEF ? d : `الدرجة ${d}`}
                </option>
              ))}
            </select>

            <select value={fInscription} onChange={(e) => setFInscription(e.target.value)} className="h-11 rounded-xl border border-gray-200 bg-gray-50 px-3 text-sm">
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
                      <button type="button" onClick={() => toggleSort(key)} className="inline-flex items-center gap-1 hover:text-indigo-600">
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
                    <td colSpan={7} className="py-16 text-center text-gray-400">جاري التحميل...</td>
                  </tr>
                )}
                {!loading && pageRows.length === 0 && (
                  <tr>
                    <td colSpan={7} className="py-16 text-center text-gray-400">لا توجد نتائج</td>
                  </tr>
                )}

                {pageRows.map((row) => {
                  const c = getConso(row);
                  const grad = AVATARS[Number(row.id) % AVATARS.length];
                  return (
                    <tr key={row.id} className="group transition hover:bg-indigo-50/40">
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-3">
                          <span className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br ${grad} text-base font-bold text-white shadow-sm`}>
                            {row.nomFamille?.charAt(0) || "ع"}
                          </span>
                          <div className="min-w-0">
                            <p className="truncate font-bold text-gray-800">عائلة {row.nomFamille}</p>
                            <p className="truncate text-xs text-gray-400">{row.nomCompletMere}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-5 py-4">
                        <span className="inline-flex items-center gap-1 rounded-full bg-indigo-50 px-3 py-1 text-xs font-bold text-indigo-700">
                          <i className="pi pi-users text-[10px]" />
                          {row.nombreEnfants}
                        </span>
                      </td>
                      <td className="px-5 py-4">
                        <span className="rounded-full bg-sky-50 px-3 py-1 text-xs font-semibold text-sky-700">{row.typeFamilleNom}</span>
                      </td>
                      <td className="px-5 py-4">
                        <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-bold ${row.degreFamille === UNDEF ? "bg-red-50 text-red-600" : "bg-amber-50 text-amber-700"}`}>
                          <span className={`h-1.5 w-1.5 rounded-full ${row.degreFamille === UNDEF ? "bg-red-500" : "bg-amber-500"}`} />
                          {row.degreFamille === UNDEF ? row.degreFamille : `الدرجة ${row.degreFamille}`}
                        </span>
                      </td>
                      <td className="px-5 py-4">
                        <p className="whitespace-nowrap text-sm font-bold text-emerald-700">{fmt(c.total)}</p>
                        <div className="mt-1.5 h-1.5 w-28 overflow-hidden rounded-full bg-gray-100">
                          <div className="h-1.5 rounded-full bg-emerald-500" style={{ width: `${(Number(c.total) / maxConso) * 100}%` }} />
                        </div>
                      </td>
                      <td className="px-5 py-4">
                        <div className="flex gap-2">
                          <span className="inline-flex items-center gap-1 rounded-full bg-green-50 px-2.5 py-1 text-xs font-bold text-green-700">✓ {c.presentCount}</span>
                          <span className="inline-flex items-center gap-1 rounded-full bg-red-50 px-2.5 py-1 text-xs font-bold text-red-600">✗ {c.absentCount}</span>
                        </div>
                      </td>
                      <td className="px-5 py-4">
                        <div className="flex justify-center gap-1">
                          <button type="button" title="الأنشطة والمبالغ" onClick={() => setDetailFamille(row)} className="flex h-9 w-9 items-center justify-center rounded-xl text-gray-400 transition hover:bg-emerald-50 hover:text-emerald-600">
                            <i className="pi pi-list" />
                          </button>
                          <button type="button" title="عرض الملف" onClick={() => navigate(`/familleprofile/${row.id}`)} className="flex h-9 w-9 items-center justify-center rounded-xl text-gray-400 transition hover:bg-indigo-50 hover:text-indigo-600">
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

          <div className="flex flex-col items-center justify-between gap-3 border-t border-gray-100 px-5 py-4 text-sm text-gray-500 md:flex-row">
            <span>
              {sortedFamilles.length === 0
                ? "0"
                : `${page * rowsPerPage + 1} - ${Math.min((page + 1) * rowsPerPage, sortedFamilles.length)}`}{" "}
              من {sortedFamilles.length}
            </span>
            <div className="flex items-center gap-2">
              <button type="button" disabled={page === 0} onClick={() => setPage(page - 1)} className="h-9 rounded-xl border border-gray-200 px-4 font-semibold transition hover:bg-gray-50 disabled:opacity-40">السابق</button>
              <span className="rounded-xl bg-indigo-600 px-4 py-2 text-xs font-bold text-white">{page + 1} / {pageCount}</span>
              <button type="button" disabled={page >= pageCount - 1} onClick={() => setPage(page + 1)} className="h-9 rounded-xl border border-gray-200 px-4 font-semibold transition hover:bg-gray-50 disabled:opacity-40">التالي</button>
            </div>
            <select value={rowsPerPage} onChange={(e) => setRowsPerPage(Number(e.target.value))} className="h-9 rounded-xl border border-gray-200 px-2">
              {[5, 10, 20, 50].map((n) => (
                <option key={n} value={n}>{n} / صفحة</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* =================================================== */}
      {/* MODAL EXPORT */}
      {/* =================================================== */}
      {exportOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div dir="rtl" className="max-h-[92vh] w-full max-w-6xl overflow-y-auto rounded-[28px] bg-[#f8fafc] shadow-2xl">
            {/* header */}
            <div className="sticky top-0 z-10 flex items-center justify-between border-b border-gray-100 bg-white/95 px-6 py-5 backdrop-blur">
              <div className="flex items-center gap-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-600 to-violet-600 text-white shadow-lg shadow-indigo-200">
                  <i className="pi pi-file-export text-xl" />
                </div>
                <div>
                  <p className="text-xs font-bold text-indigo-600">مركز التصدير</p>
                  <h4 className="text-2xl font-black text-gray-900">صدّر ما تريد</h4>
                </div>
              </div>
              <button type="button" onClick={() => setExportOpen(false)} className="flex h-10 w-10 items-center justify-center rounded-xl border border-gray-200 bg-white text-gray-400 hover:bg-gray-50">
                <i className="pi pi-times" />
              </button>
            </div>

            <div className="grid gap-6 p-6 lg:grid-cols-[1fr_330px]">
              <div className="space-y-5">
                {/* 1. TYPE */}
                <Section n={1} title="ماذا تريد تصديره؟" sub="اختر نوع البيانات">
                  <div className="grid grid-cols-2 gap-2 md:grid-cols-3">
                    {EXPORT_TYPES.map((t) => (
                      <button
                        key={t.value}
                        type="button"
                        onClick={() => setExportType(t.value)}
                        className={`rounded-2xl border p-3 text-right transition ${
                          exportType === t.value ? "border-indigo-300 bg-indigo-50" : "border-gray-200 bg-white hover:bg-gray-50"
                        }`}
                      >
                        <p className={`text-sm font-bold ${exportType === t.value ? "text-indigo-700" : "text-gray-700"}`}>{t.label}</p>
                        <p className="text-[11px] text-gray-400">{t.hint}</p>
                      </button>
                    ))}
                  </div>
                </Section>

                {/* 2. FORMAT */}
                <Section n={2} title="الصيغة" sub="PDF للطباعة والتقارير، أو Excel للتحليل">
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={() => setExportFormat("PDF")}
                      className={`rounded-2xl border-2 p-4 text-right transition ${
                        exportFormat === "PDF" ? "border-rose-400 bg-rose-50" : "border-gray-100 bg-white hover:border-rose-200"
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-rose-100 text-rose-600"><i className="pi pi-file-pdf text-xl" /></span>
                        <div>
                          <p className="font-black text-gray-800">PDF</p>
                          <p className="text-xs text-gray-400">تقرير منسق للطباعة</p>
                        </div>
                      </div>
                    </button>
                    <button
                      type="button"
                      onClick={() => setExportFormat("EXCEL")}
                      className={`rounded-2xl border-2 p-4 text-right transition ${
                        exportFormat === "EXCEL" ? "border-emerald-400 bg-emerald-50" : "border-gray-100 bg-white hover:border-emerald-200"
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-100 text-emerald-600"><i className="pi pi-file-excel text-xl" /></span>
                        <div>
                          <p className="font-black text-gray-800">Excel</p>
                          <p className="text-xs text-gray-400">جدول منسق مع المجاميع</p>
                        </div>
                      </div>
                    </button>
                  </div>

                  <div className="mt-4 grid gap-3 sm:grid-cols-2">
                    <div>
                      <label className={labelCls}>عنوان التقرير</label>
                      <input
                        value={exportTitle}
                        onChange={(e) => setExportTitle(e.target.value)}
                        placeholder={`لائحة ${typeInfo.label}`}
                        className={selectCls}
                      />
                    </div>
                    {exportFormat === "PDF" ? (
                      <div>
                        <label className={labelCls}>اتجاه الصفحة</label>
                        <div className="grid grid-cols-2 gap-2">
                          {(["landscape", "portrait"] as Orientation[]).map((o) => (
                            <button
                              key={o}
                              type="button"
                              onClick={() => setOrientation(o)}
                              className={`h-11 rounded-xl border text-sm font-bold transition ${
                                orientation === o ? "border-indigo-400 bg-indigo-50 text-indigo-700" : "border-gray-200 bg-white text-gray-500"
                              }`}
                            >
                              {o === "landscape" ? "أفقي" : "عمودي"}
                            </button>
                          ))}
                        </div>
                      </div>
                    ) : (
                      <div>
                        <label className={labelCls}>اسم الملف</label>
                        <div className="relative">
                          <input
                            value={exportFileName}
                            onChange={(e) => setExportFileName(e.target.value)}
                            placeholder={typeInfo.label}
                            className={`${selectCls} pl-16`}
                          />
                          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold text-gray-400">.xlsx</span>
                        </div>
                      </div>
                    )}
                  </div>
                </Section>

                {/* 3. PERIODE */}
                <Section n={3} title="الفترة" sub="سنة محددة أو كل السنوات. تؤثر على المبالغ المصروفة والمشاركات المصدّرة.">
                  <div className="flex flex-wrap gap-2">
                    {["all", ...YEARS].map((y) => (
                      <button
                        key={y}
                        type="button"
                        onClick={() => setC({ year: y })}
                        className={`rounded-xl border px-4 py-2.5 text-sm font-bold transition ${
                          crit.year === y ? "border-indigo-300 bg-indigo-50 text-indigo-700" : "border-gray-200 text-gray-600 hover:bg-gray-50"
                        }`}
                      >
                        {y === "all" ? "كل السنوات" : y}
                      </button>
                    ))}
                  </div>
                  {exportConsoLoading && <p className="mt-3 text-xs text-gray-400">جاري تحميل مبالغ هذه الفترة...</p>}
                </Section>

                {/* 4. COLONNES */}
                <Section n={4} title="الأعمدة" sub="اختر الأعمدة التي تريد ظهورها">
                  <div className="mb-3 flex flex-wrap gap-2">
                    <button type="button" onClick={() => setSelectedFields((p) => ({ ...p, [exportType]: fieldDefs.map((d) => d.key) }))} className="rounded-lg bg-indigo-50 px-3 py-1.5 text-xs font-bold text-indigo-700">تحديد الكل</button>
                    <button type="button" onClick={() => setSelectedFields((p) => ({ ...p, [exportType]: [] }))} className="rounded-lg bg-gray-100 px-3 py-1.5 text-xs font-bold text-gray-600">إلغاء الكل</button>
                    <button type="button" onClick={() => setSelectedFields((p) => ({ ...p, [exportType]: DEFAULT_FIELDS[exportType] }))} className="rounded-lg bg-amber-50 px-3 py-1.5 text-xs font-bold text-amber-700">الافتراضي</button>
                  </div>
                  <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
                    {fieldDefs.map((d) => {
                      const checked = chosenKeys.includes(d.key);
                      return (
                        <label
                          key={d.key}
                          className={`flex cursor-pointer items-center gap-3 rounded-xl border p-3 transition ${
                            checked ? "border-indigo-200 bg-indigo-50/70" : "border-gray-200 bg-white hover:bg-gray-50"
                          }`}
                        >
                          <input type="checkbox" checked={checked} onChange={() => toggleField(d.key)} className="h-4 w-4 accent-indigo-600" />
                          <span className="text-sm font-semibold text-gray-700">{d.label}</span>
                        </label>
                      );
                    })}
                  </div>
                </Section>

                {/* 5. CRITERES */}
                <Section n={5} title="معايير التصفية" sub="اجمع بين أي عدد من المعايير">
                  <div className="space-y-4">
                    <div className="grid gap-4 md:grid-cols-2">
                      <div>
                        <label className={labelCls}>النطاق</label>
                        <select value={crit.scope} onChange={(e) => setC({ scope: e.target.value as Crit["scope"] })} className={selectCls}>
                          <option value="current">نتائج الجدول الحالية ({sortedFamilles.length})</option>
                          <option value="all">كل العائلات ({familles.length})</option>
                        </select>
                      </div>
                      <div>
                        <label className={labelCls}>بحث حر</label>
                        <input value={crit.search} onChange={(e) => setC({ search: e.target.value })} placeholder="أي كلمة في الأعمدة..." className={selectCls} />
                      </div>
                    </div>

                    <div>
                      <label className={labelCls}>الدرجة <span className="font-normal text-gray-400">(بدون اختيار = الكل)</span></label>
                      <div className="flex flex-wrap gap-2">
                        {degresList.map((d) => (
                          <button
                            key={d}
                            type="button"
                            onClick={() => setC({ degres: crit.degres.includes(d) ? crit.degres.filter((x) => x !== d) : [...crit.degres, d] })}
                            className={`rounded-lg border px-3 py-1.5 text-xs font-bold transition ${
                              crit.degres.includes(d) ? "border-amber-300 bg-amber-100 text-amber-800" : "border-gray-200 text-gray-600 hover:bg-gray-50"
                            }`}
                          >
                            {d === UNDEF ? d : `الدرجة ${d}`}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="grid gap-4 md:grid-cols-3">
                      <div>
                        <label className={labelCls}>نوع العائلة</label>
                        <select value={crit.typeFamille} onChange={(e) => setC({ typeFamille: e.target.value })} className={selectCls}>
                          <option value="">الكل</option>
                          {typesFamille.map((t) => (
                            <option key={t.value} value={t.value}>{t.label}</option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className={labelCls}>سنة التسجيل</label>
                        <select value={crit.inscription} onChange={(e) => setC({ inscription: e.target.value })} className={selectCls}>
                          <option value="">الكل</option>
                          {anneesInscription.map((y) => (
                            <option key={y} value={y}>سجلت في {y}</option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className={labelCls}>الحالة الصحية</label>
                        <select value={crit.health} onChange={(e) => setC({ health: e.target.value as Crit["health"] })} className={selectCls}>
                          <option value="all">الكل</option>
                          <option value="sick">مرضى فقط</option>
                          <option value="healthy">غير مرضى</option>
                        </select>
                      </div>
                    </div>

                    <div className="grid gap-4 md:grid-cols-3">
                      <RangeBox title="عدد الأطفال" min={crit.enfMin} max={crit.enfMax} onMin={(v) => setC({ enfMin: v })} onMax={(v) => setC({ enfMax: v })} tone="border-indigo-100 bg-indigo-50/50" />

                      {(exportType === "FAMILLES" || exportType === "CONSO" || exportType === "PARTICIPATIONS") && (
                        <RangeBox title="المبلغ (DH)" min={crit.amtMin} max={crit.amtMax} onMin={(v) => setC({ amtMin: v })} onMax={(v) => setC({ amtMax: v })} tone="border-emerald-100 bg-emerald-50/50" />
                      )}

                      {exportType === "ENFANTS" && (
                        <RangeBox title="السن" min={crit.ageMin} max={crit.ageMax} onMin={(v) => setC({ ageMin: v })} onMax={(v) => setC({ ageMax: v })} tone="border-amber-100 bg-amber-50/50" />
                      )}

                      {(exportType === "FAMILLES" || exportType === "CONSO") && (
                        <div className="rounded-2xl border border-violet-100 bg-violet-50/50 p-4">
                          <p className="mb-3 text-xs font-black text-gray-700">المشاركات</p>
                          <select value={crit.part} onChange={(e) => setC({ part: e.target.value as Crit["part"] })} className={selectCls}>
                            <option value="all">الكل</option>
                            <option value="with">لهم مشاركات</option>
                            <option value="without">بدون مشاركات</option>
                          </select>
                        </div>
                      )}

                      {exportType === "PARTICIPATIONS" && (
                        <div className="rounded-2xl border border-violet-100 bg-violet-50/50 p-4">
                          <p className="mb-3 text-xs font-black text-gray-700">الحالة</p>
                          <select value={crit.status} onChange={(e) => setC({ status: e.target.value as Crit["status"] })} className={selectCls}>
                            <option value="all">الكل</option>
                            <option value="present">حاضر فقط</option>
                            <option value="absent">غائب فقط</option>
                          </select>
                        </div>
                      )}
                    </div>

                    <button
                      type="button"
                      onClick={() => setCrit({ ...INIT_CRIT, year: crit.year })}
                      className="inline-flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-3 py-2 text-xs font-bold text-gray-600 hover:bg-gray-50"
                    >
                      <i className="pi pi-refresh" /> مسح المعايير
                    </button>
                  </div>
                </Section>
              </div>

              {/* APERCU */}
              <aside className="space-y-4 lg:sticky lg:top-24 lg:self-start">
                <div className="overflow-hidden rounded-3xl border border-indigo-100 bg-white shadow-sm">
                  <div className="bg-gradient-to-br from-indigo-600 to-violet-600 p-5 text-white">
                    <p className="text-xs font-bold text-indigo-100">
                      {typeInfo.label} — {crit.year === "all" ? "كل السنوات" : crit.year}
                    </p>
                    <div className="mt-2 flex items-end justify-between">
                      <div>
                        <p className="text-4xl font-black">{exportSummary.count}</p>
                        <p className="text-xs text-indigo-100">سجل مطابق</p>
                      </div>
                      <div className="rounded-2xl bg-white/15 px-3 py-2 text-center">
                        <i className={`pi ${exportFormat === "PDF" ? "pi-file-pdf" : "pi-file-excel"} text-xl`} />
                        <p className="mt-1 text-[10px] font-bold">{exportFormat}</p>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-2.5 p-5">
                    <div className="flex items-center justify-between rounded-xl bg-sky-50 px-3 py-2.5">
                      <span className="text-xs font-semibold text-gray-500">عدد العائلات</span>
                      <strong className="text-sm text-sky-700">{exportSummary.familles}</strong>
                    </div>
                    {exportSummary.hasAmount && (
                      <>
                        <div className="flex items-center justify-between rounded-xl bg-emerald-50 px-3 py-2.5">
                          <span className="text-xs font-semibold text-gray-500">المبلغ المصروف</span>
                          <strong className="text-sm text-emerald-700">{exportConsoLoading ? "..." : fmt(exportSummary.amount)}</strong>
                        </div>
                        <div className="flex items-center justify-between rounded-xl bg-green-50 px-3 py-2.5">
                          <span className="text-xs font-semibold text-gray-500">حضور</span>
                          <strong className="text-sm text-green-700">{exportSummary.present}</strong>
                        </div>
                        <div className="flex items-center justify-between rounded-xl bg-red-50 px-3 py-2.5">
                          <span className="text-xs font-semibold text-gray-500">غياب</span>
                          <strong className="text-sm text-red-600">{exportSummary.absent}</strong>
                        </div>
                      </>
                    )}
                  </div>
                </div>

                <div className="rounded-3xl border border-gray-200 bg-white p-5 shadow-sm">
                  <p className="mb-3 text-sm font-black text-gray-800">المعايير النشطة</p>
                  <div className="flex flex-wrap gap-2">
                    {criteriaLabels.map((l, i) => (
                      <span key={i} className="rounded-lg border border-indigo-100 bg-indigo-50 px-2.5 py-1.5 text-[11px] font-semibold text-indigo-700">{l}</span>
                    ))}
                  </div>
                </div>

                <div className="rounded-3xl border border-gray-200 bg-white p-5 shadow-sm">
                  <p className="mb-3 text-sm font-black text-gray-800">الأعمدة ({chosenDefs.length})</p>
                  <div className="flex flex-wrap gap-2">
                    {chosenDefs.length ? (
                      chosenDefs.map((d) => (
                        <span key={d.key} className="rounded-lg bg-gray-100 px-2.5 py-1.5 text-[11px] font-semibold text-gray-600">{d.label}</span>
                      ))
                    ) : (
                      <span className="text-xs font-semibold text-red-500">اختر عمودا واحدا على الأقل</span>
                    )}
                  </div>
                </div>

                <button
                  type="button"
                  onClick={runExport}
                  disabled={records.length === 0 || chosenDefs.length === 0 || exportConsoLoading}
                  className={`flex h-12 w-full items-center justify-center gap-2 rounded-2xl font-black text-white shadow-lg transition disabled:cursor-not-allowed disabled:opacity-40 ${
                    exportFormat === "PDF"
                      ? "bg-gradient-to-l from-rose-600 to-red-500 shadow-rose-200 hover:-translate-y-0.5"
                      : "bg-gradient-to-l from-emerald-600 to-teal-500 shadow-emerald-200 hover:-translate-y-0.5"
                  }`}
                >
                  <i className={`pi ${exportFormat === "PDF" ? "pi-file-pdf" : "pi-file-excel"}`} />
                  {exportFormat === "PDF" ? "إنشاء تقرير PDF" : "تحميل ملف Excel"}
                </button>
                <p className="px-2 text-center text-[10px] leading-5 text-gray-400">
                  PDF يفتح نافذة الطباعة: اختر «حفظ بصيغة PDF».
                </p>
              </aside>
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
                  <p className="mt-1 text-xs text-gray-400">السنة: {year === "all" ? "كل السنوات" : year}</p>
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
                                <span className="font-bold text-red-600">غائب{ev.motif ? ` (${ev.motif})` : ""}</span>
                              )}
                            </td>
                            <td className="border p-2 font-semibold text-emerald-700">{fmt(ev.montant)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>

                <div className="flex justify-end border-t p-5">
                  <button className="rounded-lg bg-gray-200 px-4 py-2" onClick={() => setDetailFamille(null)}>إغلاق</button>
                </div>
              </div>
            </div>
          );
        })()}
    </div>
  );
}