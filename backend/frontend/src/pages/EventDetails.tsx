import React, { useEffect, useRef, useState } from "react";
import { useParams } from "react-router-dom";
import PageBreadcrumb from "../components/common/PageBreadCrumb";
import PageMeta from "../components/common/PageMeta";
import DropzoneComponent1 from "../components/form/form-elements/DropZone1";
import Button from "../components/ui/button/Button";
import * as XLSX from "xlsx";
import { EditorContent, useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import ExcelJS from "exceljs";
import TextAlign from "@tiptap/extension-text-align";

import { Color } from "@tiptap/extension-color";
import { TextStyle } from "@tiptap/extension-text-style";
import { PDFDownloadLink, pdf } from "@react-pdf/renderer";
import ParticipantsPdf, { ParticipantRow } from "./ParticipantsPdf";
import EventPdf from "./EventPdf";
interface Participant {
  id: number;
  nom?: string;
  prenom?: string;

  pere?: {
    nom?: string;
    prenom?: string;
  };

  age?: number;
  present?: boolean;
  motif?: string;

  montant?: number;

  uniqueKey?: string;
  type?: "MERE" | "ENFANT" | "FAMILLE";
}
interface EventFile {
  base64: string;
  type: string;
  name: string;
}
interface EventDetail {
  id: number;
  title: string;
  startDate: string;
  endDate: string;
  eventType?: {
      id: number;
      name: string;
    };

  cibles: string[];
  description?: string;
  photos?: EventFile[];
  ageMin?: number;
  ageMax?: number;
  degresFamille?: number[];
  meresParticipants?: Participant[];
  enfantsParticipants?: Participant[];
  famillesParticipants?: Participant[];
  place?: string;

  montantTotal?: number;

  typeMontant?: "GLOBAL" | "DISTRIBUE";

  modeRepartition?: "EGAL" | "DEGRE";

  montantGlobal?: number;

  montantEgal?: number;

  montantsParDegre?: Record<number, number>;
    chargeSupplementaire?: number;
    chargeSupplementaireLabel?: string;
}

const EventDetails: React.FC = () => {
  const { id } = useParams();
  const [event, setEvent] = useState<EventDetail | null>(null);
  const [participantsList, setParticipantsList] = useState<Participant[]>([]);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [selectedParticipants, setSelectedParticipants] = useState<string[]>([]);
 const [existingFiles, setExistingFiles] = useState<EventFile[]>([]); // To hold loaded files
  const [description, setDescription] = useState<string>("");
  const editor = useEditor({
  extensions: [
    StarterKit.configure({
      link: {
        openOnClick: false,
        HTMLAttributes: {
          class: "text-blue-600 underline",
        },
      },
    }),

    TextStyle,
    Color,

    TextAlign.configure({
      types: ["heading", "paragraph"],
    }),
  ],
    content: description,

    editorProps: {
      attributes: {
        dir: "rtl",
        class:
          "min-h-[260px] px-6 py-5 text-right text-[15px] leading-8 text-gray-700 dark:text-gray-200 focus:outline-none",
      },
    },

    onUpdate: ({ editor }) => {
      setDescription(editor.getHTML());
    },
  });
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectAll, setSelectAll] = useState(false);
const [searchParticipant, setSearchParticipant] = useState("");
  const [allMeres, setAllMeres] = useState<Participant[]>([]);
  const [allEnfants, setAllEnfants] = useState<Participant[]>([]);
  const [allFamilles, setAllFamilles] = useState<Participant[]>([]);
const [isSaving, setIsSaving] = useState(false);
const [isSaved, setIsSaved] = useState(true);
const [typeMontant, setTypeMontant] = useState<
  "GLOBAL" | "DISTRIBUE"
>("GLOBAL");

const [modeRepartition, setModeRepartition] = useState<
  "EGAL" | "DEGRE"
>("EGAL");

const [montantGlobal, setMontantGlobal] = useState<number>(0);

const [montantEgal, setMontantEgal] = useState<number>(0);
const [chargeSupp, setChargeSupp] = useState<number>(0);
const [chargeSuppLabel, setChargeSuppLabel] = useState<string>("");
const [montantsParDegre, setMontantsParDegre] =
  useState<Record<number, number>>({});
const firstLoad = useRef(true);
  const convertToBase64 = (file: File): Promise<string> =>
    new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = (error) => reject(error);
    });

  // Convert Base64 back to File for display
const base64ToFile = (
  base64: string,
  type: string,
  filename: string
): File => {
  const parts = base64.split(",");

  const byteString = atob(
    parts.length > 1 ? parts[1] : parts[0]
  );

  const mimeType =
    parts.length > 1 && parts[0].includes(":")
      ? parts[0].split(":")[1].split(";")[0]
      : type || "application/octet-stream";

  const bytes = new Uint8Array(byteString.length);

  for (let i = 0; i < byteString.length; i++) {
    bytes[i] = byteString.charCodeAt(i);
  }

  return new File([bytes], filename, {
    type: mimeType,
  });
};
const toggleParticipant = (id: number, type: "MERE" | "ENFANT" | "FAMILLE") => {
 const key = `${type.toUpperCase()}-${id}`;

  setSelectedParticipants(prev => {
    const isSelected = prev.includes(key);
    let newSelected: string[];
    if (isSelected) {
      newSelected = prev.filter(k => k !== key);
      setParticipantsList(current => current.filter(p => p.uniqueKey !== key));
    } else {
      newSelected = [...prev, key];
      let toAdd: Participant[] = [];
      if (type === "MERE") {
        const mere = allMeres.find(m => m.id === id);
        if (mere) toAdd.push({ ...mere, uniqueKey: key, type: "MERE" });
      }
      if (type === "ENFANT") {
        const enfant = allEnfants.find(e => e.id === id);
        if (enfant) toAdd.push({ ...enfant, uniqueKey: key, type: "ENFANT" });
      }
      if (type === "FAMILLE") {
        const famille = allFamilles.find(f => f.id === id);
        if (famille) toAdd.push({ ...famille, uniqueKey: key, type: "FAMILLE" });
      }
      setParticipantsList(current => {
        const alreadyExists = current.some(p => p.uniqueKey === key);
        if (alreadyExists) return current;
        return [...current, ...toAdd];
      });
    }
    return newSelected;
  });
};

const getCibleLabel = (cible: string) => {
  switch (cible) {
    case "MERE":
      return "أم";
    case "ENFANT":
      return "طفل";
    case "FAMILLE":
      return "عائلة";
    default:
      return cible;
  }
};





const toggleSelectAll = () => {
  if (selectAll) {
    setSelectedParticipants([]);
    setSelectAll(false);
  } else {
    const allKeys = participants
      .map((p) => p.uniqueKey)
      .filter((key): key is string => Boolean(key));

    setSelectedParticipants(allKeys);
    setSelectAll(true);
  }
};
  // Fetch data
  useEffect(() => {
    const fetchData = async () => {
      try {
        const meresData = await fetch("http://localhost:8080/api/meres").then((res) => res.json());
        setAllMeres(Array.isArray(meresData) ? meresData : []);
    } catch (error) {
      console.error("Erreur chargement mères :", error);
      setAllMeres([]);
    }
      try {
        const enfantsData = await fetch("http://localhost:8080/api/enfant").then((res) => res.json());
        setAllEnfants(Array.isArray(enfantsData) ? enfantsData : []);
      } catch {
        setAllEnfants([]);
      }
      try {
        const famillesData = await fetch("http://localhost:8080/api/famille").then((res) => res.json());
        setAllFamilles(Array.isArray(famillesData) ? famillesData : []);
      } catch {
        setAllFamilles([]);
      }
    };
    fetchData();
  }, []);

  useEffect(() => {
    fetch(`http://localhost:8080/api/events/${id}`)
      .then((res) => res.json())
      .then((data) => {
        setEvent(data);
        setDescription(data.description || "");
        setExistingFiles(data.photos || []); // Now properly loaded from backend
setTypeMontant(data.typeMontant || "GLOBAL");

setModeRepartition(
  data.modeRepartition || "EGAL"
);

setMontantGlobal(
  Number(data.montantGlobal || 0)
);

setMontantEgal(
  Number(data.montantEgal || 0)
);

setMontantsParDegre(
  data.montantsParDegre || {}
);
setChargeSupp(Number(data.chargeSupplementaire || 0));
setChargeSuppLabel(data.chargeSupplementaireLabel || "");
        // Populate participantsList with unique keys (using entity IDs)
        const eventList: Participant[] = [];
        if (data.meresParticipants) eventList.push(...data.meresParticipants.map(p => ({ ...p, uniqueKey: `MERE-${p.id}`, type: "MERE" })));
        if (data.enfantsParticipants) eventList.push(...data.enfantsParticipants.map(p => ({ ...p, uniqueKey: `ENFANT-${p.id}`, type: "ENFANT" })));
        if (data.famillesParticipants) eventList.push(...data.famillesParticipants.map(p => ({ ...p, uniqueKey: `FAMILLE-${p.id}`, type: "FAMILLE"})));
        setParticipantsList(eventList);
      })
      .catch(console.error);
  }, [id]);
useEffect(() => {
  if (!editor || editor.isDestroyed || !event) return;

  const newHtml = event.description || "";

  editor.commands.setContent(newHtml, {
    emitUpdate: false,
  });
}, [editor, event?.id]);
const saveFiles = async (selectedFiles: File[]) => {
  if (!event) return;

 const newFiles = await Promise.all(
   selectedFiles.map(async (file) => ({
     base64: await convertToBase64(file),
     type: file.type,
     name: file.name,
   }))
 );

  const payload = {
    extendedProps: {
      files: [
        ...existingFiles,
        ...newFiles,
      ],
    },
  };

  await fetch(`http://localhost:8080/api/events/details/${event.id}`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  // Recharger les données
  const res = await fetch(`http://localhost:8080/api/events/${event.id}`);
  const updated = await res.json();

  setExistingFiles(updated.photos || []);

};
const openParticipantModal = async () => {
    if (!event) return;
setSelectAll(false);

    try {
      // Recharger les données au moment du clic
      const [meresRes, enfantsRes, famillesRes] = await Promise.all([
        fetch("http://localhost:8080/api/meres"),
        fetch("http://localhost:8080/api/enfant"),
        fetch("http://localhost:8080/api/famille"),
      ]);

      if (!meresRes.ok) {
        throw new Error("Erreur chargement mères");
      }

      if (!enfantsRes.ok) {
        throw new Error("Erreur chargement enfants");
      }

      if (!famillesRes.ok) {
        throw new Error("Erreur chargement familles");
      }

      const meresData = await meresRes.json();
      const enfantsData = await enfantsRes.json();
      const famillesData = await famillesRes.json();

      const meres = Array.isArray(meresData) ? meresData : [];
      const enfants = Array.isArray(enfantsData) ? enfantsData : [];
      const familles = Array.isArray(famillesData) ? famillesData : [];

      // Mettre également à jour les states globaux
      setAllMeres(meres);
      setAllEnfants(enfants);
      setAllFamilles(familles);

      const cibles = (event.cibles || []).map((c) =>
        String(c).trim().toUpperCase()
      );

      const list: Participant[] = [];

      console.log("EVENT =", event);
      console.log("CIBLES =", cibles);

      console.log("MERES API =", meres);
      console.log("ENFANTS API =", enfants);
      console.log("FAMILLES API =", familles);

      // ================= MÈRES =================
      if (cibles.includes("MERE")) {
        meres.forEach((p: Participant) => {
          list.push({
            ...p,
            uniqueKey: `MERE-${p.id}`,
            type: "MERE",
          });
        });
      }

      // ================= ENFANTS =================
      if (cibles.includes("ENFANT")) {
        const ageMin = event.ageMin ?? 0;
        const ageMax = event.ageMax ?? 100;

        enfants
          .filter((p: Participant) => {
            if (p.age == null) {
              return true;
            }

            return p.age >= ageMin && p.age <= ageMax;
          })
          .forEach((p: Participant) => {
            list.push({
              ...p,
              uniqueKey: `ENFANT-${p.id}`,
              type: "ENFANT",
            });
          });
      }

      // ================= FAMILLES =================
      if (cibles.includes("FAMILLE")) {
        familles.forEach((p: Participant) => {
          list.push({
            ...p,
            uniqueKey: `FAMILLE-${p.id}`,
            type: "FAMILLE",
          });
        });
      }

      console.log("LISTE FINALE MODAL =", list);

      const currentKeys = participantsList
        .map((p) => p.uniqueKey)
        .filter((key): key is string => Boolean(key));

      setParticipants(list);
      setSelectedParticipants(currentKeys);

      setSelectAll(
        list.length > 0 &&
          list.every((p) => currentKeys.includes(p.uniqueKey!))
      );

      setSearchParticipant("");
      setIsModalOpen(true);
    } catch (error) {
      console.error("Erreur chargement participants :", error);

      setParticipants([]);
      setSearchParticipant("");
      setSelectAll(false);
      setIsModalOpen(true);
    }
  };

const confirmParticipants = () => {
  const selected: Participant[] = [];

  // Mères
  selected.push(
    ...allMeres
      .filter((m) =>
        selectedParticipants.includes(`MERE-${m.id}`)
      )
      .map((p) => ({
        ...p,
        uniqueKey: `MERE-${p.id}`,
        type: "MERE" as const,
      }))
  );

  // Enfants
  selected.push(
    ...allEnfants
      .filter((e) =>
        selectedParticipants.includes(`ENFANT-${e.id}`)
      )
      .map((p) => ({
        ...p,
        uniqueKey: `ENFANT-${p.id}`,
        type: "ENFANT" as const,
      }))
  );

  // Familles
  selected.push(
    ...allFamilles
      .filter((f) =>
        selectedParticipants.includes(`FAMILLE-${f.id}`)
      )
      .map((p) => ({
        ...p,
        uniqueKey: `FAMILLE-${p.id}`,
        type: "FAMILLE" as const,
      }))
  );

  setParticipantsList(selected);
  setIsModalOpen(false);
};

const saveEvent = async () => {
  if (!event) return;

  setIsSaving(true);
  setIsSaved(false);



  const payload: any = {
    extendedProps: {
        typeMontant,
        modeRepartition:
          typeMontant === "DISTRIBUE"
            ? modeRepartition
            : null,

        montantGlobal:
          typeMontant === "GLOBAL"
            ? montantGlobal
            : 0,

        montantEgal:
          typeMontant === "DISTRIBUE" &&
          modeRepartition === "EGAL"
            ? montantEgal
            : 0,

        montantsParDegre:
          typeMontant === "DISTRIBUE" &&
          modeRepartition === "DEGRE"
            ? montantsParDegre
            : {},

        montantTotal: montantTotalEvent,
        chargeSupplementaire: chargeSupp,
        chargeSupplementaireLabel: chargeSuppLabel,
      description: description,


    meresParticipants: participantsList
      .filter((p) => p.type === "MERE")
      .map((p) => ({
        id: p.id,
        present: p.present ?? true,
        motif: p.motif ?? null,

        montant:
          typeMontant === "DISTRIBUE"
            ? getMontantParticipant(p)
            : 0,
      })),
     enfantsParticipants: participantsList
       .filter((p) => p.type === "ENFANT")
       .map((p) => ({
         id: p.id,
         present: p.present ?? true,
         motif: p.motif ?? null,

         montant:
           typeMontant === "DISTRIBUE"
             ? getMontantParticipant(p)
             : 0,
       })),

   famillesParticipants: participantsList
     .filter((p) => p.type === "FAMILLE")
     .map((p) => ({
       id: p.id,
       present: p.present ?? true,
       motif: p.motif ?? null,

       montant:
         typeMontant === "DISTRIBUE"
           ? getMontantParticipant(p)
           : 0,
     })),
    },
  };

  try {
    const res = await fetch(
      `http://localhost:8080/api/events/details/${event.id}`,
      {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      }
    );

    if (!res.ok) {
      throw new Error(await res.text());
    }

    setIsSaved(true);
  } catch (err) {
    console.error("Erreur sauvegarde automatique :", err);
    setIsSaved(false);
  } finally {
    setIsSaving(false);
  }
};


const getMontantParticipant = (p: Participant) => {
  // ================= GLOBAL =================
  // En mode GLOBAL, le montant n'est pas attribué individuellement.
  if (typeMontant === "GLOBAL") {
    return 0;
  }

  // ================= EGAL =================
  if (modeRepartition === "EGAL") {
    return Number(montantEgal || 0);
  }

  // ================= PAR DEGRE =================
  // Pour l'instant le degré concerne les familles.
  if (p.type === "FAMILLE") {
    const famille: any =
      allFamilles.find(
        (f) => f.id === p.id
      );

    const degre =
      famille?.degreFamille ??
      famille?.degre ??
      famille?.degree;

    if (degre == null) {
      return 0;
    }

    return Number(
      montantsParDegre[
        Number(degre)
      ] || 0
    );
  }

  // Mère/enfant en mode DEGRE :
  // 0 tant qu'on ne récupère pas leur famille/degré.
  return 0;
};
const totalMeres =
  typeMontant === "DISTRIBUE"
    ? participantsList
        .filter((p) => p.type === "MERE")
        .reduce(
          (total, p) =>
            total + getMontantParticipant(p),
          0
        )
    : 0;

const totalEnfants =
  typeMontant === "DISTRIBUE"
    ? participantsList
        .filter((p) => p.type === "ENFANT")
        .reduce(
          (total, p) =>
            total + getMontantParticipant(p),
          0
        )
    : 0;

const totalFamilles =
  typeMontant === "DISTRIBUE"
    ? participantsList
        .filter((p) => p.type === "FAMILLE")
        .reduce(
          (total, p) =>
            total + getMontantParticipant(p),
          0
        )
    : 0;

const montantBase =
  typeMontant === "GLOBAL"
    ? Number(montantGlobal || 0)
    : totalMeres + totalEnfants + totalFamilles;

const montantTotalEvent = montantBase + Number(chargeSupp || 0);
const deleteFile = async (indexToDelete: number) => {
  if (!event) return;

  const updatedFiles = existingFiles.filter(
    (_, index) => index !== indexToDelete
  );

  setIsSaving(true);
  setIsSaved(false);

  try {
    const res = await fetch(
      `http://localhost:8080/api/events/details/${event.id}`,
      {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          extendedProps: {
            files: updatedFiles,
          },
        }),
      }
    );

    if (!res.ok) {
      throw new Error(await res.text());
    }

    setExistingFiles(updatedFiles);
    setIsSaved(true);
  } catch (error) {
    console.error("Erreur suppression :", error);
  } finally {
    setIsSaving(false);
  }
};
const importFromExcel = (file: File) => {
  const reader = new FileReader();

  reader.onload = (e) => {
    const data = new Uint8Array(e.target?.result as ArrayBuffer);
    const workbook = XLSX.read(data, { type: "array" });
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];

const aoa = XLSX.utils.sheet_to_json<any[]>(worksheet, { header: 1 });
const headerIdx = Math.max(
  0,
  aoa.findIndex((r) => Array.isArray(r) && r.includes("REFERENCE"))
);
const rows: any[] = XLSX.utils.sheet_to_json(worksheet, { range: headerIdx });

    setParticipantsList((prev) =>
      prev.map((p) => {
        const row = rows.find((r) => r.REFERENCE === p.uniqueKey);

        if (!row) return p;

        return {
          ...p,
          present: row["الحضور"] === "نعم" || row["الحضور"] === "oui",
          motif: row["سبب الغياب"] || "",
        };
      })
    );

    alert("تم استيراد ملف Excel بنجاح");
  };

  reader.readAsArrayBuffer(file);
};
const getParticipantTypeLabel = (
  type?: "MERE" | "ENFANT" | "FAMILLE"
) => {
  switch (type) {
    case "MERE":
      return "أم";
    case "ENFANT":
      return "طفل";
    case "FAMILLE":
      return "عائلة";
    default:
      return "";
  }
};
const [isExportingEvent, setIsExportingEvent] = useState(false);

const downloadBlob = (blob: Blob, filename: string) => {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
};
const getDegreValue = (p: Participant): number | null => {
  // 1. envoyé par le backend
  if ((p as any).degreFamille != null) return Number((p as any).degreFamille);

  // 2. sinon, retrouvé via les listes chargées
  let f: any;
  if (p.type === "FAMILLE") {
    f = allFamilles.find((x) => x.id === p.id);
  } else if (p.type === "MERE") {
    f = allFamilles.find((x: any) => (x.mere?.id ?? x.mereId) === p.id);
  } else if (p.type === "ENFANT") {
    const e: any = allEnfants.find((x) => x.id === p.id);
    const mereId = e?.mere?.id ?? e?.mereId;
    f =
      e?.famille ||
      (mereId != null
        ? allFamilles.find((x: any) => (x.mere?.id ?? x.mereId) === mereId)
        : undefined);
  }

  const d = f?.degreFamille ?? f?.degre ?? f?.degree;
  return d != null ? Number(d) : null;
};
const buildRows = (): ParticipantRow[] =>
  participantsList.map((p) => {
    const fullFamille: any =
      p.type === "FAMILLE"
        ? allFamilles.find((f) => f.id === p.id)
        : undefined;

    const pereNom = p.pere?.nom || fullFamille?.pere?.nom || "";

    const degreValue =
      fullFamille?.degreFamille ??
      fullFamille?.degre ??
      fullFamille?.degree;

    return {
      typeLabel: getParticipantTypeLabel(p.type),
      prefixe: p.type === "FAMILLE" ? "عائلة" : "",
      nomComplet:
        p.type === "FAMILLE"
          ? pereNom
          : `${p.nom || ""} ${p.prenom || ""}`.trim(),
     degre: getDegreValue(p) != null ? String(getDegreValue(p)) : "-",
      montant:
        typeMontant === "GLOBAL"
          ? "-"
          : `${getMontantParticipant(p).toFixed(2)} DH`,
      present: p.present ?? true,
      motif: p.motif || "",
    };
  });

const exportParticipantsPdf = async () => {
  if (!event) return;
  try {
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
    downloadBlob(blob, `المشاركون_${event.title || "النشاط"}.pdf`);
  } catch (error) {
    console.error("Erreur génération PDF participants :", error);
  }
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
    downloadBlob(blob, `تقرير_النشاط_${event.title || "النشاط"}.pdf`);
  } catch (error) {
    console.error("Erreur génération rapport :", error);
  } finally {
    setIsExportingEvent(false);
  }
};
const exportToExcel = async () => {
  if (!participantsList.length || !event) return;

  // ===== Quelles cibles sont présentes dans l'événement ? =====
  const cibles = (event.cibles || []).map((c) => String(c).trim().toUpperCase());
  const hasFamille = cibles.includes("FAMILLE");
  const hasEnfant = cibles.includes("ENFANT");
  const hasMere = cibles.includes("MERE");
  const showMontant = typeMontant !== "GLOBAL";

  // Famille seule => une seule colonne "العائلة" (+ degré)
  const onlyFamille = hasFamille && !hasEnfant && !hasMere;

  // ===== Définition dynamique des colonnes =====
  type Col = {
    key: string;
    header: string;
    width: number;
    hidden?: boolean;
    align?: "center" | "right";
    get: (p: Participant, index: number) => string | number | null;
  };

   // Retrouve la famille liée à une mère / un enfant / une famille
   const getFamille = (p: Participant): any => {
     const full: any =
       p.type === "MERE"
         ? allMeres.find((m) => m.id === p.id) || p
         : p.type === "ENFANT"
         ? allEnfants.find((e) => e.id === p.id) || p
         : allFamilles.find((f) => f.id === p.id);

     if (p.type === "FAMILLE") return full;

     // Famille directement dans l'objet
     if (full?.famille) return full.famille;

     // Par identifiant de famille
     const familleId = full?.familleId ?? full?.famille_id ?? full?.idFamille;
     if (familleId != null) {
       return allFamilles.find((f) => f.id === familleId);
     }

     // Famille dont la mère est cette mère
     if (p.type === "MERE") {
       return allFamilles.find((f: any) => (f.mere?.id ?? f.mereId) === p.id);
     }

     return undefined;
   };

   const getPereNom = (p: Participant): string => {
     const full: any =
       p.type === "MERE"
         ? allMeres.find((m) => m.id === p.id) || p
         : p.type === "ENFANT"
         ? allEnfants.find((e) => e.id === p.id) || p
         : p;

     // 1. Père directement sur l'objet
     if (p.pere?.nom) return p.pere.nom;
     if (full?.pere?.nom) return full.pere.nom;

     // 2. Père via la famille
     const f = getFamille(p);
     if (f?.pere?.nom) return f.pere.nom;

     // 3. Nom de famille du premier enfant de la mère
     const enfants: any[] =
       full?.enfants ||
       allEnfants.filter(
         (e: any) => (e.mere?.id ?? e.mereId) === p.id
       );
     if (enfants?.length) {
       return enfants[0]?.nom || enfants[0]?.pere?.nom || "";
     }

     return "";
   };
const getDegre = (p: Participant) => getDegreValue(p);

  const cols: Col[] = [];

  cols.push({ key: "n", header: "#", width: 6, get: (_p, i) => i + 1 });
  cols.push({ key: "ref", header: "REFERENCE", width: 14, hidden: true, get: (p) => p.uniqueKey || "" });

  // Colonne "النوع" seulement si plusieurs types
  if (cibles.length > 1) {
    cols.push({ key: "type", header: "النوع", width: 12, get: (p) => getParticipantTypeLabel(p.type) });
  }

  if (onlyFamille) {
    // --- FAMILLE uniquement : une seule colonne ---
    cols.push({
      key: "famille",
      header: "العائلة",
      width: 30,
      get: (p) => `عائلة ${getPereNom(p)}`.trim(),
    });
  } else {
    // --- ENFANT / MÈRE (ou mix) ---
    cols.push({
      key: "nom",
      header: "الاسم",
      width: 24,
      get: (p) => (p.type === "FAMILLE" ? `عائلة ${getPereNom(p)}`.trim() : p.nom || ""),
    });
    cols.push({
      key: "prenom",
      header: "اللقب",
      width: 20,
      get: (p) => (p.type === "FAMILLE" ? "-" : p.prenom || ""),
    });

    // Nom de famille des enfants (= nom du père) : seulement si cible MÈRE
    if (hasMere) {
      cols.push({
        key: "pere",
        header: "اسم عائلة الأطفال",
        width: 24,
        get: (p) => (p.type === "MERE" ? getPereNom(p) || "-" : "-"),
      });
    }
  }

  // Degré : seulement si cible FAMILLE
  cols.push({
    key: "degre",
    header: "الدرجة",
    width: 10,
    get: (p) => getDegre(p) ?? "-",
  });

  if (showMontant) {
    cols.push({
      key: "montant",
      header: "المبلغ (DH)",
      width: 16,
      get: (p) => getMontantParticipant(p),
    });
  }

  cols.push({ key: "present", header: "الحضور", width: 12, get: (p) => ((p.present ?? true) ? "نعم" : "لا") });
  cols.push({ key: "motif", header: "سبب الغياب", width: 30, align: "right", get: (p) => p.motif || "" });

  const COLS = cols.length;
  const colLetter = (n: number) => {
    let s = "";
    while (n > 0) {
      const m = (n - 1) % 26;
      s = String.fromCharCode(65 + m) + s;
      n = Math.floor((n - 1) / 26);
    }
    return s;
  };
  const lastCol = colLetter(COLS);
  const idx = (key: string) => cols.findIndex((c) => c.key === key) + 1; // index 1-based

  // ===== Workbook =====
  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet("لائحة المشاركة", {
    views: [{ rightToLeft: true, state: "frozen", ySplit: 4 }],
    pageSetup: { orientation: "landscape", fitToPage: true, fitToWidth: 1, fitToHeight: 0 },
  });

  const thin = { style: "thin" as const, color: { argb: "FFD1D5DB" } };
  const border = { top: thin, left: thin, bottom: thin, right: thin };

  ws.columns = cols.map((c) => ({ key: c.key, width: c.width, hidden: c.hidden }));

  // ===== Ligne 1 : titre =====
  ws.mergeCells(`A1:${lastCol}1`);
  const title = ws.getCell("A1");
  title.value = `لائحة المشاركة - ${event.title}`;
  title.font = { name: "Arial", size: 16, bold: true, color: { argb: "FFFFFFFF" } };
  title.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF1E3A8A" } };
  title.alignment = { horizontal: "center", vertical: "middle" };
  ws.getRow(1).height = 34;

  // ===== Ligne 2 : infos =====
  ws.mergeCells(`A2:${lastCol}2`);
  const info = ws.getCell("A2");
  info.value =
    `التاريخ: من ${event.startDate} إلى ${event.endDate}` +
    `   |   المكان: ${event.place || "غير محدد"}`;
  info.font = { name: "Arial", size: 11, bold: true, color: { argb: "FF374151" } };
  info.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFEFF6FF" } };
  info.alignment = { horizontal: "center", vertical: "middle" };
  ws.getRow(2).height = 24;

  ws.getRow(3).height = 8;

  // ===== Ligne 4 : en-têtes =====
  const headerRow = ws.getRow(4);
  cols.forEach((c, i) => (headerRow.getCell(i + 1).value = c.header));
  headerRow.height = 26;
  headerRow.eachCell((cell) => {
    cell.font = { name: "Arial", size: 11, bold: true, color: { argb: "FFFFFFFF" } };
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF2563EB" } };
    cell.alignment = { horizontal: "center", vertical: "middle", wrapText: true };
    cell.border = border;
  });

  // ===== Données =====
  const presentCol = idx("present");
  const montantCol = idx("montant"); // 0 si absent
  const nameCol = onlyFamille ? idx("famille") : idx("nom");

  participantsList.forEach((p, index) => {
    const values = cols.map((c) => c.get(p, index));
    const row = ws.addRow(values);
    const isPresent = p.present ?? true;

    row.height = 22;
    const zebra = index % 2 === 0 ? "FFFFFFFF" : "FFF9FAFB";

    row.eachCell({ includeEmpty: true }, (cell, colNumber) => {
      if (colNumber > COLS) return;
      cell.font = { name: "Arial", size: 11 };
      cell.border = border;
      cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: zebra } };
      cell.alignment = {
        horizontal: cols[colNumber - 1].align || "center",
        vertical: "middle",
        wrapText: true,
      };
    });

    // Nom de famille en gras
    if (p.type === "FAMILLE" && nameCol > 0) {
      row.getCell(nameCol).font = { name: "Arial", size: 11, bold: true };
    }

    // Montant formaté
    if (montantCol > 0) {
      row.getCell(montantCol).numFmt = '#,##0.00 "DH"';
      row.getCell(montantCol).font = {
        name: "Arial", size: 11, bold: true, color: { argb: "FF15803D" },
      };
    }

    // Présence en couleur + liste déroulante
    row.getCell(presentCol).font = {
      name: "Arial", size: 11, bold: true,
      color: { argb: isPresent ? "FF15803D" : "FFDC2626" },
    };
    row.getCell(presentCol).dataValidation = {
      type: "list",
      allowBlank: false,
      formulae: ['"نعم,لا"'],
    };
  });

  // ===== Ligne total (seulement si montant affiché) =====
  // ===== Récapitulatif =====
  const summary: [string, number][] = [
    [showMontant ? "مجموع المبالغ الموزعة" : "المبلغ الإجمالي للنشاط", montantBase],
  ];
  if (chargeSupp > 0) {
    summary.push([
      chargeSuppLabel ? `مصاريف إضافية - ${chargeSuppLabel}` : "مصاريف إضافية",
      Number(chargeSupp),
    ]);
  }
  summary.push(["المجموع الكلي", montantTotalEvent]);

  summary.forEach(([label, value], i) => {
    const isTotal = i === summary.length - 1;
    const r = ws.addRow([]);
    ws.mergeCells(`A${r.number}:${colLetter(COLS - 1)}${r.number}`);
    r.getCell(1).value = label;
    r.getCell(COLS).value = value;
    r.getCell(COLS).numFmt = '#,##0.00 "DH"';
    r.height = isTotal ? 26 : 22;
    for (let c = 1; c <= COLS; c++) {
      const cell = r.getCell(c);
      cell.font = { name: "Arial", size: isTotal ? 12 : 11, bold: true,
        color: { argb: isTotal ? "FF065F46" : "FF92400E" } };
      cell.fill = { type: "pattern", pattern: "solid",
        fgColor: { argb: isTotal ? "FFD1FAE5" : "FFFEF3C7" } };
      cell.alignment = { horizontal: "center", vertical: "middle" };
      cell.border = border;
    }
  });

  const buffer = await wb.xlsx.writeBuffer();
  downloadBlob(
    new Blob([buffer], {
      type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    }),
    `لائحة_المشاركة_${event.title || "النشاط"}.xlsx`
  );
};
const filteredParticipants = participants.filter((p: any) => {
  const search = searchParticipant.toLowerCase().trim();

  if (!search) return true;

  return (
    p.nom?.toLowerCase().includes(search) ||
    p.prenom?.toLowerCase().includes(search) ||
    p.pere?.nom?.toLowerCase().includes(search)
  );
});

useEffect(() => {
  if (!event) return;

  // Ne pas sauvegarder immédiatement au premier chargement
  if (firstLoad.current) {
    firstLoad.current = false;
    return;
  }

  setIsSaved(false);

  const timer = setTimeout(() => {
    saveEvent();
  }, 600);

  return () => clearTimeout(timer);
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
  if (!event) return <p>جاري التحميل...</p>;

  return (
    <div className="rtl px-6 py-4">
      <PageMeta title="تفاصيل النشاط" description="تفاصيل وإدارة المشاركين للنشاط" />
      <PageBreadcrumb pageTitle="تفاصيل النشاط" />

    {/* ====================== EVENT HEADER ====================== */}
    <div
      dir="rtl"
      className="
        mb-6 overflow-hidden rounded-3xl
        border border-gray-200 bg-white
        shadow-sm
        dark:border-gray-800 dark:bg-gray-900
      "
    >
      {/* HEADER */}
      <div className="border-b border-gray-100 px-6 py-6 dark:border-gray-800 lg:px-8">

        <div className="flex flex-col gap-5 md:flex-row md:items-center md:justify-between">

          {/* TITRE */}
          <div className="flex items-center gap-4">

            <div
              className="
                flex h-14 w-14 shrink-0 items-center justify-center
                rounded-2xl bg-blue-50 text-blue-600
                dark:bg-blue-500/10 dark:text-blue-400
              "
            >
              <svg
                width="26"
                height="26"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
              >
                <rect x="3" y="5" width="18" height="16" rx="2" />
                <path d="M16 3v4M8 3v4M3 10h18" />
              </svg>
            </div>

            <div>
              <p className="mb-1 text-xs font-semibold text-blue-600">
                تفاصيل النشاط
              </p>

              <h1 className="text-xl font-bold text-gray-900 dark:text-white lg:text-2xl">
                {event.title}
              </h1>

              <p className="mt-1 text-sm text-gray-400">
                المعلومات الأساسية الخاصة بالنشاط
              </p>
            </div>
          </div>


          {/* CIBLES BADGES */}
          <div className="flex flex-wrap gap-2">
            {event.cibles?.map((cible) => (
              <span
                key={cible}
                className="
                  inline-flex items-center gap-1.5
                  rounded-full border border-blue-100
                  bg-blue-50 px-3 py-1.5
                  text-xs font-semibold text-blue-600
                  dark:border-blue-500/20 dark:bg-blue-500/10
                "
              >
                <span className="h-1.5 w-1.5 rounded-full bg-blue-500" />

                {getCibleLabel(cible)}
              </span>
            ))}
          </div>

        </div>
      </div>


      {/* INFORMATION CARDS */}
      <div className="grid grid-cols-1 gap-4 p-6 sm:grid-cols-2 lg:grid-cols-4 lg:p-8">

        {/* DATE */}
        <div
          className="
            rounded-2xl border border-gray-100
            bg-gray-50/70 p-4
            transition duration-200
            hover:-translate-y-0.5 hover:shadow-sm
            dark:border-gray-800 dark:bg-gray-800/40
          "
        >
          <div className="mb-3 flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
              <svg
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <rect x="3" y="5" width="18" height="16" rx="2" />
                <path d="M16 3v4M8 3v4M3 10h18" />
              </svg>
            </div>

            <span className="text-xs font-semibold text-gray-400">
              تاريخ النشاط
            </span>
          </div>

          <div className="space-y-1 text-sm">
            <p className="font-semibold text-gray-700 dark:text-gray-200">
              من {event.startDate}
            </p>

            <p className="text-gray-500">
              إلى {event.endDate}
            </p>
          </div>
        </div>


        {/* PLACE */}
        <div
          className="
            rounded-2xl border border-gray-100
            bg-gray-50/70 p-4
            transition duration-200
            hover:-translate-y-0.5 hover:shadow-sm
            dark:border-gray-800 dark:bg-gray-800/40
          "
        >
          <div className="mb-3 flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-purple-50 text-purple-600">
              <svg
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <path d="M20 10c0 5-8 11-8 11S4 15 4 10a8 8 0 1 1 16 0Z" />
                <circle cx="12" cy="10" r="2.5" />
              </svg>
            </div>

            <span className="text-xs font-semibold text-gray-400">
              مكان النشاط
            </span>
          </div>

          <p className="text-sm font-semibold text-gray-700 dark:text-gray-200">
            {event.place || "غير محدد"}
          </p>
        </div>


    {/* ====================== DEGRE FAMILLE ====================== */}
    {event.degresFamille && event.degresFamille.length > 0 && (
      <div
        className="
          rounded-2xl border border-gray-100
          bg-gray-50/70 p-4
          transition duration-200
          hover:-translate-y-0.5 hover:shadow-sm
          dark:border-gray-800 dark:bg-gray-800/40
        "
      >
        <div className="mb-3 flex items-center gap-2">
          <div className="
            flex h-9 w-9 items-center justify-center
            rounded-xl bg-amber-50 text-amber-600
          ">
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <path d="M4 19V9" />
              <path d="M10 19V5" />
              <path d="M16 19V12" />
              <path d="M22 19V3" />
            </svg>
          </div>

          <span className="text-xs font-semibold text-gray-400">
            درجة العائلة المستهدفة
          </span>
        </div>

        <div className="flex flex-wrap gap-2">
          {event.degresFamille.map((degre) => (
            <span
              key={degre}
              className="
                inline-flex items-center gap-1.5
                rounded-lg border border-amber-100
                bg-amber-50 px-3 py-1.5
                text-xs font-bold text-amber-700
              "
            >
              <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
              الدرجة {degre}
            </span>
          ))}
        </div>
      </div>
    )}


    {/* ====================== AGE - ENFANT UNIQUEMENT ====================== */}
    {event.cibles?.includes("ENFANT") && (
      <div
        className="
          rounded-2xl border border-gray-100
          bg-gray-50/70 p-4
          transition duration-200
          hover:-translate-y-0.5 hover:shadow-sm
          dark:border-gray-800 dark:bg-gray-800/40
        "
      >
        <div className="mb-3 flex items-center gap-2">
          <div className="
            flex h-9 w-9 items-center justify-center
            rounded-xl bg-green-50 text-green-600
          ">
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <circle cx="12" cy="8" r="4" />
              <path d="M4 21a8 8 0 0 1 16 0" />
            </svg>
          </div>

          <span className="text-xs font-semibold text-gray-400">
            الفئة العمرية المستهدفة
          </span>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {event.ageMin != null && (
            <span className="
              rounded-lg bg-green-50
              px-3 py-1.5
              text-sm font-bold text-green-700
            ">
              من {event.ageMin} سنة
            </span>
          )}

          {event.ageMin != null && event.ageMax != null && (
            <span className="text-xs text-gray-400">
              إلى
            </span>
          )}

          {event.ageMax != null && (
            <span className="
              rounded-lg bg-green-50
              px-3 py-1.5
              text-sm font-bold text-green-700
            ">
              {event.ageMax} سنة
            </span>
          )}
        </div>
           </div>
         )}

       </div>
       {/* FIN INFORMATION CARDS */}

     </div>
     {/* FIN EVENT HEADER */}


     {/* ====================== DESCRIPTION ====================== */}
     <div
       dir="rtl"
  className="
    mb-6 overflow-hidden rounded-3xl
    border border-gray-200 bg-white
    shadow-sm
    dark:border-gray-800 dark:bg-gray-900
  "
>
  {/* HEADER */}
  <div className="flex items-center justify-between border-b border-gray-100 px-6 py-5 dark:border-gray-800">

    <div className="flex items-center gap-3">

      <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600">
        <svg
          width="21"
          height="21"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
        >
          <path d="M4 6h16M4 12h16M4 18h10" />
        </svg>
      </div>

      <div>
        <h4 className="font-bold text-gray-800 dark:text-white">
          معلومات حول النشاط
        </h4>

        <p className="mt-1 text-xs text-gray-400">
          أضف وصف النشاط، الأهداف، الملاحظات أو النتائج
        </p>
      </div>

    </div>

    {/* AUTOSAVE */}
    <div className="flex items-center gap-2">
      {isSaving ? (
        <>
          <span className="h-2 w-2 animate-pulse rounded-full bg-blue-500" />
          <span className="text-xs text-gray-400">
            جاري الحفظ...
          </span>
        </>
      ) : isSaved ? (
        <>
          <span className="flex h-5 w-5 items-center justify-center rounded-full bg-green-100 text-[10px] font-bold text-green-600">
            ✓
          </span>

          <span className="text-xs font-medium text-green-600">
            تم الحفظ
          </span>
        </>
      ) : null}
    </div>

  </div>


 {/* ====================== HTML EDITOR ====================== */}
 <div className="p-6">

   <div
     className="
       overflow-hidden rounded-2xl
       border border-gray-200 bg-white
       shadow-sm transition-all
       focus-within:border-indigo-300
       focus-within:ring-4 focus-within:ring-indigo-500/5
       dark:border-gray-700 dark:bg-gray-900
     "
   >

     {/* TOOLBAR */}
     <div
       dir="rtl"
       className="
         flex flex-wrap items-center gap-1.5
         border-b border-gray-100
         bg-gray-50/80 px-4 py-3
         dark:border-gray-800 dark:bg-gray-800/50
       "
     >

       {/* UNDO */}
       <button
         type="button"
         title="تراجع"
         onClick={() => editor?.chain().focus().undo().run()}
         disabled={!editor?.can().undo()}
         className="flex h-9 w-9 items-center justify-center rounded-lg text-gray-500 transition hover:bg-white hover:text-indigo-600 hover:shadow-sm disabled:opacity-30"
       >
         ↶
       </button>

       {/* REDO */}
       <button
         type="button"
         title="إعادة"
         onClick={() => editor?.chain().focus().redo().run()}
         disabled={!editor?.can().redo()}
         className="flex h-9 w-9 items-center justify-center rounded-lg text-gray-500 transition hover:bg-white hover:text-indigo-600 hover:shadow-sm disabled:opacity-30"
       >
         ↷
       </button>

       <div className="mx-1 h-6 w-px bg-gray-200 dark:bg-gray-700" />

       {/* BOLD */}
       <button
         type="button"
         title="عريض"
         onClick={() => editor?.chain().focus().toggleBold().run()}
         className={`
           flex h-9 w-9 items-center justify-center rounded-lg
           text-sm font-bold transition
           ${
             editor?.isActive("bold")
               ? "bg-indigo-100 text-indigo-700"
               : "text-gray-600 hover:bg-white hover:text-indigo-600"
           }
         `}
       >
         B
       </button>

       {/* ITALIC */}
       <button
         type="button"
         title="مائل"
         onClick={() => editor?.chain().focus().toggleItalic().run()}
         className={`
           flex h-9 w-9 items-center justify-center rounded-lg
           text-sm italic transition
           ${
             editor?.isActive("italic")
               ? "bg-indigo-100 text-indigo-700"
               : "text-gray-600 hover:bg-white hover:text-indigo-600"
           }
         `}
       >
         I
       </button>

       {/* UNDERLINE */}
       <button
         type="button"
         title="تحته خط"
         onClick={() => editor?.chain().focus().toggleUnderline().run()}
         className={`
           flex h-9 w-9 items-center justify-center rounded-lg
           text-sm underline transition
           ${
             editor?.isActive("underline")
               ? "bg-indigo-100 text-indigo-700"
               : "text-gray-600 hover:bg-white hover:text-indigo-600"
           }
         `}
       >
         U
       </button>

       <div className="mx-1 h-6 w-px bg-gray-200 dark:bg-gray-700" />

       {/* PARAGRAPH */}
       <button
         type="button"
         onClick={() => editor?.chain().focus().setParagraph().run()}
         className={`
           h-9 rounded-lg px-3 text-xs font-semibold transition
           ${
             editor?.isActive("paragraph")
               ? "bg-indigo-100 text-indigo-700"
               : "text-gray-600 hover:bg-white"
           }
         `}
       >
         نص
       </button>

       {/* H2 */}
       <button
         type="button"
         onClick={() =>
           editor?.chain().focus().toggleHeading({ level: 2 }).run()
         }
         className={`
           h-9 rounded-lg px-3 text-xs font-bold transition
           ${
             editor?.isActive("heading", { level: 2 })
               ? "bg-indigo-100 text-indigo-700"
               : "text-gray-600 hover:bg-white"
           }
         `}
       >
         عنوان
       </button>

       {/* H3 */}
       <button
         type="button"
         onClick={() =>
           editor?.chain().focus().toggleHeading({ level: 3 }).run()
         }
         className={`
           h-9 rounded-lg px-3 text-xs font-semibold transition
           ${
             editor?.isActive("heading", { level: 3 })
               ? "bg-indigo-100 text-indigo-700"
               : "text-gray-600 hover:bg-white"
           }
         `}
       >
         عنوان فرعي
       </button>

       <div className="mx-1 h-6 w-px bg-gray-200 dark:bg-gray-700" />

       {/* BULLET LIST */}
       <button
         type="button"
         title="قائمة نقطية"
         onClick={() =>
           editor?.chain().focus().toggleBulletList().run()
         }
         className={`
           flex h-9 items-center gap-2 rounded-lg px-3
           text-xs font-medium transition
           ${
             editor?.isActive("bulletList")
               ? "bg-indigo-100 text-indigo-700"
               : "text-gray-600 hover:bg-white"
           }
         `}
       >
         <span className="text-lg">•</span>
         قائمة
       </button>

       {/* ORDERED LIST */}
       <button
         type="button"
         title="قائمة مرقمة"
         onClick={() =>
           editor?.chain().focus().toggleOrderedList().run()
         }
         className={`
           flex h-9 items-center gap-2 rounded-lg px-3
           text-xs font-medium transition
           ${
             editor?.isActive("orderedList")
               ? "bg-indigo-100 text-indigo-700"
               : "text-gray-600 hover:bg-white"
           }
         `}
       >
         <span className="font-bold">1.</span>
         ترقيم
       </button>

       <div className="mx-1 h-6 w-px bg-gray-200 dark:bg-gray-700" />

       {/* ALIGN RIGHT */}
       <button
         type="button"
         title="محاذاة إلى اليمين"
         onClick={() =>
           editor?.chain().focus().setTextAlign("right").run()
         }
         className="flex h-9 w-9 items-center justify-center rounded-lg text-gray-600 transition hover:bg-white hover:text-indigo-600"
       >
         ≡
       </button>

       {/* ALIGN CENTER */}
       <button
         type="button"
         title="توسيط"
         onClick={() =>
           editor?.chain().focus().setTextAlign("center").run()
         }
         className="flex h-9 w-9 items-center justify-center rounded-lg text-gray-600 transition hover:bg-white hover:text-indigo-600"
       >
         ≣
       </button>

       {/* COLOR */}
       <div
         className="
           mr-auto flex h-9 items-center gap-2
           rounded-lg border border-gray-200
           bg-white px-3
         "
       >
         <span className="text-xs text-gray-500">
           لون النص
         </span>

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
           className="h-5 w-6 cursor-pointer border-0 bg-transparent p-0"
         />
       </div>

     </div>


     {/* EDITABLE AREA */}
     <div
       dir="rtl"
       className="
         relative min-h-[280px]
         bg-white
         dark:bg-gray-900

         [&_.ProseMirror]:min-h-[280px]
         [&_.ProseMirror]:outline-none

         [&_.ProseMirror_h2]:mb-3
         [&_.ProseMirror_h2]:mt-5
         [&_.ProseMirror_h2]:text-xl
         [&_.ProseMirror_h2]:font-bold

         [&_.ProseMirror_h3]:mb-2
         [&_.ProseMirror_h3]:mt-4
         [&_.ProseMirror_h3]:text-lg
         [&_.ProseMirror_h3]:font-bold

         [&_.ProseMirror_p]:my-2

         [&_.ProseMirror_ul]:my-3
         [&_.ProseMirror_ul]:list-disc
         [&_.ProseMirror_ul]:pr-7

         [&_.ProseMirror_ol]:my-3
         [&_.ProseMirror_ol]:list-decimal
         [&_.ProseMirror_ol]:pr-7

         [&_.ProseMirror_li]:my-1
       "
     >
       <EditorContent editor={editor} />
     </div>


     {/* FOOTER */}
     <div
       className="
         flex items-center justify-between
         border-t border-gray-100
         bg-gray-50/50 px-5 py-2.5
         dark:border-gray-800 dark:bg-gray-800/30
       "
     >

       <span className="text-[11px] text-gray-400">
         محرر النصوص
       </span>

       <div className="flex items-center gap-2">
         {isSaving ? (
           <>
             <span className="h-2 w-2 animate-pulse rounded-full bg-indigo-500" />
             <span className="text-xs text-gray-400">
               جاري الحفظ...
             </span>
           </>
         ) : isSaved ? (
           <>
             <span className="flex h-5 w-5 items-center justify-center rounded-full bg-green-100 text-[10px] font-bold text-green-600">
               ✓
             </span>

             <span className="text-xs font-medium text-green-600">
               تم الحفظ تلقائياً
             </span>
           </>
         ) : (
           <span className="text-xs text-red-500">
             تعذر الحفظ
           </span>
         )}
       </div>

     </div>

      </div>
    </div>

  </div>
  {/* FIN DESCRIPTION */}


  {/* ====================== FICHIERS DU النشاط ====================== */}
  <div
    dir="rtl"
       className="
         mb-6 overflow-hidden rounded-2xl
         border border-gray-200
         bg-white
         shadow-sm
         dark:border-gray-800
         dark:bg-gray-900
       "
     >
       {/* Header */}
       <div
         className="
           flex flex-col gap-2
           border-b border-gray-100
           px-6 py-5
           dark:border-gray-800
         "
       >
         <div className="flex items-center justify-between">

           <div className="flex items-center gap-3">
             <div
               className="
                 flex h-11 w-11 items-center justify-center
                 rounded-xl bg-blue-50 text-blue-600
               "
             >
               <svg
                 width="22"
                 height="22"
                 viewBox="0 0 24 24"
                 fill="none"
                 stroke="currentColor"
                 strokeWidth="1.8"
               >
                 <path d="M21.44 11.05 12.25 20.24a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48" />
               </svg>
             </div>

             <div>
               <h4 className="text-lg font-bold text-gray-800 dark:text-white">
                 ملفات النشاط
               </h4>

               <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                 أضف الصور والوثائق المتعلقة بالنشاط
               </p>
             </div>
           </div>

           {existingFiles.length > 0 && (
             <span
               className="
                 rounded-full bg-blue-50
                 px-3 py-1.5
                 text-xs font-semibold text-blue-600
               "
             >
               {existingFiles.length} ملف
             </span>
           )}

         </div>
       </div>

       <div className="p-6">

         {/* ================= DROPZONE ================= */}

         <DropzoneComponent1
           label="إضافة ملفات"
           id="eventFiles"
           accept={{
             "image/jpeg": [".jpg", ".jpeg"],
             "image/png": [".png"],
             "image/webp": [".webp"],

             "application/pdf": [".pdf"],

             "application/msword": [".doc"],

             "application/vnd.openxmlformats-officedocument.wordprocessingml.document":
               [".docx"],

             "application/vnd.ms-excel": [".xls"],

             "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet":
               [".xlsx"],
           }}
           multiple
           onFileSelect={async (fileOrFiles) => {

             const selectedFiles = Array.isArray(fileOrFiles)
               ? fileOrFiles
               : [fileOrFiles];

             await saveFiles(selectedFiles);
           }}
         />


         {/* ================= FICHIERS ================= */}

         {existingFiles.length > 0 && (

           <div className="mt-7">

             {/* titre liste */}

             <div className="mb-4 flex items-center justify-between">

               <div>
                 <h5 className="font-bold text-gray-800 dark:text-white">
                   الملفات المرفقة
                 </h5>

                 <p className="mt-1 text-xs text-gray-400">
                   اضغط على الملف لفتحه أو تحميله
                 </p>
               </div>

             </div>


             {/* GRID */}

             <div
               className="
                 grid grid-cols-1 gap-3
                 md:grid-cols-2
                 xl:grid-cols-3
               "
             >

               {existingFiles.map((file, idx) => {

                 const fileName =
                   file.name || `ملف-${idx + 1}`;

                 const blobFile = base64ToFile(
                   file.base64,
                   file.type,
                   fileName
                 );

                 const fileUrl =
                   URL.createObjectURL(blobFile);


                 /* TYPES */

                 const isImage =
                   file.type?.startsWith("image/");

                 const isPdf =
                   file.type === "application/pdf";

                 const isWord =
                   file.type === "application/msword" ||
                   file.type ===
                     "application/vnd.openxmlformats-officedocument.wordprocessingml.document";

                 const isExcel =
                   file.type === "application/vnd.ms-excel" ||
                   file.type ===
                     "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";


                 /* LABEL */

                 const fileTypeLabel = isImage
                   ? "صورة"
                   : isPdf
                   ? "PDF"
                   : isWord
                   ? "Word"
                   : isExcel
                   ? "Excel"
                   : "ملف";


                 return (

                   <div
                     key={`file-${idx}`}
                     className="
                       group
                       flex items-center gap-4
                       rounded-xl
                       border border-gray-200
                       bg-white
                       p-3
                       transition-all duration-200

                       hover:-translate-y-[2px]
                       hover:border-blue-200
                       hover:shadow-md

                       dark:border-gray-700
                       dark:bg-gray-800
                     "
                   >

                     {/* ================= ICON / IMAGE ================= */}

                     <button
                       type="button"
                       onClick={() =>
                         window.open(fileUrl, "_blank")
                       }
                       className="
                         flex h-14 w-14
                         shrink-0
                         items-center justify-center
                         overflow-hidden
                         rounded-xl
                         bg-gray-50
                         transition
                         group-hover:bg-blue-50
                         dark:bg-gray-700
                       "
                     >

                       {isImage ? (

                         <img
                        src={file.base64}
                           alt={fileName}
                           className="
                             h-full w-full
                             object-cover
                           "
                         />

                       ) : isPdf ? (

                         <div
                           className="
                             flex h-full w-full
                             items-center justify-center
                             rounded-xl
                             bg-red-50
                             text-red-500
                           "
                         >
                           <span className="text-xl font-bold">
                             PDF
                           </span>
                         </div>

                       ) : isWord ? (

                         <div
                           className="
                             flex h-full w-full
                             items-center justify-center
                             rounded-xl
                             bg-blue-50
                             text-blue-600
                           "
                         >
                           <span className="text-lg font-bold">
                             W
                           </span>
                         </div>

                       ) : isExcel ? (

                         <div
                           className="
                             flex h-full w-full
                             items-center justify-center
                             rounded-xl
                             bg-green-50
                             text-green-600
                           "
                         >
                           <span className="text-lg font-bold">
                             X
                           </span>
                         </div>

                       ) : (

                         <div
                           className="
                             flex h-full w-full
                             items-center justify-center
                             rounded-xl
                             bg-gray-100
                             text-gray-500
                           "
                         >
                           📎
                         </div>

                       )}

                     </button>


                     {/* ================= INFORMATION ================= */}

                     <div className="min-w-0 flex-1">

                       <button
                         type="button"
                         onClick={() =>
                           window.open(fileUrl, "_blank")
                         }
                         title={fileName}
                         className="
                           block w-full
                           truncate
                           text-right
                           text-sm
                           font-semibold
                           text-gray-800
                           transition
                           hover:text-blue-600
                           dark:text-white
                         "
                       >
                         {fileName}
                       </button>


                       <div className="mt-1.5 flex items-center gap-2">

                         <span
                           className={`
                             rounded-md px-2 py-0.5
                             text-[10px] font-semibold

                             ${
                               isPdf
                                 ? "bg-red-50 text-red-500"
                                 : isWord
                                 ? "bg-blue-50 text-blue-600"
                                 : isExcel
                                 ? "bg-green-50 text-green-600"
                                 : isImage
                                 ? "bg-purple-50 text-purple-600"
                                 : "bg-gray-100 text-gray-500"
                             }
                           `}
                         >
                           {fileTypeLabel}
                         </span>

                       </div>

                     </div>


                     {/* ================= ACTIONS ================= */}

                     <div className="flex shrink-0 items-center gap-1">

                       {/* OUVRIR */}

                       <button
                         type="button"
                         title="فتح الملف"
                         onClick={() =>
                           window.open(fileUrl, "_blank")
                         }
                         className="
                           flex h-9 w-9
                           items-center justify-center
                           rounded-lg
                           text-gray-400
                           transition

                           hover:bg-blue-50
                           hover:text-blue-600
                         "
                       >
                         <svg
                           width="17"
                           height="17"
                           viewBox="0 0 24 24"
                           fill="none"
                           stroke="currentColor"
                           strokeWidth="2"
                         >
                           <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12Z" />
                           <circle cx="12" cy="12" r="3" />
                         </svg>
                       </button>


                       {/* DOWNLOAD */}

                       <a
                         href={fileUrl}
                         download={fileName}
                         title="تحميل الملف"
                         className="
                           flex h-9 w-9
                           items-center justify-center
                           rounded-lg
                           text-gray-400
                           transition

                           hover:bg-green-50
                           hover:text-green-600
                         "
                       >
                         <svg
                           width="17"
                           height="17"
                           viewBox="0 0 24 24"
                           fill="none"
                           stroke="currentColor"
                           strokeWidth="2"
                         >
                           <path d="M12 3v12" />
                           <path d="m7 10 5 5 5-5" />
                           <path d="M5 21h14" />
                         </svg>
                       </a>


                       {/* DELETE */}

                  <button
                    type="button"
                    title="حذف الملف"
                    onClick={() => deleteFile(idx)}
                    className="
                      flex h-9 w-9
                      items-center justify-center
                      rounded-lg
                      text-gray-400
                      transition
                      hover:bg-red-50
                      hover:text-red-500
                    "
                  >
                    <svg
                      width="17"
                      height="17"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                    >
                      <path d="M3 6h18" />
                      <path d="M8 6V4h8v2" />
                      <path d="M19 6l-1 14H6L5 6" />
                      <path d="M10 11v5" />
                      <path d="M14 11v5" />
                    </svg>
                  </button>

                     </div>

                   </div>

                 );
               })}

             </div>

           </div>

         )}


         {/* ================= EMPTY STATE ================= */}

         {existingFiles.length === 0 && (

           <div
             className="
               mt-5
               rounded-xl
               border border-gray-100
               bg-gray-50
               px-4 py-3
               text-center
               text-xs text-gray-400
             "
           >
             لا توجد ملفات مرفقة حتى الآن
           </div>

         )}

       </div>
     </div>
                     {/* Participants */}
                     <div className="p-5 border border-gray-200 rounded-2xl dark:border-gray-800 lg:p-6 mb-6 text-right">
                       <h4 className="text-lg font-semibold text-gray-800 dark:text-white mb-4">
                         الحاضرين
                       </h4>

                 <div
                   dir="rtl"
                   className="
                     mb-6
                     flex flex-wrap items-center gap-3
                   "
                 >
                   {/* ================= AJOUT PARTICIPANTS ================= */}
                   <button
                     type="button"
                     onClick={openParticipantModal}
                     className="
                       inline-flex h-11 items-center justify-center gap-2
                       rounded-xl
                       bg-indigo-600 px-5
                       text-sm font-semibold text-white
                       shadow-sm
                       transition-all duration-200
                       hover:-translate-y-0.5
                       hover:bg-indigo-700
                       hover:shadow-md
                       active:translate-y-0
                     "
                   >
                     <svg
                       width="18"
                       height="18"
                       viewBox="0 0 24 24"
                       fill="none"
                       stroke="currentColor"
                       strokeWidth="2"
                     >
                       <path d="M12 5v14M5 12h14" />
                     </svg>

                     إضافة المشاركين
                   </button>


                   {/* ================= EXPORT EXCEL ================= */}
                   <button
                     type="button"
                     onClick={exportToExcel}
                     className="
                       inline-flex h-11 items-center justify-center gap-2
                       rounded-xl
                       border border-emerald-200
                       bg-emerald-50 px-5
                       text-sm font-semibold text-emerald-700
                       transition-all duration-200
                       hover:-translate-y-0.5
                       hover:border-emerald-300
                       hover:bg-emerald-100
                       hover:shadow-sm
                       active:translate-y-0
                     "
                   >
                     <svg
                       width="18"
                       height="18"
                       viewBox="0 0 24 24"
                       fill="none"
                       stroke="currentColor"
                       strokeWidth="2"
                     >
                       <path d="M12 3v12" />
                       <path d="m7 10 5 5 5-5" />
                       <path d="M5 21h14" />
                     </svg>

                     تصدير Excel
                   </button>


                   {/* ================= IMPORT EXCEL ================= */}
                   <label
                     className="
                       inline-flex h-11 cursor-pointer
                       items-center justify-center gap-2
                       rounded-xl
                       border border-blue-200
                       bg-blue-50 px-5
                       text-sm font-semibold text-blue-700
                       transition-all duration-200
                       hover:-translate-y-0.5
                       hover:border-blue-300
                       hover:bg-blue-100
                       hover:shadow-sm
                       active:translate-y-0
                     "
                   >
                     <svg
                       width="18"
                       height="18"
                       viewBox="0 0 24 24"
                       fill="none"
                       stroke="currentColor"
                       strokeWidth="2"
                     >
                       <path d="M12 21V9" />
                       <path d="m7 14 5-5 5 5" />
                       <path d="M5 3h14" />
                     </svg>

                     استيراد Excel

                     <input
                       type="file"
                       accept=".xlsx,.xls"
                       className="hidden"
                       onChange={(e) => {
                         const file = e.target.files?.[0];

                         if (file) {
                           importFromExcel(file);
                         }

                         e.target.value = "";
                       }}
                     />
                   </label>


                   {/* ================= EXPORT PDF ================= */}
             <button
               type="button"
               onClick={exportParticipantsPdf}
               className="
                 inline-flex h-11 items-center justify-center gap-2
                 rounded-xl
                 border border-red-200
                 bg-red-50 px-5
                 text-sm font-semibold text-red-600
                 transition-all duration-200
                 hover:-translate-y-0.5
                 hover:border-red-300
                 hover:bg-red-100
                 hover:shadow-sm
                 active:translate-y-0
               "
             >
               <svg
                 width="18"
                 height="18"
                 viewBox="0 0 24 24"
                 fill="none"
                 stroke="currentColor"
                 strokeWidth="2"
               >
                 <path d="M12 3v12" />
                 <path d="m7 10 5 5 5-5" />
                 <path d="M5 21h14" />
               </svg>

               تصدير PDF
             </button>
                 </div>

                       {/* Modal */}
                    {isModalOpen && (
                      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
                        <div dir="rtl" className="w-[700px] max-h-[85vh] overflow-hidden rounded-2xl bg-white shadow-xl">

                          <div className="border-b p-5">
                            <h3 className="text-xl font-bold text-gray-800">اختيار المشاركين</h3>

                            <input
                              type="text"
                              placeholder="البحث بالاسم أو اللقب..."
                              value={searchParticipant}
                              onChange={(e) => setSearchParticipant(e.target.value)}
                              className="mt-4 w-full rounded-lg border px-4 py-2 text-sm"
                            />

                            <div className="mt-3 flex items-center gap-2">
                              <input
                                type="checkbox"
                                checked={selectAll}
                                onChange={toggleSelectAll}
                              />
                              <span>اختيار الكل</span>
                            </div>
                          </div>

                          <div className="max-h-[50vh] overflow-y-auto p-5">
                            <div className="grid grid-cols-1 gap-2">
                              {filteredParticipants.map((p: any) => (
                                <label
                                  key={p.uniqueKey}
                                  className="flex cursor-pointer items-center justify-between rounded-lg border p-3 hover:bg-gray-50"
                                >
                            <div>
                            <p className="font-semibold text-gray-800">
                              {p.type === "FAMILLE"
                                ? `عائلة ${p.pere?.nom || ""}`
                                : `${p.nom || ""} ${p.prenom || ""}`}
                            </p>

                              <p className="text-xs text-gray-500">
                                {p.type === "MERE"
                                  ? "أم"
                                  : p.type === "ENFANT"
                                  ? "طفل"
                                  : "عائلة"}
                              </p>
                            </div>

                                  <input
                                    type="checkbox"
                                    checked={selectedParticipants.includes(p.uniqueKey!)}
                                    onChange={() => toggleParticipant(p.id, p.type!)}
                                  />
                                </label>
                              ))}

                              {filteredParticipants.length === 0 && (
                                <p className="text-center text-gray-500">لا توجد نتائج</p>
                              )}
                            </div>
                          </div>

                          <div className="flex justify-end gap-2 border-t p-5">
                            <button
                              className="rounded-lg bg-gray-200 px-4 py-2"
                              onClick={() => setIsModalOpen(false)}
                            >
                              إلغاء
                            </button>

                            <button
                              className="rounded-lg bg-blue-500 px-4 py-2 text-white"
                              onClick={confirmParticipants}
                            >
                              تأكيد
                            </button>
                          </div>
                        </div>
                      </div>
                    )}<div
                        dir="rtl"
                        className="mb-6 rounded-2xl border border-green-200 bg-green-50/40 p-5"
                      >
                        <h4 className="mb-4 text-lg font-bold text-gray-800">
                          توزيع المبلغ
                        </h4>

                        <div className="mb-4">
                          <label className="mb-2 block text-sm font-semibold text-gray-700">
                            طريقة احتساب المبلغ
                          </label>

                          <select
                            value={typeMontant}
                            onChange={(e) =>
                              setTypeMontant(
                                e.target.value as "GLOBAL" | "DISTRIBUE"
                              )
                            }
                            className="w-full rounded-lg border px-3 py-2"
                          >
                            <option value="GLOBAL">
                              مبلغ إجمالي للنشاط
                            </option>

                            <option value="DISTRIBUE">
                              توزيع المبلغ على المستفيدين
                            </option>
                          </select>
                        </div>

                        {typeMontant === "GLOBAL" && (
                          <div className="mb-4">
                            <label className="mb-2 block text-sm font-semibold">
                              المبلغ الإجمالي للنشاط
                            </label>

                            <input
                              type="number"
                              min="0"
                              value={montantGlobal}
                              onChange={(e) =>
                                setMontantGlobal(Number(e.target.value))
                              }
                              className="w-full rounded-lg border px-3 py-2"
                            />
                          </div>
                        )}

                        {typeMontant === "DISTRIBUE" && (
                          <>
                            <div className="mb-4">
                              <label className="mb-2 block text-sm font-semibold text-gray-700">
                                طريقة توزيع المبلغ
                              </label>

                              <select
                                value={modeRepartition}
                                onChange={(e) =>
                                  setModeRepartition(
                                    e.target.value as "EGAL" | "DEGRE"
                                  )
                                }
                                className="w-full rounded-lg border px-3 py-2"
                              >
                                <option value="EGAL">
                                  مبلغ متساوٍ لجميع المستفيدين
                                </option>

                                <option value="DEGRE">
                                  مبلغ حسب درجة العائلة
                                </option>
                              </select>
                            </div>

                            {modeRepartition === "EGAL" && (
                              <div className="mb-4">
                                <label className="mb-2 block text-sm font-semibold">
                                  المبلغ لكل مستفيد
                                </label>

                                <input
                                  type="number"
                                  min="0"
                                  value={montantEgal}
                                  onChange={(e) =>
                                    setMontantEgal(Number(e.target.value))
                                  }
                                  className="w-full rounded-lg border px-3 py-2"
                                />
                              </div>
                            )}

                            {modeRepartition === "DEGRE" && (
                              <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
                                {(event.degresFamille || []).map((degre) => (
                                  <div key={degre}>
                                    <label className="mb-1 block text-sm">
                                      الدرجة {degre}
                                    </label>

                                    <input
                                      type="number"
                                      min="0"
                                      value={montantsParDegre[degre] || ""}
                                      onChange={(e) =>
                                        setMontantsParDegre((prev) => ({
                                          ...prev,
                                          [degre]: Number(e.target.value),
                                        }))
                                      }
                                      className="w-full rounded-lg border px-3 py-2"
                                    />
                                  </div>
                                ))}
                              </div>
                            )}
                          </>
                        )}

                 <div className="mt-5 rounded-xl border border-amber-200 bg-amber-50/60 p-4">
                   <h5 className="mb-3 font-bold text-gray-800">مصاريف إضافية (اختياري)</h5>
                   <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                     <div>
                       <label className="mb-1 block text-sm font-semibold text-gray-700">المبلغ الإضافي</label>
                       <input
                         type="number" min="0"
                         value={chargeSupp || ""}
                         onChange={(e) => setChargeSupp(Number(e.target.value))}
                         className="w-full rounded-lg border px-3 py-2"
                       />
                     </div>
                     <div>
                       <label className="mb-1 block text-sm font-semibold text-gray-700">
                         البيان (مثال: النقل، كراء القاعة)
                       </label>
                       <input
                         type="text"
                         value={chargeSuppLabel}
                         onChange={(e) => setChargeSuppLabel(e.target.value)}
                         className="w-full rounded-lg border px-3 py-2"
                       />
                     </div>
                   </div>
                 </div>

                 <div className="mt-5 space-y-2 rounded-xl bg-white p-4">
                   <div className="flex justify-between text-sm text-gray-600">
                     <span>{typeMontant === "GLOBAL" ? "المبلغ الإجمالي" : "مجموع المبالغ الموزعة"}</span>
                     <span>{montantBase.toFixed(2)} DH</span>
                   </div>
                   {chargeSupp > 0 && (
                     <div className="flex justify-between text-sm text-amber-700">
                       <span>مصاريف إضافية{chargeSuppLabel ? ` (${chargeSuppLabel})` : ""}</span>
                       <span>+ {Number(chargeSupp).toFixed(2)} DH</span>
                     </div>
                   )}
                   <div className="flex justify-between border-t pt-2">
                     <span className="font-bold text-gray-800">المجموع الكلي :</span>
                     <span className="text-lg font-bold text-green-600">{montantTotalEvent.toFixed(2)} DH</span>
                   </div>
                 </div>
                      </div>
                       {participantsList.length > 0 ? (
                         <table className="min-w-full text-sm text-gray-700 border border-gray-300 mt-4 text-right">
                           <thead clacd ssName="bg-gray-100 font-semibold text-gray-800">
                             <tr>
                               <th className="p-3 border">الاسم</th>
                               <th className="p-3 border">اللقب</th>
                           <th className="p-3 border">المبلغ</th>
                               <th className="p-3 border">الحضور</th>
                               <th className="p-3 border">سبب الغياب</th>

                             </tr>
                           </thead>
                           <tbody>
                         {participantsList.map((p) => {
                        const isPresent = p.present ?? true;
                           const fullFamille =
                             p.type === "FAMILLE"
                               ? allFamilles.find((f) => f.id === p.id)
                               : undefined;

                           const pereNom =
                             p.pere?.nom ||
                             fullFamille?.pere?.nom ||
                             "";

                           return (
                             <tr key={p.uniqueKey || p.id} className="border-b">

                               <td className="p-2 border">
                                 {p.type === "FAMILLE"
                                   ? "عائلة"
                                   : p.nom}
                               </td>

                               <td className="p-2 border">
                                 {p.type === "FAMILLE"
                                   ? pereNom
                                   : p.prenom}
                               </td>
                          <td className="p-2 border text-center font-semibold">
                            {typeMontant === "GLOBAL"
                              ? "-"
                              : `${getMontantParticipant(p).toFixed(2)} DH`}
                          </td>
                                   <td className="p-2 border text-center">
                                     <select
                                       value={isPresent ? "oui" : "non"}
                                       onChange={(e) => {
                                         setParticipantsList((prev) =>
                                           prev.map((part) =>
                                            part.id === p.id && part.type === p.type
                                              ? {
                                                  ...part,
                                                  present: e.target.value === "oui",
                                                  motif:
                                                    e.target.value === "oui"
                                                      ? ""
                                                      : part.motif,
                                                }
                                              : part
                                           )
                                         );
                                       }}
                                       className="w-full rounded border px-2 py-1 text-sm"
                                     >
                                       <option value="oui">نعم</option>
                                       <option value="non">لا</option>
                                     </select>
                                   </td>
                                   <td className="p-2 border">
                                     {!isPresent && (
                                       <input
                                         type="text"
                                         placeholder="سبب الغياب"
                                         value={p.motif || ""}
                                         onChange={(e) => {
                                           setParticipantsList((prev) =>
                                             prev.map((part) =>
                                              part.id === p.id && part.type === p.type
                                                ? {
                                                    ...part,
                                                    motif: e.target.value,
                                                  }
                                                : part
                                             )
                                           );
                                         }}
                                         className="w-full rounded border px-2 py-1 text-sm"
                                       />
                                     )}
                                   </td>
                                 </tr>
                               );
                             })}
                           </tbody>
                         </table>
                       ) : (
                         <p>لا يوجد مشاركين حتى الآن.</p>
                       )}
                     </div>

                     {/* Save Button */}
                  <div
                    dir="rtl"
                    className="mt-6 flex min-h-[24px] items-center justify-end gap-2 text-sm"
                  >
                    {isSaving ? (
                      <>
                        <span className="h-2 w-2 animate-pulse rounded-full bg-blue-500" />
                        <span className="text-gray-500">
                          جاري الحفظ...
                        </span>
                      </>
                    ) : isSaved ? (
                      <>
                        <span className="flex h-5 w-5 items-center justify-center rounded-full bg-green-100 text-xs font-bold text-green-600">
                          ✓
                        </span>

                        <span className="font-medium text-green-600">
                          تم الحفظ تلقائياً
                        </span>
                      </>
                    ) : (
                      <span className="text-red-500">
                        تعذر الحفظ
                      </span>
                    )}
                {/* ================= EXPORT COMPLET EVENT ================= */}
                <div
                  dir="rtl"
                  className="
                    mt-8 flex justify-center
                    border-t border-gray-200
                    pt-6
                  "
                >
               <button
                 type="button"
                 onClick={exportEventPdf}
                 disabled={isExportingEvent}
                 className="
                   inline-flex min-h-12 items-center justify-center gap-3
                   rounded-2xl bg-slate-900 px-7 py-3
                   text-sm font-bold text-white shadow-md
                   transition-all duration-200
                   hover:-translate-y-0.5 hover:bg-slate-800 hover:shadow-lg
                   disabled:opacity-60
                 "
               >
                 <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                   <path d="M6 2h9l5 5v15H6z" />
                   <path d="M14 2v6h6" />
                   <path d="M9 13h6M9 17h6" />
                 </svg>
                 {isExportingEvent ? "جاري إعداد تقرير النشاط..." : "تصدير تقرير النشاط PDF"}
               </button>
                </div>
                                   </div>


                                 </div>



                             );
                           };

                 export default EventDetails;