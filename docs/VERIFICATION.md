# Verification record

Verified on 2026-10-01 UTC (2026-09-30 America/Denver).

## Automated checks

- `npm run typecheck`: passed.
- `npm run lint`: passed.
- `npm test`: 128 tests passed, zero failures or skipped tests.
- `npm run build`: passed; produces `dist/`.

The suite executes every lesson's SPL example and actual SQLite comparison in both traffic scenarios, every authored challenge solution in both scenarios, and semantic regression cases. It covers Boolean precedence, missing values, time boundaries, event cardinality, lookup/join behavior, subsearches, multivalue expansion, safe wildcard handling, function validation, and progress persistence/corruption handling.

The bundle has an informational size warning (about 502 kB JavaScript before compression, 157 kB gzip). No build error is suppressed. SQLite WASM is loaded when a query runs.

## Browser checks performed

The app was exercised through a real browser using both the development server and the built static output.

- Desktop at 1280 pixels and mobile at 390 pixels; no document-level horizontal overflow at the tested mobile width.
- Mobile course menu opens, navigates directly to the advanced capstone, and closes after selection.
- Animation playback advances through real pipeline stages; keyboard Home scrubs back to the first stage.
- Basic lesson SPL and real SQLite return matching five-row results in the production build.
- Advanced capstone on incident traffic returns identical three-row results: checkout has 23 failures in 30 requests, or 76.67%.
- Incorrect challenge queries are rejected; a correct challenge plus correct quiz answers awards 100 XP. Reload preserves the completed lesson.
- Editing SQL to a DELETE statement is rejected. An unbounded recursive query is terminated after the four-second worker limit. Resetting and rerunning a valid query succeeds afterward.
- Searching the field guide for GROUP BY returns aggregation, group filtering, and time-bucket mappings.
- Feature-detected WebMCP fixture query execution and visible lesson navigation work in a supporting browser.
- Visual review of the final desktop layout and the responsive mobile lesson flow.

## Scope of these claims

These checks do not claim full Splunk compatibility, a formal accessibility audit, production-scale load testing, or execution of a real Splunk server. The PromQL reference application was reviewed from source; its external infrastructure was not executed. Reduced-motion styles are included, but OS-level reduced-motion emulation was not part of the recorded browser checks. Browser-local XP is a learning aid, not a tamper-resistant credential.
