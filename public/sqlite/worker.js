/* SQLite runs in a disposable worker: no server, credentials, or production data. */
importScripts("./sql-wasm.js");
const ready = initSqlJs({
  locateFile: (file) => new URL(file, self.location.href).href,
});
self.onmessage = async ({ data }) => {
  let db;
  try {
    const { query, tables } = data;
    if (
      typeof query !== "string" ||
      query.length > 6000 ||
      !/^\s*(SELECT|WITH)\b/i.test(query)
    )
      throw Error("Use one SELECT or WITH query, under 6,000 characters.");
    // Remove quoted literals and SQL comments before checking statement separators.
    const stripped = query
      .replace(/'(?:''|[^'])*'|"(?:""|[^"])*"|--[^\n]*|\/\*[\s\S]*?\*\//g, " ")
      .trim()
      .replace(/;\s*$/, "");
    if (stripped.includes(";")) throw Error("Run one SQL statement at a time.");
    const SQL = await ready;
    db = new SQL.Database();
    for (const [name, rows] of Object.entries(tables)) {
      if (!["events", "service_owners", "users"].includes(name))
        throw Error("Unknown fixture table.");
      const cols = [...new Set(rows.flatMap(Object.keys))];
      const safe = (c) => '"' + c.replace(/"/g, '""') + '"';
      db.run(
        "CREATE TABLE " +
          safe(name) +
          "(" +
          cols
            .map(
              (c) =>
                safe(c) +
                (rows.some((r) => typeof r[c] === "number")
                  ? " REAL"
                  : " TEXT"),
            )
            .join(",") +
          ")",
      );
      const statement = db.prepare(
        "INSERT INTO " +
          safe(name) +
          " VALUES (" +
          cols.map(() => "?").join(",") +
          ")",
      );
      for (const row of rows) statement.run(cols.map((c) => row[c] ?? null));
      statement.free();
    }
    db.run("PRAGMA query_only=ON");
    const stmt = db.prepare(query),
      rows = [],
      columns = stmt.getColumnNames();
    while (stmt.step()) {
      if (rows.length === 5000)
        throw Error("Result exceeds 5,000 rows. Add a LIMIT.");
      rows.push(stmt.getAsObject());
    }
    stmt.free();
    self.postMessage({ rows, columns });
  } catch (error) {
    self.postMessage({
      error: error instanceof Error ? error.message : String(error),
    });
  } finally {
    db?.close();
  }
};
