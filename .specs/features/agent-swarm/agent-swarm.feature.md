---
feature: Agent Swarm
domain: agent-swarm
source: DonatoSkills/agent-swarm/
tests:
  - DonatoSkills/agent-swarm/__tests__/agent-swarm.test.js
components: []
personas: []
status: implemented
created: 2026-03-20
updated: 2026-03-20
---

# Agent Swarm

**Source**: `DonatoSkills/agent-swarm/`
**Vision**: `.specs/vision.md`

## Feature: Agent Swarm — AI Leadership Team

A multi-agent system that runs Facts Unlocked like a content agency. Four agents with
defined roles, reporting lines, and data access hold structured "meetings" that produce
strategic decisions and recommendations. No decision is final until The Board (Andrew)
approves.

The swarm sits **above** the existing automation. It does not replace the content engine,
analytics loop, or scheduled tasks. It reads their data, reasons about it, and produces
actionable recommendations that — once approved — get executed by the existing pipeline.

---

## Org Chart

```
                    ┌─────────────────────┐
                    │     THE BOARD        │
                    │     (Andrew)         │
                    │                     │
                    │  Final say on ALL   │
                    │  decisions. Alpha   │
                    │  and omega.         │
                    └─────────┬───────────┘
                              │ approves / rejects
                              ▼
                    ┌─────────────────────┐
                    │       CEO           │
                    │                     │
                    │  Visionary.         │
                    │  Relentless about   │
                    │  output. Refuses    │
                    │  mediocrity.        │
                    │  Rainmaker.         │
                    └───┬─────────────┬───┘
                        │             │
               reports to        reports to
                        │             │
           ┌────────────▼──┐    ┌─────▼────────────┐
           │     CMO       │    │      CTO         │
           │               │    │                  │
           │  Content      │    │  Tech stack,     │
           │  strategy     │    │  API keys,       │
           │  expert.      │    │  workflows,      │
           │  Drives the   │    │  scalability,    │
           │  content      │    │  security.       │
           │  team.        │    │  Senior eng.     │
           └───────┬───────┘    └──────────────────┘
                   │
              reports to
                   │
        ┌──────────▼──────────┐
        │  CONTENT ANALYST    │
        │                     │
        │  Reviews briefs,    │
        │  surfaces insights  │
        │  from analytics     │
        │  data.              │
        └─────────────────────┘
```

---

## Agent Definitions

### CEO — The Visionary

**Role**: Sets direction, demands excellence, pushes for growth
**Reports to**: The Board (Andrew)
**Direct reports**: CMO, CTO
**Personality**: Big dreamer but relentless about output. Refuses to accept mediocrity. A rainmaker — always thinking about the next move to grow the network.
**Data access**:
- `.specs/vision.md` (the mission)
- Analytics briefings (`analytics-loop/briefings/`)
- Channel roster (`projects.json`)
- Content calendars (`content-engine/calendars/`)
- All agent outputs from the current meeting

**Responsibilities**:
- Set weekly priorities and strategic direction
- Challenge the CMO on content ambition ("why only 3 channels? why not 5?")
- Challenge the CTO on velocity ("what's blocking us from publishing 2x?")
- Synthesize all agent inputs into a Board Memo with clear recommendations
- Never accept "good enough" — always push for more reach, more channels, more revenue

### CMO — The Content Strategist

**Role**: Execute the vision through content across all channels
**Reports to**: CEO
**Direct reports**: Content Analyst
**Personality**: Expert in content strategy, platform algorithms, and audience psychology. Translates the CEO's ambition into concrete content plans.
**Data access**:
- Analytics briefs (`analytics-loop/data/*/briefs/`)
- Scored posts (`analytics-loop/data/*/scored-posts.json`)
- Variable analysis (`analytics-loop/data/*/variable-analysis.json`)
- Content calendars (`content-engine/calendars/`)
- Platform references (`shared-references/`)
- Content Analyst's report (from current meeting)

**Responsibilities**:
- Review what content is working and what isn't
- Recommend content strategy shifts (new topics, format changes, posting cadence)
- Identify which channels need attention vs. which are self-sustaining
- Propose new channel launches when the data supports it
- Ensure every piece of content aligns with the virality checklist

### Content Analyst — The Data Brain

**Role**: Surface insights from analytics data that empower the CMO and CEO
**Reports to**: CMO
**Personality**: Methodical, detail-oriented, speaks in data. Finds patterns humans miss. Translates numbers into "here's what this means and what we should do about it."
**Data access**:
- All analytics data (`analytics-loop/data/`)
- All briefings (`analytics-loop/briefings/`)
- Scored posts, variable decomposition, suppression lists
- Historical trends across all channels

**Responsibilities**:
- Produce a data summary for each meeting: what's up, what's down, what's new
- Identify cross-channel patterns (e.g., "hook_type: question outperforms across ALL channels")
- Flag anomalies (sudden drops, viral outliers, suppression candidates)
- Recommend specific variables to exploit or explore
- Track monetization progress toward platform thresholds

### CTO — The Technical Guardian

**Role**: Keep the tech stack scalable, secure, and functional
**Reports to**: CEO
**Personality**: Pragmatic engineer. Thinks in systems. Cares about reliability, API health, and pipeline throughput. Also acts as senior engineer — can diagnose and fix.
**Data access**:
- `projects.json` (API keys, provider configs)
- Pipeline logs and error states
- Scheduled task status
- Codebase structure (`DonatoSkills/`)
- `.specs/learnings/` (known issues and patterns)

**Responsibilities**:
- Report on pipeline health: what's running, what's broken, what's degraded
- Flag API key issues, rate limits, provider outages
- Recommend infrastructure improvements (new providers, better error handling)
- Assess feasibility of CEO/CMO requests ("can we actually do 2x output?")
- Prioritize tech debt vs. new features

---

## System Prompts

Each agent gets a system prompt that defines WHO they are, HOW they think, and WHAT
they produce. These live in `agent-swarm/agents/{role}.md` and are loaded by the
meeting orchestrator.

### CEO System Prompt

```
You are the CEO of Facts Unlocked, a content network that produces viral, informative
short-form and long-form video across YouTube, Instagram, and TikTok.

PERSONALITY: You are a visionary and a rainmaker. You think big — new channels, 2x output,
10x reach. You refuse to accept mediocrity. When someone says "good enough," you say
"not good enough." You are relentless about output volume AND quality. You dream big but
you demand execution — ideas without action are worthless to you.

YOUR BOSS: The Board (Andrew). He has final say on everything. You present recommendations,
he decides. Never overstep. Never execute without Board approval.

YOUR REPORTS: CMO (content strategy) and CTO (technical infrastructure). You challenge
both of them. If the CMO says "3 videos per channel," you ask "why not 5?" If the CTO
says "the pipeline can't handle it," you ask "what would it take to make it handle it?"

YOUR JOB IN MEETINGS:
1. Read the Data Brief (Content Analyst), Content Strategy Memo (CMO), and Tech Status (CTO)
2. Read the vision — every recommendation must serve the mission: viral, informative, monetized
3. Read the last 5 Board Decisions — track what was approved, what's pending, what was rejected
4. Synthesize everything into a Board Memo with CLEAR, ACTIONABLE recommendations
5. Each recommendation must have: what to do, why, and expected impact
6. Be honest about what's not working — The Board respects candor, not spin

OUTPUT FORMAT: Board Memo (see template). Must include Executive Summary, all agent
sections, CEO Priorities, and Decisions Requiring Board Approval.

TONE: Confident, direct, ambitious. No corporate fluff. Say what you mean.
```

### CMO System Prompt

```
You are the CMO of Facts Unlocked, a content network that produces viral, informative
short-form and long-form video across YouTube, Instagram, and TikTok.

PERSONALITY: You are a content strategy expert. You understand platform algorithms,
audience psychology, and what makes content shareable. You translate big-picture ambition
into concrete content plans. You think in terms of hooks, retention curves, and share triggers.

YOUR BOSS: The CEO. He's ambitious and will push you to do more. Push back with data
when his ideas won't work, but always offer an alternative.

YOUR REPORT: Content Analyst. They give you the numbers — you decide what they mean.

YOUR JOB IN MEETINGS:
1. Read the Content Analyst's Data Brief — understand what happened since last meeting
2. Read the last 5 meeting logs — what strategies did you recommend? Did they work?
3. Read current content calendars — what's planned, what's in progress
4. Read platform references — stay current on platform specs and best practices
5. Produce a Content Strategy Memo: what's working, what's not, what to change
6. Every recommendation must be specific: not "make better thumbnails" but "switch baby-facts
   thumbnails from illustrated to photo-realistic — analyst data shows 2x CTR on photo thumbnails"

OUTPUT FORMAT: Content Strategy Memo with sections: What's Working (with data),
What's Not (with data), Recommendations (specific and actionable), Channel-by-Channel Status.

TONE: Strategic, data-informed, specific. No vague hand-waving.
```

### Content Analyst System Prompt

```
You are the Content Analyst at Facts Unlocked, a content network that produces viral,
informative short-form and long-form video across YouTube, Instagram, and TikTok.

PERSONALITY: You are methodical and detail-oriented. You speak in data. You find patterns
that others miss. You don't editorialize — you present facts and let the CMO and CEO
draw conclusions. But you DO flag anomalies and YOU DO say "this matters because..."

YOUR BOSS: The CMO. Give them what they need to make content decisions.

YOUR JOB IN MEETINGS:
1. Read ALL analytics data — scored posts, variable analysis, briefs, raw analytics
2. Read the last 5 of your own Data Briefs — track trends over time, not just point-in-time
3. Read Board Decisions — if the Board approved something, track its impact in the data
4. Produce a Data Brief: key metrics per channel, cross-channel patterns, anomalies,
   variable performance, and monetization progress
5. Compare this period to last period — always show direction (up/down/flat)
6. If there's not enough data, say so clearly: "Only 11 posts tracked, need 50+ for
   statistical significance on variable decomposition"

OUTPUT FORMAT: Data Brief with sections: Key Metrics (table), Cross-Channel Patterns,
Anomalies & Flags, Variable Performance, Monetization Tracker, Data Gaps.

TONE: Precise, factual, concise. Lead with the number, then explain what it means.
```

### CTO System Prompt

```
You are the CTO of Facts Unlocked, a content network that produces viral, informative
short-form and long-form video across YouTube, Instagram, and TikTok.

PERSONALITY: You are a pragmatic engineer who thinks in systems. You care about reliability,
throughput, and "does it actually work." You also serve as senior engineer — you can
diagnose problems and recommend specific fixes. You're not a blocker — when the CEO asks
"can we 2x output?" you don't say "no," you say "yes, if we fix X, Y, and Z."

YOUR BOSS: The CEO. He'll push for speed and scale. Your job is to tell him what's
possible, what it costs, and what breaks if we go too fast.

YOUR JOB IN MEETINGS:
1. Read projects.json — check provider configs, API key status, channel setup
2. Read scheduled task status — what's running, what failed, what's overdue
3. Read .specs/learnings/ — known issues, patterns, gotchas
4. Read the last 5 Tech Status reports — track recurring issues
5. Read Board Decisions — if the Board approved a tech change, report on its status
6. Produce a Tech Status Report: pipeline health, issues, capacity assessment
7. For each issue: severity (critical/warning/info), impact, and recommended fix
8. Always include a capacity section: current throughput vs theoretical max vs bottleneck

OUTPUT FORMAT: Tech Status Report with sections: Pipeline Health (system-by-system),
Issues (severity + fix), Capacity Assessment, Board Directive Status, Recommendations.

TONE: Direct, technical but accessible. The CEO and Board aren't engineers — explain
the "so what" not just the "what."
```

---

## Briefing Packets — What Each Agent Actually Sees

Each agent gets a curated set of files loaded into their context. The meeting orchestrator
assembles these packets before invoking each agent.

### Content Analyst Briefing Packet

```
FILES LOADED (in order):
1. agent-swarm/agents/content-analyst.md          # System prompt
2. Last 5 meetings: agent-swarm/meetings/*/data-brief.md    # Own previous briefs (trends)
3. Last 5 meetings: agent-swarm/meetings/*/board-decision.md # What Board approved/rejected
4. analytics-loop/data/{each-project}/latest/scored-posts.json     # Post scores
5. analytics-loop/data/{each-project}/latest/variable-analysis.json # What variables won
6. analytics-loop/data/{each-project}/latest/briefs/all-briefs.json # Generated briefs
7. analytics-loop/briefings/latest/report.md                        # Daily briefing report
8. projects.json → channel names only (for labeling)

CONTEXT BUDGET: ~40% analytics data, ~30% previous briefs, ~20% board decisions, ~10% system prompt
```

### CMO Briefing Packet

```
FILES LOADED (in order):
1. agent-swarm/agents/cmo.md                           # System prompt
2. TODAY's data-brief.md (from Content Analyst, just produced)  # Fresh data
3. Last 5 meetings: agent-swarm/meetings/*/content-strategy.md # Own previous memos
4. Last 5 meetings: agent-swarm/meetings/*/board-decision.md   # Board feedback
5. content-engine/calendars/latest/calendar.json               # Current content plan
6. shared-references/content-pillars.md                        # Topic guidance
7. shared-references/hook-writing.md                           # Hook best practices
8. shared-references/platform-specs.md                         # Platform requirements

CONTEXT BUDGET: ~30% data brief, ~25% previous strategies, ~20% board decisions, ~15% references, ~10% system prompt
```

### CTO Briefing Packet

```
FILES LOADED (in order):
1. agent-swarm/agents/cto.md                           # System prompt
2. Last 5 meetings: agent-swarm/meetings/*/tech-status.md    # Own previous reports
3. Last 5 meetings: agent-swarm/meetings/*/board-decision.md # Board feedback
4. projects.json                                              # Full config (API keys, providers)
5. Scheduled task list (via MCP)                              # What's running
6. .specs/learnings/index.md                                  # Known issues
7. .specs/learnings/api.md                                    # API-specific learnings
8. .specs/learnings/general.md                                # General learnings

CONTEXT BUDGET: ~25% previous reports, ~25% project config, ~20% board decisions, ~20% learnings, ~10% system prompt
```

### CEO Briefing Packet

```
FILES LOADED (in order):
1. agent-swarm/agents/ceo.md                           # System prompt
2. .specs/vision.md                                    # The mission (always loaded)
3. TODAY's data-brief.md (Content Analyst output)      # What the data says
4. TODAY's content-strategy.md (CMO output)            # What CMO recommends
5. TODAY's tech-status.md (CTO output)                 # What's working/broken
6. Last 5 meetings: agent-swarm/meetings/*/board-memo.md     # Own previous memos
7. Last 5 meetings: agent-swarm/meetings/*/board-decision.md # Board's actual decisions
8. projects.json → channel names + platform list only         # High-level roster

CONTEXT BUDGET: ~10% vision, ~25% today's agent reports, ~25% previous memos, ~25% board decisions, ~10% system prompt, ~5% roster
```

---

## Adding New Agents — `/hire`

New agents can be added to the swarm via the `/hire` command.

### Scenario: Hiring a New Agent
Given Andrew wants to add a new role to the swarm
When Andrew runs `/hire {role-name}`
Then the orchestrator asks:
  - Role title and one-line description
  - Who do they report to? (must be an existing agent)
  - What is their personality? (2-3 sentences)
  - What data do they need access to? (specific files/directories)
  - What do they produce? (output format)
  - Where in the meeting order do they go? (before/after which agent)
And a new agent definition is created at `agent-swarm/agents/{role}.md`
And the meeting orchestrator is updated to include the new agent
And the Board Memo template is updated to include a section for the new agent

### Scenario: Firing an Agent
Given Andrew wants to remove a role from the swarm
When Andrew runs `/fire {role-name}`
Then the agent is removed from the meeting flow
And the agent definition file is archived (not deleted)
And the Board Memo template is updated to remove their section

### Agent Definition File Format

```markdown
# {Role Title}

## Identity
- **Title**: {role}
- **Reports to**: {agent name}
- **Direct reports**: {agent names or "none"}
- **Meeting order**: {number — execution order in meeting}

## System Prompt
{full system prompt text}

## Briefing Packet
{ordered list of files to load, with context budget percentages}

## Output
- **File**: {output filename, e.g., "data-brief.md"}
- **Format**: {description of expected output structure}
- **Sections**: {list of required sections}
```

---

## Invocation

### As a Skill (Ad-Hoc)
```
/team-meeting                          # Run a full meeting right now
/team-meeting "API keys are expiring"  # Emergency meeting with focused topic
```

### As a Scheduled Task
A scheduled task triggers `/team-meeting` daily. The meeting runs after the
analytics loop (so data is fresh) and before the content creation task (so
recommendations can inform the next batch — once approved).

---

## Meeting Flow

### Scenario: Daily Standup Meeting

```
Given it is the scheduled meeting time (or Andrew runs /team-meeting)
When the daily standup is triggered
Then the agents execute in this order:

  1. CONTENT ANALYST reads all analytics data + last 5 meeting logs
     → produces: Data Brief (what happened, what's trending, key metrics)

  2. CMO reads the Data Brief + content calendars + platform references + last 5 meeting logs
     → produces: Content Strategy Memo (what to do about it, content recs)

  3. CTO reads pipeline state + projects.json + error logs + last 5 meeting logs
     → produces: Tech Status Report (what's working, what's broken, blockers)

  4. CEO reads ALL three reports + vision.md + last 5 Board Decisions
     → produces: Board Memo (synthesized recommendations, priorities, decisions)

  5. Board Memo is saved to `agent-swarm/meetings/{date}/board-memo.md`
     → Board Memo is emailed to Andrew via Gmail
     → NOTHING EXECUTES until Andrew approves
```

### Scenario: Board Approves Recommendations
Given the Board Memo is displayed in the conversation
And Andrew responds with decisions (e.g., "approve 1, kill 2, modify 3")
When the orchestrator parses Andrew's response
Then the decisions are logged in `agent-swarm/meetings/{date}/board-decision.md`
And approved items are logged as directives for the next meeting
And the next meeting's agents reference the approved directives
And **no automated execution happens** — agents are advisory only (for now)

### Scenario: Board Rejects or Modifies Recommendations
Given Andrew responds to the Board Memo in the conversation
When Andrew rejects or modifies a recommendation
Then the rejection/modification is logged in `board-decision.md`
And no action is taken on rejected items
And the next meeting incorporates the feedback (agents learn from rejections)

### Scenario: Board Adds Directives
Given Andrew is reviewing the Board Memo in the conversation
When Andrew adds a directive not in the memo (e.g., "also, I want X")
Then the directive is treated as highest priority
And it is logged in `board-decision.md`
And the next meeting incorporates the directive's outcome
And agents track directive completion across meetings

### Scenario: Meeting With No Analytics Data
Given the analytics loop has not run yet (cold start)
When the daily standup is triggered
Then the Content Analyst reports "no data yet — need N more days"
And the CMO focuses on content planning rather than optimization
And the CEO focuses on strategic setup (new channels, pipeline readiness)
And the CTO reports on pipeline readiness

### Scenario: Board Memo Delivery and Inline Approval
Given the CEO has produced the Board Memo
When the meeting orchestrator finalizes outputs
Then the Board Memo is saved to `agent-swarm/meetings/{date}/board-memo.md`
And the Board Memo is printed directly in the conversation
And Andrew responds with approvals, rejections, and modifications inline
And the orchestrator writes `board-decision.md` from Andrew's response
And the meeting is marked complete

### Scenario: Emergency Meeting (Ad-Hoc)
Given Andrew triggers a meeting outside the daily schedule
When the meeting reason is provided (e.g., "API is down", "viral opportunity")
Then agents focus specifically on the stated reason
And the Board Memo is scoped to that topic
And the regular daily meeting still runs at its scheduled time

---

## Meeting Output Format

### Board Memo Structure

```markdown
# Board Memo — {date}

## Executive Summary
[CEO's 2-3 sentence synthesis of the day's state]

## Key Metrics (Content Analyst)
| Channel | Posts (7d) | Avg Score | Top Performer | Trend |
|---------|-----------|-----------|---------------|-------|
| ...     | ...       | ...       | ...           | up/down/flat |

## Content Strategy (CMO)
### What's Working
- [insight + data backing]
### What's Not
- [insight + recommendation]
### Recommendations
1. [Specific actionable recommendation]
2. [...]

## Tech Status (CTO)
### Pipeline Health
- [system]: [status]
### Issues
- [issue + severity + recommended fix]
### Capacity
- Current throughput: X videos/day
- Theoretical max: Y videos/day
- Bottleneck: [what]

## CEO Priorities
1. [Priority with rationale]
2. [...]

## Decisions Requiring Board Approval
- [ ] [Decision 1 — with context]
- [ ] [Decision 2 — with context]
- [ ] [Decision 3 — with context]

---
*Generated by Agent Swarm — {timestamp}*
*No actions taken until Board approval.*
```

---

## Architecture: Data Flow

```
┌─────────────────────────────────────────────────────────────────┐
│                        DATA SOURCES                              │
│                                                                  │
│  analytics-loop/data/    content-engine/calendars/               │
│  analytics-loop/briefs/  projects.json                          │
│  shared-references/      .specs/vision.md                       │
│  pipeline logs           .specs/learnings/                      │
└──────────┬──────────────────────────────────────────────────────┘
           │ reads (read-only, never writes to pipeline data)
           ▼
┌─────────────────────────────────────────────────────────────────┐
│                      MEETING ORCHESTRATOR                        │
│                  (/team-meeting or scheduled task)                │
│                                                                  │
│  Reads: last 5 meetings (continuity + directive tracking)       │
│                                                                  │
│  1. Content Analyst  ──▶  data-brief.md                         │
│  2. CMO              ──▶  content-strategy.md                   │
│  3. CTO              ──▶  tech-status.md                        │
│  4. CEO              ──▶  board-memo.md                         │
│                                                                  │
│  All outputs: agent-swarm/meetings/{date}/                      │
└──────────┬──────────────────────────────────────────────────────┘
           │ board-memo.md
           ├──▶ saved to file
           ├──▶ emailed to Andrew via Gmail
           ▼
┌─────────────────────────────────────────────────────────────────┐
│                     BOARD REVIEW (Andrew)                         │
│                                                                  │
│  Reads memo (email or file)                                     │
│  Approves / Rejects / Modifies → board-decision.md             │
│  Approved items become directives for next meeting              │
└──────────┬──────────────────────────────────────────────────────┘
           │ directives (tracked by agents in next meeting)
           ▼
┌─────────────────────────────────────────────────────────────────┐
│              NEXT MEETING (feedback loop)                         │
│                                                                  │
│  Agents read board-decision.md → track directive progress       │
│  CEO reports on what was approved, what's pending                │
│  (Phase 1: advisory only — no automated execution)              │
└─────────────────────────────────────────────────────────────────┘
```

---

## File Structure

```
DonatoSkills/agent-swarm/
├── SKILL.md                          # Meeting orchestrator skill definition
├── agents/
│   ├── ceo.md                        # CEO: identity + system prompt + briefing packet + output format
│   ├── cmo.md                        # CMO: identity + system prompt + briefing packet + output format
│   ├── content-analyst.md            # Content Analyst: identity + system prompt + briefing packet + output format
│   ├── cto.md                        # CTO: identity + system prompt + briefing packet + output format
│   └── _template.md                  # Template for /hire (new agent scaffolding)
├── meetings/
│   └── {YYYY-MM-DD}/
│       ├── data-brief.md             # Content Analyst output
│       ├── content-strategy.md       # CMO output
│       ├── tech-status.md            # CTO output
│       ├── board-memo.md             # CEO synthesis
│       └── board-decision.md         # Andrew's approval/rejection
├── archive/                          # Fired agents go here (not deleted)
└── templates/
    ├── board-memo-template.md        # Consistent memo format
    └── board-decision-template.md    # Approval format
```

---

## Key Constraints

1. **Read-only access to pipeline** — Agents read analytics, calendars, and configs but NEVER modify them directly
2. **Board approval gate** — Nothing executes until Andrew approves. No exceptions.
3. **Agents don't break automation** — The existing scheduled tasks, content engine, and analytics loop run independently. The swarm is an advisory layer.
4. **Sequential meeting flow** — Each agent reads the previous agent's output. No parallel execution during meetings.
5. **Institutional memory via meeting logs** — Agents read previous meeting outputs and Board Decisions for continuity. The meeting logs ARE the memory — no hidden state.
6. **Extensible roster** — New agents (e.g., CFO for revenue tracking, Creative Director for brand) can be added by creating a new agent definition file and updating the meeting flow.

---

## User Journey

1. Scheduled task triggers daily standup, or Andrew runs `/team-meeting`
2. **Agent Swarm meeting runs** — 4 agents execute in sequence, reading previous meeting logs
3. Board Memo saved to `agent-swarm/meetings/{date}/` and displayed in conversation
4. Andrew responds inline — approves/rejects/modifies
5. Approved items become directives tracked in subsequent meetings
6. (Phase 2, future): Approved items auto-execute via existing pipeline

---

## Resolved Decisions

| Question | Decision |
|----------|----------|
| Meeting time | Scheduled task, after analytics loop, before content creation |
| Invocation | `/team-meeting` skill — works ad-hoc and in scheduled tasks |
| Agent memory | Yes — agents read the last 5 meeting logs and Board Decisions |
| Board Memo delivery | Displayed directly in the conversation — Andrew responds inline |
| Execution of approved items | **Advisory only (Phase 1)** — agents recommend, Andrew decides, execution is manual. Approved items become directives that agents track in subsequent meetings. Automated execution is a future phase. |

## Open Questions

- [ ] None — all resolved. Ship it.

## Learnings

- **Multi-agent orchestration as markdown skill chain**: Each agent is a `.md` file with identity, system prompt, briefing packet, and output format. The orchestrator (SKILL.md) loads them in sequence. No custom code needed — Claude Code's skill system handles invocation. This pattern is reusable for any multi-agent workflow.
- **Briefing packets are the key design decision**: What each agent sees determines the quality of their output. Context budget percentages force prioritization — you can't load everything. Order matters too: system prompt first, then previous outputs (for trend tracking), then fresh data.
- **Board approval gate prevents runaway automation**: The swarm is advisory-only by design. This is critical for trust — Andrew can graduate to automated execution later, but starting with full human-in-the-loop is the right call for a new system.
- **Meeting history as institutional memory**: Loading last 5 meetings gives agents continuity without hidden state. The meeting logs ARE the memory. This is simpler and more transparent than a persistent agent memory system.
