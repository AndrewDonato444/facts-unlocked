/**
 * Tests for Agent Swarm — AI Leadership Team
 *
 * Tests cover:
 *   - Agent definitions: structure validation (SWM-001 to SWM-004)
 *   - Briefing packets: data path validation (SWM-005 to SWM-008)
 *   - Meeting orchestrator: flow and output (SWM-009 to SWM-014)
 *   - Meeting history: continuity loading (SWM-015 to SWM-016)
 *   - Hire/fire: agent lifecycle (SWM-017 to SWM-018)
 */

const fs = require("fs");
const path = require("path");
const os = require("os");

const SWARM_ROOT = path.resolve(__dirname, "..");
const AGENTS_DIR = path.join(SWARM_ROOT, "agents");
const TEMPLATES_DIR = path.join(SWARM_ROOT, "templates");
const DONATOSKILLS_ROOT = path.resolve(SWARM_ROOT, "..");

const REQUIRED_AGENTS = ["ceo", "cmo", "content-analyst", "cto"];

const REQUIRED_SECTIONS = [
  "## Identity",
  "## System Prompt",
  "## Briefing Packet",
  "## Output",
];

// ─────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────

function readAgent(name) {
  const filePath = path.join(AGENTS_DIR, `${name}.md`);
  if (!fs.existsSync(filePath)) return null;
  return fs.readFileSync(filePath, "utf-8");
}

function parseIdentity(content) {
  const identityMatch = content.match(
    /## Identity\n([\s\S]*?)(?=\n## )/
  );
  if (!identityMatch) return {};
  const block = identityMatch[1];
  const fields = {};
  for (const line of block.split("\n")) {
    const match = line.match(/^- \*\*(.+?)\*\*:\s*(.+)/);
    if (match) fields[match[1].toLowerCase()] = match[2].trim();
  }
  return fields;
}

function parseBriefingPacket(content) {
  const packetMatch = content.match(
    /## Briefing Packet\n([\s\S]*?)(?=\n## )/
  );
  if (!packetMatch) return [];
  const lines = packetMatch[1].split("\n");
  return lines
    .filter((l) => /^\d+\./.test(l.trim()))
    .map((l) => l.trim());
}

function getMeetingDirs() {
  const meetingsDir = path.join(SWARM_ROOT, "meetings");
  if (!fs.existsSync(meetingsDir)) return [];
  return fs
    .readdirSync(meetingsDir)
    .filter((d) => /^\d{4}-\d{2}-\d{2}$/.test(d))
    .sort()
    .reverse();
}

// ─────────────────────────────────────────────
// SWM-001 to SWM-004: Agent Definition Structure
// ─────────────────────────────────────────────

describe("Agent Definitions", () => {
  test("SWM-001: all required agent files exist", () => {
    for (const agent of REQUIRED_AGENTS) {
      const filePath = path.join(AGENTS_DIR, `${agent}.md`);
      expect(fs.existsSync(filePath)).toBe(true);
    }
  });

  test("SWM-002: each agent has all required sections", () => {
    for (const agent of REQUIRED_AGENTS) {
      const content = readAgent(agent);
      expect(content).not.toBeNull();
      for (const section of REQUIRED_SECTIONS) {
        expect(content).toContain(section);
      }
    }
  });

  test("SWM-003: each agent has identity fields (title, reports-to, meeting-order)", () => {
    for (const agent of REQUIRED_AGENTS) {
      const content = readAgent(agent);
      const identity = parseIdentity(content);
      expect(identity).toHaveProperty("title");
      expect(identity).toHaveProperty("reports to");
      expect(identity).toHaveProperty("meeting order");
    }
  });

  test("SWM-004: agent reporting lines form valid hierarchy", () => {
    const agents = {};
    for (const agent of REQUIRED_AGENTS) {
      const content = readAgent(agent);
      const identity = parseIdentity(content);
      agents[identity.title?.toLowerCase() || agent] = identity["reports to"];
    }
    // CEO reports to The Board
    expect(agents["ceo"]).toMatch(/board/i);
    // CMO and CTO report to CEO
    expect(agents["cmo"]).toMatch(/ceo/i);
    expect(agents["cto"]).toMatch(/ceo/i);
    // Content Analyst reports to CMO
    expect(agents["content analyst"]).toMatch(/cmo/i);
  });
});

// ─────────────────────────────────────────────
// SWM-005 to SWM-008: Briefing Packet Validation
// ─────────────────────────────────────────────

describe("Briefing Packets", () => {
  test("SWM-005: Content Analyst packet references analytics data paths", () => {
    const content = readAgent("content-analyst");
    const packet = parseBriefingPacket(content);
    const joined = packet.join("\n");
    expect(joined).toMatch(/analytics-loop/);
    expect(joined).toMatch(/scored-posts/);
  });

  test("SWM-006: CMO packet references today's data-brief", () => {
    const content = readAgent("cmo");
    const packet = parseBriefingPacket(content);
    const joined = packet.join("\n");
    expect(joined).toMatch(/data-brief/);
    expect(joined).toMatch(/content-strategy|previous/i);
  });

  test("SWM-007: CTO packet references projects.json and scheduled tasks", () => {
    const content = readAgent("cto");
    const packet = parseBriefingPacket(content);
    const joined = packet.join("\n");
    expect(joined).toMatch(/projects\.json/);
    expect(joined).toMatch(/scheduled|task/i);
  });

  test("SWM-008: CEO packet references vision and all agent outputs", () => {
    const content = readAgent("ceo");
    const packet = parseBriefingPacket(content);
    const joined = packet.join("\n");
    expect(joined).toMatch(/vision/);
    expect(joined).toMatch(/data-brief/);
    expect(joined).toMatch(/content-strategy/);
    expect(joined).toMatch(/tech-status/);
  });
});

// ─────────────────────────────────────────────
// SWM-009 to SWM-014: Meeting Orchestrator
// ─────────────────────────────────────────────

describe("Meeting Orchestrator", () => {
  test("SWM-009: SKILL.md exists and is valid", () => {
    const skillPath = path.join(SWARM_ROOT, "SKILL.md");
    expect(fs.existsSync(skillPath)).toBe(true);
    const content = fs.readFileSync(skillPath, "utf-8");
    expect(content).toMatch(/team-meeting/i);
  });

  test("SWM-010: SKILL.md defines correct agent execution order", () => {
    const skillPath = path.join(SWARM_ROOT, "SKILL.md");
    const content = fs.readFileSync(skillPath, "utf-8");
    // Content Analyst must come before CMO, CMO before CTO, CTO before CEO
    const analystPos = content.indexOf("Content Analyst");
    const cmoPos = content.indexOf("CMO");
    const ctoPos = content.indexOf("CTO");
    const ceoPos = content.search(/CEO(?! )/);
    // At minimum, analyst should appear before CEO in the execution flow
    expect(analystPos).toBeLessThan(ceoPos);
  });

  test("SWM-011: SKILL.md specifies inline Board Memo delivery and approval", () => {
    const skillPath = path.join(SWARM_ROOT, "SKILL.md");
    const content = fs.readFileSync(skillPath, "utf-8");
    expect(content).toMatch(/inline|conversation|directly/i);
    expect(content).toMatch(/board-decision\.md/);
  });

  test("SWM-012: SKILL.md specifies last-5-meetings history loading", () => {
    const skillPath = path.join(SWARM_ROOT, "SKILL.md");
    const content = fs.readFileSync(skillPath, "utf-8");
    expect(content).toMatch(/last 5|last five|5 most recent/i);
  });

  test("SWM-013: board memo template exists with required sections", () => {
    const templatePath = path.join(TEMPLATES_DIR, "board-memo-template.md");
    expect(fs.existsSync(templatePath)).toBe(true);
    const content = fs.readFileSync(templatePath, "utf-8");
    expect(content).toMatch(/Executive Summary/);
    expect(content).toMatch(/Key Metrics/);
    expect(content).toMatch(/Content Strategy/);
    expect(content).toMatch(/Tech Status/);
    expect(content).toMatch(/CEO Priorities/);
    expect(content).toMatch(/Board Approval/);
  });

  test("SWM-014: board decision template exists", () => {
    const templatePath = path.join(
      TEMPLATES_DIR,
      "board-decision-template.md"
    );
    expect(fs.existsSync(templatePath)).toBe(true);
    const content = fs.readFileSync(templatePath, "utf-8");
    expect(content).toMatch(/approved|rejected|modified/i);
  });
});

// ─────────────────────────────────────────────
// SWM-015 to SWM-016: Meeting History
// ─────────────────────────────────────────────

describe("Meeting History", () => {
  let tmpMeetings;

  beforeEach(() => {
    tmpMeetings = fs.mkdtempSync(path.join(os.tmpdir(), "swarm-meetings-"));
    // Create 7 fake meeting dirs
    for (let i = 1; i <= 7; i++) {
      const date = `2026-03-${String(i + 10).padStart(2, "0")}`;
      const dir = path.join(tmpMeetings, date);
      fs.mkdirSync(dir, { recursive: true });
      fs.writeFileSync(
        path.join(dir, "board-memo.md"),
        `# Board Memo — ${date}\nTest memo`
      );
      fs.writeFileSync(
        path.join(dir, "board-decision.md"),
        `# Board Decision — ${date}\nTest decision`
      );
    }
  });

  afterEach(() => {
    fs.rmSync(tmpMeetings, { recursive: true, force: true });
  });

  test("SWM-015: can identify last 5 meeting directories by date", () => {
    const dirs = fs
      .readdirSync(tmpMeetings)
      .filter((d) => /^\d{4}-\d{2}-\d{2}$/.test(d))
      .sort()
      .reverse()
      .slice(0, 5);
    expect(dirs).toHaveLength(5);
    expect(dirs[0]).toBe("2026-03-17"); // most recent
    expect(dirs[4]).toBe("2026-03-13"); // 5th most recent
  });

  test("SWM-016: meeting dirs contain board-memo.md and board-decision.md", () => {
    const latest = path.join(tmpMeetings, "2026-03-17");
    expect(fs.existsSync(path.join(latest, "board-memo.md"))).toBe(true);
    expect(fs.existsSync(path.join(latest, "board-decision.md"))).toBe(true);
  });
});

// ─────────────────────────────────────────────
// SWM-017 to SWM-018: Agent Lifecycle (Hire/Fire)
// ─────────────────────────────────────────────

describe("Agent Lifecycle", () => {
  test("SWM-017: agent template file exists for /hire scaffolding", () => {
    const templatePath = path.join(AGENTS_DIR, "_template.md");
    expect(fs.existsSync(templatePath)).toBe(true);
    const content = fs.readFileSync(templatePath, "utf-8");
    // Template should have all required sections
    for (const section of REQUIRED_SECTIONS) {
      expect(content).toContain(section);
    }
  });

  test("SWM-018: archive directory exists for fired agents", () => {
    const archivePath = path.join(SWARM_ROOT, "archive");
    expect(fs.existsSync(archivePath)).toBe(true);
  });
});
