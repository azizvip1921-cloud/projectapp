import { useState, useEffect } from "react";
import { useLanguage } from "@/contexts/LanguageContext";

export const AVATAR_COLORS = [
  { bg: "#EFF6FF", color: "#1D4ED8" },
  { bg: "#DCFCE7", color: "#15803D" },
  { bg: "#FEF9C3", color: "#92400E" },
  { bg: "#F3E8FF", color: "#7C3AED" },
  { bg: "#FEE2E2", color: "#DC2626" },
  { bg: "#DBEAFE", color: "#1E40AF" },
];

export const STATUS_CFG = {
  Active:     { bg: "#DCFCE7", color: "#15803D" },
  "On Leave": { bg: "#DBEAFE", color: "#1D4ED8" },
  Suspended:  { bg: "#FEF9C3", color: "#92400E" },
  Inactive:   { bg: "#FEE2E2", color: "#DC2626" },
};

const ATT_STATUS_CFG = {
  Early:      { bg: "#D1FAE5", color: "#065F46" },
  Present:    { bg: "#DCFCE7", color: "#15803D" },
  Late:       { bg: "#FEF9C3", color: "#92400E" },
  Absent:     { bg: "#FEE2E2", color: "#DC2626" },
  "On Leave": { bg: "#DBEAFE", color: "#1D4ED8" },
};

export const DEPT_CFG = {
  IT:         { bg: "#DBEAFE", color: "#1D4ED8" },
  Finance:    { bg: "#DCFCE7", color: "#15803D" },
  HR:         { bg: "#F3E8FF", color: "#7C3AED" },
  Marketing:  { bg: "#FEF9C3", color: "#92400E" },
  Operations: { bg: "#FEE2E2", color: "#DC2626" },
  Design:     { bg: "#FDF4FF", color: "#A21CAF" },
};

export function Badge({ text, cfgMap, fallback = { bg: "#F1F5F9", color: "#64748B" }, display }) {
  const cfg = cfgMap[text] || fallback;
  return (
    <span className="emp-badge" style={{ background: cfg.bg, color: cfg.color }}>
      {display ?? text ?? "—"}
    </span>
  );
}

export function PRow({ label, value }) {
  return (
    <div className="emp-profile-row">
      <span className="emp-profile-label">{label}</span>
      <span className="emp-profile-value">{value}</span>
    </div>
  );
}

export function MiniStat({ val, label, bg, color }) {
  return (
    <div className="emp-mini-stat" style={{ background: bg }}>
      <div className="emp-mini-stat-val" style={{ color }}>{val}</div>
      <div className="emp-mini-stat-label">{label}</div>
    </div>
  );
}

export function getInitials(name) {
  if (!name) return "?";
  return name.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2);
}


export default function EmployeeProfilePanel({
  employee,
  avatarIdx = 0,
  onClose,
  onEdit = null,
  onDeactivate = null,
  onDelete = null,
  onChangePassword = null,
}) {
  const { lang, t, tv } = useLanguage();
  const [tab, setTab] = useState("info");
  const isOpen = !!employee;
  const emp = employee || {};
  const ac = AVATAR_COLORS[avatarIdx % AVATAR_COLORS.length];
  const empId = `EMP-${String(avatarIdx + 1).padStart(3, "0")}`;

  const [empAttendance, setEmpAttendance] = useState([]);
  const [empLeaves, setEmpLeaves] = useState([]);
  const [empDocs, setEmpDocs] = useState([]);

  useEffect(() => {
    if (!employee) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setTab("info");
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setEmpAttendance([]);
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setEmpLeaves([]);
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setEmpDocs([]);
    fetch("/api/attendance")
      .then(r => r.json())
      .then(rows => setEmpAttendance((Array.isArray(rows) ? rows : []).filter(r => r.employee_name === employee.employee_name)))
      .catch(() => {});
    fetch("/api/leaves")
      .then(r => r.json())
      .then(rows => setEmpLeaves((Array.isArray(rows) ? rows : []).filter(r => r.employee_name === employee.employee_name)))
      .catch(() => {});
    fetch("/api/documents")
      .then(r => r.json())
      .then(rows => setEmpDocs((Array.isArray(rows) ? rows : []).filter(d => d.employee === employee.employee_name)))
      .catch(() => {});
  }, [employee?.id]);

  const TYPE_EXT = { PDF: "pdf", Word: "docx", Excel: "xlsx", Image: "jpg", Other: "bin" };
  const TYPE_CFG = {
    PDF:   { bg: "#FEE2E2", color: "#DC2626" },
    Word:  { bg: "#DBEAFE", color: "#1D4ED8" },
    Excel: { bg: "#DCFCE7", color: "#15803D" },
    Image: { bg: "#F3E8FF", color: "#7C3AED" },
    Other: { bg: "#F1F5F9", color: "#64748B" },
  };

  const previewDoc = async (doc) => {
    const ext = TYPE_EXT[doc.type] || "bin";
    const filePath = `/uploads/docs/${doc.id}.${ext}`;
    const res = await fetch(filePath, { method: "HEAD" }).catch(() => null);
    if (res && res.ok) { window.open(filePath, "_blank"); return; }
    const win = window.open("", "_blank");
    win.document.write(`<!DOCTYPE html><html><head><title>${doc.name}</title><link rel="stylesheet" href="/preview-doc.css"></head><body>
      <h1>${doc.name}</h1>
      <div class="sub">HR System — Document Record</div>
      <table>
        <tr><td>Document Name</td><td>${doc.name}</td></tr>
        <tr><td>Employee</td><td>${doc.employee}</td></tr>
        <tr><td>Department</td><td>${doc.dept || "—"}</td></tr>
        <tr><td>File Type</td><td>${doc.type}</td></tr>
        <tr><td>File Size</td><td>${doc.size || "—"}</td></tr>
        <tr><td>Date</td><td>${String(doc.date).slice(0, 10)}</td></tr>
      </table>
      <br/><button onclick="window.print()" class="print-btn">Print / Save as PDF</button>
    </body></html>`);
    win.document.close();
  };

  const now = new Date();
  const thisMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  const monthAtt = empAttendance.filter(r => r.date && (r.date.slice ? r.date.slice(0, 7) : "") === thisMonth);
  const attPresent = monthAtt.filter(r => r.status === "Present").length;
  const attAbsent  = monthAtt.filter(r => r.status === "Absent").length;
  const attLate    = monthAtt.filter(r => r.status === "Late").length;
  const todayStr   = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,"0")}-${String(now.getDate()).padStart(2,"0")}`;
  const todayRec   = empAttendance.find(r => r.date && (r.date.split ? r.date.split("T")[0] : r.date) === todayStr);

  // رۆژەکانی مۆڵەت: لە داواکاریەکانی پەسەندکراو بژمێرە بۆ مانگی ئێستا
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const monthEnd   = new Date(now.getFullYear(), now.getMonth() + 1, 0);
  const leaveDaysThisMonth = empLeaves
    .filter(l => l.status === "Approved" && l.start_date && l.end_date)
    .reduce((sum, l) => {
      const from = new Date(l.start_date) < monthStart ? monthStart : new Date(l.start_date);
      const to   = new Date(l.end_date)   > monthEnd   ? monthEnd   : new Date(l.end_date);
      return from <= to ? sum + Math.round((to - from) / 86400000) + 1 : sum;
    }, 0);
  const attLeave = Math.max(leaveDaysThisMonth, monthAtt.filter(r => r.status === "On Leave").length);

  const isRtl = lang === "ku" || lang === "ar";

  const TABS = ["info", "attendance", "leaves", "docs"];
  const TAB_LABELS = { info: t.prof_tab_info, attendance: t.prof_tab_attendance, leaves: t.prof_tab_leaves, docs: t.prof_tab_docs };
  return (
    <>
      {/* Backdrop */}
      <div
        onClick={onClose}
        className={`emp-backdrop ${isOpen ? "open" : "closed"}`}
      />

      {/* Panel */}
      <div
        className="emp-panel"
        data-rtl={isRtl || undefined}
        data-open={isOpen || undefined}
      >
        {/* Blue gradient header */}
        <div className="emp-panel-hdr">
          <button
            onClick={onClose}
            className="emp-panel-close"
          >✕</button>

          {/* Avatar */}
          <div
            className="emp-panel-avatar"
            style={{ background: emp.image ? "transparent" : ac.bg, color: ac.color }}
          >
            {emp.image
              ? <img src={emp.image} alt={emp.employee_name} />
              : getInitials(emp.employee_name)
            }
          </div>
          <div className="emp-panel-emp-name">{emp.employee_name || "—"}</div>
          <div className="emp-panel-emp-sub">{emp.type_of_job || "—"} · {empId}</div>
        </div>

        {/* Tabs */}
        <div className="emp-panel-tabs">
          {TABS.map(tabKey => (
            <button
              key={tabKey}
              onClick={() => setTab(tabKey)}
              className={`emp-panel-tab${tab === tabKey ? " active" : ""}`}
            >
              {TAB_LABELS[tabKey]}
            </button>
          ))}

        </div>

        {/* Body */}
        <div className="emp-panel-body">

          {/* INFO */}
          {tab === "info" && (
            <>
              <div className="emp-panel-section">
                <div className="emp-panel-section-title">{t.prof_personal_details}</div>
                <PRow label={t.prof_emp_id}       value={empId} />
                <PRow label={t.prof_department}   value={<Badge text={emp.department} cfgMap={DEPT_CFG} />} />
                <PRow label={t.prof_position}     value={emp.type_of_job || "—"} />
                <PRow label={t.prof_status}       value={<Badge text={emp.status} cfgMap={STATUS_CFG} display={tv(emp.status)} />} />
                <PRow label={t.prof_email}        value={<span className="emp-email-val">{emp.email || "—"}</span>} />
                <PRow label={t.prof_phone}        value={emp.number || "—"} />
                <PRow label={t.prof_gender}       value={emp.gender || "—"} />
                <PRow label={t.prof_city}         value={emp.city || "—"} />
                <PRow label={t.prof_dob}          value={emp.date_of_birth ? new Date(emp.date_of_birth).toLocaleDateString() : "—"} />
              </div>
              <div className="emp-panel-section">
                <div className="emp-panel-section-title">{t.prof_contract_salary}</div>
                <PRow label={t.prof_contract_type} value={tv(emp.contract_type) || "—"} />
                <PRow label={t.prof_hire_date}     value={emp.hire_date ? new Date(emp.hire_date).toLocaleDateString() : "—"} />
                <PRow label={t.prof_base_salary}   value={<span className="emp-salary-val">{emp.salary ? `${Number(emp.salary).toLocaleString()} IQD` : "—"}</span>} />
                <PRow label={t.prof_work_hours}    value={emp.work_start && emp.work_end ? `${emp.work_start} — ${emp.work_end}` : emp.work_start || emp.work_end || "—"} />
              </div>
              {emp.bio && (
                <div className="emp-panel-section">
                  <div className="emp-panel-section-title">{t.prof_biography}</div>
                  <div className="emp-panel-bio-text">{emp.bio}</div>
                </div>
              )}
              {(onEdit || onDeactivate) && (
                <div className="emp-panel-actions">
                  {onEdit && (
                    <button
                      onClick={() => { onClose(); onEdit(emp); }}
                      className="emp-panel-btn-edit"
                    >✎ {t.prof_edit_profile}</button>
                  )}
                  {onDeactivate && (
                    <button
                      onClick={() => onDeactivate(emp)}
                      className="emp-panel-btn-deact"
                    >⊘ {t.prof_deactivate}</button>
                  )}
                </div>
              )}
            </>
          )}

          {/* ATTENDANCE */}
          {tab === "attendance" && (
            <div className="emp-panel-section">
              <div className="emp-panel-section-title">{t.prof_month_summary}</div>
              <div className="emp-stats-grid">
                <MiniStat val={attPresent} label={t.prof_days_present} bg="#DCFCE7" color="#15803D" />
                <MiniStat val={attAbsent}  label={t.prof_days_absent}  bg="#FEE2E2" color="#DC2626" />
                <MiniStat val={attLate}    label={t.prof_days_late}    bg="#FEF9C3" color="#92400E" />
                <MiniStat val={attLeave}   label={t.prof_days_leave}   bg="#DBEAFE" color="#1D4ED8" />
              </div>
              <PRow label={t.prof_todays_status} value={
                todayRec
                  ? <Badge text={todayRec.status} cfgMap={ATT_STATUS_CFG} display={tv(todayRec.status)} />
                  : <span className="emp-no-record">{t.prof_no_record}</span>
              } />
              <PRow label={t.prof_check_in}  value={todayRec?.check_in  || "—"} />
              <PRow label={t.prof_check_out} value={todayRec?.check_out || "—"} />
            </div>
          )}

          {/* LEAVES */}
          {tab === "leaves" && (
            <div className="emp-panel-section">
              <div className="emp-panel-section-title">{t.prof_leave_history}</div>
              {empLeaves.length > 0 ? empLeaves.map((l, i) => {
                const sc = { Approved: { bg: "#DCFCE7", color: "#15803D" }, Pending: { bg: "#FEF9C3", color: "#92400E" }, Rejected: { bg: "#FEE2E2", color: "#DC2626" } }[l.status] || { bg: "#F1F5F9", color: "#64748B" };
                return (
                  <div key={i} className="emp-profile-row emp-leave-row">
                    <div className="emp-leave-row-header">
                      <span className="emp-leave-type">{l.leave_type} {t.prof_leave_lbl}</span>
                      <span className="hr-badge" style={{ background: sc.bg, color: sc.color }}>{tv(l.status)}</span>
                    </div>
                    <div className="emp-leave-dates">
                      {l.start_date ? new Date(l.start_date).toLocaleDateString() : "—"} → {l.end_date ? new Date(l.end_date).toLocaleDateString() : "—"} · {l.days} {t.prof_days_lbl}
                    </div>
                    {l.notes && <div className="emp-leave-notes">{l.notes}</div>}
                  </div>
                );
              }) : (
                <div className="emp-panel-empty">{t.prof_no_leaves}</div>
              )}
            </div>
          )}

          {/* DOCS */}
          {tab === "docs" && (
            <div className="emp-panel-section">
              <div className="emp-panel-section-title">{t.prof_emp_docs}</div>
              {empDocs.length > 0 ? empDocs.map((doc, i) => {
                const tc = TYPE_CFG[doc.type] || TYPE_CFG.Other;
                return (
                  <div key={i} className="emp-doc-item">
                    <div className="emp-doc-icon" style={{ background: tc.bg }}>
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke={tc.color} strokeWidth="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
                    </div>
                    <div className="emp-doc-info">
                      <div className="emp-doc-name">{doc.name}</div>
                      <div className="emp-doc-meta">
                        <span className="emp-doc-type-badge" style={{ background: tc.bg, color: tc.color }}>{doc.type}</span>
                        {" · "}{doc.date ? new Date(doc.date).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }) : "—"}
                      </div>
                    </div>
                    <button
                      onClick={() => previewDoc(doc)}
                      className="emp-doc-preview-btn"
                    >PDF</button>
                  </div>
                );
              }) : (
                <div className="emp-panel-empty">{t.prof_no_docs}</div>
              )}
            </div>
          )}
        </div>
      </div>
    </>
  );
}
