import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/router";
import { useFormVisibility } from "@/components/FormVisibilityContext";
import { toast } from "sonner";
import { Plus, User, Upload, Search, Users, UserCheck, UserX, Clock, UserMinus, LayoutGrid, List, Printer } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { TableCell, TableRow } from "@/components/ui/table";
import DataTable from "@/components/DataTable";
import DeleteConfirmDialog from "@/components/DeleteConfirmDialog";
import EmployeeProfilePanel, { AVATAR_COLORS, STATUS_CFG, DEPT_CFG, Badge, getInitials } from "@/components/EmployeeProfilePanel";

// ══════════════════════════════════════════
// Main Component
// ══════════════════════════════════════════
export default function Employee() {
  const { t, tv } = useLanguage();

  // Form state
  const [employee_name, setEmployee_Name] = useState("");
  const [number, setNumber] = useState("");
  const [email, setEmail] = useState("");
  const [type_of_job, setType_of_job] = useState("");
  const [department, setDepartment] = useState("");
  const [salary, setSalary] = useState("");
  const [status, setStatus] = useState("Active");
  const [contract_type, setContract_type] = useState("");
  const [gender, setGender] = useState("");
  const [image, setImage] = useState("");
  const [city, setCity] = useState("");
  const [hire_date, setHire_Date] = useState("");
  const [bio, setBio] = useState("");
  const [date_of_birth, setDate_of_birth] = useState("");
  const [work_start, setWork_start] = useState("");
  const [work_end, setWork_end] = useState("");
  const [imagePreview, setImagePreview] = useState("");

  // App state
  const [employees, setEmployees] = useState([]);
  const [editId, setEditId] = useState(null);
  const [profileEmployee, setProfileEmployee] = useState(null);
  const [profileIdx, setProfileIdx] = useState(0);
  const [search, setSearch] = useState("");
  const [filterDept, setFilterDept] = useState("All");
  const [viewMode, setViewMode] = useState("table");
  const { showForm, setShowForm } = useFormVisibility();
  const router = useRouter();

  const fetchEmployees = useCallback(async () => {
    try {
      const res = await fetch("/api/employee");
      const data = await res.json();
      const list = Array.isArray(data) ? data : data.employees || [];
      setEmployees(list);
      return list;
    } catch (e) { console.error(e); return []; }
  }, []);

  useEffect(() => {
    fetchEmployees().then(list => {
      const profileId = router.query.profile;
      const editId = router.query.edit;
      if (list.length === 0) return;
      if (profileId) {
        const idx = list.findIndex(e => String(e.id) === String(profileId));
        if (idx !== -1) { setProfileEmployee(list[idx]); setProfileIdx(idx); }
      }
      if (editId) {
        const emp = list.find(e => String(e.id) === String(editId));
        if (emp) prepareEdit(emp);
      }
    });
  }, [router.query.profile, router.query.edit]);

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onloadend = () => { setImage(reader.result); setImagePreview(reader.result); };
    reader.readAsDataURL(file);
  };

  const buildPayload = () => ({
    employee_name, number, email, type_of_job,
    department, salary, status, contract_type,
    gender, image, city, hire_date, bio,
    date_of_birth, work_start, work_end,
  });

  const addEmployee = async () => {
    const res = await fetch("/api/employee", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(buildPayload()) });
    const data = await res.json();
    if (!res.ok) { toast.error(data.message || "Failed to add"); return; }
    toast.success("Employee added successfully");
    resetForm(); fetchEmployees();
  };

  const updateEmployee = async (id) => {
    const res = await fetch(`/api/employee/${id}`, { method: "PUT", headers: { "content-type": "application/json" }, body: JSON.stringify(buildPayload()) });
    if (!res.ok) { const d = await res.json(); toast.error(d.message || "Failed to update"); return; }
    toast.success("Employee updated successfully");
    resetForm(); fetchEmployees();
  };

  const Submit = async (e) => {
    e.preventDefault();
    if (!employee_name.trim() || !number.trim() || !email.trim() || !type_of_job.trim() || !gender.trim()) {
      toast.warning("Please fill in all required fields"); return;
    }
    try {
      if (editId) await updateEmployee(editId); else await addEmployee();
    } catch (err) { toast.error("Something went wrong"); }
  };

  const resetForm = () => {
    setEmployee_Name(""); setNumber(""); setEmail(""); setType_of_job("");
    setDepartment(""); setSalary(""); setStatus("Active"); setContract_type("");
    setGender(""); setImage(""); setCity(""); setHire_Date(""); setBio("");
    setDate_of_birth(""); setWork_start(""); setWork_end("");
    setImagePreview(""); setEditId(null); setShowForm(false);
  };

  const prepareEdit = (emp) => {
    setEmployee_Name(emp.employee_name || "");
    setNumber(emp.number || "");
    setEmail(emp.email || "");
    setType_of_job(emp.type_of_job || "");
    setDepartment(emp.department || "");
    setSalary(emp.salary || "");
    setStatus(emp.status || "Active");
    setContract_type(emp.contract_type || "");
    setGender(emp.gender || "");
    setImage(emp.image || "");
    setCity(emp.city || "");
    setHire_Date(emp.hire_date ? emp.hire_date.split("T")[0] : "");
    setBio(emp.bio || "");
    setDate_of_birth(emp.date_of_birth ? emp.date_of_birth.split("T")[0] : "");
    setWork_start(emp.work_start || "");
    setWork_end(emp.work_end || "");
    setImagePreview(emp.image || "");
    setEditId(emp.id);
    setShowForm(true);
  };

  const deleteEmployee = async (id) => {
    try {
      const res = await fetch(`/api/employee/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error();
      toast.success("Employee deleted successfully");
      fetchEmployees();
    } catch { toast.error("Failed to delete employee"); }
  };

  const deactivateEmployee = async (emp) => {
    try {
      const res = await fetch(`/api/employee/${emp.id}`, {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ ...emp, status: "Inactive" }),
      });
      if (!res.ok) { toast.error("Failed to deactivate"); return; }
      toast.success(`${emp.employee_name} deactivated`);
      setProfileEmployee(prev => prev ? { ...prev, status: "Inactive" } : null);
      fetchEmployees();
    } catch { toast.error("Failed to deactivate"); }
  };

  const DEPTS = ["All", "IT", "Finance", "HR", "Marketing", "Operations", "Design"];

  const filtered = employees.filter(e => {
    const ms = !search ||
      e.employee_name?.toLowerCase().includes(search.toLowerCase()) ||
      e.email?.toLowerCase().includes(search.toLowerCase()) ||
      String(e.id).includes(search);
    const md = filterDept === "All" || e.department === filterDept;
    return ms && md;
  });

  const columns = [
    { key: "id",          label: t.col_id },
    { key: "photo_name",  label: t.col_employee },
    { key: "email",       label: t.col_email },
    { key: "type_of_job", label: t.col_position },
    { key: "department",  label: t.col_department },
    { key: "salary",      label: t.col_salary },
    { key: "status",      label: t.col_status },
    { key: "actions",     label: t.col_actions },
  ];

  const viewToggle = (
    <div className="emp-view-toggle">
      <button
        className={`emp-view-btn${viewMode === "grid" ? " active" : ""}`}
        onClick={() => setViewMode("grid")}
        title="Grid View"
      >
        <LayoutGrid size={15} />
      </button>
      <button
        className={`emp-view-btn${viewMode === "table" ? " active" : ""}`}
        onClick={() => setViewMode("table")}
        title="Table View"
      >
        <List size={15} />
      </button>
    </div>
  );

  const renderCard = (employee, index) => {
    const ac = AVATAR_COLORS[index % AVATAR_COLORS.length];
    const empId = `EMP-${String(index + 1).padStart(3, "0")}`;
    return (
      <div
        key={employee.id}
        className="emp-card"
        onClick={() => { setProfileEmployee(employee); setProfileIdx(index); }}
      >
        <div
          className="emp-card-avatar"
          style={{ background: employee.image ? "transparent" : ac.bg, color: ac.color }}
        >
          {employee.image
            ? <img src={employee.image} alt={employee.employee_name} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
            : getInitials(employee.employee_name)}
        </div>
        <div className="emp-card-name">{employee.employee_name}</div>
        <div className="emp-card-empid">{empId}</div>
        <div className="emp-card-email">{employee.email}</div>
        <div className="emp-card-badges">
          <Badge text={employee.status} cfgMap={STATUS_CFG} />
          {employee.department && <Badge text={employee.department} cfgMap={DEPT_CFG} />}
        </div>
        {employee.salary && (
          <div className="emp-card-salary">{Number(employee.salary).toLocaleString()} IQD</div>
        )}
        <div className="emp-card-actions" onClick={e => e.stopPropagation()}>
          <button onClick={() => { setProfileEmployee(employee); setProfileIdx(index); }} className="emp-btn-view">{t.btn_profile}</button>
          <button onClick={() => prepareEdit(employee)} className="emp-btn-edit">{t.btn_edit}</button>
          <DeleteConfirmDialog itemName="employee" onConfirm={() => deleteEmployee(employee.id)} />
        </div>
      </div>
    );
  };

  return (
    <>
      {/* ── Page Header: always visible ── */}
      <div className="emp-page-header">
        <div>
          <div className="emp-page-title">{t.emp_title}</div>
          <div className="emp-page-sub">{t.emp_total(employees.length)}</div>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <button className="btn-print" onClick={() => window.print()} title="Print">
            <Printer size={13} /> Print
          </button>
          <button className="emp-add-btn" onClick={() => setShowForm(true)}>
            <Plus size={13} /> {t.emp_add_btn}
          </button>
        </div>
      </div>

      {/* ── Stat Cards ── */}
      <div className="emp-stat-cards">
        {[
          { label: t.emp_stat_all,       count: employees.length,                                          icon: Users,      color: "all" },
          { label: t.emp_stat_active,    count: employees.filter(e => e.status === "Active").length,       icon: UserCheck,  color: "active" },
          { label: t.emp_stat_inactive,  count: employees.filter(e => e.status === "Inactive").length,     icon: UserX,      color: "inactive" },
          { label: t.emp_stat_on_leave,  count: employees.filter(e => e.status === "On Leave").length,     icon: Clock,      color: "onleave" },
          { label: t.emp_stat_suspended, count: employees.filter(e => e.status === "Suspended").length,    icon: UserMinus,  color: "suspended" },
        ].map(({ label, count, icon: Icon, color }) => (
          <div key={color} className={`emp-stat-card emp-stat-card--${color}`}>
            <div className="emp-stat-card__icon"><Icon size={18} /></div>
            <div className="emp-stat-card__count">{count}</div>
            <div className="emp-stat-card__label">{label}</div>
          </div>
        ))}
      </div>

      <EmployeeProfilePanel
        employee={profileEmployee}
        avatarIdx={profileIdx}
        onClose={() => setProfileEmployee(null)}
        onEdit={prepareEdit}
        onDeactivate={deactivateEmployee}
        onDelete={deleteEmployee}
      />

      {/* ── TABLE (always visible) ── */}
      <div className="flex flex-1 flex-col gap-3 p-4 shiny-ring">

        <DataTable
          columns={columns}
          data={filtered}
          itemLabel="employees"
          viewMode={viewMode}
          renderCard={renderCard}
          viewToggle={viewToggle}
          toolbar={
            <div className="emp-toolbar">
              <div className="emp-search-wrap">
                <Search className="emp-search-icon" />
                <input
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  placeholder={t.emp_search_placeholder}
                  className="emp-search"
                />
              </div>
              <div className="emp-dept-btns">
                {DEPTS.map(d => (
                  <button key={d} onClick={() => setFilterDept(d)} className={`emp-filter${filterDept === d ? " on" : ""}`}>{d}</button>
                ))}
              </div>
            </div>
          }
          renderRow={(employee, index) => {
            const ac = AVATAR_COLORS[index % AVATAR_COLORS.length];
            const empId = `EMP-${String(index + 1).padStart(3, "0")}`;
            return (
              <TableRow
                key={employee.id}
                className="hover:bg-muted/50"
              >
                <TableCell><span className="emp-id-cell">{empId}</span></TableCell>

                <TableCell className="whitespace-normal align-middle min-w-[170px]">
                  <div className="emp-name-cell">
                    <div className="emp-avatar" style={{ background: employee.image ? "transparent" : ac.bg, color: ac.color }}>
                      {employee.image ? <img src={employee.image} alt={employee.employee_name} style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : getInitials(employee.employee_name)}
                    </div>
                    <div className="emp-name-text">{employee.employee_name}</div>
                  </div>
                </TableCell>

                <TableCell className="emp-email-cell">{employee.email}</TableCell>
                <TableCell>{employee.type_of_job || "—"}</TableCell>
                <TableCell><Badge text={employee.department} cfgMap={DEPT_CFG} /></TableCell>
                <TableCell><span className="emp-salary-val">{employee.salary ? `${Number(employee.salary).toLocaleString()} IQD` : "—"}</span></TableCell>
                <TableCell><Badge text={employee.status} cfgMap={STATUS_CFG} /></TableCell>

                <TableCell onClick={e => e.stopPropagation()}>
                  <div className="emp-action-btns">
                    <button onClick={() => { setProfileEmployee(employee); setProfileIdx(index); }} className="emp-btn-view">{t.btn_profile}</button>
                    <button onClick={() => prepareEdit(employee)} className="emp-btn-edit">{t.btn_edit}</button>
                    <DeleteConfirmDialog itemName="employee" onConfirm={() => deleteEmployee(employee.id)} />
                  </div>
                </TableCell>
              </TableRow>
            );
          }}
        />
      </div>

      {/* ── MODAL OVERLAY ── */}
      {showForm && (
        <div className="hr-modal-overlay">
          <div className="hr-modal-bg" onClick={resetForm} />
          <div className="hr-modal wide">
            <h2 className="hr-modal-title">{editId ? t.emp_modal_edit : t.emp_modal_add}</h2>
            <button className="hr-modal-close" onClick={resetForm}>✕</button>

            <form onSubmit={Submit} className="emp-form">

              {/* Section: Profile Photo */}
              <div>
                <div className="emp-section-label">{t.emp_section_photo}</div>
                <div className="emp-photo-row">
                  <div className="emp-photo-preview">
                    {imagePreview
                      ? <img src={imagePreview} style={{ width: "100%", height: "100%", objectFit: "cover" }} alt="preview" />
                      : (employee_name ? getInitials(employee_name) : <User size={22} />)
                    }
                  </div>
                  <div>
                    <Label htmlFor="image" style={{ cursor: "pointer" }}>
                      <div className="emp-upload-label">
                        <Upload size={14} /><span>{t.emp_upload_photo}</span>
                      </div>
                    </Label>
                    <Input id="image" type="file" accept="image/*" onChange={handleImageChange} className="hidden" />
                    <p className="emp-upload-hint">{t.emp_upload_hint}</p>
                  </div>
                </div>
              </div>

              {/* Section: Personal Information */}
              <div>
                <div className="emp-section-label">{t.emp_section_personal}</div>
                <div className="emp-form-grid">
                  <div className="emp-form-field">
                    <Label htmlFor="name">{t.emp_full_name}</Label>
                    <Input id="name" value={employee_name} onChange={e => { const v = e.target.value; setEmployee_Name(v.replace(/\b\w/g, c => c.toUpperCase())); }} placeholder={t.ph_name} required />
                  </div>
                  <div className="emp-form-field">
                    <Label htmlFor="phone">{t.emp_phone}</Label>
                    <Input id="phone" type="tel" value={number} onChange={e => setNumber(e.target.value)} placeholder={t.ph_phone} required />
                  </div>
                  <div className="emp-form-field">
                    <Label htmlFor="email2">{t.emp_email}</Label>
                    <Input id="email2" type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder={t.ph_email} required />
                  </div>
                  <div className="emp-form-field">
                    <Label>{t.emp_gender}</Label>
                    <RadioGroup value={gender} onValueChange={setGender} className="flex gap-4 pt-1">
                      <div className="flex items-center space-x-2"><RadioGroupItem value="Male" id="male" /><Label htmlFor="male">{t.emp_male}</Label></div>
                      <div className="flex items-center space-x-2"><RadioGroupItem value="Female" id="female" /><Label htmlFor="female">{t.emp_female}</Label></div>
                    </RadioGroup>
                  </div>
                  <div className="emp-form-field">
                    <Label htmlFor="city">{t.emp_city}</Label>
                    <Input id="city" value={city} onChange={e => { const v = e.target.value; setCity(v.replace(/\b\w/g, c => c.toUpperCase())); }} placeholder={t.ph_city} />
                  </div>
                  <div className="emp-form-field">
                    <Label htmlFor="dob">{t.emp_dob}</Label>
                    <Input id="dob" type="date" value={date_of_birth} onChange={e => setDate_of_birth(e.target.value)} placeholder={t.ph_dob} />
                  </div>
                </div>
              </div>

              {/* Section: Employment Details */}
              <div>
                <div className="emp-section-label">{t.emp_section_employment}</div>
                <div className="emp-form-grid">
                  <div className="emp-form-field">
                    <Label>{t.emp_position}</Label>
                    <Select value={type_of_job} onValueChange={setType_of_job}>
                      <SelectTrigger><SelectValue placeholder={t.ph_position} /></SelectTrigger>
                      <SelectContent>
                        {["Designer","Programmer","Accountant","Photographer","HR Manager","Marketing","Admin Officer","Software Developer","IT Manager"].map(p => (
                          <SelectItem key={p} value={p}>{p}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="emp-form-field">
                    <Label>{t.emp_department}</Label>
                    <Select value={department} onValueChange={setDepartment}>
                      <SelectTrigger><SelectValue placeholder={t.ph_department} /></SelectTrigger>
                      <SelectContent>
                        {["IT","Finance","HR","Marketing","Operations","Design"].map(d => (
                          <SelectItem key={d} value={d}>{d}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="emp-form-field">
                    <Label>{t.emp_status}</Label>
                    <Select value={status} onValueChange={setStatus}>
                      <SelectTrigger><SelectValue placeholder={t.ph_status} /></SelectTrigger>
                      <SelectContent>
                        {["Active","On Leave","Suspended","Inactive"].map(s => (
                          <SelectItem key={s} value={s}>{tv(s)}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="emp-form-field">
                    <Label>{t.emp_contract_type}</Label>
                    <Select value={contract_type} onValueChange={setContract_type}>
                      <SelectTrigger><SelectValue placeholder={t.ph_contract} /></SelectTrigger>
                      <SelectContent>
                        {["Permanent","Temporary","Part-time","Freelance"].map(c => (
                          <SelectItem key={c} value={c}>{tv(c)}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="emp-form-field">
                    <Label htmlFor="salary">{t.emp_salary}</Label>
                    <Input id="salary" type="number" value={salary} onChange={e => setSalary(e.target.value)} placeholder="e.g. 1200000" />
                  </div>
                  <div className="emp-form-field">
                    <Label htmlFor="hire_date">{t.emp_hire_date}</Label>
                    <Input id="hire_date" type="date" value={hire_date} onChange={e => setHire_Date(e.target.value)} />
                  </div>
                  <div className="emp-form-field">
                    <Label>{t.emp_work_start}</Label>
                    <div className="emp-time-row">
                      <Input type="time" value={work_start} onChange={e => setWork_start(e.target.value)} placeholder={t.ph_work_time} className="emp-time-input" />
                      <span className="emp-time-sep">—</span>
                      <Input type="time" value={work_end} onChange={e => setWork_end(e.target.value)} placeholder={t.ph_work_time} className="emp-time-input" />
                    </div>
                    <p className="emp-time-hint">{t.emp_work_start} → {t.emp_work_end}</p>
                  </div>
                </div>
                <div className="emp-form-field">
                  <Label htmlFor="bio">{t.emp_bio}</Label>
                  <Textarea id="bio" value={bio} onChange={e => setBio(e.target.value)} placeholder={t.emp_bio_placeholder} rows={3} />
                </div>
              </div>


              <div className="emp-form-footer">
                <button type="button" onClick={resetForm} className="form-btn-cancel">{t.btn_cancel}</button>
                <button type="submit" className="emp-btn-submit">{editId ? t.btn_update : t.btn_add} {t.nav_employees}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
