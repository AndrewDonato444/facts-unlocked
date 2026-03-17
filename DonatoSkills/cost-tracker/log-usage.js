/**
 * Cost Tracker — Usage Logger
 *
 * Shared utility for logging API usage costs during content generation.
 * Called by any skill that makes a paid API call (TTS, image gen, etc.).
 *
 * Usage:
 *   const { logUsage } = require('../cost-tracker/log-usage');
 *   await logUsage({ provider, model, channel, video_id, units, fallback }, opts);
 *
 * Log file location:
 *   cost-tracker/logs/{YYYY-MM-DD}/{channel}/usage.jsonl
 *
 * Monthly totals:
 *   cost-tracker/monthly/{YYYY-MM}/monthly-totals.json
 */

const fs = require("fs");
const path = require("path");

const BUDGET_WARNING_THRESHOLD = 0.80; // warn at 80% of monthly budget

/**
 * Calculate cost in USD from provider, model, and units consumed.
 * Always reads from the rate table — never hardcodes values.
 *
 * @param {string} provider - e.g. "elevenlabs", "gemini", "openai", "grok"
 * @param {string} model    - e.g. "adam", "gemini-2.5-flash-image"
 * @param {number} units    - number of chars or images consumed
 * @param {object} rates    - rate table (from rates.json or test fixture)
 * @returns {number} cost in USD
 */
function calculateCost(provider, model, units, rates) {
  const providerRates = rates[provider];
  if (!providerRates) {
    throw new Error(`Unknown provider: "${provider}". Add it to rates.json.`);
  }

  // Try exact model match first, then fall back to "default"
  const entry = providerRates[model] || providerRates["default"];
  if (!entry) {
    throw new Error(
      `No rate found for provider "${provider}" model "${model}". Add it to rates.json.`
    );
  }

  return entry.rate * units;
}

/**
 * Build a structured usage record from raw parameters.
 * Handles monthly running totals and budget warning logic.
 *
 * @param {object} params
 *   - provider, model, channel, video_id, units, fallback
 *   - monthlyRunningTotal: current total units this month (before this call)
 *   - monthlyBudget: plan limit in units (null if no cap, e.g. image providers)
 * @param {object} rates - rate table
 * @returns {object} usage record
 */
function buildUsageRecord(params, rates) {
  const {
    provider,
    model,
    channel,
    video_id,
    units,
    fallback = false,
    monthlyRunningTotal,
    monthlyBudget,
  } = params;

  const cost_usd = calculateCost(provider, model, units, rates);

  const providerRates = rates[provider];
  const entry = providerRates[model] || providerRates["default"];
  const unit_type = entry.unit;

  // Monthly tracking (only meaningful for subscription providers like ElevenLabs)
  let monthly_units_running_total = null;
  let monthly_budget_remaining_pct = null;
  let budget_warning = false;

  if (monthlyBudget !== null && monthlyRunningTotal !== null && monthlyRunningTotal !== undefined) {
    monthly_units_running_total = monthlyRunningTotal + units;
    monthly_budget_remaining_pct =
      Math.round(
        ((monthlyBudget - monthly_units_running_total) / monthlyBudget) * 10000
      ) / 100;
    budget_warning =
      monthly_units_running_total / monthlyBudget >= BUDGET_WARNING_THRESHOLD;
  }

  return {
    timestamp: new Date().toISOString(),
    provider,
    model,
    channel,
    video_id,
    unit_type,
    units_used: units,
    cost_usd,
    fallback,
    budget_warning,
    monthly_units_running_total,
    monthly_budget_remaining_pct,
  };
}

/**
 * Append a usage record to the JSONL log file for the given directory.
 * Creates intermediate directories if needed.
 *
 * @param {object} record - usage record from buildUsageRecord
 * @param {string} logDir - directory to write usage.jsonl into
 */
function appendUsageRecord(record, logDir) {
  fs.mkdirSync(logDir, { recursive: true });
  const logPath = path.join(logDir, "usage.jsonl");
  fs.appendFileSync(logPath, JSON.stringify(record) + "\n", "utf-8");
}

/**
 * Read the monthly totals file for a given month directory.
 * Returns {} if the file doesn't exist yet.
 *
 * @param {string} monthlyDir - path to monthly directory
 * @returns {object} monthly totals keyed by provider
 */
function readMonthlyTotals(monthlyDir) {
  const totalsPath = path.join(monthlyDir, "monthly-totals.json");
  if (!fs.existsSync(totalsPath)) {
    return {};
  }
  return JSON.parse(fs.readFileSync(totalsPath, "utf-8"));
}

/**
 * Update the running monthly totals for the provider in this record.
 * Creates the file if it doesn't exist.
 *
 * @param {object} record - usage record (must have provider, unit_type, units_used, cost_usd)
 * @param {string} monthlyDir - path to monthly directory (e.g. cost-tracker/monthly/2026-03)
 */
function updateMonthlyTotals(record, monthlyDir) {
  fs.mkdirSync(monthlyDir, { recursive: true });

  const totals = readMonthlyTotals(monthlyDir);
  const { provider, unit_type, units_used, cost_usd } = record;

  if (!totals[provider]) {
    totals[provider] = { total_units: 0, total_cost_usd: 0, unit_type };
  }

  totals[provider].total_units += units_used;
  totals[provider].total_cost_usd = Math.round(
    (totals[provider].total_cost_usd + cost_usd) * 1000000
  ) / 1000000;

  const totalsPath = path.join(monthlyDir, "monthly-totals.json");
  fs.writeFileSync(totalsPath, JSON.stringify(totals, null, 2));
}

/**
 * Full pipeline: build record → append to daily log → update monthly totals.
 * This is the main entry point for skills to call.
 *
 * @param {object} params - same as buildUsageRecord params
 * @param {object} opts
 *   - baseDir: root of cost-tracker directory (default: __dirname)
 *   - date: YYYY-MM-DD string (default: today)
 *   - rates: rate table override (default: reads rates.json)
 */
function logUsage(params, opts = {}) {
  const baseDir = opts.baseDir || __dirname;
  const date = opts.date || new Date().toISOString().split("T")[0];
  const yearMonth = date.substring(0, 7);

  const rates = opts.rates || JSON.parse(
    fs.readFileSync(path.join(__dirname, "rates.json"), "utf-8")
  );

  // Read current monthly running total for this provider (for budget tracking)
  const monthlyDir = path.join(baseDir, "monthly", yearMonth);
  const currentTotals = readMonthlyTotals(monthlyDir);
  const providerTotals = currentTotals[params.provider];
  const monthlyRunningTotal = providerTotals ? providerTotals.total_units : 0;

  // Get the monthly budget from rates (if this provider has one)
  const providerRates = rates[params.provider];
  const entry = providerRates
    ? (providerRates[params.model] || providerRates["default"])
    : null;
  const monthlyBudget = entry ? (entry.monthly_budget || null) : null;

  const record = buildUsageRecord(
    { ...params, monthlyRunningTotal, monthlyBudget },
    rates
  );

  const logDir = path.join(baseDir, "logs", date, params.channel);
  appendUsageRecord(record, logDir);
  updateMonthlyTotals(record, monthlyDir);

  return record;
}

module.exports = {
  calculateCost,
  buildUsageRecord,
  appendUsageRecord,
  updateMonthlyTotals,
  readMonthlyTotals,
  logUsage,
};
