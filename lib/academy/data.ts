export type Value = string | number | boolean | null | Value[];
export type Row = Record<string, Value>;
export type Scenario = "normal" | "incident";
export const START = Date.UTC(2025, 0, 15, 9, 0, 0) / 1000;
export const NOW = START + 3600;
export const owners: Row[] = [
  { service: "checkout", team: "Storefront", tier: "critical" },
  { service: "payments", team: "Payments", tier: "critical" },
  { service: "catalog", team: "Discovery", tier: "standard" },
];
export const users: Row[] = ["ava", "ben", "chen", "dia", "eli", "faye"].map(
  (user, i) => ({
    user,
    department: i % 2 ? "Engineering" : "Operations",
    region: i % 2 ? "eu-west" : "us-east",
  }),
);
export function events(scenario: Scenario = "normal"): Row[] {
  const rows: Row[] = [];
  for (let minute = 0; minute < 60; minute++) {
    ["checkout", "payments", "catalog"].forEach((service, n) => {
      const i = minute * 3 + n;
      const spike =
        scenario === "incident" && minute >= 30 && service === "checkout";
      const status =
        spike && minute % 4 !== 0
          ? 500
          : i % 17 === 0
            ? 500
            : i % 11 === 0
              ? 404
              : 200;
      const duration = 45 + ((i * 37) % 420) + (spike ? 750 : 0);
      const user = i % 13 === 0 ? null : users[i % users.length].user;
      rows.push({
        id: i + 1,
        _time: START + minute * 60 + n * 10,
        index: "web",
        sourcetype: "access_combined",
        source: "/var/log/access.log",
        host: `web-${n + 1}`,
        service,
        status,
        duration,
        bytes: 256 + ((i * 193) % 8000),
        user,
        method: i % 4 === 0 ? "POST" : "GET",
        path:
          service === "checkout"
            ? "/api/checkout"
            : service === "payments"
              ? "/api/payments"
              : "/products",
        session: `s-${Math.floor(minute / 5)}-${n}`,
        tags: n === 0 ? "web,paid" : "web,free",
        payload: JSON.stringify({
          region: i % 2 ? "eu-west" : "us-east",
          retry: i % 3,
        }),
        _raw: `service=${service} status=${status} duration=${duration}ms user=${user ?? "anonymous"} ${status >= 500 ? "ERROR upstream timeout" : status >= 400 ? "WARN not found" : "INFO request complete"}`,
      });
    });
  }
  for (let i = 0; i < 24; i++)
    rows.push({
      id: 181 + i,
      _time: START + i * 150,
      index: "auth",
      sourcetype: "auth_json",
      source: "/var/log/auth.log",
      host: "identity-1",
      service: "identity",
      user: users[i % 6].user,
      status: i % 5 === 0 ? 401 : 200,
      action: i % 5 === 0 ? "failure" : "success",
      _raw: `user=${users[i % 6].user} action=${i % 5 === 0 ? "failure" : "success"}`,
    });
  return rows.sort(
    (a, b) => Number(b._time) - Number(a._time) || Number(b.id) - Number(a.id),
  );
}
export const fieldNotes = [
  [
    "_time",
    "Timestamp",
    "Event time, stored as Unix seconds. All lesson times are UTC.",
  ],
  ["_raw", "Text", "The original log message. Keyword search looks here."],
  [
    "index",
    "Text",
    "The event collection: web or auth. SQL calls this index_name.",
  ],
  ["sourcetype", "Text", "The event format: access_combined or auth_json."],
  ["service", "Text", "checkout, payments, catalog, or identity."],
  [
    "status",
    "Number",
    "HTTP response code. 4xx = client error; 5xx = server error.",
  ],
  [
    "duration",
    "Number",
    "Request duration in milliseconds. Missing on auth events.",
  ],
  ["bytes", "Number", "Response size in bytes. Missing on auth events."],
  [
    "user",
    "Text / missing",
    "A synthetic user name. Some web events have no user.",
  ],
  ["host", "Text", "The server that produced the event."],
  ["session", "Text", "A synthetic session identifier for correlation."],
  [
    "tags",
    "Text",
    "Comma-separated tags; use split() to create multiple values.",
  ],
  [
    "payload",
    "JSON text",
    "Contains region and retry; extract them with spath.",
  ],
] as const;
