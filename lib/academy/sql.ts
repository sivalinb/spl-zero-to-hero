import { events, owners, users, type Row, type Scenario } from "./data";
export function runSQL(
  query: string,
  scenario: Scenario = "normal",
): Promise<{ rows: Row[]; columns: string[] }> {
  return new Promise((resolve, reject) => {
    const worker = new Worker(
      new URL(
        `${import.meta.env.BASE_URL}sqlite/worker.js`,
        window.location.origin,
      ),
    );
    const cleanup = () => {
      clearTimeout(timer);
      worker.terminate();
    };
    const timer = setTimeout(() => {
      cleanup();
      reject(
        new Error(
          "The query exceeded the 4-second practice limit. Reduce the joins or result size.",
        ),
      );
    }, 4000);
    worker.onmessage = ({ data }) => {
      cleanup();
      if (data.error) reject(new Error(data.error));
      else resolve(data);
    };
    worker.onerror = () => {
      cleanup();
      reject(
        new Error("SQLite could not load. Reload this page and try again."),
      );
    };
    worker.postMessage({
      query,
      tables: {
        events: events(scenario).map(({ index, ...r }) => ({
          ...r,
          index_name: index,
        })),
        service_owners: owners,
        users,
      },
    });
  });
}
