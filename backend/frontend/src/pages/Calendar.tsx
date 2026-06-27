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



interface EventType {
  id: number;
  name: string;
}

interface CalendarEvent extends EventInput {
  id?: number;
  extendedProps: {
    calendar: string;

    eventType: EventType;
    ageMin?: number;
    ageMax?: number;
  }
}

const Calendar: React.FC = () => {
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null);
  const [eventTitle, setEventTitle] = useState("");
    const [place, setPlace] = useState("");

  const [cibles, setCibles] = useState<Cible[]>([]);

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
   fetch("http://localhost:8080/api/events/event-types")
     .then((res) => {
       if (!res.ok) {
         throw new Error("Erreur chargement types");
       }
       return res.json();
     })
     .then((data) => {
       setEventTypes(Array.isArray(data) ? data : []);
     })
     .catch((err) => {
       console.error(err);
       setEventTypes([]);
     });
 }, []);

  useEffect(() => {
    fetch("http://localhost:8080/api/events")
      .then((res) => res.json())
      .then((data) => {
 const formatted = data.map((ev: any) => ({
   id: ev.id,
   title: ev.title,
   start: ev.startDate,
   end: includeLastDay(ev.endDate),
   allDay: true,
   extendedProps: {
     calendar: ev.calendar,
     cibles: ev.cibles,
     ageMin: ev.ageMin,
     ageMax: ev.ageMax,
     eventType: { id: ev.eventType.id, name: ev.eventType.name },
     place: ev.place,          // <-- assure-toi que 'place' existe bien ici
     startDate: ev.startDate,
     endDate: ev.endDate,
   },
 }));


        setEvents(formatted);
      })
      .catch(() => console.error("خطأ في التحميل"));
  }, []);
  // Pour FullCalendar : inclut le dernier jour
  const getCalendarEndDateForCalendar = (start: string, end: string) => {
    if (!end) return undefined;
    return end; // juste la date exacte, pas de +1
  };


const resetModalFields = () => {
  setEventTitle("");
   setCibles([]);
  setAgeMin("");
  setAgeMax("");
  setEventStartDate("");
  setEventEndDate("");
  setEventTypeId("");
  setPlace(""); // réinitialise place uniquement pour nouvel événement
  setSelectedEvent(null);
};

  const handleDateSelect = (selectInfo: DateSelectArg) => {
    resetModalFields();
    setEventStartDate(selectInfo.startStr);
    setEventEndDate(selectInfo.endStr || selectInfo.startStr);
    openModal();
  };
 const handleEventClick = (clickInfo: EventClickArg) => {
   const fcEvent = clickInfo.event;


   // récupère les extendedProps
   const props = fcEvent.extendedProps;

   // 🔹 AJOUT du console.log pour debug
   console.log("Événement cliqué - extendedProps:", props);

   setSelectedEvent({
     id: Number(fcEvent.id),
     title: fcEvent.title,
     start: fcEvent.startStr,
     end: fcEvent.endStr,
     extendedProps: props as any,
   });

   setEventTitle(fcEvent.title);
   setEventStartDate(props.startDate || fcEvent.startStr);
   setEventEndDate(props.endDate || fcEvent.endStr);
  setCibles(Array.isArray(props.cibles) ? props.cibles : []);

   setAgeMin(props.ageMin ?? "");
   setAgeMax(props.ageMax ?? "");
   setEventTypeId(props.eventType?.id ?? "");
   setPlace(props.place ?? "");

   openModal();
 };

const includeLastDay = (dateStr: string) => {
  if (!dateStr) return dateStr;

  const date = new Date(dateStr);
  date.setDate(date.getDate() + 1);

  return date.toISOString().split("T")[0];
};



const handleAddOrUpdateEvent = async () => {
 if (!eventTitle || cibles.length === 0 || !eventTypeId || !place) {
   alert("يرجى ملء العنوان، الفئة، ونوع الحدث، والمكان!");
   return;
 }
const eventData = {
  title: eventTitle,
  start: eventStartDate,
  end: eventEndDate,
  extendedProps: {
    cibles,
    ageMin: cibles.includes("ENFANT") ? (ageMin !== "" ? Number(ageMin) : null) : null,
    ageMax: cibles.includes("ENFANT") ? (ageMax !== "" ? Number(ageMax) : null) : null,
    eventType: { id: Number(eventTypeId) },
    place: place || "Inconnu", // <-- valeur par défaut pour éviter null
  }
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

    if (!response.ok) throw new Error("خطأ أثناء الحفظ!");
    const savedEvent = await response.json();

    // Debug: Log the API response
    console.log("Saved event from API:", savedEvent);

    // Create the fcEvent with local state for reliability
    const fcEvent: CalendarEvent = {
      id: savedEvent.id,
      title: savedEvent.title,
      start: savedEvent.startDate,
      end: includeLastDay(savedEvent.endDate),
      allDay: true,
      extendedProps: {
        calendar: savedEvent.calendar ?? "primary",
        cibles: cibles,  // Use local state
        ageMin: ageMin,  // Use local state
        ageMax: ageMax,  // Use local state
        eventType: savedEvent.eventType ?? { id: eventTypeId, name: "" },
        place: place,    // Use local state
        startDate: savedEvent.startDate,
        endDate: savedEvent.endDate,
      },
    };

    if (selectedEvent) {
      setEvents((prev) => {
        const updated = prev.map((ev) =>
          ev.id === selectedEvent.id ? fcEvent : ev
        );
        const api = calendarRef.current?.getApi();
        if (api) {
          api.removeAllEvents();
          updated.forEach((e) => api.addEvent(e));
        }
        return updated;
      });
    } else {
      setEvents((prev) => {
        const updated = [...prev, fcEvent];
        const api = calendarRef.current?.getApi();
        if (api) {
          api.removeAllEvents();
          updated.forEach((e) => api.addEvent(e));
        }
        return updated;
      });
    }

    closeModal();
    resetModalFields();
  } catch (error) {
    console.error(error);
    alert("خطأ أثناء الحفظ!");
  }
};


  return (
    <>
      <PageMeta title="التقويم" description="تقويم مع المستوى، الفئة والعمر" />
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
              text: "إضافة حدث +",
              click: openModal,
            },
            listEventButton: {
              text: "قائمة الأحداث",
              click: () => navigate("/listeevents"),
            },
          }}
        />

        <Modal isOpen={isOpen} onClose={closeModal} className="max-w-[700px] p-6 lg:p-10">
          <div className="flex flex-col px-2" dir="rtl">
            <h5 className="mb-2 font-semibold">{selectedEvent ? "تعديل الحدث" : "إضافة حدث"}</h5>

            <label className="block mt-4">عنوان الحدث</label>
            <input type="text" value={eventTitle} onChange={(e) => setEventTitle(e.target.value)} className="border rounded px-2 py-1 w-full" />

           <div className="block mt-4">
             <label className="block mb-1">الفئة</label>
             <div className="flex gap-4">
               {["MERE", "ENFANT", "FAMILLE"].map((option) => (
                 <label key={option} className="flex items-center gap-1">
                   <input
                     type="checkbox"
                     value={option}
                     checked={cibles.includes(option as Cible)}
                     onChange={(e) => {
                       const value = e.target.value as Cible;
                       // si déjà coché => décocher
                       if (cibles.includes(value)) {
                         setCibles(cibles.filter((c) => c !== value));
                       } else {
                         // logique : soit un seul, soit combo MERE+ENFANT
                         if (value === "FAMILLE") {
                           setCibles(["FAMILLE"]);
                         } else if (value === "MERE" || value === "ENFANT") {
                           const other = cibles.find((c) => c === "MERE" || c === "ENFANT");
                           setCibles(other ? [other, value] : [value]);
                         }
                       }
                     }}
                   />
                   {option === "MERE" ? "أم" : option === "ENFANT" ? "طفل" : "عائلة"}
                 </label>
               ))}
             </div>
           </div>


           {cibles.includes("ENFANT") && (
             <div className="flex gap-4 mt-4">
               <div>
                 <label>الحد الأدنى للعمر</label>
                 <input
                   type="number"
                   value={ageMin}
                   onChange={(e) => setAgeMin(e.target.value ? Number(e.target.value) : "")}
                   className="border rounded px-2 py-1 w-full"
                 />
               </div>
               <div>
                 <label>الحد الأقصى للعمر</label>
                 <input
                   type="number"
                   value={ageMax}
                   onChange={(e) => setAgeMax(e.target.value ? Number(e.target.value) : "")}
                   className="border rounded px-2 py-1 w-full"
                 />
               </div>
             </div>
           )}


            <label className="block mt-4">نوع الحدث</label>
            <select
              value={eventTypeId}
              onChange={(e) => setEventTypeId(Number(e.target.value))}
              className="border rounded px-2 py-1 w-full"
            >
              <option value="">-- اختر --</option>
              {eventTypes.map((type) => (
                <option key={type.id} value={type.id}>
                  {type.name}
                </option>
              ))}
            </select>



            <label className="block mt-4">مكان الحدث</label>
            <input type="text" value={place} onChange={(e) => setPlace(e.target.value)} className="border rounded px-2 py-1 w-full" />

            <label className="block mt-4">تاريخ البداية</label>
            <input type="date" value={eventStartDate} onChange={(e) => setEventStartDate(e.target.value)} className="border rounded px-2 py-1 w-full" />

            <label className="block mt-4">تاريخ النهاية</label>
            <input type="date" value={eventEndDate} onChange={(e) => setEventEndDate(e.target.value)} className="border rounded px-2 py-1 w-full" />

            <div className="flex justify-end gap-2 mt-6">
              <button onClick={closeModal} className="px-4 py-2 border rounded">إغلاق</button>
              <button onClick={handleAddOrUpdateEvent} className="px-4 py-2 bg-green-500 text-white rounded">
                {selectedEvent ? "تحديث" : "إضافة"}
              </button>
            </div>
          </div>
        </Modal>
      </div>
    </>
  );
};

export default Calendar;
