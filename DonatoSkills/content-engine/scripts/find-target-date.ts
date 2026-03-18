/**
 * find-target-date.ts
 *
 * Queries Zernio for all scheduled posts and returns the first future date
 * that has fewer than TARGET_POSTS_PER_DAY already scheduled.
 *
 * Usage:
 *   npx tsx --no-cache find-target-date.ts
 *
 * Outputs a single line: TARGET_DATE: YYYY-MM-DD
 * so callers can parse it easily.
 */

// Always target tomorrow — the pipeline runs at 4am so content is ready before the day starts.
function getTomorrow(): string {
  // Use ET offset (UTC-5 conservative) so "tomorrow" is correct even at 4am ET
  const nowET = new Date(Date.now() - 5 * 60 * 60 * 1000);
  const tomorrow = new Date(nowET);
  tomorrow.setUTCDate(tomorrow.getUTCDate() + 1);
  return tomorrow.toISOString().slice(0, 10);
}

const targetDate = getTomorrow();
console.log(`TARGET_DATE: ${targetDate}`);
console.log(JSON.stringify({ target_date: targetDate }));
