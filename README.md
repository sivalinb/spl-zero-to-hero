# SPL Zero to Hero

**Learn Splunk SPL by watching data change, comparing it with SQL, and solving real query tasks.**

28 lessons · 7 stages · 56 knowledge checks · 28 practical challenges · 2 traffic scenarios

An independent, interactive academy for people starting from zero and analysts building advanced investigation skills. You do not need to know SQL, install Splunk, or supply an API key.

## The learning loop

1. **Watch & understand.** Play, pause, scrub, and change the speed of a narrated pipeline animation. The illustration, row counts, charts, and tables come from the actual practice query's intermediate results.
2. **Connect to SQL.** Edit and run SPL and SQLite against the same synthetic events. Compare actual results and read the limits of the analogy.
3. **Try it yourself.** Answer two questions and solve a query challenge. Completion requires correct answers and matching query results in both normal and incident scenarios. Each lesson awards 100 XP once.

All lessons are accessible immediately. Progress is saved only in the current browser. The app supports phone and desktop layouts, keyboard navigation, reduced motion, a searchable SQL/SPL field guide, and a standalone query playground.

## What you learn

| Stage | Topics |
| --- | --- |
| Foundations | Events, fields, indexes, first searches, pipes, keywords, wildcards |
| Find & focus | Boolean logic, search vs. where, projection, renaming, sorting, deduplication |
| Shape your data | eval, if/case, missing values, regex extraction, JSON extraction |
| Summarize & compare | stats, grouped thresholds, eventstats, streamstats |
| Think in time | Relative ranges, binning, timechart, moving averages |
| Connect the dots | Lookups, joins, subsearch filters, multivalue fields |
| Investigate like a pro | Efficient searches, tstats concepts, session correlation, alert signals, incident capstone |

## Run locally

Node.js 22.13+ is required. Node 22 is used by CI.

```bash
git clone https://github.com/sivalinb/spl-zero-to-hero.git
cd spl-zero-to-hero
npm ci --registry=https://registry.npmjs.org
npm run dev
```

Open the local URL printed by the server, normally `http://127.0.0.1:5173`.

For a completely static build:

```bash
npm run build:static
npm run preview:static
```

Deploy the contents of `dist/` to any static host. Lesson navigation uses URL hashes, so it needs no server rewrite rules. To deploy beneath a path, build with `npm run build:static -- --base=/your-path/`; the SQLite worker and assets respect that base.

The supported delivery path is the static build. The original Vinext / Cloudflare scaffold remains available for future server-backed extensions; it is not needed by the academy. The teaching experience has no backend, authentication, external connectors, or database service dependency. A hosted preview may separately be protected by its hosting platform.

## Know the boundaries

**The SPL side is an educational interpreter, not a Splunk server.** It supports documented forms of 25 commands. Unknown commands and unsupported forms are rejected where validated. The field guide explains limits, and the engine is tested against the authored curriculum rather than certified against every Splunk behavior.

**The SQL side is actual SQLite**, bundled through sql.js / WebAssembly and executed in a disposable Web Worker. It accepts one read-only SELECT/WITH statement, caps results at 5,000 rows, and terminates after four seconds. It is SQLite syntax, not a promise of compatibility with every SQL database.

Important distinctions are taught explicitly:

- `search` evaluates OR before AND; `where` and `eval` evaluate AND before OR.
- Missing fields, empty strings, and zero are different values.
- `stats`, `eventstats`, and `streamstats` have different effects on event cardinality and context.
- `dedup` chooses a representative event; it is not simply SQL `DISTINCT`.
- Joins have different default match limits and production constraints.
- Time ranges have inclusive lower and exclusive upper boundaries.
- The classroom clock is fixed at **2025-01-15 10:00 UTC**. Bucketing uses fixed UTC seconds.
- `tstats`, `transaction`, acceleration, distributed execution, and alert scheduling have guided production explanations. They are not falsely presented as live Splunk execution.
- The `rex` subset supports one named character-class capture with literal surroundings, avoiding unbounded regex execution.
- Lookups are limited to bundled `service_owners` and `users` tables. No files, network services, or production logs are queried.

See [engine scope](docs/ENGINE.md) and [security boundaries](docs/SECURITY.md).

## The data

Each scenario contains 180 web requests and 24 authentication events, generated deterministically in `lib/academy/data.ts`. Services are checkout, payments, and catalog, with fictional users and teams. The incident raises checkout latency and server errors after 09:30. The fixture contains no private operational data.

SPL uses `index=web`; SQL uses `events.index_name='web'`. The SQL fixture has three tables: `events`, `service_owners`, and `users`.

## Verify

```bash
npm run typecheck
npm run lint
npm test
npm run build:static
```

Tests execute all 28 lesson pairs against real SQLite in both scenarios, exercise all challenge solutions, and check parser semantics, missing values, time boundaries, cardinality, unsupported input, and progress corruption. See [verification notes](docs/VERIFICATION.md) for what was actually tested and what is not claimed.

## Project map

```text
components/academy.tsx        Learning experience, animations, labs, assessments
lib/academy/curriculum.ts     28 original lessons, questions, solutions, references
lib/academy/data.ts           Deterministic normal and incident fixtures
lib/academy/engine.ts         SPL pipeline interpreter and intermediate traces
lib/academy/expression.ts     Expression parser; no JavaScript eval
lib/academy/pattern.ts        Bounded wildcard matcher
lib/academy/sql.ts            Browser worker lifecycle and timeout
lib/academy/progress.ts       Browser-local completion persistence
lib/academy/webmcp.ts         Optional browser-agent tools (feature-detected)
public/sqlite/                Bundled SQLite WASM, worker, upstream license
app/globals.css               Responsive theme, motion, and reduced-motion styles
tests/academy.test.ts         Curriculum parity and semantic regression checks
vite.static.config.ts        Portable static build
.github/workflows/checks.yml  Type, lint, tests, build, downloadable build artifact
```

The optional WebMCP integration exposes lesson listing, bounded fixture queries, and visible lesson navigation when `document.modelContext` is available. It cannot award achievements or change saved progress.

## Inspiration and sources

The learning loop was inspired by [PromQL Zero to Hero](https://github.com/sivalinb/promql-zero-to-hero). The [end-to-end reference review](docs/REFERENCE_REVIEW.md) explains the inspected architecture and the choices made for this SPL application.

Lessons are original explanations with links to [Splunk's official command reference](https://help.splunk.com/en/splunk-enterprise/spl-search-reference/9.3/quick-reference/command-quick-reference), [SPL for SQL users](https://help.splunk.com/en/splunk-enterprise/spl-search-reference/9.3/quick-reference/splunk-spl-for-sql-users), and [SQLite documentation](https://www.sqlite.org/lang.html). Splunk documentation is linked, not republished as a bundled corpus.

MIT for original code and content. Third-party components retain their licenses; see [NOTICE.md](NOTICE.md). This project is not affiliated with or endorsed by Splunk or Cisco.
