export type Question = {
  prompt: string;
  options: string[];
  answer: number;
  why: string;
};
export type Lesson = {
  id: string;
  module: number;
  title: string;
  subtitle: string;
  minutes: number;
  idea: string;
  body: string[];
  keywords: [string, string][];
  spl: string;
  sql: string;
  bridge: string;
  caution: string;
  challenge: string;
  solution: string;
  hint: string;
  questions: Question[];
  source: string;
  production?: { title: string; query: string; steps: [string, string][] };
};
export const modules = [
  {
    name: "Foundations",
    level: "Beginner",
    description: "Read your first event. Write your first search.",
  },
  {
    name: "Find & focus",
    level: "Beginner",
    description: "Keep the right events and the right fields.",
  },
  {
    name: "Shape your data",
    level: "Intermediate",
    description: "Calculate, extract, and clean your fields.",
  },
  {
    name: "Summarize & compare",
    level: "Intermediate",
    description: "Turn many events into useful answers.",
  },
  {
    name: "Think in time",
    level: "Intermediate",
    description: "Find patterns, trends, and changes.",
  },
  {
    name: "Connect the dots",
    level: "Advanced",
    description: "Enrich events and combine searches.",
  },
  {
    name: "Investigate like a pro",
    level: "Advanced",
    description: "Apply the pieces to real investigation patterns.",
  },
];
const doc = (command: string) =>
  `https://help.splunk.com/en/splunk-enterprise/spl-search-reference/9.3/search-commands/${command}`;
const q = (
  prompt: string,
  options: string[],
  answer: number,
  why: string,
): Question => ({ prompt, options, answer, why });
export const lessons: Lesson[] = [
  {
    id: "events",
    module: 0,
    title: "Events, fields & indexes",
    subtitle: "A little context makes every search easier.",
    minutes: 5,
    idea: "An event is a moment, captured.",
    body: [
      "A request hits your website. A payment succeeds. A server reports an error. Each of these moments can become an event: a timestamp plus the data recorded at that moment.",
      "Fields give names to pieces of an event. In our web logs, service tells you which application handled the request, status is its HTTP response code, and duration is how long it took in milliseconds. _raw holds the original text and _time holds event time.",
      "An index is a collection Splunk searches. This lab has web and auth indexes. Events do not need identical fields: authentication events have no request duration. Start by choosing an index, then inspect a few events.",
    ],
    keywords: [
      ["event", "One timestamped record. Think of a single log entry."],
      ["field", "A named value inside an event, such as status=200."],
      ["index", "A searchable collection of indexed events."],
      ["_raw / _time", "The original event text and its timestamp."],
    ],
    spl: "index=web\n| table _time service status duration\n| head 5",
    sql: "SELECT _time, service, status, duration\nFROM events\nWHERE index_name = 'web'\nORDER BY _time DESC, id DESC\nLIMIT 5;",
    bridge:
      "A result resembles a SQL row, and a field resembles a column. Here, index_name scopes the synthetic SQL table to the same collection. ORDER BY makes the latest-five comparison deterministic.",
    caution:
      "An index is not a SQL table. Splunk can extract fields at search time and events may have different shapes. This course teaches classic SPL; SPL2 has distinct syntax.",
    challenge: "Show the latest 3 web events with only service and status.",
    solution: "index=web | head 3 | table service status",
    hint: "Start with index=web, keep three events, then select two fields.",
    questions: [
      q(
        "What is an event?",
        [
          "One timestamped record",
          "An entire database",
          "Only an error message",
        ],
        0,
        "Successful requests, errors, and sign-ins can all be events.",
      ),
      q(
        "Which field stores event time?",
        ["duration", "_time", "index"],
        1,
        "_time is event time. duration measures how long a request took.",
      ),
    ],
    source: doc("search"),
  },
  {
    id: "first-search",
    module: 0,
    title: "Your first search",
    subtitle: "Ask a specific question of your logs.",
    minutes: 5,
    idea: "A search is a question with conditions.",
    body: [
      "Suppose you want to find failed requests. Begin with index=web to choose the event collection. Add status>=500 to keep server errors.",
      "At the beginning of a classic SPL query, search is implied. You can write index=web instead of search index=web. Space-separated conditions imply AND, so both the index and status conditions must match.",
      "Run the query on normal traffic, then switch to the incident. The query stays the same while its results change. That is the point of a useful search.",
    ],
    keywords: [
      ["search", "Find events that match your conditions."],
      ["=", "Match a field to a value."],
      [">=", "Greater than or equal to."],
      ["implied AND", "Adjacent search terms must both match."],
    ],
    spl: "index=web status>=500\n| table _time service status\n| head 8",
    sql: "SELECT _time, service, status FROM events\nWHERE index_name = 'web' AND status >= 500\nORDER BY _time DESC, id DESC LIMIT 8;",
    bridge:
      "A base-search condition often resembles a SQL WHERE predicate. SQL names the source in FROM; SPL begins with search terms, including index selection.",
    caution:
      "A 404 is a client error, while a 500 is a server error. Choose >=400 only when you intend to include both.",
    challenge: "Count all web requests with status 404. Name the result count.",
    solution: "index=web status=404 | stats count",
    hint: "Change the comparison to status=404, then pipe into stats count.",
    questions: [
      q(
        "What does index=web status>=500 mean?",
        [
          "Any web event OR any server error",
          "Web events with status at least 500",
          "Only status 500 from every index",
        ],
        1,
        "Adjacent terms in search imply AND.",
      ),
      q(
        "Must you write search at the start?",
        ["Always", "Only after stats", "No, classic SPL implies it"],
        2,
        "The first generating search command is implied in a normal classic SPL search.",
      ),
    ],
    source: doc("search"),
  },
  {
    id: "pipes",
    module: 0,
    title: "The power of the pipe",
    subtitle: "Build an answer one small operation at a time.",
    minutes: 6,
    idea: "Each command hands its results to the next.",
    body: [
      "The vertical bar | is a pipe. It sends the results on its left to the command on its right. Read an SPL pipeline from left to right.",
      "This search selects errors, counts them per service, and sorts the counts. After stats, the original events are gone: only service and errors remain. A later command cannot use duration unless you preserved or aggregated it.",
      "A SQL query often describes the complete result in one statement. A useful way to compare longer SPL pipelines is to write SQL common table expressions, where each CTE corresponds to one intermediate result.",
    ],
    keywords: [
      ["|", "Pass results to the next command."],
      ["stats", "Replace events with summary rows."],
      ["by", "Form one group per distinct field value."],
      ["AS", "Name a calculated field."],
    ],
    spl: "index=web status>=400\n| stats count AS errors by service\n| sort -errors",
    sql: "SELECT service, COUNT(*) AS errors\nFROM events\nWHERE index_name = 'web' AND status >= 400\nGROUP BY service\nORDER BY errors DESC;",
    bridge:
      "WHERE filters the input, GROUP BY creates service groups, and ORDER BY sorts the summary. Watch the row count shrink after stats.",
    caution:
      "Command order changes meaning. head 5 before stats counts only five events; after stats it keeps five summary rows.",
    challenge:
      "Count every web request by service, call the count requests, then show the largest counts first.",
    solution: "index=web | stats count AS requests by service | sort -requests",
    hint: "Remove the status filter and rename the aggregation with AS requests.",
    questions: [
      q(
        "What does the pipe transfer?",
        [
          "The original index every time",
          "The results of the preceding command",
          "Only field names",
        ],
        1,
        "Each command receives the current result set.",
      ),
      q(
        "After stats count by service, can you sort by duration?",
        [
          "Yes, all event fields remain",
          "Only if duration is a string",
          "No, duration was not retained",
        ],
        2,
        "stats outputs grouping fields and requested aggregates, not original event fields.",
      ),
    ],
    source: doc("stats"),
  },
  {
    id: "keywords",
    module: 0,
    title: "Keywords & wildcards",
    subtitle: "Find words and families of field values.",
    minutes: 5,
    idea: "Sometimes the clue is in the raw message.",
    body: [
      "A bare keyword such as ERROR looks for that text in events. A field search such as service=pay* narrows a named field; the asterisk stands for zero or more characters.",
      'Quote phrases containing spaces. index=web "upstream timeout" asks for that phrase in web events. Combine a keyword with field conditions when you know both the symptom and the source.',
      "The lab uses case-insensitive raw-text matching for keywords and field-value search. Production Splunk tokenization has additional rules around punctuation, indexed terms, and wildcards.",
    ],
    keywords: [
      ["ERROR", "A raw-event keyword search."],
      ['"upstream timeout"', "A phrase containing spaces."],
      ["*", "A wildcard in search values."],
      ["service=pay*", "A service field whose value starts with pay."],
    ],
    spl: "index=web service=pay* ERROR\n| table service status _raw",
    sql: "SELECT service, status, _raw FROM events\nWHERE index_name = 'web'\n  AND service LIKE 'pay%'\n  AND LOWER(_raw) LIKE '%error%';",
    bridge:
      "SQL LIKE uses % for any sequence of characters. Here it searches an explicit column; an unqualified SPL keyword searches event text.",
    caution:
      'The asterisk is not a where wildcard. Use like(service,"pay%") in where. Avoid expensive leading wildcards in production searches.',
    challenge:
      "Find all web events whose service starts with cat; show service and status.",
    solution: "index=web service=cat* | table service status",
    hint: "Use cat* as the field value.",
    questions: [
      q(
        "Which is a valid search wildcard?",
        ["service=pay*", "service LIKE pay", "service=%pay"],
        0,
        "Classic search uses * in field values.",
      ),
      q(
        "How do you search a phrase?",
        ["Put it in double quotes", "Remove its spaces", "Add GROUP BY"],
        0,
        "Double quotes keep a phrase together.",
      ),
    ],
    source: doc("search"),
  },
  {
    id: "boolean",
    module: 1,
    title: "AND, OR & NOT",
    subtitle: "Make your intentions unambiguous.",
    minutes: 7,
    idea: "Parentheses are your best debugging tool.",
    body: [
      "AND requires both conditions. OR accepts either condition. NOT excludes the condition immediately after it; parentheses extend its scope to a group.",
      "Classic search evaluates OR before AND. where and eval evaluate AND before OR, like SQL. Do not rely on memorizing this when a pair of parentheses can make your meaning explicit.",
      "The example keeps web events for checkout or payments, then excludes successful status 200. Read it aloud and compare the events that remain.",
    ],
    keywords: [
      ["AND", "Both conditions must match. Implied between search terms."],
      ["OR", "Either condition may match."],
      ["NOT", "Exclude a matching condition."],
      ["( )", "Choose which conditions belong together."],
    ],
    spl: "index=web (service=checkout OR service=payments) NOT status=200\n| stats count by service",
    sql: "SELECT service, COUNT(*) AS count FROM events\nWHERE index_name = 'web'\n  AND (service = 'checkout' OR service = 'payments')\n  AND status <> 200\nGROUP BY service;",
    bridge:
      "These explicitly grouped predicates select the same sample events. Parentheses remove the precedence difference.",
    caution:
      "NOT field=value can include events where the field is missing. field!=value requires the field to exist. SQL NULL comparisons also need explicit thought.",
    challenge:
      "Count web events for checkout or catalog with status>=400, grouped by service.",
    solution:
      "index=web (service=checkout OR service=catalog) status>=400 | stats count by service",
    hint: "Keep OR conditions in parentheses and use an adjacent status condition.",
    questions: [
      q(
        "Which operator is evaluated first in classic search?",
        ["AND", "OR", "They always run left to right"],
        1,
        "search evaluates OR before AND. where and eval reverse that ordering.",
      ),
      q(
        "How should you remove ambiguity?",
        [
          "Use parentheses",
          "Use all lowercase operators",
          "Add more pipes at random",
        ],
        0,
        "Explicit grouping makes intent clear in SPL and SQL.",
      ),
    ],
    source:
      "https://help.splunk.com/splunk-enterprise/search/search-manual/9.1/expressions-and-predicates/boolean-expressions-with-logical-operators",
  },
  {
    id: "where",
    module: 1,
    title: "search vs. where",
    subtitle: "Know when a value is text and when it is a field.",
    minutes: 7,
    idea: "where evaluates an expression for each event.",
    body: [
      "search is designed around keywords and field-value matching. where evaluates expressions: calculations, functions, and comparisons between fields.",
      'In where, double quotes mean a string. An unquoted identifier refers to a field. Use where duration>200 AND service="checkout" to test a number and a string.',
      "Use base-search filters to narrow indexed data early. Use where for calculated fields and richer conditions later in the pipeline.",
    ],
    keywords: [
      ["where", "Keep rows whose expression is true."],
      ['"checkout"', "A literal string in an eval expression."],
      ["duration", "An unquoted field reference."],
      ['like(field,"pattern%")', "Pattern matching inside where."],
    ],
    spl: 'index=web\n| where duration>200 AND like(service,"pay%")\n| table service duration',
    sql: "SELECT service, duration FROM events\nWHERE index_name = 'web'\n  AND duration > 200 AND service LIKE 'pay%';",
    bridge:
      "This where expression is close to SQL WHERE. SQL string literals use single quotes; SPL eval expressions use double quotes.",
    caution:
      "search service=host compares service to the literal word host. where service=host compares two fields. Missing fields produce a null result that does not pass where.",
    challenge:
      "Show service and duration for web events with duration>350 and status=200.",
    solution:
      "index=web | where duration>350 AND status=200 | table service duration",
    hint: "Use an explicit AND in the where expression.",
    questions: [
      q(
        "In where service=host, host means…",
        [
          "The literal string host",
          "The value of the host field",
          "Any server",
        ],
        1,
        "Unquoted identifiers in where are field references.",
      ),
      q(
        "Which wildcard works in where?",
        ["service=pay*", 'like(service,"pay%")', "service~pay"],
        1,
        "Use the like function and SQL-style % wildcard.",
      ),
    ],
    source: doc("where"),
  },
  {
    id: "projection",
    module: 1,
    title: "Choose & rename fields",
    subtitle: "Make results readable and intentional.",
    minutes: 5,
    idea: "A useful table shows only what you need.",
    body: [
      "table lists fields in the order you want to display them. It is the simplest way to inspect a result without dozens of irrelevant columns.",
      "fields limits or removes fields earlier in a pipeline. fields - _raw removes the raw message. Unlike table, a positive fields list normally retains internal _raw and _time fields.",
      "rename changes a field name for later commands. It does not change the value. After renaming duration to latency_ms, later commands must use latency_ms.",
    ],
    keywords: [
      ["table", "Choose display fields and their order."],
      ["fields", "Keep or remove fields in the pipeline."],
      ["rename old AS new", "Change a field name."],
      ["-", "With fields, remove the named fields."],
    ],
    spl: "index=web\n| head 5\n| table service duration\n| rename duration AS latency_ms",
    sql: "SELECT service, duration AS latency_ms\nFROM events WHERE index_name = 'web'\nORDER BY _time DESC, id DESC LIMIT 5;",
    bridge:
      "SELECT chooses columns and AS assigns output names. SPL expresses these as separate commands.",
    caution:
      "Removing a field too early makes it unavailable to later calculations. Keep fields you still need until the end.",
    challenge:
      "Show service and bytes for the first 4 web events, and rename bytes to response_bytes.",
    solution:
      "index=web | head 4 | table service bytes | rename bytes AS response_bytes",
    hint: "Use table before rename, then refer to the original bytes name in rename.",
    questions: [
      q(
        "Which command sets output column order?",
        ["table", "search", "bin"],
        0,
        "table lists the desired fields in display order.",
      ),
      q(
        "What does rename change?",
        ["Every value", "The field name", "The event timestamp"],
        1,
        "Only the name changes.",
      ),
    ],
    source: doc("table"),
  },
  {
    id: "sort-dedup",
    module: 1,
    title: "Sort, limit & deduplicate",
    subtitle: "Choose which events deserve your attention.",
    minutes: 7,
    idea: "“First” only makes sense when you know the order.",
    body: [
      "sort -duration puts the slowest request first. head 5 then keeps the five slowest requests. Reversing those commands would sort only the first five events.",
      "dedup keeps the first result for each distinct key. Sort first when you want a particular representative. The example keeps the slowest event for each service.",
      "Add a tie-breaker when equal values are possible. Here id makes sorting deterministic across the two query languages.",
    ],
    keywords: [
      ["sort -field", "Order from largest to smallest."],
      ["sort 0", "Remove the normal result-count limit on sort."],
      ["head N", "Keep the first N results."],
      ["dedup field", "Keep the first row for each distinct field value."],
    ],
    spl: "index=web\n| sort 0 -duration id\n| dedup service\n| table service duration",
    sql: "WITH ranked AS (\n  SELECT service, duration, ROW_NUMBER() OVER\n    (PARTITION BY service ORDER BY duration DESC, id) AS n\n  FROM events WHERE index_name = 'web'\n)\nSELECT service, duration FROM ranked WHERE n = 1;",
    bridge:
      "ROW_NUMBER chooses one representative per group. SELECT DISTINCT is different: it removes duplicate output rows without choosing the slowest event.",
    caution:
      "Splunk sort returns at most 10,000 results by default. sort 0 removes that limit but may be expensive on large searches.",
    challenge:
      "Return the 3 slowest web events with id, service, and duration; break ties by id ascending.",
    solution:
      "index=web | sort 0 -duration id | head 3 | table id service duration",
    hint: "Sort first, limit second, project last.",
    questions: [
      q(
        "Which finds the five slowest events?",
        [
          "head 5 | sort -duration",
          "sort -duration | head 5",
          "dedup duration",
        ],
        1,
        "Sort the full set before taking the first five.",
      ),
      q(
        "Which row does dedup keep by default?",
        [
          "The first in current order",
          "The last in current order",
          "A random row",
        ],
        0,
        "Ordering determines the representative.",
      ),
    ],
    source: doc("dedup"),
  },
  {
    id: "eval",
    module: 2,
    title: "Create fields with eval",
    subtitle: "Turn the numbers you have into the numbers you need.",
    minutes: 6,
    idea: "eval is a calculator for every row.",
    body: [
      "Our duration field is measured in milliseconds. Divide it by 1000 to express it in seconds. eval adds the new value to each event without collapsing the events.",
      "Use round(value,2) to make a result readable. Multiple comma-separated assignments are evaluated from left to right, so a later expression can use a field you just created.",
      "Use new names when it helps preserve the original evidence. A field called seconds communicates the unit more clearly than a generic name such as result.",
    ],
    keywords: [
      ["eval", "Create or replace fields using expressions."],
      ["/", "Divide two numbers."],
      ["round(x,2)", "Round to two decimal places."],
      [".", "Concatenate strings in an eval expression."],
    ],
    spl: "index=web\n| eval seconds=round(duration/1000,2)\n| table service duration seconds\n| head 6",
    sql: "SELECT service, duration, ROUND(duration / 1000.0, 2) AS seconds\nFROM events WHERE index_name = 'web'\nORDER BY _time DESC, id DESC LIMIT 6;",
    bridge:
      "A calculated SELECT expression adds a column in SQL. Use 1000.0 in SQLite when integer division might otherwise truncate fractions.",
    caution:
      "Units matter. Never compare duration in milliseconds with a threshold measured in seconds without converting one side.",
    challenge:
      "Add a field kilobytes=round(bytes/1024,2) and show bytes and kilobytes for the first 5 web events.",
    solution:
      "index=web | eval kilobytes=round(bytes/1024,2) | table bytes kilobytes | head 5",
    hint: "Create the field with eval before selecting it with table.",
    questions: [
      q(
        "Does eval reduce the event count?",
        [
          "Yes, to one row",
          "No, it computes fields per row",
          "Only for division",
        ],
        1,
        "eval changes fields, not the number of events.",
      ),
      q(
        "How many seconds is 250 milliseconds?",
        ["250 seconds", "2.5 seconds", "0.25 seconds"],
        2,
        "Divide milliseconds by 1000.",
      ),
    ],
    source: doc("eval"),
  },
  {
    id: "case",
    module: 2,
    title: "Classify with if & case",
    subtitle: "Turn technical values into meaningful labels.",
    minutes: 6,
    idea: "A condition can choose a value.",
    body: [
      'if(condition,yes,no) selects one of two values. if(status>=500,"error","other") classifies server errors.',
      'case takes condition/value pairs and returns the first matching value. Put narrower conditions before broader ones. A final true(),"ok" provides a catch-all result.',
      "Classifications are useful before aggregation. Give each request a category, then count the categories to understand the mix of traffic.",
    ],
    keywords: [
      ["if(test,a,b)", "Choose a when true, otherwise b."],
      ["case(test,value,...)", "Return the value for the first true test."],
      ["true()", "An always-true condition for a default branch."],
      ["AS", "Name a summarized result."],
    ],
    spl: 'index=web\n| eval outcome=case(status>=500,"server error",status>=400,"client error",true(),"ok")\n| stats count by outcome',
    sql: "SELECT CASE WHEN status >= 500 THEN 'server error'\n  WHEN status >= 400 THEN 'client error' ELSE 'ok' END AS outcome,\n  COUNT(*) AS count\nFROM events WHERE index_name = 'web'\nGROUP BY outcome;",
    bridge:
      "SPL case maps naturally to SQL CASE WHEN. Both choose the first matching branch.",
    caution:
      "If status>=400 came before status>=500, server errors would also match the first branch and be labeled client errors.",
    challenge:
      "Classify duration>300 as slow and everything else as fast; count events by speed.",
    solution:
      'index=web | eval speed=if(duration>300,"slow","fast") | stats count by speed',
    hint: "Create a field named speed with if(), then group with stats.",
    questions: [
      q(
        "Which case branch wins?",
        [
          "The last matching branch",
          "The first matching branch",
          "All matching branches",
        ],
        1,
        "Order your conditions from specific to general.",
      ),
      q(
        'What does true(),"ok" do at the end?',
        [
          "Reject the event",
          "Provide a default label",
          "Convert status to text",
        ],
        1,
        "It catches events that did not match earlier conditions.",
      ),
    ],
    source: doc("eval"),
  },
  {
    id: "missing",
    module: 2,
    title: "Handle missing values",
    subtitle: "Missing does not mean zero.",
    minutes: 6,
    idea: "Absence is information too.",
    body: [
      "Some events do not contain a user. A missing field is not the same as the empty string or the number zero. Decide what the absence means before replacing it.",
      'isnull(user) detects a missing value. coalesce(user,"anonymous") chooses the first value that is not null. Use it to create an explicit display label without losing the original field.',
      "fillnull can replace missing values in existing fields. In Splunk, a field needs at least one non-null value in the result set to be part of the schema that fillnull can operate on.",
    ],
    keywords: [
      ["null", "No value is available."],
      ["isnull(field)", "True when the value is missing."],
      ["coalesce(a,b)", "The first non-null argument."],
      ["fillnull", "Replace nulls in selected existing fields."],
    ],
    spl: 'index=web\n| eval person=coalesce(user,"anonymous")\n| stats count by person',
    sql: "SELECT COALESCE(user, 'anonymous') AS person, COUNT(*) AS count\nFROM events WHERE index_name = 'web'\nGROUP BY person;",
    bridge:
      "COALESCE has the same basic purpose in SQL. SQL GROUP BY can create a NULL group; SPL stats by a missing field normally excludes that event. Fill intentionally to include it.",
    caution:
      "Replacing an absent measurement with zero changes averages and can hide missing telemetry. Replace only when zero is the correct meaning.",
    challenge:
      "Count the web events whose user is missing; name the result count.",
    solution: "index=web | where isnull(user) | stats count",
    hint: "Filter with where isnull(user) before counting.",
    questions: [
      q(
        "Is a missing duration automatically zero?",
        ["Yes", "No", "Only after search"],
        1,
        "Missing and zero represent different facts.",
      ),
      q(
        "Which returns anonymous only when user is null?",
        ['coalesce(user,"anonymous")', 'user="anonymous"', "round(user)"],
        0,
        "coalesce keeps an existing user and falls back only for null.",
      ),
    ],
    source: doc("fillnull"),
  },
  {
    id: "extract",
    module: 2,
    title: "Extract with rex & spath",
    subtitle: "Give unstructured clues a useful name.",
    minutes: 8,
    idea: "Extraction turns text into fields you can use.",
    body: [
      "Logs often contain useful values buried in text. rex uses a regular expression and a named capture group such as (?<latency>\\d+) to extract digits into latency.",
      "JSON already has structure. spath follows a path through that structure, so spath input=payload path=region output=region extracts the region value without a regular expression.",
      "The example uses both approaches. latency starts as text, so tonumber converts it before calculations. The browser supports one safe named character-class capture; production Splunk supports much richer regular expressions.",
    ],
    keywords: [
      ["rex", "Extract fields from text using regex."],
      ["(?<name>...)", "Name the captured part of a regex."],
      ["spath", "Extract a value from structured JSON."],
      ["tonumber()", "Convert numeric text into a number."],
    ],
    spl: 'index=web\n| rex field=_raw "duration=(?<latency>\\d+)ms"\n| spath input=payload path=region output=region\n| eval latency=tonumber(latency)\n| table service latency region\n| head 5',
    sql: "SELECT service,\n  CAST(SUBSTR(_raw, INSTR(_raw, 'duration=') + 9,\n    INSTR(SUBSTR(_raw, INSTR(_raw, 'duration=') + 9), 'ms') - 1) AS REAL) AS latency,\n  JSON_EXTRACT(payload, '$.region') AS region\nFROM events WHERE index_name = 'web'\nORDER BY _time DESC, id DESC LIMIT 5;",
    bridge:
      "SQLite JSON_EXTRACT handles the structured field. The substring expression is deliberately format-specific because stock SQLite does not provide a built-in regex extraction function.",
    caution:
      "Use structured extraction when possible. Regex rules depend on the event format; a change in logging can cause an extraction to stop matching.",
    challenge: "Extract region from payload, then count web events by region.",
    solution:
      "index=web | spath input=payload path=region output=region | stats count by region",
    hint: "Use the spath command from the example, followed by stats.",
    questions: [
      q(
        "Which command is designed for JSON?",
        ["spath", "sort", "head"],
        0,
        "spath follows structured paths in JSON or XML; this lab supports JSON paths.",
      ),
      q(
        "What does a named regex capture create?",
        ["An index", "A field", "A saved alert"],
        1,
        "The capture name becomes the extracted field name.",
      ),
    ],
    source: doc("rex"),
  },
  {
    id: "stats",
    module: 3,
    title: "Aggregate with stats",
    subtitle: "Answer a big question with a small result.",
    minutes: 7,
    idea: "Many events become one summary.",
    body: [
      "stats count answers how many events are in the current pipeline. avg(duration) computes the arithmetic mean of numeric duration values. sum(bytes) adds response sizes.",
      "An aggregation can use only events that survived earlier filters. Count failed requests by filtering failures first; calculate an error percentage by retaining all requests and using a conditional aggregate.",
      "Without by, stats returns one summary row. With by, it returns one row per distinct group. Original fields disappear unless they are grouping keys or aggregate results.",
    ],
    keywords: [
      ["count", "Count events. count(field) counts non-null field values."],
      ["avg(field)", "Average the numeric values."],
      ["sum(field)", "Add the numeric values."],
      ["dc(field)", "Count distinct non-null values."],
    ],
    spl: "index=web\n| stats count AS requests avg(duration) AS avg_ms sum(bytes) AS total_bytes dc(user) AS users",
    sql: "SELECT COUNT(*) AS requests, AVG(duration) AS avg_ms,\n  SUM(bytes) AS total_bytes, COUNT(DISTINCT user) AS users\nFROM events WHERE index_name = 'web';",
    bridge:
      "COUNT(*), AVG, SUM, and COUNT(DISTINCT ...) are close analogies on these scalar fields. Neither average includes missing duration values.",
    caution:
      "count and count(user) differ when user is missing. A count of known users is not a count of all requests.",
    challenge:
      "For checkout web events, compute count AS requests and avg(duration) AS avg_ms.",
    solution:
      "index=web service=checkout | stats count AS requests avg(duration) AS avg_ms",
    hint: "Scope to checkout before the pipe, then include both aggregates.",
    questions: [
      q(
        "What remains after stats avg(duration)?",
        ["All original events", "One summary row", "The slowest event"],
        1,
        "stats transforms events into the requested summary.",
      ),
      q(
        "Does count(user) include missing users?",
        ["Yes", "No", "Only when status=200"],
        1,
        "A field-specific count ignores null values.",
      ),
    ],
    source: doc("stats"),
  },
  {
    id: "groups",
    module: 3,
    title: "Group, rank & filter summaries",
    subtitle: "See which services need attention.",
    minutes: 7,
    idea: "Group first. Then ask a question of each group.",
    body: [
      "stats ... by service computes an independent summary for each service. Add another field after by for a more detailed combination, such as service and status.",
      "A where after stats filters summary rows. This is the same stage where SQL HAVING operates. Before aggregation, conditions apply to individual events; afterward, they apply to groups.",
      "top 3 service provides frequency counts and percentages. rare 3 service shows uncommon values. For more control over the measure and output, use stats followed by sort and head.",
    ],
    keywords: [
      ["by service", "One group per service."],
      ["where after stats", "Filter the summary, like HAVING."],
      ["top N field", "Most frequent values, with count and percent."],
      ["rare N field", "Least frequent values."],
    ],
    spl: "index=web status>=400\n| stats count AS errors by service\n| where errors>=5\n| sort -errors",
    sql: "SELECT service, COUNT(*) AS errors\nFROM events WHERE index_name = 'web' AND status >= 400\nGROUP BY service HAVING COUNT(*) >= 5\nORDER BY errors DESC;",
    bridge:
      "The base search corresponds to WHERE. The where errors>=5 after stats corresponds to HAVING.",
    caution:
      "A threshold after stats cannot inspect fields removed by stats. Keep the distinction between an event condition and a group condition.",
    challenge:
      "Compute avg(duration) AS avg_ms by service, then keep services with avg_ms>200.",
    solution:
      "index=web | stats avg(duration) AS avg_ms by service | where avg_ms>200",
    hint: "The average field exists only after stats.",
    questions: [
      q(
        "SQL HAVING usually maps to…",
        ["A filter after stats", "The index name", "A sort direction"],
        0,
        "HAVING filters aggregated groups.",
      ),
      q(
        "What does by service status produce?",
        [
          "One global row",
          "A group for each service/status combination",
          "Only status values",
        ],
        1,
        "Multiple BY fields define compound grouping keys.",
      ),
    ],
    source: doc("top"),
  },
  {
    id: "eventstats",
    module: 3,
    title: "Keep context with eventstats",
    subtitle: "Compare an event with its peers.",
    minutes: 8,
    idea: "Add the group average without losing the events.",
    body: [
      "stats collapses events. eventstats calculates a summary and attaches it to the original events. That extra context lets you ask whether a request is slower than its service average.",
      "The example calculates service_avg for each service, then keeps requests whose duration is above that value. Watch the rows stay in place while a new column appears.",
      "Use this pattern for percentages of totals, deviations from a baseline, or comparisons against a peer group. The group is the current search result, not all historical traffic.",
    ],
    keywords: [
      ["eventstats", "Attach aggregate values to original events."],
      ["by", "Define the peer group."],
      ["duration>service_avg", "Compare two fields on the same event."],
      ["OVER (PARTITION BY ...)", "SQL window aggregate over a group."],
    ],
    spl: "index=web\n| eventstats avg(duration) AS service_avg by service\n| where duration>service_avg\n| table service duration service_avg",
    sql: "WITH context AS (\n SELECT service, duration, AVG(duration) OVER (PARTITION BY service) AS service_avg\n FROM events WHERE index_name = 'web'\n)\nSELECT service, duration, service_avg FROM context\nWHERE duration > service_avg;",
    bridge:
      "A SQL window aggregate adds the group result to every row, just like this eventstats example. A CTE lets the next step filter the computed value.",
    caution:
      "Filtering before eventstats changes the population used for the average. Filtering after eventstats keeps the original population as the baseline.",
    challenge:
      "Attach sum(bytes) AS service_bytes to every web event grouped by service; show service, bytes, and service_bytes.",
    solution:
      "index=web | eventstats sum(bytes) AS service_bytes by service | table service bytes service_bytes",
    hint: "Use eventstats rather than stats to retain individual bytes values.",
    questions: [
      q(
        "Does eventstats collapse the original events?",
        ["Yes", "No", "Only when using avg"],
        1,
        "It enriches events with aggregate context.",
      ),
      q(
        "Which SQL concept is the closest match?",
        ["DROP TABLE", "Window aggregate", "INSERT"],
        1,
        "An aggregate OVER a partition retains rows.",
      ),
    ],
    source: doc("eventstats"),
  },
  {
    id: "streamstats",
    module: 3,
    title: "Running totals with streamstats",
    subtitle: "Watch a calculation grow event by event.",
    minutes: 8,
    idea: "Each row sees what came before it.",
    body: [
      "streamstats makes running calculations in the current event order. With sum(bytes), the first event gets its own bytes, the second gets the sum of the first two, and so on.",
      "Sort explicitly. Events commonly arrive newest first, but a running total over time usually needs oldest first. The example also uses id as a stable tie-breaker.",
      "Add by service to keep separate running totals. A window=N limits the running history; production options include time windows and reset rules beyond this lab.",
    ],
    keywords: [
      ["streamstats", "A running aggregate in current result order."],
      ["sort 0 _time id", "Chronological order with a stable tie-breaker."],
      ["window=N", "Bound the running history."],
      ["by service", "Maintain a separate calculation per service."],
    ],
    spl: "index=web\n| sort 0 _time id\n| streamstats sum(bytes) AS running_bytes by service\n| table _time service bytes running_bytes",
    sql: "SELECT _time, service, bytes,\n SUM(bytes) OVER (PARTITION BY service ORDER BY _time, id\n ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW) AS running_bytes\nFROM events WHERE index_name = 'web'\nORDER BY _time, id;",
    bridge:
      "The SQL window includes all preceding rows in the same service partition plus the current row. Explicit ROWS avoids the peer-group behavior of a default RANGE frame.",
    caution:
      "streamstats follows input order; it does not silently sort by timestamp. Production stream windows are bounded by configuration.",
    challenge:
      "Number web events chronologically with streamstats count AS sequence, then show id and sequence.",
    solution:
      "index=web | sort 0 _time id | streamstats count AS sequence | table id sequence",
    hint: "Omit BY to count across all events in the time-ordered stream.",
    questions: [
      q(
        "Which order does streamstats use?",
        [
          "Current pipeline order",
          "Always alphabetical",
          "Always oldest first",
        ],
        0,
        "Sort explicitly before a time-based running calculation.",
      ),
      q(
        "Which SQL frame matches a cumulative total?",
        [
          "Only the next row",
          "ROWS UNBOUNDED PRECEDING through CURRENT ROW",
          "No rows",
        ],
        1,
        "The frame grows from the beginning through each current event.",
      ),
    ],
    source: doc("streamstats"),
  },
  {
    id: "time-range",
    module: 4,
    title: "Choose a time range",
    subtitle: "Every investigation needs a time boundary.",
    minutes: 6,
    idea: "Ask when, as well as what.",
    body: [
      "earliest and latest define the time interval to search. The lower boundary is inclusive and the upper boundary is exclusive. earliest=-30m latest=now means the last thirty minutes.",
      "The classroom clock is fixed at 2025-01-15 10:00 UTC so every run is reproducible. The latest thirty minutes are 09:30 through just before 10:00.",
      "A snap such as @h rounds a time down to the hour. For example -1h@h subtracts an hour and snaps to that hour boundary. A production time picker also controls the search time range.",
    ],
    keywords: [
      ["earliest", "Inclusive beginning of the time range."],
      ["latest", "Exclusive end of the time range."],
      ["-30m", "Thirty minutes before the evaluation time."],
      ["@h", "Snap down to an hour boundary."],
    ],
    spl: "index=web earliest=-30m latest=now\n| stats count AS requests by service",
    sql: "SELECT service, COUNT(*) AS requests FROM events\nWHERE index_name = 'web'\n  AND _time >= 1736933400 AND _time < 1736935200\nGROUP BY service;",
    bridge:
      "A SQL range predicate selects the same fixed interval. _time is stored as Unix seconds; the displayed lesson time is UTC.",
    caution:
      "The fixed classroom clock is intentional. Real Splunk relative times use the search evaluation time and configured time zone.",
    challenge:
      "Count web events from the last 15 minutes, using earliest=-15m latest=now.",
    solution: "index=web earliest=-15m latest=now | stats count",
    hint: "Put both time modifiers in the base search before stats.",
    questions: [
      q(
        "Is latest included in the range?",
        ["Yes", "No", "Only at midnight"],
        1,
        "Splunk time ranges include earliest and exclude latest.",
      ),
      q(
        "Why does this lab use a fixed clock?",
        [
          "To make results reproducible",
          "SPL cannot use current time",
          "SQL cannot store time",
        ],
        0,
        "Fixed synthetic fixtures keep lessons and checks repeatable.",
      ),
    ],
    source:
      "https://help.splunk.com/en/splunk-enterprise/search/search-manual/9.3/specify-time-ranges-for-searches/specify-time-modifiers-in-your-search",
  },
  {
    id: "bin",
    module: 4,
    title: "Make time buckets with bin",
    subtitle: "Put nearby events on the same timeline.",
    minutes: 6,
    idea: "A bucket gives many timestamps one shared label.",
    body: [
      "bin span=10m _time rounds each event timestamp down to its ten-minute bucket. An event at 09:17 becomes 09:10. Events are still separate rows at this step.",
      "Follow bin with stats ... by _time to summarize each bucket. Keeping these two operations separate makes it clear which command changes timestamps and which collapses rows.",
      "Choose a span that fits the question. Small buckets expose short spikes; large buckets reveal broader patterns but can hide brief failures.",
    ],
    keywords: [
      ["bin", "Assign values to buckets. Also called bucket in Splunk."],
      ["span=10m", "Ten-minute-wide time buckets."],
      ["_time", "The timestamp being bucketed."],
      ["stats by _time", "Summarize events sharing a bucket."],
    ],
    spl: "index=web\n| bin span=10m _time\n| stats count AS requests by _time\n| sort _time",
    sql: "SELECT CAST(_time / 600 AS INTEGER) * 600 AS _time,\n COUNT(*) AS requests FROM events\nWHERE index_name = 'web'\nGROUP BY 1 ORDER BY 1;",
    bridge:
      "For these positive Unix timestamps, integer division by 600 and multiplication by 600 produces the same UTC ten-minute bucket start.",
    caution:
      "Daily and calendar buckets depend on time zones and daylight saving. This lab uses fixed UTC seconds, not calendar-aware time zones.",
    challenge:
      "Count web events in 15-minute buckets; name the aggregate requests and sort by _time.",
    solution:
      "index=web | bin span=15m _time | stats count AS requests by _time | sort _time",
    hint: "Change span to 15m; 15 minutes equals 900 seconds.",
    questions: [
      q(
        "Does bin alone reduce the number of events?",
        ["Yes", "No", "Only with ten-minute spans"],
        1,
        "bin changes bucket labels. stats performs the aggregation.",
      ),
      q(
        "Which bucket contains 09:17 with span=10m?",
        ["09:10", "09:20", "09:17"],
        0,
        "The timestamp rounds down to the bucket start.",
      ),
    ],
    source: doc("bin"),
  },
  {
    id: "timechart",
    module: 4,
    title: "See trends with timechart",
    subtitle: "Let time become the horizontal axis.",
    minutes: 7,
    idea: "A timechart is an aggregation organized by time.",
    body: [
      "timechart buckets _time and calculates a statistic for each bucket. Add by service to get one series per service. The result is still a table, ready to draw as a chart.",
      "This example counts requests every ten minutes for three services. Switch to the incident and try avg(duration) in the playground to expose the checkout latency increase.",
      "The lab asks for cont=false fixedrange=false explicitly: it shows buckets covered by events without filling time gaps or extending to a time-picker range. Production defaults differ.",
    ],
    keywords: [
      ["timechart", "Aggregate results on a time axis."],
      ["span", "Time width of each bucket."],
      ["by service", "Split the chart into service series."],
      ["cont / fixedrange", "Control gap filling and range boundaries."],
    ],
    spl: "index=web\n| timechart span=10m cont=false fixedrange=false count by service",
    sql: "SELECT CAST(_time / 600 AS INTEGER) * 600 AS _time,\n SUM(CASE WHEN service='catalog' THEN 1 ELSE 0 END) AS catalog,\n SUM(CASE WHEN service='checkout' THEN 1 ELSE 0 END) AS checkout,\n SUM(CASE WHEN service='payments' THEN 1 ELSE 0 END) AS payments\nFROM events WHERE index_name='web'\nGROUP BY 1 ORDER BY 1;",
    bridge:
      "Conditional aggregation pivots known service values into columns. SPL discovers split values; this SQL example explicitly names the three fixture services.",
    caution:
      "A missing bucket is not automatically zero. The lesson disables automatic gap filling, and the SQL comparison assumes these known series and populated buckets.",
    challenge:
      "Count web requests every 5 minutes with timechart, using cont=false fixedrange=false and no split field.",
    solution: "index=web | timechart span=5m cont=false fixedrange=false count",
    hint: "Keep the explicit bucket options and remove BY service.",
    questions: [
      q(
        "What does BY service create in timechart?",
        [
          "Separate service series",
          "A new index",
          "An event for each SQL table",
        ],
        0,
        "Each distinct service becomes a chart series.",
      ),
      q(
        "Does this lesson automatically fill missing time buckets?",
        ["Yes", "No, cont=false is explicit", "Only on weekends"],
        1,
        "The lab shows only populated buckets.",
      ),
    ],
    source: doc("timechart"),
  },
  {
    id: "moving-average",
    module: 4,
    title: "Smooth a changing signal",
    subtitle: "Separate one noisy point from a persistent change.",
    minutes: 8,
    idea: "A moving average follows a bounded history.",
    body: [
      "First calculate an average duration for each five-minute bucket. Then sort chronologically and use streamstats window=3 avg(avg_ms) to smooth the last three bucket averages.",
      "With current=true, the default, each calculation includes the current bucket. The first two results use the smaller amount of history available so far.",
      "This is an average of bucket averages. It equals a request-weighted average only when bucket counts are equal. For uneven traffic, carry sum and count separately and divide rolling totals.",
    ],
    keywords: [
      ["window=3", "The current result plus up to two preceding results."],
      ["avg(avg_ms)", "Average of the bucket averages."],
      ["sort _time", "Put buckets in chronological order."],
      ["ROWS 2 PRECEDING", "The analogous SQL row window."],
    ],
    spl: "index=web service=checkout\n| bin span=5m _time\n| stats avg(duration) AS avg_ms by _time\n| sort _time\n| streamstats window=3 avg(avg_ms) AS smooth_ms",
    sql: "WITH buckets AS (\n SELECT CAST(_time/300 AS INTEGER)*300 AS _time, AVG(duration) AS avg_ms\n FROM events WHERE index_name='web' AND service='checkout' GROUP BY 1\n)\nSELECT _time, avg_ms, AVG(avg_ms) OVER\n (ORDER BY _time ROWS BETWEEN 2 PRECEDING AND CURRENT ROW) AS smooth_ms\nFROM buckets ORDER BY _time;",
    bridge:
      "Both calculations use at most three bucket rows. A row window counts results, not elapsed time; missing buckets change the time coverage.",
    caution:
      "Smoothing can hide a short spike and can delay detection. Keep the original signal visible next to the smoothed value.",
    challenge:
      "Use the example but change the moving window to 2 buckets and keep the same output fields.",
    solution:
      "index=web service=checkout | bin span=5m _time | stats avg(duration) AS avg_ms by _time | sort _time | streamstats window=2 avg(avg_ms) AS smooth_ms",
    hint: "Only change window=3 to window=2.",
    questions: [
      q(
        "What does window=3 count here?",
        ["Three result rows", "Exactly three seconds", "Three services"],
        0,
        "It is a row-count window.",
      ),
      q(
        "Can averaging averages be misleading?",
        ["No", "Yes, when bucket sizes differ", "Only for strings"],
        1,
        "Unequal bucket populations need weighted aggregation.",
      ),
    ],
    source: doc("streamstats"),
  },
  {
    id: "lookup",
    module: 5,
    title: "Enrich events with lookups",
    subtitle: "Add business context to technical signals.",
    minutes: 7,
    idea: "A small reference table can explain a large event stream.",
    body: [
      "Logs may name a service without saying which team owns it. A lookup maps a key such as service to metadata such as team and tier.",
      "The bundled service_owners table contains one row per service. lookup service_owners service OUTPUT team tier attaches matching metadata to each result.",
      "Aggregate first when the lookup only depends on the grouping key. Enriching three service summaries is simpler than enriching every request.",
    ],
    keywords: [
      ["lookup", "Enrich results using a configured reference table."],
      ["OUTPUT", "Choose lookup fields to add or overwrite."],
      ["inputlookup", "Read the lookup table as the search input."],
      ["key", "The field used to match both datasets."],
    ],
    spl: "index=web status>=500\n| stats count AS errors by service\n| lookup service_owners service OUTPUT team tier",
    sql: "WITH errors AS (\n SELECT service, COUNT(*) AS errors FROM events\n WHERE index_name='web' AND status>=500 GROUP BY service\n)\nSELECT e.service, e.errors, o.team, o.tier\nFROM errors e LEFT JOIN service_owners o USING(service);",
    bridge:
      "A left join against a unique-key reference table closely models this lookup. Unmatched events remain, with missing metadata.",
    caution:
      "A lookup name refers to a configured lookup definition or file in Splunk. This lab bundles only service_owners and users; it never reads arbitrary files.",
    challenge:
      "Count all web requests by service as requests, then add the team field using service_owners.",
    solution:
      "index=web | stats count AS requests by service | lookup service_owners service OUTPUT team",
    hint: "Choose OUTPUT team after aggregating by service.",
    questions: [
      q(
        "What is a lookup good for?",
        [
          "Adding stable metadata",
          "Deleting raw logs",
          "Changing the search clock",
        ],
        0,
        "Lookups enrich event keys with reference context.",
      ),
      q(
        "When can you aggregate before the lookup?",
        [
          "When the needed lookup key survives grouping",
          "Always, even if the key is removed",
          "Never",
        ],
        0,
        "Keep the key needed to match the reference table.",
      ),
    ],
    source: doc("lookup"),
  },
  {
    id: "join",
    module: 5,
    title: "Join with a subsearch",
    subtitle: "Understand matching, cardinality, and cost.",
    minutes: 8,
    idea: "A join needs a key and a rule for unmatched rows.",
    body: [
      "A subsearch in square brackets runs to produce results for the outer command. Here inputlookup users supplies user metadata, and join matches it against request summaries by user.",
      "type=left keeps unmatched outer rows. The default inner join keeps only matched rows. Splunk join normally uses at most one matching subsearch row per outer row unless max is changed.",
      "SQL joins can multiply rows for one-to-many matches. This comparison uses a unique users key, so both sides have the same cardinality. Prefer lookup for simple reference enrichment.",
    ],
    keywords: [
      ["join", "Combine matching rows from two result sets."],
      ["type=left", "Keep unmatched rows from the main search."],
      ["[ ... ]", "A subsearch evaluated for the outer operation."],
      ["cardinality", "How many rows match each key."],
    ],
    spl: "index=web\n| stats count AS requests by user\n| join type=left user [ | inputlookup users ]\n| table user requests department",
    sql: "WITH requests AS (\n SELECT user, COUNT(*) AS requests FROM events\n WHERE index_name='web' AND user IS NOT NULL GROUP BY user\n)\nSELECT r.user, r.requests, u.department\nFROM requests r LEFT JOIN users u USING(user);",
    bridge:
      "The LEFT JOIN matches this example because users is unique by user. SQL must explicitly exclude NULL users to match SPL stats BY behavior.",
    caution:
      "Production joins have subsearch time and result limits. This lab implements the default first-match behavior, not unrestricted SQL one-to-many semantics.",
    challenge:
      "Count web requests by service as requests, then left-join service_owners and show service, requests, and team.",
    solution:
      "index=web | stats count AS requests by service | join type=left service [ | inputlookup service_owners ] | table service requests team",
    hint: "Use service as the common key on both sides.",
    questions: [
      q(
        "What does type=left keep?",
        ["Only matched rows", "All main-search rows", "Only subsearch rows"],
        1,
        "Unmatched main-search rows are preserved.",
      ),
      q(
        "Are Splunk join defaults identical to unrestricted SQL joins?",
        ["Yes", "No", "Only for strings"],
        1,
        "Default matching cardinality and resource limits differ.",
      ),
    ],
    source: doc("join"),
  },
  {
    id: "subsearch",
    module: 5,
    title: "Let one search inform another",
    subtitle: "Use a result as a filter, not a copied list.",
    minutes: 8,
    idea: "Find the keys first. Then investigate their events.",
    body: [
      "Suppose you want web activity for users who had failed authentications. The subsearch finds those users in the auth index, keeps the user field, and removes duplicates.",
      "In a base search, returned key/value rows are formatted into conditions: alternatives across rows and conjunctions across fields. The outer search then selects matching web events.",
      "Keep only the intended filter keys. Returning _time or other extra fields would constrain the outer search in ways you may not expect.",
    ],
    keywords: [
      ["subsearch", "A bracketed search used by another command."],
      ["table user", "Return only the key intended for matching."],
      ["dedup user", "Avoid repeated filter keys."],
      ["IN (SELECT ...)", "A useful SQL analogy for this one-key example."],
    ],
    spl: "index=web [ search index=auth action=failure | table user | dedup user ]\n| stats count AS requests by user",
    sql: "SELECT user, COUNT(*) AS requests FROM events\nWHERE index_name='web' AND user IN (\n SELECT DISTINCT user FROM events\n WHERE index_name='auth' AND action='failure'\n)\nGROUP BY user;",
    bridge:
      "For one returned field, this behaves like SQL IN with a subquery. More complex multi-field subsearch formatting is not a general SQL translation.",
    caution:
      "Subsearches have command-dependent time and result limits in Splunk. A large or truncated key list can produce incomplete investigations.",
    challenge:
      "Find web requests for users with successful auth events, then count requests by user.",
    solution:
      "index=web [ search index=auth action=success | table user | dedup user ] | stats count AS requests by user",
    hint: "Change the subsearch action from failure to success.",
    questions: [
      q(
        "Why keep only user in the subsearch?",
        [
          "To control the filter keys",
          "To change the index",
          "To make every event match",
        ],
        0,
        "Every returned field can affect the outer conditions.",
      ),
      q(
        "Which SQL construct fits this example?",
        ["IN (SELECT ...)", "DROP INDEX", "ORDER BY alone"],
        0,
        "The outer search uses a set of user keys.",
      ),
    ],
    source: doc("search"),
  },
  {
    id: "multivalue",
    module: 5,
    title: "Work with multiple values",
    subtitle: "One field can contain more than one thing.",
    minutes: 7,
    idea: "Expansion changes what one row represents.",
    body: [
      'Our tags field starts as comma-separated text. eval tags=split(tags,",") turns it into multiple values. mvcount(tags) tells you how many values the field contains.',
      "mvexpand tags makes a separate result for each value. Other fields are copied, so a request tagged web and paid becomes two rows.",
      "After expansion, stats count by tags measures tag occurrences, not distinct requests. Keep an event identifier when you need to distinguish those units.",
    ],
    keywords: [
      ["split()", "Turn delimited text into multiple values."],
      ["makemv", "Another way to convert a delimited field."],
      ["mvexpand", "One output row per field value."],
      ["mvcount / mvindex", "Count values or select one by position."],
    ],
    spl: 'index=web\n| eval tags=split(tags,",")\n| mvexpand tags\n| stats count by tags',
    sql: "SELECT j.value AS tags, COUNT(*) AS count\nFROM events e, JSON_EACH('[\"' || REPLACE(e.tags, ',', '\",\"') || '\"]') j\nWHERE e.index_name='web'\nGROUP BY j.value;",
    bridge:
      "SQLite JSON_EACH expands a JSON array into rows. This SQL converts only our simple comma-delimited fixture strings; arbitrary text would need proper escaping.",
    caution:
      "mvexpand can multiply rows dramatically. Filter first and be clear whether you are counting events or expanded values.",
    challenge:
      "Split and expand tags, keep only paid, and count those rows as count.",
    solution:
      'index=web | eval tags=split(tags,",") | mvexpand tags | search tags=paid | stats count',
    hint: "Use search tags=paid after mvexpand.",
    questions: [
      q(
        "What happens to one event with two tags after mvexpand?",
        ["It becomes two rows", "It disappears", "It stays one scalar row"],
        0,
        "Each value gets its own result row.",
      ),
      q(
        "What does counting expanded rows measure?",
        [
          "Always distinct original events",
          "Expanded value occurrences",
          "Index size on disk",
        ],
        1,
        "Expansion changes the unit being counted.",
      ),
    ],
    source: doc("mvexpand"),
  },
  {
    id: "efficient",
    module: 6,
    title: "Search efficiently & understand tstats",
    subtitle: "Reduce the work before increasing the hardware.",
    minutes: 9,
    idea: "The cheapest event is the one you never need to process.",
    body: [
      "Start with the right index and time range. Use selective base-search conditions before expensive transformations. Avoid carrying unnecessary fields through a large pipeline.",
      "Aggregate before enrichment when the required lookup key survives. Investigate high-cardinality groupings such as request IDs before turning them into recurring reports.",
      "tstats can aggregate indexed fields from tsidx structures, and can use accelerated data-model summaries when configured. It is not a drop-in replacement for every search-time field or calculation. The lab below executes a comparable stats query; the production diagram explains tstats.",
    ],
    keywords: [
      ["selectivity", "How much irrelevant input a filter removes."],
      ["tstats", "Aggregate indexed fields or supported data-model summaries."],
      ["tsidx", "Splunk index structures used for indexed field retrieval."],
      [
        "summariesonly",
        "Restrict an accelerated search to available summaries.",
      ],
    ],
    spl: "index=web earliest=-15m latest=now\n| stats count by sourcetype",
    sql: "SELECT sourcetype, COUNT(*) AS count FROM events\nWHERE index_name='web' AND _time>=1736934300 AND _time<1736935200\nGROUP BY sourcetype;",
    bridge:
      "WHERE reduces the input before GROUP BY. SQL indexes and materialized summaries are useful performance analogies, but their storage and planners differ from Splunk.",
    caution:
      "This browser cannot simulate distributed indexer work or measure production performance. tstats is a guided production example, not a supported lab command.",
    challenge: "Restrict web events to the last 10 minutes and count by host.",
    solution: "index=web earliest=-10m latest=now | stats count by host",
    hint: "Use earliest=-10m latest=now and keep host as the grouping key.",
    questions: [
      q(
        "Can tstats directly aggregate any search-time field?",
        [
          "Yes",
          "No, its inputs have indexed/data-model constraints",
          "Only if renamed",
        ],
        1,
        "Check indexed fields or the configured data model.",
      ),
      q(
        "Which is usually the first useful optimization?",
        [
          "Search every index forever",
          "Narrow the index and time range",
          "Add a join",
        ],
        1,
        "Reduce unnecessary data before expensive operations.",
      ),
    ],
    source: doc("tstats"),
    production: {
      title: "How an indexed summary search works",
      query:
        "| tstats count WHERE index=web earliest=-15m latest=now BY sourcetype",
      steps: [
        ["Scope", "Choose the web index and a fifteen-minute interval."],
        [
          "Indexed fields",
          "Read sourcetype from indexed structures, not an arbitrary search-time extraction.",
        ],
        ["Aggregate", "Count matching indexed entries by sourcetype."],
        [
          "Inspect",
          "Validate coverage and compare with a normal search before relying on acceleration.",
        ],
      ],
    },
  },
  {
    id: "sessions",
    module: 6,
    title: "Correlate events into sessions",
    subtitle: "A sequence can tell a story that a single event cannot.",
    minutes: 9,
    idea: "Choose a correlation method that fits your question.",
    body: [
      "A shared session key lets you summarize related events. stats min(_time), max(_time), and count by session estimates the observed span and event count for each session.",
      "transaction can group related raw events using boundaries such as maxspan and maxpause, or explicit start and end conditions. It preserves richer event relationships but has ordering and memory considerations.",
      "Our stats example groups by the entire key, regardless of gaps. It is equivalent to transaction only under narrower assumptions. The production diagram shows why session boundaries matter.",
    ],
    keywords: [
      ["correlation key", "A field shared by related events."],
      ["maxspan", "Maximum total duration of a transaction."],
      ["maxpause", "Maximum gap between successive events in a transaction."],
      ["min/max(_time)", "Observed beginning and end of a grouped set."],
    ],
    spl: "index=web\n| stats min(_time) AS first max(_time) AS last count AS events by session\n| eval span_seconds=last-first\n| table session events span_seconds",
    sql: "SELECT session, COUNT(*) AS events, MAX(_time)-MIN(_time) AS span_seconds\nFROM events WHERE index_name='web' AND session IS NOT NULL\nGROUP BY session;",
    bridge:
      "GROUP BY with MIN and MAX matches this key-based summary. Sessionization based on gaps generally requires ordered window calculations and an additional grouping step.",
    caution:
      "Reused session IDs or long gaps can merge unrelated activity when you simply group by key. transaction itself requires reverse chronological ordering for its time constraints.",
    challenge:
      "For checkout events, count events by session as events and sum bytes as total_bytes.",
    solution:
      "index=web service=checkout | stats count AS events sum(bytes) AS total_bytes by session",
    hint: "Filter the service first and aggregate both measures by session.",
    questions: [
      q(
        "Does stats by session automatically split long gaps?",
        ["Yes", "No", "Only if sorted"],
        1,
        "Grouping keys alone do not create gap boundaries.",
      ),
      q(
        "What is maxpause about?",
        ["The gap between events", "SQL query length", "Total index size"],
        0,
        "maxpause constrains the gap within a transaction.",
      ),
    ],
    source: doc("transaction"),
    production: {
      title: "Where one session ends and another begins",
      query:
        "index=web | sort 0 -_time | transaction session maxspan=10m maxpause=2m",
      steps: [
        [
          "Order",
          "Arrange events newest first for transaction time constraints.",
        ],
        ["Match a key", "Consider events with the same session identifier."],
        [
          "Check the gap",
          "A gap exceeding maxpause can split events into separate transactions.",
        ],
        [
          "Check the span",
          "maxspan also bounds the total duration. Inspect duration and eventcount in the result.",
        ],
      ],
    },
  },
  {
    id: "alerts",
    module: 6,
    title: "Design a useful alert",
    subtitle: "A threshold should tell someone what to do.",
    minutes: 9,
    idea: "A good alert combines a signal, a window, and context.",
    body: [
      "An error count alone is hard to interpret: ten errors in twenty requests is different from ten in a million. Calculate both failures and total requests for the same population.",
      "count(eval(status>=500)) counts events whose condition is true. Divide by total requests, multiply by 100, and apply a threshold after aggregation. Add a minimum traffic condition to avoid noisy percentages.",
      "The result is an alert candidate, not a scheduled alert. In Splunk you also choose a schedule, trigger condition, throttling, and an action. Define an owner and a useful next step.",
    ],
    keywords: [
      ["count(eval(...))", "Count events satisfying a condition."],
      [
        "error percentage",
        "100 × failures / requests for the same population.",
      ],
      ["threshold", "A condition that makes a result actionable."],
      [
        "throttling",
        "Suppress repeated notifications within a configured interval.",
      ],
    ],
    spl: "index=web earliest=-30m latest=now\n| stats count AS requests count(eval(status>=500)) AS errors by service\n| eval error_pct=round(100*errors/requests,2)\n| where requests>=10 AND error_pct>10",
    sql: "SELECT service, COUNT(*) AS requests,\n SUM(CASE WHEN status>=500 THEN 1 ELSE 0 END) AS errors,\n ROUND(100.0*SUM(CASE WHEN status>=500 THEN 1 ELSE 0 END)/COUNT(*),2) AS error_pct\nFROM events WHERE index_name='web' AND _time>=1736933400 AND _time<1736935200\nGROUP BY service HAVING COUNT(*)>=10 AND error_pct>10;",
    bridge:
      "SQL conditional aggregation counts failures without filtering successful events out of the denominator. HAVING applies the alert criteria.",
    caution:
      "Overlapping search windows and ingestion delays can affect alerts. A zero-row result means no candidates in this interval; it does not prove that telemetry is healthy.",
    challenge:
      "Use the last 30 minutes to calculate requests, errors, and error_pct by service, then keep requests>=10 and error_pct>20.",
    solution:
      "index=web earliest=-30m latest=now | stats count AS requests count(eval(status>=500)) AS errors by service | eval error_pct=round(100*errors/requests,2) | where requests>=10 AND error_pct>20",
    hint: "Keep all web requests until the conditional aggregation. Change only the percentage threshold.",
    questions: [
      q(
        "Why not filter status>=500 before calculating the percentage?",
        [
          "It would remove successes from the denominator",
          "It changes the field type",
          "It always returns zero",
        ],
        0,
        "The denominator must include all relevant requests.",
      ),
      q(
        "Does a query result alone send an alert?",
        [
          "Yes",
          "No, scheduling and actions need configuration",
          "Only with SQL",
        ],
        1,
        "This lesson builds a signal; production alert delivery is separate.",
      ),
    ],
    source: doc("stats"),
  },
  {
    id: "capstone",
    module: 6,
    title: "Investigate the checkout incident",
    subtitle: "Bring the whole pipeline together.",
    minutes: 12,
    idea: "Move from a symptom to a focused, owned finding.",
    body: [
      "A customer reports checkout failures after 09:30. Start with that interval and compare services. Calculate request volume, failures, and average latency for the same population.",
      "Compute an error percentage, enrich the results with the owning team, and sort by impact. Switch between normal and incident traffic to see whether your query is sensitive to the behavior you care about.",
      "The incident fixture increases checkout failures and duration. A query can identify the affected service and its owner; these synthetic logs do not prove a root cause. In a real investigation, follow the evidence into traces, deployments, and dependencies.",
    ],
    keywords: [
      ["scope", "Choose the affected time range and population."],
      ["baseline", "Compare with normal behavior."],
      ["enrichment", "Attach the team that can investigate."],
      ["evidence", "Observed facts, distinct from a root-cause hypothesis."],
    ],
    spl: "index=web earliest=-30m latest=now\n| stats count AS requests count(eval(status>=500)) AS errors avg(duration) AS avg_ms by service\n| eval error_pct=round(100*errors/requests,2), avg_ms=round(avg_ms,2)\n| lookup service_owners service OUTPUT team\n| sort -error_pct",
    sql: "WITH signals AS (\n SELECT service, COUNT(*) AS requests,\n SUM(CASE WHEN status>=500 THEN 1 ELSE 0 END) AS errors,\n ROUND(AVG(duration),2) AS avg_ms,\n ROUND(100.0*SUM(CASE WHEN status>=500 THEN 1 ELSE 0 END)/COUNT(*),2) AS error_pct\n FROM events WHERE index_name='web' AND _time>=1736933400 AND _time<1736935200\n GROUP BY service\n)\nSELECT s.service, s.requests, s.errors, s.avg_ms, s.error_pct, o.team\nFROM signals s LEFT JOIN service_owners o USING(service)\nORDER BY error_pct DESC;",
    bridge:
      "A CTE separates signal calculation from enrichment, mirroring the SPL pipeline. Both queries use identical fixture data and time boundaries.",
    caution:
      "Correlation is not causation. This result supports “checkout is affected,” not “the payment provider caused the incident.”",
    challenge:
      "Produce the capstone summary, then keep only services with error_pct>20. Retain service, requests, errors, avg_ms, error_pct, and team.",
    solution:
      "index=web earliest=-30m latest=now | stats count AS requests count(eval(status>=500)) AS errors avg(duration) AS avg_ms by service | eval error_pct=round(100*errors/requests,2), avg_ms=round(avg_ms,2) | lookup service_owners service OUTPUT team | where error_pct>20",
    hint: "Build the full summary before applying the threshold. A valid query can return no rows for normal traffic.",
    questions: [
      q(
        "Which conclusion is supported by the incident fixture?",
        [
          "Checkout has elevated errors and latency",
          "The payment provider is definitely the root cause",
          "Every service is down",
        ],
        0,
        "The data shows the affected service, not a proven cause.",
      ),
      q(
        "Why test the solution on normal and incident data?",
        [
          "To catch queries that only fit one fixed output",
          "To change SPL syntax",
          "To avoid looking at results",
        ],
        0,
        "A useful search should respond to changing evidence.",
      ),
    ],
    source: doc("stats"),
  },
];
export const mappings = [
  {
    task: "Choose data",
    spl: "index=web",
    sql: "FROM events WHERE index_name='web'",
    note: "An index is a searchable collection, not a relational table.",
    lesson: "events",
  },
  {
    task: "Filter events",
    spl: "search status>=500",
    sql: "WHERE status >= 500",
    note: "search supports raw keywords and has different Boolean precedence.",
    lesson: "first-search",
  },
  {
    task: "Filter expressions",
    spl: "where duration>300",
    sql: "WHERE duration > 300",
    note: "SPL strings use double quotes; unquoted names reference fields.",
    lesson: "where",
  },
  {
    task: "Choose columns",
    spl: "table service status",
    sql: "SELECT service, status",
    note: "table is an output projection. fields has internal-field behavior.",
    lesson: "projection",
  },
  {
    task: "Calculate",
    spl: "eval seconds=duration/1000",
    sql: "SELECT duration/1000.0 AS seconds",
    note: "Preserve units and consider integer division in your SQL engine.",
    lesson: "eval",
  },
  {
    task: "Conditional values",
    spl: "eval x=if(status>=500,1,0)",
    sql: "CASE WHEN status>=500 THEN 1 ELSE 0 END",
    note: "case() in SPL chooses the first true branch.",
    lesson: "case",
  },
  {
    task: "Group & aggregate",
    spl: "stats count by service",
    sql: "SELECT service, COUNT(*) GROUP BY service",
    note: "Missing BY fields are excluded in SPL; SQL can group NULL.",
    lesson: "stats",
  },
  {
    task: "Filter groups",
    spl: "stats count by service | where count>5",
    sql: "GROUP BY service HAVING COUNT(*) > 5",
    note: "The filter runs after aggregation.",
    lesson: "groups",
  },
  {
    task: "Sort & limit",
    spl: "sort -duration | head 5",
    sql: "ORDER BY duration DESC LIMIT 5",
    note: "Splunk sort has a default 10,000-result limit. Use sort 0 deliberately.",
    lesson: "sort-dedup",
  },
  {
    task: "Unique representative",
    spl: "sort -duration | dedup service",
    sql: "ROW_NUMBER() OVER (PARTITION BY service ORDER BY duration DESC)",
    note: "Not equivalent to simply selecting DISTINCT whole rows.",
    lesson: "sort-dedup",
  },
  {
    task: "Group context",
    spl: "eventstats avg(duration) AS mean by service",
    sql: "AVG(duration) OVER (PARTITION BY service)",
    note: "Preserves events and attaches aggregate context.",
    lesson: "eventstats",
  },
  {
    task: "Running calculation",
    spl: "streamstats sum(bytes) AS total",
    sql: "SUM(bytes) OVER (ORDER BY _time ROWS UNBOUNDED PRECEDING)",
    note: "Sort the SPL stream first and specify the intended SQL frame.",
    lesson: "streamstats",
  },
  {
    task: "Time buckets",
    spl: "bin span=5m _time | stats count by _time",
    sql: "GROUP BY CAST(_time/300 AS INTEGER)*300",
    note: "This integer expression assumes positive Unix seconds and fixed UTC buckets.",
    lesson: "bin",
  },
  {
    task: "Enrich",
    spl: "lookup service_owners service OUTPUT team",
    sql: "LEFT JOIN service_owners USING(service)",
    note: "This comparison assumes a unique key in the lookup table.",
    lesson: "lookup",
  },
  {
    task: "Set membership",
    spl: "index=web [search index=auth | table user]",
    sql: "WHERE user IN (SELECT user FROM ...)",
    note: "A one-field analogy; multi-field subsearch formatting differs.",
    lesson: "subsearch",
  },
  {
    task: "Expand arrays",
    spl: "mvexpand tags",
    sql: "JSON_EACH(...) or UNNEST(...)",
    note: "SQL syntax varies by dialect. Expansion changes row counts.",
    lesson: "multivalue",
  },
  {
    task: "Read JSON",
    spl: "spath input=payload path=region output=region",
    sql: "JSON_EXTRACT(payload, '$.region')",
    note: "The playground SQL engine is SQLite with JSON functions.",
    lesson: "extract",
  },
  {
    task: "Missing values",
    spl: 'eval user=coalesce(user,"anonymous")',
    sql: "COALESCE(user, 'anonymous')",
    note: "Do not replace a missing measurement with zero without a reason.",
    lesson: "missing",
  },
];
