import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/router";
import { useLanguage } from "@/contexts/LanguageContext";
import { Search, DollarSign, CheckCircle, Clock, FileText, Printer } from "lucide-react";
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

const STATUS_CFG = {
  Paid:    { bg: "#DCFCE7", color: "#15803D" },
  Pending: { bg: "#FEF9C3", color: "#92400E" },
  Failed:  { bg: "#FEE2E2", color: "#DC2626" },
};

function StatusBadge({ text }) {
  const { tv } = useLanguage();
  const c = STATUS_CFG[text] || { bg: "#F1F5F9", color: "#64748B" };
  return (
    <span className="pay-status-badge" style={{ background: c.bg, color: c.color }}>
      {tv(text) || "—"}
    </span>
  );
}

function fmtDate(val) {
  if (!val) return "—";
  return new Date(val).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
}

export default function EmployeeSalaries() {
  const { t } = useLanguage();
  const router = useRouter();
  const [records, setRecords]         = useState([]);
  const [employees, setEmployees]     = useState([]);
  const [loaded, setLoaded]           = useState(false);
  const [search, setSearch]           = useState("");
  const [empFilter, setEmpFilter]     = useState("All");
  const [showEmpList, setShowEmpList] = useState(false);
  const filterBtnRef = useRef(null);
  const [filterPos, setFilterPos]     = useState(null);

  useEffect(() => {
    Promise.all([
      fetch("/api/payroll").then(r => r.json()),
      fetch("/api/employee").then(r => r.json()),
    ]).then(([pay, emp]) => {
      setRecords(Array.isArray(pay) ? pay : []);
      setEmployees(Array.isArray(emp) ? emp : emp.employees || []);
      setLoaded(true);
    });
  }, []);

  // Auto-filter when ?emp=NAME is in the URL
  useEffect(() => {
    if (!loaded || !router.query.emp) return;
    const name = decodeURIComponent(router.query.emp);
    const emp  = employees.find(e => e.employee_name === name);
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (emp) setEmpFilter(name);
  }, [loaded, router.query.emp]);

  function buildSummary(emp, idx, empRecs) {
    const paid    = empRecs.filter(r => r.status === "Paid");
    const pending = empRecs.filter(r => r.status === "Pending");
    const totalPaid       = paid.reduce((s, r) => s + (Number(r.net) || 0), 0);
    const totalPending    = pending.reduce((s, r) => s + (Number(r.net) || 0), 0);
    const totalDeductions = empRecs.filter(r => r.status !== "Failed").reduce((s, r) => s + (Number(r.deductions) || 0), 0);
    const sortedPaid      = [...paid].sort((a, b) => new Date(b.payment_date || b.month) - new Date(a.payment_date || a.month));
    return {
      id:            emp.id,
      employee_name: emp.employee_name,
      department:    emp.department || "—",
      image:         emp.image || "",
      totalRecords:  empRecs.length,
      paidCount:     paid.length,
      pendingCount:  pending.length,
      totalPaid,
      totalPending,
      totalDeductions,
      lastPaymentDate: sortedPaid[0] ? (sortedPaid[0].payment_date || sortedPaid[0].month) : null,
      ac:         AVATAR_COLORS[idx % AVATAR_COLORS.length],
      allRecords: [...empRecs].sort((a, b) => new Date(b.payment_date || b.month) - new Date(a.payment_date || a.month)),
    };
  }

  const summary = employees.map((emp, idx) =>
    buildSummary(emp, idx, records.filter(r => r.employee_name === emp.employee_name))
  );

  const empNames = [...new Set(employees.map(e => e.employee_name).filter(Boolean))].sort((a, b) => a.localeCompare(b));

  // When a specific employee is selected, show their payroll records
  const isFiltered = empFilter !== "All";
  const filteredEmployee = isFiltered ? summary.find(e => e.employee_name === empFilter) : null;

  const filteredSummary = summary.filter(emp => {
    const matchEmp = empFilter === "All" || emp.employee_name === empFilter;
    const q = search.toLowerCase();
    const matchSearch = !search ||
      emp.employee_name.toLowerCase().includes(q) ||
      emp.department.toLowerCase().includes(q);
    return matchEmp && matchSearch;
  });

  const totalNetPaid      = summary.reduce((s, e) => s + e.totalPaid,        0);
  const totalNetDeductions = summary.reduce((s, e) => s + e.totalDeductions, 0);
  const totalPaidCount    = summary.reduce((s, e) => s + e.paidCount,        0);
  const totalPendCount    = summary.reduce((s, e) => s + e.pendingCount,     0);

  // Columns for summary view (all employees)
  const summaryColumns = [
    { key: "num",           label: "#" },
    { key: "employee",      label: t.col_employee },
    { key: "records",       label: t.pay_sal_col_records },
    { key: "total_paid",    label: t.pay_sal_col_total_paid },
    { key: "total_pending", label: t.pay_sal_col_total_deduction },
    { key: "last_payment",  label: t.pay_sal_col_last_payment },
    { key: "action",        label: t.col_actions },
  ];

  // Columns for detail view (one employee's payroll rows)
  const detailColumns = [
    { key: "num",         label: "#" },
    { key: "date",        label: t.pay_col_payment_date },
    { key: "base",        label: t.pay_col_base },
    { key: "bonus",       label: t.pay_col_bonus },
    { key: "deductions",  label: t.pay_col_deductions },
    { key: "net",         label: t.pay_col_net },
    { key: "status",      label: t.col_status },
  ];

  const toolbar = (
    <div className="docs-search-wrap">
      <Search className="docs-search-icon" />
      <input
        value={search}
        onChange={e => setSearch(e.target.value)}
        placeholder={t.emp_search_placeholder}
        className="emp-search"
      />
    </div>
  );

  const filterSlot = (
    <div className="docs-filter-wrap" ref={filterBtnRef}>
      <button
        className="emp-filter-btn"
        onClick={() => {
          if (!showEmpList && filterBtnRef.current && window.innerWidth <= 640) {
            const r = filterBtnRef.current.getBoundingClientRect();
            const isRtl = document.documentElement.dir === "rtl";
            setFilterPos(isRtl
              ? { top: r.bottom + 4, right: window.innerWidth - r.right, maxH: window.innerHeight - r.bottom - 12 }
              : { top: r.bottom + 4, left: r.left, maxH: window.innerHeight - r.bottom - 12 }
            );
          } else {
            setFilterPos(null);
          }
          setShowEmpList(v => !v);
        }}
      >
        {empFilter === "All" ? t.docs_all_emp : empFilter}
        <span className="pay-filter-arrow">{showEmpList ? "▴" : "▾"}</span>
      </button>
      {showEmpList && (
        <div
          className={`docs-dropdown${filterPos ? " docs-dropdown--fixed" : ""}`}
          style={filterPos ? { top: filterPos.top, ...(filterPos.right !== undefined ? { right: filterPos.right } : { left: filterPos.left }), maxHeight: filterPos.maxH } : {}}
        >
          <div
            onClick={() => { setEmpFilter("All"); setShowEmpList(false); setSearch(""); setFilterPos(null); }}
            className={`docs-dropdown-item docs-dropdown-item--border${empFilter === "All" ? " docs-dropdown-item--active" : ""}`}
          >
            {t.docs_all_emp}
          </div>
          {empNames.map(name => (
            <div
              key={name}
              onClick={() => { setEmpFilter(name); setShowEmpList(false); setSearch(""); setFilterPos(null); }}
              className={`docs-dropdown-item${empFilter === name ? " docs-dropdown-item--active" : ""}`}
            >
              {name}
            </div>
          ))}
        </div>
      )}
    </div>
  );

  return (
    <>
      <div className="hr-ph">
        <div>
          <div className="hr-pt">{t.pay_sal_title}</div>
          <div className="hr-ps">{t.pay_sal_sub}</div>
        </div>
      </div>

      <div className="flex flex-1 flex-col gap-4 p-4 shiny-ring">

        {/* ── Stats: change when employee is filtered ── */}
        {!isFiltered ? (
          <div className="pay-stats-grid">
            <div className="emp-stat-card emp-stat-card--active">
              <div className="emp-stat-card__icon"><DollarSign size={18} /></div>
              <div className="emp-stat-card__count">{totalNetPaid.toLocaleString()} IQD</div>
              <div className="emp-stat-card__label">{t.pay_stat_total}</div>
            </div>
            <div className="emp-stat-card emp-stat-card--all">
              <div className="emp-stat-card__icon"><CheckCircle size={18} /></div>
              <div className="emp-stat-card__count">{totalPaidCount}</div>
              <div className="emp-stat-card__label">{t.pay_stat_paid}</div>
            </div>
            <div className="emp-stat-card emp-stat-card--onleave">
              <div className="emp-stat-card__icon"><Clock size={18} /></div>
              <div className="emp-stat-card__count">{totalPendCount}</div>
              <div className="emp-stat-card__label">{t.pay_stat_pending}</div>
            </div>
            <div className="emp-stat-card emp-stat-card--suspended">
              <div className="emp-stat-card__icon"><FileText size={18} /></div>
              <div className="emp-stat-card__count">{totalNetDeductions.toLocaleString()} IQD</div>
              <div className="emp-stat-card__label">{t.pay_stat_deductions}</div>
            </div>
          </div>
        ) : filteredEmployee && (
          /* Per-employee summary cards — styled like employee stat cards */
          <>
            <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
              <button
                className="pay-btn-back"
                onClick={() => { setEmpFilter("All"); setSearch(""); }}
              >
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"
                  className="pay-btn-back-icon">
                  <path d="M19 12H5M12 5l-7 7 7 7"/>
                </svg>
                {t.btn_back}
              </button>
              <button className="btn-print" onClick={() => window.print()} title={t.btn_print}>
                <Printer size={13} /> {t.btn_print}
              </button>
            </div>
            <div className="pay-emp-header">
              <div
                className="pay-avatar-lg"
                style={{
                  background: filteredEmployee.image ? "transparent" : filteredEmployee.ac.bg,
                  color: filteredEmployee.ac.color,
                }}
              >
                {filteredEmployee.image
                  ? <img src={filteredEmployee.image} alt={filteredEmployee.employee_name} className="pay-avatar-img" />
                  : filteredEmployee.employee_name.charAt(0).toUpperCase()
                }
              </div>
              <div>
                <div className="pay-emp-name-lg">{filteredEmployee.employee_name}</div>
                <div className="pay-emp-dept-sm">{filteredEmployee.department}</div>
              </div>
            </div>
            <div className="pay-stats-grid">
              <div className="emp-stat-card emp-stat-card--active">
                <div className="emp-stat-card__icon"><DollarSign size={18} /></div>
                <div className="emp-stat-card__count">{filteredEmployee.totalPaid.toLocaleString()} IQD</div>
                <div className="emp-stat-card__label">{t.pay_sal_col_total_paid}</div>
              </div>
              <div className="emp-stat-card emp-stat-card--onleave">
                <div className="emp-stat-card__icon"><Clock size={18} /></div>
                <div className="emp-stat-card__count">{filteredEmployee.totalPending > 0 ? `${filteredEmployee.totalPending.toLocaleString()} IQD` : "—"}</div>
                <div className="emp-stat-card__label">{t.pay_sal_col_total_pending}</div>
              </div>
              <div className="emp-stat-card emp-stat-card--all">
                <div className="emp-stat-card__icon"><FileText size={18} /></div>
                <div className="emp-stat-card__count pay-stat-count-date">{fmtDate(filteredEmployee.lastPaymentDate)}</div>
                <div className="emp-stat-card__label">{t.pay_sal_col_last_payment}</div>
              </div>
              <div className="emp-stat-card emp-stat-card--suspended">
                <div className="emp-stat-card__icon"><CheckCircle size={18} /></div>
                <div className="emp-stat-card__count">{filteredEmployee.totalRecords}</div>
                <div className="emp-stat-card__label">{t.pay_sal_col_records}</div>
              </div>
            </div>
          </>
        )}

        {/* ── Table: summary OR detail rows ── */}
        {!isFiltered ? (
          <DataTable
            columns={summaryColumns}
            data={filteredSummary}
            itemLabel="employees"
            toolbar={toolbar}
            filterSlot={filterSlot}
            renderRow={(emp, index) => {
              const goToEmp = () => { setEmpFilter(emp.employee_name); setSearch(""); };
              return (
                <TableRow key={emp.id} className="hover:bg-muted/50">
                  <TableCell className="pay-tbl-idx">{index + 1}</TableCell>

                  <TableCell className="min-w-[180px]">
                    <div className="pay-emp-cell">
                      <div
                        className="pay-avatar-sm"
                        style={{
                          background: emp.image ? "transparent" : emp.ac.bg,
                          color: emp.ac.color,
                        }}
                      >
                        {emp.image
                          ? <img src={emp.image} alt={emp.employee_name} className="pay-avatar-img" />
                          : emp.employee_name.charAt(0).toUpperCase()
                        }
                      </div>
                      <div>
                        <div className="pay-tbl-emp-name">{emp.employee_name}</div>
                        <div className="pay-tbl-emp-dept">{emp.department}</div>
                      </div>
                    </div>
                  </TableCell>

                  <TableCell>
                    <span className="pay-tbl-count">{emp.totalRecords}</span>
                  </TableCell>

                  <TableCell>
                    <span className="pay-tbl-paid">
                      {emp.totalPaid.toLocaleString()} IQD
                    </span>
                  </TableCell>

                  <TableCell>
                    <span className="pay-tbl-deductions">
                      {emp.totalDeductions > 0 ? `${emp.totalDeductions.toLocaleString()} IQD` : "—"}
                    </span>
                  </TableCell>

                  <TableCell className="pay-tbl-date">
                    {fmtDate(emp.lastPaymentDate)}
                  </TableCell>

                  <TableCell>
                    <button
                      onClick={goToEmp}
                      className="pay-sal-view-btn"
                    >
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                        <circle cx="12" cy="12" r="3"/>
                      </svg>
                      {t.pay_sal_view}
                    </button>
                  </TableCell>
                </TableRow>
              );
            }}
          />
        ) : (
          /* ── Detail view: one row per payroll record ── */
          <DataTable
            columns={detailColumns}
            data={filteredEmployee ? filteredEmployee.allRecords : []}
            itemLabel="records"
            toolbar={toolbar}
            filterSlot={filterSlot}
            renderRow={(rec, index) => (
              <TableRow key={index} className="hover:bg-muted/50">
                <TableCell className="pay-tbl-idx">{index + 1}</TableCell>

                <TableCell className="pay-tbl-date-cell">
                  {fmtDate(rec.payment_date || rec.month)}
                </TableCell>

                <TableCell className="pay-tbl-base">
                  {Number(rec.base_salary || 0).toLocaleString()} IQD
                </TableCell>

                <TableCell className="pay-tbl-bonus">
                  {rec.bonus ? `+${Number(rec.bonus).toLocaleString()} IQD` : "—"}
                </TableCell>

                <TableCell className="pay-tbl-deductions">
                  {rec.deductions ? `-${Number(rec.deductions).toLocaleString()} IQD` : "—"}
                </TableCell>

                <TableCell className="pay-tbl-net">
                  {Number(rec.net || 0).toLocaleString()} {rec.currency || "IQD"}
                </TableCell>

                <TableCell>
                  <StatusBadge text={rec.status} />
                </TableCell>
              </TableRow>
            )}
          />
        )}
      </div>

    </>
  );
}
