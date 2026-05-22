import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/router";
import { useLanguage } from "@/contexts/LanguageContext";
import { useFormVisibility } from "@/components/FormVisibilityContext";
import { toast } from "sonner";
import { Plus, UserCheck, UserX, Clock, Calendar } from "lucide-react";
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
import AttendanceRecords from "./attendance-records";
import WorkingDays from "./working-days";

// ── Avatar colors ──
const AVATAR_COLORS = [
  { bg: "#EFF6FF", color: "#1D4ED8" },
  { bg: "#DCFCE7", color: "#15803D" },
  { bg: "#FEF9C3", color: "#92400E" },
  { bg: "#F3E8FF", color: "#7C3AED" },
  { bg: "#FEE2E2", color: "#DC2626" },
  { bg: "#DBEAFE", color: "#1E40AF" },
];

const MODEL_URL = "/models";
let _modelsReady = false;

const PHASE_STEP_SCAN     = { camera: 1, detecting: 2, matching: 3, recording: 4 };
const PHASE_STEP_REGISTER = { camera: 1, detecting: 2, recording: 3 };

const STATUS_CFG = {
  Early:      { bg: "#D1FAE5", color: "#065F46" },
  Present:    { bg: "#DCFCE7", color: "#15803D" },
  Late:       { bg: "#FEF9C3", color: "#92400E" },
  Absent:     { bg: "#FEE2E2", color: "#DC2626" },
  "On Leave": { bg: "#DBEAFE", color: "#1D4ED8" },
};

const DATE_MONTHS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

const WEEK_I18N = {
  en: {
    today: "Today", yesterday: "Yesterday", tomorrow: "Tomorrow",
    months: ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"],
  },
  ku: {
    today: "ئەمڕۆ", yesterday: "دوێنێ", tomorrow: "سبەینێ",
    months: ["کانوونی","شوبات","ئازار","نیسان","ئایار","حوزەیران","تەممووز","ئاب","ئەیلوول","تشرینی","تشرینی٢","کانوونی٢"],
  },
  ar: {
    today: "اليوم", yesterday: "أمس", tomorrow: "غداً",
    months: ["يناير","فبراير","مارس","أبريل","مايو","يونيو","يوليو","أغسطس","سبتمبر","أكتوبر","نوفمبر","ديسمبر"],
  },
};

function getStatusByTime(timeStr) {
  if (!timeStr) return "Present";
  const [h, m] = timeStr.split(":").map(Number);
  const mins = h * 60 + m;
  if (mins < 9 * 60)        return "Early";
  if (mins <= 9 * 60 + 20)  return "Present";
  return "Late";
}

function dateStr(d) {
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;
}

function localToday() {
  return dateStr(new Date());
}

function getWeekDays(anchor) {
  const start = new Date(anchor + "T00:00:00");
  return Array.from({ length: 6 }, (_, i) => {
    const dd = new Date(start);
    dd.setDate(start.getDate() + i);
    return dateStr(dd);
  });
}

const WORK_END_MINS = 18 * 60;

function calcTotalHours(check_in, check_out) {
  if (!check_in || !check_out) return null;
  const [ih, im] = check_in.split(":").map(Number);
  const [oh, om] = check_out.split(":").map(Number);
  const diffMins = (oh * 60 + om) - (ih * 60 + im);
  if (diffMins <= 0) return null;
  const h = Math.floor(diffMins / 60);
  const m = diffMins % 60;
  return `${h}h ${String(m).padStart(2, "0")}m`;
}

function calcOvertime(check_out) {
  if (!check_out) return null;
  const [oh, om] = check_out.split(":").map(Number);
  const outMins = oh * 60 + om;
  if (outMins <= WORK_END_MINS) return null;
  const extra = outMins - WORK_END_MINS;
  const h = Math.floor(extra / 60);
  const m = extra % 60;
  return `${h}h ${String(m).padStart(2, "0")}m`;
}

function formatDate(dateVal) {
  if (!dateVal) return "—";
  const [y, m, day] = dateVal.split("T")[0].split("-");
  return `${day} ${DATE_MONTHS[parseInt(m, 10) - 1]} ${y}`;
}

// ──────────────────────────────────────────────
// ── Shared sub-components ──
// ──────────────────────────────────────────────

function StatusBadge({ status }) {
  const { tv } = useLanguage();
  const presentCfg = STATUS_CFG["Present"];
  if (status === "Early" || status === "Late") {
    const subCfg = STATUS_CFG[status];
    return (
      <span style={{ display: "inline-flex", gap: 4, alignItems: "center" }}>
        <span className="att-status-badge" style={{ background: presentCfg.bg, color: presentCfg.color }}>{tv("Present")}</span>
        <span className="att-status-badge" style={{ background: subCfg.bg, color: subCfg.color }}>{tv(status)}</span>
      </span>
    );
  }
  const cfg = STATUS_CFG[status] || { bg: "#F1F5F9", color: "#64748B" };
  return (
    <span className="att-status-badge" style={{ background: cfg.bg, color: cfg.color }}>
      {tv(status) || "—"}
    </span>
  );
}


function WeekPicker({ filterDate, setFilterDate }) {
  const { lang } = useLanguage();
  const i18n = WEEK_I18N[lang] || WEEK_I18N.en;
  const today = localToday();
  const selectedBtnRef = useRef(null);

  const offsetDate = (base, n) => {
    const d = new Date(base + "T00:00:00");
    d.setDate(d.getDate() + n);
    return dateStr(d);
  };

  const yesterday = offsetDate(today, -1);
  const tomorrow  = offsetDate(today, +1);
  const minDate   = offsetDate(today, -5);
  const maxDate   = offsetDate(today, +5);
  const maxAnchor = offsetDate(maxDate, -5);
  const initAnchor = dateStr((() => { const d = new Date(today+"T00:00:00"); d.setDate(d.getDate()-2); return d; })());
  const [anchor, setAnchor] = useState(initAnchor);
  const days = getWeekDays(anchor);

  const shift = (n) => {
    const d = new Date(anchor+"T00:00:00");
    d.setDate(d.getDate() + n);
    const next = dateStr(d);
    if (next < minDate) setAnchor(minDate);
    else if (next > maxAnchor) setAnchor(maxAnchor);
    else setAnchor(next);
  };

  const canGoBack    = anchor > minDate;
  const canGoForward = anchor < maxAnchor;

  const getDayLabel = (ds) => {
    if (ds === today)     return i18n.today;
    if (ds === yesterday) return i18n.yesterday;
    if (ds === tomorrow)  return i18n.tomorrow;
    const d = new Date(ds+"T00:00:00");
    return `${String(d.getDate()).padStart(2,"0")} ${i18n.months[d.getMonth()]}`;
  };

  useEffect(() => {
    if (selectedBtnRef.current) {
      selectedBtnRef.current.scrollIntoView({ behavior: "smooth", block: "nearest", inline: "center" });
    }
  }, [filterDate, anchor]);

  return (
    <div className="att-week-picker">
      <button onClick={() => shift(-1)} disabled={!canGoBack} className="att-week-nav-btn"
        style={{ cursor: canGoBack ? "pointer" : "default", color: canGoBack ? "var(--hr-sub)" : "var(--hr-border)" }}>‹</button>
      <div className="att-week-days">
        {days.map((ds) => {
          const sel = filterDate === ds;
          return (
            <button key={ds} ref={sel ? selectedBtnRef : null} onClick={() => setFilterDate(ds)} title={ds} className="att-week-day-btn"
              style={{ background: sel ? "#1D4ED8" : "transparent", color: sel ? "#fff" : "var(--hr-text)", fontWeight: sel ? 700 : 500 }}>
              {getDayLabel(ds)}
            </button>
          );
        })}
      </div>
      <button onClick={() => shift(1)} disabled={!canGoForward} className="att-week-nav-btn"
        style={{ cursor: canGoForward ? "pointer" : "default", color: canGoForward ? "var(--hr-sub)" : "var(--hr-border)" }}>›</button>
    </div>
  );
}

// ──────────────────────────────────────────────
// ── Face Scanner ──
// ──────────────────────────────────────────────

function FaceScanner({ mode, employees, onClose, fetchRecords }) {
  const { t } = useLanguage();
  const videoRef  = useRef(null);
  const streamRef = useRef(null);
  const loopRef   = useRef(null);
  const phaseRef  = useRef("init");

  const [phase,    setPhase]    = useState("init");
  const [errorMsg, setErrorMsg] = useState("");
  const [selEmp,   setSelEmp]   = useState("");
  const [result,   setResult]   = useState(null);

  const updatePhase = (p) => { phaseRef.current = p; setPhase(p); };

  useEffect(() => {
    loadFaceApi();
    return () => { stopCamera(); if (loopRef.current) clearTimeout(loopRef.current); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadFaceApi = () => {
    updatePhase("loading_api");
    if (window.faceapi) { loadModels(); return; }
    const s = document.createElement("script");
    s.src = "/face-api.min.js";
    s.onload  = loadModels;
    s.onerror = () => showError(t.att_face_err_lib);
    document.head.appendChild(s);
  };

  const loadModels = async () => {
    if (_modelsReady) { openCamera(); return; }
    updatePhase("loading_models");
    try {
      const faceapi = window.faceapi;
      await Promise.all([
        faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL),
        faceapi.nets.faceLandmark68TinyNet.loadFromUri(MODEL_URL),
        faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL),
      ]);
      _modelsReady = true;
      openCamera();
    } catch { showError(t.att_face_err_models); }
  };

  const openCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: { ideal: 640 }, height: { ideal: 480 }, facingMode: "user" },
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.onloadedmetadata = () => {
          videoRef.current.play().then(() => {
            updatePhase("camera");
            if (mode === "scan") loopRef.current = setTimeout(detectFace, 1400);
          });
        };
      }
    } catch { showError(t.att_face_err_camera); }
  };

  const detectFace = async () => {
    if (["error", "success", "registered"].includes(phaseRef.current)) return;
    if (!videoRef.current || videoRef.current.readyState < 2 || videoRef.current.paused || videoRef.current.videoWidth === 0) {
      showError(t.att_face_err_camera);
      return;
    }
    updatePhase("detecting");
    const faceapi = window.faceapi;
    try {
      const det = await faceapi
        .detectSingleFace(videoRef.current, new faceapi.TinyFaceDetectorOptions({ inputSize: 320, scoreThreshold: 0.5 }))
        .withFaceLandmarks(true)
        .withFaceDescriptor();
      if (!det) { showError(t.att_no_employee_found); return; }
      const descriptor = Array.from(det.descriptor);
      if (mode === "register") await doRegister(descriptor);
      else await doMatch(descriptor);
    } catch (e) { showError(t.att_face_err_scan + e.message); }
  };

  const doRegister = async (descriptor) => {
    updatePhase("recording");
    try {
      const res  = await fetch("/api/face", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "register", employee_name: selEmp, descriptor }),
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.message);
      stopCamera();
      setResult({ employee_name: selEmp });
      updatePhase("registered");
      toast.success(t.att_face_toast(selEmp));
    } catch (e) { showError(t.att_face_err_reg + e.message); }
  };

  const doMatch = async (descriptor) => {
    updatePhase("matching");
    try {
      const res  = await fetch("/api/face", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "match", descriptor, today: localToday() }),
      });
      const data = await res.json();
      if (!data.employee_name) {
        const name = data.deleted_name || null;
        const msg = name ? `${t.att_no_employee_found}: ${name}` : t.att_no_employee_found;
        showError(msg);
        return;
      }
      updatePhase("recording");
      const { action, status: recStatus } = await recordAttendance(data.employee_name, data.today_record);
      stopCamera();
      if (action === "on_leave") {
        setResult({ employee_name: data.employee_name, action: "on_leave" });
        updatePhase("on_leave");
        return;
      }
      if (action === "day_off") {
        setResult({ employee_name: data.employee_name, action: "day_off" });
        updatePhase("day_off");
        return;
      }
      setResult({ employee_name: data.employee_name, total_days: data.total_days, action, status: recStatus });
      updatePhase("success");
      fetchRecords();
    } catch (e) { showError(t.att_face_err_match + e.message); }
  };

  const recordAttendance = async (emp, todayRec) => {
    const now  = new Date();
    const time = `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;
    const today = localToday();
    if (!todayRec) {
      const autoStatus = getStatusByTime(time);
      const res = await fetch("/api/attendance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ employee_name: emp, date: today, check_in: time, check_out: "", status: autoStatus }),
      });
      if (res.status === 409) {
        const body = await res.json();
        if (body.on_leave) return { action: "on_leave", status: null };
        if (body.day_off)  return { action: "day_off",  status: null };
      }
      return { action: "check_in", status: autoStatus };
    }
    if (!todayRec.check_out) {
      await fetch(`/api/attendance/${todayRec.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ employee_name: todayRec.employee_name, date: today, check_in: todayRec.check_in, check_out: time, status: todayRec.status }),
      });
      return { action: "check_out", status: todayRec.status };
    }
    return { action: "already_done", status: null };
  };

  const stopCamera = () => {
    if (streamRef.current) { streamRef.current.getTracks().forEach((t) => t.stop()); streamRef.current = null; }
  };

  const showError = (msg) => { stopCamera(); setErrorMsg(msg); updatePhase("error"); };

  const steps    = mode === "register" ? t.att_face_steps_reg : t.att_face_steps_scan;
  const phaseMap = mode === "register" ? PHASE_STEP_REGISTER : PHASE_STEP_SCAN;
  const curStep  = phaseMap[phase] ?? 0;
  const isDone   = (i) => i + 1 < curStep || ["success", "registered"].includes(phase);
  const isActive = (i) => i + 1 === curStep;
  const isLoading = ["init", "loading_api", "loading_models"].includes(phase);

  const loadingMsg = { init: t.att_face_loading_init, loading_api: t.att_face_loading_api, loading_models: t.att_face_loading_models, camera: t.att_face_cam_ready, detecting: t.att_face_detecting, matching: t.att_face_matching, recording: t.att_face_recording }[phase] || "";
  const ringColor = { camera: "#1D4ED8", detecting: "#F59E0B", matching: "#8B5CF6", recording: "#10B981" }[phase] || "#94A3B8";
  const ringGlow  = { camera: "#DBEAFE", detecting: "#FEF3C7", matching: "#EDE9FE", recording: "#D1FAE5" }[phase] || "#F1F5F9";

  return (
    <div className="hr-modal-overlay">
      <div className="hr-modal-bg" onClick={onClose} />
      <div className="hr-modal" style={{ maxWidth: 440, width: "95vw" }}>
        <h2 className="hr-modal-title" style={{ fontSize: 15 }}>
          {mode === "register" ? t.att_face_title_register : t.att_face_title_scan}
        </h2>
        <button className="hr-modal-close" onClick={onClose}>✕</button>

        {!["success", "registered", "error"].includes(phase) && (
          <div className="att-face-camera-wrap">
            {!isLoading && <div className="face-ring-spin att-face-ring-overlay" style={{ border: "2px dashed " + ringColor }} />}
            <div className="att-face-video-wrap" style={{ border: `3px solid ${ringColor}`, boxShadow: `0 0 0 6px ${ringGlow}` }}>
              <video ref={videoRef} className="att-face-video" muted playsInline />
              {isLoading && (
                <div className="att-face-loading-overlay">
                  <div className="face-spinner" style={{ width: 28, height: 28, border: "3px solid #1D4ED8", borderTopColor: "transparent", borderRadius: "50%" }} />
                  {loadingMsg}
                </div>
              )}
            </div>
          </div>
        )}

        {(phase === "success" || phase === "registered") && result && (
          <div className="att-face-success">
            <div className="att-face-success-emoji">✅</div>
            <div className="att-face-success-name">{result.employee_name}</div>
            {phase === "success" && (
              <>
                <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 10, color: result.action === "check_in" ? "#15803D" : result.action === "check_out" ? "#1D4ED8" : "#92400E" }}>
                  {result.action === "check_in" && t.att_face_check_in}
                  {result.action === "check_out" && t.att_face_check_out}
                  {result.action === "already_done" && t.att_face_already}
                </div>
                {result.action === "check_in" && result.status && <div style={{ marginBottom: 14 }}><StatusBadge status={result.status} /></div>}
                <div className="att-face-days-badge">📅 {result.total_days} {t.att_face_days}</div>
              </>
            )}
            {phase === "registered" && <div style={{ fontSize: 13, color: "#15803D", fontWeight: 600 }}>{t.att_face_reg_ok}</div>}
            <br />
            <button onClick={onClose} className="att-face-done-btn">{t.att_face_done}</button>
          </div>
        )}

        {phase === "on_leave" && result && (
          <div className="att-face-on-leave">
            <div className="att-face-on-leave-icon">🏖️</div>
            <div className="att-face-on-leave-name">{result.employee_name}</div>
            <div className="att-face-on-leave-msg">{t.att_face_on_leave_blocked}</div>
            <button onClick={onClose} className="att-face-close-btn">{t.att_face_close}</button>
          </div>
        )}

        {phase === "day_off" && result && (
          <div className="att-face-on-leave">
            <div className="att-face-on-leave-icon">📅</div>
            <div className="att-face-on-leave-name">{result.employee_name}</div>
            <div className="att-face-on-leave-msg">{t.att_face_day_off_blocked}</div>
            <button onClick={onClose} className="att-face-close-btn">{t.att_face_close}</button>
          </div>
        )}

        {phase === "error" && (
          <div className="att-face-error">
            <div className="att-face-error-emoji">❌</div>
            <div className="att-face-error-msg">{errorMsg}</div>
            <button onClick={onClose} className="att-face-close-btn">{t.att_face_close}</button>
          </div>
        )}

        {mode === "register" && phase === "camera" && (
          <div className="att-face-reg-wrap">
            <Label className="att-face-reg-label">{t.att_face_sel_label}</Label>
            <Select value={selEmp} onValueChange={setSelEmp}>
              <SelectTrigger><SelectValue placeholder={t.att_face_sel_ph} /></SelectTrigger>
              <SelectContent>
                {employees.map((emp) => <SelectItem key={emp.id} value={emp.employee_name}>{emp.employee_name}</SelectItem>)}
              </SelectContent>
            </Select>
            {selEmp && <button onClick={detectFace} className="att-face-reg-scan-btn">{t.att_face_scan_btn}</button>}
          </div>
        )}

        {phase !== "error" && (
          <div className="att-face-steps">
            {steps.map((label, i) => (
              <div key={i} className="att-face-step-row">
                <div className="att-face-step-dot" style={{ background: isDone(i) ? "#DCFCE7" : isActive(i) ? "#DBEAFE" : "var(--att-card-bg,#F8FAFC)", color: isDone(i) ? "#15803D" : isActive(i) ? "#1D4ED8" : "#CBD5E1", border: `2px solid ${isDone(i) ? "#86EFAC" : isActive(i) ? "#93C5FD" : "#E2E8F0"}` }}>
                  {isDone(i) ? "✓" : i + 1}
                </div>
                <div className="att-face-step-label" style={{ fontWeight: isDone(i) || isActive(i) ? 600 : 400, color: isDone(i) ? "#15803D" : isActive(i) ? "#1D4ED8" : "#94A3B8" }}>
                  {label}
                  {isActive(i) && <span className="face-pulse-dots" style={{ marginInlineStart: 8, letterSpacing: 2, fontSize: 10 }}>●●●</span>}
                </div>
              </div>
            ))}
          </div>
        )}
        {loadingMsg && !["success", "registered", "error"].includes(phase) && <div className="att-face-status-txt">{loadingMsg}</div>}
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════
// ── TAB 1: Attendance Management ──
// ══════════════════════════════════════════════

function AttendanceManagementTab() {
  const { t, tv } = useLanguage();
  const [records, setRecords]           = useState([]);
  const [employees, setEmployees]       = useState([]);
  const [employee_name, setEmployee_name] = useState("");
  const [date, setDate]                 = useState(localToday);
  const [check_in, setCheck_in]         = useState("");
  const [check_out, setCheck_out]       = useState("");
  const [status, setStatus]             = useState("Present");
  const { showForm, setShowForm }       = useFormVisibility();
  const [editId, setEditId]             = useState(null);
  const [filterDate, setFilterDate]     = useState(localToday);
  const [faceMode, setFaceMode]         = useState(null);
  const [activeLeave, setActiveLeave]   = useState(null);
  const [contractInactive, setContractInactive] = useState(false);

  useEffect(() => { fetchRecords(); fetchEmployees(); }, []);

  const fetchRecords = async () => {
    try {
      const res = await fetch("/api/attendance");
      const data = await res.json();
      setRecords(Array.isArray(data) ? data : []);
    } catch (e) { console.error("Failed to fetch attendance:", e); }
  };

  const fetchEmployees = async () => {
    try {
      const res = await fetch("/api/employee");
      const data = await res.json();
      setEmployees(Array.isArray(data) ? data : data.employees || []);
    } catch (e) { console.error("Failed to fetch employees:", e); }
  };

  const handleSelectEmployee = async (name) => {
    setEmployee_name(name);
    setActiveLeave(null);
    setContractInactive(false);
    try {
      const [leavesRes, contractsRes] = await Promise.all([fetch("/api/leaves"), fetch("/api/contracts")]);
      const leaves = await leavesRes.json();
      const contracts = await contractsRes.json();
      const today = localToday();
      const found = Array.isArray(leaves) && leaves.find(l =>
        l.employee_name === name && l.status === "Approved" &&
        l.start_date && l.end_date &&
        l.start_date.slice(0, 10) <= today && l.end_date.slice(0, 10) >= today
      );
      if (found) { setActiveLeave(found); setStatus("On Leave"); }
      if (Array.isArray(contracts)) {
        const empContracts = contracts.filter(c => c.employee_name === name);
        if (empContracts.length > 0) {
          const latest = empContracts.sort((a, b) => new Date(b.start_date) - new Date(a.start_date))[0];
          if (latest.status === "Inactive" || latest.status === "Expired") setContractInactive(true);
        }
      }
    } catch (e) { console.error(e); }
  };

  const submit = async (e) => {
    e.preventDefault();
    if (contractInactive && !editId) { toast.error(t.att_contract_inactive(employee_name)); return; }
    if (activeLeave && !editId) { toast.error(t.att_on_leave_banner(employee_name, activeLeave.end_date.slice(0, 10))); return; }
    if (!employee_name || !date || !status) { toast.warning(t.lbl_required); return; }
    const body = { employee_name, date, check_in, check_out, status };
    try {
      const res = editId
        ? await fetch(`/api/attendance/${editId}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) })
        : await fetch("/api/attendance", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      if (res.status === 409) {
        const body409 = await res.json();
        if (body409.day_off) { toast.error(t.att_day_off_blocked); return; }
      }
      if (!res.ok) throw new Error("Failed");
      if (status === "Absent" && !editId) {
        await fetch("/api/leaves", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ employee_name, leave_type: "Absence", start_date: date, end_date: date, days: 1, status: "Pending", notes: "Auto-recorded from attendance" }),
        });
      }
      toast.success(editId ? t.att_toast_update : t.att_toast_add);
      resetForm();
      fetchRecords();
    } catch { toast.error(t.att_err_save); }
  };

  const resetForm = () => {
    setEmployee_name(""); setDate(localToday()); setCheck_in(""); setCheck_out("");
    setStatus("Present"); setEditId(null); setShowForm(false); setActiveLeave(null); setContractInactive(false);
  };

  const prepareEdit = (rec) => {
    setEmployee_name(rec.employee_name);
    setDate(rec.date ? rec.date.split("T")[0] : localToday());
    setCheck_in(rec.check_in || ""); setCheck_out(rec.check_out || "");
    setStatus(rec.status); setEditId(rec.id); setShowForm(true);
  };

  const deleteRecord = async (id) => {
    try {
      const res = await fetch(`/api/attendance/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed");
      toast.success(t.att_toast_delete);
      fetchRecords();
    } catch { toast.error(t.att_err_delete); }
  };

  const filtered = records.filter(r => { const rd = r.date ? r.date.split("T")[0] : ""; return rd === filterDate; });

  const stats = {
    Present:    filtered.filter(r => ["Present", "Early"].includes(r.status)).length,
    Absent:     filtered.filter(r => r.status === "Absent").length,
    Late:       filtered.filter(r => r.status === "Late").length,
    "On Leave": filtered.filter(r => r.status === "On Leave").length,
  };

  const getEmpData = (name) => {
    const idx = employees.findIndex(e => e.employee_name === name);
    return { id: employees[idx]?.id, dept: employees[idx]?.department || "—", ac: AVATAR_COLORS[idx >= 0 ? idx % AVATAR_COLORS.length : 0] };
  };

  const columns = [
    { key: "num",        label: "#" },
    { key: "employee",   label: t.col_employee },
    { key: "dept",       label: t.att_col_dept },
    { key: "date",       label: t.col_date },
    { key: "check_in",   label: t.att_col_check_in },
    { key: "check_out",  label: t.att_col_check_out },
    { key: "total_hours",label: t.att_col_total_hours },
    { key: "overtime",   label: t.att_col_overtime },
    { key: "status",     label: t.col_status },
    { key: "actions",    label: t.col_actions },
  ];

  return (
    <>
      <div className="hr-ph">
        <div className="ph-title-group">
          <div className="hr-pt">{t.att_title}</div>
          <div className="hr-ps">{t.att_sub}</div>
        </div>
        <div className="ph-main-actions">
          <input type="date" value={filterDate} onChange={e => setFilterDate(e.target.value)} className="att-date-input" />
          <button className="face-id-btn" onClick={() => setFaceMode("scan")}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
            {t.att_face_btn_scan}
          </button>
        </div>
        <div className="ph-extra-actions">
          <button className="face-id-btn-reg" onClick={() => setFaceMode("register")}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
            {t.att_face_btn_reg}
          </button>
          <button className="hr-btn" onClick={() => { resetForm(); setShowForm(true); }}>
            <Plus size={13} /> {t.att_btn}
          </button>
        </div>
      </div>

      <div className="att-week-wrap">
        <WeekPicker filterDate={filterDate} setFilterDate={setFilterDate} />
      </div>

      <div className="flex flex-1 flex-col gap-4 p-4 shiny-ring">
        <div className="att-stats-grid">
          <div className="emp-stat-card emp-stat-card--active">
            <div className="emp-stat-card__icon"><UserCheck size={18} /></div>
            <div className="emp-stat-card__count">{stats.Present}</div>
            <div className="emp-stat-card__label">{t.att_present}</div>
          </div>
          <div className="emp-stat-card emp-stat-card--suspended">
            <div className="emp-stat-card__icon"><UserX size={18} /></div>
            <div className="emp-stat-card__count">{stats.Absent}</div>
            <div className="emp-stat-card__label">{t.att_absent}</div>
          </div>
          <div className="emp-stat-card emp-stat-card--onleave">
            <div className="emp-stat-card__icon"><Clock size={18} /></div>
            <div className="emp-stat-card__count">{stats.Late}</div>
            <div className="emp-stat-card__label">{t.att_late}</div>
          </div>
          <div className="emp-stat-card emp-stat-card--all">
            <div className="emp-stat-card__icon"><Calendar size={18} /></div>
            <div className="emp-stat-card__count">{stats["On Leave"]}</div>
            <div className="emp-stat-card__label">{t.att_on_leave}</div>
          </div>
        </div>

        <DataTable columns={columns} data={filtered} itemLabel="attendance records"
          renderRow={(rec, index) => {
            const emp = getEmpData(rec.employee_name);
            return (
              <TableRow key={rec.id} className="hover:bg-muted/50">
                <TableCell className="att-cell-num">{index + 1}</TableCell>
                <TableCell className="min-w-[160px]">
                  <div className="att-cell-name">{rec.employee_name}</div>
                </TableCell>
                <TableCell className="att-cell-dept">{emp.dept}</TableCell>
                <TableCell className="att-cell-date">{formatDate(rec.date)}</TableCell>
                <TableCell className="att-cell-checkin">{rec.check_in || "—"}</TableCell>
                <TableCell className="att-cell-checkout">{rec.check_out || "—"}</TableCell>
                <TableCell className="att-cell-time">{calcTotalHours(rec.check_in, rec.check_out) || "—"}</TableCell>
                <TableCell className="att-cell-time">
                  {(() => { const ot = calcOvertime(rec.check_out); return ot ? <span style={{ color: "#DC2626", fontWeight: 600 }}>{ot}</span> : "—"; })()}
                </TableCell>
                <TableCell><StatusBadge status={rec.status} /></TableCell>
                <TableCell>
                  <div className="att-cell-actions">
                    <button onClick={() => prepareEdit(rec)} className="hr-btn-sm hr-btn-edit">{t.btn_edit}</button>
                    <DeleteConfirmDialog onConfirm={() => deleteRecord(rec.id)} itemName="record" />
                  </div>
                </TableCell>
              </TableRow>
            );
          }}
        />
      </div>

      {showForm && (
        <div className="hr-modal-overlay">
          <div className="hr-modal-bg" onClick={resetForm} />
          <div className="hr-modal">
            <h2 className="hr-modal-title">{editId ? t.att_modal_edit : t.att_modal_add}</h2>
            <button className="hr-modal-close" onClick={resetForm}>✕</button>
            <form onSubmit={submit} className="att-form">
              <div className="att-form-field">
                <Label>{t.lbl_employee}</Label>
                <Select value={employee_name} onValueChange={handleSelectEmployee}>
                  <SelectTrigger><SelectValue placeholder={t.lbl_select_emp} /></SelectTrigger>
                  <SelectContent>{employees.map(emp => <SelectItem key={emp.id} value={emp.employee_name}>{emp.employee_name}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              {contractInactive && (
                <div className="att-on-leave-banner" style={{ background: "#FEE2E2", borderColor: "#FECACA", color: "#DC2626" }}>
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#DC2626" strokeWidth="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
                  <span>{t.att_contract_inactive(employee_name)}</span>
                </div>
              )}
              {activeLeave && !contractInactive && (
                <div className="att-on-leave-banner">
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#92400E" strokeWidth="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
                  <span>{t.att_on_leave_banner(employee_name, activeLeave.end_date.slice(0, 10))}</span>
                </div>
              )}
              <div className="att-form-field">
                <Label>{t.att_fld_date}</Label>
                <Input type="date" value={date} onChange={e => setDate(e.target.value)} required />
              </div>
              <div className="att-form-grid">
                <div className="att-form-field">
                  <Label>{t.att_fld_check_in}</Label>
                  <Input type="time" value={check_in} onChange={e => { setCheck_in(e.target.value); if (status !== "On Leave") setStatus(getStatusByTime(e.target.value)); }} />
                </div>
                <div className="att-form-field">
                  <Label>{t.att_fld_check_out}</Label>
                  <Input type="time" value={check_out} onChange={e => setCheck_out(e.target.value)} />
                </div>
              </div>
              <div className="att-form-field">
                <Label>{t.att_fld_status}</Label>
                <Select value={status} onValueChange={setStatus}>
                  <SelectTrigger><SelectValue placeholder={t.ph_status} /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Early">{tv("Early")}</SelectItem>
                    <SelectItem value="Present">{tv("Present")}</SelectItem>
                    <SelectItem value="Late">{tv("Late")}</SelectItem>
                    <SelectItem value="Absent">{tv("Absent")}</SelectItem>
                    <SelectItem value="On Leave">{tv("On Leave")}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="att-form-footer">
                <button type="button" onClick={resetForm} className="form-btn-cancel">{t.btn_cancel}</button>
                <button type="submit" className="att-form-submit">{editId ? t.att_btn_update : t.att_btn_add}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {faceMode && (
        <FaceScanner mode={faceMode} employees={employees} onClose={() => setFaceMode(null)} fetchRecords={fetchRecords} />
      )}
    </>
  );
}

// ══════════════════════════════════════════════
// ── Main Export ──
// ══════════════════════════════════════════════

export default function Attendance() {
  const router = useRouter();
  const panel = router.query.panel || "management";

  return (
    <>
      {panel === "management"   && <AttendanceManagementTab />}
      {panel === "records"      && <AttendanceRecords />}
      {panel === "working-days" && <WorkingDays />}
    </>
  );
}
