import {
  events,
  NOW,
  owners,
  users,
  type Row,
  type Scenario,
  type Value,
} from "./data";
import { expression, splitOutside } from "./expression";
import { matchPattern } from "./pattern";
export type Stage = {
  command: string;
  rows: Row[];
  inputCount: number;
  kind: string;
  explanation: string;
};
export type Result = { rows: Row[]; stages: Stage[]; columns: string[] };
const fieldList = (s: string) =>
  s
    .trim()
    .split(/[\s,]+/)
    .filter(Boolean);
const own = (row: Row, field: string) =>
  Object.hasOwn(row, field) ? row[field] : null;
const clone = (rows: Row[]) => rows.map((row) => ({ ...row }));
export const supportedCommands = [
  "search",
  "where",
  "table",
  "fields",
  "head",
  "sort",
  "dedup",
  "rename",
  "eval",
  "fillnull",
  "stats",
  "eventstats",
  "streamstats",
  "bin",
  "timechart",
  "top",
  "rare",
  "rex",
  "spath",
  "makemv",
  "mvexpand",
  "lookup",
  "inputlookup",
  "join",
  "append",
];
function wildcard(value: Value, pattern: string) {
  if (value === null) return false;
  if (typeof value === "number" && /^-?\d+(?:\.\d+)?$/.test(pattern))
    return value === Number(pattern);
  return matchPattern(String(value), pattern, "*", undefined, true);
}
function timeValue(raw: string): number {
  if (/^\d+$/.test(raw)) return Number(raw);
  if (raw === "now") return NOW;
  const m = /^(-?\d+)([smhd])(?:@(h|d))?$/.exec(raw);
  if (!m)
    throw new Error(
      "Use a Unix timestamp or relative time such as -30m, -1h@h, or now.",
    );
  const t =
    NOW + Number(m[1]) * ({ s: 1, m: 60, h: 3600, d: 86400 }[m[2]] ?? 1);
  return m[3]
    ? Math.floor(t / (m[3] === "h" ? 3600 : 86400)) *
        (m[3] === "h" ? 3600 : 86400)
    : t;
}
function search(input: string, rows: Row[]): Row[] {
  let earliest = -Infinity,
    latest = Infinity;
  input = input
    .replace(/\b(earliest|latest)=([^\s)]+)/g, (_, key, val) => {
      if (key === "earliest") earliest = timeValue(val);
      else latest = timeValue(val);
      return "";
    })
    .trim();
  type Pred = (r: Row) => boolean;
  const ts =
    input.match(/"(?:\\.|[^"\\])*"|>=|<=|!=|==|[()=<>]|[^\s()=<>!]+/g) ?? [];
  let p = 0;
  const unquote = (s: string) =>
    s.startsWith('"') ? s.slice(1, -1).replace(/\\"/g, '"') : s;
  function primary(): Pred {
    const t = ts[p++];
    if (!t) throw new Error("Search condition is incomplete.");
    if (t === "NOT") {
      const pred = primary();
      return (r) => !pred(r);
    }
    if (t === "(") {
      const pred = and();
      if (ts[p++] !== ")") throw new Error("Close the search parentheses.");
      return pred;
    }
    if (["AND", "OR", ")"].includes(t))
      throw new Error(`Unexpected ${t} in search.`);
    if (["=", "==", "!=", ">", "<", ">=", "<="].includes(ts[p])) {
      const op = ts[p++];
      const raw = ts[p++];
      if (!raw || ["AND", "OR", ")"].includes(raw))
        throw new Error(`Add a value after ${t}${op}.`);
      const v = unquote(raw);
      return (r) => {
        const x = own(r, t);
        if (x === null) return false;
        const values = Array.isArray(x) ? x : [x];
        if (op === "=" || op === "==")
          return values.some((z) => wildcard(z, v));
        if (op === "!=") return values.every((z) => !wildcard(z, v));
        return values.some((z) => {
          const a = Number(z),
            b = Number(v);
          return op === ">"
            ? a > b
            : op === "<"
              ? a < b
              : op === ">="
                ? a >= b
                : a <= b;
        });
      };
    }
    if (t === "*") return () => true;
    const term = unquote(t);
    return (r) => wildcard(String(r._raw ?? ""), `*${term}*`);
  }
  function or(): Pred {
    let left = primary();
    while (ts[p] === "OR") {
      p++;
      const a = left,
        b = primary();
      left = (r) => a(r) || b(r);
    }
    return left;
  }
  function and(): Pred {
    let left = or();
    while (p < ts.length && ts[p] !== ")") {
      if (ts[p] === "AND") p++;
      const a = left,
        b = or();
      left = (r) => a(r) && b(r);
    }
    return left;
  }
  const pred = ts.length ? and() : () => true;
  if (p !== ts.length) throw new Error("Unexpected search condition.");
  return rows.filter(
    (r) =>
      (earliest === -Infinity || Number(r._time) >= earliest) &&
      (latest === Infinity || Number(r._time) < latest) &&
      pred(r),
  );
}
type Agg = { fn: string; source: string; alias: string };
function aggregates(s: string): { aggs: Agg[]; by: string[] } {
  const pieces = s.split(/\s+by\s+/i);
  if (pieces.length > 2) throw new Error("Use one BY clause.");
  const by = pieces[1] ? fieldList(pieces[1]) : [];
  const text = pieces[0];
  let p = 0;
  const aggs: Agg[] = [];
  while (p < text.length) {
    while (/[\s,]/.test(text[p] ?? "") && p < text.length) p++;
    if (p === text.length) break;
    const m = /^(count|sum|avg|min|max|dc|values|list|first|last)\b/i.exec(
      text.slice(p),
    );
    if (!m)
      throw new Error(
        `Unsupported aggregation near “${text.slice(p)}”. Try count, avg(field), sum(field), or dc(field).`,
      );
    const fn = m[1].toLowerCase();
    p += m[0].length;
    let source = "";
    if (text[p] === "(") {
      const start = ++p;
      let depth = 1,
        quote = false;
      while (p < text.length && depth) {
        if (text[p] === '"' && text[p - 1] !== "\\") quote = !quote;
        if (!quote) {
          if (text[p] === "(") depth++;
          if (text[p] === ")") depth--;
        }
        if (depth) p++;
      }
      if (depth) throw new Error("Close the aggregation function.");
      source = text.slice(start, p++);
    } else if (fn !== "count")
      throw new Error(`${fn} needs a field in parentheses.`);
    const aliasMatch = /^\s+as\s+([\w]+)/i.exec(text.slice(p));
    let alias = source ? `${fn}(${source})` : fn;
    if (aliasMatch) {
      alias = aliasMatch[1];
      p += aliasMatch[0].length;
    }
    aggs.push({ fn, source, alias });
  }
  if (!aggs.length)
    throw new Error("Choose an aggregation such as count or avg(duration).");
  return { aggs, by };
}
function aggregate(rows: Row[], { fn, source }: Agg): Value {
  const getter =
    source.startsWith("eval(") && source.endsWith(")")
      ? expression(source.slice(5, -1))
      : (r: Row) => own(r, source);
  const values = rows
    .map(getter)
    .flatMap((x) => (Array.isArray(x) ? x : [x]))
    .filter((x) => x !== null && x !== undefined);
  if (fn === "count")
    return source
      ? source.startsWith("eval(")
        ? values.filter((x) => x !== false).length
        : values.length
      : rows.length;
  if (fn === "dc") return new Set(values.map(String)).size;
  if (fn === "values") return [...new Set(values.map(String))].sort();
  if (fn === "list") return values.slice(0, 100);
  if (fn === "first") return values[0] ?? null;
  if (fn === "last") return values.at(-1) ?? null;
  const nums = values
    .filter((x) => x !== "" && Number.isFinite(Number(x)))
    .map(Number);
  if (!nums.length) return null;
  const sum = nums.reduce((a, b) => a + b, 0);
  return fn === "sum"
    ? sum
    : fn === "avg"
      ? sum / nums.length
      : fn === "min"
        ? Math.min(...nums)
        : Math.max(...nums);
}
function group(rows: Row[], by: string[]): Map<string, Row[]> {
  const groups = new Map<string, Row[]>();
  if (!by.length) groups.set("[]", []);
  for (const row of rows) {
    if (by.some((f) => own(row, f) === null)) continue;
    if (by.some((f) => Array.isArray(row[f])))
      throw new Error(
        "Expand multivalue fields with mvexpand before grouping in this practice engine.",
      );
    const key = JSON.stringify(by.map((f) => row[f]));
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(row);
  }
  return groups;
}
function summarize(rows: Row[], spec: ReturnType<typeof aggregates>): Row[] {
  return [...group(rows, spec.by).entries()].map(([key, set]) => ({
    ...Object.fromEntries(spec.by.map((f, i) => [f, JSON.parse(key)[i]])),
    ...Object.fromEntries(spec.aggs.map((a) => [a.alias, aggregate(set, a)])),
  }));
}
function spanSeconds(s: string): number {
  const m = /^(\d+)(s|m|h|d)$/.exec(s);
  if (!m || Number(m[1]) === 0)
    throw new Error("Use a positive span, for example span=5m.");
  return Number(m[1]) * ({ s: 1, m: 60, h: 3600, d: 86400 }[m[2]] ?? 1);
}
const explanations: Record<string, string> = {
  search:
    "Keep the events that match these keywords and field values. Other events leave the pipeline.",
  where:
    "Evaluate a condition for each result. Only true conditions survive; missing values do not pass.",
  table: "Project each result onto these named fields, in this order.",
  fields:
    "Keep or remove fields. Event count stays the same; the shape changes.",
  head: "Keep the first results in the current order. Sort first when order matters.",
  sort: "Reorder results by these fields. A minus sign puts the largest values first.",
  dedup: "Keep the first result for each distinct combination of these fields.",
  rename: "Give a field a new name without changing its values.",
  eval: "Calculate new fields for every result. The number of events stays the same.",
  fillnull:
    "Replace missing values in the selected fields with a chosen default.",
  stats: "Gather matching groups and collapse their events into summary rows.",
  eventstats:
    "Compute a group summary, then attach it to the original events. No rows are collapsed.",
  streamstats:
    "Walk through the current order and attach a running calculation to each event.",
  bin: "Round time down to the start of a bucket. Events are still individual rows.",
  timechart:
    "Group events into time buckets, calculate a value, and arrange a time series.",
  top: "Count distinct values and rank the most frequent ones.",
  rare: "Count distinct values and surface the least frequent ones.",
  rex: "Extract named fields from text using a regular expression.",
  spath: "Follow a path inside JSON and extract its value into a field.",
  makemv: "Split text into a field with multiple values.",
  mvexpand:
    "Make one result per value in a multivalue field. One event can become several rows.",
  lookup:
    "Match a key against the bundled reference table and attach its metadata.",
  inputlookup: "Start with a bundled reference table instead of event data.",
  join: "Match the main results to a subsearch using a common key.",
  append:
    "Run the subsearch and add its result rows below the current results.",
};
export function runSPL(
  query: string,
  scenario: Scenario = "normal",
  depth = 0,
): Result {
  if (!query.trim()) throw new Error("Write a search first. Try index=web.");
  if (query.length > 6000)
    throw new Error("Keep practice searches under 6,000 characters.");
  if (depth > 2) throw new Error("Use no more than two nested subsearches.");
  const commands = splitOutside(query).filter((s, i) => s || i !== 0);
  if (commands.length > 25 || commands.some((s) => !s))
    throw new Error("Use 1–25 complete pipeline commands.");
  let rows = events(scenario);
  const stages: Stage[] = [
    {
      command: "All sample events",
      rows: clone(rows),
      inputCount: rows.length,
      kind: "source",
      explanation:
        "Our dataset contains 180 web requests and 24 authentication events. Time runs from 09:00 to 10:00 UTC.",
    },
  ];
  for (let ci = 0; ci < commands.length; ci++) {
    const command = commands[ci];
    const first = command.match(/^([A-Za-z]+)\s+/);
    let kind = first?.[1].toLowerCase() ?? "";
    let args = first ? command.slice(first[0].length) : "";
    if (ci === 0 && !supportedCommands.includes(kind)) {
      if (
        query.trim().startsWith("|") ||
        /^(tstats|transaction|chart|delete|collect|outputlookup|rest|map|script|loadjob)\b/i.test(
          command,
        )
      )
        throw new Error(
          "This command requires Splunk and is not executable in the browser practice engine. See the production lessons and field guide.",
        );
      kind = "search";
      args = command;
    }
    if (ci > 0 && !kind) throw new Error(`Unknown command “${command}”.`);
    const inputCount = rows.length;
    switch (kind) {
      case "search": {
        if (args.includes("[")) {
          const m = /^(.*?)\[([\s\S]+)\]$/.exec(args);
          if (!m)
            throw new Error(
              "Put one subsearch in square brackets at the end of the search.",
            );
          const sub = runSPL(m[2], scenario, depth + 1).rows;
          rows = search(m[1], rows).filter((r) =>
            sub.some((s) =>
              Object.entries(s).every(([k, v]) => own(r, k) === v),
            ),
          );
        } else rows = search(args, rows);
        break;
      }
      case "where": {
        const pred = expression(args);
        rows = rows.filter((r) => Boolean(pred(r)));
        break;
      }
      case "table": {
        const fields = fieldList(args);
        if (fields.some((f) => !/^[_a-zA-Z]\w*$/.test(f)))
          throw new Error(
            "This lab supports explicit field names. Give aggregates an AS name before using table.",
          );
        if (!fields.length)
          throw new Error("Name at least one field for table.");
        rows = rows.map((r) =>
          Object.fromEntries(fields.map((f) => [f, own(r, f)])),
        );
        break;
      }
      case "fields": {
        const exclude = args.trim().startsWith("-");
        const fields = fieldList(args.replace(/^[+-]\s*/, ""));
        rows = rows.map((r) =>
          Object.fromEntries(
            Object.entries(r).filter(([k]) =>
              exclude
                ? !fields.includes(k)
                : fields.includes(k) || k === "_time" || k === "_raw",
            ),
          ),
        );
        break;
      }
      case "head": {
        if (!/^\d+$/.test(args))
          throw new Error(
            "Use head followed by a whole number, for example head 5.",
          );
        rows = rows.slice(0, Number(args));
        break;
      }
      case "sort": {
        const m = /^(\d+)\s+/.exec(args);
        const limit = m ? Number(m[1]) : 10000;
        if (m) args = args.slice(m[0].length);
        const fields = fieldList(
          args.replace(/-\s+(\w)/g, "-$1").replace(/\+\s+(\w)/g, "+$1"),
        );
        if (!fields.length) throw new Error("Choose a field to sort by.");
        rows = [...rows].sort((a, b) => {
          for (const item of fields) {
            const desc = item[0] === "-";
            const f = item.replace(/^[+-]/, "");
            const av = own(a, f),
              bv = own(b, f);
            if (av === bv) continue;
            if (av === null) return 1;
            if (bv === null) return -1;
            const diff =
              typeof av === "number" && typeof bv === "number"
                ? av - bv
                : String(av).localeCompare(String(bv));
            if (diff) return (desc ? -1 : 1) * diff;
          }
          return 0;
        });
        if (limit) rows = rows.slice(0, limit);
        break;
      }
      case "dedup": {
        const fs = fieldList(args);
        if (!fs.length || fs.some((f) => !/^[\w]+$/.test(f)))
          throw new Error("Use dedup followed by field names.");
        const seen = new Set<string>();
        rows = rows.filter((r) => {
          if (fs.some((f) => own(r, f) === null)) return false;
          const key = JSON.stringify(fs.map((f) => r[f]));
          if (seen.has(key)) return false;
          seen.add(key);
          return true;
        });
        break;
      }
      case "rename": {
        const pairs = args.split(/\s*,\s*/).map((s) => {
          const m = /^(\w+)\s+as\s+(\w+)$/i.exec(s);
          if (!m) throw new Error("Use rename old_name AS new_name.");
          return [m[1], m[2]];
        });
        rows = rows.map((r) => {
          const n = { ...r };
          pairs.forEach(([old, next]) => {
            if (Object.hasOwn(n, old)) {
              n[next] = n[old];
              delete n[old];
            }
          });
          return n;
        });
        break;
      }
      case "eval": {
        const assignments = splitOutside(args, ",").map((s) => {
          const m = /^(\w+)\s*=([\s\S]+)$/.exec(s);
          if (!m) throw new Error("Use eval new_field=expression.");
          if (["__proto__", "constructor", "prototype"].includes(m[1]))
            throw new Error("Choose a different output field name.");
          return { field: m[1], get: expression(m[2]) };
        });
        rows = rows.map((r) => {
          const n = { ...r };
          assignments.forEach((a) => {
            n[a.field] = a.get(n);
          });
          return n;
        });
        break;
      }
      case "fillnull": {
        const m = /^(?:value=("[^"]*"|[^\s]+)\s*)?(.*)$/.exec(args)!;
        const value: Value = m[1]
          ? /^-?\d+(\.\d+)?$/.test(m[1])
            ? Number(m[1])
            : m[1].replace(/^"|"$/g, "")
          : 0;
        const fields = fieldList(m[2]);
        if (!fields.length)
          throw new Error(
            'Name the fields to fill, for example fillnull value="anonymous" user.',
          );
        const schema = new Set(
          rows.flatMap((r) => Object.keys(r).filter((f) => r[f] !== null)),
        );
        rows = rows.map((r) => {
          const n = { ...r };
          fields.forEach((f) => {
            if (schema.has(f) && own(n, f) === null) n[f] = value;
          });
          return n;
        });
        break;
      }
      case "stats":
        rows = summarize(rows, aggregates(args));
        break;
      case "eventstats": {
        const spec = aggregates(args);
        const summaries = new Map(
          summarize(rows, spec).map((r) => [
            JSON.stringify(spec.by.map((f) => r[f])),
            r,
          ]),
        );
        rows = rows.map((r) => ({
          ...r,
          ...summaries.get(JSON.stringify(spec.by.map((f) => r[f]))),
        }));
        break;
      }
      case "streamstats": {
        const windowMatch = /^window=(\d+)\s+/.exec(args);
        const windowSize = windowMatch ? Number(windowMatch[1]) : 0;
        if (windowMatch) args = args.slice(windowMatch[0].length);
        const spec = aggregates(args);
        const histories = new Map<string, Row[]>();
        const globalHistory: Row[] = [];
        rows = rows.map((r) => {
          const key = JSON.stringify(spec.by.map((f) => own(r, f)));
          const history = histories.get(key) ?? [];
          history.push(r);
          histories.set(key, history);
          globalHistory.push(r);
          if (windowSize && globalHistory.length > windowSize)
            globalHistory.shift();
          const frame = windowSize
            ? globalHistory.filter(
                (x) => JSON.stringify(spec.by.map((f) => own(x, f))) === key,
              )
            : history;
          return {
            ...r,
            ...Object.fromEntries(
              spec.aggs.map((a) => [a.alias, aggregate(frame, a)]),
            ),
          };
        });
        break;
      }
      case "bin": {
        const m = /^span=(\w+)\s+(\w+)$/.exec(args);
        if (!m || m[2] !== "_time")
          throw new Error("This lab supports bin span=5m _time.");
        const span = spanSeconds(m[1]);
        rows = rows.map((r) => ({
          ...r,
          _time:
            r._time === null || r._time === undefined
              ? null
              : Math.floor(Number(r._time) / span) * span,
        }));
        break;
      }
      case "timechart": {
        const m =
          /^span=(\w+)\s+cont=false\s+fixedrange=false\s+([\s\S]+)$/.exec(args);
        if (!m)
          throw new Error(
            "For explicit bucket semantics in this lab, use timechart span=5m cont=false fixedrange=false count (optionally BY service).",
          );
        const span = spanSeconds(m[1]),
          spec = aggregates(m[2]);
        if (spec.by.length > 1 || spec.aggs.length !== 1)
          throw new Error(
            "This lab supports one timechart aggregation and one split field.",
          );
        const bucketed: Row[] = rows
          .filter((r) => r._time !== undefined && r._time !== null)
          .map((r) => ({
            ...r,
            _time: Math.floor(Number(r._time) / span) * span,
          }));
        if (!spec.by.length)
          rows = summarize(bucketed, { ...spec, by: ["_time"] });
        else {
          const split = spec.by[0],
            a = spec.aggs[0];
          const series = [
            ...new Set(
              bucketed
                .map((r) => r[split])
                .filter((v) => v !== null && v !== undefined)
                .map(String),
            ),
          ].sort();
          if (series.length > 10)
            throw new Error(
              "Keep the split field to ten values or fewer in this timechart lab.",
            );
          rows = [...group(bucketed, ["_time"]).values()].map((set) => ({
            _time: set[0]._time,
            ...Object.fromEntries(
              series.map((v) => [
                v,
                set.some((r) => String(r[split]) === v)
                  ? aggregate(
                      set.filter((r) => String(r[split]) === v),
                      a,
                    )
                  : null,
              ]),
            ),
          }));
        }
        rows.sort((a, b) => Number(a._time) - Number(b._time));
        break;
      }
      case "top":
      case "rare": {
        const m = /^(\d+)\s+(\w+)$/.exec(args);
        if (!m) throw new Error("Use top 3 service or rare 3 service.");
        const total = rows.filter((r) => own(r, m[2]) !== null).length;
        rows = summarize(rows, {
          aggs: [{ fn: "count", source: "", alias: "count" }],
          by: [m[2]],
        })
          .map((r): Row => ({ ...r, percent: (Number(r.count) / total) * 100 }))
          .sort(
            (a, b) =>
              (Number(a.count) - Number(b.count)) * (kind === "rare" ? 1 : -1),
          )
          .slice(0, Number(m[1]));
        break;
      }
      case "rex": {
        const m = /^field=(\w+)\s+"([\s\S]+)"$/.exec(args);
        if (!m)
          throw new Error('Use rex field=_raw "duration=(?<latency>\\d+)ms".');
        // Only a safe extraction subset: literal prefix, one named group, one character class, literal suffix.
        const match =
          /^([^()[\]{}*+?|\\^$]*)\(\?<([A-Za-z_]\w*)>(\\d|\\w|\[[A-Za-z0-9_\- ]+\])([+*]?)\)([^()[\]{}*+?|\\^$]*)$/.exec(
            m[2],
          );
        if (!match)
          throw new Error(
            "This browser lab allows a literal prefix/suffix and one named character-class capture, such as duration=(?<latency>\\d+)ms. Full PCRE requires Splunk.",
          );
        const re = new RegExp(m[2]);
        rows = rows.map((r) => {
          const hit = re.exec(String(r[m[1]] ?? ""));
          return hit?.groups ? { ...r, ...hit.groups } : { ...r };
        });
        break;
      }
      case "spath": {
        const m = /^input=(\w+)\s+path=([\w.]+)\s+output=(\w+)$/.exec(args);
        if (!m)
          throw new Error("Use spath input=payload path=region output=region.");
        rows = rows.map((r) => {
          let value: unknown;
          try {
            value = JSON.parse(String(r[m[1]]));
          } catch {
            return r;
          }
          for (const key of m[2].split("."))
            value =
              value && typeof value === "object"
                ? (value as Record<string, unknown>)[key]
                : undefined;
          return {
            ...r,
            [m[3]]:
              typeof value === "string" ||
              typeof value === "number" ||
              typeof value === "boolean"
                ? value
                : null,
          };
        });
        break;
      }
      case "makemv": {
        const m = /^delim="([^"]+)"\s+(\w+)$/.exec(args);
        if (!m) throw new Error('Use makemv delim="," tags.');
        rows = rows.map((r) => ({
          ...r,
          [m[2]]:
            own(r, m[2]) === null
              ? null
              : String(r[m[2]]).split(m[1]).filter(Boolean),
        }));
        break;
      }
      case "mvexpand": {
        if (
          rows.reduce(
            (total, r) =>
              total +
              (Array.isArray(r[args]) ? (r[args] as Value[]).length : 1),
            0,
          ) > 5000
        )
          throw new Error(
            "Expansion would exceed 5,000 rows. Filter before expanding.",
          );
        if (!/^\w+$/.test(args))
          throw new Error("Use mvexpand followed by one field.");
        rows = rows.flatMap((r) => {
          const value = r[args];
          return Array.isArray(value)
            ? value.map((v) => ({ ...r, [args]: v }))
            : [r];
        });
        break;
      }
      case "inputlookup": {
        if (ci !== 0)
          throw new Error("inputlookup must begin a search in this lab.");
        const source =
          args === "service_owners" ? owners : args === "users" ? users : null;
        if (!source)
          throw new Error("Available lookup tables: service_owners and users.");
        rows = clone(source);
        break;
      }
      case "lookup": {
        const m =
          /^(service_owners|users)\s+(\w+)\s+OUTPUT\s+([\w\s,]+)$/i.exec(args);
        if (!m)
          throw new Error(
            "Use lookup service_owners service OUTPUT team tier.",
          );
        const source = m[1] === "service_owners" ? owners : users;
        const fields = fieldList(m[3]);
        rows = rows.map((r) => {
          const hit = source.find(
            (s) => own(r, m[2]) !== null && s[m[2]] === r[m[2]],
          );
          return {
            ...r,
            ...Object.fromEntries(fields.map((f) => [f, hit?.[f] ?? null])),
          };
        });
        break;
      }
      case "join": {
        const m = /^(?:type=(inner|left)\s+)?(\w+)\s+\[([\s\S]+)\]$/.exec(args);
        if (!m)
          throw new Error("Use join type=left user [ | inputlookup users ].");
        const sub = runSPL(m[3], scenario, depth + 1).rows;
        rows = rows.flatMap((r) => {
          const found = sub.find(
            (s) => own(r, m[2]) !== null && s[m[2]] === r[m[2]],
          );
          return found ? [{ ...r, ...found }] : m[1] === "left" ? [r] : [];
        });
        break;
      }
      case "append": {
        const m = /^\[([\s\S]+)\]$/.exec(args);
        if (!m)
          throw new Error("Use append [ search index=auth | stats count ].");
        rows = [...rows, ...runSPL(m[1], scenario, depth + 1).rows];
        break;
      }
      default:
        throw new Error(
          `“${kind || command}” is not executable in this browser lab. See the field guide for supported commands; production-only commands have guided lessons.`,
        );
    }
    if (rows.length > 5000)
      throw new Error(
        "The practice result exceeds 5,000 rows. Filter before expanding.",
      );
    stages.push({
      command,
      rows: clone(rows),
      inputCount,
      kind,
      explanation: explanations[kind],
    });
  }
  return { rows, stages, columns: [...new Set(rows.flatMap(Object.keys))] };
}
export function resultsEqual(a: Row[], b: Row[], ordered = false): boolean {
  const normalize = (rows: Row[]) =>
    rows.map((r) =>
      JSON.stringify(
        Object.fromEntries(
          Object.entries(r)
            .sort(([a], [b]) => a.localeCompare(b))
            .map(([k, v]) => [
              k,
              typeof v === "number" ? Math.round(v * 1e6) / 1e6 : v,
            ]),
        ),
      ),
    );
  return (
    JSON.stringify(ordered ? normalize(a) : normalize(a).sort()) ===
    JSON.stringify(ordered ? normalize(b) : normalize(b).sort())
  );
}
