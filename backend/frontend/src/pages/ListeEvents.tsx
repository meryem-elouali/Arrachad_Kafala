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

  // 🔵 Année sélectionnée
  const [selectedYear, setSelectedYear] = useState<string>("2025");

  // Charger les types au début
  useEffect(() => {
    fetch("http://localhost:8080/api/event-types")
      .then((res) => res.json())
      .then((data) => {
        setEventTypes(data);
        loadAllEvents(data, selectedYear);
      })
      .catch(console.error);
  }, []);

  // 🔵 Si l’utilisateur change d’année, recharger les événements
  useEffect(() => {
    if (eventTypes.length > 0) {
      loadAllEvents(eventTypes, selectedYear);
    }
  }, [selectedYear]);

  // Charger les événements pour chaque type
  const loadAllEvents = (types: EventType[], year: string) => {
    setLoading(true);

    types.forEach((type) => {
      fetch(`http://localhost:8080/api/events/by-type/${type.id}?year=${year}`)
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
  <>
    <div className="etudes-table" dir="rtl">
         <div className="mb-6 p-6 bg-white dark:bg-gray-900 rounded-xl shadow-md border border-gray-200 dark:border-gray-700">
           <h1 className="text-3xl font-bold mb-1 text-gray-800 dark:text-white">قائمة الانشطة</h1>
           <p className="text-gray-500 dark:text-gray-400">عرض جميع بيانات الطلاب والمستويات والمؤسسات مع خيارات البحث والتصفية.</p>
         </div>
    <div className="p-6">


      {/* 🔵 FILTRE ANNEE */}
      <div className="mb-4">
        <label className="mr-2 font-semibold">السنة:</label>
        <select
          value={selectedYear}
          onChange={(e) => setSelectedYear(e.target.value)}
          className="border px-3 py-1 rounded"
        >
          <option value="2025">2025</option>
          <option value="2024">2024</option>
          <option value="2023">2023</option>
          <option value="2022">2022</option>
        </select>
      </div>

      <div className="card">
        <TabView>
          {eventTypes.map((t) => (
            <TabPanel key={t.id} header={t.name}>
              {loading && <p>Chargement...</p>}

              {!loading && eventsByType[t.id]?.length === 0 && (
                <p>Aucun événement trouvé pour cette année et ce type.</p>
              )}

              {!loading && eventsByType[t.id] && (
                <div className="space-y-4">
                  {eventsByType[t.id].map((ev) => (
                    <Link to={`/event-details/${ev.id}`} key={ev.id}>
                      <div className="border rounded-lg p-4 shadow bg-white hover:bg-gray-100 cursor-pointer mb-4">
                        <h3 className="font-bold text-lg">{ev.title}</h3>
                      <div className="flex gap-6">
                        <p>Cible : {ev.cible}</p>
                        <p>Début : {ev.startDate}</p>
                        <p>Fin : {ev.endDate}</p>
                      </div>
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </TabPanel>
          ))}
        </TabView>
      </div>
    </div></div>
    </>
  );
};

export default ListeEvents;
