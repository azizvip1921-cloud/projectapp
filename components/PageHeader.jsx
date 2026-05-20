import { useEffect, useState, useRef } from "react";
import { useTheme } from "next-themes";
import { useRouter } from "next/router";
import { Sun, Moon, Globe, User, LogOut, ChevronDown, KeyRound, Bell, Calendar, FileText, DollarSign, Search, Users, ClipboardList, Briefcase, CreditCard, TrendingUp, ShieldCheck, Clock, FileCheck, Settings, Wallet, Building2, Palette, Database, Wifi, CalendarDays, File, LayoutDashboard, Inbox, Receipt, CalendarOff } from "lucide-react";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { useFormVisibility } from "@/components/FormVisibilityContext";
import { useLanguage } from "@/contexts/LanguageContext";
import EmployeeProfilePanel from "@/components/EmployeeProfilePanel";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const LANG_OPTIONS = [
  { code: "en", label: "English" },
  { code: "ku", label: "کوردی"},
  { code: "ar", label: "العربية" },
];

const THEME_ICONS = { light: Sun, dark: Moon };

export default function PageHeader({ title, children, hideControls, alwaysShow }) {
  const { showForm } = useFormVisibility();
  const hidden = alwaysShow ? false : (typeof hideControls !== "undefined" ? hideControls : showForm);

  const router = useRouter();
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const [hrManager, setHrManager] = useState(null);
  const [showProfile, setShowProfile] = useState(false);
  const [showChangePw, setShowChangePw] = useState(false);
  const [pwForm, setPwForm] = useState({ current: "", next: "", confirm: "" });
  const [pwError, setPwError] = useState("");
  const [pwLoading, setPwLoading] = useState(false);
  const { lang, switchLang, t } = useLanguage();

  const [notifOpen, setNotifOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const notifRef = useRef(null);

  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [allEmployees, setAllEmployees] = useState([]);
  const [allDocuments, setAllDocuments] = useState([]);
  const searchRef = useRef(null);
  const searchInputRef = useRef(null);

  const NAV_PAGES = [
    { label: t.nav_dashboard      || "Dashboard",          href: "/",                           icon: LayoutDashboard, keywords: "home stats overview" },
    { label: t.nav_employees      || "Employees",          href: "/employee",                   icon: Users,           keywords: "staff workers people add" },
    { label: t.nav_attendance     || "Attendance",         href: "/attendance?panel=management", icon: Clock,           keywords: "check in out present absent late" },
    { label: t.rec_title          || "Attendance Records", href: "/attendance?panel=records",    icon: ClipboardList,   keywords: "monthly records summary" },
    { label: t.nav_leave_request  || "Leave Requests",     href: "/leave-request",              icon: CalendarOff,     keywords: "sick annual unpaid leave off" },
    { label: t.nav_requests       || "Requests",           href: "/requests",                   icon: Inbox,           keywords: "transfer salary equipment remote training" },
    { label: t.nav_payroll        || "Payroll",            href: "/payroll?panel=management",   icon: CreditCard,      keywords: "salary payment bonus deduction net" },
    { label: t.nav_emp_salaries   || "Employee Salaries",  href: "/payroll?panel=salaries",     icon: Wallet,          keywords: "salary history paid pending" },
    { label: t.nav_contracts      || "Contracts",          href: "/contract",                   icon: Briefcase,       keywords: "permanent temporary freelance part-time" },
    { label: t.nav_documents      || "Documents",          href: "/documents",                  icon: FileCheck,       keywords: "pdf word excel file upload" },
    { label: t.nav_revenue        || "Revenue",            href: "/revenue",                    icon: TrendingUp,      keywords: "income sales services projects" },
    { label: t.nav_expenses       || "Expenses",           href: "/expense",                    icon: Receipt,         keywords: "travel equipment meals training claims" },
    { label: t.nav_savings        || "Safe",               href: "/safe",                       icon: ShieldCheck,     keywords: "savings goals target" },
    { label: t.hol_title          || "Holidays",           href: "/holiday",                    icon: Calendar,        keywords: "public holiday day off" },
    { label: t.wd_title           || "Working Days",       href: "/attendance?panel=working-days", icon: CalendarDays, keywords: "schedule week days off" },
    { label: t.nav_users          || "System Users",       href: "/system-users",               icon: Users,           keywords: "admin manager role user account" },
    { label: t.nav_settings       || "Settings",           href: "/settings",                   icon: Settings,        keywords: "config preferences" },
  ];

  const SETTINGS_ITEMS = [
    { label: t.set_company_title    || "Company Info",    href: "/settings#settings-company",    icon: Building2,    keywords: "company name phone email address website" },
    { label: t.set_appearance_title || "Appearance",      href: "/settings#settings-appearance", icon: Palette,      keywords: "theme dark light language font color" },
    { label: t.wd_title             || "Working Days",    href: "/settings#settings-workdays",   icon: CalendarDays, keywords: "working schedule days week" },
    { label: t.set_pw_title         || "Change Password", href: "/settings#settings-password",   icon: KeyRound,     keywords: "password security change account" },
    { label: t.set_db_title         || "Database",        href: "/settings#settings-database",   icon: Database,     keywords: "database setup fix repair" },
    { label: t.set_pwa_title        || "Offline / PWA",   href: "/settings#settings-pwa",        icon: Wifi,         keywords: "install offline mobile app pwa" },
  ];

  const DOC_TYPE_ICONS = { PDF: FileText, Word: File, Excel: FileCheck, Image: FileCheck };

  const q = searchQuery.trim().toLowerCase();

  const filteredPages     = q ? NAV_PAGES.filter(p =>
    p.label.toLowerCase().includes(q) || p.keywords.toLowerCase().includes(q)
  ) : [];

  const filteredSettings  = q ? SETTINGS_ITEMS.filter(s =>
    s.label.toLowerCase().includes(q) || s.keywords.toLowerCase().includes(q)
  ) : [];

  const filteredEmployees = q
    ? allEmployees.filter(e =>
        e.employee_name?.toLowerCase().includes(q) ||
        e.type_of_job?.toLowerCase().includes(q) ||
        e.department?.toLowerCase().includes(q)
      ).slice(0, 6)
    : [];

  const filteredDocuments = q
    ? allDocuments.filter(d =>
        d.name?.toLowerCase().includes(q) ||
        d.employee?.toLowerCase().includes(q) ||
        d.type?.toLowerCase().includes(q) ||
        d.dept?.toLowerCase().includes(q)
      ).slice(0, 5)
    : [];

  const totalResults = filteredPages.length + filteredSettings.length + filteredEmployees.length + filteredDocuments.length;

  useEffect(() => { setMounted(true); }, []);

  useEffect(() => {
    const fetchNotifs = async () => {
      try {
        const [lRes, rRes, pRes] = await Promise.all([
          fetch("/api/leaves"),
          fetch("/api/requests"),
          fetch("/api/payroll"),
        ]);
        const [leaves, requests, payroll] = await Promise.all([
          lRes.json(), rRes.json(), pRes.json(),
        ]);
        const notifs = [];
        if (Array.isArray(leaves))
          leaves.filter(l => l.status === "Pending").forEach(l =>
            notifs.push({ id: `leave-${l.id}`, type: "leave", title: l.employee_name, sub: l.leave_type, href: "/leave-request" })
          );
        if (Array.isArray(requests))
          requests.filter(r => r.status === "Pending").forEach(r =>
            notifs.push({ id: `req-${r.id}`, type: "request", title: r.employee_name, sub: r.request_type || r.subject, href: "/requests" })
          );
        if (Array.isArray(payroll))
          payroll.filter(p => p.status === "Pending").forEach(p =>
            notifs.push({ id: `pay-${p.id}`, type: "payroll", title: p.employee_name, sub: p.month, href: "/payroll" })
          );
        setNotifications(notifs);
      } catch {}
    };
    fetchNotifs();
    const iv = setInterval(fetchNotifs, 60_000);
    return () => clearInterval(iv);
  }, []);

  useEffect(() => {
    if (!notifOpen) return;
    const handler = (e) => {
      if (notifRef.current && !notifRef.current.contains(e.target)) setNotifOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [notifOpen]);

  useEffect(() => {
    if (!searchOpen) return;
    setTimeout(() => searchInputRef.current?.focus(), 50);
    fetch("/api/employee").then(r => r.ok ? r.json() : []).then(rows => {
      if (Array.isArray(rows)) setAllEmployees(rows);
    }).catch(() => {});
    fetch("/api/documents").then(r => r.ok ? r.json() : []).then(rows => {
      if (Array.isArray(rows)) setAllDocuments(rows);
    }).catch(() => {});
    const handler = (e) => {
      if (searchRef.current && !searchRef.current.contains(e.target)) {
        setSearchOpen(false);
        setSearchQuery("");
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [searchOpen]);

  useEffect(() => {
    const handler = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "k") {
        e.preventDefault();
        setSearchOpen(v => !v);
        setSearchQuery("");
      }
      if (e.key === "Escape") { setSearchOpen(false); setSearchQuery(""); }
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, []);

  const fetchHrManager = () => {
    try {
      const stored = localStorage.getItem("hr_user");
      if (!stored) return;
      const user = JSON.parse(stored);
      if (!user?.id) return;
      if (user.source === "system") {
        if (user.employee_id) {
          fetch(`/api/employee/${user.employee_id}`)
            .then(r => r.ok ? r.json() : null)
            .then(emp => {
              if (emp) setHrManager({ ...emp, role: user.role });
              else setHrManager({ employee_name: user.name, email: user.email, role: user.role, source: "system" });
            })
            .catch(() => {
              setHrManager({ employee_name: user.name, email: user.email, role: user.role, source: "system" });
            });
        } else {
          setHrManager({ employee_name: user.name, email: user.email, role: user.role, source: "system" });
        }
      } else {
        fetch(`/api/employee/${user.id}`)
          .then(r => r.ok ? r.json() : null)
          .then(emp => { if (emp) setHrManager({ ...emp, role: user.role || emp.type_of_job }); })
          .catch(() => {});
      }
    } catch {}
  };

  useEffect(() => { fetchHrManager(); }, []);

  const handleLogout = async () => {
    await fetch("/api/auth/logout", { method: "POST" }).catch(() => {});
    localStorage.removeItem("hr_auth");
    localStorage.removeItem("hr_user");
    window.location.replace("/login");
  };

  const handleEdit = (emp) => {
    setShowProfile(false);
    router.push(`/employee?edit=${emp.id}`);
  };

  const submitChangePassword = async () => {
    if (!pwForm.current || !pwForm.next) { setPwError(t.prof_change_password_required || "All fields required"); return; }
    if (pwForm.next !== pwForm.confirm) { setPwError(t.prof_change_password_mismatch || "Passwords do not match"); return; }
    setPwLoading(true);
    setPwError("");
    try {
      const stored = localStorage.getItem("hr_user");
      const { id, source } = stored ? JSON.parse(stored) : {};
      const res = await fetch("/api/auth/change-password", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ id, source, current: pwForm.current, next: pwForm.next }),
      });
      const data = await res.json();
      if (!res.ok) { setPwError(data.error === "wrong_password" ? (t.prof_change_password_wrong || "Current password is incorrect") : (data.error || "Error")); return; }
      setShowChangePw(false);
    } catch { setPwError("Server error"); }
    finally { setPwLoading(false); }
  };

  const handleDeactivate = async (emp) => {
    try {
      const res = await fetch(`/api/employee/${emp.id}`, {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ ...emp, status: "Inactive" }),
      });
      if (!res.ok) return;
      setHrManager(prev => prev ? { ...prev, status: "Inactive" } : null);
      fetchHrManager();
    } catch {}
  };

  if (hidden) return null;

  const ThemeIcon = mounted ? (THEME_ICONS[theme] || Sun) : Sun;
  const initials = hrManager
    ? hrManager.employee_name.charAt(0).toUpperCase()
    : "H";

  return (
    <>
      {showProfile && (
        <EmployeeProfilePanel
          employee={hrManager}
          onClose={() => setShowProfile(false)}
          onEdit={handleEdit}
          onDeactivate={handleDeactivate}
        />
      )}

      <Dialog open={showChangePw} onOpenChange={(open) => { setShowChangePw(open); if (!open) setPwError(""); }}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>{t.prof_change_password || "Change Password"}</DialogTitle>
          </DialogHeader>
          <div style={{ display: "flex", flexDirection: "column", gap: 12, marginTop: 4 }}>
            <div>
              <Label htmlFor="cp-current">{t.prof_change_password_current || "Current Password"}</Label>
              <Input id="cp-current" type="password" value={pwForm.current} onChange={e => setPwForm(f => ({ ...f, current: e.target.value }))} style={{ marginTop: 4 }} />
            </div>
            <div>
              <Label htmlFor="cp-new">{t.prof_change_password_new || "New Password"}</Label>
              <Input id="cp-new" type="password" value={pwForm.next} onChange={e => setPwForm(f => ({ ...f, next: e.target.value }))} style={{ marginTop: 4 }} />
            </div>
            <div>
              <Label htmlFor="cp-confirm">{t.prof_change_password_confirm || "Confirm New Password"}</Label>
              <Input id="cp-confirm" type="password" value={pwForm.confirm} onChange={e => setPwForm(f => ({ ...f, confirm: e.target.value }))} style={{ marginTop: 4 }} />
            </div>
            {pwError && <div style={{ color: "#DC2626", fontSize: 12 }}>{pwError}</div>}
            <button
              onClick={submitChangePassword}
              disabled={pwLoading}
              className="emp-panel-btn-edit"
              style={{ marginTop: 4 }}
            >{pwLoading ? "..." : (t.prof_change_password || "Change Password")}</button>
          </div>
        </DialogContent>
      </Dialog>

      <div className="ph-bar">
        {/* ── Left: sidebar trigger + title ── */}
        <div className="ph-left">
          <div className="md:hidden">
            <SidebarTrigger />
          </div>
          {title && <h1 className="ph-title">{title}</h1>}
        </div>

        {/* ── Right: controls ── */}
        <div className="ph-right">
          {children && <div className="ph-children">{children}</div>}

          {/* Global Search */}
          <div className="ph-search-wrap" ref={searchRef}>
            <button
              className="ph-icon-btn"
              onClick={() => { setSearchOpen(v => !v); setSearchQuery(""); }}
              title="Search (Ctrl+K)"
            >
              <Search size={16} />
            </button>
            {searchOpen && (
              <div className="ph-search-dropdown">
                <div className="ph-search-input-wrap">
                  <Search size={14} className="ph-search-icon" />
                  <input
                    ref={searchInputRef}
                    className="ph-search-input"
                    placeholder={t.search_placeholder || "Search anything…"}
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                  />
                  {searchQuery && (
                    <button className="ph-search-clear" onClick={() => setSearchQuery("")}>✕</button>
                  )}
                </div>

                <div className="ph-search-list">
                  {!q ? (
                    <div className="ph-search-empty ph-search-hint-msg">
                      <Search size={22} style={{ opacity: 0.25, marginBottom: 8 }} />
                      <div>{t.search_hint || "Search pages, settings, employees, documents…"}</div>
                    </div>
                  ) : totalResults === 0 ? (
                    <div className="ph-search-empty">{t.search_no_results || "No results found"}</div>
                  ) : (
                    <>
                      {/* Pages */}
                      {filteredPages.length > 0 && (
                        <>
                          <div className="ph-search-section-label">{t.search_pages || "Pages"}</div>
                          {filteredPages.map(page => {
                            const Icon = page.icon;
                            return (
                              <div key={page.href} className="ph-search-item"
                                onClick={() => { setSearchOpen(false); setSearchQuery(""); router.push(page.href); }}>
                                <div className="ph-search-item-icon-wrap ph-search-item-icon--page">
                                  <Icon size={13} />
                                </div>
                                <span>{page.label}</span>
                              </div>
                            );
                          })}
                        </>
                      )}

                      {/* Settings */}
                      {filteredSettings.length > 0 && (
                        <>
                          <div className="ph-search-section-label">{t.nav_settings || "Settings"}</div>
                          {filteredSettings.map(s => {
                            const Icon = s.icon;
                            return (
                              <div key={s.href} className="ph-search-item"
                                onClick={() => { setSearchOpen(false); setSearchQuery(""); router.push(s.href); }}>
                                <div className="ph-search-item-icon-wrap ph-search-item-icon--setting">
                                  <Icon size={13} />
                                </div>
                                <span>{s.label}</span>
                                <span className="ph-search-item-tag">{t.nav_settings || "Settings"}</span>
                              </div>
                            );
                          })}
                        </>
                      )}

                      {/* Employees */}
                      {filteredEmployees.length > 0 && (
                        <>
                          <div className="ph-search-section-label">{t.nav_employees || "Employees"}</div>
                          {filteredEmployees.map(emp => (
                            <div key={emp.id} className="ph-search-item"
                              onClick={() => { setSearchOpen(false); setSearchQuery(""); router.push(`/employee?edit=${emp.id}`); }}>
                              <div className="ph-search-emp-avatar">
                                {emp.image
                                  ? <img src={emp.image} alt="" />
                                  : emp.employee_name?.charAt(0).toUpperCase()}
                              </div>
                              <div className="ph-search-emp-info">
                                <span className="ph-search-emp-name">{emp.employee_name}</span>
                                {(emp.type_of_job || emp.department) && (
                                  <span className="ph-search-emp-role">{emp.type_of_job || emp.department}</span>
                                )}
                              </div>
                              <span className={`ph-search-emp-status ph-search-emp-status--${(emp.status || "").toLowerCase().replace(" ", "-")}`}>
                                {emp.status}
                              </span>
                            </div>
                          ))}
                        </>
                      )}

                      {/* Documents */}
                      {filteredDocuments.length > 0 && (
                        <>
                          <div className="ph-search-section-label">{t.nav_documents || "Documents"}</div>
                          {filteredDocuments.map(doc => {
                            const DocIcon = DOC_TYPE_ICONS[doc.type] || File;
                            return (
                              <div key={doc.id} className="ph-search-item"
                                onClick={() => { setSearchOpen(false); setSearchQuery(""); router.push("/documents"); }}>
                                <div className={`ph-search-item-icon-wrap ph-search-item-icon--doc ph-search-doc--${(doc.type || "other").toLowerCase()}`}>
                                  <DocIcon size={13} />
                                </div>
                                <div className="ph-search-emp-info">
                                  <span className="ph-search-emp-name">{doc.name}</span>
                                  <span className="ph-search-emp-role">{doc.employee}{doc.type ? ` · ${doc.type}` : ""}</span>
                                </div>
                              </div>
                            );
                          })}
                        </>
                      )}
                    </>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Notification Bell */}
          <div className="ph-notif-wrap" ref={notifRef}>
            <button
              className="ph-icon-btn"
              style={{ position: "relative" }}
              onClick={() => setNotifOpen(v => !v)}
              title={t.notif_title || "Notifications"}
            >
              <Bell size={16} />
              {notifications.length > 0 && (
                <span className="ph-notif-badge">
                  {notifications.length > 99 ? "99+" : notifications.length}
                </span>
              )}
            </button>

            {notifOpen && (
              <div className="ph-notif-dropdown">
                <div className="ph-notif-header">
                  <span>{t.notif_title || "Notifications"}</span>
                  {notifications.length > 0 && (
                    <span className="ph-notif-count">{notifications.length}</span>
                  )}
                </div>
                <div className="ph-notif-list">
                  {notifications.length === 0 ? (
                    <div className="ph-notif-empty">{t.notif_empty || "No new notifications"}</div>
                  ) : (
                    notifications.slice(0, 10).map(n => {
                      const Icon = n.type === "leave" ? Calendar : n.type === "request" ? FileText : DollarSign;
                      return (
                        <div
                          key={n.id}
                          className="ph-notif-item"
                          onClick={() => { setNotifOpen(false); router.push(n.href); }}
                        >
                          <div className={`ph-notif-icon ph-notif-icon--${n.type}`}>
                            <Icon size={14} />
                          </div>
                          <div className="ph-notif-body">
                            <div className="ph-notif-name">{n.title}</div>
                            <div className="ph-notif-sub">{n.sub}</div>
                          </div>
                          <span className="ph-notif-pending">{t.lbl_pending || "Pending"}</span>
                        </div>
                      );
                    })
                  )}
                </div>
                {notifications.length > 10 && (
                  <div className="ph-notif-footer">
                    +{notifications.length - 10} {t.notif_more || "more"}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Language switcher */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="ph-icon-btn" title={t.lang_label}>
                <Globe size={16} />
                <span className="ph-lang-code">{LANG_OPTIONS.find(o => o.code === lang)?.label || lang.toUpperCase()}</span>
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-36">
              {LANG_OPTIONS.map(opt => (
                <DropdownMenuItem
                  key={opt.code}
                  onClick={() => switchLang(opt.code)}
                  className={`cursor-pointer gap-2 ${lang === opt.code ? "font-semibold" : ""}`}
                >
                  <span>{opt.flag}</span>
                  <span>{opt.label}</span>
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Theme toggle */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="ph-icon-btn" title="Theme">
                <ThemeIcon size={16} />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-36">
              {Object.entries(THEME_ICONS).map(([key, Icon]) => (
                <DropdownMenuItem
                  key={key}
                  onClick={() => setTheme(key)}
                  className={`cursor-pointer gap-2 capitalize ${theme === key ? "font-semibold" : ""}`}
                >
                  <Icon size={14} />
                  <span>
                    {key === "light" ? (t.light_mode || "Light")
                      : key === "dark" ? (t.dark_mode || "Dark")
                      : "System"}
                  </span>
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>

          {/* HR Manager dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="ph-manager-chip">
                <div className="ph-avatar">
                  {hrManager?.image
                    ? <img src={hrManager.image} alt="" />
                    : initials
                  }
                </div>
                <div className="ph-manager-info">
                  <span className="ph-manager-name">
                    {hrManager ? hrManager.employee_name : "HR Manager"}
                  </span>
                  <span className="ph-manager-role">
                    {hrManager?.role || t.hr_role}
                  </span>
                </div>
                <ChevronDown size={13} className="ph-chevron" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-44">
              <DropdownMenuItem
                className="cursor-pointer gap-2"
                onClick={() => setShowProfile(true)}
              >
                <User size={14} />
                <span>{t.nav_profile || "Profile"}</span>
              </DropdownMenuItem>
              <DropdownMenuItem
                className="cursor-pointer gap-2"
                onClick={() => { setPwForm({ current: "", next: "", confirm: "" }); setPwError(""); setShowChangePw(true); }}
              >
                <KeyRound size={14} />
                <span>{t.prof_change_password || "Change Password"}</span>
              </DropdownMenuItem>
              <DropdownMenuSeparator />

              <DropdownMenuItem
                className="cursor-pointer gap-2 text-red-500 focus:text-red-500"
                onClick={handleLogout}
              >
                <LogOut size={14} />
                <span>{t.logout_btn || "Log Out"}</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </>
  );
}
