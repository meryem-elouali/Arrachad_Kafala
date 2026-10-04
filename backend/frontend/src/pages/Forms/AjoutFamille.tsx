import { useEffect, useMemo, useRef, useState } from "react";
import PageBreadcrumb from "../../components/common/PageBreadCrumb";
import PageMeta from "../../components/common/PageMeta";
import { currentSchoolYear } from "../../lib/schoolYear";
import { STATUTS_SCOLAIRES } from "../../lib/labels";

const API = "http://localhost:8080/api";

/* ============================== TYPES ============================== */
interface Option {
  value: number;
  label: string;
}

interface PersonData {
  nom: string;
  prenom: string;
  cin: string;
  phone: string;
  villeNaissance: string;
  dateNaissance: string;
  dateDeces: string;
  typeMaladie: string;
  typeTravail: string;
  estDecedee: boolean;
  estMalade: boolean;
  estTravaille: boolean;
  photo: File | null;
}

interface EnfantData {
  nom: string;
  /** true dès que l'utilisateur modifie le nom : il ne suit plus celui du père */
  nomManuel: boolean;
  prenom: string;
  sexe: "" | "FILLE" | "GARCON";
  /** EN_COURS : suivi dans « تتبع الدراسة » ; ARRETE ; NON_SUIVI */
  statutScolaire: "EN_COURS" | "ARRETE" | "NON_SUIVI";
  dateArretEtudes: string;
  motifArretEtudes: string;
  dateNaissance: string;
  estMalade: boolean;
  typeMaladie: string;
  anneeScolaire: string;
  niveauId: number;
  ecoleId: number;
  specialiteId: number;
  photo: File | null;
}

/* ============================== HELPERS ============================== */
const todayISO = () => new Date().toLocaleDateString("en-CA");

const schoolYear = () => currentSchoolYear();

const emptyPerson = (): PersonData => ({
  nom: "",
  prenom: "",
  cin: "",
  phone: "",
  villeNaissance: "",
  dateNaissance: "",
  dateDeces: "",
  typeMaladie: "",
  typeTravail: "",
  estDecedee: false,
  estMalade: false,
  estTravaille: false,
  photo: null,
});

const emptyEnfant = (): EnfantData => ({
  nom: "",
  nomManuel: false,
  prenom: "",
  sexe: "",
  statutScolaire: "EN_COURS",
  dateArretEtudes: "",
  motifArretEtudes: "",
  dateNaissance: "",
  estMalade: false,
  typeMaladie: "",
  anneeScolaire: schoolYear(),
  niveauId: 0,
  ecoleId: 0,
  specialiteId: 0,
  photo: null,
});

const emptyFamille = () => ({
  typeId: 0,
  habitationId: 0,
  adresse: "",
  nombreEnfants: 0,
  phone: "",
  dateInscription: todayISO(),
  possedeMalade: false,
  personneMalade: "",
  lienParenteMalade: "",
  aideFamille: false,
  revenuMensuel: false,
  beneficieAutreAssociation: false,
});

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

// Compression d'image (réduit fortement le poids envoyé au serveur)
const compressImage = (file: File, max = 800, quality = 0.7): Promise<File> =>
  new Promise((resolve) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      const ratio = Math.min(1, max / Math.max(img.width, img.height));
      const canvas = document.createElement("canvas");
      canvas.width = Math.round(img.width * ratio);
      canvas.height = Math.round(img.height * ratio);
      canvas.getContext("2d")?.drawImage(img, 0, 0, canvas.width, canvas.height);
      canvas.toBlob(
        (blob) => {
          URL.revokeObjectURL(url);
          resolve(
            blob
              ? new File([blob], file.name.replace(/\.\w+$/, ".jpg"), { type: "image/jpeg" })
              : file
          );
        },
        "image/jpeg",
        quality
      );
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      resolve(file);
    };
    img.src = url;
  });

const toFormData = (obj: Record<string, any>) => {
  const fd = new FormData();
  Object.entries(obj).forEach(([k, v]) => fd.append(k, String(v ?? "")));
  return fd;
};

/* ============================== UI BRIQUES ============================== */
const inputCls =
  "h-11 w-full rounded-xl border border-gray-200 bg-gray-50 px-3.5 text-sm text-gray-800 outline-none transition placeholder:text-gray-400 focus:border-indigo-300 focus:bg-white focus:ring-4 focus:ring-indigo-500/10 disabled:cursor-not-allowed disabled:opacity-50";

const TextField = ({
  label,
  required,
  hint,
  ...props
}: {
  label: string;
  required?: boolean;
  hint?: string;
} & React.InputHTMLAttributes<HTMLInputElement>) => (
  <label className="block">
    <span className="mb-1.5 block text-xs font-semibold text-gray-500">
      {label} {required && <span className="text-red-500">*</span>}
    </span>
    <input {...props} className={inputCls} />
    {hint && <span className="mt-1 block text-[11px] text-indigo-500">{hint}</span>}
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

const TONES: Record<string, string> = {
  indigo: "bg-indigo-50 text-indigo-600",
  blue: "bg-blue-50 text-blue-600",
  pink: "bg-pink-50 text-pink-600",
  emerald: "bg-emerald-50 text-emerald-600",
};

const Card = ({
  step,
  title,
  subtitle,
  tone = "indigo",
  children,
}: {
  step: number;
  title: string;
  subtitle?: string;
  tone?: string;
  children: React.ReactNode;
}) => (
  <section className="rounded-3xl border border-gray-200 bg-white shadow-sm">
    <div className="flex items-center gap-3 border-b border-gray-100 px-6 py-5">
      <span
        className={`flex h-10 w-10 items-center justify-center rounded-xl text-base font-extrabold ${TONES[tone]}`}
      >
        {step}
      </span>
      <div>
        <h3 className="text-lg font-extrabold text-gray-800">{title}</h3>
        {subtitle && <p className="text-xs text-gray-400">{subtitle}</p>}
      </div>
    </div>
    <div className="p-6">{children}</div>
  </section>
);

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
  apiUrl?: string;
  onNewItem?: (o: Option) => void;
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
    if (!apiUrl || !newOption.trim() || busy) return;
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
      onNewItem?.(opt);
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
        <span className={current ? "text-gray-800" : "text-gray-400"}>
          {current || placeholder}
        </span>
        <span className="text-xs text-gray-400">▾</span>
      </button>

      {open && (
        <div className="absolute left-0 right-0 top-full z-50 mt-1 max-h-60 overflow-y-auto rounded-xl border border-gray-200 bg-white p-1 shadow-lg">
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

          {apiUrl &&
            (!adding ? (
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
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      addOption();
                    }
                    if (e.key === "Escape") setAdding(false);
                  }}
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
              </div>
            ))}
        </div>
      )}
    </div>
  );
};

const PhotoPicker = ({
  label,
  file,
  onPick,
}: {
  label: string;
  file: File | null;
  onPick: (f: File | null) => void;
}) => {
  const ref = useRef<HTMLInputElement>(null);
  const preview = useMemo(() => (file ? URL.createObjectURL(file) : ""), [file]);
  useEffect(() => () => (preview ? URL.revokeObjectURL(preview) : undefined), [preview]);

  const handle = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    e.target.value = "";
    if (f) onPick(await compressImage(f));
  };

  return (
    <div className="flex flex-col items-center gap-2">
      <span className="text-xs font-semibold text-gray-500">{label}</span>
      <div className="relative">
        <button
          type="button"
          onClick={() => ref.current?.click()}
          className="group relative flex h-24 w-24 items-center justify-center overflow-hidden rounded-3xl border-2 border-dashed border-gray-300 bg-gray-50 transition hover:border-indigo-300"
        >
          {preview ? (
            <img src={preview} alt={label} className="h-full w-full object-cover" />
          ) : (
            <span className="px-2 text-center text-[11px] text-gray-400">اضغط لإضافة صورة</span>
          )}
          {preview && (
            <span className="absolute inset-0 flex items-center justify-center bg-black/50 text-xs font-semibold text-white opacity-0 transition group-hover:opacity-100">
              تغيير
            </span>
          )}
        </button>
        {preview && (
          <button
            type="button"
            onClick={() => onPick(null)}
            className="absolute -left-2 -top-2 flex h-6 w-6 items-center justify-center rounded-full bg-red-500 text-xs text-white shadow"
          >
            ✕
          </button>
        )}
      </div>
      <input ref={ref} type="file" accept="image/*" onChange={handle} className="hidden" />
    </div>
  );
};

/* ============================== FORMULAIRE PARENT ============================== */
const ParentForm = ({
  role,
  data,
  onChange,
  onToggleDead,
  phoneHint,
}: {
  role: "pere" | "mere";
  data: PersonData;
  onChange: (patch: Partial<PersonData>) => void;
  onToggleDead: (v: boolean) => void;
  phoneHint?: string;
}) => {
  const t =
    role === "pere"
      ? { dead: "هل الأب متوفى؟", sick: "هل الأب مريض؟", work: "هل الأب يعمل؟", photo: "صورة الأب" }
      : { dead: "هل الأم متوفاة؟", sick: "هل الأم مريضة؟", work: "هل الأم تعمل؟", photo: "صورة الأم" };

  return (
    <div className="space-y-5">
      <div className="flex justify-center">
        <PhotoPicker label={t.photo} file={data.photo} onPick={(f) => onChange({ photo: f })} />
      </div>

      <Toggle label={t.dead} checked={data.estDecedee} onChange={onToggleDead} />

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <TextField label="الاسم" required value={data.prenom} onChange={(e) => onChange({ prenom: e.target.value })} />
        <TextField label="النسب" required value={data.nom} onChange={(e) => onChange({ nom: e.target.value })} />

        {data.estDecedee ? (
          <TextField
            label="تاريخ الوفاة"
            type="date"
            max={todayISO()}
            value={data.dateDeces}
            onChange={(e) => onChange({ dateDeces: e.target.value })}
          />
        ) : (
          <>
            <TextField
              label="رقم البطاقة الوطنية"
              required
              value={data.cin}
              onChange={(e) => onChange({ cin: e.target.value })}
            />
            <TextField
              label="رقم الهاتف"
              required
              inputMode="tel"
              value={data.phone}
              hint={phoneHint}
              onChange={(e) => onChange({ phone: e.target.value })}
            />
            <TextField
              label="تاريخ الازدياد"
              type="date"
              max={todayISO()}
              value={data.dateNaissance}
              onChange={(e) => onChange({ dateNaissance: e.target.value })}
            />
            <TextField
              label="مكان الازدياد"
              value={data.villeNaissance}
              onChange={(e) => onChange({ villeNaissance: e.target.value })}
            />

            <Toggle
              label={t.sick}
              checked={data.estMalade}
              onChange={(v) => onChange({ estMalade: v, typeMaladie: v ? data.typeMaladie : "" })}
            />
            <TextField
              label="نوع المرض"
              disabled={!data.estMalade}
              value={data.typeMaladie}
              onChange={(e) => onChange({ typeMaladie: e.target.value })}
            />

            <Toggle
              label={t.work}
              checked={data.estTravaille}
              onChange={(v) => onChange({ estTravaille: v, typeTravail: v ? data.typeTravail : "" })}
            />
            <TextField
              label="نوع العمل"
              disabled={!data.estTravaille}
              value={data.typeTravail}
              onChange={(e) => onChange({ typeTravail: e.target.value })}
            />
          </>
        )}
      </div>
    </div>
  );
};

/* ============================== PAGE ============================== */
export default function AjoutFamille() {
  const [famille, setFamille] = useState(emptyFamille);
  const [pere, setPere] = useState<PersonData>(emptyPerson);
  const [mere, setMere] = useState<PersonData>(emptyPerson);
  const [merePhoneTouched, setMerePhoneTouched] = useState(false);
  const [enfants, setEnfants] = useState<EnfantData[]>([]);

  const [types, setTypes] = useState<Option[]>([]);
  const [habitations, setHabitations] = useState<Option[]>([]);
  const [niveaux, setNiveaux] = useState<Option[]>([]);
  const [ecoles, setEcoles] = useState<Option[]>([]);
  const [specialites, setSpecialites] = useState<Option[]>([]);

  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<{ type: "ok" | "error"; msgs: string[] } | null>(null);

  useEffect(() => {
    (async () => {
      const [t, h, n, e, s] = await Promise.all([
        safeJson(`${API}/famille/types`),
        safeJson(`${API}/famille/habitations`),
        safeJson(`${API}/enfant/niveauScolaire`),
        safeJson(`${API}/enfant/ecole`),
        safeJson(`${API}/enfant/specialite`),
      ]);
      setTypes(toOpts(t));
      setHabitations(toOpts(h));
      setNiveaux(toOpts(n));
      setEcoles(toOpts(e));
      setSpecialites(toOpts(s));
    })();
  }, []);

  /* ---------- Famille ---------- */
  const setF = (patch: Partial<typeof famille>) => setFamille((p) => ({ ...p, ...patch }));

  // Le téléphone de la famille se copie chez la mère tant qu'elle n'a pas été modifiée à la main
  const onFamillePhone = (value: string) => {
    setF({ phone: value });
    if (!merePhoneTouched && !mere.estDecedee) setMere((m) => ({ ...m, phone: value }));
  };

  const onMerePatch = (patch: Partial<PersonData>) => {
    if ("phone" in patch) {
      setMerePhoneTouched(!!patch.phone && patch.phone !== famille.phone);
    }
    setMere((m) => ({ ...m, ...patch }));
  };

  const onMereDead = (v: boolean) =>
    setMere((m) =>
      v
        ? {
            ...m,
            estDecedee: true,
            cin: "",
            phone: "",
            dateNaissance: "",
            villeNaissance: "",
            estMalade: false,
            typeMaladie: "",
            estTravaille: false,
            typeTravail: "",
          }
        : {
            ...m,
            estDecedee: false,
            dateDeces: "",
            phone: merePhoneTouched ? m.phone : famille.phone,
          }
    );

  const onPereDead = (v: boolean) =>
    setPere((p) =>
      v
        ? {
            ...p,
            estDecedee: true,
            cin: "",
            phone: "",
            dateNaissance: "",
            villeNaissance: "",
            estMalade: false,
            typeMaladie: "",
            estTravaille: false,
            typeTravail: "",
          }
        : { ...p, estDecedee: false, dateDeces: "" }
    );

  /* ---------- Enfants ---------- */
  const setCount = (n: number) => {
    const count = Math.max(0, Math.min(15, Number.isFinite(n) ? n : 0));
    setF({ nombreEnfants: count });
    setEnfants((prev) =>
      count > prev.length
        ? [
            ...prev,
            ...Array.from({ length: count - prev.length }, () => ({ ...emptyEnfant(), nom: pere.nom.trim() })),
          ]
        : prev.slice(0, count)
    );
  };

  const setE = (i: number, patch: Partial<EnfantData>) =>
    setEnfants((prev) => prev.map((e, idx) => (idx === i ? { ...e, ...patch } : e)));

  // Le nom de famille des enfants suit celui du père tant qu'il n'a pas été modifié à la main.
  useEffect(() => {
    const nomPere = pere.nom.trim();
    setEnfants((prev) => prev.map((e) => (e.nomManuel ? e : { ...e, nom: nomPere })));
  }, [pere.nom]);

  /* ---------- Progression ---------- */
  const progress = useMemo(() => {
    const checks = [
      famille.typeId,
      famille.habitationId,
      famille.adresse.trim(),
      famille.phone.trim(),
      pere.nom.trim() && pere.prenom.trim() && (pere.estDecedee || (pere.cin.trim() && pere.phone.trim())),
      mere.nom.trim() && mere.prenom.trim() && (mere.estDecedee || (mere.cin.trim() && mere.phone.trim())),
      ...enfants.map(
        (e) => e.nom.trim() && e.prenom.trim() && e.sexe && (e.statutScolaire !== "EN_COURS" || (e.niveauId && e.ecoleId))
      ),
    ];
    return Math.round((checks.filter(Boolean).length / checks.length) * 100);
  }, [famille, pere, mere, enfants]);

  /* ---------- Validation ---------- */
  const validate = () => {
    const errs: string[] = [];
    if (!famille.typeId) errs.push("اختر نوع الحالة");
    if (!famille.habitationId) errs.push("اختر نوع السكن");
    if (!famille.adresse.trim()) errs.push("أدخل عنوان العائلة");
    if (!famille.phone.trim()) errs.push("أدخل رقم هاتف العائلة");

    (["pere", "mere"] as const).forEach((r) => {
      const p = r === "pere" ? pere : mere;
      const n = r === "pere" ? "الأب" : "الأم";
      if (!p.nom.trim() || !p.prenom.trim()) errs.push(`أدخل اسم ونسب ${n}`);
      if (!p.estDecedee && (!p.cin.trim() || !p.phone.trim()))
        errs.push(`أدخل رقم البطاقة الوطنية والهاتف لـ${n}`);
    });

    enfants.forEach((e, i) => {
      if (!e.nom.trim() || !e.prenom.trim()) errs.push(`الطفل ${i + 1}: أدخل الاسم والنسب`);
      if (!e.sexe) errs.push(`الطفل ${i + 1}: حدد الجنس (بنت أو ولد)`);
      if (e.statutScolaire === "EN_COURS" && (!e.niveauId || !e.ecoleId))
        errs.push(`الطفل ${i + 1}: اختر المستوى الدراسي والمؤسسة`);
    });
    return errs;
  };

  /* ---------- Envoi ---------- */
  const personFormData = (p: PersonData, photoKey: string) => {
    const fd = toFormData({
      nom: p.nom.trim(),
      prenom: p.prenom.trim(),
      cin: p.cin,
      phone: p.phone,
      villeNaissance: p.villeNaissance,
      dateNaissance: p.dateNaissance,
      dateDeces: p.dateDeces,
      typeMaladie: p.typeMaladie,
      typeTravail: p.typeTravail,
      estDecedee: p.estDecedee,
      estMalade: p.estMalade,
      estTravaille: p.estTravaille,
    });
    if (p.photo) fd.append(photoKey, p.photo);
    return fd;
  };

  const resetAll = () => {
    setFamille(emptyFamille());
    setPere(emptyPerson());
    setMere(emptyPerson());
    setMerePhoneTouched(false);
    setEnfants([]);
  };

  const handleSubmit = async () => {
    const errs = validate();
    if (errs.length) {
      setStatus({ type: "error", msgs: errs });
      window.scrollTo({ top: 0, behavior: "smooth" });
      return;
    }

    setLoading(true);
    setStatus(null);
    try {
      const [resMere, resPere] = await Promise.all([
        fetch(`${API}/mere`, { method: "POST", body: personFormData(mere, "photoMere") }),
        fetch(`${API}/pere`, { method: "POST", body: personFormData(pere, "photoPere") }),
      ]);
      if (!resMere.ok) throw new Error("فشل تسجيل الأم");
      if (!resPere.ok) throw new Error("فشل تسجيل الأب");
      const [savedMere, savedPere] = await Promise.all([resMere.json(), resPere.json()]);

      const fd = toFormData({
        adresseFamille: famille.adresse.trim(),
        phone: famille.phone.trim(),
        dateInscription: famille.dateInscription || todayISO(),
        nombreEnfants: famille.nombreEnfants,
        possedeMalade: famille.possedeMalade,
        personneMalade: famille.personneMalade,
        lienParenteMalade: famille.lienParenteMalade,
        aideFamille: famille.aideFamille,
        revenuMensuel: famille.revenuMensuel,
        beneficieAutreAssociation: famille.beneficieAutreAssociation,
        typeFamilleId: famille.typeId,
        habitationFamilleId: famille.habitationId,
        mereId: savedMere.id,
        pereId: savedPere.id,
        enfantsJson: JSON.stringify(
          enfants.map((e) => ({
            nom: e.nom.trim() || pere.nom.trim(),
            prenom: e.prenom.trim(),
            sexe: e.sexe,
            statutScolaire: e.statutScolaire,
            dateArretEtudes: e.statutScolaire === "ARRETE" ? e.dateArretEtudes || null : null,
            motifArretEtudes: e.statutScolaire === "ARRETE" ? e.motifArretEtudes.trim() || null : null,
            dateNaissance: e.dateNaissance,
            estMalade: e.estMalade,
            typeMaladie: e.estMalade ? e.typeMaladie : "",
          }))
        ),
        etudesJson: JSON.stringify(
          enfants.map((e) =>
            e.statutScolaire === "EN_COURS"
              ? {
                  ecoleId: e.ecoleId,
                  niveauScolaireId: e.niveauId,
                  specialiteId: e.specialiteId || null,
                  anneeScolaire: e.anneeScolaire,
                }
              : null
          )
        ),
      });

      // Une part "photoEnfant" par enfant (vide si pas de photo) pour garder l'ordre des index
      enfants.forEach((e, i) =>
        fd.append("photoEnfant", e.photo ?? new Blob([]), e.photo ? e.photo.name : `vide-${i}.jpg`)
      );

      const resFamille = await fetch(`${API}/famille`, { method: "POST", body: fd });
      if (!resFamille.ok) throw new Error("فشل تسجيل العائلة");

      setStatus({ type: "ok", msgs: ["تم تسجيل العائلة بنجاح"] });
      resetAll();
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (e: any) {
      setStatus({ type: "error", msgs: [e.message || "حدث خطأ أثناء التسجيل"] });
      window.scrollTo({ top: 0, behavior: "smooth" });
    } finally {
      setLoading(false);
    }
  };

  /* ---------- Rendu ---------- */
  return (
    <div dir="rtl">
      <PageMeta title="تسجيل عائلة جديدة" description="نموذج تسجيل عائلة" />
      <PageBreadcrumb pageTitle="معلومات العائلة" />

      <div className="mx-auto max-w-5xl space-y-6 pb-28">
        {/* HEADER */}
        <div className="rounded-3xl bg-gradient-to-l from-indigo-600 via-indigo-600 to-blue-500 p-6 text-white shadow-lg">
          <p className="text-xs font-semibold text-white/70">إدارة العائلات</p>
          <h1 className="mt-1 text-2xl font-extrabold">تسجيل عائلة جديدة</h1>
          <div className="mt-4 flex items-center gap-3">
            <div className="h-2 flex-1 overflow-hidden rounded-full bg-white/20">
              <div className="h-2 rounded-full bg-white transition-all" style={{ width: `${progress}%` }} />
            </div>
            <span className="text-sm font-bold">{progress}%</span>
          </div>
        </div>

        {/* STATUS */}
        {status && (
          <div
            className={`rounded-2xl border px-5 py-4 text-sm ${
              status.type === "ok"
                ? "border-green-200 bg-green-50 text-green-700"
                : "border-red-200 bg-red-50 text-red-700"
            }`}
          >
            {status.msgs.length === 1 ? (
              <p className="font-bold">{status.msgs[0]}</p>
            ) : (
              <>
                <p className="mb-2 font-bold">يرجى تصحيح ما يلي:</p>
                <ul className="list-inside list-disc space-y-1">
                  {status.msgs.map((m, i) => (
                    <li key={i}>{m}</li>
                  ))}
                </ul>
              </>
            )}
          </div>
        )}

        {/* 1. FAMILLE */}
        <Card step={1} title="معلومات عامة" subtitle="المعطيات الاجتماعية والسكنية للعائلة" tone="indigo">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div>
              <span className="mb-1.5 block text-xs font-semibold text-gray-500">
                نوع الحالة <span className="text-red-500">*</span>
              </span>
              <Select options={types} value={famille.typeId} onChange={(v) => setF({ typeId: v })} placeholder="اختر نوع الحالة" />
            </div>
            <div>
              <span className="mb-1.5 block text-xs font-semibold text-gray-500">
                نوع السكن <span className="text-red-500">*</span>
              </span>
              <Select options={habitations} value={famille.habitationId} onChange={(v) => setF({ habitationId: v })} placeholder="اختر نوع السكن" />
            </div>

            <div className="md:col-span-2">
              <TextField label="عنوان العائلة" required value={famille.adresse} onChange={(e) => setF({ adresse: e.target.value })} />
            </div>

            <TextField
              label="رقم الهاتف"
              required
              inputMode="tel"
              value={famille.phone}
              onChange={(e) => onFamillePhone(e.target.value)}
              hint="سيُنسخ تلقائياً إلى هاتف الأم"
            />
            <TextField
              label="تاريخ التسجيل"
              type="date"
              max={todayISO()}
              value={famille.dateInscription}
              onChange={(e) => setF({ dateInscription: e.target.value })}
            />

            <div>
              <span className="mb-1.5 block text-xs font-semibold text-gray-500">عدد الأبناء</span>
              <div className="flex h-11 items-center overflow-hidden rounded-xl border border-gray-200 bg-gray-50">
                <button type="button" onClick={() => setCount(famille.nombreEnfants - 1)} className="h-full w-12 text-xl text-gray-500 hover:bg-gray-100">
                  −
                </button>
                <input
                  type="number"
                  min={0}
                  max={15}
                  value={famille.nombreEnfants}
                  onChange={(e) => setCount(parseInt(e.target.value, 10))}
                  className="h-full w-full bg-transparent text-center text-sm font-bold outline-none"
                />
                <button type="button" onClick={() => setCount(famille.nombreEnfants + 1)} className="h-full w-12 text-xl text-gray-500 hover:bg-gray-100">
                  +
                </button>
              </div>
            </div>
          </div>

          <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-2">
            <Toggle
              label="هل تعتني بشخص مريض في المنزل؟"
              checked={famille.possedeMalade}
              onChange={(v) =>
                setF({
                  possedeMalade: v,
                  personneMalade: v ? famille.personneMalade : "",
                  lienParenteMalade: v ? famille.lienParenteMalade : "",
                })
              }
            />
            <div />
            {famille.possedeMalade && (
              <>
                <TextField label="اسم المريض" value={famille.personneMalade} onChange={(e) => setF({ personneMalade: e.target.value })} />
                <TextField label="صلة القرابة" value={famille.lienParenteMalade} onChange={(e) => setF({ lienParenteMalade: e.target.value })} />
              </>
            )}
            <Toggle label="تستفيد العائلة من مساعدة" checked={famille.aideFamille} onChange={(v) => setF({ aideFamille: v })} />
            <Toggle label="يوجد دخل مالي شهري" checked={famille.revenuMensuel} onChange={(v) => setF({ revenuMensuel: v })} />
            <Toggle label="تستفيد من جمعية أخرى" checked={famille.beneficieAutreAssociation} onChange={(v) => setF({ beneficieAutreAssociation: v })} />
          </div>
        </Card>

        {/* 2. PERE */}
        <Card step={2} title="معلومات الأب" tone="blue">
          <ParentForm role="pere" data={pere} onChange={(p) => setPere((x) => ({ ...x, ...p }))} onToggleDead={onPereDead} />
        </Card>

        {/* 3. MERE */}
        <Card step={3} title="معلومات الأم" tone="pink">
          <ParentForm
            role="mere"
            data={mere}
            onChange={onMerePatch}
            onToggleDead={onMereDead}
            phoneHint={!merePhoneTouched && mere.phone ? "تم ملؤه تلقائياً من هاتف العائلة، يمكنك تغييره" : undefined}
          />
        </Card>

        {/* 4. ENFANTS */}
        <Card step={4} title="معلومات الأبناء" subtitle={`${enfants.length} طفل`} tone="emerald">
          {enfants.length === 0 ? (
            <p className="rounded-2xl bg-gray-50 py-10 text-center text-sm text-gray-400">
              أدخل عدد الأبناء في القسم الأول لإظهار النماذج
            </p>
          ) : (
            <div className="space-y-5">
              {enfants.map((e, i) => (
                <div key={i} className="rounded-2xl border border-gray-200 bg-gray-50/50 p-5">
                  <div className="mb-4 flex items-center gap-2">
                    <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-100 text-sm font-bold text-emerald-700">
                      {i + 1}
                    </span>
                    <h4 className="font-extrabold text-gray-800">الطفل {i + 1}</h4>
                  </div>

                  <div className="mb-4 flex justify-center">
                    <PhotoPicker label="صورة الطفل" file={e.photo} onPick={(f) => setE(i, { photo: f })} />
                  </div>

                  <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                    <TextField label="الاسم" required value={e.prenom} onChange={(ev) => setE(i, { prenom: ev.target.value })} />
                    <div>
                      <TextField
                        label="النسب"
                        required
                        value={e.nom}
                        onChange={(ev) => setE(i, { nom: ev.target.value, nomManuel: true })}
                      />
                      {!e.nomManuel && pere.nom.trim() && (
                        <p className="mt-1 text-[11px] text-gray-400">يُملأ تلقائيا من نسب الأب</p>
                      )}
                    </div>
                    <div className="md:col-span-2">
                      <span className="mb-1.5 block text-xs font-semibold text-gray-500">
                        الجنس <span className="text-red-500">*</span>
                      </span>
                      <div className="grid grid-cols-2 gap-2">
                        {([
                          ["FILLE", "بنت"],
                          ["GARCON", "ولد"],
                        ] as const).map(([value, label]) => (
                          <button
                            key={value}
                            type="button"
                            onClick={() => setE(i, { sexe: value })}
                            className={`h-11 rounded-xl border text-sm font-bold transition ${
                              e.sexe === value
                                ? value === "FILLE"
                                  ? "border-pink-500 bg-pink-500 text-white"
                                  : "border-sky-600 bg-sky-600 text-white"
                                : "border-gray-200 bg-white text-gray-600 hover:bg-gray-50"
                            }`}
                          >
                            {label}
                          </button>
                        ))}
                      </div>
                    </div>
                    <TextField
                      label="تاريخ الازدياد"
                      type="date"
                      max={todayISO()}
                      value={e.dateNaissance}
                      onChange={(ev) => setE(i, { dateNaissance: ev.target.value })}
                    />
                    <div />

                    <Toggle
                      label="هل الابن مريض؟"
                      checked={e.estMalade}
                      onChange={(v) => setE(i, { estMalade: v, typeMaladie: v ? e.typeMaladie : "" })}
                    />
                    <TextField
                      label="نوع المرض"
                      disabled={!e.estMalade}
                      value={e.typeMaladie}
                      onChange={(ev) => setE(i, { typeMaladie: ev.target.value })}
                    />

                    <div className="md:col-span-2 rounded-2xl border border-gray-200 bg-white p-4">
                      <span className="mb-2 block text-xs font-semibold text-gray-500">الوضعية الدراسية</span>
                      <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
                        {STATUTS_SCOLAIRES.map((st) => (
                          <button
                            key={st.value}
                            type="button"
                            onClick={() => setE(i, { statutScolaire: st.value as EnfantData["statutScolaire"] })}
                            className={`h-11 rounded-xl border text-sm font-bold transition ${
                              e.statutScolaire === st.value
                                ? "border-indigo-600 bg-indigo-600 text-white"
                                : "border-gray-200 bg-white text-gray-600 hover:bg-gray-50"
                            }`}
                          >
                            {st.label}
                          </button>
                        ))}
                      </div>

                      {e.statutScolaire === "EN_COURS" && (
                        <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
                          <TextField
                            label="السنة الدراسية"
                            placeholder="YYYY/YYYY"
                            value={e.anneeScolaire}
                            onChange={(ev) => {
                              let v = ev.target.value.replace(/\D/g, "").slice(0, 8);
                              if (v.length > 4) v = `${v.slice(0, 4)}/${v.slice(4)}`;
                              setE(i, { anneeScolaire: v });
                            }}
                          />
                          <div />
                        <div>
                          <span className="mb-1.5 block text-xs font-semibold text-gray-500">
                            المستوى الدراسي <span className="text-red-500">*</span>
                          </span>
                          <Select
                            options={niveaux}
                            value={e.niveauId}
                            onChange={(v) => setE(i, { niveauId: v })}
                            placeholder="اختر المستوى الدراسي"
                            apiUrl={`${API}/enfant/niveauScolaire`}
                            onNewItem={(o) => setNiveaux((p) => [...p, o])}
                          />
                        </div>
                        <div>
                          <span className="mb-1.5 block text-xs font-semibold text-gray-500">
                            المؤسسة <span className="text-red-500">*</span>
                          </span>
                          <Select
                            options={ecoles}
                            value={e.ecoleId}
                            onChange={(v) => setE(i, { ecoleId: v })}
                            placeholder="اختر المؤسسة"
                            apiUrl={`${API}/enfant/ecole`}
                            onNewItem={(o) => setEcoles((p) => [...p, o])}
                          />
                        </div>
                        <div className="md:col-span-2">
                          <span className="mb-1.5 block text-xs font-semibold text-gray-500">التخصص</span>
                          <Select
                            options={specialites}
                            value={e.specialiteId}
                            onChange={(v) => setE(i, { specialiteId: v })}
                            placeholder="اختر التخصص"
                            apiUrl={`${API}/enfant/specialite`}
                            onNewItem={(o) => setSpecialites((p) => [...p, o])}
                          />
                        </div>
                        </div>
                      )}

                      {e.statutScolaire === "ARRETE" && (
                        <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
                          <TextField
                            label="تاريخ التوقف (اختياري)"
                            type="date"
                            max={todayISO()}
                            value={e.dateArretEtudes}
                            onChange={(ev) => setE(i, { dateArretEtudes: ev.target.value })}
                          />
                          <TextField
                            label="سبب التوقف (اختياري)"
                            value={e.motifArretEtudes}
                            onChange={(ev) => setE(i, { motifArretEtudes: ev.target.value })}
                          />
                        </div>
                      )}

                      {e.statutScolaire === "NON_SUIVI" && (
                        <p className="mt-3 text-xs text-gray-400">
                          لن يظهر هذا الطفل في تتبع الدراسة. يمكن تغيير وضعيته لاحقا من ملف الأسرة.
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>

      {/* BARRE D'ENREGISTREMENT */}
      <div className="sticky bottom-4 z-30 mx-auto max-w-5xl">
        <div className="flex items-center justify-between gap-3 rounded-2xl border border-gray-200 bg-white/95 p-3 shadow-xl backdrop-blur">
          <span className="px-2 text-sm text-gray-500">
            اكتمال النموذج: <b className="text-indigo-600">{progress}%</b>
          </span>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={resetAll}
              disabled={loading}
              className="h-11 rounded-xl border border-gray-200 px-5 text-sm font-semibold text-gray-600 hover:bg-gray-50 disabled:opacity-50"
            >
              مسح
            </button>
            <button
              type="button"
              onClick={handleSubmit}
              disabled={loading}
              className="h-11 rounded-xl bg-indigo-600 px-8 text-sm font-bold text-white shadow-sm transition hover:bg-indigo-700 disabled:opacity-60"
            >
              {loading ? "جاري التسجيل..." : "تسجيل العائلة"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}