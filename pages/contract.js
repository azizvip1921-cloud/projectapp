import { useState, useEffect } from "react";
import { useLanguage } from "@/contexts/LanguageContext";
import { useFormVisibility } from "@/components/FormVisibilityContext";
import { toast } from "sonner";
import { Plus, FileText } from "lucide-react";
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
  const { t, tv, lang } = useLanguage();
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
      toast.warning(t.cont_expired_toast(rec.employee_name), { duration: 8000 });
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
    const endDateIsFuture = end_date && new Date(end_date) > new Date(new Date().toDateString());
    const shouldRestoreActive = editId && (!end_date || endDateIsFuture);
    const resolvedStatus = shouldRestoreActive ? "Active" : status;
    const body = { employee_name, department, contract_type, start_date, end_date, salary: Number(salary || 0), status: resolvedStatus };
    try {
      const res = editId
        ? await fetch(`/api/contracts/${editId}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) })
        : await fetch("/api/contracts", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      if (!res.ok) throw new Error();
      if (shouldRestoreActive) {
        const emp = employees.find(e => e.employee_name === employee_name);
        if (emp) await fetch(`/api/employee/${emp.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ status: "Active" }) });
      }
      toast.success(editId ? t.cont_toast_update : t.cont_toast_add);
      resetForm(); fetchRecords();
    } catch { toast.error(t.cont_toast_err); }
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
    try { const res = await fetch(`/api/contracts/${id}`, { method: "DELETE" }); if (!res.ok) throw new Error(); toast.success(t.cont_toast_delete); fetchRecords(); }
    catch { toast.error(t.cont_toast_err_del); }
  };

  const stats = { total: records.length, active: records.filter(r => r.status === "Active").length, inactive: records.filter(r => r.status === "Inactive").length, onLeave: records.filter(r => r.status === "On Leave").length, suspended: records.filter(r => r.status === "Suspended").length, permanent: records.filter(r => r.contract_type === "Permanent").length, temporary: records.filter(r => r.contract_type === "Temporary").length };
  const filtered = filter === "All" ? records : records.filter(r => r.status === filter);

  const printContract = (rec) => {
    const isRTL = lang === "ku" || lang === "ar";
    const dir = isRTL ? "rtl" : "ltr";
    const fontFamily = isRTL ? "'Noto Sans Arabic', Arial, sans-serif" : "Arial, sans-serif";

    const empData = employees.find(e => e.employee_name === rec.employee_name) || {};

    const L = {
      en: { title: "EMPLOYMENT CONTRACT", contractNo: "Contract No.", date: "Date", employeeName: "Employee Name", department: "Department", contractType: "Contract Type", startDate: "Start Date", endDate: "End Date", indefinite: "Indefinite", salary: "Monthly Salary", currency: "IQD", status: "Status", empSig: "Employee Signature", hrSig: "HR Manager Signature", sigDate: "Date", empDetails: "Employee Information", phone: "Phone", email: "Email", gender: "Gender", city: "City", dob: "Date of Birth", position: "Position", workHours: "Work Hours", contractDetails: "Contract Details" },
      ku: { title: "گرێبەستی کار", contractNo: "ژمارەی گرێبەست", date: "بەروار", employeeName: "ناوی کارمەند", department: "بەش", contractType: "جۆری گرێبەست", startDate: "بەرواری دەستپێکردن", endDate: "بەرواری کۆتایی", indefinite: "بێ کۆتایی", salary: "مووچەی مانگانە", currency: "دینار", status: "دۆخ", empSig: "واژووی کارمەند", hrSig: "واژووی بەڕێوەبەری HR", sigDate: "بەروار", empDetails: "زانیاری کارمەند", phone: "ژمارەی مۆبایل", email: "ئیمەیل", gender: "ڕەگەز", city: "شار", dob: "بەرواری لەدایکبوون", position: "پۆست", workHours: "کاتی کار", contractDetails: "زانیاری گرێبەست" },
      ar: { title: "عقد عمل", contractNo: "رقم العقد", date: "التاريخ", employeeName: "اسم الموظف", department: "القسم", contractType: "نوع العقد", startDate: "تاريخ البدء", endDate: "تاريخ الانتهاء", indefinite: "غير محدد", salary: "الراتب الشهري", currency: "دينار", status: "الحالة", empSig: "توقيع الموظف", hrSig: "توقيع مدير الموارد البشرية", sigDate: "التاريخ", empDetails: "معلومات الموظف", phone: "الهاتف", email: "البريد الإلكتروني", gender: "الجنس", city: "المدينة", dob: "تاريخ الميلاد", position: "المنصب", workHours: "ساعات العمل", contractDetails: "تفاصيل العقد" },
    }[lang] || { title: "EMPLOYMENT CONTRACT", contractNo: "Contract No.", date: "Date", employeeName: "Employee Name", department: "Department", contractType: "Contract Type", startDate: "Start Date", endDate: "End Date", indefinite: "Indefinite", salary: "Monthly Salary", currency: "IQD", status: "Status", empSig: "Employee Signature", hrSig: "HR Manager Signature", sigDate: "Date", empDetails: "Employee Information", phone: "Phone", email: "Email", gender: "Gender", city: "City", dob: "Date of Birth", position: "Position", workHours: "Work Hours", contractDetails: "Contract Details" };

    const typeMap = {
      en: { Permanent: "Permanent", Temporary: "Temporary", "Part-time": "Part-time", Freelance: "Freelance" },
      ku: { Permanent: "بە بردەوامی", Temporary: "کاتی", "Part-time": "نیوەی کات", Freelance: "فریلانسەر" },
      ar: { Permanent: "دائم", Temporary: "مؤقت", "Part-time": "دوام جزئي", Freelance: "مستقل" },
    };
    const statusMap = {
      en: { Active: "Active", Inactive: "Inactive", Expired: "Expired", "On Leave": "On Leave", Suspended: "Suspended" },
      ku: { Active: "چالاک", Inactive: "ناچالاک", Expired: "بەسەرچووی", "On Leave": "مۆڵەت", Suspended: "ئوقووفکراو" },
      ar: { Active: "نشط", Inactive: "غير نشط", Expired: "منتهي", "On Leave": "في إجازة", Suspended: "موقوف" },
    };
    const genderMap = {
      en: { Male: "Male", Female: "Female" },
      ku: { Male: "نێر", Female: "مێ" },
      ar: { Male: "ذكر", Female: "أنثى" },
    };

    const fmtDate = (d) => d ? new Date(d).toLocaleDateString("en-GB", { day: "2-digit", month: "long", year: "numeric" }) : "—";
    const borderSide = isRTL ? "border-right" : "border-left";

    const workHours = empData.work_start && empData.work_end
      ? `${empData.work_start} — ${empData.work_end}`
      : "—";

    const avatarHtml = empData.image
      ? `<img src="${empData.image}" style="width:80px;height:80px;border-radius:50%;object-fit:cover;border:2px solid #1a1a2e;" />`
      : `<div style="width:80px;height:80px;border-radius:50%;background:#EFF6FF;color:#1D4ED8;display:flex;align-items:center;justify-content:center;font-size:28px;font-weight:bold;border:2px solid #1a1a2e;">${empData.employee_name ? empData.employee_name.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2) : "?"}</div>`;

    const html = `<!DOCTYPE html>
<html dir="${dir}" lang="${lang}">
<head><meta charset="UTF-8"><title>${L.title}</title>
<style>
*{margin:0;padding:0;box-sizing:border-box}
body{font-family:${fontFamily};direction:${dir};background:#fff;color:#1a1a2e;padding:48px}
.header{text-align:center;border-bottom:3px double #1a1a2e;padding-bottom:20px;margin-bottom:28px}
.title{font-size:24px;font-weight:bold;letter-spacing:2px;margin-bottom:6px}
.meta{display:flex;justify-content:space-between;margin-bottom:22px;font-size:13px;color:#555}
.sec-title{font-size:13px;font-weight:bold;background:#f5f5f5;padding:6px 12px;margin-bottom:10px;${borderSide}:4px solid #1a1a2e;margin-top:20px}
.row{display:flex;padding:7px 12px;border-bottom:1px solid #eee;font-size:13px}
.lbl{font-weight:bold;width:200px;flex-shrink:0;color:#444}
.val{flex:1}
.emp-header{display:flex;align-items:center;gap:20px;padding:16px 12px;margin-bottom:4px;background:#f9fafb;border-radius:8px}
.emp-info{flex:1}
.emp-info-name{font-size:18px;font-weight:bold;margin-bottom:4px}
.emp-info-pos{font-size:13px;color:#64748b}
.sigs{margin-top:64px;display:flex;justify-content:space-between}
.sig{text-align:center;width:45%}
.sig-line{border-top:1px solid #333;margin-top:48px;padding-top:7px;font-size:13px;font-weight:bold}
.sig-date{margin-top:10px;font-size:12px;color:#888}
@media print{body{padding:24px}button{display:none}}
</style></head>
<body>
<div class="header"><div class="title">${L.title}</div></div>
<div class="meta">
  <span>${L.contractNo}: ${rec.id ? String(rec.id).padStart(4, "0") : "—"}</span>
  <span>${L.date}: ${new Date().toLocaleDateString("en-GB", { day: "2-digit", month: "long", year: "numeric" })}</span>
</div>

<div class="sec-title">${L.empDetails}</div>
<div class="emp-header">
  ${avatarHtml}
  <div class="emp-info">
    <div class="emp-info-name">${empData.employee_name || rec.employee_name || "—"}</div>
    <div class="emp-info-pos">${empData.type_of_job || "—"}</div>
  </div>
</div>
<div class="row"><span class="lbl">${L.employeeName}</span><span class="val">${empData.employee_name || rec.employee_name || "—"}</span></div>
<div class="row"><span class="lbl">${L.phone}</span><span class="val">${empData.number || "—"}</span></div>
<div class="row"><span class="lbl">${L.email}</span><span class="val">${empData.email || "—"}</span></div>
<div class="row"><span class="lbl">${L.gender}</span><span class="val">${(genderMap[lang] || genderMap.en)[empData.gender] || empData.gender || "—"}</span></div>
<div class="row"><span class="lbl">${L.city}</span><span class="val">${empData.city || "—"}</span></div>
<div class="row"><span class="lbl">${L.dob}</span><span class="val">${fmtDate(empData.date_of_birth)}</span></div>
<div class="row"><span class="lbl">${L.position}</span><span class="val">${empData.type_of_job || "—"}</span></div>
<div class="row"><span class="lbl">${L.department}</span><span class="val">${rec.department || empData.department || "—"}</span></div>
<div class="row"><span class="lbl">${L.workHours}</span><span class="val">${workHours}</span></div>

<div class="sec-title">${L.contractDetails}</div>
<div class="row"><span class="lbl">${L.contractType}</span><span class="val">${(typeMap[lang] || typeMap.en)[rec.contract_type] || rec.contract_type || "—"}</span></div>
<div class="row"><span class="lbl">${L.startDate}</span><span class="val">${fmtDate(rec.start_date)}</span></div>
<div class="row"><span class="lbl">${L.endDate}</span><span class="val">${rec.end_date ? fmtDate(rec.end_date) : L.indefinite}</span></div>
<div class="row"><span class="lbl">${L.salary}</span><span class="val">${rec.salary ? Number(rec.salary).toLocaleString() + " " + L.currency : "—"}</span></div>
<div class="row"><span class="lbl">${L.status}</span><span class="val">${(statusMap[lang] || statusMap.en)[rec.status] || rec.status || "—"}</span></div>

<div class="sigs">
  <div class="sig"><div class="sig-line">${L.empSig}</div><div class="sig-date">${L.sigDate}: ___________</div></div>
  <div class="sig"><div class="sig-line">${L.hrSig}</div><div class="sig-date">${L.sigDate}: ___________</div></div>
</div>
<script>window.onload=()=>window.print();<\/script>
</body></html>`;

    const blob = new Blob([html], { type: "text/html;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    window.open(url, "_blank");
  };

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
                  <button className="btn-print" onClick={() => printContract(rec)} title={lang === "ku" ? "چاپکردنی گرێبەست" : lang === "ar" ? "طباعة العقد" : "Print Contract"}><FileText size={12} /></button>
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
                  <Input type="date" value={end_date} onChange={e => { const v = e.target.value; setEnd_date(v); if (editId && (!v || new Date(v) > new Date(new Date().toDateString()))) setStatus("Active"); }} />
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
