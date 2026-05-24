import { useState, useEffect } from "react";
import { useLanguage } from "@/contexts/LanguageContext";
import { useFormVisibility } from "@/components/FormVisibilityContext";
import { toast } from "sonner";
import { Plus, DollarSign, CheckCircle, Clock, Printer } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { TableCell, TableRow } from "@/components/ui/table";
import DataTable from "@/components/DataTable";
import DeleteConfirmDialog from "@/components/DeleteConfirmDialog";

const localToday = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`; };
const localMonth = () => localToday().slice(0, 7);
const fmtDate = s => s ? new Date(String(s).slice(0,10)+"T00:00:00").toLocaleDateString("en-GB",{day:"2-digit",month:"short",year:"numeric"}) : "—";

const AV_COLORS = [
  { bg: "#EFF6FF", color: "#1D4ED8" }, { bg: "#DCFCE7", color: "#15803D" },
  { bg: "#FEF9C3", color: "#92400E" }, { bg: "#F3E8FF", color: "#7C3AED" },
  { bg: "#FEE2E2", color: "#DC2626" }, { bg: "#DBEAFE", color: "#1E40AF" },
];
const STATUS_CFG = { Pending: { bg: "#FEF9C3", color: "#92400E" }, Approved: { bg: "#DCFCE7", color: "#15803D" }, Rejected: { bg: "#FEE2E2", color: "#DC2626" } };
const CAT_CFG    = { Travel: { bg: "#F1F5F9", color: "#64748B" }, Equipment: { bg: "#F1F5F9", color: "#64748B" }, Meals: { bg: "#F1F5F9", color: "#64748B" }, Other: { bg: "#F1F5F9", color: "#64748B" } };

function Badge({ text, cfg }) {
  const { tv } = useLanguage();
  const c = (cfg || STATUS_CFG)[text] || { bg: "#F1F5F9", color: "#64748B" };
  return <span className="hr-badge" style={{ background: c.bg, color: c.color }}>{tv(text) || "—"}</span>;
}


export default function Expenses() {
  const { t, tv } = useLanguage();
  const [records, setRecords] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [employee_name, setEmployee_name] = useState("");
  const [category, setCategory] = useState("");
  const [amount, setAmount] = useState("");
  const [date, setDate] = useState(localToday());
  const [description, setDescription] = useState("");
  const [status, setStatus] = useState("Pending");
  const [editId, setEditId] = useState(null);
  const [filter, setFilter] = useState("All");
  const [filterDate, setFilterDate] = useState(localMonth());
  const { showForm, setShowForm } = useFormVisibility();

  useEffect(() => { fetchRecords(); fetchEmployees(); }, []);

  const fetchRecords = async () => {
    try { const res = await fetch("/api/expenses"); const data = await res.json(); setRecords(Array.isArray(data) ? data : []); }
    catch (e) { console.error(e); }
  };
  const fetchEmployees = async () => {
    try { const res = await fetch("/api/employee"); const data = await res.json(); setEmployees(Array.isArray(data) ? data : data.employees || []); }
    catch (e) { console.error(e); }
  };

  const submit = async (e) => {
    e.preventDefault();
    if (!employee_name || !amount || !date) { toast.warning(t.lbl_required); return; }
    const body = { employee_name, category, amount: Number(amount), date, description, status };
    try {
      if (editId) {
        const res = await fetch(`/api/expenses/${editId}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
        if (!res.ok) throw new Error();
        setRecords(prev => prev.map(r => r.id === editId ? { ...r, ...body } : r));
        toast.success(t.exp_toast_update);
      } else {
        const res = await fetch("/api/expenses", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
        if (!res.ok) throw new Error();
        const result = await res.json();
        const newRecord = { id: result.id, ...body };
        setRecords(prev => [newRecord, ...prev]);
        toast.success(t.exp_toast_add);
      }
      resetForm();
    } catch { toast.error(t.exp_toast_err); }
  };

  const resetForm = () => {
    setEmployee_name(""); setAmount(""); setDate(localToday());
    setDescription(""); setCategory(""); setStatus("Pending"); setEditId(null); setShowForm(false);
  };


  const prepareEdit = (rec) => {
    setEmployee_name(rec.employee_name); setCategory(rec.category || ""); setAmount(rec.amount || "");
    setDate(rec.date ? rec.date.split("T")[0] : ""); setDescription(rec.description || ""); setStatus(rec.status); setEditId(rec.id); setShowForm(true);
  };

  const updateStatus = async (id, newStatus) => {
    const previous = records;
    setRecords(prev => prev.map(r => r.id === id ? { ...r, status: newStatus } : r));
    try {
      const rec = records.find(r => r.id === id);
      const res = await fetch(`/api/expenses/${id}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...rec, status: newStatus }) });
      if (!res.ok) throw new Error();
      toast.success(newStatus === "Approved" ? t.exp_toast_approved : t.exp_toast_rejected);
    } catch {
      setRecords(previous);
      toast.error(t.exp_toast_err_upd);
    }
  };

  const deleteRecord = async (id) => {
    const previous = records;
    setRecords(prev => prev.filter(r => r.id !== id));
    try {
      const res = await fetch(`/api/expenses/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error();
      toast.success(t.exp_toast_delete);
    } catch {
      setRecords(previous);
      toast.error(t.exp_toast_err_del);
    }
  };

  const filtered = records.filter(r => {
    const matchStatus = filter === "All" || r.status === filter;
    const matchDate = !filterDate || (r.date && r.date.slice(0, 7) === filterDate);
    return matchStatus && matchDate;
  });

  const totalClaims   = filtered.filter(r => r.status === "Approved").reduce((s, r) => s + (Number(r.amount) || 0), 0);
  const totalApproved = filtered.filter(r => r.status === "Approved").reduce((s, r) => s + (Number(r.amount) || 0), 0);
  const totalPending  = filtered.filter(r => r.status === "Pending").reduce((s, r) => s + (Number(r.amount) || 0), 0);

  const getEmpData = (name) => { const idx = employees.findIndex(e => e.employee_name === name); return { dept: employees[idx]?.department || "—", email: employees[idx]?.email || "", ac: AV_COLORS[idx >= 0 ? idx % AV_COLORS.length : 0] }; };

  const monthLabel = filterDate
    ? new Date(filterDate + "-01").toLocaleDateString("en-GB", { month: "long", year: "numeric" })
    : new Date().toLocaleDateString("en-GB", { month: "long", year: "numeric" });

  const columns = [
    { key: "num",         label: "#" },
    { key: "employee",    label: t.col_employee },
    { key: "category",   label: t.exp_col_category },
    { key: "amount",     label: t.exp_col_amount },
    { key: "date",       label: t.col_date },
    { key: "description",label: t.exp_col_desc },
    { key: "status",     label: t.col_status },
    { key: "actions",    label: t.col_actions },
  ];

  return (
    <>
      {/* Always visible header */}
      <div className="hr-ph">
        <div className="ph-title-group">
          <div className="hr-pt">{t.exp_title}</div>
          <div className="hr-ps">{t.exp_claims_sub(records.length)}</div>
        </div>
        <div className="ph-main-actions">
          <input type="month" value={filterDate} onChange={e => setFilterDate(e.target.value)} className="exp-month-input" />
        </div>
        <div className="ph-extra-actions">
          <button className="btn-print" onClick={() => window.print()} title={t.btn_print}><Printer size={13} /> {t.btn_print}</button>
          <button className="hr-btn" onClick={() => { resetForm(); setShowForm(true); }}><Plus size={13} /> {t.exp_btn}</button>
        </div>
      </div>

      {/* Print-only header */}
      <div className="exp-print-header">
        <div className="exp-print-title">{t.exp_title}</div>
        <div className="exp-print-month">{monthLabel}</div>
      </div>

      {/* Always visible content */}
      <div className="flex flex-1 flex-col gap-4 p-4 shiny-ring">
        <div className="hr-stat-grid-3">
          <div className="emp-stat-card emp-stat-card--all">
            <div className="emp-stat-card__icon"><DollarSign size={18} /></div>
            <div className="emp-stat-card__count">{totalClaims.toLocaleString()} IQD</div>
            <div className="emp-stat-card__label">{t.exp_stat_total}</div>
          </div>
          <div className="emp-stat-card emp-stat-card--active">
            <div className="emp-stat-card__icon"><CheckCircle size={18} /></div>
            <div className="emp-stat-card__count">{totalApproved.toLocaleString()} IQD</div>
            <div className="emp-stat-card__label">{t.exp_stat_approved}</div>
          </div>
          <div className="emp-stat-card emp-stat-card--onleave">
            <div className="emp-stat-card__icon"><Clock size={18} /></div>
            <div className="emp-stat-card__count">{totalPending.toLocaleString()} IQD</div>
            <div className="emp-stat-card__label">{t.exp_stat_pending}</div>
          </div>
        </div>
        <DataTable columns={columns} data={filtered} itemLabel="expenses"
          toolbar={
            <div className="hr-filters">
              {["All","Pending","Approved","Rejected"].map(f => (
                <button key={f} className={`hr-chip${filter === f ? " on" : ""}`} onClick={() => setFilter(f)}>
                  {f === "All" ? t.lbl_all : tv(f)}
                </button>
              ))}
            </div>
          }
          renderRow={(rec, index) => {
          const emp = getEmpData(rec.employee_name);
          return (
            <TableRow key={rec.id} className="hover:bg-muted/50">
              <TableCell className="exp-num-cell">{index + 1}</TableCell>
              <TableCell className="min-w-[150px]">
                <div>
                  <div className="exp-emp-name">{rec.employee_name}</div>
                  <div className="hr-emp-id">{emp.dept}</div>
                </div>
              </TableCell>
              <TableCell><Badge text={rec.category} cfg={CAT_CFG} /></TableCell>
              <TableCell><span className="exp-amount-val">{Number(rec.amount || 0).toLocaleString()} IQD</span></TableCell>
              <TableCell className="exp-date-cell">{fmtDate(rec.date)}</TableCell>
              <TableCell className="exp-desc-cell">{rec.description || "—"}</TableCell>
              <TableCell><Badge text={rec.status} cfg={STATUS_CFG} /></TableCell>
              <TableCell>
                <div className="exp-action-btns">
                  {rec.status === "Pending" && <>
                    <button className="hr-btn-sm hr-btn-appr" onClick={() => updateStatus(rec.id, "Approved")}>{t.btn_approve}</button>
                    <button className="hr-btn-sm hr-btn-rej"  onClick={() => updateStatus(rec.id, "Rejected")}>{t.btn_reject}</button>
                  </>}
                  <button className="hr-btn-sm hr-btn-edit" onClick={() => prepareEdit(rec)}>{t.btn_edit}</button>
                  <DeleteConfirmDialog onConfirm={() => deleteRecord(rec.id)} itemName={t.exp_del_item} />
                </div>
              </TableCell>
            </TableRow>
          );
        }} />
      </div>

      {/* Modal */}
      {showForm && (
        <div className="hr-modal-overlay">
          <div className="hr-modal-bg" onClick={resetForm} />
          <div className="hr-modal">
            <h2 className="hr-modal-title">{editId ? t.exp_modal_edit : t.exp_modal_add}</h2>
            <button className="hr-modal-close" onClick={resetForm}>✕</button>
            <form onSubmit={submit} className="exp-form">
              <div className="exp-form-field">
                <Label>{t.lbl_employee}</Label>
                <Select value={employee_name} onValueChange={setEmployee_name}>
                  <SelectTrigger><SelectValue placeholder={t.lbl_select_emp} /></SelectTrigger>
                  <SelectContent>{employees.map(e => <SelectItem key={e.id} value={e.employee_name}>{e.employee_name}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="exp-form-grid">
                <div className="exp-form-field">
                  <Label>{t.exp_fld_category}</Label>
                  <Input value={category} onChange={e => setCategory(e.target.value)} placeholder="e.g. Travel, Meals..." />
                </div>
                <div className="exp-form-field">
                  <Label>{t.exp_fld_amount}</Label>
                  <Input type="number" value={amount} onChange={e => setAmount(e.target.value)} placeholder="0" required />
                </div>
                <div className="exp-form-field">
                  <Label>{t.lbl_date}</Label>
                  <Input type="date" value={date} onChange={e => setDate(e.target.value)} required />
                </div>
                <div className="exp-form-field">
                  <Label>{t.lbl_status}</Label>
                  <Select value={status} onValueChange={setStatus}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{["Pending","Approved","Rejected"].map(s => <SelectItem key={s} value={s}>{tv(s)}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
              </div>
              <div className="exp-form-field">
                <Label>{t.exp_fld_desc}</Label>
                <Textarea value={description} onChange={e => setDescription(e.target.value)} placeholder={t.exp_ph_desc} rows={3} />
              </div>
              <div className="exp-form-footer">
                <button type="button" onClick={resetForm} className="form-btn-cancel">{t.btn_cancel}</button>
                <button type="submit" className="exp-btn-submit">{editId ? t.exp_btn_update : t.exp_btn_add}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
