import { useState } from "react";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
  useSidebar,
} from "@/components/ui/sidebar";
import {
  Users, FileText, Receipt,
  LayoutDashboard, ClipboardList, CalendarOff,
  DollarSign, Inbox, TrendingUp, Vault, FolderOpen,
  PanelLeft, ShieldCheck, UserCog, ChevronDown, Settings,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/router";
import { useLanguage } from "@/contexts/LanguageContext";

const ATTENDANCE_COLOR = "#A78BFA";
const ATTENDANCE_PATHS = ["/attendance", "/attendance-records", "/working-days", "/holiday"];

const PAYROLL_COLOR = "#4ADE80";
const PAYROLL_PATHS = ["/payroll"];


const navigationItems = [
  { key: "nav_dashboard",     href: "/",               icon: LayoutDashboard, color: "#818CF8", bg: "#EEF2FF" },
  { key: "nav_employees",     href: "/employee",       icon: Users,           color: "#34D399", bg: "#ECFDF5" },
  { key: "nav_contracts",     href: "/contract",       icon: FileText,        color: "#60A5FA", bg: "#EFF6FF" },
  { key: "nav_expenses",      href: "/expense",        icon: Receipt,         color: "#F97316", bg: "#FFF7ED" },
  { key: "nav_leave_request", href: "/leave-request",  icon: CalendarOff,   color: "#F87171", bg: "#FEF2F2" },
  { key: "nav_payroll",       href: "/payroll",        icon: DollarSign,      color: "#4ADE80", bg: "#F0FDF4" },
  { key: "nav_documents",     href: "/documents",      icon: FolderOpen,      color: "#FCD34D", bg: "#FEFCE8" },
  { key: "nav_requests",      href: "/requests",       icon: Inbox,           color: "#38BDF8", bg: "#F0F9FF" },
  { key: "nav_revenue",       href: "/revenue",        icon: TrendingUp,      color: "#2DD4BF", bg: "#F0FDFA" },
  { key: "nav_savings",       href: "/safe",           icon: Vault,           color: "#F472B6", bg: "#FDF2F8" },
  { key: "nav_users",         href: "/system-users",   icon: UserCog,         color: "#8B5CF6", bg: "#F5F3FF" },
  { key: "nav_settings",      href: "/settings",        icon: Settings,        color: "#64748B", bg: "#F1F5F9" },
];

export default function AppSidebar() {
  const router = useRouter();
  const { toggleSidebar, state } = useSidebar();
  const collapsed = state === "collapsed";
  const { lang, t } = useLanguage();
  const isRtl = lang === "ku" || lang === "ar";

  const [companyName] = useState(() => {
    try {
      const saved = localStorage.getItem("company_info");
      if (saved) {
        const info = JSON.parse(saved);
        if (info.name) return info.name;
      }
    } catch {}
    return "HSD";
  });

  const isOnAttendance = ATTENDANCE_PATHS.includes(router.pathname);
  const [attOpenState, setAttOpen] = useState(false);
  const attOpen = isOnAttendance || attOpenState;

  const activePanel = router.pathname === "/attendance"
    ? (router.query.panel || "management")
    : router.pathname === "/attendance-records"
      ? "records"
      : router.pathname === "/working-days"
        ? "working-days"
        : router.pathname === "/holiday"
          ? "holiday"
          : null;

  const attendanceSubItems = [
    { panel: "management",   href: "/attendance?panel=management",   label: t.att_tab_mgmt },
    { panel: "records",      href: "/attendance?panel=records",      label: t.rec_title },
    { panel: "working-days", href: "/attendance?panel=working-days", label: t.wd_title },
    { panel: "holiday",      href: "/holiday",                       label: t.hol_title || "Holidays" },
  ];

  const isOnPayroll = PAYROLL_PATHS.includes(router.pathname);
  const [payOpenState, setPayOpen] = useState(false);
  const payOpen = isOnPayroll || payOpenState;

  const activePayrollPanel = router.pathname === "/payroll"
    ? (router.query.panel || "management")
    : null;

  const payrollSubItems = [
    { panel: "management", href: "/payroll?panel=management", label: t.pay_tab_mgmt },
    { panel: "salaries",   href: "/payroll?panel=salaries",   label: t.pay_tab_salaries },
  ];

  return (
    <Sidebar variant="inset" collapsible="icon" side={isRtl ? "right" : "left"}>

      {/* ══════════════ HEADER ══════════════ */}
      <SidebarHeader>
        <div className="sb-header-row">
          {!collapsed && (
            <div className="sb-logo-bubble">
              <ShieldCheck width={22} height={22} stroke="white" />
            </div>
          )}

          {!collapsed && (
            <div className="sb-brand-title">{companyName}</div>
          )}

          <button
            onClick={toggleSidebar}
            className="sidebar-toggle-btn"
            style={{ marginLeft: collapsed ? "auto" : 0 }}
            title="Toggle menu"
          >
            <PanelLeft width={18} height={18} stroke="white" fill="none" />
          </button>
        </div>
      </SidebarHeader>

      {/* ══════════════ NAV LINKS ══════════════ */}
      <SidebarContent style={{ padding: "4px 0" }}>
        <SidebarGroup>
          <SidebarGroupContent>
            <div className="sb-nav-list">
              {navigationItems.map((item, idx) => {
                const Icon = item.icon;
                const isActive = router.pathname === item.href;
                const label = t[item.key] || item.key;

                const linkEl = (
                  <Link
                    key={item.key}
                    href={item.href}
                    title={collapsed ? label : ""}
                    className={[
                      "sb-nav-link",
                      collapsed ? "sb-nav-link--collapsed" : "sb-nav-link--expanded",
                      isActive ? "sb-nav-link--active" : "",
                    ].join(" ")}
                  >
                    {isActive && !collapsed && (
                      <div className="sb-active-bar" style={{ background: item.color }} />
                    )}
                    <div
                      className="sb-icon-bubble"
                      style={isActive ? { background: item.color } : undefined}
                    >
                      <Icon
                        width={14} height={14}
                        style={{ color: isActive ? "#fff" : item.color }}
                      />
                    </div>
                    {!collapsed && (
                      <span className={`sb-nav-label${isActive ? " sb-nav-label--active" : ""}`}>
                        {label}
                      </span>
                    )}
                    {isActive && collapsed && (
                      <div className="sb-active-dot" style={{ background: item.color }} />
                    )}
                  </Link>
                );

                /* Replace "nav_payroll" (index 5) with expandable payroll group */
                if (idx === 5) {
                  return (
                    <div key="payroll-group">
                      <div className="att-group-wrap">
                        <button
                          onClick={() => !collapsed && setPayOpen(o => !o)}
                          title={collapsed ? t.nav_payroll : ""}
                          className={[
                            "att-group-btn",
                            collapsed ? "att-group-btn--collapsed" : "",
                            isOnPayroll ? "att-group-btn--active" : "",
                          ].join(" ")}
                        >
                          {isOnPayroll && !collapsed && (
                            <div className="sb-active-bar" style={{ background: PAYROLL_COLOR }} />
                          )}
                          <div
                            className="sb-icon-bubble"
                            style={isOnPayroll ? { background: PAYROLL_COLOR } : undefined}
                          >
                            <DollarSign
                              width={14} height={14}
                              style={{ color: isOnPayroll ? "#fff" : PAYROLL_COLOR }}
                            />
                          </div>
                          {!collapsed && (
                            <>
                              <span className={`sb-nav-label${isOnPayroll ? " sb-nav-label--active" : ""}`}>
                                {t.nav_payroll}
                              </span>
                              <ChevronDown
                                width={13} height={13}
                                className={`att-group-chevron${payOpen ? " att-group-chevron--open" : ""}`}
                              />
                            </>
                          )}
                          {isOnPayroll && collapsed && (
                            <div className="sb-active-dot" style={{ background: PAYROLL_COLOR }} />
                          )}
                        </button>

                        {payOpen && !collapsed && (
                          <div className="att-sub-menu">
                            {payrollSubItems.map(sub => {
                              const subActive = activePayrollPanel === sub.panel;
                              return (
                                <Link
                                  key={sub.panel}
                                  href={sub.href}
                                  className={`att-sub-item${subActive ? " att-sub-item--active" : ""}`}
                                >
                                  {sub.label}
                                </Link>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                }

                /* Insert attendance group after "nav_expenses" (index 3) */
                if (idx === 3) {
                  return (
                    <div key="attendance-group">
                      {linkEl}
                      {/* ── Attendance expandable group ── */}
                      <div className="att-group-wrap">
                        <button
                          onClick={() => !collapsed && setAttOpen(o => !o)}
                          title={collapsed ? t.nav_attendance : ""}
                          className={[
                            "att-group-btn",
                            collapsed ? "att-group-btn--collapsed" : "",
                            isOnAttendance ? "att-group-btn--active" : "",
                          ].join(" ")}
                        >
                          {isOnAttendance && !collapsed && (
                            <div className="sb-active-bar" style={{ background: ATTENDANCE_COLOR }} />
                          )}
                          <div
                            className="sb-icon-bubble"
                            style={isOnAttendance ? { background: ATTENDANCE_COLOR } : undefined}
                          >
                            <ClipboardList
                              width={14} height={14}
                              style={{ color: isOnAttendance ? "#fff" : ATTENDANCE_COLOR }}
                            />
                          </div>
                          {!collapsed && (
                            <>
                              <span className={`sb-nav-label${isOnAttendance ? " sb-nav-label--active" : ""}`}>
                                {t.nav_attendance}
                              </span>
                              <ChevronDown
                                width={13} height={13}
                                className={`att-group-chevron${attOpen ? " att-group-chevron--open" : ""}`}
                              />
                            </>
                          )}
                          {isOnAttendance && collapsed && (
                            <div className="sb-active-dot" style={{ background: ATTENDANCE_COLOR }} />
                          )}
                        </button>

                        {attOpen && !collapsed && (
                          <div className="att-sub-menu">
                            {attendanceSubItems.map(sub => {
                              const subActive = activePanel === sub.panel;
                              return (
                                <Link
                                  key={sub.panel}
                                  href={sub.href}
                                  className={`att-sub-item${subActive ? " att-sub-item--active" : ""}`}
                                >
                                  {sub.label}
                                </Link>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                }

                return linkEl;
              })}
            </div>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>


    </Sidebar>
  );
}
