# Testing Learnings

Patterns for testing in this codebase.

---

## Mocking

<!-- Patterns for mocking dependencies, APIs, etc. -->

_No learnings yet._

---

## Assertions

<!-- Common assertion patterns, custom matchers -->

_No learnings yet._

---

## Test Structure

**File system isolation in Node tests**: Use `fs.mkdtempSync(path.join(os.tmpdir(), 'prefix-'))` to create a fresh temp directory per test. No cleanup needed (OS clears `/tmp`). Avoids state leakage between tests and works without `beforeEach`/`afterEach`.

**Layered fixture helpers**: Write one `makeRecord(overrides)` helper that returns a valid object with sensible defaults. Tests only specify what they care about — everything else is noise-free. Apply the same pattern to `makePost`, `makeProject`, etc.

**Separate concerns for testability**: Split modules into pure-function layers (calculate → build → write). Test each layer independently before testing the full pipeline. This makes failure diagnosis fast — if `calculateCost` fails, you know it's not a file system issue.

---

## Integration Tests

<!-- End-to-end patterns, test databases, etc. -->

_No learnings yet._

---

## Edge Cases

<!-- Common edge cases to always test -->

_No learnings yet._
