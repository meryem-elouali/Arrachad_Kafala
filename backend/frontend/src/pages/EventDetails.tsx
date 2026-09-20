import React, { useEffect, useRef, useState } from "react";
import { useParams } from "react-router-dom";
import PageBreadcrumb from "../components/common/PageBreadCrumb";
import PageMeta from "../components/common/PageMeta";
import DropzoneComponent1 from "../components/form/form-elements/DropZone1";
import Button from "../components/ui/button/Button";
import * as XLSX from "xlsx";

import { PDFDownloadLink } from "@react-pdf/renderer";
import ParticipantsPdf from "./ParticipantsPdf";
interface Participant {
  id: number;
  nom: string;
  prenom: string;
  age?: number;
  present?: boolean;
  motif?: string;
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
}

const EventDetails: React.FC = () => {
  const { id } = useParams();
  const [event, setEvent] = useState<EventDetail | null>(null);
  const [participantsList, setParticipantsList] = useState<Participant[]>([]);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [selectedParticipants, setSelectedParticipants] = useState<string[]>([]);

  const [existingFiles, setExistingFiles] = useState<EventFile[]>([]); // To hold loaded files
  const [description, setDescription] = useState<string>("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectAll, setSelectAll] = useState(false);

  const [allMeres, setAllMeres] = useState<Participant[]>([]);
  const [allEnfants, setAllEnfants] = useState<Participant[]>([]);
  const [allFamilles, setAllFamilles] = useState<Participant[]>([]);
const [isSaving, setIsSaving] = useState(false);
const [isSaved, setIsSaved] = useState(true);

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
      } catch {
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

        // Populate participantsList with unique keys (using entity IDs)
        const eventList: Participant[] = [];
        if (data.meresParticipants) eventList.push(...data.meresParticipants.map(p => ({ ...p, uniqueKey: `MERE-${p.id}`, type: "MERE" })));
        if (data.enfantsParticipants) eventList.push(...data.enfantsParticipants.map(p => ({ ...p, uniqueKey: `ENFANT-${p.id}`, type: "ENFANT" })));
        if (data.famillesParticipants) eventList.push(...data.famillesParticipants.map(p => ({ ...p, uniqueKey: `FAMILLE-${p.id}`, type: "FAMILLE"})));
        setParticipantsList(eventList);
      })
      .catch(console.error);
  }, [id]);
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
const [searchParticipant, setSearchParticipant] = useState("");
 const openParticipantModal = () => {
    if (!event) return;

    const cibles = event.cibles || [];
    // Au lieu de pré-sélectionner depuis event (données sauvegardées), utilise participantsList actuel (changements non sauvegardés)
    const currentKeys = participantsList.map(p => p.uniqueKey!);
    let preselectedKeys: string[] = currentKeys; // Pré-sélectionne ce qui est déjà dans participantsList

    const list: Participant[] = [];

    // Mères
    if (cibles.includes("MERE")) {
      list.push(...allMeres.map(p => ({
        ...p,
        uniqueKey: `MERE-${p.id}`,
        type: "MERE",
        present: participantsList.some(mp => mp.id === p.id && mp.type === "MERE") ? true : undefined
      })));
    }

    // Enfants
    if (cibles.includes("ENFANT")) {
      const ageMin = event.ageMin ?? 0;
      const ageMax = event.ageMax ?? 100;
      const filtered = allEnfants.filter(e => e.age != null && e.age >= ageMin && e.age <= ageMax);
      list.push(...filtered.map(p => ({
        ...p,
        uniqueKey: `ENFANT-${p.id}`,
        type: "ENFANT",
        present: participantsList.some(ep => ep.id === p.id && ep.type === "ENFANT") ? true : undefined
      })));
    }

    // Familles
    if (cibles.includes("FAMILLE")) {
      list.push(...allFamilles.map(p => ({
        ...p,
        uniqueKey: `FAMILLE-${p.id}`,
        type: "FAMILLE",
        present: participantsList.some(fp => fp.id === p.id && fp.type === "FAMILLE") ? true : undefined
      })));
    }

    setSelectedParticipants(preselectedKeys);
    setParticipants(list);
    setSelectAll(preselectedKeys.length === list.length);
    setIsModalOpen(true);
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

  const allFilesBase64 = existingFiles.map((f) => ({
    base64: f.base64,
    type: f.type,
    name: f.name,
  }));

  const payload: any = {
    extendedProps: {
      description: description,
      files: allFilesBase64,

      meresParticipants: participantsList
        .filter((p) => p.type === "MERE")
        .map((p) => ({
          id: p.id,
          present: p.present ?? true,
          motif: p.motif ?? null,
        })),

      enfantsParticipants: participantsList
        .filter((p) => p.type === "ENFANT")
        .map((p) => ({
          id: p.id,
          present: p.present ?? true,
          motif: p.motif ?? null,
        })),

      famillesParticipants: participantsList
        .filter((p) => p.type === "FAMILLE")
        .map((p) => ({
          id: p.id,
          present: p.present ?? true,
          motif: p.motif ?? null,
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

    const rows: any[] = XLSX.utils.sheet_to_json(worksheet);

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
  const exportToExcel = () => {
    if (!participantsList.length) return;
  const wsData = participantsList.map((p: any) => ({
    REFERENCE: p.uniqueKey,   // ex : MERE-15, ENFANT-8, FAMILLE-3
    TYPE: p.type,
    ID: p.id,

    الاسم: p.nom,
    اللقب: p.prenom,
    الحضور: p.present ? "نعم" : "لا",
    "سبب الغياب": p.motif || "",
  }));
    const ws = XLSX.utils.json_to_sheet(wsData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "المشاركين");
    XLSX.writeFile(wb, `${event?.title || "participants"}.xlsx`);
  };
const filteredParticipants = participants.filter((p: any) => {
  const search = searchParticipant.toLowerCase().trim();

  return (
    p.nom?.toLowerCase().includes(search) ||
    p.prenom?.toLowerCase().includes(search)
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
}, [description, participantsList]);
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


        {/* DEGRE */}
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

            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-50 text-amber-600">
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
              درجة العائلة
            </span>
          </div>

          {event.degresFamille?.length ? (
            <div className="flex flex-wrap gap-2">
              {event.degresFamille.map((degre) => (
                <span
                  key={degre}
                  className="
                    rounded-lg bg-amber-50
                    px-2.5 py-1
                    text-xs font-bold text-amber-700
                  "
                >
                  الدرجة {degre}
                </span>
              ))}
            </div>
          ) : (
            <p className="text-sm text-gray-400">
              جميع الدرجات
            </p>
          )}
        </div>


        {/* AGE */}
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

            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-green-50 text-green-600">
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
              الفئة العمرية
            </span>
          </div>

          {event.cibles?.includes("ENFANT") ? (
            <p className="text-sm font-semibold text-gray-700 dark:text-gray-200">
              من {event.ageMin ?? 0} إلى {event.ageMax ?? "∞"} سنة
            </p>
          ) : (
            <p className="text-sm text-gray-400">
              غير مطبق
            </p>
          )}
        </div>

      </div>
    </div>
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


  {/* TOOLBAR */}
  <div className="flex flex-wrap items-center gap-1 border-b border-gray-100 bg-gray-50/60 px-6 py-2 dark:border-gray-800 dark:bg-gray-800/30">

    <button
      type="button"
      title="إضافة نقطة"
      onClick={() =>
        setDescription((prev) =>
          prev ? `${prev}\n• ` : "• "
        )
      }
      className="
        flex h-8 items-center gap-2 rounded-lg
        px-3 text-sm font-medium text-gray-600
        transition hover:bg-white hover:text-blue-600
        hover:shadow-sm
      "
    >
      <span className="text-lg">•</span>
      قائمة
    </button>

    <button
      type="button"
      title="إضافة ترقيم"
      onClick={() =>
        setDescription((prev) =>
          prev ? `${prev}\n1. ` : "1. "
        )
      }
      className="
        flex h-8 items-center gap-2 rounded-lg
        px-3 text-sm font-medium text-gray-600
        transition hover:bg-white hover:text-blue-600
        hover:shadow-sm
      "
    >
      <span>1.</span>
      ترقيم
    </button>

    <div className="mx-2 h-5 w-px bg-gray-200" />

    <span className="text-xs text-gray-400">
      يتم الحفظ تلقائياً أثناء الكتابة
    </span>

  </div>


  {/* EDITOR */}
  <div className="p-6">
    <textarea
      value={description}
      onChange={(e) => setDescription(e.target.value)}
      placeholder={`اكتب معلومات النشاط هنا...

مثال:
• الهدف من النشاط
• الفئة المستفيدة
• أهم النتائج والملاحظات`}
      rows={8}
      className="
        min-h-[190px] w-full resize-y
        rounded-2xl border border-gray-200
        bg-gray-50/40 px-5 py-4
        text-sm leading-8 text-gray-700
        outline-none transition-all
        placeholder:text-gray-300

        focus:border-blue-400
        focus:bg-white
        focus:ring-4
        focus:ring-blue-500/5

        dark:border-gray-700
        dark:bg-gray-800/40
        dark:text-gray-200
      "
    />
  </div>
</div>

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

                       <div className="flex gap-2 mb-4">
                         <Button onClick={exportToExcel} className="bg-green-500 text-white">تصدير Excel</Button>
                     <label className="cursor-pointer rounded bg-blue-500 px-4 py-2 text-white">
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
                     <PDFDownloadLink
                       document={
                         <ParticipantsPdf
                           event={event!}
                           participants={participantsList}
                         />
                       }
                       fileName={`المشاركون_${event?.title}.pdf`}
                     >
                       {({ loading }) => (
                         <Button className="bg-red-500 text-white">
                           {loading ? "جاري إنشاء PDF..." : "تصدير PDF"}
                         </Button>
                       )}
                     </PDFDownloadLink>
                       </div>

                       <Button onClick={openParticipantModal} className="mb-4 bg-blue-500 text-white">
                         إضافة المشاركين
                       </Button>

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
                                      {p.nom} {p.prenom}
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
                    )}

                       {participantsList.length > 0 ? (
                         <table className="min-w-full text-sm text-gray-700 border border-gray-300 mt-4 text-right">
                           <thead className="bg-gray-100 font-semibold text-gray-800">
                             <tr>
                               <th className="p-3 border">الاسم</th>
                               <th className="p-3 border">اللقب</th>
                               <th className="p-3 border">الحضور</th>
                               <th className="p-3 border">سبب الغياب</th>
                             </tr>
                           </thead>
                           <tbody>
                             {participantsList.map((p) => {
                               const isPresent = p.present ?? true;
                               return (
                                 <tr key={p.uniqueKey || p.id} className="border-b">
                                   <td className="p-2 border">{p.nom}</td>
                                   <td className="p-2 border">{p.prenom}</td>
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
                  </div>
                   </div>
                 );
               };

               export default EventDetails;