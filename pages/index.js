import { useState, useEffect } from "react";
import { useLanguage } from "@/contexts/LanguageContext";
import { Users, UserCheck, Calendar, DollarSign, Clock } from "lucide-react";
import ExpenditureAnalysis from "@/components/ExpenditureAnalysis";

const AV_COLORS = [
  { bg: "#EFF6FF", color: "#1D4ED8" }, { bg: "#DCFCE7", color: "#15803D" },
  { bg: "#FEF9C3", color: "#92400E" }, { bg: "#F3E8FF", color: "#7C3AED" },
  { bg: "#FEE2E2", color: "#DC2626" }, { bg: "#DBEAFE", color: "#1E40AF" },
];

const STATUS_CFG = {
  Present:    { bg: "#DCFCE7", color: "#15803D" },
  Late:       { bg: "#FEF9C3", color: "#92400E" },
  Absent:     { bg: "#FEE2E2", color: "#DC2626" },
  "On Leave": { bg: "#DBEAFE", color: "#1D4ED8" },
  Approved:   { bg: "#DCFCE7", color: "#15803D" },
  Pending:    { bg: "#FEF9C3", color: "#92400E" },
  Rejected:   { bg: "#FEE2E2", color: "#DC2626" },
};

function Badge({ text }) {
  const { tv } = useLanguage();
  const c = STATUS_CFG[text] || { bg: "#F1F5F9", color: "#64748B" };
  return <span className="hr-badge" style={{ background: c.bg, color: c.color }}>{tv(text) || "—"}</span>;
}

// ── بار ئەمپلۆیییەکان بەپێی بەش ──
function DeptBar({ label, count, total, bg, color }) {
  const pct = total > 0 ? Math.round((count / total) * 100) : 0;
  return (
    <div className="dash-dept-bar">
      <span className="dash-dept-bar__label">{label}</span>
      <div className="dash-dept-bar__track">
        <div className="dash-dept-bar__fill" style={{ width: `${pct}%`, background: bg }} />
      </div>
      <span className="dash-dept-bar__count" style={{ color }}>{count}</span>
    </div>
  );
}

// ── ڕیزی ئامادەبوون ──
function AttRow({ name, time, status }) {
  return (
    <div className="dash-row">
      <span className="dash-row__name">{name}</span>
      <div className="dash-row__meta">
        {time && <span className="dash-row__time">{time}</span>}
        <Badge text={status} />
      </div>
    </div>
  );
}

// ── ڕیزی مەرخەست ──
function LeaveRow({ name, dept, type, days, status, ac }) {
  return (
    <div className="dash-row">
      <div className="dash-leave-row__left">
        <div className="hr-av" style={{ background: ac.bg, color: ac.color }}>{name?.[0] || "?"}</div>
        <div>
          <div className="dash-leave-row__name">{name}</div>
          <div className="dash-leave-row__sub">{type} · {days} days</div>
        </div>
      </div>
      <Badge text={status} />
    </div>
  );
}

const DEPT_COLORS = [
  { bg: "#3B82F6", color: "#1D4ED8" },
  { bg: "#10B981", color: "#065F46" },
  { bg: "#8B5CF6", color: "#5B21B6" },
  { bg: "#F59E0B", color: "#92400E" },
  { bg: "#EF4444", color: "#991B1B" },
  { bg: "#EC4899", color: "#9D174D" },
];

const getInitials = (name) => { if (!name) return "?"; return name.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2); };

export default function Dashboard() {
  const { t } = useLanguage();
  const [employees,  setEmployees]  = useState([]);
  const [attendance, setAttendance] = useState([]);
  const [leaves,     setLeaves]     = useState([]);
  const [payroll,    setPayroll]    = useState([]);

  useEffect(() => {
    const today = new Date().toISOString().split("T")[0];
    Promise.all([
      fetch("/api/employee").then(r => r.json()),
      fetch("/api/attendance").then(r => r.json()),
      fetch("/api/leaves").then(r => r.json()),
      fetch("/api/payroll").then(r => r.json()),
    ]).then(([emp, att, lv, pay]) => {
      setEmployees(Array.isArray(emp) ? emp : emp.employees || []);
      setAttendance(Array.isArray(att) ? att : []);
      setLeaves(Array.isArray(lv) ? lv : []);
      setPayroll(Array.isArray(pay) ? pay : []);
    }).catch(console.error);
  }, []);

  // ── Stats ──
  const activeEmp   = employees.filter(e => e.status === "Active").length;
  const today       = new Date().toISOString().split("T")[0];
  const todayAtt    = attendance.filter(a => a.date && a.date.split("T")[0] === today);
  const presentToday = todayAtt.filter(a => a.status === "Present" || a.status === "Late").length;
  const pendingLeaves = leaves.filter(l => l.status === "Pending").length;
  const unpaidPayroll = payroll.filter(p => p.status === "Pending").length;

  const toMinutes = (t) => {
    if (!t) return null;
    const parts = t.replace(/.*T/, "").split(":");
    return parseInt(parts[0]) * 60 + parseInt(parts[1]);
  };
  const todayTotalHours = todayAtt.reduce((sum, a) => {
    const inMin = toMinutes(a.check_in);
    const outMin = toMinutes(a.check_out);
    if (inMin == null || outMin == null || outMin <= inMin) return sum;
    return sum + (outMin - inMin) / 60;
  }, 0).toFixed(1);

  // ── Employees by Department ──
  const deptMap = {};
  employees.forEach(e => { if (e.department) deptMap[e.department] = (deptMap[e.department] || 0) + 1; });
  const depts = Object.entries(deptMap).sort((a, b) => b[1] - a[1]);

  // ── Today attendance list (last 6) ──
  const todayList = employees.slice(0, 6).map((emp, i) => {
    const rec = todayAtt.find(a => a.employee_name === emp.employee_name);
    return { name: emp.employee_name, time: rec?.check_in || null, status: rec?.status || "Absent", ac: AV_COLORS[i % AV_COLORS.length] };
  });

  // ── Recent leaves (last 3) ──
  const recentLeaves = [...leaves].sort((a, b) => new Date(b.created_at || b.start_date || 0) - new Date(a.created_at || a.start_date || 0)).slice(0, 3).map((l, i) => ({
    ...l,
    ac: AV_COLORS[i % AV_COLORS.length],
  }));

  return (
    <div className="flex flex-1 flex-col gap-0">
      {/* ── Header ── */}
      <div className="hr-ph">
        <div>
          <div className="hr-pt">{t.dash_title}</div>
          <div className="hr-ps">{t.dash_sub}</div>
        </div>
      </div>

      <div style={{ padding: "0 20px 20px", display: "flex", flexDirection: "column", gap: 14 }}>

        {/* ── 4 Stat Cards ── */}
        <div className="dash-stats-grid">
          <div className="emp-stat-card emp-stat-card--all">
            <div className="emp-stat-card__icon"><Users size={18} /></div>
            <div className="emp-stat-card__count">{activeEmp}</div>
            <div className="emp-stat-card__label">{t.dash_active_emp}</div>
          </div>
          <div className="emp-stat-card emp-stat-card--active">
            <div className="emp-stat-card__icon"><UserCheck size={18} /></div>
            <div className="emp-stat-card__count">{presentToday}/{employees.length}</div>
            <div className="emp-stat-card__label">{t.dash_present_today}</div>
          </div>
          <div className="emp-stat-card emp-stat-card--onleave">
            <div className="emp-stat-card__icon"><Calendar size={18} /></div>
            <div className="emp-stat-card__count">{pendingLeaves}</div>
            <div className="emp-stat-card__label">{t.dash_pending_leaves}</div>
          </div>
          <div className="emp-stat-card emp-stat-card--suspended">
            <div className="emp-stat-card__icon"><DollarSign size={18} /></div>
            <div className="emp-stat-card__count">{unpaidPayroll}</div>
            <div className="emp-stat-card__label">{t.dash_unpaid_payroll}</div>
          </div>
          <div className="emp-stat-card emp-stat-card--purple">
            <div className="emp-stat-card__icon"><Clock size={18} /></div>
            <div className="emp-stat-card__count">{todayTotalHours}</div>
            <div className="emp-stat-card__label">{t.dash_today_hours}</div>
          </div>
        </div>

        {/* ── 2 Column: Dept Chart + Today Attendance ── */}
        <div className="dash-2col">

          {/* Employees by Department */}
          <div className="dash-card">
            <div className="dash-card__title">{t.dash_by_dept}</div>
            {depts.length > 0 ? depts.map(([dept, count], i) => (
              <DeptBar key={dept} label={dept} count={count} total={employees.length} bg={DEPT_COLORS[i % DEPT_COLORS.length].bg} color={DEPT_COLORS[i % DEPT_COLORS.length].color} />
            )) : (
              <div className="dash-no-data">{t.lbl_no_data}</div>
            )}
          </div>

          {/* Today's Attendance */}
          <div className="dash-card">
            <div className="dash-card__title">{t.dash_todays_att}</div>
            {todayList.length > 0 ? todayList.map((row, i) => (
              <AttRow key={i} name={row.name} time={row.time} status={row.status} />
            )) : (
              <div className="dash-no-data">{t.dash_no_employees}</div>
            )}
          </div>
        </div>

        {/* ── Recent Leave Requests ── */}
        <div className="dash-card">
          <div className="dash-card__title">{t.dash_recent_leaves}</div>
          {recentLeaves.length > 0 ? recentLeaves.map((l, i) => (
            <LeaveRow key={i} name={l.employee_name} type={l.leave_type} days={l.days} status={l.status} ac={l.ac} />
          )) : (
            <div className="dash-no-data">{t.dash_no_leaves}</div>
          )}
        </div>

        {/* ── Expenditure Analysis ── */}
        <ExpenditureAnalysis />

      </div>
    </div>
  );
}
