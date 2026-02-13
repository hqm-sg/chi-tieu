/* Trang Quản lý chi tiêu - sử dụng Next.js App Router (client component) */
"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import { Bar } from "react-chartjs-2";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Tooltip,
  Legend,
} from "chart.js";
import ChartDataLabels from "chartjs-plugin-datalabels";
import { PiggyBank, Plus, Trash2, Wallet } from "lucide-react";

ChartJS.register(CategoryScale, LinearScale, BarElement, Tooltip, Legend, ChartDataLabels);

type TransactionType = "Chi tiêu" | "Thu nhập";

interface Transaction {
  id: string;
  name: string;
  amount: number;
  type: TransactionType;
  createdAt: string;
}

const STORAGE_KEY = "expense-tracker-transactions";

const formatCurrencyInput = (value: string) => {
  const digitsOnly = value.replace(/\D/g, "");
  if (!digitsOnly) return "";
  const number = parseInt(digitsOnly, 10);
  if (Number.isNaN(number)) return "";
  return number.toLocaleString("vi-VN");
};

type FilterMode = "all" | "range" | "month";
type ListFilterType = "all" | TransactionType;

const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate(), 0, 0, 0, 0);
const endOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate(), 23, 59, 59, 999);

export default function Home() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [name, setName] = useState("");
  const [amount, setAmount] = useState("");
  const [type, setType] = useState<TransactionType>("Chi tiêu");

  const [filterMode, setFilterMode] = useState<FilterMode>("all");
  const [filterStart, setFilterStart] = useState(""); // yyyy-mm-dd
  const [filterEnd, setFilterEnd] = useState(""); // yyyy-mm-dd
  const [filterMonth, setFilterMonth] = useState(""); // yyyy-mm
  const [listFilter, setListFilter] = useState<ListFilterType>("all");

  // Load dữ liệu từ LocalStorage khi mount
  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as Transaction[];
        if (Array.isArray(parsed)) {
          setTransactions(parsed);
        }
      }
    } catch (error) {
      console.error("Không thể đọc dữ liệu từ LocalStorage:", error);
    }
  }, []);

  // Lưu dữ liệu vào LocalStorage mỗi khi transactions thay đổi
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(transactions));
    } catch (error) {
      console.error("Không thể lưu dữ liệu vào LocalStorage:", error);
    }
  }, [transactions]);

  const handleAddTransaction = (e: React.FormEvent) => {
    e.preventDefault();

    const rawDigits = amount.replace(/\D/g, "");
    const numericAmount = parseInt(rawDigits, 10);
    if (!name.trim() || isNaN(numericAmount) || numericAmount <= 0) {
      return;
    }

    const newTransaction: Transaction = {
      id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
      name: name.trim(),
      amount: numericAmount,
      type,
      createdAt: new Date().toISOString(),
    };

    setTransactions((prev) => [newTransaction, ...prev]);
    setName("");
    setAmount("");
    setType("Chi tiêu");
  };

  const handleDeleteTransaction = (id: string) => {
    setTransactions((prev) => prev.filter((t) => t.id !== id));
  };

  const filteredTransactions = useMemo(() => {
    if (filterMode === "all") return transactions;

    if (filterMode === "month") {
      if (!filterMonth) return transactions;
      const [y, m] = filterMonth.split("-").map((v) => parseInt(v, 10));
      if (!y || !m) return transactions;
      const start = new Date(y, m - 1, 1, 0, 0, 0, 0);
      const end = new Date(y, m, 0, 23, 59, 59, 999); // day 0 of next month = last day of current month
      const startMs = start.getTime();
      const endMs = end.getTime();

      return transactions.filter((t) => {
        const ms = new Date(t.createdAt).getTime();
        return ms >= startMs && ms <= endMs;
      });
    }

    // range
    const start = filterStart ? startOfDay(new Date(filterStart)) : null;
    const end = filterEnd ? endOfDay(new Date(filterEnd)) : null;
    const startMs = start ? start.getTime() : -Infinity;
    const endMs = end ? end.getTime() : Infinity;

    return transactions.filter((t) => {
      const ms = new Date(t.createdAt).getTime();
      return ms >= startMs && ms <= endMs;
    });
  }, [transactions, filterMode, filterMonth, filterStart, filterEnd]);

  const totalExpense = useMemo(
    () =>
      filteredTransactions
        .filter((t) => t.type === "Chi tiêu")
        .reduce((sum, t) => sum + t.amount, 0),
    [filteredTransactions],
  );

  const totalIncome = useMemo(
    () =>
      filteredTransactions
        .filter((t) => t.type === "Thu nhập")
        .reduce((sum, t) => sum + t.amount, 0),
    [filteredTransactions],
  );

  const balance = useMemo(
    () => totalIncome - totalExpense,
    [totalIncome, totalExpense],
  );

  const hasChartData = totalExpense > 0 || totalIncome > 0;

  const visibleListTransactions = useMemo(() => {
    if (listFilter === "all") return filteredTransactions;
    return filteredTransactions.filter((t) => t.type === listFilter);
  }, [filteredTransactions, listFilter]);

  const chartData = useMemo(
    () => ({
      labels: ["Chi tiêu", "Thu nhập"],
      datasets: [
        {
          label: "Số tiền (VND)",
          data: [totalExpense, totalIncome],
          backgroundColor: ["#22c55e", "#16a34a"],
          borderRadius: 8,
          borderSkipped: false as const,
        },
      ],
    }),
    [totalExpense, totalIncome],
  );

  const chartOptions = {
    responsive: true,
    plugins: {
      legend: {
        display: false,
      },
      tooltip: {
        callbacks: {
          label: (context: any) => {
            const value = context.parsed.y ?? 0;
            return `${value.toLocaleString("vi-VN")} VND`;
          },
        },
      },
      datalabels: {
        anchor: "end" as const,
        align: "end" as const,
        color: "#047857",
        font: {
          size: 11,
          weight: "bold" as const,
        },
        formatter: (value: number) =>
          value ? value.toLocaleString("vi-VN") : "",
      },
    },
    scales: {
      x: {
        grid: {
          display: false,
        },
      },
      y: {
        grid: {
          color: "#e5e7eb",
        },
        ticks: {
          callback: (value: any) =>
            Number(value).toLocaleString("vi-VN") + " ₫",
        },
      },
    },
  };

  return (
    <div className="min-h-screen bg-emerald-50/60 py-10 px-4 text-foreground">
      <main className="mx-auto flex max-w-4xl flex-col gap-8 rounded-3xl bg-white/90 p-6 shadow-sm ring-1 ring-emerald-100 backdrop-blur sm:p-8">
        {/* Header */}
        <header className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <div className="relative h-11 w-11 overflow-hidden rounded-2xl bg-emerald-100 shadow-sm">
              <Image
                src="/icons/pig-512.png"
                alt="Biểu tượng heo tiết kiệm"
                fill
                className="object-cover"
                sizes="44px"
              />
            </div>
            <div>
              <h1 className="text-xl font-semibold tracking-tight text-emerald-900 sm:text-2xl">
                Quản lý chi tiêu
              </h1>
              <p className="text-sm text-emerald-700/80">
                Theo dõi thu chi hằng ngày, lưu ngay trên trình duyệt của bạn.
              </p>
            </div>
          </div>
        </header>

        {/* Thống kê nhanh */}
        <section className="grid gap-4 sm:grid-cols-3">
          <div className="rounded-2xl border border-emerald-100 bg-emerald-50/80 p-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium uppercase tracking-wide text-emerald-700/80">
                Số dư hiện tại
              </span>
              <Wallet className="h-4 w-4 text-emerald-500" />
            </div>
            <p className="mt-2 text-lg font-semibold text-emerald-900 sm:text-xl">
              {balance.toLocaleString("vi-VN")} ₫
            </p>
            <p className="mt-1 text-xs text-emerald-700/80">
              Thu nhập − Chi tiêu
            </p>
          </div>

          <div className="rounded-2xl border border-emerald-100 bg-white p-4">
            <span className="text-xs font-medium uppercase tracking-wide text-emerald-700/80">
              Tổng chi tiêu
            </span>
            <p className="mt-2 text-lg font-semibold text-emerald-900 sm:text-xl">
              {totalExpense.toLocaleString("vi-VN")} ₫
            </p>
            <p className="mt-1 text-xs text-emerald-700/80">
              Tất cả khoản chi đã ghi.
            </p>
          </div>

          <div className="rounded-2xl border border-emerald-100 bg-white p-4">
            <span className="text-xs font-medium uppercase tracking-wide text-emerald-700/80">
              Tổng thu nhập
            </span>
            <p className="mt-2 text-lg font-semibold text-emerald-900 sm:text-xl">
              {totalIncome.toLocaleString("vi-VN")} ₫
            </p>
            <p className="mt-1 text-xs text-emerald-700/80">
              Tất cả khoản thu đã ghi.
            </p>
          </div>
        </section>

        {/* Form + Danh sách + Biểu đồ */}
        <section className="grid gap-6 lg:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)]">
          {/* Form & danh sách */}
          <div className="flex flex-col gap-4">
            {/* Bộ lọc ngày/tháng */}
            <div className="rounded-2xl border border-emerald-100 bg-white p-4 sm:p-5">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h2 className="text-sm font-medium text-emerald-900">
                    Bộ lọc ngày tháng
                  </h2>
                  <p className="mt-1 text-xs text-emerald-700/80">
                    Áp dụng cho thống kê, danh sách và biểu đồ.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setFilterMode("all");
                    setFilterStart("");
                    setFilterEnd("");
                    setFilterMonth("");
                  }}
                  className="shrink-0 rounded-xl border border-emerald-100 px-3 py-2 text-xs font-medium text-emerald-700/90 hover:bg-emerald-50"
                >
                  Bỏ lọc
                </button>
              </div>

              <div className="mt-3 grid grid-cols-3 gap-1 rounded-xl bg-emerald-100/60 p-1">
                <button
                  type="button"
                  onClick={() => setFilterMode("all")}
                  className={`rounded-lg px-2 py-1.5 text-xs font-medium transition ${
                    filterMode === "all"
                      ? "bg-white text-emerald-900 shadow-sm"
                      : "text-emerald-700/80"
                  }`}
                >
                  Tất cả
                </button>
                <button
                  type="button"
                  onClick={() => setFilterMode("range")}
                  className={`rounded-lg px-2 py-1.5 text-xs font-medium transition ${
                    filterMode === "range"
                      ? "bg-white text-emerald-900 shadow-sm"
                      : "text-emerald-700/80"
                  }`}
                >
                  Khoảng ngày
                </button>
                <button
                  type="button"
                  onClick={() => setFilterMode("month")}
                  className={`rounded-lg px-2 py-1.5 text-xs font-medium transition ${
                    filterMode === "month"
                      ? "bg-white text-emerald-900 shadow-sm"
                      : "text-emerald-700/80"
                  }`}
                >
                  Theo tháng
                </button>
              </div>

              {filterMode === "range" && (
                <div className="mt-3 grid gap-3 sm:grid-cols-2">
                  <div>
                    <label className="text-xs font-medium text-emerald-800">
                      Từ ngày
                    </label>
                    <input
                      type="date"
                      value={filterStart}
                      onChange={(e) => setFilterStart(e.target.value)}
                      className="mt-1 w-full rounded-xl border border-emerald-100 bg-white px-3 py-2.5 text-sm text-black outline-none ring-0 focus:border-emerald-400 focus:ring-2 focus:ring-emerald-200"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-emerald-800">
                      Đến ngày
                    </label>
                    <input
                      type="date"
                      value={filterEnd}
                      onChange={(e) => setFilterEnd(e.target.value)}
                      className="mt-1 w-full rounded-xl border border-emerald-100 bg-white px-3 py-2.5 text-sm text-black outline-none ring-0 focus:border-emerald-400 focus:ring-2 focus:ring-emerald-200"
                    />
                  </div>
                  <p className="sm:col-span-2 text-xs text-emerald-700/80">
                    Hiển thị:{" "}
                    <span className="font-medium text-emerald-900">
                      {filteredTransactions.length}
                    </span>{" "}
                    / {transactions.length} giao dịch
                  </p>
                </div>
              )}

              {filterMode === "month" && (
                <div className="mt-3 grid gap-3">
                  <div>
                    <label className="text-xs font-medium text-emerald-800">
                      Chọn tháng
                    </label>
                    <input
                      type="month"
                      value={filterMonth}
                      onChange={(e) => setFilterMonth(e.target.value)}
                      className="mt-1 w-full rounded-xl border border-emerald-100 bg-white px-3 py-2.5 text-sm text-black outline-none ring-0 focus:border-emerald-400 focus:ring-2 focus:ring-emerald-200"
                    />
                  </div>
                  <p className="text-xs text-emerald-700/80">
                    Hiển thị:{" "}
                    <span className="font-medium text-emerald-900">
                      {filteredTransactions.length}
                    </span>{" "}
                    / {transactions.length} giao dịch
                  </p>
                </div>
              )}

              {filterMode === "all" && (
                <p className="mt-3 text-xs text-emerald-700/80">
                  Hiển thị:{" "}
                  <span className="font-medium text-emerald-900">
                    {filteredTransactions.length}
                  </span>{" "}
                  giao dịch
                </p>
              )}
            </div>

            <div className="rounded-2xl border border-emerald-100 bg-emerald-50/60 p-4 sm:p-5">
              <h2 className="text-sm font-medium text-emerald-900">
                Thêm giao dịch
              </h2>
              <p className="mt-1 text-xs text-emerald-700/80">
                Ghi lại nhanh một khoản chi hoặc thu mới.
              </p>

              <form
                onSubmit={handleAddTransaction}
                className="mt-4 grid gap-3 sm:grid-cols-2"
              >
                <div className="sm:col-span-2">
                  <label className="text-xs font-medium text-emerald-800">
                    Tên giao dịch
                  </label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="VD: Cà phê sáng, Lương tháng..."
                    className="mt-1 w-full rounded-xl border border-emerald-100 bg-white px-3 py-2.5 text-sm text-black outline-none ring-0 placeholder:text-emerald-400 focus:border-emerald-400 focus:ring-2 focus:ring-emerald-200"
                  />
                </div>

                <div>
                  <label className="text-xs font-medium text-emerald-800">
                    Số tiền (VND)
                  </label>
                  <input
                    type="text"
                    value={amount}
                    onChange={(e) => setAmount(formatCurrencyInput(e.target.value))}
                    placeholder="VD: 50000"
                    className="mt-1 w-full rounded-xl border border-emerald-100 bg-white px-3 py-2.5 text-sm text-black outline-none ring-0 placeholder:text-emerald-400 focus:border-emerald-400 focus:ring-2 focus:ring-emerald-200"
                  />
                </div>

                <div>
                  <label className="text-xs font-medium text-emerald-800">
                    Loại
                  </label>
                  <div className="mt-1 grid grid-cols-2 gap-1 rounded-xl bg-emerald-100/60 p-1">
                    <button
                      type="button"
                      onClick={() => setType("Chi tiêu")}
                      className={`rounded-lg px-2 py-1.5 text-xs font-medium transition ${
                        type === "Chi tiêu"
                          ? "bg-white text-emerald-900 shadow-sm"
                          : "text-emerald-700/80"
                      }`}
                    >
                      Chi tiêu
                    </button>
                    <button
                      type="button"
                      onClick={() => setType("Thu nhập")}
                      className={`rounded-lg px-2 py-1.5 text-xs font-medium transition ${
                        type === "Thu nhập"
                          ? "bg-white text-emerald-900 shadow-sm"
                          : "text-emerald-700/80"
                      }`}
                    >
                      Thu nhập
                    </button>
                  </div>
                </div>

                <div className="sm:col-span-2 flex items-end justify-end">
                  <button
                    type="submit"
                    className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-500 px-4 py-2.5 text-sm font-medium text-white shadow-sm transition hover:bg-emerald-600 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-300"
                  >
                    <Plus className="h-4 w-4" />
                    Lưu giao dịch
                  </button>
                </div>
              </form>
            </div>

            <div className="rounded-2xl border border-emerald-100 bg-white p-4 sm:p-5">
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-medium text-emerald-900">
                  Danh sách giao dịch
                </h2>
              </div>

              <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
                <div className="inline-flex rounded-xl bg-emerald-100/60 p-1 text-xs font-medium text-emerald-800">
                  <button
                    type="button"
                    onClick={() => setListFilter("all")}
                    className={`rounded-lg px-2 py-1 transition ${
                      listFilter === "all"
                        ? "bg-white text-emerald-900 shadow-sm"
                        : "text-emerald-700/80"
                    }`}
                  >
                    Tất cả
                  </button>
                  <button
                    type="button"
                    onClick={() => setListFilter("Chi tiêu")}
                    className={`rounded-lg px-2 py-1 transition ${
                      listFilter === "Chi tiêu"
                        ? "bg-white text-emerald-900 shadow-sm"
                        : "text-emerald-700/80"
                    }`}
                  >
                    Chi tiêu
                  </button>
                  <button
                    type="button"
                    onClick={() => setListFilter("Thu nhập")}
                    className={`rounded-lg px-2 py-1 transition ${
                      listFilter === "Thu nhập"
                        ? "bg-white text-emerald-900 shadow-sm"
                        : "text-emerald-700/80"
                    }`}
                  >
                    Thu nhập
                  </button>
                </div>
                <span className="text-xs text-emerald-700/80">
                  {visibleListTransactions.length} mục
                </span>
              </div>

              <div className="mt-3 max-h-72 space-y-2 overflow-y-auto pr-1">
                {visibleListTransactions.length === 0 && (
                  <p className="rounded-xl border border-dashed border-emerald-100 bg-emerald-50/40 px-3 py-3 text-xs text-emerald-700/80">
                    Không có giao dịch nào theo bộ lọc hiện tại.
                  </p>
                )}

                {visibleListTransactions.map((t) => {
                  const isExpense = t.type === "Chi tiêu";
                  const date = new Date(t.createdAt);
                  return (
                    <div
                      key={t.id}
                      className="group flex items-center justify-between rounded-xl border border-emerald-100 bg-emerald-50/50 px-3 py-2.5 text-sm hover:border-emerald-200 hover:bg-emerald-50"
                    >
                      <div className="flex flex-1 items-center gap-3">
                        <div
                          className={`flex h-8 w-8 items-center justify-center rounded-xl text-xs font-medium ${
                            isExpense
                              ? "bg-rose-100 text-rose-700"
                              : "bg-emerald-100 text-emerald-700"
                          }`}
                        >
                          {isExpense ? "-" : "+"}
                        </div>
                        <div className="flex-1">
                          <p className="truncate text-sm font-medium text-emerald-950">
                            {t.name}
                          </p>
                          <p className="mt-0.5 text-xs text-emerald-700/80">
                            {t.type} •{" "}
                            {date.toLocaleDateString("vi-VN", {
                              day: "2-digit",
                              month: "2-digit",
                              year: "numeric",
                            })}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3 pl-3">
                        <span
                          className={`text-sm font-semibold ${
                            isExpense ? "text-rose-600" : "text-emerald-600"
                          }`}
                        >
                          {t.amount.toLocaleString("vi-VN")} ₫
                        </span>
                        <button
                          type="button"
                          onClick={() => handleDeleteTransaction(t.id)}
                          className="rounded-full p-1 text-emerald-500 opacity-0 transition hover:bg-emerald-50 hover:text-emerald-700 group-hover:opacity-100"
                          aria-label="Xóa giao dịch"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Biểu đồ tổng quan */}
          <div className="rounded-2xl border border-emerald-100 bg-white p-4 sm:p-5">
            <h2 className="text-sm font-medium text-emerald-900">
              Biểu đồ tổng quan
            </h2>
            <p className="mt-1 text-xs text-emerald-700/80">
              So sánh nhanh tổng chi tiêu và thu nhập.
            </p>

            <div className="mt-4 h-64">
              {hasChartData ? (
                <Bar data={chartData} options={chartOptions} />
              ) : (
                <div className="flex h-full flex-col items-center justify-center rounded-xl border border-dashed border-emerald-100 bg-emerald-50/40 px-4 text-center">
                  <p className="text-sm font-medium text-emerald-900">
                    Chưa đủ dữ liệu để vẽ biểu đồ
                  </p>
                  <p className="mt-1 text-xs text-emerald-700/80">
                    Hãy thêm ít nhất một giao dịch để xem biểu đồ tổng quan.
                  </p>
                </div>
              )}
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
