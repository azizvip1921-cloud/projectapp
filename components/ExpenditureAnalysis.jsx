import { useState, useEffect } from "react";
import { useLanguage } from "@/contexts/LanguageContext";

const ORANGE = "#1D4ED8";

const fmt = (n) => `${Number(n || 0).toLocaleString()} IQD`;
const fmtShort = (n) => {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000)     return `${(n / 1_000).toFixed(0)}K`;
  return String(Math.round(n));
};

const DAY_NAMES = ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"];
const MON_NAMES = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

function flattenRecords(expenses, payroll) {
  const rows = [];
  expenses.forEach(r => {
    if (r.status === "Approved" && r.date)
      rows.push({ date: r.date.split("T")[0], amount: Number(r.amount) || 0 });
  });
  payroll.forEach(r => {
    if (r.status === "Paid") {
      const date = r.payment_date
        ? r.payment_date.split("T")[0]
        : r.month ? `${r.month}-01` : null;
      if (date) rows.push({ date, amount: Number(r.net) || 0 });
    }
  });
  return rows;
}

function buildPoints(records, period) {
  if (period === "weekly") {
    const slots = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      slots.push({ key: d.toISOString().split("T")[0], label: DAY_NAMES[d.getDay()], value: 0 });
    }
    records.forEach(r => {
      const slot = slots.find(s => s.key === r.date);
      if (slot) slot.value += r.amount;
    });
    return slots;
  }

  if (period === "monthly") {
    const slots = [];
    const now = new Date();
    for (let i = 11; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      slots.push({ key, label: `${MON_NAMES[d.getMonth()]} ${String(d.getFullYear()).slice(2)}`, value: 0 });
    }
    records.forEach(r => {
      const slot = slots.find(s => s.key === r.date.slice(0, 7));
      if (slot) slot.value += r.amount;
    });
    return slots;
  }

  if (period === "yearly") {
    const now = new Date().getFullYear();
    const slots = [];
    for (let y = now - 4; y <= now; y++)
      slots.push({ key: String(y), label: String(y), value: 0 });
    records.forEach(r => {
      const slot = slots.find(s => s.key === r.date.slice(0, 4));
      if (slot) slot.value += r.amount;
    });
    return slots;
  }

  return [];
}

function LineChart({ points }) {
  const W = 500, H = 160, PL = 46, PR = 12, PT = 14, PB = 28;
  const iW = W - PL - PR;
  const iH = H - PT - PB;

  const maxVal = Math.max(...points.map(p => p.value), 1);

  const toX = (i) => PL + (i / Math.max(points.length - 1, 1)) * iW;
  const toY = (v) => PT + iH - (v / maxVal) * iH;

  const line = points.map((p, i) =>
    `${i === 0 ? "M" : "L"}${toX(i).toFixed(1)},${toY(p.value).toFixed(1)}`
  ).join(" ");

  const area = `${line} L${toX(points.length - 1).toFixed(1)},${(PT + iH).toFixed(1)} L${toX(0).toFixed(1)},${(PT + iH).toFixed(1)} Z`;

  const yTicks = [0, 0.33, 0.66, 1];

  return (
    <svg width="100%" viewBox={`0 0 ${W} ${H}`} style={{ display: "block", overflow: "visible" }}>
      <defs>
        <linearGradient id="ea-area" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%"   stopColor={ORANGE} stopOpacity="0.25" />
          <stop offset="100%" stopColor={ORANGE} stopOpacity="0"    />
        </linearGradient>
      </defs>

      {yTicks.map(f => {
        const y = PT + iH - f * iH;
        return (
          <g key={f}>
            <line x1={PL} y1={y} x2={W - PR} y2={y}
              style={{ stroke: "var(--hr-border)", strokeWidth: 1 }} />
            <text x={PL - 5} y={y + 3.5} textAnchor="end" fontSize="9"
              style={{ fill: "var(--hr-sub)" }}>
              {fmtShort(maxVal * f)}
            </text>
          </g>
        );
      })}

      <path d={area} fill="url(#ea-area)" />

      <path d={line} fill="none" stroke={ORANGE} strokeWidth="2.2"
        strokeLinecap="round" strokeLinejoin="round" />

      {points.map((p, i) => (
        <circle key={i} cx={toX(i)} cy={toY(p.value)} r="3.5"
          fill={ORANGE} style={{ stroke: "var(--hr-card2)", strokeWidth: 2 }} />
      ))}

      {points.map((p, i) => (
        <text key={i} x={toX(i)} y={H - 4} textAnchor="middle" fontSize="9"
          style={{ fill: "var(--hr-sub)" }}>
          {p.label}
        </text>
      ))}
    </svg>
  );
}

export default function ExpenditureAnalysis() {
  const { t } = useLanguage();
  const [records, setRecords] = useState([]);
  const [period,  setPeriod]  = useState("weekly");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      fetch("/api/expenses").then(r => r.json()),
      fetch("/api/payroll").then(r => r.json()),
    ])
      .then(([exp, pay]) => setRecords(flattenRecords(
        Array.isArray(exp) ? exp : [],
        Array.isArray(pay) ? pay : [],
      )))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const points = buildPoints(records, period);

  const now = new Date();
  const weekStart = new Date(now);
  weekStart.setDate(now.getDate() - 6);
  const weekStartKey = weekStart.toISOString().split("T")[0];

  const totalClaims = records.filter(r => {
    if (period === "weekly")  return r.date >= weekStartKey;
    if (period === "monthly") return r.date.slice(0, 7) === now.toISOString().slice(0, 7);
    if (period === "yearly")  return r.date.slice(0, 4) === String(now.getFullYear());
    return false;
  }).reduce((s, r) => s + r.amount, 0);

  const periodLabel = period === "weekly"
    ? now.toLocaleString("default", { month: "long" }).slice(0, 3) + " (This Week)"
    : period === "monthly"
    ? now.toLocaleString("default", { month: "long" })
    : String(now.getFullYear());

  return (
    <div className="ea-card">

      {/* header row */}
      <div className="ea-header">

        <div className="ea-title-group">
          <div className="ea-icon-wrap">
            <svg width="17" height="17" viewBox="0 0 24 24" fill="none"
              stroke={ORANGE} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
            </svg>
          </div>
          <div>
            <div className="ea-title">{t.ea_title}</div>
            <div className="ea-subtitle">{t.ea_sub}</div>
          </div>
        </div>

        {/* period toggle */}
        <div className="ea-toggle">
          {[
            { value: "weekly",  label: t.ea_weekly  },
            { value: "monthly", label: t.ea_monthly },
            { value: "yearly",  label: t.ea_yearly  },
          ].map(({ value, label }) => (
            <button
              key={value}
              onClick={() => setPeriod(value)}
              className={`ea-toggle-btn${period === value ? " ea-toggle-btn--active" : ""}`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* total stat */}
      <div className="ea-stat">
        <div className="ea-stat-label">
          {t.ea_stat_total} — {periodLabel}
        </div>
        <div className="ea-stat-value">
          {loading ? "—" : fmt(totalClaims)}
        </div>
      </div>

      {/* chart */}
      <div className="ea-chart-wrap">
        {loading
          ? <div className="ea-chart-loading">Loading…</div>
          : <LineChart points={points} />
        }
      </div>

    </div>
  );
}
