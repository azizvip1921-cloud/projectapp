import { useState, useEffect } from "react";
import { useLanguage } from "@/contexts/LanguageContext";
import { useFormVisibility } from "@/components/FormVisibilityContext";
import { toast } from "sonner";
import { Plus, TrendingUp, Calendar, FileText, BarChart3 } from "lucide-react";
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

const CATEGORIES = ["Sales", "Services", "Projects", "Other"];
const CAT_CFG = {
  Sales:    { bg: "#DBEAFE", color: "#1D4ED8" },
  Services: { bg: "#EDE9FE", color: "#6D28D9" },
  Projects: { bg: "#FEF9C3", color: "#92400E" },
  Other:    { bg: "#DCFCE7", color: "#15803D" },
};
const catColors = { Sales: "#3B82F6", Services: "#8B5CF6", Projects: "#F59E0B", Other: "#10B981" };

function Badge({ text }) {
  const { tv } = useLanguage();
  const c = CAT_CFG[text] || { bg: "#F1F5F9", color: "#64748B" };
  return <span className="hr-badge" style={{ background: c.bg, color: c.color }}>{tv(text) || "—"}</span>;
}

function MonthlyTrendChart({ records }) {
  const now = new Date();
  const months = Array.from({ length: 8 }, (_, i) => {
    const d = new Date(now.getFullYear(), now.getMonth() - 7 + i, 1);
    return { key: d.toISOString().slice(0, 7), label: d.toLocaleString("en", { month: "short" }) };
  });
  const vals = months.map(m => records.filter(r => r.date && String(r.date).startsWith(m.key)).reduce((s, r) => s + Number(r.amount || 0), 0));
  const maxV = Math.max(...vals, 1);
  const W = 300, H = 100, pad = 10, bw = 26, gap = 6, barH = H - 22;
  return (
    <svg viewBox={`0 0 ${W} ${H}`} style={{ width: "100%", overflow: "visible" }}>
      {vals.map((v, i) => {
        const x = pad + i * (bw + gap);
        const h = Math.max(Math.round((v / maxV) * barH), v > 0 ? 4 : 3);
        const y = barH - h;
        const isCurrent = months[i].key === now.toISOString().slice(0, 7);
        const col = isCurrent ? "#2563EB" : "#10B981";
        return (
          <g key={months[i].key}>
            <rect x={x} y={y} width={bw} height={h} rx="5" fill={col} opacity={isCurrent ? 1 : 0.72} />
            {v > 0 && (
              <text x={x + bw / 2} y={y - 4} textAnchor="middle" fontSize="7" fill="#94A3B8">
                {v >= 1000000 ? (v / 1000000).toFixed(1) + "M" : v >= 1000 ? (v / 1000).toFixed(0) + "K" : v}
              </text>
            )}
            <text x={x + bw / 2} y={H} textAnchor="middle" fontSize="8" fill="#94A3B8">{months[i].label}</text>
          </g>
        );
      })}
    </svg>
  );
}

function DonutChart({ records }) {
  const cats = ["Sales", "Services", "Projects", "Other"];
  const cols = ["#3B82F6", "#8B5CF6", "#F59E0B", "#10B981"];
  const totals = cats.map(c => records.filter(r => r.category === c).reduce((s, r) => s + Number(r.amount || 0), 0));
  const grand = totals.reduce((a, b) => a + b, 0) || 1;
  const cx = 40, cy = 40, r = 32, innerR = 20;
  let offset = 0;
  const paths = totals.map((v, i) => {
    if (v === 0) return null;
    const pct = v / grand;
    const angle = pct * 2 * Math.PI;
    const x1 = cx + r * Math.sin(offset), y1 = cy - r * Math.cos(offset);
    offset += angle;
    const x2 = cx + r * Math.sin(offset), y2 = cy - r * Math.cos(offset);
    const large = pct > 0.5 ? 1 : 0;
    return <path key={cats[i]} d={`M${cx} ${cy} L${x1} ${y1} A${r} ${r} 0 ${large} 1 ${x2} ${y2} Z`} fill={cols[i]} opacity="0.88" />;
  });
  const total = totals.reduce((a, b) => a + b, 0);
  const label = total >= 1000000 ? (total / 1000000).toFixed(1) + "M" : total.toLocaleString();
  return (
    <svg viewBox="0 0 80 80" style={{ width: 86, height: 86, flexShrink: 0 }}>
      {paths}
      <circle cx={cx} cy={cy} r={innerR} fill="var(--hr-card)" />
      <text x={cx} y={cy - 2} textAnchor="middle" fontSize="8.5" fontWeight="700" fill="#10B981">{label}</text>
      <text x={cx} y={cy + 9} textAnchor="middle" fontSize="7" fill="#94A3B8">IQD</text>
    </svg>
  );
}

export default function Revenue() {
  const { t, tv } = useLanguage();
  const [records, setRecords] = useState([]);
  const [source, setSource] = useState("");
  const [category, setCategory] = useState("Sales");
  const [amount, setAmount] = useState("");
  const [date, setDate] = useState(localToday());
  const [notes, setNotes] = useState("");
  const [editId, setEditId] = useState(null);
  const [filter, setFilter] = useState("All");
  const [filterDate, setFilterDate] = useState(localMonth());
  const { showForm, setShowForm } = useFormVisibility();

  useEffect(() => { fetchRecords(); }, []);

  const fetchRecords = async () => {
    try { const res = await fetch("/api/revenue"); const data = await res.json(); setRecords(Array.isArray(data) ? data : []); }
    catch (e) { console.error(e); }
  };

  const submit = async (e) => {
    e.preventDefault();
    if (!source || !amount) { toast.warning(t.lbl_required); return; }
    const body = { source, category, amount: Number(amount), date, notes };
    try {
      const res = editId
        ? await fetch(`/api/revenue/${editId}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) })
        : await fetch("/api/revenue", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      if (!res.ok) throw new Error();
      toast.success(editId ? "Updated" : "Revenue added");
      resetForm(); fetchRecords();
    } catch { toast.error("An error occurred"); }
  };

  const resetForm = () => {
    setSource(""); setCategory("Sales"); setAmount(""); setDate(localToday());
    setNotes(""); setEditId(null); setShowForm(false);
  };

  const prepareEdit = (rec) => {
    setSource(rec.source); setCategory(rec.category || "Sales"); setAmount(rec.amount || "");
    setDate(rec.date ? String(rec.date).slice(0, 10) : ""); setNotes(rec.notes || "");
    setEditId(rec.id); setShowForm(true);
  };

  const deleteRecord = async (id) => {
    try { const res = await fetch(`/api/revenue/${id}`, { method: "DELETE" }); if (!res.ok) throw new Error(); toast.success("Deleted"); fetchRecords(); }
    catch { toast.error("Failed to delete"); }
  };

  const total = records.reduce((s, r) => s + Number(r.amount || 0), 0);
  const thisMonth = localMonth();
  const monthTotal = records.filter(r => r.date && String(r.date).startsWith(thisMonth)).reduce((s, r) => s + Number(r.amount || 0), 0);

  const byCategory = CATEGORIES.map(cat => ({
    cat, total: records.filter(r => r.category === cat).reduce((s, r) => s + Number(r.amount || 0), 0),
  })).filter(c => c.total > 0);
  const maxCat = Math.max(...byCategory.map(c => c.total), 1);

  const filtered = records.filter(r => {
    const matchCat  = filter === "All" || r.category === filter;
    const matchDate = !filterDate || (r.date && String(r.date).startsWith(filterDate));
    return matchCat && matchDate;
  });

  const columns = [
    { key: "num",      label: "#" },
    { key: "source",   label: t.rev_col_source },   { key: "category", label: t.rev_col_category },
    { key: "amount",   label: t.col_salary },        { key: "date",     label: t.col_date },
    { key: "notes",    label: t.col_notes },         { key: "actions",  label: t.col_actions },
  ];

  return (
    <>
      {/* Header */}
      <div className="hr-ph">
        <div>
          <div className="hr-pt">{t.rev_title}</div>
          <div className="hr-ps">{t.rev_sub(records.length)}</div>
        </div>
        <div className="rev-header-actions">
          <input
            type="month"
            value={filterDate}
            onChange={e => setFilterDate(e.target.value)}
            className="rev-month-input"
          />
          <button className="hr-btn" onClick={() => { resetForm(); setShowForm(true); }}><Plus size={13} /> {t.rev_btn}</button>
        </div>
      </div>

      <div className="flex flex-1 flex-col gap-4 p-4 shiny-ring">
        {/* Stats */}
        <div className="rev-stats-grid">
          <div className="emp-stat-card emp-stat-card--all">
            <div className="emp-stat-card__icon"><TrendingUp size={18} /></div>
            <div className="emp-stat-card__count">{total.toLocaleString()} IQD</div>
            <div className="emp-stat-card__label">{t.rev_stat_total}</div>
          </div>
          <div className="emp-stat-card emp-stat-card--active">
            <div className="emp-stat-card__icon"><Calendar size={18} /></div>
            <div className="emp-stat-card__count">{monthTotal.toLocaleString()} IQD</div>
            <div className="emp-stat-card__label">{t.rev_stat_monthly}</div>
          </div>
          <div className="emp-stat-card emp-stat-card--purple">
            <div className="emp-stat-card__icon"><FileText size={18} /></div>
            <div className="emp-stat-card__count">{records.length}</div>
            <div className="emp-stat-card__label">{t.rev_transactions}</div>
          </div>
          <div className="emp-stat-card emp-stat-card--onleave">
            <div className="emp-stat-card__icon"><BarChart3 size={18} /></div>
            <div className="emp-stat-card__count">{new Set(records.map(r => r.category)).size}</div>
            <div className="emp-stat-card__label">{t.rev_stat_topcat}</div>
          </div>
        </div>

        {/* Charts Row */}
        <div className="rev-charts-row">
          {/* Monthly Trend */}
          <div className="rev-chart-card">
            <div className="rev-chart-title">{t.rev_monthly_trend}</div>
            <MonthlyTrendChart records={records} />
          </div>
          {/* By Category */}
          <div className="rev-chart-card">
            <div className="rev-chart-title">{t.rev_by_category}</div>
            <div className="rev-donut-wrap">
              <DonutChart records={records} />
              <div className="rev-cat-bars">
                {byCategory.length === 0
                  ? <span className="rev-no-data">{t.lbl_no_data}</span>
                  : byCategory.map(({ cat, total: catTotal }) => (
                    <div key={cat} className="rev-cat-bar-row">
                      <span className="rev-cat-bar-label">{tv(cat)}</span>
                      <div className="rev-cat-bar-track">
                        <div className="rev-cat-bar-fill" style={{ width: `${(catTotal / maxCat) * 100}%`, background: catColors[cat] || "#64748B" }} />
                      </div>
                      <span className="rev-cat-bar-value" style={{ color: catColors[cat] || "#64748B" }}>
                        {catTotal >= 1000000 ? (catTotal / 1000000).toFixed(1) + "M" : catTotal.toLocaleString()}
                      </span>
                    </div>
                  ))

                }
              </div>
            </div>
          </div>
        </div>

        <DataTable columns={columns} data={filtered} itemLabel="revenue records"
          toolbar={
            <div className="hr-filters">
              {["All", ...CATEGORIES].map(f => (
                <button key={f} className={`hr-chip${filter === f ? " on" : ""}`} onClick={() => setFilter(f)}>
                  {f === "All" ? t.lbl_all : tv(f)}
                </button>
              ))}
            </div>
          }
          renderRow={(rec, index) => (
          <TableRow key={rec.id} className="hover:bg-muted/50">
            <TableCell className="rev-tbl-num">{index + 1}</TableCell>
            <TableCell><span className="rev-tbl-source">{rec.source}</span></TableCell>
            <TableCell><Badge text={rec.category} /></TableCell>
            <TableCell><span className="rev-tbl-amount">{Number(rec.amount || 0).toLocaleString()} IQD</span></TableCell>
            <TableCell className="rev-tbl-date">{fmtDate(rec.date)}</TableCell>
            <TableCell className="rev-tbl-notes">{rec.notes || "—"}</TableCell>
            <TableCell>
              <div className="rev-tbl-actions">
                <button className="hr-btn-sm hr-btn-edit" onClick={() => prepareEdit(rec)}>{t.btn_edit}</button>
                <DeleteConfirmDialog onConfirm={() => deleteRecord(rec.id)} itemName="revenue" />
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
            <h2 className="hr-modal-title">{editId ? t.rev_modal_edit : t.rev_modal_add}</h2>
            <button className="hr-modal-close" onClick={resetForm}>✕</button>
            <form onSubmit={submit} className="rev-form">
              <div className="rev-form-field"><Label>{t.rev_fld_source}</Label><Input value={source} onChange={e => setSource(e.target.value)} placeholder={t.rev_ph_source} required /></div>
              <div className="rev-form-grid">
                <div className="rev-form-field">
                  <Label>{t.rev_fld_category}</Label>
                  <Select value={category} onValueChange={setCategory}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{CATEGORIES.map(c => <SelectItem key={c} value={c}>{tv(c)}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div className="rev-form-field"><Label>{t.rev_fld_amount}</Label><Input type="number" value={amount} onChange={e => setAmount(e.target.value)} placeholder="0" required /></div>
                <div className="rev-form-field"><Label>{t.lbl_date}</Label><Input type="date" value={date} onChange={e => setDate(e.target.value)} /></div>
              </div>
              <div className="rev-form-field"><Label>{t.rev_fld_notes}</Label><Textarea value={notes} onChange={e => setNotes(e.target.value)} placeholder={t.rev_ph_notes} rows={3} /></div>
              <div className="rev-form-footer">
                <button type="button" onClick={resetForm} className="form-btn-cancel">{t.btn_cancel}</button>
                <button type="submit" className="rev-btn-submit">{editId ? t.rev_btn_update : t.rev_btn_add}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
