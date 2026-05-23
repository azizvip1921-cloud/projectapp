import { useState, useEffect } from "react";
import { useLanguage } from "@/contexts/LanguageContext";
import { useFormVisibility } from "@/components/FormVisibilityContext";
import { toast } from "sonner";
import { Plus, Clock, CheckCircle, XCircle } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { TableCell, TableRow } from "@/components/ui/table";
import DataTable from "@/components/DataTable";
import DeleteConfirmDialog from "@/components/DeleteConfirmDialog";

const AV_COLORS = [
  { bg: "#EFF6FF", color: "#1D4ED8" }, { bg: "#DCFCE7", color: "#15803D" },
  { bg: "#FEF9C3", color: "#92400E" }, { bg: "#F3E8FF", color: "#7C3AED" },
  { bg: "#FEE2E2", color: "#DC2626" }, { bg: "#DBEAFE", color: "#1E40AF" },
];
const STATUS_CFG = { Pending: { bg: "#FEF9C3", color: "#92400E" }, Approved: { bg: "#DCFCE7", color: "#15803D" }, Rejected: { bg: "#FEE2E2", color: "#DC2626" } };

function Badge({ text, cfg }) {
  const { tv } = useLanguage();
  const c = (cfg || STATUS_CFG)[text] || { bg: "#F1F5F9", color: "#64748B" };
  return <span className="hr-badge" style={{ background: c.bg, color: c.color }}>{tv(text) || "—"}</span>;
}


const getInitials = (name) => { if (!name) return "?"; return name.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2); };

export default function Leaves() {
  const { t, tv } = useLanguage();
  const [records, setRecords] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [employee_name, setEmployee_name] = useState("");
  const [leave_type, setLeave_type] = useState("");
  const [start_date, setStart_date] = useState("");
  const [end_date, setEnd_date] = useState("");
  const [status, setStatus] = useState("Pending");
  const [notes, setNotes] = useState("");
  const [editId, setEditId] = useState(null);
  const [filter, setFilter] = useState("All");
  const { showForm, setShowForm } = useFormVisibility();

  useEffect(() => { fetchRecords(); fetchEmployees(); }, []);

  const fetchRecords = async () => {
    try { const res = await fetch("/api/leaves"); const data = await res.json(); setRecords(Array.isArray(data) ? data : []); }
    catch (e) { console.error(e); }
  };
  const fetchEmployees = async () => {
    try { const res = await fetch("/api/employee"); const data = await res.json(); setEmployees(Array.isArray(data) ? data : data.employees || []); }
    catch (e) { console.error(e); }
  };

  const submit = async (e) => {
    e.preventDefault();
    if (!employee_name || !start_date || !end_date) { toast.warning(t.lbl_required); return; }
    const days = Math.ceil((new Date(end_date) - new Date(start_date)) / 86400000) + 1;
    const body = { employee_name, leave_type, start_date, end_date, days, status, notes };
    try {
      const res = editId
        ? await fetch(`/api/leaves/${editId}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) })
        : await fetch("/api/leaves", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      if (!res.ok) throw new Error();
      toast.success(editId ? t.leave_toast_update : t.leave_toast_add);
      resetForm(); fetchRecords();
    } catch { toast.error(t.leave_toast_err); }
  };

  const resetForm = () => {
    setEmployee_name(""); setLeave_type(""); setStart_date(""); setEnd_date("");
    setStatus("Pending"); setNotes(""); setEditId(null); setShowForm(false);
  };

  const prepareEdit = (rec) => {
    setEmployee_name(rec.employee_name); setLeave_type(rec.leave_type || "Annual");
    setStart_date(rec.start_date ? rec.start_date.split("T")[0] : "");
    setEnd_date(rec.end_date ? rec.end_date.split("T")[0] : "");
    setStatus(rec.status); setNotes(rec.notes || ""); setEditId(rec.id); setShowForm(true);
  };

  const updateStatus = async (id, newStatus) => {
    try {
      const rec = records.find(r => r.id === id);
      const res = await fetch(`/api/leaves/${id}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...rec, status: newStatus }) });
      if (!res.ok) throw new Error();
      toast.success(newStatus === "Approved" ? t.leave_toast_approved : t.leave_toast_rejected); fetchRecords();
    } catch { toast.error(t.leave_toast_err_upd); }
  };

  const deleteRecord = async (id) => {
    try { const res = await fetch(`/api/leaves/${id}`, { method: "DELETE" }); if (!res.ok) throw new Error(); toast.success(t.leave_toast_delete); fetchRecords(); }
    catch { toast.error(t.leave_toast_err_del); }
  };

  const stats = { Pending: records.filter(r => r.status === "Pending").length, Approved: records.filter(r => r.status === "Approved").length, Rejected: records.filter(r => r.status === "Rejected").length };
  const filtered = filter === "All" ? records : records.filter(r => r.status === filter);

  const getEmpData = (name) => {
    const idx = employees.findIndex(e => e.employee_name === name);
    return { dept: employees[idx]?.department || "—", ac: AV_COLORS[idx >= 0 ? idx % AV_COLORS.length : 0] };
  };

  const columns = [
    { key: "num",      label: "#" },
    { key: "employee", label: t.col_employee }, { key: "type",   label: t.col_type },
    { key: "start",    label: t.leave_col_start }, { key: "end", label: t.leave_col_end },
    { key: "days",     label: t.leave_col_days }, { key: "status", label: t.col_status },
    { key: "actions",  label: t.col_actions },
  ];

  return (
    <>
      {/* Always visible header */}
      <div className="hr-ph">
        <div>
          <div className="hr-pt">{t.leave_title}</div>
          <div className="hr-ps">{t.leave_sub(records.length)}</div>
        </div>
        <button className="hr-btn" onClick={() => { resetForm(); setShowForm(true); }}><Plus size={13} /> {t.leave_btn}</button>
      </div>

      {/* Always visible content */}
      <div className="flex flex-1 flex-col gap-4 p-4 shiny-ring">
        <div className="hr-stat-grid-3">
          <div className="emp-stat-card emp-stat-card--onleave">
            <div className="emp-stat-card__icon"><Clock size={18} /></div>
            <div className="emp-stat-card__count">{stats.Pending}</div>
            <div className="emp-stat-card__label">{t.leave_stat_pending}</div>
          </div>
          <div className="emp-stat-card emp-stat-card--active">
            <div className="emp-stat-card__icon"><CheckCircle size={18} /></div>
            <div className="emp-stat-card__count">{stats.Approved}</div>
            <div className="emp-stat-card__label">{t.leave_stat_approved}</div>
          </div>
          <div className="emp-stat-card emp-stat-card--suspended">
            <div className="emp-stat-card__icon"><XCircle size={18} /></div>
            <div className="emp-stat-card__count">{stats.Rejected}</div>
            <div className="emp-stat-card__label">{t.leave_stat_rejected}</div>
          </div>
        </div>

        <DataTable columns={columns} data={filtered} itemLabel="leave requests"
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
              <TableCell className="lr-num-cell">{index + 1}</TableCell>
              <TableCell className="min-w-[160px]">
                <div className="lr-emp-name">{rec.employee_name}</div>
                <div className="lr-emp-dept">{getEmpData(rec.employee_name).dept}</div>
              </TableCell>
              <TableCell className="lr-cell-sm">{rec.leave_type || "—"}</TableCell>
              <TableCell className="lr-cell-sm">{rec.start_date ? new Date(rec.start_date).toLocaleDateString() : "—"}</TableCell>
              <TableCell className="lr-cell-sm">{rec.end_date ? new Date(rec.end_date).toLocaleDateString() : "—"}</TableCell>
              <TableCell><span className="lr-days-val">{rec.days || "—"}</span></TableCell>
              <TableCell><Badge text={rec.status} cfg={STATUS_CFG} /></TableCell>
              <TableCell>
                <div className="lr-actions">
                  {rec.status === "Pending" && <>
                    <button className="hr-btn-sm hr-btn-appr" onClick={() => updateStatus(rec.id, "Approved")}>{t.btn_approve}</button>
                    <button className="hr-btn-sm hr-btn-rej"  onClick={() => updateStatus(rec.id, "Rejected")}>{t.btn_reject}</button>
                  </>}
                  <button className="hr-btn-sm hr-btn-edit" onClick={() => prepareEdit(rec)}>{t.btn_edit}</button>
                  <DeleteConfirmDialog onConfirm={() => deleteRecord(rec.id)} itemName="request" />
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
            <h2 className="hr-modal-title">{editId ? t.leave_modal_edit : t.leave_modal_add}</h2>
            <button className="hr-modal-close" onClick={resetForm}>✕</button>
            <form onSubmit={submit} className="lr-form">
              <div className="lr-field">
                <Label>{t.lbl_employee}</Label>
                <Select value={employee_name} onValueChange={setEmployee_name}>
                  <SelectTrigger><SelectValue placeholder={t.lbl_select_emp} /></SelectTrigger>
                  <SelectContent>{employees.map(e => <SelectItem key={e.id} value={e.employee_name}>{e.employee_name}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="lr-field">
                <Label>{t.leave_fld_type}</Label>
                <Input value={leave_type} onChange={e => setLeave_type(e.target.value)} placeholder={t.leave_fld_type} />
              </div>
              <div className="lr-grid-2">
                <div className="lr-field"><Label>{t.leave_fld_start}</Label><Input type="date" value={start_date} onChange={e => setStart_date(e.target.value)} required /></div>
                <div className="lr-field"><Label>{t.leave_fld_end}</Label><Input type="date" value={end_date} onChange={e => setEnd_date(e.target.value)} required /></div>
              </div>
              <div className="lr-field">
                <Label>{t.lbl_status}</Label>
                <Select value={status} onValueChange={setStatus}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{["Pending","Approved","Rejected"].map(s => <SelectItem key={s} value={s}>{tv(s)}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="lr-field"><Label>{t.lbl_notes}</Label><Input value={notes} onChange={e => setNotes(e.target.value)} placeholder={t.ph_notes_opt} /></div>
              <div className="lr-form-actions">
                <button type="button" onClick={resetForm} className="form-btn-cancel">{t.btn_cancel}</button>
                <button type="submit" className="lr-btn-submit">{editId ? t.leave_btn_update : t.leave_btn_add}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
