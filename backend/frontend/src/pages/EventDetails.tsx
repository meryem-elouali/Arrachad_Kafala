import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";

interface EventDetail {
  id: number;
  title: string;
  startDate: string;
  endDate: string;
  cible: string;
  description?: string;
  photos?: string[];
}

const EventDetails: React.FC = () => {
  const { id } = useParams();
  const [event, setEvent] = useState<EventDetail | null>(null);

  useEffect(() => {
    fetch(`http://localhost:8080/api/events/${id}`)
      .then((res) => res.json())
      .then((data) => setEvent(data))
      .catch(console.error);
  }, [id]);

  if (!event) return <p>Chargement...</p>;

  return (
    <div className="p-6">
      <h2 className="text-3xl font-bold mb-4">{event.title}</h2>

      <p><strong>Cible :</strong> {event.cible}</p>
      <p><strong>Début :</strong> {event.startDate}</p>
      <p><strong>Fin :</strong> {event.endDate}</p>

      {/* Ajout de description */}
      <div className="mt-6">
        <h3 className="text-xl font-bold">Description</h3>
        <textarea
          className="border p-2 w-full mt-2"
          placeholder="Ajouter une description..."
        />
      </div>

      {/* Ajout de photos */}
      <div className="mt-6">
        <h3 className="text-xl font-bold">Photos</h3>
        <input type="file" multiple />
      </div>
    </div>
  );
};

export default EventDetails;
