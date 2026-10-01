# End-to-end review of the reference academy

Reference: [sivalinb/promql-zero-to-hero](https://github.com/sivalinb/promql-zero-to-hero)

Inspected commit: `47cdd10814582addac22ca44b513b1b8cc6e80a8`.

This is an architectural and educational source review used to design the SPL academy. The reference application's Prometheus bootstrap, external tutor providers, OIDC integration, GPU training, and deployment were not executed as part of this review. The verification reported elsewhere in this repository applies to the new SPL app.

## What the reference actually builds

The reference is a Python/Streamlit academy with eleven levels. Each level combines authored teaching material, an animated Canvas explanation, PromQL/SQL comparisons, a live lab, and a quiz plus query challenge. It includes a real Prometheus fixture engine, a restricted DuckDB query worker, SQLite learner progress, and optional retrieval/model-backed tutor features.

The learning journey is more substantial than a collection of documentation pages: a learner watches the concept, compares languages, executes a query, receives assessment feedback, and earns progress. That loop is the principal design carried into this application.

## Inspection by subsystem

| Subsystem | Evidence inspected | Assessment and adaptation |
| --- | --- | --- |
| Navigation and learning flow | `app.py`, `academy/style.css` | Overview, learning tabs, query lab, tutor, badges, and implementation information are coherent. The new app opens directly in a lesson, with a persistent course map and separate playground/field guide. |
| Curriculum model | `academy/models.py`, `content/curriculum.json`, `tests/test_curriculum.py` | Typed content includes explanations, takeaways, pitfalls, examples, sources, questions, and animation steps. The SPL app retains a typed, testable curriculum and expands to 28 smaller lessons across seven stages. |
| Illustrations | `academy/animations.py`, `academy/components/concept/index.html` | Playback, scrubbing, and narration make abstract time-series concepts tangible. The SPL app ties animations directly to interpreter traces, so a displayed transformation uses the same results as the query. |
| Query execution | `academy/engine.py`, `academy/data.py`, `academy/sql_worker.py`, `academy/sql_server.py` | Real Prometheus and DuckDB provide authoritative engine behavior for their respective languages. The SPL app deliberately uses a documented educational SPL subset and real browser SQLite, because no licensed Splunk instance was supplied. These are different execution guarantees and are labeled accordingly. |
| Fixtures | `data/samples.csv`, generation code, engine tests | Reproducible normal/incident scenarios make answers testable and expose hard-coded solutions. The SPL fixtures use fictional web/auth events, missing fields, metadata lookups, and a checkout incident. |
| Assessment and progress | `academy/progress.py`, quiz UI, progress tests | Reference grading is server-owned, checks both scenarios, verifies ownership and prerequisites, and awards progress idempotently. The new app checks actual results in both scenarios and awards once, but browser-local progress is intentionally not tamper-resistant certification. |
| Retrieval and tutor | `academy/retrieval.py`, `academy/tutor.py`, evaluation report | The reference retrieves evidence, validates tool plans, bounds execution, and has a reference fallback. The evaluation honestly reports that its authored hybrid baseline did not outperform BM25. The user requested an educational SPL site, so this implementation invests in authored explanations and exercises rather than adding an unrequested model service. |
| Optional training | `training/README.md`, training assets, evaluation documentation | The reference distinguishes a training pipeline from a claimed trained artifact. No fine-tuning or model-quality claims are inherited by this app. |
| Security | `academy/security.py`, worker code, `docs/SECURITY.md`, Compose | The reference isolates query workers, restricts SQL syntax/functions, limits resources, and avoids exposing production services. The new app keeps all work in synthetic fixtures, uses a disposable SQLite worker, bounds query size/results, and does not evaluate user text as JavaScript. |
| Operations and tests | README, Dockerfile, Compose, bootstrap scripts, `.github/workflows/tests.yml`, tests | The reference documents native/Docker setup and checks its real engines. The new app provides a zero-backend static build, pinned npm lockfile, and CI for type checking, linting, semantic tests, SQL parity, and build artifacts. |

## Design decisions for the SPL app

- Start before query syntax: define an event, a field, an index, and event time without assuming SQL knowledge.
- Explain each keyword in context, then show what it does to rows and fields.
- Keep the languages adjacent, with runnable comparisons rather than static screenshots.
- Teach differences explicitly: Boolean precedence, missing grouping keys, deduplication, join cardinality, time boundaries, and window frames.
- Make all lessons available immediately so experienced learners can jump to an advanced topic.
- Use normal and incident fixtures for both comparisons and assessment.
- Label production-only concepts. An animated tstats explanation is not evidence that a distributed Splunk search ran.
- Link official sources per lesson and keep original teaching prose in the repository.

## Limits that should remain visible

The new interpreter is tested against this authored curriculum; parity with SQLite is not a proof of complete Splunk compatibility. Production-scale performance, license behavior, distributed execution, search-time configuration, PCRE compatibility, alert delivery, and real index/data-model acceleration require a real Splunk environment.

The current app fulfills the requested visual learning experience without requiring that infrastructure. A future real-Splunk integration should preserve the synthetic sandbox and add a clearly separated, authenticated backend with explicit access controls and query budgets.
