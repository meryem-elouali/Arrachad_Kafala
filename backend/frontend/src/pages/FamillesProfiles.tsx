import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useParams } from "react-router-dom";

import PageBreadcrumb from "../components/common/PageBreadCrumb";
import PageMeta from "../components/common/PageMeta";
import { Modal } from "../components/ui/modal";

const API = "http://localhost:8080/api";

/* ============================== TYPES ============================== */
interface Option {
  value: number;
  label: string;
}

interface Person {
  nom: string;
  prenom: string;
  phone?: string;
  cin?: string;
  dateNaissance?: string;
  villeNaissance?: string;
  estMalade?: boolean;
  typeMaladie?: string;
  estTravaille?: boolean;
  typeTravail?: string;
  estDecedee?: boolean;
  dateDeces?: string;
  photoMere?: string;
  photoPere?: string;
}

interface Enfant {
  id: number;
  prenom: string;
  nom: string;
  dateNaissance?: string;
  photoEnfant?: string;
  typeMaladie?: string;
  estMalade?: boolean;
}

interface Famille {
  id: number;
  nomFamille?: string;
  adresseFamille?: string;
  phone?: string;
  nombreEnfants?: number;
  dateInscription?: string;
  possedeMalade?: boolean;
  personneMalade?: string;
  lienParenteMalade?: string;
  aideFamille?: boolean;
  revenuMensuel?: boolean;
  beneficieAutreAssociation?: boolean;
  degreFamille?: number | string;
  mere?: Person;
  pere?: Person;
  typeFamille?: { id: number; nom: string };
  habitationFamille?: { id: number; nom: string };
  enfants?: Enfant[];
}

interface SoutienEtude {
  id: number;
  enfantId: number;
  enfantNom: string;
  anneeScolaire: string;
  mois: string;
  centre?: string;
  intervenant?: string;
  montant: number;
  montantPaye: number;
  effectue: boolean;
}

interface ConsoEtudes {
  totalConsomme: number;
  totalPaye: number;
  totalNonPaye: number;
  details: SoutienEtude[];
  parEnfant: Record<
    number,
    {
      enfantId: number;
      enfantNom: string;
      totalConsomme: number;
      totalPaye: number;
      totalNonPaye: number;
      soutiens: SoutienEtude[];
    }
  >;
}

type Role = "mere" | "pere";
type ModalType = null | "famille" | Role | "enfant";

interface PersonForm {
  nom: string;
  prenom: string;
  phone: string;
  cin: string;
  dateNaissance: string;
  villeNaissance: string;
  estMalade: boolean;
  typeMaladie: string;
  estTravaille: boolean;
  typeTravail: string;
  estDecedee: boolean;
  dateDeces: string;
  photo: string;
  photoChanged: boolean;
}

/* ============================== HELPERS ============================== */
const toInputDate = (d?: string) => {
  if (!d) return "";
  if (/^\d{4}-\d{2}-\d{2}/.test(d)) return d.slice(0, 10);
  const m = d.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  return m ? `${m[3]}-${m[2]}-${m[1]}` : "";
};

const formatDate = (d?: string) => {
  const iso = toInputDate(d);
  if (!iso) return d || "";
  const [y, m, day] = iso.split("-");
  return `${day}/${m}/${y}`;
};

const todayISO = () => new Date().toLocaleDateString("en-CA");

const ageFrom = (d?: string) => {
  const iso = toInputDate(d);
  if (!iso) return null;
  const b = new Date(iso);
  if (isNaN(b.getTime())) return null;
  const n = new Date();
  let a = n.getFullYear() - b.getFullYear();
  const m = n.getMonth() - b.getMonth();
  if (m < 0 || (m === 0 && n.getDate() < b.getDate())) a--;
  return a >= 0 ? a : null;
};

const photoSrc = (b64?: string) =>
  b64 ? (b64.startsWith("data:") ? b64 : `data:image/jpeg;base64,${b64}`) : undefined;

const toOpts = (arr: any): Option[] =>
  Array.isArray(arr) ? arr.map((x: any) => ({ value: x.id, label: x.nom })) : [];

const safeJson = async (url: string) => {
  try {
    const r = await fetch(url);
    return r.ok ? await r.json() : [];
  } catch {
    return [];
  }
};

const emptyPerson: PersonForm = {
  nom: "",
  prenom: "",
  phone: "",
  cin: "",
  dateNaissance: "",
  villeNaissance: "",
  estMalade: false,
  typeMaladie: "",
  estTravaille: false,
  typeTravail: "",
  estDecedee: false,
  dateDeces: "",
  photo: "",
  photoChanged: false,
};

const personToForm = (p: Person | undefined, role: Role, fallbackPhone = ""): PersonForm => ({
  nom: p?.nom || "",
  prenom: p?.prenom || "",
  phone: p?.phone || fallbackPhone,
  cin: p?.cin || "",
  dateNaissance: toInputDate(p?.dateNaissance),
  villeNaissance: p?.villeNaissance || "",
  estMalade: !!p?.estMalade,
  typeMaladie: p?.typeMaladie || "",
  estTravaille: !!p?.estTravaille,
  typeTravail: p?.typeTravail || "",
  estDecedee: !!p?.estDecedee,
  dateDeces: toInputDate(p?.dateDeces),
  photo: (role === "mere" ? p?.photoMere : p?.photoPere) || "",
  photoChanged: false,
});

const ROLE_TEXT = {
  mere: {
    title: "تعديل معلومات الأم",
    photo: "صورة الأم",
    dead: "هل الأم متوفاة؟",
    sick: "هل الأم مريضة؟",
    work: "هل الأم تعمل؟",
    deadBadge: "متوفاة",
  },
  pere: {
    title: "تعديل معلومات الأب",
    photo: "صورة الأب",
    dead: "هل الأب متوفى؟",
    sick: "هل الأب مريض؟",
    work: "هل الأب يعمل؟",
    deadBadge: "متوفى",
  },
};

const AVATAR_GRADIENTS = [
  "from-blue-500 to-indigo-500",
  "from-emerald-500 to-teal-500",
  "from-amber-500 to-orange-500",
  "from-pink-500 to-rose-500",
  "from-purple-500 to-fuchsia-500",
  "from-cyan-500 to-sky-500",
];

/* ============================== UI BRIQUES ============================== */
const inputCls =
  "h-11 w-full rounded-xl border border-gray-200 bg-gray-50 px-3.5 text-sm text-gray-800 outline-none transition placeholder:text-gray-400 focus:border-indigo-300 focus:bg-white focus:ring-4 focus:ring-indigo-500/10 disabled:cursor-not-allowed disabled:opacity-50";

const TextField = ({
  label,
  hint,
  ...props
}: { label: string; hint?: string } & React.InputHTMLAttributes<HTMLInputElement>) => (
  <label className="block">
    <span className="mb-1.5 block text-xs font-semibold text-gray-500">{label}</span>
    <input {...props} className={inputCls} />
    {hint && <span className="mt-1 block text-[11px] text-gray-400">{hint}</span>}
  </label>
);

const Toggle = ({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) => (
  <div className="flex h-11 items-center justify-between rounded-xl border border-gray-200 bg-gray-50 px-3.5">
    <span className="text-sm font-semibold text-gray-700">{label}</span>
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className={`relative h-6 w-11 shrink-0 rounded-full transition ${
        checked ? "bg-indigo-600" : "bg-gray-300"
      }`}
    >
      <span
        className="absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all"
        style={{ insetInlineStart: checked ? 22 : 2 }}
      />
    </button>
  </div>
);

const Avatar = ({
  src,
  name,
  size = "md",
  index = 0,
}: {
  src?: string;
  name?: string;
  size?: "sm" | "md" | "lg" | "xl";
  index?: number;
}) => {
  const dim = { sm: "h-10 w-10 text-sm", md: "h-14 w-14 text-lg", lg: "h-20 w-20 text-2xl", xl: "h-24 w-24 text-3xl" }[size];
  return src ? (
    <img src={src} alt={name} className={`${dim} shrink-0 rounded-2xl border-2 border-white object-cover shadow-sm`} />
  ) : (
    <span
      className={`${dim} flex shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br ${
        AVATAR_GRADIENTS[index % AVATAR_GRADIENTS.length]
      } font-bold text-white shadow-sm`}
    >
      {name?.charAt(0) || "؟"}
    </span>
  );
};

const TONES: Record<string, string> = {
  indigo: "bg-indigo-50 text-indigo-700",
  green: "bg-green-50 text-green-700",
  red: "bg-red-50 text-red-600",
  amber: "bg-amber-50 text-amber-700",
  gray: "bg-gray-100 text-gray-600",
  sky: "bg-sky-50 text-sky-700",
  white: "bg-white/20 text-white",
};

const Badge = ({ children, tone = "indigo" }: { children: React.ReactNode; tone?: string }) => (
  <span className={`inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-bold ${TONES[tone]}`}>
    {children}
  </span>
);

const YesNo = ({ value }: { value?: boolean }) => (
  <Badge tone={value ? "green" : "gray"}>{value ? "نعم" : "لا"}</Badge>
);

const Field = ({ label, value }: { label: string; value: React.ReactNode }) => (
  <div className="min-w-0 rounded-2xl bg-gray-50 px-4 py-3 dark:bg-white/[0.03]">
    <p className="text-[11px] font-semibold text-gray-400">{label}</p>
    <div className="mt-1 break-words text-sm font-bold text-gray-800 dark:text-white/90">
      {value === undefined || value === null || value === "" ? "غير محدد" : value}
    </div>
  </div>
);

const EditButton = ({ onClick }: { onClick: () => void }) => (
  <button
    type="button"
    onClick={onClick}
    data-html2canvas-ignore="true"
    className="inline-flex h-10 items-center gap-2 rounded-xl border border-gray-200 bg-white px-4 text-sm font-semibold text-gray-600 transition hover:-translate-y-0.5 hover:border-indigo-200 hover:bg-indigo-50 hover:text-indigo-700"
  >
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M12 20h9" />
      <path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z" />
    </svg>
    تعديل
  </button>
);

const Section = ({
  title,
  subtitle,
  onEdit,
  children,
}: {
  title: string;
  subtitle?: string;
  onEdit?: () => void;
  children: React.ReactNode;
}) => (
  <div className="rounded-3xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-gray-900">
    <div className="mb-5 flex items-center justify-between gap-3">
      <div>
        <h4 className="text-lg font-extrabold text-gray-800 dark:text-white">{title}</h4>
        {subtitle && <p className="mt-0.5 text-xs text-gray-400">{subtitle}</p>}
      </div>
      {onEdit && <EditButton onClick={onEdit} />}
    </div>
    {children}
  </div>
);

const PhotoPicker = ({
  label,
  value,
  onPick,
}: {
  label: string;
  value: string;
  onPick: (b64: string) => void;
}) => {
  const ref = useRef<HTMLInputElement>(null);
  const handle = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onloadend = () => onPick(reader.result?.toString().split(",")[1] || "");
    reader.readAsDataURL(file);
    e.target.value = "";
  };
  const src = photoSrc(value);
  return (
    <div className="flex flex-col items-center gap-2">
      <span className="text-xs font-semibold text-gray-500">{label}</span>
      <button
        type="button"
        onClick={() => ref.current?.click()}
        className="group relative flex h-24 w-24 items-center justify-center overflow-hidden rounded-3xl border-2 border-dashed border-gray-300 bg-gray-50 transition hover:border-indigo-300"
      >
        {src ? (
          <img src={src} alt={label} className="h-full w-full object-cover" />
        ) : (
          <span className="px-2 text-center text-[11px] text-gray-400">اضغط لإضافة صورة</span>
        )}
        <span className="absolute inset-0 flex items-center justify-center bg-black/50 text-xs font-semibold text-white opacity-0 transition group-hover:opacity-100">
          تغيير
        </span>
      </button>
      <input ref={ref} type="file" accept="image/*" onChange={handle} className="hidden" />
    </div>
  );
};

const Select = ({
  options,
  value,
  onChange,
  placeholder,
  apiUrl,
  onNewItem,
}: {
  options: Option[];
  value: number;
  onChange: (v: number) => void;
  placeholder: string;
  apiUrl: string;
  onNewItem: (o: Option) => void;
}) => {
  const [open, setOpen] = useState(false);
  const [adding, setAdding] = useState(false);
  const [newOption, setNewOption] = useState("");
  const [busy, setBusy] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const h = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
        setAdding(false);
      }
    };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);

  const addOption = async () => {
    if (!newOption.trim() || busy) return;
    setBusy(true);
    try {
      const res = await fetch(apiUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nom: newOption.trim() }),
      });
      if (!res.ok) throw new Error();
      const saved = await res.json();
      const opt = { value: saved.id, label: saved.nom };
      onNewItem(opt);
      onChange(opt.value);
      setNewOption("");
      setAdding(false);
      setOpen(false);
    } catch {
      alert("تعذر إضافة العنصر، تحقق من الاتصال");
    } finally {
      setBusy(false);
    }
  };

  const current = options.find((o) => o.value === value)?.label;

  return (
    <div ref={ref} className="relative w-full">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className={`${inputCls} flex items-center justify-between text-right`}
      >
        <span className={current ? "text-gray-800" : "text-gray-400"}>{current || placeholder}</span>
        <span className="text-xs text-gray-400">▾</span>
      </button>

      {open && (
        <div className="absolute left-0 right-0 top-full z-[99999] mt-1 max-h-60 overflow-y-auto rounded-xl border border-gray-200 bg-white p-1 shadow-lg">
          {options.map((o) => (
            <div
              key={o.value}
              onClick={() => {
                onChange(o.value);
                setOpen(false);
              }}
              className={`cursor-pointer rounded-lg px-3 py-2 text-sm hover:bg-indigo-50 ${
                o.value === value ? "bg-indigo-50 font-bold text-indigo-700" : "text-gray-700"
              }`}
            >
              {o.label}
            </div>
          ))}

          {!adding ? (
            <div
              onClick={() => setAdding(true)}
              className="cursor-pointer rounded-lg px-3 py-2 text-sm font-semibold text-indigo-600 hover:bg-indigo-50"
            >
              + إضافة عنصر جديد
            </div>
          ) : (
            <div className="flex items-center gap-2 p-2">
              <input
                autoFocus
                value={newOption}
                onChange={(e) => setNewOption(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && addOption()}
                placeholder="عنصر جديد"
                className="h-9 w-full rounded-lg border border-gray-200 px-2 text-sm outline-none focus:border-indigo-300"
              />
              <button
                type="button"
                onClick={addOption}
                disabled={busy}
                className="h-9 rounded-lg bg-indigo-600 px-3 text-white disabled:opacity-50"
              >
                ✓
              </button>
              <button
                type="button"
                onClick={() => setAdding(false)}
                className="h-9 rounded-lg bg-gray-200 px-3 text-gray-700"
              >
                ✕
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

const ModalShell = ({
  title,
  subtitle,
  onClose,
  onSave,
  saving,
  error,
  children,
}: {
  title: string;
  subtitle?: string;
  onClose: () => void;
  onSave: () => void;
  saving: boolean;
  error: string;
  children: React.ReactNode;
}) => (
  <div dir="rtl">
    <h4 className="text-2xl font-extrabold text-gray-800 dark:text-white/90">{title}</h4>
    {subtitle && <p className="mt-1 text-sm text-gray-400">{subtitle}</p>}

    <div className="custom-scrollbar mt-6 max-h-[60vh] overflow-y-auto px-1 pb-2">{children}</div>

    {error && <p className="mt-4 rounded-xl bg-red-50 px-4 py-2 text-sm text-red-600">{error}</p>}

    <div className="mt-6 flex items-center gap-3 lg:justify-end">
      <button
        type="button"
        onClick={onClose}
        className="h-11 rounded-xl border border-gray-200 bg-white px-6 text-sm font-semibold text-gray-600 hover:bg-gray-50"
      >
        إغلاق
      </button>
      <button
        type="button"
        onClick={onSave}
        disabled={saving}
        className="h-11 rounded-xl bg-indigo-600 px-8 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-700 disabled:opacity-50"
      >
        {saving ? "جاري الحفظ..." : "حفظ"}
      </button>
    </div>
  </div>
);
const fmtMoney = (n: any) =>
  `${Number(n || 0).toLocaleString("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} DH`;

const esc = (v: any) =>
  String(v ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

const yn = (v?: boolean) => (v ? "نعم" : "لا");

const printFamilleReport = (
  f: Famille,
  etudes: Record<number, any>,
  conso: { total: number; presentCount: number; absentCount: number; events: any[] },
  consoEtudes: ConsoEtudes,
  year: string,
  studyYear: string
) => {
  const w = window.open("", "_blank");
  if (!w) {
    alert("اسمح بالنوافذ المنبثقة لتصدير PDF");
    return;
  }

  const nomFamille = f.pere?.nom || f.nomFamille || f.mere?.nom || "غير محدد";
  const enfants = f.enfants || [];
  const yearLabel = year === "all" ? "كل السنوات" : year;
  const studyYearLabel = studyYear === "all" ? "كل السنوات الدراسية" : studyYear;
  const totalEvenements = Number(conso.total || 0);
  const totalEtudesConsomme = Number(consoEtudes.totalConsomme || 0);
  const totalEtudesPaye = Number(consoEtudes.totalPaye || 0);
  const totalEtudesNonPaye = Number(consoEtudes.totalNonPaye || 0);
  const totalPrisEnChargeAssociation = totalEvenements + totalEtudesPaye;
  const totalConsommationGlobale = totalEvenements + totalEtudesConsomme;

  // consommation par personne
  const byPerson: Record<string, { total: number; present: number; absent: number }> = {};
  conso.events.forEach((e) => {
    const k = e.participant || "العائلة";
    byPerson[k] = byPerson[k] || { total: 0, present: 0, absent: 0 };
    byPerson[k].total += Number(e.montant || 0);
    e.present ? byPerson[k].present++ : byPerson[k].absent++;
  });

  const row = (label: string, value: any) =>
    `<div class="f"><span>${esc(label)}</span><b>${esc(value === undefined || value === null || value === "" ? "غير محدد" : value)}</b></div>`;

  const img = (b64?: string) => {
    const s = photoSrc(b64);
    return s ? `<img src="${s}" class="ph"/>` : `<div class="ph ph0">👤</div>`;
  };

  const parent = (title: string, p: Person | undefined, photo?: string, isMere = false) => {
    if (!p) return `<div class="card"><h3>${title}</h3><p class="muted">لا توجد معلومات</p></div>`;
    const dead = !!p.estDecedee;
    return `<div class="card">
      <h3>${title}</h3>
      <div class="pr">${img(photo)}<div><div class="nm">${esc(p.nom)} ${esc(p.prenom)}</div>${
        dead ? `<span class="tag g">${isMere ? "متوفاة" : "متوفى"}</span>` : ""
      }</div></div>
      <div class="grid2">
        ${
          dead
            ? row("تاريخ الوفاة", formatDate(p.dateDeces))
            : row("الهاتف", p.phone) +
              row("رقم البطاقة الوطنية", p.cin) +
              row("تاريخ الازدياد", formatDate(p.dateNaissance)) +
              row("مكان الازدياد", p.villeNaissance) +
              row(isMere ? "هل الأم مريضة؟" : "هل الأب مريض؟", yn(p.estMalade)) +
              (p.estMalade ? row("نوع المرض", p.typeMaladie) : "") +
              row(isMere ? "هل الأم تعمل؟" : "هل الأب يعمل؟", yn(p.estTravaille)) +
              (p.estTravaille ? row("نوع العمل", p.typeTravail) : "")
        }
      </div></div>`;
  };

  const enfantsRows = enfants
    .map((e, i) => {
      const et = etudes[e.id];
      const age = ageFrom(e.dateNaissance);
      return `<tr>
        <td>${i + 1}</td>
        <td class="l">${img(e.photoEnfant)}</td>
        <td><b>${esc(e.nom)} ${esc(e.prenom)}</b></td>
        <td>${age !== null ? age + " سنة" : "-"}</td>
        <td>${esc(formatDate(e.dateNaissance) || "-")}</td>
        <td>${esc(et?.niveauScolaire?.nom || "-")}</td>
        <td>${esc(et?.ecole?.nom || "-")}</td>
        <td>${esc(et?.specialite?.nom || "-")}</td>
        <td>${e.estMalade ? esc(e.typeMaladie || "مريض") : "لا"}</td>
      </tr>`;
    })
    .join("");

  const personRows = Object.entries(byPerson)
    .sort((a, b) => b[1].total - a[1].total)
    .map(
      ([k, v]) =>
        `<tr><td class="r">${esc(k)}</td><td>${v.present}</td><td>${v.absent}</td><td class="m">${fmtMoney(v.total)}</td></tr>`
    )
    .join("");

  const eventRows = conso.events
    .map(
      (e, i) => `<tr>
        <td>${i + 1}</td>
        <td class="r"><b>${esc(e.title)}</b></td>
        <td>${esc(e.startDate)}</td>
        <td>${esc(e.type || "-")}</td>
        <td>${esc(e.participant)}</td>
        <td><span class="tag ${e.present ? "ok" : "ko"}">${e.present ? "حاضر" : "غائب"}</span>${
          !e.present && e.motif ? `<div class="mt">${esc(e.motif)}</div>` : ""
        }</td>
        <td class="m">${fmtMoney(e.montant)}</td>
      </tr>`
    )
    .join("");

  const soutienRows = consoEtudes.details
    .map((s, i) => {
      const nonPaye = Math.max(Number(s.montant || 0) - Number(s.montantPaye || 0), 0);
      return `<tr>
        <td>${i + 1}</td>
        <td class="r"><b>${esc(s.enfantNom)}</b></td>
        <td>${esc(s.anneeScolaire || "-")}</td>
        <td>${esc(s.mois || "-")}</td>
        <td>${esc(s.centre || "-")}</td>
        <td>${esc(s.intervenant || "-")}</td>
        <td class="m">${fmtMoney(s.montant)}</td>
        <td class="m">${fmtMoney(s.montantPaye)}</td>
        <td class="m np">${fmtMoney(nonPaye)}</td>
      </tr>`;
    })
    .join("");

  const soutienParEnfantRows = Object.values(consoEtudes.parEnfant)
    .sort((a, b) => b.totalPaye - a.totalPaye)
    .map(
      (v) => `<tr>
        <td class="r"><b>${esc(v.enfantNom)}</b></td>
        <td class="m">${fmtMoney(v.totalConsomme)}</td>
        <td class="m">${fmtMoney(v.totalPaye)}</td>
        <td class="m np">${fmtMoney(v.totalNonPaye)}</td>
      </tr>`
    )
    .join("");

  w.document.write(`<!DOCTYPE html><html dir="rtl" lang="ar"><head><meta charset="utf-8">
<title>ملف عائلة ${esc(nomFamille)}</title>
<style>
  *{box-sizing:border-box;-webkit-print-color-adjust:exact;print-color-adjust:exact}
  body{font-family:Arial,Tahoma,sans-serif;margin:0;padding:22px;color:#111827;font-size:12px}
  .hero{background:linear-gradient(270deg,#4f46e5,#3b82f6);color:#fff;border-radius:16px;padding:20px 24px;display:flex;justify-content:space-between;align-items:center}
  .hero h1{margin:4px 0 8px;font-size:24px}
  .hero small{opacity:.8}
  .pill{display:inline-block;background:rgba(255,255,255,.2);border-radius:99px;padding:3px 12px;margin-left:6px;font-weight:bold;font-size:11px}
  .kpis{display:flex;gap:10px}
  .kpi{background:rgba(255,255,255,.18);border-radius:12px;padding:8px 16px;text-align:center}
  .kpi b{display:block;font-size:18px}
  .kpi span{font-size:10px;opacity:.8}
  h2{font-size:15px;margin:20px 0 10px;padding-right:10px;border-right:4px solid #4f46e5}
  h3{margin:0 0 10px;font-size:14px}
  .card{border:1px solid #e5e7eb;border-radius:14px;padding:14px;break-inside:avoid}
  .two{display:grid;grid-template-columns:1fr 1fr;gap:12px}
  .grid2{display:grid;grid-template-columns:1fr 1fr;gap:6px}
  .grid4{display:grid;grid-template-columns:repeat(4,1fr);gap:6px}
  .f{background:#f9fafb;border-radius:8px;padding:6px 10px}
  .f span{display:block;font-size:10px;color:#9ca3af}
  .f b{font-size:12px}
  .pr{display:flex;align-items:center;gap:10px;margin-bottom:10px}
  .nm{font-weight:bold;font-size:15px}
  .ph{width:46px;height:46px;border-radius:12px;object-fit:cover;border:1px solid #e5e7eb}
  .ph0{display:flex;align-items:center;justify-content:center;background:#f3f4f6;font-size:20px}
  .stats{display:grid;grid-template-columns:repeat(4,1fr);gap:10px;margin-bottom:10px}
  .st{border-radius:12px;padding:10px;text-align:center}
  .st b{display:block;font-size:17px}
  .st span{font-size:10px;color:#6b7280}
  table{width:100%;border-collapse:collapse;font-size:11px}
  th{background:#2563eb;color:#fff;padding:7px;border:1px solid #d1d5db}
  td{padding:6px;border:1px solid #e5e7eb;text-align:center;vertical-align:middle}
  td.r{text-align:right} td.l .ph{width:34px;height:34px}
  td.m{font-weight:bold;color:#047857;white-space:nowrap}
  td.np{color:#b45309}
  .stats5{display:grid;grid-template-columns:repeat(5,1fr);gap:8px;margin-bottom:10px}
  tr:nth-child(even) td{background:#f9fafb}
  thead{display:table-header-group} tr{break-inside:avoid}
  .tag{display:inline-block;border-radius:99px;padding:2px 10px;font-weight:bold;font-size:10px}
  .ok{background:#dcfce7;color:#15803d}.ko{background:#fee2e2;color:#dc2626}.g{background:#e5e7eb;color:#4b5563}
  .mt{font-size:9px;color:#9ca3af;margin-top:2px}
  .muted{color:#9ca3af}
  .foot{margin-top:18px;text-align:center;font-size:10px;color:#9ca3af}
  @page{size:A4;margin:10mm}
</style></head><body>

<div class="hero">
  <div>
    <small>ملف العائلة</small>
    <h1>عائلة ${esc(nomFamille)}</h1>
    <div>
      ${f.typeFamille?.nom ? `<span class="pill">${esc(f.typeFamille.nom)}</span>` : ""}
      <span class="pill">الدرجة: ${esc(f.degreFamille ?? "غير محددة")}</span>
      ${f.phone ? `<span class="pill">📞 ${esc(f.phone)}</span>` : ""}
    </div>
  </div>
  <div class="kpis">
    <div class="kpi"><b>${f.nombreEnfants ?? enfants.length}</b><span>الأطفال</span></div>
    <div class="kpi"><b>${esc(formatDate(f.dateInscription) || "—")}</b><span>تاريخ التسجيل</span></div>
  </div>
</div>

<h2>معلومات العائلة</h2>
<div class="card"><div class="grid4">
  ${row("نوع الحالة", f.typeFamille?.nom)}
  ${row("نوع السكن", f.habitationFamille?.nom)}
  ${row("العنوان", f.adresseFamille)}
  ${row("الهاتف", f.phone)}
  ${row("تاريخ التسجيل", formatDate(f.dateInscription))}
  ${row("درجة الأسرة", f.degreFamille)}
  ${row("تستفيد من مساعدة", yn(f.aideFamille))}
  ${row("دخل شهري", yn(f.revenuMensuel))}
  ${row("جمعية أخرى", yn(f.beneficieAutreAssociation))}
  ${row("شخص مريض بالمنزل", yn(f.possedeMalade))}
  ${f.possedeMalade ? row("اسم المريض", f.personneMalade) + row("صلة القرابة", f.lienParenteMalade) : ""}
</div></div>

<h2>الوالدان</h2>
<div class="two">
  ${parent("معلومات الأم", f.mere, f.mere?.photoMere, true)}
  ${parent("معلومات الأب", f.pere, f.pere?.photoPere)}
</div>

<h2>الأطفال (${enfants.length})</h2>
${
  enfants.length
    ? `<table><thead><tr><th>#</th><th>الصورة</th><th>الاسم</th><th>السن</th><th>تاريخ الازدياد</th><th>المستوى</th><th>المدرسة</th><th>التخصص</th><th>المرض</th></tr></thead><tbody>${enfantsRows}</tbody></table>`
    : `<p class="muted">لا توجد معلومات عن الأطفال</p>`
}

<h2>الاستهلاك الإجمالي للعائلة</h2>
<div class="stats5">
  <div class="st" style="background:#eff6ff"><b style="color:#1d4ed8">${fmtMoney(totalEvenements)}</b><span>مصاريف الأنشطة</span></div>
  <div class="st" style="background:#f5f3ff"><b style="color:#6d28d9">${fmtMoney(totalEtudesConsomme)}</b><span>الدعم الدراسي المستهلك</span></div>
  <div class="st" style="background:#ecfdf5"><b style="color:#047857">${fmtMoney(totalEtudesPaye)}</b><span>الدعم المؤدى من الجمعية</span></div>
  <div class="st" style="background:#fffbeb"><b style="color:#b45309">${fmtMoney(totalEtudesNonPaye)}</b><span>غير مؤدى من الجمعية</span></div>
  <div class="st" style="background:#ecfeff"><b style="color:#0e7490">${fmtMoney(totalPrisEnChargeAssociation)}</b><span>إجمالي ما دفعته الجمعية</span></div>
</div>
<div class="card" style="margin-bottom:12px">
  <div class="grid2">
    ${row("القيمة الإجمالية المستهلكة", fmtMoney(totalConsommationGlobale))}
    ${row("إجمالي ما دفعته الجمعية", fmtMoney(totalPrisEnChargeAssociation))}
  </div>
</div>

<h2>الأنشطة والمبالغ المصروفة — ${esc(yearLabel)}</h2>
<div class="stats">
  <div class="st" style="background:#ecfdf5"><b style="color:#047857">${fmtMoney(conso.total)}</b><span>المبلغ المصروف في الأنشطة</span></div>
  <div class="st" style="background:#eef2ff"><b style="color:#4338ca">${conso.events.length}</b><span>عدد المشاركات</span></div>
  <div class="st" style="background:#f0fdf4"><b style="color:#15803d">${conso.presentCount}</b><span>حضور</span></div>
  <div class="st" style="background:#fef2f2"><b style="color:#dc2626">${conso.absentCount}</b><span>غياب</span></div>
</div>

${
  personRows
    ? `<h3>المصروف حسب الشخص</h3>
<table><thead><tr><th>الشخص</th><th>حضور</th><th>غياب</th><th>المبلغ المصروف</th></tr></thead><tbody>${personRows}</tbody></table>`
    : ""
}

<h3 style="margin-top:14px">تفاصيل الأنشطة</h3>
${
  eventRows
    ? `<table><thead><tr><th>#</th><th>النشاط</th><th>التاريخ</th><th>النوع</th><th>المشارك</th><th>الحالة</th><th>المبلغ</th></tr></thead><tbody>${eventRows}</tbody></table>`
    : `<p class="muted">لا توجد مشاركات في هذه الفترة</p>`
}

<h2>الدعم الدراسي — ${esc(studyYearLabel)}</h2>
<div class="stats">
  <div class="st" style="background:#f5f3ff"><b style="color:#6d28d9">${fmtMoney(totalEtudesConsomme)}</b><span>المبلغ المستهلك</span></div>
  <div class="st" style="background:#ecfdf5"><b style="color:#047857">${fmtMoney(totalEtudesPaye)}</b><span>المؤدى من الجمعية</span></div>
  <div class="st" style="background:#fffbeb"><b style="color:#b45309">${fmtMoney(totalEtudesNonPaye)}</b><span>غير مؤدى من الجمعية</span></div>
  <div class="st" style="background:#eef2ff"><b style="color:#4338ca">${consoEtudes.details.length}</b><span>عدد حصص/سجلات الدعم</span></div>
</div>

${
  soutienParEnfantRows
    ? `<h3>الدعم حسب الطفل</h3>
<table><thead><tr><th>الطفل</th><th>المستهلك</th><th>المؤدى من الجمعية</th><th>غير المؤدى من الجمعية</th></tr></thead><tbody>${soutienParEnfantRows}</tbody></table>`
    : ""
}

<h3 style="margin-top:14px">تفاصيل الدعم الدراسي</h3>
${
  soutienRows
    ? `<table><thead><tr><th>#</th><th>الطفل</th><th>السنة الدراسية</th><th>الشهر</th><th>المركز</th><th>المتدخل</th><th>المبلغ</th><th>المؤدى</th><th>غير المؤدى</th></tr></thead><tbody>${soutienRows}</tbody></table>`
    : `<p class="muted">لا توجد مصاريف دعم دراسي في هذه الفترة</p>`
}

<div class="foot">تم إنشاء هذا التقرير بتاريخ ${esc(new Date().toLocaleDateString("fr-FR"))}</div>
</body></html>`);
  w.document.close();
  w.focus();
  setTimeout(() => w.print(), 500);
};
/* ============================== PAGE ============================== */
export default function FamillesProfiles() {
  const params = useParams();
  const familleId = Number(
    params.id ?? Object.values(params)[0] ?? window.location.pathname.split("/").filter(Boolean).pop()
  );

  const [famille, setFamille] = useState<Famille | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [etudes, setEtudes] = useState<Record<number, any>>({});

  const [soutiensEtudes, setSoutiensEtudes] = useState<SoutienEtude[]>([]);
  const [studyYear, setStudyYear] = useState<string>("all");
  const [customStudyYear, setCustomStudyYear] = useState("");
  const [loadingSoutiens, setLoadingSoutiens] = useState(false);

  const [types, setTypes] = useState<Option[]>([]);
  const [habitations, setHabitations] = useState<Option[]>([]);
  const [niveaux, setNiveaux] = useState<Option[]>([]);
  const [ecoles, setEcoles] = useState<Option[]>([]);
  const [specialites, setSpecialites] = useState<Option[]>([]);

  const [modal, setModal] = useState<ModalType>(null);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState("");
  const [exporting, setExporting] = useState(false);

  const [familleForm, setFamilleForm] = useState({
    typeFamilleId: 0,
    habitationFamilleId: 0,
    adresseFamille: "",
    phone: "",
    dateInscription: "",
    possedeMalade: false,
    personneMalade: "",
    lienParenteMalade: "",
    aideFamille: false,
    revenuMensuel: false,
    beneficieAutreAssociation: false,
  });
  const [mereForm, setMereForm] = useState<PersonForm>(emptyPerson);
  const [pereForm, setPereForm] = useState<PersonForm>(emptyPerson);
  const [enfantForm, setEnfantForm] = useState({
    id: 0,
    nom: "",
    prenom: "",
    dateNaissance: "",
    estMalade: false,
    typeMaladie: "",
    photo: "",
    niveauScolaireId: 0,
    ecoleId: 0,
    specialiteId: 0,
  });

  /* ---------- Chargement ---------- */
  const loadFamille = useCallback(async () => {
    try {
      const res = await fetch(`${API}/famille/${familleId}`);
      if (!res.ok) throw new Error();
      setFamille(await res.json());
      setNotFound(false);
    } catch {
      setNotFound(true);
    }
  }, [familleId]);

  useEffect(() => {
    if (!isNaN(familleId)) loadFamille();
    else setNotFound(true);
  }, [familleId, loadFamille]);

  useEffect(() => {
    (async () => {
      const [t, h, n, e, s] = await Promise.all([
        safeJson(`${API}/famille/types`),
        safeJson(`${API}/famille/habitations`),
        safeJson(`${API}/enfant/niveauScolaire`),
        safeJson(`${API}/enfant/ecole`),
        safeJson(`${API}/enfant/specialite`),
      ]);
      setTypes([{ value: 0, label: "بدون" }, ...toOpts(t)]);
      setHabitations([{ value: 0, label: "بدون" }, ...toOpts(h)]);
      setNiveaux(toOpts(n));
      setEcoles(toOpts(e));
      setSpecialites(toOpts(s));
    })();
  }, []);

  useEffect(() => {
    const ids = (famille?.enfants || []).map((e) => e.id);
    if (!ids.length) return;
    let cancelled = false;
    Promise.all(
      ids.map((id) =>
        fetch(`${API}/enfant/${id}/etude`)
          .then((r) => (r.ok ? r.json() : null))
          .catch(() => null)
          .then((d) => [id, d] as const)
      )
    ).then((entries) => {
      if (!cancelled) setEtudes(Object.fromEntries(entries));
    });
    return () => {
      cancelled = true;
    };
  }, [famille?.enfants]);

  /* ---------- Chargement des soutiens scolaires de tous les enfants ---------- */
  useEffect(() => {
    const enfants = famille?.enfants || [];

    if (!enfants.length) {
      setSoutiensEtudes([]);
      return;
    }

    let cancelled = false;

    const loadAllSoutiens = async () => {
      setLoadingSoutiens(true);

      try {
        const result = await Promise.all(
          enfants.map(async (enfant) => {
            try {
              const res = await fetch(`${API}/soutiens/all/${enfant.id}`);

              if (!res.ok) {
                return [] as SoutienEtude[];
              }

              const data = await res.json();

              return (Array.isArray(data) ? data : []).map(
                (item: any): SoutienEtude => ({
                  id: Number(item.id),
                  enfantId: enfant.id,
                  enfantNom: `${enfant.nom || ""} ${enfant.prenom || ""}`.trim(),
                  anneeScolaire: item.anneeScolaire ?? "",
                  mois: item.mois ?? "",
                  centre: item.centre ?? "",
                  intervenant: item.intervenant ?? "",
                  montant: Number(item.montant || 0),
                  montantPaye: Number(item.montantPaye || 0),
                  effectue: Boolean(item.effectue),
                })
              );
            } catch (error) {
              console.error(`Erreur soutien enfant ${enfant.id}`, error);
              return [] as SoutienEtude[];
            }
          })
        );

        if (!cancelled) {
          setSoutiensEtudes(result.flat());
        }
      } finally {
        if (!cancelled) {
          setLoadingSoutiens(false);
        }
      }
    };

    void loadAllSoutiens();

    return () => {
      cancelled = true;
    };
  }, [famille?.enfants]);

  /* ---------- Ouverture / fermeture des fenêtres ---------- */
  const closeModal = () => {
    setModal(null);
    setFormError("");
  };

  const openFamille = () => {
    if (!famille) return;
    setFamilleForm({
      typeFamilleId: famille.typeFamille?.id || 0,
      habitationFamilleId: famille.habitationFamille?.id || 0,
      adresseFamille: famille.adresseFamille || "",
      phone: famille.phone || "",
      dateInscription: toInputDate(famille.dateInscription) || todayISO(),
      possedeMalade: !!famille.possedeMalade,
      personneMalade: famille.personneMalade || "",
      lienParenteMalade: famille.lienParenteMalade || "",
      aideFamille: !!famille.aideFamille,
      revenuMensuel: !!famille.revenuMensuel,
      beneficieAutreAssociation: !!famille.beneficieAutreAssociation,
    });
    setModal("famille");
  };

  const openPerson = (role: Role) => {
    if (!famille) return;
    if (role === "mere") setMereForm(personToForm(famille.mere, "mere", famille.phone || ""));
    else setPereForm(personToForm(famille.pere, "pere"));
    setModal(role);
  };

  const openEnfant = async (enfant: Enfant) => {
    let etude = etudes[enfant.id];
    if (!etude) {
      try {
        const r = await fetch(`${API}/enfant/${enfant.id}/etude`);
        etude = r.ok ? await r.json() : null;
      } catch {
        etude = null;
      }
    }
    setEnfantForm({
      id: enfant.id,
      nom: enfant.nom || "",
      prenom: enfant.prenom || "",
      dateNaissance: toInputDate(enfant.dateNaissance),
      estMalade: !!enfant.estMalade,
      typeMaladie: enfant.typeMaladie || "",
      photo: enfant.photoEnfant || "",
      niveauScolaireId: etude?.niveauScolaire?.id || 0,
      ecoleId: etude?.ecole?.id || 0,
      specialiteId: etude?.specialite?.id || 0,
    });
    setModal("enfant");
  };

  /* ---------- Sauvegardes ---------- */
  const request = async (url: string, body: any) => {
    setSaving(true);
    setFormError("");
    try {
      const res = await fetch(url, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      await loadFamille();
      closeModal();
    } catch (e: any) {
      setFormError(`تعذر الحفظ (${e.message})`);
    } finally {
      setSaving(false);
    }
  };

  const saveFamille = () => {
    if (!famille) return;
    request(`${API}/famille/${famille.id}`, {
      ...familleForm,
      typeFamilleId: familleForm.typeFamilleId || null,
      habitationFamilleId: familleForm.habitationFamilleId || null,
    });
  };

  const savePerson = (role: Role) => {
    if (!famille) return;
    const f = role === "mere" ? mereForm : pereForm;
    const payload: any = {
      nom: f.nom,
      prenom: f.prenom,
      phone: f.phone,
      cin: f.cin,
      dateNaissance: f.dateNaissance || null,
      villeNaissance: f.villeNaissance,
      estMalade: f.estMalade,
      typeMaladie: f.typeMaladie,
      estTravaille: f.estTravaille,
      typeTravail: f.typeTravail,
      estDecedee: f.estDecedee,
      dateDeces: f.dateDeces || null,
    };
    if (f.photoChanged) payload[role === "mere" ? "photoMere" : "photoPere"] = f.photo;
    request(`${API}/famille/${famille.id}/${role}`, payload);
  };

  const saveEnfant = () => {
    const f = enfantForm;
    request(`${API}/enfant/${f.id}`, {
      prenom: f.prenom,
      nom: f.nom,
      dateNaissance: f.dateNaissance,
      estMalade: f.estMalade,
      typeMaladie: f.estMalade ? f.typeMaladie : "",
      niveauScolaireId: f.niveauScolaireId || null,
      ecoleId: f.ecoleId || null,
      specialiteId: f.specialiteId || null,
      photoEnfantBase64: f.photo || null,
    });
  };

 const [year, setYear] = useState("all");
 const [exportYearOpen, setExportYearOpen] = useState(false);
 const [exportYear, setExportYear] = useState("all");
 const [exportStudyYear, setExportStudyYear] = useState("all");

 const [conso, setConso] = useState<{
   total: number;
   presentCount: number;
   absentCount: number;
   events: any[];
 }>({
   total: 0,
   presentCount: 0,
   absentCount: 0,
   events: [],
 });

 const studyYears = useMemo(() => {
   const years = soutiensEtudes
     .map((s) => s.anneeScolaire)
     .filter(Boolean);

   return Array.from(new Set(years)).sort(
     (a, b) => Number(b.split("/")[0]) - Number(a.split("/")[0])
   );
 }, [soutiensEtudes]);

 const buildConsoEtudes = useCallback(
   (selectedYear: string): ConsoEtudes => {
     const filtered = soutiensEtudes.filter((s) => {
       if (!s.effectue) return false;
       return selectedYear === "all" || s.anneeScolaire === selectedYear;
     });

     const parEnfant: ConsoEtudes["parEnfant"] = {};
     let totalConsomme = 0;
     let totalPaye = 0;
     let totalNonPaye = 0;

     filtered.forEach((s) => {
       const consomme = Math.max(Number(s.montant || 0), 0);
       const paye = Math.min(
         Math.max(Number(s.montantPaye || 0), 0),
         consomme
       );
       const nonPaye = Math.max(consomme - paye, 0);

       totalConsomme += consomme;
       totalPaye += paye;
       totalNonPaye += nonPaye;

       if (!parEnfant[s.enfantId]) {
         parEnfant[s.enfantId] = {
           enfantId: s.enfantId,
           enfantNom: s.enfantNom,
           totalConsomme: 0,
           totalPaye: 0,
           totalNonPaye: 0,
           soutiens: [],
         };
       }

       parEnfant[s.enfantId].totalConsomme += consomme;
       parEnfant[s.enfantId].totalPaye += paye;
       parEnfant[s.enfantId].totalNonPaye += nonPaye;
       parEnfant[s.enfantId].soutiens.push(s);
     });

     return {
       totalConsomme,
       totalPaye,
       totalNonPaye,
       details: filtered,
       parEnfant,
     };
   },
   [soutiensEtudes]
 );

 const consoEtudes = useMemo(
   () => buildConsoEtudes(studyYear),
   [buildConsoEtudes, studyYear]
 );

 const totalEvenements = Number(conso.total || 0);
 const totalEtudesConsomme = Number(consoEtudes.totalConsomme || 0);
 const totalEtudesPaye = Number(consoEtudes.totalPaye || 0);
 const totalEtudesNonPaye = Number(consoEtudes.totalNonPaye || 0);

 // Argent réellement dépensé par l'association pour cette famille.
 const totalPrisEnChargeAssociation =
   totalEvenements + totalEtudesPaye;

 // Valeur totale des aides consommées, même si une partie scolaire
 // n'a pas été payée par l'association.
 const totalConsommationGlobale =
   totalEvenements + totalEtudesConsomme;

 const addCustomStudyYear = () => {
   const value = customStudyYear.trim().replace("-", "/");

   if (!/^\d{4}\/\d{4}$/.test(value)) {
     alert("أدخل السنة بهذا الشكل: 2026/2027");
     return;
   }

   const [startYear, endYear] = value.split("/").map(Number);

   if (endYear !== startYear + 1) {
     alert("السنة الدراسية غير صحيحة");
     return;
   }

   setStudyYear(value);
   setCustomStudyYear("");
 };

 const exportPdf = () => {
   if (!famille) return;

   setExportYear(year);
   setExportStudyYear(studyYear);
   setExportYearOpen(true);
 };

 const confirmExport = async () => {
   if (!famille) return;

   setExporting(true);

   try {
     let data = conso;

     if (exportYear !== year) {
       const r = await fetch(
         `${API}/events/stats/familles${exportYear === "all" ? "" : `?year=${exportYear}`}`
       );

       const list: any[] = r.ok ? await r.json() : [];

       data =
         list.find((x) => String(x.familleId) === String(familleId)) || {
           total: 0,
           presentCount: 0,
           absentCount: 0,
           events: [],
         };
     }

     const studyData = buildConsoEtudes(exportStudyYear);

     printFamilleReport(
       famille,
       etudes,
       data,
       studyData,
       exportYear,
       exportStudyYear
     );

     setExportYearOpen(false);
   } catch (error) {
     console.error(error);
     alert("تعذر تحميل بيانات الفترة المختارة");
   } finally {
     setExporting(false);
   }
 };

 useEffect(() => {
   if (isNaN(familleId)) return;

   fetch(
     `${API}/events/stats/familles${year === "all" ? "" : `?year=${year}`}`
   )
     .then((r) => (r.ok ? r.json() : []))
     .then((list: any[]) => {
       const mine = list.find(
         (x) => String(x.familleId) === String(familleId)
       );

       setConso(
         mine || {
           total: 0,
           presentCount: 0,
           absentCount: 0,
           events: [],
         }
       );
     })
     .catch(() =>
       setConso({
         total: 0,
         presentCount: 0,
         absentCount: 0,
         events: [],
       })
     );
 }, [familleId, year]);

  /* ---------- États de chargement ---------- */
  if (notFound)
    return (
      <div dir="rtl" className="py-24 text-center text-gray-500">
        تعذر العثور على هذه العائلة.
      </div>
    );

  if (!famille)
    return (
      <div dir="rtl" className="space-y-4 py-6">
        <div className="h-44 animate-pulse rounded-3xl bg-gray-100" />
        <div className="h-64 animate-pulse rounded-3xl bg-gray-100" />
      </div>
    );

  /* ---------- Contenu des fenêtres ---------- */
  const renderPersonModal = (role: Role) => {
    const t = ROLE_TEXT[role];
    const form = role === "mere" ? mereForm : pereForm;
    const setForm = role === "mere" ? setMereForm : setPereForm;
    const set = (patch: Partial<PersonForm>) => setForm((p) => ({ ...p, ...patch }));

    return (
      <ModalShell
        title={t.title}
        onClose={closeModal}
        onSave={() => savePerson(role)}
        saving={saving}
        error={formError}
      >
        <div className="space-y-5">
          <div className="flex justify-center">
            <PhotoPicker
              label={t.photo}
              value={form.photo}
              onPick={(b64) => set({ photo: b64, photoChanged: true })}
            />
          </div>

          <Toggle
            label={t.dead}
            checked={form.estDecedee}
            onChange={(v) =>
              setForm((p) =>
                v
                  ? {
                      ...p,
                      estDecedee: true,
                      phone: "",
                      cin: "",
                      dateNaissance: "",
                      villeNaissance: "",
                      estMalade: false,
                      typeMaladie: "",
                      estTravaille: false,
                      typeTravail: "",
                    }
                  : { ...p, estDecedee: false, dateDeces: "" }
              )
            }
          />

          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <TextField label="الاسم" value={form.nom} onChange={(e) => set({ nom: e.target.value })} />
            <TextField label="اللقب" value={form.prenom} onChange={(e) => set({ prenom: e.target.value })} />

            {form.estDecedee ? (
              <TextField
                label="تاريخ الوفاة"
                type="date"
                value={form.dateDeces}
                onChange={(e) => set({ dateDeces: e.target.value })}
              />
            ) : (
              <>
                <TextField
                  label="الهاتف"
                  value={form.phone}
                  onChange={(e) => set({ phone: e.target.value })}
                  hint={role === "mere" ? "يُملأ تلقائياً من هاتف العائلة، ويمكنك تغييره" : undefined}
                />
                <TextField
                  label="رقم البطاقة الوطنية"
                  value={form.cin}
                  onChange={(e) => set({ cin: e.target.value })}
                />
                <TextField
                  label="تاريخ الازدياد"
                  type="date"
                  value={form.dateNaissance}
                  onChange={(e) => set({ dateNaissance: e.target.value })}
                />
                <TextField
                  label="مكان الازدياد"
                  value={form.villeNaissance}
                  onChange={(e) => set({ villeNaissance: e.target.value })}
                />

                <Toggle
                  label={t.sick}
                  checked={form.estMalade}
                  onChange={(v) => set({ estMalade: v, typeMaladie: v ? form.typeMaladie : "" })}
                />
                <TextField
                  label="نوع المرض"
                  value={form.typeMaladie}
                  disabled={!form.estMalade}
                  onChange={(e) => set({ typeMaladie: e.target.value })}
                />

                <Toggle
                  label={t.work}
                  checked={form.estTravaille}
                  onChange={(v) => set({ estTravaille: v, typeTravail: v ? form.typeTravail : "" })}
                />
                <TextField
                  label="نوع العمل"
                  value={form.typeTravail}
                  disabled={!form.estTravaille}
                  onChange={(e) => set({ typeTravail: e.target.value })}
                />
              </>
            )}
          </div>
        </div>
      </ModalShell>
    );
  };

  const renderModal = () => {
    if (modal === "famille") {
      const f = familleForm;
      const set = (patch: Partial<typeof familleForm>) => setFamilleForm((p) => ({ ...p, ...patch }));
      return (
        <ModalShell
          title="تعديل معلومات العائلة"
          onClose={closeModal}
          onSave={saveFamille}
          saving={saving}
          error={formError}
        >
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <div>
              <span className="mb-1.5 block text-xs font-semibold text-gray-500">نوع الحالة</span>
              <Select
                options={types}
                value={f.typeFamilleId}
                onChange={(v) => set({ typeFamilleId: v })}
                placeholder="نوع الحالة"
                apiUrl={`${API}/famille/types`}
                onNewItem={(o) => setTypes((p) => [...p, o])}
              />
            </div>
            <div>
              <span className="mb-1.5 block text-xs font-semibold text-gray-500">نوع السكن</span>
              <Select
                options={habitations}
                value={f.habitationFamilleId}
                onChange={(v) => set({ habitationFamilleId: v })}
                placeholder="نوع السكن"
                apiUrl={`${API}/famille/habitations`}
                onNewItem={(o) => setHabitations((p) => [...p, o])}
              />
            </div>

            <TextField
              label="العنوان"
              value={f.adresseFamille}
              onChange={(e) => set({ adresseFamille: e.target.value })}
            />
            <TextField
              label="الهاتف"
              value={f.phone}
              onChange={(e) => set({ phone: e.target.value })}
              hint="سيُنسخ الرقم إلى هاتف الأم إذا كان فارغاً أو مطابقاً للرقم السابق"
            />
            <TextField
              label="تاريخ التسجيل"
              type="date"
              value={f.dateInscription}
              onChange={(e) => set({ dateInscription: e.target.value })}
            />
            <div />

            <Toggle
              label="هل تعتني بشخص مريض في المنزل؟"
              checked={f.possedeMalade}
              onChange={(v) =>
                set({
                  possedeMalade: v,
                  personneMalade: v ? f.personneMalade : "",
                  lienParenteMalade: v ? f.lienParenteMalade : "",
                })
              }
            />
            <div />
            <TextField
              label="اسم المريض"
              value={f.personneMalade}
              disabled={!f.possedeMalade}
              onChange={(e) => set({ personneMalade: e.target.value })}
            />
            <TextField
              label="صلة القرابة"
              value={f.lienParenteMalade}
              disabled={!f.possedeMalade}
              onChange={(e) => set({ lienParenteMalade: e.target.value })}
            />

            <Toggle
              label="تستفيد من مساعدة"
              checked={f.aideFamille}
              onChange={(v) => set({ aideFamille: v })}
            />
            <Toggle
              label="يوجد دخل شهري"
              checked={f.revenuMensuel}
              onChange={(v) => set({ revenuMensuel: v })}
            />
            <Toggle
              label="تستفيد من جمعية أخرى"
              checked={f.beneficieAutreAssociation}
              onChange={(v) => set({ beneficieAutreAssociation: v })}
            />
          </div>
        </ModalShell>
      );
    }

    if (modal === "mere" || modal === "pere") return renderPersonModal(modal);

    if (modal === "enfant") {
      const f = enfantForm;
      const set = (patch: Partial<typeof enfantForm>) => setEnfantForm((p) => ({ ...p, ...patch }));
      return (
        <ModalShell
          title="تعديل معلومات الطفل"
          onClose={closeModal}
          onSave={saveEnfant}
          saving={saving}
          error={formError}
        >
          <div className="space-y-5">
            <div className="flex justify-center">
              <PhotoPicker label="صورة الطفل" value={f.photo} onPick={(b64) => set({ photo: b64 })} />
            </div>

            <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
              <TextField label="الاسم" value={f.nom} onChange={(e) => set({ nom: e.target.value })} />
              <TextField label="اللقب" value={f.prenom} onChange={(e) => set({ prenom: e.target.value })} />
              <TextField
                label="تاريخ الازدياد"
                type="date"
                value={f.dateNaissance}
                onChange={(e) => set({ dateNaissance: e.target.value })}
              />
              <div />

              <Toggle
                label="هل الطفل مريض؟"
                checked={f.estMalade}
                onChange={(v) => set({ estMalade: v, typeMaladie: v ? f.typeMaladie : "" })}
              />
              <TextField
                label="نوع المرض"
                value={f.typeMaladie}
                disabled={!f.estMalade}
                onChange={(e) => set({ typeMaladie: e.target.value })}
              />

              <div>
                <span className="mb-1.5 block text-xs font-semibold text-gray-500">المستوى الدراسي</span>
                <Select
                  options={niveaux}
                  value={f.niveauScolaireId}
                  onChange={(v) => set({ niveauScolaireId: v })}
                  placeholder="اختر المستوى الدراسي"
                  apiUrl={`${API}/enfant/niveauScolaire`}
                  onNewItem={(o) => setNiveaux((p) => [...p, o])}
                />
              </div>
              <div>
                <span className="mb-1.5 block text-xs font-semibold text-gray-500">التخصص</span>
                <Select
                  options={specialites}
                  value={f.specialiteId}
                  onChange={(v) => set({ specialiteId: v })}
                  placeholder="اختر التخصص"
                  apiUrl={`${API}/enfant/specialite`}
                  onNewItem={(o) => setSpecialites((p) => [...p, o])}
                />
              </div>
              <div className="lg:col-span-2">
                <span className="mb-1.5 block text-xs font-semibold text-gray-500">المدرسة</span>
                <Select
                  options={ecoles}
                  value={f.ecoleId}
                  onChange={(v) => set({ ecoleId: v })}
                  placeholder="اختر المدرسة"
                  apiUrl={`${API}/enfant/ecole`}
                  onNewItem={(o) => setEcoles((p) => [...p, o])}
                />
              </div>
            </div>
          </div>
        </ModalShell>
      );
    }
    return null;
  };

  /* ---------- Cartes parents ---------- */
  const PersonCard = ({ role, person }: { role: Role; person?: Person }) => {
    const t = ROLE_TEXT[role];
    const isMere = role === "mere";
    const src = photoSrc(isMere ? person?.photoMere : person?.photoPere);
    return (
      <Section
        title={isMere ? "معلومات الأم" : "معلومات الأب"}
        onEdit={() => openPerson(role)}
      >
        {!person ? (
          <p className="rounded-2xl bg-gray-50 py-8 text-center text-sm text-gray-400">لا توجد معلومات</p>
        ) : (
          <>
            <div className="mb-5 flex items-center gap-4">
              <Avatar src={src} name={person.nom} size="lg" index={isMere ? 3 : 0} />
              <div>
                <p className="text-xl font-extrabold text-gray-900 dark:text-white">
                  {person.nom} {person.prenom}
                </p>
                <div className="mt-1.5 flex flex-wrap gap-2">
                  {person.estDecedee && <Badge tone="gray">{t.deadBadge}</Badge>}
                  {!person.estDecedee && person.estMalade && <Badge tone="red">مريض</Badge>}
                  {!person.estDecedee && person.estTravaille && <Badge tone="green">يعمل</Badge>}
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {person.estDecedee ? (
                <Field label="تاريخ الوفاة" value={formatDate(person.dateDeces)} />
              ) : (
                <>
                  <Field label="الهاتف" value={person.phone} />
                  <Field label="رقم البطاقة الوطنية" value={person.cin} />
                  <Field label="تاريخ الازدياد" value={formatDate(person.dateNaissance)} />
                  <Field label="مكان الازدياد" value={person.villeNaissance} />
                  <Field label={isMere ? "هل الأم مريضة؟" : "هل الأب مريض؟"} value={<YesNo value={person.estMalade} />} />
                  {person.estMalade && <Field label="نوع المرض" value={person.typeMaladie} />}
                  <Field label={isMere ? "هل الأم تعمل؟" : "هل الأب يعمل؟"} value={<YesNo value={person.estTravaille} />} />
                  {person.estTravaille && <Field label="نوع العمل" value={person.typeTravail} />}
                </>
              )}
            </div>
          </>
        )}
      </Section>
    );
  };

  /* ---------- Rendu ---------- */
  const nomFamille = famille.pere?.nom || famille.nomFamille || famille.mere?.nom || "غير محدد";
  const enfants = famille.enfants || [];
  const heroPhotos = [
    { src: photoSrc(famille.pere?.photoPere), name: famille.pere?.nom },
    { src: photoSrc(famille.mere?.photoMere), name: famille.mere?.nom },
    ...enfants.map((e) => ({ src: photoSrc(e.photoEnfant), name: e.prenom })),
  ]
    .filter((p) => p.src)
    .slice(0, 6);

  return (
    <>
      <PageMeta title="ملف العائلة" description="الملف الكامل للعائلة" />
      <PageBreadcrumb pageTitle="ملف العائلة" />

      <div id="famille-pdf" dir="rtl" className="space-y-6">
        {/* ============ HERO ============ */}
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-l from-indigo-600 via-indigo-600 to-blue-500 p-6 text-white shadow-lg lg:p-8">
          <div className="absolute -left-10 -top-10 h-48 w-48 rounded-full bg-white/10" />
          <div className="absolute -bottom-16 left-1/3 h-56 w-56 rounded-full bg-white/5" />

          <div className="relative flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex flex-col items-center gap-5 lg:flex-row">
              <div className="flex -space-x-4 space-x-reverse">
                {heroPhotos.length > 0 ? (
                  heroPhotos.map((p, i) => <Avatar key={i} src={p.src} name={p.name} size="lg" index={i} />)
                ) : (
                  <Avatar name={nomFamille} size="xl" />
                )}
              </div>

              <div className="text-center lg:text-right">
                <p className="text-xs font-semibold text-white/70">ملف العائلة</p>
                <h2 className="mt-1 text-3xl font-extrabold">عائلة {nomFamille}</h2>
                <div className="mt-3 flex flex-wrap justify-center gap-2 lg:justify-start">
                  {famille.typeFamille?.nom && <Badge tone="white">{famille.typeFamille.nom}</Badge>}
                  <Badge tone="white">الدرجة: {famille.degreFamille ?? "غير محددة"}</Badge>
                  {famille.phone && <Badge tone="white">📞 {famille.phone}</Badge>}
                </div>
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-center gap-3">
              <div className="rounded-2xl bg-white/15 px-5 py-3 text-center backdrop-blur">
                <p className="text-2xl font-extrabold">{famille.nombreEnfants ?? enfants.length}</p>
                <p className="text-[11px] text-white/70">الأطفال</p>
              </div>
              <div className="rounded-2xl bg-white/15 px-5 py-3 text-center backdrop-blur">
                <p className="text-sm font-extrabold">{formatDate(famille.dateInscription) || "—"}</p>
                <p className="text-[11px] text-white/70">تاريخ التسجيل</p>
              </div>
              <button
                type="button"
                onClick={exportPdf}
                disabled={exporting}
                data-html2canvas-ignore="true"
                className="h-12 rounded-2xl bg-white px-5 text-sm font-bold text-indigo-700 shadow transition hover:-translate-y-0.5 disabled:opacity-60"
              >
                {exporting ? "جاري التصدير..." : "تصدير PDF"}
              </button>
            </div>
          </div>
        </div>

        {/* ============ INFOS FAMILLE ============ */}
        <Section title="معلومات العائلة" subtitle="المعطيات الاجتماعية والسكنية" onEdit={openFamille}>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <Field label="نوع الحالة" value={famille.typeFamille?.nom} />
            <Field label="نوع السكن" value={famille.habitationFamille?.nom} />
            <Field label="العنوان" value={famille.adresseFamille} />
            <Field label="الهاتف" value={famille.phone} />
            <Field label="تاريخ التسجيل" value={formatDate(famille.dateInscription)} />
            <Field label="درجة الأسرة" value={famille.degreFamille} />
            <Field label="تستفيد من مساعدة" value={<YesNo value={famille.aideFamille} />} />
            <Field label="دخل شهري" value={<YesNo value={famille.revenuMensuel} />} />
            <Field label="جمعية أخرى" value={<YesNo value={famille.beneficieAutreAssociation} />} />
            <Field label="شخص مريض بالمنزل" value={<YesNo value={famille.possedeMalade} />} />
            {famille.possedeMalade && (
              <>
                <Field label="اسم المريض" value={famille.personneMalade} />
                <Field label="صلة القرابة" value={famille.lienParenteMalade} />
              </>
            )}
          </div>
        </Section>

        {/* ============ PARENTS ============ */}
        <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
          <PersonCard role="mere" person={famille.mere} />
          <PersonCard role="pere" person={famille.pere} />
        </div>

        {/* ============ ENFANTS ============ */}
        <Section title="معلومات الأطفال" subtitle={`${enfants.length} طفل`}>
          {enfants.length === 0 ? (
            <p className="rounded-2xl bg-gray-50 py-8 text-center text-sm text-gray-400">
              لا توجد معلومات عن الأطفال
            </p>
          ) : (
            <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
              {enfants.map((enfant, i) => {
                const etude = etudes[enfant.id];
                const age = ageFrom(enfant.dateNaissance);
                return (
                  <div
                    key={enfant.id}
                    className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm transition hover:shadow-md"
                  >
                    <div className="mb-4 flex items-center justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <Avatar src={photoSrc(enfant.photoEnfant)} name={enfant.prenom} size="md" index={i + 1} />
                        <div>
                          <p className="font-extrabold text-gray-900 dark:text-white">
                            {enfant.nom} {enfant.prenom}
                          </p>
                          <div className="mt-1 flex flex-wrap gap-1.5">
                            {age !== null && <Badge tone="sky">{age} سنة</Badge>}
                            {enfant.estMalade && <Badge tone="red">مريض</Badge>}
                          </div>
                        </div>
                      </div>
                      <EditButton onClick={() => openEnfant(enfant)} />
                    </div>

                    <div className="grid grid-cols-2 gap-2.5">
                      <Field label="تاريخ الازدياد" value={formatDate(enfant.dateNaissance)} />
                      <Field label="المستوى الدراسي" value={etude?.niveauScolaire?.nom} />
                      <Field label="المدرسة" value={etude?.ecole?.nom} />
                      <Field label="التخصص" value={etude?.specialite?.nom} />
                      {enfant.estMalade && <Field label="نوع المرض" value={enfant.typeMaladie} />}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </Section>
        <Section
          title="الاستهلاك والمبالغ المصروفة"
          subtitle="الأنشطة + الدعم الدراسي للأطفال"
        >
          {/* ====== TOTAL GENERAL ====== */}
          <div className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-3 xl:grid-cols-6">
            <div className="rounded-2xl bg-blue-50 p-4">
              <p className="text-xs text-gray-500">مصاريف الأنشطة</p>
              <p className="mt-1 text-lg font-extrabold text-blue-700">
                {fmtMoney(totalEvenements)}
              </p>
            </div>

            <div className="rounded-2xl bg-violet-50 p-4">
              <p className="text-xs text-gray-500">الدعم الدراسي المستهلك</p>
              <p className="mt-1 text-lg font-extrabold text-violet-700">
                {fmtMoney(totalEtudesConsomme)}
              </p>
            </div>

            <div className="rounded-2xl bg-emerald-50 p-4">
              <p className="text-xs text-gray-500">الدعم المؤدى من الجمعية</p>
              <p className="mt-1 text-lg font-extrabold text-emerald-700">
                {fmtMoney(totalEtudesPaye)}
              </p>
            </div>

            <div className="rounded-2xl bg-amber-50 p-4">
              <p className="text-xs text-gray-500">غير مؤدى من الجمعية</p>
              <p className="mt-1 text-lg font-extrabold text-amber-700">
                {fmtMoney(totalEtudesNonPaye)}
              </p>
            </div>

            <div className="rounded-2xl bg-cyan-50 p-4">
              <p className="text-xs text-gray-500">إجمالي ما دفعته الجمعية</p>
              <p className="mt-1 text-lg font-extrabold text-cyan-700">
                {fmtMoney(totalPrisEnChargeAssociation)}
              </p>
            </div>

            <div className="rounded-2xl bg-slate-100 p-4">
              <p className="text-xs text-gray-500">القيمة الإجمالية المستهلكة</p>
              <p className="mt-1 text-lg font-extrabold text-slate-800">
                {fmtMoney(totalConsommationGlobale)}
              </p>
            </div>
          </div>

          {/* ====== ACTIVITES ====== */}
          <div className="mb-7 rounded-3xl border border-gray-100 p-4">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
              <div>
                <h3 className="font-extrabold text-gray-800">الأنشطة</h3>
                <p className="text-xs text-gray-400">
                  استهلاك العائلة والأم والأطفال في الأنشطة
                </p>
              </div>

              <div
                className="flex items-center gap-2"
                data-html2canvas-ignore="true"
              >
                <span className="text-xs font-semibold text-gray-500">السنة</span>

                <select
                  value={year}
                  onChange={(e) => setYear(e.target.value)}
                  className="h-10 rounded-xl border border-gray-200 bg-gray-50 px-3 text-sm font-semibold"
                >
                  <option value="all">كل السنوات</option>

                  {Array.from(
                    { length: 8 },
                    (_, i) => String(new Date().getFullYear() - i)
                  ).map((y) => (
                    <option key={y} value={y}>
                      {y}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="mb-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
              <div className="rounded-2xl bg-emerald-50 p-4">
                <p className="text-xs text-gray-500">المبلغ المصروف</p>
                <p className="text-lg font-extrabold text-emerald-700">
                  {fmtMoney(conso.total)}
                </p>
              </div>

              <div className="rounded-2xl bg-indigo-50 p-4">
                <p className="text-xs text-gray-500">المشاركات</p>
                <p className="text-lg font-extrabold text-indigo-700">
                  {conso.events.length}
                </p>
              </div>

              <div className="rounded-2xl bg-green-50 p-4">
                <p className="text-xs text-gray-500">حضور</p>
                <p className="text-lg font-extrabold text-green-700">
                  {conso.presentCount}
                </p>
              </div>

              <div className="rounded-2xl bg-red-50 p-4">
                <p className="text-xs text-gray-500">غياب</p>
                <p className="text-lg font-extrabold text-red-600">
                  {conso.absentCount}
                </p>
              </div>
            </div>

            {conso.events.length === 0 ? (
              <p className="rounded-2xl bg-gray-50 py-8 text-center text-sm text-gray-400">
                لا توجد مشاركات في هذه الفترة
              </p>
            ) : (
              <div className="overflow-x-auto rounded-2xl border border-gray-100">
                <table className="min-w-full text-right text-sm">
                  <thead className="bg-gray-50 text-xs font-semibold text-gray-500">
                    <tr>
                      <th className="px-4 py-3">النشاط</th>
                      <th className="px-4 py-3">التاريخ</th>
                      <th className="px-4 py-3">المشارك</th>
                      <th className="px-4 py-3">الحالة</th>
                      <th className="px-4 py-3">المبلغ</th>
                    </tr>
                  </thead>

                  <tbody className="divide-y divide-gray-100">
                    {conso.events.map((ev, i) => (
                      <tr key={i} className="hover:bg-indigo-50/40">
                        <td className="px-4 py-3 font-bold text-gray-800">
                          {ev.title}
                        </td>

                        <td className="px-4 py-3 text-gray-500">
                          {ev.startDate}
                        </td>

                        <td className="px-4 py-3 text-gray-600">
                          {ev.participant}
                        </td>

                        <td className="px-4 py-3">
                          {ev.present ? (
                            <Badge tone="green">حاضر</Badge>
                          ) : (
                            <Badge tone="red">
                              غائب{ev.motif ? ` (${ev.motif})` : ""}
                            </Badge>
                          )}
                        </td>

                        <td className="whitespace-nowrap px-4 py-3 font-bold text-emerald-700">
                          {fmtMoney(ev.montant)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* ====== SOUTIEN SCOLAIRE ====== */}
          <div className="rounded-3xl border border-gray-100 p-4">
            <div className="mb-4 flex flex-wrap items-end justify-between gap-4">
              <div>
                <h3 className="font-extrabold text-gray-800">
                  الدعم الدراسي للأطفال
                </h3>

                <p className="text-xs text-gray-400">
                  يعرض فقط السجلات المنجزة فعليا، مع المبلغ المؤدى وغير المؤدى من الجمعية
                </p>
              </div>

              <div
                className="flex flex-wrap items-end gap-2"
                data-html2canvas-ignore="true"
              >
                <label className="block">
                  <span className="mb-1 block text-[11px] font-semibold text-gray-500">
                    السنة الدراسية
                  </span>

                  <select
                    value={studyYear}
                    onChange={(e) => setStudyYear(e.target.value)}
                    className="h-10 min-w-[170px] rounded-xl border border-gray-200 bg-gray-50 px-3 text-sm font-semibold"
                  >
                    <option value="all">كل السنوات الدراسية</option>

                    {studyYears.map((y) => (
                      <option key={y} value={y}>
                        {y}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="block">
                  <span className="mb-1 block text-[11px] font-semibold text-gray-500">
                    سنة مخصصة
                  </span>

                  <input
                    value={customStudyYear}
                    onChange={(e) => setCustomStudyYear(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        addCustomStudyYear();
                      }
                    }}
                    placeholder="2026/2027"
                    className="h-10 w-[150px] rounded-xl border border-gray-200 bg-gray-50 px-3 text-center text-sm font-semibold outline-none focus:border-indigo-300"
                  />
                </label>

                <button
                  type="button"
                  onClick={addCustomStudyYear}
                  className="h-10 rounded-xl bg-indigo-600 px-4 text-sm font-bold text-white hover:bg-indigo-700"
                >
                  تطبيق
                </button>
              </div>
            </div>

            {loadingSoutiens ? (
              <p className="rounded-2xl bg-gray-50 py-8 text-center text-sm text-gray-400">
                جاري تحميل بيانات الدعم الدراسي...
              </p>
            ) : (
              <>
                <div className="mb-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
                  <div className="rounded-2xl bg-violet-50 p-4">
                    <p className="text-xs text-gray-500">المبلغ المستهلك</p>
                    <p className="text-lg font-extrabold text-violet-700">
                      {fmtMoney(consoEtudes.totalConsomme)}
                    </p>
                  </div>

                  <div className="rounded-2xl bg-emerald-50 p-4">
                    <p className="text-xs text-gray-500">المؤدى من الجمعية</p>
                    <p className="text-lg font-extrabold text-emerald-700">
                      {fmtMoney(consoEtudes.totalPaye)}
                    </p>
                  </div>

                  <div className="rounded-2xl bg-amber-50 p-4">
                    <p className="text-xs text-gray-500">غير مؤدى من الجمعية</p>
                    <p className="text-lg font-extrabold text-amber-700">
                      {fmtMoney(consoEtudes.totalNonPaye)}
                    </p>
                  </div>

                  <div className="rounded-2xl bg-indigo-50 p-4">
                    <p className="text-xs text-gray-500">عدد السجلات المنجزة</p>
                    <p className="text-lg font-extrabold text-indigo-700">
                      {consoEtudes.details.length}
                    </p>
                  </div>
                </div>

                {Object.values(consoEtudes.parEnfant).length > 0 && (
                  <div className="mb-5 grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
                    {Object.values(consoEtudes.parEnfant).map((item) => (
                      <div
                        key={item.enfantId}
                        className="rounded-2xl border border-gray-100 bg-gray-50 p-4"
                      >
                        <p className="font-extrabold text-gray-800">
                          {item.enfantNom}
                        </p>

                        <div className="mt-3 grid grid-cols-3 gap-2 text-center">
                          <div>
                            <p className="text-[10px] text-gray-400">المستهلك</p>
                            <p className="text-xs font-bold text-violet-700">
                              {fmtMoney(item.totalConsomme)}
                            </p>
                          </div>

                          <div>
                            <p className="text-[10px] text-gray-400">المؤدى</p>
                            <p className="text-xs font-bold text-emerald-700">
                              {fmtMoney(item.totalPaye)}
                            </p>
                          </div>

                          <div>
                            <p className="text-[10px] text-gray-400">غير المؤدى</p>
                            <p className="text-xs font-bold text-amber-700">
                              {fmtMoney(item.totalNonPaye)}
                            </p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {consoEtudes.details.length === 0 ? (
                  <p className="rounded-2xl bg-gray-50 py-8 text-center text-sm text-gray-400">
                    لا توجد مصاريف دعم دراسي منجزة في هذه السنة
                  </p>
                ) : (
                  <div className="overflow-x-auto rounded-2xl border border-gray-100">
                    <table className="min-w-full text-right text-sm">
                      <thead className="bg-gray-50 text-xs font-semibold text-gray-500">
                        <tr>
                          <th className="px-4 py-3">الطفل</th>
                          <th className="px-4 py-3">السنة</th>
                          <th className="px-4 py-3">الشهر</th>
                          <th className="px-4 py-3">المركز</th>
                          <th className="px-4 py-3">المتدخل</th>
                          <th className="px-4 py-3">المبلغ</th>
                          <th className="px-4 py-3">المؤدى</th>
                          <th className="px-4 py-3">غير المؤدى</th>
                        </tr>
                      </thead>

                      <tbody className="divide-y divide-gray-100">
                        {consoEtudes.details.map((s) => {
                          const nonPaye = Math.max(
                            Number(s.montant || 0) - Number(s.montantPaye || 0),
                            0
                          );

                          return (
                            <tr
                              key={`${s.enfantId}-${s.id}`}
                              className="hover:bg-indigo-50/40"
                            >
                              <td className="px-4 py-3 font-bold text-gray-800">
                                {s.enfantNom}
                              </td>

                              <td className="px-4 py-3 text-gray-600">
                                {s.anneeScolaire || "-"}
                              </td>

                              <td className="px-4 py-3 text-gray-600">
                                {s.mois || "-"}
                              </td>

                              <td className="px-4 py-3 text-gray-600">
                                {s.centre || "-"}
                              </td>

                              <td className="px-4 py-3 text-gray-600">
                                {s.intervenant || "-"}
                              </td>

                              <td className="whitespace-nowrap px-4 py-3 font-bold text-violet-700">
                                {fmtMoney(s.montant)}
                              </td>

                              <td className="whitespace-nowrap px-4 py-3 font-bold text-emerald-700">
                                {fmtMoney(s.montantPaye)}
                              </td>

                              <td className="whitespace-nowrap px-4 py-3 font-bold text-amber-700">
                                {fmtMoney(nonPaye)}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </>
            )}
          </div>
        </Section>
      </div>
{exportYearOpen && (
  <div className="fixed inset-0 z-[100000] flex items-center justify-center bg-black/50 p-4">
    <div
      dir="rtl"
      className="w-[560px] max-w-full rounded-3xl bg-white p-6 shadow-xl"
    >
      <h3 className="text-lg font-extrabold text-gray-800">
        تصدير ملف العائلة
      </h3>

      <p className="mt-1 text-xs text-gray-400">
        اختر سنة الأنشطة والسنة الدراسية التي تريد تضمينها في التقرير
      </p>

      <div className="mt-5 grid gap-4 sm:grid-cols-2">
        <label className="block">
          <span className="mb-1.5 block text-xs font-semibold text-gray-500">
            فترة الأنشطة
          </span>

          <select
            value={exportYear}
            onChange={(e) => setExportYear(e.target.value)}
            className="h-11 w-full rounded-xl border border-gray-200 bg-gray-50 px-3 text-sm font-semibold"
          >
            <option value="all">كل السنوات</option>

            {Array.from(
              { length: 8 },
              (_, i) => String(new Date().getFullYear() - i)
            ).map((y) => (
              <option key={y} value={y}>
                {y}
              </option>
            ))}
          </select>
        </label>

        <label className="block">
          <span className="mb-1.5 block text-xs font-semibold text-gray-500">
            فترة الدعم الدراسي
          </span>

          <select
            value={exportStudyYear}
            onChange={(e) => setExportStudyYear(e.target.value)}
            className="h-11 w-full rounded-xl border border-gray-200 bg-gray-50 px-3 text-sm font-semibold"
          >
            <option value="all">كل السنوات الدراسية</option>

            {studyYears.map((y) => (
              <option key={y} value={y}>
                {y}
              </option>
            ))}

            {exportStudyYear !== "all" &&
              !studyYears.includes(exportStudyYear) && (
                <option value={exportStudyYear}>{exportStudyYear}</option>
              )}
          </select>
        </label>
      </div>

      <div className="mt-6 flex justify-end gap-2">
        <button
          type="button"
          onClick={() => setExportYearOpen(false)}
          className="h-11 rounded-xl border border-gray-200 px-5 text-sm font-semibold text-gray-600 hover:bg-gray-50"
        >
          إلغاء
        </button>

        <button
          type="button"
          onClick={confirmExport}
          disabled={exporting}
          className="h-11 rounded-xl bg-indigo-600 px-6 text-sm font-bold text-white hover:bg-indigo-700 disabled:opacity-50"
        >
          {exporting ? "جاري التحضير..." : "تصدير PDF"}
        </button>
      </div>
    </div>
  </div>
)}
      <Modal isOpen={modal !== null} onClose={closeModal} className="max-w-[720px] m-4">
        <div className="w-full rounded-3xl bg-white p-6 dark:bg-gray-900 lg:p-10">{renderModal()}</div>
      </Modal>
    </>
  );
}
