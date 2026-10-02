import { useEffect, useState } from "react";
import PageBreadcrumb from "../components/common/PageBreadCrumb";
import PageMeta from "../components/common/PageMeta";

const API = "http://localhost:8080/api/lajna";

const currentUser = () => JSON.parse(localStorage.getItem("lajna_user") || "null");
const apiFetch = (url: string, init: RequestInit = {}) =>
  fetch(url, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      "X-User-Id": String(currentUser()?.id ?? ""),
    },
  });

const ROLES: Record<string, string> = {
  SUPER_ADMIN: "مسؤول أعلى",
  ADMIN: "مشرف",
  SIMPLE: "مستخدم",
};

const PERMS: Record<string, string> = {
  REUNIONS: "الاجتماعات",
  FAMILLES: "العائلات",
  ETUDES: "التمدرس",
  FINANCE: "المالية",
  EVENTS: "الأنشطة",
};

const inp =
  "h-11 w-full rounded-xl border border-gray-200 bg-gray-50 px-3.5 text-sm outline-none focus:border-indigo-300 focus:bg-white";

const fmtDT = (d?: string) => (d ? d.replace("T", " ").slice(0, 16) : "—");

const Info = ({ label, value }: { label: string; value?: string | null }) => (
  <div className="rounded-2xl bg-gray-50 px-4 py-3">
    <p className="text-[11px] font-semibold text-gray-400">{label}</p>
    <p className="mt-1 break-words text-sm font-bold text-gray-800">{value || "غير محدد"}</p>
  </div>
);

const Card = ({ title, action, children }: any) => (
  <div className="rounded-3xl border border-gray-200 bg-white p-6 shadow-sm">
    <div className="mb-5 flex items-center justify-between gap-3">
      <h4 className="text-lg font-extrabold text-gray-800">{title}</h4>
      {action}
    </div>
    {children}
  </div>
);

const Dialog = ({ title, onClose, onSave, saving, err, children }: any) => (
  <div className="fixed inset-0 z-[99999] flex items-center justify-center bg-black/50 p-4">
    <div dir="rtl" className="w-full max-w-lg rounded-3xl bg-white p-6">
      <h3 className="mb-5 text-xl font-extrabold text-gray-800">{title}</h3>
      {children}
      {err && <p className="mt-4 rounded-xl bg-red-50 px-4 py-2 text-sm text-red-600">{err}</p>}
      <div className="mt-6 flex justify-end gap-2">
        <button onClick={onClose} className="h-11 rounded-xl border px-6 text-sm font-semibold">
          إلغاء
        </button>
        <button
          onClick={onSave}
          disabled={saving}
          className="h-11 rounded-xl bg-indigo-600 px-8 text-sm font-bold text-white disabled:opacity-50"
        >
          {saving ? "جاري الحفظ..." : "حفظ"}
        </button>
      </div>
    </div>
  </div>
);

export default function UserProfiles() {
  const session = currentUser();
  const [m, setM] = useState<any | null>(null);
  const [error, setError] = useState(false);
  const [modal, setModal] = useState<null | "infos" | "pwd">(null);
  const [form, setForm] = useState<any>({});
  const [pwd, setPwd] = useState({ ancien: "", nouveau: "", confirm: "" });
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");
  const [ok, setOk] = useState("");

  useEffect(() => {
    if (!session?.id) {
      setError(true);
      return;
    }
    apiFetch(`${API}/membres/${session.id}`)
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then(setM)
      .catch(() => setError(true));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const close = () => {
    setModal(null);
    setErr("");
  };

  const saveInfos = async () => {
    if (!form.nom?.trim()) return setErr("أدخل النسب");
    setSaving(true);
    const r = await apiFetch(`${API}/membres/${m.id}/profil`, {
      method: "PUT",
      body: JSON.stringify(form),
    });
    setSaving(false);
    if (!r.ok) return setErr(await r.text());
    const upd = await r.json();
    const nomComplet = `${upd.prenom || ""} ${upd.nom}`.trim();
    localStorage.setItem("lajna_user", JSON.stringify({ ...session, nomComplet }));
    setM(upd);
    close();
    setOk("تم تحديث المعلومات");
  };

  const savePwd = async () => {
    if (pwd.nouveau.length < 6) return setErr("كلمة السر الجديدة 6 أحرف على الأقل");
    if (pwd.nouveau !== pwd.confirm) return setErr("تأكيد كلمة السر غير مطابق");
    setSaving(true);
    const r = await apiFetch(`${API}/membres/${m.id}/mot-de-passe`, {
      method: "PUT",
      body: JSON.stringify({ ancien: pwd.ancien, nouveau: pwd.nouveau }),
    });
    setSaving(false);
    if (!r.ok) return setErr(await r.text());
    setPwd({ ancien: "", nouveau: "", confirm: "" });
    close();
    setOk("تم تغيير كلمة السر");
  };

  const logout = () => {
    localStorage.removeItem("lajna_user");
    window.location.href = "/";
  };

  if (error || !session)
    return <div dir="rtl" className="py-24 text-center text-gray-500">سجّل الدخول لعرض ملفك الشخصي.</div>;

  if (!m)
    return (
      <div dir="rtl" className="space-y-4 py-6">
        <div className="h-44 animate-pulse rounded-3xl bg-gray-100" />
        <div className="h-64 animate-pulse rounded-3xl bg-gray-100" />
      </div>
    );

  const isAdmin = m.role === "ADMIN" || m.role === "SUPER_ADMIN";
  const permissions: string[] = m.fonction?.permissions || [];
  const full = `${m.prenom || ""} ${m.nom || ""}`.trim();

  return (
    <div dir="rtl">
      <PageMeta title="ملفي الشخصي" description="الملف الشخصي لعضو اللجنة" />
      <PageBreadcrumb pageTitle="ملفي الشخصي" />

      <div className="mx-auto max-w-5xl space-y-6">
        {ok && (
          <div className="flex items-center justify-between rounded-2xl border border-green-200 bg-green-50 px-5 py-3 text-sm font-bold text-green-700">
            {ok}
            <button onClick={() => setOk("")}>✕</button>
          </div>
        )}

        <div className="rounded-3xl bg-gradient-to-l from-indigo-600 to-blue-500 p-6 text-white shadow-lg lg:p-8">
          <div className="flex flex-col items-center gap-5 lg:flex-row lg:justify-between">
            <div className="flex flex-col items-center gap-5 lg:flex-row">
              <span className="flex h-24 w-24 items-center justify-center rounded-3xl bg-white/20 text-4xl font-extrabold">
                {(m.prenom || m.nom || "؟").charAt(0)}
              </span>
              <div className="text-center lg:text-right">
                <p className="text-xs font-semibold text-white/70">اللجنة الاجتماعية · الرشاد للكفالة</p>
                <h2 className="mt-1 text-3xl font-extrabold">{full}</h2>
                <div className="mt-3 flex flex-wrap justify-center gap-2 lg:justify-start">
                  <span className="rounded-full bg-white/20 px-3 py-1 text-xs font-bold">
                    {m.fonction?.nom || "بدون وظيفة"}
                  </span>
                  <span className="rounded-full bg-white/20 px-3 py-1 text-xs font-bold">
                    {ROLES[m.role] || ROLES.SIMPLE}
                  </span>
                  <span className="rounded-full bg-white/20 px-3 py-1 text-xs font-bold">@{m.username}</span>
                </div>
              </div>
            </div>
            <button onClick={logout} className="h-11 rounded-2xl bg-white px-6 text-sm font-bold text-indigo-700">
              تسجيل الخروج
            </button>
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          <Card
            title="المعلومات الشخصية"
            action={
              <button
                onClick={() => {
                  setForm({ prenom: m.prenom || "", nom: m.nom || "", phone: m.phone || "" });
                  setModal("infos");
                }}
                className="h-10 rounded-xl border px-4 text-sm font-semibold text-gray-600"
              >
                تعديل
              </button>
            }
          >
            <div className="grid grid-cols-2 gap-3">
              <Info label="الاسم" value={m.prenom} />
              <Info label="النسب" value={m.nom} />
              <Info label="الهاتف" value={m.phone} />
              <Info label="الوظيفة" value={m.fonction?.nom} />
            </div>
          </Card>

          <Card
            title="الحساب والأمان"
            action={
              <button
                onClick={() => {
                  setErr("");
                  setModal("pwd");
                }}
                className="h-10 rounded-xl border px-4 text-sm font-semibold text-gray-600"
              >
                تغيير كلمة السر
              </button>
            }
          >
            <div className="grid grid-cols-2 gap-3">
              <Info label="اسم المستخدم" value={m.username} />
              <Info label="الدور" value={ROLES[m.role] || ROLES.SIMPLE} />
              <div className="col-span-2">
                <Info label="آخر دخول" value={fmtDT(m.derniereConnexion)} />
              </div>
            </div>
          </Card>
        </div>

        <Card title="صلاحياتي">
          <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
            {Object.entries(PERMS).map(([k, l]) => {
              const has = isAdmin || permissions.includes(k);
              return (
                <div
                  key={k}
                  className={
                    "flex items-center gap-3 rounded-2xl border p-4 " +
                    (has ? "border-green-200 bg-green-50" : "border-gray-200 bg-gray-50 opacity-60")
                  }
                >
                  <span
                    className={
                      "flex h-8 w-8 items-center justify-center rounded-full text-sm font-bold text-white " +
                      (has ? "bg-green-500" : "bg-gray-300")
                    }
                  >
                    {has ? "✓" : "✗"}
                  </span>
                  <span className="text-sm font-bold text-gray-700">{l}</span>
                </div>
              );
            })}
          </div>
        </Card>
      </div>

      {modal === "infos" && (
        <Dialog title="تعديل المعلومات الشخصية" onClose={close} onSave={saveInfos} saving={saving} err={err}>
          <div className="grid gap-3 md:grid-cols-2">
            <input className={inp} placeholder="الاسم" value={form.prenom} onChange={(e) => setForm({ ...form, prenom: e.target.value })} />
            <input className={inp} placeholder="النسب" value={form.nom} onChange={(e) => setForm({ ...form, nom: e.target.value })} />
            <input className={inp + " md:col-span-2"} placeholder="الهاتف" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
          </div>
        </Dialog>
      )}

      {modal === "pwd" && (
        <Dialog title="تغيير كلمة السر" onClose={close} onSave={savePwd} saving={saving} err={err}>
          <div className="grid gap-3">
            <input type="password" className={inp} placeholder="كلمة السر الحالية" value={pwd.ancien} onChange={(e) => setPwd({ ...pwd, ancien: e.target.value })} />
            <input type="password" className={inp} placeholder="كلمة السر الجديدة" value={pwd.nouveau} onChange={(e) => setPwd({ ...pwd, nouveau: e.target.value })} />
            <input type="password" className={inp} placeholder="تأكيد كلمة السر الجديدة" value={pwd.confirm} onChange={(e) => setPwd({ ...pwd, confirm: e.target.value })} />
          </div>
        </Dialog>
      )}
    </div>
  );
}