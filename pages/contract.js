import { useState, useEffect } from "react";
import { useLanguage } from "@/contexts/LanguageContext";
import { useFormVisibility } from "@/components/FormVisibilityContext";
import { toast } from "sonner";
import { Plus, Printer } from "lucide-react";
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
const TYPE_CFG   = { Permanent: { bg: "#DCFCE7", color: "#15803D" }, Temporary: { bg: "#FEF9C3", color: "#92400E" }, "Part-time": { bg: "#DBEAFE", color: "#1D4ED8" }, Freelance: { bg: "#F3E8FF", color: "#7C3AED" } };
const STATUS_CFG = { Active: { bg: "#DCFCE7", color: "#15803D" }, Inactive: { bg: "#FEE2E2", color: "#DC2626" }, Expired: { bg: "#FEF9C3", color: "#92400E" }, "On Leave": { bg: "#DBEAFE", color: "#1D4ED8" }, Suspended: { bg: "#FEF3C7", color: "#92400E" } };

function Badge({ text, cfg }) {
  const { tv } = useLanguage();
  const c = cfg[text] || { bg: "#F1F5F9", color: "#64748B" };
  return <span className="hr-badge" style={{ background: c.bg, color: c.color }}>{tv(text) || "—"}</span>;
}

const getInitials = (name) => { if (!name) return "?"; return name.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2); };

export default function Contracts() {
  const { t, tv } = useLanguage();
  const [records, setRecords] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [employee_name, setEmployee_name] = useState("");
  const [department, setDepartment] = useState("");
  const [contract_type, setContract_type] = useState("Permanent");
  const [start_date, setStart_date] = useState("");
  const [end_date, setEnd_date] = useState("");
  const [salary, setSalary] = useState("");
  const [status, setStatus] = useState("Active");
  const [editId, setEditId] = useState(null);
  const [filter, setFilter] = useState("All");
  const { showForm, setShowForm } = useFormVisibility();

  useEffect(() => { fetchEmployees().then(emps => fetchRecords(emps)); }, []);

  const checkExpiredContracts = async (allRecords, allEmployees) => {
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const expired = allRecords.filter(r => {
      if (!r.end_date) return false;
      const end = new Date(r.end_date); end.setHours(0, 0, 0, 0);
      return end <= today && r.status !== "Inactive" && r.status !== "Expired";
    });
    for (const rec of expired) {
      await fetch(`/api/contracts/${rec.id}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ employee_name: rec.employee_name, department: rec.department, contract_type: rec.contract_type, start_date: rec.start_date, end_date: rec.end_date, salary: rec.salary, status: "Inactive" }) });
      const emp = allEmployees.find(e => e.employee_name === rec.employee_name);
      if (emp) await fetch(`/api/employee/${emp.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ status: "Inactive" }) });
      toast.warning(`⚠️ ${rec.employee_name} — Contract xlas bûye û bûye Inactive`, { duration: 8000 });
    }
    if (expired.length > 0) {
      const res = await fetch("/api/contracts");
      const data = await res.json();
      setRecords(Array.isArray(data) ? data : []);
    }
  };

  const fetchRecords = async (allEmployees) => {
    try {
      const res = await fetch("/api/contracts"); const data = await res.json();
      const recs = Array.isArray(data) ? data : [];
      setRecords(recs);
      const emps = allEmployees ?? employees;
      if (emps.length > 0) await checkExpiredContracts(recs, emps);
    } catch (e) { console.error(e); }
  };
  const fetchEmployees = async () => {
    try {
      const res = await fetch("/api/employee"); const data = await res.json();
      const emps = Array.isArray(data) ? data : data.employees || [];
      setEmployees(emps);
      return emps;
    } catch (e) { console.error(e); return []; }
  };

  const submit = async (e) => {
    e.preventDefault();
    if (!employee_name || !start_date || !contract_type) { toast.warning(t.lbl_required); return; }
    const body = { employee_name, department, contract_type, start_date, end_date, salary: Number(salary || 0), status };
    try {
      const res = editId
        ? await fetch(`/api/contracts/${editId}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) })
        : await fetch("/api/contracts", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      if (!res.ok) throw new Error();
      toast.success(editId ? "Updated" : "Contract added");
      resetForm(); fetchRecords();
    } catch { toast.error("An error occurred"); }
  };

  const resetForm = () => {
    setEmployee_name(""); setDepartment(""); setContract_type("Permanent"); setStart_date("");
    setEnd_date(""); setSalary(""); setStatus("Active"); setEditId(null); setShowForm(false);
  };

  const prepareEdit = (rec) => {
    setEmployee_name(rec.employee_name); setDepartment(rec.department || "");
    setContract_type(rec.contract_type || "Permanent"); setStart_date(rec.start_date ? rec.start_date.split("T")[0] : "");
    setEnd_date(rec.end_date ? rec.end_date.split("T")[0] : ""); setSalary(rec.salary || "");
    setStatus(rec.status); setEditId(rec.id); setShowForm(true);
  };

  const deleteRecord = async (id) => {
    try { const res = await fetch(`/api/contracts/${id}`, { method: "DELETE" }); if (!res.ok) throw new Error(); toast.success("Deleted"); fetchRecords(); }
    catch { toast.error("Failed to delete"); }
  };

  const stats = { total: records.length, active: records.filter(r => r.status === "Active").length, inactive: records.filter(r => r.status === "Inactive").length, onLeave: records.filter(r => r.status === "On Leave").length, suspended: records.filter(r => r.status === "Suspended").length, permanent: records.filter(r => r.contract_type === "Permanent").length, temporary: records.filter(r => r.contract_type === "Temporary").length };
  const filtered = filter === "All" ? records : records.filter(r => r.status === filter);

  const getEmpData = (name) => { const idx = employees.findIndex(e => e.employee_name === name); return { ac: AV_COLORS[idx >= 0 ? idx % AV_COLORS.length : 0], id: employees[idx]?.id, image: employees[idx]?.image || null }; };

  const columns = [
    { key: "num",        label: "#" },
    { key: "employee",   label: t.col_employee },   { key: "department", label: t.col_department },
    { key: "type",       label: t.col_type },        { key: "start",      label: t.cont_col_start },
    { key: "end",        label: t.cont_col_end },    { key: "salary",     label: t.col_salary },
    { key: "status",     label: t.col_status },      { key: "actions",    label: t.col_actions },
  ];

  return (
    <>
      {/* Header */}
      <div className="hr-ph">
        <div>
          <div className="hr-pt">{t.cont_title}</div>
          <div className="hr-ps">{t.cont_active_sub(stats.active)}</div>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <button className="btn-print" onClick={() => window.print()} title="Print"><Printer size={13} /> Print</button>
          <button className="hr-btn" onClick={() => { resetForm(); setShowForm(true); }}><Plus size={13} /> {t.cont_btn}</button>
        </div>
      </div>

      <div className="flex flex-1 flex-col gap-4 p-4 shiny-ring">
        <DataTable columns={columns} data={filtered} itemLabel="contracts"
          toolbar={
            <div className="hr-filters">
              {["All","Active","Inactive","Expired","On Leave","Suspended"].map(f => (
                <button key={f} className={`hr-chip${filter === f ? " on" : ""}`} onClick={() => setFilter(f)}>
                  {f === "All" ? t.lbl_all : tv(f)}
                </button>
              ))}
            </div>
          }
          renderRow={(rec, index) => {
          const emp = getEmpData(rec.employee_name);
          const empId = emp.id ? `EMP-${String(emp.id).padStart(3, "0")}` : "—";
          return (
            <TableRow key={rec.id} className="hover:bg-muted/50">
              <TableCell className="cont-num-cell">{index + 1}</TableCell>
              <TableCell className="whitespace-normal align-middle min-w-[160px]">
                <div className="cont-emp-cell">
                  <div className="cont-emp-avatar" style={{ background: emp.image ? "transparent" : emp.ac.bg, color: emp.ac.color }}>
                    {emp.image ? <img src={emp.image} alt={rec.employee_name} style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : getInitials(rec.employee_name)}
                  </div>
                  <div><div className="cont-emp-name">{rec.employee_name}</div><div className="hr-emp-id">{empId}</div></div>
                </div>
              </TableCell>
              <TableCell className="cont-dept-cell">{rec.department || "—"}</TableCell>
              <TableCell><Badge text={rec.contract_type} cfg={TYPE_CFG} /></TableCell>
              <TableCell style={{ fontSize: 12 }}>{rec.start_date ? new Date(rec.start_date).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }) : "—"}</TableCell>
              <TableCell style={{ fontSize: 12, color: "#94A3B8" }}>{rec.end_date ? new Date(rec.end_date).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }) : t.cont_indefinite}</TableCell>
              <TableCell><span className="cont-salary-val">{rec.salary ? `${Number(rec.salary).toLocaleString()} IQD` : "—"}</span></TableCell>
              <TableCell><Badge text={rec.status} cfg={STATUS_CFG} /></TableCell>
              <TableCell onClick={e => e.stopPropagation()}>
                <div className="cont-action-btns">
                  <button className="hr-btn-sm hr-btn-edit" onClick={() => prepareEdit(rec)}>{t.btn_edit}</button>
                  <DeleteConfirmDialog onConfirm={() => deleteRecord(rec.id)} itemName="contract" />
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
            <h2 className="hr-modal-title">{editId ? t.cont_modal_edit : t.cont_modal_add}</h2>
            <button className="hr-modal-close" onClick={resetForm}>✕</button>
            <form onSubmit={submit} className="cont-form">
              <div className="cont-form-field">
                <Label>{t.lbl_employee}</Label>
                <Select value={employee_name} onValueChange={(v) => { setEmployee_name(v); const emp = employees.find(e => e.employee_name === v); if (emp) { setDepartment(emp.department || ""); setSalary(emp.salary || ""); if (emp.contract_type) setContract_type(emp.contract_type); if (emp.status) setStatus(emp.status); } }}>
                  <SelectTrigger><SelectValue placeholder={t.lbl_select_emp} /></SelectTrigger>
                  <SelectContent>{employees.map(e => <SelectItem key={e.id} value={e.employee_name}>{e.employee_name}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="cont-form-field">
                <Label>{t.lbl_department}</Label>
                <Input value={department} onChange={e => setDepartment(e.target.value)} placeholder={t.lbl_department} />
              </div>
              <div className="cont-form-grid">
                <div className="cont-form-field">
                  <Label>{t.cont_fld_type}</Label>
                  <Select value={contract_type} onValueChange={setContract_type}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{["Permanent","Temporary","Part-time","Freelance"].map(t2 => <SelectItem key={t2} value={t2}>{tv(t2)}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div className="cont-form-field">
                  <Label>{t.lbl_status}</Label>
                  <Select value={status} onValueChange={setStatus}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{["Active","Inactive","Expired","On Leave","Suspended"].map(s => <SelectItem key={s} value={s}>{tv(s)}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div className="cont-form-field">
                  <Label>{t.cont_fld_start}</Label>
                  <Input type="date" value={start_date} onChange={e => setStart_date(e.target.value)} required />
                </div>
                <div className="cont-form-field">
                  <Label>{t.cont_fld_end}</Label>
                  <Input type="date" value={end_date} onChange={e => setEnd_date(e.target.value)} />
                </div>
              </div>
              <div className="cont-form-field">
                <Label>{t.cont_fld_salary}</Label>
                <Input type="number" value={salary} onChange={e => setSalary(e.target.value)} placeholder="0" />
              </div>
              <div className="cont-form-footer">
                <button type="button" onClick={resetForm} className="form-btn-cancel">{t.btn_cancel}</button>
                <button type="submit" className="cont-btn-submit">{editId ? t.cont_btn_update : t.cont_btn_add}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
