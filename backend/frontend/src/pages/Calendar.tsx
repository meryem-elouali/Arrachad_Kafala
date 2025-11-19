import { useState, useRef, useEffect } from "react";
import FullCalendar from "@fullcalendar/react";
import dayGridPlugin from "@fullcalendar/daygrid";
import timeGridPlugin from "@fullcalendar/timegrid";
import interactionPlugin from "@fullcalendar/interaction";
import { EventInput, DateSelectArg, EventClickArg } from "@fullcalendar/core";
import { Modal } from "../components/ui/modal";
import { useModal } from "../hooks/useModal";
import PageMeta from "../components/common/PageMeta";
import { useNavigate } from "react-router-dom";

type Cible = "MERE" | "ENFANT" | "JEUNE" | "FAMILLE";

interface EventType {
  id: number;
  name: string;
}




interface CalendarEvent extends EventInput {
  id?: number;
  extendedProps: {
    calendar: string;
    cible: Cible;
    eventType: EventType;
    ageMin?: number;
    ageMax?: number;
  };
}

const Calendar: React.FC = () => {
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null);
  const [eventTitle, setEventTitle] = useState("");

  const [cible, setCible] = useState<Cible | "">("");
  const [ageMin, setAgeMin] = useState<number | "">("");
  const [ageMax, setAgeMax] = useState<number | "">("");
  const [eventStartDate, setEventStartDate] = useState("");
  const [eventEndDate, setEventEndDate] = useState("");
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [eventTypeId, setEventTypeId] = useState<number | "">("");
  const calendarRef = useRef<FullCalendar>(null);
  const { isOpen, openModal, closeModal } = useModal();
const navigate = useNavigate();

  const calendarsEvents = {
    Danger: "danger",
    Success: "success",
    Primary: "primary",
    Warning: "warning",
  };
const [eventTypes, setEventTypes] = useState<EventType[]>([]);
useEffect(() => {
  fetch("http://localhost:8080/api/event-types")
    .then((res) => res.json())
    .then((data) => setEventTypes(data))
    .catch(console.error);
}, []);
  useEffect(() => {
    fetch("http://localhost:8080/api/events")
      .then((res) => res.json())
      .then((data) => {
        // Adapter la structure pour FullCalendar
        const formatted = data.map((ev: any) => ({
          id: ev.id,
          title: ev.title,
          start: ev.startDate,
          end: ev.endDate,
          extendedProps: {
            calendar: ev.calendar,
            cible: ev.cible,
            ageMin: ev.ageMin,
            ageMax: ev.ageMax,
            eventType: { id: ev.eventType.id, name: ev.eventType.name },
          },
        }));
        setEvents(formatted);
      })
      .catch(() => console.error("Erreur de chargement"));
  }, []);

  const resetModalFields = () => {
    setEventTitle("");

    setCible("");
    setAgeMin("");
    setAgeMax("");
    setEventStartDate("");
    setEventEndDate("");
    setEventTypeId("");
    setSelectedEvent(null);
  };

  const handleDateSelect = (selectInfo: DateSelectArg) => {
    resetModalFields();
    setEventStartDate(selectInfo.startStr);
    setEventEndDate(selectInfo.endStr || selectInfo.startStr);
    openModal();
  };

  const handleEventClick = (clickInfo: EventClickArg) => {
    const event = clickInfo.event as unknown as CalendarEvent;
    setSelectedEvent(event);
    setEventTitle(event.title);
    setEventStartDate(event.start?.toISOString().split("T")[0] || "");
    setEventEndDate(event.end?.toISOString().split("T")[0] || "");

    setCible(event.extendedProps.cible);
    setAgeMin(event.extendedProps.ageMin ?? "");
    setAgeMax(event.extendedProps.ageMax ?? "");
    setEventTypeId(event.extendedProps.eventType?.id ?? "");
    openModal();
  };const handleAddOrUpdateEvent = async () => {
      if (!eventTitle || !cible || !eventTypeId) {
        alert("Veuillez remplir le titre, la cible et le type !");
        return;
      }

      const eventData = {
        title: eventTitle,
        start: eventStartDate,
        end: eventEndDate,
        extendedProps: {
          cible,
          ...(cible === "ENFANT" ? { ageMin: ageMin !== "" ? Number(ageMin) : null, ageMax: ageMax !== "" ? Number(ageMax) : null } : {}),
          eventType: { id: Number(eventTypeId) },
        },
      };

      try {
        let response;
        if (selectedEvent) {
          response = await fetch(`http://localhost:8080/api/events/${selectedEvent.id}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(eventData),
          });
        } else {
          response = await fetch("http://localhost:8080/api/events", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(eventData),
          });
        }

        if (!response.ok) throw new Error("Erreur lors de l’enregistrement !");
        const savedEvent = await response.json();

        const fcEvent: CalendarEvent = {
          id: savedEvent.id,
          title: savedEvent.title,
          start: savedEvent.startDate,
          end: savedEvent.endDate,
          extendedProps: {
            calendar: savedEvent.calendar,
            cible: savedEvent.cible,
            ageMin: savedEvent.ageMin,
            ageMax: savedEvent.ageMax,
            eventType: { id: savedEvent.eventType.id, name: savedEvent.eventType.name },
          },
        };

        if (selectedEvent) {
          setEvents((prev) => prev.map((ev) => (ev.id === selectedEvent.id ? fcEvent : ev)));
        } else {
          setEvents((prev) => [...prev, fcEvent]);
        }

        closeModal();
        resetModalFields();
      } catch (error) {
        console.error(error);
        alert("Erreur lors de l’enregistrement !");
      }
    };


  return (
    <>
      <PageMeta title="React Calendar" description="Calendar with level, cible and age" />
      <div className="rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-white/[0.03]">
        <FullCalendar
          ref={calendarRef}
          plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
          initialView="dayGridMonth"
          headerToolbar={{
           left: "prev,next addEventButton listEventButton",

            center: "title",
            right: "dayGridMonth,timeGridWeek,timeGridDay",
          }}
          events={events}
          selectable
          select={handleDateSelect}
          eventClick={handleEventClick}
         customButtons={{
           addEventButton: {
             text: "Add Event +",
             click: openModal,
           },
           listEventButton: {
             text: "Liste Events",
             click: () => navigate("/listeevents"),
           },
         }}

        />

        <Modal isOpen={isOpen} onClose={closeModal} className="max-w-[700px] p-6 lg:p-10">
          <div className="flex flex-col px-2">
            <h5 className="mb-2 font-semibold">{selectedEvent ? "Edit Event" : "Add Event"}</h5>

            <label className="block mt-4">Event Title</label>
            <input type="text" value={eventTitle} onChange={(e) => setEventTitle(e.target.value)} className="border rounded px-2 py-1 w-full" />

            <label className="block mt-4">Event Level</label>

            <label className="block mt-4">Cible</label>
            <select value={cible} onChange={(e) => setCible(e.target.value as Cible)} className="border rounded px-2 py-1 w-full">
              <option value="">-- Sélectionner --</option>
              <option value="MERE">MERE</option>
              <option value="ENFANT">ENFANT</option>
              <option value="JEUNE">JEUNE</option>
              <option value="FAMILLE">FAMILLE</option>
            </select>

            {cible === "ENFANT" && (
              <div className="flex gap-4 mt-4">
                <div>
                  <label>Age Min</label>
                  <input type="number" value={ageMin} onChange={(e) => setAgeMin(e.target.value ? Number(e.target.value) : "")} className="border rounded px-2 py-1 w-full" />
                </div>
                <div>
                  <label>Age Max</label>
                  <input type="number" value={ageMax} onChange={(e) => setAgeMax(e.target.value ? Number(e.target.value) : "")} className="border rounded px-2 py-1 w-full" />
                </div>
              </div>
            )}

           <label className="block mt-4">Event Type</label>
           <select
             value={eventTypeId}
             onChange={(e) => setEventTypeId(Number(e.target.value))}
             className="border rounded px-2 py-1 w-full"
           >
             <option value="">-- Sélectionner --</option>
             {eventTypes.map((type) => (
               <option key={type.id} value={type.id}>
                 {type.name}
               </option>
             ))}
           </select>

            <label className="block mt-4">Start Date</label>
            <input type="date" value={eventStartDate} onChange={(e) => setEventStartDate(e.target.value)} className="border rounded px-2 py-1 w-full" />

            <label className="block mt-4">End Date</label>
            <input type="date" value={eventEndDate} onChange={(e) => setEventEndDate(e.target.value)} className="border rounded px-2 py-1 w-full" />

            <div className="flex justify-end gap-2 mt-6">
              <button onClick={closeModal} className="px-4 py-2 border rounded">Close</button>
              <button onClick={handleAddOrUpdateEvent} className="px-4 py-2 bg-green-500 text-white rounded">
                {selectedEvent ? "Update" : "Add"}
              </button>
            </div>
          </div>
        </Modal>
      </div>
    </>
  );
};

export default Calendar;
