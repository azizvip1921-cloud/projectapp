import { useState, useEffect } from "react";
import { useLanguage } from "@/contexts/LanguageContext";
import { useFormVisibility } from "@/components/FormVisibilityContext";
import { toast } from "sonner";
import { Plus, TrendingUp, Target, BarChart3 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import DeleteConfirmDialog from "@/components/DeleteConfirmDialog";

// ── Progress Bar ──
function ProgressBar({ pct, color }) {
  return (
    <div className="sav-progress-bar">
      <div className="sav-progress-fill" style={{ width: `${Math.min(pct, 100)}%`, background: color }} />
    </div>
  );
}

// ── Mini info box ──
function MiniBox({ label, value, color }) {
  return (
    <div className="sav-minibox">
      <div className="sav-minibox-label">{label}</div>
      <div className="sav-minibox-value" style={{ color }}>{value}</div>
    </div>
  );
}

const localToday = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`; };
const localMonth = () => localToday().slice(0, 7);

const GOAL_COLORS = ["#3B82F6", "#10B981", "#8B5CF6", "#F59E0B", "#EF4444", "#EC4899"];

const fmt = (n) => `${Number(n || 0).toLocaleString()} IQD`;

export default function Savings() {
  const { t } = useLanguage();
  const [goals, setGoals] = useState([]);
  const [name, setName] = useState("");
  const [target, setTarget] = useState("");
  const [started, setStarted] = useState(localToday());
  const [editId, setEditId] = useState(null);
  const [filterMonth, setFilterMonth] = useState(localMonth());
  const { showForm, setShowForm } = useFormVisibility();

  const [totalExpenditure, setTotalExpenditure] = useState(0);

  useEffect(() => { fetchGoals(); }, []);
  useEffect(() => { fetchExpenditure(filterMonth); }, [filterMonth]);

  const fetchGoals = async () => {
    try { const res = await fetch("/api/safe"); const data = await res.json(); setGoals(Array.isArray(data) ? data : []); }
    catch (e) { console.error(e); }
  };

  const fetchExpenditure = async (month) => {
    try {
      const [expRes, payRes] = await Promise.all([fetch("/api/expenses"), fetch("/api/payroll")]);
      const [expData, payData] = await Promise.all([expRes.json(), payRes.json()]);
      const expTotal = Array.isArray(expData)
        ? expData.filter(r => r.status === "Approved" && (!month || (r.date && r.date.slice(0, 7) === month))).reduce((s, r) => s + (Number(r.amount) || 0), 0)
        : 0;
      const payTotal = Array.isArray(payData)
        ? payData.filter(r => r.status === "Paid" && (!month || r.month === month)).reduce((s, r) => s + (Number(r.net) || 0), 0)
        : 0;
      setTotalExpenditure(expTotal + payTotal);
    } catch (e) { console.error(e); }
  };

  const submit = async (e) => {
    e.preventDefault();
    if (!name || !target) { toast.warning(t.lbl_required); return; }
    const body = { name, target: Number(target), started };
    try {
      const res = editId
        ? await fetch(`/api/safe/${editId}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) })
        : await fetch("/api/safe", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      if (!res.ok) throw new Error();
      toast.success(editId ? t.sav_toast_update : t.sav_toast_add);
      resetForm(); fetchGoals();
    } catch { toast.error(t.sav_toast_err); }
  };

  const resetForm = () => {
    setName(""); setTarget(""); setStarted(localToday());
    setEditId(null); setShowForm(false);
  };

  const prepareEdit = (g) => {
    setName(g.name); setTarget(g.target || "");
    setStarted(g.started ? g.started.split("T")[0] : "");
    setEditId(g.id); setShowForm(true);
  };

  const adjustExpenditure = async (goal, delta) => {
    const newTarget = Math.max(0, (Number(goal.target) || 0) + delta);
    const startedStr = goal.started ? String(goal.started).substring(0, 10) : null;
    try {
      const res = await fetch(`/api/safe/${goal.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: goal.name, target: newTarget, started: startedStr }),
      });
      if (!res.ok) throw new Error();
      fetchGoals();
    } catch { toast.error(t.sav_toast_err_upd); }
  };

  const deleteGoal = async (id) => {
    try { const res = await fetch(`/api/safe/${id}`, { method: "DELETE" }); if (!res.ok) throw new Error(); toast.success(t.sav_toast_delete); fetchGoals(); }
    catch { toast.error(t.sav_toast_err_del); }
  };

  const filteredGoals = goals.filter(g => !filterMonth || (g.started && g.started.slice(0, 7) === filterMonth));
  const totalTarget = filteredGoals.reduce((s, g) => s + (Number(g.target) || 0), 0);
  const effectiveTarget = totalTarget - totalExpenditure;
  const overallPct = totalTarget > 0 ? Math.min(Math.round((totalExpenditure / totalTarget) * 100), 100) : 0;

  return (
    <>
      {/* Always visible header */}
      <div className="hr-ph">
        <div>
          <div className="hr-pt">{t.sav_title}</div>
          <div className="hr-ps">{t.sav_goals_sub(goals.length)}</div>
        </div>
        <div className="pay-header-actions">
          <input
            type="month"
            value={filterMonth}
            onChange={e => setFilterMonth(e.target.value)}
            className="pay-month-input"
          />
          <button className="hr-btn" onClick={() => { resetForm(); setShowForm(true); }}><Plus size={13} /> {t.sav_btn}</button>
        </div>
      </div>

      {/* Always visible content */}
      <div className="sav-content">

        {/* 3 Stat Cards */}
        <div className="sav-stats-grid">
          <div className="emp-stat-card emp-stat-card--active">
            <div className="emp-stat-card__icon"><TrendingUp size={18} /></div>
            <div className="emp-stat-card__count">{fmt(totalExpenditure)}</div>
            <div className="emp-stat-card__label">{t.sav_stat_saved}</div>
          </div>
          <div className="emp-stat-card" style={{ background: effectiveTarget < 0 ? "#FFF1F2" : "#EFF6FF", borderColor: effectiveTarget < 0 ? "#FECDD3" : "#BFDBFE" }}>
            <div className="emp-stat-card__icon" style={{ background: effectiveTarget < 0 ? "#FFE4E6" : "#DBEAFE", color: effectiveTarget < 0 ? "#BE123C" : "#1D4ED8" }}><Target size={18} /></div>
            <div className="emp-stat-card__count" style={{ color: effectiveTarget < 0 ? "#BE123C" : "#1D4ED8" }}>{effectiveTarget < 0 ? `-${fmt(Math.abs(effectiveTarget))}` : fmt(effectiveTarget)}</div>
            <div className="emp-stat-card__label" style={{ color: effectiveTarget < 0 ? "#9F1239" : "#1E40AF" }}>{t.sav_stat_target}</div>
          </div>
          <div className="emp-stat-card emp-stat-card--purple">
            <div className="emp-stat-card__icon"><BarChart3 size={18} /></div>
            <div className="emp-stat-card__count">{overallPct}%</div>
            <div className="emp-stat-card__label">{t.sav_overall_progress}</div>
          </div>
        </div>

        {/* Goal Cards */}
        {goals.length > 0 ? (
          <div className="sav-goals-grid">
            {filteredGoals.map((g, i) => {
              const color = GOAL_COLORS[i % GOAL_COLORS.length];
              const pct = totalTarget > 0 ? Math.min(Math.round((totalExpenditure / totalTarget) * 100), 100) : 0;
              const remaining = totalTarget - totalExpenditure;
              return (
                <div key={g.id} className="sav-goal-card">
                  <div className="sav-card-header">
                    <div className="sav-icon-row">
                      <div className="sav-icon-wrap" style={{ background: `${color}18` }}>
                        <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2"><path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z"/></svg>
                      </div>
                      <div>
                        <div className="sav-goal-name">{g.name}</div>
                        <div className="sav-goal-date">
                          {g.started ? `${t.sav_started_lbl} ${new Date(String(g.started).slice(0,10)+"T00:00:00").toLocaleDateString()}` : ""}
                        </div>
                      </div>
                    </div>
                    <span className="hr-badge" style={{ background: `${color}18`, color }}>{pct}%</span>
                  </div>
                  <ProgressBar pct={pct} color={color} />
                  <div className="sav-minibox-grid">
                    <MiniBox label={t.sav_saved_lbl}     value={fmt(totalExpenditure)}   color="#10B981" />
                    <MiniBox label={t.sav_target_lbl}    value={fmt(g.target)}           color="#3B82F6" />
                    <MiniBox label={t.sav_remaining_lbl} value={remaining < 0 ? `-${fmt(Math.abs(remaining))}` : fmt(remaining)} color={remaining < 0 ? "#EF4444" : "#64748B"} />
                  </div>
                  <div className="sav-btn-row">
                    <button className="hr-btn-sm hr-btn-out" style={{ flex: 1, justifyContent: "center" }} onClick={() => adjustExpenditure(g, -500000)}>- 500K</button>
                    <button className="hr-btn-sm" style={{ flex: 1, justifyContent: "center", background: color, color: "#fff" }} onClick={() => adjustExpenditure(g, 500000)}>+ 500K</button>
                    <button className="hr-btn-sm hr-btn-out" style={{ flex: 1, justifyContent: "center" }} onClick={() => adjustExpenditure(g, 1000000)}>+ 1M</button>
                  </div>
                  <div className="sav-btn-row-last">
                    <button className="hr-btn-sm hr-btn-edit" style={{ flex: 1, justifyContent: "center" }} onClick={() => prepareEdit(g)}>✎ {t.btn_edit}</button>
                    <DeleteConfirmDialog onConfirm={() => deleteGoal(g.id)} itemName="goal" trigger={
                      <button className="hr-btn-sm hr-btn-del" style={{ flex: 1, justifyContent: "center" }}>✕ {t.del_confirm}</button>
                    } />
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="sav-empty">
            <div className="sav-empty-text">{t.sav_no_goals}</div>
            <button className="hr-btn" onClick={() => { resetForm(); setShowForm(true); }}><Plus size={13} /> {t.sav_btn_add}</button>
          </div>
        )}
      </div>

      {/* Modal */}
      {showForm && (
        <div className="hr-modal-overlay">
          <div className="hr-modal-bg" onClick={resetForm} />
          <div className="hr-modal">
            <h2 className="hr-modal-title">{editId ? t.sav_modal_edit : t.sav_modal_add}</h2>
            <button className="hr-modal-close" onClick={resetForm}>✕</button>
            <form onSubmit={submit} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              <div className="sav-form-field">
                <Label>{t.sav_fld_name}</Label>
                <Input value={name} onChange={e => setName(e.target.value)} placeholder={t.sav_ph_name} required />
              </div>
              <div className="sav-form-field">
                <Label>{t.sav_fld_target}</Label>
                <Input type="number" value={target} onChange={e => setTarget(e.target.value)} placeholder="0" required />
              </div>
              <div className="sav-form-field">
                <Label>{t.sav_started_date}</Label>
                <Input type="date" value={started} onChange={e => setStarted(e.target.value)} />
              </div>

              <div className="sav-form-footer">
                <button type="button" onClick={resetForm} className="form-btn-cancel">{t.btn_cancel}</button>
                <button type="submit" className="sav-btn-submit">{editId ? t.sav_btn_update : t.sav_btn_add}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
