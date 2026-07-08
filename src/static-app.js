import {
  SNAPSHOT_DATE,
  buildEscalationDraft,
  buildAiNarrative,
  buildForecastNarrative,
  buildIssueSummary,
  buildReturnCsvTemplate,
  buildStakeholderReport,
  buildTrendSnapshots,
  buildWeeklyDigest,
  calculateRoi,
  calculateKpis,
  enrichReturns,
  filterReturns,
  formatCurrency,
  formatState,
  getMarketBreakdown,
  getContinuousImprovementActions,
  getDelayThemes,
  getEarlyWarnings,
  getOverdueWorklist,
  getPartnerPerformance,
  getPrioritizedRiskForecast,
  getPromptSecurityFindings,
  paginateItems,
  parseReturnsCsv,
  serializeWorklistCsv,
  uniqueValues,
  validateReturnsCsv,
} from "./lib/analytics.js";

const root = document.getElementById("root");
const roles = [
  ["manager", "Ops Manager", "KPI control, overdue pressure, and weekly governance."],
  ["coordinator", "Coordinator", "Daily follow-up, owners, missing dates, and partner blockers."],
  ["leadership", "Leadership", "Trend narrative, risk concentration, and partner/market exposure."],
];

const state = {
  activeRole: "manager",
  filters: {
    market: "All",
    partner: "All",
    status: "All",
    slaState: "All",
    search: "",
  },
  page: 1,
  pageSize: 25,
  roiInputs: {
    hoursSavedPerWeek: 8,
    hourlyCost: 65,
    overdueReductionPercent: 12,
    annualOverdueExposure: 1200000,
    recoveryImprovementPercent: 4,
  },
  returns: [],
  sourceName: "Synthetic demo CSV",
  loadError: "",
  validation: null,
};

async function boot() {
  const response = await fetch("./src/data/returns.csv");
  const csv = await response.text();
  state.returns = enrichReturns(parseReturnsCsv(csv));
  state.demoCsv = csv;
  state.validation = validateReturnsCsv(csv);
  render();
}

function render() {
  const kpis = calculateKpis(state.returns);
  const worklist = getOverdueWorklist(state.returns);
  const digest = buildWeeklyDigest(kpis, worklist);
  const filteredReturns = filterReturns(state.returns, state.filters);
  const paginatedReturns = paginateItems(filteredReturns, state.page, state.pageSize);
  const activeRole = roles.find(([id]) => id === state.activeRole);
  const marketBreakdown = getMarketBreakdown(state.returns);
  const partnerPerformance = getPartnerPerformance(state.returns);
  const stakeholderReport = buildStakeholderReport({ kpis, marketBreakdown, partnerPerformance, worklist });
  const delayThemes = getDelayThemes(state.returns);
  const aiNarrative = buildAiNarrative({ kpis, themes: delayThemes, marketBreakdown, worklist });
  const trends = buildTrendSnapshots(state.returns);
  const riskForecast = getPrioritizedRiskForecast(state.returns, delayThemes);
  const warnings = getEarlyWarnings({ marketBreakdown, partnerPerformance, themes: delayThemes, riskForecast });
  const improvementActions = getContinuousImprovementActions({ kpis, themes: delayThemes, partnerPerformance });
  const forecastNarrative = buildForecastNarrative({ riskForecast, trends, warnings });
  const roi = calculateRoi(state.roiInputs);
  const promptFindings = getPromptSecurityFindings(state.returns);

  root.innerHTML = `
    <main class="shell">
      <header class="topbar">
        <div>
          <p class="eyebrow">Synthetic prototype &middot; Snapshot ${SNAPSHOT_DATE}</p>
          <h1>DX Returns Control</h1>
          <p class="subtitle">Assumption-led visibility layer for mixed returns, overdue control, high-value exposure, and stakeholder-ready reporting.</p>
        </div>
        <div class="governance-badge"><span class="glyph">OK</span><span>Human-controlled escalation</span></div>
      </header>

      <section class="role-switcher" aria-label="Role view">
        ${roles.map(([id, label, focus]) => roleButton(id, label, focus)).join("")}
      </section>

      ${dataControls()}
      ${aboutPrototypePanel()}
      ${promptSecurityPanel(promptFindings)}

      <section class="role-context">
        <div>
          <p class="eyebrow">Current lens</p>
          <h2>${escapeHtml(activeRole[1])}</h2>
        </div>
        <p>${escapeHtml(activeRole[2])}</p>
      </section>

      <section class="kpi-grid" aria-label="Key metrics">
        ${kpiCard("Open returns", kpis.openCount, "neutral", "OR")}
        ${kpiCard("Overdue", kpis.overdueCount, "danger", "OD")}
        ${kpiCard("Near due", kpis.nearDueCount, "warning", "ND")}
        ${kpiCard("Average age", `${kpis.averageAgeDays}d`, "neutral", "AG")}
        ${kpiCard("Missing due dates", kpis.missingDueDateCount, "info", "DQ")}
        ${kpiCard("Overdue exposure", formatCurrency(kpis.overdueExposure), "danger", "EX")}
      </section>

      ${state.activeRole === "manager" ? managerView({ aiNarrative, delayThemes, digest, filteredReturns, forecastNarrative, kpis, paginatedReturns, riskForecast, stakeholderReport, worklist }) : ""}
      ${state.activeRole === "coordinator" ? coordinatorView({ filteredReturns, paginatedReturns, worklist }) : ""}
      ${state.activeRole === "leadership" ? leadershipView({ aiNarrative, delayThemes, digest, forecastNarrative, improvementActions, kpis, marketBreakdown, partnerPerformance, riskForecast, roi, stakeholderReport, trends, warnings, worklist }) : ""}
    </main>
  `;

  bindEvents();
}

function roleButton(id, label, focus) {
  return `
    <button class="${state.activeRole === id ? "role-button active" : "role-button"}" data-role="${id}" title="${escapeHtml(focus)}" type="button">
      <span class="glyph">${label.split(" ").map((word) => word[0]).join("")}</span>
      <span>${escapeHtml(label)}</span>
    </button>
  `;
}

function dataControls() {
  const validation = state.validation;
  return `
    <section class="automation-bar">
      <div>
        <p class="eyebrow">Phase 2 automation</p>
        <strong>${escapeHtml(state.sourceName)}</strong>
        <span>${state.returns.length} rows loaded. Upload replaces the in-memory dataset only.</span>
        ${validation ? validationSummary(validation) : ""}
        ${state.loadError ? `<em>${escapeHtml(state.loadError)}</em>` : ""}
      </div>
      <div class="automation-actions">
        <button class="text-button" data-download-template type="button"><span class="glyph">TP</span><span>Template</span></button>
        <label class="file-button">
          <span class="glyph">UP</span>
          <span>Upload CSV</span>
          <input data-upload-csv type="file" accept=".csv,text/csv,.xlsx,.xls" />
        </label>
        <button class="text-button" data-reset-demo type="button"><span class="glyph">RS</span><span>Reset demo</span></button>
      </div>
    </section>
  `;
}

function validationSummary(validation) {
  if (validation.valid) {
    const mappedAliases = Object.entries(validation.mappings).filter(([column, index]) => validation.headers[index] !== column).length;
    return `<span class="validation-ok">Schema validated: ${validation.rowCount} data rows, ${validation.headers.length} columns${mappedAliases ? `, ${mappedAliases} mapped aliases` : ""}.</span>`;
  }

  return `<em>Schema issue: missing ${validation.missingColumns.map(escapeHtml).join(", ")}</em>`;
}

function aboutPrototypePanel() {
  return `
    <section class="info-grid">
      <article class="info-panel">
        <p class="eyebrow">About this prototype</p>
        <h3>Safe operations automation</h3>
        <p>Built with synthetic data only. It demonstrates visibility, reporting, AI-assist summaries, and explainable prioritization without writing back to source systems.</p>
      </article>
      <article class="info-panel">
        <p class="eyebrow">Governance guardrails</p>
        <h3>Humans stay in control</h3>
        <p>No automated customer, partner, logistics, financial, or closure decisions. Drafts and forecasts are designed for review in a control meeting.</p>
      </article>
      <article class="info-panel">
        <p class="eyebrow">Pilot shape</p>
        <h3>6-week controlled rollout</h3>
        <p>Start with 2-3 markets, CSV exports, no source-system writeback, weekly KPI review, and measured reporting-time and overdue-backlog impact.</p>
      </article>
    </section>
  `;
}

function promptSecurityPanel(findings) {
  const topFindings = findings.slice(0, 4);
  return `
    <section class="${findings.length ? "security-panel active" : "security-panel"}">
      <div>
        <p class="eyebrow">Prompt security</p>
        <h3>${findings.length ? `${findings.length} untrusted prompt-like rows flagged` : "Prompt-injection guardrail active"}</h3>
        <p>Uploaded notes, delay reasons, status text, and item descriptions are treated as untrusted data. AI-assist summaries use them only as source evidence and never as instructions.</p>
      </div>
      ${
        findings.length
          ? `<ul>${topFindings.map((finding) => `
              <li>
                <strong>${escapeHtml(finding.returnId)}</strong>
                <span>${escapeHtml(finding.matches.map((match) => `${match.field}: ${match.label}`).join(", "))}</span>
              </li>
            `).join("")}</ul>`
          : `<span class="count-pill">No prompt-like text detected</span>`
      }
    </section>
  `;
}

function managerView({ aiNarrative, delayThemes, digest, filteredReturns, forecastNarrative, kpis, paginatedReturns, riskForecast, stakeholderReport, worklist }) {
  return `
    <section class="two-column">
      ${weeklyDigest(digest)}
      <div class="panel">
        <div class="panel-heading">
          <div><p class="eyebrow">Control objective</p><h3>Overdue command list</h3></div>
          <button class="icon-button" data-export-worklist title="Export worklist CSV" type="button"><span class="glyph">DL</span></button>
        </div>
        ${worklistTable(worklist.slice(0, 6), true)}
      </div>
    </section>
    ${phase4CompactPanel({ forecastNarrative, riskForecast })}
    ${aiAssistPanel({ aiNarrative, delayThemes, worklist })}
    ${reportPanel(stakeholderReport)}
    <section class="panel">
      <div class="panel-heading">
        <div><p class="eyebrow">Returns register</p><h3>Open return population</h3></div>
        <span class="count-pill">${filteredReturns.length} visible</span>
      </div>
      ${filters()}
      ${returnsTable(paginatedReturns.items)}
      ${paginationControls(paginatedReturns)}
    </section>
    <section class="assumption-strip">
      <strong>Phase 2 boundary:</strong> reports, worklist exports, and message drafts are generated for human review only. No automated email, no autonomous decisions, no real Philips data. Oldest open: ${kpis.oldestOpenId} at ${kpis.oldestOpenAgeDays} days.
    </section>
  `;
}

function coordinatorView({ filteredReturns, paginatedReturns, worklist }) {
  const missingDates = worklist.filter((item) => item.slaState === "missing-due-date");

  return `
    <section class="two-column">
      <div class="panel">
        <div class="panel-heading">
          <div><p class="eyebrow">Daily queue</p><h3>Follow-up priorities</h3></div>
          <span class="count-pill">${worklist.length} actions</span>
        </div>
        ${worklistTable(worklist.slice(0, 8))}
      </div>
      <div class="panel">
        <div class="panel-heading">
          <div><p class="eyebrow">Data quality</p><h3>Missing due date cleanup</h3></div>
          <span class="glyph alert">DQ</span>
        </div>
        <ul class="cleanup-list">
          ${missingDates.map((item) => `<li><span>${item.returnId}</span><strong>${escapeHtml(item.owner)}</strong><em>${escapeHtml(item.market)}</em></li>`).join("")}
        </ul>
      </div>
    </section>
    ${draftMessagesPanel(worklist.slice(0, 3))}
    <section class="panel">
      <div class="panel-heading">
        <div><p class="eyebrow">Working register</p><h3>Open returns by owner and blocker</h3></div>
      </div>
      ${filters()}
      ${returnsTable(paginatedReturns.items)}
      ${paginationControls(paginatedReturns)}
    </section>
  `;
}

function leadershipView({ aiNarrative, delayThemes, digest, forecastNarrative, improvementActions, kpis, marketBreakdown, partnerPerformance, riskForecast, roi, stakeholderReport, trends, warnings, worklist }) {
  const highValueItems = worklist.filter((item) => item.highValue).slice(0, 5);

  return `
    ${phase4ForecastPanel({ forecastNarrative, improvementActions, riskForecast, trends, warnings })}
    ${roiPanel(roi)}
    <section class="two-column">
      ${weeklyDigest(digest, true)}
      <div class="panel ai-panel">
        <div class="panel-heading">
          <div><p class="eyebrow">Phase 3 AI assist</p><h3>Traceable intelligence layer</h3></div>
          <span class="glyph">AI</span>
        </div>
        <p>${escapeHtml(aiNarrative)}</p>
        <div class="source-tags"><span>Notes</span><span>Status history</span><span>Delay reason</span><span>Record link</span></div>
      </div>
    </section>
    ${themePanel(delayThemes)}
    ${reportPanel(stakeholderReport, true)}
    <section class="three-column">
      ${rankedList("Market pressure", marketBreakdown, "market")}
      ${rankedList("Partner performance", partnerPerformance, "partner")}
      <div class="panel">
        <div class="panel-heading">
          <div><p class="eyebrow">Exposure</p><h3>High-value returns</h3></div>
          <span class="count-pill">${kpis.highValueCount} flagged</span>
        </div>
        <ul class="risk-list high-value-list">
          ${highValueItems.map((item) => `<li><strong>${item.returnId}</strong><span>${escapeHtml(item.market)}</span><em>${formatCurrency(item.valueEur)}</em></li>`).join("")}
        </ul>
      </div>
    </section>
  `;
}

function roiPanel(roi) {
  return `
    <section class="panel roi-panel">
      <div class="panel-heading">
        <div><p class="eyebrow">Business case</p><h3>ROI calculator</h3></div>
        <span class="count-pill">${formatCurrency(roi.totalAnnualValue)} annual value</span>
      </div>
      <div class="roi-grid">
        ${numberInput("Hours saved / week", "hoursSavedPerWeek", state.roiInputs.hoursSavedPerWeek, 1)}
        ${numberInput("Hourly cost", "hourlyCost", state.roiInputs.hourlyCost, 5)}
        ${numberInput("Overdue reduction %", "overdueReductionPercent", state.roiInputs.overdueReductionPercent, 1)}
        ${numberInput("Annual overdue exposure", "annualOverdueExposure", state.roiInputs.annualOverdueExposure, 50000)}
        ${numberInput("Recovery improvement %", "recoveryImprovementPercent", state.roiInputs.recoveryImprovementPercent, 1)}
      </div>
      <div class="roi-results">
        <span>Labor savings <strong>${formatCurrency(roi.laborSavings)}</strong></span>
        <span>Overdue avoidance <strong>${formatCurrency(roi.overdueAvoidance)}</strong></span>
        <span>Recovery improvement <strong>${formatCurrency(roi.recoveryImprovement)}</strong></span>
      </div>
    </section>
  `;
}

function numberInput(label, key, value, step) {
  return `
    <label>
      <span>${escapeHtml(label)}</span>
      <input data-roi="${key}" type="number" min="0" step="${step}" value="${escapeHtml(value)}" />
    </label>
  `;
}

function phase4CompactPanel({ forecastNarrative, riskForecast }) {
  return `
    <section class="panel forecast-panel">
      <div class="panel-heading">
        <div><p class="eyebrow">Phase 4 risk forecast</p><h3>Priority scoring preview</h3></div>
        <span class="count-pill">${riskForecast.filter((item) => item.riskLevel === "critical").length} critical</span>
      </div>
      <p class="forecast-narrative">${escapeHtml(forecastNarrative)}</p>
      ${riskForecastTable(riskForecast.slice(0, 5))}
    </section>
  `;
}

function phase4ForecastPanel({ forecastNarrative, improvementActions, riskForecast, trends, warnings }) {
  return `
    <section class="panel forecast-panel">
      <div class="panel-heading">
        <div><p class="eyebrow">Phase 4 forecasting</p><h3>Explainable risk forecast and improvement loop</h3></div>
        <span class="glyph">F4</span>
      </div>
      <p class="forecast-narrative">${escapeHtml(forecastNarrative)}</p>
      <div class="three-column phase4-grid">
        ${trendPanel(trends)}
        ${warningPanel(warnings)}
        ${improvementPanel(improvementActions)}
      </div>
      <div class="panel-inner">
        <div class="panel-heading compact-heading">
          <div><p class="eyebrow">Transparent score</p><h3>Top risk priorities</h3></div>
          <span class="count-pill">${riskForecast.length} scored</span>
        </div>
        ${riskForecastTable(riskForecast.slice(0, 8))}
      </div>
    </section>
  `;
}

function trendPanel(trends) {
  const maxOverdue = Math.max(...trends.map((trend) => trend.overdueCount), 1);
  return `
    <div class="forecast-card">
      <h3>Trend snapshots</h3>
      <ul class="trend-list">
        ${trends.map((trend) => `
          <li>
            <div><strong>${trend.date}</strong><span>${trend.overdueCount} overdue &middot; ${trend.openCount} open</span></div>
            <div class="bar-track"><span style="width: ${Math.max(8, (trend.overdueCount / maxOverdue) * 100)}%"></span></div>
          </li>
        `).join("")}
      </ul>
    </div>
  `;
}

function warningPanel(warnings) {
  return `
    <div class="forecast-card">
      <h3>Early warnings</h3>
      <ul class="warning-list">
        ${warnings.slice(0, 4).map((warning) => `
          <li>
            <strong>${escapeHtml(warning.label)}</strong>
            <span>${escapeHtml(warning.signal)}</span>
            <em>${escapeHtml(warning.action)}</em>
          </li>
        `).join("")}
      </ul>
    </div>
  `;
}

function improvementPanel(actions) {
  return `
    <div class="forecast-card">
      <h3>Improvement actions</h3>
      <ul class="warning-list">
        ${actions.slice(0, 4).map((action) => `
          <li>
            <strong>${escapeHtml(action.area)}</strong>
            <span>${escapeHtml(action.recommendation)}</span>
            <em>${escapeHtml(action.impact)}</em>
          </li>
        `).join("")}
      </ul>
    </div>
  `;
}

function riskForecastTable(items) {
  return `
    <div class="table-wrap">
      <table>
        <thead><tr><th>Return</th><th>Risk</th><th>Drivers</th><th>Owner</th><th>Exposure</th></tr></thead>
        <tbody>
          ${items.map((item) => `
            <tr>
              <td><strong>${item.returnId}</strong><small>${escapeHtml(item.market)}</small></td>
              <td><span class="risk-badge ${item.riskLevel}">${item.riskScore}/100 ${escapeHtml(item.riskLevel)}</span></td>
              <td>${escapeHtml(item.riskDrivers.join(", ") || "No active driver")}</td>
              <td>${escapeHtml(item.owner)}</td>
              <td>${formatCurrency(item.valueEur)}</td>
            </tr>
          `).join("")}
        </tbody>
      </table>
    </div>
  `;
}

function aiAssistPanel({ aiNarrative, delayThemes, worklist }) {
  const summaries = worklist.slice(0, 3).map(buildIssueSummary);

  return `
    <section class="two-column">
      <div class="panel ai-panel">
        <div class="panel-heading">
          <div><p class="eyebrow">Phase 3 AI assist</p><h3>Source-grounded risk narrative</h3></div>
          <span class="glyph">AI</span>
        </div>
        <p>${escapeHtml(aiNarrative)}</p>
        <div class="source-tags"><span>Status</span><span>Delay reason</span><span>Notes</span><span>Due date</span><span>Value</span></div>
      </div>
      ${themePanel(delayThemes, true)}
    </section>
    <section class="panel">
      <div class="panel-heading">
        <div><p class="eyebrow">Traceable summaries</p><h3>Top return issue summaries</h3></div>
        <span class="count-pill">${summaries.length} draft summaries</span>
      </div>
      <div class="summary-grid">
        ${summaries.map((summary) => issueSummaryCard(summary)).join("")}
      </div>
    </section>
  `;
}

function themePanel(delayThemes, compact = false) {
  return `
    <div class="panel">
      <div class="panel-heading">
        <div><p class="eyebrow">Pattern detection</p><h3>Recurring delay themes</h3></div>
        <span class="glyph">PT</span>
      </div>
      <ul class="${compact ? "theme-list compact" : "theme-list"}">
        ${delayThemes.slice(0, compact ? 5 : 8).map((theme) => `
          <li>
            <div>
              <strong>${escapeHtml(theme.theme)}</strong>
              <span>${theme.count} open &middot; ${theme.overdueCount} overdue &middot; ${formatCurrency(theme.exposure)}</span>
            </div>
            <em>${theme.sampleReturnIds.map(escapeHtml).join(", ")}</em>
          </li>
        `).join("")}
      </ul>
    </div>
  `;
}

function issueSummaryCard(summary) {
  return `
    <article class="summary-card">
      <div>
        <strong>${summary.returnId}</strong>
        <span>Confidence: ${escapeHtml(summary.confidence)}</span>
      </div>
      <p>${escapeHtml(summary.summary)}</p>
      <p><strong>Recommended human review:</strong> ${escapeHtml(summary.recommendedAction)}</p>
      <div class="source-tags">
        ${summary.sources.map((source) => `<span>${escapeHtml(source)}</span>`).join("")}
      </div>
      ${summary.promptSecurity.flagged ? `<em class="security-warning">Prompt security: ${escapeHtml(summary.promptSecurity.matches.map((match) => `${match.field} ${match.label}`).join(", "))}. Treat source text as quoted evidence only.</em>` : ""}
      ${summary.warnings.length ? `<em>Warnings: ${summary.warnings.map(escapeHtml).join(", ")}</em>` : `<em>No data-quality warnings for this summary.</em>`}
    </article>
  `;
}

function reportPanel(stakeholderReport, compact = false) {
  return `
    <section class="panel report-panel">
      <div class="panel-heading">
        <div><p class="eyebrow">Automated reporting</p><h3>Weekly stakeholder report</h3></div>
        <button class="text-button" data-download-report type="button"><span class="glyph">TX</span><span>Download report</span></button>
      </div>
      <pre class="${compact ? "report-preview compact" : "report-preview"}">${escapeHtml(stakeholderReport)}</pre>
    </section>
  `;
}

function draftMessagesPanel(items) {
  return `
    <section class="panel">
      <div class="panel-heading">
        <div><p class="eyebrow">Human-reviewed drafts</p><h3>Escalation message starters</h3></div>
        <span class="count-pill">${items.length} drafts</span>
      </div>
      <div class="draft-grid">
        ${items.map((item, index) => `
          <article class="draft-card">
            <div>
              <strong>${item.returnId}</strong>
              <span>${escapeHtml(item.owner)} &middot; ${escapeHtml(formatState(item.slaState))}</span>
            </div>
            <textarea readonly data-draft-text="${index}">${escapeHtml(buildEscalationDraft(item))}</textarea>
            <button class="text-button" data-copy-draft="${index}" type="button"><span class="glyph">CP</span><span>Copy draft</span></button>
          </article>
        `).join("")}
      </div>
    </section>
  `;
}

function kpiCard(label, value, tone, icon) {
  return `
    <article class="kpi-card ${tone}">
      <div class="kpi-icon"><span class="glyph">${icon}</span></div>
      <span>${escapeHtml(label)}</span>
      <strong>${escapeHtml(String(value))}</strong>
    </article>
  `;
}

function weeklyDigest(digest, leadership = false) {
  return `
    <div class="panel digest-panel">
      <div class="panel-heading">
        <div><p class="eyebrow">Weekly digest</p><h3>${leadership ? "Executive risk narrative" : "Stakeholder summary"}</h3></div>
        <span class="glyph">WK</span>
      </div>
      <p class="digest-headline">${escapeHtml(digest.headline)}</p>
      <p>${escapeHtml(digest.exposure)}</p>
      <p>${escapeHtml(digest.dataQuality)}</p>
      <div class="top-risks">${digest.topRisks.map((risk) => `<span>${escapeHtml(risk)}</span>`).join("")}</div>
    </div>
  `;
}

function filters() {
  const options = {
    market: uniqueValues(state.returns, "market"),
    partner: uniqueValues(state.returns, "partner"),
    status: uniqueValues(state.returns, "status"),
    slaState: ["All", "overdue", "near-due", "missing-due-date", "on-track"],
  };

  return `
    <div class="filters">
      <span class="glyph">FL</span>
      <label class="search-field">
        <span>Search</span>
        <input data-search type="search" value="${escapeHtml(state.filters.search)}" placeholder="ID, owner, market, reason" />
      </label>
      ${selectControl("Market", "market", state.filters.market, options.market)}
      ${selectControl("Partner", "partner", state.filters.partner, options.partner)}
      ${selectControl("Status", "status", state.filters.status, options.status)}
      ${selectControl("SLA", "slaState", state.filters.slaState, options.slaState, formatState)}
    </div>
  `;
}

function selectControl(label, key, value, values, formatter = (option) => option) {
  return `
    <label>
      <span>${label}</span>
      <select data-filter="${key}">
        ${values.map((option) => `<option value="${escapeHtml(option)}" ${option === value ? "selected" : ""}>${escapeHtml(formatter(option))}</option>`).join("")}
      </select>
    </label>
  `;
}

function worklistTable(items, compact = false) {
  return `
    <div class="table-wrap">
      <table>
        <thead><tr><th>Return</th><th>State</th><th>Owner</th>${compact ? "" : "<th>Reason</th>"}<th>Exposure</th></tr></thead>
        <tbody>
          ${items.map((item) => `
            <tr>
              <td><strong>${item.returnId}</strong><small>${escapeHtml(item.market)}</small></td>
              <td>${stateBadge(item.slaState)}</td>
              <td>${escapeHtml(item.owner)}</td>
              ${compact ? "" : `<td>${escapeHtml(item.delayReason)}</td>`}
              <td>${formatCurrency(item.valueEur)}</td>
            </tr>
          `).join("")}
        </tbody>
      </table>
    </div>
  `;
}

function returnsTable(items) {
  return `
    <div class="table-wrap register">
      <table>
        <thead><tr><th>Return</th><th>Market</th><th>Partner</th><th>Status</th><th>SLA</th><th>Age</th><th>Owner</th><th>Value</th><th>Delay reason</th></tr></thead>
        <tbody>
          ${items.map((item) => `
            <tr>
              <td><strong>${item.returnId}</strong><small>${escapeHtml(item.returnType)}</small></td>
              <td>${escapeHtml(item.market)}</td>
              <td>${escapeHtml(item.partner)}</td>
              <td>${escapeHtml(item.status)}</td>
              <td>${stateBadge(item.slaState)}</td>
              <td>${item.ageDays}d</td>
              <td>${escapeHtml(item.owner)}</td>
              <td>${item.highValue ? `<span class="value-dot" title="Top 10% open-return exposure"></span>` : ""}${formatCurrency(item.valueEur)}</td>
              <td>${escapeHtml(item.delayReason)}</td>
            </tr>
          `).join("")}
        </tbody>
      </table>
    </div>
  `;
}

function paginationControls(paginated) {
  return `
    <div class="pagination-bar">
      <span>Showing page ${paginated.page} of ${paginated.totalPages} (${paginated.totalItems} rows)</span>
      <div>
        <button class="text-button" data-page="prev" ${paginated.page <= 1 ? "disabled" : ""} type="button"><span class="glyph">PR</span><span>Prev</span></button>
        <button class="text-button" data-page="next" ${paginated.page >= paginated.totalPages ? "disabled" : ""} type="button"><span class="glyph">NX</span><span>Next</span></button>
      </div>
    </div>
  `;
}

function rankedList(title, items, nameKey) {
  const maxExposure = Math.max(...items.map((item) => item.exposure), 1);

  return `
    <div class="panel">
      <div class="panel-heading"><div><p class="eyebrow">Scorecard</p><h3>${title}</h3></div></div>
      <ul class="ranked-list">
        ${items.slice(0, 6).map((item) => `
          <li>
            <div><strong>${escapeHtml(item[nameKey])}</strong><span>${item.openCount} open &middot; ${item.overdueCount} overdue</span></div>
            <div class="bar-track" aria-hidden="true"><span style="width: ${Math.max(8, (item.exposure / maxExposure) * 100)}%"></span></div>
          </li>
        `).join("")}
      </ul>
    </div>
  `;
}

function stateBadge(stateName) {
  return `<span class="state-badge ${stateName}">${formatState(stateName)}</span>`;
}

function bindEvents() {
  document.querySelectorAll("[data-role]").forEach((button) => {
    button.addEventListener("click", () => {
      state.activeRole = button.dataset.role;
      render();
    });
  });

  document.querySelectorAll("[data-filter]").forEach((select) => {
    select.addEventListener("change", () => {
      state.filters[select.dataset.filter] = select.value;
      state.page = 1;
      render();
    });
  });

  document.querySelector("[data-search]")?.addEventListener("input", (event) => {
    state.filters.search = event.target.value;
    state.page = 1;
    render();
  });

  document.querySelectorAll("[data-page]").forEach((button) => {
    button.addEventListener("click", () => {
      state.page += button.dataset.page === "next" ? 1 : -1;
      render();
    });
  });

  document.querySelectorAll("[data-roi]").forEach((input) => {
    input.addEventListener("input", () => {
      state.roiInputs[input.dataset.roi] = Number(input.value || 0);
      render();
    });
  });

  document.querySelector("[data-upload-csv]")?.addEventListener("change", handleCsvUpload);
  document.querySelector("[data-download-template]")?.addEventListener("click", downloadTemplate);
  document.querySelector("[data-reset-demo]")?.addEventListener("click", resetDemoData);
  document.querySelector("[data-export-worklist]")?.addEventListener("click", exportWorklist);
  document.querySelectorAll("[data-download-report]").forEach((button) => {
    button.addEventListener("click", downloadReport);
  });
  document.querySelectorAll("[data-copy-draft]").forEach((button) => {
    button.addEventListener("click", () => copyDraft(button.dataset.copyDraft));
  });
}

async function handleCsvUpload(event) {
  const [file] = event.target.files;
  if (!file) return;

  try {
    if (/\.(xlsx|xls)$/i.test(file.name)) {
      throw new Error("Native Excel workbooks are not parsed in this offline prototype. Export the sheet as CSV or use the template.");
    }
    const csv = await file.text();
    const validation = validateReturnsCsv(csv);
    state.validation = validation;
    if (!validation.valid) {
      throw new Error(`Missing required columns: ${validation.missingColumns.join(", ")}`);
    }
    const parsed = parseReturnsCsv(csv);
    if (!parsed.length) throw new Error("No return records found.");
    state.returns = enrichReturns(parsed);
    state.sourceName = file.name;
    state.loadError = "";
    state.page = 1;
    state.filters = { market: "All", partner: "All", status: "All", slaState: "All", search: "" };
  } catch (error) {
    state.loadError = `Upload failed: ${error.message}`;
  }

  render();
}

function downloadTemplate() {
  downloadText("dx-returns-upload-template.csv", buildReturnCsvTemplate(), "text/csv");
}

function resetDemoData() {
  state.returns = enrichReturns(parseReturnsCsv(state.demoCsv));
  state.sourceName = "Synthetic demo CSV";
  state.loadError = "";
  state.validation = validateReturnsCsv(state.demoCsv);
  state.page = 1;
  state.filters = { market: "All", partner: "All", status: "All", slaState: "All", search: "" };
  render();
}

function exportWorklist() {
  const worklist = getOverdueWorklist(state.returns);
  downloadText("dx-returns-escalation-worklist.csv", serializeWorklistCsv(worklist), "text/csv");
}

function downloadReport() {
  const kpis = calculateKpis(state.returns);
  const worklist = getOverdueWorklist(state.returns);
  const marketBreakdown = getMarketBreakdown(state.returns);
  const partnerPerformance = getPartnerPerformance(state.returns);
  const report = buildStakeholderReport({ kpis, marketBreakdown, partnerPerformance, worklist });
  downloadText("dx-returns-weekly-report.txt", report, "text/plain");
}

async function copyDraft(index) {
  const textarea = document.querySelector(`[data-draft-text="${index}"]`);
  if (!textarea) return;
  textarea.select();

  try {
    await navigator.clipboard.writeText(textarea.value);
  } catch {
    document.execCommand("copy");
  }
}

function downloadText(filename, content, type) {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.append(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

boot().catch((error) => {
  root.innerHTML = `<main class="shell"><section class="panel"><h1>Unable to load dashboard</h1><p>${escapeHtml(error.message)}</p></section></main>`;
});
