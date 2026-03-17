# Image Cache — Test Suite

**Test file**: `DonatoSkills/image-cache/scripts/__tests__/image-cache.test.js`
**Source**: `DonatoSkills/image-cache/scripts/image-cache.js`
**Spec**: `.specs/features/image-cache/image-cache.feature.md`

## Test Summary

| ID | Test | Scenario |
|----|------|----------|
| UT-IC-000a | Identical sets score 1.0 | Jaccard similarity |
| UT-IC-000b | Disjoint sets score 0.0 | Jaccard similarity |
| UT-IC-000c | Partial overlap scores correctly | Jaccard similarity |
| UT-IC-000d | Empty sets return 0.0 | Jaccard similarity |
| UT-IC-001 | Query returns null when cache is empty | Cache miss |
| UT-IC-002 | addImage writes entry to cache index | Cache miss |
| UT-IC-003 | addImage persists to cache-index.json | Cache miss |
| UT-IC-004 | Query returns matching image when tags overlap | Cache hit |
| UT-IC-005 | Query increments use_count on hit | Cache hit |
| UT-IC-006 | Query updates last_used timestamp on hit | Cache hit |
| UT-IC-007 | Query returns null when only match is at max reuse | Reuse limit |
| UT-IC-008 | Query skips maxed image and returns next best | Reuse limit |
| UT-IC-009 | Extracts meaningful nouns and adjectives | Tag extraction |
| UT-IC-010 | Filters out stop words and articles | Tag extraction |
| UT-IC-011 | Returns lowercase tags | Tag extraction |
| UT-IC-012 | Empty prompt returns empty array | Tag extraction |
| UT-IC-013 | Image cached for one topic reused for related topic | Cross-topic reuse |
| UT-IC-014 | Prefers less-used image when scores are equal | Cross-topic reuse |
| UT-IC-015 | Channel A cache is invisible to channel B | No cross-channel |
| UT-IC-016 | Adding to channel A does not affect channel B | No cross-channel |
| UT-IC-017 | Evicts oldest images when cache exceeds max | LRU eviction |
| UT-IC-018 | Evicted image files are deleted from disk | LRU eviction |
| UT-IC-019 | Eviction does not affect images under limit | LRU eviction |
| UT-IC-020 | generateCacheReport produces correct stats | Reporting |
| UT-IC-021 | Report handles zero totals without errors | Reporting |
| UT-IC-022 | New instance loads existing cache-index.json | Persistence |
| UT-IC-023 | Cache survives write-read-write cycle | Persistence |

**Total: 27 tests, 27 passing**
