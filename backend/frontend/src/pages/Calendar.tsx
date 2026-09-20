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
    cibles?: Cible[];
    eventType: EventType;
    ageMin?: number;
    ageMax?: number;
    degresFamille?: number[];
    place?: string;
    startDate?: string;
    endDate?: string;

  };
}
const Calendar: React.FC = () => {
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null);
  const [eventTitle, setEventTitle] = useState("");
    const [place, setPlace] = useState("");

  const [cibles, setCibles] = useState<Cible[]>([]);

  const [ageMin, setAgeMin] = useState<number | "">("");
  const [ageMax, setAgeMax] = useState<number | "">("");
  const [degresFamille, setDegresFamille] = useState<number[]>([]);
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
     degresFamille: ev.degresFamille ?? [],
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
  setDegresFamille([]);
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
setDegresFamille(
  Array.isArray(props.degresFamille)
    ? props.degresFamille.map(Number)
    : []
);
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

    degresFamille,

    ageMin: cibles.includes("ENFANT")
      ? (ageMin !== "" ? Number(ageMin) : null)
      : null,

    ageMax: cibles.includes("ENFANT")
      ? (ageMax !== "" ? Number(ageMax) : null)
      : null,

    eventType: { id: Number(eventTypeId) },
    place: place || "Inconnu",
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
      cibles: cibles,
      ageMin: ageMin,
      ageMax: ageMax,
      degresFamille: degresFamille,
      eventType: savedEvent.eventType ?? { id: eventTypeId, name: "" },
      place: place,
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
              text: "إضافة نشاط +",
              click: openModal,
          },
          listEventButton: {
              text: "قائمة الأنشطة",
              click: () => navigate("/listeevents"),
          },
          }}
        />

        <Modal isOpen={isOpen} onClose={closeModal} className="max-w-[700px] p-6 lg:p-10">
          <div className="flex flex-col px-2" dir="rtl">
          <h5 className="mb-2 font-semibold">
              {selectedEvent ? "تعديل النشاط" : "إضافة نشاط"}
          </h5>

          <label className="block mt-4">عنوان النشاط</label>
            <input type="text" value={eventTitle} onChange={(e) => setEventTitle(e.target.value)} className="border rounded px-2 py-1 w-full" />

        {/* ===================== الفئة المستهدفة ===================== */}
        <div className="mt-6">
          <label className="mb-3 block text-sm font-semibold text-gray-700 dark:text-gray-200">
            الفئة المستهدفة
          </label>

          <div className="grid grid-cols-3 gap-3">
            {[
              { value: "MERE", label: "الأمهات", icon: "👩" },
              { value: "ENFANT", label: "الأطفال", icon: "👧" },
              { value: "FAMILLE", label: "العائلات", icon: "👨‍👩‍👧" },
            ].map((item) => {
              const selected = cibles.includes(item.value as Cible);

              return (
                <button
                  key={item.value}
                  type="button"
                  onClick={() => {
                    const value = item.value as Cible;

                    if (cibles.includes(value)) {
                      setCibles(cibles.filter((c) => c !== value));
                    } else {
                      if (value === "FAMILLE") {
                        setCibles(["FAMILLE"]);
                      } else {
                        const other = cibles.find(
                          (c) => c === "MERE" || c === "ENFANT"
                        );

                        setCibles(other ? [other, value] : [value]);
                      }
                    }
                  }}
                  className={`
                    group relative flex flex-col items-center justify-center
                    rounded-2xl border p-4
                    transition-all duration-300 ease-out
                    ${
                      selected
                        ? "border-blue-500 bg-blue-50 shadow-sm ring-1 ring-blue-500/20 dark:bg-blue-500/10"
                        : "border-gray-200 bg-white hover:-translate-y-0.5 hover:border-blue-300 hover:shadow-md dark:border-gray-700 dark:bg-gray-800"
                    }
                  `}
                >
                  {/* check */}
                  <div
                    className={`
                      absolute left-3 top-3 flex h-5 w-5 items-center justify-center
                      rounded-full border text-xs transition-all duration-200
                      ${
                        selected
                          ? "border-blue-500 bg-blue-500 text-white"
                          : "border-gray-300 bg-white text-transparent"
                      }
                    `}
                  >
                    ✓
                  </div>

                  <span className="mb-2 text-2xl">{item.icon}</span>

                  <span
                    className={`text-sm font-semibold ${
                      selected
                        ? "text-blue-700 dark:text-blue-300"
                        : "text-gray-700 dark:text-gray-200"
                    }`}
                  >
                    {item.label}
                  </span>
                </button>
              );
            })}
          </div>
        </div>


        {/* ===================== درجة العائلة ===================== */}
        <div
          className={`
            overflow-hidden transition-all duration-500 ease-in-out
            ${
              cibles.length > 0
                ? "mt-6 max-h-60 opacity-100"
                : "max-h-0 opacity-0"
            }
          `}
        >
          <div className="rounded-2xl border border-gray-200 bg-gray-50/70 p-4 dark:border-gray-700 dark:bg-gray-800/50">

            <div className="mb-3">
              <label className="block text-sm font-semibold text-gray-700 dark:text-gray-200">
                درجة العائلة المستهدفة
              </label>

              <p className="mt-1 text-xs text-gray-400">
                يمكنك اختيار درجة واحدة أو عدة درجات
              </p>
            </div>

            <div className="grid grid-cols-3 gap-3">
              {[1, 2, 3].map((degre) => {
                const selected = degresFamille.includes(degre);

                return (
                  <button
                    key={degre}
                    type="button"
                    onClick={() => {
                      setDegresFamille((prev) =>
                        prev.includes(degre)
                          ? prev.filter((d) => d !== degre)
                          : [...prev, degre]
                      );
                    }}
                    className={`
                      relative rounded-xl border px-4 py-3
                      text-center transition-all duration-200
                      ${
                        selected
                          ? "border-blue-500 bg-blue-500 text-white shadow-sm"
                          : "border-gray-200 bg-white text-gray-600 hover:border-blue-300 hover:bg-blue-50 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-300"
                      }
                    `}
                  >
                    <div className="text-sm font-semibold">
                      الدرجة {degre}
                    </div>

                    {selected && (
                      <div className="mt-1 text-xs text-blue-100">
                        ✓ تم الاختيار
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        </div>


        {/* ===================== العمر - فقط للأطفال ===================== */}
        <div
          className={`
            overflow-hidden transition-all duration-500 ease-in-out
            ${
              cibles.includes("ENFANT")
                ? "mt-6 max-h-60 opacity-100"
                : "max-h-0 opacity-0"
            }
          `}
        >
          <div className="rounded-2xl border border-gray-200 bg-gray-50/70 p-4 dark:border-gray-700 dark:bg-gray-800/50">

            <label className="mb-3 block text-sm font-semibold text-gray-700 dark:text-gray-200">
              الفئة العمرية للأطفال
            </label>

            <div className="grid grid-cols-2 gap-4">

              <div>
                <label className="mb-1.5 block text-xs font-medium text-gray-500">
                  الحد الأدنى للعمر
                </label>

                <div className="relative">
                  <input
                    type="number"
                    min="0"
                    value={ageMin}
                    onChange={(e) =>
                      setAgeMin(e.target.value ? Number(e.target.value) : "")
                    }
                    placeholder="مثال: 6"
                    className="
                      h-11 w-full rounded-xl border border-gray-200
                      bg-white px-4 outline-none
                      transition-all duration-200
                      focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10
                      dark:border-gray-700 dark:bg-gray-900
                    "
                  />

                  <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-xs text-gray-400">
                    سنة
                  </span>
                </div>
              </div>

              <div>
                <label className="mb-1.5 block text-xs font-medium text-gray-500">
                  الحد الأقصى للعمر
                </label>

                <div className="relative">
                  <input
                    type="number"
                    min="0"
                    value={ageMax}
                    onChange={(e) =>
                      setAgeMax(e.target.value ? Number(e.target.value) : "")
                    }
                    placeholder="مثال: 16"
                    className="
                      h-11 w-full rounded-xl border border-gray-200
                      bg-white px-4 outline-none
                      transition-all duration-200
                      focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10
                      dark:border-gray-700 dark:bg-gray-900
                    "
                  />

                  <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-xs text-gray-400">
                    سنة
                  </span>
                </div>
              </div>

            </div>
          </div>
        </div>



         <label className="block mt-4">نوع النشاط</label>
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



       <label className="block mt-4">مكان النشاط</label>
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
