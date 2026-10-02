import { useEffect, useMemo, useState } from "react";
import PageMeta from "../components/common/PageMeta";
import PageBreadcrumb from "../components/common/PageBreadCrumb";

const API = "http://localhost:8080/api/lajna";

const me = () => JSON.parse(localStorage.getItem("lajna_user") || "null");
const call = (url: string, init: RequestInit = {}) =>
  fetch(url, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      "X-User-Id": String(me()?.id ?? ""),
    },
  });

const ROLES: Record<string, { l: string; c: string }> = {
  SUPER_ADMIN: { l: "مسؤول أعلى", c: "bg-purple-50 text-purple-700" },
  ADMIN: { l: "مشرف", c: "bg-amber-50 text-amber-700" },
  SIMPLE: { l: "مستخدم", c: "bg-gray-100 text-gray-600" },
};

const inp =
  "h-11 w-full rounded-xl border border-gray-200 bg-gray-50 px-3.5 text-sm outline-none focus:border-indigo-300 focus:bg-white";

const EMPTY = { prenom: "", nom: "", phone: "", fonctionId: "", role: "SIMPLE", username: "", password: "" };

const Dialog = ({ title, children, onClose, onSave, saving, err }: any) => (
  <div className="fixed inset-0 z-[99999] flex items-center justify-center bg-black/50 p-4">
    <div dir="rtl" className="w-full max-w-lg rounded-3xl bg-white p-6">
      <h3 className="mb-5 text-xl font-extrabold">{title}</h3>
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

export default function Utilisateurs() {
  const [list, setList] = useState<any[]>([]);
  const [fonctions, setFonctions] = useState<any[]>([]);
  const [form, setForm] = useState<any | null>(null);
  const [reset, setReset] = useState<any | null>(null);
  const [q, setQ] = useState("");
  const [err, setErr] = useState("");
  const [saving, setSaving] = useState(false);

  const user = me();
  const allowed = user?.role === "SUPER_ADMIN";

  const load = async () => {
    const [m, f] = await Promise.all([call(`${API}/membres`), call(`${API}/fonctions`)]);
    if (m.ok) setList(await m.json());
    if (f.ok) setFonctions(await f.json());
  };

  useEffect(() => {
    if (allowed) load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const shown = useMemo(() => {
    const s = q.trim().toLowerCase();
    return list.filter(
      (m) => !s || `${m.prenom} ${m.nom} ${m.username}`.toLowerCase().includes(s)
    );
  }, [list, q]);

  const create = async () => {
    setSaving(true);
    setErr("");
    const r = await call(`${API}/utilisateurs`, {
      method: "POST",
      body: JSON.stringify({ ...form, fonctionId: form.fonctionId || null }),
    });
    setSaving(false);
    if (!r.ok) return setErr(await r.text());
    setForm(null);
    load();
  };

  const resetPassword = async () => {
    setSaving(true);
    setErr("");
    const r = await call(`${API}/membres/${reset.id}/compte`, {
      method: "POST",
      body: JSON.stringify({ username: reset.username, password: reset.password }),
    });
    setSaving(false);
    if (!r.ok) return setErr(await r.text());
    setReset(null);
    load();
  };

  const toggle = async (m: any) => {
    const r = await call(`${API}/membres/${m.id}/compte/actif`, {
      method: "PUT",
      body: JSON.stringify({ actif: !m.compteActif }),
    });
    if (!r.ok) alert(await r.text());
    load();
  };

  const changeRole = async (m: any, role: string) => {
    const r = await call(`${API}/membres/${m.id}/role`, {
      method: "PUT",
      body: JSON.stringify({ role }),
    });
    if (!r.ok) alert(await r.text());
    load();
  };

  if (!allowed)
    return (
      <div dir="rtl" className="py-24 text-center text-gray-500">
        هذه الصفحة مخصصة للمسؤول الأعلى فقط.
      </div>
    );

  return (
    <div dir="rtl">
      <PageMeta title="إدارة المستخدمين" description="إضافة وإدارة مستخدمي اللجنة" />
      <PageBreadcrumb pageTitle="إدارة المستخدمين" />

      <div className="mx-auto max-w-6xl space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-3xl bg-gradient-to-l from-indigo-600 to-blue-500 p-6 text-white shadow-lg">
          <div>
            <p className="text-xs text-white/70">الرشاد للكفالة · اللجنة الاجتماعية</p>
            <h1 className="text-2xl font-extrabold">إدارة المستخدمين</h1>
            <p className="text-sm text-white/80">
              {list.length} مستخدم · {list.filter((m) => m.compteActif).length} حساب مفعل
            </p>
          </div>
          <button
            onClick={() => {
              setErr("");
              setForm({ ...EMPTY });
            }}
            className="h-11 rounded-xl bg-white px-6 text-sm font-bold text-indigo-700"
          >
            + مستخدم جديد
          </button>
        </div>

        <input
          className={inp}
          placeholder="بحث بالاسم أو اسم المستخدم..."
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />

        <div className="overflow-x-auto rounded-3xl border border-gray-200 bg-white shadow-sm">
          <table className="min-w-full text-right text-sm">
            <thead className="bg-gray-50 text-xs font-semibold text-gray-500">
              <tr>
                <th className="px-5 py-4">المستخدم</th>
                <th className="px-5 py-4">الوظيفة</th>
                <th className="px-5 py-4">الدور</th>
                <th className="px-5 py-4">اسم المستخدم</th>
                <th className="px-5 py-4">الحالة</th>
                <th className="px-5 py-4">آخر دخول</th>
                <th className="px-5 py-4 text-center">إجراء</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {shown.map((m) => {
                const role = ROLES[m.role || "SIMPLE"] || ROLES.SIMPLE;
                return (
                  <tr key={m.id} className="hover:bg-indigo-50/40">
                    <td className="px-5 py-4 font-bold text-gray-800">
                      {m.prenom} {m.nom}
                    </td>
                    <td className="px-5 py-4">{m.fonction?.nom || "—"}</td>
                    <td className="px-5 py-4">
                      {m.id === user.id ? (
                        <span className={"rounded-full px-3 py-1 text-xs font-bold " + role.c}>
                          {role.l}
                        </span>
                      ) : (
                        <select
                          value={m.role || "SIMPLE"}
                          onChange={(e) => changeRole(m, e.target.value)}
                          className={"h-9 rounded-lg px-2 text-xs font-bold " + role.c}
                        >
                          {Object.entries(ROLES).map(([k, v]) => (
                            <option key={k} value={k}>
                              {v.l}
                            </option>
                          ))}
                        </select>
                      )}
                    </td>
                    <td className="px-5 py-4 text-gray-600">{m.username || "لا يوجد حساب"}</td>
                    <td className="px-5 py-4">
                      {m.username && (
                        <span
                          className={
                            "rounded-full px-3 py-1 text-xs font-bold " +
                            (m.compteActif ? "bg-green-50 text-green-700" : "bg-red-50 text-red-600")
                          }
                        >
                          {m.compteActif ? "مفعل" : "موقوف"}
                        </span>
                      )}
                    </td>
                    <td className="px-5 py-4 text-xs text-gray-400">
                      {m.derniereConnexion?.replace("T", " ").slice(0, 16) || "—"}
                    </td>
                    <td className="px-5 py-4">
                      <div className="flex justify-center gap-2 text-xs font-bold">
                        <button
                          onClick={() => {
                            setErr("");
                            setReset({
                              id: m.id,
                              nom: `${m.prenom} ${m.nom}`,
                              username: m.username || "",
                              password: "",
                            });
                          }}
                          className="rounded-lg bg-indigo-50 px-3 py-1.5 text-indigo-700"
                        >
                          {m.username ? "كلمة سر جديدة" : "إنشاء حساب"}
                        </button>
                        {m.username && m.id !== user.id && (
                          <button
                            onClick={() => toggle(m)}
                            className="rounded-lg bg-gray-100 px-3 py-1.5 text-gray-700"
                          >
                            {m.compteActif ? "إيقاف" : "تفعيل"}
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
              {shown.length === 0 && (
                <tr>
                  <td colSpan={7} className="py-14 text-center text-gray-400">
                    لا توجد نتائج
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {form && (
        <Dialog title="مستخدم جديد" onClose={() => setForm(null)} onSave={create} saving={saving} err={err}>
          <div className="grid gap-3 md:grid-cols-2">
            <input className={inp} placeholder="الاسم" value={form.prenom} onChange={(e) => setForm({ ...form, prenom: e.target.value })} />
            <input className={inp} placeholder="النسب" value={form.nom} onChange={(e) => setForm({ ...form, nom: e.target.value })} />
            <input className={inp} placeholder="الهاتف" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
            <select
              className={inp}
              value={form.fonctionId}
              onChange={(e) => setForm({ ...form, fonctionId: e.target.value ? Number(e.target.value) : "" })}
            >
              <option value="">اختر الوظيفة</option>
              {fonctions.map((f) => (
                <option key={f.id} value={f.id}>
                  {f.nom}
                </option>
              ))}
            </select>
            <select
              className={inp + " md:col-span-2"}
              value={form.role}
              onChange={(e) => setForm({ ...form, role: e.target.value })}
            >
              {Object.entries(ROLES).map(([k, v]) => (
                <option key={k} value={k}>
                  {v.l}
                </option>
              ))}
            </select>
            <input className={inp} placeholder="اسم المستخدم" value={form.username} onChange={(e) => setForm({ ...form, username: e.target.value })} />
            <input className={inp} type="password" placeholder="كلمة السر (6 أحرف على الأقل)" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
          </div>
        </Dialog>
      )}

      {reset && (
        <Dialog title={`حساب: ${reset.nom}`} onClose={() => setReset(null)} onSave={resetPassword} saving={saving} err={err}>
          <div className="grid gap-3">
            <input className={inp} placeholder="اسم المستخدم" value={reset.username} onChange={(e) => setReset({ ...reset, username: e.target.value })} />
            <input className={inp} type="password" placeholder="كلمة السر الجديدة" value={reset.password} onChange={(e) => setReset({ ...reset, password: e.target.value })} />
          </div>
        </Dialog>
      )}
    </div>
  );
}