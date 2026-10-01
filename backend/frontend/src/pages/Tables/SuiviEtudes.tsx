
import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";

import { Button } from "primereact/button";

import Select from "../../components/form/Select";
import MultiSelect from "../../components/form/MultiSelect";
import { Modal } from "../../components/ui/modal";

import * as XLSX from "xlsx";

import "primereact/resources/primereact.min.css";
import "primereact/resources/themes/saga-blue/theme.css";
import "primeicons/primeicons.css";
import "./EtudesTable.css";

const API = "http://localhost:8080/api";

// ============================================================
// TYPES
// ============================================================

type CycleScolaire =
  | "prescolaire"
  | "primaire"
  | "college"
  | "lycee"
  | "universite"
  | "inconnu";

type EtudeRow = {
  id: number | string;

  anneeScolaire?: string;
  noteSemestre1?: number | string | null;
  noteSemestre2?: number | string | null;
  noteGenerale?: number | string | null;

  enfant?: {
    id?: number | string;
    nom?: string;
    prenom?: string;
  };

  ecole?: {
    id?: number | string;
    nom?: string;
  };

  niveauScolaire?: {
    id?: number | string;
    nom?: string;
  };

  nomEnfant: string;
  prenomEnfant: string;
  nomEcole: string;
  niveauNom: string;

  cycle?: CycleScolaire;
  cycleLabel?: string;
  noteAffichee?: string;

  [key: string]: any;
};

type Option = {
  text: string;
  value: string;
};

type SoutienStat = {
  enfantId: number;

  // Montant total réellement consommé en soutien.
  totalConsomme: number;

  // Montant réellement payé par l'association / par nous.
  totalPaye: number;

  // Partie prise en charge par une autre personne / autre organisme.
  totalAutre: number;

  nombrePaiements: number;
};

type SortState = {
  key: string;
  dir: 1 | -1;
};

// ============================================================
// FORMATAGE
// ============================================================

const fmtMoney = (value: any) =>
  `${Number(value || 0).toLocaleString("fr-FR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })} DH`;

const AVATARS = [
  "from-blue-500 to-indigo-500",
  "from-emerald-500 to-teal-500",
  "from-amber-500 to-orange-500",
  "from-pink-500 to-rose-500",
  "from-purple-500 to-fuchsia-500",
  "from-cyan-500 to-sky-500",
];

// ============================================================
// CONFIGURATION DES CYCLES
// ============================================================

const NOTE_CONFIG: Record<
  CycleScolaire,
  {
    label: string;
    shortLabel: string;
    max: number;
    seuilReussite: number;
  }
> = {
  prescolaire: {
    label: "التعليم الأولي",
    shortLabel: "الأولي",
    max: 10,
    seuilReussite: 5,
  },

  primaire: {
    label: "التعليم الابتدائي",
    shortLabel: "الابتدائي",
    max: 10,
    seuilReussite: 5,
  },

  college: {
    label: "التعليم الإعدادي",
    shortLabel: "الإعدادي",
    max: 20,
    seuilReussite: 10,
  },

  lycee: {
    label: "التعليم الثانوي التأهيلي",
    shortLabel: "الثانوي",
    max: 20,
    seuilReussite: 10,
  },

  universite: {
    label: "التعليم الجامعي",
    shortLabel: "الجامعي",
    max: 20,
    seuilReussite: 10,
  },

  inconnu: {
    label: "غير محدد",
    shortLabel: "غير محدد",
    max: 20,
    seuilReussite: 10,
  },
};

// ============================================================
// EXPORT
// ============================================================

const exportableFields: Option[] = [
  {
    text: "الاسم الكامل",
    value: "nomEnfant",
  },
  {
    text: "المرحلة الدراسية",
    value: "cycleLabel",
  },
  {
    text: "المستوى",
    value: "niveauNom",
  },
  {
    text: "المؤسسة",
    value: "nomEcole",
  },
  {
    text: "السنة الدراسية",
    value: "anneeScolaire",
  },
  {
    text: "النقطة",
    value: "noteAffichee",
  },
  {
    text: "مبلغ الدعم المستهلك",
    value: "montantSoutienConsomme",
  },
  {
    text: "المبلغ المؤدى من طرفنا",
    value: "montantSoutienPaye",
  },
  {
    text: "المبلغ المؤدى من طرف الغير",
    value: "montantSoutienAutre",
  },
  {
    text: "عدد دفعات الدعم",
    value: "nombrePaiementsSoutien",
  },
];

const exportCycleOptions: Option[] = [
  { text: "التعليم الأولي", value: "prescolaire" },
  { text: "التعليم الابتدائي", value: "primaire" },
  { text: "التعليم الإعدادي", value: "college" },
  { text: "التعليم الثانوي التأهيلي", value: "lycee" },
  { text: "التعليم الجامعي", value: "universite" },
];

const exportYearOptions = (years: string[]): Option[] =>
  years.map((annee) => ({
    text: annee,
    value: annee,
  }));

type ExportScope = "current" | "page" | "all";
type ExportSupportFilter = "all" | "with" | "without";
type ExportPaymentFilter = "all" | "paid" | "partial" | "external";
type ExportOrientation = "landscape" | "portrait";


// ============================================================
// HELPERS
// ============================================================

const isNonEmptyString = (value: unknown): value is string =>
  typeof value === "string" && value.trim() !== "";

// ============================================================
// DÉTECTION DU CYCLE
// ============================================================

const getCycleScolaire = (niveau?: string): CycleScolaire => {
  const n = String(niveau ?? "")
    .trim()
    .toLowerCase();

  if (
    n.includes("التعليم الأولي") ||
    n.includes("التعليم الاولي") ||
    n.includes("الروض") ||
    n.includes("روضة") ||
    n.includes("préscolaire") ||
    n.includes("prescolaire") ||
    n.includes("maternelle")
  ) {
    return "prescolaire";
  }

  if (
    n.includes("التعليم الابتدائي") ||
    n.includes("ابتدائي") ||
    n.includes("الإبتدائي") ||
    n.includes("primaire") ||
    n.includes("1ap") ||
    n.includes("2ap") ||
    n.includes("3ap") ||
    n.includes("4ap") ||
    n.includes("5ap") ||
    n.includes("6ap") ||
    n === "cp" ||
    n === "ce1" ||
    n === "ce2" ||
    n === "cm1" ||
    n === "cm2"
  ) {
    return "primaire";
  }

  if (
    n.includes("التعليم الإعدادي") ||
    n.includes("التعليم الاعدادي") ||
    n.includes("إعدادي") ||
    n.includes("اعدادي") ||
    n.includes("collège") ||
    n.includes("college") ||
    n.includes("collégial") ||
    n.includes("collegial") ||
    n.includes("1ac") ||
    n.includes("2ac") ||
    n.includes("3ac")
  ) {
    return "college";
  }

  // IMPORTANT : université avant lycée pour éviter "باك + 1" => lycée.
  if (
    n.includes("التعليم الجامعي") ||
    n.includes("جامعي") ||
    n.includes("جامعة") ||
    n.includes("université") ||
    n.includes("universite") ||
    n.includes("bac +") ||
    n.includes("باك +") ||
    n.includes("باك+")
  ) {
    return "universite";
  }

  if (
    n.includes("التعليم الثانوي التأهيلي") ||
    n.includes("الثانوي التأهيلي") ||
    n.includes("ثانوي") ||
    n.includes("lycée") ||
    n.includes("lycee") ||
    n.includes("الجذع المشترك") ||
    n.includes("الجذع") ||
    n.includes("tronc commun") ||
    n.includes("الأولى باكالوريا") ||
    n.includes("الثانية باكالوريا") ||
    n.includes("1bac") ||
    n.includes("2bac")
  ) {
    return "lycee";
  }

  return "inconnu";
};

// ============================================================
// ANNÉE SCOLAIRE ACTUELLE
// ============================================================

const getCurrentSchoolYear = () => {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth() + 1;

  if (month >= 9) {
    return `${year}/${year + 1}`;
  }

  return `${year - 1}/${year}`;
};

// ============================================================
// NORMALISER ANNÉE
// ============================================================

const normalizeSchoolYear = (value?: string) => {
  const text = String(value ?? "").trim();

  const match = text.match(/(\d{4})\D+(\d{2,4})/);

  if (!match) {
    return text;
  }

  const first = Number(match[1]);
  let second = Number(match[2]);

  if (match[2].length === 2) {
    second = Math.floor(first / 100) * 100 + second;
  }

  return `${first}/${second}`;
};

// ============================================================
// NOTE À AFFICHER
// ============================================================

const getNoteValue = (row: EtudeRow): number | null => {
  const raw =
    row.noteGenerale !== null &&
    row.noteGenerale !== undefined &&
    row.noteGenerale !== ""
      ? row.noteGenerale
      : row.noteSemestre1;

  if (raw === null || raw === undefined || raw === "") {
    return null;
  }

  const value = Number(raw);

  return Number.isFinite(value) ? value : null;
};

// ============================================================
// PDF
// ============================================================

const printPdf = (
  title: string,
  headers: string[],
  rows: any[][],
  info: string[],
  orientation: ExportOrientation = "landscape"
) => {
  const w = window.open("", "_blank");

  if (!w) {
    alert("يرجى السماح بالنوافذ المنبثقة لتصدير PDF");
    return;
  }

  const esc = (value: any) =>
    String(value ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");

  const generatedAt = new Date().toLocaleString("fr-FR");

  w.document.write(`
    <!DOCTYPE html>
    <html dir="rtl" lang="ar">
    <head>
      <meta charset="UTF-8">
      <title>${esc(title)}</title>

      <style>
        * { box-sizing: border-box; }

        body {
          margin: 0;
          padding: 26px;
          direction: rtl;
          color: #111827;
          background: #ffffff;
          font-family: Tahoma, Arial, sans-serif;
          -webkit-print-color-adjust: exact !important;
          print-color-adjust: exact !important;
        }

        .report-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 18px;
          padding: 20px 22px;
          margin-bottom: 14px;
          border: 1px solid #e0e7ff;
          border-radius: 18px;
          background: linear-gradient(135deg, #eef2ff 0%, #ffffff 55%, #ecfdf5 100%);
        }

        .brand {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          width: 50px;
          height: 50px;
          border-radius: 15px;
          color: white;
          background: #4f46e5;
          font-weight: 900;
          font-size: 18px;
        }

        .header-copy { flex: 1; }

        .eyebrow {
          margin: 0 0 5px;
          color: #4f46e5;
          font-size: 11px;
          font-weight: 800;
        }

        h1 {
          margin: 0;
          font-size: 22px;
          color: #111827;
        }

        .subtitle {
          margin-top: 6px;
          color: #6b7280;
          font-size: 11px;
        }

        .summary {
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
          margin: 0 0 16px;
        }

        .summary-item {
          padding: 7px 11px;
          border: 1px solid #e5e7eb;
          border-radius: 999px;
          background: #f9fafb;
          color: #374151;
          font-size: 10px;
          font-weight: 700;
        }

        .table-wrap {
          overflow: hidden;
          border: 1px solid #e5e7eb;
          border-radius: 16px;
        }

        table {
          width: 100%;
          border-collapse: collapse;
          table-layout: auto;
          font-size: 10px;
        }

        thead { display: table-header-group; }

        th {
          padding: 10px 8px;
          border-bottom: 1px solid #c7d2fe;
          color: #312e81;
          background: #eef2ff;
          font-weight: 900;
          white-space: nowrap;
        }

        td {
          padding: 9px 8px;
          border-bottom: 1px solid #f0f2f5;
          color: #374151;
          text-align: center;
          vertical-align: middle;
        }

        tbody tr:nth-child(even) td { background: #fafafa; }
        tbody tr:last-child td { border-bottom: 0; }
        tr { page-break-inside: avoid; }

        .index {
          width: 34px;
          color: #6366f1;
          font-weight: 900;
        }

        .footer {
          display: flex;
          justify-content: space-between;
          gap: 12px;
          margin-top: 14px;
          color: #9ca3af;
          font-size: 9px;
        }

        @page {
          size: A4 ${orientation};
          margin: 10mm;
        }

        @media print {
          body { padding: 0; }
          .report-header { break-inside: avoid; }
          .summary { break-inside: avoid; }
        }
      </style>
    </head>

    <body>
      <div class="report-header">
        <div class="brand">TA</div>
        <div class="header-copy">
          <p class="eyebrow">تقرير التتبع الدراسي</p>
          <h1>${esc(title)}</h1>
          <div class="subtitle">تقرير منظم حسب معايير التصدير المختارة</div>
        </div>
      </div>

      <div class="summary">
        ${info
          .filter(Boolean)
          .map((item) => `<span class="summary-item">${esc(item)}</span>`)
          .join("")}
      </div>

      <div class="table-wrap">
        <table>
          <thead>
            <tr>
              <th class="index">#</th>
              ${headers.map((header) => `<th>${esc(header)}</th>`).join("")}
            </tr>
          </thead>
          <tbody>
            ${rows
              .map(
                (row, index) => `
                  <tr>
                    <td class="index">${index + 1}</td>
                    ${row.map((cell) => `<td>${esc(cell)}</td>`).join("")}
                  </tr>
                `
              )
              .join("")}
          </tbody>
        </table>
      </div>

      <div class="footer">
        <span>TailAdmin • Suivi études</span>
        <span>تم إنشاء التقرير: ${esc(generatedAt)}</span>
      </div>
    </body>
    </html>
  `);

  w.document.close();
  w.focus();

  setTimeout(() => {
    w.print();
  }, 450);
};

// ============================================================
// COMPONENT
// ============================================================

export default function EtudesTable() {
  const navigate = useNavigate();

  // =========================================================
  // DATA
  // =========================================================

  const [etudes, setEtudes] = useState<EtudeRow[]>([]);
  const [loading, setLoading] = useState(true);

  // =========================================================
  // SOUTIEN / CONSOMMATION
  // =========================================================

  const [conso, setConso] =
    useState<Record<string, SoutienStat>>({});

  const [consoLoading, setConsoLoading] =
    useState(false);

  // =========================================================
  // FILTRES
  // =========================================================
const [year, setYear] =
  useState("");

const [
  anneesDisponibles,
  setAnneesDisponibles,
] = useState<string[]>([]);

  const [search, setSearch] = useState("");
  const [niveauFilter, setNiveauFilter] = useState("");
  const [ecoleFilter, setEcoleFilter] = useState("");
  const [cycleFilter, setCycleFilter] =
    useState<CycleScolaire | "">("");
// =========================================================
// ANNÉES SCOLAIRES EXISTANTES EN BASE
// =========================================================

useEffect(() => {
  axios
    .get(`${API}/etudes/annees`)
    .then((res) => {
      const data =
        Array.isArray(res.data)
          ? res.data
          : [];

      const annees = data
        .filter(
          (annee: any) =>
            typeof annee === "string" &&
            annee.trim() !== ""
        )
        .sort((a: string, b: string) => {
          const yearA =
            Number(
              normalizeSchoolYear(a)
                .split("/")[0]
            ) || 0;

          const yearB =
            Number(
              normalizeSchoolYear(b)
                .split("/")[0]
            ) || 0;

          return yearB - yearA;
        });

      setAnneesDisponibles(
        annees
      );

      const current =
        normalizeSchoolYear(
          getCurrentSchoolYear()
        );

      const currentExists =
        annees.find(
          (annee: string) =>
            normalizeSchoolYear(
              annee
            ) === current
        );

      if (currentExists) {
        setYear(currentExists);
      } else if (
        annees.length > 0
      ) {
        setYear(
          annees[0]
        );
      } else {
        setYear("");
      }
    })
    .catch((error) => {
      console.error(
        "Erreur chargement années scolaires :",
        error
      );

      setAnneesDisponibles([]);
      setYear("");
    });
}, []);

  // =========================================================
  // TRI / PAGINATION
  // =========================================================

  const [sort, setSort] = useState<SortState>({
    key: "nomEnfant",
    dir: 1,
  });

  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);

  // =========================================================
  // EXPORT
  // =========================================================

  const [exportDialogVisible, setExportDialogVisible] =
    useState(false);

  const [exportFormat, setExportFormat] =
    useState<"pdf" | "excel">("pdf");

  const [selectedFields, setSelectedFields] =
    useState<string[]>(
      exportableFields.map((field) => field.value)
    );

  // Portée de l'export : résultats filtrés, page courante ou toutes les données chargées.
  const [exportScope, setExportScope] =
    useState<ExportScope>("current");

  const [exportSearch, setExportSearch] =
    useState("");

  const [exportYears, setExportYears] =
    useState<string[]>([]);

  const [exportCycles, setExportCycles] =
    useState<string[]>([]);

  const [exportNiveaux, setExportNiveaux] =
    useState<string[]>([]);

  const [exportEcoles, setExportEcoles] =
    useState<string[]>([]);

  const [exportSupportFilter, setExportSupportFilter] =
    useState<ExportSupportFilter>("all");

  const [exportPaymentFilter, setExportPaymentFilter] =
    useState<ExportPaymentFilter>("all");

  const [exportMinConsomme, setExportMinConsomme] =
    useState("");

  const [exportMaxConsomme, setExportMaxConsomme] =
    useState("");

  const [exportMinPaye, setExportMinPaye] =
    useState("");

  const [exportMaxPaye, setExportMaxPaye] =
    useState("");

  const [exportMinNote, setExportMinNote] =
    useState("");

  const [exportMaxNote, setExportMaxNote] =
    useState("");

  const [exportOrientation, setExportOrientation] =
    useState<ExportOrientation>("landscape");

  const [exportTitle, setExportTitle] =
    useState("التتبع الدراسي للأبناء");

  const [exportFileName, setExportFileName] =
    useState("suivi_etudes");

  // =========================================================
  // CHARGEMENT DES ÉTUDES
  // =========================================================

  useEffect(() => {
    setLoading(true);

    axios
      .get(`${API}/etudes/latest`)
      .then((res) => {
        const rows = Array.isArray(res.data)
          ? res.data
          : [];

        const data: EtudeRow[] = rows.map((e: any) => {
          const niveauNom =
            e.niveauScolaire?.nom ?? "—";

          const cycle =
            getCycleScolaire(niveauNom);

          const config =
            NOTE_CONFIG[cycle];

          const tempRow: EtudeRow = {
            ...e,

            nomEnfant: e.enfant
              ? `${e.enfant.nom ?? ""} ${
                  e.enfant.prenom ?? ""
                }`.trim()
              : "—",

            prenomEnfant:
              e.enfant?.prenom ?? "—",

            nomEcole:
              e.ecole?.nom ?? "—",

            niveauNom,

            anneeScolaire:
              e.anneeScolaire
                ? String(e.anneeScolaire)
                : "—",

            cycle,

            cycleLabel:
              config.label,
          };

          const note =
            getNoteValue(tempRow);

          return {
            ...tempRow,

            noteAffichee:
              cycle === "universite" ||
              cycle === "prescolaire"
                ? "—"
                : note !== null
                  ? `${note.toFixed(2)} / ${config.max}`
                  : "—",
          };
        });

        setEtudes(data);
      })
      .catch((error) => {
        console.error(
          "Erreur chargement études :",
          error
        );

        setEtudes([]);
      })
      .finally(() => {
        setLoading(false);
      });
  }, []);

  // =========================================================
  // OPTIONS NIVEAUX
  // =========================================================

  const niveauxOptions =
    useMemo<Option[]>(() => {
      const values = Array.from(
        new Set(
          etudes
            .map((e) => e.niveauNom)
            .filter(isNonEmptyString)
            .filter((v) => v !== "—")
        )
      ).sort((a, b) =>
        a.localeCompare(b, "ar", {
          numeric: true,
        })
      );

      return values.map((value) => ({
        text: value,
        value,
      }));
    }, [etudes]);

  // =========================================================
  // OPTIONS ÉCOLES
  // =========================================================

  const ecolesOptions =
    useMemo<Option[]>(() => {
      const values = Array.from(
        new Set(
          etudes
            .map((e) => e.nomEcole)
            .filter(isNonEmptyString)
            .filter((v) => v !== "—")
        )
      ).sort((a, b) =>
        a.localeCompare(b, "ar", {
          numeric: true,
        })
      );

      return values.map((value) => ({
        text: value,
        value,
      }));
    }, [etudes]);

  // =========================================================
  // ANNÉES DISPONIBLES
  // =========================================================

  // =========================================================
  // ANNÉE ACTUELLE PAR DÉFAUT
  // =========================================================


  // =========================================================
  // CHARGEMENT CONSOMMATION SOUTIEN
  //
  // Backend attendu :
  // GET /api/soutiens/stats/enfants?annee=2026/2027
  // =========================================================

  useEffect(() => {
    setConsoLoading(true);

    axios
      .get(
        `${API}/soutiens/stats/enfants`,
        {
          params:
            year === "all"
              ? {}
              : {
                  annee: year,
                },
        }
      )
      .then((res) => {
        const map: Record<
          string,
          SoutienStat
        > = {};

        const data =
          Array.isArray(res.data)
            ? res.data
            : [];

        data.forEach(
          (item: any) => {
            const enfantId =
              Number(item.enfantId);

            if (
              !Number.isFinite(
                enfantId
              )
            ) {
              return;
            }

            const totalConsomme =
              Number(
                item.totalConsomme ??
                item.total ??
                0
              );

            const totalPaye =
              Number(
                item.totalPaye ??
                0
              );

            const totalAutre =
              Number(
                item.totalAutre ??
                Math.max(
                  totalConsomme -
                  totalPaye,
                  0
                )
              );

            map[
              String(enfantId)
            ] = {
              enfantId,

              totalConsomme,

              totalPaye,

              totalAutre,

              nombrePaiements:
                Number(
                  item.nombrePaiements ||
                    0
                ),
            };
          }
        );

        setConso(map);
      })
      .catch((error) => {
        console.error(
          "Erreur consommation soutien :",
          error
        );

        setConso({});
      })
      .finally(() => {
        setConsoLoading(false);
      });
  }, [year]);

  // =========================================================
  // HELPER CONSOMMATION
  // =========================================================

  const getConso = (
    row: EtudeRow
  ): SoutienStat => {
    const enfantId =
      row.enfant?.id;

    if (!enfantId) {
      return {
        enfantId: 0,
        totalConsomme: 0,
        totalPaye: 0,
        totalAutre: 0,
        nombrePaiements: 0,
      };
    }

    return (
      conso[
        String(enfantId)
      ] || {
        enfantId:
          Number(enfantId),
        totalConsomme: 0,
        totalPaye: 0,
        totalAutre: 0,
        nombrePaiements: 0,
      }
    );
  };

  // =========================================================
  // FILTRAGE
  // =========================================================

  const filteredEtudes = useMemo(() => {
    const s =
      search.trim().toLowerCase();

    return etudes.filter((e) => {
      const anneeOK =
        year === "all" ||
        normalizeSchoolYear(
          e.anneeScolaire
        ) ===
          normalizeSchoolYear(year);

      const niveauOK =
        !niveauFilter ||
        e.niveauNom ===
          niveauFilter;

      const ecoleOK =
        !ecoleFilter ||
        e.nomEcole ===
          ecoleFilter;

      const cycle =
        getCycleScolaire(
          e.niveauNom
        );

      const cycleOK =
        !cycleFilter ||
        cycle === cycleFilter;

      const searchOK =
        !s ||
        e.nomEnfant
          ?.toLowerCase()
          .includes(s) ||
        e.nomEcole
          ?.toLowerCase()
          .includes(s) ||
        e.niveauNom
          ?.toLowerCase()
          .includes(s) ||
        e.anneeScolaire
          ?.toLowerCase()
          .includes(s);

      return (
        anneeOK &&
        niveauOK &&
        ecoleOK &&
        cycleOK &&
        searchOK
      );
    });
  }, [
    etudes,
    year,
    search,
    niveauFilter,
    ecoleFilter,
    cycleFilter,
  ]);

  // =========================================================
  // STATS GÉNÉRALES
  // =========================================================

  const stats = useMemo(() => {
    const totalEcoles =
      new Set(
        filteredEtudes
          .map(
            (e) => e.nomEcole
          )
          .filter(
            (e) =>
              e &&
              e !== "—"
          )
      ).size;

    const totalNiveaux =
      new Set(
        filteredEtudes
          .map(
            (e) => e.niveauNom
          )
          .filter(
            (e) =>
              e &&
              e !== "—"
          )
      ).size;

    return {
      totalEtudiants:
        filteredEtudes.length,

      totalEcoles,

      totalNiveaux,
    };
  }, [filteredEtudes]);

  // =========================================================
  // STATS SOUTIEN GLOBALES POUR L'ANNÉE
  // =========================================================
const statsSoutien = useMemo(() => {
  // =====================================================
  // ENFANTS QUI SONT RÉELLEMENT AFFICHÉS DANS LE TABLEAU
  // =====================================================

  const enfantIdsAffiches = new Set(
    filteredEtudes
      .map((row) =>
        row.enfant?.id != null
          ? String(row.enfant.id)
          : null
      )
      .filter(
        (id): id is string =>
          id !== null
      )
  );

  // =====================================================
  // CONSOMMATIONS UNIQUEMENT DE CES ENFANTS
  // =====================================================

  const consommateurs =
    Object.values(conso).filter(
      (item) =>
        enfantIdsAffiches.has(
          String(item.enfantId)
        ) &&
        Number(
          item.totalConsomme
        ) > 0
    );

  // =====================================================
  // TOTAL CONSOMMÉ
  // =====================================================

  const totalConsomme =
    consommateurs.reduce(
      (sum, item) =>
        sum +
        Number(
          item.totalConsomme || 0
        ),
      0
    );

  // =====================================================
  // TOTAL PAYÉ PAR NOUS
  // =====================================================

  const totalPaye =
    consommateurs.reduce(
      (sum, item) =>
        sum +
        Number(
          item.totalPaye || 0
        ),
      0
    );

  // =====================================================
  // TOTAL PRIS EN CHARGE PAR D'AUTRES
  // =====================================================

  const totalAutre =
    consommateurs.reduce(
      (sum, item) =>
        sum +
        Number(
          item.totalAutre || 0
        ),
      0
    );

  return {
    nombreEtudiants:
      consommateurs.length,

    totalConsomme,

    totalPaye,

    totalAutre,
  };
}, [
  conso,
  filteredEtudes,
]);

  // =========================================================
  // STATISTIQUES PAR CYCLE
  // =========================================================

  const statsParCycle =
    useMemo(() => {
      const cycles: CycleScolaire[] =
        [
          "prescolaire",
          "primaire",
          "college",
          "lycee",
          "universite",
        ];

      return cycles.map(
        (cycle) => {
          const config =
            NOTE_CONFIG[cycle];

          const rows =
            filteredEtudes.filter(
              (e) =>
                getCycleScolaire(
                  e.niveauNom
                ) === cycle
            );

          const notes = rows
            .map((e) => ({
              note:
                getNoteValue(
                  e
                ),
              row: e,
            }))
            .filter(
              (
                x
              ): x is {
                note: number;
                row: EtudeRow;
              } =>
                x.note !== null &&
                Number.isFinite(
                  x.note
                )
            );

          const meilleure =
            notes.length > 0
              ? notes.reduce(
                  (
                    best,
                    current
                  ) =>
                    current.note >
                    best.note
                      ? current
                      : best
                )
              : null;

          const plusFaible =
            notes.length > 0
              ? notes.reduce(
                  (
                    min,
                    current
                  ) =>
                    current.note <
                    min.note
                      ? current
                      : min
                )
              : null;

          return {
            cycle,

            label:
              config.label,

            shortLabel:
              config.shortLabel,

            max:
              config.max,

            total:
              rows.length,

            meilleure,

            plusFaible,
          };
        }
      );
    }, [filteredEtudes]);

  // =========================================================
  // DISTRIBUTION PAR NIVEAU
  // =========================================================

  const statsNiveaux =
    useMemo(() => {
      const counts: Record<
        string,
        number
      > = {};

      filteredEtudes.forEach(
        (e) => {
          const key =
            e.niveauNom ||
            "غير محدد";

          counts[key] =
            (counts[key] ||
              0) + 1;
        }
      );

      return Object.entries(
        counts
      ).sort(
        (a, b) =>
          b[1] - a[1]
      );
    }, [filteredEtudes]);

  // =========================================================
  // DISTRIBUTION ÉCOLES
  // =========================================================

  const statsEcoles =
    useMemo(() => {
      const counts: Record<
        string,
        number
      > = {};

      filteredEtudes.forEach(
        (e) => {
          const key =
            e.nomEcole ||
            "غير محددة";

          counts[key] =
            (counts[key] ||
              0) + 1;
        }
      );

      return Object.entries(
        counts
      ).sort(
        (a, b) =>
          b[1] - a[1]
      );
    }, [filteredEtudes]);

  const maxNiveau = Math.max(
    ...statsNiveaux.map(
      ([, count]) => count
    ),
    1
  );

  const maxEcole = Math.max(
    ...statsEcoles.map(
      ([, count]) => count
    ),
    1
  );

  // =========================================================
  // RESET
  // =========================================================

  const hasFilter =
    year === "all" ||
    search !== "" ||
    niveauFilter !== "" ||
    ecoleFilter !== "" ||
    cycleFilter !== "";

  const resetFilters = () => {
    const current =
      anneesDisponibles.find(
        (a) =>
          normalizeSchoolYear(
            a
          ) ===
          normalizeSchoolYear(
            getCurrentSchoolYear()
          )
      );

    setYear(
      current ??
        anneesDisponibles[0] ??
        "all"
    );

    setSearch("");
    setNiveauFilter("");
    setEcoleFilter("");
    setCycleFilter("");
  };

  // =========================================================
  // TRI TABLE
  // =========================================================

  const sortedEtudes =
    useMemo(() => {
      const getValue = (
        row: EtudeRow
      ) => {
        switch (
          sort.key
        ) {
          case "total":
            return Number(
              conso[
                String(
                  row.enfant?.id ??
                    ""
                )
              ]?.totalConsomme || 0
            );

          case "note":
            return (
              getNoteValue(
                row
              ) ?? -1
            );

          case "cycle":
            return NOTE_CONFIG[
              getCycleScolaire(
                row.niveauNom
              )
            ].label;

          case "anneeScolaire":
            return normalizeSchoolYear(
              row.anneeScolaire
            );

          default:
            return (
              row[
                sort.key
              ] ?? ""
            );
        }
      };

      return [
        ...filteredEtudes,
      ].sort((a, b) => {
        const x =
          getValue(a);

        const y =
          getValue(b);

        if (
          typeof x ===
            "number" &&
          typeof y ===
            "number"
        ) {
          return (
            (x - y) *
            sort.dir
          );
        }

        return (
          String(
            x ?? ""
          ).localeCompare(
            String(
              y ?? ""
            ),
            "ar",
            {
              numeric: true,
            }
          ) * sort.dir
        );
      });
    }, [
      filteredEtudes,
      sort,
      conso,
    ]);

  const toggleSort = (
    key: string
  ) => {
    setSort((current) =>
      current.key === key
        ? {
            key,
            dir:
              current.dir ===
              1
                ? -1
                : 1,
          }
        : {
            key,
            dir: 1,
          }
    );
  };

  // =========================================================
  // PAGINATION
  // =========================================================

  useEffect(() => {
    setPage(0);
  }, [
    year,
    search,
    niveauFilter,
    ecoleFilter,
    cycleFilter,
    rowsPerPage,
  ]);

  const pageCount =
    Math.max(
      1,
      Math.ceil(
        sortedEtudes.length /
          rowsPerPage
      )
    );

  useEffect(() => {
    if (
      page >
      pageCount - 1
    ) {
      setPage(
        Math.max(
          0,
          pageCount - 1
        )
      );
    }
  }, [page, pageCount]);

  const pageRows =
    sortedEtudes.slice(
      page * rowsPerPage,
      (page + 1) *
        rowsPerPage
    );


  // =========================================================
  // EXPORT : DONNÉES + CRITÈRES INDÉPENDANTS
  // =========================================================

  const exportSourceRows = useMemo(() => {
    if (exportScope === "page") {
      return pageRows;
    }

    if (exportScope === "all") {
      return etudes;
    }

    return filteredEtudes;
  }, [
    exportScope,
    pageRows,
    etudes,
    filteredEtudes,
  ]);

  const exportFilteredData = useMemo(() => {
    const query = exportSearch.trim().toLowerCase();

    const minConsomme =
      exportMinConsomme === ""
        ? null
        : Number(exportMinConsomme);

    const maxConsomme =
      exportMaxConsomme === ""
        ? null
        : Number(exportMaxConsomme);

    const minPaye =
      exportMinPaye === ""
        ? null
        : Number(exportMinPaye);

    const maxPaye =
      exportMaxPaye === ""
        ? null
        : Number(exportMaxPaye);

    const minNote =
      exportMinNote === ""
        ? null
        : Number(exportMinNote);

    const maxNote =
      exportMaxNote === ""
        ? null
        : Number(exportMaxNote);

    return exportSourceRows
      .map((row) => {
        const soutien =
          conso[String(row.enfant?.id ?? "")] || {
            enfantId: Number(row.enfant?.id ?? 0),
            totalConsomme: 0,
            totalPaye: 0,
            totalAutre: 0,
            nombrePaiements: 0,
          };

        const note = getNoteValue(row);
        const cycle = getCycleScolaire(row.niveauNom);

        return {
          ...row,
          cycle,
          cycleLabel: NOTE_CONFIG[cycle].label,
          noteNumerique: note,
          montantSoutienConsommeNombre: Number(
            soutien.totalConsomme || 0
          ),
          montantSoutienPayeNombre: Number(
            soutien.totalPaye || 0
          ),
          montantSoutienAutreNombre: Number(
            soutien.totalAutre || 0
          ),
          montantSoutienConsomme: fmtMoney(
            soutien.totalConsomme
          ),
          montantSoutienPaye: fmtMoney(
            soutien.totalPaye
          ),
          montantSoutienAutre: fmtMoney(
            soutien.totalAutre
          ),
          nombrePaiementsSoutien: Number(
            soutien.nombrePaiements || 0
          ),
        };
      })
      .filter((row: any) => {
        if (
          query &&
          ![
            row.nomEnfant,
            row.nomEcole,
            row.niveauNom,
            row.anneeScolaire,
            row.cycleLabel,
          ]
            .join(" ")
            .toLowerCase()
            .includes(query)
        ) {
          return false;
        }

        if (
          exportYears.length > 0 &&
          !exportYears.includes(String(row.anneeScolaire ?? ""))
        ) {
          return false;
        }

        if (
          exportCycles.length > 0 &&
          !exportCycles.includes(String(row.cycle ?? ""))
        ) {
          return false;
        }

        if (
          exportNiveaux.length > 0 &&
          !exportNiveaux.includes(String(row.niveauNom ?? ""))
        ) {
          return false;
        }

        if (
          exportEcoles.length > 0 &&
          !exportEcoles.includes(String(row.nomEcole ?? ""))
        ) {
          return false;
        }

        const consomme = Number(
          row.montantSoutienConsommeNombre || 0
        );

        const paye = Number(
          row.montantSoutienPayeNombre || 0
        );

        const autre = Number(
          row.montantSoutienAutreNombre || 0
        );

        if (
          exportSupportFilter === "with" &&
          consomme <= 0
        ) {
          return false;
        }

        if (
          exportSupportFilter === "without" &&
          consomme > 0
        ) {
          return false;
        }

        if (
          exportPaymentFilter === "paid" &&
          !(consomme > 0 && paye >= consomme)
        ) {
          return false;
        }

        if (
          exportPaymentFilter === "partial" &&
          !(paye > 0 && paye < consomme)
        ) {
          return false;
        }

        if (
          exportPaymentFilter === "external" &&
          !(autre > 0)
        ) {
          return false;
        }

        if (
          minConsomme !== null &&
          Number.isFinite(minConsomme) &&
          consomme < minConsomme
        ) {
          return false;
        }

        if (
          maxConsomme !== null &&
          Number.isFinite(maxConsomme) &&
          consomme > maxConsomme
        ) {
          return false;
        }

        if (
          minPaye !== null &&
          Number.isFinite(minPaye) &&
          paye < minPaye
        ) {
          return false;
        }

        if (
          maxPaye !== null &&
          Number.isFinite(maxPaye) &&
          paye > maxPaye
        ) {
          return false;
        }

        if (
          minNote !== null &&
          Number.isFinite(minNote)
        ) {
          if (
            row.noteNumerique === null ||
            Number(row.noteNumerique) < minNote
          ) {
            return false;
          }
        }

        if (
          maxNote !== null &&
          Number.isFinite(maxNote)
        ) {
          if (
            row.noteNumerique === null ||
            Number(row.noteNumerique) > maxNote
          ) {
            return false;
          }
        }

        return true;
      });
  }, [
    exportSourceRows,
    conso,
    exportSearch,
    exportYears,
    exportCycles,
    exportNiveaux,
    exportEcoles,
    exportSupportFilter,
    exportPaymentFilter,
    exportMinConsomme,
    exportMaxConsomme,
    exportMinPaye,
    exportMaxPaye,
    exportMinNote,
    exportMaxNote,
  ]);

  const exportStats = useMemo(() => {
    return exportFilteredData.reduce(
      (acc: any, row: any) => {
        const consomme = Number(
          row.montantSoutienConsommeNombre || 0
        );
        const paye = Number(
          row.montantSoutienPayeNombre || 0
        );
        const autre = Number(
          row.montantSoutienAutreNombre || 0
        );

        acc.totalConsomme += consomme;
        acc.totalPaye += paye;
        acc.totalAutre += autre;

        if (consomme > 0) {
          acc.beneficiaires += 1;
        }

        return acc;
      },
      {
        totalConsomme: 0,
        totalPaye: 0,
        totalAutre: 0,
        beneficiaires: 0,
      }
    );
  }, [exportFilteredData]);

  const exportCriteriaLabels = useMemo(() => {
    const labels: string[] = [];

    if (exportSearch.trim()) {
      labels.push(`بحث: ${exportSearch.trim()}`);
    }

    if (exportYears.length > 0) {
      labels.push(`السنوات: ${exportYears.join("، ")}`);
    }

    if (exportCycles.length > 0) {
      labels.push(
        `المراحل: ${exportCycles
          .map(
            (cycle) =>
              NOTE_CONFIG[cycle as CycleScolaire]?.label || cycle
          )
          .join("، ")}`
      );
    }

    if (exportNiveaux.length > 0) {
      labels.push(`المستويات: ${exportNiveaux.join("، ")}`);
    }

    if (exportEcoles.length > 0) {
      labels.push(`المؤسسات: ${exportEcoles.join("، ")}`);
    }

    if (exportSupportFilter === "with") {
      labels.push("الدعم: مستفيدون فقط");
    }

    if (exportSupportFilter === "without") {
      labels.push("الدعم: غير مستفيدين فقط");
    }

    if (exportPaymentFilter === "paid") {
      labels.push("الأداء: مؤدى بالكامل");
    }

    if (exportPaymentFilter === "partial") {
      labels.push("الأداء: مؤدى جزئيا");
    }

    if (exportPaymentFilter === "external") {
      labels.push("الأداء: تكفل به الغير");
    }

    if (exportMinConsomme !== "" || exportMaxConsomme !== "") {
      labels.push(
        `المستهلك: ${exportMinConsomme || "0"} - ${
          exportMaxConsomme || "∞"
        } DH`
      );
    }

    if (exportMinPaye !== "" || exportMaxPaye !== "") {
      labels.push(
        `المؤدى: ${exportMinPaye || "0"} - ${
          exportMaxPaye || "∞"
        } DH`
      );
    }

    if (exportMinNote !== "" || exportMaxNote !== "") {
      labels.push(
        `النقطة: ${exportMinNote || "0"} - ${exportMaxNote || "∞"}`
      );
    }

    return labels;
  }, [
    exportSearch,
    exportYears,
    exportCycles,
    exportNiveaux,
    exportEcoles,
    exportSupportFilter,
    exportPaymentFilter,
    exportMinConsomme,
    exportMaxConsomme,
    exportMinPaye,
    exportMaxPaye,
    exportMinNote,
    exportMaxNote,
  ]);

  const resetExportFilters = () => {
    setExportScope("current");
    setExportSearch("");
    setExportYears([]);
    setExportCycles([]);
    setExportNiveaux([]);
    setExportEcoles([]);
    setExportSupportFilter("all");
    setExportPaymentFilter("all");
    setExportMinConsomme("");
    setExportMaxConsomme("");
    setExportMinPaye("");
    setExportMaxPaye("");
    setExportMinNote("");
    setExportMaxNote("");
  };

  // =========================================================
  // EXPORT EXCEL
  // =========================================================

  const exportExcel = (
    data: any[],
    fields: string[],
    summary: string[],
    fileName: string
  ) => {
    const rows = data.map((row) => {
      const obj: Record<string, any> = {};

      fields.forEach((field) => {
        const label =
          exportableFields.find((f) => f.value === field)?.text || field;

        obj[label] = row[field] ?? "";
      });

      return obj;
    });

    const worksheet = XLSX.utils.json_to_sheet(rows);

    const range = XLSX.utils.decode_range(
      worksheet["!ref"] || "A1:A1"
    );

    worksheet["!autofilter"] = {
      ref: XLSX.utils.encode_range({
        s: { r: 0, c: 0 },
        e: { r: Math.max(0, range.e.r), c: range.e.c },
      }),
    };

    worksheet["!cols"] = fields.map((field) => {
      const label =
        exportableFields.find((f) => f.value === field)?.text || field;

      return {
        wch: Math.max(14, Math.min(30, label.length + 8)),
      };
    });

    const summarySheet = XLSX.utils.aoa_to_sheet([
      [exportTitle || "التتبع الدراسي للأبناء"],
      [],
      ...summary.map((line) => [line]),
    ]);

    summarySheet["!cols"] = [{ wch: 55 }];

    const workbook = XLSX.utils.book_new();

    XLSX.utils.book_append_sheet(
      workbook,
      summarySheet,
      "Résumé"
    );

    XLSX.utils.book_append_sheet(
      workbook,
      worksheet,
      "Données"
    );

    const safeName =
      (fileName || "suivi_etudes")
        .trim()
        .replace(/[\\/:*?"<>|]+/g, "_") || "suivi_etudes";

    XLSX.writeFile(
      workbook,
      `${safeName}.xlsx`
    );
  };

  // =========================================================
  // EXPORT FINAL
  // =========================================================

  const handleExport = () => {
    if (selectedFields.length === 0) {
      alert("يرجى اختيار حقل واحد على الأقل");
      return;
    }

    if (exportFilteredData.length === 0) {
      alert("لا توجد بيانات مطابقة لمعايير التصدير");
      return;
    }

    const headers = selectedFields.map(
      (field) =>
        exportableFields.find((f) => f.value === field)?.text || field
    );

    const rows = exportFilteredData.map((row: any) =>
      selectedFields.map((field) => row[field] ?? "")
    );

    const scopeLabel =
      exportScope === "all"
        ? "كل البيانات المحملة"
        : exportScope === "page"
          ? "الصفحة الحالية"
          : "النتائج المصفاة حاليا";

    const summary = [
      `النطاق: ${scopeLabel}`,
      `عدد السجلات: ${rows.length}`,
      `المستفيدون من الدعم: ${exportStats.beneficiaires}`,
      `إجمالي الدعم المستهلك: ${fmtMoney(exportStats.totalConsomme)}`,
      `المبلغ المؤدى من طرفنا: ${fmtMoney(exportStats.totalPaye)}`,
      `المبلغ المؤدى من طرف الغير: ${fmtMoney(exportStats.totalAutre)}`,
      ...exportCriteriaLabels,
    ];

    if (exportFormat === "excel") {
      exportExcel(
        exportFilteredData,
        selectedFields,
        summary,
        exportFileName
      );

      setExportDialogVisible(false);
      return;
    }

    printPdf(
      exportTitle.trim() || "التتبع الدراسي للأبناء",
      headers,
      rows,
      summary,
      exportOrientation
    );

    setExportDialogVisible(false);
  };

  // =========================================================
  // TEMPLATES AFFICHAGE
  // =========================================================

  const niveauBodyTemplate = (
    row: EtudeRow
  ) => (
    <span className="inline-flex rounded-full bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-700">
      {row.niveauNom}
    </span>
  );

  const cycleBodyTemplate = (
    row: EtudeRow
  ) => {
    const cycle =
      getCycleScolaire(
        row.niveauNom
      );

    const config =
      NOTE_CONFIG[cycle];

    const classes: Record<
      CycleScolaire,
      string
    > = {
      prescolaire:
        "bg-pink-50 text-pink-700",

      primaire:
        "bg-sky-50 text-sky-700",

      college:
        "bg-purple-50 text-purple-700",

      lycee:
        "bg-indigo-50 text-indigo-700",

      universite:
        "bg-emerald-50 text-emerald-700",

      inconnu:
        "bg-gray-100 text-gray-600",
    };

    return (
      <span
        className={`inline-flex rounded-full px-3 py-1 text-xs font-bold ${classes[cycle]}`}
      >
        {config.label}
      </span>
    );
  };

  const anneeBodyTemplate = (
    row: EtudeRow
  ) => (
    <span className="inline-flex whitespace-nowrap rounded-full bg-indigo-50 px-3 py-1 text-xs font-semibold text-indigo-700">
      {row.anneeScolaire ??
        "—"}
    </span>
  );

  const noteBodyTemplate = (
    row: EtudeRow
  ) => {
    const cycle =
      getCycleScolaire(
        row.niveauNom
      );

    // Pas de notes affichées pour le préscolaire ni l'université.
    if (
      cycle === "prescolaire" ||
      cycle === "universite"
    ) {
      return (
        <span className="text-gray-400">
          —
        </span>
      );
    }

    const value =
      getNoteValue(row);

    if (
      value === null
    ) {
      return (
        <span className="text-gray-400">
          —
        </span>
      );
    }

    const config =
      NOTE_CONFIG[cycle];

    const reussi =
      value >=
      config.seuilReussite;

    return (
      <div className="flex flex-col items-center gap-1">
        <span
          className={`inline-flex min-w-[90px] justify-center rounded-full px-3 py-1 text-xs font-bold ${
            reussi
              ? "bg-emerald-50 text-emerald-700"
              : "bg-red-50 text-red-600"
          }`}
        >
          {value.toFixed(2)}
          {" / "}
          {config.max}
        </span>

        <span className="text-[10px] text-gray-400">
          {config.shortLabel}
        </span>
      </div>
    );
  };

  // =========================================================
  // OPEN PROFILE
  // =========================================================

  const openProfile = (
    row: EtudeRow
  ) => {
    const enfantId =
      row.enfant?.id;

    if (!enfantId) {
      console.error(
        "Impossible d'ouvrir le dossier : enfant.id absent",
        row
      );

      return;
    }

    navigate(
      `/EtudesProfile/${enfantId}`
    );
  };

  // =========================================================
  // SORT HEADER
  // =========================================================

  const SortHeader = ({
    sortKey,
    children,
    center = false,
  }: {
    sortKey: string;
    children: React.ReactNode;
    center?: boolean;
  }) => (
    <button
      type="button"
      onClick={() =>
        toggleSort(sortKey)
      }
      className={`inline-flex items-center gap-1 transition hover:text-indigo-600 ${
        center
          ? "justify-center"
          : ""
      }`}
    >
      <span>
        {children}
      </span>

      <span
        className={
          sort.key ===
          sortKey
            ? "text-indigo-600"
            : "text-gray-300"
        }
      >
        {sort.key ===
        sortKey
          ? sort.dir === 1
            ? "▲"
            : "▼"
          : "↕"}
      </span>
    </button>
  );

  // =========================================================
  // RENDER
  // =========================================================

  return (
    <div
      dir="rtl"
      className="etudes-table px-4 py-4 md:px-6"
    >
      <div className="mx-auto max-w-7xl space-y-6">

        {/* ================================================= */}
        {/* HEADER */}
        {/* ================================================= */}

        <div className="flex flex-col gap-4 rounded-3xl border border-gray-200 bg-white p-6 shadow-sm md:flex-row md:items-center md:justify-between">

          <div>
            <p className="mb-1 text-xs font-semibold text-indigo-600">
              إدارة التتبع الدراسي
            </p>

            <h1 className="text-2xl font-bold text-gray-900">
              التتبع الدراسي للأبناء
            </h1>

            <p className="mt-1 text-sm text-gray-400">
              متابعة الدراسة والنتائج والدعم الدراسي والمبالغ المستهلكة
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">

            <select
              value={year}
              onChange={(e) =>
                setYear(
                  e.target.value
                )
              }
              className="h-11 rounded-xl border border-gray-200 bg-white px-4 text-sm font-semibold outline-none transition focus:border-indigo-300 focus:ring-4 focus:ring-indigo-500/10"
            >
              <option value="all">
                كل السنوات
              </option>

              {anneesDisponibles.map(
                (annee) => (
                  <option
                    key={annee}
                    value={annee}
                  >
                    {annee}
                  </option>
                )
              )}
            </select>

            {hasFilter && (
              <button
                type="button"
                onClick={
                  resetFilters
                }
                className="h-11 rounded-xl border border-gray-200 bg-white px-4 text-sm font-semibold text-gray-600 hover:bg-gray-50"
              >
                إعادة التصفية
              </button>
            )}

            <button
              type="button"
              onClick={() =>
                setExportDialogVisible(
                  true
                )
              }
              className="inline-flex h-11 items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-5 text-sm font-semibold text-emerald-700 transition hover:-translate-y-0.5 hover:bg-emerald-100"
            >
              <i className="pi pi-download" />
              تصدير
            </button>
          </div>
        </div>

        {/* ================================================= */}
        {/* STATS GÉNÉRALES */}
        {/* ================================================= */}

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-6">

          <div className="rounded-2xl border border-blue-100 bg-blue-50 p-5">
            <p className="text-sm text-gray-500">
              عدد الطلاب
            </p>

            <p className="mt-1 text-3xl font-bold text-blue-700">
              {stats.totalEtudiants}
            </p>
          </div>

          <div className="rounded-2xl border border-purple-100 bg-purple-50 p-5">
            <p className="text-sm text-gray-500">
              عدد المؤسسات
            </p>

            <p className="mt-1 text-3xl font-bold text-purple-700">
              {stats.totalEcoles}
            </p>
          </div>

          <div className="rounded-2xl border border-amber-100 bg-amber-50 p-5">
            <p className="text-sm text-gray-500">
              عدد المستويات
            </p>

            <p className="mt-1 text-3xl font-bold text-amber-700">
              {stats.totalNiveaux}
            </p>
          </div>

          <div className="rounded-2xl border border-cyan-100 bg-cyan-50 p-5">
            <p className="text-sm text-gray-500">
              الطلاب المستفيدون من الدعم
            </p>

            <p className="mt-1 text-3xl font-bold text-cyan-700">
              {consoLoading
                ? "..."
                : statsSoutien.nombreEtudiants}
            </p>

            <p className="mt-1 text-xs text-cyan-600">
              {year === "all"
                ? "كل السنوات"
                : year}
            </p>
          </div>

          <div className="rounded-2xl border border-emerald-100 bg-emerald-50 p-5">
            <p className="text-sm text-gray-500">
              إجمالي الدعم المستهلك
            </p>

            <p className="mt-1 whitespace-nowrap text-2xl font-bold text-emerald-700">
              {consoLoading
                ? "..."
                : fmtMoney(
                    statsSoutien.totalConsomme
                  )}
            </p>

            <p className="mt-1 text-xs text-emerald-600">
              {year === "all"
                ? "كل السنوات"
                : year}
            </p>
          </div>

          <div className="rounded-2xl border border-violet-100 bg-violet-50 p-5">
            <p className="text-sm text-gray-500">
              المبلغ المؤدى من طرفنا
            </p>

            <p className="mt-1 whitespace-nowrap text-2xl font-bold text-violet-700">
              {consoLoading
                ? "..."
                : fmtMoney(
                    statsSoutien.totalPaye
                  )}
            </p>

            <p className="mt-1 text-xs text-violet-600">
              تكفل به الغير:{" "}
              {consoLoading
                ? "..."
                : fmtMoney(
                    statsSoutien.totalAutre
                  )}
            </p>
          </div>

        </div>

        {/* ================================================= */}
        {/* STATISTIQUES PAR CYCLE */}
        {/* ================================================= */}

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-5">

          {statsParCycle.map(
            (item) => (
              <div
                key={
                  item.cycle
                }
                className="rounded-3xl border border-gray-200 bg-white p-5 shadow-sm"
              >

                <div
                  className={
                    item.cycle === "universite" ||
                    item.cycle === "prescolaire"
                      ? ""
                      : "mb-4"
                  }
                >
                  <p className="text-xs font-semibold text-indigo-500">
                    المرحلة الدراسية
                  </p>

                  <h3 className="mt-1 font-bold text-gray-800">
                    {item.label}
                  </h3>

                  <span className="mt-2 inline-flex rounded-full bg-indigo-50 px-3 py-1 text-xs font-bold text-indigo-700">
                    {item.total} طالب
                  </span>
                </div>

                {item.cycle !== "universite" &&
                  item.cycle !== "prescolaire" && (
                  <div className="mt-4 grid grid-cols-2 gap-2">

                    <div className="rounded-xl bg-emerald-50 p-3">
                      <p className="text-[11px] text-gray-500">
                        أعلى نقطة
                      </p>

                      <p className="mt-1 font-bold text-emerald-700">
                        {item.meilleure
                          ? `${item.meilleure.note.toFixed(
                              2
                            )} / ${item.max}`
                          : "—"}
                      </p>
                    </div>

                    <div className="rounded-xl bg-red-50 p-3">
                      <p className="text-[11px] text-gray-500">
                        أقل نقطة
                      </p>

                      <p className="mt-1 font-bold text-red-600">
                        {item.plusFaible
                          ? `${item.plusFaible.note.toFixed(
                              2
                            )} / ${item.max}`
                          : "—"}
                      </p>
                    </div>

                  </div>
                )}
              </div>
            )
          )}

        </div>

        {/* ================================================= */}
        {/* DISTRIBUTIONS */}
        {/* ================================================= */}

        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">

          {/* NIVEAUX */}

          <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
            <h3 className="font-bold text-gray-800">
              التوزيع حسب المستوى
            </h3>

            <p className="mb-5 mt-1 text-xs text-gray-400">
              اضغط على المستوى لتصفية الجدول
            </p>

            <div className="space-y-3">
              {statsNiveaux.map(
                ([
                  niveau,
                  count,
                ]) => (
                  <button
                    key={
                      niveau
                    }
                    type="button"
                    onClick={() =>
                      setNiveauFilter(
                        niveauFilter ===
                          niveau
                          ? ""
                          : niveau
                      )
                    }
                    className={`block w-full rounded-xl p-2 text-right transition ${
                      niveauFilter ===
                      niveau
                        ? "bg-amber-50"
                        : "hover:bg-gray-50"
                    }`}
                  >
                    <div className="mb-1.5 flex items-center justify-between">
                      <span className="text-sm font-semibold text-gray-700">
                        {niveau}
                      </span>

                      <span className="text-xs font-bold text-gray-500">
                        {count}
                      </span>
                    </div>

                    <div className="h-2 overflow-hidden rounded-full bg-gray-100">
                      <div
                        className="h-full rounded-full bg-amber-500"
                        style={{
                          width: `${
                            (count /
                              maxNiveau) *
                            100
                          }%`,
                        }}
                      />
                    </div>
                  </button>
                )
              )}

              {statsNiveaux.length ===
                0 && (
                <p className="py-6 text-center text-sm text-gray-400">
                  لا توجد بيانات
                </p>
              )}
            </div>
          </div>

          {/* ECOLES */}

          <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
            <h3 className="font-bold text-gray-800">
              التوزيع حسب المؤسسة
            </h3>

            <p className="mb-5 mt-1 text-xs text-gray-400">
              اضغط على المؤسسة لتصفية الجدول
            </p>

            <div className="space-y-3">
              {statsEcoles
                .slice(0, 8)
                .map(
                  ([
                    ecole,
                    count,
                  ]) => (
                    <button
                      key={
                        ecole
                      }
                      type="button"
                      onClick={() =>
                        setEcoleFilter(
                          ecoleFilter ===
                            ecole
                            ? ""
                            : ecole
                        )
                      }
                      className={`block w-full rounded-xl p-2 text-right transition ${
                        ecoleFilter ===
                        ecole
                          ? "bg-indigo-50"
                          : "hover:bg-gray-50"
                      }`}
                    >
                      <div className="mb-1.5 flex items-center justify-between gap-3">
                        <span className="truncate text-sm font-semibold text-gray-700">
                          {ecole}
                        </span>

                        <span className="text-xs font-bold text-gray-500">
                          {count}
                        </span>
                      </div>

                      <div className="h-2 overflow-hidden rounded-full bg-gray-100">
                        <div
                          className="h-full rounded-full bg-indigo-500"
                          style={{
                            width: `${
                              (count /
                                maxEcole) *
                              100
                            }%`,
                          }}
                        />
                      </div>
                    </button>
                  )
                )}
            </div>
          </div>

        </div>

        {/* ================================================= */}
        {/* TABLEAU STYLE FAMILLES */}
        {/* ================================================= */}

        <div className="overflow-hidden rounded-3xl border border-gray-200 bg-white shadow-sm">

          {/* FILTRES */}

          <div className="flex flex-col gap-3 border-b border-gray-100 p-4 xl:flex-row xl:items-center">

            <div className="relative min-w-0 flex-1">
              <i className="pi pi-search absolute right-4 top-1/2 -translate-y-1/2 text-gray-400" />

              <input
                value={search}
                onChange={(e) =>
                  setSearch(
                    e.target.value
                  )
                }
                placeholder="ابحث باسم الطالب، المؤسسة أو المستوى..."
                className="h-11 w-full rounded-xl border border-gray-200 bg-gray-50 pr-11 pl-4 text-sm outline-none focus:border-indigo-300 focus:bg-white focus:ring-4 focus:ring-indigo-500/10"
              />
            </div>

            <select
              value={
                cycleFilter
              }
              onChange={(e) =>
                setCycleFilter(
                  e.target
                    .value as
                    | CycleScolaire
                    | ""
                )
              }
              className="h-11 rounded-xl border border-gray-200 bg-gray-50 px-3 text-sm outline-none"
            >
              <option value="">
                كل المراحل
              </option>

              <option value="prescolaire">
                التعليم الأولي
              </option>

              <option value="primaire">
                التعليم الابتدائي
              </option>

              <option value="college">
                التعليم الإعدادي
              </option>

              <option value="lycee">
                التعليم الثانوي التأهيلي
              </option>

              <option value="universite">
                التعليم الجامعي
              </option>
            </select>

            <select
              value={
                niveauFilter
              }
              onChange={(e) =>
                setNiveauFilter(
                  e.target.value
                )
              }
              className="h-11 max-w-[280px] rounded-xl border border-gray-200 bg-gray-50 px-3 text-sm outline-none"
            >
              <option value="">
                كل المستويات
              </option>

              {niveauxOptions.map(
                (niveau) => (
                  <option
                    key={
                      niveau.value
                    }
                    value={
                      niveau.value
                    }
                  >
                    {niveau.text}
                  </option>
                )
              )}
            </select>

            <select
              value={
                ecoleFilter
              }
              onChange={(e) =>
                setEcoleFilter(
                  e.target.value
                )
              }
              className="h-11 max-w-[260px] rounded-xl border border-gray-200 bg-gray-50 px-3 text-sm outline-none"
            >
              <option value="">
                كل المؤسسات
              </option>

              {ecolesOptions.map(
                (ecole) => (
                  <option
                    key={
                      ecole.value
                    }
                    value={
                      ecole.value
                    }
                  >
                    {ecole.text}
                  </option>
                )
              )}
            </select>

            <span className="whitespace-nowrap rounded-xl bg-indigo-50 px-4 py-2.5 text-xs font-bold text-indigo-700">
              {filteredEtudes.length} طالب
            </span>
          </div>

          {/* TABLE */}

          <div className="overflow-x-auto">
            <table className="w-full min-w-[1350px] text-right">

              <thead>
                <tr className="bg-gray-50/70 text-xs font-semibold text-gray-500">

                  <th className="px-5 py-4">
                    <SortHeader sortKey="nomEnfant">
                      الطالب
                    </SortHeader>
                  </th>

                  <th className="px-5 py-4 text-center">
                    <SortHeader
                      sortKey="cycle"
                      center
                    >
                      المرحلة الدراسية
                    </SortHeader>
                  </th>

                  <th className="px-5 py-4">
                    <SortHeader sortKey="niveauNom">
                      المستوى
                    </SortHeader>
                  </th>

                  <th className="px-5 py-4">
                    <SortHeader sortKey="nomEcole">
                      المؤسسة
                    </SortHeader>
                  </th>

                  <th className="px-5 py-4 text-center">
                    <SortHeader
                      sortKey="anneeScolaire"
                      center
                    >
                      السنة الدراسية
                    </SortHeader>
                  </th>

                  <th className="px-5 py-4 text-center">
                    <SortHeader
                      sortKey="note"
                      center
                    >
                      النقطة
                    </SortHeader>
                  </th>

                  <th className="px-5 py-4">
                    <SortHeader sortKey="total">
                      الدعم المالي
                    </SortHeader>
                  </th>

                  <th className="px-5 py-4 text-center">
                    الإجراء
                  </th>

                </tr>
              </thead>

              <tbody className="divide-y divide-gray-100">

                {loading && (
                  <tr>
                    <td
                      colSpan={8}
                      className="py-16 text-center text-gray-400"
                    >
                      جاري التحميل...
                    </td>
                  </tr>
                )}

                {!loading &&
                  pageRows.length ===
                    0 && (
                    <tr>
                      <td
                        colSpan={
                          8
                        }
                        className="py-16 text-center text-gray-400"
                      >
                        لا توجد نتائج
                      </td>
                    </tr>
                  )}

                {!loading &&
                  pageRows.map(
                    (row) => {
                      const consommation =
                        getConso(
                          row
                        );

                      const enfantId =
                        row.enfant
                          ?.id;

                      const avatarIndex =
                        Math.abs(
                          Number(
                            enfantId ??
                              row.id ??
                              0
                          )
                        ) %
                        AVATARS.length;

                      const grad =
                        AVATARS[
                          Number.isFinite(
                            avatarIndex
                          )
                            ? avatarIndex
                            : 0
                        ];

                      return (
                        <tr
                          key={
                            row.id
                          }
                          onClick={() =>
                            openProfile(
                              row
                            )
                          }
                          className="group cursor-pointer transition hover:bg-indigo-50/40"
                        >

                          {/* ETUDIANT */}

                          <td className="px-5 py-4">
                            <div className="flex items-center gap-3">

                              <span
                                className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br ${grad} text-base font-bold text-white shadow-sm`}
                              >
                                {row.nomEnfant
                                  ?.charAt(
                                    0
                                  )
                                  ?.toUpperCase() ||
                                  "ط"}
                              </span>

                              <div className="min-w-0">
                                <p className="truncate font-bold text-gray-800">
                                  {
                                    row.nomEnfant
                                  }
                                </p>

                                <p className="truncate text-xs text-gray-400">
                                  عرض الملف الدراسي الكامل
                                </p>
                              </div>

                            </div>
                          </td>

                          {/* CYCLE */}

                          <td className="px-5 py-4 text-center">
                            {cycleBodyTemplate(
                              row
                            )}
                          </td>

                          {/* NIVEAU */}

                          <td className="px-5 py-4">
                            {niveauBodyTemplate(
                              row
                            )}
                          </td>

                          {/* ECOLE */}

                          <td className="px-5 py-4">
                            <span className="text-sm font-semibold text-gray-700">
                              {
                                row.nomEcole
                              }
                            </span>
                          </td>

                          {/* ANNEE */}

                          <td className="px-5 py-4 text-center">
                            {anneeBodyTemplate(
                              row
                            )}
                          </td>

                          {/* NOTE */}

                          <td className="px-5 py-4 text-center">
                            {noteBodyTemplate(
                              row
                            )}
                          </td>

                          {/* SOUTIEN */}

                          <td className="px-5 py-4">
                            {(() => {
                              const consomme =
                                Number(
                                  consommation.totalConsomme ||
                                    0
                                );

                              const paye =
                                Number(
                                  consommation.totalPaye ||
                                    0
                                );

                              const autre =
                                Number(
                                  consommation.totalAutre ||
                                    0
                                );

                              const pourcentagePaye =
                                consomme > 0
                                  ? Math.min(
                                      100,
                                      Math.max(
                                        0,
                                        (paye /
                                          consomme) *
                                          100
                                      )
                                    )
                                  : 0;

                              return (
                                <div className="min-w-[190px]">
                                  <div className="flex items-center justify-between gap-3">
                                    <span className="text-[11px] text-gray-400">
                                      مستهلك
                                    </span>

                                    <span
                                      className={`whitespace-nowrap text-sm font-bold ${
                                        consomme > 0
                                          ? "text-emerald-700"
                                          : "text-gray-400"
                                      }`}
                                    >
                                      {fmtMoney(
                                        consomme
                                      )}
                                    </span>
                                  </div>

                                  <div className="mt-1 flex items-center justify-between gap-3">
                                    <span className="text-[11px] text-gray-400">
                                      مدفوع من طرفنا
                                    </span>

                                    <span className="whitespace-nowrap text-xs font-bold text-violet-700">
                                      {fmtMoney(
                                        paye
                                      )}
                                    </span>
                                  </div>

                                  {autre > 0 && (
                                    <div className="mt-1 flex items-center justify-between gap-3">
                                      <span className="text-[11px] text-gray-400">
                                        تكفل به الغير
                                      </span>

                                      <span className="whitespace-nowrap text-xs font-bold text-amber-700">
                                        {fmtMoney(
                                          autre
                                        )}
                                      </span>
                                    </div>
                                  )}

                                  <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-gray-100">
                                    <div
                                      className="h-1.5 rounded-full bg-violet-500 transition-all"
                                      style={{
                                        width: `${pourcentagePaye}%`,
                                      }}
                                    />
                                  </div>

                                  {consommation.nombrePaiements >
                                    0 && (
                                    <p className="mt-1 text-[11px] text-gray-400">
                                      {
                                        consommation.nombrePaiements
                                      }{" "}
                                      دفعة
                                    </p>
                                  )}
                                </div>
                              );
                            })()}
                          </td>

                          {/* ACTION */}

                          <td className="px-5 py-4">
                            <div className="flex justify-center">

                              <button
                                type="button"
                                title="عرض الملف الدراسي"
                                onClick={(
                                  event
                                ) => {
                                  event.stopPropagation();

                                  openProfile(
                                    row
                                  );
                                }}
                                className="flex h-9 w-9 items-center justify-center rounded-xl text-gray-400 transition hover:bg-indigo-50 hover:text-indigo-600"
                              >
                                <i className="pi pi-eye" />
                              </button>

                            </div>
                          </td>

                        </tr>
                      );
                    }
                  )}

              </tbody>
            </table>
          </div>

          {/* PAGINATION */}

          <div className="flex flex-col items-center justify-between gap-3 border-t border-gray-100 px-5 py-4 text-sm text-gray-500 md:flex-row">

            <span>
              {sortedEtudes.length ===
              0
                ? "0"
                : `${
                    page *
                      rowsPerPage +
                    1
                  } - ${Math.min(
                    (page + 1) *
                      rowsPerPage,
                    sortedEtudes.length
                  )}`}{" "}
              من{" "}
              {
                sortedEtudes.length
              }
            </span>

            <div className="flex items-center gap-2">

              <button
                type="button"
                disabled={
                  page === 0
                }
                onClick={() =>
                  setPage(
                    Math.max(
                      0,
                      page - 1
                    )
                  )
                }
                className="h-9 rounded-xl border border-gray-200 px-4 font-semibold transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40"
              >
                السابق
              </button>

              <span className="rounded-xl bg-indigo-600 px-4 py-2 text-xs font-bold text-white">
                {page + 1} /{" "}
                {pageCount}
              </span>

              <button
                type="button"
                disabled={
                  page >=
                  pageCount -
                    1
                }
                onClick={() =>
                  setPage(
                    Math.min(
                      pageCount -
                        1,
                      page + 1
                    )
                  )
                }
                className="h-9 rounded-xl border border-gray-200 px-4 font-semibold transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40"
              >
                التالي
              </button>

            </div>

            <select
              value={
                rowsPerPage
              }
              onChange={(e) =>
                setRowsPerPage(
                  Number(
                    e.target
                      .value
                  )
                )
              }
              className="h-9 rounded-xl border border-gray-200 bg-white px-2"
            >
              {[
                5,
                10,
                20,
                50,
              ].map(
                (number) => (
                  <option
                    key={
                      number
                    }
                    value={
                      number
                    }
                  >
                    {number} / صفحة
                  </option>
                )
              )}
            </select>

          </div>

        </div>

      </div>

      {/* =================================================== */}
      {/* EXPORT MODAL */}
      {/* =================================================== */}

      <Modal
        isOpen={exportDialogVisible}
        onClose={() => setExportDialogVisible(false)}
        className="max-w-6xl m-4"
      >
        <div
          dir="rtl"
          className="max-h-[92vh] overflow-y-auto rounded-[32px] bg-[#f8fafc]"
        >
          {/* HEADER */}
          <div className="sticky top-0 z-10 border-b border-gray-100 bg-white/95 px-6 py-5 backdrop-blur lg:px-8">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div className="flex items-center gap-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-600 to-violet-600 text-white shadow-lg shadow-indigo-200">
                  <i className="pi pi-file-export text-xl" />
                </div>

                <div>
                  <p className="text-xs font-bold text-indigo-600">
                    مركز التصدير
                  </p>

                  <h4 className="mt-0.5 text-2xl font-black text-gray-900">
                    إنشاء تقرير مخصص
                  </h4>

                  <p className="mt-1 text-sm text-gray-400">
                    اختر الصيغة والحقول والنطاق ثم أضف أي معايير تريدها
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setExportDialogVisible(false)}
                className="flex h-10 w-10 items-center justify-center self-start rounded-xl border border-gray-200 bg-white text-gray-400 transition hover:bg-gray-50 hover:text-gray-700 lg:self-auto"
              >
                <i className="pi pi-times" />
              </button>
            </div>
          </div>

          <div className="grid gap-6 p-6 lg:grid-cols-[1fr_340px] lg:p-8">
            {/* CONFIGURATION */}
            <div className="space-y-5">
              {/* FORMAT */}
              <section className="rounded-3xl border border-gray-200 bg-white p-5 shadow-sm">
                <div className="mb-4 flex items-center justify-between">
                  <div>
                    <h5 className="font-black text-gray-800">1. صيغة التصدير</h5>
                    <p className="mt-1 text-xs text-gray-400">
                      PDF للطباعة والتقارير، أو Excel للتحليل والتعديل
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <button
                    type="button"
                    onClick={() => setExportFormat("pdf")}
                    className={`group rounded-2xl border-2 p-4 text-right transition ${
                      exportFormat === "pdf"
                        ? "border-rose-400 bg-rose-50 shadow-sm"
                        : "border-gray-100 bg-white hover:border-rose-200 hover:bg-rose-50/40"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-rose-100 text-rose-600">
                        <i className="pi pi-file-pdf text-xl" />
                      </span>

                      <div>
                        <p className="font-black text-gray-800">PDF</p>
                        <p className="mt-0.5 text-xs text-gray-400">
                          تقرير منسق وجاهز للطباعة
                        </p>
                      </div>

                      {exportFormat === "pdf" && (
                        <i className="pi pi-check-circle mr-auto text-lg text-rose-500" />
                      )}
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setExportFormat("excel")}
                    className={`group rounded-2xl border-2 p-4 text-right transition ${
                      exportFormat === "excel"
                        ? "border-emerald-400 bg-emerald-50 shadow-sm"
                        : "border-gray-100 bg-white hover:border-emerald-200 hover:bg-emerald-50/40"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-100 text-emerald-600">
                        <i className="pi pi-file-excel text-xl" />
                      </span>

                      <div>
                        <p className="font-black text-gray-800">Excel</p>
                        <p className="mt-0.5 text-xs text-gray-400">
                          جدول قابل للفرز والتحليل
                        </p>
                      </div>

                      {exportFormat === "excel" && (
                        <i className="pi pi-check-circle mr-auto text-lg text-emerald-500" />
                      )}
                    </div>
                  </button>
                </div>

                {exportFormat === "pdf" && (
                  <div className="mt-4 grid gap-3 sm:grid-cols-2">
                    <div>
                      <label className="mb-1.5 block text-xs font-bold text-gray-600">
                        عنوان التقرير
                      </label>
                      <input
                        value={exportTitle}
                        onChange={(e) => setExportTitle(e.target.value)}
                        className="h-11 w-full rounded-xl border border-gray-200 bg-gray-50 px-3 text-sm outline-none focus:border-indigo-300 focus:bg-white focus:ring-4 focus:ring-indigo-500/10"
                      />
                    </div>

                    <div>
                      <label className="mb-1.5 block text-xs font-bold text-gray-600">
                        اتجاه الصفحة
                      </label>
                      <div className="grid grid-cols-2 gap-2">
                        <button
                          type="button"
                          onClick={() => setExportOrientation("landscape")}
                          className={`h-11 rounded-xl border text-sm font-bold transition ${
                            exportOrientation === "landscape"
                              ? "border-indigo-400 bg-indigo-50 text-indigo-700"
                              : "border-gray-200 bg-white text-gray-500"
                          }`}
                        >
                          أفقي
                        </button>

                        <button
                          type="button"
                          onClick={() => setExportOrientation("portrait")}
                          className={`h-11 rounded-xl border text-sm font-bold transition ${
                            exportOrientation === "portrait"
                              ? "border-indigo-400 bg-indigo-50 text-indigo-700"
                              : "border-gray-200 bg-white text-gray-500"
                          }`}
                        >
                          عمودي
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {exportFormat === "excel" && (
                  <div className="mt-4">
                    <label className="mb-1.5 block text-xs font-bold text-gray-600">
                      اسم الملف
                    </label>
                    <div className="relative">
                      <input
                        value={exportFileName}
                        onChange={(e) => setExportFileName(e.target.value)}
                        className="h-11 w-full rounded-xl border border-gray-200 bg-gray-50 px-3 pl-16 text-sm outline-none focus:border-emerald-300 focus:bg-white focus:ring-4 focus:ring-emerald-500/10"
                      />
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold text-gray-400">
                        .xlsx
                      </span>
                    </div>
                  </div>
                )}
              </section>

              {/* SCOPE */}
              <section className="rounded-3xl border border-gray-200 bg-white p-5 shadow-sm">
                <div className="mb-4">
                  <h5 className="font-black text-gray-800">2. نطاق البيانات</h5>
                  <p className="mt-1 text-xs text-gray-400">
                    حدد من أين تبدأ عملية التصدير قبل تطبيق المعايير الخاصة أدناه
                  </p>
                </div>

                <div className="grid gap-2 sm:grid-cols-3">
                  {[
                    {
                      value: "current",
                      title: "النتائج الحالية",
                      subtitle: `${filteredEtudes.length} سجل`,
                      icon: "pi-filter",
                    },
                    {
                      value: "page",
                      title: "الصفحة الحالية",
                      subtitle: `${pageRows.length} سجل`,
                      icon: "pi-clone",
                    },
                    {
                      value: "all",
                      title: "كل البيانات المحملة",
                      subtitle: `${etudes.length} سجل`,
                      icon: "pi-database",
                    },
                  ].map((item) => (
                    <button
                      key={item.value}
                      type="button"
                      onClick={() => setExportScope(item.value as ExportScope)}
                      className={`rounded-2xl border p-3 text-right transition ${
                        exportScope === item.value
                          ? "border-indigo-300 bg-indigo-50"
                          : "border-gray-200 bg-white hover:bg-gray-50"
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <i
                          className={`pi ${item.icon} ${
                            exportScope === item.value
                              ? "text-indigo-600"
                              : "text-gray-400"
                          }`}
                        />
                        <div>
                          <p className="text-sm font-bold text-gray-700">
                            {item.title}
                          </p>
                          <p className="text-[11px] text-gray-400">
                            {item.subtitle}
                          </p>
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              </section>

              {/* FIELDS */}
              <section className="rounded-3xl border border-gray-200 bg-white p-5 shadow-sm">
                <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <h5 className="font-black text-gray-800">3. الحقول المصدرة</h5>
                    <p className="mt-1 text-xs text-gray-400">
                      اختر فقط الأعمدة التي تريد ظهورها في التقرير
                    </p>
                  </div>

                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() =>
                        setSelectedFields(
                          exportableFields.map((field) => field.value)
                        )
                      }
                      className="rounded-lg bg-indigo-50 px-3 py-1.5 text-xs font-bold text-indigo-700"
                    >
                      تحديد الكل
                    </button>

                    <button
                      type="button"
                      onClick={() => setSelectedFields([])}
                      className="rounded-lg bg-gray-100 px-3 py-1.5 text-xs font-bold text-gray-600"
                    >
                      إلغاء الكل
                    </button>
                  </div>
                </div>

                <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
                  {exportableFields.map((field) => {
                    const checked = selectedFields.includes(field.value);

                    return (
                      <label
                        key={field.value}
                        className={`flex cursor-pointer items-center gap-3 rounded-xl border p-3 transition ${
                          checked
                            ? "border-indigo-200 bg-indigo-50/70"
                            : "border-gray-200 bg-white hover:bg-gray-50"
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() =>
                            setSelectedFields((prev) =>
                              checked
                                ? prev.filter((value) => value !== field.value)
                                : [...prev, field.value]
                            )
                          }
                          className="h-4 w-4 accent-indigo-600"
                        />

                        <span className="text-sm font-semibold text-gray-700">
                          {field.text}
                        </span>
                      </label>
                    );
                  })}
                </div>
              </section>

              {/* CRITERIA */}
              <section className="rounded-3xl border border-gray-200 bg-white p-5 shadow-sm">
                <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <h5 className="font-black text-gray-800">4. معايير مخصصة</h5>
                    <p className="mt-1 text-xs text-gray-400">
                      يمكنك الجمع بين أي عدد من المعايير في نفس التصدير
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={resetExportFilters}
                    className="inline-flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-3 py-2 text-xs font-bold text-gray-600 transition hover:bg-gray-50"
                  >
                    <i className="pi pi-refresh" />
                    مسح المعايير
                  </button>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="mb-1.5 block text-xs font-bold text-gray-600">
                      بحث حر
                    </label>
                    <div className="relative">
                      <i className="pi pi-search absolute right-4 top-1/2 -translate-y-1/2 text-gray-400" />
                      <input
                        value={exportSearch}
                        onChange={(e) => setExportSearch(e.target.value)}
                        placeholder="اسم الطالب، المؤسسة، المستوى، السنة..."
                        className="h-11 w-full rounded-xl border border-gray-200 bg-gray-50 pr-11 pl-4 text-sm outline-none focus:border-indigo-300 focus:bg-white focus:ring-4 focus:ring-indigo-500/10"
                      />
                    </div>
                  </div>

                  <div className="grid gap-4 md:grid-cols-2">
                    <MultiSelect
                      label="السنة الدراسية"
                      value={exportYears}
                      options={exportYearOptions(anneesDisponibles)}
                      placeholder="كل السنوات"
                      onChange={setExportYears}
                      display="chip"
                      appendTo="body"
                    />

                    <MultiSelect
                      label="المرحلة الدراسية"
                      value={exportCycles}
                      options={exportCycleOptions}
                      placeholder="كل المراحل"
                      onChange={setExportCycles}
                      display="chip"
                      appendTo="body"
                    />

                    <MultiSelect
                      label="المؤسسة"
                      value={exportEcoles}
                      options={ecolesOptions}
                      placeholder="كل المؤسسات"
                      onChange={setExportEcoles}
                      display="chip"
                      appendTo="body"
                    />

                    <MultiSelect
                      label="المستوى"
                      value={exportNiveaux}
                      options={niveauxOptions}
                      placeholder="كل المستويات"
                      onChange={setExportNiveaux}
                      display="chip"
                      appendTo="body"
                    />
                  </div>

                  <div className="grid gap-4 md:grid-cols-2">
                    <div>
                      <label className="mb-1.5 block text-xs font-bold text-gray-600">
                        الاستفادة من الدعم
                      </label>
                      <select
                        value={exportSupportFilter}
                        onChange={(e) =>
                          setExportSupportFilter(
                            e.target.value as ExportSupportFilter
                          )
                        }
                        className="h-11 w-full rounded-xl border border-gray-200 bg-gray-50 px-3 text-sm outline-none focus:border-indigo-300 focus:bg-white"
                      >
                        <option value="all">الكل</option>
                        <option value="with">المستفيدون فقط</option>
                        <option value="without">غير المستفيدين فقط</option>
                      </select>
                    </div>

                    <div>
                      <label className="mb-1.5 block text-xs font-bold text-gray-600">
                        حالة الأداء
                      </label>
                      <select
                        value={exportPaymentFilter}
                        onChange={(e) =>
                          setExportPaymentFilter(
                            e.target.value as ExportPaymentFilter
                          )
                        }
                        className="h-11 w-full rounded-xl border border-gray-200 bg-gray-50 px-3 text-sm outline-none focus:border-indigo-300 focus:bg-white"
                      >
                        <option value="all">الكل</option>
                        <option value="paid">مؤدى بالكامل</option>
                        <option value="partial">مؤدى جزئيا</option>
                        <option value="external">تكفل به الغير</option>
                      </select>
                    </div>
                  </div>

                  <div className="grid gap-4 md:grid-cols-3">
                    <div className="rounded-2xl border border-emerald-100 bg-emerald-50/50 p-4">
                      <p className="mb-3 text-xs font-black text-emerald-700">
                        مبلغ الدعم المستهلك
                      </p>
                      <div className="grid grid-cols-2 gap-2">
                        <input
                          type="number"
                          min="0"
                          value={exportMinConsomme}
                          onChange={(e) => setExportMinConsomme(e.target.value)}
                          placeholder="من"
                          className="h-10 min-w-0 rounded-xl border border-emerald-100 bg-white px-3 text-sm outline-none"
                        />
                        <input
                          type="number"
                          min="0"
                          value={exportMaxConsomme}
                          onChange={(e) => setExportMaxConsomme(e.target.value)}
                          placeholder="إلى"
                          className="h-10 min-w-0 rounded-xl border border-emerald-100 bg-white px-3 text-sm outline-none"
                        />
                      </div>
                    </div>

                    <div className="rounded-2xl border border-violet-100 bg-violet-50/50 p-4">
                      <p className="mb-3 text-xs font-black text-violet-700">
                        المبلغ المؤدى من طرفنا
                      </p>
                      <div className="grid grid-cols-2 gap-2">
                        <input
                          type="number"
                          min="0"
                          value={exportMinPaye}
                          onChange={(e) => setExportMinPaye(e.target.value)}
                          placeholder="من"
                          className="h-10 min-w-0 rounded-xl border border-violet-100 bg-white px-3 text-sm outline-none"
                        />
                        <input
                          type="number"
                          min="0"
                          value={exportMaxPaye}
                          onChange={(e) => setExportMaxPaye(e.target.value)}
                          placeholder="إلى"
                          className="h-10 min-w-0 rounded-xl border border-violet-100 bg-white px-3 text-sm outline-none"
                        />
                      </div>
                    </div>

                    <div className="rounded-2xl border border-amber-100 bg-amber-50/50 p-4">
                      <p className="mb-3 text-xs font-black text-amber-700">
                        النقطة
                      </p>
                      <div className="grid grid-cols-2 gap-2">
                        <input
                          type="number"
                          min="0"
                          value={exportMinNote}
                          onChange={(e) => setExportMinNote(e.target.value)}
                          placeholder="من"
                          className="h-10 min-w-0 rounded-xl border border-amber-100 bg-white px-3 text-sm outline-none"
                        />
                        <input
                          type="number"
                          min="0"
                          value={exportMaxNote}
                          onChange={(e) => setExportMaxNote(e.target.value)}
                          placeholder="إلى"
                          className="h-10 min-w-0 rounded-xl border border-amber-100 bg-white px-3 text-sm outline-none"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </section>
            </div>

            {/* PREVIEW / SUMMARY */}
            <aside className="space-y-4 lg:sticky lg:top-28 lg:self-start">
              <div className="overflow-hidden rounded-3xl border border-indigo-100 bg-white shadow-sm">
                <div className="bg-gradient-to-br from-indigo-600 to-violet-600 p-5 text-white">
                  <p className="text-xs font-bold text-indigo-100">معاينة التصدير</p>
                  <div className="mt-2 flex items-end justify-between gap-3">
                    <div>
                      <p className="text-4xl font-black">
                        {exportFilteredData.length}
                      </p>
                      <p className="text-xs text-indigo-100">سجل مطابق</p>
                    </div>

                    <div className="rounded-2xl bg-white/15 px-3 py-2 text-center backdrop-blur">
                      <i
                        className={`pi ${
                          exportFormat === "pdf"
                            ? "pi-file-pdf"
                            : "pi-file-excel"
                        } text-xl`}
                      />
                      <p className="mt-1 text-[10px] font-bold uppercase">
                        {exportFormat}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="space-y-3 p-5">
                  <div className="flex items-center justify-between rounded-xl bg-emerald-50 px-3 py-2.5">
                    <span className="text-xs font-semibold text-gray-500">
                      الدعم المستهلك
                    </span>
                    <strong className="text-sm text-emerald-700">
                      {fmtMoney(exportStats.totalConsomme)}
                    </strong>
                  </div>

                  <div className="flex items-center justify-between rounded-xl bg-violet-50 px-3 py-2.5">
                    <span className="text-xs font-semibold text-gray-500">
                      المؤدى من طرفنا
                    </span>
                    <strong className="text-sm text-violet-700">
                      {fmtMoney(exportStats.totalPaye)}
                    </strong>
                  </div>

                  <div className="flex items-center justify-between rounded-xl bg-amber-50 px-3 py-2.5">
                    <span className="text-xs font-semibold text-gray-500">
                      تكفل به الغير
                    </span>
                    <strong className="text-sm text-amber-700">
                      {fmtMoney(exportStats.totalAutre)}
                    </strong>
                  </div>

                  <div className="flex items-center justify-between rounded-xl bg-cyan-50 px-3 py-2.5">
                    <span className="text-xs font-semibold text-gray-500">
                      المستفيدون
                    </span>
                    <strong className="text-sm text-cyan-700">
                      {exportStats.beneficiaires}
                    </strong>
                  </div>
                </div>
              </div>

              <div className="rounded-3xl border border-gray-200 bg-white p-5 shadow-sm">
                <div className="mb-3 flex items-center justify-between">
                  <p className="text-sm font-black text-gray-800">المعايير النشطة</p>
                  <span className="rounded-full bg-gray-100 px-2.5 py-1 text-[10px] font-bold text-gray-500">
                    {exportCriteriaLabels.length}
                  </span>
                </div>

                {exportCriteriaLabels.length > 0 ? (
                  <div className="flex flex-wrap gap-2">
                    {exportCriteriaLabels.map((label, index) => (
                      <span
                        key={`${label}-${index}`}
                        className="rounded-lg border border-indigo-100 bg-indigo-50 px-2.5 py-1.5 text-[11px] font-semibold text-indigo-700"
                      >
                        {label}
                      </span>
                    ))}
                  </div>
                ) : (
                  <p className="rounded-xl bg-gray-50 p-3 text-xs text-gray-400">
                    لا توجد معايير إضافية. سيتم استعمال النطاق المحدد فقط.
                  </p>
                )}
              </div>

              <div className="rounded-3xl border border-gray-200 bg-white p-5 shadow-sm">
                <p className="mb-3 text-sm font-black text-gray-800">
                  الحقول المختارة
                </p>

                <div className="flex flex-wrap gap-2">
                  {selectedFields.length > 0 ? (
                    selectedFields.map((field) => (
                      <span
                        key={field}
                        className="rounded-lg bg-gray-100 px-2.5 py-1.5 text-[11px] font-semibold text-gray-600"
                      >
                        {exportableFields.find((item) => item.value === field)?.text || field}
                      </span>
                    ))
                  ) : (
                    <span className="text-xs font-semibold text-red-500">
                      اختر حقلا واحدا على الأقل
                    </span>
                  )}
                </div>
              </div>

              <button
                type="button"
                onClick={handleExport}
                disabled={
                  exportFilteredData.length === 0 ||
                  selectedFields.length === 0
                }
                className={`flex h-12 w-full items-center justify-center gap-2 rounded-2xl font-black text-white shadow-lg transition ${
                  exportFormat === "pdf"
                    ? "bg-gradient-to-l from-rose-600 to-red-500 shadow-rose-200 hover:-translate-y-0.5"
                    : "bg-gradient-to-l from-emerald-600 to-teal-500 shadow-emerald-200 hover:-translate-y-0.5"
                } disabled:cursor-not-allowed disabled:opacity-40 disabled:shadow-none`}
              >
                <i
                  className={`pi ${
                    exportFormat === "pdf"
                      ? "pi-file-pdf"
                      : "pi-file-excel"
                  }`}
                />

                {exportFormat === "pdf"
                  ? "إنشاء تقرير PDF"
                  : "تحميل ملف Excel"}
              </button>

              <p className="px-2 text-center text-[10px] leading-5 text-gray-400">
                PDF يفتح معاينة الطباعة ويمكن حفظه مباشرة بصيغة PDF.
                Excel ينشئ ملفا يتضمن ورقة ملخص وورقة بيانات.
              </p>
            </aside>
          </div>
        </div>
      </Modal>

    </div>
  );
}