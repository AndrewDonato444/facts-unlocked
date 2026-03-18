# Project Registry

The project registry (`projects.json` in the DonatoSkills root) is a **routing table** that maps project folders to their Buffer channels and API keys.

**Every skill reads this file.** It answers: "What social channels go with this project?"

---

## Why This Exists

You work inside a project folder. The project folder has the code, the brand context (`.specs/`), the content. But it doesn't know which Buffer channels to post to or which API keys to use.

`projects.json` bridges that gap:

```
~/acme-corp/          ← you work here (code, .specs/, brand context)
   └── .specs/

~/my-saas/            ← different project, different folder
   └── .specs/

~/DonatoSkills/
   └── projects.json  ← routes each folder to its Buffer channels + API keys
```

Each project entry maps a folder to:
- A set of **Buffer channels** (which social accounts to post to)
- **API credentials** (which Buffer account, which Cloudinary account)
- **Default settings** (tone, posting frequency, content pillars)

The **brand context itself** (vision, personas, design tokens) lives in the project folder's `.specs/` directory — not in `projects.json`. The registry just points to it via `specs_path`.

---

## Schema

```json
{
  "_schema": "DonatoSkills Project Registry v1",
  "_docs": "shared-references/project-registry.md",

  "projects": {
    "project-slug": {
      "name": "Human-Readable Name",
      "description": "Brief description of this project/brand",
      "specs_path": "/absolute/path/to/.specs/",
      "brand_brief": "relative/path/to/brand-brief.md",
      "buffer": {
        "api_key_env": "BUFFER_API_KEY",
        "organization_id": "org_id_from_buffer",
        "channels": {
          "twitter": {
            "id": "buffer_channel_id",
            "name": "display_name",
            "username": "@handle"
          },
          "instagram": {
            "id": "buffer_channel_id",
            "name": "display_name",
            "username": "@handle"
          }
        }
      },
      "zernio": {
        "api_key_env": "ZERNIO_API_KEY",
        "profile_id": "prof_id_from_late",
        "accounts": {
          "twitter": {
            "id": "zernio_account_id",
            "name": "display_name",
            "username": "@handle"
          }
        }
      },
      "cloudinary": {
        "cloud_name_env": "CLOUDINARY_CLOUD_NAME",
        "api_key_env": "CLOUDINARY_API_KEY",
        "api_secret_env": "CLOUDINARY_API_SECRET"
      },
      "tts": {
        "providers": ["elevenlabs", "grok", "gemini"],
        "default_provider": "elevenlabs",
        "elevenlabs": {
          "api_key_env": "ELEVENLABS_API_KEY",
          "default_voice_id": "pNInz6obpgDQGcFmaJgB",
          "default_voice_name": "Adam",
          "model_id": "eleven_multilingual_v2"
        },
        "grok": {
          "api_key_env": "GROK_API_KEY",
          "default_voice": "onyx"
        },
        "gemini": {
          "api_key_env": "GEMINI_API_KEY",
          "default_voice": "Kore"
        }
      },
      "image_gen": {
        "providers": ["gemini", "openai"],
        "default_provider": "gemini",
        "provider": "gemini",
        "api_key_env": "GEMINI_API_KEY",
        "default_model": "gemini-2.5-flash-image",
        "openai": {
          "api_key_env": "OPENAI_API_KEY",
          "default_model": "gpt-image-1"
        }
      },
      "analytics_loop": {
        "collection_window_hours": 48,
        "min_impressions": 500,
        "exploit_explore_ratio": [2, 1],
        "scoring_weights": {
          "shares": 4,
          "saves": 3,
          "comments": 2,
          "likes": 1
        },
        "template_promotion": {
          "min_lift": 0.15,
          "min_channels": 2,
          "min_cycles": 2,
          "min_sample": 6
        }
      },
      "defaults": {
        "tone": "casual, funny, confident",
        "content_pillars": ["product", "education", "personality"],
        "posting_frequency": {
          "twitter": "daily",
          "instagram": "3x/week"
        }
      },
      "created": "2026-03-15",
      "updated": "2026-03-15"
    }
  },

  "default_project": "project-slug"
}
```

---

## Field Reference

### Project Fields

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `name` | string | Yes | Human-readable project/brand name |
| `description` | string | No | Brief description of the brand/audience |
| `specs_path` | string\|null | No | Absolute path to the project's `.specs/` directory (for SDD projects). If set, skills read vision.md, personas, and design tokens from here. |
| `brand_brief` | string\|null | No | Relative path (from DonatoSkills root) to the brand brief markdown file |
| `buffer` | object | No* | Buffer API configuration for this project |
| `zernio` | object | No* | Zernio API configuration for this project |
| `cloudinary` | object | No | Cloudinary configuration (can be shared across projects) |
| `tts` | object | No | TTS provider configuration — which providers are enabled, default voices, API keys |
| `image_gen` | object | No | Image generation configuration — provider, model, API key |
| `analytics_loop` | object | No | Analytics loop configuration — scoring weights, collection window, template promotion rules |
| `defaults` | object | No | Default content settings for this project |
| `created` | string | Yes | ISO date when the project was added |
| `updated` | string | Yes | ISO date of last update |

*At least one scheduling backend (`buffer` or `zernio`) is required.

### Buffer Fields

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `api_key_env` | string | Yes | Name of the environment variable containing the Buffer API key. Defaults to `BUFFER_API_KEY`. For multiple Buffer accounts, use unique names like `BUFFER_API_KEY_CLIENT_XYZ`. |
| `organization_id` | string\|null | No | Buffer organization ID. If null, the skill queries it on first use and can backfill this field. |
| `channels` | object | Yes | Map of platform → channel config. Keys are platform names (`twitter`, `instagram`, `linkedin`, `tiktok`, `facebook`, `youtube`, `threads`, `bluesky`, `mastodon`). |

### Channel Fields (Buffer)

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `id` | string | Yes | Buffer channel ID (used in API calls) |
| `name` | string | Yes | Display name of the channel |
| `username` | string | No | Platform username/handle |

### Zernio Fields

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `api_key_env` | string | Yes | Name of the env var containing the Zernio API key (starts with `sk_`). Defaults to `ZERNIO_API_KEY`. |
| `profile_id` | string\|null | No | Zernio profile ID. Used for queue scheduling (`queuedFromProfile`). If null, the skill queries it on first use. |
| `accounts` | object | Yes | Map of platform → account config. Keys are platform names (`twitter`, `instagram`, etc.). |

### Account Fields (Zernio)

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `id` | string | Yes | Zernio account ID (used as `accountId` in API calls) |
| `name` | string | Yes | Display name of the account |
| `username` | string | No | Platform username/handle |

### Cloudinary Fields

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `cloud_name_env` | string | Yes | Env var for Cloudinary cloud name |
| `api_key_env` | string | Yes | Env var for Cloudinary API key |
| `api_secret_env` | string | Yes | Env var for Cloudinary API secret |

### TTS Fields

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `providers` | string[] | Yes | Enabled TTS providers: `"grok"`, `"gemini"`, `"elevenlabs"`. Order = preference for rotation. |
| `default_provider` | string | Yes | Which provider to use when no preference specified |
| `elevenlabs` | object | No | ElevenLabs config (required if `"elevenlabs"` in providers) |
| `elevenlabs.api_key_env` | string | Yes | Env var name for ElevenLabs API key |
| `elevenlabs.default_voice_id` | string | No | Voice ID (e.g., `"pNInz6obpgDQGcFmaJgB"` for Adam) |
| `elevenlabs.default_voice_name` | string | No | Human-readable voice name |
| `elevenlabs.model_id` | string | No | Model ID. Default: `"eleven_multilingual_v2"` |
| `grok` | object | No | Grok TTS config (required if `"grok"` in providers) |
| `grok.api_key_env` | string | Yes | Env var name for Grok/xAI API key |
| `grok.default_voice` | string | No | Voice name (e.g., `"onyx"`, `"nova"`) |
| `gemini` | object | No | Gemini TTS config (required if `"gemini"` in providers) |
| `gemini.api_key_env` | string | Yes | Env var name for Gemini API key |
| `gemini.default_voice` | string | No | Voice name (e.g., `"Kore"`, `"Puck"`) |

### Image Generation Fields

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `providers` | string[] | No | Enabled image gen providers: `"gemini"`, `"openai"`. Order = preference. If omitted, uses `provider` field. |
| `default_provider` | string | No | Which provider to use when no preference specified. Falls back to `provider` field. |
| `provider` | string | Yes | Primary image gen provider (`"gemini"` or `"openai"`) |
| `api_key_env` | string | Yes | Env var name for the primary provider's API key |
| `default_model` | string | No | Default model ID. Gemini: `"gemini-2.5-flash-image"` (fast), `"gemini-3-pro-image-preview"` (quality). OpenAI: `"gpt-image-1"` (quality), `"gpt-image-1-mini"` (fast). |
| `openai` | object | No | OpenAI-specific config (required if `"openai"` in providers) |
| `openai.api_key_env` | string | Yes | Env var name for OpenAI API key |
| `openai.default_model` | string | No | Default model: `"gpt-image-1"` or `"gpt-image-1-mini"` |
| `gemini` | object | No | Gemini-specific config (when using multi-provider with explicit blocks) |
| `gemini.api_key_env` | string | Yes | Env var name for Gemini API key |
| `gemini.default_model` | string | No | Default model: `"gemini-2.5-flash-image"` or `"gemini-3-pro-image-preview"` |

### Analytics Loop Fields

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `collection_window_hours` | number | No | How many hours after publishing to wait before scoring. Default: `48`. |
| `min_impressions` | number | No | Posts below this threshold are excluded from scoring. Default: `500`. Lower to `200` for new/small channels. |
| `exploit_explore_ratio` | number[] | No | Ratio of exploit to explore briefs per channel. Default: `[2, 1]` (2 exploit + 1 explore). |
| `scoring_weights` | object | No | Override formula weights. Keys: `shares`, `saves`, `comments`, `likes`. Defaults: `4, 3, 2, 1`. |
| `template_promotion` | object | No | Rules for when a new winning template replaces the current one. |
| `template_promotion.min_lift` | number | No | Minimum improvement over current template to trigger switch. Default: `0.15` (15%). |
| `template_promotion.min_channels` | number | No | Minimum channels showing improvement. Default: `2`. Raise to 3-5 for large networks (10+ channels). |
| `template_promotion.min_cycles` | number | No | Minimum consecutive scoring cycles. Default: `2`. |
| `template_promotion.min_sample` | number | No | Minimum posts with the new combination. Default: `10`. |

### Multi-Channel Zernio Configuration

For projects with many channels (e.g., "Facts Unlocked" with 20 topic channels), the `zernio` config can optionally use a `channels` array instead of the flat `accounts` map:

```json
{
  "zernio": {
    "api_key_env": "ZERNIO_API_KEY",
    "channels": [
      {
        "name": "Love Facts Unlocked",
        "profile_id": "prof_love",
        "accounts": {
          "tiktok": { "id": "acc_love_tt", "name": "LoveFactsUnlocked" },
          "youtube": { "id": "acc_love_yt", "name": "Love Facts Unlocked" },
          "instagram": { "id": "acc_love_ig", "name": "lovefactsunlocked" }
        },
        "topic": "love, relationships, romance",
        "content_pillars": ["dating stats", "relationship psychology", "love history"]
      },
      {
        "name": "Money Facts Unlocked",
        "profile_id": "prof_money",
        "accounts": { "...": "..." },
        "topic": "finance, money, wealth",
        "content_pillars": ["wealth statistics", "financial psychology", "money history"]
      }
    ]
  }
}
```

The flat `accounts` map (with a single `profile_id`) remains valid for single-channel projects. Skills should check for `zernio.channels` array first, then fall back to `zernio.accounts` map.

### Default Fields

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `tone` | string | No | Default tone/voice for content |
| `content_pillars` | string[] | No | Default content pillars |
| `posting_frequency` | object | No | Platform → frequency (e.g., `"twitter": "daily"`) |

---

## How Skills Resolve the Active Project

The primary mechanism is **folder matching** — you're working in a project folder, and the registry maps that folder to its channels.

```
1. CWD MATCH — Current working directory is inside a project's specs_path
   → Auto-select that project (most common case — zero friction)

2. ORCHESTRATED — Content-engine passed project_id in orchestrated mode params
   → Use that project directly

3. EXPLICIT — User said "for [project name]" or "for [brand]"
   → Match against project names and slugs

4. SINGLE PROJECT — Only one project in the registry
   → Use it automatically (no need to ask)

5. ASK — Multiple projects exist, can't auto-detect
   → "I see multiple projects: [list]. Which one is this for?"
```

**The typical flow**: You're in `~/acme-corp/`, you say "make me a video." The skill reads `projects.json`, sees Acme's `specs_path` is `/Users/you/acme-corp/.specs`, matches your cwd, and loads Acme's channels and API keys. You never think about project selection.

**Once resolved**, the skill uses the project's:
- **Buffer channels** — only shows/uses channels for this project
- **API keys** — reads the correct env var for Buffer and Cloudinary
- **Brand context** — reads specs_path or brand_brief for tone, audience, style
- **Defaults** — pre-fills tone, pillars, frequency

---

## Multiple Buffer Accounts

### Scenario A: One Buffer Account, Multiple Brands

All channels live under one Buffer organization. Different projects use different channels from the same account.

```json
{
  "projects": {
    "brand-a": {
      "buffer": {
        "api_key_env": "BUFFER_API_KEY",
        "channels": {
          "twitter": { "id": "aaa111", "name": "Brand A", "username": "@brand_a" }
        }
      }
    },
    "brand-b": {
      "buffer": {
        "api_key_env": "BUFFER_API_KEY",
        "channels": {
          "twitter": { "id": "bbb222", "name": "Brand B", "username": "@brand_b" },
          "instagram": { "id": "ccc333", "name": "Brand B", "username": "@brand_b" }
        }
      }
    }
  }
}
```

Both projects share the same `BUFFER_API_KEY`. The registry just maps which channels belong to which project.

### Scenario B: Separate Buffer Accounts

Each project has its own Buffer account with a separate API key.

```json
{
  "projects": {
    "my-brand": {
      "buffer": {
        "api_key_env": "BUFFER_API_KEY",
        "channels": { "twitter": { "id": "aaa111", "name": "My Brand" } }
      }
    },
    "client-xyz": {
      "buffer": {
        "api_key_env": "BUFFER_API_KEY_CLIENT_XYZ",
        "channels": { "twitter": { "id": "xxx999", "name": "Client XYZ" } }
      }
    }
  }
}
```

The `.env` file would contain:
```
BUFFER_API_KEY=my_personal_token
BUFFER_API_KEY_CLIENT_XYZ=client_xyz_token
```

### Scenario C: Shared Cloudinary, Separate Buffer

Most common setup — one Cloudinary account for all media hosting, separate Buffer accounts per client.

```json
{
  "client-abc": {
    "buffer": { "api_key_env": "BUFFER_API_KEY_ABC" },
    "cloudinary": {
      "cloud_name_env": "CLOUDINARY_CLOUD_NAME",
      "api_key_env": "CLOUDINARY_API_KEY",
      "api_secret_env": "CLOUDINARY_API_SECRET"
    }
  }
}
```

---

## Adding a New Project

### Interactive (recommended)

Say: "Add a new project" or "Set up a new client". The skill will:

1. Ask for the project name and description
2. Query Buffer for connected channels (using the specified API key)
3. Let you pick which channels belong to this project
4. Ask about brand context (specs path, tone, pillars)
5. Write the entry to `projects.json`

### Manual

Add a new key to `projects.projects` in `projects.json`:

```json
"new-client": {
  "name": "New Client",
  "description": "E-commerce brand for pet products",
  "specs_path": null,
  "brand_brief": null,
  "buffer": {
    "api_key_env": "BUFFER_API_KEY",
    "organization_id": null,
    "channels": {}
  },
  "defaults": {
    "tone": "friendly, warm",
    "content_pillars": ["product", "education", "community"]
  },
  "created": "2026-03-15",
  "updated": "2026-03-15"
}
```

Then run "sync channels for new-client" — the social-media skill will query Buffer, show available channels, and let you assign them.

---

## Calendar Integration

When the content-engine creates a calendar, it includes the `project_id`:

```json
{
  "campaign": "spring-launch",
  "project_id": "client-xyz",
  "brand": "Client XYZ",
  "channels": [...]
}
```

This means:
- Calendars are scoped to a project
- Resume/retry operations use the correct API keys
- Analytics are automatically per-project
- The content-engine can list calendars per project

---

## Analytics Integration

When the analytics-loop skill checks post performance:

1. Read `projects.json` → get the project's scheduling config (Buffer and/or Zernio)
2. Pull post metrics using the configured scheduling backend's API
3. Store metrics per project in `analytics-loop/data/<project-slug>/`
4. Score posts, decompose winning patterns by structural variables
5. Generate per-project briefs that feed back into the content-engine

This ensures Brand A's engagement data never pollutes Brand B's optimization loop.

---

## Skill Reference

### For All Skills

Before starting work, read `projects.json` and resolve the active project:

```
1. Read projects.json from the DonatoSkills root
2. Resolve which project to use (see resolution order above)
3. Determine scheduling backend: check for project.buffer and/or project.zernio
4. Set the API key: read from process.env[project.buffer.api_key_env] or process.env[project.zernio.api_key_env]
5. Filter channels/accounts to only this project's entries
6. Read brand context from specs_path or brand_brief
7. Apply defaults (tone, pillars) as pre-filled answers
```

### For Content-Engine

- Include `project_id` in every `calendar.json`
- Use only the project's channels/accounts when planning
- Read brand context from the project's specs_path or brand_brief
- Pass project_id to orchestrated skill invocations
- Read `image_gen.default_provider` and `tts.default_provider` to pass correct provider to creation skills

### For Social-Media

- Only show/use channels/accounts from the active project
- Use the project's scheduling API key (Buffer or Zernio — may differ per project)
- Tag posts with `source: "donatoskills-{project_id}"`

### For Creation Skills (remotion-video, image-gen, text-writer)

- Read brand context from the project's specs_path (if set)
- Apply project defaults for tone and content pillars
- Read provider config (e.g., `tts.default_provider`, `image_gen.default_provider`) for API selection
- In orchestrated mode, project context comes from the content-engine
