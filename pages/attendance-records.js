import { useState, useEffect } from "react";
import { useLanguage } from "@/contexts/LanguageContext";
import { Users, BarChart3, UserCheck, UserX } from "lucide-react";
import { TableCell, TableRow } from "@/components/ui/table";
import DataTable from "@/components/DataTable";

const AVATAR_COLORS = [
  { bg: "#EFF6FF", color: "#1D4ED8" },
  { bg: "#DCFCE7", color: "#15803D" },
  { bg: "#FEF9C3", color: "#92400E" },
  { bg: "#F3E8FF", color: "#7C3AED" },
  { bg: "#FEE2E2", color: "#DC2626" },
  { bg: "#DBEAFE", color: "#1E40AF" },
];

const MONTH_NAMES_EN = [
  "January","February","March","April","May","June",
  "July","August","September","October","November","December"
];
const MONTH_NAMES_KU = [
  "کانوونی دووەم","شوبات","ئازار","نیسان","ئایار","حوزەیران",
  "تەممووز","ئاب","ئەیلوول","تشرینی یەکەم","تشرینی دووەم","کانوونی یەکەم"
];
const MONTH_NAMES_AR = [
  "يناير","فبراير","مارس","أبريل","مايو","يونيو",
  "يوليو","أغسطس","سبتمبر","أكتوبر","نوفمبر","ديسمبر"
];

function BadgePill({ count, bg, color }) {
  return (
    <span className="rec-badge" style={{ background: bg, color }}>
      {count}
    </span>
  );
}

const STATUS_STYLE = {
  Present:  { bg: "#DCFCE7", color: "#15803D" },
  Early:    { bg: "#DCFCE7", color: "#15803D" },
  Late:     { bg: "#FEF9C3", color: "#92400E" },
  Absent:   { bg: "#FEE2E2", color: "#DC2626" },
  "On Leave": { bg: "#DBEAFE", color: "#1D4ED8" },
};

function StatusPill({ status, label }) {
  const s = STATUS_STYLE[status] || { bg: "#F1F5F9", color: "#64748B" };
  return (
    <span className="rec-status-pill" style={{ background: s.bg, color: s.color }}>
      {label || status}
    </span>
  );
}

function RateBar({ rate }) {
  const barColor = rate >= 80 ? "#22C55E" : rate >= 60 ? "#F59E0B" : "#EF4444";
  const textColor = rate >= 80 ? "#15803D" : rate >= 60 ? "#92400E" : "#DC2626";
  return (
    <div className="rec-rate-wrap">
      <div className="rec-rate-bg">
        <div className="rec-rate-fill" style={{ width: `${rate}%`, background: barColor }} />
      </div>
      <span className="rec-rate-text" style={{ color: textColor }}>{rate}%</span>
    </div>
  );
}


const DAY_NAMES_EN = ["Sunday","Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"];

function getWorkingDaysInMonth(year, month, workingDays, workingDayHistory, startDay = 1) {
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  let count = 0;
  for (let d = startDay; d <= daysInMonth; d++) {
    const dayName = DAY_NAMES_EN[new Date(year, month, d).getDay()];
    const ds = `${year}-${String(month + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
    const hist = (workingDayHistory || []).find(h =>
      h.day_name === dayName &&
      h.start_date.slice(0, 10) <= ds &&
      (!h.end_date || h.end_date.slice(0, 10) > ds)
    );
    if (hist) {
      if (hist.is_working) count++;
    } else {
      const found = workingDays.find(w => w.day_name === dayName);
      if (found && found.is_working) count++;
    }
  }
  return count;
}

export default function AttendanceRecords() {
  const { t, lang } = useLanguage();
  const now = new Date();
  const [records, setRecords]         = useState([]);
  const [employees, setEmployees]     = useState([]);
  const [workingDays, setWorkingDays]             = useState([]);
  const [workingDayHistory, setWorkingDayHistory] = useState([]);
  const [selMonth, setSelMonth]       = useState(now.getMonth());
  const [selYear, setSelYear]         = useState(now.getFullYear());
  const [selectedEmp, setSelectedEmp] = useState(null);

  useEffect(() => {
    fetch("/api/attendance").then(r => r.json()).then(d => setRecords(Array.isArray(d) ? d : []));
    fetch("/api/employee").then(r => r.json()).then(d => setEmployees(Array.isArray(d) ? d : d.employees || []));
    fetch("/api/working-days").then(r => r.json()).then(d => setWorkingDays(Array.isArray(d) ? d : []));
    fetch("/api/working-days?history=1").then(r => r.json()).then(d => setWorkingDayHistory(Array.isArray(d) ? d : []));
  }, []);

  const monthNames = lang === "ku" ? MONTH_NAMES_KU : lang === "ar" ? MONTH_NAMES_AR : MONTH_NAMES_EN;
  const years = [];
  const curYear = now.getFullYear();
  for (let y = curYear; y >= curYear - 2; y--) years.push(y);

  const filtered = records.filter(r => {
    if (!r.date) return false;
    const datePart = r.date.split("T")[0];
    const [y, m] = datePart.split("-").map(Number);
    return (m - 1) === selMonth && y === selYear;
  });

  const summary = employees.map((emp, idx) => {
    const recs     = filtered.filter(r => r.employee_name === emp.employee_name);
    const present  = recs.filter(r => r.status === "Present" || r.status === "Early").length;
    const late     = recs.filter(r => r.status === "Late").length;
    const absent   = recs.filter(r => r.status === "Absent").length;
    const onLeave  = recs.filter(r => r.status === "On Leave").length;

    let startDay = 1;
    if (emp.hire_date) {
      const hire = new Date(emp.hire_date);
      const hireYear = hire.getFullYear();
      const hireMonth = hire.getMonth();
      if (hireYear === selYear && hireMonth === selMonth) {
        startDay = hire.getDate();
      } else if (hireYear > selYear || (hireYear === selYear && hireMonth > selMonth)) {
        startDay = null;
      }
    }
    const total = startDay !== null
      ? getWorkingDaysInMonth(selYear, selMonth, workingDays, workingDayHistory, startDay)
      : 0;
    const attended = present + late;
    const rate     = total > 0 ? Math.round((attended / total) * 100) : 0;
    return {
      id: emp.id,
      employee_name: emp.employee_name,
      department: emp.department || "—",
      image: emp.image || "",
      present, late, absent, onLeave, total, rate,
      ac: AVATAR_COLORS[idx % AVATAR_COLORS.length],
    };
  });

  const avgRate      = summary.length ? Math.round(summary.reduce((s, e) => s + e.rate, 0) / summary.length) : 0;
  const totalPresent = summary.reduce((s, e) => s + e.present + e.late, 0);
  const totalAbsent  = summary.reduce((s, e) => s + e.absent, 0);

  const columns = [
    { key: "num",      label: "#" },
    { key: "employee", label: t.col_employee },
    { key: "dept",     label: t.att_col_dept },
    { key: "present",  label: t.rec_col_present },
    { key: "absent",   label: t.rec_col_absent },
    { key: "late",     label: t.rec_col_late },
    { key: "leave",    label: t.rec_col_leave },
    { key: "rate",     label: t.rec_col_rate },
  ];

  return (
    <>
      {/* ── Page Header ── */}
      <div className="hr-ph">
        <div className="ph-title-group">
          <div className="hr-pt">{t.rec_title}</div>
          <div className="hr-ps">{t.rec_sub}</div>
        </div>
        <div className="ph-main-actions">
          <select
            value={selMonth}
            onChange={e => setSelMonth(Number(e.target.value))}
            className="att-date-input form-btn-cancel"
          >
            {monthNames.map((m, i) => <option key={i} value={i}>{m}</option>)}
          </select>
          <select
            value={selYear}
            onChange={e => setSelYear(Number(e.target.value))}
            className="att-date-input form-btn-cancel"
          >
            {years.map(y => <option key={y} value={y}>{y}</option>)}
          </select>
        </div>
      </div>

      <div className="flex flex-1 flex-col gap-4 p-4 shiny-ring">

        {/* ── Stat Cards ── */}
        <div className="att-stats-grid">
          <div className="emp-stat-card emp-stat-card--all">
            <div className="emp-stat-card__icon"><Users size={18} /></div>
            <div className="emp-stat-card__count">{employees.length}</div>
            <div className="emp-stat-card__label">{t.rec_stat_employees}</div>
          </div>
          <div className="emp-stat-card emp-stat-card--purple">
            <div className="emp-stat-card__icon"><BarChart3 size={18} /></div>
            <div className="emp-stat-card__count">{avgRate}%</div>
            <div className="emp-stat-card__label">{t.rec_stat_avg}</div>
          </div>
          <div className="emp-stat-card emp-stat-card--active">
            <div className="emp-stat-card__icon"><UserCheck size={18} /></div>
            <div className="emp-stat-card__count">{totalPresent}</div>
            <div className="emp-stat-card__label">{t.att_present}</div>
          </div>
          <div className="emp-stat-card emp-stat-card--suspended">
            <div className="emp-stat-card__icon"><UserX size={18} /></div>
            <div className="emp-stat-card__count">{totalAbsent}</div>
            <div className="emp-stat-card__label">{t.att_absent}</div>
          </div>
        </div>

        {/* ── Table ── */}
        <DataTable
          columns={columns}
          data={summary}
          itemLabel="employees"
          renderRow={(emp, index) => (
            <TableRow key={emp.id} className="hover:bg-muted/50">
              <TableCell className="att-cell-num">{index + 1}</TableCell>
              <TableCell className="min-w-[180px]">
                <div className="rec-emp-cell">
                  <div
                    className="rec-emp-avatar"
                    style={{
                      background: emp.image ? "transparent" : emp.ac.bg,
                      color: emp.ac.color,
                    }}
                  >
                    {emp.image
                      ? <img src={emp.image} alt={emp.employee_name} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                      : emp.employee_name.charAt(0).toUpperCase()
                    }
                  </div>
                  <span className="rec-emp-name">{emp.employee_name}</span>
                </div>
              </TableCell>
              <TableCell className="att-cell-dept">{emp.department}</TableCell>
              <TableCell>
                <BadgePill count={emp.present} bg="#DCFCE7" color="#15803D" />
              </TableCell>
              <TableCell>
                <BadgePill count={emp.absent} bg="#FEE2E2" color="#DC2626" />
              </TableCell>
              <TableCell>
                <BadgePill count={emp.late} bg="#FEF9C3" color="#92400E" />
              </TableCell>
              <TableCell>
                <BadgePill count={emp.onLeave} bg="#DBEAFE" color="#1D4ED8" />
              </TableCell>
              <TableCell>
                <div className="rec-rate-cell">
                  <RateBar rate={emp.rate} />
                  <button className="rec-view-btn" onClick={() => setSelectedEmp(emp)}>
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                      <circle cx="12" cy="12" r="3"/>
                    </svg>
                    {t.pay_sal_view}
                  </button>
                </div>
              </TableCell>
            </TableRow>
          )}
        />

      </div>

      {/* ── Employee Detail Modal ── */}
      {selectedEmp && (() => {
        const empRecords = filtered
          .filter(r => r.employee_name === selectedEmp.employee_name)
          .sort((a, b) => new Date(a.date) - new Date(b.date));
        const statusLabel = s => ({
          Present:    t.att_present,
          Early:      t.prof_val_early,
          Late:       t.att_late,
          Absent:     t.att_absent,
          "On Leave": t.rec_col_leave,
        }[s] || s);
        return (
          <div className="hr-modal-overlay">
            <div className="hr-modal-bg" onClick={() => setSelectedEmp(null)} />
            <div className="hr-modal" style={{ maxWidth: 560 }}>
              <button className="hr-modal-close" onClick={() => setSelectedEmp(null)}>✕</button>
              <div className="rec-modal-header">
                <div
                  className="rec-modal-avatar"
                  style={{
                    background: selectedEmp.image ? "transparent" : selectedEmp.ac.bg,
                    color: selectedEmp.ac.color,
                  }}
                >
                  {selectedEmp.image
                    ? <img src={selectedEmp.image} alt={selectedEmp.employee_name} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                    : selectedEmp.employee_name.charAt(0).toUpperCase()
                  }
                </div>
                <div>
                  <div className="rec-modal-name">{selectedEmp.employee_name}</div>
                  <div className="rec-modal-sub">
                    {selectedEmp.department} · {monthNames[selMonth]} {selYear}
                  </div>
                </div>
              </div>
              {empRecords.length === 0 ? (
                <div className="rec-detail-empty">—</div>
              ) : (
                <div className="rec-detail-wrap">
                  <table className="rec-detail-table">
                    <thead>
                      <tr className="rec-detail-thead-tr">
                        {[t.col_date, t.att_col_check_in, t.att_col_check_out, t.col_status].map(h => (
                          <th key={h} className="rec-detail-th">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {empRecords.map((r, i) => (
                        <tr key={i} className="rec-detail-tr">
                          <td className="rec-detail-td rec-detail-td--nowrap">
                            {(() => {
                              if (!r.date) return "—";
                              const [y, m, d] = r.date.split("T")[0].split("-");
                              return `${d}/${m}/${y}`;
                            })()}
                          </td>
                          <td className="rec-detail-td">{r.check_in || "—"}</td>
                          <td className="rec-detail-td">{r.check_out || "—"}</td>
                          <td className="rec-detail-td">
                            <StatusPill status={r.status} label={statusLabel(r.status)} />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        );
      })()}
    </>
  );
}
