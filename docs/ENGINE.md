# Practice-engine contract

The curriculum teaches classic Splunk SPL. The browser interpreter implements a deliberate subset and returns every intermediate result for animation. It is not SPL2, a general SQL translator, or a replacement for a real Splunk parser.

## Data and time

`events()` returns a fresh deterministic array: 180 web requests and 24 authentication records, ordered newest first with id as a tie-breaker. There are normal and incident scenarios. The clock is fixed at 2025-01-15 10:00 UTC. SQL uses the same records, with `index` renamed to `index_name`.

Supported relative modifiers are integer seconds, minutes, hours, or days, optional @h/@d snapping, Unix timestamps, and now. earliest is inclusive; latest is exclusive. This is a classroom subset, not full Splunk time syntax.

## Supported forms

| Command | Supported classroom form |
| --- | --- |
| search | Keywords/phrases, scalar field comparisons, * wildcards, parentheses, AND/OR/NOT, time modifiers, one terminal filter subsearch |
| where | Parsed scalar expressions and supported eval functions |
| table | Explicit field names in display order |
| fields | Explicit inclusion or removal list; positive lists retain _time and _raw |
| head | A nonnegative integer |
| sort | Optional integer limit, signed field names, stable ordering; default limit 10,000, subject to the lab row cap |
| dedup | Explicit field keys, keep first, exclude missing keys |
| rename | old AS new, with comma-separated pairs |
| eval | Comma-separated assignments, evaluated left to right |
| fillnull | value=... followed by explicit fields; a field must have a non-null schema value |
| stats | count, sum, avg, min, max, dc, values, list, first, last; optional BY scalar keys |
| eventstats | Same aggregates, attached to original rows |
| streamstats | Running aggregates, optional window=N and BY; the window is global by default |
| bin | span=<positive number><s/m/h/d> _time |
| timechart | Explicit span, cont=false fixedrange=false; one aggregate, optional single split field with at most ten values |
| top / rare | Integer limit and one field; count and percentage |
| rex | field=... and one named character-class capture, with literal prefix/suffix |
| spath | input=... path=dotted.json.key output=... |
| makemv | delim="..." field |
| mvexpand | One named field; reject oversized expansion before copying rows |
| lookup | service_owners or users, one key, OUTPUT explicit fields |
| inputlookup | Start a search from service_owners or users |
| join | Optional type=inner/left, one key and subsearch; first matching right row |
| append | Add rows from one bracketed subsearch |

Supported eval functions: if, case, true, false, null, isnull, isnotnull, coalesce, round, abs, lower, upper, len, tonumber, tostring, split, mvcount, mvindex, in, and like. Missing values propagate through arithmetic/comparisons. AND/OR use null-aware Boolean behavior.

The interpreter does not support every option of these commands. Multivalue grouping keys must be expanded first. tstats, transaction, chart, acceleration, scheduler actions, arbitrary lookups, and network/file commands are not implemented. Unsupported forms should fail with a helpful message; report an issue if an unsupported form is accepted with a misleading result.

## Resource boundaries

- Query length: 6,000 characters.
- Pipeline length: at most 25 complete commands.
- Nested subsearch depth: at most two.
- Result size: at most 5,000 rows.
- Regex: a constrained extraction grammar, no user-supplied nested quantifiers or arbitrary regex.
- Wildcards: a dedicated matcher instead of compiling user patterns to backtracking regular expressions.
- SQL: a fresh SQLite database inside a Web Worker, one read-only SELECT/WITH statement, 5,000-row cap, four-second timeout, worker termination after every run.

The SPL interpreter runs on the main thread over the small fixture. These bounds are designed for this classroom data, not hostile multi-tenant server execution.

## Comparing results

Comparison normalizes column order and numeric values to six decimal places, then compares complete rows as a multiset. The UI explicitly says that row order is ignored. Sorting-focused practical tasks can require ordered results. Counts, field names, missing values, and row multiplicity remain significant.

Passing a practice challenge requires correct quiz answers and matching results in both scenarios. The expected solution is run, not matched as a query string. Equivalent supported queries can pass. This is educational feedback, not a secure examination system.
