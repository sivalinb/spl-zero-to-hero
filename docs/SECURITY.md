# Security boundaries

This application uses only bundled synthetic data. It does not collect credentials, connect to Splunk, load user files, or query a production service. No model API is required. Reference links navigate to external documentation only when the learner follows them.

SPL expressions are parsed into a small expression tree and evaluated against fixture rows; JavaScript eval and Function are not used. Regex extraction is deliberately constrained. Wildcards use a dedicated matcher. Query size, pipeline count, nesting, output size, and multivalue expansion are bounded.

SQLite runs in a disposable worker with a freshly seeded in-memory database. The worker accepts one SELECT/WITH statement and enables SQLite query_only mode after seeding. It limits returned rows and is terminated after four seconds or completion. Browser assets are bundled locally, including the SQLite WASM module. This is a browser resource boundary, not a server database authorization system.

Progress is stored under `spl-academy.progress.v1` in localStorage. It contains lesson IDs, completion timestamps, and a quiz score; it contains no name, email, or authentication secret. It can be edited or deleted by the browser owner and is not suitable as a certification record.

The optional WebMCP tools list lessons, evaluate synthetic queries, or navigate to a lesson. They have no tool to award progress, access storage, call external services, or execute SQL against anything other than the classroom fixture.

The public repository contains source code, licenses, original content, and fictional data. Hosting credentials, dependency caches, build output, local execution profiles, and runtime state must remain outside commits. A hosting project's identity should be configured for the deployment being managed rather than reused blindly from another user's checkout.

Report unexpected acceptance of unsupported query syntax as a correctness issue. Any future real-Splunk integration requires a separate authenticated backend and a new security review.
