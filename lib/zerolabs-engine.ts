import {
  CompiledContextResult,
  CompilerProfile,
  ConstraintSieveState,
  EvaluatedProject,
  PinnedItem,
  ProjectSummary,
  RubricAxis,
  TokenBudget,
} from './zerolabs-types';
import { FLAGSHIP_GUIDE, FLAGSHIP_REVIEW } from './zerolabs-data';

const AXES: RubricAxis[] = [
  'schemaFidelity',
  'tokenEfficiency',
  'runtimeSpeed',
  'securityIsolation',
  'setupErgonomics',
];

export function computeBaselineScore(project: ProjectSummary): number {
  const sum = AXES.reduce((acc, axis) => acc + project.scores[axis], 0);
  return Math.round(sum / AXES.length);
}

export function computeWeightedScore(
  project: ProjectSummary,
  weights: ConstraintSieveState['weights']
): number {
  let weightedSum = 0;
  let totalWeight = 0;
  for (const axis of AXES) {
    const w = weights[axis];
    weightedSum += project.scores[axis] * w;
    totalWeight += w;
  }
  if (totalWeight === 0) return computeBaselineScore(project);
  return Math.round(weightedSum / totalWeight);
}

export function checkDisqualifiers(
  project: ProjectSummary,
  hard: ConstraintSieveState['hard']
): string[] {
  const reasons: string[] = [];

  if (hard.offlineOnly && !project.capabilities.offlineCapable) {
    reasons.push(
      project.capabilities.offlineNote ||
        'Requires outbound network access (fails Local & Offline constraint).'
    );
  }
  if (hard.zeroTelemetry && !project.capabilities.zeroTelemetry) {
    reasons.push(
      project.capabilities.telemetryNote ||
        'Emits default outbound telemetry (fails Zero Telemetry constraint).'
    );
  }
  if (hard.mcp2025 && !project.capabilities.mcp2025Compliant) {
    reasons.push(
      project.capabilities.mcpNote ||
        'Implements legacy MCP spec prior to 2025-03.'
    );
  }
  if (hard.permissiveLicense && !project.capabilities.permissiveLicense) {
    reasons.push(
      project.capabilities.licenseNote ||
        `License ${project.license} is not permissive (MIT/Apache-2.0 required).`
    );
  }
  if (hard.maxP95Ms !== null && project.p95Ms > hard.maxP95Ms) {
    reasons.push(
      `Measured p95 latency (${project.p95Ms}ms) exceeds ceiling (${hard.maxP95Ms}ms).`
    );
  }

  return reasons;
}

export function evaluateProjects(
  projects: ProjectSummary[],
  sieve: ConstraintSieveState
): { qualified: EvaluatedProject[]; disqualified: EvaluatedProject[] } {
  const evaluated: EvaluatedProject[] = projects.map((project) => {
    const baselineScore = computeBaselineScore(project);
    const weightedScore = computeWeightedScore(project, sieve.weights);
    const disqualificationReasons = checkDisqualifiers(project, sieve.hard);
    return {
      project,
      qualified: disqualificationReasons.length === 0,
      disqualificationReasons,
      weightedScore,
      baselineScore,
      scoreDelta: weightedScore - baselineScore,
    };
  });

  const qualified = evaluated
    .filter((item) => item.qualified)
    .sort((a, b) => b.weightedScore - a.weightedScore || a.project.p95Ms - b.project.p95Ms);

  const disqualified = evaluated
    .filter((item) => !item.qualified)
    .sort((a, b) => b.weightedScore - a.weightedScore);

  return { qualified, disqualified };
}

export function countActiveConstraints(sieve: ConstraintSieveState): number {
  let count = 0;
  if (sieve.hard.offlineOnly) count++;
  if (sieve.hard.zeroTelemetry) count++;
  if (sieve.hard.mcp2025) count++;
  if (sieve.hard.permissiveLicense) count++;
  if (sieve.hard.maxP95Ms !== null) count++;
  for (const axis of AXES) {
    if (sieve.weights[axis] !== 1) count++;
  }
  return count;
}

export function buildSieveQueryString(sieve: ConstraintSieveState): string {
  const params = new URLSearchParams();
  if (sieve.preset !== 'neutral') params.set('preset', sieve.preset);
  if (sieve.hard.offlineOnly) params.set('offline', 'true');
  if (sieve.hard.zeroTelemetry) params.set('zero_telemetry', 'true');
  if (sieve.hard.mcp2025) params.set('mcp_spec', '2025-03');
  if (sieve.hard.permissiveLicense) params.set('license', 'permissive');
  if (sieve.hard.maxP95Ms !== null) params.set('max_p95_ms', String(sieve.hard.maxP95Ms));

  for (const axis of AXES) {
    if (sieve.weights[axis] !== 1) {
      params.set(`w_${axis}`, String(sieve.weights[axis]));
    }
  }
  const qs = params.toString();
  return qs ? `?${qs}` : '';
}

function getProfilePriorityBoost(item: PinnedItem, profile: CompilerProfile): number {
  if (profile === 'guardrails') {
    if (item.kind === 'constraint' || item.kind === 'caveat' || item.kind === 'guide-rule') return 0;
    if (item.kind === 'schema') return 1;
    if (item.kind === 'claim') return 2;
    return 3;
  }
  if (profile === 'audit') {
    if (item.kind === 'claim' || item.kind === 'rubric') return 0;
    if (item.kind === 'caveat' || item.kind === 'constraint') return 1;
    return 2;
  }
  // full-spec
  if (item.kind === 'schema') return 0;
  if (item.kind === 'constraint' || item.kind === 'guide-rule') return 1;
  return 2;
}

export function compileContextBundle(
  pinnedItems: PinnedItem[],
  profile: CompilerProfile,
  budget: TokenBudget,
  includeNegativeConstraints: boolean
): CompiledContextResult {
  const headerOverhead = pinnedItems.length > 0 ? 85 : 0;

  // Deterministic priority sort: profile relevance, then intrinsic priority (1 > 2 > 3), then smaller token cost
  const ranked = [...pinnedItems].sort((a, b) => {
    const pDiff = getProfilePriorityBoost(a, profile) - getProfilePriorityBoost(b, profile);
    if (pDiff !== 0) return pDiff;
    if (a.priority !== b.priority) return a.priority - b.priority;
    return a.tokenCost - b.tokenCost;
  });

  const includedItems: PinnedItem[] = [];
  const prunedItems: PinnedItem[] = [];
  let runningTokens = headerOverhead;
  let rawTokens = headerOverhead;

  for (const item of ranked) {
    const negExtra = includeNegativeConstraints && item.negativeConstraint ? 35 : 0;
    const itemTokens = item.tokenCost + negExtra;
    rawTokens += itemTokens;

    if (runningTokens + itemTokens <= budget) {
      includedItems.push(item);
      runningTokens += itemTokens;
    } else {
      prunedItems.push(item);
    }
  }

  const profileTitle =
    profile === 'guardrails'
      ? 'Implementation Guardrails'
      : profile === 'audit'
        ? 'Verification & Audit Brief'
        : 'Full Architecture & Tool Spec';

  const negativeConstraints = includeNegativeConstraints
    ? includedItems
        .filter((i) => i.negativeConstraint || i.driftWarning)
        .map((i) => {
          const parts: string[] = [];
          if (i.negativeConstraint) parts.push(`- [DO NOT ASSUME] ${i.negativeConstraint} (ref: ${i.sourceUrl}${i.anchor})`);
          if (i.driftWarning) parts.push(`- [VERSION DRIFT] ${i.driftWarning} (ref: ${i.sourceUrl})`);
          return parts.join('\n');
        })
    : [];

  const mdLines: string[] = [
    `# ZeroLabs Scoped Context Bundle`,
    `profile: ${profile} (${profileTitle})`,
    `token_budget: ${runningTokens} / ${budget} tokens (${includedItems.length} included, ${prunedItems.length} pruned)`,
    `generated_from: https://labs.zeroshot.studio`,
    '',
  ];

  if (negativeConstraints.length > 0) {
    mdLines.push('## Hard Negative Constraints & Freshness Warnings');
    mdLines.push(...negativeConstraints);
    mdLines.push('');
  }

  mdLines.push('## Scoped Technical Artifacts');
  for (const item of includedItems) {
    mdLines.push(`### [${item.kind.toUpperCase()}] ${item.title}`);
    mdLines.push(`source: ${item.sourceUrl}${item.anchor}`);
    mdLines.push(item.content);
    mdLines.push('');
  }

  if (prunedItems.length > 0) {
    mdLines.push('## Omitted Due to Token Budget');
    for (const p of prunedItems) {
      mdLines.push(`- ${p.title} (${p.tokenCost} tok) -> ${p.sourceUrl}${p.anchor}`);
    }
  }

  const jsonObj = {
    schema: 'https://labs.zeroshot.studio/schemas/context-bundle.v1.json',
    profile,
    budget: {
      used_tokens: runningTokens,
      max_tokens: budget,
      raw_tokens: rawTokens,
      pruned_count: prunedItems.length,
    },
    negative_constraints: includeNegativeConstraints
      ? includedItems
          .filter((i) => i.negativeConstraint)
          .map((i) => ({
            source: `${i.sourceUrl}${i.anchor}`,
            rule: i.negativeConstraint,
          }))
      : [],
    artifacts: includedItems.map((i) => ({
      id: i.id,
      kind: i.kind,
      title: i.title,
      canonical_url: `${i.sourceUrl}${i.anchor}`,
      tokens: i.tokenCost,
      drift_warning: i.driftWarning ?? null,
      content: i.content,
    })),
  };

  const uniqueSources = Array.from(new Set(includedItems.map((i) => `${i.sourceUrl}${i.anchor}`)));
  const mcpResourceOutput = JSON.stringify(
    {
      jsonrpc: '2.0',
      method: 'resources/read',
      params: {
        uri: `https://labs.zeroshot.studio/api/context-bundle?profile=${profile}&budget=${budget}`,
        anchors: uniqueSources,
        include_negative_constraints: includeNegativeConstraints,
      },
    },
    null,
    2
  );

  return {
    includedItems,
    prunedItems,
    totalTokens: runningTokens,
    rawTokens,
    budget,
    markdownOutput: mdLines.join('\n').trim(),
    jsonOutput: JSON.stringify(jsonObj, null, 2),
    mcpResourceOutput,
  };
}

export function buildReviewProjection(
  project: ProjectSummary,
  evaluated: EvaluatedProject,
  rerunQueueCount: number
): { markdown: string; json: string; tokenCount: number; sections: { anchor: string; label: string; jsonSlice: string }[] } {
  const review = FLAGSHIP_REVIEW;

  const jsonPayload = {
    canonical_url: review.canonicalUrl,
    type: 'project_review',
    project: project.name,
    category: project.category,
    verification: {
      run_id: project.runId,
      tested_version: project.testedVersion,
      upstream_latest: project.upstreamVersion,
      drift_status: project.driftStatus,
      verified_date: project.verifiedDate,
      tested_commit: review.testedCommit,
      environment: review.environment,
      repro_command: review.reproCommand,
    },
    rerun_endpoint: {
      http_post: `https://labs.zeroshot.studio/api/reviews/${project.slug}/rerun-requests`,
      mcp_tool: 'request_review_rerun',
      queued_requests_for_upstream: rerunQueueCount,
      example_payload: {
        slug: project.slug,
        target_version: project.upstreamVersion,
        focus: ['full_rubric', 'pool_stress'],
      },
    },
    conditional_verdict: {
      qualified_for_active_sieve: evaluated.qualified,
      weighted_score: evaluated.weightedScore,
      baseline_score: evaluated.baselineScore,
      disqualifiers: evaluated.disqualificationReasons,
      summary: review.verdictSummary,
    },
    claims: review.claims.map((c) => ({
      anchor: `${review.canonicalUrl}${c.anchor}`,
      kind: c.kind,
      title: c.title,
      measured: c.measuredValue,
      negative_constraint: c.negativeConstraint ?? null,
    })),
    rubric: review.rubricDetails.map((r) => ({
      anchor: `${review.canonicalUrl}${r.anchor}`,
      axis: r.axis,
      score: r.score,
      p50: r.p50,
      p95: r.p95,
      p99: r.p99,
      assertion: r.assertion,
    })),
    schematic_nodes: review.schematicNodes.map((n) => ({
      anchor: `${review.canonicalUrl}${n.anchor}`,
      label: n.label,
      permission_scope: n.permissionScope,
      latency_budget: n.latencyBudget,
      failure_mode: n.failureMode,
    })),
  };

  const mdLines = [
    `---`,
    `canonical_url: ${review.canonicalUrl}`,
    `type: project_review`,
    `project: ${project.name}`,
    `tested_version: ${project.testedVersion}`,
    `upstream_version: ${project.upstreamVersion}`,
    `drift_status: ${project.driftStatus}`,
    `run_id: ${project.runId}`,
    `weighted_score: ${evaluated.weightedScore} (baseline: ${evaluated.baselineScore})`,
    `rerun_tool: request_review_rerun(slug="${project.slug}", target_version="${project.upstreamVersion}")`,
    `---`,
    '',
    `# ${review.title} — Empirical Review`,
    '',
    `## Conditional Verdict`,
    review.verdictSummary,
    '',
    `## Verified Claims & Hard Negative Constraints`,
    ...review.claims.map(
      (c) =>
        `- **${c.title}** (${c.measuredValue}) [${c.anchor}]\n  ${c.body}${
          c.negativeConstraint ? `\n  - DO NOT ASSUME: ${c.negativeConstraint}` : ''
        }`
    ),
    '',
    `## Weighted Rubric (${project.runId})`,
    ...review.rubricDetails.map(
      (r) => `- ${r.label}: ${r.score}/100 (p50 ${r.p50} · p95 ${r.p95}) — ${r.assertion} [${r.anchor}]`
    ),
    '',
    `## Reproducibility`,
    `\`\`\``,
    review.reproCommand,
    `\`\`\``,
  ];

  const sections = [
    {
      anchor: '#verdict',
      label: 'Verification & Conditional Verdict',
      jsonSlice: JSON.stringify(
        {
          verification: jsonPayload.verification,
          conditional_verdict: jsonPayload.conditional_verdict,
          rerun_endpoint: jsonPayload.rerun_endpoint,
        },
        null,
        2
      ),
    },
    ...review.claims.map((c) => ({
      anchor: c.anchor,
      label: `Claim · ${c.title.slice(0, 38)}...`,
      jsonSlice: JSON.stringify(
        {
          anchor: `${review.canonicalUrl}${c.anchor}`,
          kind: c.kind,
          measured: c.measuredValue,
          body: c.body,
          negative_constraint: c.negativeConstraint ?? null,
        },
        null,
        2
      ),
    })),
    ...review.rubricDetails.map((r) => ({
      anchor: r.anchor,
      label: `Rubric · ${r.label}`,
      jsonSlice: JSON.stringify(
        {
          anchor: `${review.canonicalUrl}${r.anchor}`,
          axis: r.axis,
          score: r.score,
          distribution: { p50: r.p50, p95: r.p95, p99: r.p99 },
          assertion: r.assertion,
        },
        null,
        2
      ),
    })),
    ...review.schematicNodes.map((n) => ({
      anchor: n.anchor,
      label: `Schematic · ${n.label}`,
      jsonSlice: n.contractJson,
    })),
  ];

  return {
    markdown: mdLines.join('\n'),
    json: JSON.stringify(jsonPayload, null, 2),
    tokenCount: 2340,
    sections,
  };
}

export function buildGuideProjection(): {
  markdown: string;
  json: string;
  tokenCount: number;
  sections: { anchor: string; label: string; jsonSlice: string }[];
} {
  const guide = FLAGSHIP_GUIDE;
  const jsonPayload = {
    canonical_url: guide.canonicalUrl,
    type: 'technical_guide',
    title: guide.title,
    spec_compatibility: guide.specCompatibility,
    last_verified: guide.verifiedDate,
    executive_summary: guide.executiveSummary,
    invariants: guide.invariants.map((inv) => ({
      anchor: `${guide.canonicalUrl}${inv.anchor}`,
      title: inv.title,
      rule: inv.body,
      negative_constraint: inv.negativeConstraint,
    })),
    schematic_nodes: guide.schematicNodes.map((n) => ({
      anchor: `${guide.canonicalUrl}${n.anchor}`,
      label: n.label,
      permission_scope: n.permissionScope,
      failure_mode: n.failureMode,
    })),
  };

  const mdLines = [
    `---`,
    `canonical_url: ${guide.canonicalUrl}`,
    `type: technical_guide`,
    `spec_compatibility: ${guide.specCompatibility}`,
    `last_verified: ${guide.verifiedDate}`,
    `---`,
    '',
    `# ${guide.title}`,
    '',
    guide.executiveSummary,
    '',
    `## Architectural Invariants`,
    ...guide.invariants.map(
      (i) => `- **${i.title}** [${i.anchor}]\n  ${i.body}\n  - DO NOT ASSUME: ${i.negativeConstraint}`
    ),
    '',
    `## Reference Profile`,
    '```json',
    guide.referenceSnippet,
    '```',
  ];

  const sections = [
    {
      anchor: '#guide-summary',
      label: 'Spec Scope & Summary',
      jsonSlice: JSON.stringify(
        {
          canonical_url: guide.canonicalUrl,
          spec_compatibility: guide.specCompatibility,
          executive_summary: guide.executiveSummary,
        },
        null,
        2
      ),
    },
    ...guide.invariants.map((inv) => ({
      anchor: inv.anchor,
      label: `Invariant · ${inv.title.slice(0, 36)}...`,
      jsonSlice: JSON.stringify(
        {
          anchor: `${guide.canonicalUrl}${inv.anchor}`,
          title: inv.title,
          negative_constraint: inv.negativeConstraint,
        },
        null,
        2
      ),
    })),
    ...guide.schematicNodes.map((n) => ({
      anchor: n.anchor,
      label: `Schematic · ${n.label}`,
      jsonSlice: n.contractJson,
    })),
  ];

  return {
    markdown: mdLines.join('\n'),
    json: JSON.stringify(jsonPayload, null, 2),
    tokenCount: guide.agentTokenCount,
    sections,
  };
}
