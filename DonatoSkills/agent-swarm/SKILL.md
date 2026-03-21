---
name: team-meeting
description: "Run an Agent Swarm leadership meeting. Four AI agents (Content Analyst, CMO, CTO, CEO) analyze pipeline data and produce a Board Memo with strategic recommendations for Andrew's approval. Use when the user says 'team meeting', 'run a meeting', 'agent swarm', 'board meeting', 'standup', or 'leadership meeting'. Also triggered by the daily scheduled task."
---

# Agent Swarm — Team Meeting

Run a structured leadership meeting where four AI agents analyze the Facts Unlocked content pipeline and produce a Board Memo with recommendations. Nothing executes until The Board (Andrew) approves.

## How This Works

You are the **Meeting Orchestrator**. You invoke four agents in sequence, passing each agent's output to the next. The final output is a Board Memo presented inline for Andrew's approval.

```
Content Analyst → CMO → CTO → CEO → Board Memo → Inline Approval
```

Each agent has:
- A **system prompt** (defines personality, role, responsibilities)
- A **briefing packet** (specific files loaded into their context)
- An **output format** (structured markdown they must produce)

Agent definitions live in `agent-swarm/agents/*.md`. Read each one before invoking.

---

## Step 0: Determine Meeting Type

Check if the user provided a topic:

- **No topic** → Daily Standup (standard full meeting)
- **Topic provided** (e.g., `/team-meeting "API keys expiring"`) → Emergency Meeting (focused on topic)

For emergency meetings, prepend the topic to each agent's prompt:
> "EMERGENCY MEETING — Focus: {topic}. Address this specifically in your report."

---

## Step 1: Load Meeting History (Last 5 Meetings)

Before invoking any agent, load institutional memory:

1. List all directories in `agent-swarm/meetings/` matching `YYYY-MM-DD` pattern
2. Sort by date descending
3. Take the **5 most recent** meeting directories
4. From each, read:
   - `board-memo.md` (CEO's previous synthesis)
   - `board-decision.md` (Board's actual decisions — if it exists)
   - Each agent's output file (for their own trend tracking)

If fewer than 5 meetings exist, load all available. If zero exist, note "First meeting — no historical context."

---

## Step 2: Create Today's Meeting Directory

```
agent-swarm/meetings/{YYYY-MM-DD}/
```

Use today's date. If directory already exists (re-run), append a sequence number:
```
agent-swarm/meetings/2026-03-20-2/
```

---

## Step 3: Run Agents in Sequence

### Agent 1: Content Analyst (Meeting Order: 1)

**Read**: `agent-swarm/agents/content-analyst.md`
**Load briefing packet** (see agent file for exact file list):
- Own previous data briefs (last 5)
- Board decisions (last 5)
- Analytics data: scored-posts.json, variable-analysis.json, all-briefs.json for each project
- Latest daily briefing report
- Project names from projects.json

**Invoke agent** with system prompt + briefing packet.
**Save output** to `agent-swarm/meetings/{date}/data-brief.md`

### Agent 2: CMO (Meeting Order: 2)

**Read**: `agent-swarm/agents/cmo.md`
**Load briefing packet**:
- Today's `data-brief.md` (just produced by Content Analyst)
- Own previous content strategies (last 5)
- Board decisions (last 5)
- Latest content calendar
- Shared references: content-pillars.md, hook-writing.md, platform-specs.md

**Invoke agent** with system prompt + briefing packet.
**Save output** to `agent-swarm/meetings/{date}/content-strategy.md`

### Agent 3: CTO (Meeting Order: 3)

**Read**: `agent-swarm/agents/cto.md`
**Load briefing packet**:
- Own previous tech status reports (last 5)
- Board decisions (last 5)
- Full projects.json (API keys, providers, configs)
- Scheduled task list (call `list_scheduled_tasks` MCP tool)
- Learnings: index.md, api.md, general.md

**Invoke agent** with system prompt + briefing packet.
**Save output** to `agent-swarm/meetings/{date}/tech-status.md`

### Agent 4: CEO (Meeting Order: 4)

**Read**: `agent-swarm/agents/ceo.md`
**Load briefing packet**:
- `.specs/vision.md` (the mission — always first)
- Today's `data-brief.md` (Content Analyst)
- Today's `content-strategy.md` (CMO)
- Today's `tech-status.md` (CTO)
- Own previous board memos (last 5)
- Board decisions (last 5)
- Project channel names + platforms from projects.json

**Invoke agent** with system prompt + briefing packet.
**Use template**: `agent-swarm/templates/board-memo-template.md`
**Save output** to `agent-swarm/meetings/{date}/board-memo.md`

---

## Step 4: Present Board Memo for Inline Approval

After the CEO produces the Board Memo:

1. Read `agent-swarm/meetings/{date}/board-memo.md`
2. **Print the full Board Memo directly in the conversation**
3. Ask Andrew for his decisions:
   > "Board Memo delivered. What's your call on these decisions?"
4. **Wait for Andrew's response** — he will approve, reject, or modify each item inline
5. Parse Andrew's response and write `agent-swarm/meetings/{date}/board-decision.md`
6. Confirm the decisions are logged

The meeting happens in real-time. Andrew can ask follow-up questions, challenge recommendations, or add new directives — all within the same conversation.

---

## Step 5: Log Board Decision

After Andrew responds:

1. Create `agent-swarm/meetings/{date}/board-decision.md` from Andrew's response
2. For each decision item, log: approved / rejected / modified + any notes
3. Log any new Board Directives Andrew added
4. Confirm completion:

```
MEETING_COMPLETE
DATE: {YYYY-MM-DD}
AGENTS_RUN: Content Analyst, CMO, CTO, CEO
OUTPUTS:
  - agent-swarm/meetings/{date}/data-brief.md
  - agent-swarm/meetings/{date}/content-strategy.md
  - agent-swarm/meetings/{date}/tech-status.md
  - agent-swarm/meetings/{date}/board-memo.md
  - agent-swarm/meetings/{date}/board-decision.md
BOARD_DECISIONS_LOGGED: {count} decisions recorded
```

---

## Board Decision Continuity

The next meeting's agents will read `board-decision.md` and:
- Track approved items as active directives
- Note rejected items (don't re-propose without new data)
- Incorporate Board feedback into their analysis

---

## Key Rules

1. **Read-only pipeline access** — Agents read analytics, calendars, and configs. They NEVER modify pipeline data, run skills, or trigger automation.
2. **No autonomous execution** — The swarm is advisory only. Recommendations require Board approval. No exceptions.
3. **Sequential execution** — Each agent must complete before the next starts. No parallel agent invocation.
4. **Last 5 meetings** — Always load the 5 most recent meeting directories for continuity.
5. **Inline delivery** — Print the full Board Memo in the conversation. Andrew responds inline. No email, no async.
6. **Emergency meetings** — When a topic is provided, all agents focus on that topic. The daily standup still runs at its scheduled time.

---

## Adding/Removing Agents

### /hire {role-name}
1. Copy `agent-swarm/agents/_template.md` to `agent-swarm/agents/{role-name}.md`
2. Fill in: title, reports-to, meeting order, system prompt, briefing packet, output
3. Update this SKILL.md to include the new agent in the execution sequence
4. Update `agent-swarm/templates/board-memo-template.md` to include a section for the new agent

### /fire {role-name}
1. Move `agent-swarm/agents/{role-name}.md` to `agent-swarm/archive/{role-name}.md`
2. Remove the agent from the execution sequence in this SKILL.md
3. Remove their section from the board memo template
