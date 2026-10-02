import React, { useCallback, useEffect, useMemo, useState } from "react";
import axios from "axios";

const API = "http://localhost:8080/api";

type Category = {
  id: number;
  code: string;
  nom: string;
  systeme: boolean;
  active: boolean;
  ordre: number;
};

type Receipt = {
  id: number;
  anneeScolaire: string;
  categorieId: number;
  categorieCode: string;
  categorieNom: string;
  categorieSysteme: boolean;
  montant: number;
  dateReception: string;
  source?: string | null;
  referencePaiement?: string | null;
  modePaiement?: string | null;
  note?: string | null;
  createdAt?: string | null;
};

type SpecialSummary = {
  categorieId: number;
  code: string;
  nom: string;
  active: boolean;
  montant: number;
};

type Summary = {
  anneeScolaire: string;
  degreDefini: number;
  degreNonDefini: number;
  sawaedAlKhayr: number;
  casSpeciaux: number;
  totalRecettes: number;
  nombreOperations: number;
  categoriesSpeciales: SpecialSummary[];
};

type ReceiptForm = {
  id?: number;
  anneeScolaire: string;
  categorieId: string;
  montant: string;
  dateReception: string;
  source: string;
  referencePaiement: string;
  modePaiement: string;
  note: string;
};

const getCurrentSchoolYear = () => {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth() + 1;

  return month >= 9
    ? `${year}/${year + 1}`
    : `${year - 1}/${year}`;
};

const getSchoolYears = () => {
  const current = getCurrentSchoolYear();
  const first = Number(current.split("/")[0]);

  return Array.from(
    { length: 8 },
    (_, index) => {
      const start = first - index;
      return `${start}/${start + 1}`;
    }
  );
};

const fmtMoney = (value: unknown) =>
  `${Number(value || 0).toLocaleString("fr-FR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })} DH`;

const todayIso = () =>
  new Date().toISOString().slice(0, 10);

const EMPTY_SUMMARY: Summary = {
  anneeScolaire: getCurrentSchoolYear(),
  degreDefini: 0,
  degreNonDefini: 0,
  sawaedAlKhayr: 0,
  casSpeciaux: 0,
  totalRecettes: 0,
  nombreOperations: 0,
  categoriesSpeciales: [],
};

const ModalShell: React.FC<{
  open: boolean;
  title: string;
  onClose: () => void;
  children: React.ReactNode;
  width?: string;
}> = ({
  open,
  title,
  onClose,
  children,
  width = "max-w-2xl",
}) => {
  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center bg-slate-950/45 p-4 backdrop-blur-sm"
      dir="rtl"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) {
          onClose();
        }
      }}
    >
      <div
        className={`max-h-[92vh] w-full ${width} overflow-hidden rounded-3xl bg-white shadow-2xl dark:bg-slate-900`}
      >
        <div className="flex items-center justify-between border-b border-slate-100 px-6 py-5 dark:border-slate-800">
          <div>
            <p className="text-xs font-bold text-indigo-500">
              الإدارة المالية
            </p>

            <h3 className="mt-1 text-lg font-black text-slate-900 dark:text-white">
              {title}
            </h3>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100 text-lg font-black text-slate-500 transition hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300"
          >
            ×
          </button>
        </div>

        <div className="max-h-[calc(92vh-82px)] overflow-y-auto p-6">
          {children}
        </div>
      </div>
    </div>
  );
};

const SummaryCard: React.FC<{
  label: string;
  value: number;
  subtitle: string;
  className: string;
}> = ({
  label,
  value,
  subtitle,
  className,
}) => (
  <div className={`rounded-2xl border p-5 shadow-sm ${className}`}>
    <p className="text-xs font-black opacity-70">
      {label}
    </p>

    <p className="mt-2 text-2xl font-black">
      {fmtMoney(value)}
    </p>

    <p className="mt-1 text-[11px] font-bold opacity-60">
      {subtitle}
    </p>
  </div>
);

export default function GestionEconomique() {
  const schoolYears = useMemo(
    () => getSchoolYears(),
    []
  );

  const [
    selectedYear,
    setSelectedYear,
  ] = useState(
    getCurrentSchoolYear()
  );

  const [
    categories,
    setCategories,
  ] = useState<Category[]>([]);

  const [
    receipts,
    setReceipts,
  ] = useState<Receipt[]>([]);

  const [
    summary,
    setSummary,
  ] = useState<Summary>(
    EMPTY_SUMMARY
  );

  const [
    loading,
    setLoading,
  ] = useState(true);

  const [
    error,
    setError,
  ] = useState("");

  const [
    receiptModalOpen,
    setReceiptModalOpen,
  ] = useState(false);

  const [
    categoryModalOpen,
    setCategoryModalOpen,
  ] = useState(false);

  const [
    savingReceipt,
    setSavingReceipt,
  ] = useState(false);

  const [
    savingCategory,
    setSavingCategory,
  ] = useState(false);

  const [
    editingCategory,
    setEditingCategory,
  ] = useState<Category | null>(
    null
  );

  const [
    categoryName,
    setCategoryName,
  ] = useState("");

  const [
    categoryOrder,
    setCategoryOrder,
  ] = useState("100");

  const [
    form,
    setForm,
  ] = useState<ReceiptForm>({
    anneeScolaire:
      getCurrentSchoolYear(),
    categorieId: "",
    montant: "",
    dateReception:
      todayIso(),
    source: "",
    referencePaiement: "",
    modePaiement: "",
    note: "",
  });


  // ==========================================================
  // CHARGEMENT
  // ==========================================================

  const loadCategories =
    useCallback(async () => {

      const res =
        await axios.get(
          `${API}/economie/categories`,
          {
            params: {
              includeInactive: true,
            },
          }
        );

      const data =
        Array.isArray(res.data)
          ? res.data
          : [];

      setCategories(
        data
      );

    }, []);


  const loadYearData =
    useCallback(async () => {

      setLoading(true);
      setError("");

      try {

        const [
          receiptsRes,
          summaryRes,
        ] = await Promise.all([
          axios.get(
            `${API}/economie/recettes`,
            {
              params: {
                anneeScolaire:
                  selectedYear,
              },
            }
          ),

          axios.get(
            `${API}/economie/resume`,
            {
              params: {
                anneeScolaire:
                  selectedYear,
              },
            }
          ),
        ]);


        setReceipts(
          Array.isArray(
            receiptsRes.data
          )
            ? receiptsRes.data
            : []
        );


        setSummary({
          ...EMPTY_SUMMARY,
          ...(summaryRes.data || {}),
        });

      } catch (e: any) {

        console.error(e);

        setError(
          e?.response?.data
            ?.message ||
          "تعذر تحميل البيانات المالية"
        );

      } finally {

        setLoading(false);
      }

    }, [selectedYear]);


  useEffect(() => {

    loadCategories()
      .catch((e) => {
        console.error(e);
      });

  }, [loadCategories]);


  useEffect(() => {

    void loadYearData();

  }, [loadYearData]);


  // ==========================================================
  // RECETTE
  // ==========================================================

  const resetReceiptForm =
    () => {

      const firstActive =
        categories.find(
          (c) => c.active
        );

      setForm({
        anneeScolaire:
          selectedYear,

        categorieId:
          firstActive
            ? String(
                firstActive.id
              )
            : "",

        montant: "",

        dateReception:
          todayIso(),

        source: "",

        referencePaiement:
          "",

        modePaiement:
          "",

        note: "",
      });
    };


  const openCreateReceipt =
    () => {

      resetReceiptForm();

      setReceiptModalOpen(
        true
      );
    };


  const openEditReceipt =
    (receipt: Receipt) => {

      setForm({
        id: receipt.id,

        anneeScolaire:
          receipt.anneeScolaire,

        categorieId:
          String(
            receipt.categorieId
          ),

        montant:
          String(
            receipt.montant
          ),

        dateReception:
          receipt.dateReception,

        source:
          receipt.source || "",

        referencePaiement:
          receipt.referencePaiement ||
          "",

        modePaiement:
          receipt.modePaiement ||
          "",

        note:
          receipt.note || "",
      });

      setReceiptModalOpen(
        true
      );
    };


  const saveReceipt =
    async () => {

      if (
        !form.categorieId
      ) {

        alert(
          "اختر الفئة"
        );

        return;
      }


      if (
        !form.montant ||
        Number(form.montant) <= 0
      ) {

        alert(
          "أدخل مبلغا صحيحا"
        );

        return;
      }


      if (
        !form.dateReception
      ) {

        alert(
          "أدخل تاريخ الاستلام"
        );

        return;
      }


      setSavingReceipt(true);


      try {

        const payload = {

          anneeScolaire:
            form.anneeScolaire,

          categorieId:
            Number(
              form.categorieId
            ),

          montant:
            Number(
              form.montant
            ),

          dateReception:
            form.dateReception,

          source:
            form.source.trim(),

          referencePaiement:
            form
              .referencePaiement
              .trim(),

          modePaiement:
            form
              .modePaiement
              .trim(),

          note:
            form.note.trim(),
        };


        if (
          form.id
        ) {

          await axios.put(
            `${API}/economie/recettes/${form.id}`,
            payload
          );

        } else {

          await axios.post(
            `${API}/economie/recettes`,
            payload
          );
        }


        setReceiptModalOpen(
          false
        );

        await loadYearData();

      } catch (e: any) {

        alert(
          e?.response?.data
            ?.message ||
          "تعذر حفظ المدخول"
        );

      } finally {

        setSavingReceipt(false);
      }
    };


  const deleteReceipt =
    async (
      receipt: Receipt
    ) => {

      if (
        !window.confirm(
          `حذف المدخول ${fmtMoney(
            receipt.montant
          )} من ${receipt.categorieNom}؟`
        )
      ) {

        return;
      }


      try {

        await axios.delete(
          `${API}/economie/recettes/${receipt.id}`
        );

        await loadYearData();

      } catch (e: any) {

        alert(
          e?.response?.data
            ?.message ||
          "تعذر حذف المدخول"
        );
      }
    };


  // ==========================================================
  // CATEGORIES SPECIALES
  // ==========================================================

  const openCreateCategory =
    () => {

      setEditingCategory(
        null
      );

      setCategoryName(
        ""
      );

      setCategoryOrder(
        "100"
      );

      setCategoryModalOpen(
        true
      );
    };


  const openEditCategory =
    (
      category: Category
    ) => {

      setEditingCategory(
        category
      );

      setCategoryName(
        category.nom
      );

      setCategoryOrder(
        String(
          category.ordre ?? 100
        )
      );

      setCategoryModalOpen(
        true
      );
    };


  const saveCategory =
    async () => {

      if (
        !categoryName.trim()
      ) {

        alert(
          "أدخل اسم الفئة"
        );

        return;
      }


      setSavingCategory(true);


      try {

        const payload = {

          nom:
            categoryName.trim(),

          ordre:
            Number(
              categoryOrder || 100
            ),

          active:
            editingCategory
              ? editingCategory.active
              : true,
        };


        if (
          editingCategory
        ) {

          await axios.put(
            `${API}/economie/categories/${editingCategory.id}`,
            payload
          );

        } else {

          await axios.post(
            `${API}/economie/categories`,
            payload
          );
        }


        setCategoryModalOpen(
          false
        );

        await loadCategories();
        await loadYearData();

      } catch (e: any) {

        alert(
          e?.response?.data
            ?.message ||
          "تعذر حفظ الفئة"
        );

      } finally {

        setSavingCategory(false);
      }
    };


  const disableCategory =
    async (
      category: Category
    ) => {

      if (
        category.systeme
      ) {

        return;
      }


      if (
        !window.confirm(
          `تعطيل الفئة "${category.nom}"؟`
        )
      ) {

        return;
      }


      try {

        await axios.delete(
          `${API}/economie/categories/${category.id}`
        );

        await loadCategories();
        await loadYearData();

      } catch (e: any) {

        alert(
          e?.response?.data
            ?.message ||
          "تعذر تعطيل الفئة"
        );
      }
    };


  const reactivateCategory =
    async (
      category: Category
    ) => {

      try {

        await axios.put(
          `${API}/economie/categories/${category.id}`,
          {
            nom:
              category.nom,

            ordre:
              category.ordre,

            active:
              true,
          }
        );

        await loadCategories();
        await loadYearData();

      } catch (e: any) {

        alert(
          e?.response?.data
            ?.message ||
          "تعذر تفعيل الفئة"
        );
      }
    };


  // ==========================================================
  // DONNEES CALCULEES
  // ==========================================================

  const activeCategories =
    useMemo(
      () =>
        categories.filter(
          (c) => c.active
        ),
      [categories]
    );


  const systemCategories =
    useMemo(
      () =>
        categories.filter(
          (c) => c.systeme
        ),
      [categories]
    );


  const specialCategories =
    useMemo(
      () =>
        categories.filter(
          (c) => !c.systeme
        ),
      [categories]
    );


  const getCategoryBadge =
    (
      code: string
    ) => {

      if (
        code ===
        "DEGRE_DEFINI"
      ) {

        return "bg-blue-50 text-blue-700 border-blue-100";
      }


      if (
        code ===
        "DEGRE_NON_DEFINI"
      ) {

        return "bg-orange-50 text-orange-700 border-orange-100";
      }


      if (
        code ===
        "SAAWED_AL_KHAYR"
      ) {

        return "bg-violet-50 text-violet-700 border-violet-100";
      }


      return "bg-emerald-50 text-emerald-700 border-emerald-100";
    };


  // ==========================================================
  // UI
  // ==========================================================

  return (
    <div
      dir="rtl"
      className="space-y-6"
    >

      {/* =======================================================
          HEADER
      ======================================================= */}

      <section className="relative overflow-hidden rounded-3xl border border-indigo-100 bg-gradient-to-l from-slate-950 via-indigo-950 to-indigo-700 p-7 text-white shadow-xl shadow-indigo-950/10">

        <div className="absolute -left-12 -top-16 h-44 w-44 rounded-full bg-white/10 blur-3xl" />

        <div className="relative flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">

          <div>

            <div className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1.5 text-xs font-bold text-indigo-100">
              <span className="h-2 w-2 rounded-full bg-emerald-300" />
              الإدارة المالية
            </div>

            <h1 className="mt-3 text-2xl font-black md:text-3xl">
              تدبير المداخيل
            </h1>

            <p className="mt-2 max-w-2xl text-sm leading-6 text-indigo-100">
              تسجيل كل مبلغ مستلم حسب السنة الدراسية مع الفصل بين الدرجات المحددة، معوز، سواعد الخير والحالات الخاصة.
            </p>

          </div>


          <div className="flex flex-wrap gap-2">

            <button
              type="button"
              onClick={
                openCreateReceipt
              }
              className="rounded-xl bg-white px-5 py-3 text-sm font-black text-indigo-800 shadow-lg transition hover:-translate-y-0.5"
            >
              + إضافة مدخول
            </button>

            <button
              type="button"
              onClick={
                openCreateCategory
              }
              className="rounded-xl border border-white/20 bg-white/10 px-5 py-3 text-sm font-black text-white backdrop-blur transition hover:bg-white/15"
            >
              + إضافة حالة خاصة
            </button>

          </div>

        </div>

      </section>


      {/* =======================================================
          FILTER YEAR
      ======================================================= */}

      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">

        <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">

          <div>

            <p className="text-xs font-bold text-slate-400">
              السنة الدراسية
            </p>

            <h2 className="mt-1 text-lg font-black text-slate-900 dark:text-white">
              اختر الفترة المالية
            </h2>

          </div>


          <div className="min-w-[220px]">

            <select
              value={
                selectedYear
              }
              onChange={(e) =>
                setSelectedYear(
                  e.target.value
                )
              }
              className="h-11 w-full rounded-xl border border-slate-200 bg-slate-50 px-4 text-sm font-black text-slate-700 outline-none focus:border-indigo-400 focus:ring-4 focus:ring-indigo-500/10 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
            >

              {schoolYears.map(
                (year) => (
                  <option
                    key={year}
                    value={year}
                  >
                    {year}
                  </option>
                )
              )}

            </select>

          </div>

        </div>

      </section>


      {error && (
        <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm font-bold text-red-700">
          {error}
        </div>
      )}


      {/* =======================================================
          SUMMARY
      ======================================================= */}

      <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-5">

        <SummaryCard
          label="الدرجات المحددة"
          value={
            summary.degreDefini
          }
          subtitle="المبالغ المستلمة لهذه الفئة"
          className="border-blue-100 bg-blue-50 text-blue-800"
        />

        <SummaryCard
          label="معوز / درجة غير محددة"
          value={
            summary.degreNonDefini
          }
          subtitle="المبالغ المستلمة للعائلات بدون درجة"
          className="border-orange-100 bg-orange-50 text-orange-800"
        />

        <SummaryCard
          label="سواعد الخير"
          value={
            summary.sawaedAlKhayr
          }
          subtitle="ميزانية مستقلة"
          className="border-violet-100 bg-violet-50 text-violet-800"
        />

        <SummaryCard
          label="الحالات الخاصة"
          value={
            summary.casSpeciaux
          }
          subtitle="مجموع الفئات الخاصة القابلة للإضافة"
          className="border-emerald-100 bg-emerald-50 text-emerald-800"
        />

        <div className="rounded-2xl border border-slate-900 bg-slate-950 p-5 text-white shadow-lg">

          <p className="text-xs font-black text-slate-300">
            إجمالي المداخيل
          </p>

          <p className="mt-2 text-3xl font-black">
            {loading
              ? "..."
              : fmtMoney(
                  summary.totalRecettes
                )}
          </p>

          <p className="mt-1 text-[11px] font-bold text-slate-400">
            {summary.nombreOperations} عملية • {selectedYear}
          </p>

        </div>

      </section>


      {/* =======================================================
          SPECIAL CATEGORIES
      ======================================================= */}

      <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">

        <div className="mb-5 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">

          <div>

            <p className="text-xs font-bold text-emerald-600">
              مرنة وقابلة للتعديل
            </p>

            <h2 className="mt-1 text-lg font-black text-slate-900 dark:text-white">
              الحالات الخاصة
            </h2>

            <p className="mt-1 text-xs text-slate-400">
              يمكنك إنشاء أي فئة إضافية دون تعديل الكود.
            </p>

          </div>


          <button
            type="button"
            onClick={
              openCreateCategory
            }
            className="w-fit rounded-xl bg-emerald-600 px-4 py-2.5 text-xs font-black text-white shadow-sm transition hover:bg-emerald-700"
          >
            + فئة خاصة جديدة
          </button>

        </div>


        {specialCategories.length === 0 ? (

          <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-8 text-center text-sm font-bold text-slate-400">
            لم تتم إضافة أي حالة خاصة بعد.
          </div>

        ) : (

          <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">

            {specialCategories.map(
              (category) => {

                const special =
                  summary
                    .categoriesSpeciales
                    .find(
                      (x) =>
                        x.categorieId ===
                        category.id
                    );

                return (
                  <div
                    key={
                      category.id
                    }
                    className={`rounded-2xl border p-4 ${
                      category.active
                        ? "border-emerald-100 bg-emerald-50"
                        : "border-slate-200 bg-slate-50 opacity-70"
                    }`}
                  >

                    <div className="flex items-start justify-between gap-3">

                      <div>

                        <p className="font-black text-slate-800">
                          {category.nom}
                        </p>

                        <p className="mt-1 text-xl font-black text-emerald-700">
                          {fmtMoney(
                            special?.montant ||
                            0
                          )}
                        </p>

                        {!category.active && (
                          <span className="mt-2 inline-flex rounded-full bg-slate-200 px-2 py-1 text-[10px] font-black text-slate-600">
                            غير مفعلة
                          </span>
                        )}

                      </div>


                      <div className="flex gap-1">

                        <button
                          type="button"
                          onClick={() =>
                            openEditCategory(
                              category
                            )
                          }
                          className="rounded-lg bg-white px-2.5 py-1.5 text-[11px] font-black text-indigo-600 shadow-sm"
                        >
                          تعديل
                        </button>


                        {category.active ? (

                          <button
                            type="button"
                            onClick={() =>
                              disableCategory(
                                category
                              )
                            }
                            className="rounded-lg bg-white px-2.5 py-1.5 text-[11px] font-black text-red-500 shadow-sm"
                          >
                            تعطيل
                          </button>

                        ) : (

                          <button
                            type="button"
                            onClick={() =>
                              reactivateCategory(
                                category
                              )
                            }
                            className="rounded-lg bg-white px-2.5 py-1.5 text-[11px] font-black text-emerald-600 shadow-sm"
                          >
                            تفعيل
                          </button>
                        )}

                      </div>

                    </div>

                  </div>
                );
              }
            )}

          </div>
        )}

      </section>


      {/* =======================================================
          HISTORY
      ======================================================= */}

      <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">

        <div className="flex flex-col gap-3 border-b border-slate-100 p-6 md:flex-row md:items-center md:justify-between dark:border-slate-800">

          <div>

            <h2 className="text-lg font-black text-slate-900 dark:text-white">
              سجل المداخيل
            </h2>

            <p className="mt-1 text-xs text-slate-400">
              كل المبالغ المسجلة خلال السنة الدراسية {selectedYear}
            </p>

          </div>


          <div className="rounded-xl bg-slate-100 px-4 py-2 text-xs font-black text-slate-600 dark:bg-slate-800 dark:text-slate-300">
            {receipts.length} عملية
          </div>

        </div>


        <div className="overflow-x-auto">

          <table className="min-w-[1100px] w-full text-right text-sm">

            <thead className="bg-slate-50 text-xs font-black text-slate-500 dark:bg-slate-800/70 dark:text-slate-300">

              <tr>
                <th className="px-5 py-4">
                  التاريخ
                </th>

                <th className="px-5 py-4">
                  السنة
                </th>

                <th className="px-5 py-4">
                  الفئة
                </th>

                <th className="px-5 py-4">
                  المصدر
                </th>

                <th className="px-5 py-4">
                  طريقة الأداء
                </th>

                <th className="px-5 py-4">
                  المرجع
                </th>

                <th className="px-5 py-4">
                  المبلغ
                </th>

                <th className="px-5 py-4">
                  إجراءات
                </th>
              </tr>

            </thead>


            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">

              {loading ? (

                <tr>
                  <td
                    colSpan={8}
                    className="p-10 text-center font-bold text-slate-400"
                  >
                    جارٍ التحميل...
                  </td>
                </tr>

              ) : receipts.length === 0 ? (

                <tr>
                  <td
                    colSpan={8}
                    className="p-10 text-center font-bold text-slate-400"
                  >
                    لا توجد مداخيل مسجلة لهذه السنة الدراسية.
                  </td>
                </tr>

              ) : (

                receipts.map(
                  (receipt) => (

                    <tr
                      key={
                        receipt.id
                      }
                      className="transition hover:bg-slate-50/70 dark:hover:bg-slate-800/40"
                    >

                      <td className="px-5 py-4 font-bold text-slate-700 dark:text-slate-200">
                        {receipt.dateReception}
                      </td>

                      <td className="px-5 py-4">
                        {receipt.anneeScolaire}
                      </td>

                      <td className="px-5 py-4">

                        <span
                          className={`inline-flex rounded-full border px-3 py-1 text-xs font-black ${getCategoryBadge(
                            receipt.categorieCode
                          )}`}
                        >
                          {receipt.categorieNom}
                        </span>

                      </td>

                      <td className="px-5 py-4">
                        {receipt.source || "-"}
                      </td>

                      <td className="px-5 py-4">
                        {receipt.modePaiement || "-"}
                      </td>

                      <td className="px-5 py-4">
                        {receipt.referencePaiement || "-"}
                      </td>

                      <td className="px-5 py-4 text-base font-black text-emerald-700">
                        {fmtMoney(
                          receipt.montant
                        )}
                      </td>

                      <td className="px-5 py-4">

                        <div className="flex gap-2">

                          <button
                            type="button"
                            onClick={() =>
                              openEditReceipt(
                                receipt
                              )
                            }
                            className="rounded-lg bg-indigo-50 px-3 py-2 text-xs font-black text-indigo-700 transition hover:bg-indigo-100"
                          >
                            تعديل
                          </button>

                          <button
                            type="button"
                            onClick={() =>
                              deleteReceipt(
                                receipt
                              )
                            }
                            className="rounded-lg bg-red-50 px-3 py-2 text-xs font-black text-red-600 transition hover:bg-red-100"
                          >
                            حذف
                          </button>

                        </div>

                      </td>

                    </tr>
                  )
                )
              )}

            </tbody>

          </table>

        </div>

      </section>


      {/* =======================================================
          MODAL RECEIPT
      ======================================================= */}

      <ModalShell
        open={
          receiptModalOpen
        }
        title={
          form.id
            ? "تعديل المدخول"
            : "إضافة مدخول"
        }
        onClose={() =>
          setReceiptModalOpen(
            false
          )
        }
      >

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">

          <label>

            <span className="mb-1.5 block text-xs font-black text-slate-600">
              السنة الدراسية *
            </span>

            <select
              value={
                form.anneeScolaire
              }
              onChange={(e) =>
                setForm(
                  (p) => ({
                    ...p,
                    anneeScolaire:
                      e.target.value,
                  })
                )
              }
              className="h-11 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm font-bold outline-none focus:border-indigo-400"
            >

              {schoolYears.map(
                (year) => (
                  <option
                    key={year}
                    value={year}
                  >
                    {year}
                  </option>
                )
              )}

            </select>

          </label>


          <label>

            <span className="mb-1.5 block text-xs font-black text-slate-600">
              الفئة *
            </span>

            <select
              value={
                form.categorieId
              }
              onChange={(e) =>
                setForm(
                  (p) => ({
                    ...p,
                    categorieId:
                      e.target.value,
                  })
                )
              }
              className="h-11 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm font-bold outline-none focus:border-indigo-400"
            >

              <option value="">
                اختر الفئة
              </option>

              {activeCategories.map(
                (category) => (
                  <option
                    key={
                      category.id
                    }
                    value={
                      category.id
                    }
                  >
                    {category.nom}
                  </option>
                )
              )}

            </select>

          </label>


          <label>

            <span className="mb-1.5 block text-xs font-black text-slate-600">
              المبلغ (DH) *
            </span>

            <input
              type="number"
              min="0"
              step="0.01"
              value={
                form.montant
              }
              onChange={(e) =>
                setForm(
                  (p) => ({
                    ...p,
                    montant:
                      e.target.value,
                  })
                )
              }
              className="h-11 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm font-bold outline-none focus:border-indigo-400"
              placeholder="5000"
            />

          </label>


          <label>

            <span className="mb-1.5 block text-xs font-black text-slate-600">
              تاريخ الاستلام *
            </span>

            <input
              type="date"
              value={
                form.dateReception
              }
              onChange={(e) =>
                setForm(
                  (p) => ({
                    ...p,
                    dateReception:
                      e.target.value,
                  })
                )
              }
              className="h-11 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm font-bold outline-none focus:border-indigo-400"
            />

          </label>


          <label>

            <span className="mb-1.5 block text-xs font-black text-slate-600">
              المصدر
            </span>

            <input
              value={
                form.source
              }
              onChange={(e) =>
                setForm(
                  (p) => ({
                    ...p,
                    source:
                      e.target.value,
                  })
                )
              }
              className="h-11 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm outline-none focus:border-indigo-400"
              placeholder="محسن / شركة / جهة مانحة..."
            />

          </label>


          <label>

            <span className="mb-1.5 block text-xs font-black text-slate-600">
              طريقة الأداء
            </span>

            <select
              value={
                form.modePaiement
              }
              onChange={(e) =>
                setForm(
                  (p) => ({
                    ...p,
                    modePaiement:
                      e.target.value,
                  })
                )
              }
              className="h-11 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm outline-none focus:border-indigo-400"
            >

              <option value="">
                غير محددة
              </option>

              <option value="نقدا">
                نقدا
              </option>

              <option value="تحويل بنكي">
                تحويل بنكي
              </option>

              <option value="شيك">
                شيك
              </option>

              <option value="أخرى">
                أخرى
              </option>

            </select>

          </label>


          <label className="md:col-span-2">

            <span className="mb-1.5 block text-xs font-black text-slate-600">
              المرجع
            </span>

            <input
              value={
                form.referencePaiement
              }
              onChange={(e) =>
                setForm(
                  (p) => ({
                    ...p,
                    referencePaiement:
                      e.target.value,
                  })
                )
              }
              className="h-11 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm outline-none focus:border-indigo-400"
              placeholder="TR-2026-001"
            />

          </label>


          <label className="md:col-span-2">

            <span className="mb-1.5 block text-xs font-black text-slate-600">
              ملاحظات
            </span>

            <textarea
              rows={4}
              value={
                form.note
              }
              onChange={(e) =>
                setForm(
                  (p) => ({
                    ...p,
                    note:
                      e.target.value,
                  })
                )
              }
              className="w-full resize-none rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm outline-none focus:border-indigo-400"
            />

          </label>

        </div>


        <div className="mt-6 flex justify-end gap-2">

          <button
            type="button"
            onClick={() =>
              setReceiptModalOpen(
                false
              )
            }
            className="rounded-xl border border-slate-200 px-5 py-2.5 text-sm font-black text-slate-600"
          >
            إلغاء
          </button>

          <button
            type="button"
            disabled={
              savingReceipt
            }
            onClick={
              saveReceipt
            }
            className="rounded-xl bg-indigo-600 px-6 py-2.5 text-sm font-black text-white transition hover:bg-indigo-700 disabled:opacity-60"
          >
            {savingReceipt
              ? "جارٍ الحفظ..."
              : "حفظ"}
          </button>

        </div>

      </ModalShell>


      {/* =======================================================
          MODAL CATEGORY
      ======================================================= */}

      <ModalShell
        open={
          categoryModalOpen
        }
        title={
          editingCategory
            ? "تعديل الفئة"
            : "إضافة حالة خاصة"
        }
        onClose={() =>
          setCategoryModalOpen(
            false
          )
        }
        width="max-w-lg"
      >

        {editingCategory?.systeme && (

          <div className="mb-4 rounded-xl border border-indigo-100 bg-indigo-50 p-3 text-xs font-bold leading-5 text-indigo-700">
            هذه فئة أساسية في النظام. يمكنك تعديل الاسم والترتيب فقط، ولا يمكن حذفها.
          </div>
        )}


        <div className="space-y-4">

          <label>

            <span className="mb-1.5 block text-xs font-black text-slate-600">
              اسم الفئة *
            </span>

            <input
              value={
                categoryName
              }
              onChange={(e) =>
                setCategoryName(
                  e.target.value
                )
              }
              className="h-11 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm outline-none focus:border-indigo-400"
              placeholder="مثال: مساعدة رمضان"
            />

          </label>


          <label>

            <span className="mb-1.5 block text-xs font-black text-slate-600">
              ترتيب الظهور
            </span>

            <input
              type="number"
              value={
                categoryOrder
              }
              onChange={(e) =>
                setCategoryOrder(
                  e.target.value
                )
              }
              className="h-11 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm outline-none focus:border-indigo-400"
            />

          </label>

        </div>


        <div className="mt-6 flex justify-end gap-2">

          <button
            type="button"
            onClick={() =>
              setCategoryModalOpen(
                false
              )
            }
            className="rounded-xl border border-slate-200 px-5 py-2.5 text-sm font-black text-slate-600"
          >
            إلغاء
          </button>

          <button
            type="button"
            disabled={
              savingCategory
            }
            onClick={
              saveCategory
            }
            className="rounded-xl bg-emerald-600 px-6 py-2.5 text-sm font-black text-white transition hover:bg-emerald-700 disabled:opacity-60"
          >
            {savingCategory
              ? "جارٍ الحفظ..."
              : "حفظ"}
          </button>

        </div>

      </ModalShell>


      {/* =======================================================
          SYSTEM CATEGORIES - PETIT RAPPEL
      ======================================================= */}

      <section className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-800/40">

        <p className="text-xs font-black text-slate-500">
          الفئات الأساسية في النظام:
        </p>

        <div className="mt-2 flex flex-wrap gap-2">

          {systemCategories.map(
            (category) => (

              <span
                key={
                  category.id
                }
                className={`rounded-full border px-3 py-1.5 text-xs font-black ${getCategoryBadge(
                  category.code
                )}`}
              >
                {category.nom}
              </span>
            )
          )}

        </div>

      </section>

    </div>
  );
}
