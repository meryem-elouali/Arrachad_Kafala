import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { Tone, kpis, openReport, table } from "../../lib/report";
import ExcelJS from "exceljs";

import MultiSelect from "../../components/form/MultiSelect";
import { Modal } from "../../components/ui/modal";

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
  enfant?: { id?: number | string; nom?: string; prenom?: string };
  ecole?: { id?: number | string; nom?: string };
  niveauScolaire?: { id?: number | string; nom?: string };
  nomEnfant: string;
  prenomEnfant: string;
  nomEcole: string;
  niveauNom: string;
  cycle?: CycleScolaire;
  cycleLabel?: string;
  noteAffichee?: string;
  [key: string]: any;
};

type Option = { text: string; value: string };

type SoutienStat = {
  enfantId: number;
  totalConsomme: number;
  totalPaye: number;
  totalAutre: number;
  nombrePaiements: number;
};

type DegreCategorie = "DEFINI" | "NON_DEFINI" | "INCONNU";

type DegreInfo = {
  categorie: DegreCategorie;
  degre: number | null;
  /** Catégorie de la famille : أيتام، معوز، لطيم… */
  typeNom?: string | null;
};

/** Catégorie affichée par défaut dans le suivi des études. */
const CATEGORIE_PAR_DEFAUT = "أيتام";
const CATEGORIE_STORAGE_KEY = "suivi_etudes_categorie";

const loadCategorie = () => {
  try {
    const v = localStorage.getItem(CATEGORIE_STORAGE_KEY);
    return v === null ? CATEGORIE_PAR_DEFAUT : v;
  } catch {
    return CATEGORIE_PAR_DEFAUT;
  }
};

type SortState = { key: string; dir: 1 | -1 };

type ExportScope = "current" | "page" | "all";
type ExportSupportFilter = "all" | "with" | "without";
type ExportPaymentFilter = "all" | "paid" | "partial" | "external";

type ExportDegreFilter =
  | "all"
  | "defined"
  | "degree1"
  | "degree2"
  | "degree3"
  | "undefined"
  | "unknown";

type ExportOrientation = "landscape" | "portrait";

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

const EMPTY_SOUTIEN = (id: number): SoutienStat => ({
  enfantId: id,
  totalConsomme: 0,
  totalPaye: 0,
  totalAutre: 0,
  nombrePaiements: 0,
});

const buildConsoMap = (data: any): Record<string, SoutienStat> => {
  const map: Record<string, SoutienStat> = {};
  (Array.isArray(data) ? data : []).forEach((item: any) => {
    const enfantId = Number(item.enfantId);
    if (!Number.isFinite(enfantId)) return;
    const totalConsomme = Number(item.totalConsomme ?? item.total ?? 0);
    const totalPaye = Number(item.totalPaye ?? 0);
    map[String(enfantId)] = {
      enfantId,
      totalConsomme,
      totalPaye,
      totalAutre: Number(
        item.totalAutre ?? Math.max(totalConsomme - totalPaye, 0)
      ),
      nombrePaiements: Number(item.nombrePaiements || 0),
    };
  });
  return map;
};

// ============================================================
// CONFIGURATION DES CYCLES
// ============================================================

const NOTE_CONFIG: Record<
  CycleScolaire,
  { label: string; shortLabel: string; max: number; seuilReussite: number }
> = {
  prescolaire: { label: "التعليم الأولي", shortLabel: "الأولي", max: 10, seuilReussite: 5 },
  primaire: { label: "التعليم الابتدائي", shortLabel: "الابتدائي", max: 10, seuilReussite: 5 },
  college: { label: "التعليم الإعدادي", shortLabel: "الإعدادي", max: 20, seuilReussite: 10 },
  lycee: { label: "التعليم الثانوي التأهيلي", shortLabel: "الثانوي", max: 20, seuilReussite: 10 },
  universite: { label: "التعليم الجامعي", shortLabel: "الجامعي", max: 20, seuilReussite: 10 },
  inconnu: { label: "غير محدد", shortLabel: "غير محدد", max: 20, seuilReussite: 10 },
};

// ============================================================
// EXPORT : CHAMPS
// ============================================================

const exportableFields: Option[] = [
  { text: "الاسم الكامل", value: "nomEnfant" },
  { text: "المرحلة الدراسية", value: "cycleLabel" },
  { text: "المستوى", value: "niveauNom" },
  { text: "المؤسسة", value: "nomEcole" },
  { text: "السنة الدراسية", value: "anneeScolaire" },
  { text: "النقطة", value: "noteAffichee" },
  { text: "فئة الدرجة", value: "categorieDegre" },
  { text: "الدرجة", value: "degreFamilleAffiche" },
  { text: "مبلغ الدعم المستهلك", value: "montantSoutienConsomme" },
  { text: "المبلغ المؤدى من طرفنا", value: "montantSoutienPaye" },
  { text: "المبلغ المؤدى من طرف الغير", value: "montantSoutienAutre" },
  { text: "عدد دفعات الدعم", value: "nombrePaiementsSoutien" },
];

const exportCycleOptions: Option[] = [
  { text: "التعليم الأولي", value: "prescolaire" },
  { text: "التعليم الابتدائي", value: "primaire" },
  { text: "التعليم الإعدادي", value: "college" },
  { text: "التعليم الثانوي التأهيلي", value: "lycee" },
  { text: "التعليم الجامعي", value: "universite" },
];

// ============================================================
// HELPERS
// ============================================================

const isNonEmptyString = (value: unknown): value is string =>
  typeof value === "string" && value.trim() !== "";

const colLetter = (n: number) => {
  let s = "";
  while (n > 0) {
    const m = (n - 1) % 26;
    s = String.fromCharCode(65 + m) + s;
    n = Math.floor((n - 1) / 26);
  }
  return s;
};

// ============================================================
// DÉTECTION DU CYCLE
// ============================================================

const getCycleScolaire = (niveau?: string): CycleScolaire => {
  const n = String(niveau ?? "").trim().toLowerCase();

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

  // université avant lycée pour éviter "باك + 1" => lycée
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
// ANNÉES SCOLAIRES
// ============================================================

const getCurrentSchoolYear = () => {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth() + 1;
  return month >= 9 ? `${year}/${year + 1}` : `${year - 1}/${year}`;
};

const normalizeSchoolYear = (value?: string) => {
  const text = String(value ?? "").trim();
  const match = text.match(/(\d{4})\D+(\d{2,4})/);
  if (!match) return text;

  const first = Number(match[1]);
  let second = Number(match[2]);
  if (match[2].length === 2) {
    second = Math.floor(first / 100) * 100 + second;
  }
  return `${first}/${second}`;
};

// ============================================================
// NOTE
// ============================================================
const getNoteValue = (row: EtudeRow): number | null => {
  const raw = row.noteGenerale;

  if (raw === null || raw === undefined || raw === "") {
    return null;
  }

  const value = Number(raw);

  return Number.isFinite(value) ? value : null;
};
// ============================================================
// PDF (impression navigateur)
// ============================================================

const toneOf = (color: string): Tone => {
  const c = (color || "").toLowerCase();
  if (c.includes("ecfdf5") || c.includes("d1fae5") || c.includes("f0fdf4") || c.includes("dcfce7")) return "green";
  if (c.includes("fffbeb") || c.includes("fef3c7") || c.includes("fff7ed")) return "amber";
  if (c.includes("fef2f2") || c.includes("fee2e2")) return "red";
  if (c.includes("f5f3ff") || c.includes("ede9fe")) return "violet";
  if (c.includes("ecfeff") || c.includes("cffafe")) return "cyan";
  if (c.includes("eff6ff") || c.includes("eef2ff") || c.includes("dbeafe") || c.includes("e0e7ff")) return "blue";
  return "slate";
};

/* PDF (impression) : moteur commun lib/report */
const printPdf = (
  title: string,
  headers: string[],
  rows: any[][],
  info: string[],
  orientation: ExportOrientation = "landscape",
  cards: { label: string; value: string; color: string }[] = []
) => {
  openReport({
    kind: "التتبع الدراسي",
    title,
    chips: info,
    body:
      kpis(cards.map((c) => ({ label: c.label, value: c.value, tone: toneOf(c.color) }))) +
      table(
        headers.map((h) => ({ label: h })),
        rows.map((r) => r.map((v) => (v === null || v === undefined ? "" : String(v)))),
        { numbered: true }
      ),
    settings: { orientation },
  });
};

// ============================================================
// COMPONENT
// ============================================================

export default function EtudesTable() {
  const navigate = useNavigate();

  // ---------- DATA ----------
  const [etudes, setEtudes] = useState<EtudeRow[]>([]);
  const [loading, setLoading] = useState(true);

  // ---------- SOUTIEN ----------
  const [conso, setConso] = useState<Record<string, SoutienStat>>({});
  const [consoLoading, setConsoLoading] = useState(false);

  // ---------- DEGRÉ DE FAMILLE ----------
  //
  // Pour chaque enfant :
  // - DEFINI     => famille avec degré 1 / 2 / 3
  // - NON_DEFINI => famille sans degré => معوز
  // - INCONNU    => famille introuvable
  //
  const [degresEnfants, setDegresEnfants] =
    useState<Record<string, DegreInfo>>({});

  const [degresLoading, setDegresLoading] =
    useState(false);

  // ---------- FILTRES ----------
  const [year, setYear] = useState("");
  const [anneesDisponibles, setAnneesDisponibles] = useState<string[]>([]);
  const [search, setSearch] = useState("");
  const [niveauFilter, setNiveauFilter] = useState("");
  const [ecoleFilter, setEcoleFilter] = useState("");
  const [cycleFilter, setCycleFilter] = useState<CycleScolaire | "">("");
  // "" = toutes les catégories
  const [categorieFilter, setCategorieFilter] = useState<string>(loadCategorie);

  useEffect(() => {
    try {
      localStorage.setItem(CATEGORIE_STORAGE_KEY, categorieFilter);
    } catch {
      /* ignoré */
    }
  }, [categorieFilter]);

  // ---------- TRI / PAGINATION ----------
  const [sort, setSort] = useState<SortState>({ key: "nomEnfant", dir: 1 });
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);

  // ---------- EXPORT ----------
  const [exportDialogVisible, setExportDialogVisible] = useState(false);
  const [exportFormat, setExportFormat] = useState<"pdf" | "excel">("pdf");
  const [selectedFields, setSelectedFields] = useState<string[]>(
    exportableFields.map((field) => field.value)
  );
  const [exportScope, setExportScope] = useState<ExportScope>("current");
  const [exportSearch, setExportSearch] = useState("");
  const [exportYear, setExportYear] = useState<string>("all");
  const [exportConso, setExportConso] = useState<Record<string, SoutienStat>>({});
  const [exportConsoLoading, setExportConsoLoading] = useState(false);
  const [exportCycles, setExportCycles] = useState<string[]>([]);
  const [exportNiveaux, setExportNiveaux] = useState<string[]>([]);
  const [exportEcoles, setExportEcoles] = useState<string[]>([]);
  const [exportSupportFilter, setExportSupportFilter] = useState<ExportSupportFilter>("all");
  const [exportPaymentFilter, setExportPaymentFilter] = useState<ExportPaymentFilter>("all");

  // Filtre de degré utilisé dans le formulaire d'export PDF / Excel.
  const [exportDegreFilter, setExportDegreFilter] =
    useState<ExportDegreFilter>("all");

  const [exportMinConsomme, setExportMinConsomme] = useState("");
  const [exportMaxConsomme, setExportMaxConsomme] = useState("");
  const [exportMinPaye, setExportMinPaye] = useState("");
  const [exportMaxPaye, setExportMaxPaye] = useState("");
  const [exportMinNote, setExportMinNote] = useState("");
  const [exportMaxNote, setExportMaxNote] = useState("");
  const [exportOrientation, setExportOrientation] = useState<ExportOrientation>("landscape");
  const [exportTitle, setExportTitle] = useState("التتبع الدراسي للأبناء");
  const [exportFileName, setExportFileName] = useState("suivi_etudes");

  // =========================================================
  // ANNÉES SCOLAIRES EXISTANTES
  // =========================================================

  useEffect(() => {
    axios
      .get(`${API}/etudes/annees`)
      .then((res) => {
        const data = Array.isArray(res.data) ? res.data : [];

        const annees: string[] = data
          .filter((a: any) => typeof a === "string" && a.trim() !== "")
          .sort((a: string, b: string) => {
            const ya = Number(normalizeSchoolYear(a).split("/")[0]) || 0;
            const yb = Number(normalizeSchoolYear(b).split("/")[0]) || 0;
            return yb - ya;
          });

        setAnneesDisponibles(annees);

        const current = normalizeSchoolYear(getCurrentSchoolYear());
        const currentExists = annees.find(
          (a) => normalizeSchoolYear(a) === current
        );

        setYear(currentExists ?? annees[0] ?? "");
      })
      .catch((error) => {
        console.error("Erreur chargement années scolaires :", error);
        setAnneesDisponibles([]);
        setYear("");
      });
  }, []);

  // =========================================================
  // CHARGEMENT DES ÉTUDES
  // =========================================================

  useEffect(() => {
    setLoading(true);

    axios
      .get(`${API}/etudes/latest`)
      .then((res) => {
        const rows = Array.isArray(res.data) ? res.data : [];

        const data: EtudeRow[] = rows.map((e: any) => {
          const niveauNom = e.niveauScolaire?.nom ?? "—";
          const cycle = getCycleScolaire(niveauNom);
          const config = NOTE_CONFIG[cycle];

          const tempRow: EtudeRow = {
            ...e,
            nomEnfant: e.enfant
              ? `${e.enfant.nom ?? ""} ${e.enfant.prenom ?? ""}`.trim()
              : "—",
            prenomEnfant: e.enfant?.prenom ?? "—",
            nomEcole: e.ecole?.nom ?? "—",
            niveauNom,
            anneeScolaire: e.anneeScolaire ? String(e.anneeScolaire) : "—",
            cycle,
            cycleLabel: config.label,
          };

          const note = getNoteValue(tempRow);

          return {
            ...tempRow,
            noteAffichee:
              cycle === "universite" || cycle === "prescolaire"
                ? "—"
                : note !== null
                  ? `${note.toFixed(2)} / ${config.max}`
                  : "—",
          };
        });

        setEtudes(data);
      })
      .catch((error) => {
        console.error("Erreur chargement études :", error);
        setEtudes([]);
      })
      .finally(() => setLoading(false));
  }, []);

  // =========================================================
  // OPTIONS NIVEAUX / ÉCOLES
  // =========================================================

  const niveauxOptions = useMemo<Option[]>(() => {
    const values = Array.from(
      new Set(
        etudes
          .map((e) => e.niveauNom)
          .filter(isNonEmptyString)
          .filter((v) => v !== "—")
      )
    ).sort((a, b) => a.localeCompare(b, "ar", { numeric: true }));

    return values.map((value) => ({ text: value, value }));
  }, [etudes]);

  const ecolesOptions = useMemo<Option[]>(() => {
    const values = Array.from(
      new Set(
        etudes
          .map((e) => e.nomEcole)
          .filter(isNonEmptyString)
          .filter((v) => v !== "—")
      )
    ).sort((a, b) => a.localeCompare(b, "ar", { numeric: true }));

    return values.map((value) => ({ text: value, value }));
  }, [etudes]);

  // =========================================================
  // DEGRÉ DE FAMILLE DES ENFANTS
  // =========================================================
  //
  // On récupère les familles afin de savoir dans quelle caisse
  // classer les montants de soutien scolaire :
  //
  // degré 1 / 2 / 3 => الدرجات المحددة
  // degré null      => معوز
  //
  // IMPORTANT :
  // cette classification utilise le degré ACTUEL de la famille.
  // =========================================================

  useEffect(() => {
    let cancelled = false;

    setDegresLoading(true);

    axios
      .get(`${API}/famille`)
      .then((res) => {
        if (cancelled) return;

        const familles =
          Array.isArray(res.data)
            ? res.data
            : [];

        const map: Record<string, DegreInfo> = {};

        familles.forEach((famille: any) => {
          const rawDegre =
            famille?.degreFamille ??
            famille?.degre ??
            famille?.degree ??
            null;

          const degre =
            rawDegre === null ||
            rawDegre === undefined ||
            rawDegre === ""
              ? null
              : Number(rawDegre);

          const typeNom: string | null =
            famille?.typeFamille?.nom ?? null;

          const info: DegreInfo =
            degre === null
              ? {
                  categorie: "NON_DEFINI",
                  degre: null,
                  typeNom,
                }
              : {
                  categorie: "DEFINI",
                  degre: Number.isFinite(degre)
                    ? degre
                    : null,
                  typeNom,
                };

          const enfants =
            Array.isArray(famille?.enfants)
              ? famille.enfants
              : [];

          enfants.forEach((enfant: any) => {
            const enfantId =
              Number(enfant?.id);

            if (
              Number.isFinite(enfantId)
            ) {
              map[String(enfantId)] =
                info;
            }
          });
        });

        setDegresEnfants(map);
      })
      .catch((error) => {
        console.error(
          "Erreur chargement degrés familles :",
          error
        );

        if (!cancelled) {
          setDegresEnfants({});
        }
      })
      .finally(() => {
        if (!cancelled) {
          setDegresLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const getDegreInfo = (
    row: EtudeRow
  ): DegreInfo => {
    const enfantId =
      row.enfant?.id;

    if (!enfantId) {
      return {
        categorie: "INCONNU",
        degre: null,
      };
    }

    return (
      degresEnfants[
        String(enfantId)
      ] || {
        categorie: "INCONNU",
        degre: null,
      }
    );
  };

  const getDegreLabel = (
    info: DegreInfo
  ) => {
    if (
      info.categorie === "DEFINI"
    ) {
      return info.degre != null
        ? `الدرجات المحددة - الدرجة ${info.degre}`
        : "الدرجات المحددة";
    }

    if (
      info.categorie ===
      "NON_DEFINI"
    ) {
      return "معوز";
    }

    return "غير مصنف";
  };

  // =========================================================
  // CONSOMMATION SOUTIEN (année de la page)
  // =========================================================

  useEffect(() => {
    setConsoLoading(true);

    axios
      .get(`${API}/soutiens/stats/enfants`, {
        params: year === "all" || year === "" ? {} : { annee: year },
      })
      .then((res) => setConso(buildConsoMap(res.data)))
      .catch((error) => {
        console.error("Erreur consommation soutien :", error);
        setConso({});
      })
      .finally(() => setConsoLoading(false));
  }, [year]);

  // =========================================================
  // CONSOMMATION SOUTIEN (année choisie dans l'export)
  // =========================================================

  useEffect(() => {
    if (!exportDialogVisible) return;

    let cancelled = false;
    setExportConsoLoading(true);

    axios
      .get(`${API}/soutiens/stats/enfants`, {
        params: exportYear === "all" ? {} : { annee: exportYear },
      })
      .then((res) => {
        if (!cancelled) setExportConso(buildConsoMap(res.data));
      })
      .catch(() => {
        if (!cancelled) setExportConso({});
      })
      .finally(() => {
        if (!cancelled) setExportConsoLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [exportDialogVisible, exportYear]);

  const getConso = (row: EtudeRow): SoutienStat => {
    const enfantId = row.enfant?.id;
    if (!enfantId) return EMPTY_SOUTIEN(0);
    return conso[String(enfantId)] || EMPTY_SOUTIEN(Number(enfantId));
  };

  // =========================================================
  // FILTRAGE
  // =========================================================

  const filteredEtudes = useMemo(() => {
    const s = search.trim().toLowerCase();

    return etudes.filter((e) => {
      const anneeOK =
        year === "all" ||
        year === "" ||
        normalizeSchoolYear(e.anneeScolaire) === normalizeSchoolYear(year);

      const niveauOK = !niveauFilter || e.niveauNom === niveauFilter;
      const ecoleOK = !ecoleFilter || e.nomEcole === ecoleFilter;
      const cycleOK = !cycleFilter || getCycleScolaire(e.niveauNom) === cycleFilter;
      const categorieOK =
        !categorieFilter ||
        degresEnfants[String(e.enfant?.id)]?.typeNom === categorieFilter;

      const searchOK =
        !s ||
        e.nomEnfant?.toLowerCase().includes(s) ||
        e.nomEcole?.toLowerCase().includes(s) ||
        e.niveauNom?.toLowerCase().includes(s) ||
        e.anneeScolaire?.toLowerCase().includes(s);

      return anneeOK && niveauOK && ecoleOK && cycleOK && categorieOK && searchOK;
    });
  }, [etudes, year, search, niveauFilter, ecoleFilter, cycleFilter, categorieFilter, degresEnfants]);

  const categoriesOptions = useMemo(() => {
    const set = new Set<string>([CATEGORIE_PAR_DEFAUT]);
    Object.values(degresEnfants).forEach((d) => d.typeNom && set.add(d.typeNom));
    return Array.from(set);
  }, [degresEnfants]);

  // =========================================================
  // STATS
  // =========================================================

  const stats = useMemo(() => {
    const totalEcoles = new Set(
      filteredEtudes.map((e) => e.nomEcole).filter((e) => e && e !== "—")
    ).size;

    const totalNiveaux = new Set(
      filteredEtudes.map((e) => e.niveauNom).filter((e) => e && e !== "—")
    ).size;

    return {
      totalEtudiants: filteredEtudes.length,
      totalEcoles,
      totalNiveaux,
    };
  }, [filteredEtudes]);

  const statsSoutien = useMemo(() => {
    const ids = new Set(
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

    let nombreEtudiants = 0;
    // Enfants dont tout ou partie du soutien est payé par une autre personne / organisme
    let nombreAutre = 0;

    let totalConsomme = 0;
    let totalPaye = 0;
    let totalAutre = 0;

    let consommeDegreDefini = 0;
    let payeDegreDefini = 0;

    let consommeDegreNonDefini = 0;
    let payeDegreNonDefini = 0;

    let consommeNonClasse = 0;
    let payeNonClasse = 0;

    Object.values(conso).forEach(
      (item) => {
        const enfantId =
          String(item.enfantId);

        if (!ids.has(enfantId)) {
          return;
        }

        const consomme =
          Number(
            item.totalConsomme || 0
          );

        const paye =
          Number(
            item.totalPaye || 0
          );

        const autre =
          Number(
            item.totalAutre || 0
          );

        if (consomme > 0) {
          nombreEtudiants += 1;
        }

        if (autre > 0) {
          nombreAutre += 1;
        }

        totalConsomme += consomme;
        totalPaye += paye;
        totalAutre += autre;

        const info =
          degresEnfants[enfantId];

        if (
          info?.categorie ===
          "DEFINI"
        ) {
          consommeDegreDefini +=
            consomme;

          payeDegreDefini +=
            paye;

          return;
        }

        if (
          info?.categorie ===
          "NON_DEFINI"
        ) {
          consommeDegreNonDefini +=
            consomme;

          payeDegreNonDefini +=
            paye;

          return;
        }

        consommeNonClasse +=
          consomme;

        payeNonClasse +=
          paye;
      }
    );

    return {
      nombreEtudiants,
      nombreAutre,

      totalConsomme,
      totalPaye,
      totalAutre,

      consommeDegreDefini,
      payeDegreDefini,

      consommeDegreNonDefini,
      payeDegreNonDefini,

      consommeNonClasse,
      payeNonClasse,
    };
  }, [
    conso,
    filteredEtudes,
    degresEnfants,
  ]);

  const statsParCycle = useMemo(() => {
    const cycles: CycleScolaire[] = [
      "prescolaire",
      "primaire",
      "college",
      "lycee",
      "universite",
    ];

    return cycles.map((cycle) => {
      const config = NOTE_CONFIG[cycle];
      const rows = filteredEtudes.filter(
        (e) => getCycleScolaire(e.niveauNom) === cycle
      );

      const notes = rows
        .map((e) => ({ note: getNoteValue(e), row: e }))
        .filter(
          (x): x is { note: number; row: EtudeRow } =>
            x.note !== null && Number.isFinite(x.note)
        );

      const meilleure =
        notes.length > 0
          ? notes.reduce((best, cur) => (cur.note > best.note ? cur : best))
          : null;

      const plusFaible =
        notes.length > 0
          ? notes.reduce((min, cur) => (cur.note < min.note ? cur : min))
          : null;

      return {
        cycle,
        label: config.label,
        shortLabel: config.shortLabel,
        max: config.max,
        total: rows.length,
        meilleure,
        plusFaible,
      };
    });
  }, [filteredEtudes]);

  const countBy = (getKey: (e: EtudeRow) => string) => {
    const counts: Record<string, number> = {};
    filteredEtudes.forEach((e) => {
      const key = getKey(e);
      counts[key] = (counts[key] || 0) + 1;
    });
    return Object.entries(counts).sort((a, b) => b[1] - a[1]);
  };

  const statsNiveaux = useMemo(
    () => countBy((e) => e.niveauNom || "غير محدد"),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [filteredEtudes]
  );
  const statsEcoles = useMemo(
    () => countBy((e) => e.nomEcole || "غير محددة"),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [filteredEtudes]
  );

  const maxNiveau = Math.max(...statsNiveaux.map(([, c]) => c), 1);
  const maxEcole = Math.max(...statsEcoles.map(([, c]) => c), 1);

  // =========================================================
  // RESET
  // =========================================================

  const hasFilter =
    year === "all" ||
    search !== "" ||
    niveauFilter !== "" ||
    ecoleFilter !== "" ||
    cycleFilter !== "" ||
    categorieFilter !== CATEGORIE_PAR_DEFAUT;

  const resetFilters = () => {
    const current = anneesDisponibles.find(
      (a) => normalizeSchoolYear(a) === normalizeSchoolYear(getCurrentSchoolYear())
    );
    setYear(current ?? anneesDisponibles[0] ?? "all");
    setSearch("");
    setCategorieFilter(CATEGORIE_PAR_DEFAUT);
    setNiveauFilter("");
    setEcoleFilter("");
    setCycleFilter("");
  };

  // =========================================================
  // TRI
  // =========================================================

  const sortedEtudes = useMemo(() => {
    const getValue = (row: EtudeRow): string | number => {
      switch (sort.key) {
        case "total":
          return Number(conso[String(row.enfant?.id ?? "")]?.totalConsomme || 0);
        case "note":
          return getNoteValue(row) ?? -1;
        case "cycle":
          return NOTE_CONFIG[getCycleScolaire(row.niveauNom)].label;
        case "anneeScolaire":
          return normalizeSchoolYear(row.anneeScolaire);
        default:
          return row[sort.key] ?? "";
      }
    };

    return [...filteredEtudes].sort((a, b) => {
      const x = getValue(a);
      const y = getValue(b);

      if (typeof x === "number" && typeof y === "number") {
        return (x - y) * sort.dir;
      }

      return (
        String(x ?? "").localeCompare(String(y ?? ""), "ar", { numeric: true }) *
        sort.dir
      );
    });
  }, [filteredEtudes, sort, conso]);

  const toggleSort = (key: string) => {
    setSort((current) =>
      current.key === key
        ? { key, dir: current.dir === 1 ? -1 : 1 }
        : { key, dir: 1 }
    );
  };

  // =========================================================
  // PAGINATION
  // =========================================================

  useEffect(() => {
    setPage(0);
  }, [year, search, niveauFilter, ecoleFilter, cycleFilter, categorieFilter, rowsPerPage]);

  const pageCount = Math.max(1, Math.ceil(sortedEtudes.length / rowsPerPage));

  useEffect(() => {
    if (page > pageCount - 1) setPage(Math.max(0, pageCount - 1));
  }, [page, pageCount]);

  const pageRows = sortedEtudes.slice(
    page * rowsPerPage,
    (page + 1) * rowsPerPage
  );

  // =========================================================
  // EXPORT : SOURCE (indépendante de l'année de la page)
  // =========================================================

  const etudesHorsAnnee = useMemo(() => {
    const s = search.trim().toLowerCase();

    return etudes.filter((e) => {
      const cycle = getCycleScolaire(e.niveauNom);
      return (
        (!niveauFilter || e.niveauNom === niveauFilter) &&
        (!ecoleFilter || e.nomEcole === ecoleFilter) &&
        (!cycleFilter || cycle === cycleFilter) &&
        (!categorieFilter ||
          degresEnfants[String(e.enfant?.id)]?.typeNom === categorieFilter) &&
        (!s ||
          e.nomEnfant?.toLowerCase().includes(s) ||
          e.nomEcole?.toLowerCase().includes(s) ||
          e.niveauNom?.toLowerCase().includes(s) ||
          e.anneeScolaire?.toLowerCase().includes(s))
      );
    });
  }, [etudes, search, niveauFilter, ecoleFilter, cycleFilter, categorieFilter, degresEnfants]);

  const exportSourceRows = useMemo(() => {
    if (exportScope === "page") return pageRows;
    if (exportScope === "all") return etudes;
    return etudesHorsAnnee;
  }, [exportScope, pageRows, etudes, etudesHorsAnnee]);

  const exportFilteredData = useMemo(() => {
    const query = exportSearch.trim().toLowerCase();
    const num = (v: string) => (v === "" ? null : Number(v));

    const minConsomme = num(exportMinConsomme);
    const maxConsomme = num(exportMaxConsomme);
    const minPaye = num(exportMinPaye);
    const maxPaye = num(exportMaxPaye);
    const minNote = num(exportMinNote);
    const maxNote = num(exportMaxNote);

    return exportSourceRows
      .map((row) => {
        const soutien =
          exportConso[String(row.enfant?.id ?? "")] ||
          EMPTY_SOUTIEN(Number(row.enfant?.id ?? 0));

        const note = getNoteValue(row);
        const cycle = getCycleScolaire(row.niveauNom);

        const degreInfo =
          getDegreInfo(row);

        return {
          ...row,
          cycle,
          cycleLabel: NOTE_CONFIG[cycle].label,
          noteNumerique: note,

          categorieDegre:
            getDegreLabel(
              degreInfo
            ),

          degreFamilleAffiche:
            degreInfo.categorie ===
            "DEFINI"
              ? degreInfo.degre ?? "—"
              : degreInfo.categorie ===
                "NON_DEFINI"
                ? "معوز"
                : "—",

          montantSoutienConsommeNombre: Number(soutien.totalConsomme || 0),
          montantSoutienPayeNombre: Number(soutien.totalPaye || 0),
          montantSoutienAutreNombre: Number(soutien.totalAutre || 0),
          montantSoutienConsomme: fmtMoney(soutien.totalConsomme),
          montantSoutienPaye: fmtMoney(soutien.totalPaye),
          montantSoutienAutre: fmtMoney(soutien.totalAutre),
          nombrePaiementsSoutien: Number(soutien.nombrePaiements || 0),
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
            row.categorieDegre,
            row.degreFamilleAffiche,
          ]
            .join(" ")
            .toLowerCase()
            .includes(query)
        ) {
          return false;
        }

        if (
          exportYear !== "all" &&
          normalizeSchoolYear(row.anneeScolaire) !== normalizeSchoolYear(exportYear)
        ) {
          return false;
        }

        if (exportCycles.length > 0 && !exportCycles.includes(String(row.cycle ?? ""))) return false;
        if (exportNiveaux.length > 0 && !exportNiveaux.includes(String(row.niveauNom ?? ""))) return false;
        if (exportEcoles.length > 0 && !exportEcoles.includes(String(row.nomEcole ?? ""))) return false;

        const consomme = row.montantSoutienConsommeNombre;
        const paye = row.montantSoutienPayeNombre;
        const autre = row.montantSoutienAutreNombre;

        if (exportSupportFilter === "with" && consomme <= 0) return false;
        if (exportSupportFilter === "without" && consomme > 0) return false;

        if (exportPaymentFilter === "paid" && !(consomme > 0 && paye >= consomme)) return false;
        if (exportPaymentFilter === "partial" && !(paye > 0 && paye < consomme)) return false;
        if (exportPaymentFilter === "external" && !(autre > 0)) return false;

        // =====================================================
        // FILTRE DEGRE POUR L'EXPORT
        // =====================================================
        //
        // defined   => tous les degrés définis
        // degree1   => degré 1 uniquement
        // degree2   => degré 2 uniquement
        // degree3   => degré 3 uniquement
        // undefined => famille sans degré (معوز)
        // unknown   => famille introuvable / non classée
        // =====================================================

        if (exportDegreFilter !== "all") {
          const categorieDegre =
            String(
              row.categorieDegre ?? ""
            );

          const degreFamille =
            row.degreFamilleAffiche;

          if (
            exportDegreFilter === "defined" &&
            !categorieDegre.startsWith(
              "الدرجات المحددة"
            )
          ) {
            return false;
          }

          if (
            exportDegreFilter === "degree1" &&
            !(
              categorieDegre.startsWith(
                "الدرجات المحددة"
              ) &&
              Number(degreFamille) === 1
            )
          ) {
            return false;
          }

          if (
            exportDegreFilter === "degree2" &&
            !(
              categorieDegre.startsWith(
                "الدرجات المحددة"
              ) &&
              Number(degreFamille) === 2
            )
          ) {
            return false;
          }

          if (
            exportDegreFilter === "degree3" &&
            !(
              categorieDegre.startsWith(
                "الدرجات المحددة"
              ) &&
              Number(degreFamille) === 3
            )
          ) {
            return false;
          }

          if (
            exportDegreFilter === "undefined" &&
            !categorieDegre.includes("معوز")
          ) {
            return false;
          }

          if (
            exportDegreFilter === "unknown" &&
            categorieDegre !== "غير مصنف"
          ) {
            return false;
          }
        }

        if (minConsomme !== null && Number.isFinite(minConsomme) && consomme < minConsomme) return false;
        if (maxConsomme !== null && Number.isFinite(maxConsomme) && consomme > maxConsomme) return false;
        if (minPaye !== null && Number.isFinite(minPaye) && paye < minPaye) return false;
        if (maxPaye !== null && Number.isFinite(maxPaye) && paye > maxPaye) return false;

        if (minNote !== null && Number.isFinite(minNote)) {
          if (row.noteNumerique === null || Number(row.noteNumerique) < minNote) return false;
        }
        if (maxNote !== null && Number.isFinite(maxNote)) {
          if (row.noteNumerique === null || Number(row.noteNumerique) > maxNote) return false;
        }

        return true;
      });
  }, [
    exportSourceRows,
    exportConso,
    exportSearch,
    exportYear,
    exportCycles,
    exportNiveaux,
    exportEcoles,
    exportSupportFilter,
    exportPaymentFilter,
    exportDegreFilter,
    exportMinConsomme,
    exportMaxConsomme,
    exportMinPaye,
    exportMaxPaye,
    exportMinNote,
    exportMaxNote,
    degresEnfants,
  ]);

  const exportStats = useMemo(
    () =>
      exportFilteredData.reduce(
        (acc: any, row: any) => {
          const consomme =
            Number(
              row.montantSoutienConsommeNombre ||
              0
            );

          const paye =
            Number(
              row.montantSoutienPayeNombre ||
              0
            );

          acc.totalConsomme += consomme;
          acc.totalPaye += paye;
          acc.totalAutre +=
            Number(
              row.montantSoutienAutreNombre ||
              0
            );

          if (consomme > 0) {
            acc.beneficiaires += 1;
          }

          if (
            String(
              row.categorieDegre
            ).startsWith(
              "الدرجات المحددة"
            )
          ) {
            acc.consommeDegreDefini +=
              consomme;

            acc.payeDegreDefini +=
              paye;
          } else if (
            String(
              row.categorieDegre
            ).includes("معوز")
          ) {
            acc.consommeDegreNonDefini +=
              consomme;

            acc.payeDegreNonDefini +=
              paye;
          } else {
            acc.consommeNonClasse +=
              consomme;

            acc.payeNonClasse +=
              paye;
          }

          return acc;
        },
        {
          totalConsomme: 0,
          totalPaye: 0,
          totalAutre: 0,
          beneficiaires: 0,

          consommeDegreDefini: 0,
          payeDegreDefini: 0,

          consommeDegreNonDefini: 0,
          payeDegreNonDefini: 0,

          consommeNonClasse: 0,
          payeNonClasse: 0,
        }
      ),
    [exportFilteredData]
  );

  const exportCriteriaLabels = useMemo(() => {
    const labels: string[] = [];

    labels.push(
      `السنة الدراسية: ${exportYear === "all" ? "كل السنوات" : exportYear}`
    );

    if (exportSearch.trim()) labels.push(`بحث: ${exportSearch.trim()}`);

    if (exportCycles.length > 0) {
      labels.push(
        `المراحل: ${exportCycles
          .map((c) => NOTE_CONFIG[c as CycleScolaire]?.label || c)
          .join("، ")}`
      );
    }
    if (exportNiveaux.length > 0) labels.push(`المستويات: ${exportNiveaux.join("، ")}`);
    if (exportEcoles.length > 0) labels.push(`المؤسسات: ${exportEcoles.join("، ")}`);

    if (exportSupportFilter === "with") labels.push("الدعم: مستفيدون فقط");
    if (exportSupportFilter === "without") labels.push("الدعم: غير مستفيدين فقط");

    if (exportPaymentFilter === "paid") labels.push("الأداء: مؤدى بالكامل");
    if (exportPaymentFilter === "partial") labels.push("الأداء: مؤدى جزئيا");
    if (exportPaymentFilter === "external") labels.push("الأداء: تكفل به الغير");

    if (exportDegreFilter === "defined") {
      labels.push("الدرجة: الدرجات المحددة");
    }

    if (exportDegreFilter === "degree1") {
      labels.push("الدرجة: الدرجة 1");
    }

    if (exportDegreFilter === "degree2") {
      labels.push("الدرجة: الدرجة 2");
    }

    if (exportDegreFilter === "degree3") {
      labels.push("الدرجة: الدرجة 3");
    }

    if (exportDegreFilter === "undefined") {
      labels.push("الدرجة: معوز");
    }

    if (exportDegreFilter === "unknown") {
      labels.push("الدرجة: غير مصنف");
    }

    if (exportMinConsomme !== "" || exportMaxConsomme !== "") {
      labels.push(`المستهلك: ${exportMinConsomme || "0"} - ${exportMaxConsomme || "∞"} DH`);
    }
    if (exportMinPaye !== "" || exportMaxPaye !== "") {
      labels.push(`المؤدى: ${exportMinPaye || "0"} - ${exportMaxPaye || "∞"} DH`);
    }
    if (exportMinNote !== "" || exportMaxNote !== "") {
      labels.push(`النقطة: ${exportMinNote || "0"} - ${exportMaxNote || "∞"}`);
    }

    return labels;
  }, [
    exportYear,
    exportSearch,
    exportCycles,
    exportNiveaux,
    exportEcoles,
    exportSupportFilter,
    exportPaymentFilter,
    exportDegreFilter,
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
    setExportYear("all");
    setExportCycles([]);
    setExportNiveaux([]);
    setExportEcoles([]);
    setExportSupportFilter("all");
    setExportPaymentFilter("all");
    setExportDegreFilter("all");
    setExportMinConsomme("");
    setExportMaxConsomme("");
    setExportMinPaye("");
    setExportMaxPaye("");
    setExportMinNote("");
    setExportMaxNote("");
  };

  // =========================================================
  // EXPORT EXCEL (ExcelJS, mis en forme)
  // =========================================================

  const exportExcel = async (
    data: any[],
    fields: string[],
    summary: string[],
    fileName: string
  ) => {
    const labels = fields.map(
      (f) => exportableFields.find((x) => x.value === f)?.text || f
    );
    const all = ["#", ...labels];
    const lastCol = colLetter(all.length);

    const wb = new ExcelJS.Workbook();
    const ws = wb.addWorksheet("التتبع الدراسي", {
      views: [{ rightToLeft: true, state: "frozen", ySplit: 4 }],
      pageSetup: { orientation: "landscape", fitToPage: true, fitToWidth: 1, fitToHeight: 0 },
    });

    const thin = { style: "thin" as const, color: { argb: "FFD1D5DB" } };
    const border = { top: thin, left: thin, bottom: thin, right: thin };
    ws.columns = all.map((_, i) => ({ width: i === 0 ? 6 : 22 }));

    ws.mergeCells(`A1:${lastCol}1`);
    const t = ws.getCell("A1");
    t.value = exportTitle || "التتبع الدراسي للأبناء";
    t.font = { name: "Arial", size: 16, bold: true, color: { argb: "FFFFFFFF" } };
    t.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF1E3A8A" } };
    t.alignment = { horizontal: "center", vertical: "middle" };
    ws.getRow(1).height = 34;

    ws.mergeCells(`A2:${lastCol}2`);
    const info = ws.getCell("A2");
    info.value = summary.slice(0, 6).join("   |   ");
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

    data.forEach((row, i) => {
      const r = ws.addRow([i + 1, ...fields.map((f) => row[f] ?? "")]);
      r.height = 22;
      const zebra = i % 2 === 0 ? "FFFFFFFF" : "FFF9FAFB";
      r.eachCell({ includeEmpty: true }, (c, n) => {
        if (n > all.length) return;
        c.font = { name: "Arial", size: 11 };
        c.border = border;
        c.fill = { type: "pattern", pattern: "solid", fgColor: { argb: zebra } };
        c.alignment = { horizontal: "center", vertical: "middle", wrapText: true };
      });
    });

    const tr = ws.addRow([]);
    ws.mergeCells(`A${tr.number}:${lastCol}${tr.number}`);
    tr.height = 26;
    const tc = tr.getCell(1);
    tc.value =
      `الدرجات المحددة — المستهلك: ${fmtMoney(
        exportStats.consommeDegreDefini
      )} | المؤدى: ${fmtMoney(
        exportStats.payeDegreDefini
      )}   ||   معوز — المستهلك: ${fmtMoney(
        exportStats.consommeDegreNonDefini
      )} | المؤدى: ${fmtMoney(
        exportStats.payeDegreNonDefini
      )}`;
    tc.font = { name: "Arial", size: 11, bold: true, color: { argb: "FF065F46" } };
    tc.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFD1FAE5" } };
    tc.alignment = { horizontal: "center", vertical: "middle" };

    const buffer = await wb.xlsx.writeBuffer();
    const url = URL.createObjectURL(
      new Blob([buffer], {
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      })
    );
    const a = document.createElement("a");
    a.href = url;
    a.download = `${
      (fileName || "suivi_etudes").trim().replace(/[\\/:*?"<>|]+/g, "_") ||
      "suivi_etudes"
    }.xlsx`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  // =========================================================
  // EXPORT FINAL
  // =========================================================

  const handleExport = async () => {
    if (selectedFields.length === 0) {
      alert("يرجى اختيار حقل واحد على الأقل");
      return;
    }

    if (exportFilteredData.length === 0) {
      alert("لا توجد بيانات مطابقة لمعايير التصدير");
      return;
    }

    const headers = selectedFields.map(
      (field) => exportableFields.find((f) => f.value === field)?.text || field
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
      exportDegreFilter === "undefined"
        ? "فئة الدرجة: معوز"
        : exportDegreFilter === "defined"
          ? "فئة الدرجة: الدرجات المحددة"
          : exportDegreFilter === "degree1"
            ? "فئة الدرجة: الدرجة 1"
            : exportDegreFilter === "degree2"
              ? "فئة الدرجة: الدرجة 2"
              : exportDegreFilter === "degree3"
                ? "فئة الدرجة: الدرجة 3"
                : exportDegreFilter === "unknown"
                  ? "فئة الدرجة: غير مصنف"
                  : "فئة الدرجة: جميع الدرجات",
      `المستفيدون من الدعم: ${exportStats.beneficiaires}`,
      `الدرجات المحددة - المستهلك: ${fmtMoney(
        exportStats.consommeDegreDefini
      )}`,
      `الدرجات المحددة - المؤدى: ${fmtMoney(
        exportStats.payeDegreDefini
      )}`,
      ...(exportStats.consommeDegreNonDefini > 0 || exportStats.payeDegreNonDefini > 0
        ? [
            `معوز - المستهلك: ${fmtMoney(exportStats.consommeDegreNonDefini)}`,
            `معوز - المؤدى: ${fmtMoney(exportStats.payeDegreNonDefini)}`,
          ]
        : []),
      `المبلغ المؤدى من طرف الغير: ${fmtMoney(exportStats.totalAutre)}`,
      ...exportCriteriaLabels,
    ];

    if (exportFormat === "excel") {
      await exportExcel(exportFilteredData, selectedFields, summary, exportFileName);
      setExportDialogVisible(false);
      return;
    }

    printPdf(
      exportTitle.trim() || "التتبع الدراسي للأبناء",
      headers,
      rows,
      summary,
      exportOrientation,
      [
        {
          label: "مستهلك - الدرجات المحددة",
          value: fmtMoney(
            exportStats.consommeDegreDefini
          ),
          color: "#eff6ff",
        },
        {
          label: "مؤدى - الدرجات المحددة",
          value: fmtMoney(
            exportStats.payeDegreDefini
          ),
          color: "#dbeafe",
        },
        ...(exportStats.consommeDegreNonDefini > 0 || exportStats.payeDegreNonDefini > 0
          ? [
              { label: "مستهلك - معوز", value: fmtMoney(exportStats.consommeDegreNonDefini), color: "#fff7ed" },
              { label: "مؤدى - معوز", value: fmtMoney(exportStats.payeDegreNonDefini), color: "#ffedd5" },
            ]
          : []),
        { label: "أداه الغير", value: fmtMoney(exportStats.totalAutre), color: "#fffbeb" },
      ]
    );

    setExportDialogVisible(false);
  };

  // =========================================================
  // TEMPLATES AFFICHAGE
  // =========================================================

  const niveauBodyTemplate = (row: EtudeRow) => (
    <span className="inline-flex rounded-full bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-700">
      {row.niveauNom}
    </span>
  );

  const cycleBodyTemplate = (row: EtudeRow) => {
    const cycle = getCycleScolaire(row.niveauNom);
    const config = NOTE_CONFIG[cycle];

    const classes: Record<CycleScolaire, string> = {
      prescolaire: "bg-pink-50 text-pink-700",
      primaire: "bg-sky-50 text-sky-700",
      college: "bg-purple-50 text-purple-700",
      lycee: "bg-indigo-50 text-indigo-700",
      universite: "bg-emerald-50 text-emerald-700",
      inconnu: "bg-gray-100 text-gray-600",
    };

    return (
      <span className={`inline-flex rounded-full px-3 py-1 text-xs font-bold ${classes[cycle]}`}>
        {config.label}
      </span>
    );
  };

  const anneeBodyTemplate = (row: EtudeRow) => (
    <span className="inline-flex whitespace-nowrap rounded-full bg-indigo-50 px-3 py-1 text-xs font-semibold text-indigo-700">
      {row.anneeScolaire ?? "—"}
    </span>
  );

  const noteBodyTemplate = (row: EtudeRow) => {
    const cycle = getCycleScolaire(row.niveauNom);

    if (cycle === "prescolaire" || cycle === "universite") {
      return <span className="text-gray-400">—</span>;
    }

    const value = getNoteValue(row);
    if (value === null) return <span className="text-gray-400">—</span>;

    const config = NOTE_CONFIG[cycle];
    const reussi = value >= config.seuilReussite;

    return (
      <div className="flex flex-col items-center gap-1">
        <span
          className={`inline-flex min-w-[90px] justify-center rounded-full px-3 py-1 text-xs font-bold ${
            reussi ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-600"
          }`}
        >
          {value.toFixed(2)} / {config.max}
        </span>
        <span className="text-[10px] text-gray-400">{config.shortLabel}</span>
      </div>
    );
  };

  const openProfile = (row: EtudeRow) => {
    const enfantId = row.enfant?.id;
    if (!enfantId) {
      console.error("Impossible d'ouvrir le dossier : enfant.id absent", row);
      return;
    }
    navigate(`/EtudesProfile/${enfantId}`);
  };

  const sortHeader = (sortKey: string, label: string, center = false) => (
    <button
      type="button"
      onClick={() => toggleSort(sortKey)}
      className={`inline-flex items-center gap-1 transition hover:text-indigo-600 ${
        center ? "justify-center" : ""
      }`}
    >
      <span>{label}</span>
      <span className={sort.key === sortKey ? "text-indigo-600" : "text-gray-300"}>
        {sort.key === sortKey ? (sort.dir === 1 ? "▲" : "▼") : "↕"}
      </span>
    </button>
  );

  const yearLabel = year === "all" || year === "" ? "كل السنوات" : year;

  // =========================================================
  // RENDER
  // =========================================================

  return (
    <div dir="rtl" className="etudes-table px-4 py-4 md:px-6">
      <div className="mx-auto max-w-7xl space-y-6">
        {/* HEADER */}
        <div className="flex flex-col gap-4 rounded-3xl border border-gray-200 bg-white p-6 shadow-sm md:flex-row md:items-center md:justify-between">
          <div>
            <p className="mb-1 text-xs font-semibold text-indigo-600">إدارة التتبع الدراسي</p>
            <h1 className="text-2xl font-bold text-gray-900">التتبع الدراسي للأبناء</h1>
            <p className="mt-1 text-sm text-gray-400">
              متابعة الدراسة والنتائج والدعم الدراسي والمبالغ المستهلكة
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <select
              value={year}
              onChange={(e) => setYear(e.target.value)}
              className="h-11 rounded-xl border border-gray-200 bg-white px-4 text-sm font-semibold outline-none transition focus:border-indigo-300 focus:ring-4 focus:ring-indigo-500/10"
            >
              <option value="all">كل السنوات</option>
              {anneesDisponibles.map((annee) => (
                <option key={annee} value={annee}>
                  {annee}
                </option>
              ))}
            </select>

            {hasFilter && (
              <button
                type="button"
                onClick={resetFilters}
                className="h-11 rounded-xl border border-gray-200 bg-white px-4 text-sm font-semibold text-gray-600 hover:bg-gray-50"
              >
                إعادة التصفية
              </button>
            )}

            <button
              type="button"
              onClick={() => {
                setExportYear(year || "all");
                setExportDialogVisible(true);
              }}
              className="inline-flex h-11 items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-5 text-sm font-semibold text-emerald-700 transition hover:-translate-y-0.5 hover:bg-emerald-100"
            >
              <i className="pi pi-download" />
              تصدير
            </button>
          </div>
        </div>

        {/* STATS GÉNÉRALES
            Le soutien est compté en entier (y compris la part payée par d'autres),
            puis séparé entre l'association et les autres payeurs. */}
        {(() => {
          const wait = consoLoading || degresLoading;
          const money = (v: number) => (wait ? "..." : fmtMoney(v));
          const pctAsso =
            statsSoutien.totalConsomme > 0
              ? Math.round((statsSoutien.totalPaye / statsSoutien.totalConsomme) * 100)
              : 0;
          const showMouawiz =
            statsSoutien.consommeDegreNonDefini > 0 || statsSoutien.payeDegreNonDefini > 0;

          return (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
                <div className="rounded-2xl border border-blue-100 bg-blue-50 p-5">
                  <p className="text-sm text-gray-500">عدد الطلاب</p>
                  <p className="mt-1 text-3xl font-bold text-blue-700">{stats.totalEtudiants}</p>
                  <p className="mt-1 text-xs text-blue-600">{stats.totalEcoles} مؤسسة</p>
                </div>

                <div className="rounded-2xl border border-cyan-100 bg-cyan-50 p-5">
                  <p className="text-sm text-gray-500">المستفيدون من الدعم الدراسي</p>
                  <p className="mt-1 text-3xl font-bold text-cyan-700">
                    {consoLoading ? "..." : statsSoutien.nombreEtudiants}
                  </p>
                  <p className="mt-1 text-xs text-cyan-600">{yearLabel}</p>
                </div>

                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
                  <p className="text-sm text-gray-500">الكلفة الإجمالية للدعم</p>
                  <p className="mt-1 whitespace-nowrap text-2xl font-bold text-slate-800">{money(statsSoutien.totalConsomme)}</p>
                  <p className="mt-1 text-xs text-slate-500">كل الجهات</p>
                </div>

                <div className="rounded-2xl border border-emerald-100 bg-emerald-50 p-5">
                  <p className="text-sm text-gray-500">أدته الجمعية</p>
                  <p className="mt-1 whitespace-nowrap text-2xl font-bold text-emerald-700">{money(statsSoutien.totalPaye)}</p>
                  <p className="mt-1 text-xs text-emerald-600">{wait ? "" : `${pctAsso}% من الكلفة`}</p>
                </div>
              </div>

              <div className={`grid grid-cols-1 gap-4 sm:grid-cols-2 ${showMouawiz ? "lg:grid-cols-3" : ""}`}>
                <div className="rounded-2xl border border-amber-100 bg-amber-50 p-5">
                  <p className="text-sm text-gray-500">أداه أشخاص أو جهات أخرى</p>
                  <p className="mt-1 whitespace-nowrap text-2xl font-bold text-amber-700">{money(statsSoutien.totalAutre)}</p>
                  <p className="mt-1 text-xs text-amber-600">
                    {consoLoading ? "" : `${statsSoutien.nombreAutre} طفل · غير محتسب في مصاريف الجمعية`}
                  </p>
                </div>

                <div className="rounded-2xl border border-indigo-100 bg-indigo-50 p-5">
                  <p className="text-sm text-gray-500">الدرجات المحددة</p>
                  <p className="mt-1 whitespace-nowrap text-xl font-bold text-indigo-700">
                    أدته الجمعية: {money(statsSoutien.payeDegreDefini)}
                  </p>
                  <p className="mt-1 text-xs text-indigo-600">الكلفة: {money(statsSoutien.consommeDegreDefini)}</p>
                </div>

                {showMouawiz && (
                  <div className="rounded-2xl border border-orange-100 bg-orange-50 p-5">
                    <p className="text-sm text-gray-500">معوز</p>
                    <p className="mt-1 whitespace-nowrap text-xl font-bold text-orange-700">
                      أدته الجمعية: {money(statsSoutien.payeDegreNonDefini)}
                    </p>
                    <p className="mt-1 text-xs text-orange-600">الكلفة: {money(statsSoutien.consommeDegreNonDefini)}</p>
                  </div>
                )}
              </div>
            </div>
          );
        })()}

        {/* STATS PAR CYCLE */}
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-5">
          {statsParCycle.map((item) => {
            const sansNote = item.cycle === "universite" || item.cycle === "prescolaire";
            return (
              <div
                key={item.cycle}
                className="rounded-3xl border border-gray-200 bg-white p-5 shadow-sm"
              >
                <div>
                  <p className="text-xs font-semibold text-indigo-500">المرحلة الدراسية</p>
                  <h3 className="mt-1 font-bold text-gray-800">{item.label}</h3>
                  <span className="mt-2 inline-flex rounded-full bg-indigo-50 px-3 py-1 text-xs font-bold text-indigo-700">
                    {item.total} طالب
                  </span>
                </div>

                {!sansNote && (
                  <div className="mt-4 grid grid-cols-2 gap-2">
                    <div className="rounded-xl bg-emerald-50 p-3">
                      <p className="text-[11px] text-gray-500">أعلى نقطة</p>
                      <p className="mt-1 font-bold text-emerald-700">
                        {item.meilleure ? `${item.meilleure.note.toFixed(2)} / ${item.max}` : "—"}
                      </p>
                    </div>

                    <div className="rounded-xl bg-red-50 p-3">
                      <p className="text-[11px] text-gray-500">أقل نقطة</p>
                      <p className="mt-1 font-bold text-red-600">
                        {item.plusFaible ? `${item.plusFaible.note.toFixed(2)} / ${item.max}` : "—"}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* DISTRIBUTIONS */}
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
            <h3 className="font-bold text-gray-800">التوزيع حسب المستوى</h3>
            <p className="mb-5 mt-1 text-xs text-gray-400">اضغط على المستوى لتصفية الجدول</p>

            <div className="space-y-3">
              {statsNiveaux.map(([niveau, count]) => (
                <button
                  key={niveau}
                  type="button"
                  onClick={() => setNiveauFilter(niveauFilter === niveau ? "" : niveau)}
                  className={`block w-full rounded-xl p-2 text-right transition ${
                    niveauFilter === niveau ? "bg-amber-50" : "hover:bg-gray-50"
                  }`}
                >
                  <div className="mb-1.5 flex items-center justify-between">
                    <span className="text-sm font-semibold text-gray-700">{niveau}</span>
                    <span className="text-xs font-bold text-gray-500">{count}</span>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-gray-100">
                    <div
                      className="h-full rounded-full bg-amber-500"
                      style={{ width: `${(count / maxNiveau) * 100}%` }}
                    />
                  </div>
                </button>
              ))}

              {statsNiveaux.length === 0 && (
                <p className="py-6 text-center text-sm text-gray-400">لا توجد بيانات</p>
              )}
            </div>
          </div>

          <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
            <h3 className="font-bold text-gray-800">التوزيع حسب المؤسسة</h3>
            <p className="mb-5 mt-1 text-xs text-gray-400">اضغط على المؤسسة لتصفية الجدول</p>

            <div className="space-y-3">
              {statsEcoles.slice(0, 8).map(([ecole, count]) => (
                <button
                  key={ecole}
                  type="button"
                  onClick={() => setEcoleFilter(ecoleFilter === ecole ? "" : ecole)}
                  className={`block w-full rounded-xl p-2 text-right transition ${
                    ecoleFilter === ecole ? "bg-indigo-50" : "hover:bg-gray-50"
                  }`}
                >
                  <div className="mb-1.5 flex items-center justify-between gap-3">
                    <span className="truncate text-sm font-semibold text-gray-700">{ecole}</span>
                    <span className="text-xs font-bold text-gray-500">{count}</span>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-gray-100">
                    <div
                      className="h-full rounded-full bg-indigo-500"
                      style={{ width: `${(count / maxEcole) * 100}%` }}
                    />
                  </div>
                </button>
              ))}

              {statsEcoles.length === 0 && (
                <p className="py-6 text-center text-sm text-gray-400">لا توجد بيانات</p>
              )}
            </div>
          </div>
        </div>

        {/* TABLEAU */}
        <div className="overflow-hidden rounded-3xl border border-gray-200 bg-white shadow-sm">
          <div className="flex flex-col gap-3 border-b border-gray-100 p-4 xl:flex-row xl:items-center">
            <div className="relative min-w-0 flex-1">
              <i className="pi pi-search absolute right-4 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="ابحث باسم الطالب، المؤسسة أو المستوى..."
                className="h-11 w-full rounded-xl border border-gray-200 bg-gray-50 pr-11 pl-4 text-sm outline-none focus:border-indigo-300 focus:bg-white focus:ring-4 focus:ring-indigo-500/10"
              />
            </div>

            <div className="flex shrink-0 gap-1 rounded-xl bg-gray-100 p-1 text-xs font-bold">
              {[...categoriesOptions, ""].map((c) => (
                <button
                  key={c || "all"}
                  type="button"
                  onClick={() => setCategorieFilter(c)}
                  className={`rounded-lg px-3 py-2 transition ${
                    categorieFilter === c ? "bg-white text-indigo-700 shadow-sm" : "text-gray-500 hover:text-gray-700"
                  }`}
                >
                  {c || "كل الفئات"}
                </button>
              ))}
            </div>

            <select
              value={cycleFilter}
              onChange={(e) => setCycleFilter(e.target.value as CycleScolaire | "")}
              className="h-11 rounded-xl border border-gray-200 bg-gray-50 px-3 text-sm outline-none"
            >
              <option value="">كل المراحل</option>
              {exportCycleOptions.map((c) => (
                <option key={c.value} value={c.value}>
                  {c.text}
                </option>
              ))}
            </select>

            <select
              value={niveauFilter}
              onChange={(e) => setNiveauFilter(e.target.value)}
              className="h-11 max-w-[280px] rounded-xl border border-gray-200 bg-gray-50 px-3 text-sm outline-none"
            >
              <option value="">كل المستويات</option>
              {niveauxOptions.map((n) => (
                <option key={n.value} value={n.value}>
                  {n.text}
                </option>
              ))}
            </select>

            <select
              value={ecoleFilter}
              onChange={(e) => setEcoleFilter(e.target.value)}
              className="h-11 max-w-[260px] rounded-xl border border-gray-200 bg-gray-50 px-3 text-sm outline-none"
            >
              <option value="">كل المؤسسات</option>
              {ecolesOptions.map((ec) => (
                <option key={ec.value} value={ec.value}>
                  {ec.text}
                </option>
              ))}
            </select>

            <span className="whitespace-nowrap rounded-xl bg-indigo-50 px-4 py-2.5 text-xs font-bold text-indigo-700">
              {filteredEtudes.length} طالب
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[960px] text-right">
              <thead>
                <tr className="bg-gray-50/70 text-xs font-semibold text-gray-500">
                  <th className="px-5 py-4">{sortHeader("nomEnfant", "الطالب")}</th>
                  <th className="px-5 py-4">{sortHeader("niveauNom", "المستوى")}</th>
                  <th className="px-5 py-4">{sortHeader("nomEcole", "المؤسسة")}</th>
                  {year === "all" && (
                    <th className="px-5 py-4 text-center">{sortHeader("anneeScolaire", "السنة", true)}</th>
                  )}
                  <th className="px-5 py-4 text-center">{sortHeader("note", "المعدل", true)}</th>
                  <th className="px-5 py-4">{sortHeader("total", "الدعم الدراسي")}</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-gray-100">
                {loading && (
                  <tr>
                    <td colSpan={6} className="py-16 text-center text-gray-400">
                      جاري التحميل...
                    </td>
                  </tr>
                )}

                {!loading && pageRows.length === 0 && (
                  <tr>
                    <td colSpan={6} className="py-16 text-center text-gray-400">
                      لا توجد نتائج
                    </td>
                  </tr>
                )}

                {!loading &&
                  pageRows.map((row) => {
                    const consommation = getConso(row);
                    const avatarIndex =
                      Math.abs(Number(row.enfant?.id ?? row.id ?? 0)) % AVATARS.length;
                    const grad = AVATARS[Number.isFinite(avatarIndex) ? avatarIndex : 0];

                    const consomme = Number(consommation.totalConsomme || 0);
                    const paye = Number(consommation.totalPaye || 0);
                    const autre = Number(consommation.totalAutre || 0);

                    const degreInfo =
                      getDegreInfo(row);

                    const pourcentagePaye =
                      consomme > 0 ? Math.min(100, Math.max(0, (paye / consomme) * 100)) : 0;

                    return (
                      <tr
                        key={row.id}
                        onClick={() => openProfile(row)}
                        className="group cursor-pointer transition hover:bg-indigo-50/40"
                      >
                        <td className="px-5 py-4">
                          <div className="flex items-center gap-3">
                            <span
                              className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br ${grad} text-sm font-bold text-white shadow-sm`}
                            >
                              {row.nomEnfant?.charAt(0)?.toUpperCase() || "ط"}
                            </span>
                            <div className="min-w-0">
                              <p className="truncate font-bold text-gray-800 group-hover:text-indigo-700">{row.nomEnfant}</p>
                              <p className="truncate text-xs text-gray-400">
                                {degreInfo.typeNom || "غير مصنف"}
                                {degreInfo.degre != null ? ` · الدرجة ${degreInfo.degre}` : ""}
                              </p>
                            </div>
                          </div>
                        </td>

                        <td className="px-5 py-4">
                          <div className="space-y-1">
                            {niveauBodyTemplate(row)}
                            <div className="text-[11px]">{cycleBodyTemplate(row)}</div>
                          </div>
                        </td>
                        <td className="px-5 py-4">
                          <span className="text-sm font-semibold text-gray-700">{row.nomEcole}</span>
                        </td>
                        {year === "all" && <td className="px-5 py-4 text-center">{anneeBodyTemplate(row)}</td>}
                        <td className="px-5 py-4 text-center">{noteBodyTemplate(row)}</td>

                        <td className="px-5 py-4">
                          {consomme <= 0 ? (
                            <span className="text-xs text-gray-300">لا يوجد دعم</span>
                          ) : (
                            <div className="min-w-[180px]">
                              <div className="flex items-center justify-between gap-3 text-xs">
                                <span className="font-semibold text-gray-500">أدته الجمعية</span>
                                <span className="whitespace-nowrap font-bold text-emerald-700">{fmtMoney(paye)}</span>
                              </div>
                              {autre > 0 && (
                                <div className="mt-1 flex items-center justify-between gap-3 text-xs">
                                  <span className="text-gray-400">أداه الغير</span>
                                  <span className="whitespace-nowrap font-bold text-amber-700">{fmtMoney(autre)}</span>
                                </div>
                              )}
                              <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-amber-100">
                                <div
                                  className="h-1.5 rounded-full bg-emerald-500 transition-all"
                                  style={{ width: `${pourcentagePaye}%` }}
                                />
                              </div>
                            </div>
                          )}
                        </td>
                      </tr>
                    );
                  })}
              </tbody>
            </table>
          </div>

          {/* PAGINATION */}
          <div className="flex flex-col items-center justify-between gap-3 border-t border-gray-100 px-5 py-4 text-sm text-gray-500 md:flex-row">
            <span>
              {sortedEtudes.length === 0
                ? "0"
                : `${page * rowsPerPage + 1} - ${Math.min(
                    (page + 1) * rowsPerPage,
                    sortedEtudes.length
                  )}`}{" "}
              من {sortedEtudes.length}
            </span>

            <div className="flex items-center gap-2">
              <button
                type="button"
                disabled={page === 0}
                onClick={() => setPage(Math.max(0, page - 1))}
                className="h-9 rounded-xl border border-gray-200 px-4 font-semibold transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40"
              >
                السابق
              </button>

              <span className="rounded-xl bg-indigo-600 px-4 py-2 text-xs font-bold text-white">
                {page + 1} / {pageCount}
              </span>

              <button
                type="button"
                disabled={page >= pageCount - 1}
                onClick={() => setPage(Math.min(pageCount - 1, page + 1))}
                className="h-9 rounded-xl border border-gray-200 px-4 font-semibold transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40"
              >
                التالي
              </button>
            </div>

            <select
              value={rowsPerPage}
              onChange={(e) => setRowsPerPage(Number(e.target.value))}
              className="h-9 rounded-xl border border-gray-200 bg-white px-2"
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

      {/* =================================================== */}
      {/* EXPORT MODAL */}
      {/* =================================================== */}

      <Modal
        isOpen={exportDialogVisible}
        onClose={() => setExportDialogVisible(false)}
        className="max-w-6xl m-4"
      >
        <div dir="rtl" className="max-h-[92vh] overflow-y-auto rounded-[32px] bg-[#f8fafc]">
          {/* HEADER */}
          <div className="sticky top-0 z-10 border-b border-gray-100 bg-white/95 px-6 py-5 backdrop-blur lg:px-8">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div className="flex items-center gap-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-600 to-violet-600 text-white shadow-lg shadow-indigo-200">
                  <i className="pi pi-file-export text-xl" />
                </div>
                <div>
                  <p className="text-xs font-bold text-indigo-600">مركز التصدير</p>
                  <h4 className="mt-0.5 text-2xl font-black text-gray-900">إنشاء تقرير مخصص</h4>
                  <p className="mt-1 text-sm text-gray-400">
                    اختر الصيغة والسنة والحقول ثم أضف أي معايير تريدها
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
                <div className="mb-4">
                  <h5 className="font-black text-gray-800">1. صيغة التصدير</h5>
                  <p className="mt-1 text-xs text-gray-400">
                    PDF للطباعة والتقارير، أو Excel للتحليل والتعديل
                  </p>
                </div>

                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <button
                    type="button"
                    onClick={() => setExportFormat("pdf")}
                    className={`rounded-2xl border-2 p-4 text-right transition ${
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
                        <p className="mt-0.5 text-xs text-gray-400">تقرير منسق وجاهز للطباعة</p>
                      </div>
                      {exportFormat === "pdf" && (
                        <i className="pi pi-check-circle mr-auto text-lg text-rose-500" />
                      )}
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setExportFormat("excel")}
                    className={`rounded-2xl border-2 p-4 text-right transition ${
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
                        <p className="mt-0.5 text-xs text-gray-400">جدول منسق قابل للتحليل</p>
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
                      <label className="mb-1.5 block text-xs font-bold text-gray-600">عنوان التقرير</label>
                      <input
                        value={exportTitle}
                        onChange={(e) => setExportTitle(e.target.value)}
                        className="h-11 w-full rounded-xl border border-gray-200 bg-gray-50 px-3 text-sm outline-none focus:border-indigo-300 focus:bg-white focus:ring-4 focus:ring-indigo-500/10"
                      />
                    </div>

                    <div>
                      <label className="mb-1.5 block text-xs font-bold text-gray-600">اتجاه الصفحة</label>
                      <div className="grid grid-cols-2 gap-2">
                        {(["landscape", "portrait"] as ExportOrientation[]).map((o) => (
                          <button
                            key={o}
                            type="button"
                            onClick={() => setExportOrientation(o)}
                            className={`h-11 rounded-xl border text-sm font-bold transition ${
                              exportOrientation === o
                                ? "border-indigo-400 bg-indigo-50 text-indigo-700"
                                : "border-gray-200 bg-white text-gray-500"
                            }`}
                          >
                            {o === "landscape" ? "أفقي" : "عمودي"}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {exportFormat === "excel" && (
                  <div className="mt-4 grid gap-3 sm:grid-cols-2">
                    <div>
                      <label className="mb-1.5 block text-xs font-bold text-gray-600">عنوان التقرير</label>
                      <input
                        value={exportTitle}
                        onChange={(e) => setExportTitle(e.target.value)}
                        className="h-11 w-full rounded-xl border border-gray-200 bg-gray-50 px-3 text-sm outline-none focus:border-emerald-300 focus:bg-white focus:ring-4 focus:ring-emerald-500/10"
                      />
                    </div>
                    <div>
                      <label className="mb-1.5 block text-xs font-bold text-gray-600">اسم الملف</label>
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
                  </div>
                )}
              </section>

              {/* ANNÉE */}
              <section className="rounded-3xl border border-gray-200 bg-white p-5 shadow-sm">
                <div className="mb-4">
                  <h5 className="font-black text-gray-800">2. السنة الدراسية</h5>
                  <p className="mt-1 text-xs text-gray-400">
                    اختر سنة محددة أو كل السنوات. المبالغ المصدرة تُحسب لهذه السنة.
                  </p>
                </div>

                <div className="flex flex-wrap gap-2">
                  {["all", ...anneesDisponibles].map((a) => (
                    <button
                      key={a}
                      type="button"
                      onClick={() => setExportYear(a)}
                      className={`rounded-xl border px-4 py-2.5 text-sm font-bold transition ${
                        exportYear === a
                          ? "border-indigo-300 bg-indigo-50 text-indigo-700"
                          : "border-gray-200 text-gray-600 hover:bg-gray-50"
                      }`}
                    >
                      {a === "all" ? "كل السنوات" : a}
                    </button>
                  ))}
                </div>

                {exportConsoLoading && (
                  <p className="mt-3 text-xs text-gray-400">جاري تحميل مبالغ هذه السنة...</p>
                )}
              </section>

              {/* SCOPE */}
              <section className="rounded-3xl border border-gray-200 bg-white p-5 shadow-sm">
                <div className="mb-4">
                  <h5 className="font-black text-gray-800">3. نطاق البيانات</h5>
                  <p className="mt-1 text-xs text-gray-400">
                    حدد من أين تبدأ عملية التصدير قبل تطبيق المعايير أدناه
                  </p>
                </div>

                <div className="grid gap-2 sm:grid-cols-3">
                  {[
                    { value: "current", title: "النتائج الحالية", subtitle: `${etudesHorsAnnee.length} سجل`, icon: "pi-filter" },
                    { value: "page", title: "الصفحة الحالية", subtitle: `${pageRows.length} سجل`, icon: "pi-clone" },
                    { value: "all", title: "كل البيانات المحملة", subtitle: `${etudes.length} سجل`, icon: "pi-database" },
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
                            exportScope === item.value ? "text-indigo-600" : "text-gray-400"
                          }`}
                        />
                        <div>
                          <p className="text-sm font-bold text-gray-700">{item.title}</p>
                          <p className="text-[11px] text-gray-400">{item.subtitle}</p>
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
                    <h5 className="font-black text-gray-800">4. الحقول المصدرة</h5>
                    <p className="mt-1 text-xs text-gray-400">
                      اختر فقط الأعمدة التي تريد ظهورها في التقرير
                    </p>
                  </div>

                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setSelectedFields(exportableFields.map((f) => f.value))}
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
                                ? prev.filter((v) => v !== field.value)
                                : [...prev, field.value]
                            )
                          }
                          className="h-4 w-4 accent-indigo-600"
                        />
                        <span className="text-sm font-semibold text-gray-700">{field.text}</span>
                      </label>
                    );
                  })}
                </div>
              </section>

              {/* CRITERIA */}
              <section className="rounded-3xl border border-gray-200 bg-white p-5 shadow-sm">
                <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <h5 className="font-black text-gray-800">5. معايير مخصصة</h5>
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
                    <label className="mb-1.5 block text-xs font-bold text-gray-600">بحث حر</label>
                    <div className="relative">
                      <i className="pi pi-search absolute right-4 top-1/2 -translate-y-1/2 text-gray-400" />
                      <input
                        value={exportSearch}
                        onChange={(e) => setExportSearch(e.target.value)}
                        placeholder="اسم الطالب، المؤسسة، المستوى..."
                        className="h-11 w-full rounded-xl border border-gray-200 bg-gray-50 pr-11 pl-4 text-sm outline-none focus:border-indigo-300 focus:bg-white focus:ring-4 focus:ring-indigo-500/10"
                      />
                    </div>
                  </div>

                  <div className="grid gap-4 md:grid-cols-2">
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

                    <div className="md:col-span-2">
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
                  </div>

                  <div className="grid gap-4 md:grid-cols-3">
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

                    {/* =========================================
                        FILTRE DEGRE
                        Inclut explicitement degré non défini.
                    ========================================= */}

                    <div>
                      <label className="mb-1.5 block text-xs font-bold text-gray-600">
                        فئة الدرجة
                      </label>

                      <select
                        value={exportDegreFilter}
                        onChange={(e) =>
                          setExportDegreFilter(
                            e.target.value as ExportDegreFilter
                          )
                        }
                        className="h-11 w-full rounded-xl border border-gray-200 bg-gray-50 px-3 text-sm outline-none transition focus:border-indigo-300 focus:bg-white focus:ring-4 focus:ring-indigo-500/10"
                      >
                        <option value="all">
                          جميع الدرجات
                        </option>

                        <option value="defined">
                          الدرجات المحددة
                        </option>

                        <option value="degree1">
                          الدرجة 1
                        </option>

                        <option value="degree2">
                          الدرجة 2
                        </option>

                        <option value="degree3">
                          الدرجة 3
                        </option>

                        <option value="undefined">
                          معوز
                        </option>

                        <option value="unknown">
                          غير مصنف
                        </option>
                      </select>

                      {exportDegreFilter ===
                        "undefined" && (
                        <div className="mt-2 rounded-xl border border-orange-100 bg-orange-50 px-3 py-2 text-[11px] font-semibold leading-5 text-orange-700">
                          سيتم تصدير الأطفال المنتمين إلى عائلات بدون درجة محددة فقط.
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="grid gap-4 md:grid-cols-3">
                    {[
                      { title: "مبلغ الدعم المستهلك", color: "emerald", min: exportMinConsomme, max: exportMaxConsomme, setMin: setExportMinConsomme, setMax: setExportMaxConsomme },
                      { title: "المبلغ المؤدى من طرفنا", color: "violet", min: exportMinPaye, max: exportMaxPaye, setMin: setExportMinPaye, setMax: setExportMaxPaye },
                      { title: "النقطة", color: "amber", min: exportMinNote, max: exportMaxNote, setMin: setExportMinNote, setMax: setExportMaxNote },
                    ].map((r) => (
                      <div
                        key={r.title}
                        className={`rounded-2xl border border-${r.color}-100 bg-${r.color}-50/50 p-4`}
                      >
                        <p className={`mb-3 text-xs font-black text-${r.color}-700`}>{r.title}</p>
                        <div className="grid grid-cols-2 gap-2">
                          <input
                            type="number"
                            min="0"
                            value={r.min}
                            onChange={(e) => r.setMin(e.target.value)}
                            placeholder="من"
                            className="h-10 min-w-0 rounded-xl border border-gray-200 bg-white px-3 text-sm outline-none"
                          />
                          <input
                            type="number"
                            min="0"
                            value={r.max}
                            onChange={(e) => r.setMax(e.target.value)}
                            placeholder="إلى"
                            className="h-10 min-w-0 rounded-xl border border-gray-200 bg-white px-3 text-sm outline-none"
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </section>
            </div>

            {/* PREVIEW */}
            <aside className="space-y-4 lg:sticky lg:top-28 lg:self-start">
              <div className="overflow-hidden rounded-3xl border border-indigo-100 bg-white shadow-sm">
                <div className="bg-gradient-to-br from-indigo-600 to-violet-600 p-5 text-white">
                  <p className="text-xs font-bold text-indigo-100">
                    معاينة التصدير — {exportYear === "all" ? "كل السنوات" : exportYear}
                  </p>
                  <div className="mt-2 flex items-end justify-between gap-3">
                    <div>
                      <p className="text-4xl font-black">{exportFilteredData.length}</p>
                      <p className="text-xs text-indigo-100">سجل مطابق</p>
                    </div>

                    <div className="rounded-2xl bg-white/15 px-3 py-2 text-center backdrop-blur">
                      <i
                        className={`pi ${
                          exportFormat === "pdf" ? "pi-file-pdf" : "pi-file-excel"
                        } text-xl`}
                      />
                      <p className="mt-1 text-[10px] font-bold uppercase">{exportFormat}</p>
                    </div>
                  </div>
                </div>

                <div className="space-y-3 p-5">
                  <div className="flex items-center justify-between rounded-xl bg-blue-50 px-3 py-2.5">
                    <span className="text-xs font-semibold text-gray-500">
                      مستهلك - الدرجات المحددة
                    </span>

                    <strong className="text-sm text-blue-700">
                      {exportConsoLoading
                        ? "..."
                        : fmtMoney(
                            exportStats.consommeDegreDefini
                          )}
                    </strong>
                  </div>

                  <div className="flex items-center justify-between rounded-xl bg-indigo-50 px-3 py-2.5">
                    <span className="text-xs font-semibold text-gray-500">
                      مؤدى - الدرجات المحددة
                    </span>

                    <strong className="text-sm text-indigo-700">
                      {exportConsoLoading
                        ? "..."
                        : fmtMoney(
                            exportStats.payeDegreDefini
                          )}
                    </strong>
                  </div>

                  {(exportStats.consommeDegreNonDefini > 0 || exportStats.payeDegreNonDefini > 0) && (
                  <>
                  <div className="flex items-center justify-between rounded-xl bg-orange-50 px-3 py-2.5">
                    <span className="text-xs font-semibold text-gray-500">
                      مستهلك - معوز
                    </span>

                    <strong className="text-sm text-orange-700">
                      {exportConsoLoading
                        ? "..."
                        : fmtMoney(
                            exportStats.consommeDegreNonDefini
                          )}
                    </strong>
                  </div>

                  <div className="flex items-center justify-between rounded-xl bg-amber-50 px-3 py-2.5">
                    <span className="text-xs font-semibold text-gray-500">
                      مؤدى - معوز
                    </span>

                    <strong className="text-sm text-amber-700">
                      {exportConsoLoading
                        ? "..."
                        : fmtMoney(
                            exportStats.payeDegreNonDefini
                          )}
                    </strong>
                  </div>
                  </>
                  )}

                  <div className="flex items-center justify-between rounded-xl bg-amber-50 px-3 py-2.5">
                    <span className="text-xs font-semibold text-gray-500">تكفل به الغير</span>
                    <strong className="text-sm text-amber-700">
                      {exportConsoLoading ? "..." : fmtMoney(exportStats.totalAutre)}
                    </strong>
                  </div>

                  <div className="flex items-center justify-between rounded-xl bg-cyan-50 px-3 py-2.5">
                    <span className="text-xs font-semibold text-gray-500">المستفيدون</span>
                    <strong className="text-sm text-cyan-700">{exportStats.beneficiaires}</strong>
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
              </div>

              <div className="rounded-3xl border border-gray-200 bg-white p-5 shadow-sm">
                <p className="mb-3 text-sm font-black text-gray-800">الحقول المختارة</p>
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
                    <span className="text-xs font-semibold text-red-500">اختر حقلا واحدا على الأقل</span>
                  )}
                </div>
              </div>

              <button
                type="button"
                onClick={handleExport}
                disabled={
                  exportFilteredData.length === 0 ||
                  selectedFields.length === 0 ||
                  exportConsoLoading
                }
                className={`flex h-12 w-full items-center justify-center gap-2 rounded-2xl font-black text-white shadow-lg transition ${
                  exportFormat === "pdf"
                    ? "bg-gradient-to-l from-rose-600 to-red-500 shadow-rose-200 hover:-translate-y-0.5"
                    : "bg-gradient-to-l from-emerald-600 to-teal-500 shadow-emerald-200 hover:-translate-y-0.5"
                } disabled:cursor-not-allowed disabled:opacity-40 disabled:shadow-none`}
              >
                <i className={`pi ${exportFormat === "pdf" ? "pi-file-pdf" : "pi-file-excel"}`} />
                {exportFormat === "pdf" ? "إنشاء تقرير PDF" : "تحميل ملف Excel"}
              </button>

              <p className="px-2 text-center text-[10px] leading-5 text-gray-400">
                PDF يفتح معاينة الطباعة ويمكن حفظه بصيغة PDF. Excel ينشئ ملفا منسقا بالأعمدة والمجاميع.
              </p>
            </aside>
          </div>
        </div>
      </Modal>
    </div>
  );
}
