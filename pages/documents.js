import { useState, useEffect, useRef } from "react";
import { useLanguage } from "@/contexts/LanguageContext";
import { useFormVisibility } from "@/components/FormVisibilityContext";
import { toast } from "sonner";
import { Plus, Search, FileText, Users, Calendar } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { TableCell, TableRow } from "@/components/ui/table";
import DataTable from "@/components/DataTable";
import DeleteConfirmDialog from "@/components/DeleteConfirmDialog";

const TYPE_CFG = {
  PDF:  { bg: "#FEE2E2", color: "#DC2626" },
  Word: { bg: "#DBEAFE", color: "#1D4ED8" },
  Excel:{ bg: "#DCFCE7", color: "#15803D" },
  Image:{ bg: "#F3E8FF", color: "#7C3AED" },
  Other:{ bg: "#F1F5F9", color: "#64748B" },
};

function Badge({ text }) {
  const c = TYPE_CFG[text] || { bg: "#F1F5F9", color: "#64748B" };
  return <span className="hr-badge" style={{ background: c.bg, color: c.color }}>{text || "—"}</span>;
}

const FILE_TYPES = ["PDF", "Word", "Excel", "Image", "Other"];

export default function Documents() {
  const { t } = useLanguage();
  const [docs, setDocs] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [name, setName] = useState("");
  const [employee, setEmployee] = useState("");
  const [dept, setDept] = useState("");
  const [type, setType] = useState("PDF");
  const [size, setSize] = useState("");
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
  const [editId, setEditId] = useState(null);
  const [search, setSearch] = useState("");
  const [empFilter, setEmpFilter] = useState("All");
  const [showEmpList, setShowEmpList] = useState(false);
  const filterBtnRef = useRef(null);
  const [filterPos, setFilterPos] = useState(null);
  const [file, setFile] = useState(null);
  const [dragging, setDragging] = useState(false);
  const fileInputRef = useRef(null);
  const { showForm, setShowForm } = useFormVisibility();

  const formatSize = (bytes) => {
    if (bytes < 1024) return bytes + " B";
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
    return (bytes / (1024 * 1024)).toFixed(2) + " MB";
  };
  const detectType = (filename) => {
    const ext = filename.split(".").pop().toLowerCase();
    if (ext === "pdf") return "PDF";
    if (["doc", "docx"].includes(ext)) return "Word";
    if (["xls", "xlsx"].includes(ext)) return "Excel";
    if (["jpg", "jpeg", "png", "gif", "webp"].includes(ext)) return "Image";
    return "Other";
  };
  const handleFileSelect = (selectedFile) => {
    if (!selectedFile) return;
    setFile(selectedFile);
    const det = detectType(selectedFile.name);
    setType(det);
    setSize(formatSize(selectedFile.size));
    setName(selectedFile.name.replace(/\.[^/.]+$/, ""));
  };

  useEffect(() => { fetchDocs(); fetchEmployees(); }, []);

  const fetchDocs = async () => {
    try { const res = await fetch("/api/documents"); const data = await res.json(); setDocs(Array.isArray(data) ? data : []); }
    catch (e) { console.error(e); }
  };
  const fetchEmployees = async () => {
    try { const res = await fetch("/api/employee"); const data = await res.json(); setEmployees(Array.isArray(data) ? data : data.employees || []); }
    catch (e) { console.error(e); }
  };

  const submit = async (e) => {
    e.preventDefault();
    if (!name || !employee) { toast.warning(t.lbl_required); return; }
    let fileData = null, fileExt = null;
    if (file) {
      fileData = await new Promise((resolve) => {
        const reader = new FileReader();
        reader.onload = (ev) => resolve(ev.target.result.split(",")[1]);
        reader.readAsDataURL(file);
      });
      fileExt = file.name.split(".").pop().toLowerCase();
    }
    const body = { name, employee, dept, type, size, date, fileData, fileExt };
    try {
      const res = editId
        ? await fetch(`/api/documents/${editId}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) })
        : await fetch("/api/documents", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      if (!res.ok) throw new Error();
      toast.success(editId ? t.docs_toast_update : t.docs_toast_add);
      resetForm(); fetchDocs();
    } catch { toast.error(t.docs_toast_err); }
  };

  const resetForm = () => {
    setName(""); setEmployee(""); setDept(""); setType("PDF"); setSize("");
    setDate(new Date().toISOString().split("T")[0]); setEditId(null); setShowForm(false);
    setFile(null); setDragging(false);
  };

  const prepareEdit = (doc) => {
    setName(doc.name); setEmployee(doc.employee); setDept(doc.dept || ""); setType(doc.type || "PDF");
    setSize(doc.size || ""); setDate(doc.date ? String(doc.date).slice(0, 10) : "");
    setEditId(doc.id); setShowForm(true);
  };

  const deleteDoc = async (id) => {
    try { const res = await fetch(`/api/documents/${id}`, { method: "DELETE" }); if (!res.ok) throw new Error(); toast.success(t.docs_toast_delete); fetchDocs(); }
    catch { toast.error(t.docs_toast_err_del); }
  };

  const TYPE_EXT = { PDF: "pdf", Word: "docx", Excel: "xlsx", Image: "jpg", Other: "bin" };

  const previewDoc = async (doc) => {
    const ext = TYPE_EXT[doc.type] || "bin";
    const filePath = `/uploads/docs/${doc.id}.${ext}`;
    const res = await fetch(filePath, { method: "HEAD" }).catch(() => null);
    if (res && res.ok) { window.open(filePath, "_blank"); return; }
    const win = window.open("", "_blank");
    win.document.write(`<!DOCTYPE html><html><head><title>${doc.name}</title><link rel="stylesheet" href="/preview-doc.css"></head><body>
      <h1>${doc.name}</h1>
      <div class="sub">HR System — Document Record</div>
      <table>
        <tr><td>Document Name</td><td>${doc.name}</td></tr>
        <tr><td>Employee</td><td>${doc.employee}</td></tr>
        <tr><td>Department</td><td>${doc.dept || "—"}</td></tr>
        <tr><td>File Type</td><td>${doc.type}</td></tr>
        <tr><td>File Size</td><td>${doc.size || "—"}</td></tr>
        <tr><td>Date</td><td>${String(doc.date).slice(0, 10)}</td></tr>
      </table>
      <br/><button onclick="window.print()" style="padding:8px 18px;background:#1D4ED8;color:#fff;border:none;border-radius:8px;font-size:13px;cursor:pointer;">Print / Save as PDF</button>
    </body></html>`);
    win.document.close();
  };

  const empNames = ["All", ...[...new Set(employees.map(e => e.employee_name).filter(Boolean))].sort((a, b) => a.localeCompare(b))];

  const filtered = docs.filter(d => {
    const matchEmp    = empFilter === "All" || d.employee === empFilter;
    const q = search.toLowerCase();
    const matchSearch = !search ||
      d.name?.toLowerCase().includes(q) ||
      d.employee?.toLowerCase().includes(q) ||
      d.dept?.toLowerCase().includes(q) ||
      d.type?.toLowerCase().includes(q) ||
      d.size?.toLowerCase().includes(q) ||
      String(d.date || "").slice(0, 10).includes(q);
    return matchEmp && matchSearch;
  });

  const columns = [
    { key: "num",       label: "#" },
    { key: "document",  label: t.docs_col_doc }, { key: "employee", label: t.col_employee },
    { key: "type",      label: t.col_type },     { key: "date",     label: t.col_date },
    { key: "size",      label: t.docs_col_size }, { key: "actions",  label: t.col_actions },
  ];

  return (
    <>
      {/* Header */}
      <div className="hr-ph">
        <div>
          <div className="hr-pt">{t.docs_title}</div>
          <div className="hr-ps">{t.docs_files_sub(docs.length)}</div>
        </div>
        <div className="docs-header-actions">
          <button className="hr-btn" onClick={() => { resetForm(); setShowForm(true); }}><Plus size={13} /> {t.docs_btn}</button>
        </div>
      </div>

      <div className="flex flex-1 flex-col gap-4 p-4 shiny-ring">
        {/* Stats */}
        <div className="docs-stats-grid">
          <div className="emp-stat-card emp-stat-card--all">
            <div className="emp-stat-card__icon"><FileText size={18} /></div>
            <div className="emp-stat-card__count">{docs.length}</div>
            <div className="emp-stat-card__label">{t.docs_stat_total}</div>
          </div>
          <div className="emp-stat-card emp-stat-card--suspended">
            <div className="emp-stat-card__icon"><FileText size={18} /></div>
            <div className="emp-stat-card__count">{docs.filter(d => d.type === "PDF").length}</div>
            <div className="emp-stat-card__label">{t.docs_stat_pdf}</div>
          </div>
          <div className="emp-stat-card emp-stat-card--purple">
            <div className="emp-stat-card__icon"><Users size={18} /></div>
            <div className="emp-stat-card__count">{new Set(docs.map(d => d.employee)).size}</div>
            <div className="emp-stat-card__label">{t.docs_stat_emp}</div>
          </div>
          <div className="emp-stat-card emp-stat-card--active">
            <div className="emp-stat-card__icon"><Calendar size={18} /></div>
            <div className="emp-stat-card__count">{docs.filter(d => d.date && String(d.date).startsWith(new Date().toISOString().slice(0, 7))).length}</div>
            <div className="emp-stat-card__label">{t.docs_stat_month}</div>
          </div>
        </div>

        <DataTable columns={columns} data={filtered} itemLabel="documents"
          toolbar={
            <div className="docs-search-wrap">
              <Search className="docs-search-icon" />
              <input
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder={t.docs_ph_search}
                className="emp-search"
              />
            </div>
          }
          filterSlot={
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
                <span style={{ fontSize: 10, opacity: 0.6 }}>{showEmpList ? "▴" : "▾"}</span>
              </button>
              {showEmpList && (
                <div
                  className={`docs-dropdown${filterPos ? " docs-dropdown--fixed" : ""}`}
                  style={filterPos ? { top: filterPos.top, ...(filterPos.right !== undefined ? { right: filterPos.right } : { left: filterPos.left }), maxHeight: filterPos.maxH } : {}}
                >
                  <div
                    onClick={() => { setEmpFilter("All"); setShowEmpList(false); setFilterPos(null); }}
                    className={`docs-dropdown-item docs-dropdown-item--border${empFilter === "All" ? " docs-dropdown-item--active" : ""}`}
                  >
                    {t.docs_all_emp}
                  </div>
                  {empNames.slice(1).map(emp => (
                    <div
                      key={emp}
                      onClick={() => { setEmpFilter(emp); setShowEmpList(false); setFilterPos(null); }}
                      className={`docs-dropdown-item${empFilter === emp ? " docs-dropdown-item--active" : ""}`}
                    >
                      {emp}
                    </div>
                  ))}
                </div>
              )}
            </div>
          }
          renderRow={(doc, index) => (
          <TableRow key={doc.id} className="hover:bg-muted/50">
            <TableCell className="docs-num-cell">{index + 1}</TableCell>
            <TableCell className="min-w-[180px]">
              <div className="docs-name-cell">
                <div className="docs-name-icon" style={{ background: TYPE_CFG[doc.type]?.bg || "#F1F5F9" }}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={TYPE_CFG[doc.type]?.color || "#64748B"} strokeWidth="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
                </div>
                <span className="docs-name-text">{doc.name}</span>
              </div>
            </TableCell>
            <TableCell>
              <div className="docs-emp-name">{doc.employee}</div>
              {doc.dept && <div className="docs-emp-dept">{doc.dept}</div>}
            </TableCell>
            <TableCell><Badge text={doc.type} /></TableCell>
            <TableCell className="docs-date-cell">{doc.date ? new Date(doc.date).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }) : "—"}</TableCell>
            <TableCell className="docs-size-cell">{doc.size || "—"}</TableCell>
            <TableCell>
              <div className="docs-action-btns">
                <button
                  onClick={() => previewDoc(doc)}
                  className="docs-btn-preview"
                  title={`Download ${doc.type}`}
                >↓ {doc.type}</button>
                <button className="hr-btn-sm hr-btn-edit" onClick={() => prepareEdit(doc)}>{t.btn_edit}</button>
                <DeleteConfirmDialog onConfirm={() => deleteDoc(doc.id)} itemName="document" />
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
            <h2 className="hr-modal-title">{editId ? t.docs_modal_edit : t.docs_modal_add}</h2>
            <button className="hr-modal-close" onClick={resetForm}>✕</button>
            <form onSubmit={submit} className="docs-form">
              {/* File Upload Zone */}
              <input ref={fileInputRef} type="file" accept=".pdf,.doc,.docx,.xls,.xlsx,.jpg,.jpeg,.png" style={{ display: "none" }} onChange={e => handleFileSelect(e.target.files[0])} />
              {!file ? (
                <div
                  onDragOver={e => { e.preventDefault(); setDragging(true); }}
                  onDragLeave={() => setDragging(false)}
                  onDrop={e => { e.preventDefault(); setDragging(false); handleFileSelect(e.dataTransfer.files[0]); }}
                  onClick={() => fileInputRef.current?.click()}
                  className={`docs-dropzone${dragging ? " docs-dropzone--active" : ""}`}
                >
                  <div className="docs-dropzone-icon">📄</div>
                  <div className="docs-dropzone-text">{t.docs_drag_drop}</div>
                  <div className="docs-dropzone-sub">{t.docs_drag_click}</div>
                </div>
              ) : (
                <div className="docs-file-preview" style={{ background: TYPE_CFG[detectType(file.name)]?.bg || "#F1F5F9" }}>
                  <div style={{ fontSize: 22 }}>📄</div>
                  <div className="docs-file-info">
                    <div className="docs-file-name">{file.name}</div>
                    <div className="docs-file-meta">{formatSize(file.size)} · <span style={{ color: TYPE_CFG[detectType(file.name)]?.color || "#64748B", fontWeight: 600 }}>{detectType(file.name)}</span></div>
                  </div>
                  <button type="button" onClick={() => { setFile(null); if (fileInputRef.current) fileInputRef.current.value = ""; }} className="docs-file-remove">✕</button>
                </div>
              )}
              <div className="docs-form-field">
                <Label>{t.docs_fld_name}</Label>
                <Input value={name} onChange={e => setName(e.target.value)} placeholder={t.docs_ph_name} required />
              </div>
              <div className="docs-form-field">
                <Label>{t.lbl_employee}</Label>
                <Select value={employee} onValueChange={v => { setEmployee(v); const emp = employees.find(e => e.employee_name === v); if (emp) setDept(emp.department || ""); }}>
                  <SelectTrigger><SelectValue placeholder={t.lbl_select_emp} /></SelectTrigger>
                  <SelectContent>{employees.map(e => <SelectItem key={e.id} value={e.employee_name}>{e.employee_name}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="docs-form-grid">
                <div className="docs-form-field">
                  <Label>{t.lbl_department}</Label>
                  <Input value={dept} onChange={e => setDept(e.target.value)} placeholder={t.lbl_department} />
                </div>
                <div className="docs-form-field">
                  <Label>{t.docs_fld_type}</Label>
                  <Select value={type} onValueChange={setType}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{FILE_TYPES.map(t2 => <SelectItem key={t2} value={t2}>{t2}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div className="docs-form-field">
                  <Label>{t.docs_fld_size}</Label>
                  <Input value={size} onChange={e => setSize(e.target.value)} placeholder="e.g. 2.4 MB" />
                </div>
                <div className="docs-form-field">
                  <Label>{t.lbl_date}</Label>
                  <Input type="date" value={date} onChange={e => setDate(e.target.value)} />
                </div>
              </div>
              <div className="docs-form-footer">
                <button type="button" onClick={resetForm} className="form-btn-cancel">{t.btn_cancel}</button>
                <button type="submit" className="docs-btn-submit">{editId ? t.docs_btn_update : t.docs_btn_upload}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
