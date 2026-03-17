# Brand Analysis Methodology

When the content engine is given a brand/product to create content for, analyze it systematically.

## Input Sources

The user might provide:
- A URL (landing page, app store listing, product page)
- A verbal description
- Project files (`.specs/vision.md`, README, etc.)
- "Just read my project"

## What to Extract

### 1. Value Proposition
- What does the product do?
- What problem does it solve?
- Why is it better than alternatives?
- One-sentence pitch

### 2. Target Audience
- Who uses this? (role, age, interests)
- What are their pain points?
- Where do they hang out online? (which platforms matter most)
- What content do they engage with?

### 3. Tone of Voice
- How does the brand currently communicate? (read their existing copy)
- Formal vs casual spectrum
- Use of humor, slang, emoji
- Key adjectives that describe the brand personality

### 4. Visual Identity
- Primary colors (extract from site/logo if URL given)
- Typography style (modern, classic, playful)
- Imagery preferences (photography, illustration, abstract, minimal)
- These inform video styles and image generation

### 5. Key Messages
- Core themes the brand should consistently reinforce
- Features/benefits to highlight
- Unique differentiators from competitors
- Common objections to address

### 6. Content Opportunities
Based on the audience and product, identify:
- **Educational content** -- teach something related to the problem
- **Product demos** -- show the product in action
- **Behind the scenes** -- build trust and personality
- **Social proof** -- testimonials, results, case studies
- **Trend-jacking** -- relevant industry trends to comment on
- **Entertainment** -- funny, relatable content in the niche

## Output: Brand Brief

Store as `content-engine/calendars/<slug>/brand-brief.md`:

```markdown
# Brand Brief: [Name]

## Product
[One paragraph description]

## Audience
- **Who**: [target user description]
- **Pain points**: [list]
- **Platforms**: [where they are most active]

## Voice
- **Tone**: [adjectives]
- **Do**: [communication patterns to follow]
- **Don't**: [things to avoid]

## Visual Style
- **Colors**: [primary, secondary, accent]
- **Style**: [minimal/bold/playful/etc]
- **Imagery**: [photo/illustration/abstract]

## Content Pillars
1. [Pillar 1] -- [what it covers]
2. [Pillar 2] -- [what it covers]
3. [Pillar 3] -- [what it covers]
4. [Pillar 4] -- [what it covers]

## Key Messages
- [Message 1]
- [Message 2]
- [Message 3]
```

This brief is referenced during content creation to maintain consistency across all calendar items.
