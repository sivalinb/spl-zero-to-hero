import { lessons } from "./curriculum";
import { runSPL } from "./engine";
import type { Scenario } from "./data";
type Tool = {
  name: string;
  description: string;
  inputSchema: Record<string, unknown>;
  annotations?: { readOnlyHint: boolean };
  execute: (args: Record<string, unknown>) => Promise<unknown>;
};
type ModelContext = {
  registerTool: (
    tool: Tool,
    options?: { signal: AbortSignal },
  ) => Promise<void>;
};
/** Optional progressive enhancement following the current Document.modelContext draft. */
export function registerAcademyTools(): () => void {
  const context = (document as Document & { modelContext?: ModelContext })
    .modelContext;
  if (!context) return () => {};
  const controller = new AbortController();
  const definitions: Tool[] = [
    {
      name: "spl_academy_list_lessons",
      description:
        "List the SPL academy lesson IDs, titles, and example queries.",
      inputSchema: {
        type: "object",
        properties: {},
        additionalProperties: false,
      },
      annotations: { readOnlyHint: true },
      execute: async () => ({
        lessons: lessons.map((l) => ({
          id: l.id,
          title: l.title,
          spl: l.spl,
          sql: l.sql,
        })),
      }),
    },
    {
      name: "spl_academy_run_query",
      description:
        "Run supported classic SPL against synthetic classroom events. Returns results and pipeline stage counts; does not access Splunk or modify learner progress.",
      inputSchema: {
        type: "object",
        properties: {
          query: { type: "string", maxLength: 6000 },
          scenario: { type: "string", enum: ["normal", "incident"] },
        },
        required: ["query"],
        additionalProperties: false,
      },
      annotations: { readOnlyHint: true },
      execute: async (args) => {
        if (typeof args.query !== "string")
          throw new Error("query must be a string");
        if (
          args.scenario !== undefined &&
          !["normal", "incident"].includes(String(args.scenario))
        )
          throw new Error("Invalid scenario");
        const r = runSPL(args.query, (args.scenario ?? "normal") as Scenario);
        return {
          rows: r.rows.slice(0, 200),
          rowCount: r.rows.length,
          columns: r.columns,
          truncated: r.rows.length > 200,
          stages: r.stages.map((s) => ({
            command: s.command,
            rows: s.rows.length,
            explanation: s.explanation,
          })),
        };
      },
    },
    {
      name: "spl_academy_open_lesson",
      description:
        "Navigate the visible academy to a lesson. Does not mark completion or change saved progress.",
      inputSchema: {
        type: "object",
        properties: {
          lessonId: { type: "string", enum: lessons.map((l) => l.id) },
        },
        required: ["lessonId"],
        additionalProperties: false,
      },
      execute: async (args) => {
        const l = lessons.find((l) => l.id === args.lessonId);
        if (!l) throw new Error("Unknown lesson");
        window.location.hash = `learn/${l.id}`;
        return { opened: l.id, title: l.title };
      },
    },
  ];
  for (const definition of definitions) {
    try {
      void Promise.resolve(
        context.registerTool(definition, { signal: controller.signal }),
      ).catch(() => {});
    } catch {
      /* Older draft implementations are optional. */
    }
  }
  return () => controller.abort();
}
