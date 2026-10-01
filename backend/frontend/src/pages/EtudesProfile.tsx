import {
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
} from "react";
import { useParams } from "react-router";

import PageBreadcrumb from "../components/common/PageBreadCrumb";

import { FaCheck, FaTimes } from "react-icons/fa";

import { Editor } from "primereact/editor";

import "primeicons/primeicons.css";

// ============================================================
// CONFIG
// ============================================================

const API = "http://localhost:8080/api";

// ============================================================
// TYPES
// ============================================================

interface Option {
  value: string | number;
  label: string;
}

interface EtudeRow {
  id: number;

  annee: string;

  niveau: string | number;

  ecole: string | number;

  note1: string | number;

  note2: string | number;

  noteGenerale: string | number;

  resultat: string;

  details: string;
}

interface SoutienRow {
  id: number;

  annee: string;

  mois: string;

  centre: string;

  intervenant: string;

  montant: string | number;

  // Montant réellement payé par nous.
  montantPaye: string | number;

  effectue: boolean;
}

type SaveStatus =
  | "idle"
  | "saving"
  | "saved"
  | "error";

// ============================================================
// ANNEE SCOLAIRE ACTUELLE
// ============================================================

const getCurrentSchoolYear = () => {
  const now = new Date();

  const y = now.getFullYear();

  const month =
    now.getMonth() + 1;

  return month >= 9
    ? `${y}/${y + 1}`
    : `${y - 1}/${y}`;
};

// ============================================================
// LISTE ANNEES
// ============================================================
const DEFAULT_SCHOOL_YEARS = Array.from(
  { length: 15 },
  (_, index) => {
    const currentStart = Number(
      getCurrentSchoolYear().split("/")[0]
    );

    const start = currentStart - index;

    return `${start}/${start + 1}`;
  }
);

const sortSchoolYears = (years: string[]) => {
  return [...years].sort((a, b) => {
    const yearA = Number(a.split("/")[0]) || 0;
    const yearB = Number(b.split("/")[0]) || 0;

    return yearB - yearA;
  });
};

const normalizeManualSchoolYear = (
  value: string
): string | null => {
  const text = value
    .trim()
    .replace(/\s+/g, "");

  // Si on écrit seulement 2027
  // => 2027/2028
  if (/^\d{4}$/.test(text)) {
    const start = Number(text);

    return `${start}/${start + 1}`;
  }

  // Accepte :
  // 2027/2028
  // 2027-2028
  const match = text.match(
    /^(\d{4})[/-](\d{4})$/
  );

  if (!match) {
    return null;
  }

  const start = Number(match[1]);
  const end = Number(match[2]);

  if (end !== start + 1) {
    return null;
  }

  return `${start}/${end}`;
};
// ============================================================
// MOIS
// ============================================================

const MONTHS = [
  "شتنبر",
  "أكتوبر",
  "نونبر",
  "دجنبر",
  "يناير",
  "فبراير",
  "مارس",
  "أبريل",
  "ماي",
  "يونيو",
  "يوليوز",
  "غشت",
];

// ============================================================
// SELECT PERSONNALISE
// ============================================================
const SchoolYearSelect = ({
  value,
  onChange,
  years,
  onAddYear,
  className = "",
}: {
  value: string;
  onChange: (value: string) => void;
  years: string[];
  onAddYear: (year: string) => void;
  className?: string;
}) => {
  const [adding, setAdding] =
    useState(false);

  const [newYear, setNewYear] =
    useState("");

  const handleAdd = () => {
    const normalized =
      normalizeManualSchoolYear(
        newYear
      );

    if (!normalized) {
      alert(
        "أدخل سنة دراسية صحيحة، مثلا: 2027/2028"
      );

      return;
    }

    onAddYear(normalized);

    onChange(normalized);

    setNewYear("");

    setAdding(false);
  };

  if (adding) {
    return (
      <div
        className={`flex items-center gap-2 ${className}`}
      >
        <input
          type="text"
          autoFocus
          value={newYear}
          onChange={(e) =>
            setNewYear(
              e.target.value
            )
          }
          onKeyDown={(e) => {
            if (
              e.key === "Enter"
            ) {
              e.preventDefault();

              handleAdd();
            }

            if (
              e.key === "Escape"
            ) {
              setAdding(false);

              setNewYear("");
            }
          }}
          placeholder="مثال: 2027/2028"
          className="h-11 min-w-0 flex-1 rounded-xl border border-indigo-300 bg-white px-3 text-center font-semibold outline-none focus:ring-4 focus:ring-indigo-500/10"
        />

        <button
          type="button"
          onClick={handleAdd}
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-indigo-600 text-white transition hover:bg-indigo-700"
          title="إضافة السنة"
        >
          <FaCheck />
        </button>

        <button
          type="button"
          onClick={() => {
            setAdding(false);
            setNewYear("");
          }}
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gray-100 text-gray-600 transition hover:bg-gray-200"
          title="إلغاء"
        >
          <FaTimes />
        </button>
      </div>
    );
  }

  return (
    <div
      className={`flex items-center gap-2 ${className}`}
    >
      <select
        value={value}
        onChange={(e) =>
          onChange(
            e.target.value
          )
        }
        className="h-11 min-w-0 flex-1 rounded-xl border border-gray-200 bg-gray-50 px-3 outline-none transition focus:border-indigo-300 focus:bg-white focus:ring-4 focus:ring-indigo-500/10"
      >
        {years.map((year) => (
          <option
            key={year}
            value={year}
          >
            {year}
          </option>
        ))}
      </select>

      <button
        type="button"
        onClick={() =>
          setAdding(true)
        }
        className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-indigo-200 bg-indigo-50 text-lg font-bold text-indigo-600 transition hover:bg-indigo-100"
        title="إضافة سنة دراسية يدويا"
      >
        +
      </button>
    </div>
  );
};
const Select = ({
  options = [],
  value,
  onChange,
  placeholder,
  apiUrl,
  onNewItem,
}: any) => {
  const [open, setOpen] =
    useState(false);

  const [adding, setAdding] =
    useState(false);

  const [newOption, setNewOption] =
    useState("");

  const [opts, setOpts] =
    useState<Option[]>(options);

  // Identifiant unique pour chaque dropdown
  const selectId = useId();

  // Référence du composant pour détecter le clic extérieur
  const selectRef =
    useRef<HTMLDivElement | null>(
      null
    );

  // =========================================================
  // METTRE À JOUR LES OPTIONS
  // =========================================================

  useEffect(() => {
    setOpts(options);
  }, [options]);

  // =========================================================
  // FERMER LES AUTRES SELECTS
  // =========================================================

  useEffect(() => {
    const handleAnotherSelectOpen = (
      event: Event
    ) => {
      const customEvent =
        event as CustomEvent<string>;

      // Si un autre select vient de s'ouvrir,
      // fermer celui-ci.
      if (
        customEvent.detail !==
        selectId
      ) {
        setOpen(false);
        setAdding(false);
        setNewOption("");
      }
    };

    window.addEventListener(
      "custom-select-open",
      handleAnotherSelectOpen
    );

    return () => {
      window.removeEventListener(
        "custom-select-open",
        handleAnotherSelectOpen
      );
    };
  }, [selectId]);

  // =========================================================
  // FERMER AU CLIC EXTERIEUR
  // =========================================================

  useEffect(() => {
    const handleClickOutside = (
      event: MouseEvent
    ) => {
      if (
        selectRef.current &&
        !selectRef.current.contains(
          event.target as Node
        )
      ) {
        setOpen(false);
        setAdding(false);
        setNewOption("");
      }
    };

    document.addEventListener(
      "mousedown",
      handleClickOutside
    );

    return () => {
      document.removeEventListener(
        "mousedown",
        handleClickOutside
      );
    };
  }, []);

  // =========================================================
  // OUVRIR / FERMER
  // =========================================================

  const toggleSelect = () => {
    if (!open) {
      // Informer tous les autres dropdowns
      // que celui-ci va s'ouvrir.
      window.dispatchEvent(
        new CustomEvent(
          "custom-select-open",
          {
            detail: selectId,
          }
        )
      );

      setOpen(true);

      return;
    }

    setOpen(false);
    setAdding(false);
    setNewOption("");
  };

  // =========================================================
  // CHOISIR UNE OPTION
  // =========================================================

  const handleSelect = (
    opt: Option
  ) => {
    onChange(opt.value);

    setOpen(false);

    setAdding(false);

    setNewOption("");
  };

  // =========================================================
  // AJOUTER UNE NOUVELLE OPTION
  // =========================================================

  const handleAddOption =
    async () => {
      if (!newOption.trim()) {
        return;
      }

      try {
        const res =
          await fetch(apiUrl, {
            method: "POST",

            headers: {
              "Content-Type":
                "application/json",
            },

            body: JSON.stringify({
              nom: newOption.trim(),
            }),
          });

        if (!res.ok) {
          throw new Error(
            "Erreur ajout"
          );
        }

        const savedItem =
          await res.json();

        const newOpt: Option = {
          value: savedItem.id,
          label: savedItem.nom,
        };

        setOpts((prev) => [
          ...prev,
          newOpt,
        ]);

        if (onNewItem) {
          onNewItem(newOpt);
        }

        onChange(newOpt.value);

        setNewOption("");

        setAdding(false);

        setOpen(false);
      } catch (error) {
        console.error(error);

        alert(
          "تعذر إضافة العنصر"
        );
      }
    };

  // =========================================================
  // RENDER
  // =========================================================

  return (
    <div
      ref={selectRef}
      className="relative w-full"
    >

      {/* BOUTON PRINCIPAL */}

      <button
        type="button"
        onClick={toggleSelect}
        className={`flex h-11 w-full items-center justify-between rounded-xl border bg-white px-4 text-right text-sm shadow-sm transition ${
          open
            ? "border-indigo-400 ring-4 ring-indigo-500/10"
            : "border-gray-200 hover:border-indigo-300"
        }`}
      >

        <span className="min-w-0 flex-1 truncate">

          {opts.find(
            (o) =>
              String(o.value) ===
              String(value)
          )?.label || (
            <span className="text-gray-400">
              {placeholder}
            </span>
          )}

        </span>

        <i
          className={`pi ${
            open
              ? "pi-chevron-up"
              : "pi-chevron-down"
          } mr-3 text-xs text-gray-400 transition-transform`}
        />

      </button>

      {/* MENU */}

      {open && (
        <div className="absolute right-0 z-[100] mt-2 max-h-64 w-full min-w-[250px] overflow-y-auto rounded-xl border border-gray-200 bg-white py-1 shadow-xl">

          {/* OPTIONS */}

          {opts.length > 0 ? (
            opts.map((opt) => {
              const selected =
                String(opt.value) ===
                String(value);

              return (
                <button
                  type="button"
                  key={opt.value}
                  onClick={() =>
                    handleSelect(opt)
                  }
                  className={`flex w-full items-center justify-between px-4 py-2.5 text-right text-sm transition ${
                    selected
                      ? "bg-indigo-50 font-bold text-indigo-700"
                      : "text-gray-700 hover:bg-gray-50"
                  }`}
                >

                  <span>
                    {opt.label}
                  </span>

                  {selected && (
                    <i className="pi pi-check text-xs text-indigo-600" />
                  )}

                </button>
              );
            })
          ) : (
            <div className="px-4 py-4 text-center text-sm text-gray-400">
              لا توجد عناصر
            </div>
          )}

          {/* AJOUT */}

          {!adding ? (
            <button
              type="button"
              onClick={() =>
                setAdding(true)
              }
              className="flex w-full items-center gap-2 border-t border-gray-100 px-4 py-3 text-right text-sm font-semibold text-indigo-600 transition hover:bg-indigo-50"
            >
              <i className="pi pi-plus text-xs" />

              إضافة عنصر جديد
            </button>
          ) : (
            <div className="border-t border-gray-100 p-3">

              <p className="mb-2 text-xs font-semibold text-gray-500">
                إضافة عنصر جديد
              </p>

              <div className="flex items-center gap-2">

                <input
                  autoFocus
                  value={newOption}
                  onChange={(e) =>
                    setNewOption(
                      e.target.value
                    )
                  }
                  onKeyDown={(e) => {
                    if (
                      e.key ===
                      "Enter"
                    ) {
                      e.preventDefault();

                      void handleAddOption();
                    }

                    if (
                      e.key ===
                      "Escape"
                    ) {
                      setAdding(false);
                      setNewOption("");
                    }
                  }}
                  placeholder="اكتب هنا..."
                  className="h-10 min-w-0 flex-1 rounded-lg border border-gray-200 px-3 text-sm outline-none focus:border-indigo-300 focus:ring-4 focus:ring-indigo-500/10"
                />

                <button
                  type="button"
                  onClick={() =>
                    void handleAddOption()
                  }
                  className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-indigo-600 text-white transition hover:bg-indigo-700"
                  title="حفظ"
                >
                  <FaCheck />
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setAdding(false);
                    setNewOption("");
                  }}
                  className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-gray-100 text-gray-600 transition hover:bg-gray-200"
                  title="إلغاء"
                >
                  <FaTimes />
                </button>

              </div>

            </div>
          )}

        </div>
      )}

    </div>
  );
};

// ============================================================
// PAGE
// ============================================================

export default function EtudesProfile() {
  const { enfantid } =
    useParams();
const [schoolYears, setSchoolYears] =
  useState<string[]>(() => {
    let savedYears: string[] = [];

    try {
      savedYears = JSON.parse(
        localStorage.getItem(
          "schoolYears"
        ) || "[]"
      );
    } catch {
      savedYears = [];
    }

    return sortSchoolYears(
      Array.from(
        new Set([
          ...DEFAULT_SCHOOL_YEARS,
          ...savedYears,
        ])
      )
    );
  });

const addSchoolYear = (
  year: string
) => {
  setSchoolYears((prev) => {
    const next =
      sortSchoolYears(
        Array.from(
          new Set([
            ...prev,
            year,
          ])
        )
      );

    localStorage.setItem(
      "schoolYears",
      JSON.stringify(next)
    );

    return next;
  });
};
  const tempEtudeId =
    useRef(-1);

  const tempSoutienId =
    useRef(-1);

  // ==========================================================
  // ETUDES
  // ==========================================================

  const [rows, setRows] =
    useState<EtudeRow[]>([]);

  const [
    niveauxscolaires,
    setNiveauxscolaires,
  ] = useState<Option[]>([]);

  const [ecoles, setEcoles] =
    useState<Option[]>([]);

  // ==========================================================
  // SOUTIEN
  // ==========================================================

  const [
    soutiens,
    setSoutiens,
  ] = useState<SoutienRow[]>([]);

  const [
    soutienYear,
    setSoutienYear,
  ] = useState(
    getCurrentSchoolYear()
  );

  // ==========================================================
  // AUTOSAVE
  // ==========================================================

  const rowsRef =
    useRef<EtudeRow[]>([]);

  const soutiensRef =
    useRef<SoutienRow[]>([]);

  const etudeSaveTimers =
    useRef<
      Record<
        number,
        ReturnType<typeof setTimeout>
      >
    >({});

  const soutienSaveTimers =
    useRef<
      Record<
        number,
        ReturnType<typeof setTimeout>
      >
    >({});

  const etudeInFlight =
    useRef<Record<number, boolean>>({});

  const soutienInFlight =
    useRef<Record<number, boolean>>({});

  const etudePending =
    useRef<Record<number, boolean>>({});

  const soutienPending =
    useRef<Record<number, boolean>>({});

  const [
    etudeSaveStatus,
    setEtudeSaveStatus,
  ] = useState<
    Record<number, SaveStatus>
  >({});

  const [
    soutienSaveStatus,
    setSoutienSaveStatus,
  ] = useState<
    Record<number, SaveStatus>
  >({});
useEffect(() => {
  const existingYears = [
    ...rows.map(
      (row) => row.annee
    ),

    ...soutiens.map(
      (row) => row.annee
    ),
  ].filter(Boolean);

  if (
    existingYears.length === 0
  ) {
    return;
  }

  setSchoolYears((prev) => {
    const next =
      sortSchoolYears(
        Array.from(
          new Set([
            ...prev,
            ...existingYears,
          ])
        )
      );

    localStorage.setItem(
      "schoolYears",
      JSON.stringify(next)
    );

    return next;
  });
}, [rows, soutiens]);
  useEffect(() => {
    rowsRef.current = rows;
  }, [rows]);

  useEffect(() => {
    soutiensRef.current =
      soutiens;
  }, [soutiens]);

  // Nettoyer les timers si on quitte la page.
  useEffect(() => {
    return () => {
      Object.values(
        etudeSaveTimers.current
      ).forEach((timer) =>
        clearTimeout(timer)
      );

      Object.values(
        soutienSaveTimers.current
      ).forEach((timer) =>
        clearTimeout(timer)
      );
    };
  }, []);

  // ==========================================================
  // CHARGER ETUDES
  // ==========================================================

  const loadEtudes = async () => {
    try {
      const res = await fetch(
        `${API}/etudes/all/${enfantid}`
      );

      if (!res.ok) {
        throw new Error(
          "Erreur études"
        );
      }

      const data =
        await res.json();

      const formatted: EtudeRow[] =
        data.map(
          (etude: any) => ({
            id: etude.id,

            annee:
              etude.anneeScolaire ??
              "",

            niveau:
              etude
                .niveauScolaire
                ?.id ?? "",

            ecole:
              etude.ecole?.id ??
              "",

            note1:
              etude.noteSemestre1 ??
              "",

            note2:
              etude.noteSemestre2 ??
              "",

            noteGenerale:
              etude.noteGenerale ??
              "",

            resultat:
              etude.redoublon ===
              true
                ? "مكرر"
                : etude.redoublon ===
                    false
                  ? "ناجح"
                  : "",

            details:
              etude.details ??
              "",
          })
        );

      setRows(formatted);
    } catch (error) {
      console.error(error);
    }
  };

  useEffect(() => {
    if (!enfantid) return;

    loadEtudes();
  }, [enfantid]);

  // ==========================================================
  // CHARGER NIVEAUX + ECOLES
  // ==========================================================

  useEffect(() => {
    const loadOptions =
      async () => {
        try {
          const [
            niveauRes,
            ecoleRes,
          ] =
            await Promise.all([
              fetch(
                `${API}/niveaux`
              ),

              fetch(
                `${API}/ecoles`
              ),
            ]);

          const niveauData =
            await niveauRes.json();

          const ecoleData =
            await ecoleRes.json();

          setNiveauxscolaires(
            niveauData.map(
              (n: any) => ({
                value: n.id,
                label: n.nom,
              })
            )
          );

          setEcoles(
            ecoleData.map(
              (e: any) => ({
                value: e.id,
                label: e.nom,
              })
            )
          );
        } catch (error) {
          console.error(error);
        }
      };

    loadOptions();
  }, []);

  // ==========================================================
  // AJOUT ETUDE
  // ==========================================================

  const addRow = () => {
    const newRow: EtudeRow = {
      id:
        tempEtudeId.current--,

      annee:
        getCurrentSchoolYear(),

      niveau: "",

      ecole: "",

      note1: "",

      note2: "",

      noteGenerale: "",

      resultat: "",

      details: "",
    };

    const next = [
      newRow,
      ...rowsRef.current,
    ];

    rowsRef.current = next;
    setRows(next);

    setEtudeSaveStatus(
      (prev) => ({
        ...prev,
        [newRow.id]: "idle",
      })
    );
  };

  // ==========================================================
  // AUTOSAVE ETUDE
  // ==========================================================

  const saveEtudeById =
    async (id: number) => {
      const row =
        rowsRef.current.find(
          (item) =>
            item.id === id
        );

      if (!row) return;

      // On attend au minimum l'année et le niveau.
      if (
        !row.annee ||
        !row.niveau
      ) {
        setEtudeSaveStatus(
          (prev) => ({
            ...prev,
            [id]: "idle",
          })
        );

        return;
      }

      // Si une sauvegarde est déjà en cours,
      // on mémorise qu'une nouvelle sauvegarde
      // devra être exécutée juste après.
      if (
        etudeInFlight.current[id]
      ) {
        etudePending.current[id] =
          true;

        return;
      }

      etudeInFlight.current[id] =
        true;

      setEtudeSaveStatus(
        (prev) => ({
          ...prev,
          [id]: "saving",
        })
      );

      let nextId = id;

      try {
        const url =
          id > 0
            ? `${API}/etudes/${id}`
            : `${API}/etudes`;

        const payload = {
          anneeScolaire:
            row.annee,

          enfantId:
            Number(enfantid),

          niveauScolaireId:
            row.niveau === ""
              ? null
              : Number(
                  row.niveau
                ),

          ecoleId:
            row.ecole === ""
              ? null
              : Number(
                  row.ecole
                ),

          specialiteId: null,

          noteSemestre1:
            row.note1 === ""
              ? null
              : Number(
                  row.note1
                ),

          noteSemestre2:
            row.note2 === ""
              ? null
              : Number(
                  row.note2
                ),

          noteGenerale:
            row.noteGenerale === ""
              ? null
              : Number(
                  row.noteGenerale
                ),

          redoublon:
            row.resultat === ""
              ? null
              : row.resultat ===
                "مكرر",

          details:
            row.details ?? "",
        };

        const res =
          await fetch(url, {
            method:
              id > 0
                ? "PUT"
                : "POST",

            headers: {
              "Content-Type":
                "application/json",

              Accept:
                "application/json",
            },

            body:
              JSON.stringify(
                payload
              ),
          });

        if (!res.ok) {
          const errorText =
            await res.text();

          console.error(
            "Erreur autosave étude :",
            res.status,
            errorText
          );

          setEtudeSaveStatus(
            (prev) => ({
              ...prev,
              [id]: "error",
            })
          );

          return;
        }

        const saved =
          await res.json();

        // Pour une nouvelle ligne :
        // on remplace l'id temporaire négatif
        // par l'id réel enregistré en base.
        if (id <= 0) {
          nextId =
            Number(saved.id);

          const latest =
            rowsRef.current.find(
              (item) =>
                item.id === id
            ) ?? row;

          const next =
            rowsRef.current.map(
              (item) =>
                item.id === id
                  ? {
                      ...latest,
                      id: nextId,
                    }
                  : item
            );

          rowsRef.current =
            next;

          setRows(next);

          setEtudeSaveStatus(
            (prev) => {
              const copy = {
                ...prev,
              };

              delete copy[id];

              copy[nextId] =
                "saved";

              return copy;
            }
          );
        } else {
          setEtudeSaveStatus(
            (prev) => ({
              ...prev,
              [id]: "saved",
            })
          );
        }
      } catch (error) {
        console.error(
          "Erreur autosave étude :",
          error
        );

        setEtudeSaveStatus(
          (prev) => ({
            ...prev,
            [id]: "error",
          })
        );
      } finally {
        const hadPending =
          Boolean(
            etudePending.current[
              id
            ]
          );

        delete etudeInFlight
          .current[id];

        delete etudePending
          .current[id];

        if (hadPending) {
          window.setTimeout(
            () => {
              void saveEtudeById(
                nextId
              );
            },
            0
          );
        }
      }
    };

  const scheduleEtudeSave = (
    id: number
  ) => {
    const oldTimer =
      etudeSaveTimers.current[
        id
      ];

    if (oldTimer) {
      clearTimeout(oldTimer);
    }

    setEtudeSaveStatus(
      (prev) => ({
        ...prev,
        [id]: "saving",
      })
    );

    etudeSaveTimers.current[
      id
    ] = setTimeout(() => {
      delete etudeSaveTimers
        .current[id];

      void saveEtudeById(id);
    }, 700);
  };

  // ==========================================================
  // UPDATE ETUDE LOCAL + AUTOSAVE
  // ==========================================================

  const updateRow = (
    id: number,
    field: keyof EtudeRow,
    value: any
  ) => {
    const current =
      rowsRef.current.find(
        (row) =>
          row.id === id
      );

    if (!current) return;

    const updated: EtudeRow = {
      ...current,
      [field]: value,
    };

    const next =
      rowsRef.current.map(
        (row) =>
          row.id === id
            ? updated
            : row
      );

    rowsRef.current = next;
    setRows(next);

    // L'année est déjà renseignée automatiquement.
    // On démarre l'autosave dès que le niveau est choisi.
    if (
      updated.annee &&
      updated.niveau
    ) {
      scheduleEtudeSave(id);
    }
  };

  // ==========================================================
  // CALCUL NOTE GENERALE
  // ==========================================================

  const calculerNoteGenerale = (
    row: EtudeRow
  ) => {
    if (
      row.note1 === "" ||
      row.note2 === ""
    ) {
      return;
    }

    const n1 =
      Number(row.note1);

    const n2 =
      Number(row.note2);

    if (
      !Number.isFinite(n1) ||
      !Number.isFinite(n2)
    ) {
      return;
    }

    const moyenne =
      (
        (n1 + n2) /
        2
      ).toFixed(2);

    updateRow(
      row.id,
      "noteGenerale",
      moyenne
    );
  };

  // ==========================================================
  // DELETE ETUDE
  // ==========================================================

  const deleteRow = async (
    row: EtudeRow
  ) => {
    if (
      !window.confirm(
        "هل تريد حذف هذه السنة الدراسية؟"
      )
    ) {
      return;
    }

    try {
      if (row.id > 0) {
        const res =
          await fetch(
            `${API}/etudes/${row.id}`,
            {
              method: "DELETE",
            }
          );

        if (!res.ok) {
          throw new Error(
            "Erreur suppression"
          );
        }
      }

      if (
        etudeSaveTimers.current[
          row.id
        ]
      ) {
        clearTimeout(
          etudeSaveTimers.current[
            row.id
          ]
        );

        delete etudeSaveTimers
          .current[row.id];
      }

      const next =
        rowsRef.current.filter(
          (r) =>
            r.id !== row.id
        );

      rowsRef.current = next;
      setRows(next);

      setEtudeSaveStatus(
        (prev) => {
          const copy = {
            ...prev,
          };

          delete copy[row.id];

          return copy;
        }
      );
    } catch (error) {
      console.error(error);

      alert(
        "تعذر حذف السجل"
      );
    }
  };

  // ==========================================================
  // CHARGER SOUTIEN
  // ==========================================================

  const loadSoutiens =
    async () => {
      if (!enfantid) return;

      try {
        const res =
          await fetch(
            `${API}/soutiens/all/${enfantid}`
          );

        if (!res.ok) {
          throw new Error(
            "Erreur soutien"
          );
        }

        const data =
          await res.json();

        const formatted: SoutienRow[] =
          data.map(
            (item: any) => ({
              id: item.id,

              annee:
                item.anneeScolaire ??
                "",

              mois:
                item.mois ??
                "",

              centre:
                item.centre ??
                "",

              intervenant:
                item.intervenant ??
                "",

              montant:
                item.montant ??
                "",

              montantPaye:
                item.montantPaye ??
                "",

              effectue:
                Boolean(
                  item.effectue
                ),
            })
          );

        setSoutiens(
          formatted
        );
      } catch (error) {
        console.error(error);
      }
    };

  useEffect(() => {
    loadSoutiens();
  }, [enfantid]);

  // ==========================================================
  // AJOUT SOUTIEN
  // ==========================================================

  const addSoutien = () => {
    const newRow: SoutienRow = {
      id:
        tempSoutienId.current--,

      annee:
        soutienYear,

      mois: "",

      centre: "",

      intervenant: "",

      montant: "",

      montantPaye: "",

      effectue: false,
    };

    setSoutiens((prev) => [
      newRow,
      ...prev,
    ]);
  };

  // ==========================================================
  // AUTOSAVE SOUTIEN
  // ==========================================================

  const saveSoutienById =
    async (id: number) => {
      const row =
        soutiensRef.current.find(
          (item) =>
            item.id === id
        );

      if (!row) return;

      // On attend que le mois soit choisi.
      if (
        !row.annee ||
        !row.mois
      ) {
        setSoutienSaveStatus(
          (prev) => ({
            ...prev,
            [id]: "idle",
          })
        );

        return;
      }

      if (
        soutienInFlight.current[
          id
        ]
      ) {
        soutienPending.current[
          id
        ] = true;

        return;
      }

      soutienInFlight.current[
        id
      ] = true;

      setSoutienSaveStatus(
        (prev) => ({
          ...prev,
          [id]: "saving",
        })
      );

      let nextId = id;

      try {
        const url =
          id > 0
            ? `${API}/soutiens/${id}`
            : `${API}/soutiens`;

        const res =
          await fetch(url, {
            method:
              id > 0
                ? "PUT"
                : "POST",

            headers: {
              "Content-Type":
                "application/json",

              Accept:
                "application/json",
            },

            body:
              JSON.stringify({
                enfantId:
                  Number(
                    enfantid
                  ),

                anneeScolaire:
                  row.annee,

                mois:
                  row.mois,

                centre:
                  row.centre,

                intervenant:
                  row.intervenant,

                montant:
                  row.montant ===
                  ""
                    ? 0
                    : Number(
                        row.montant
                      ),

                montantPaye:
                  row.montantPaye ===
                  ""
                    ? 0
                    : Number(
                        row.montantPaye
                      ),

                effectue:
                  row.effectue,
              }),
          });

        if (!res.ok) {
          const errorText =
            await res.text();

          console.error(
            "Erreur autosave soutien :",
            res.status,
            errorText
          );

          setSoutienSaveStatus(
            (prev) => ({
              ...prev,
              [id]: "error",
            })
          );

          return;
        }

        const saved =
          await res.json();

        if (id <= 0) {
          nextId =
            Number(saved.id);

          const latest =
            soutiensRef.current.find(
              (item) =>
                item.id === id
            ) ?? row;

          const next =
            soutiensRef.current.map(
              (item) =>
                item.id === id
                  ? {
                      ...latest,
                      id: nextId,
                    }
                  : item
            );

          soutiensRef.current =
            next;

          setSoutiens(next);

          setSoutienSaveStatus(
            (prev) => {
              const copy = {
                ...prev,
              };

              delete copy[id];

              copy[nextId] =
                "saved";

              return copy;
            }
          );
        } else {
          setSoutienSaveStatus(
            (prev) => ({
              ...prev,
              [id]: "saved",
            })
          );
        }

      } catch (error) {
        console.error(
          "Erreur autosave soutien :",
          error
        );

        setSoutienSaveStatus(
          (prev) => ({
            ...prev,
            [id]: "error",
          })
        );
      } finally {
        const hadPending =
          Boolean(
            soutienPending.current[
              id
            ]
          );

        delete soutienInFlight
          .current[id];

        delete soutienPending
          .current[id];

        if (hadPending) {
          window.setTimeout(
            () => {
              void saveSoutienById(
                nextId
              );
            },
            0
          );
        }
      }
    };

  const scheduleSoutienSave = (
    id: number
  ) => {
    const oldTimer =
      soutienSaveTimers.current[
        id
      ];

    if (oldTimer) {
      clearTimeout(oldTimer);
    }

    setSoutienSaveStatus(
      (prev) => ({
        ...prev,
        [id]: "saving",
      })
    );

    soutienSaveTimers.current[
      id
    ] = setTimeout(() => {
      delete soutienSaveTimers
        .current[id];

      void saveSoutienById(id);
    }, 700);
  };

  // ==========================================================
  // UPDATE SOUTIEN LOCAL + AUTOSAVE
  // ==========================================================

  const updateSoutien = (
    id: number,
    field: keyof SoutienRow,
    value: any
  ) => {
    const current =
      soutiensRef.current.find(
        (row) =>
          row.id === id
      );

    if (!current) return;

    const updated: SoutienRow = {
      ...current,
      [field]: value,
    };

    const next =
      soutiensRef.current.map(
        (row) =>
          row.id === id
            ? updated
            : row
      );

    soutiensRef.current =
      next;

    setSoutiens(next);

    // Dès que le mois est choisi,
    // tous les autres champs sont sauvegardés automatiquement.
    if (
      updated.annee &&
      updated.mois
    ) {
      scheduleSoutienSave(id);
    }
  };

  // ==========================================================
  // DELETE SOUTIEN
  // ==========================================================

  const deleteSoutien =
    async (
      row: SoutienRow
    ) => {
      if (
        !window.confirm(
          "هل تريد حذف هذا السجل؟"
        )
      ) {
        return;
      }

      try {
        if (row.id > 0) {
          const res =
            await fetch(
              `${API}/soutiens/${row.id}`,
              {
                method:
                  "DELETE",
              }
            );

          if (!res.ok) {
            throw new Error(
              "Erreur delete"
            );
          }
        }

        if (
          soutienSaveTimers.current[
            row.id
          ]
        ) {
          clearTimeout(
            soutienSaveTimers.current[
              row.id
            ]
          );

          delete soutienSaveTimers
            .current[row.id];
        }

        const next =
          soutiensRef.current.filter(
            (item) =>
              item.id !== row.id
          );

        soutiensRef.current =
          next;

        setSoutiens(next);

        setSoutienSaveStatus(
          (prev) => {
            const copy = {
              ...prev,
            };

            delete copy[row.id];

            return copy;
          }
        );

      } catch (error) {
        console.error(error);
      }
    };

  // ==========================================================
  // SOUTIEN DE L'ANNEE SELECTIONNEE
  // ==========================================================

  const soutiensAnnee =
    useMemo(
      () =>
        soutiens.filter(
          (item) =>
            item.annee ===
            soutienYear
        ),
      [
        soutiens,
        soutienYear,
      ]
    );

  // ==========================================================
  // TOTAUX DE CET ENFANT UNIQUEMENT
  // ==========================================================
  //
  // IMPORTANT :
  // "soutiens" provient de /api/soutiens/all/{enfantid},
  // donc ces montants concernent uniquement l'enfant affiché.
  //
  // On ne compte que les lignes réellement consommées
  // (effectue === true).
  //
  // montant        = coût total consommé
  // montantPaye    = montant réellement payé par nous
  // nonPaye        = partie non payée par nous
  // ==========================================================

  const totauxSoutienEnfant =
    useMemo(() => {
      return soutiensAnnee.reduce(
        (acc, item) => {
          if (!item.effectue) {
            return acc;
          }

          const consomme =
            Number(item.montant || 0);

          const paye =
            Math.min(
              Math.max(
                Number(
                  item.montantPaye || 0
                ),
                0
              ),
              consomme
            );

          const nonPaye =
            Math.max(
              consomme - paye,
              0
            );

          acc.totalPaye += paye;
          acc.totalNonPaye += nonPaye;

          return acc;
        },
        {
          totalPaye: 0,
          totalNonPaye: 0,
        }
      );
    }, [
      soutiensAnnee,
    ]);

  // ==========================================================
  // RENDER
  // ==========================================================

  return (
    <div
      dir="rtl"
      className="p-4 md:p-6"
    >

      <PageBreadcrumb
        pageTitle="التتبع الدراسي"
      />

      {/* ================================================== */}
      {/* HEADER */}
      {/* ================================================== */}

      <div className="mb-6 rounded-3xl border border-gray-200 bg-white p-6 shadow-sm">

        <p className="text-xs font-semibold text-indigo-600">
          الملف الدراسي
        </p>

        <h1 className="mt-1 text-2xl font-bold text-gray-900">
          التتبع الدراسي والدعم الإضافي
        </h1>

        <p className="mt-1 text-sm text-gray-400">
          إدارة السنوات الدراسية والنقط والملاحظات والدروس الإضافية
        </p>

      </div>

      {/* ================================================== */}
      {/* ETUDES */}
      {/* ================================================== */}

      <section className="space-y-4">

        <div className="flex items-center justify-between">

          <div>

            <h2 className="text-xl font-bold text-gray-900">
              المسار الدراسي
            </h2>

            <p className="text-sm text-gray-400">
              النقط والنتائج حسب كل سنة دراسية
            </p>

          </div>

          <button
            type="button"
            onClick={addRow}
            className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-bold text-white hover:bg-indigo-700"
          >
            <i className="pi pi-plus" />

            إضافة سنة دراسية
          </button>

        </div>

        {rows.map((row) => (
          <div
            key={row.id}
            className="rounded-3xl border border-gray-200 bg-white p-5 shadow-sm"
          >

            <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">

              {/* ANNÉE */}

              <div>

                <label className="mb-2 block text-sm font-bold text-gray-700">
                  السنة الدراسية
                </label>

             <SchoolYearSelect
               value={row.annee}
               years={schoolYears}
               onAddYear={addSchoolYear}
               onChange={(value) =>
                 updateRow(
                   row.id,
                   "annee",
                   value
                 )
               }
             />

              </div>

              {/* NIVEAU */}

              <div>

                <label className="mb-2 block text-sm font-bold text-gray-700">
                  المستوى الدراسي
                </label>

                <Select
                  options={
                    niveauxscolaires
                  }
                  value={
                    row.niveau
                  }
                  placeholder="اختر المستوى"
                  apiUrl={`${API}/niveaux`}
                  onChange={(
                    value: any
                  ) =>
                    updateRow(
                      row.id,
                      "niveau",
                      value
                    )
                  }
                  onNewItem={(
                    option: Option
                  ) =>
                    setNiveauxscolaires(
                      (prev) => [
                        ...prev,
                        option,
                      ]
                    )
                  }
                />

              </div>

              {/* ECOLE */}

              <div>

                <label className="mb-2 block text-sm font-bold text-gray-700">
                  المؤسسة
                </label>

                <Select
                  options={
                    ecoles
                  }
                  value={
                    row.ecole
                  }
                  placeholder="اختر المؤسسة"
                  apiUrl={`${API}/ecoles`}
                  onChange={(
                    value: any
                  ) =>
                    updateRow(
                      row.id,
                      "ecole",
                      value
                    )
                  }
                  onNewItem={(
                    option: Option
                  ) =>
                    setEcoles(
                      (prev) => [
                        ...prev,
                        option,
                      ]
                    )
                  }
                />

              </div>

            </div>

            {/* NOTES */}

            <div className="mt-5 grid grid-cols-1 gap-4 md:grid-cols-3">

              <div>

                <label className="mb-2 block text-sm font-bold text-gray-700">
                  نقطة الأسدس الأول
                </label>

                <input
                  type="number"
                  step="0.01"
                  value={
                    row.note1
                  }
                  onChange={(e) =>
                    updateRow(
                      row.id,
                      "note1",
                      e.target.value
                    )
                  }
                  className="h-11 w-full rounded-xl border border-gray-200 bg-gray-50 px-3"
                />

              </div>

              <div>

                <label className="mb-2 block text-sm font-bold text-gray-700">
                  نقطة الأسدس الثاني
                </label>

                <input
                  type="number"
                  step="0.01"
                  value={
                    row.note2
                  }
                  onChange={(e) =>
                    updateRow(
                      row.id,
                      "note2",
                      e.target.value
                    )
                  }
                  className="h-11 w-full rounded-xl border border-gray-200 bg-gray-50 px-3"
                />

              </div>

              <div>

                <div className="mb-2 flex items-center justify-between">

                  <label className="text-sm font-bold text-gray-700">
                    المعدل العام
                  </label>

                  <button
                    type="button"
                    onClick={() =>
                      calculerNoteGenerale(
                        row
                      )
                    }
                    className="text-xs font-bold text-indigo-600"
                  >
                    حساب تلقائي
                  </button>

                </div>

                <input
                  type="number"
                  step="0.01"
                  value={
                    row.noteGenerale
                  }
                  onChange={(e) =>
                    updateRow(
                      row.id,
                      "noteGenerale",
                      e.target.value
                    )
                  }
                  className="h-11 w-full rounded-xl border border-gray-200 bg-gray-50 px-3 font-bold text-indigo-700"
                />

              </div>

            </div>

            {/* RESULTAT */}

            <div className="mt-5">

              <label className="mb-2 block text-sm font-bold text-gray-700">
                النتيجة
              </label>

              <select
                value={
                  row.resultat
                }
                onChange={(e) =>
                  updateRow(
                    row.id,
                    "resultat",
                    e.target.value
                  )
                }
                className="h-11 w-full max-w-sm rounded-xl border border-gray-200 bg-gray-50 px-3"
              >

                <option value="">
                  -- اختر --
                </option>

                <option value="ناجح">
                  ناجح
                </option>

                <option value="مكرر">
                  مكرر
                </option>

              </select>

            </div>

            {/* DETAILS */}

            <div className="mt-5">

              <label className="mb-2 block text-sm font-bold text-gray-700">
                ملاحظات وتفاصيل إضافية
              </label>

              <div className="overflow-hidden rounded-2xl border border-gray-200">

                <Editor
                  value={
                    row.details
                  }
                  onTextChange={(
                    e
                  ) =>
                    updateRow(
                      row.id,
                      "details",
                      e.htmlValue ??
                        ""
                    )
                  }
                  style={{
                    height:
                      "200px",
                  }}
                />

              </div>

            </div>

            {/* ACTIONS / AUTOSAVE */}

            <div className="mt-5 flex items-center justify-between gap-3 border-t border-gray-100 pt-4">

              <div className="flex items-center gap-2 text-xs font-semibold">

                {etudeSaveStatus[row.id] === "saving" && (
                  <>
                    <i className="pi pi-spin pi-spinner text-indigo-500" />
                    <span className="text-indigo-600">
                      جارٍ الحفظ...
                    </span>
                  </>
                )}

                {etudeSaveStatus[row.id] === "saved" && (
                  <>
                    <span className="h-2 w-2 rounded-full bg-emerald-500" />
                    <span className="text-emerald-600">
                      تم الحفظ تلقائيا
                    </span>
                  </>
                )}

                {etudeSaveStatus[row.id] === "error" && (
                  <>
                    <i className="pi pi-exclamation-triangle text-red-500" />
                    <span className="text-red-600">
                      تعذر الحفظ
                    </span>
                  </>
                )}

                {(!etudeSaveStatus[row.id] ||
                  etudeSaveStatus[row.id] === "idle") && (
                  <>
                    <span className="h-2 w-2 rounded-full bg-gray-300" />
                    <span className="text-gray-400">
                      يتم الحفظ تلقائيا بعد اختيار المستوى
                    </span>
                  </>
                )}

              </div>

              <button
                type="button"
                onClick={() =>
                  deleteRow(row)
                }
                className="rounded-xl border border-red-200 bg-red-50 px-4 py-2 text-sm font-bold text-red-600"
              >
                حذف
              </button>

            </div>

          </div>
        ))}

      </section>

      {/* ================================================== */}
      {/* SOUTIEN SCOLAIRE */}
      {/* ================================================== */}

      <section className="mt-10">

        <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">

          <div>

            <p className="text-xs font-semibold text-emerald-600">
              الدعم الدراسي
            </p>

            <h2 className="text-xl font-bold text-gray-900">
              الساعات والدروس الإضافية
            </h2>

          </div>

          <div className="flex flex-wrap gap-2">

           <SchoolYearSelect
             value={soutienYear}
             years={schoolYears}
             onAddYear={addSchoolYear}
             onChange={(value) =>
               setSoutienYear(value)
             }
             className="min-w-[260px]"
           />

            <button
              type="button"
              onClick={
                addSoutien
              }
              className="rounded-xl bg-emerald-600 px-4 py-2 text-sm font-bold text-white"
            >
              + إضافة دعم
            </button>

          </div>

        </div>

        {/* TOTAUX DE L'ENFANT UNIQUEMENT */}

        <div className="mb-4 grid grid-cols-1 gap-4 md:grid-cols-2">

          {/* PAYE */}

          <div className="rounded-2xl border border-emerald-100 bg-emerald-50 p-5">

            <p className="text-sm font-semibold text-gray-500">
              إجمالي المبلغ المؤدى لهذا الطفل
            </p>

            <p className="mt-1 text-3xl font-bold text-emerald-700">
              {totauxSoutienEnfant.totalPaye.toLocaleString(
                "fr-FR",
                {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                }
              )}{" "}
              DH
            </p>

            <p className="mt-1 text-xs text-emerald-600">
              {soutienYear}
            </p>

          </div>

          {/* NON PAYE PAR NOUS */}

          <div className="rounded-2xl border border-amber-100 bg-amber-50 p-5">

            <p className="text-sm font-semibold text-gray-500">
              إجمالي المبلغ غير المؤدى من طرفنا لهذا الطفل
            </p>

            <p className="mt-1 text-3xl font-bold text-amber-700">
              {totauxSoutienEnfant.totalNonPaye.toLocaleString(
                "fr-FR",
                {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                }
              )}{" "}
              DH
            </p>

            <p className="mt-1 text-xs text-amber-600">
              {soutienYear}
            </p>

          </div>

        </div>

        {/* TABLE */}

        <div className="overflow-x-auto rounded-3xl border border-gray-200 bg-white shadow-sm">

          <table className="min-w-[1100px] w-full text-right text-sm">

            <thead className="bg-gray-50 text-gray-600">

              <tr>
<th className="p-4">
  السنة الدراسية
</th>
                <th className="p-4">
                  الشهر
                </th>

                <th className="p-4">
                  المركز
                </th>

                <th className="p-4">
                  الأستاذ / الجهة
                </th>

                <th className="p-4">
                  المبلغ المستهلك
                </th>

                <th className="p-4">
                  المبلغ المؤدى من طرفنا
                </th>

                <th className="p-4 text-center">
                  تمت الاستفادة
                </th>

                <th className="p-4 text-center">
                  العمليات
                </th>

              </tr>

            </thead>

            <tbody>

              {soutiensAnnee.map(
                (item) => (
                  <tr
                    key={item.id}
                    className="border-t border-gray-100"
                  >
{/* ANNEE SCOLAIRE */}

<td className="p-3">
  <span className="inline-flex whitespace-nowrap rounded-xl bg-indigo-50 px-3 py-2 text-sm font-bold text-indigo-700">
    {item.annee}
  </span>
</td>
                    {/* MOIS */}

                    <td className="p-3">

                      <select
                        value={
                          item.mois
                        }
                        onChange={(
                          e
                        ) =>
                          updateSoutien(
                            item.id,
                            "mois",
                            e.target
                              .value
                          )
                        }
                        className="h-10 w-full rounded-xl border border-gray-200 bg-gray-50 px-3"
                      >

                        <option value="">
                          اختر الشهر
                        </option>

                        {MONTHS.map(
                          (month) => (
                            <option
                              key={
                                month
                              }
                              value={
                                month
                              }
                            >
                              {month}
                            </option>
                          )
                        )}

                      </select>

                    </td>

                    {/* CENTRE */}

                    <td className="p-3">

                      <input
                        value={
                          item.centre
                        }
                        onChange={(
                          e
                        ) =>
                          updateSoutien(
                            item.id,
                            "centre",
                            e.target
                              .value
                          )
                        }
                        placeholder="اسم المركز"
                        className="h-10 w-full rounded-xl border border-gray-200 bg-gray-50 px-3"
                      />

                    </td>

                    {/* PROF */}

                    <td className="p-3">

                      <input
                        value={
                          item.intervenant
                        }
                        onChange={(
                          e
                        ) =>
                          updateSoutien(
                            item.id,
                            "intervenant",
                            e.target
                              .value
                          )
                        }
                        placeholder="الأستاذ أو الجهة"
                        className="h-10 w-full rounded-xl border border-gray-200 bg-gray-50 px-3"
                      />

                    </td>

                    {/* MONTANT CONSOMME */}

                    <td className="p-3">

                      <div className="relative">

                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          value={
                            item.montant
                          }
                          onChange={(
                            e
                          ) =>
                            updateSoutien(
                              item.id,
                              "montant",
                              e.target
                                .value
                            )
                          }
                          className="h-10 w-full rounded-xl border border-gray-200 bg-gray-50 px-3 pl-12 font-bold text-emerald-700"
                        />

                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-gray-400">
                          DH
                        </span>

                      </div>

                    </td>

                    {/* MONTANT PAYE PAR NOUS */}

                    <td className="p-3">

                      <div className="relative">

                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          max={
                            Number(
                              item.montant || 0
                            )
                          }
                          value={
                            item.montantPaye
                          }
                          onChange={(
                            e
                          ) => {
                            const brut =
                              e.target.value;

                            if (brut === "") {
                              updateSoutien(
                                item.id,
                                "montantPaye",
                                ""
                              );

                              return;
                            }

                            const consomme =
                              Number(
                                item.montant || 0
                              );

                            const paye =
                              Math.max(
                                0,
                                Math.min(
                                  Number(brut),
                                  consomme
                                )
                              );

                            updateSoutien(
                              item.id,
                              "montantPaye",
                              paye
                            );
                          }}
                          className="h-10 w-full rounded-xl border border-gray-200 bg-gray-50 px-3 pl-12 font-bold text-violet-700"
                        />

                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-gray-400">
                          DH
                        </span>

                      </div>

                      {Number(
                        item.montant || 0
                      ) >
                        Number(
                          item.montantPaye || 0
                        ) && (
                        <p className="mt-1 text-[11px] font-semibold text-amber-600">
                          غير مؤدى من طرفنا:{" "}
                          {(
                            Number(
                              item.montant || 0
                            ) -
                            Number(
                              item.montantPaye || 0
                            )
                          ).toFixed(2)}{" "}
                          DH
                        </p>
                      )}

                    </td>

                    {/* EFFECTUE */}

                    <td className="p-3 text-center">

                      <input
                        type="checkbox"
                        checked={
                          item.effectue
                        }
                        onChange={(
                          e
                        ) =>
                          updateSoutien(
                            item.id,
                            "effectue",
                            e.target
                              .checked
                          )
                        }
                        className="h-5 w-5 accent-emerald-600"
                      />

                    </td>

                    {/* ACTIONS */}

                    <td className="p-3">

                      <div className="flex items-center justify-center gap-3">

                        <span
                          className="inline-flex min-w-[88px] items-center justify-center gap-1 text-[11px] font-semibold"
                          title="الحفظ التلقائي"
                        >

                          {soutienSaveStatus[item.id] === "saving" && (
                            <>
                              <i className="pi pi-spin pi-spinner text-indigo-500" />
                              <span className="text-indigo-600">
                                جارٍ الحفظ
                              </span>
                            </>
                          )}

                          {soutienSaveStatus[item.id] === "saved" && (
                            <>
                              <span className="h-2 w-2 rounded-full bg-emerald-500" />
                              <span className="text-emerald-600">
                                محفوظ
                              </span>
                            </>
                          )}

                          {soutienSaveStatus[item.id] === "error" && (
                            <>
                              <i className="pi pi-exclamation-triangle text-red-500" />
                              <span className="text-red-600">
                                خطأ
                              </span>
                            </>
                          )}

                          {(!soutienSaveStatus[item.id] ||
                            soutienSaveStatus[item.id] === "idle") && (
                            <>
                              <span className="h-2 w-2 rounded-full bg-gray-300" />
                              <span className="text-gray-400">
                                تلقائي
                              </span>
                            </>
                          )}

                        </span>

                        <button
                          type="button"
                          onClick={() =>
                            deleteSoutien(
                              item
                            )
                          }
                          className="rounded-lg bg-red-50 px-3 py-2 text-xs font-bold text-red-600"
                        >
                          حذف
                        </button>

                      </div>

                    </td>

                  </tr>
                )
              )}

              {soutiensAnnee.length ===
                0 && (
                <tr>

                  <td
                    colSpan={8}
                    className="p-10 text-center text-gray-400"
                  >
                    لا توجد بيانات دعم لهذه السنة
                  </td>

                </tr>
              )}

            </tbody>

          </table>

        </div>

      </section>

    </div>
  );
}