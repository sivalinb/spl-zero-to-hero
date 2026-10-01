import { test } from "node:test";
import assert from "node:assert/strict";
import initSqlJs from "sql.js";
import { lessons, modules } from "../lib/academy/curriculum";
import { events, owners, users, type Row } from "../lib/academy/data";
import { runSPL, resultsEqual } from "../lib/academy/engine";
import { expression } from "../lib/academy/expression";
import { parseProgress } from "../lib/academy/progress";
const SQL = await initSqlJs();
function database(scenario: "normal" | "incident") {
  const db = new SQL.Database();
  for (const [name, rows] of Object.entries({
    events: events(scenario).map(({ index, ...r }) => ({
      ...r,
      index_name: index,
    })),
    service_owners: owners,
    users,
  })) {
    const cols = [...new Set(rows.flatMap(Object.keys))];
    db.run(
      `CREATE TABLE ${name} (${cols.map((c) => `"${c}" ${rows.some((r) => typeof (r as Record<string, unknown>)[c] === "number") ? "REAL" : "TEXT"}`).join(",")})`,
    );
    const s = db.prepare(
      `INSERT INTO ${name} VALUES (${cols.map(() => "?").join(",")})`,
    );
    for (const row of rows)
      s.run(
        cols.map(
          (c) => (row as Record<string, string | number | null>)[c] ?? null,
        ),
      );
    s.free();
  }
  return db;
}
test("Curriculum: complete, unique, and sequential, with meaningful activities", () => {
  assert.equal(lessons.length, 28);
  assert.equal(modules.length, 7);
  assert.equal(new Set(lessons.map((l) => l.id)).size, 28);
  for (const lesson of lessons) {
    assert.equal(lesson.questions.length, 2);
    assert.ok(lesson.body.join(" ").length > 250);
    assert.ok(lesson.keywords.length >= 4);
    assert.ok(lesson.source.startsWith("https://help.splunk.com/"));
    assert.ok(lesson.challenge && lesson.solution && lesson.hint);
  }
});
for (const scenario of ["normal", "incident"] as const) {
  const db = database(scenario);
  for (const lesson of lessons) {
    test(`${scenario}: ${lesson.id} SPL equals actual SQLite`, () => {
      const spl = runSPL(lesson.spl, scenario);
      const result = db.exec(lesson.sql)[0];
      const sql = result
        ? result.values.map((row) =>
            Object.fromEntries(result.columns.map((c, i) => [c, row[i]])),
          )
        : [];
      assert.ok(
        resultsEqual(spl.rows, sql as Row[]),
        JSON.stringify({ spl: spl.rows.slice(0, 3), sql: sql.slice(0, 3) }),
      );
      assert.ok(
        spl.stages.every((s) => Array.isArray(s.rows) && s.explanation),
      );
    });
    test(`${scenario}: ${lesson.id} solution runs and does not mutate fixtures`, () => {
      const before = JSON.stringify(events(scenario));
      const r = runSPL(lesson.solution, scenario);
      assert.ok(Array.isArray(r.rows));
      assert.equal(JSON.stringify(events(scenario)), before);
    });
  }
}
test("search uses OR before AND, unlike where", () => {
  const a = runSPL(
    "index=web service=checkout AND status=200 OR status=500",
  ).rows;
  assert.ok(a.every((r) => r.service === "checkout"));
  const b = runSPL(
    'index=web | where service="checkout" AND status=200 OR status=500',
  ).rows;
  assert.ok(b.some((r) => r.service !== "checkout"));
});
test("NOT includes missing fields while != excludes them", () => {
  const a = runSPL("index=web NOT user=ava").rows;
  const b = runSPL("index=web user!=ava").rows;
  assert.ok(a.some((r) => r.user === null));
  assert.ok(b.every((r) => r.user !== null));
});
test("Search wildcards, phrases, and literal injection strings", () => {
  assert.ok(
    runSPL("index=web service=pay*").rows.every(
      (r) => r.service === "payments",
    ),
  );
  assert.ok(
    runSPL('index=web "upstream timeout"').rows.every(
      (r) => Number(r.status) >= 500,
    ),
  );
  assert.equal(expression('"window.alert(1)"')({}), "window.alert(1)");
});
test("Nulls propagate and Boolean expressions follow three-valued logic", () => {
  assert.equal(expression("missing!=2")({}), null);
  assert.equal(expression("NOT missing")({}), null);
  assert.equal(expression("missing AND false()")({}), false);
  assert.equal(expression("missing OR true()")({}), true);
  assert.equal(expression("1/0")({}), null);
  assert.equal(expression('coalesce(missing,"fallback")')({}), "fallback");
});
test("eventstats preserves cardinality; stats collapses it; streamstats respects order", () => {
  assert.equal(
    runSPL("index=web | eventstats count AS requests by service").rows.length,
    180,
  );
  assert.equal(runSPL("index=web | stats count by service").rows.length, 3);
  const r = runSPL("index=web | sort 0 _time id | streamstats count AS n").rows;
  assert.equal(r[0].n, 1);
  assert.equal(r.at(-1)?.n, 180);
});
test("time boundaries are inclusive/exclusive and buckets are aligned", () => {
  assert.equal(runSPL("index=web earliest=-15m latest=now").rows.length, 45);
  const r = runSPL(
    "index=web | bin span=15m _time | stats count by _time",
  ).rows;
  assert.equal(r.length, 4);
  assert.ok(r.every((x) => x.count === 45));
});
test("lookup preserves unmatched rows; inner join drops them", () => {
  assert.equal(
    runSPL("index=auth | lookup service_owners service OUTPUT team").rows
      .length,
    24,
  );
  assert.equal(
    runSPL("index=auth | join service [ | inputlookup service_owners ]").rows
      .length,
    0,
  );
});
test("mvexpand changes cardinality and pipes in quoted strings do not split", () => {
  assert.equal(
    runSPL('index=web | eval tags=split(tags,",") | mvexpand tags').rows.length,
    360,
  );
  assert.equal(
    runSPL('index=web | head 1 | eval text="a|b" | table text').rows[0].text,
    "a|b",
  );
});
test("unsupported syntax, malformed inputs, and unsafe regex reject clearly", () => {
  for (const query of [
    "",
    "index=web | delete",
    "index=web | where duration>",
    "index=web | stats avg(",
    'index=web | rex field=_raw "(?<bad>(a+)+)"',
    "index=web | head 1 |",
  ])
    assert.throws(() => runSPL(query));
});
test("numeric tolerance and order-sensitive assessment", () => {
  assert.ok(resultsEqual([{ x: 1 / 3 }], [{ x: 0.333333333 }]));
  assert.ok(resultsEqual([{ x: 1 }, { x: 2 }], [{ x: 2 }, { x: 1 }]));
  assert.ok(!resultsEqual([{ x: 1 }, { x: 2 }], [{ x: 2 }, { x: 1 }], true));
});
test("corrupt browser progress does not break the app", () => {
  assert.deepEqual(parseProgress("bad"), {});
  assert.deepEqual(parseProgress("[]"), {});
  assert.deepEqual(parseProgress('{"lesson":false}'), {});
});
test("function syntax is checked even when the input set is empty", () => {
  assert.throws(() => runSPL("index=none | eval x=unknown()"), /not supported/);
  assert.throws(() => runSPL("index=none | eval x=if(1,2)"), /arguments/);
  assert.throws(
    () => runSPL("| tstats count WHERE index=web"),
    /requires Splunk/,
  );
});
test("wildcards are bounded and literal wildcard input is handled correctly", () => {
  assert.equal(expression('like("***", "%")')({}), true);
  assert.equal(expression('like("checkout", "c_e%")')({}), true);
  assert.equal(expression('like("checkout", "%payment%")')({}), false);
  assert.equal(
    runSPL("index=web service=" + "*a".repeat(300) + "b").rows.length,
    0,
  );
});
test("streamstats window defaults to a global event window even with BY", () => {
  const r = runSPL(
    "index=web | sort 0 _time id | streamstats window=2 count AS n by service",
  ).rows;
  assert.ok(r.every((row) => row.n === 1));
});
test("count(field) counts false values and oversized expansion rejects before copying rows", () => {
  assert.equal(
    runSPL("index=web | eval flag=false() | stats count(flag) AS n").rows[0].n,
    180,
  );
  assert.throws(
    () =>
      runSPL(
        'index=web | eval many=split("' +
          "a,".repeat(40) +
          'a",",") | mvexpand many',
      ),
    /exceed/,
  );
});
