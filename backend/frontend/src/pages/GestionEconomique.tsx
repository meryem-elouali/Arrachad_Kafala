import React, { useCallback, useEffect, useMemo, useState } from "react";
import axios from "axios";
import ExportButtons from "../components/common/ExportButtons";
import type { TableExport } from "../lib/exportTable";

const API = "http://localhost:8080/api";

type Fund = {
  id: number;
  code: string;
  nom: string;
  systeme: boolean;
  active: boolean;
  ordre: number;
};

type Income = {
  id: number;
  anneeScolaire: string;
  fundId: number;
  fundCode: string;
  fundNom: string;
  fundSysteme: boolean;
  montant: number;
  dateReception: string;
  source?: string | null;
  referencePaiement?: string | null;
  modePaiement?: string | null;
  note?: string | null;
  createdAt?: string | null;
};

type FundSummary = {
  fundId: number;
  code: string;
  nom: string;
  systeme: boolean;
  active: boolean;
  entrees: number;
  sortiesEvents: number;
  sortiesSoutien: number;
  sortiesFamilles: number;
  totalSorties: number;
  solde: number;
};

type DashboardSummary = {
  anneeScolaire: string;
  totalEntrees: number;
  totalSorties: number;
  solde: number;
  nonVentile?: number;
  fonds: FundSummary[];
};

type FundOperation = {
  id?: string | number | null;
  type: "ENTREE" | "SORTIE";
  sourceType: "ENTREE" | "EVENT" | "SOUTIEN" | "FAMILLE";
  date?: string | null;
  libelle: string;
  montant: number;
  source?: string | null;
  beneficiaire?: string | null;
  reference?: string | null;
};

type FundDetails = FundSummary & {
  anneeScolaire: string;
  operations: FundOperation[];
};

type IncomeForm = {
  id?: number;
  anneeScolaire: string;
  fundId: string;
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

  return Array.from({ length: 8 }, (_, index) => {
    const start = first - index;
    return `${start}/${start + 1}`;
  });
};

const todayIso = () =>
  new Date().toISOString().slice(0, 10);

const money = (value: unknown) =>
  `${Number(value || 0).toLocaleString("fr-FR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })} DH`;

const formatDate = (value?: string | null) => {
  if (!value) return "-";

  const date = new Date(`${value}T00:00:00`);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat("ar-MA", {
    year: "numeric",
    month: "short",
    day: "numeric",
  }).format(date);
};

const EMPTY_DASHBOARD: DashboardSummary = {
  anneeScolaire: getCurrentSchoolYear(),
  totalEntrees: 0,
  totalSorties: 0,
  solde: 0,
  fonds: [],
};

const SOURCE_LABELS: Record<string, string> = {
  ENTREE: "مدخول",
  EVENT: "نشاط",
  SOUTIEN: "دعم دراسي",
  FAMILLE: "مصروف أسرة",
};

const Modal: React.FC<{
  open: boolean;
  title: string;
  subtitle?: string;
  onClose: () => void;
  children: React.ReactNode;
  width?: string;
}> = ({
  open,
  title,
  subtitle,
  onClose,
  children,
  width = "max-w-2xl",
}) => {
  if (!open) return null;

  return (
    <div
      dir="rtl"
      className="fixed inset-0 z-[9999] flex items-center justify-center bg-slate-950/50 p-4 backdrop-blur-sm"
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
            <p className="text-xs font-black text-indigo-500">
              الإدارة المالية
            </p>

            <h3 className="mt-1 text-xl font-black text-slate-900 dark:text-white">
              {title}
            </h3>

            {subtitle && (
              <p className="mt-1 text-xs font-semibold text-slate-400">
                {subtitle}
              </p>
            )}
          </div>

          <button
            type="button"
            onClick={onClose}
            className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100 text-xl font-black text-slate-500 transition hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300"
          >
            ×
          </button>
        </div>

        <div className="max-h-[calc(92vh-88px)] overflow-y-auto p-6">
          {children}
        </div>
      </div>
    </div>
  );
};

const BigStat: React.FC<{
  label: string;
  value: number;
  subtitle: string;
  className: string;
}> = ({ label, value, subtitle, className }) => (
  <div className={`rounded-3xl border p-5 shadow-sm ${className}`}>
    <p className="text-xs font-black opacity-70">
      {label}
    </p>

    <p className="mt-2 text-2xl font-black">
      {money(value)}
    </p>

    <p className="mt-1 text-[11px] font-bold opacity-60">
      {subtitle}
    </p>
  </div>
);

const FundCard: React.FC<{
  fund: FundSummary;
  onOpen: () => void;
  onAddIncome: () => void;
}> = ({ fund, onOpen, onAddIncome }) => {
  const tone =
    fund.code === "DEGRE_DEFINI"
      ? {
          border: "border-blue-200",
          soft: "bg-blue-50",
          text: "text-blue-700",
          dot: "bg-blue-500",
        }
      : fund.code === "DEGRE_NON_DEFINI"
      ? {
          border: "border-orange-200",
          soft: "bg-orange-50",
          text: "text-orange-700",
          dot: "bg-orange-500",
        }
      : fund.code === "SAAWED_AL_KHAYR"
      ? {
          border: "border-violet-200",
          soft: "bg-violet-50",
          text: "text-violet-700",
          dot: "bg-violet-500",
        }
      : fund.code === "SARATAN"
      ? {
          border: "border-rose-200",
          soft: "bg-rose-50",
          text: "text-rose-700",
          dot: "bg-rose-500",
        }
      : {
          border: "border-emerald-200",
          soft: "bg-emerald-50",
          text: "text-emerald-700",
          dot: "bg-emerald-500",
        };

  return (
    <article
      className={`overflow-hidden rounded-3xl border bg-white shadow-sm transition hover:-translate-y-1 hover:shadow-lg dark:bg-slate-900 ${tone.border}`}
    >
      <div className={`border-b px-5 py-4 ${tone.soft} ${tone.border}`}>
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <span className={`h-2.5 w-2.5 rounded-full ${tone.dot}`} />

              <h3 className={`text-lg font-black ${tone.text}`}>
                {fund.nom}
              </h3>
            </div>

            <p className="mt-1 text-[11px] font-bold text-slate-400">
              {fund.systeme ? "صندوق أساسي" : "صندوق مخصص"}
            </p>
          </div>

          <span
            className={`rounded-full px-2.5 py-1 text-[10px] font-black ${
              fund.solde >= 0
                ? "bg-emerald-100 text-emerald-700"
                : "bg-red-100 text-red-700"
            }`}
          >
            {fund.solde >= 0 ? "رصيد موجب" : "رصيد سالب"}
          </span>
        </div>
      </div>

      <div className="p-5">
        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-2xl bg-emerald-50 p-3">
            <p className="text-[11px] font-black text-emerald-600">
              المداخيل
            </p>

            <p className="mt-1 font-black text-emerald-800">
              {money(fund.entrees)}
            </p>
          </div>

          <div className="rounded-2xl bg-red-50 p-3">
            <p className="text-[11px] font-black text-red-600">
              المصاريف
            </p>

            <p className="mt-1 font-black text-red-800">
              {money(fund.totalSorties)}
            </p>
          </div>
        </div>

        <div className="mt-4 space-y-2">
          <div className="flex items-center justify-between text-xs">
            <span className="font-bold text-slate-500">
              الأنشطة
            </span>

            <strong className="text-slate-800 dark:text-slate-200">
              {money(fund.sortiesEvents)}
            </strong>
          </div>

          <div className="flex items-center justify-between text-xs">
            <span className="font-bold text-slate-500">
              الدعم الدراسي
            </span>

            <strong className="text-slate-800 dark:text-slate-200">
              {money(fund.sortiesSoutien)}
            </strong>
          </div>

          <div className="flex items-center justify-between text-xs">
            <span className="font-bold text-slate-500">
              مساعدات الأسر
            </span>

            <strong className="text-slate-800 dark:text-slate-200">
              {money(fund.sortiesFamilles)}
            </strong>
          </div>
        </div>

        <div className="mt-5 rounded-2xl bg-slate-950 p-4 text-white">
          <div className="flex items-center justify-between">
            <span className="text-xs font-black text-slate-300">
              الرصيد
            </span>

            <strong
              className={`text-xl font-black ${
                fund.solde >= 0 ? "text-emerald-300" : "text-red-300"
              }`}
            >
              {money(fund.solde)}
            </strong>
          </div>
        </div>

        <div className="mt-4 grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={onOpen}
            className="h-11 rounded-xl bg-indigo-600 text-sm font-black text-white transition hover:bg-indigo-700"
          >
            فتح الصندوق
          </button>

          <button
            type="button"
            onClick={onAddIncome}
            className="h-11 rounded-xl bg-emerald-600 text-sm font-black text-white transition hover:bg-emerald-700"
          >
            + مدخول
          </button>
        </div>
      </div>
    </article>
  );
};

export default function GestionEconomique() {
  const schoolYears = useMemo(() => getSchoolYears(), []);

  const [selectedYear, setSelectedYear] =
    useState(getCurrentSchoolYear());

  const [funds, setFunds] =
    useState<Fund[]>([]);

  const [incomes, setIncomes] =
    useState<Income[]>([]);

  const [dashboard, setDashboard] =
    useState<DashboardSummary>(EMPTY_DASHBOARD);

  const [loading, setLoading] =
    useState(true);

  const [error, setError] =
    useState("");

  const [incomeModalOpen, setIncomeModalOpen] =
    useState(false);

  const [savingIncome, setSavingIncome] =
    useState(false);

  const [incomeForm, setIncomeForm] =
    useState<IncomeForm>({
      anneeScolaire: getCurrentSchoolYear(),
      fundId: "",
      montant: "",
      dateReception: todayIso(),
      source: "",
      referencePaiement: "",
      modePaiement: "",
      note: "",
    });

  const [fundModalOpen, setFundModalOpen] =
    useState(false);

  const [editingFund, setEditingFund] =
    useState<Fund | null>(null);

  const [fundName, setFundName] =
    useState("");

  const [fundOrder, setFundOrder] =
    useState("100");

  const [savingFund, setSavingFund] =
    useState(false);

  const [detailModalOpen, setDetailModalOpen] =
    useState(false);

  const [selectedFund, setSelectedFund] =
    useState<FundSummary | null>(null);

  const [fundDetails, setFundDetails] =
    useState<FundDetails | null>(null);

  const [detailLoading, setDetailLoading] =
    useState(false);

  const [operationFilter, setOperationFilter] =
    useState<"ALL" | "ENTREE" | "EVENT" | "SOUTIEN" | "FAMILLE">("ALL");

  const loadFunds =
    useCallback(async () => {
      const res = await axios.get(
        `${API}/economie/fonds`,
        {
          params: {
            includeInactive: true,
          },
        }
      );

      setFunds(
        Array.isArray(res.data)
          ? res.data
          : []
      );
    }, []);

  const loadYearData =
    useCallback(async () => {
      setLoading(true);
      setError("");

      try {
        const [incomeRes, dashboardRes] =
          await Promise.all([
            axios.get(
              `${API}/economie/entrees`,
              {
                params: {
                  anneeScolaire: selectedYear,
                },
              }
            ),

            axios.get(
              `${API}/economie/resume`,
              {
                params: {
                  anneeScolaire: selectedYear,
                },
              }
            ),
          ]);

        setIncomes(
          Array.isArray(incomeRes.data)
            ? incomeRes.data
            : []
        );

        setDashboard({
          ...EMPTY_DASHBOARD,
          ...(dashboardRes.data || {}),
          fonds: Array.isArray(dashboardRes.data?.fonds)
            ? dashboardRes.data.fonds
            : [],
        });
      } catch (e: any) {
        console.error(e);

        setError(
          e?.response?.data?.message ||
            "تعذر تحميل البيانات المالية"
        );
      } finally {
        setLoading(false);
      }
    }, [selectedYear]);

  useEffect(() => {
    void loadFunds();
  }, [loadFunds]);

  useEffect(() => {
    void loadYearData();
  }, [loadYearData]);

  const activeFunds =
    useMemo(
      () => funds.filter((fund) => fund.active),
      [funds]
    );

  const resetIncome = (preferredFundId?: number) => {
    const first =
      preferredFundId
        ? activeFunds.find(
            (f) => f.id === preferredFundId
          )
        : activeFunds[0];

    setIncomeForm({
      anneeScolaire: selectedYear,
      fundId: first ? String(first.id) : "",
      montant: "",
      dateReception: todayIso(),
      source: "",
      referencePaiement: "",
      modePaiement: "",
      note: "",
    });
  };

  const openNewIncome = (preferredFundId?: number) => {
    resetIncome(preferredFundId);
    setIncomeModalOpen(true);
  };

  const editIncome = (income: Income) => {
    setIncomeForm({
      id: income.id,
      anneeScolaire: income.anneeScolaire,
      fundId: String(income.fundId),
      montant: String(income.montant),
      dateReception: income.dateReception,
      source: income.source || "",
      referencePaiement: income.referencePaiement || "",
      modePaiement: income.modePaiement || "",
      note: income.note || "",
    });

    setIncomeModalOpen(true);
  };

  const saveIncome = async () => {
    if (!incomeForm.fundId) {
      alert("اختر الصندوق");
      return;
    }

    if (
      !incomeForm.montant ||
      Number(incomeForm.montant) <= 0
    ) {
      alert("أدخل مبلغا صحيحا");
      return;
    }

    if (!incomeForm.dateReception) {
      alert("أدخل تاريخ الاستلام");
      return;
    }

    setSavingIncome(true);

    try {
      const payload = {
        anneeScolaire: incomeForm.anneeScolaire,
        fundId: Number(incomeForm.fundId),
        montant: Number(incomeForm.montant),
        dateReception: incomeForm.dateReception,
        source: incomeForm.source.trim(),
        referencePaiement:
          incomeForm.referencePaiement.trim(),
        modePaiement:
          incomeForm.modePaiement.trim(),
        note: incomeForm.note.trim(),
      };

      if (incomeForm.id) {
        await axios.put(
          `${API}/economie/entrees/${incomeForm.id}`,
          payload
        );
      } else {
        await axios.post(
          `${API}/economie/entrees`,
          payload
        );
      }

      setIncomeModalOpen(false);

      await loadYearData();
    } catch (e: any) {
      alert(
        e?.response?.data?.message ||
          "تعذر حفظ المدخول"
      );
    } finally {
      setSavingIncome(false);
    }
  };

  const deleteIncome = async (income: Income) => {
    if (
      !window.confirm(
        `هل تريد حذف مدخول بقيمة ${money(
          income.montant
        )}؟`
      )
    ) {
      return;
    }

    try {
      await axios.delete(
        `${API}/economie/entrees/${income.id}`
      );

      await loadYearData();
    } catch (e: any) {
      alert(
        e?.response?.data?.message ||
          "تعذر حذف المدخول"
      );
    }
  };

  const openNewFund = () => {
    setEditingFund(null);
    setFundName("");
    setFundOrder("100");
    setFundModalOpen(true);
  };

  const openEditFund = (fund: Fund) => {
    setEditingFund(fund);
    setFundName(fund.nom);
    setFundOrder(String(fund.ordre ?? 100));
    setFundModalOpen(true);
  };

  const saveFund = async () => {
    if (!fundName.trim()) {
      alert("أدخل اسم الصندوق");
      return;
    }

    setSavingFund(true);

    try {
      const payload = {
        nom: fundName.trim(),
        ordre: Number(fundOrder || 100),
        active: editingFund
          ? editingFund.active
          : true,
      };

      if (editingFund) {
        await axios.put(
          `${API}/economie/fonds/${editingFund.id}`,
          payload
        );
      } else {
        await axios.post(
          `${API}/economie/fonds`,
          payload
        );
      }

      setFundModalOpen(false);

      await loadFunds();
      await loadYearData();
    } catch (e: any) {
      alert(
        e?.response?.data?.message ||
          "تعذر حفظ الصندوق"
      );
    } finally {
      setSavingFund(false);
    }
  };

  const disableFund = async (fund: Fund) => {
    if (fund.systeme) return;

    if (
      !window.confirm(
        `تعطيل "${fund.nom}"؟`
      )
    ) {
      return;
    }

    try {
      await axios.delete(
        `${API}/economie/fonds/${fund.id}`
      );

      await loadFunds();
      await loadYearData();
    } catch (e: any) {
      alert(
        e?.response?.data?.message ||
          "تعذر تعطيل الصندوق"
      );
    }
  };

  const reactivateFund = async (fund: Fund) => {
    try {
      await axios.put(
        `${API}/economie/fonds/${fund.id}`,
        {
          nom: fund.nom,
          ordre: fund.ordre,
          active: true,
        }
      );

      await loadFunds();
      await loadYearData();
    } catch (e: any) {
      alert(
        e?.response?.data?.message ||
          "تعذر تفعيل الصندوق"
      );
    }
  };

  const openFundDetails = async (fund: FundSummary) => {
    setSelectedFund(fund);
    setDetailModalOpen(true);
    setDetailLoading(true);
    setOperationFilter("ALL");

    try {
      const res = await axios.get(
        `${API}/economie/fonds/${fund.fundId}/details`,
        {
          params: {
            anneeScolaire: selectedYear,
          },
        }
      );

      setFundDetails(res.data);
    } catch (e: any) {
      console.error(e);

      alert(
        e?.response?.data?.message ||
          "تعذر تحميل حركات الصندوق"
      );
    } finally {
      setDetailLoading(false);
    }
  };

  const exportFunds = (): TableExport => ({
    kind: "الإدارة المالية",
    title: `وضعية الصناديق — ${selectedYear}`,
    chips: [`السنة الدراسية: ${selectedYear}`],
    summary: [
      { label: "المداخيل", value: money(dashboard.totalEntrees), tone: "green" },
      { label: "المصاريف", value: money(dashboard.totalSorties), tone: "red" },
      { label: "الرصيد", value: money(dashboard.solde), tone: "blue" },
    ],
    sections: [
      {
        title: "الصناديق",
        columns: [
          { label: "الصندوق", align: "start" },
          { label: "المداخيل", money: true, numeric: true },
          { label: "الأنشطة", money: true, numeric: true },
          { label: "الدعم الدراسي", money: true, numeric: true },
          { label: "مصاريف الأسر", money: true, numeric: true },
          { label: "مجموع المصاريف", money: true, numeric: true },
          { label: "الرصيد", money: true, numeric: true },
        ],
        rows: dashboard.fonds.map((f) => [
          f.nom,
          f.entrees,
          f.sortiesEvents,
          f.sortiesSoutien,
          f.sortiesFamilles,
          f.totalSorties,
          f.solde,
        ]),
        totals: ["المجموع", dashboard.totalEntrees, "", "", "", dashboard.totalSorties, dashboard.solde],
      },
    ],
    fileName: `الصناديق_${selectedYear.replace("/", "-")}`,
    orientation: "landscape",
  });

  const exportIncomes = (): TableExport => ({
    kind: "الإدارة المالية",
    title: `سجل المداخيل — ${selectedYear}`,
    chips: [`السنة الدراسية: ${selectedYear}`],
    summary: [
      { label: "عدد العمليات", value: String(incomes.length), tone: "blue" },
      { label: "المجموع", value: money(incomes.reduce((a, i) => a + Number(i.montant || 0), 0)), tone: "green" },
    ],
    sections: [
      {
        title: "المداخيل",
        columns: [
          { label: "التاريخ" },
          { label: "الصندوق" },
          { label: "المصدر", align: "start" },
          { label: "طريقة الأداء" },
          { label: "المرجع" },
          { label: "ملاحظة", align: "start" },
          { label: "المبلغ", money: true, numeric: true },
        ],
        rows: incomes.map((i) => [
          i.dateReception,
          i.fundNom,
          i.source,
          i.modePaiement,
          i.referencePaiement,
          i.note,
          i.montant,
        ]),
        totals: ["", "", "", "", "", "المجموع", incomes.reduce((a, i) => a + Number(i.montant || 0), 0)],
      },
    ],
    fileName: `المداخيل_${selectedYear.replace("/", "-")}`,
    orientation: "landscape",
  });

  const exportOperations = (): TableExport => {
    const ops = visibleOperations;
    const entrees = ops.filter((o) => o.type === "ENTREE").reduce((a, o) => a + Number(o.montant || 0), 0);
    const sorties = ops.filter((o) => o.type === "SORTIE").reduce((a, o) => a + Number(o.montant || 0), 0);
    return {
      kind: "حركات الصندوق",
      title: `${fundDetails?.nom || ""} — ${selectedYear}`,
      chips: [
        `السنة الدراسية: ${selectedYear}`,
        `العمليات: ${operationFilter === "ALL" ? "الكل" : SOURCE_LABELS[operationFilter] || operationFilter}`,
      ],
      summary: [
        { label: "المداخيل", value: money(entrees), tone: "green" },
        { label: "المصاريف", value: money(sorties), tone: "red" },
        { label: "الرصيد", value: money(fundDetails?.solde ?? 0), tone: "blue" },
      ],
      sections: [
        {
          title: "الحركات",
          columns: [
            { label: "التاريخ" },
            { label: "النوع" },
            { label: "المصدر" },
            { label: "البيان", align: "start" },
            { label: "المستفيد", align: "start" },
            { label: "مدخول", money: true, numeric: true },
            { label: "مصروف", money: true, numeric: true },
          ],
          rows: ops.map((o) => [
            o.date,
            o.type === "ENTREE" ? "مدخول" : "مصروف",
            SOURCE_LABELS[o.sourceType] || o.sourceType,
            o.libelle,
            o.beneficiaire,
            o.type === "ENTREE" ? o.montant : "",
            o.type === "SORTIE" ? o.montant : "",
          ]),
          totals: ["", "", "", "", "المجموع", entrees, sorties],
        },
      ],
      fileName: `حركات_${(fundDetails?.nom || "الصندوق").replace(/\s+/g, "_")}_${selectedYear.replace("/", "-")}`,
      orientation: "landscape",
    };
  };

  const visibleOperations =
    useMemo(() => {
      const list =
        fundDetails?.operations || [];

      if (operationFilter === "ALL") {
        return list;
      }

      return list.filter(
        (operation) =>
          operation.sourceType ===
          operationFilter
      );
    }, [fundDetails, operationFilter]);

  return (
    <div dir="rtl" className="space-y-6">
      <section className="relative overflow-hidden rounded-3xl bg-gradient-to-l from-slate-950 via-indigo-950 to-indigo-700 p-7 text-white shadow-xl">
        <div className="absolute -left-20 -top-20 h-52 w-52 rounded-full bg-white/10 blur-3xl" />

        <div className="relative flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <div className="inline-flex rounded-full border border-white/15 bg-white/10 px-3 py-1.5 text-xs font-black text-indigo-100">
              الإدارة المالية
            </div>

            <h1 className="mt-3 text-3xl font-black">
              إدارة الصناديق
            </h1>

            <p className="mt-2 max-w-3xl text-sm leading-6 text-indigo-100">
              المداخيل تُسجل من طرف المسؤول المالي، أما المصاريف فتصل تلقائيا من الأنشطة والدعم الدراسي ومساعدات الأسر.
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => openNewIncome()}
              className="rounded-xl bg-white px-5 py-3 text-sm font-black text-indigo-800 shadow-lg transition hover:-translate-y-0.5"
            >
              + تسجيل مدخول
            </button>

            <button
              type="button"
              onClick={openNewFund}
              className="rounded-xl border border-white/20 bg-white/10 px-5 py-3 text-sm font-black text-white backdrop-blur transition hover:bg-white/15"
            >
              + إنشاء صندوق
            </button>
          </div>
        </div>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-xs font-bold text-slate-400">
              الفترة المالية
            </p>

            <h2 className="mt-1 text-lg font-black text-slate-900 dark:text-white">
              السنة الدراسية
            </h2>
          </div>

          <select
            value={selectedYear}
            onChange={(e) =>
              setSelectedYear(e.target.value)
            }
            className="h-11 min-w-[210px] rounded-xl border border-slate-200 bg-slate-50 px-4 text-sm font-black outline-none focus:border-indigo-400 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
          >
            {schoolYears.map((year) => (
              <option key={year} value={year}>
                {year}
              </option>
            ))}
          </select>
        </div>
      </section>

      {error && (
        <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm font-black text-red-700">
          {error}
        </div>
      )}

      {Number(dashboard.nonVentile || 0) > 0 && (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm font-bold leading-6 text-amber-800">
          {money(dashboard.nonVentile)} من مصاريف الأنشطة لم تُخصم من أي صندوق
          (نشاط بدون صندوق محدد ولا يمكن توزيعه تلقائيا). اختر صندوقا لهذه
          الأنشطة من صفحة النشاط.
        </div>
      )}

      <section className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <BigStat
          label="إجمالي المداخيل"
          value={dashboard.totalEntrees}
          subtitle="جميع المبالغ المستلمة"
          className="border-emerald-200 bg-emerald-50 text-emerald-800"
        />

        <BigStat
          label="إجمالي المصاريف"
          value={dashboard.totalSorties}
          subtitle="الأنشطة + الدراسة + مساعدات الأسر"
          className="border-red-200 bg-red-50 text-red-800"
        />

        <BigStat
          label="الرصيد الإجمالي"
          value={dashboard.solde}
          subtitle="المداخيل ناقص المصاريف"
          className={
            dashboard.solde >= 0
              ? "border-slate-900 bg-slate-950 text-white"
              : "border-red-900 bg-red-950 text-white"
          }
        />
      </section>

      <section className="rounded-3xl border border-slate-200 bg-slate-50/60 p-5 dark:border-slate-800 dark:bg-slate-950/30">
        <div className="mb-5 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 className="text-xl font-black text-slate-900 dark:text-white">
              الصناديق
            </h2>

            <p className="mt-1 text-xs font-semibold text-slate-400">
              افتح أي صندوق لمعرفة كل المداخيل والمصاريف ومصدر كل عملية.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <ExportButtons build={exportFunds} disabled={loading} compact />
            <span className="w-fit rounded-xl bg-white px-4 py-2 text-xs font-black text-slate-500 shadow-sm dark:bg-slate-900">
              {dashboard.fonds.length} صندوق
            </span>
          </div>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2 xl:grid-cols-4">
            {[1, 2, 3, 4].map((x) => (
              <div
                key={x}
                className="h-[360px] animate-pulse rounded-3xl bg-slate-200/70 dark:bg-slate-800"
              />
            ))}
          </div>
        ) : dashboard.fonds.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center text-sm font-black text-slate-400">
            لا توجد صناديق.
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2 xl:grid-cols-4">
            {dashboard.fonds.map((fund) => (
              <FundCard
                key={fund.fundId}
                fund={fund}
                onOpen={() =>
                  openFundDetails(fund)
                }
                onAddIncome={() =>
                  openNewIncome(fund.fundId)
                }
              />
            ))}
          </div>
        )}
      </section>

      <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div className="flex flex-col gap-3 border-b border-slate-100 p-6 md:flex-row md:items-center md:justify-between dark:border-slate-800">
          <div>
            <h2 className="text-lg font-black text-slate-900 dark:text-white">
              سجل المداخيل
            </h2>

            <p className="mt-1 text-xs text-slate-400">
              المداخيل فقط تُسجل يدويا. المصاريف تُجلب تلقائيا من باقي الوحدات.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <ExportButtons build={exportIncomes} disabled={loading} compact />
            <button
              type="button"
              onClick={() => openNewIncome()}
              className="w-fit rounded-xl bg-emerald-600 px-4 py-2.5 text-xs font-black text-white"
            >
              + مدخول جديد
            </button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-[1050px] w-full text-right text-sm">
            <thead className="bg-slate-50 text-xs font-black text-slate-500 dark:bg-slate-800/70 dark:text-slate-300">
              <tr>
                <th className="px-5 py-4">التاريخ</th>
                <th className="px-5 py-4">الصندوق</th>
                <th className="px-5 py-4">المصدر</th>
                <th className="px-5 py-4">طريقة الأداء</th>
                <th className="px-5 py-4">المرجع</th>
                <th className="px-5 py-4">المبلغ</th>
                <th className="px-5 py-4">إجراءات</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {incomes.length === 0 ? (
                <tr>
                  <td
                    colSpan={7}
                    className="p-10 text-center font-bold text-slate-400"
                  >
                    لا توجد مداخيل مسجلة لهذه السنة.
                  </td>
                </tr>
              ) : (
                incomes.map((income) => (
                  <tr
                    key={income.id}
                    className="transition hover:bg-slate-50 dark:hover:bg-slate-800/40"
                  >
                    <td className="px-5 py-4 font-bold">
                      {formatDate(income.dateReception)}
                    </td>

                    <td className="px-5 py-4">
                      <span className="rounded-full bg-indigo-50 px-3 py-1.5 text-xs font-black text-indigo-700">
                        {income.fundNom}
                      </span>
                    </td>

                    <td className="px-5 py-4">
                      {income.source || "-"}
                    </td>

                    <td className="px-5 py-4">
                      {income.modePaiement || "-"}
                    </td>

                    <td className="px-5 py-4">
                      {income.referencePaiement || "-"}
                    </td>

                    <td className="px-5 py-4 text-base font-black text-emerald-700">
                      + {money(income.montant)}
                    </td>

                    <td className="px-5 py-4">
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={() =>
                            editIncome(income)
                          }
                          className="rounded-lg bg-indigo-50 px-3 py-2 text-xs font-black text-indigo-700"
                        >
                          تعديل
                        </button>

                        <button
                          type="button"
                          onClick={() =>
                            deleteIncome(income)
                          }
                          className="rounded-lg bg-red-50 px-3 py-2 text-xs font-black text-red-600"
                        >
                          حذف
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>

      <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-black text-slate-900 dark:text-white">
              إدارة الصناديق
            </h2>

            <p className="mt-1 text-xs text-slate-400">
              الصناديق الأربعة الأساسية تُنشأ تلقائيا، ويمكن إضافة صناديق أخرى.
            </p>
          </div>

          <button
            type="button"
            onClick={openNewFund}
            className="rounded-xl bg-indigo-600 px-4 py-2.5 text-xs font-black text-white"
          >
            + صندوق جديد
          </button>
        </div>

        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
          {funds.map((fund) => (
            <div
              key={fund.id}
              className={`rounded-2xl border p-4 ${
                fund.active
                  ? "border-slate-200 bg-slate-50"
                  : "border-slate-200 bg-slate-100 opacity-60"
              }`}
            >
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="font-black text-slate-800">
                    {fund.nom}
                  </p>

                  <p className="mt-1 text-[10px] font-bold text-slate-400">
                    {fund.systeme ? "أساسي" : "مخصص"}
                  </p>
                </div>

                <div className="flex gap-1">
                  <button
                    type="button"
                    onClick={() =>
                      openEditFund(fund)
                    }
                    className="rounded-lg bg-white px-2 py-1 text-[10px] font-black text-indigo-600 shadow-sm"
                  >
                    تعديل
                  </button>

                  {!fund.systeme &&
                    (fund.active ? (
                      <button
                        type="button"
                        onClick={() =>
                          disableFund(fund)
                        }
                        className="rounded-lg bg-white px-2 py-1 text-[10px] font-black text-red-500 shadow-sm"
                      >
                        تعطيل
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() =>
                          reactivateFund(fund)
                        }
                        className="rounded-lg bg-white px-2 py-1 text-[10px] font-black text-emerald-600 shadow-sm"
                      >
                        تفعيل
                      </button>
                    ))}
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      <Modal
        open={incomeModalOpen}
        title={
          incomeForm.id
            ? "تعديل المدخول"
            : "تسجيل مدخول"
        }
        subtitle="المداخيل هي الجزء الوحيد الذي يتم إدخاله يدويا هنا."
        onClose={() =>
          setIncomeModalOpen(false)
        }
      >
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <label>
            <span className="mb-1.5 block text-xs font-black text-slate-600">
              السنة الدراسية *
            </span>

            <select
              value={incomeForm.anneeScolaire}
              onChange={(e) =>
                setIncomeForm((p) => ({
                  ...p,
                  anneeScolaire: e.target.value,
                }))
              }
              className="h-11 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 font-bold outline-none"
            >
              {schoolYears.map((year) => (
                <option key={year} value={year}>
                  {year}
                </option>
              ))}
            </select>
          </label>

          <label>
            <span className="mb-1.5 block text-xs font-black text-slate-600">
              الصندوق *
            </span>

            <select
              value={incomeForm.fundId}
              onChange={(e) =>
                setIncomeForm((p) => ({
                  ...p,
                  fundId: e.target.value,
                }))
              }
              className="h-11 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 font-bold outline-none"
            >
              <option value="">
                اختر الصندوق
              </option>

              {activeFunds.map((fund) => (
                <option key={fund.id} value={fund.id}>
                  {fund.nom}
                </option>
              ))}
            </select>
          </label>

          <label>
            <span className="mb-1.5 block text-xs font-black text-slate-600">
              المبلغ *
            </span>

            <input
              type="number"
              min="0"
              step="0.01"
              value={incomeForm.montant}
              onChange={(e) =>
                setIncomeForm((p) => ({
                  ...p,
                  montant: e.target.value,
                }))
              }
              className="h-11 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 font-bold outline-none"
              placeholder="5000"
            />
          </label>

          <label>
            <span className="mb-1.5 block text-xs font-black text-slate-600">
              تاريخ الاستلام *
            </span>

            <input
              type="date"
              value={incomeForm.dateReception}
              onChange={(e) =>
                setIncomeForm((p) => ({
                  ...p,
                  dateReception: e.target.value,
                }))
              }
              className="h-11 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 font-bold outline-none"
            />
          </label>

          <label>
            <span className="mb-1.5 block text-xs font-black text-slate-600">
              مصدر المبلغ
            </span>

            <input
              value={incomeForm.source}
              onChange={(e) =>
                setIncomeForm((p) => ({
                  ...p,
                  source: e.target.value,
                }))
              }
              className="h-11 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 outline-none"
              placeholder="محسن / شركة / جهة مانحة..."
            />
          </label>

          <label>
            <span className="mb-1.5 block text-xs font-black text-slate-600">
              طريقة الأداء
            </span>

            <select
              value={incomeForm.modePaiement}
              onChange={(e) =>
                setIncomeForm((p) => ({
                  ...p,
                  modePaiement: e.target.value,
                }))
              }
              className="h-11 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 outline-none"
            >
              <option value="">
                غير محددة
              </option>
              <option value="نقدا">نقدا</option>
              <option value="تحويل بنكي">تحويل بنكي</option>
              <option value="شيك">شيك</option>
              <option value="أخرى">أخرى</option>
            </select>
          </label>

          <label className="md:col-span-2">
            <span className="mb-1.5 block text-xs font-black text-slate-600">
              المرجع
            </span>

            <input
              value={incomeForm.referencePaiement}
              onChange={(e) =>
                setIncomeForm((p) => ({
                  ...p,
                  referencePaiement: e.target.value,
                }))
              }
              className="h-11 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 outline-none"
            />
          </label>

          <label className="md:col-span-2">
            <span className="mb-1.5 block text-xs font-black text-slate-600">
              ملاحظات
            </span>

            <textarea
              rows={4}
              value={incomeForm.note}
              onChange={(e) =>
                setIncomeForm((p) => ({
                  ...p,
                  note: e.target.value,
                }))
              }
              className="w-full resize-none rounded-xl border border-slate-200 bg-slate-50 p-3 outline-none"
            />
          </label>
        </div>

        <div className="mt-6 flex justify-end gap-2">
          <button
            type="button"
            onClick={() =>
              setIncomeModalOpen(false)
            }
            className="rounded-xl border border-slate-200 px-5 py-2.5 text-sm font-black text-slate-600"
          >
            إلغاء
          </button>

          <button
            type="button"
            disabled={savingIncome}
            onClick={saveIncome}
            className="rounded-xl bg-emerald-600 px-6 py-2.5 text-sm font-black text-white disabled:opacity-60"
          >
            {savingIncome
              ? "جارٍ الحفظ..."
              : "حفظ المدخول"}
          </button>
        </div>
      </Modal>

      <Modal
        open={fundModalOpen}
        title={
          editingFund
            ? "تعديل الصندوق"
            : "إنشاء صندوق"
        }
        onClose={() =>
          setFundModalOpen(false)
        }
        width="max-w-lg"
      >
        {editingFund?.systeme && (
          <div className="mb-4 rounded-xl border border-indigo-100 bg-indigo-50 p-3 text-xs font-bold text-indigo-700">
            هذا صندوق أساسي. يمكن تعديل الاسم والترتيب، لكنه يبقى مفعلا دائما.
          </div>
        )}

        <div className="space-y-4">
          <label>
            <span className="mb-1.5 block text-xs font-black text-slate-600">
              اسم الصندوق *
            </span>

            <input
              value={fundName}
              onChange={(e) =>
                setFundName(e.target.value)
              }
              className="h-11 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 outline-none"
              placeholder="مثال: صندوق رمضان"
            />
          </label>

          <label>
            <span className="mb-1.5 block text-xs font-black text-slate-600">
              ترتيب الظهور
            </span>

            <input
              type="number"
              value={fundOrder}
              onChange={(e) =>
                setFundOrder(e.target.value)
              }
              className="h-11 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 outline-none"
            />
          </label>
        </div>

        <div className="mt-6 flex justify-end gap-2">
          <button
            type="button"
            onClick={() =>
              setFundModalOpen(false)
            }
            className="rounded-xl border border-slate-200 px-5 py-2.5 text-sm font-black text-slate-600"
          >
            إلغاء
          </button>

          <button
            type="button"
            disabled={savingFund}
            onClick={saveFund}
            className="rounded-xl bg-indigo-600 px-6 py-2.5 text-sm font-black text-white disabled:opacity-60"
          >
            {savingFund
              ? "جارٍ الحفظ..."
              : "حفظ"}
          </button>
        </div>
      </Modal>

      <Modal
        open={detailModalOpen}
        title={selectedFund?.nom || "تفاصيل الصندوق"}
        subtitle={`السنة الدراسية ${selectedYear}`}
        onClose={() =>
          setDetailModalOpen(false)
        }
        width="max-w-6xl"
      >
        {detailLoading ? (
          <div className="p-10 text-center font-black text-slate-400">
            جارٍ تحميل الحركات...
          </div>
        ) : fundDetails ? (
          <div className="space-y-6">
            <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
              <BigStat
                label="المداخيل"
                value={fundDetails.entrees}
                subtitle="مسجلة من المسؤول المالي"
                className="border-emerald-200 bg-emerald-50 text-emerald-800"
              />

              <BigStat
                label="إجمالي المصاريف"
                value={fundDetails.totalSorties}
                subtitle="تلقائيا من الوحدات الأخرى"
                className="border-red-200 bg-red-50 text-red-800"
              />

              <BigStat
                label="الرصيد الحالي"
                value={fundDetails.solde}
                subtitle="المداخيل - المصاريف"
                className="border-slate-900 bg-slate-950 text-white"
              />
            </div>

            <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
              <div className="rounded-2xl border border-blue-100 bg-blue-50 p-4">
                <p className="text-xs font-black text-blue-600">
                  مصاريف الأنشطة
                </p>

                <p className="mt-1 text-xl font-black text-blue-800">
                  {money(fundDetails.sortiesEvents)}
                </p>
              </div>

              <div className="rounded-2xl border border-violet-100 bg-violet-50 p-4">
                <p className="text-xs font-black text-violet-600">
                  الدعم الدراسي
                </p>

                <p className="mt-1 text-xl font-black text-violet-800">
                  {money(fundDetails.sortiesSoutien)}
                </p>
              </div>

              <div className="rounded-2xl border border-orange-100 bg-orange-50 p-4">
                <p className="text-xs font-black text-orange-600">
                  مساعدات الأسر
                </p>

                <p className="mt-1 text-xl font-black text-orange-800">
                  {money(fundDetails.sortiesFamilles)}
                </p>
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              {[
                ["ALL", "الكل"],
                ["ENTREE", "المداخيل"],
                ["EVENT", "الأنشطة"],
                ["SOUTIEN", "الدعم الدراسي"],
                ["FAMILLE", "مساعدات الأسر"],
              ].map(([value, label]) => (
                <button
                  key={value}
                  type="button"
                  onClick={() =>
                    setOperationFilter(
                      value as
                        | "ALL"
                        | "ENTREE"
                        | "EVENT"
                        | "SOUTIEN"
                        | "FAMILLE"
                    )
                  }
                  className={`rounded-xl px-4 py-2 text-xs font-black transition ${
                    operationFilter === value
                      ? "bg-slate-900 text-white"
                      : "bg-slate-100 text-slate-600"
                  }`}
                >
                  {label}
                </button>
              ))}

              <div className="mr-auto flex flex-wrap items-center gap-2">
                <ExportButtons build={exportOperations} compact />
                <button
                  type="button"
                  onClick={() =>
                    openNewIncome(fundDetails.fundId)
                  }
                  className="rounded-xl bg-emerald-600 px-4 py-2 text-xs font-black text-white"
                >
                  + إضافة مدخول لهذا الصندوق
                </button>
              </div>
            </div>

            <div className="overflow-hidden rounded-2xl border border-slate-200">
              <div className="overflow-x-auto">
                <table className="min-w-[900px] w-full text-right text-sm">
                  <thead className="bg-slate-50 text-xs font-black text-slate-500">
                    <tr>
                      <th className="px-4 py-3">التاريخ</th>
                      <th className="px-4 py-3">النوع</th>
                      <th className="px-4 py-3">البيان</th>
                      <th className="px-4 py-3">
                        المصدر / المستفيد
                      </th>
                      <th className="px-4 py-3">المرجع</th>
                      <th className="px-4 py-3">المبلغ</th>
                    </tr>
                  </thead>

                  <tbody className="divide-y divide-slate-100">
                    {visibleOperations.length === 0 ? (
                      <tr>
                        <td
                          colSpan={6}
                          className="p-10 text-center font-black text-slate-400"
                        >
                          لا توجد حركات في هذا القسم.
                        </td>
                      </tr>
                    ) : (
                      visibleOperations.map(
                        (operation, index) => (
                          <tr
                            key={`${operation.sourceType}-${operation.id ?? index}`}
                          >
                            <td className="px-4 py-3 font-bold">
                              {formatDate(operation.date)}
                            </td>

                            <td className="px-4 py-3">
                              <span
                                className={`rounded-full px-3 py-1 text-xs font-black ${
                                  operation.type === "ENTREE"
                                    ? "bg-emerald-50 text-emerald-700"
                                    : "bg-red-50 text-red-700"
                                }`}
                              >
                                {SOURCE_LABELS[
                                  operation.sourceType
                                ] || operation.sourceType}
                              </span>
                            </td>

                            <td className="px-4 py-3 font-bold text-slate-700">
                              {operation.libelle}
                            </td>

                            <td className="px-4 py-3 text-slate-500">
                              {operation.source ||
                                operation.beneficiaire ||
                                "-"}
                            </td>

                            <td className="px-4 py-3 text-slate-500">
                              {operation.reference || "-"}
                            </td>

                            <td
                              className={`px-4 py-3 text-base font-black ${
                                operation.type === "ENTREE"
                                  ? "text-emerald-700"
                                  : "text-red-600"
                              }`}
                            >
                              {operation.type === "ENTREE"
                                ? "+"
                                : "-"}{" "}
                              {money(operation.montant)}
                            </td>
                          </tr>
                        )
                      )
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        ) : null}
      </Modal>
    </div>
  );
}
