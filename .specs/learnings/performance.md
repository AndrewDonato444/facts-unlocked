# Performance Learnings

Optimization patterns for this codebase.

---

## Lazy Loading

<!-- Code splitting, dynamic imports, route-based splitting -->

_No learnings yet._

---

## Caching

<!-- Cache strategies, invalidation patterns -->

- **Per-channel file-based caching** works well for image assets at this scale (150 images/channel). No database needed — a JSON index + filesystem is sufficient and survives across Claude Code sessions.
- **Jaccard similarity (threshold 0.4)** is effective for keyword-based tag matching. Simpler than embeddings, fast enough for <200 entries, and produces intuitive results.
- **LRU eviction by `last_used`** is better than evicting by `use_count` — recently-matched images are more likely to match again. Capped at 150 per channel (~150-300 MB).
- **Reuse limit (default 5)** prevents visual repetition. Configurable per-project in `projects.json`.

---

## Rendering

<!-- React performance, memoization, virtualization -->

_No learnings yet._

---

## Data Fetching

<!-- Query optimization, pagination, prefetching -->

_No learnings yet._

---

## Bundle Size

<!-- Tree shaking, dependency analysis -->

_No learnings yet._
