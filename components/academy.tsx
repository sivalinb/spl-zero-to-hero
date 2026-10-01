"use client";
import {
  useEffect,
  useMemo,
  useState,
  useSyncExternalStore,
  type CSSProperties,
} from "react";
import {
  BookOpen,
  Terminal,
  Braces,
  Play,
  Pause,
  Database,
  Sparkles,
  Clock,
  Check,
  Copy,
  RotateCcw,
  SkipForward,
  SkipBack,
  CircleHelp,
  FlaskConical,
  Search,
  GitBranch,
  BarChart3,
  Layers,
  GraduationCap,
  ExternalLink,
  CheckCircle2,
  AlertCircle,
  ChevronDown,
  Trophy,
  Code2,
  X,
} from "lucide-react";
import {
  Sidebar,
  SidebarProvider,
  SidebarContent,
  SidebarHeader,
  SidebarFooter,
  SidebarTrigger,
  useSidebar,
} from "@/components/ui/sidebar";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "@/components/ui/table";
import { Slider } from "@/components/ui/slider";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
} from "@/components/ui/pagination";
import {
  lessons,
  modules,
  mappings,
  type Lesson,
} from "@/lib/academy/curriculum";
import {
  events,
  fieldNotes,
  type Row,
  type Scenario,
  type Value,
} from "@/lib/academy/data";
import {
  runSPL,
  resultsEqual,
  supportedCommands,
  type Result,
  type Stage,
} from "@/lib/academy/engine";
import { runSQL } from "@/lib/academy/sql";
import { registerAcademyTools } from "@/lib/academy/webmcp";
import {
  completeLesson,
  parseProgress,
  readProgress,
  subscribeProgress,
} from "@/lib/academy/progress";
const subscribeRoute = (fn: () => void) => {
  const onChange = () => {
    fn();
    window.scrollTo({ top: 0, behavior: "instant" });
  };
  window.addEventListener("hashchange", onChange);
  return () => window.removeEventListener("hashchange", onChange);
};
const routeSnapshot = () => window.location.hash;
const emptySnapshot = () => "";
const emptyProgress = () => "{}";
function go(path: string) {
  window.location.hash = path;
  window.scrollTo({ top: 0, behavior: "instant" });
}
function format(value: Value | undefined, field = ""): string {
  if (value === undefined || value === null) return "—";
  if (field === "_time" && typeof value === "number")
    return new Date(value * 1000).toISOString().slice(11, 19);
  if (Array.isArray(value)) return value.join(" · ");
  if (typeof value === "number")
    return Number.isInteger(value)
      ? value.toLocaleString("en-US")
      : value.toLocaleString("en-US", { maximumFractionDigits: 3 });
  return String(value);
}
function Code({
  value,
  language = "spl",
}: {
  value: string;
  language?: "spl" | "sql";
}) {
  const pieces = value.split(
    /("(?:\\.|[^"\\])*"|'[^']*'|\b(?:index|search|where|stats|table|head|sort|by|AS|eval|eventstats|streamstats|timechart|bin|lookup|OUTPUT|join|dedup|rename|spath|rex|count|avg|sum|SELECT|FROM|WHERE|GROUP BY|ORDER BY|HAVING|LIMIT|WITH|OVER|PARTITION BY|LEFT JOIN|CASE|WHEN|THEN|ELSE|END|AND|OR|NOT|COUNT|AVG|SUM|ROUND)\b|\||\b\d+(?:\.\d+)?\b)/g,
  );
  return (
    <code className={`syntax ${language}`}>
      {pieces.map((part, i) => (
        <span
          key={i}
          className={
            part.startsWith('"') || part.startsWith("'")
              ? "token-string"
              : /^\d/.test(part)
                ? "token-number"
                : part === "|"
                  ? "token-pipe"
                  : /^[A-Za-z]+(?: [A-Z]+)?$/.test(part)
                    ? "token-keyword"
                    : undefined
          }
        >
          {part}
        </span>
      ))}
    </code>
  );
}
function CopyButton({ value }: { value: string }) {
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState(false);
  async function copy() {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      setError(true);
    }
  }
  return (
    <button
      className="icon-button"
      onClick={copy}
      aria-label={
        error
          ? "Clipboard unavailable; select the code to copy"
          : copied
            ? "Copied"
            : "Copy query"
      }
      title={
        error
          ? "Select the query text to copy it"
          : copied
            ? "Copied"
            : "Copy query"
      }
    >
      {copied ? <Check size={16} /> : <Copy size={16} />}
    </button>
  );
}
export function ResultTable({
  rows,
  columns,
  compact = false,
}: {
  rows: Row[];
  columns?: string[];
  compact?: boolean;
}) {
  const [page, setPage] = useState(0);
  const size = compact ? 5 : 8;
  const cols = columns?.length
    ? columns
    : [...new Set(rows.flatMap(Object.keys))];
  const safePage = Math.min(
    page,
    Math.max(0, Math.ceil(rows.length / size) - 1),
  );
  const visible = rows.slice(safePage * size, (safePage + 1) * size);
  if (!rows.length)
    return (
      <div className="empty-results">
        <Search size={24} />
        <h3>No matching rows</h3>
        <p>
          An empty result is valid. Try the incident scenario or broaden your
          conditions.
        </p>
      </div>
    );
  return (
    <div className={"result-table " + (compact ? "compact" : "")}>
      <Table>
        <TableHeader>
          <TableRow>
            {cols.map((c) => (
              <TableHead key={c}>
                {c}
                {c === "_time" && <span className="column-unit"> UTC</span>}
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {visible.map((r, i) => (
            <TableRow key={i}>
              {cols.map((c) => (
                <TableCell key={c} title={format(r[c], c)}>
                  {c === "status" ? (
                    <span
                      className={
                        Number(r[c]) >= 400 ? "status-error" : "status-ok"
                      }
                    >
                      {format(r[c], c)}
                    </span>
                  ) : (
                    format(r[c], c)
                  )}
                </TableCell>
              ))}
            </TableRow>
          ))}
        </TableBody>
      </Table>
      <div className="table-footer">
        <span>
          {compact
            ? `Showing ${visible.length} of ${rows.length} rows`
            : `${safePage * size + 1}–${Math.min((safePage + 1) * size, rows.length)} of ${rows.length} rows`}
        </span>
        {!compact && rows.length > size && (
          <Pagination>
            <PaginationContent>
              <PaginationItem>
                <button
                  aria-label="Previous result page"
                  disabled={safePage === 0}
                  onClick={() => setPage(safePage - 1)}
                >
                  Previous
                </button>
              </PaginationItem>
              <PaginationItem>
                <button
                  aria-label="Next result page"
                  disabled={(safePage + 1) * size >= rows.length}
                  onClick={() => setPage(safePage + 1)}
                >
                  Next
                </button>
              </PaginationItem>
            </PaginationContent>
          </Pagination>
        )}
        <span>{cols.length} fields</span>
      </div>
    </div>
  );
}
function SignalChart({ rows, stage }: { rows: Row[]; stage?: Stage }) {
  const columns = [...new Set(rows.flatMap(Object.keys))];
  const numeric = columns.filter(
    (k) =>
      k !== "_time" && k !== "id" && rows.some((r) => typeof r[k] === "number"),
  );
  const timeSeries =
    stage &&
    ["timechart", "stats", "streamstats"].includes(stage.kind) &&
    rows.length > 1 &&
    columns.includes("_time") &&
    !columns.includes("id") &&
    !columns.includes("_raw") &&
    numeric.length > 0;
  if (timeSeries) {
    const data = [...rows].sort((a, b) => Number(a._time) - Number(b._time));
    const fields = numeric.slice(0, 3);
    const max = Math.max(
      1,
      ...data.flatMap((r) => fields.map((f) => Number(r[f] ?? 0))),
    );
    const colors = ["#0c947f", "#7478bf", "#d28a42"];
    return (
      <div className="signal-chart">
        <div className="chart-legend">
          {fields.map((f, i) => (
            <span key={f}>
              <i style={{ background: colors[i] }} />
              {f}
            </span>
          ))}
          <span className="muted">UTC · {rows.length} points</span>
        </div>
        <svg
          viewBox="0 0 650 160"
          role="img"
          aria-label={`Time series showing ${fields.join(", ")} across ${rows.length} points`}
        >
          <title>Time series of {fields.join(", ")}</title>
          {[0, 1, 2].map((i) => (
            <g key={i}>
              <line
                x1="42"
                x2="634"
                y1={18 + i * 49}
                y2={18 + i * 49}
                stroke="#e3ebef"
                strokeDasharray="4 5"
              />
              <text
                x="32"
                y={22 + i * 49}
                textAnchor="end"
                fill="#788b9a"
                fontSize="12"
              >
                {Math.round(max * (1 - i / 2))}
              </text>
            </g>
          ))}
          {fields.map((field, i) => (
            <polyline
              key={field}
              className="chart-line"
              fill="none"
              stroke={colors[i]}
              strokeWidth="2.5"
              points={data
                .map(
                  (r, j) =>
                    `${42 + (j / Math.max(1, data.length - 1)) * 592},${116 - (Number(r[field] ?? 0) / max) * 98}`,
                )
                .join(" ")}
            />
          ))}
          <text x="42" y="145" fill="#788b9a" fontSize="12">
            {format(data[0]._time, "_time")}
          </text>
          <text x="634" y="145" textAnchor="end" fill="#788b9a" fontSize="12">
            {format(data.at(-1)?._time, "_time")}
          </text>
        </svg>
      </div>
    );
  }
  const groupField = columns.find(
    (c) =>
      rows.some((r) => typeof r[c] === "string") &&
      !["_raw", "payload"].includes(c),
  );
  if (
    stage &&
    ["stats", "top", "rare"].includes(stage.kind) &&
    groupField &&
    numeric.length
  ) {
    const metric = numeric[0];
    const max = Math.max(1, ...rows.map((r) => Number(r[metric] ?? 0)));
    return (
      <div className="group-chart">
        <div className="chart-legend">
          <span>One bar per {groupField}</span>
          <span>{metric}</span>
        </div>
        {rows.slice(0, 5).map((r, i) => (
          <div className="bar-row" key={i}>
            <span>{format(r[groupField])}</span>
            <div>
              <i
                style={{
                  width: `${(Number(r[metric] ?? 0) / max) * 100}%`,
                  animationDelay: `${i * 70}ms`,
                }}
              />
            </div>
            <b>{format(r[metric])}</b>
          </div>
        ))}
        {rows.length > 5 && (
          <p className="small muted">Showing 5 of {rows.length} groups</p>
        )}
      </div>
    );
  }
  return null;
}
function PipelineAnimation({
  lesson,
  scenario,
}: {
  lesson: Lesson;
  scenario: Scenario;
}) {
  const result = useMemo(
    () => runSPL(lesson.spl, scenario),
    [lesson.spl, scenario],
  );
  const [step, setStep] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [speed, setSpeed] = useState("1");
  const max = result.stages.length - 1;
  const active = result.stages[Math.min(step, max)];
  useEffect(() => {
    if (!playing) return;
    const timer = setInterval(
      () => {
        setStep((s) => {
          if (s >= max) {
            setPlaying(false);
            return s;
          }
          return s + 1;
        });
      },
      2400 / Number(speed),
    );
    return () => clearInterval(timer);
  }, [playing, max, speed]);
  const fields = Object.keys(active.rows[0] ?? {});
  const displayFields = fields.includes("_raw")
    ? ["_time", "service", "status", "duration"].filter((f) =>
        fields.includes(f),
      )
    : fields.slice(0, 7);
  const sampleDots = Math.min(active.inputCount, 30);
  const showCount = Math.min(active.rows.length, 30);
  return (
    <section
      className="animation-panel"
      aria-label="Interactive query animation"
    >
      <div className="panel-heading">
        <div>
          <span className="eyebrow">A SEARCH, VISUALIZED</span>
          <h2>
            {lesson.module === 0
              ? "From raw events to a useful view"
              : lesson.idea}
          </h2>
        </div>
        <span className="simulation-badge">
          <FlaskConical size={13} />
          Practice engine
        </span>
      </div>
      <div className="query-ribbon">
        <span>SPL</span>
        <pre>
          <Code value={lesson.spl} />
        </pre>
      </div>
      <div className="pipeline-scroll">
        <div className="pipeline">
          {result.stages.map((s, i) => (
            <button
              key={i}
              className={
                "pipeline-node " +
                (step === i ? "current" : "") +
                (step > i ? "visited" : "")
              }
              onClick={() => {
                setStep(i);
                setPlaying(false);
              }}
              aria-label={`Animation step ${i + 1}: ${s.kind}`}
              aria-current={step === i ? "step" : undefined}
            >
              {i === 0 ? (
                <Database size={20} />
              ) : ["stats", "timechart"].includes(s.kind) ? (
                <BarChart3 size={20} />
              ) : ["join", "lookup"].includes(s.kind) ? (
                <GitBranch size={20} />
              ) : (
                <Layers size={20} />
              )}
              <strong>{i === 0 ? "Events" : s.kind}</strong>
              <span>
                {s.rows.length} {s.rows.length === 1 ? "row" : "rows"}
              </span>
            </button>
          ))}
        </div>
      </div>
      <div className="transformation" key={`${step}-${scenario}`}>
        <div className="dot-cloud" aria-hidden="true">
          {Array.from({ length: sampleDots }, (_, i) => (
            <i
              key={i}
              style={{
                animationDelay: `${i * 13}ms`,
                background:
                  i % 3 === 0 ? "#0c947f" : i % 3 === 1 ? "#8383be" : "#ddaa67",
              }}
            />
          ))}
        </div>
        <div className="transform-label">
          <span>
            {step === 0
              ? "204 sample events"
              : `${active.inputCount} in · ${active.rows.length} out`}
          </span>
          <strong>
            {active.kind === "source" ? "A moment in every event" : active.kind}
          </strong>
          <div className="flow-track">
            <i />
          </div>
        </div>
        <div className="dot-cloud out" aria-hidden="true">
          {Array.from({ length: showCount }, (_, i) => (
            <i
              key={i}
              style={{
                animationDelay: `${200 + i * 16}ms`,
                background:
                  i % 3 === 0 ? "#0c947f" : i % 3 === 1 ? "#8383be" : "#ddaa67",
              }}
            />
          ))}
        </div>
      </div>
      <div className="animation-data" key={`data-${step}-${scenario}`}>
        <SignalChart rows={active.rows} stage={active} />
        <ResultTable rows={active.rows} columns={displayFields} compact />
      </div>
      <div className="narration" aria-live="polite">
        <span className="step-tag">{String(step + 1).padStart(2, "0")}</span>
        <p>{active.explanation}</p>
      </div>
      <div className="animation-footer">
        <button
          className="play-button solid"
          onClick={() => {
            if (step === max) setStep(0);
            setPlaying(!playing);
          }}
        >
          {playing ? <Pause size={15} /> : <Play size={15} />}{" "}
          {playing ? "Pause" : "Play animation"}
        </button>
        <div className="transport">
          <button
            className="icon-button"
            aria-label="Previous animation step"
            disabled={step === 0}
            onClick={() => {
              setStep(step - 1);
              setPlaying(false);
            }}
          >
            <SkipBack size={16} />
          </button>
          <button
            className="icon-button"
            aria-label="Next animation step"
            disabled={step === max}
            onClick={() => {
              setStep(step + 1);
              setPlaying(false);
            }}
          >
            <SkipForward size={16} />
          </button>
        </div>
        <Slider
          aria-label="Animation progress"
          ref={(element) => {
            element
              ?.querySelector("[role=slider]")
              ?.setAttribute("aria-label", "Animation progress");
          }}
          min={0}
          max={max}
          step={1}
          value={[step]}
          onValueChange={(v) => {
            setStep(v[0]);
            setPlaying(false);
          }}
        />
        <span className="step-count">
          {step + 1} / {max + 1}
        </span>
        <Select value={speed} onValueChange={setSpeed}>
          <SelectTrigger className="speed-select" aria-label="Animation speed">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="0.5">0.5×</SelectItem>
            <SelectItem value="1">1×</SelectItem>
            <SelectItem value="2">2×</SelectItem>
          </SelectContent>
        </Select>
      </div>
    </section>
  );
}
function ProductionDiagram({ lesson }: { lesson: Lesson }) {
  const [phase, setPhase] = useState(0);
  const [playing, setPlaying] = useState(false);
  const info = lesson.production!;
  useEffect(() => {
    if (!playing) return;
    const t = setInterval(
      () =>
        setPhase((p) => {
          if (p === info.steps.length - 1) {
            setPlaying(false);
            return p;
          }
          return p + 1;
        }),
      2200,
    );
    return () => clearInterval(t);
  }, [playing, info.steps.length]);
  return (
    <section className="production-panel">
      <div className="panel-heading">
        <div>
          <span className="eyebrow">IN PRODUCTION SPLUNK</span>
          <h2>{info.title}</h2>
        </div>
        <span className="small muted">
          Guided concept · not executable here
        </span>
      </div>
      <pre>
        <Code value={info.query} />
      </pre>
      <div className="production-steps">
        {info.steps.map(([title], i) => (
          <button
            key={title}
            className={i === phase ? "current" : ""}
            onClick={() => {
              setPhase(i);
              setPlaying(false);
            }}
          >
            <span>{i + 1}</span>
            {title}
          </button>
        ))}
      </div>
      <div className="production-narration" key={phase}>
        <h3>{info.steps[phase][0]}</h3>
        <p>{info.steps[phase][1]}</p>
      </div>
      <button
        className="play-button"
        onClick={() => {
          if (phase === info.steps.length - 1) setPhase(0);
          setPlaying(!playing);
        }}
      >
        {playing ? <Pause size={14} /> : <Play size={14} />}{" "}
        {playing ? "Pause explanation" : "Play explanation"}
      </button>
    </section>
  );
}
function QueryLab({
  lesson,
  scenario,
  full = false,
}: {
  lesson: Lesson;
  scenario: Scenario;
  full?: boolean;
}) {
  const [spl, setSpl] = useState(lesson.spl),
    [sql, setSql] = useState(lesson.sql);
  const [result, setResult] = useState<Result | null>(null);
  const [sqlResult, setSqlResult] = useState<{
    rows: Row[];
    columns: string[];
  } | null>(null);
  const [error, setError] = useState(""),
    [sqlError, setSqlError] = useState("");
  const [busy, setBusy] = useState(false);
  const [showSchema, setShowSchema] = useState(false);
  const [ranScenario, setRanScenario] = useState<Scenario | null>(null);
  const [sqlScenario, setSqlScenario] = useState<Scenario | null>(null);
  const [ranSpl, setRanSpl] = useState(""),
    [ranSql, setRanSql] = useState("");
  const stale = ranScenario !== scenario || ranSpl !== spl;
  const sqlStale = sqlScenario !== scenario || ranSql !== sql;
  function executeSPL() {
    try {
      setResult(runSPL(spl, scenario));
      setError("");
      setRanScenario(scenario);
      setRanSpl(spl);
    } catch (e) {
      setError((e as Error).message);
      setResult(null);
    }
  }
  async function executeSQL() {
    setBusy(true);
    setSqlError("");
    try {
      setSqlResult(await runSQL(sql, scenario));
      setSqlScenario(scenario);
      setRanSql(sql);
    } catch (e) {
      setSqlError((e as Error).message);
      setSqlResult(null);
    } finally {
      setBusy(false);
    }
  }
  async function runBoth() {
    executeSPL();
    await executeSQL();
  }
  const compared = result && sqlResult && !stale && !sqlStale;
  const matches = compared && resultsEqual(result.rows, sqlResult.rows);
  return (
    <div className="query-lab">
      <div className="lab-toolbar">
        <div>
          <span className="eyebrow">
            {full ? "YOUR QUERY WORKBENCH" : "THE SQL CONNECTION"}
          </span>
          <h2>
            {full
              ? "Change a query. Follow the evidence."
              : "One question. Two ways to ask it."}
          </h2>
        </div>
        <div className="button-group">
          <button
            className="quiet-button"
            onClick={() => setShowSchema(!showSchema)}
          >
            <Database size={15} />
            {showSchema ? "Hide data" : "Explore data"}
          </button>
          <button className="primary-button" onClick={runBoth} disabled={busy}>
            <Play size={15} />
            {busy ? "Running…" : "Run both queries"}
          </button>
        </div>
      </div>
      {showSchema && <DataExplorer scenario={scenario} />}
      <div className="editors">
        <section className="editor-card">
          <div className="editor-heading">
            <span>
              <span className="language-label spl-label">SPL</span> Practice
              engine
            </span>
            <div className="button-group">
              <CopyButton value={spl} />
              <button
                className="icon-button"
                aria-label="Reset SPL query"
                onClick={() => setSpl(lesson.spl)}
              >
                <RotateCcw size={15} />
              </button>
            </div>
          </div>
          <label className="sr-only" htmlFor="spl-query">
            SPL query
          </label>
          <textarea
            id="spl-query"
            spellCheck={false}
            value={spl}
            onChange={(e) => setSpl(e.target.value)}
            onKeyDown={(e) => {
              if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
                e.preventDefault();
                executeSPL();
              }
            }}
          />
          <div className="editor-footer">
            <span>
              {stale && result ? "Edited · run again" : "Classic SPL subset"}
            </span>
            <button className="run-link" onClick={executeSPL}>
              <Play size={13} />
              Run SPL
            </button>
          </div>
          {error && (
            <div className="inline-error" role="alert">
              <AlertCircle size={16} />
              {error}
            </div>
          )}
        </section>
        <section className="editor-card">
          <div className="editor-heading">
            <span>
              <span className="language-label sql-label">SQL</span> SQLite ·
              real engine
            </span>
            <div className="button-group">
              <CopyButton value={sql} />
              <button
                className="icon-button"
                aria-label="Reset SQL query"
                onClick={() => setSql(lesson.sql)}
              >
                <RotateCcw size={15} />
              </button>
            </div>
          </div>
          <label className="sr-only" htmlFor="sql-query">
            SQL query
          </label>
          <textarea
            id="sql-query"
            spellCheck={false}
            value={sql}
            onChange={(e) => setSql(e.target.value)}
            onKeyDown={(e) => {
              if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
                e.preventDefault();
                void executeSQL();
              }
            }}
          />
          <div className="editor-footer">
            <span>
              {sqlStale && sqlResult
                ? "Edited · run again"
                : "Read-only · 4-second limit"}
            </span>
            <button className="run-link" disabled={busy} onClick={executeSQL}>
              <Play size={13} />
              {busy ? "Running…" : "Run SQL"}
            </button>
          </div>
          {sqlError && (
            <div className="inline-error" role="alert">
              <AlertCircle size={16} />
              {sqlError}
            </div>
          )}
        </section>
      </div>
      {compared && (
        <div
          className={"comparison-status " + (matches ? "success" : "notice")}
          role="status"
        >
          {matches ? <CheckCircle2 size={17} /> : <CircleHelp size={17} />}{" "}
          {matches
            ? `Same answer: ${result.rows.length} rows, matching fields and values.`
            : "The results differ. Compare fields, filters, and aggregation."}
          <span>Order ignored · numeric tolerance 0.000001</span>
        </div>
      )}
      {(result || sqlResult) && (
        <div className="result-columns">
          {[
            { r: result, label: "SPL results", isStale: stale },
            { r: sqlResult, label: "SQL results", isStale: sqlStale },
          ].map(({ r, label, isStale }) => (
            <section key={label}>
              <h3>
                {label}
                {r && isStale && (
                  <span className="stale-badge">
                    Previous run · rerun query
                  </span>
                )}
              </h3>
              {r ? (
                <ResultTable
                  key={
                    label +
                    (label === "SPL results" ? ranSpl : ranSql) +
                    (label === "SPL results" ? ranScenario : sqlScenario)
                  }
                  rows={r.rows}
                  columns={r.columns}
                />
              ) : (
                <div className="pending-result">
                  Run this query to see its result.
                </div>
              )}
            </section>
          ))}
        </div>
      )}
      <div className="bridge-note">
        <GitBranch size={19} />
        <div>
          <h3>How the ideas connect</h3>
          <p>{lesson.bridge}</p>
        </div>
      </div>
      <div className="caution-note">
        <CircleHelp size={18} />
        <p>{lesson.caution}</p>
      </div>
      {full && result && !stale && (
        <details className="trace-details">
          <summary>
            Inspect the pipeline · {result.stages.length} stages
          </summary>
          {result.stages.map((s, i) => (
            <div key={i}>
              <code>{s.command}</code>
              <span>{s.rows.length} rows</span>
              <p>{s.explanation}</p>
            </div>
          ))}
        </details>
      )}
    </div>
  );
}
function DataExplorer({ scenario }: { scenario: Scenario }) {
  return (
    <section className="data-explorer">
      <div className="data-caption">
        <h3>The classroom dataset</h3>
        <p>
          204 synthetic events · Jan 15, 2025, 09:00–10:00 UTC · fixed clock at
          10:00
        </p>
      </div>
      <ResultTable
        rows={events(scenario)}
        columns={["_time", "index", "service", "status", "duration", "user"]}
      />
      <details>
        <summary>Field dictionary and lookup tables</summary>
        <div className="field-dictionary">
          {fieldNotes.map(([field, type, note]) => (
            <div key={field}>
              <code>{field}</code>
              <span>{type}</span>
              <p>{note}</p>
            </div>
          ))}
        </div>
        <p className="small muted">
          <strong>SQL tables:</strong> events (index is named index_name),
          service_owners (service, team, tier), users (user, department,
          region).
        </p>
      </details>
    </section>
  );
}
function Practice({
  lesson,
  completed,
  onComplete,
}: {
  lesson: Lesson;
  completed: boolean;
  onComplete: () => void;
}) {
  const [answers, setAnswers] = useState<Record<number, string>>({});
  const [query, setQuery] = useState("index=web\n| ");
  const [feedback, setFeedback] = useState<{
    pass: boolean;
    message: string;
    quiz: boolean[];
  } | null>(null);
  const [hint, setHint] = useState(false);
  const [attempts, setAttempts] = useState(0);
  const [passedNow, setPassedNow] = useState(false);
  const ready = lesson.questions.every((_, i) => answers[i] !== undefined);
  function check() {
    const quiz = lesson.questions.map(
      (q, i) => Number(answers[i]) === q.answer,
    );
    setAttempts((a) => a + 1);
    try {
      const good = (["normal", "incident"] as const).every((s) =>
        resultsEqual(
          runSPL(query, s).rows,
          runSPL(lesson.solution, s).rows,
          lesson.id === "sort-dedup" || lesson.id === "bin",
        ),
      );
      const pass = good && quiz.every(Boolean);
      const stored = pass ? completeLesson(lesson.id) : true;
      setPassedNow(pass);
      if (pass) onComplete();
      setFeedback({
        pass,
        quiz,
        message: pass
          ? stored
            ? "You did it. Both scenarios pass, and your progress is saved in this browser."
            : "You passed. Browser storage is unavailable, so progress will not persist after reload."
          : !good
            ? "Your result does not match the task in at least one scenario. Check field names, filters, and calculations."
            : "The query passes both scenarios. Review the knowledge-check feedback and try again.",
      });
    } catch (e) {
      setFeedback({ pass: false, quiz, message: (e as Error).message });
    }
  }
  return (
    <div className="practice">
      <div className="practice-heading">
        <span className="eyebrow">MAKE IT YOURS</span>
        <h2>A small challenge. A real step forward.</h2>
        <p>
          Answer both questions and solve the query task. We check your result
          against normal and incident traffic.
        </p>
      </div>
      <div className="question-grid">
        {lesson.questions.map((q, i) => (
          <fieldset className="question-card" key={i}>
            <legend>
              <span>{i + 1}</span>
              {q.prompt}
            </legend>
            <RadioGroup
              value={answers[i]}
              onValueChange={(v) => {
                setAnswers({ ...answers, [i]: v });
                setFeedback(null);
              }}
              aria-label={q.prompt}
            >
              {q.options.map((o, n) => (
                <label
                  className={
                    "answer-option " +
                    (answers[i] === String(n) ? "chosen" : "")
                  }
                  key={o}
                  htmlFor={`${lesson.id}-q${i}-${n}`}
                >
                  <RadioGroupItem
                    value={String(n)}
                    id={`${lesson.id}-q${i}-${n}`}
                  />
                  <span>{o}</span>
                </label>
              ))}
            </RadioGroup>
            {feedback && (
              <p
                className={
                  "question-feedback " +
                  (feedback.quiz[i] ? "correct" : "incorrect")
                }
              >
                {feedback.quiz[i] ? "Correct. " : "Review this. "}
                {q.why}
              </p>
            )}
          </fieldset>
        ))}
      </div>
      <section className="challenge-card">
        <div>
          <span className="eyebrow">
            <Terminal size={15} /> YOUR QUERY CHALLENGE
          </span>
          <h3>{lesson.challenge}</h3>
        </div>
        <label className="sr-only" htmlFor="challenge-query">
          Challenge SPL query
        </label>
        <textarea
          id="challenge-query"
          spellCheck={false}
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setFeedback(null);
          }}
        />
        <div className="challenge-controls">
          <div className="button-group">
            <button className="quiet-button" onClick={() => setHint(!hint)}>
              <CircleHelp size={15} />
              {hint ? "Hide hint" : "Need a hint?"}
            </button>
            {attempts > 0 && (
              <button
                className="quiet-button"
                onClick={() => {
                  setQuery(lesson.solution);
                  setFeedback(null);
                }}
              >
                Study a solution
              </button>
            )}
          </div>
          <button className="primary-button" disabled={!ready} onClick={check}>
            <CheckCircle2 size={16} />
            Check my work
          </button>
        </div>
        {!ready && (
          <p className="small muted">
            Choose an answer to both questions to check your work.
          </p>
        )}
        {hint && (
          <div className="hint">
            <Sparkles size={16} />
            {lesson.hint}
          </div>
        )}
        {feedback && (
          <div
            className={
              "assessment-feedback " + (feedback.pass ? "success" : "notice")
            }
            role="status"
          >
            {feedback.pass ? <Trophy size={22} /> : <CircleHelp size={22} />}
            <p>{feedback.message}</p>
          </div>
        )}
        {(completed || passedNow) && (
          <div className="completed-label">
            <CheckCircle2 size={16} />
            Lesson complete · 100 XP earned
          </div>
        )}
      </section>
      <p className="small muted">
        Practice achievements are for learning, not certification. Answers are
        available in the open-source curriculum.
      </p>
    </div>
  );
}
function Guide() {
  const [filter, setFilter] = useState("");
  const found = mappings.filter((m) =>
    `${m.task} ${m.spl} ${m.sql}`.toLowerCase().includes(filter.toLowerCase()),
  );
  return (
    <div className="guide">
      <div className="eyebrow">A BRIDGE BETWEEN LANGUAGES</div>
      <h1>
        Your SPL <em>field guide.</em>
      </h1>
      <p className="lede">
        Understand the idea. Find the command. Know where the analogy ends.
      </p>
      <div className="guide-search">
        <Search size={18} />
        <label className="sr-only" htmlFor="guide-filter">
          Find a command or SQL concept
        </label>
        <input
          id="guide-filter"
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          placeholder="Try GROUP BY, lookup, or missing values…"
        />
        {filter && (
          <button
            aria-label="Clear field guide search"
            onClick={() => setFilter("")}
          >
            <X size={16} />
          </button>
        )}
      </div>
      <div className="mapping-table">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>The idea</TableHead>
              <TableHead>Classic SPL</TableHead>
              <TableHead>SQL connection</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {found.map((m) => (
              <TableRow key={m.task}>
                <TableCell>
                  <a href={`#learn/${m.lesson}`}>{m.task}</a>
                </TableCell>
                <TableCell>
                  <code>{m.spl}</code>
                </TableCell>
                <TableCell>
                  <code>{m.sql}</code>
                  <p>{m.note}</p>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        {!found.length && (
          <div className="empty-results">
            <h3>No matching concepts</h3>
            <p>Try a command such as stats, eval, or lookup.</p>
          </div>
        )}
      </div>
      <section className="content-card engine-scope">
        <span className="eyebrow">KNOW YOUR TOOLS</span>
        <h2>A classroom, with explicit boundaries.</h2>
        <p>
          The SPL side is a browser interpreter for the documented lesson
          subset. The SQL side is actual SQLite, isolated in a disposable
          worker. Both use the same synthetic data. No Splunk account, API key,
          or production access is required.
        </p>
        <div className="command-cloud">
          {supportedCommands.map((c) => (
            <code key={c}>{c}</code>
          ))}
        </div>
        <p>
          Supported forms are demonstrated in the lessons. The engine rejects
          unsupported syntax instead of pretending to execute it. It is not a
          Splunk replacement or an automatic SQL translator.
        </p>
        <ul>
          <li>
            Relative time uses the fixed classroom clock; buckets use fixed UTC
            seconds.
          </li>
          <li>
            Regex extraction permits one safe named character-class capture.
            Full PCRE is a production feature.
          </li>
          <li>
            Lookups are limited to the bundled unique-key tables. Joins
            implement the default first-match behavior.
          </li>
          <li>
            Timechart requires explicit span, cont=false, and fixedrange=false;
            it supports one aggregate and at most ten split values.
          </li>
          <li>
            tstats, transaction, scheduling, acceleration, and distributed
            execution are explained as production concepts.
          </li>
          <li>
            Progress stays in this browser. Clearing site data removes it; there
            is no account synchronization.
          </li>
        </ul>
      </section>
      <section className="content-card sources-card">
        <h2>Go straight to the source</h2>
        <a
          href="https://help.splunk.com/en/splunk-enterprise/spl-search-reference/9.3/quick-reference/splunk-spl-for-sql-users"
          target="_blank"
          rel="noreferrer"
        >
          Splunk’s SPL for SQL users <ExternalLink size={14} />
        </a>
        <a
          href="https://help.splunk.com/en/splunk-enterprise/spl-search-reference/9.3/quick-reference/command-quick-reference"
          target="_blank"
          rel="noreferrer"
        >
          Splunk command reference <ExternalLink size={14} />
        </a>
        <a
          href="https://www.sqlite.org/lang.html"
          target="_blank"
          rel="noreferrer"
        >
          SQLite language reference <ExternalLink size={14} />
        </a>
        <a
          href="https://github.com/sivalinb/promql-zero-to-hero"
          target="_blank"
          rel="noreferrer"
        >
          The PromQL academy that inspired this learning loop{" "}
          <ExternalLink size={14} />
        </a>
      </section>
    </div>
  );
}
function AcademyNav({
  lesson,
  view,
  done,
}: {
  lesson: Lesson;
  view: string;
  done: Record<string, unknown>;
}) {
  const { setOpenMobile } = useSidebar();
  const [manual, setManual] = useState<number | null>(null);
  const open = manual ?? lesson.module;
  function navigate(id: string) {
    setOpenMobile(false);
    go(`learn/${id}`);
  }
  return (
    <Sidebar className="academy-sidebar">
      <SidebarHeader>
        <a
          className="brand"
          href="#learn/events"
          aria-label="SPL Zero to Hero home"
        >
          <span className="brand-icon">|&gt;</span>
          <div>
            SPL<span>ZERO TO HERO</span>
          </div>
        </a>
      </SidebarHeader>
      <SidebarContent>
        <div className="course-label">
          YOUR LEARNING PATH <span>28 lessons</span>
        </div>
        {modules.map((m, i) => (
          <section key={m.name} className="nav-module">
            <button
              className={"module-title " + (open === i ? "expanded" : "")}
              onClick={() => setManual(open === i ? -1 : i)}
              aria-expanded={open === i}
            >
              <span>{String(i + 1).padStart(2, "0")}</span>
              <b>{m.name}</b>
              {lessons
                .filter((l) => l.module === i)
                .every((l) => done[l.id]) ? (
                <CheckCircle2 size={14} />
              ) : (
                <ChevronDown size={14} />
              )}
            </button>
            {open === i && (
              <div className="module-lessons">
                {lessons
                  .filter((l) => l.module === i)
                  .map((l) => (
                    <button
                      key={l.id}
                      className={
                        "lesson-link " +
                        (lesson.id === l.id && view === "learn" ? "active" : "")
                      }
                      onClick={() => navigate(l.id)}
                      aria-current={
                        lesson.id === l.id && view === "learn"
                          ? "page"
                          : undefined
                      }
                    >
                      <span>
                        {done[l.id] ? (
                          <Check size={13} />
                        ) : (
                          String(lessons.indexOf(l) + 1).padStart(2, "0")
                        )}
                      </span>
                      {l.title}
                    </button>
                  ))}
              </div>
            )}
          </section>
        ))}
        <div className="sidebar-note">
          <GraduationCap size={20} />
          <p>
            Start anywhere.
            <br />
            Learn at your own pace.
          </p>
        </div>
      </SidebarContent>
      <SidebarFooter>
        <div className="progress-label">
          Your journey{" "}
          <span>
            {Object.keys(done).length} / {lessons.length}
          </span>
        </div>
        <Progress
          value={(Object.keys(done).length / lessons.length) * 100}
          aria-label="Course completion"
        />
        <div className="xp-line">
          <Trophy size={14} />
          {Object.keys(done).length * 100} XP<span>Saved on this browser</span>
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}
export default function Academy() {
  useEffect(registerAcademyTools, []);
  const hash = useSyncExternalStore(
    subscribeRoute,
    routeSnapshot,
    emptySnapshot,
  );
  const raw = useSyncExternalStore(
    subscribeProgress,
    readProgress,
    emptyProgress,
  );
  const progress = useMemo(() => parseProgress(raw), [raw]);
  const done = useMemo(
    () =>
      Object.fromEntries(
        Object.entries(progress).filter(([id]) =>
          lessons.some((l) => l.id === id),
        ),
      ),
    [progress],
  );
  const [path, id] = hash.replace(/^#/, "").split("/");
  const view = ["learn", "playground", "guide"].includes(path) ? path : "learn";
  const lesson = lessons.find((l) => l.id === id) ?? lessons[0];
  const index = lessons.indexOf(lesson);
  const [scenario, setScenario] = useState<Scenario>("normal");
  const [lessonTab, setLessonTab] = useState("watch");
  const [completionPing, setCompletionPing] = useState(false);
  return (
    <SidebarProvider style={{ "--sidebar-width": "17rem" } as CSSProperties}>
      <a
        className="skip-link"
        href="#main-content"
        onClick={(e) => {
          e.preventDefault();
          const main = document.getElementById("main-content");
          main?.focus();
          main?.scrollIntoView();
        }}
      >
        Skip to lesson content
      </a>
      <AcademyNav key={lesson.module} lesson={lesson} view={view} done={done} />
      <div className="app-shell">
        <header className="topbar">
          <nav className="topnav" aria-label="Main navigation">
            <SidebarTrigger />
            <a
              href={`#learn/${lesson.id}`}
              className={view === "learn" ? "selected" : ""}
            >
              <BookOpen size={17} />
              Learn
            </a>
            <a
              href={`#playground/${lesson.id}`}
              className={view === "playground" ? "selected" : ""}
            >
              <Terminal size={17} />
              Playground
            </a>
            <a href="#guide" className={view === "guide" ? "selected" : ""}>
              <Braces size={17} />
              Field guide
            </a>
          </nav>
          <span className="edition">SPL + SQL, side by side</span>
        </header>
        <main id="main-content" tabIndex={-1} className="workspace">
          {view === "guide" ? (
            <Guide />
          ) : (
            <>
              <div className="breadcrumb">
                THE LEARNING PATH <span>/</span>{" "}
                {modules[lesson.module].name.toUpperCase()} <span>/</span>{" "}
                LESSON {String(index + 1).padStart(2, "0")}
              </div>
              {view === "learn" ? (
                <>
                  <div className="title-row">
                    <div>
                      <div className="eyebrow">
                        {lesson.module === 0
                          ? "START WITH THE BASICS"
                          : modules[lesson.module].level.toUpperCase() +
                            " · " +
                            modules[lesson.module].name.toUpperCase()}
                      </div>
                      {index === 0 ? (
                        <h1>
                          Every search starts
                          <br />
                          with a little <em>curiosity.</em>
                        </h1>
                      ) : (
                        <h1>{lesson.title}</h1>
                      )}
                      <p className="lede">
                        {index === 0
                          ? "Meet the events behind your data. Then turn them into answers, one SPL command at a time."
                          : lesson.subtitle}
                      </p>
                    </div>
                    <span className="level-pill">
                      <Sparkles size={14} />
                      {modules[lesson.module].level} · <Clock size={13} />
                      {lesson.minutes} min
                    </span>
                  </div>
                  <div className="lesson-meta-row">
                    <span className="lesson-name">
                      <BookOpen size={15} />
                      {lesson.title}
                      {done[lesson.id] && (
                        <CheckCircle2 size={15} className="teal" />
                      )}
                    </span>
                    <ScenarioPicker value={scenario} onChange={setScenario} />
                  </div>
                  <Tabs
                    key={lesson.id}
                    defaultValue="watch"
                    onValueChange={setLessonTab}
                  >
                    <TabsList className="lesson-tabs" variant="line">
                      <TabsTrigger value="watch">
                        01 · Watch & understand
                      </TabsTrigger>
                      <TabsTrigger value="compare">
                        02 · Connect to SQL
                      </TabsTrigger>
                      <TabsTrigger value="practice">
                        03 · Try it yourself
                      </TabsTrigger>
                    </TabsList>
                    <TabsContent value="watch">
                      <PipelineAnimation
                        key={lesson.id}
                        lesson={lesson}
                        scenario={scenario}
                      />
                      <div className="below-grid">
                        <section className="content-card lesson-prose">
                          <span className="eyebrow">
                            THE IDEA IN PLAIN ENGLISH
                          </span>
                          <h2>{lesson.idea}</h2>
                          {lesson.body.map((p) => (
                            <p key={p}>{p}</p>
                          ))}
                        </section>
                        <aside>
                          <section className="takeaway-card">
                            <span className="eyebrow">
                              <Braces size={15} /> WORDS TO KNOW
                            </span>
                            <dl>
                              {lesson.keywords.map(([word, meaning]) => (
                                <div key={word}>
                                  <dt>
                                    <code>{word}</code>
                                  </dt>
                                  <dd>{meaning}</dd>
                                </div>
                              ))}
                            </dl>
                          </section>
                          <div className="caution-note side-caution">
                            <CircleHelp size={18} />
                            <p>{lesson.caution}</p>
                          </div>
                        </aside>
                      </div>
                      {lesson.production && (
                        <ProductionDiagram lesson={lesson} />
                      )}
                    </TabsContent>
                    <TabsContent value="compare">
                      <QueryLab
                        key={lesson.id}
                        lesson={lesson}
                        scenario={scenario}
                      />
                    </TabsContent>
                    <TabsContent value="practice">
                      <Practice
                        key={lesson.id}
                        lesson={lesson}
                        completed={!!done[lesson.id]}
                        onComplete={() => setCompletionPing(true)}
                      />
                    </TabsContent>
                  </Tabs>
                  <div className="lesson-navigation">
                    <button
                      className="quiet-button"
                      disabled={index === 0}
                      onClick={() => go(`learn/${lessons[index - 1].id}`)}
                    >
                      Previous lesson
                    </button>
                    <a href={lesson.source} target="_blank" rel="noreferrer">
                      Official Splunk reference <ExternalLink size={13} />
                    </a>
                    <button
                      className="primary-button"
                      onClick={() =>
                        go(
                          index < lessons.length - 1
                            ? `learn/${lessons[index + 1].id}`
                            : "guide",
                        )
                      }
                    >
                      {index < lessons.length - 1
                        ? "Next lesson"
                        : "Explore the field guide"}
                    </button>
                  </div>
                  {(completionPing || Object.keys(done).length > 0) &&
                    lessonTab === "practice" && (
                      <p className="small muted">
                        {Object.keys(done).length === 28
                          ? "All 28 lessons complete. You have earned 2,800 XP. Keep exploring the playground."
                          : `${Object.keys(done).length} lessons complete. Every new command gives you another way to ask a better question.`}
                      </p>
                    )}
                </>
              ) : (
                <>
                  <div className="title-row playground-title">
                    <div>
                      <span className="eyebrow">LEARN BY DOING</span>
                      <h1>
                        The query <em>playground.</em>
                      </h1>
                      <p className="lede">
                        Real data transformations. Instant feedback. Room to
                        experiment.
                      </p>
                    </div>
                  </div>
                  <div className="playground-controls">
                    <div>
                      <label htmlFor="lesson-example">Load an example</label>
                      <Select
                        value={lesson.id}
                        onValueChange={(v) => go(`playground/${v}`)}
                      >
                        <SelectTrigger
                          id="lesson-example"
                          aria-label="Lesson example"
                        >
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {lessons.map((l, i) => (
                            <SelectItem key={l.id} value={l.id}>
                              {String(i + 1).padStart(2, "0")} · {l.title}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <ScenarioPicker value={scenario} onChange={setScenario} />
                  </div>
                  <QueryLab
                    key={lesson.id}
                    lesson={lesson}
                    scenario={scenario}
                    full
                  />
                </>
              )}
            </>
          )}
        </main>
        <footer className="site-footer">
          <span>Built for curious minds.</span>
          <span>Independent project · Classic SPL · Synthetic data</span>
          <a
            href="https://github.com/sivalinb/spl-zero-to-hero"
            target="_blank"
            rel="noreferrer"
          >
            <Code2 size={14} />
            Source code
          </a>
        </footer>
      </div>
    </SidebarProvider>
  );
}
function ScenarioPicker({
  value,
  onChange,
}: {
  value: Scenario;
  onChange: (s: Scenario) => void;
}) {
  return (
    <div className="scenario-control">
      <span>Traffic scenario</span>
      <Select value={value} onValueChange={(v) => onChange(v as Scenario)}>
        <SelectTrigger aria-label="Traffic scenario">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="normal">Normal traffic</SelectItem>
          <SelectItem value="incident">Checkout incident</SelectItem>
        </SelectContent>
      </Select>
    </div>
  );
}
