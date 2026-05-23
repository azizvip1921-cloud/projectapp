import { useState, useEffect } from "react";
import { useLanguage } from "@/contexts/LanguageContext";
import { useFormVisibility } from "@/components/FormVisibilityContext";
import { toast } from "sonner";
import { Plus, Clock, CheckCircle, XCircle } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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

export default function Requests() {
  const { t, tv } = useLanguage();
  const [records, setRecords] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [employee_name, setEmployee_name] = useState("");
  const [request_type, setRequest_type] = useState("Transfer Request");
  const [subject, setSubject] = useState("");
  const [submitted_date, setSubmitted_date] = useState(new Date().toISOString().split("T")[0]);
  const [status, setStatus] = useState("Pending");
  const [notes, setNotes] = useState("");
  const [editId, setEditId] = useState(null);
  const [filter, setFilter] = useState("All");
  const { showForm, setShowForm } = useFormVisibility();

  useEffect(() => { fetchRecords(); fetchEmployees(); }, []);

  const fetchRecords = async () => {
    try { const res = await fetch("/api/requests"); const data = await res.json(); setRecords(Array.isArray(data) ? data : []); }
    catch (e) { console.error(e); }
  };
  const fetchEmployees = async () => {
    try { const res = await fetch("/api/employee"); const data = await res.json(); setEmployees(Array.isArray(data) ? data : data.employees || []); }
    catch (e) { console.error(e); }
  };

  const submit = async (e) => {
    e.preventDefault();
    if (!employee_name || !subject) { toast.warning(t.lbl_required); return; }
    const body = { employee_name, request_type, subject, submitted_date, status, notes };
    try {
      const res = editId
        ? await fetch(`/api/requests/${editId}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) })
        : await fetch("/api/requests", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      if (!res.ok) throw new Error();
      toast.success(editId ? t.req_toast_update : t.req_toast_add);
      resetForm(); fetchRecords();
    } catch { toast.error(t.req_toast_err); }
  };

  const resetForm = () => {
    setEmployee_name(""); setRequest_type("Transfer Request"); setSubject(""); setSubmitted_date(new Date().toISOString().split("T")[0]);
    setStatus("Pending"); setNotes(""); setEditId(null); setShowForm(false);
  };

  const prepareEdit = (rec) => {
    setEmployee_name(rec.employee_name); setRequest_type(rec.request_type || "Transfer Request"); setSubject(rec.subject || "");
    setSubmitted_date(rec.submitted_date ? rec.submitted_date.split("T")[0] : ""); setStatus(rec.status); setNotes(rec.notes || ""); setEditId(rec.id); setShowForm(true);
  };

  const updateStatus = async (id, newStatus) => {
    try {
      const rec = records.find(r => r.id === id);
      const res = await fetch(`/api/requests/${id}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...rec, status: newStatus }) });
      if (!res.ok) throw new Error();
      toast.success(newStatus === "Approved" ? t.req_toast_approved : t.req_toast_rejected); fetchRecords();
    } catch { toast.error(t.req_toast_err_upd); }
  };

  const deleteRecord = async (id) => {
    try { const res = await fetch(`/api/requests/${id}`, { method: "DELETE" }); if (!res.ok) throw new Error(); toast.success(t.req_toast_delete); fetchRecords(); }
    catch { toast.error(t.req_toast_err_del); }
  };

  const pending  = records.filter(r => r.status === "Pending").length;
  const approved = records.filter(r => r.status === "Approved").length;
  const rejected = records.filter(r => r.status === "Rejected").length;
  const filtered = filter === "All" ? records : records.filter(r => r.status === filter);

  const getEmpData = (name) => { const idx = employees.findIndex(e => e.employee_name === name); return { dept: employees[idx]?.department || "—", ac: AV_COLORS[idx >= 0 ? idx % AV_COLORS.length : 0] }; };

  const columns = [
    { key: "num",       label: "#" },
    { key: "employee",  label: t.col_employee },   { key: "type",      label: t.col_type },
    { key: "subject",   label: t.req_col_subject }, { key: "submitted", label: t.req_col_submitted },
    { key: "status",    label: t.col_status },      { key: "actions",   label: t.col_actions },
  ];

  return (
    <>
      {/* Header */}
      <div className="hr-ph">
        <div>
          <div className="hr-pt">{t.req_title}</div>
          <div className="hr-ps">{t.req_sub}</div>
        </div>
        <button className="hr-btn" onClick={() => { resetForm(); setShowForm(true); }}><Plus size={13} /> {t.req_btn}</button>
      </div>

      <div className="flex flex-1 flex-col gap-4 p-4 shiny-ring">
        <div className="hr-stat-grid-3">
          <div className="emp-stat-card emp-stat-card--onleave">
            <div className="emp-stat-card__icon"><Clock size={18} /></div>
            <div className="emp-stat-card__count">{pending}</div>
            <div className="emp-stat-card__label">{t.req_stat_pending}</div>
          </div>
          <div className="emp-stat-card emp-stat-card--active">
            <div className="emp-stat-card__icon"><CheckCircle size={18} /></div>
            <div className="emp-stat-card__count">{approved}</div>
            <div className="emp-stat-card__label">{t.req_stat_approved}</div>
          </div>
          <div className="emp-stat-card emp-stat-card--suspended">
            <div className="emp-stat-card__icon"><XCircle size={18} /></div>
            <div className="emp-stat-card__count">{rejected}</div>
            <div className="emp-stat-card__label">{t.req_stat_rejected}</div>
          </div>
        </div>
        <DataTable columns={columns} data={filtered} itemLabel="requests"
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
          return (
            <TableRow key={rec.id} className="hover:bg-muted/50">
              <TableCell className="req-tbl-idx">{index + 1}</TableCell>
              <TableCell className="min-w-[150px]">
                <div className="req-tbl-emp-name">{rec.employee_name}</div>
                <div className="req-tbl-emp-dept">{getEmpData(rec.employee_name).dept}</div>
              </TableCell>
              <TableCell><span className="hr-badge" style={{ background: "#F1F5F9", color: "#64748B" }}>{tv(rec.request_type) || "—"}</span></TableCell>
              <TableCell className="req-tbl-subject">{rec.subject || "—"}</TableCell>
              <TableCell className="req-tbl-date">{rec.submitted_date ? new Date(rec.submitted_date).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }) : "—"}</TableCell>
              <TableCell><Badge text={rec.status} cfg={STATUS_CFG} /></TableCell>
              <TableCell>
                <div className="req-tbl-actions">
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
            <h2 className="hr-modal-title">{editId ? t.req_modal_edit : t.req_modal_add}</h2>
            <button className="hr-modal-close" onClick={resetForm}>✕</button>
            <form onSubmit={submit} className="req-form">
              <div className="req-form-field">
                <Label>{t.lbl_employee}</Label>
                <Select value={employee_name} onValueChange={setEmployee_name}>
                  <SelectTrigger><SelectValue placeholder={t.lbl_select_emp} /></SelectTrigger>
                  <SelectContent>{employees.map(e => <SelectItem key={e.id} value={e.employee_name}>{e.employee_name}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="req-form-field">
                <Label>{t.req_fld_type}</Label>
                <Select value={request_type} onValueChange={setRequest_type}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{["Transfer Request","Salary Review","Equipment Request","Remote Work","Training","Other"].map(tp => <SelectItem key={tp} value={tp}>{tv(tp)}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="req-form-field"><Label>{t.req_fld_subject}</Label><Input value={subject} onChange={e => setSubject(e.target.value)} placeholder={t.req_ph_subject} required /></div>
              <div className="req-form-grid">
                <div className="req-form-field"><Label>{t.req_fld_date}</Label><Input type="date" value={submitted_date} onChange={e => setSubmitted_date(e.target.value)} /></div>
                <div className="req-form-field">
                  <Label>{t.lbl_status}</Label>
                  <Select value={status} onValueChange={setStatus}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{["Pending","Approved","Rejected"].map(s => <SelectItem key={s} value={s}>{tv(s)}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
              </div>
              <div className="req-form-field"><Label>{t.lbl_notes}</Label><Textarea value={notes} onChange={e => setNotes(e.target.value)} placeholder={t.req_ph_notes} rows={3} /></div>
              <div className="req-form-footer">
                <button type="button" onClick={resetForm} className="form-btn-cancel">{t.btn_cancel}</button>
                <button type="submit" className="req-btn-submit">{editId ? t.req_btn_update : t.req_btn_add}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
