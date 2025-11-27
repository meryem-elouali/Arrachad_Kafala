import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import PageBreadcrumb from "../components/common/PageBreadCrumb";
import PageMeta from "../components/common/PageMeta";
import DropzoneComponent1 from "../components/form/form-elements/DropZone1";
import Button from "../components/ui/button/Button";
import * as XLSX from "xlsx";
import jsPDF from "jspdf";
import "jspdf-autotable";

interface Participant {
  id: number;
  nom: string;
  prenom: string;
  age?: number;
  present?: boolean;
  motif?: string;
  uniqueKey?: string; // For unique React keys
}

interface EventFile {
  base64: string;
  type: string;
}

interface EventDetail {
  id: number;
  title: string;
  startDate: string;
  endDate: string;
  cibles: string[];
  description?: string;
  photos?: EventFile[]; // Updated to match backend
  ageMin?: number;
  ageMax?: number;
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
  const [selectedParticipants, setSelectedParticipants] = useState<number[]>([]);
  const [files, setFiles] = useState<File[]>([]);
  const [existingFiles, setExistingFiles] = useState<EventFile[]>([]); // To hold loaded files
  const [description, setDescription] = useState<string>("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectAll, setSelectAll] = useState(false);

  const [allMeres, setAllMeres] = useState<Participant[]>([]);
  const [allEnfants, setAllEnfants] = useState<Participant[]>([]);
  const [allFamilles, setAllFamilles] = useState<Participant[]>([]);

  const convertToBase64 = (file: File): Promise<string> =>
    new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = (error) => reject(error);
    });

  // Convert Base64 back to File for display
  const base64ToFile = (base64: string, type: string, filename: string): File => {
    const byteString = atob(base64.split(',')[1]);
    const mimeString = base64.split(',')[0].split(':')[1].split(';')[0];
    const ab = new ArrayBuffer(byteString.length);
    const ia = new Uint8Array(ab);
    for (let i = 0; i < byteString.length; i++) {
      ia[i] = byteString.charCodeAt(i);
    }
    return new File([ab], filename, { type: mimeString });
  };

  const toggleParticipant = (id: number) => {
    setSelectedParticipants((prev) =>
      prev.includes(id) ? prev.filter((p) => p !== id) : [...prev, id]
    );
  };

  const toggleSelectAll = () => {
    if (selectAll) {
      setSelectedParticipants([]);
      setSelectAll(false);
    } else {
      const allIds = participants.map((p) => p.id);
      setSelectedParticipants(allIds);
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
        setExistingFiles(data.photos || []); // Load existing files

        // Populate participantsList with unique keys
        const eventList: Participant[] = [];
        if (data.meresParticipants) eventList.push(...data.meresParticipants.map(p => ({ ...p, uniqueKey: `mere-${p.id}` })));
        if (data.enfantsParticipants) eventList.push(...data.enfantsParticipants.map(p => ({ ...p, uniqueKey: `enfant-${p.id}` })));
        if (data.famillesParticipants) eventList.push(...data.famillesParticipants.map(p => ({ ...p, uniqueKey: `famille-${p.id}` })));
        setParticipantsList(eventList);
      })
      .catch(console.error);
  }, [id]);

  const openParticipantModal = () => {
    if (!event) return;

    const cibles = event.cibles || [];
    let preselected: number[] = [];
    if (cibles.includes("MERE")) preselected.push(...(event.meresParticipants?.map((p) => p.id) || []));
    if (cibles.includes("ENFANT")) preselected.push(...(event.enfantsParticipants?.map((p) => p.id) || []));
    if (cibles.includes("FAMILLE")) preselected.push(...(event.famillesParticipants?.map((p) => p.id) || []));

    setSelectedParticipants(preselected);

    const list: Participant[] = [];
    if (cibles.includes("MERE")) list.push(...allMeres.map(p => ({ ...p, uniqueKey: `mere-${p.id}` })));
    if (cibles.includes("ENFANT")) {
      const ageMin = event.ageMin ?? 0;
      const ageMax = event.ageMax ?? 100;
      const filtered = allEnfants.filter(e => e.age != null && e.age >= ageMin && e.age <= ageMax); // Fixed: use != null
      list.push(...filtered.map(p => ({ ...p, uniqueKey: `enfant-${p.id}` })));
    }
    if (cibles.includes("FAMILLE")) list.push(...allFamilles.map(p => ({ ...p, uniqueKey: `famille-${p.id}` })));
    setParticipants(list);

    setSelectAll(preselected.length === list.length);
    setIsModalOpen(true);
  };

  const confirmParticipants = () => {
    const selected: Participant[] = [];
    selected.push(...allMeres.filter(m => selectedParticipants.includes(m.id)).map(p => ({ ...p, uniqueKey: `mere-${p.id}` })));
    selected.push(...allEnfants.filter(e => selectedParticipants.includes(e.id)).map(p => ({ ...p, uniqueKey: `enfant-${p.id}` })));
    selected.push(...allFamilles.filter(f => selectedParticipants.includes(f.id)).map(p => ({ ...p, uniqueKey: `famille-${p.id}` })));
    setParticipantsList(selected);
    setIsModalOpen(false);
  };

  const saveEvent = async () => {
    if (!event) return;

    // Merge new files with existing ones (append, don't overwrite)
    const allFilesBase64 = [
      ...existingFiles.map(f => ({ base64: f.base64, type: f.type })),
      ...(await Promise.all(files.map(async (file) => ({ base64: await convertToBase64(file), type: file.type }))))
    ];

    const payload: any = { extendedProps: {} };
    if (description) payload.extendedProps.description = description;
    if (allFilesBase64.length) payload.extendedProps.files = allFilesBase64;

    // Send participants with entity IDs
    payload.extendedProps.meresParticipants = participantsList
      .filter((p) => allMeres.some((m) => m.id === p.id))
      .map((p) => ({ id: p.id, present: p.present ?? true, motif: p.motif ?? null }));

    payload.extendedProps.enfantsParticipants = participantsList
      .filter((p) => allEnfants.some((e) => e.id === p.id))
      .map((p) => ({ id: p.id, present: p.present ?? true, motif: p.motif ?? null }));

    payload.extendedProps.famillesParticipants = participantsList
      .filter((p) => allFamilles.some((f) => f.id === p.id))
      .map((p) => ({ id: p.id, present: p.present ?? true, motif: p.motif ?? null }));

    try {
      const res = await fetch(`http://localhost:8080/api/events/details/${event.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        console.error(await res.text());
        return;
      }

      const updated = await res.json();
      setEvent(updated);
      setExistingFiles(updated.photos || []); // Update loaded files
      setFiles([]); // Clear new uploads after save
      alert("Événement mis à jour avec succès !");
    } catch (err) {
      console.error("Erreur lors de la sauvegarde de l'événement :", err);
    }
  };

  const exportToExcel = () => {
    if (!participantsList.length) return;
    const wsData = participantsList.map((p) => ({
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

  const exportToPDF = () => {
    if (!participantsList.length) return;
    const doc = new jsPDF();
    const tableColumn = ["الاسم", "اللقب", "الحضور", "سبب الغياب"];
    const tableRows = participantsList.map((p) => [p.nom, p.prenom, p.present ? "نعم" : "لا", p.motif || ""]);
    doc.autoTable({ head: [tableColumn], body: tableRows, styles: { font: "helvetica", fontSize: 10, halign: "right" } });
    doc.save(`${event?.title || "participants"}.pdf`);
  };

  if (!event) return <p>جاري التحميل...</p>;

  return (
    <div className="rtl px-6 py-4">
      <PageMeta title="تفاصيل النشاط" description="تفاصيل وإدارة المشاركين للنشاط" />
      <PageBreadcrumb pageTitle="تفاصيل النشاط" />

      {/* Event Info */}
      <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 lg:p-6 mb-6 text-right">
        <h3 className="mb-5 text-lg font-bold text-gray-800 dark:text-white">{event.title}</h3>
        <p className="text-gray-500 dark:text-gray-400">
          <strong>الفئة المستهدفة :</strong> {event.cibles?.join(", ")} <br />
          <strong>من :</strong> {event.startDate} <strong>إلى :</strong> {event.endDate} <br />
          <strong>Place :</strong> {event.place}
        </p>
      </div>

      {/* Description */}
      <div className="p-5 border border-gray-200 rounded-2xl dark:border-gray-800 lg:p-6 mb-6 text-right">
        <h4 className="text-lg font-semibold text-gray-800 dark:text-white mb-4">معلومات حول النشاط</h4>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="اكتب هنا وصف النشاط أو النتائج..."
          className="w-full border border-gray-300 rounded-lg p-3 text-sm text-gray-800 dark:text-white dark:bg-gray-900"
          rows={6}
        />
      </div>

      {/* Fichiers */}
      <div className="p-5 border border-gray-200 rounded-2xl dark:border-gray-800 lg:p-6 mb-6 text-right">
        <h4 className="text-lg font-semibold text-gray-800 dark:text-white mb-4">صور النشاط</h4>
        <DropzoneComponent1
          label="استيراد ملفات النشاط"
          id="eventFiles"
          accept={{
            "image/*": [],
            "application/pdf": [],
            "application/msword": [],
            "application/vnd.openxmlformats-officedocument.wordprocessingml.document": [],
            "application/vnd.ms-excel": [],
            "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": [],
          }}
          multiple
          onFileSelect={(fileOrFiles) => {
            if (Array.isArray(fileOrFiles)) {
              setFiles((prev) => [...prev, ...fileOrFiles]);
            } else {
              setFiles((prev) => [...prev, fileOrFiles]);
            }
          }}
        />

        <div className="mt-4 flex flex-wrap gap-2">
          // Existing files (loaded from backend)
          {existingFiles.map((file, idx) => {
            const blobFile = base64ToFile(file.base64, file.type, `file-${idx}`);
            const fileUrl = URL.createObjectURL(blobFile);
            const renderPreview = () => {
              if (file.type.startsWith("image/"))
                return <img src={fileUrl} alt={`file-${idx}`} className="max-w-full max-h-full object-contain" />;
              if (file.type === "application/pdf") return <span>PDF: file-{idx}</span>;
              if (
                file.type === "application/msword" ||
                file.type === "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
              )
                return <span>DOC: file-{idx}</span>;
              if (
                file.type === "application/vnd.ms-excel" ||
                file.type === "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
              )
                return <span>XLS: file-{idx}</span>;
              return <span>FILE: file-{idx}</span>;
            };
            return (
              <div key={`existing-${idx}`} className="border p-2 rounded relative w-24 h-24 flex flex-col items-center justify-center cursor-pointer bg-gray-50 hover:bg-gray-100">
                <div className="flex-1 w-full flex items-center justify-center" onClick={() => window.open(fileUrl, "_blank")}>
                  {renderPreview()}
                </div>
                <div className="flex gap-1 mt-1">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setExistingFiles((prev) => prev.filter((_, i) => i !== idx));
                    }}
                    className="text-red-500 bg-white rounded-full p-1 text-xs hover:bg-red-50"
                  >
                    ×
                  </button>
                  <a
                    href={fileUrl}
                    download={`file-${idx}`}
                    className="text-blue-500 bg-white rounded-full p-1 text-xs hover:bg-blue-50"
                    onClick={(e) => e.stopPropagation()}
                  >
                    ⬇
                  </a>
                </div>
              </div>
            );
          })}
          // New uploaded files
          {files.map((file, idx) => {
            const fileUrl = URL.createObjectURL(file);
            const renderPreview = () => {
              if (file.type.startsWith("image/"))
                return <img src={fileUrl} alt={file.name} className="max-w-full max-h-full object-contain" />;
              if (file.type === "application/pdf") return <span>PDF: {file.name}</span>;
              if (
                file.type === "application/msword" ||
                file.type === "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
              )
                return <span>DOC: {file.name}</span>;
              if (
                file.type === "application/vnd.ms-excel" ||
                file.type === "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
              )
                return <span>XLS: {file.name}</span>;
              return <span>FILE: {file.name}</span>;
            };
            return (
              <div key={idx} className="border p-2 rounded relative w-24 h-24 flex flex-col items-center justify-center cursor-pointer bg-gray-50 hover:bg-gray-100">
                <div className="flex-1 w-full flex items-center justify-center" onClick={() => window.open(fileUrl, "_blank")}>
                  {renderPreview()}
                </div>
                <div className="flex gap-1 mt-1">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setFiles((prev) => prev.filter((_, i) => i !== idx));
                    }}
                    className="text-red-500 bg-white rounded-full p-1 text-xs hover:bg-red-50"
                  >
                    ×
                  </button>
                  <a
                    href={fileUrl}
                    download={file.name}
                    className="text-blue-500 bg-white rounded-full p-1 text-xs hover:bg-blue-50"
                    onClick={(e) => e.stopPropagation()}
                  >
                    ⬇
                  </a>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Participants */}
      <div className="p-5 border border-gray-200 rounded-2xl dark:border-gray-800 lg:p-6 mb-6 text-right">
        <h4 className="text-lg font-semibold text-gray-800 dark:text-white mb-4">
          الحاضرين
        </h4>

        <div className="flex gap-2 mb-4">
          <Button onClick={exportToExcel} className="bg-green-500 text-white">تصدير Excel</Button>
          <Button onClick={exportToPDF} className="bg-red-500 text-white">تصدير PDF</Button>
        </div>

        <Button onClick={openParticipantModal} className="mb-4 bg-blue-500 text-white">
          إضافة المشاركين
        </Button>

        {/* Modal */}
        {isModalOpen && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50">
            <div className="bg-white p-6 rounded shadow max-h-[80vh] overflow-y-auto w-96 text-right">
              <h3 className="text-xl font-bold mb-4">اختيار المشاركين</h3>

              <div className="mb-2 flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={selectAll}
                  onChange={toggleSelectAll}
                />
                <span>اختيار الكل</span>
              </div>

              <div className="grid grid-cols-2 gap-2">
                {participants.map((p) => (
                  <label key={p.uniqueKey || p.id} className="flex items-center gap-2 border p-1 rounded cursor-pointer">
                    <input
                      type="checkbox"
                      checked={selectedParticipants.includes(p.id)}
                      onChange={() => toggleParticipant(p.id)}
                    />
                    {p.nom} {p.prenom}
                  </label>
                ))}
              </div>

              <div className="mt-4 flex justify-end gap-2">
                <button className="px-4 py-2 bg-gray-300 rounded" onClick={() => setIsModalOpen(false)}>إلغاء</button>
                <button className="px-4 py-2 bg-blue-500 text-white rounded" onClick={confirmParticipants}>تأكيد</button>
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
                              part.id === p.id ? { ...part, present: e.target.value === "oui" } : part
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
                                part.id === p.id ? { ...part, motif: e.target.value } : part
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
      <div className="mt-6 text-right">
        <button onClick={saveEvent} className="px-4 py-2 bg-blue-500 text-white rounded">
          حفظ
        </button>
      </div>
    </div>
  );
};

export default EventDetails;
