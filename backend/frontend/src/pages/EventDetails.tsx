import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { Modal } from "../components/ui/modal";
interface Participant {
  id: number;
  nom: string;
  prenom: string;
  age?: number;
}

interface EventDetail {
  id: number;
  title: string;
  startDate: string;
  endDate: string;
  cible: string;
  description?: string;
  photos?: string[];
  ageMin?: number;
  ageMax?: number;
}

const EventDetails: React.FC = () => {
  const { id } = useParams();
  const [event, setEvent] = useState<EventDetail | null>(null);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [selectedParticipants, setSelectedParticipants] = useState<number[]>([]);
  const [files, setFiles] = useState<File[]>([]);
const convertToBase64 = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = error => reject(error);
  });
};

  const [description, setDescription] = useState<string>("");
const [isModalOpen, setIsModalOpen] = useState(false);
const openParticipantModal = async () => {
  if (!event) return;

  const url =
    event.cible === "MERE"
      ? "http://localhost:8080/api/meres"
      : `http://localhost:8080/api/enfants?minAge=${event.ageMin}&maxAge=${event.ageMax}`;

  try {
    const res = await fetch(url);
    const data: Participant[] = await res.json();
    setParticipants(data);

    // Préselectionner ceux déjà présents dans l'événement
    if (event.cible === "MERE" && (event as any).meresParticipants) {
      setSelectedParticipants((event as any).meresParticipants.map((p: any) => p.id));
    } else if (event.cible === "ENFANT" && (event as any).enfantsParticipants) {
      setSelectedParticipants((event as any).enfantsParticipants.map((p: any) => p.id));
    }

    setIsModalOpen(true);
  } catch (err) {
    console.error(err);
  }
};

  // Charger les infos de l'événement
  useEffect(() => {
    fetch(`http://localhost:8080/api/events/${id}`)
      .then((res) => res.json())
      .then((data) => {
        setEvent(data);
        setDescription(data.description || "");
      })
      .catch(console.error);
  }, [id]);

  // Charger les participants selon cible
  useEffect(() => {
    if (!event) return;

    const url =
      event.cible === "MERE"
        ? "http://localhost:8080/api/meres"
        : `http://localhost:8080/api/enfants?minAge=${event.ageMin}&maxAge=${event.ageMax}`;

    fetch(url)
      .then((res) => res.json())
      .then(setParticipants)
      .catch(console.error);
  }, [event]);

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) setPhotos(Array.from(e.target.files));
  };

  const handlePdfChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) setPdf(e.target.files[0]);
  };

  const toggleParticipant = (id: number) => {
    setSelectedParticipants((prev) =>
      prev.includes(id) ? prev.filter((p) => p !== id) : [...prev, id]
    );
  };
  const saveEvent = async () => {
    if (!event) return;

    const filesBase64 = await Promise.all(
      files.map(async (file) => ({
        base64: await convertToBase64(file),
        type: file.type,
      }))
    );

    const payload: any = { extendedProps: {} };
    if (description) payload.extendedProps.description = description;
    if (filesBase64.length) payload.extendedProps.files = filesBase64;
    if (event.cible === "MERE" && selectedParticipants.length > 0)
      payload.extendedProps.meresParticipants = selectedParticipants;
    if (event.cible === "ENFANT" && selectedParticipants.length > 0)
      payload.extendedProps.enfantsParticipants = selectedParticipants;

    const res = await fetch(`http://localhost:8080/api/events/details/${event.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      const text = await res.text();
      console.error("Erreur serveur :", text);
      return;
    }

    const updated = await res.json();
    setEvent(updated);
  };




  if (!event) return <p>Chargement...</p>;

  return (
    <div className="max-w-4xl mx-auto p-6 bg-white shadow rounded">
      <h2 className="text-3xl font-bold mb-4">{event.title}</h2>
      <p><strong>Cible :</strong> {event.cible}</p>
      <p><strong>Début :</strong> {event.startDate}</p>
      <p><strong>Fin :</strong> {event.endDate}</p>

      {/* Description */}
      <div className="mt-6">
        <h3 className="text-xl font-bold mb-2">Description</h3>
        <textarea
          className="border p-2 w-full rounded"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Ajouter une description..."
          rows={4}
        />
      </div>

      {/* Importer PDF */}
      <div className="mt-6">
        <h3 className="text-xl font-bold mb-2">Importer fichiers</h3>
        <input
          type="file"
          multiple
          accept="image/*,application/pdf"
          onChange={(e) => {
            if (e.target.files) setFiles(Array.from(e.target.files));
          }}
        />


      </div>



      {/* Participants */}
      <div className="mt-6">
        <h3 className="text-xl font-bold mb-2">Participants</h3><button
                                                                  onClick={openParticipantModal}
                                                                  className="px-4 py-2 bg-green-500 text-white rounded"
                                                                >
                                                                  Ajouter des participants
                                                                </button>
 {/* Ici on met le modal */}
    {isModalOpen && (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50">
        <div className="bg-white p-6 rounded shadow max-h-[80vh] overflow-y-auto w-96">
          <h3 className="text-xl font-bold mb-4">Sélectionner des participants</h3>

          <div className="grid grid-cols-2 gap-2">
            {participants.map((p) => (
              <label key={p.id} className="flex items-center gap-2 border p-1 rounded cursor-pointer">
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
            <button
              className="px-4 py-2 bg-gray-300 rounded"
              onClick={() => setIsModalOpen(false)}
            >
              Annuler
            </button>
            <button
              className="px-4 py-2 bg-blue-500 text-white rounded"
              onClick={() => {
                setIsModalOpen(false);
                // Ici on pourrait faire une action locale si nécessaire
              }}
            >
              Confirmer
            </button>

          </div>
        </div>
      </div>
    )}

      </div>
      <div className="mt-2">
        {selectedParticipants.length > 0 && (
          <p>Participants sélectionnés : {participants
            .filter(p => selectedParticipants.includes(p.id))
            .map(p => `${p.nom} ${p.prenom}`)
            .join(", ")}</p>
        )}
      </div>

      <div className="mt-6">
        <button
          onClick={saveEvent}
          className="px-4 py-2 bg-blue-500 text-white rounded"
        >
          Sauvegarder
        </button>
      </div>
      {/* Participants déjà associés */}
      <div className="mt-6">
        <h3 className="text-xl font-bold mb-2">Participants</h3>

        {event.cible === "MERE" && event.meresParticipants?.length > 0 && (
          <ul className="list-disc list-inside">
            {event.meresParticipants.map((p) => (
              <li key={p.id}>{p.nom} {p.prenom}</li>
            ))}
          </ul>
        )}

        {event.cible === "ENFANT" && event.enfantsParticipants?.length > 0 && (
          <ul className="list-disc list-inside">
            {event.enfantsParticipants.map((p) => (
              <li key={p.id}>{p.nom} {p.prenom} (Âge: {p.age ?? "N/A"})</li>
            ))}
          </ul>
        )}

        {((event.cible === "MERE" && event.meresParticipants?.length === 0) ||
          (event.cible === "ENFANT" && event.enfantsParticipants?.length === 0)) && (
          <p>Aucun participant pour le moment.</p>
        )}
      </div>
<div className="mt-4 flex flex-wrap gap-2">
  {files.map((file, idx) => (
    <div key={idx} className="border p-2 rounded">
      {file.type.startsWith("image/") ? (
        <img
          src={URL.createObjectURL(file)}
          alt={file.name}
          className="w-24 h-24 object-cover"
        />
      ) : (
        <p>{file.name}</p>
      )}
    </div>
  ))}
</div>

    </div>
  );
};


export default EventDetails;
