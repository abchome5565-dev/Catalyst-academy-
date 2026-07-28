import React, { useState, useEffect, useRef, useMemo } from "react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from "recharts";
import {
  BookOpen, Plus, Clock, Users, BarChart2, CheckCircle2,
  Trash2, Play, ChevronRight, ChevronLeft, LogOut, GraduationCap,
  Shuffle, AlertTriangle, Award, User, Calendar, Timer as TimerIcon, Edit3, Loader2
} from "lucide-react";
import { supabase } from "./supabaseClient";

// ---------- Helpers ----------
const nowISO = () => new Date().toISOString();

function fmtTime(sec) {
  const m = Math.floor(sec / 60).toString().padStart(2, "0");
  const s = Math.floor(sec % 60).toString().padStart(2, "0");
  return `${m}:${s}`;
}
function fmtDate(iso) {
  if (!iso) return "—";
  return new Date(iso).toLocaleString(undefined, { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
}

const SUBJECTS = ["Mathematics", "Physics", "Chemistry", "Biology", "English", "Computer Science", "General"];

// ---------- DB <-> App mappers ----------
const qFromDb = (r) => ({ id: r.id, type: r.type, subject: r.subject, text: r.text, options: r.options, correct: r.correct, marks: r.marks });
const pFromDb = (r) => ({ id: r.id, title: r.title, subject: r.subject, questionIds: r.question_ids, durationMin: r.duration_min, totalMarks: r.total_marks, negMarking: r.neg_marking, negValue: r.neg_value, shuffle: r.shuffle, availableAt: r.available_at, createdAt: r.created_at });
const sFromDb = (r) => ({ id: r.id, name: r.name, roll: r.roll, className: r.class_name });
const aFromDb = (r) => ({ id: r.id, paperId: r.paper_id, studentId: r.student_id, answers: r.answers, mcqScore: Number(r.mcq_score), mcqMax: Number(r.mcq_max), hasSubjective: r.has_subjective, manualScore: Number(r.manual_score || 0), graded: r.graded, subjectiveScores: r.subjective_scores || {}, submittedAt: r.submitted_at, timeTakenSec: r.time_taken_sec });

// ---------- Root App ----------
export default function App() {
  const [role, setRole] = useState(null);
  const [loading, setLoading] = useState(true);
  const [questions, setQuestions] = useState([]);
  const [papers, setPapers] = useState([]);
  const [students, setStudents] = useState([]);
  const [currentStudent, setCurrentStudent] = useState(null);
  const [attempts, setAttempts] = useState([]);

  async function refetchAll() {
    const [q, p, s, a] = await Promise.all([
      supabase.from("questions").select("*").order("created_at", { ascending: false }),
      supabase.from("papers").select("*").order("created_at", { ascending: false }),
      supabase.from("students").select("*"),
      supabase.from("attempts").select("*").order("submitted_at", { ascending: false }),
    ]);
    if (q.data) setQuestions(q.data.map(qFromDb));
    if (p.data) setPapers(p.data.map(pFromDb));
    if (s.data) setStudents(s.data.map(sFromDb));
    if (a.data) setAttempts(a.data.map(aFromDb));
  }

  useEffect(() => {
    refetchAll().finally(() => setLoading(false));
    const channel = supabase
      .channel("lms-changes")
      .on("postgres_changes", { event: "*", schema: "public" }, () => refetchAll())
      .subscribe();
    return () => supabase.removeChannel(channel);
  }, []);

  if (loading) {
    return (
      <div style={{ ...styles.page, display: "flex", alignItems: "center", justifyContent: "center" }}>
        <style>{globalCSS}</style>
        <div style={{ display: "flex", alignItems: "center", gap: 10, color: "#14213d" }}><Loader2 className="spin" size={20} /> Loading…</div>
      </div>
    );
  }

  if (!role) return <Landing onPick={setRole} />;

  if (role === "teacher") {
    return (
      <TeacherPortal
        questions={questions} papers={papers} students={students} attempts={attempts}
        refetchAll={refetchAll}
        onExit={() => setRole(null)}
      />
    );
  }

  return (
    <StudentPortal
      students={students} currentStudent={currentStudent} setCurrentStudent={setCurrentStudent}
      papers={papers} questions={questions} attempts={attempts}
      refetchAll={refetchAll}
      onExit={() => { setRole(null); setCurrentStudent(null); }}
    />
  );
}

// ---------- Landing ----------
function Landing({ onPick }) {
  return (
    <div style={styles.page}>
      <style>{globalCSS}</style>
      <div style={{ maxWidth: 920, margin: "0 auto", padding: "72px 24px" }}>
        <div style={{ textAlign: "center", marginBottom: 56 }}>
          <div style={styles.tab}>LEDGER · CLASS RECORD</div>
          <h1 style={styles.h1}>Ledger</h1>
          <p style={{ color: "#6b7280", fontSize: 17, marginTop: 10, fontFamily: "var(--body)" }}>
            A gradebook for building papers, running exams, and tracking every student's progress.
          </p>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24 }} className="landing-grid">
          <RoleCard icon={<GraduationCap size={28} />} title="Teacher" desc="Build the question bank, assemble papers, schedule exams, and grade submissions." cta="Enter as Teacher" onClick={() => onPick("teacher")} />
          <RoleCard icon={<User size={28} />} title="Student" desc="Create your account, take scheduled papers against the clock, and track your results." cta="Enter as Student" onClick={() => onPick("student")} />
        </div>
        <p style={{ textAlign: "center", color: "#9ca3af", fontSize: 13, marginTop: 48, fontFamily: "var(--mono)" }}>
          Data is stored in Supabase and shared by everyone who opens this link.
        </p>
      </div>
    </div>
  );
}

function RoleCard({ icon, title, desc, cta, onClick }) {
  return (
    <button onClick={onClick} style={styles.roleCard} className="role-card">
      <div style={{ width: 52, height: 52, borderRadius: 10, background: "#14213d", color: "#f2c14e", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 18 }}>{icon}</div>
      <div style={{ fontFamily: "var(--display)", fontSize: 22, fontWeight: 700, color: "#14213d", marginBottom: 8 }}>{title}</div>
      <div style={{ color: "#6b7280", fontSize: 14.5, lineHeight: 1.55, marginBottom: 20, fontFamily: "var(--body)" }}>{desc}</div>
      <div style={{ display: "flex", alignItems: "center", gap: 6, color: "#14213d", fontWeight: 600, fontSize: 14.5 }}>{cta} <ChevronRight size={16} /></div>
    </button>
  );
}

// =========================================================
// TEACHER PORTAL
// =========================================================
function TeacherPortal({ questions, papers, students, attempts, refetchAll, onExit }) {
  const [tab, setTab] = useState("bank");
  const tabs = [
    { id: "bank", label: "Question Bank", icon: <BookOpen size={16} /> },
    { id: "create", label: "Create Paper", icon: <Plus size={16} /> },
    { id: "papers", label: "Papers & Schedule", icon: <Calendar size={16} /> },
    { id: "grade", label: "Grading", icon: <Edit3 size={16} /> },
    { id: "analytics", label: "Analytics", icon: <BarChart2 size={16} /> },
  ];
  return (
    <div style={styles.page}>
      <style>{globalCSS}</style>
      <TopBar label="Teacher" sub="Ledger" onExit={onExit} />
      <div style={{ maxWidth: 1100, margin: "0 auto", padding: "28px 24px 64px" }}>
        <div style={styles.tabRow}>
          {tabs.map(t => (
            <button key={t.id} onClick={() => setTab(t.id)} style={{ ...styles.tabBtn, ...(tab === t.id ? styles.tabBtnActive : {}) }}>{t.icon} {t.label}</button>
          ))}
        </div>
        {tab === "bank" && <QuestionBank questions={questions} refetchAll={refetchAll} />}
        {tab === "create" && <CreatePaper questions={questions} papers={papers} refetchAll={refetchAll} />}
        {tab === "papers" && <PapersSchedule papers={papers} attempts={attempts} refetchAll={refetchAll} />}
        {tab === "grade" && <GradingPanel papers={papers} questions={questions} attempts={attempts} students={students} refetchAll={refetchAll} />}
        {tab === "analytics" && <TeacherAnalytics papers={papers} attempts={attempts} students={students} questions={questions} />}
      </div>
    </div>
  );
}

function TopBar({ label, sub, onExit, right }) {
  return (
    <div style={styles.topbar}>
      <div style={{ maxWidth: 1100, margin: "0 auto", padding: "0 24px", display: "flex", alignItems: "center", justifyContent: "space-between", height: 64 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ width: 30, height: 30, borderRadius: 7, background: "#f2c14e", color: "#14213d", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 800, fontFamily: "var(--display)" }}>L</div>
          <span style={{ fontFamily: "var(--display)", fontWeight: 700, color: "#fff", fontSize: 17 }}>{sub}</span>
          <span style={{ color: "#8895b3", fontSize: 13, fontFamily: "var(--mono)" }}>/ {label}</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          {right}
          <button onClick={onExit} style={styles.exitBtn}><LogOut size={14} /> Exit</button>
        </div>
      </div>
    </div>
  );
}

// ---- Question Bank ----
function QuestionBank({ questions, refetchAll }) {
  const [type, setType] = useState("mcq");
  const [subject, setSubject] = useState(SUBJECTS[0]);
  const [text, setText] = useState("");
  const [options, setOptions] = useState(["", "", "", ""]);
  const [correct, setCorrect] = useState(0);
  const [marks, setMarks] = useState(1);
  const [filterSubject, setFilterSubject] = useState("All");
  const [saving, setSaving] = useState(false);

  async function addQuestion() {
    if (!text.trim() || saving) return;
    if (type === "mcq" && options.some(o => !o.trim())) return;
    setSaving(true);
    const row = { type, subject, text: text.trim(), marks: Number(marks) || 1 };
    if (type === "mcq") { row.options = options; row.correct = correct; }
    const { error } = await supabase.from("questions").insert(row);
    setSaving(false);
    if (error) { alert("Could not save: " + error.message); return; }
    setText(""); setOptions(["", "", "", ""]); setCorrect(0); setMarks(1);
    refetchAll();
  }

  async function removeQuestion(id) {
    await supabase.from("questions").delete().eq("id", id);
    refetchAll();
  }

  const filtered = filterSubject === "All" ? questions : questions.filter(q => q.subject === filterSubject);

  return (
    <div style={{ display: "grid", gridTemplateColumns: "380px 1fr", gap: 24 }} className="bank-grid">
      <div style={styles.card}>
        <h3 style={styles.cardTitle}>Add a question</h3>
        <div style={styles.fieldRow}>
          {["mcq", "short", "long"].map(t => (
            <button key={t} onClick={() => setType(t)} style={{ ...styles.pill, ...(type === t ? styles.pillActive : {}) }}>{t === "mcq" ? "MCQ" : t === "short" ? "Short" : "Long"}</button>
          ))}
        </div>
        <label style={styles.label}>Subject</label>
        <select value={subject} onChange={e => setSubject(e.target.value)} style={styles.input}>{SUBJECTS.map(s => <option key={s}>{s}</option>)}</select>
        <label style={styles.label}>Question text</label>
        <textarea value={text} onChange={e => setText(e.target.value)} rows={3} style={{ ...styles.input, resize: "vertical" }} placeholder="Type the question…" />
        {type === "mcq" && (
          <>
            <label style={styles.label}>Options (tap ● to mark correct)</label>
            {options.map((o, i) => (
              <div key={i} style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
                <button onClick={() => setCorrect(i)} style={{ width: 22, height: 22, borderRadius: "50%", border: "2px solid #14213d", background: correct === i ? "#14213d" : "transparent", flexShrink: 0, cursor: "pointer" }} title="Mark as correct" />
                <input value={o} onChange={e => { const c = [...options]; c[i] = e.target.value; setOptions(c); }} style={{ ...styles.input, marginBottom: 0 }} placeholder={`Option ${i + 1}`} />
              </div>
            ))}
          </>
        )}
        <label style={styles.label}>Marks</label>
        <input type="number" min={1} value={marks} onChange={e => setMarks(e.target.value)} style={{ ...styles.input, width: 100 }} />
        <button onClick={addQuestion} disabled={saving} style={{ ...styles.primaryBtn, marginTop: 8, opacity: saving ? 0.6 : 1 }}>{saving ? <Loader2 className="spin" size={16} /> : <Plus size={16} />} Add to bank</button>
      </div>

      <div>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
          <h3 style={{ ...styles.cardTitle, marginBottom: 0 }}>Bank ({filtered.length})</h3>
          <select value={filterSubject} onChange={e => setFilterSubject(e.target.value)} style={{ ...styles.input, width: 200, marginBottom: 0 }}>
            <option>All</option>{SUBJECTS.map(s => <option key={s}>{s}</option>)}
          </select>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {filtered.length === 0 && <EmptyNote text="No questions here yet — add one on the left." />}
          {filtered.map(q => (
            <div key={q.id} style={styles.qRow}>
              <div style={{ flex: 1 }}>
                <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 4 }}>
                  <TypeTag type={q.type} /><span style={styles.subjTag}>{q.subject}</span>
                  <span style={{ color: "#9ca3af", fontSize: 12, fontFamily: "var(--mono)" }}>{q.marks} mark{q.marks > 1 ? "s" : ""}</span>
                </div>
                <div style={{ fontSize: 14.5, color: "#1f2937" }}>{q.text}</div>
                {q.type === "mcq" && (
                  <div style={{ marginTop: 6, display: "flex", flexWrap: "wrap", gap: 6 }}>
                    {q.options.map((o, i) => (
                      <span key={i} style={{ fontSize: 12.5, padding: "3px 8px", borderRadius: 6, background: i === q.correct ? "#eafaf0" : "#f3f4f6", color: i === q.correct ? "#0f9d58" : "#6b7280", border: i === q.correct ? "1px solid #b7ecc9" : "1px solid #e5e7eb" }}>{o}</span>
                    ))}
                  </div>
                )}
              </div>
              <button onClick={() => removeQuestion(q.id)} style={styles.iconBtn}><Trash2 size={15} /></button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function TypeTag({ type }) {
  const map = { mcq: ["#e7ecff", "#3350c9", "MCQ"], short: ["#fff2d9", "#a8630a", "Short"], long: ["#fde7ec", "#c22a51", "Long"] };
  const [bg, fg, label] = map[type];
  return <span style={{ background: bg, color: fg, fontSize: 11.5, fontWeight: 700, padding: "3px 8px", borderRadius: 6, letterSpacing: 0.3 }}>{label}</span>;
}
function EmptyNote({ text }) {
  return <div style={{ padding: "28px 20px", textAlign: "center", color: "#9ca3af", border: "1px dashed #d1d5db", borderRadius: 10, fontSize: 14 }}>{text}</div>;
}

// ---- Create Paper ----
function CreatePaper({ questions, papers, refetchAll }) {
  const [title, setTitle] = useState("");
  const [subject, setSubject] = useState(SUBJECTS[0]);
  const [selected, setSelected] = useState([]);
  const [duration, setDuration] = useState(60);
  const [negMarking, setNegMarking] = useState(false);
  const [negValue, setNegValue] = useState(0.25);
  const [shuffle, setShuffle] = useState(true);
  const [scheduleDate, setScheduleDate] = useState("");
  const [saving, setSaving] = useState(false);

  function toggle(id) { setSelected(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]); }
  const totalMarks = questions.filter(q => selected.includes(q.id)).reduce((s, q) => s + q.marks, 0);

  async function createPaper() {
    if (!title.trim() || selected.length === 0 || saving) return;
    setSaving(true);
    const row = {
      title: title.trim(), subject, question_ids: selected, duration_min: Number(duration) || 30,
      total_marks: totalMarks, neg_marking: negMarking, neg_value: Number(negValue) || 0, shuffle,
      available_at: scheduleDate ? new Date(scheduleDate).toISOString() : nowISO(),
    };
    const { error } = await supabase.from("papers").insert(row);
    setSaving(false);
    if (error) { alert("Could not save: " + error.message); return; }
    setTitle(""); setSelected([]); setScheduleDate("");
    refetchAll();
  }

  return (
    <div style={{ display: "grid", gridTemplateColumns: "1fr 340px", gap: 24 }} className="bank-grid">
      <div>
        <h3 style={styles.cardTitle}>Pick questions ({selected.length} selected · {totalMarks} marks)</h3>
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {questions.length === 0 && <EmptyNote text="Add questions to the bank first." />}
          {questions.map(q => (
            <label key={q.id} style={{ ...styles.qRow, cursor: "pointer", borderColor: selected.includes(q.id) ? "#14213d" : "#e5e7eb" }}>
              <input type="checkbox" checked={selected.includes(q.id)} onChange={() => toggle(q.id)} style={{ marginTop: 3, width: 16, height: 16, flexShrink: 0 }} />
              <div style={{ flex: 1 }}>
                <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 4 }}>
                  <TypeTag type={q.type} /><span style={styles.subjTag}>{q.subject}</span>
                  <span style={{ color: "#9ca3af", fontSize: 12, fontFamily: "var(--mono)" }}>{q.marks} mark{q.marks > 1 ? "s" : ""}</span>
                </div>
                <div style={{ fontSize: 14.5, color: "#1f2937" }}>{q.text}</div>
              </div>
            </label>
          ))}
        </div>
      </div>
      <div style={styles.card}>
        <h3 style={styles.cardTitle}>Paper settings</h3>
        <label style={styles.label}>Title</label>
        <input value={title} onChange={e => setTitle(e.target.value)} style={styles.input} placeholder="e.g. Mid-Term Physics Test" />
        <label style={styles.label}>Subject</label>
        <select value={subject} onChange={e => setSubject(e.target.value)} style={styles.input}>{SUBJECTS.map(s => <option key={s}>{s}</option>)}</select>
        <label style={styles.label}>Time limit (minutes)</label>
        <input type="number" min={5} value={duration} onChange={e => setDuration(e.target.value)} style={{ ...styles.input, width: 120 }} />
        <label style={styles.label}>Available from</label>
        <input type="datetime-local" value={scheduleDate} onChange={e => setScheduleDate(e.target.value)} style={styles.input} />
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", margin: "14px 0 6px" }}>
          <span style={{ fontSize: 14, color: "#374151", display: "flex", alignItems: "center", gap: 6 }}><Shuffle size={14} /> Shuffle questions</span>
          <Toggle checked={shuffle} onChange={setShuffle} />
        </div>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", margin: "6px 0" }}>
          <span style={{ fontSize: 14, color: "#374151", display: "flex", alignItems: "center", gap: 6 }}><AlertTriangle size={14} /> Negative marking</span>
          <Toggle checked={negMarking} onChange={setNegMarking} />
        </div>
        {negMarking && (<><label style={styles.label}>Deduction per wrong MCQ</label><input type="number" step="0.05" value={negValue} onChange={e => setNegValue(e.target.value)} style={{ ...styles.input, width: 120 }} /></>)}
        <button onClick={createPaper} disabled={saving} style={{ ...styles.primaryBtn, marginTop: 14, opacity: saving ? 0.6 : 1 }}>{saving ? <Loader2 className="spin" size={16} /> : <Plus size={16} />} Create paper</button>
        <div style={{ fontSize: 12.5, color: "#9ca3af", marginTop: 8 }}>{papers.length} paper{papers.length !== 1 ? "s" : ""} created so far</div>
      </div>
    </div>
  );
}

function Toggle({ checked, onChange }) {
  return (
    <button onClick={() => onChange(!checked)} style={{ width: 40, height: 22, borderRadius: 999, background: checked ? "#14213d" : "#d1d5db", position: "relative", border: "none", cursor: "pointer", flexShrink: 0 }}>
      <span style={{ position: "absolute", top: 2, left: checked ? 20 : 2, width: 18, height: 18, borderRadius: "50%", background: "#fff", transition: "left .15s" }} />
    </button>
  );
}

// ---- Papers & Schedule list ----
function PapersSchedule({ papers, attempts, refetchAll }) {
  async function remove(id) { await supabase.from("papers").delete().eq("id", id); refetchAll(); }
  return (
    <div>
      <h3 style={styles.cardTitle}>All papers</h3>
      {papers.length === 0 && <EmptyNote text="No papers yet — create one in the Create Paper tab." />}
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {papers.map(p => {
          const isFuture = new Date(p.availableAt) > new Date();
          const count = attempts.filter(a => a.paperId === p.id).length;
          return (
            <div key={p.id} style={styles.paperRow}>
              <div style={{ flex: 1 }}>
                <div style={{ fontFamily: "var(--display)", fontWeight: 700, fontSize: 16, color: "#14213d" }}>{p.title}</div>
                <div style={{ display: "flex", gap: 14, flexWrap: "wrap", marginTop: 6, fontSize: 13, color: "#6b7280" }}>
                  <span><span style={styles.subjTag}>{p.subject}</span></span>
                  <span style={{ display: "flex", alignItems: "center", gap: 4 }}><Clock size={13} /> {p.durationMin} min</span>
                  <span style={{ display: "flex", alignItems: "center", gap: 4 }}><Award size={13} /> {p.totalMarks} marks</span>
                  <span style={{ display: "flex", alignItems: "center", gap: 4 }}><Calendar size={13} /> {fmtDate(p.availableAt)}</span>
                  <span style={{ display: "flex", alignItems: "center", gap: 4 }}><Users size={13} /> {count} attempt{count !== 1 ? "s" : ""}</span>
                </div>
                <div style={{ marginTop: 6 }}>
                  {isFuture ? <span style={{ ...styles.badge, background: "#fff2d9", color: "#a8630a" }}>Scheduled</span> : <span style={{ ...styles.badge, background: "#eafaf0", color: "#0f9d58" }}>Live</span>}
                  {p.negMarking && <span style={{ ...styles.badge, marginLeft: 6, background: "#fde7ec", color: "#c22a51" }}>Negative marking</span>}
                  {p.shuffle && <span style={{ ...styles.badge, marginLeft: 6, background: "#e7ecff", color: "#3350c9" }}>Shuffled</span>}
                </div>
              </div>
              <button onClick={() => remove(p.id)} style={styles.iconBtn}><Trash2 size={15} /></button>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ---- Grading Panel ----
function GradingPanel({ papers, questions, attempts, students, refetchAll }) {
  const [selectedAttempt, setSelectedAttempt] = useState(null);
  const needsGrading = attempts.filter(a => !a.graded && a.hasSubjective);
  function qById(id) { return questions.find(q => q.id === id); }
  function studentName(id) { return students.find(s => s.id === id)?.name || "Unknown"; }
  function paperOf(a) { return papers.find(p => p.id === a.paperId); }

  async function saveGrade(attempt, subjectiveScores) {
    const manualScore = Object.values(subjectiveScores).reduce((s, v) => s + (Number(v) || 0), 0);
    await supabase.from("attempts").update({ subjective_scores: subjectiveScores, manual_score: manualScore, graded: true }).eq("id", attempt.id);
    setSelectedAttempt(null);
    refetchAll();
  }

  if (selectedAttempt) {
    const a = selectedAttempt;
    const paper = paperOf(a);
    const subjQs = paper.questionIds.map(qById).filter(q => q && q.type !== "mcq");
    return <GradeAttempt attempt={a} paper={paper} questions={subjQs} studentName={studentName(a.studentId)} onSave={(scores) => saveGrade(a, scores)} onBack={() => setSelectedAttempt(null)} />;
  }

  return (
    <div>
      <h3 style={styles.cardTitle}>Pending grading ({needsGrading.length})</h3>
      {needsGrading.length === 0 && <EmptyNote text="Nothing waiting for manual grading right now." />}
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {needsGrading.map(a => {
          const p = paperOf(a);
          return (
            <div key={a.id} style={styles.paperRow}>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 700, color: "#14213d" }}>{studentName(a.studentId)} — {p?.title}</div>
                <div style={{ fontSize: 13, color: "#6b7280", marginTop: 4 }}>Submitted {fmtDate(a.submittedAt)} · Auto (MCQ) score: {a.mcqScore}/{a.mcqMax}</div>
              </div>
              <button onClick={() => setSelectedAttempt(a)} style={styles.primaryBtn}><Edit3 size={15} /> Grade</button>
            </div>
          );
        })}
      </div>
      <h3 style={{ ...styles.cardTitle, marginTop: 32 }}>Already graded ({attempts.filter(a => a.graded || !a.hasSubjective).length})</h3>
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {attempts.filter(a => a.graded || !a.hasSubjective).map(a => {
          const p = paperOf(a);
          const total = a.mcqScore + (a.manualScore || 0);
          return (
            <div key={a.id} style={{ ...styles.paperRow, opacity: 0.85 }}>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 700, color: "#14213d" }}>{studentName(a.studentId)} — {p?.title}</div>
                <div style={{ fontSize: 13, color: "#6b7280", marginTop: 4 }}>Score: {total}/{p?.totalMarks}</div>
              </div>
              <CheckCircle2 size={18} color="#0f9d58" />
            </div>
          );
        })}
      </div>
    </div>
  );
}

function GradeAttempt({ attempt, paper, questions, studentName, onSave, onBack }) {
  const [scores, setScores] = useState(() => Object.fromEntries(questions.map(q => [q.id, 0])));
  return (
    <div>
      <button onClick={onBack} style={styles.backLink}><ChevronLeft size={15} /> Back to pending list</button>
      <h3 style={styles.cardTitle}>Grading — {studentName} · {paper.title}</h3>
      <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        {questions.map(q => (
          <div key={q.id} style={styles.card}>
            <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 6 }}>
              <TypeTag type={q.type} /><span style={{ color: "#9ca3af", fontSize: 12, fontFamily: "var(--mono)" }}>out of {q.marks}</span>
            </div>
            <div style={{ fontSize: 14.5, marginBottom: 10, color: "#1f2937" }}>{q.text}</div>
            <div style={{ background: "#f9fafb", border: "1px solid #eef0f3", borderRadius: 8, padding: 12, marginBottom: 10, fontSize: 14, color: "#374151", whiteSpace: "pre-wrap" }}>
              {attempt.answers[q.id] || <em style={{ color: "#9ca3af" }}>No answer submitted</em>}
            </div>
            <label style={styles.label}>Marks awarded (max {q.marks})</label>
            <input type="number" min={0} max={q.marks} value={scores[q.id]} onChange={e => setScores(s => ({ ...s, [q.id]: Math.min(q.marks, Math.max(0, Number(e.target.value))) }))} style={{ ...styles.input, width: 100 }} />
          </div>
        ))}
        <button onClick={() => onSave(scores)} style={styles.primaryBtn}><CheckCircle2 size={16} /> Save grade</button>
      </div>
    </div>
  );
}

// ---- Teacher Analytics ----
function TeacherAnalytics({ papers, attempts, students, questions }) {
  const graded = attempts.filter(a => a.graded || !a.hasSubjective);
  const chartData = papers.map(p => {
    const rel = graded.filter(a => a.paperId === p.id);
    const avg = rel.length ? rel.reduce((s, a) => s + (a.mcqScore + (a.manualScore || 0)), 0) / rel.length : 0;
    return { name: p.title.length > 14 ? p.title.slice(0, 14) + "…" : p.title, avg: Number(avg.toFixed(1)) };
  });
  const topperMap = {};
  graded.forEach(a => {
    const total = a.mcqScore + (a.manualScore || 0);
    const p = papers.find(pp => pp.id === a.paperId);
    const pct = p ? (total / p.totalMarks) * 100 : 0;
    if (!topperMap[a.studentId] || topperMap[a.studentId] < pct) topperMap[a.studentId] = pct;
  });
  const toppers = Object.entries(topperMap).sort((a, b) => b[1] - a[1]).slice(0, 5);

  return (
    <div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 16, marginBottom: 28 }} className="stats-grid">
        <StatCard label="Students" value={students.length} icon={<Users size={16} />} />
        <StatCard label="Papers" value={papers.length} icon={<Calendar size={16} />} />
        <StatCard label="Attempts" value={attempts.length} icon={<CheckCircle2 size={16} />} />
        <StatCard label="Question bank" value={questions.length} icon={<BookOpen size={16} />} />
      </div>
      <div style={styles.card}>
        <h3 style={styles.cardTitle}>Average score by paper</h3>
        {chartData.length === 0 ? <EmptyNote text="Analytics will appear once students start submitting papers." /> : (
          <div style={{ width: "100%", height: 260 }}>
            <ResponsiveContainer>
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#eef0f3" />
                <XAxis dataKey="name" tick={{ fontSize: 12, fill: "#6b7280" }} />
                <YAxis tick={{ fontSize: 12, fill: "#6b7280" }} />
                <Tooltip />
                <Bar dataKey="avg" fill="#14213d" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>
      <h3 style={{ ...styles.cardTitle, marginTop: 28 }}>Top performers</h3>
      {toppers.length === 0 ? <EmptyNote text="No graded attempts yet." /> : (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {toppers.map(([sid, pct], i) => {
            const s = students.find(st => st.id === sid);
            return (
              <div key={sid} style={styles.paperRow}>
                <div style={{ width: 26, height: 26, borderRadius: "50%", background: i === 0 ? "#f2c14e" : "#eef0f3", color: i === 0 ? "#14213d" : "#6b7280", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700, fontSize: 13 }}>{i + 1}</div>
                <div style={{ flex: 1, marginLeft: 12 }}>
                  <div style={{ fontWeight: 700, color: "#14213d" }}>{s?.name || "Unknown"}</div>
                  <div style={{ fontSize: 12.5, color: "#6b7280" }}>{s?.className}</div>
                </div>
                <div style={{ fontFamily: "var(--mono)", fontWeight: 700, color: "#14213d" }}>{pct.toFixed(1)}%</div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function StatCard({ label, value, icon }) {
  return (
    <div style={{ ...styles.card, padding: 16 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, color: "#9ca3af", fontSize: 12.5, marginBottom: 6 }}>{icon} {label}</div>
      <div style={{ fontFamily: "var(--display)", fontSize: 28, fontWeight: 800, color: "#14213d" }}>{value}</div>
    </div>
  );
}

// =========================================================
// STUDENT PORTAL
// =========================================================
function StudentPortal({ students, currentStudent, setCurrentStudent, papers, questions, attempts, refetchAll, onExit }) {
  const [screen, setScreen] = useState("list");
  const [activePaper, setActivePaper] = useState(null);

  if (!currentStudent) return <StudentAuth students={students} refetchAll={refetchAll} onLogin={setCurrentStudent} onExit={onExit} />;

  if (screen === "attempt" && activePaper) {
    return (
      <AttemptPaper
        paper={activePaper} questions={questions} student={currentStudent}
        onSubmit={async (attempt) => {
          await supabase.from("attempts").insert({
            paper_id: attempt.paperId, student_id: attempt.studentId, answers: attempt.answers,
            mcq_score: attempt.mcqScore, mcq_max: attempt.mcqMax, has_subjective: attempt.hasSubjective,
            submitted_at: attempt.submittedAt, time_taken_sec: attempt.timeTakenSec,
          });
          await refetchAll();
          setScreen("list"); setActivePaper(null);
        }}
        onCancel={() => { setScreen("list"); setActivePaper(null); }}
      />
    );
  }

  return (
    <div style={styles.page}>
      <style>{globalCSS}</style>
      <TopBar
        label={`${currentStudent.name} · Roll ${currentStudent.roll}`} sub="Ledger" onExit={onExit}
        right={
          <div style={{ display: "flex", gap: 8 }}>
            <button onClick={() => setScreen("list")} style={{ ...styles.tabBtnDark, ...(screen === "list" ? styles.tabBtnDarkActive : {}) }}>Papers</button>
            <button onClick={() => setScreen("results")} style={{ ...styles.tabBtnDark, ...(screen === "results" ? styles.tabBtnDarkActive : {}) }}>My Results</button>
          </div>
        }
      />
      <div style={{ maxWidth: 900, margin: "0 auto", padding: "28px 24px 64px" }}>
        {screen === "list" && <StudentPaperList papers={papers} student={currentStudent} attempts={attempts} onStart={(p) => { setActivePaper(p); setScreen("attempt"); }} />}
        {screen === "results" && <StudentResults papers={papers} attempts={attempts.filter(a => a.studentId === currentStudent.id)} />}
      </div>
    </div>
  );
}

function StudentAuth({ students, refetchAll, onLogin, onExit }) {
  const [mode, setMode] = useState("signup");
  const [name, setName] = useState("");
  const [roll, setRoll] = useState("");
  const [className, setClassName] = useState("");
  const [existingId, setExistingId] = useState("");
  const [saving, setSaving] = useState(false);

  async function signup() {
    if (!name.trim() || !roll.trim() || saving) return;
    setSaving(true);
    const { data, error } = await supabase.from("students").insert({ name: name.trim(), roll: roll.trim(), class_name: className.trim() || null }).select().single();
    setSaving(false);
    if (error) { alert("Could not create account: " + error.message); return; }
    await refetchAll();
    onLogin({ id: data.id, name: data.name, roll: data.roll, className: data.class_name });
  }

  function login() {
    const s = students.find(s => s.id === existingId);
    if (s) onLogin(s);
  }

  return (
    <div style={styles.page}>
      <style>{globalCSS}</style>
      <TopBar label="Student" sub="Ledger" onExit={onExit} />
      <div style={{ maxWidth: 460, margin: "0 auto", padding: "56px 24px" }}>
        <div style={styles.card}>
          <div style={styles.fieldRow}>
            <button onClick={() => setMode("signup")} style={{ ...styles.pill, ...(mode === "signup" ? styles.pillActive : {}) }}>New account</button>
            <button onClick={() => setMode("login")} style={{ ...styles.pill, ...(mode === "login" ? styles.pillActive : {}) }}>Existing account</button>
          </div>
          {mode === "signup" ? (
            <>
              <label style={styles.label}>Full name</label>
              <input value={name} onChange={e => setName(e.target.value)} style={styles.input} placeholder="e.g. Ali Raza" />
              <label style={styles.label}>Roll number</label>
              <input value={roll} onChange={e => setRoll(e.target.value)} style={styles.input} placeholder="e.g. 21-CS-045" />
              <label style={styles.label}>Class</label>
              <input value={className} onChange={e => setClassName(e.target.value)} style={styles.input} placeholder="e.g. BS-CS 3rd Semester" />
              <button onClick={signup} disabled={saving} style={{ ...styles.primaryBtn, marginTop: 8, width: "100%", justifyContent: "center", opacity: saving ? 0.6 : 1 }}>{saving ? <Loader2 className="spin" size={16} /> : "Create account"}</button>
            </>
          ) : (
            <>
              {students.length === 0 ? <EmptyNote text="No accounts yet — create a new one." /> : (
                <>
                  <label style={styles.label}>Select your account</label>
                  <select value={existingId} onChange={e => setExistingId(e.target.value)} style={styles.input}>
                    <option value="">Choose…</option>
                    {students.map(s => <option key={s.id} value={s.id}>{s.name} — {s.roll}</option>)}
                  </select>
                  <button onClick={login} style={{ ...styles.primaryBtn, marginTop: 8, width: "100%", justifyContent: "center" }} disabled={!existingId}>Log in</button>
                </>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function StudentPaperList({ papers, student, attempts, onStart }) {
  const now = new Date();
  const attemptedIds = new Set(attempts.filter(a => a.studentId === student.id).map(a => a.paperId));
  const available = papers.filter(p => new Date(p.availableAt) <= now);
  return (
    <div>
      <h3 style={styles.cardTitle}>Available papers</h3>
      {available.length === 0 && <EmptyNote text="No papers available right now. Check back after your teacher schedules one." />}
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {available.map(p => {
          const done = attemptedIds.has(p.id);
          return (
            <div key={p.id} style={styles.paperRow}>
              <div style={{ flex: 1 }}>
                <div style={{ fontFamily: "var(--display)", fontWeight: 700, fontSize: 16, color: "#14213d" }}>{p.title}</div>
                <div style={{ display: "flex", gap: 14, flexWrap: "wrap", marginTop: 6, fontSize: 13, color: "#6b7280" }}>
                  <span style={styles.subjTag}>{p.subject}</span>
                  <span style={{ display: "flex", alignItems: "center", gap: 4 }}><Clock size={13} /> {p.durationMin} min</span>
                  <span style={{ display: "flex", alignItems: "center", gap: 4 }}><Award size={13} /> {p.totalMarks} marks</span>
                  <span>{p.questionIds.length} question{p.questionIds.length !== 1 ? "s" : ""}</span>
                </div>
              </div>
              {done ? <span style={{ ...styles.badge, background: "#eafaf0", color: "#0f9d58" }}>Submitted</span> : <button onClick={() => onStart(p)} style={styles.primaryBtn}><Play size={15} /> Start</button>}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function AttemptPaper({ paper, questions, student, onSubmit, onCancel }) {
  const orderedQs = useMemo(() => {
    const qs = paper.questionIds.map(id => questions.find(q => q.id === id)).filter(Boolean);
    if (!paper.shuffle) return qs;
    return [...qs].sort(() => Math.random() - 0.5);
  }, [paper, questions]);

  const [idx, setIdx] = useState(0);
  const [answers, setAnswers] = useState({});
  const [secondsLeft, setSecondsLeft] = useState(paper.durationMin * 60);
  const startRef = useRef(Date.now());
  const submittedRef = useRef(false);

  useEffect(() => {
    const t = setInterval(() => {
      setSecondsLeft(s => { if (s <= 1) { clearInterval(t); doSubmit(); return 0; } return s - 1; });
    }, 1000);
    return () => clearInterval(t);
    // eslint-disable-next-line
  }, []);

  function doSubmit() {
    if (submittedRef.current) return;
    submittedRef.current = true;
    let mcqScore = 0, mcqMax = 0, hasSubjective = false;
    orderedQs.forEach(q => {
      if (q.type === "mcq") {
        mcqMax += q.marks;
        const chosen = answers[q.id];
        if (chosen === q.correct) mcqScore += q.marks;
        else if (chosen !== undefined && paper.negMarking) mcqScore -= paper.negValue;
      } else hasSubjective = true;
    });
    mcqScore = Math.max(0, Number(mcqScore.toFixed(2)));
    onSubmit({
      paperId: paper.id, studentId: student.id, answers, mcqScore, mcqMax, hasSubjective,
      submittedAt: nowISO(), timeTakenSec: Math.round((Date.now() - startRef.current) / 1000),
    });
  }

  const q = orderedQs[idx];
  const answeredCount = orderedQs.filter(q => answers[q.id] !== undefined && answers[q.id] !== "").length;
  const low = secondsLeft <= 60;

  return (
    <div style={styles.page}>
      <style>{globalCSS}</style>
      <div style={styles.examBar}>
        <div style={{ maxWidth: 760, margin: "0 auto", padding: "0 20px", display: "flex", alignItems: "center", justifyContent: "space-between", height: 60 }}>
          <div style={{ color: "#fff", fontFamily: "var(--display)", fontWeight: 700 }}>{paper.title}</div>
          <div style={{ display: "flex", alignItems: "center", gap: 6, color: low ? "#ff6b6b" : "#f2c14e", fontFamily: "var(--mono)", fontWeight: 700, fontSize: 18 }}><TimerIcon size={17} /> {fmtTime(secondsLeft)}</div>
        </div>
      </div>
      <div style={{ maxWidth: 760, margin: "0 auto", padding: "28px 20px 80px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 14, fontSize: 13, color: "#6b7280" }}>
          <span>Question {idx + 1} of {orderedQs.length}</span><span>{answeredCount} answered</span>
        </div>
        <div style={styles.progressTrack}><div style={{ ...styles.progressFill, width: `${(answeredCount / orderedQs.length) * 100}%` }} /></div>
        {q && (
          <div style={{ ...styles.card, marginTop: 20 }}>
            <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 10 }}>
              <TypeTag type={q.type} /><span style={{ color: "#9ca3af", fontSize: 12, fontFamily: "var(--mono)" }}>{q.marks} mark{q.marks > 1 ? "s" : ""}</span>
            </div>
            <div style={{ fontSize: 16, color: "#1f2937", marginBottom: 16, lineHeight: 1.5 }}>{q.text}</div>
            {q.type === "mcq" ? (
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {q.options.map((o, i) => (
                  <label key={i} style={{ ...styles.optionRow, borderColor: answers[q.id] === i ? "#14213d" : "#e5e7eb", background: answers[q.id] === i ? "#f4f6fb" : "#fff" }}>
                    <input type="radio" name={q.id} checked={answers[q.id] === i} onChange={() => setAnswers(a => ({ ...a, [q.id]: i }))} style={{ marginRight: 10 }} />{o}
                  </label>
                ))}
              </div>
            ) : (
              <textarea value={answers[q.id] || ""} onChange={e => setAnswers(a => ({ ...a, [q.id]: e.target.value }))} rows={q.type === "long" ? 8 : 4} style={{ ...styles.input, resize: "vertical" }} placeholder="Type your answer…" />
            )}
          </div>
        )}
        <div style={{ display: "flex", justifyContent: "space-between", marginTop: 20 }}>
          <button onClick={() => setIdx(i => Math.max(0, i - 1))} disabled={idx === 0} style={{ ...styles.secondaryBtn, opacity: idx === 0 ? 0.4 : 1 }}><ChevronLeft size={15} /> Previous</button>
          {idx < orderedQs.length - 1 ? (
            <button onClick={() => setIdx(i => Math.min(orderedQs.length - 1, i + 1))} style={styles.primaryBtn}>Next <ChevronRight size={15} /></button>
          ) : (
            <button onClick={doSubmit} style={{ ...styles.primaryBtn, background: "#0f9d58" }}><CheckCircle2 size={15} /> Submit paper</button>
          )}
        </div>
        <button onClick={onCancel} style={{ ...styles.backLink, marginTop: 20 }}>Cancel and leave without submitting</button>
      </div>
    </div>
  );
}

function StudentResults({ papers, attempts }) {
  const rows = attempts.map(a => {
    const p = papers.find(pp => pp.id === a.paperId);
    const total = a.mcqScore + (a.manualScore || 0);
    return { ...a, paper: p, total, pct: p ? (total / p.totalMarks) * 100 : 0 };
  }).sort((a, b) => new Date(a.submittedAt) - new Date(b.submittedAt));
  const chartData = rows.map((r, i) => ({ name: r.paper?.title?.slice(0, 10) || `#${i + 1}`, pct: Number(r.pct.toFixed(1)) }));

  return (
    <div>
      <div style={styles.card}>
        <h3 style={styles.cardTitle}>Progress over time</h3>
        {chartData.length === 0 ? <EmptyNote text="Attempt a paper to start building your progress chart." /> : (
          <div style={{ width: "100%", height: 240 }}>
            <ResponsiveContainer>
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#eef0f3" />
                <XAxis dataKey="name" tick={{ fontSize: 12, fill: "#6b7280" }} />
                <YAxis domain={[0, 100]} tick={{ fontSize: 12, fill: "#6b7280" }} />
                <Tooltip formatter={(v) => `${v}%`} />
                <Line type="monotone" dataKey="pct" stroke="#14213d" strokeWidth={2.5} dot={{ fill: "#f2c14e", r: 4 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>
      <h3 style={{ ...styles.cardTitle, marginTop: 28 }}>Attempt history</h3>
      {rows.length === 0 && <EmptyNote text="No attempts yet." />}
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {rows.slice().reverse().map(r => (
          <div key={r.id} style={styles.paperRow}>
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 700, color: "#14213d" }}>{r.paper?.title || "Deleted paper"}</div>
              <div style={{ fontSize: 12.5, color: "#6b7280", marginTop: 4 }}>
                Submitted {fmtDate(r.submittedAt)} · Time taken {fmtTime(r.timeTakenSec)}
                {r.hasSubjective && !r.graded && <span style={{ color: "#a8630a" }}> · Awaiting grading</span>}
              </div>
            </div>
            <div style={{ textAlign: "right" }}>
              <div style={{ fontFamily: "var(--mono)", fontWeight: 700, color: "#14213d", fontSize: 16 }}>{r.total}/{r.paper?.totalMarks ?? "—"}</div>
              <div style={{ fontSize: 12, color: "#9ca3af" }}>{r.pct.toFixed(1)}%</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ---------- Styles ----------
const globalCSS = `
  @import url('https://fonts.googleapis.com/css2?family=Fraunces:wght@600;700;800&family=Inter:wght@400;500;600;700&family=IBM+Plex+Mono:wght@500;600&display=swap');
  :root { --display: 'Fraunces', serif; --body: 'Inter', sans-serif; --mono: 'IBM Plex Mono', monospace; }
  * { box-sizing: border-box; }
  body { margin: 0; }
  select, input, textarea, button { font-family: var(--body); }
  .spin { animation: spin 1s linear infinite; }
  @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
  @media (max-width: 760px) {
    .landing-grid, .bank-grid, .stats-grid { grid-template-columns: 1fr !important; }
  }
`;

const styles = {
  page: { minHeight: "100vh", background: "#f7f5ef", fontFamily: "var(--body)" },
  topbar: { background: "#14213d", borderBottom: "1px solid #24304f" },
  tab: { display: "inline-block", fontFamily: "var(--mono)", fontSize: 12, letterSpacing: 1.5, color: "#a8630a", background: "#fff2d9", padding: "4px 10px", borderRadius: 6, marginBottom: 18 },
  h1: { fontFamily: "var(--display)", fontSize: 52, fontWeight: 800, color: "#14213d", margin: 0 },
  roleCard: { textAlign: "left", background: "#fff", border: "1px solid #ece7db", borderRadius: 16, padding: 28, cursor: "pointer", boxShadow: "0 1px 2px rgba(20,33,61,0.04)" },
  card: { background: "#fff", border: "1px solid #ece7db", borderRadius: 14, padding: 22 },
  cardTitle: { fontFamily: "var(--display)", fontSize: 18, fontWeight: 700, color: "#14213d", marginBottom: 14 },
  label: { display: "block", fontSize: 12.5, fontWeight: 600, color: "#6b7280", marginBottom: 6, marginTop: 12, textTransform: "uppercase", letterSpacing: 0.4 },
  input: { width: "100%", padding: "10px 12px", borderRadius: 8, border: "1px solid #dcdfe4", fontSize: 14.5, marginBottom: 4, color: "#1f2937", background: "#fff" },
  fieldRow: { display: "flex", gap: 8, marginBottom: 8 },
  pill: { padding: "7px 14px", borderRadius: 999, border: "1px solid #dcdfe4", background: "#fff", fontSize: 13, fontWeight: 600, color: "#6b7280", cursor: "pointer" },
  pillActive: { background: "#14213d", color: "#fff", borderColor: "#14213d" },
  primaryBtn: { display: "inline-flex", alignItems: "center", gap: 6, background: "#14213d", color: "#fff", border: "none", padding: "10px 16px", borderRadius: 9, fontSize: 14, fontWeight: 600, cursor: "pointer" },
  secondaryBtn: { display: "inline-flex", alignItems: "center", gap: 6, background: "#fff", color: "#14213d", border: "1px solid #dcdfe4", padding: "10px 16px", borderRadius: 9, fontSize: 14, fontWeight: 600, cursor: "pointer" },
  iconBtn: { background: "#fff", border: "1px solid #ece7db", borderRadius: 8, padding: 8, cursor: "pointer", color: "#9ca3af", height: "fit-content" },
  qRow: { display: "flex", gap: 10, alignItems: "flex-start", background: "#fff", border: "1px solid #ece7db", borderRadius: 10, padding: 14 },
  paperRow: { display: "flex", gap: 10, alignItems: "center", background: "#fff", border: "1px solid #ece7db", borderRadius: 10, padding: "14px 16px" },
  subjTag: { fontSize: 11.5, color: "#6b7280", background: "#f3f4f6", padding: "3px 8px", borderRadius: 6 },
  badge: { display: "inline-block", fontSize: 11.5, fontWeight: 700, padding: "3px 9px", borderRadius: 999 },
  tabRow: { display: "flex", gap: 8, marginBottom: 24, flexWrap: "wrap" },
  tabBtn: { display: "flex", alignItems: "center", gap: 6, padding: "9px 14px", borderRadius: 9, border: "1px solid #ece7db", background: "#fff", fontSize: 13.5, fontWeight: 600, color: "#6b7280", cursor: "pointer" },
  tabBtnActive: { background: "#14213d", color: "#fff", borderColor: "#14213d" },
  tabBtnDark: { padding: "7px 13px", borderRadius: 8, border: "1px solid #2c3a5c", background: "transparent", color: "#c3cbe0", fontSize: 13, fontWeight: 600, cursor: "pointer" },
  tabBtnDarkActive: { background: "#f2c14e", color: "#14213d", borderColor: "#f2c14e" },
  exitBtn: { display: "flex", alignItems: "center", gap: 6, background: "transparent", border: "1px solid #2c3a5c", color: "#c3cbe0", padding: "7px 12px", borderRadius: 8, fontSize: 13, cursor: "pointer" },
  backLink: { background: "none", border: "none", color: "#6b7280", fontSize: 13.5, display: "flex", alignItems: "center", gap: 4, cursor: "pointer", padding: 0 },
  examBar: { background: "#14213d", position: "sticky", top: 0, zIndex: 10 },
  progressTrack: { height: 6, background: "#ece7db", borderRadius: 999, overflow: "hidden" },
  progressFill: { height: "100%", background: "#14213d", transition: "width .2s" },
  optionRow: { display: "flex", alignItems: "center", padding: "12px 14px", borderRadius: 9, border: "1.5px solid #e5e7eb", fontSize: 14.5, color: "#1f2937", cursor: "pointer" },
};
