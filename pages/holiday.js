import { useState, useEffect, useCallback } from "react";
import { useLanguage } from "@/contexts/LanguageContext";
import { toast } from "sonner";

const AVATAR_COLORS = [
  { bg: "#EFF6FF", color: "#1D4ED8" },
  { bg: "#DCFCE7", color: "#15803D" },
  { bg: "#F3E8FF", color: "#7C3AED" },
  { bg: "#FEF9C3", color: "#92400E" },
  { bg: "#FEE2E2", color: "#DC2626" },
  { bg: "#DBEAFE", color: "#1E40AF" },
];

function getInitials(name = "") {
  return name.trim().split(/\s+/).slice(0, 2).map(w => w[0]?.toUpperCase() || "").join("");
}

function formatDate(dateStr) {
  if (!dateStr) return "";
  const plain = typeof dateStr === "string" ? dateStr.slice(0, 10) : new Date(dateStr).toISOString().slice(0, 10);
  const [year, month, day] = plain.split("-").map(Number);
  return new Date(year, month - 1, day).toLocaleDateString(undefined, { year: "numeric", month: "long", day: "numeric" });
}

// ── Holiday Modal ────────────────────────────────────────────────────────────
function HolidayModal({ holiday, t, onClose }) {
  const [employees,  setEmployees]  = useState([]);
  const [loadingEmp, setLoadingEmp] = useState(true);

  useEffect(() => {
    if (!holiday) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setLoadingEmp(true);
    fetch("/api/employee")
      .then(r => r.json())
      .then(d => {
        const list = Array.isArray(d) ? d : (Array.isArray(d?.employees) ? d.employees : []);
        setEmployees(list.filter(e => e.status !== "Inactive" && e.status !== "Suspended"));
        setLoadingEmp(false);
      })
      .catch(() => setLoadingEmp(false));
  }, [holiday]);

  useEffect(() => {
    const fn = (e) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", fn);
    return () => document.removeEventListener("keydown", fn);
  }, [onClose]);

  if (!holiday) return null;

  return (
    <div onClick={onClose} className="hol-modal-overlay">
      <div onClick={e => e.stopPropagation()} className="hol-modal">

        {/* Header */}
        <div className="hol-modal-hdr">
          <button onClick={onClose} className="hol-modal-close">✕</button>

          <div className="hol-modal-hdr-row">
            <div className="hol-modal-icon">
              <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2">
                <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
                <line x1="16" y1="2" x2="16" y2="6"/>
                <line x1="8"  y1="2" x2="8"  y2="6"/>
                <line x1="3"  y1="10" x2="21" y2="10"/>
              </svg>
            </div>
            <div>
              <div className="hol-modal-badge-lbl">{t.hol_badge || "Holiday"}</div>
              <div className="hol-modal-name">{holiday.name}</div>
              <div className="hol-modal-date">{formatDate(holiday.date)}</div>
            </div>
          </div>

          <div className="hol-modal-info">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.9)" strokeWidth="2">
              <circle cx="12" cy="12" r="10"/>
              <line x1="12" y1="8"  x2="12" y2="12"/>
              <line x1="12" y1="16" x2="12.01" y2="16"/>
            </svg>
            <span className="hol-modal-info-txt">
              {t.hol_modal_info || "Attendance is not counted on this day"}
            </span>
          </div>
        </div>

        {/* Employee count bar */}
        <div className="hol-modal-empbar">
          <div className="hol-modal-empbar-row">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#1D4ED8" strokeWidth="2">
              <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
              <circle cx="9" cy="7" r="4"/>
              <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
              <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
            </svg>
            <span className="hol-modal-empcnt">
              {t.hol_modal_emp || "Employees on this day"}
            </span>
          </div>
          {!loadingEmp && (
            <span className="hol-modal-empcnt-badge">{employees.length}</span>
          )}
        </div>

        {/* Employees list */}
        <div className="hol-modal-body">
          {loadingEmp ? (
            <div className="hol-loading">
              <div className="hol-spinner" />
            </div>
          ) : employees.length === 0 ? (
            <div className="hol-no-emp">
              {t.lbl_no_data || "No data"}
            </div>
          ) : (
            <div className="hol-emp-list">
              {employees.map((emp, i) => {
                const av = AVATAR_COLORS[i % AVATAR_COLORS.length];
                return (
                  <div key={emp.id || emp.employee_name} className="hol-modal-emprow">
                    {emp.image ? (
                      <img
                        src={emp.image}
                        alt={emp.employee_name}
                        className="hol-emp-img"
                      />
                    ) : (
                      <div
                        className="hol-avatar"
                        style={{ background: av.bg, color: av.color, border: `2px solid ${av.color}33` }}
                      >
                        {getInitials(emp.employee_name)}
                      </div>
                    )}
                    <div className="hol-emp-info">
                      <div className="hol-emp-name">{emp.employee_name}</div>
                      {(emp.department || emp.type_of_job) && (
                        <div className="hol-emp-dept">
                          {[emp.department, emp.type_of_job].filter(Boolean).join(" · ")}
                        </div>
                      )}
                    </div>
                    <span className="hol-emp-badge">{t.hol_badge || "Holiday"}</span>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Holiday Page ─────────────────────────────────────────────────────────────
export default function HolidayPage() {
  const { t } = useLanguage();

  const [holidays,        setHolidays]        = useState([]);
  const [loading,         setLoading]         = useState(true);
  const [adding,          setAdding]          = useState(false);
  const [deleting,        setDeleting]        = useState(null);
  const [newDate,         setNewDate]         = useState("");
  const [newName,         setNewName]         = useState("");
  const [selectedHoliday, setSelectedHoliday] = useState(null);

  useEffect(() => {
    fetch("/api/holidays", { cache: "no-store" })
      .then(r => r.json())
      .then(d => { setHolidays(Array.isArray(d) ? d : []); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  const addHoliday = async () => {
    if (!newDate || !newName.trim()) return;
    setAdding(true);
    try {
      const res  = await fetch("/api/holidays", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ date: newDate, name: newName.trim() }),
      });
      const json = await res.json();
      if (!res.ok) {
        toast.error(json.duplicate
          ? (t.hol_duplicate || "A holiday already exists for this date")
          : (t.hol_add_err   || "Failed to add holiday"));
        return;
      }
      setHolidays(prev => [...prev, json.holiday].sort((a, b) => a.date.localeCompare(b.date)));
      setNewDate(""); setNewName("");
      toast.success(t.hol_added || "Holiday added");
    } catch {
      toast.error(t.hol_add_err || "Failed to add holiday");
    } finally {
      setAdding(false);
    }
  };

  const deleteHoliday = async (id, e) => {
    e.stopPropagation();
    setDeleting(id);
    try {
      const res = await fetch(`/api/holidays?id=${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error();
      setHolidays(prev => prev.filter(h => h.id !== id));
      if (selectedHoliday?.id === id) setSelectedHoliday(null);
      toast.success(t.hol_deleted || "Holiday removed");
    } catch {
      toast.error(t.hol_del_err || "Failed to remove holiday");
    } finally {
      setDeleting(null);
    }
  };

  const closeModal = useCallback(() => setSelectedHoliday(null), []);

  const canAdd = newDate && newName.trim();

  return (
    <>
      <HolidayModal holiday={selectedHoliday} t={t} onClose={closeModal} />

      <div className="hr-ph">
        <div>
          <div className="hr-pt">{t.hol_title || "Public Holidays"}</div>
          <div className="hr-ps">{t.hol_sub || "Set specific dates as holidays — attendance won't be counted"}</div>
        </div>
      </div>

      <div className="flex flex-1 flex-col gap-4 p-4 shiny-ring">
        <div className="hol-card">

          {/* Section header */}
          <div className="hol-sec-header">
            <div className="hol-icon-wrap">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2">
                <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
                <line x1="16" y1="2" x2="16" y2="6"/>
                <line x1="8"  y1="2" x2="8"  y2="6"/>
                <line x1="3"  y1="10" x2="21" y2="10"/>
              </svg>
            </div>
            <div className="hol-sec-info">
              <div className="hol-title">{t.hol_title || "Public Holidays"}</div>
              <div className="hol-sub">{t.hol_sub || "Set specific dates as holidays — attendance won't be counted"}</div>
            </div>
            {!loading && (
              <div className="hol-count-badge">{holidays.length}</div>
            )}
          </div>

          <div className="hol-body-pad">

            {/* Add form */}
            <div className="hol-add-box">
              <div className="hol-form-label" style={{ marginBottom: 12 }}>
                {t.hol_add || "Add Holiday"}
              </div>
              <div className="hol-form-row">
                <div className="hol-field-date">
                  <label className="hol-form-label">{t.hol_date_label || "Date"}</label>
                  <input
                    type="date"
                    value={newDate}
                    onChange={e => setNewDate(e.target.value)}
                    className="hol-input"
                  />
                </div>
                <div className="hol-field-name">
                  <label className="hol-form-label">{t.hol_name_label || "Holiday Name"}</label>
                  <input
                    type="text"
                    value={newName}
                    onChange={e => setNewName(e.target.value)}
                    placeholder={t.hol_name_ph || "e.g., New Year"}
                    onKeyDown={e => { if (e.key === "Enter") addHoliday(); }}
                    className="hol-input"
                  />
                </div>
                <div className="hol-btn-wrap">
                  <button
                    onClick={addHoliday}
                    disabled={adding || !canAdd}
                    className="hol-add-btn"
                  >
                    {adding ? (
                      <span className="hol-spinner-sm" />
                    ) : (
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                        <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
                      </svg>
                    )}
                    {t.hol_add || "Add"}
                  </button>
                </div>
              </div>
            </div>

            {/* List */}
            {loading ? (
              <div className="hol-no-emp">...</div>
            ) : holidays.length === 0 ? (
              <div className="hol-empty">
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#BFDBFE" strokeWidth="1.5" className="hol-empty-icon">
                  <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
                  <line x1="16" y1="2" x2="16" y2="6"/>
                  <line x1="8"  y1="2" x2="8"  y2="6"/>
                  <line x1="3"  y1="10" x2="21" y2="10"/>
                </svg>
                {t.hol_no_holidays || "No holidays added yet"}
              </div>
            ) : (
              <div className="hol-list">
                {holidays.map((h, i) => (
                  <div
                    key={h.id}
                    onClick={() => setSelectedHoliday(h)}
                    className="hol-item"
                  >
                    <div className="hol-num">{i + 1}</div>

                    <div className="hol-item-info">
                      <div className="hol-name">{h.name}</div>
                      <div className="hol-date">{formatDate(h.date)}</div>
                    </div>

                    <span className="hol-badge">{t.hol_badge || "Holiday"}</span>

                    <button
                      onClick={(e) => deleteHoliday(h.id, e)}
                      disabled={deleting === h.id}
                      className="hol-del-btn"
                    >
                      {deleting === h.id ? (
                        <span className="hol-del-spinner" />
                      ) : (
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                          <polyline points="3 6 5 6 21 6"/>
                          <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/>
                          <path d="M10 11v6M14 11v6"/>
                          <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/>
                        </svg>
                      )}
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
