import { useEffect, useState } from "react";
import { useNavigate } from "react-router";

const API = "http://localhost:8080/api/lajna";

const inp =
  "h-12 w-full rounded-xl border border-gray-200 bg-gray-50 px-4 text-sm text-gray-800 outline-none transition placeholder:text-gray-400 focus:border-indigo-300 focus:bg-white focus:ring-4 focus:ring-indigo-500/10";

export default function SignInForm() {
  const navigate = useNavigate();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [show, setShow] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  // déjà connecté : on va directement à l'accueil
  useEffect(() => {
    if (localStorage.getItem("lajna_user")) navigate("/home", { replace: true });
  }, [navigate]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim() || !password) {
      setError("أدخل اسم المستخدم وكلمة السر");
      return;
    }
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`${API}/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: username.trim(), password }),
      });
      if (!res.ok) {
        setError(res.status === 401 ? "بيانات الدخول غير صحيحة" : "تعذر تسجيل الدخول، حاول مرة أخرى");
        return;
      }
      localStorage.setItem("lajna_user", JSON.stringify(await res.json()));
      navigate("/home", { replace: true });
    } catch {
      setError("تعذر الاتصال بالخادم");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div dir="rtl" className="flex w-full flex-1 flex-col justify-center lg:w-1/2">
      <div className="mx-auto w-full max-w-md px-6">
        <div className="mb-8">
          <span className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-600 to-blue-500 text-2xl font-extrabold text-white shadow-lg shadow-indigo-200">
            ر
          </span>
          <h1 className="text-3xl font-extrabold text-gray-800 dark:text-white">تسجيل الدخول</h1>
          <p className="mt-2 text-sm text-gray-500">
            فضاء تدبير اللجنة الاجتماعية. أدخل بيانات حسابك للولوج.
          </p>
        </div>

        <form onSubmit={submit} className="space-y-5">
          <label className="block">
            <span className="mb-1.5 block text-xs font-bold text-gray-600">اسم المستخدم</span>
            <input
              className={inp}
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              autoComplete="username"
              autoFocus
              placeholder="مثال: jawad"
            />
          </label>

          <label className="block">
            <span className="mb-1.5 block text-xs font-bold text-gray-600">كلمة السر</span>
            <div className="relative">
              <input
                className={`${inp} pl-20`}
                type={show ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password"
                placeholder="••••••••"
              />
              <button
                type="button"
                onClick={() => setShow(!show)}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold text-indigo-600"
              >
                {show ? "إخفاء" : "إظهار"}
              </button>
            </div>
          </label>

          {error && (
            <p className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-600">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="h-12 w-full rounded-xl bg-indigo-600 text-sm font-bold text-white shadow-sm transition hover:bg-indigo-700 disabled:opacity-60"
          >
            {loading ? "جاري الدخول..." : "دخول"}
          </button>
        </form>

        <p className="mt-8 text-center text-xs text-gray-400">
          لا يوجد حساب؟ تواصل مع المسؤول لإنشاء حساب لك.
        </p>
      </div>
    </div>
  );
}