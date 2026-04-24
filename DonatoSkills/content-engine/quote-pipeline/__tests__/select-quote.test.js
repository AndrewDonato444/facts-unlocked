/**
 * select-quote.test.js — unit tests for the quote selector.
 *
 * Runs with node's built-in test runner. No deps.
 * Usage: node --test __tests__/select-quote.test.js
 *
 * Covers: roster parsing, no-repeat filtering, 70/30 weighting,
 * exhaustion, and malformed-line resilience.
 */

const { test } = require("node:test");
const assert = require("node:assert/strict");
const { execFileSync } = require("node:child_process");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");

const SELECTOR = path.join(__dirname, "..", "scripts", "select-quote.js");

// ── Test fixtures ──────────────────────────────────────────

const ROSTER_FIXTURE = `---
project: test-project
---

# Test Roster

## Theme: Test Theme A

- **Q001** — "First famous quote." — *Famous Author* [famous]
- **Q002** — "Second famous quote." — *Another Author* [famous]
- **Q003** — "First original quote." — *Baby Facts Unlocked* [original]

## Theme: Test Theme B

- **Q004** — "Third famous quote." — *Third Author* [famous]
- **Q005** — "Second original quote." — *Baby Facts Unlocked* [original]

## Theme: Malformed

- this line does not match the regex and should be silently skipped
- **Q006** — "Sixth famous quote." — *Sixth Author* [famous]
`;

/** Create an isolated project dir with a known roster + empty used.md. */
function makeProject(rosterText = ROSTER_FIXTURE, usedText = "") {
  const tmpRoot = fs.mkdtempSync(path.join(os.tmpdir(), "quote-test-"));
  const projectSlug = "test-project";
  const projectDir = path.join(tmpRoot, "quotes", projectSlug);
  fs.mkdirSync(projectDir, { recursive: true });
  fs.writeFileSync(path.join(projectDir, "roster.md"), rosterText);
  fs.writeFileSync(path.join(projectDir, "used.md"), usedText);

  // The selector expects to be invoked from the content-engine/quote-pipeline/scripts
  // directory and walks up: scripts/ -> pipeline/ -> content-engine/ -> quotes/<project>.
  // Mimic that structure by symlinking.
  const fakeScriptsDir = path.join(tmpRoot, "pipeline", "scripts");
  fs.mkdirSync(fakeScriptsDir, { recursive: true });
  // Resolve real path of selector to keep the script source of truth
  return { tmpRoot, projectSlug, projectDir };
}

/** Run the selector against a tmp project and return its parsed JSON output. */
function runSelector(projectDir, { commit = false, platforms = "tiktok" } = {}) {
  const args = ["--project", "test-project"];
  if (commit) args.push("--commit", "--platforms", platforms, "--campaign", "test-campaign");

  // The selector builds its path from __dirname:
  // const QUOTES_DIR = path.join(__dirname, "..", "..", "quotes", project);
  // So __dirname must be <tmp>/<anything>/<anything>/scripts for "..", ".." to land at <tmp>.
  // Simplest: copy the selector into a tmp scripts dir at the right depth.
  const realSelector = fs.readFileSync(SELECTOR, "utf8");
  const tmpRoot = path.dirname(path.dirname(projectDir)); // <tmp>/quotes/test-project -> <tmp>
  const tmpScripts = path.join(tmpRoot, "pipeline", "scripts");
  fs.mkdirSync(tmpScripts, { recursive: true });
  const tmpSelector = path.join(tmpScripts, "select-quote.js");
  fs.writeFileSync(tmpSelector, realSelector);

  try {
    const stdout = execFileSync("node", [tmpSelector, ...args], {
      encoding: "utf8",
    });
    return { json: JSON.parse(stdout), status: 0 };
  } catch (err) {
    return { json: null, status: err.status, stderr: err.stderr?.toString() || "" };
  }
}

// ── Tests ──────────────────────────────────────────────────

test("happy path — returns a valid quote with required fields", () => {
  const { projectDir } = makeProject();
  const { json, status } = runSelector(projectDir);
  assert.equal(status, 0);
  assert.ok(json.id.match(/^Q\d{3}$/), "id is Q### format");
  assert.ok(typeof json.text === "string" && json.text.length > 0);
  assert.ok(typeof json.attribution === "string" && json.attribution.length > 0);
  assert.ok(["famous", "original"].includes(json.type));
  assert.equal(json.project, "test-project");
});

test("roster parser — 6 quotes (5 valid + 1 malformed silently skipped)", () => {
  const { projectDir } = makeProject();
  const { json } = runSelector(projectDir);
  assert.equal(json.selection_stats.total_in_roster, 6, "6 valid quotes parsed, malformed line dropped");
});

test("no-repeat — used quotes are excluded from the pool", () => {
  // Mark Q001 through Q005 as used — only Q006 should be selectable.
  const used = [
    "Q001 | 2026-04-01 | tiktok | test",
    "Q002 | 2026-04-02 | tiktok | test",
    "Q003 | 2026-04-03 | tiktok | test",
    "Q004 | 2026-04-04 | tiktok | test",
    "Q005 | 2026-04-05 | tiktok | test",
  ].join("\n") + "\n";
  const { projectDir } = makeProject(ROSTER_FIXTURE, used);

  for (let i = 0; i < 10; i++) {
    const { json } = runSelector(projectDir);
    assert.equal(json.id, "Q006", "only Q006 is unused and must be returned every time");
  }
});

test("exhaustion — exits non-zero with a human-readable error", () => {
  const used = Array.from({ length: 6 }, (_, i) => `Q00${i + 1} | 2026-04-0${i + 1} | tiktok | test`).join("\n") + "\n";
  const { projectDir } = makeProject(ROSTER_FIXTURE, used);
  const { status, stderr } = runSelector(projectDir);
  assert.notEqual(status, 0, "exits non-zero on exhaustion");
  assert.match(stderr, /exhausted/i, "error message mentions exhaustion");
});

test("commit mode — appends the selected quote to used.md", () => {
  const { projectDir } = makeProject();
  const { json, status } = runSelector(projectDir, {
    commit: true,
    platforms: "tiktok,instagram,youtube",
  });
  assert.equal(status, 0);
  assert.equal(json.committed, true);

  const used = fs.readFileSync(path.join(projectDir, "used.md"), "utf8");
  assert.match(used, new RegExp(`^${json.id} \\| \\d{4}-\\d{2}-\\d{2} \\| tiktok,instagram,youtube \\| test-campaign$`, "m"));
});

test("weighting — 70/30 famous/original distribution holds over many samples", () => {
  // Build a roster with exactly 1 famous + 1 original so the pick cleanly reflects weighting
  const minimal = `## Theme: T
- **Q001** — "Famous one." — *Author* [famous]
- **Q002** — "Original one." — *Baby Facts Unlocked* [original]
`;
  const { projectDir } = makeProject(minimal);

  const N = 200;
  let famousCount = 0;
  for (let i = 0; i < N; i++) {
    const { json } = runSelector(projectDir);
    if (json.type === "famous") famousCount++;
  }
  const famousRatio = famousCount / N;
  // Expected 0.70 famous. Allow ±0.10 band for sample noise at N=200.
  assert.ok(
    famousRatio >= 0.6 && famousRatio <= 0.8,
    `famous ratio ${famousRatio.toFixed(2)} outside tolerance [0.60, 0.80] over ${N} samples`
  );
});

test("weighting — falls back to single bucket when the other is empty", () => {
  const onlyOriginals = `## Theme: T
- **Q001** — "Only one." — *Baby Facts Unlocked* [original]
- **Q002** — "Another one." — *Baby Facts Unlocked* [original]
`;
  const { projectDir } = makeProject(onlyOriginals);
  for (let i = 0; i < 10; i++) {
    const { json } = runSelector(projectDir);
    assert.equal(json.type, "original", "must pick from the non-empty bucket");
  }
});

test("selection_stats — counts reflect pool state after filtering", () => {
  const used = "Q001 | 2026-04-01 | tiktok | test\n";
  const { projectDir } = makeProject(ROSTER_FIXTURE, used);
  const { json } = runSelector(projectDir);
  assert.equal(json.selection_stats.total_in_roster, 6);
  assert.equal(json.selection_stats.used, 1);
  assert.equal(json.selection_stats.eligible, 5);
  assert.equal(
    json.selection_stats.famous_in_pool + json.selection_stats.original_in_pool,
    5
  );
});
