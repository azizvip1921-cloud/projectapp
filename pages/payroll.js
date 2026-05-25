import { useState, useEffect } from "react";
import { useRouter } from "next/router";
import { useLanguage } from "@/contexts/LanguageContext";
import { useFormVisibility } from "@/components/FormVisibilityContext";
import { toast } from "sonner";
import { Plus, DollarSign, CheckCircle, Clock, TrendingDown, LayoutGrid, List, Printer } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { TableCell, TableRow } from "@/components/ui/table";
import DataTable from "@/components/DataTable";
import DeleteConfirmDialog from "@/components/DeleteConfirmDialog";
import EmployeeSalaries from "./employee-salaries";

const localToday = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`; };
const localMonth = () => localToday().slice(0, 7);
const fmtDate = s => s ? new Date(String(s).slice(0,10)+"T00:00:00").toLocaleDateString("en-GB",{day:"2-digit",month:"short",year:"numeric"}) : "—";

const STATUS_CFG = { Paid: { bg: "#DCFCE7", color: "#15803D" }, Pending: { bg: "#FEF9C3", color: "#92400E" }, Failed: { bg: "#FEE2E2", color: "#DC2626" } };

const AVATAR_COLORS = [
  { bg: "#EFF6FF", color: "#1D4ED8" }, { bg: "#DCFCE7", color: "#15803D" },
  { bg: "#FEF9C3", color: "#92400E" }, { bg: "#F3E8FF", color: "#7C3AED" },
  { bg: "#FEE2E2", color: "#DC2626" }, { bg: "#DBEAFE", color: "#1E40AF" },
];

function Badge({ text }) {
  const { tv } = useLanguage();
  const c = STATUS_CFG[text] || { bg: "#F1F5F9", color: "#64748B" };
  return <span className="hr-badge" style={{ background: c.bg, color: c.color }}>{tv(text) || "—"}</span>;
}

function PayrollManagementTab() {
  const { t, tv } = useLanguage();
  const router = useRouter();
  const [records, setRecords] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [employee_name, setEmployee_name] = useState("");
  const [payment_date, setPayment_date] = useState("");
  const [base_salary, setBase_salary] = useState("");
  const [bonus, setBonus] = useState("");
  const [deductions, setDeductions] = useState("");
  const [status, setStatus] = useState("Pending");
  const [currency, setCurrency] = useState("IQD");
  const [editId, setEditId] = useState(null);
  const [filterDate, setFilterDate] = useState(localMonth());
  const [viewMode, setViewMode] = useState("table");
  const [contractInactive, setContractInactive] = useState(false);
  const { showForm, setShowForm } = useFormVisibility();

  useEffect(() => { fetchRecords(); fetchEmployees(); }, []);

  const fetchRecords = async () => {
    try { const res = await fetch("/api/payroll"); const data = await res.json(); setRecords(Array.isArray(data) ? data : []); }
    catch (e) { console.error(e); }
  };
  const fetchEmployees = async () => {
    try { const res = await fetch("/api/employee"); const data = await res.json(); setEmployees(Array.isArray(data) ? data : data.employees || []); }
    catch (e) { console.error(e); }
  };

  const net = () => (Number(base_salary || 0) + Number(bonus || 0) - Number(deductions || 0));

  const submit = async (e) => {
    e.preventDefault();
    if (contractInactive && !editId) { toast.error(t.pay_contract_inactive(employee_name)); return; }
    if (!employee_name || !base_salary) { toast.warning(t.lbl_required); return; }
    const month = payment_date ? payment_date.slice(0, 7) : localMonth();
    const body = { employee_name, month, payment_date: payment_date || null, base_salary: Number(base_salary), bonus: Number(bonus || 0), deductions: Number(deductions || 0), net: net(), status, currency };
    try {
      const res = editId
        ? await fetch(`/api/payroll/${editId}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) })
        : await fetch("/api/payroll", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      if (!res.ok) throw new Error();
      toast.success(editId ? t.pay_toast_update : t.pay_toast_add);
      resetForm(); fetchRecords();
    } catch { toast.error(t.pay_toast_err); }
  };

  const resetForm = () => {
    setEmployee_name(""); setPayment_date(""); setBase_salary(""); setBonus(""); setDeductions(""); setStatus("Pending"); setCurrency("IQD"); setEditId(null); setShowForm(false); setContractInactive(false);
  };

  const prepareEdit = (rec) => {
    setEmployee_name(rec.employee_name);
    setPayment_date(rec.payment_date ? rec.payment_date.split("T")[0] : "");
    setBase_salary(rec.base_salary || ""); setBonus(rec.bonus || "");
    setDeductions(rec.deductions || ""); setStatus(rec.status); setCurrency(rec.currency || "IQD");
    setEditId(rec.id); setShowForm(true);
  };

  const markPaid = async (id) => {
    const rec = records.find(r => r.id === id);
    if (!rec) return;
    try {
      const payDate = rec.payment_date ? String(rec.payment_date).slice(0, 10) : localToday();
      const res = await fetch(`/api/payroll/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          employee_name: rec.employee_name,
          month:         rec.month || payDate.slice(0, 7),
          payment_date:  payDate,
          base_salary:   Number(rec.base_salary),
          bonus:         Number(rec.bonus || 0),
          deductions:    Number(rec.deductions || 0),
          net:           Number(rec.net || 0),
          status:        "Paid",
        }),
      });
      if (!res.ok) throw new Error();
      toast.success(t.pay_toast_paid); fetchRecords();
    } catch { toast.error(t.pay_toast_err_upd); }
  };

  const deleteRecord = async (id) => {
    try { const res = await fetch(`/api/payroll/${id}`, { method: "DELETE" }); if (!res.ok) throw new Error(); toast.success(t.pay_toast_delete); fetchRecords(); }
    catch { toast.error(t.pay_toast_err_del); }
  };

  const filteredRecords = records.filter(r => {
    if (!filterDate) return true;
    const pd = r.payment_date ? r.payment_date.slice(0, 7) : "";
    return pd === filterDate;
  });

  const paidRecords     = filteredRecords.filter(r => r.status === "Paid");
  const totalIQD        = paidRecords.reduce((s, r) => s + (Number(r.net) || 0), 0);
  const paid            = paidRecords.length;
  const pending         = filteredRecords.filter(r => r.status === "Pending").length;
  const totalDeductions = paidRecords.reduce((s, r) => s + (Number(r.deductions) || 0), 0);

  const monthLabel = filterDate
    ? new Date(filterDate + "-01").toLocaleDateString("en-GB", { month: "long", year: "numeric" })
    : new Date().toLocaleDateString("en-GB", { month: "long", year: "numeric" });

  const getEmpData = (name) => {
    const idx = employees.findIndex(e => e.employee_name === name);
    const emp = employees[idx];
    return {
      dept: emp?.department || "—",
      image: emp?.image || "",
      ac: AVATAR_COLORS[idx >= 0 ? idx % AVATAR_COLORS.length : 0],
    };
  };

  const viewToggle = (
    <div className="emp-view-toggle">
      <button className={`emp-view-btn${viewMode === "grid" ? " active" : ""}`} onClick={() => setViewMode("grid")} title="Grid View">
        <LayoutGrid size={15} />
      </button>
      <button className={`emp-view-btn${viewMode === "table" ? " active" : ""}`} onClick={() => setViewMode("table")} title="Table View">
        <List size={15} />
      </button>
    </div>
  );

  const renderCard = (rec) => {
    const empData = getEmpData(rec.employee_name);
    const payDate = fmtDate(rec.payment_date);
    return (
      <div key={rec.id} className="emp-card">
        <div className="pay-avatar-sm" style={{ background: empData.image ? "transparent" : empData.ac.bg, color: empData.ac.color, margin: "4px auto 6px" }}>
          {empData.image ? <img src={empData.image} alt={rec.employee_name} className="pay-avatar-img" /> : rec.employee_name.charAt(0).toUpperCase()}
        </div>
        <div className="emp-card-name">{rec.employee_name}</div>
        <div className="emp-card-empid">{empData.dept}</div>
        <div className="emp-card-email">{payDate}</div>
        <div className="emp-card-badges">
          <Badge text={rec.status} />
        </div>
        <div className="emp-card-salary">{Number(rec.net || 0).toLocaleString()} {rec.currency || "IQD"}</div>
        {rec.bonus > 0 && <div style={{ fontSize: 10, color: "#10b981", marginBottom: 4 }}>+{Number(rec.bonus).toLocaleString()} bonus</div>}
        {rec.deductions > 0 && <div style={{ fontSize: 10, color: "#ef4444", marginBottom: 8 }}>-{Number(rec.deductions).toLocaleString()} deductions</div>}
        <div className="emp-card-actions" onClick={e => e.stopPropagation()}>
          {(rec.status === "Pending" || rec.status === "Failed") && <button className="hr-btn-sm hr-btn-appr" onClick={() => markPaid(rec.id)}>{t.pay_btn_mark}</button>}
          <button className="hr-btn-sm hr-btn-edit" onClick={() => prepareEdit(rec)}>{t.btn_edit}</button>
          <DeleteConfirmDialog onConfirm={() => deleteRecord(rec.id)} itemName="record" />
        </div>
      </div>
    );
  };

  const columns = [
    { key: "num",          label: "#" },
    { key: "employee",     label: t.col_employee },
    { key: "payment_date", label: t.pay_col_payment_date },
    { key: "base",         label: t.pay_col_base },
    { key: "bonus",        label: t.pay_col_bonus },
    { key: "deductions",   label: t.pay_col_deductions },
    { key: "net",          label: t.pay_col_net },
    { key: "status",       label: t.col_status },
    { key: "action",       label: t.col_actions },
  ];

  return (
    <>
      {/* Header */}
      <div className="hr-ph">
        <div className="ph-title-group">
          <div className="hr-pt">{t.pay_title}</div>
          <div className="hr-ps">{new Date().toLocaleDateString("en-US", { month: "long", year: "numeric" })}</div>
        </div>
        <div className="ph-main-actions">
          <input
            type="month"
            value={filterDate}
            onChange={e => setFilterDate(e.target.value)}
            className="pay-month-input"
          />
          <button className="btn-print" onClick={() => window.print()} title={t.btn_print}><Printer size={13} /> {t.btn_print}</button>
        </div>
        <div className="ph-extra-actions">
          <button className="hr-btn" onClick={() => { resetForm(); setShowForm(true); }}><Plus size={13} /> {t.pay_btn_add}</button>
        </div>
      </div>

      {/* Print-only header */}
      <div className="pay-print-header">
        <div className="pay-print-title">{t.pay_title}</div>
        <div className="pay-print-month">{monthLabel}</div>
      </div>

      <div className="flex flex-1 flex-col gap-4 p-4 shiny-ring">
        <div className="pay-stats-grid">
          <div className="emp-stat-card emp-stat-card--all">
            <div className="emp-stat-card__icon"><DollarSign size={18} /></div>
            <div className="emp-stat-card__count">{totalIQD.toLocaleString()} IQD</div>
            <div className="emp-stat-card__label">{t.pay_stat_total}</div>
          </div>
          <div className="emp-stat-card emp-stat-card--active">
            <div className="emp-stat-card__icon"><CheckCircle size={18} /></div>
            <div className="emp-stat-card__count">{paid}</div>
            <div className="emp-stat-card__label">{t.pay_stat_paid}</div>
          </div>
          <div className="emp-stat-card emp-stat-card--onleave">
            <div className="emp-stat-card__icon"><Clock size={18} /></div>
            <div className="emp-stat-card__count">{pending}</div>
            <div className="emp-stat-card__label">{t.pay_stat_pending}</div>
          </div>
          <div className="emp-stat-card emp-stat-card--suspended">
            <div className="emp-stat-card__icon"><TrendingDown size={18} /></div>
            <div className="emp-stat-card__count">{totalDeductions.toLocaleString()} IQD</div>
            <div className="emp-stat-card__label">{t.pay_stat_deductions}</div>
          </div>
        </div>

        <DataTable columns={columns} data={filteredRecords} itemLabel="payroll records" viewMode={viewMode} renderCard={renderCard} viewToggle={viewToggle} renderRow={(rec, index) => (
          <TableRow key={rec.id} className="hover:bg-muted/50">
            <TableCell className="pay-tbl-idx">{index + 1}</TableCell>
            <TableCell>
              <button
                onClick={() => router.push(`/payroll?panel=salaries&emp=${encodeURIComponent(rec.employee_name)}`)}
                className="pay-emp-cell pay-emp-cell-btn"
              >
                {(() => { const emp = getEmpData(rec.employee_name); return (
                  <>
                    <div className="pay-avatar-sm" style={{ background: emp.image ? "transparent" : emp.ac.bg, color: emp.ac.color }}>
                      {emp.image ? <img src={emp.image} alt={rec.employee_name} className="pay-avatar-img" /> : rec.employee_name.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <div className="pay-tbl-emp-name">{rec.employee_name}</div>
                      <div className="pay-tbl-emp-dept">{emp.dept}</div>
                    </div>
                  </>
                ); })()}
              </button>
            </TableCell>
            <TableCell className="pay-tbl-date">
              {fmtDate(rec.payment_date)}
            </TableCell>
            <TableCell className="pay-tbl-base">{Number(rec.base_salary || 0).toLocaleString()}</TableCell>
            <TableCell><span className="pay-tbl-bonus">{rec.bonus ? `+${Number(rec.bonus).toLocaleString()}` : "—"}</span></TableCell>
            <TableCell><span className="pay-tbl-deductions">{rec.deductions ? `-${Number(rec.deductions).toLocaleString()}` : "—"}</span></TableCell>
            <TableCell><span className="pay-tbl-net">{Number(rec.net || 0).toLocaleString()} {rec.currency || "IQD"}</span></TableCell>
            <TableCell><Badge text={rec.status} /></TableCell>
            <TableCell>
              <div className="pay-tbl-actions">
                {(rec.status === "Pending" || rec.status === "Failed") && <button className="hr-btn-sm hr-btn-appr" onClick={() => markPaid(rec.id)}>{t.pay_btn_mark}</button>}
                <button className="hr-btn-sm hr-btn-edit" onClick={() => prepareEdit(rec)}>{t.btn_edit}</button>
                <DeleteConfirmDialog onConfirm={() => deleteRecord(rec.id)} itemName="record" />
              </div>
            </TableCell>
          </TableRow>
        )} />
      </div>

      {/* Modal */}
      {showForm && (
        <div className="hr-modal-overlay">
          <div className="hr-modal-bg" onClick={resetForm} />
          <div className="hr-modal">
            <h2 className="hr-modal-title">{editId ? t.pay_modal_edit : t.pay_modal_add}</h2>
            <button className="hr-modal-close" onClick={resetForm}>✕</button>
            <form onSubmit={submit} className="pay-form">
              <div className="pay-form-field">
                <Label>{t.lbl_employee}</Label>
                <Select value={employee_name} onValueChange={async (val) => {
                  setEmployee_name(val);
                  setContractInactive(false);
                  const emp = employees.find(e => e.employee_name === val);
                  if (emp && emp.salary) setBase_salary(String(emp.salary));
                  try {
                    const res = await fetch("/api/contracts");
                    const contracts = await res.json();
                    if (Array.isArray(contracts)) {
                      const empContracts = contracts.filter(c => c.employee_name === val);
                      if (empContracts.length > 0) {
                        const latest = empContracts.sort((a, b) => new Date(b.start_date) - new Date(a.start_date))[0];
                        if (latest.status === "Inactive" || latest.status === "Expired") setContractInactive(true);
                      }
                    }
                  } catch (e) { console.error(e); }
                }}>
                  <SelectTrigger><SelectValue placeholder={t.lbl_select_emp} /></SelectTrigger>
                  <SelectContent>{employees.map(e => <SelectItem key={e.id} value={e.employee_name}>{e.employee_name}</SelectItem>)}</SelectContent>
                </Select>
                {contractInactive && (
                  <div className="att-on-leave-banner" style={{ background: "#FEE2E2", borderColor: "#FECACA", color: "#DC2626", marginTop: 8 }}>
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#DC2626" strokeWidth="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
                    <span>{t.pay_contract_inactive(employee_name)}</span>
                  </div>
                )}
              </div>
              <div className="pay-form-grid">
                <div className="pay-form-field"><Label>{t.pay_fld_payment_date}</Label><Input type="date" value={payment_date} onChange={e => setPayment_date(e.target.value)} /></div>
                <div className="pay-form-field"><Label>{t.pay_fld_base}</Label><Input type="number" value={base_salary} onChange={e => setBase_salary(e.target.value)} placeholder="0" required /></div>
                <div className="pay-form-field"><Label>{t.pay_fld_bonus}</Label><Input type="number" value={bonus} onChange={e => setBonus(e.target.value)} placeholder="0" /></div>
                <div className="pay-form-field"><Label>{t.pay_fld_deductions}</Label><Input type="number" value={deductions} onChange={e => setDeductions(e.target.value)} placeholder="0" /></div>
                <div className="pay-form-field"><Label>{t.pay_col_net} (auto)</Label><Input value={`${net().toLocaleString()} IQD`} readOnly className="pay-net-input" /></div>
              </div>
              <div className="pay-form-field">
                <Label>{t.lbl_status}</Label>
                <Select value={status} onValueChange={setStatus}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{["Pending","Paid","Failed"].map(s => <SelectItem key={s} value={s}>{tv(s)}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="pay-form-footer">
                <button type="button" onClick={resetForm} className="form-btn-cancel">{t.btn_cancel}</button>
                <button type="submit" className="pay-btn-submit">{editId ? t.pay_btn_update : t.pay_btn_add}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}

export default function Payroll() {
  const router = useRouter();
  const panel  = router.query.panel || "management";

  return (
    <>
      {panel === "management" && <PayrollManagementTab />}
      {panel === "salaries"   && <EmployeeSalaries />}
    </>
  );
}
