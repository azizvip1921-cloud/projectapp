import { useState, useEffect, useCallback } from "react";
import { toast } from "sonner";
import { Plus, Search, Eye, EyeOff, UserCog, KeyRound, LayoutGrid, List } from "lucide-react";
import { useFormVisibility } from "@/components/FormVisibilityContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { TableCell, TableRow } from "@/components/ui/table";
import DataTable from "@/components/DataTable";
import DeleteConfirmDialog from "@/components/DeleteConfirmDialog";

const ROLES = ["Admin", "HR Manager", "Manager", "Viewer"];

const ROLE_COLORS = {
  Admin:        { bg: "#FEE2E2", color: "#DC2626" },
  "HR Manager": { bg: "#DBEAFE", color: "#1D4ED8" },
  Manager:      { bg: "#D1FAE5", color: "#059669" },
  Viewer:       { bg: "#F3F4F6", color: "#6B7280" },
};

function RoleBadge({ role }) {
  const { t } = useLanguage();
  const cfg = ROLE_COLORS[role] || { bg: "#F3F4F6", color: "#6B7280" };
  const label = t.role_labels?.[role] || role;
  return (
    <span
      className="usr-role-badge"
      style={{ background: cfg.bg, color: cfg.color }}
    >
      {label || "—"}
    </span>
  );
}

function getInitials(name = "") {
  return name.split(" ").map((w) => w[0]).join("").toUpperCase().slice(0, 2);
}

const AVATAR_COLORS = [
  { bg: "#DBEAFE", color: "#1D4ED8" },
  { bg: "#D1FAE5", color: "#065F46" },
  { bg: "#FEE2E2", color: "#991B1B" },
  { bg: "#FEF3C7", color: "#92400E" },
  { bg: "#EDE9FE", color: "#5B21B6" },
  { bg: "#FCE7F3", color: "#9D174D" },
];

export default function UsersPage() {
  const { t } = useLanguage();
  const [users, setUsers] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [search, setSearch] = useState("");
  const [filterRole, setFilterRole] = useState("");
  const [viewMode, setViewMode] = useState("table");
  const { showForm, setShowForm } = useFormVisibility();

  const [formKey, setFormKey] = useState(0);
  const [editId, setEditId] = useState(null);
  const [selectedEmployee, setSelectedEmployee] = useState("");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState("");

  const [addPassword, setAddPassword] = useState("");
  const [addConfirmPassword, setAddConfirmPassword] = useState("");
  const [showAddPwd, setShowAddPwd] = useState(false);
  const [showAddConfirm, setShowAddConfirm] = useState(false);

  const [resetUserId, setResetUserId] = useState(null);
  const [resetUserName, setResetUserName] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmNewPassword, setConfirmNewPassword] = useState("");
  const [showNewPwd, setShowNewPwd] = useState(false);
  const [showConfirmNewPwd, setShowConfirmNewPwd] = useState(false);

  const fetchUsers = useCallback(async () => {
    try {
      const res = await fetch("/api/system-users", { cache: "no-store" });
      const d = await res.json();
      setUsers(Array.isArray(d) ? d : []);
    } catch { toast.error(t.usr_toast_load_err); }
  }, [t]);

  const fetchEmployees = useCallback(async () => {
    try {
      const res = await fetch("/api/employee");
      const d = await res.json();
      setEmployees(Array.isArray(d) ? d : []);
    } catch {}
  }, []);

  useEffect(() => { fetchUsers(); fetchEmployees(); }, [fetchUsers, fetchEmployees]);

  const resetForm = () => {
    setFormKey((k) => k + 1);
    setEditId(null);
    setSelectedEmployee("");
    setName(""); setEmail(""); setRole("");
    setAddPassword(""); setAddConfirmPassword("");
    setShowAddPwd(false); setShowAddConfirm(false);
    setShowForm(false);
  };

  const openAddForm = () => {
    setFormKey((k) => k + 1);
    setEditId(null);
    setSelectedEmployee("");
    setName(""); setEmail(""); setRole("");
    setAddPassword(""); setAddConfirmPassword("");
    setShowAddPwd(false); setShowAddConfirm(false);
    setShowForm(true);
  };

  const selectedEmployeeId = selectedEmployee
    ? (employees.find((e) => String(e.id) === String(selectedEmployee))?.id || null)
    : null;

  const handleEmployeeSelect = (empId) => {
    setSelectedEmployee(empId);
    if (!empId) return;
    const emp = employees.find((e) => String(e.id) === String(empId));
    if (!emp) return;
    setName(emp.employee_name || "");
    setEmail(emp.email || "");
  };

  const prepareEdit = (u) => {
    setFormKey((k) => k + 1);
    setEditId(u.id);
    setName(u.name || "");
    setEmail(u.email || "");
    setRole(u.role || "");
    setShowForm(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email.trim() || !role) {
      toast.warning(t.lbl_required);
      return;
    }
    if (!editId) {
      if (!selectedEmployee) { toast.warning(t.usr_toast_emp_req); return; }
      if (!addPassword) { toast.warning(t.usr_toast_pwd_req); return; }
      if (addPassword !== addConfirmPassword) { toast.error(t.usr_toast_pwd_mismatch); return; }
      if (addPassword.length < 6) { toast.warning(t.usr_toast_pwd_short); return; }
    }
    const payload = { name, email, role, ...(!editId ? { password: addPassword, employee_id: selectedEmployeeId } : {}) };
    try {
      const url = editId ? `/api/system-users/${editId}` : "/api/system-users";
      const method = editId ? "PUT" : "POST";
      const res = await fetch(url, {
        method,
        headers: { "content-type": "application/json" },
        body: JSON.stringify(payload),
      });
      const d = await res.json();
      if (!res.ok) { toast.error(d.message || t.usr_toast_error); return; }
      toast.success(editId ? t.usr_toast_updated : t.usr_toast_added);
      resetForm();
      fetchUsers();
    } catch { toast.error(t.usr_toast_error); }
  };

  const openResetPassword = (user) => {
    setResetUserId(user.id);
    setResetUserName(user.name || "");
    setNewPassword("");
    setConfirmNewPassword("");
    setShowNewPwd(false);
    setShowConfirmNewPwd(false);
  };

  const closeResetPassword = () => {
    setResetUserId(null);
    setResetUserName("");
    setNewPassword("");
    setConfirmNewPassword("");
  };

  const handleResetPassword = async (e) => {
    e.preventDefault();
    if (!newPassword) { toast.warning(t.usr_toast_pwd_req); return; }
    if (newPassword.length < 6) { toast.warning(t.usr_toast_pwd_short); return; }
    if (newPassword !== confirmNewPassword) { toast.error(t.usr_toast_pwd_mismatch); return; }
    try {
      const res = await fetch(`/api/system-users/${resetUserId}`, {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ password: newPassword }),
      });
      const d = await res.json();
      if (!res.ok) { toast.error(d.message || t.usr_toast_error); return; }
      toast.success(t.usr_toast_pwd_reset);
      closeResetPassword();
    } catch { toast.error(t.usr_toast_error); }
  };

  const deleteUser = async (id) => {
    try {
      const res = await fetch(`/api/system-users/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error();
      toast.success(t.usr_toast_deleted);
      fetchUsers();
    } catch { toast.error(t.usr_toast_delete_err); }
  };

  const ALL_ROLES = [{ value: "", label: t.lbl_all }, ...ROLES.map((r) => ({ value: r, label: t.role_labels?.[r] || r }))];

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

  const renderCard = (user, index) => {
    const ac = AVATAR_COLORS[index % AVATAR_COLORS.length];
    const userId = `USR-${String(index + 1).padStart(3, "0")}`;
    const joined = user.created_at
      ? new Date(user.created_at).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })
      : "—";
    return (
      <div key={user.id} className="emp-card">
        <div className="emp-card-avatar" style={{ background: user.employee_image ? "transparent" : ac.bg, color: ac.color }}>
          {user.employee_image
            ? <img src={user.employee_image} alt={user.name} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
            : getInitials(user.name)}
        </div>
        <div className="emp-card-name">{user.name}</div>
        <div className="emp-card-empid">{userId}</div>
        <div className="emp-card-email">{user.email}</div>
        <div className="emp-card-badges">
          <RoleBadge role={user.role} />
        </div>
        <div style={{ fontSize: 11, color: "var(--hr-text)", marginBottom: 10 }}>{joined}</div>
        <div className="emp-card-actions" onClick={e => e.stopPropagation()}>
          <button onClick={() => prepareEdit(user)} className="emp-btn-edit">{t.btn_edit}</button>
          <button onClick={() => openResetPassword(user)} className="emp-btn-edit usr-btn-reset-key" title={t.usr_tooltip_reset}>
            <KeyRound size={14} />
          </button>
          <DeleteConfirmDialog itemName="user" onConfirm={() => deleteUser(user.id)} />
        </div>
      </div>
    );
  };

  const filtered = users.filter((u) => {
    const ms =
      !search ||
      u.name?.toLowerCase().includes(search.toLowerCase()) ||
      u.email?.toLowerCase().includes(search.toLowerCase());
    const mr = !filterRole || u.role === filterRole;
    return ms && mr;
  });

  const columns = [
    { key: "num",     label: "#" },
    { key: "name",    label: t.col_employee },
    { key: "email",   label: t.col_email },
    { key: "role",    label: t.col_type },
    { key: "joined",  label: t.usr_col_joined },
    { key: "actions", label: t.col_actions },
  ];

  return (
    <>
      <div className="emp-page-header">
        <div>
          <div className="emp-page-title">{t.usr_title}</div>
          <div className="emp-page-sub">{t.usr_sub(users.length)}</div>
        </div>
        <button className="emp-add-btn" onClick={openAddForm}>
          <Plus size={13} /> {t.usr_add_btn}
        </button>
      </div>

      <div className="flex flex-1 flex-col gap-3 p-4 shiny-ring">
        <DataTable
          columns={columns}
          data={filtered}
          itemLabel="users"
          viewMode={viewMode}
          renderCard={renderCard}
          viewToggle={viewToggle}
          toolbar={
            <div className="emp-toolbar">
              <div className="emp-search-wrap">
                <Search className="emp-search-icon" />
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder={t.usr_search_ph}
                  className="emp-search"
                />
              </div>
              <div className="emp-dept-btns">
                {ALL_ROLES.map((r) => (
                  <button
                    key={r.value}
                    onClick={() => setFilterRole(r.value)}
                    className={`emp-filter${filterRole === r.value ? " on" : ""}`}
                  >
                    {r.label}
                  </button>
                ))}
              </div>
            </div>
          }
          renderRow={(user, index) => {
            const ac = AVATAR_COLORS[index % AVATAR_COLORS.length];
            const joined = user.created_at
              ? new Date(user.created_at).toLocaleDateString("en-GB", {
                  day: "2-digit", month: "short", year: "numeric",
                })
              : "—";
            return (
              <TableRow key={user.id} className="hover:bg-muted/50">
                <TableCell>
                  <span className="emp-id-cell">{index + 1}</span>
                </TableCell>

                <TableCell className="whitespace-normal align-middle min-w-[160px]">
                  <div className="emp-name-cell">
                    <div
                      className="emp-avatar"
                      style={{ background: user.employee_image ? "transparent" : ac.bg, color: ac.color }}
                    >
                      {user.employee_image
                        ? <img src={user.employee_image} alt={user.name} style={{ width: "100%", height: "100%", objectFit: "cover", borderRadius: "50%" }} />
                        : getInitials(user.name)
                      }
                    </div>
                    <div className="emp-name-text">{user.name}</div>
                  </div>
                </TableCell>

                <TableCell className="emp-email-cell">{user.email}</TableCell>
                <TableCell><RoleBadge role={user.role} /></TableCell>
                <TableCell>{joined}</TableCell>

                <TableCell onClick={(e) => e.stopPropagation()}>
                  <div className="emp-action-btns">
                    <button onClick={() => prepareEdit(user)} className="emp-btn-edit">
                      {t.btn_edit}
                    </button>
                    <button
                      onClick={() => openResetPassword(user)}
                      className="emp-btn-edit usr-btn-reset-key"
                      title={t.usr_tooltip_reset}
                    >
                      <KeyRound size={14} />
                    </button>
                    <DeleteConfirmDialog
                      itemName="user"
                      onConfirm={() => deleteUser(user.id)}
                    />
                  </div>
                </TableCell>
              </TableRow>
            );
          }}
        />
      </div>

      {/* Add / Edit Modal */}
      {showForm && (
        <div className="hr-modal-overlay">
          <div className="hr-modal-bg" onClick={resetForm} />
          <div className="hr-modal">
            <h2 className="hr-modal-title">
              {editId ? t.usr_modal_edit : t.usr_modal_add}
            </h2>
            <button className="hr-modal-close" onClick={resetForm}>✕</button>

            <form key={formKey} onSubmit={handleSubmit} className="emp-form" autoComplete="off">
              <div className="emp-section-label usr-section-label">
                <UserCog size={15} /> {t.usr_section_info}
              </div>

              <div className="emp-form-grid">
                {!editId && (
                  <div className="emp-form-field" style={{ gridColumn: "1 / -1" }}>
                    <Label>{t.usr_fld_employee}</Label>
                    <Select value={selectedEmployee} onValueChange={handleEmployeeSelect}>
                      <SelectTrigger>
                        <SelectValue placeholder={t.usr_ph_employee} />
                      </SelectTrigger>
                      <SelectContent>
                        {employees.map((emp) => (
                          <SelectItem key={emp.id} value={String(emp.id)}>
                            {emp.employee_name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}

                <div className="emp-form-field">
                  <Label htmlFor="u-email">{t.usr_fld_email}</Label>
                  <Input
                    id="u-email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder={t.ph_email}
                    required
                  />
                </div>

                <div className="emp-form-field">
                  <Label>{t.usr_fld_role}</Label>
                  <Select value={role} onValueChange={setRole}>
                    <SelectTrigger>
                      <SelectValue placeholder={t.ph_status} />
                    </SelectTrigger>
                    <SelectContent>
                      {ROLES.map((r) => (
                        <SelectItem key={r} value={r}>{t.role_labels?.[r] || r}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {!editId && (
                  <>
                    <div className="emp-form-field">
                      <Label htmlFor="u-pwd">{t.usr_fld_pwd}</Label>
                      <div className="usr-pwd-wrap">
                        <Input
                          id="u-pwd"
                          type={showAddPwd ? "text" : "password"}
                          value={addPassword}
                          onChange={(e) => setAddPassword(e.target.value)}
                          placeholder={t.usr_ph_pwd}
                          autoComplete="new-password"
                        />
                        <button
                          type="button"
                          onClick={() => setShowAddPwd((p) => !p)}
                          className="usr-pwd-toggle"
                        >
                          {showAddPwd ? <EyeOff size={16} /> : <Eye size={16} />}
                        </button>
                      </div>
                    </div>

                    <div className="emp-form-field">
                      <Label htmlFor="u-cpwd">{t.usr_fld_confirm_pwd}</Label>
                      <div className="usr-pwd-wrap">
                        <Input
                          id="u-cpwd"
                          type={showAddConfirm ? "text" : "password"}
                          value={addConfirmPassword}
                          onChange={(e) => setAddConfirmPassword(e.target.value)}
                          placeholder={t.usr_ph_confirm_pwd}
                          autoComplete="new-password"
                        />
                        <button
                          type="button"
                          onClick={() => setShowAddConfirm((p) => !p)}
                          className="usr-pwd-toggle"
                        >
                          {showAddConfirm ? <EyeOff size={16} /> : <Eye size={16} />}
                        </button>
                      </div>
                    </div>
                  </>
                )}
              </div>

              <div className="emp-form-footer">
                <button type="button" onClick={resetForm} className="form-btn-cancel">
                  {t.btn_cancel}
                </button>
                <button type="submit" className="emp-btn-submit">
                  {editId ? t.usr_btn_update : t.usr_btn_add}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Reset Password Modal */}
      {resetUserId && (
        <div className="hr-modal-overlay">
          <div className="hr-modal-bg" onClick={closeResetPassword} />
          <div className="hr-modal">
            <h2 className="hr-modal-title">{t.usr_reset_title}</h2>
            <button className="hr-modal-close" onClick={closeResetPassword}>✕</button>

            <form onSubmit={handleResetPassword} className="emp-form" autoComplete="off">
              <div className="emp-section-label usr-section-label">
                <KeyRound size={15} /> {resetUserName}
              </div>

              <div className="emp-form-grid">
                <div className="emp-form-field">
                  <Label htmlFor="r-pwd">{t.usr_fld_new_pwd}</Label>
                  <div className="usr-pwd-wrap">
                    <Input
                      id="r-pwd"
                      type={showNewPwd ? "text" : "password"}
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder={t.usr_ph_new_pwd}
                      autoComplete="new-password"
                    />
                    <button
                      type="button"
                      onClick={() => setShowNewPwd((p) => !p)}
                      className="usr-pwd-toggle"
                    >
                      {showNewPwd ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </div>

                <div className="emp-form-field">
                  <Label htmlFor="r-cpwd">{t.usr_fld_confirm_new_pwd}</Label>
                  <div className="usr-pwd-wrap">
                    <Input
                      id="r-cpwd"
                      type={showConfirmNewPwd ? "text" : "password"}
                      value={confirmNewPassword}
                      onChange={(e) => setConfirmNewPassword(e.target.value)}
                      placeholder={t.usr_ph_confirm_new_pwd}
                      autoComplete="new-password"
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmNewPwd((p) => !p)}
                      className="usr-pwd-toggle"
                    >
                      {showConfirmNewPwd ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </div>
              </div>

              <div className="emp-form-footer">
                <button type="button" onClick={closeResetPassword} className="form-btn-cancel">
                  {t.btn_cancel}
                </button>
                <button type="submit" className="emp-btn-submit">
                  {t.usr_btn_reset}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
