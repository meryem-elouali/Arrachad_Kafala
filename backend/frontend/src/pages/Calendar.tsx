import { useEffect, useMemo, useRef, useState } from "react";
import FullCalendar from "@fullcalendar/react";
import dayGridPlugin from "@fullcalendar/daygrid";
import timeGridPlugin from "@fullcalendar/timegrid";
import interactionPlugin from "@fullcalendar/interaction";
import arLocale from "@fullcalendar/core/locales/ar";
import {
  DateSelectArg,
  EventClickArg,
  EventContentArg,
  EventInput,
} from "@fullcalendar/core";
import { Modal } from "../components/ui/modal";
import { useModal } from "../hooks/useModal";
import PageMeta from "../components/common/PageMeta";
import { useNavigate } from "react-router-dom";

const API = "http://localhost:8080/api";

interface EventType {
  id: number;
  name: string;
}

type Cible = "MERE" | "ENFANT" | "FAMILLE";

interface CalendarEventProps {
  calendar: string;
  cibles?: Cible[];
  eventType: EventType;
  ageMin?: number | null;
  ageMax?: number | null;
  degresFamille?: number[];
  place?: string;
  startDate?: string;
  endDate?: string;
  anneeScolaire?: string;
  sawaedAlKhayr?: boolean;
}

interface CalendarEvent extends EventInput {
  extendedProps: CalendarEventProps;
}

const TARGETS: Array<{
  value: Cible;
  label: string;
  description: string;
  icon: string;
}> = [
  {
    value: "MERE",
    label: "الأمهات",
    description: "الأنشطة الموجهة للأمهات",
    icon: "👩",
  },
  {
    value: "ENFANT",
    label: "الأطفال",
    description: "الأنشطة الموجهة للأطفال",
    icon: "👧",
  },
  {
    value: "FAMILLE",
    label: "العائلات",
    description: "الأنشطة الموجهة للعائلة",
    icon: "👨‍👩‍👧",
  },
];

const DEGREE_OPTIONS = [
  { value: 1, label: "الدرجة 1", short: "1" },
  { value: 2, label: "الدرجة 2", short: "2" },
  { value: 3, label: "الدرجة 3", short: "3" },
  { value: 0, label: "غير محدد", short: "—" },
];

const EVENT_TONES = [
  {
    background: "#eef2ff",
    border: "#6366f1",
    text: "#3730a3",
    soft: "#e0e7ff",
  },
  {
    background: "#ecfdf5",
    border: "#10b981",
    text: "#065f46",
    soft: "#d1fae5",
  },
  {
    background: "#fff7ed",
    border: "#f97316",
    text: "#9a3412",
    soft: "#ffedd5",
  },
  {
    background: "#fdf2f8",
    border: "#ec4899",
    text: "#9d174d",
    soft: "#fce7f3",
  },
];

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
  const [anneeScolaire, setAnneeScolaire] = useState("");
  const [sawaedAlKhayr, setSawaedAlKhayr] = useState(false);
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [eventTypeId, setEventTypeId] = useState<number | "">("");
  const [eventTypes, setEventTypes] = useState<EventType[]>([]);
  const [loadingEvents, setLoadingEvents] = useState(true);
  const [saving, setSaving] = useState(false);

  const calendarRef = useRef<FullCalendar>(null);
  const { isOpen, openModal, closeModal } = useModal();
  const navigate = useNavigate();

  const currentYear = new Date().getFullYear();

  const anneesScolaires = Array.from({ length: 21 }, (_, i) => {
    const debut = currentYear - 10 + i;
    return `${debut}/${debut + 1}`;
  });

  const getAnneeScolaireFromDate = (dateStr: string) => {
    if (!dateStr) return "";

    const [yearStr, monthStr] = dateStr.split("-");
    const year = Number(yearStr);
    const month = Number(monthStr);

    if (!year || !month) return "";

    return month >= 9
      ? `${year}/${year + 1}`
      : `${year - 1}/${year}`;
  };

  const currentSchoolYear = useMemo(
    () => getAnneeScolaireFromDate(new Date().toISOString().split("T")[0]),
    []
  );

  const includeLastDay = (dateStr: string) => {
    if (!dateStr) return dateStr;

    const date = new Date(`${dateStr}T00:00:00`);
    date.setDate(date.getDate() + 1);

    return date.toISOString().split("T")[0];
  };

  const getEventTone = (eventType?: EventType) => {
    const index =
      eventType?.id && eventType.id > 0
        ? (eventType.id - 1) % EVENT_TONES.length
        : 0;

    return EVENT_TONES[index];
  };

  useEffect(() => {
    fetch(`${API}/events/event-types`)
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
    setLoadingEvents(true);

    fetch(`${API}/events`)
      .then((res) => {
        if (!res.ok) {
          throw new Error("Erreur chargement événements");
        }
        return res.json();
      })
      .then((data) => {
        const formatted: CalendarEvent[] = (Array.isArray(data) ? data : []).map(
          (ev: any) => {
            const eventType: EventType = ev.eventType ?? {
              id: 0,
              name: "غير محدد",
            };

            return {
              id: String(ev.id),
              title: ev.title,
              start: ev.startDate,
              end: includeLastDay(ev.endDate),
              allDay: true,
              extendedProps: {
                calendar: ev.calendar ?? "PRIMARY",
                cibles: Array.isArray(ev.cibles) ? ev.cibles : [],
                ageMin: ev.ageMin ?? null,
                ageMax: ev.ageMax ?? null,
                eventType,
                place: ev.place ?? "",
                startDate: ev.startDate,
                endDate: ev.endDate,
                degresFamille: Array.isArray(ev.degresFamille)
                  ? ev.degresFamille.map(Number)
                  : [],
                anneeScolaire: ev.anneeScolaire ?? "",
                sawaedAlKhayr: Boolean(ev.sawaedAlKhayr),
              },
            };
          }
        );

        setEvents(formatted);
      })
      .catch((error) => {
        console.error(error);
        setEvents([]);
      })
      .finally(() => {
        setLoadingEvents(false);
      });
  }, []);

  const resetModalFields = () => {
    setEventTitle("");
    setCibles([]);
    setAgeMin("");
    setAgeMax("");
    setEventStartDate("");
    setEventEndDate("");
    setEventTypeId("");
    setPlace("");
    setAnneeScolaire("");
    setSawaedAlKhayr(false);
    setSelectedEvent(null);
    setDegresFamille([]);
  };

  const handleCloseModal = () => {
    closeModal();
    resetModalFields();
  };

  const openNewEventModal = () => {
    resetModalFields();
    setAnneeScolaire(currentSchoolYear);
    openModal();
  };

  const handleDateSelect = (selectInfo: DateSelectArg) => {
    resetModalFields();
    setEventStartDate(selectInfo.startStr);
    setEventEndDate(selectInfo.endStr || selectInfo.startStr);
    setAnneeScolaire(getAnneeScolaireFromDate(selectInfo.startStr));
    openModal();
  };

  const handleEventClick = (clickInfo: EventClickArg) => {
    const fcEvent = clickInfo.event;
    const props = fcEvent.extendedProps as CalendarEventProps;

    setSelectedEvent({
      id: fcEvent.id,
      title: fcEvent.title,
      start: fcEvent.startStr,
      end: fcEvent.endStr,
      allDay: fcEvent.allDay,
      extendedProps: props,
    });

    setEventTitle(fcEvent.title);
    setEventStartDate(props.startDate || fcEvent.startStr);
    setEventEndDate(props.endDate || fcEvent.endStr);
    setCibles(Array.isArray(props.cibles) ? props.cibles : []);
    setAgeMin(props.ageMin ?? "");
    setAgeMax(props.ageMax ?? "");
    setEventTypeId(props.eventType?.id ?? "");
    setPlace(props.place ?? "");
    setAnneeScolaire(props.anneeScolaire ?? "");
    setSawaedAlKhayr(Boolean(props.sawaedAlKhayr));
    setDegresFamille(
      Array.isArray(props.degresFamille)
        ? props.degresFamille.map(Number)
        : []
    );

    openModal();
  };

  const toggleTarget = (value: Cible) => {
    if (cibles.includes(value)) {
      setCibles((prev) => prev.filter((c) => c !== value));

      if (value === "ENFANT") {
        setAgeMin("");
        setAgeMax("");
      }

      return;
    }

    if (value === "FAMILLE") {
      setCibles(["FAMILLE"]);
      setAgeMin("");
      setAgeMax("");
      return;
    }

    setCibles((prev) => [
      ...prev.filter((c) => c !== "FAMILLE"),
      value,
    ]);
  };

  const toggleDegree = (value: number) => {
    setDegresFamille((prev) =>
      prev.includes(value)
        ? prev.filter((degre) => degre !== value)
        : [...prev, value]
    );
  };

  const handleAddOrUpdateEvent = async () => {
    if (
      !eventTitle.trim() ||
      cibles.length === 0 ||
      !eventTypeId ||
      !place.trim() ||
      !anneeScolaire ||
      !eventStartDate ||
      !eventEndDate
    ) {
      alert(
        "يرجى ملء عنوان النشاط، الفئة، النوع، المكان، السنة الدراسية والتواريخ."
      );
      return;
    }

    if (eventEndDate < eventStartDate) {
      alert("تاريخ النهاية يجب أن يكون بعد أو يساوي تاريخ البداية.");
      return;
    }

    const eventData = {
      title: eventTitle.trim(),
      start: eventStartDate,
      end: eventEndDate,
      extendedProps: {
        cibles,
        degresFamille,
        ageMin: cibles.includes("ENFANT")
          ? ageMin !== ""
            ? Number(ageMin)
            : null
          : null,
        ageMax: cibles.includes("ENFANT")
          ? ageMax !== ""
            ? Number(ageMax)
            : null
          : null,
        eventType: { id: Number(eventTypeId) },
        place: place.trim(),
        anneeScolaire,
        sawaedAlKhayr,
      },
    };

    try {
      setSaving(true);

      const url = selectedEvent?.id
        ? `${API}/events/${selectedEvent.id}`
        : `${API}/events`;

      const response = await fetch(url, {
        method: selectedEvent ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(eventData),
      });

      if (!response.ok) {
        throw new Error("خطأ أثناء الحفظ");
      }

      const savedEvent = await response.json();

      const selectedType =
        eventTypes.find((type) => type.id === Number(eventTypeId)) ??
        savedEvent.eventType ?? {
          id: Number(eventTypeId),
          name: "",
        };

      const fcEvent: CalendarEvent = {
        id: String(savedEvent.id),
        title: savedEvent.title ?? eventTitle.trim(),
        start: savedEvent.startDate ?? eventStartDate,
        end: includeLastDay(savedEvent.endDate ?? eventEndDate),
        allDay: true,
        extendedProps: {
          calendar: savedEvent.calendar ?? "PRIMARY",
          cibles,
          ageMin: cibles.includes("ENFANT")
            ? ageMin !== ""
              ? Number(ageMin)
              : null
            : null,
          ageMax: cibles.includes("ENFANT")
            ? ageMax !== ""
              ? Number(ageMax)
              : null
            : null,
          degresFamille,
          eventType: selectedType,
          place: place.trim(),
          startDate: savedEvent.startDate ?? eventStartDate,
          endDate: savedEvent.endDate ?? eventEndDate,
          anneeScolaire: savedEvent.anneeScolaire ?? anneeScolaire,
          sawaedAlKhayr:
            typeof savedEvent.sawaedAlKhayr === "boolean"
              ? savedEvent.sawaedAlKhayr
              : sawaedAlKhayr,
        },
      };

      setEvents((prev) => {
        if (selectedEvent?.id) {
          return prev.map((event) =>
            String(event.id) === String(selectedEvent.id) ? fcEvent : event
          );
        }

        return [...prev, fcEvent];
      });

      handleCloseModal();
    } catch (error) {
      console.error(error);
      alert("حدث خطأ أثناء حفظ النشاط.");
    } finally {
      setSaving(false);
    }
  };

  const totalCurrentSchoolYear = useMemo(
    () =>
      events.filter(
        (event) =>
          event.extendedProps?.anneeScolaire === currentSchoolYear
      ).length,
    [events, currentSchoolYear]
  );

  const totalThisMonth = useMemo(() => {
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth();

    return events.filter((event) => {
      const start = event.extendedProps?.startDate;
      if (!start) return false;

      const date = new Date(`${start}T00:00:00`);

      return date.getFullYear() === year && date.getMonth() === month;
    }).length;
  }, [events]);

  const totalSawaedAlKhayr = useMemo(
    () =>
      events.filter((event) =>
        Boolean(event.extendedProps?.sawaedAlKhayr)
      ).length,
    [events]
  );

  const renderEventContent = (arg: EventContentArg) => {
    const props = arg.event.extendedProps as CalendarEventProps;
    const tone = getEventTone(props.eventType);

    return (
      <div
        className="calendar-event-card"
        style={{
          backgroundColor: tone.background,
          borderRightColor: tone.border,
          color: tone.text,
        }}
      >
        <div className="calendar-event-card__top">
          <span
            className="calendar-event-card__dot"
            style={{ backgroundColor: tone.border }}
          />
          <span className="calendar-event-card__title">
            {arg.event.title}
          </span>

          {props.sawaedAlKhayr && (
            <span className="mr-auto shrink-0 rounded-full bg-violet-100 px-1.5 py-0.5 text-[9px] font-black text-violet-700">
              سواعد الخير
            </span>
          )}
        </div>

        {props.place && (
          <div className="calendar-event-card__meta">
            <svg
              viewBox="0 0 24 24"
              aria-hidden="true"
              className="h-3.5 w-3.5 shrink-0"
            >
              <path
                fill="currentColor"
                d="M12 2a7 7 0 0 0-7 7c0 5.25 7 13 7 13s7-7.75 7-13a7 7 0 0 0-7-7Zm0 9.5A2.5 2.5 0 1 1 12 6a2.5 2.5 0 0 1 0 5.5Z"
              />
            </svg>
            <span className="truncate">{props.place}</span>
          </div>
        )}
      </div>
    );
  };

  const inputClass =
    "h-12 w-full rounded-xl border border-slate-200 bg-white px-4 text-sm text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-indigo-400 focus:ring-4 focus:ring-indigo-500/10 dark:border-slate-700 dark:bg-slate-900 dark:text-white";

  const labelClass =
    "mb-2 block text-sm font-bold text-slate-700 dark:text-slate-200";

  return (
    <>
      <PageMeta
        title="تقويم الأنشطة"
        description="إدارة الأنشطة والمواعيد"
      />

      <style>{`
        .professional-calendar {
          --fc-border-color: #e8edf5;
          --fc-page-bg-color: transparent;
          --fc-neutral-bg-color: #f8fafc;
          --fc-today-bg-color: rgba(99, 102, 241, 0.055);
          --fc-button-bg-color: #ffffff;
          --fc-button-border-color: #e2e8f0;
          --fc-button-text-color: #475569;
          --fc-button-hover-bg-color: #f8fafc;
          --fc-button-hover-border-color: #cbd5e1;
          --fc-button-active-bg-color: #eef2ff;
          --fc-button-active-border-color: #a5b4fc;
        }

        .dark .professional-calendar {
          --fc-border-color: #253046;
          --fc-page-bg-color: transparent;
          --fc-neutral-bg-color: #111827;
          --fc-today-bg-color: rgba(99, 102, 241, 0.12);
          --fc-button-bg-color: #111827;
          --fc-button-border-color: #334155;
          --fc-button-text-color: #cbd5e1;
          --fc-button-hover-bg-color: #1e293b;
          --fc-button-hover-border-color: #475569;
          --fc-button-active-bg-color: #312e81;
          --fc-button-active-border-color: #6366f1;
        }

        .professional-calendar .fc {
          font-family: inherit;
          color: #334155;
        }

        .dark .professional-calendar .fc {
          color: #cbd5e1;
        }

        .professional-calendar .fc-toolbar {
          gap: 12px;
          flex-wrap: wrap;
          margin-bottom: 1.25rem !important;
        }

        .professional-calendar .fc-toolbar-title {
          font-size: 1.25rem !important;
          font-weight: 800 !important;
          color: #0f172a;
          letter-spacing: -0.02em;
        }

        .dark .professional-calendar .fc-toolbar-title {
          color: #f8fafc;
        }

        .professional-calendar .fc-button {
          border-radius: 10px !important;
          box-shadow: none !important;
          padding: 0.48rem 0.8rem !important;
          font-weight: 700 !important;
          font-size: 0.82rem !important;
          transition: all 180ms ease !important;
        }

        .professional-calendar .fc-button-primary:not(:disabled):focus {
          box-shadow: 0 0 0 4px rgba(99, 102, 241, 0.10) !important;
        }

        .professional-calendar .fc-col-header-cell {
          background: #f8fafc;
          border-bottom-color: #e2e8f0;
        }

        .dark .professional-calendar .fc-col-header-cell {
          background: #111827;
          border-bottom-color: #253046;
        }

        .professional-calendar .fc-col-header-cell-cushion {
          padding: 13px 6px !important;
          font-size: 0.78rem;
          font-weight: 800;
          color: #64748b;
          text-decoration: none !important;
        }

        .professional-calendar .fc-daygrid-day {
          transition: background-color 160ms ease;
        }

        .professional-calendar .fc-daygrid-day:hover {
          background: rgba(248, 250, 252, 0.86);
        }

        .dark .professional-calendar .fc-daygrid-day:hover {
          background: rgba(30, 41, 59, 0.55);
        }

        .professional-calendar .fc-daygrid-day-number {
          margin: 7px;
          display: inline-flex;
          min-width: 30px;
          height: 30px;
          align-items: center;
          justify-content: center;
          border-radius: 9px;
          color: #64748b;
          font-size: 0.8rem;
          font-weight: 700;
          text-decoration: none !important;
        }

        .professional-calendar .fc-day-today .fc-daygrid-day-number {
          background: #4f46e5;
          color: white;
          box-shadow: 0 5px 14px rgba(79, 70, 229, 0.24);
        }

        .professional-calendar .fc-daygrid-event,
        .professional-calendar .fc-timegrid-event {
          background: transparent !important;
          border: 0 !important;
          box-shadow: none !important;
          margin: 2px 4px !important;
        }

        .professional-calendar .fc-daygrid-event-harness {
          margin-top: 2px;
        }

        .professional-calendar .fc-event-main {
          color: inherit !important;
        }

        .calendar-event-card {
          width: 100%;
          overflow: hidden;
          border-right: 3px solid;
          border-radius: 9px;
          padding: 6px 7px;
          transition: transform 150ms ease, box-shadow 150ms ease;
        }

        .calendar-event-card:hover {
          transform: translateY(-1px);
          box-shadow: 0 6px 14px rgba(15, 23, 42, 0.08);
        }

        .calendar-event-card__top {
          display: flex;
          align-items: center;
          gap: 6px;
          min-width: 0;
        }

        .calendar-event-card__dot {
          width: 6px;
          height: 6px;
          border-radius: 999px;
          flex: 0 0 auto;
        }

        .calendar-event-card__title {
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
          font-size: 0.76rem;
          font-weight: 800;
        }

        .calendar-event-card__meta {
          margin-top: 3px;
          display: flex;
          align-items: center;
          gap: 4px;
          min-width: 0;
          opacity: 0.72;
          font-size: 0.66rem;
          font-weight: 600;
        }

        .professional-calendar .fc-more-link {
          color: #4f46e5;
          font-size: 0.72rem;
          font-weight: 800;
          text-decoration: none;
        }

        .professional-calendar .fc-scrollgrid {
          overflow: hidden;
          border-radius: 14px;
        }

        @media (max-width: 768px) {
          .professional-calendar .fc-toolbar {
            align-items: stretch;
          }

          .professional-calendar .fc-toolbar-chunk {
            display: flex;
            justify-content: center;
          }

          .professional-calendar .fc-toolbar-title {
            font-size: 1.05rem !important;
          }

          .professional-calendar .fc-button {
            padding: 0.4rem 0.58rem !important;
            font-size: 0.74rem !important;
          }

          .calendar-event-card__meta {
            display: none;
          }
        }
      `}</style>

      <div className="space-y-6" dir="rtl">
        {/* HERO */}
        <section className="relative overflow-hidden rounded-3xl border border-indigo-100 bg-gradient-to-l from-indigo-600 via-indigo-600 to-violet-600 px-6 py-7 text-white shadow-[0_18px_50px_-20px_rgba(79,70,229,0.55)] md:px-8">
          <div className="absolute -left-16 -top-20 h-48 w-48 rounded-full bg-white/10 blur-2xl" />
          <div className="absolute -bottom-24 right-1/3 h-48 w-48 rounded-full bg-violet-300/20 blur-3xl" />

          <div className="relative flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1.5 text-xs font-bold text-indigo-50 backdrop-blur">
                <span className="h-2 w-2 rounded-full bg-emerald-300" />
                إدارة الأنشطة والمواعيد
              </div>

              <h1 className="text-2xl font-black tracking-tight md:text-3xl">
                تقويم الأنشطة
              </h1>

              <p className="mt-2 max-w-2xl text-sm leading-6 text-indigo-100">
                نظّم الأنشطة، حدّد الفئات المستهدفة، الدرجات والفترات الزمنية
                من واجهة واحدة واضحة وسهلة الاستخدام.
              </p>
            </div>

            <div className="flex flex-wrap gap-3">
              <button
                type="button"
                onClick={() => navigate("/listeevents")}
                className="inline-flex h-11 items-center gap-2 rounded-xl border border-white/20 bg-white/10 px-4 text-sm font-bold text-white backdrop-blur transition hover:bg-white/20"
              >
                <svg
                  className="h-4 w-4"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01" />
                </svg>
                قائمة الأنشطة
              </button>

              <button
                type="button"
                onClick={openNewEventModal}
                className="inline-flex h-11 items-center gap-2 rounded-xl bg-white px-5 text-sm font-black text-indigo-700 shadow-lg shadow-indigo-900/10 transition hover:-translate-y-0.5 hover:bg-indigo-50"
              >
                <svg
                  className="h-4 w-4"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.4"
                >
                  <path d="M12 5v14M5 12h14" />
                </svg>
                إضافة نشاط
              </button>
            </div>
          </div>
        </section>

        {/* SUMMARY */}
        <section className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-bold text-slate-400">
                  مجموع الأنشطة
                </p>
                <p className="mt-2 text-3xl font-black text-slate-900 dark:text-white">
                  {events.length}
                </p>
              </div>

              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-600 dark:bg-indigo-500/10 dark:text-indigo-300">
                <svg
                  className="h-6 w-6"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.9"
                >
                  <rect x="3" y="5" width="18" height="16" rx="2" />
                  <path d="M16 3v4M8 3v4M3 10h18" />
                </svg>
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-bold text-slate-400">
                  السنة الدراسية الحالية
                </p>
                <p className="mt-2 text-2xl font-black text-slate-900 dark:text-white">
                  {currentSchoolYear}
                </p>
                <p className="mt-1 text-xs font-semibold text-indigo-500">
                  {totalCurrentSchoolYear} نشاط
                </p>
              </div>

              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-300">
                <svg
                  className="h-6 w-6"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.9"
                >
                  <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
                  <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2Z" />
                </svg>
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-bold text-slate-400">
                  أنشطة هذا الشهر
                </p>
                <p className="mt-2 text-3xl font-black text-slate-900 dark:text-white">
                  {totalThisMonth}
                </p>
                <p className="mt-1 text-xs font-semibold text-slate-400">
                  {eventTypes.length} أنواع أنشطة
                </p>
              </div>

              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-50 text-amber-600 dark:bg-amber-500/10 dark:text-amber-300">
                <svg
                  className="h-6 w-6"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.9"
                >
                  <path d="M12 8v4l3 2" />
                  <circle cx="12" cy="12" r="9" />
                </svg>
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-violet-200 bg-violet-50 p-5 shadow-sm dark:border-violet-500/20 dark:bg-violet-500/10">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-bold text-violet-500 dark:text-violet-300">
                  أنشطة سواعد الخير
                </p>
                <p className="mt-2 text-3xl font-black text-violet-900 dark:text-violet-100">
                  {totalSawaedAlKhayr}
                </p>
                <p className="mt-1 text-xs font-semibold text-violet-500 dark:text-violet-300">
                  ميزانية مستقلة
                </p>
              </div>

              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white text-violet-600 shadow-sm dark:bg-violet-500/15 dark:text-violet-200">
                <svg
                  className="h-6 w-6"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.9"
                >
                  <path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.6l-1-1a5.5 5.5 0 0 0-7.8 7.8l1 1L12 21l7.8-7.6 1-1a5.5 5.5 0 0 0 0-7.8Z" />
                </svg>
              </div>
            </div>
          </div>
        </section>

        {/* CALENDAR */}
        <section className="rounded-3xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div className="flex flex-col gap-3 border-b border-slate-100 px-6 py-5 dark:border-slate-800 md:flex-row md:items-center md:justify-between">
            <div>
              <h2 className="text-lg font-black text-slate-900 dark:text-white">
                جدول الأنشطة
              </h2>
              <p className="mt-1 text-xs font-medium text-slate-400">
                اضغط على يوم لإضافة نشاط أو على نشاط موجود لتعديله.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-3 text-xs font-bold text-slate-500">
              <span className="inline-flex items-center gap-2">
                <span className="h-2.5 w-2.5 rounded-full bg-indigo-500" />
                نشاط مخطط
              </span>
              <span className="inline-flex items-center gap-2">
                <span className="h-2.5 w-2.5 rounded-full bg-emerald-500" />
                السنة الحالية
              </span>
              <span className="inline-flex items-center gap-2">
                <span className="h-2.5 w-2.5 rounded-full bg-violet-500" />
                سواعد الخير
              </span>
            </div>
          </div>

          <div className="relative p-4 md:p-6">
            {loadingEvents && (
              <div className="absolute inset-0 z-20 flex items-center justify-center rounded-b-3xl bg-white/70 backdrop-blur-sm dark:bg-slate-900/70">
                <div className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white px-5 py-3 text-sm font-bold text-slate-600 shadow-lg dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200">
                  <span className="h-5 w-5 animate-spin rounded-full border-2 border-indigo-200 border-t-indigo-600" />
                  جاري تحميل التقويم...
                </div>
              </div>
            )}

            <div className="professional-calendar">
              <FullCalendar
                ref={calendarRef}
                plugins={[
                  dayGridPlugin,
                  timeGridPlugin,
                  interactionPlugin,
                ]}
                locales={[arLocale]}
                locale="ar"
                direction="rtl"
                initialView="dayGridMonth"
                firstDay={1}
                height="auto"
                fixedWeekCount={false}
                dayMaxEvents={3}
                moreLinkText="المزيد"
                navLinks
                selectable
                selectMirror
                nowIndicator
                slotMinTime="07:00:00"
                slotMaxTime="22:00:00"
                allDayText="اليوم كامل"
                buttonText={{
                  today: "اليوم",
                  month: "شهر",
                  week: "أسبوع",
                  day: "يوم",
                }}
                headerToolbar={{
                  left: "dayGridMonth,timeGridWeek,timeGridDay",
                  center: "title",
                  right: "today prev,next",
                }}
                events={events}
                select={handleDateSelect}
                eventClick={handleEventClick}
                eventContent={renderEventContent}
              />
            </div>
          </div>
        </section>

        {/* MODAL */}
        <Modal
          isOpen={isOpen}
          onClose={handleCloseModal}
          className="max-w-[820px] p-0"
        >
          <div
            className="max-h-[90vh] overflow-y-auto rounded-3xl bg-white dark:bg-slate-900"
            dir="rtl"
          >
            {/* Modal header */}
            <div className="relative overflow-hidden border-b border-slate-100 bg-gradient-to-l from-slate-50 to-indigo-50/70 px-6 py-6 dark:border-slate-800 dark:from-slate-900 dark:to-indigo-950/30 md:px-8">
              <div className="absolute -left-12 -top-16 h-40 w-40 rounded-full bg-indigo-200/30 blur-3xl dark:bg-indigo-600/10" />

              <div className="relative">
                <div className="mb-2 inline-flex items-center gap-2 rounded-full bg-indigo-100 px-3 py-1 text-[11px] font-black text-indigo-700 dark:bg-indigo-500/15 dark:text-indigo-300">
                  {selectedEvent ? "تعديل نشاط مسجل" : "نشاط جديد"}
                </div>

                <h3 className="text-2xl font-black text-slate-900 dark:text-white">
                  {selectedEvent ? "تعديل النشاط" : "إضافة نشاط جديد"}
                </h3>

                <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                  أدخل المعلومات الأساسية وحدد الفئات المستهدفة.
                </p>
              </div>
            </div>

            <div className="space-y-7 px-6 py-6 md:px-8">
              {/* Basic information */}
              <section>
                <div className="mb-4 flex items-center gap-3">
                  <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-indigo-50 text-sm font-black text-indigo-600 dark:bg-indigo-500/10 dark:text-indigo-300">
                    1
                  </span>
                  <div>
                    <h4 className="font-black text-slate-800 dark:text-white">
                      المعلومات الأساسية
                    </h4>
                    <p className="text-xs text-slate-400">
                      اسم النشاط ونوعه ومكان تنظيمه
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <div className="md:col-span-2">
                    <label className={labelClass}>عنوان النشاط</label>
                    <input
                      type="text"
                      value={eventTitle}
                      onChange={(e) => setEventTitle(e.target.value)}
                      placeholder="مثال: لقاء تربوي للأطفال"
                      className={inputClass}
                    />
                  </div>

                  <div>
                    <label className={labelClass}>نوع النشاط</label>
                    <select
                      value={eventTypeId}
                      onChange={(e) =>
                        setEventTypeId(
                          e.target.value
                            ? Number(e.target.value)
                            : ""
                        )
                      }
                      className={inputClass}
                    >
                      <option value="">اختر نوع النشاط</option>
                      {eventTypes.map((type) => (
                        <option key={type.id} value={type.id}>
                          {type.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className={labelClass}>مكان النشاط</label>
                    <input
                      type="text"
                      value={place}
                      onChange={(e) => setPlace(e.target.value)}
                      placeholder="مثال: مقر الجمعية"
                      className={inputClass}
                    />
                  </div>
                </div>
              </section>

              <div className="h-px bg-slate-100 dark:bg-slate-800" />

              {/* Funding source */}
              <section>
                <div className="mb-4 flex items-center gap-3">
                  <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-violet-50 text-sm font-black text-violet-600 dark:bg-violet-500/10 dark:text-violet-300">
                    2
                  </span>
                  <div>
                    <h4 className="font-black text-slate-800 dark:text-white">
                      مصدر تمويل النشاط
                    </h4>
                    <p className="text-xs text-slate-400">
                      حدّد ما إذا كان النشاط تابعاً لسواعد الخير
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <button
                    type="button"
                    onClick={() => setSawaedAlKhayr(false)}
                    className={`relative rounded-2xl border p-4 text-right transition-all duration-200 ${
                      !sawaedAlKhayr
                        ? "border-slate-700 bg-slate-900 text-white shadow-md dark:border-slate-500 dark:bg-slate-700"
                        : "border-slate-200 bg-white text-slate-700 hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-sm dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <span
                        className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-lg ${
                          !sawaedAlKhayr
                            ? "bg-white/10"
                            : "bg-slate-100 dark:bg-slate-800"
                        }`}
                      >
                        ◌
                      </span>
                      <div>
                        <p className="font-black">نشاط عادي</p>
                        <p
                          className={`mt-1 text-[11px] leading-5 ${
                            !sawaedAlKhayr
                              ? "text-slate-300"
                              : "text-slate-400"
                          }`}
                        >
                          المصاريف تُصنّف حسب الدرجة المحددة أو معوز
                        </p>
                      </div>
                    </div>

                    {!sawaedAlKhayr && (
                      <span className="absolute left-3 top-3 flex h-5 w-5 items-center justify-center rounded-full bg-white text-[10px] font-black text-slate-900">
                        ✓
                      </span>
                    )}
                  </button>

                  <button
                    type="button"
                    onClick={() => setSawaedAlKhayr(true)}
                    className={`relative rounded-2xl border p-4 text-right transition-all duration-200 ${
                      sawaedAlKhayr
                        ? "border-violet-500 bg-violet-600 text-white shadow-md shadow-violet-500/20"
                        : "border-violet-200 bg-violet-50 text-violet-800 hover:-translate-y-0.5 hover:border-violet-300 hover:shadow-sm dark:border-violet-500/20 dark:bg-violet-500/10 dark:text-violet-200"
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <span
                        className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-lg ${
                          sawaedAlKhayr
                            ? "bg-white/15"
                            : "bg-violet-100 dark:bg-violet-500/15"
                        }`}
                      >
                        ♥
                      </span>
                      <div>
                        <p className="font-black">سواعد الخير</p>
                        <p
                          className={`mt-1 text-[11px] leading-5 ${
                            sawaedAlKhayr
                              ? "text-violet-100"
                              : "text-violet-500 dark:text-violet-300"
                          }`}
                        >
                          ميزانية مستقلة لا تُخلط مع معوز أو الدرجات المحددة
                        </p>
                      </div>
                    </div>

                    {sawaedAlKhayr && (
                      <span className="absolute left-3 top-3 flex h-5 w-5 items-center justify-center rounded-full bg-white text-[10px] font-black text-violet-700">
                        ✓
                      </span>
                    )}
                  </button>
                </div>

                {sawaedAlKhayr && (
                  <div className="mt-3 rounded-xl border border-violet-200 bg-violet-50 px-4 py-3 text-xs font-bold leading-6 text-violet-700 dark:border-violet-500/20 dark:bg-violet-500/10 dark:text-violet-200">
                    مصاريف هذا النشاط ستُحتسب ضمن «سواعد الخير» فقط ولن تُضاف إلى
                    «الدرجات المحددة» أو «معوز». اختيار الدرجات أدناه يبقى فقط
                    لتحديد المستفيدين المؤهلين للنشاط.
                  </div>
                )}
              </section>

              <div className="h-px bg-slate-100 dark:bg-slate-800" />

              {/* Targets */}
              <section>
                <div className="mb-4 flex items-center gap-3">
                  <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-emerald-50 text-sm font-black text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-300">
                    3
                  </span>
                  <div>
                    <h4 className="font-black text-slate-800 dark:text-white">
                      الفئة المستهدفة
                    </h4>
                    <p className="text-xs text-slate-400">
                      اختر المستفيدين من هذا النشاط
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                  {TARGETS.map((item) => {
                    const selected = cibles.includes(item.value);

                    return (
                      <button
                        key={item.value}
                        type="button"
                        onClick={() => toggleTarget(item.value)}
                        className={`relative overflow-hidden rounded-2xl border p-4 text-right transition-all duration-200 ${
                          selected
                            ? "border-indigo-400 bg-indigo-50 shadow-sm ring-2 ring-indigo-500/10 dark:bg-indigo-500/10"
                            : "border-slate-200 bg-white hover:-translate-y-0.5 hover:border-indigo-200 hover:shadow-md dark:border-slate-700 dark:bg-slate-900"
                        }`}
                      >
                        <div className="flex items-start gap-3">
                          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-xl dark:bg-slate-800">
                            {item.icon}
                          </span>

                          <div className="min-w-0">
                            <p
                              className={`font-black ${
                                selected
                                  ? "text-indigo-700 dark:text-indigo-300"
                                  : "text-slate-800 dark:text-white"
                              }`}
                            >
                              {item.label}
                            </p>
                            <p className="mt-1 text-[11px] leading-5 text-slate-400">
                              {item.description}
                            </p>
                          </div>
                        </div>

                        <span
                          className={`absolute left-3 top-3 flex h-5 w-5 items-center justify-center rounded-full border text-[10px] font-black transition ${
                            selected
                              ? "border-indigo-600 bg-indigo-600 text-white"
                              : "border-slate-300 bg-white text-transparent dark:bg-slate-900"
                          }`}
                        >
                          ✓
                        </span>
                      </button>
                    );
                  })}
                </div>
              </section>

              {/* Degree */}
              <div
                className={`grid transition-all duration-300 ${
                  cibles.length > 0
                    ? "grid-rows-[1fr] opacity-100"
                    : "grid-rows-[0fr] opacity-0"
                }`}
              >
                <div className="overflow-hidden">
                  <section className="rounded-2xl border border-slate-200 bg-slate-50/70 p-5 dark:border-slate-700 dark:bg-slate-800/40">
                    <div className="mb-4">
                      <h4 className="font-black text-slate-800 dark:text-white">
                        درجة العائلة المستهدفة
                      </h4>
                      <p className="mt-1 text-xs text-slate-400">
                        يمكنك اختيار عدة درجات، بما فيها العائلات ذات الدرجة غير المحددة.
                      </p>
                    </div>

                    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                      {DEGREE_OPTIONS.map((item) => {
                        const selected =
                          degresFamille.includes(item.value);

                        return (
                          <button
                            key={item.value}
                            type="button"
                            onClick={() =>
                              toggleDegree(item.value)
                            }
                            className={`relative rounded-xl border px-3 py-3.5 text-center transition-all duration-200 ${
                              selected
                                ? "border-indigo-600 bg-indigo-600 text-white shadow-md shadow-indigo-500/15"
                                : "border-slate-200 bg-white text-slate-600 hover:border-indigo-300 hover:bg-indigo-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300"
                            }`}
                          >
                            <div
                              className={`mx-auto mb-2 flex h-7 w-7 items-center justify-center rounded-lg text-xs font-black ${
                                selected
                                  ? "bg-white/15"
                                  : "bg-slate-100 dark:bg-slate-800"
                              }`}
                            >
                              {item.short}
                            </div>

                            <div className="text-xs font-black">
                              {item.label}
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </section>
                </div>
              </div>

              {/* Children age */}
              <div
                className={`grid transition-all duration-300 ${
                  cibles.includes("ENFANT")
                    ? "grid-rows-[1fr] opacity-100"
                    : "grid-rows-[0fr] opacity-0"
                }`}
              >
                <div className="overflow-hidden">
                  <section className="rounded-2xl border border-amber-200 bg-amber-50/50 p-5 dark:border-amber-900/40 dark:bg-amber-500/5">
                    <div className="mb-4">
                      <h4 className="font-black text-slate-800 dark:text-white">
                        الفئة العمرية للأطفال
                      </h4>
                      <p className="mt-1 text-xs text-slate-400">
                        اترك الحقول فارغة إذا لم يكن هناك شرط للعمر.
                      </p>
                    </div>

                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                      <div>
                        <label className={labelClass}>
                          الحد الأدنى للعمر
                        </label>
                        <div className="relative">
                          <input
                            type="number"
                            min="0"
                            value={ageMin}
                            onChange={(e) =>
                              setAgeMin(
                                e.target.value
                                  ? Number(e.target.value)
                                  : ""
                              )
                            }
                            placeholder="مثال: 6"
                            className={`${inputClass} pl-14`}
                          />
                          <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">
                            سنة
                          </span>
                        </div>
                      </div>

                      <div>
                        <label className={labelClass}>
                          الحد الأقصى للعمر
                        </label>
                        <div className="relative">
                          <input
                            type="number"
                            min="0"
                            value={ageMax}
                            onChange={(e) =>
                              setAgeMax(
                                e.target.value
                                  ? Number(e.target.value)
                                  : ""
                              )
                            }
                            placeholder="مثال: 16"
                            className={`${inputClass} pl-14`}
                          />
                          <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">
                            سنة
                          </span>
                        </div>
                      </div>
                    </div>
                  </section>
                </div>
              </div>

              <div className="h-px bg-slate-100 dark:bg-slate-800" />

              {/* Planning */}
              <section>
                <div className="mb-4 flex items-center gap-3">
                  <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-amber-50 text-sm font-black text-amber-600 dark:bg-amber-500/10 dark:text-amber-300">
                    4
                  </span>
                  <div>
                    <h4 className="font-black text-slate-800 dark:text-white">
                      التخطيط الزمني
                    </h4>
                    <p className="text-xs text-slate-400">
                      السنة الدراسية وفترة النشاط
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <div className="md:col-span-2">
                    <label className={labelClass}>
                      السنة الدراسية
                    </label>
                    <select
                      value={anneeScolaire}
                      onChange={(e) =>
                        setAnneeScolaire(e.target.value)
                      }
                      className={inputClass}
                    >
                      <option value="">
                        اختر السنة الدراسية
                      </option>
                      {anneesScolaires.map((annee) => (
                        <option key={annee} value={annee}>
                          {annee}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className={labelClass}>
                      تاريخ البداية
                    </label>
                    <input
                      type="date"
                      value={eventStartDate}
                      onChange={(e) => {
                        const value = e.target.value;
                        setEventStartDate(value);
                        setAnneeScolaire(
                          getAnneeScolaireFromDate(value)
                        );
                      }}
                      className={inputClass}
                    />
                  </div>

                  <div>
                    <label className={labelClass}>
                      تاريخ النهاية
                    </label>
                    <input
                      type="date"
                      min={eventStartDate || undefined}
                      value={eventEndDate}
                      onChange={(e) =>
                        setEventEndDate(e.target.value)
                      }
                      className={inputClass}
                    />
                  </div>
                </div>
              </section>
            </div>

            {/* Footer */}
            <div className="sticky bottom-0 flex flex-col-reverse gap-3 border-t border-slate-100 bg-white/95 px-6 py-4 backdrop-blur dark:border-slate-800 dark:bg-slate-900/95 sm:flex-row sm:justify-end md:px-8">
              <button
                type="button"
                onClick={handleCloseModal}
                disabled={saving}
                className="h-11 rounded-xl border border-slate-200 bg-white px-5 text-sm font-bold text-slate-600 transition hover:bg-slate-50 disabled:opacity-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800"
              >
                إلغاء
              </button>

              <button
                type="button"
                onClick={handleAddOrUpdateEvent}
                disabled={saving}
                className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-indigo-600 px-6 text-sm font-black text-white shadow-lg shadow-indigo-500/20 transition hover:-translate-y-0.5 hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:translate-y-0"
              >
                {saving ? (
                  <>
                    <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                    جاري الحفظ...
                  </>
                ) : (
                  <>
                    <svg
                      className="h-4 w-4"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2.2"
                    >
                      {selectedEvent ? (
                        <>
                          <path d="M12 20h9" />
                          <path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L8 18l-4 1 1-4Z" />
                        </>
                      ) : (
                        <>
                          <path d="M12 5v14M5 12h14" />
                        </>
                      )}
                    </svg>
                    {selectedEvent
                      ? "حفظ التعديلات"
                      : "إضافة النشاط"}
                  </>
                )}
              </button>
            </div>
          </div>
        </Modal>
      </div>
    </>
  );
};

export default Calendar;
