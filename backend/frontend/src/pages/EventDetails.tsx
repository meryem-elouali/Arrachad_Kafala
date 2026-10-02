import React, { useEffect, useMemo, useRef, useState } from "react";
import { useParams } from "react-router-dom";
import PageBreadcrumb from "../components/common/PageBreadCrumb";
import PageMeta from "../components/common/PageMeta";
import DropzoneComponent1 from "../components/form/form-elements/DropZone1";
import * as XLSX from "xlsx";
import { EditorContent, useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import TextAlign from "@tiptap/extension-text-align";
import { Color } from "@tiptap/extension-color";
import { TextStyle } from "@tiptap/extension-text-style";
import { pdf } from "@react-pdf/renderer";
import ParticipantsPdf, { ParticipantRow } from "./ParticipantsPdf";
import EventPdf from "./EventPdf";

const API = "http://localhost:8080/api";

/* ============================== TYPES ============================== */
type ParticipantType = "MERE" | "ENFANT" | "FAMILLE";
type Cible = ParticipantType;
type TypeMontant = "GLOBAL" | "DISTRIBUE";
type ModeRepartition = "EGAL" | "DEGRE";

interface Participant {
  id: number;
  nom?: string;
  prenom?: string;
  age?: number;
  present?: boolean;
  motif?: string;
  montant?: number;
  degreFamille?: number | null; // null = degré non défini
  uniqueKey?: string;
  type?: ParticipantType;
  mere?: { id?: number };
  mereId?: number;
  enfants?: Array<{ id?: number }>;
  famille?: any;
  familleId?: number;
  pere?: { nom?: string; prenom?: string };
}

interface EventFile {
  base64: string;
  type: string;
  name: string;
}

interface EventTypeOption {
  id: number;
  name: string;
}

interface EventDetail {
  id: number;
  title: string;
  startDate: string;
  endDate: string;
  place?: string;
  anneeScolaire?: string;
  sawaedAlKhayr?: boolean;
  eventType?: EventTypeOption;
  cibles: string[];
  description?: string;
  photos?: EventFile[];
  ageMin?: number | null;
  ageMax?: number | null;
  degresFamille?: number[]; // 0 = degré non défini
  meresParticipants?: Participant[];
  enfantsParticipants?: Participant[];
  famillesParticipants?: Participant[];
  montantTotal?: number;
  montantDegresDefinis?: number;
  montantMouawiz?: number;
  montantSawaedAlKhayr?: number;
  montantNonVentile?: number;
  typeMontant?: TypeMontant;
  modeRepartition?: ModeRepartition;
  montantGlobal?: number;
  montantEgal?: number;
  montantsParDegre?: Record<number, number>;
  chargeSupplementaire?: number;
  chargeSupplementaireLabel?: string;
}

/* ============================== HELPERS ============================== */
const formatMoney = (value: number) => `${Number(value || 0).toFixed(2)} DH`;

const degreLabel = (d: number | null | undefined) =>
  d == null || d === 0 ? "غير محدد" : `الدرجة ${d}`;

const CIBLE_LABEL: Record<string, string> = { MERE: "أم", ENFANT: "طفل", FAMILLE: "عائلة" };
const getCibleLabel = (c: string) => CIBLE_LABEL[c] || c;
const getParticipantTypeLabel = (t?: ParticipantType) => (t ? CIBLE_LABEL[t] : "");

const participantKey = (type: ParticipantType, id: number) => `${type}-${id}`;

const getAnneeScolaireFromDate = (dateStr: string) => {
  if (!dateStr) return "";
  const [y, m] = dateStr.split("-");
  const year = Number(y);
  const month = Number(m);
  if (!year || !month) return "";
  return month >= 9 ? `${year}/${year + 1}` : `${year - 1}/${year}`;
};

const convertToBase64 = (file: File): Promise<string> =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
  });

const isImageFile = (file: EventFile) => {
  const type = (file.type || "").toLowerCase();
  const name = (file.name || "").toLowerCase();

  return (
    type.startsWith("image/") ||
    /\.(jpg|jpeg|png|webp|gif|bmp|svg)$/.test(name)
  );
};

const isPdfFile = (file: EventFile) => {
  const type = (file.type || "").toLowerCase();
  const name = (file.name || "").toLowerCase();

  return type === "application/pdf" || name.endsWith(".pdf");
};

const getFileExtension = (file: EventFile) => {
  const name = file.name || "";
  const parts = name.split(".");
  return parts.length > 1 ? parts.pop()?.toUpperCase() || "FILE" : "FILE";
};

const getJson = async (url: string): Promise<any[]> => {
  try {
    const r = await fetch(url);
    return r.ok ? await r.json() : [];
  } catch {
    return [];
  }
};

const downloadBlob = (blob: Blob, filename: string) => {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
};

const putJson = (url: string, body: unknown) =>
  fetch(url, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

const inputCls = "h-11 w-full rounded-xl border border-gray-200 bg-white px-3";
const labelCls = "mb-2 block text-sm font-bold text-gray-700";
const cardCls =
  "mb-6 overflow-hidden rounded-3xl border border-gray-200 bg-white shadow-sm dark:border-gray-800 dark:bg-gray-900";

/* ============================== PAGE ============================== */
const EventDetails: React.FC = () => {
  const { id } = useParams();

  const [event, setEvent] = useState<EventDetail | null>(null);
  const [loading, setLoading] = useState(true);

  const [allMeres, setAllMeres] = useState<Participant[]>([]);
  const [allEnfants, setAllEnfants] = useState<Participant[]>([]);
  const [allFamilles, setAllFamilles] = useState<Participant[]>([]);
  const [eventTypes, setEventTypes] = useState<EventTypeOption[]>([]);

  const [participantsList, setParticipantsList] = useState<Participant[]>([]);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [selectedParticipants, setSelectedParticipants] = useState<string[]>([]);
  const [searchParticipant, setSearchParticipant] = useState("");
  const [selectAll, setSelectAll] = useState(false);
  const [isParticipantModalOpen, setIsParticipantModalOpen] = useState(false);

  const [existingFiles, setExistingFiles] = useState<EventFile[]>([]);
  const [selectedFilePreview, setSelectedFilePreview] = useState<EventFile | null>(null);
  const [description, setDescription] = useState("");

  const [typeMontant, setTypeMontant] = useState<TypeMontant>("GLOBAL");
  const [modeRepartition, setModeRepartition] = useState<ModeRepartition>("EGAL");
  const [montantGlobal, setMontantGlobal] = useState(0);
  const [montantEgal, setMontantEgal] = useState(0);
  const [montantsParDegre, setMontantsParDegre] = useState<Record<number, number>>({});
  const [chargeSupp, setChargeSupp] = useState(0);
  const [chargeSuppLabel, setChargeSuppLabel] = useState("");

  const [isSaving, setIsSaving] = useState(false);
  const [isSaved, setIsSaved] = useState(true);
  const [isExportingEvent, setIsExportingEvent] = useState(false);

  // modification des infos
  const [isEditInfoOpen, setIsEditInfoOpen] = useState(false);
  const [isEditInfoSaving, setIsEditInfoSaving] = useState(false);
  const [editTitle, setEditTitle] = useState("");
  const [editPlace, setEditPlace] = useState("");
  const [editStartDate, setEditStartDate] = useState("");
  const [editEndDate, setEditEndDate] = useState("");
  const [editAnneeScolaire, setEditAnneeScolaire] = useState("");
  const [editEventTypeId, setEditEventTypeId] = useState<number | "">("");
  const [editCibles, setEditCibles] = useState<Cible[]>([]);
  const [editAgeMin, setEditAgeMin] = useState<number | "">("");
  const [editAgeMax, setEditAgeMax] = useState<number | "">("");
  const [editDegresFamille, setEditDegresFamille] = useState<number[]>([]);
  const [editSawaedAlKhayr, setEditSawaedAlKhayr] = useState(false);

  // vrai juste après un chargement serveur : évite de re-sauvegarder ce qu'on vient de recevoir
  const skipNextSave = useRef(true);

  /* ---------- Éditeur ---------- */
  const editor = useEditor({
    extensions: [
      StarterKit,
      TextStyle,
      Color,
      TextAlign.configure({ types: ["heading", "paragraph"] }),
    ],
    content: description,
    editorProps: {
      attributes: {
        dir: "rtl",
        class:
          "min-h-[240px] px-5 py-4 text-right text-[15px] leading-8 text-gray-700 dark:text-gray-200 focus:outline-none",
      },
    },
    onUpdate: ({ editor }) => setDescription(editor.getHTML()),
  });

  const currentYear = new Date().getFullYear();
  const anneesScolaires = Array.from({ length: 21 }, (_, i) => {
    const start = currentYear - 10 + i;
    return `${start}/${start + 1}`;
  });

  /* ---------- Chargement ---------- */
  const applyEventData = (data: EventDetail) => {
    skipNextSave.current = true;

    setEvent(data);
    setDescription(data.description || "");
    setExistingFiles(data.photos || []);
    setTypeMontant(data.typeMontant || "GLOBAL");
    setModeRepartition(data.modeRepartition || "EGAL");
    setMontantGlobal(Number(data.montantGlobal || 0));
    setMontantEgal(Number(data.montantEgal || 0));
    setMontantsParDegre(data.montantsParDegre || {});
    setChargeSupp(Number(data.chargeSupplementaire || 0));
    setChargeSuppLabel(data.chargeSupplementaireLabel || "");

    const rows: Participant[] = [];
    const add = (list: Participant[] | undefined, type: ParticipantType) =>
      (list || []).forEach((p) =>
        rows.push({ ...p, type, uniqueKey: participantKey(type, p.id) })
      );
    add(data.meresParticipants, "MERE");
    add(data.enfantsParticipants, "ENFANT");
    add(data.famillesParticipants, "FAMILLE");
    setParticipantsList(rows);
  };

  const reloadEvent = async () => {
    if (!id) return;
    const res = await fetch(`${API}/events/${id}`);
    if (!res.ok) throw new Error("Erreur chargement événement");
    applyEventData(await res.json());
  };

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const [meres, enfants, familles, types] = await Promise.all([
          getJson(`${API}/meres`).then((r) => (r.length ? r : getJson(`${API}/mere`))),
          getJson(`${API}/enfant`),
          getJson(`${API}/famille`),
          getJson(`${API}/events/event-types`),
        ]);
        setAllMeres(meres);
        setAllEnfants(enfants);
        setAllFamilles(familles);
        setEventTypes(types);
        await reloadEvent();
      } catch (error) {
        console.error(error);
      } finally {
        setLoading(false);
      }
    };
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  useEffect(() => {
    if (!editor || editor.isDestroyed || !event) return;
    editor.commands.setContent(event.description || "", { emitUpdate: false });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editor, event?.id]);

  /* ---------- Degré d'un participant (null = non défini) ---------- */
  const resolveDegreParticipant = (p: Participant): number | null => {
    if (p.degreFamille != null) return Number(p.degreFamille);

    let famille: any;

    if (p.type === "FAMILLE") {
      famille = allFamilles.find((f) => Number(f.id) === Number(p.id));
    } else if (p.type === "MERE") {
      famille = allFamilles.find(
        (f: any) => Number(f?.mere?.id ?? f?.mereId) === Number(p.id)
      );
    } else if (p.type === "ENFANT") {
      famille = allFamilles.find(
        (f: any) =>
          Array.isArray(f?.enfants) &&
          f.enfants.some((e: any) => Number(e?.id) === Number(p.id))
      );
      if (!famille) {
        const enfant: any = allEnfants.find((e) => Number(e.id) === Number(p.id));
        const mereId = enfant?.mere?.id ?? enfant?.mereId;
        if (mereId != null) {
          famille = allFamilles.find(
            (f: any) => Number(f?.mere?.id ?? f?.mereId) === Number(mereId)
          );
        }
      }
    }

    const value = famille?.degreFamille ?? famille?.degre ?? famille?.degree;
    return value != null ? Number(value) : null;
  };

  /* ---------- Montants ---------- */
  const getMontantParticipant = (p: Participant) => {
    if (typeMontant === "GLOBAL") return 0;
    if (modeRepartition === "EGAL") return Number(montantEgal || 0);
    const degre = resolveDegreParticipant(p);
    return Number(montantsParDegre[degre == null ? 0 : degre] || 0);
  };

  const totalPar = (type: ParticipantType) =>
    typeMontant !== "DISTRIBUE"
      ? 0
      : participantsList
          .filter((p) => p.type === type)
          .reduce((t, p) => t + getMontantParticipant(p), 0);

  const montantBase =
    typeMontant === "GLOBAL"
      ? Number(montantGlobal || 0)
      : totalPar("MERE") + totalPar("ENFANT") + totalPar("FAMILLE");

  const montantTotalEvent = montantBase + Number(chargeSupp || 0);

  const participantsDegreDefini = participantsList.filter(
    (p) => resolveDegreParticipant(p) != null
  );
  const participantsDegreNonDefini = participantsList.filter(
    (p) => resolveDegreParticipant(p) == null
  );
  const parDegre = typeMontant === "DISTRIBUE" && modeRepartition === "DEGRE";
  const distribue = typeMontant === "DISTRIBUE";
  const sumMontants = (list: Participant[]) =>
    list.reduce((t, p) => t + getMontantParticipant(p), 0);

  const isSawaedAlKhayr = event?.sawaedAlKhayr === true;

  // ============================================================
  // CLASSEMENT COMPTABLE EXCLUSIF
  // - سواعد الخير : tout le montant de l'événement
  // - sinon : degré défini / معوز
  // - si un GLOBAL mélange les deux : non ventilé
  // ============================================================
  let montantDegresDefinisAffiche = 0;
  let montantMouawizAffiche = 0;
  let montantSawaedAlKhayr = 0;
  let montantNonVentileAffiche = 0;

  if (isSawaedAlKhayr) {
    montantSawaedAlKhayr = montantTotalEvent;
  } else if (distribue) {
    montantDegresDefinisAffiche = sumMontants(participantsDegreDefini);
    montantMouawizAffiche = sumMontants(participantsDegreNonDefini);

    // Une charge supplémentaire n'est attribuée arbitrairement
    // ni aux degrés définis ni aux معوز.
    montantNonVentileAffiche = Number(chargeSupp || 0);
  } else {
    const hasDefined = participantsDegreDefini.length > 0;
    const hasMouawiz = participantsDegreNonDefini.length > 0;

    if (hasDefined && !hasMouawiz) {
      montantDegresDefinisAffiche = montantTotalEvent;
    } else if (hasMouawiz && !hasDefined) {
      montantMouawizAffiche = montantTotalEvent;
    } else if (!hasDefined && !hasMouawiz) {
      const degres = event?.degresFamille || [];
      const hasZero = degres.includes(0);
      const hasRealDegree = degres.some((d) => Number(d) > 0);

      if (hasRealDegree && !hasZero) {
        montantDegresDefinisAffiche = montantTotalEvent;
      } else if (hasZero && !hasRealDegree) {
        montantMouawizAffiche = montantTotalEvent;
      } else {
        montantNonVentileAffiche = montantTotalEvent;
      }
    } else {
      montantNonVentileAffiche = montantTotalEvent;
    }
  }

  const montantDegreeOptions = useMemo(() => {
    if (event?.degresFamille?.length) {
      return Array.from(new Set(event.degresFamille.map(Number)));
    }
    return [1, 2, 3, 0];
  }, [event?.degresFamille]);

  /* ---------- Sauvegarde ---------- */
  const saveEventDetails = async () => {
    if (!event) return;
    setIsSaving(true);
    setIsSaved(false);

    const mapType = (type: ParticipantType) =>
      participantsList
        .filter((p) => p.type === type)
        .map((p) => ({
          id: p.id,
          present: p.present ?? true,
          motif: p.motif ?? null,
          montant: typeMontant === "DISTRIBUE" ? getMontantParticipant(p) : 0,
        }));

    const payload = {
      extendedProps: {
        typeMontant,
        modeRepartition: typeMontant === "DISTRIBUE" ? modeRepartition : null,
        montantGlobal: typeMontant === "GLOBAL" ? montantGlobal : 0,
        montantEgal: parDegre || typeMontant === "GLOBAL" ? 0 : montantEgal,
        montantsParDegre: parDegre ? montantsParDegre : {},
        montantTotal: montantTotalEvent,
        chargeSupplementaire: chargeSupp,
        chargeSupplementaireLabel: chargeSuppLabel,
        description,
        meresParticipants: mapType("MERE"),
        enfantsParticipants: mapType("ENFANT"),
        famillesParticipants: mapType("FAMILLE"),
      },
    };

    try {
      const res = await putJson(`${API}/events/details/${event.id}`, payload);
      if (!res.ok) throw new Error(await res.text());
      setIsSaved(true);
    } catch (error) {
      console.error(error);
      setIsSaved(false);
    } finally {
      setIsSaving(false);
    }
  };

  // sauvegarde automatique (ignore le tout premier changement venant du chargement)
  useEffect(() => {
    if (!event || loading) return;
    if (skipNextSave.current) {
      skipNextSave.current = false;
      return;
    }
    setIsSaved(false);
    const timer = window.setTimeout(() => saveEventDetails(), 650);
    return () => window.clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    description,
    participantsList,
    typeMontant,
    modeRepartition,
    montantGlobal,
    montantEgal,
    montantsParDegre,
    chargeSupp,
    chargeSuppLabel,
  ]);

  /* ---------- Modification des infos ---------- */
  const openEditEventInfo = () => {
    if (!event) return;
    setEditTitle(event.title || "");
    setEditPlace(event.place || "");
    setEditStartDate(event.startDate || "");
    setEditEndDate(event.endDate || "");
    setEditAnneeScolaire(event.anneeScolaire || getAnneeScolaireFromDate(event.startDate));
    setEditEventTypeId(event.eventType?.id ?? "");
    setEditCibles(
      (event.cibles || []).filter(
        (c): c is Cible => c === "MERE" || c === "ENFANT" || c === "FAMILLE"
      )
    );
    setEditAgeMin(event.ageMin ?? "");
    setEditAgeMax(event.ageMax ?? "");
    setEditDegresFamille((event.degresFamille || []).map(Number));
    setEditSawaedAlKhayr(event.sawaedAlKhayr === true);
    setIsEditInfoOpen(true);
  };

  const toggleEditCible = (value: Cible) =>
    setEditCibles((prev) => {
      if (prev.includes(value)) return prev.filter((c) => c !== value);
      if (value === "FAMILLE") return ["FAMILLE"];
      return [...prev.filter((c) => c !== "FAMILLE"), value];
    });

  const toggleEditDegre = (degre: number) =>
    setEditDegresFamille((prev) =>
      prev.includes(degre) ? prev.filter((d) => d !== degre) : [...prev, degre]
    );

  const saveEventInfo = async () => {
    if (!event) return;

    if (
      !editTitle.trim() ||
      !editPlace.trim() ||
      !editStartDate ||
      !editEndDate ||
      !editAnneeScolaire ||
      !editEventTypeId ||
      editCibles.length === 0
    ) {
      alert("يرجى ملء جميع المعلومات الأساسية للنشاط.");
      return;
    }
    if (editEndDate < editStartDate) {
      alert("تاريخ النهاية يجب أن يكون بعد أو يساوي تاريخ البداية.");
      return;
    }

    const isEnfant = editCibles.includes("ENFANT");
    const payload = {
      title: editTitle.trim(),
      start: editStartDate,
      end: editEndDate,
      extendedProps: {
        cibles: editCibles,
        degresFamille: editDegresFamille,
        ageMin: isEnfant && editAgeMin !== "" ? Number(editAgeMin) : null,
        ageMax: isEnfant && editAgeMax !== "" ? Number(editAgeMax) : null,
        eventType: { id: Number(editEventTypeId) },
        place: editPlace.trim(),
        anneeScolaire: editAnneeScolaire,
        sawaedAlKhayr: editSawaedAlKhayr,
      },
    };

    try {
      setIsEditInfoSaving(true);
      const res = await putJson(`${API}/events/${event.id}`, payload);
      if (!res.ok) throw new Error(await res.text());
      await reloadEvent();
      setIsEditInfoOpen(false);
    } catch (error) {
      console.error(error);
      alert("تعذر تعديل معلومات النشاط.");
    } finally {
      setIsEditInfoSaving(false);
    }
  };

  /* ---------- Fichiers ---------- */
  const pushFiles = async (files: EventFile[]) => {
    if (!event) return;

    const res = await putJson(`${API}/events/details/${event.id}`, {
      extendedProps: { files },
    });

    if (!res.ok) {
      throw new Error(await res.text());
    }

    setExistingFiles(files);
  };

  const saveFiles = async (selectedFiles: File[]) => {
    const newFiles = await Promise.all(
      selectedFiles.map(async (file) => ({
        base64: await convertToBase64(file),
        type: file.type,
        name: file.name,
      }))
    );

    await pushFiles([...existingFiles, ...newFiles]);

    // Afficher directement le premier fichier choisi s'il peut être prévisualisé.
    const firstPreviewable = newFiles.find(
      (file) => isImageFile(file) || isPdfFile(file)
    );

    if (firstPreviewable) {
      setSelectedFilePreview(firstPreviewable);
    }
  };

  const deleteFile = async (index: number) => {
    const fileToDelete = existingFiles[index];

    if (
      selectedFilePreview &&
      fileToDelete &&
      selectedFilePreview.base64 === fileToDelete.base64
    ) {
      setSelectedFilePreview(null);
    }

    await pushFiles(existingFiles.filter((_, i) => i !== index));
  };

  const openFile = (file: EventFile) => {
    if (isImageFile(file) || isPdfFile(file)) {
      setSelectedFilePreview(file);
      return;
    }

    window.open(file.base64, "_blank", "noopener,noreferrer");
  };

  /* ---------- Sélection des participants ---------- */
  const openParticipantModal = () => {
    if (!event) return;
    const cibles = (event.cibles || []).map((c) => String(c).toUpperCase());
    const list: Participant[] = [];
    const push = (p: Participant, type: ParticipantType) =>
      list.push({ ...p, type, uniqueKey: participantKey(type, p.id) });

    if (cibles.includes("MERE")) allMeres.forEach((p) => push(p, "MERE"));

    if (cibles.includes("ENFANT")) {
      const min = event.ageMin ?? 0;
      const max = event.ageMax ?? 200;
      allEnfants
        .filter((p) => p.age == null || (p.age >= min && p.age <= max))
        .forEach((p) => push(p, "ENFANT"));
    }

    if (cibles.includes("FAMILLE")) {
      const degres = event.degresFamille || [];
      allFamilles
        .filter((p: any) => {
          if (degres.length === 0) return true;
          const d = p?.degreFamille ?? p?.degre ?? p?.degree;
          return d == null ? degres.includes(0) : degres.includes(Number(d));
        })
        .forEach((p) => push(p, "FAMILLE"));
    }

    const currentKeys = participantsList
      .map((p) => p.uniqueKey)
      .filter((k): k is string => Boolean(k));

    setParticipants(list);
    setSelectedParticipants(currentKeys);
    setSelectAll(list.length > 0 && list.every((p) => currentKeys.includes(p.uniqueKey!)));
    setSearchParticipant("");
    setIsParticipantModalOpen(true);
  };

  const toggleParticipant = (p: Participant) => {
    if (!p.uniqueKey || !p.type) return;
    setSelectedParticipants((prev) =>
      prev.includes(p.uniqueKey!) ? prev.filter((k) => k !== p.uniqueKey) : [...prev, p.uniqueKey!]
    );
  };

  const toggleSelectAll = () => {
    if (selectAll) {
      setSelectedParticipants([]);
      setSelectAll(false);
    } else {
      setSelectedParticipants(participants.map((p) => p.uniqueKey!).filter(Boolean));
      setSelectAll(true);
    }
  };

  const confirmParticipants = () => {
    const selected = participants
      .filter((p) => p.uniqueKey && selectedParticipants.includes(p.uniqueKey))
      .map((p) => {
        const previous = participantsList.find((old) => old.uniqueKey === p.uniqueKey);
        return previous ? { ...p, ...previous } : { ...p, present: true, motif: "" };
      });
    setParticipantsList(selected);
    setIsParticipantModalOpen(false);
  };

  const filteredParticipants = participants.filter((p) => {
    const s = searchParticipant.trim().toLowerCase();
    if (!s) return true;
    return (
      p.nom?.toLowerCase().includes(s) ||
      p.prenom?.toLowerCase().includes(s) ||
      p.pere?.nom?.toLowerCase().includes(s)
    );
  });

  const updateParticipant = (key: string | undefined, patch: Partial<Participant>) =>
    setParticipantsList((prev) =>
      prev.map((row) => (row.uniqueKey === key ? { ...row, ...patch } : row))
    );

  /* ---------- Exports ---------- */
  const familleOf = (p: Participant): any =>
    p.type === "FAMILLE" ? allFamilles.find((f) => f.id === p.id) : undefined;

  const pereNomOf = (p: Participant) => p.pere?.nom || familleOf(p)?.pere?.nom || "";

  const buildRows = (): ParticipantRow[] =>
    participantsList.map((p) => {
      const degre = resolveDegreParticipant(p);
      return {
        typeLabel: getParticipantTypeLabel(p.type),
        prefixe: p.type === "FAMILLE" ? "عائلة" : "",
        nomComplet:
          p.type === "FAMILLE"
            ? pereNomOf(p)
            : `${p.nom || ""} ${p.prenom || ""}`.trim(),
        degre: degre == null ? "غير محدد" : String(degre),
        montant:
          typeMontant === "GLOBAL" ? "-" : `${getMontantParticipant(p).toFixed(2)} DH`,
        present: p.present ?? true,
        motif: p.motif || "",
      };
    });

  const exportParticipantsPdf = async () => {
    if (!event) return;
    const blob = await pdf(
      <ParticipantsPdf
        title={event.title}
        startDate={event.startDate}
        endDate={event.endDate}
        place={event.place || ""}
        rows={buildRows()}
        showMontant
        montantTotal={`${montantTotalEvent.toFixed(2)} DH`}
      />
    ).toBlob();
    downloadBlob(blob, `المشاركون_${event.title}.pdf`);
  };

  const exportEventPdf = async () => {
    if (!event) return;
    setIsExportingEvent(true);
    try {
      const blob = await pdf(
        <EventPdf
          event={event}
          description={description}
          rows={buildRows()}
          files={existingFiles}
          typeMontant={typeMontant}
          modeRepartition={modeRepartition}
          montantGlobal={montantGlobal}
          montantEgal={montantEgal}
          montantTotal={montantTotalEvent}
          montantsParDegre={montantsParDegre}
        />
      ).toBlob();
      downloadBlob(blob, `تقرير_النشاط_${event.title}.pdf`);
    } finally {
      setIsExportingEvent(false);
    }
  };

  const exportToExcel = () => {
    if (!event) return;
    const rows = participantsList.map((p, index) => {
      const degre = resolveDegreParticipant(p);
      return {
        "#": index + 1,
        REFERENCE: p.uniqueKey,
        النوع: getParticipantTypeLabel(p.type),
        الاسم: p.type === "FAMILLE" ? "عائلة" : p.nom || "",
        اللقب: p.type === "FAMILLE" ? pereNomOf(p) : p.prenom || "",
        الدرجة: degre == null ? "غير محدد" : degre,
        "المبلغ (DH)": typeMontant === "GLOBAL" ? "-" : getMontantParticipant(p),
        الحضور: (p.present ?? true) ? "نعم" : "لا",
        "سبب الغياب": p.motif || "",
      };
    });
    const worksheet = XLSX.utils.json_to_sheet(rows);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "المشاركون");
    XLSX.writeFile(workbook, `لائحة_المشاركة_${event.title}.xlsx`);
  };

  const importFromExcel = (file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const data = new Uint8Array(e.target?.result as ArrayBuffer);
      const workbook = XLSX.read(data, { type: "array" });
      const worksheet = workbook.Sheets[workbook.SheetNames[0]];
      const rows = XLSX.utils.sheet_to_json<any>(worksheet);

      setParticipantsList((prev) =>
        prev.map((p) => {
          const row = rows.find((r: any) => r.REFERENCE === p.uniqueKey);
          if (!row) return p;
          return {
            ...p,
            present: row["الحضور"] === "نعم" || row["الحضور"] === "oui",
            motif: row["سبب الغياب"] || "",
          };
        })
      );
    };
    reader.readAsArrayBuffer(file);
  };

  /* ---------- Chargement ---------- */
  if (loading || !event) {
    return (
      <div className="flex min-h-[300px] items-center justify-center" dir="rtl">
        <div className="rounded-2xl border bg-white px-6 py-4 text-sm font-bold text-gray-500 shadow-sm">
          جاري تحميل النشاط...
        </div>
      </div>
    );
  }

  /* ============================== UI ============================== */
  return (
    <div className="px-4 py-4 md:px-6" dir="rtl">
      <PageMeta title="تفاصيل النشاط" description="تفاصيل وإدارة النشاط" />
      <PageBreadcrumb pageTitle="تفاصيل النشاط" />

      {/* ============ ENTÊTE ============ */}
      <section className={cardCls}>
        <div className="flex flex-col gap-5 border-b border-gray-100 px-6 py-6 dark:border-gray-800 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-xs font-bold text-indigo-600">تفاصيل النشاط</p>
            <h1 className="mt-1 text-2xl font-black text-gray-900 dark:text-white">
              {event.title}
            </h1>
            <div className="mt-3 flex flex-wrap gap-2">
              {event.cibles?.map((cible) => (
                <span
                  key={cible}
                  className="rounded-full bg-indigo-50 px-3 py-1 text-xs font-bold text-indigo-700"
                >
                  {getCibleLabel(cible)}
                </span>
              ))}
            </div>
          </div>

          <button
            type="button"
            onClick={openEditEventInfo}
            className="inline-flex w-fit items-center gap-2 rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-bold text-white transition hover:bg-slate-800"
          >
            ✎ تعديل معلومات النشاط
          </button>
        </div>

        <div className="grid grid-cols-1 gap-4 p-6 sm:grid-cols-2 lg:grid-cols-5">
          <InfoCard title="تاريخ البداية" value={event.startDate} />
          <InfoCard title="تاريخ النهاية" value={event.endDate} />
          <InfoCard title="المكان" value={event.place || "غير محدد"} />
          <InfoCard title="السنة الدراسية" value={event.anneeScolaire || "غير محدد"} />
          <InfoCard
            title="مصدر المصروف"
            value={event.sawaedAlKhayr ? "سواعد الخير" : "الميزانية العادية"}
          />
          <InfoCard title="نوع النشاط" value={event.eventType?.name || "غير محدد"} />
        </div>

        {event.degresFamille && event.degresFamille.length > 0 && (
          <div className="border-t border-gray-100 px-6 py-4 dark:border-gray-800">
            <p className="mb-2 text-xs font-bold text-gray-400">الدرجات المستهدفة</p>
            <div className="flex flex-wrap gap-2">
              {event.degresFamille.map((degre) => (
                <span
                  key={degre}
                  className={`rounded-lg px-3 py-1.5 text-xs font-bold ${
                    degre === 0 ? "bg-orange-50 text-orange-700" : "bg-blue-50 text-blue-700"
                  }`}
                >
                  {degreLabel(degre)}
                </span>
              ))}
            </div>
          </div>
        )}
      </section>

      {/* ============ DESCRIPTION ============ */}
      <section className={cardCls}>
        <SectionHeader
          title="معلومات حول النشاط"
          subtitle="الوصف، الأهداف، الملاحظات والنتائج"
        />
        <div className="p-6">
          <div className="overflow-hidden rounded-2xl border border-gray-200 dark:border-gray-700">
            <div className="flex flex-wrap gap-2 border-b bg-gray-50 p-3 dark:border-gray-700 dark:bg-gray-800">
              <EditorButton
                active={!!editor?.isActive("bold")}
                onClick={() => editor?.chain().focus().toggleBold().run()}
              >
                B
              </EditorButton>
              <EditorButton
                active={!!editor?.isActive("italic")}
                onClick={() => editor?.chain().focus().toggleItalic().run()}
              >
                I
              </EditorButton>
              <EditorButton
                active={!!editor?.isActive("heading", { level: 2 })}
                onClick={() => editor?.chain().focus().toggleHeading({ level: 2 }).run()}
              >
                عنوان
              </EditorButton>
              <EditorButton
                active={!!editor?.isActive("bulletList")}
                onClick={() => editor?.chain().focus().toggleBulletList().run()}
              >
                • قائمة
              </EditorButton>
              <EditorButton
                active={false}
                onClick={() => editor?.chain().focus().setTextAlign("right").run()}
              >
                يمين
              </EditorButton>
              <EditorButton
                active={false}
                onClick={() => editor?.chain().focus().setTextAlign("center").run()}
              >
                وسط
              </EditorButton>
              <input
                type="color"
                title="لون النص"
                onInput={(e) =>
                  editor
                    ?.chain()
                    .focus()
                    .setColor((e.target as HTMLInputElement).value)
                    .run()
                }
                className="h-9 w-10 cursor-pointer rounded-lg border bg-white p-1"
              />
            </div>
            <EditorContent editor={editor} />
          </div>
          <SaveStatus isSaving={isSaving} isSaved={isSaved} />
        </div>
      </section>

      {/* ============ FICHIERS ============ */}
      <section className={cardCls}>
        <SectionHeader
          title="ملفات النشاط"
          subtitle="الصور وملفات PDF والوثائق المرتبطة بالنشاط"
        />

        <div className="p-6">
          <DropzoneComponent1
            label="إضافة صور أو ملفات"
            id="eventFiles"
            accept={{
              "image/jpeg": [".jpg", ".jpeg"],
              "image/png": [".png"],
              "image/webp": [".webp"],
              "application/pdf": [".pdf"],
              "application/msword": [".doc"],
              "application/vnd.openxmlformats-officedocument.wordprocessingml.document": [".docx"],
              "application/vnd.ms-excel": [".xls"],
              "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": [".xlsx"],
            }}
            multiple
            onFileSelect={async (fileOrFiles: File | File[]) => {
              const files = Array.isArray(fileOrFiles) ? fileOrFiles : [fileOrFiles];
              await saveFiles(files);
            }}
          />

          {existingFiles.length > 0 ? (
            <>
              <div className="mt-6 flex items-center justify-between">
                <div>
                  <h4 className="text-sm font-black text-gray-800 dark:text-white">
                    معرض الملفات
                  </h4>
                  <p className="mt-1 text-xs text-gray-400">
                    اضغط على الصورة أو ملف PDF لمعاينته بحجم كبير.
                  </p>
                </div>

                <span className="rounded-full bg-indigo-50 px-3 py-1 text-xs font-bold text-indigo-700">
                  {existingFiles.length} ملف
                </span>
              </div>

              <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
                {existingFiles.map((file, index) => {
                  const image = isImageFile(file);
                  const pdfFile = isPdfFile(file);

                  return (
                    <article
                      key={`${file.name}-${index}`}
                      className="group relative overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm transition-all duration-200 hover:-translate-y-1 hover:border-indigo-200 hover:shadow-lg dark:border-gray-700 dark:bg-gray-900"
                    >
                      <button
                        type="button"
                        onClick={() => openFile(file)}
                        className="block w-full text-right"
                      >
                        {image ? (
                          <div className="relative h-52 overflow-hidden bg-gray-100">
                            <img
                              src={file.base64}
                              alt={file.name || `صورة ${index + 1}`}
                              className="h-full w-full object-cover transition duration-300 group-hover:scale-[1.03]"
                            />

                            <div className="absolute inset-0 flex items-center justify-center bg-black/0 transition group-hover:bg-black/20">
                              <span className="translate-y-2 rounded-full bg-white/95 px-4 py-2 text-xs font-black text-gray-800 opacity-0 shadow-lg transition group-hover:translate-y-0 group-hover:opacity-100">
                                عرض الصورة
                              </span>
                            </div>
                          </div>
                        ) : pdfFile ? (
                          <div className="relative flex h-52 flex-col items-center justify-center overflow-hidden bg-gradient-to-br from-red-50 via-white to-rose-50 px-5">
                            <div className="flex h-20 w-16 items-center justify-center rounded-xl border border-red-200 bg-white shadow-sm">
                              <span className="text-lg font-black text-red-600">PDF</span>
                            </div>

                            <p className="mt-4 line-clamp-2 text-center text-sm font-black text-gray-700">
                              {file.name || `PDF ${index + 1}`}
                            </p>

                            <span className="mt-2 rounded-full bg-red-100 px-3 py-1 text-[11px] font-bold text-red-700">
                              اضغط للمعاينة
                            </span>
                          </div>
                        ) : (
                          <div className="flex h-52 flex-col items-center justify-center bg-slate-50 px-5 dark:bg-slate-800">
                            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-white text-sm font-black text-indigo-600 shadow-sm dark:bg-slate-900">
                              {getFileExtension(file)}
                            </div>

                            <p className="mt-4 line-clamp-2 text-center text-sm font-black text-gray-700 dark:text-gray-200">
                              {file.name || `ملف ${index + 1}`}
                            </p>

                            <span className="mt-2 text-[11px] font-bold text-gray-400">
                              اضغط لفتح الملف
                            </span>
                          </div>
                        )}
                      </button>

                      <div className="flex items-center justify-between gap-3 border-t border-gray-100 px-4 py-3 dark:border-gray-800">
                        <div className="min-w-0">
                          <p className="truncate text-xs font-black text-gray-700 dark:text-gray-200">
                            {file.name || `ملف ${index + 1}`}
                          </p>
                          <p className="mt-0.5 text-[10px] font-bold text-gray-400">
                            {image ? "صورة" : pdfFile ? "PDF" : getFileExtension(file)}
                          </p>
                        </div>

                        <div className="flex shrink-0 gap-2">
                          <button
                            type="button"
                            onClick={() => openFile(file)}
                            className="rounded-lg bg-indigo-50 px-3 py-1.5 text-[11px] font-black text-indigo-700 transition hover:bg-indigo-100"
                          >
                            {image || pdfFile ? "معاينة" : "فتح"}
                          </button>

                          <button
                            type="button"
                            onClick={() => deleteFile(index)}
                            className="rounded-lg bg-red-50 px-3 py-1.5 text-[11px] font-black text-red-600 transition hover:bg-red-100"
                          >
                            حذف
                          </button>
                        </div>
                      </div>
                    </article>
                  );
                })}
              </div>
            </>
          ) : (
            <div className="mt-6 rounded-2xl border border-dashed border-gray-200 bg-gray-50/70 px-6 py-10 text-center dark:border-gray-700 dark:bg-gray-800/40">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-white text-xl shadow-sm dark:bg-gray-900">
                🖼️
              </div>
              <p className="mt-3 text-sm font-black text-gray-600 dark:text-gray-300">
                لا توجد صور أو ملفات حتى الآن
              </p>
              <p className="mt-1 text-xs text-gray-400">
                أضف صورة أو PDF وسيظهر هنا مباشرة.
              </p>
            </div>
          )}
        </div>
      </section>

      {/* ============ PARTICIPANTS + MONTANTS ============ */}
      <section className="mb-6 rounded-3xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-gray-900">
        <div className="mb-5 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h3 className="text-lg font-black text-gray-900 dark:text-white">
              المشاركون والمبالغ
            </h3>
            <p className="mt-1 text-xs text-gray-400">إدارة الحضور وتوزيع المصاريف</p>
          </div>

          <div className="flex flex-wrap gap-2">
            <ActionButton onClick={openParticipantModal}>+ إضافة المشاركين</ActionButton>
            <ActionButton onClick={exportToExcel} secondary>
              تصدير Excel
            </ActionButton>

            <label className="cursor-pointer rounded-xl border border-blue-200 bg-blue-50 px-4 py-2.5 text-sm font-bold text-blue-700">
              استيراد Excel
              <input
                type="file"
                accept=".xlsx,.xls"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) importFromExcel(file);
                  e.target.value = "";
                }}
              />
            </label>

            <ActionButton onClick={exportParticipantsPdf} secondary>
              تصدير PDF
            </ActionButton>
          </div>
        </div>

        {/* ----- Montants ----- */}
        <div className="mb-6 rounded-2xl border border-green-200 bg-green-50/50 p-5">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div>
              <label className={labelCls}>طريقة احتساب المبلغ</label>
              <select
                value={typeMontant}
                onChange={(e) => setTypeMontant(e.target.value as TypeMontant)}
                className={inputCls}
              >
                <option value="GLOBAL">مبلغ إجمالي للنشاط</option>
                <option value="DISTRIBUE">توزيع المبلغ على المستفيدين</option>
              </select>
            </div>

            {typeMontant === "GLOBAL" ? (
              <MoneyInput
                label="المبلغ الإجمالي للنشاط"
                value={montantGlobal}
                onChange={setMontantGlobal}
              />
            ) : (
              <div>
                <label className={labelCls}>طريقة التوزيع</label>
                <select
                  value={modeRepartition}
                  onChange={(e) => setModeRepartition(e.target.value as ModeRepartition)}
                  className={inputCls}
                >
                  <option value="EGAL">مبلغ متساوٍ لجميع المستفيدين</option>
                  <option value="DEGRE">مبلغ حسب درجة العائلة</option>
                </select>
              </div>
            )}
          </div>

          {typeMontant === "DISTRIBUE" && modeRepartition === "EGAL" && (
            <div className="mt-4">
              <MoneyInput
                label="المبلغ لكل مستفيد"
                value={montantEgal}
                onChange={setMontantEgal}
              />
            </div>
          )}

          {parDegre && (
            <>
              <div className="mt-5 grid grid-cols-1 gap-4 md:grid-cols-2">
                {montantDegreeOptions.map((degre) => {
                  const undef = degre === 0;
                  return (
                    <div
                      key={degre}
                      className={`rounded-2xl border p-4 ${
                        undef
                          ? "border-orange-200 bg-orange-50"
                          : "border-blue-200 bg-blue-50"
                      }`}
                    >
                      <MoneyInput
                        label={undef ? "الدرجة غير المحددة" : `الدرجة ${degre}`}
                        value={Number(montantsParDegre[degre] || 0)}
                        onChange={(value) =>
                          setMontantsParDegre((prev) => ({ ...prev, [degre]: value }))
                        }
                      />
                      <p className="mt-2 text-xs text-gray-500">
                        {undef
                          ? "هذا المبلغ يطبق على المستفيدين الذين لا تملك عائلتهم درجة محددة."
                          : `هذا المبلغ يطبق على المستفيدين من الدرجة ${degre}.`}
                      </p>
                    </div>
                  );
                })}
              </div>

            </>
          )}

          {/* Charge supplémentaire */}
          <div className="mt-5 grid grid-cols-1 gap-4 rounded-2xl border border-amber-200 bg-amber-50 p-4 md:grid-cols-2">
            <MoneyInput label="المصاريف الإضافية" value={chargeSupp} onChange={setChargeSupp} />
            <div>
              <label className={labelCls}>بيان المصاريف الإضافية</label>
              <input
                type="text"
                value={chargeSuppLabel}
                onChange={(e) => setChargeSuppLabel(e.target.value)}
                placeholder="مثال: النقل، كراء القاعة"
                className={inputCls}
              />
            </div>
          </div>

          {/* Résumé comptable : catégories strictement séparées */}
          {isSawaedAlKhayr ? (
            <div className="mt-5 rounded-2xl border border-violet-200 bg-violet-50 p-5">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="text-xs font-black text-violet-600">سواعد الخير</p>
                  <p className="mt-1 text-sm font-bold text-violet-800">
                    المبلغ الكامل لهذا النشاط مصنف في سواعد الخير فقط
                  </p>
                  <p className="mt-1 text-xs text-violet-600">
                    لا يدخل في الدرجات المحددة ولا في مصاريف المعوزين.
                  </p>
                </div>
                <strong className="text-2xl font-black text-violet-900">
                  {formatMoney(montantSawaedAlKhayr)}
                </strong>
              </div>
            </div>
          ) : (
            <div className="mt-5 space-y-4">
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <SummaryCard
                  title="المبلغ المستهلك للدرجات المحددة"
                  value={formatMoney(montantDegresDefinisAffiche)}
                  subtitle={`${participantsDegreDefini.length} مستفيد بدرجة محددة`}
                  tone="blue"
                />
                <SummaryCard
                  title="المبلغ المستهلك للمعوزين / الدرجة غير المحددة"
                  value={formatMoney(montantMouawizAffiche)}
                  subtitle={`${participantsDegreNonDefini.length} مستفيد بدون درجة محددة`}
                  tone="orange"
                />
              </div>

              {montantNonVentileAffiche > 0 && (
                <div className="rounded-2xl border border-slate-300 bg-slate-50 p-4">
                  <div className="flex items-center justify-between gap-4">
                    <div>
                      <p className="text-sm font-black text-slate-700">مبلغ غير موزع بين الفئتين</p>
                      <p className="mt-1 text-xs text-slate-500">
                        يحدث هذا مثلاً مع مبلغ إجمالي يشمل معوزين ودرجات محددة معاً، أو مع مصاريف إضافية غير منسوبة لفئة.
                      </p>
                    </div>
                    <strong className="text-xl font-black text-slate-800">
                      {formatMoney(montantNonVentileAffiche)}
                    </strong>
                  </div>
                </div>
              )}

              <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 px-4 py-3 text-xs font-bold text-slate-500">
                لا يتم جمع مصاريف الدرجات المحددة مع مصاريف المعوزين أو سواعد الخير في رقم واحد.
              </div>
            </div>
          )}
        </div>

        {/* ----- Tableau ----- */}
        {participantsList.length > 0 ? (
          <div className="overflow-x-auto rounded-2xl border border-gray-200">
            <table className="min-w-full text-right text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="p-3">الاسم</th>
                  <th className="p-3">اللقب</th>
                  <th className="p-3">الدرجة</th>
                  <th className="p-3">المبلغ</th>
                  <th className="p-3">الحضور</th>
                  <th className="p-3">سبب الغياب</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {participantsList.map((p) => {
                  const isPresent = p.present ?? true;
                  const degree = resolveDegreParticipant(p);
                  const isFam = p.type === "FAMILLE";

                  return (
                    <tr key={p.uniqueKey || `${p.type}-${p.id}`}>
                      <td className="p-3">{isFam ? "عائلة" : p.nom}</td>
                      <td className="p-3">{isFam ? pereNomOf(p) : p.prenom}</td>
                      <td className="p-3">
                        <span
                          className={`rounded-full px-2.5 py-1 text-xs font-bold ${
                            degree == null
                              ? "bg-orange-100 text-orange-700"
                              : "bg-blue-100 text-blue-700"
                          }`}
                        >
                          {degreLabel(degree)}
                        </span>
                      </td>
                      <td className="p-3 font-bold text-green-700">
                        {typeMontant === "GLOBAL"
                          ? "-"
                          : formatMoney(getMontantParticipant(p))}
                      </td>
                      <td className="p-3">
                        <select
                          value={isPresent ? "oui" : "non"}
                          onChange={(e) =>
                            updateParticipant(p.uniqueKey, {
                              present: e.target.value === "oui",
                              motif: e.target.value === "oui" ? "" : p.motif,
                            })
                          }
                          className="rounded-lg border px-2 py-1"
                        >
                          <option value="oui">نعم</option>
                          <option value="non">لا</option>
                        </select>
                      </td>
                      <td className="p-3">
                        {!isPresent && (
                          <input
                            type="text"
                            value={p.motif || ""}
                            placeholder="سبب الغياب"
                            onChange={(e) =>
                              updateParticipant(p.uniqueKey, { motif: e.target.value })
                            }
                            className="w-full rounded-lg border px-2 py-1"
                          />
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="rounded-2xl border border-dashed border-gray-200 p-8 text-center text-sm text-gray-400">
            لا يوجد مشاركون حتى الآن.
          </div>
        )}

        <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <SaveStatus isSaving={isSaving} isSaved={isSaved} />
          <button
            type="button"
            onClick={exportEventPdf}
            disabled={isExportingEvent}
            className="rounded-xl bg-slate-900 px-5 py-2.5 text-sm font-bold text-white disabled:opacity-50"
          >
            {isExportingEvent ? "جاري إعداد التقرير..." : "تصدير تقرير النشاط PDF"}
          </button>
        </div>
      </section>

      {/* ============ MODAL APERÇU FICHIER ============ */}
      {selectedFilePreview && (
        <div
          className="fixed inset-0 z-[10000] flex items-center justify-center bg-slate-950/75 p-4 backdrop-blur-sm"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) {
              setSelectedFilePreview(null);
            }
          }}
        >
          <div className="flex max-h-[94vh] w-full max-w-6xl flex-col overflow-hidden rounded-3xl bg-white shadow-2xl dark:bg-gray-900">
            <div className="flex items-center justify-between gap-4 border-b border-gray-100 px-5 py-4 dark:border-gray-800">
              <div className="min-w-0">
                <p className="text-[11px] font-black text-indigo-600">
                  {isImageFile(selectedFilePreview) ? "معاينة الصورة" : "معاينة PDF"}
                </p>
                <h3 className="mt-1 truncate text-base font-black text-gray-900 dark:text-white">
                  {selectedFilePreview.name || "ملف النشاط"}
                </h3>
              </div>

              <div className="flex shrink-0 items-center gap-2">
                <button
                  type="button"
                  onClick={() =>
                    window.open(
                      selectedFilePreview.base64,
                      "_blank",
                      "noopener,noreferrer"
                    )
                  }
                  className="rounded-xl border border-gray-200 bg-white px-4 py-2 text-xs font-black text-gray-700 transition hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200"
                >
                  فتح في نافذة جديدة
                </button>

                <button
                  type="button"
                  onClick={() => setSelectedFilePreview(null)}
                  className="flex h-10 w-10 items-center justify-center rounded-xl bg-gray-100 text-xl font-bold text-gray-600 transition hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-200"
                  aria-label="إغلاق"
                >
                  ×
                </button>
              </div>
            </div>

            <div className="min-h-0 flex-1 overflow-auto bg-slate-100 p-4 dark:bg-slate-950">
              {isImageFile(selectedFilePreview) ? (
                <div className="flex min-h-[65vh] items-center justify-center">
                  <img
                    src={selectedFilePreview.base64}
                    alt={selectedFilePreview.name || "صورة النشاط"}
                    className="max-h-[78vh] max-w-full rounded-2xl object-contain shadow-xl"
                  />
                </div>
              ) : isPdfFile(selectedFilePreview) ? (
                <iframe
                  src={selectedFilePreview.base64}
                  title={selectedFilePreview.name || "PDF"}
                  className="h-[78vh] w-full rounded-2xl border-0 bg-white shadow-xl"
                />
              ) : (
                <div className="flex min-h-[60vh] flex-col items-center justify-center rounded-2xl bg-white p-8 text-center dark:bg-gray-900">
                  <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-indigo-50 text-sm font-black text-indigo-600">
                    {getFileExtension(selectedFilePreview)}
                  </div>
                  <p className="mt-4 font-black text-gray-700 dark:text-gray-200">
                    لا يمكن معاينة هذا النوع داخل الصفحة.
                  </p>
                  <button
                    type="button"
                    onClick={() =>
                      window.open(
                        selectedFilePreview.base64,
                        "_blank",
                        "noopener,noreferrer"
                      )
                    }
                    className="mt-4 rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-black text-white"
                  >
                    فتح الملف
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ============ MODAL PARTICIPANTS ============ */}
      {isParticipantModalOpen && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-2xl overflow-hidden rounded-3xl bg-white shadow-2xl">
            <div className="border-b p-5">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-black">اختيار المشاركين</h3>
                  <p className="mt-1 text-xs text-gray-400">
                    اختر المستفيدين الذين سيشاركون في النشاط.
                  </p>
                </div>
                <button
                  onClick={() => setIsParticipantModalOpen(false)}
                  className="h-9 w-9 rounded-xl border"
                >
                  ×
                </button>
              </div>

              <input
                value={searchParticipant}
                onChange={(e) => setSearchParticipant(e.target.value)}
                placeholder="بحث..."
                className="mt-4 h-11 w-full rounded-xl border px-4"
              />

              <label className="mt-3 flex items-center gap-2 text-sm font-bold">
                <input type="checkbox" checked={selectAll} onChange={toggleSelectAll} />
                اختيار الكل
              </label>
            </div>

            <div className="max-h-[55vh] space-y-2 overflow-y-auto p-5">
              {filteredParticipants.map((p) => (
                <label
                  key={p.uniqueKey}
                  className="flex cursor-pointer items-center justify-between rounded-xl border p-3 hover:bg-gray-50"
                >
                  <div>
                    <p className="font-bold">
                      {p.type === "FAMILLE"
                        ? `عائلة ${p.pere?.nom || ""}`
                        : `${p.nom || ""} ${p.prenom || ""}`}
                    </p>
                    <p className="text-xs text-gray-400">
                      {getParticipantTypeLabel(p.type)}
                      {" · "}
                      {degreLabel(resolveDegreParticipant(p))}
                    </p>
                  </div>
                  <input
                    type="checkbox"
                    checked={!!p.uniqueKey && selectedParticipants.includes(p.uniqueKey)}
                    onChange={() => toggleParticipant(p)}
                  />
                </label>
              ))}
            </div>

            <div className="flex justify-end gap-2 border-t p-5">
              <button
                onClick={() => setIsParticipantModalOpen(false)}
                className="rounded-xl border px-4 py-2"
              >
                إلغاء
              </button>
              <button
                onClick={confirmParticipants}
                className="rounded-xl bg-indigo-600 px-5 py-2 font-bold text-white"
              >
                تأكيد
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ============ MODAL MODIFICATION ============ */}
      {isEditInfoOpen && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-slate-950/50 p-4 backdrop-blur-sm">
          <div className="max-h-[92vh] w-full max-w-3xl overflow-y-auto rounded-3xl bg-white shadow-2xl dark:bg-gray-900">
            <div className="sticky top-0 z-10 flex items-center justify-between border-b bg-white/95 p-5 backdrop-blur dark:bg-gray-900/95">
              <div>
                <h3 className="text-xl font-black">تعديل معلومات النشاط</h3>
                <p className="mt-1 text-xs text-gray-400">
                  يمكن تعديل نفس المعلومات المحددة عند إنشاء النشاط.
                </p>
              </div>
              <button
                onClick={() => setIsEditInfoOpen(false)}
                className="h-9 w-9 rounded-xl border"
              >
                ×
              </button>
            </div>

            <div className="space-y-5 p-6">
              <div>
                <label className={labelCls}>عنوان النشاط</label>
                <input
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  className={inputCls}
                />
              </div>

              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div>
                  <label className={labelCls}>نوع النشاط</label>
                  <select
                    value={editEventTypeId}
                    onChange={(e) =>
                      setEditEventTypeId(e.target.value ? Number(e.target.value) : "")
                    }
                    className={inputCls}
                  >
                    <option value="">-- اختر --</option>
                    {eventTypes.map((type) => (
                      <option key={type.id} value={type.id}>
                        {type.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className={labelCls}>مكان النشاط</label>
                  <input
                    value={editPlace}
                    onChange={(e) => setEditPlace(e.target.value)}
                    className={inputCls}
                  />
                </div>

                <div>
                  <label className={labelCls}>السنة الدراسية</label>
                  <select
                    value={editAnneeScolaire}
                    onChange={(e) => setEditAnneeScolaire(e.target.value)}
                    className={inputCls}
                  >
                    <option value="">-- اختر --</option>
                    {anneesScolaires.map((year) => (
                      <option key={year} value={year}>
                        {year}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className={labelCls}>تاريخ البداية</label>
                  <input
                    type="date"
                    value={editStartDate}
                    onChange={(e) => {
                      setEditStartDate(e.target.value);
                      setEditAnneeScolaire(getAnneeScolaireFromDate(e.target.value));
                    }}
                    className={inputCls}
                  />
                </div>

                <div>
                  <label className={labelCls}>تاريخ النهاية</label>
                  <input
                    type="date"
                    min={editStartDate || undefined}
                    value={editEndDate}
                    onChange={(e) => setEditEndDate(e.target.value)}
                    className={inputCls}
                  />
                </div>
              </div>

              <div className={`rounded-2xl border p-4 ${
                editSawaedAlKhayr
                  ? "border-violet-300 bg-violet-50"
                  : "border-gray-200 bg-gray-50"
              }`}>
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="text-sm font-black">هل النشاط تابع لسواعد الخير؟</p>
                    <p className="mt-1 text-xs text-gray-500">
                      إذا اخترت نعم، كل المبلغ المستهلك في هذا النشاط يصنف ضمن سواعد الخير فقط.
                    </p>
                  </div>

                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setEditSawaedAlKhayr(false)}
                      className={`rounded-xl border px-4 py-2 text-sm font-bold ${
                        !editSawaedAlKhayr
                          ? "border-slate-700 bg-slate-800 text-white"
                          : "bg-white text-slate-600"
                      }`}
                    >
                      لا
                    </button>
                    <button
                      type="button"
                      onClick={() => setEditSawaedAlKhayr(true)}
                      className={`rounded-xl border px-4 py-2 text-sm font-bold ${
                        editSawaedAlKhayr
                          ? "border-violet-600 bg-violet-600 text-white"
                          : "bg-white text-violet-700"
                      }`}
                    >
                      نعم - سواعد الخير
                    </button>
                  </div>
                </div>
              </div>

              <div className="rounded-2xl border bg-gray-50 p-4">
                <p className="mb-3 text-sm font-black">الفئة المستهدفة</p>
                <div className="grid grid-cols-3 gap-3">
                  {(["MERE", "ENFANT", "FAMILLE"] as Cible[]).map((cible) => (
                    <button
                      key={cible}
                      type="button"
                      onClick={() => toggleEditCible(cible)}
                      className={`rounded-xl border px-3 py-3 text-sm font-bold ${
                        editCibles.includes(cible)
                          ? "border-indigo-600 bg-indigo-600 text-white"
                          : "bg-white"
                      }`}
                    >
                      {getCibleLabel(cible)}
                    </button>
                  ))}
                </div>
              </div>

              <div className="rounded-2xl border bg-gray-50 p-4">
                <p className="mb-3 text-sm font-black">درجات العائلة المستهدفة</p>
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                  {[1, 2, 3, 0].map((degre) => (
                    <button
                      key={degre}
                      type="button"
                      onClick={() => toggleEditDegre(degre)}
                      className={`rounded-xl border px-3 py-3 text-sm font-bold ${
                        editDegresFamille.includes(degre)
                          ? "border-amber-500 bg-amber-500 text-white"
                          : "bg-white"
                      }`}
                    >
                      {degreLabel(degre)}
                    </button>
                  ))}
                </div>
                <p className="mt-2 text-xs text-gray-400">
                  إذا لم تختر أي درجة، لا يتم تطبيق فلتر الدرجة.
                </p>
              </div>

              {editCibles.includes("ENFANT") && (
                <div className="grid grid-cols-1 gap-4 rounded-2xl border border-green-200 bg-green-50 p-4 md:grid-cols-2">
                  <div>
                    <label className={labelCls}>الحد الأدنى للعمر</label>
                    <input
                      type="number"
                      min="0"
                      value={editAgeMin}
                      onChange={(e) =>
                        setEditAgeMin(e.target.value ? Number(e.target.value) : "")
                      }
                      className={inputCls}
                    />
                  </div>
                  <div>
                    <label className={labelCls}>الحد الأقصى للعمر</label>
                    <input
                      type="number"
                      min="0"
                      value={editAgeMax}
                      onChange={(e) =>
                        setEditAgeMax(e.target.value ? Number(e.target.value) : "")
                      }
                      className={inputCls}
                    />
                  </div>
                </div>
              )}
            </div>

            <div className="sticky bottom-0 flex justify-end gap-2 border-t bg-white/95 p-5 backdrop-blur dark:bg-gray-900/95">
              <button
                onClick={() => setIsEditInfoOpen(false)}
                disabled={isEditInfoSaving}
                className="rounded-xl border px-5 py-2.5"
              >
                إلغاء
              </button>
              <button
                onClick={saveEventInfo}
                disabled={isEditInfoSaving}
                className="rounded-xl bg-indigo-600 px-6 py-2.5 font-bold text-white disabled:opacity-50"
              >
                {isEditInfoSaving ? "جاري الحفظ..." : "حفظ التعديلات"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

/* ============================== PETITS COMPOSANTS ============================== */
const InfoCard = ({ title, value }: { title: string; value: React.ReactNode }) => (
  <div className="rounded-2xl border border-gray-100 bg-gray-50 p-4 dark:border-gray-800 dark:bg-gray-800/40">
    <p className="text-xs font-bold text-gray-400">{title}</p>
    <p className="mt-2 text-sm font-black text-gray-800 dark:text-white">{value}</p>
  </div>
);

const SectionHeader = ({ title, subtitle }: { title: string; subtitle: string }) => (
  <div className="border-b border-gray-100 px-6 py-5 dark:border-gray-800">
    <h3 className="text-lg font-black text-gray-900 dark:text-white">{title}</h3>
    <p className="mt-1 text-xs text-gray-400">{subtitle}</p>
  </div>
);

const EditorButton = ({
  children,
  active,
  onClick,
}: {
  children: React.ReactNode;
  active: boolean;
  onClick: () => void;
}) => (
  <button
    type="button"
    onClick={onClick}
    className={`rounded-lg px-3 py-2 text-xs font-bold ${
      active ? "bg-indigo-100 text-indigo-700" : "bg-white text-gray-600 hover:bg-gray-100"
    }`}
  >
    {children}
  </button>
);

const ActionButton = ({
  children,
  onClick,
  secondary = false,
}: {
  children: React.ReactNode;
  onClick: () => void;
  secondary?: boolean;
}) => (
  <button
    type="button"
    onClick={onClick}
    className={`rounded-xl px-4 py-2.5 text-sm font-bold ${
      secondary
        ? "border border-gray-200 bg-white text-gray-700"
        : "bg-indigo-600 text-white"
    }`}
  >
    {children}
  </button>
);

const MoneyInput = ({
  label,
  value,
  onChange,
}: {
  label: string;
  value: number;
  onChange: (value: number) => void;
}) => (
  <div>
    <label className={labelCls}>{label}</label>
    <div className="relative">
      <input
        type="number"
        min="0"
        step="0.01"
        value={value || ""}
        onChange={(e) => onChange(e.target.value === "" ? 0 : Number(e.target.value))}
        className="h-11 w-full rounded-xl border border-gray-200 bg-white px-3 pl-14"
      />
      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold text-gray-400">
        DH
      </span>
    </div>
  </div>
);

const SummaryCard = ({
  title,
  value,
  subtitle,
  tone,
}: {
  title: string;
  value: string;
  subtitle: string;
  tone: "blue" | "orange";
}) => {
  const blue = tone === "blue";
  return (
    <div
      className={`rounded-2xl border p-4 ${
        blue ? "border-blue-200 bg-blue-50" : "border-orange-200 bg-orange-50"
      }`}
    >
      <p className={`text-xs font-bold ${blue ? "text-blue-700" : "text-orange-700"}`}>
        {title}
      </p>
      <p className={`mt-2 text-2xl font-black ${blue ? "text-blue-900" : "text-orange-900"}`}>
        {value}
      </p>
      <p className="mt-1 text-xs text-gray-500">{subtitle}</p>
    </div>
  );
};

const SaveStatus = ({ isSaving, isSaved }: { isSaving: boolean; isSaved: boolean }) => (
  <div className="mt-3 flex justify-end text-xs font-bold">
    {isSaving ? (
      <span className="text-blue-600">جاري الحفظ...</span>
    ) : isSaved ? (
      <span className="text-green-600">✓ تم الحفظ</span>
    ) : (
      <span className="text-red-600">تعذر الحفظ</span>
    )}
  </div>
);

export default EventDetails;
