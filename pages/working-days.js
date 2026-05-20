import { useState, useEffect } from "react";
import { useLanguage } from "@/contexts/LanguageContext";
import { toast } from "sonner";

const DAY_ORDER = ["Saturday", "Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday"];

const DAY_I18N = {
  en: {
    Saturday:"Saturday", Sunday:"Sunday",    Monday:"Monday",
    Tuesday:"Tuesday",   Wednesday:"Wednesday", Thursday:"Thursday", Friday:"Friday",
  },
  ku: {
    Saturday:"شەممە",   Sunday:"یەکشەممە",  Monday:"دووشەممە",
    Tuesday:"سێشەممە",  Wednesday:"چوارشەممە", Thursday:"پێنجشەممە", Friday:"هەینی",
  },
  ar: {
    Saturday:"السبت",   Sunday:"الأحد",     Monday:"الاثنين",
    Tuesday:"الثلاثاء", Wednesday:"الأربعاء",  Thursday:"الخميس",   Friday:"الجمعة",
  },
};

const DAY_SHORT = {
  en: { Saturday:"Sat", Sunday:"Sun", Monday:"Mon", Tuesday:"Tue", Wednesday:"Wed", Thursday:"Thu", Friday:"Fri" },
  ku: { Saturday:"شەم", Sunday:"یەک", Monday:"دوو", Tuesday:"سێ",  Wednesday:"چوار", Thursday:"پێنج", Friday:"هەی" },
  ar: { Saturday:"سبت", Sunday:"أحد", Monday:"اثن", Tuesday:"ثلا", Wednesday:"أرب",  Thursday:"خمي",  Friday:"جمع" },
};

// ── Day Card ────────────────────────────────────────────────────────────────
function DayCard({ dayName, isWorking, isSaving, onToggle, t, lang }) {
  const names  = DAY_I18N[lang] || DAY_I18N.en;
  const shorts = DAY_SHORT[lang] || DAY_SHORT.en;

  return (
    <div className={`wd-day-card${isWorking ? " wd-day-card--on" : ""}`}>
      <div className={`wd-day-icon${isWorking ? " wd-day-icon--on" : ""}`}>
        <span>{shorts[dayName] || dayName.slice(0, 3)}</span>
      </div>
      <div className="wd-day-texts">
        <div className="wd-day-name">
          {names[dayName] || dayName}
        </div>
        <div className={`wd-day-status${isWorking ? " wd-day-status--on" : ""}`}>
          {isWorking ? (t.wd_working || "Working") : (t.wd_off || "Day Off")}
        </div>
      </div>
      <button
        onClick={onToggle}
        disabled={isSaving}
        className={`wd-day-btn${isWorking ? " wd-day-btn--off" : " wd-day-btn--on"}`}
      >
        {isSaving ? "..." : isWorking ? (t.wd_set_off || "Set Off") : (t.wd_set_on || "Set Working")}
      </button>
    </div>
  );
}

// ── Main Page ────────────────────────────────────────────────────────────────
export default function WorkingDays() {
  const { t, lang } = useLanguage();
  const [days,    setDays]    = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving,  setSaving]  = useState(null);

  useEffect(() => {
    fetch("/api/working-days")
      .then(r => r.json())
      .then(d => { setDays(Array.isArray(d) ? d : []); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  const toggle = async (dayName, currentlyWorking) => {
    setSaving(dayName);
    try {
      const res = await fetch("/api/working-days", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ day_name: dayName, is_working: !currentlyWorking }),
      });
      if (!res.ok) throw new Error();
      setDays(prev =>
        prev.map(d => d.day_name === dayName ? { ...d, is_working: currentlyWorking ? 0 : 1 } : d)
      );
      toast.success(t.wd_saved || "Settings saved");
    } catch {
      toast.error(t.wd_save_err || "Failed to save");
    } finally {
      setSaving(null);
    }
  };

  const sorted       = DAY_ORDER.map(n => days.find(d => d.day_name === n)).filter(Boolean);
  const workingCount = sorted.filter(d => d.is_working).length;
  const offCount     = sorted.length - workingCount;

  return (
    <>
      <div className="hr-ph">
        <div>
          <div className="hr-pt">{t.wd_title}</div>
          <div className="hr-ps">{t.wd_sub}</div>
        </div>
      </div>

      <div className="flex flex-1 flex-col gap-4 p-4">

        {/* Summary chips */}
        <div className="wd-chips-row">
          <div className="wd-chip wd-chip--working">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#1D4ED8" strokeWidth="2.5">
              <polyline points="20 6 9 17 4 12"/>
            </svg>
            {workingCount} {t.wd_working_days_count || "working days / week"}
          </div>
          <div className="wd-chip wd-chip--off">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#DC2626" strokeWidth="2.5">
              <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
            {offCount} {t.wd_off_days_count || "days off / week"}
          </div>
        </div>

        {/* Day Cards */}
        {loading ? (
          <div className="wd-loading">
            <div style={{ fontSize: 28, marginBottom: 10 }}>⏳</div>
            {t.lbl_no_data || "Loading..."}
          </div>
        ) : (
          <div className="wd-day-grid">
            {sorted.map(day => (
              <DayCard
                key={day.day_name}
                dayName={day.day_name}
                isWorking={Boolean(day.is_working)}
                isSaving={saving === day.day_name}
                onToggle={() => toggle(day.day_name, Boolean(day.is_working))}
                t={t}
                lang={lang}
              />
            ))}
          </div>
        )}

      </div>
    </>
  );
}
