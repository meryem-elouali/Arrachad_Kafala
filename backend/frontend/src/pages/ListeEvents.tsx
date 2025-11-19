import React, { useEffect, useState } from "react";
import { TabView, TabPanel } from "primereact/tabview";
import { Link } from "react-router-dom";
interface EventType {
  id: number;
  name: string;
}

interface CalendarEvent {
  id: number;
  title: string;
  startDate: string;
  endDate: string;
  cible: string;
}

const ListeEvents: React.FC = () => {
  const [eventTypes, setEventTypes] = useState<EventType[]>([]);
  const [eventsByType, setEventsByType] = useState<Record<number, CalendarEvent[]>>({});
  const [loading, setLoading] = useState<boolean>(false);

  // Charger les types au début
  useEffect(() => {
    fetch("http://localhost:8080/api/event-types")
      .then((res) => res.json())
      .then((data) => {
        setEventTypes(data);
        loadAllEvents(data);
      })
      .catch(console.error);
  }, []);

  // Charger les événements pour chaque type
  const loadAllEvents = (types: EventType[]) => {
    setLoading(true);

    types.forEach((type) => {
      fetch(`http://localhost:8080/api/events/by-type/${type.id}`)
        .then((res) => res.json())
        .then((data) => {
          setEventsByType((prev) => ({
            ...prev,
            [type.id]: data,
          }));
        })
        .catch(console.error)
        .finally(() => setLoading(false));
    });
  };

  return (
    <div className="p-6">

      <h2 className="text-2xl font-bold mb-6">
        Liste des Événements par Type
      </h2>

      <div className="card">
        <TabView>

          {eventTypes.map((t) => (
            <TabPanel key={t.id} header={t.name}>

              {loading && (
                <p>Chargement...</p>
              )}

              {!loading && eventsByType[t.id]?.length === 0 && (
                <p>Aucun événement trouvé pour ce type.</p>
              )}

              {!loading && eventsByType[t.id] && (
                <div className="space-y-4">
                  {eventsByType[t.id].map((ev) => (
                   <Link to={`/event-details/${ev.id}`} key={ev.id}>
                     <div
                       className="border rounded-lg p-4 shadow bg-white hover:bg-gray-100 cursor-pointer"
                     >
                       <h3 className="font-bold text-lg">{ev.title}</h3>
                       <p>Cible : {ev.cible}</p>
                       <p>Début : {ev.startDate}</p>
                       <p>Fin : {ev.endDate}</p>
                     </div>
                   </Link>

                  ))}
                </div>
              )}

            </TabPanel>
          ))}

        </TabView>
      </div>
    </div>
  );
};

export default ListeEvents;
