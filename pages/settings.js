import { useState, useEffect } from "react";
import { useTheme } from "next-themes";
import { useLanguage } from "@/contexts/LanguageContext";
import { toast } from "sonner";
import {
  Building2, Palette, Database,
  KeyRound, Wifi, Save, RefreshCw, Download, CalendarDays,
  Eye, EyeOff,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

/* ── Working Days constants ── */
const DAY_ORDER = ["Saturday", "Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday"];

const DAY_I18N = {
  en: { Saturday:"Saturday", Sunday:"Sunday", Monday:"Monday", Tuesday:"Tuesday", Wednesday:"Wednesday", Thursday:"Thursday", Friday:"Friday" },
  ku: { Saturday:"شەممە", Sunday:"یەکشەممە", Monday:"دووشەممە", Tuesday:"سێشەممە", Wednesday:"چوارشەممە", Thursday:"پێنجشەممە", Friday:"هەینی" },
  ar: { Saturday:"السبت", Sunday:"الأحد", Monday:"الاثنين", Tuesday:"الثلاثاء", Wednesday:"الأربعاء", Thursday:"الخميس", Friday:"الجمعة" },
};

const DAY_SHORT = {
  en: { Saturday:"Sat", Sunday:"Sun", Monday:"Mon", Tuesday:"Tue", Wednesday:"Wed", Thursday:"Thu", Friday:"Fri" },
  ku: { Saturday:"شەم", Sunday:"یەک", Monday:"دوو", Tuesday:"سێ",  Wednesday:"چوار", Thursday:"پێنج", Friday:"هەی" },
  ar: { Saturday:"سبت", Sunday:"أحد",  Monday:"اثن", Tuesday:"ثلا", Wednesday:"أرب",  Thursday:"خمي",  Friday:"جمع" },
};

const LANG_OPTIONS = [
  { code: "en", label: "English", flag: "🇬🇧" },
  { code: "ku", label: "کوردی",   flag: "🏳️" },
  { code: "ar", label: "العربية", flag: "🇸🇦" },
];

const SECTION_ICONS = {
  company:    { bg: "#EFF6FF", color: "#1D4ED8", Icon: Building2    },
  appearance: { bg: "#FEF9C3", color: "#92400E", Icon: Palette      },
  workdays:   { bg: "#F0FDF4", color: "#15803D", Icon: CalendarDays },
  password:   { bg: "#FEE2E2", color: "#DC2626", Icon: KeyRound     },
  database:   { bg: "#FEF3C7", color: "#B45309", Icon: Database     },
  pwa:        { bg: "#EDE9FE", color: "#6D28D9", Icon: Wifi         },
};

function SectionCard({ id, icon, title, sub, children }) {
  const { bg, color, Icon } = SECTION_ICONS[icon];
  return (
    <div id={id} className="settings-card">
      <div className="settings-card-header">
        <div className="settings-icon-wrap" style={{ background: bg }}>
          <Icon size={18} color={color} />
        </div>
        <div>
          <div className="settings-card-title">{title}</div>
          <div className="settings-card-sub">{sub}</div>
        </div>
      </div>
      {children}
    </div>
  );
}

function SelectionBtn({ active, onClick, children }) {
  return (
    <button className={`settings-sel-btn${active ? " active" : ""}`} onClick={onClick}>
      {children}
    </button>
  );
}

function DayToggle({ dayName, isWorking, isSaving, onToggle, t, lang }) {
  const names  = DAY_I18N[lang]  || DAY_I18N.en;
  const shorts = DAY_SHORT[lang] || DAY_SHORT.en;
  return (
    <div className={`wd-day-card${isWorking ? " wd-day-card--on" : ""}`}>
      <div className={`wd-day-circle${isWorking ? " wd-day-circle--on" : ""}`}>
        <span>{shorts[dayName] || dayName.slice(0, 3)}</span>
      </div>
      <div className="wd-day-name">{names[dayName] || dayName}</div>
      <div className={`wd-day-status${isWorking ? " wd-day-status--on" : ""}`}>
        {isWorking ? (t.wd_working || "Working") : (t.wd_off || "Day Off")}
      </div>
      <button
        className={`wd-day-btn${isWorking ? " wd-day-btn--off" : " wd-day-btn--on"}`}
        onClick={onToggle}
        disabled={isSaving}
      >
        {isSaving ? "…" : isWorking ? (t.wd_set_off || "Set Off") : (t.wd_set_on || "Set Working")}
      </button>
    </div>
  );
}

export default function SettingsPage() {
  const { theme, setTheme } = useTheme();
  const { lang, switchLang, t } = useLanguage();

  /* Company */
  const [company, setCompany] = useState({ name: "", address: "", phone: "", email: "", website: "" });

  /* Password */
  const [pw, setPw]               = useState({ current: "", next: "", confirm: "" });
  const [pwLoading, setPwLoading] = useState(false);
  const [showPw, setShowPw]       = useState({ next: false, confirm: false });

  /* Database */
  const [dbLoading, setDbLoading] = useState(false);

  /* PWA */
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [pwaInstalled,   setPwaInstalled]   = useState(false);

  /* Working Days */
  const [days,   setDays]   = useState([]);
  const [wdLoad, setWdLoad] = useState(true);
  const [saving, setSaving] = useState(null);

  useEffect(() => {
    const hash = window.location.hash;
    if (!hash) return;
    setTimeout(() => {
      const el = document.querySelector(hash);
      if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 120);
  }, []);

  useEffect(() => {
    const saved = localStorage.getItem("company_info");
    if (saved) setCompany(JSON.parse(saved));


    window.addEventListener("beforeinstallprompt", (e) => { e.preventDefault(); setDeferredPrompt(e); });
    window.addEventListener("appinstalled", () => setPwaInstalled(true));

    fetch("/api/working-days")
      .then(r => r.json())
      .then(d => { setDays(Array.isArray(d) ? d : []); setWdLoad(false); })
      .catch(() => setWdLoad(false));
  }, []);

  const saveCompany = () => {
    localStorage.setItem("company_info", JSON.stringify(company));
    toast.success(t.set_company_saved);
  };

  const changePassword = async () => {
    if (!pw.current || !pw.next || !pw.confirm) { toast.warning(t.set_pw_fill); return; }
    if (pw.next !== pw.confirm) { toast.error(t.set_pw_no_match); return; }
    if (pw.next.length < 6)    { toast.error(t.set_pw_short);    return; }
    setPwLoading(true);
    try {
      const user = JSON.parse(localStorage.getItem("hr_user") || "{}");
      const res  = await fetch("/api/auth/change-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: user.id, source: user.source, current: pw.current, next: pw.next }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed");
      toast.success(t.set_pw_changed);
      setPw({ current: "", next: "", confirm: "" });
    } catch (e) { toast.error(e.message); }
    finally     { setPwLoading(false); }
  };

  const setupDB = async () => {
    setDbLoading(true);
    try {
      const res  = await fetch("/api/setup-db", { method: "POST" });
      const data = await res.json();
      if (data.success) toast.success(t.set_db_ready);
      else              toast.error(t.set_db_error);
    } catch { toast.error(t.set_db_connect_error); }
    finally { setDbLoading(false); }
  };

  const installPWA = async () => {
    if (!deferredPrompt) { toast.info(t.set_pwa_chrome); return; }
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === "accepted") { toast.success(t.set_pwa_done); setPwaInstalled(true); }
    setDeferredPrompt(null);
  };

  const toggleDay = async (dayName, currentlyWorking) => {
    setSaving(dayName);
    try {
      const res = await fetch("/api/working-days", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ day_name: dayName, is_working: !currentlyWorking }),
      });
      if (!res.ok) throw new Error();
      setDays(prev => prev.map(d => d.day_name === dayName ? { ...d, is_working: currentlyWorking ? 0 : 1 } : d));
      toast.success(t.wd_saved || "Saved");
    } catch { toast.error(t.wd_save_err || "Failed to save"); }
    finally { setSaving(null); }
  };

  const THEME_OPTIONS = [
    { value: "light", label: t.set_theme_light },
    { value: "dark",  label: t.set_theme_dark  },
  ];

  const companyFields = [
    { key: "name",    label: t.set_company_name, ph: "Tech Solutions Ltd"  },
    { key: "phone",   label: t.set_phone,         ph: "+964 750 000 0000"  },
    { key: "email",   label: t.set_email,         ph: "info@company.com"   },
    { key: "website", label: t.set_website,       ph: "www.company.com"    },
  ];

  const pwFields = [
    { key: "current", label: t.set_current_pw },
    { key: "next",    label: t.set_new_pw     },
    { key: "confirm", label: t.set_confirm_pw },
  ];

  const sorted       = DAY_ORDER.map(n => days.find(d => d.day_name === n)).filter(Boolean);
  const workingCount = sorted.filter(d => d.is_working).length;
  const offCount     = sorted.length - workingCount;

  return (
    <>
      {/* ── Page Header ── */}
      <div className="hr-ph">
        <div>
          <div className="hr-pt">{t.set_title || "Settings"}</div>
          <div className="hr-ps">{t.set_sub   || "Manage your application preferences"}</div>
        </div>
      </div>

      {/* ── Content ── */}
      <div className="flex flex-1 flex-col gap-4 p-4 shiny-ring">
        <div className="settings-inner">

          {/* Company Info */}
          <SectionCard id="settings-company" icon="company" title={t.set_company_title} sub={t.set_company_sub}>
            <div className="rev-form-grid settings-form-grid">
              {companyFields.map(f => (
                <div className="rev-form-field" key={f.key}>
                  <Label className="settings-label">{f.label}</Label>
                  <Input
                    value={company[f.key]}
                    onChange={e => setCompany(p => ({ ...p, [f.key]: e.target.value }))}
                    placeholder={f.ph}
                  />
                </div>
              ))}
              <div className="rev-form-field settings-full-col">
                <Label className="settings-label">{t.set_address}</Label>
                <Input
                  value={company.address}
                  onChange={e => setCompany(p => ({ ...p, address: e.target.value }))}
                  placeholder="Erbil, Kurdistan Region, Iraq"
                />
              </div>
            </div>
            <div className="settings-card-footer">
              <button className="hr-btn" onClick={saveCompany}>
                <Save size={13} /> {t.set_save_company}
              </button>
            </div>
          </SectionCard>

          {/* Appearance */}
          <SectionCard id="settings-appearance" icon="appearance" title={t.set_appearance_title} sub={t.set_appearance_sub}>
            <div className="settings-pref-row">
              <Label className="settings-label">{t.set_theme}</Label>
              <div className="settings-sel-group">
                {THEME_OPTIONS.map(m => (
                  <SelectionBtn key={m.value} active={theme === m.value} onClick={() => setTheme(m.value)}>
                    {m.label}
                  </SelectionBtn>
                ))}
              </div>
            </div>
            <div className="settings-pref-row">
              <Label className="settings-label">{t.set_language}</Label>
              <div className="settings-sel-group">
                {LANG_OPTIONS.map(l => (
                  <SelectionBtn key={l.code} active={lang === l.code} onClick={() => switchLang(l.code)}>
                    {l.flag} {l.label}
                  </SelectionBtn>
                ))}
              </div>
            </div>
          </SectionCard>

          {/* Working Days */}
          <SectionCard id="settings-workdays" icon="workdays" title={t.wd_title || "Working Days"} sub={t.wd_sub || "Set which days are working days"}>
            <div className="wd-chips">
              <span className="wd-chip wd-chip--work">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <polyline points="20 6 9 17 4 12"/>
                </svg>
                {workingCount} {t.wd_working_days_count || "working days / week"}
              </span>
              <span className="wd-chip wd-chip--off">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                </svg>
                {offCount} {t.wd_off_days_count || "days off / week"}
              </span>
            </div>
            {wdLoad ? (
              <div className="wd-loading">⏳ {t.lbl_no_data || "Loading..."}</div>
            ) : (
              <div className="wd-list">
                {sorted.map(day => (
                  <DayToggle
                    key={day.day_name}
                    dayName={day.day_name}
                    isWorking={Boolean(day.is_working)}
                    isSaving={saving === day.day_name}
                    onToggle={() => toggleDay(day.day_name, Boolean(day.is_working))}
                    t={t}
                    lang={lang}
                  />
                ))}
              </div>
            )}
          </SectionCard>

          {/* Change Password */}
          <SectionCard id="settings-password" icon="password" title={t.set_pw_title} sub={t.set_pw_sub}>
            <div className="rev-form-grid settings-form-grid">
              {pwFields.map(f => {
                const canToggle = f.key === "next" || f.key === "confirm";
                const visible   = canToggle && showPw[f.key];
                return (
                  <div className="rev-form-field" key={f.key}>
                    <Label className="settings-label">{f.label}</Label>
                    <div style={{ position: "relative" }}>
                      <Input
                        type={visible ? "text" : "password"}
                        value={pw[f.key]}
                        onChange={e => setPw(p => ({ ...p, [f.key]: e.target.value }))}
                        placeholder="••••••••"
                        autoComplete={f.key === "current" ? "off" : "new-password"}
                        style={canToggle ? { paddingInlineEnd: "2.4rem" } : undefined}
                      />
                      {canToggle && (
                        <button
                          type="button"
                          onClick={() => setShowPw(p => ({ ...p, [f.key]: !p[f.key] }))}
                          style={{
                            position: "absolute", insetInlineEnd: "0.6rem",
                            top: "50%", transform: "translateY(-50%)",
                            background: "none", border: "none", cursor: "pointer",
                            color: "var(--muted-foreground)", padding: 0, lineHeight: 1,
                          }}
                          tabIndex={-1}
                        >
                          {visible ? <EyeOff size={15} /> : <Eye size={15} />}
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
            <div className="settings-card-footer">
              <button className="hr-btn" onClick={changePassword} disabled={pwLoading}
                style={{ background: "#DC2626" }}>
                <KeyRound size={13} />
                {pwLoading ? t.set_pw_saving : t.set_change_pw_btn}
              </button>
            </div>
          </SectionCard>

          {/* Database */}
          <SectionCard id="settings-database" icon="database" title={t.set_db_title} sub={t.set_db_sub}>
            <div className="settings-card-footer">
              <button className="hr-btn" onClick={setupDB} disabled={dbLoading}
                style={{ background: "#B45309" }}>
                <RefreshCw size={13} />
                {dbLoading ? t.set_db_working : t.set_db_btn}
              </button>
            </div>
            <div className="settings-hint">💡 {t.set_db_hint}</div>
          </SectionCard>

          {/* PWA */}
          <SectionCard id="settings-pwa" icon="pwa" title={t.set_pwa_title} sub={t.set_pwa_sub}>
            <div className="settings-card-footer">
              {pwaInstalled ? (
                <div className="settings-pwa-badge">{t.set_pwa_installed}</div>
              ) : (
                <button className="hr-btn" onClick={installPWA} style={{ background: "#6D28D9" }}>
                  <Download size={13} /> {t.set_pwa_install_btn}
                </button>
              )}
            </div>
            <div className="settings-hint">💡 {t.set_pwa_hint}</div>
          </SectionCard>

        </div>
      </div>
    </>
  );
}
