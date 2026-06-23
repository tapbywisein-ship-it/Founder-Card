// Re-export the standard Playwright fixture so tests can `import { test, expect }`
// from a single place. Wrap with `test.extend(...)` here if shared fixtures are
// added later (e.g. an authenticated-user storage state).
export { test, expect } from "@playwright/test";
