import test from 'node:test';
import assert from 'node:assert/strict';
import { EVALUATED_PROJECTS, SIEVE_PRESETS } from './zerolabs-data';
import {
  buildGuideProjection,
  buildReviewProjection,
  buildSieveQueryString,
  compileContextBundle,
  computeBaselineScore,
  computeWeightedScore,
  countActiveConstraints,
  evaluateProjects,
} from './zerolabs-engine';
import { PinnedItem } from './zerolabs-types';

test('Constraint Sieve neutral baseline qualifies all projects with zero delta', () => {
  const { qualified, disqualified } = evaluateProjects(
    EVALUATED_PROJECTS,
    SIEVE_PRESETS.neutral.state
  );
  assert.equal(disqualified.length, 0);
  assert.equal(qualified.length, EVALUATED_PROJECTS.length);
  for (const item of qualified) {
    assert.equal(item.scoreDelta, 0);
    assert.equal(item.weightedScore, computeBaselineScore(item.project));
  }
});

test('Constraint Sieve local-first preset disqualifies non-offline or telemetry tools with explicit reasons', () => {
  const { qualified, disqualified } = evaluateProjects(
    EVALUATED_PROJECTS,
    SIEVE_PRESETS['local-first'].state
  );
  assert.ok(qualified.length > 0, 'Expected at least one local-first qualifying project');
  assert.ok(disqualified.length >= 3, 'Expected cloud/telemetry tools to be disqualified');

  for (const item of disqualified) {
    assert.equal(item.qualified, false);
    assert.ok(
      item.disqualificationReasons.length > 0,
      `Expected explicit failure reason for ${item.project.slug}`
    );
  }

  const pg = qualified.find((q) => q.project.slug === 'mcp-server-postgres');
  assert.ok(pg, 'mcp-server-postgres should qualify for local-first preset');
});

test('Weighted scoring responds to axis priority shifts', () => {
  const sandbox = EVALUATED_PROJECTS.find((p) => p.slug === 'sandbox-exec-mcp')!;
  const neutral = computeWeightedScore(sandbox, SIEVE_PRESETS.neutral.state.weights);
  const securityHeavy = computeWeightedScore(sandbox, {
    schemaFidelity: 1,
    tokenEfficiency: 1,
    runtimeSpeed: 1,
    securityIsolation: 2,
    setupErgonomics: 0.5,
  });
  assert.ok(
    securityHeavy > neutral,
    `Expected security-heavy score (${securityHeavy}) to exceed neutral (${neutral}) for sandbox-exec-mcp`
  );
});

test('Sieve query string serializes active filters cleanly', () => {
  const qs = buildSieveQueryString(SIEVE_PRESETS.production.state);
  assert.ok(qs.includes('zero_telemetry=true'));
  assert.ok(qs.includes('mcp_spec=2025-03'));
  assert.ok(qs.includes('max_p95_ms=50'));
  assert.ok(countActiveConstraints(SIEVE_PRESETS.production.state) > 0);
});

test('Context Compiler enforces token budget and prioritizes negative constraints & schemas over prose', () => {
  const items: PinnedItem[] = [
    {
      id: 'rubric-low',
      sourceSlug: 'mcp-server-postgres',
      sourceTitle: 'mcp-server-postgres',
      sourceUrl: 'https://labs.zeroshot.studio/reviews/mcp-server-postgres',
      anchor: '#rubric-setup',
      kind: 'rubric',
      title: 'Setup Ergonomics Rubric Row',
      content: 'Longer prose summary about setup ergonomics.',
      tokenCost: 480,
      priority: 3,
    },
    {
      id: 'caveat-high',
      sourceSlug: 'mcp-server-postgres',
      sourceTitle: 'mcp-server-postgres',
      sourceUrl: 'https://labs.zeroshot.studio/reviews/mcp-server-postgres',
      anchor: '#claim-pool-exhaustion',
      kind: 'caveat',
      title: 'Connection Pool Exhaustion Caveat',
      content: 'Pool saturates at c=32.',
      negativeConstraint: 'Do not deploy without PgBouncer transaction mode.',
      tokenCost: 420,
      priority: 1,
      driftWarning: 'Tested v2.4.1 / Upstream v2.5.1',
    },
    {
      id: 'schema-high',
      sourceSlug: 'mcp-server-postgres',
      sourceTitle: 'mcp-server-postgres',
      sourceUrl: 'https://labs.zeroshot.studio/reviews/mcp-server-postgres',
      anchor: '#node-ast-guard',
      kind: 'schema',
      title: 'Policy & AST Guard Contract',
      content: '{"ast_policy":"strict_select_only"}',
      tokenCost: 390,
      priority: 1,
    },
  ];

  // Budget = 1000 tokens: header (85) + caveat (455) + schema (390) = 930 <= 1000; rubric (480) must be pruned!
  const compiled = compileContextBundle(items, 'guardrails', 1000, true);
  assert.equal(compiled.includedItems.length, 2);
  assert.equal(compiled.prunedItems.length, 1);
  assert.equal(compiled.prunedItems[0].id, 'rubric-low');
  assert.ok(compiled.totalTokens <= 1000);
  assert.ok(compiled.markdownOutput.includes('[DO NOT ASSUME]'));
  assert.ok(compiled.markdownOutput.includes('Omitted Due to Token Budget'));
  assert.ok(compiled.jsonOutput.includes('"pruned_count": 1'));
  assert.ok(compiled.mcpResourceOutput.includes('resources/read'));

  // Tight 500-token ceiling keeps only highest-priority item + header
  const tight = compileContextBundle(items, 'guardrails', 500, false);
  assert.equal(tight.includedItems.length, 1);
  assert.equal(tight.prunedItems.length, 2);
  assert.ok(tight.totalTokens <= 500);
});

test('Machine Projection generators maintain semantic isomorphism with canonical anchors', () => {
  const { qualified } = evaluateProjects(EVALUATED_PROJECTS, SIEVE_PRESETS.neutral.state);
  const pgEval = qualified.find((q) => q.project.slug === 'mcp-server-postgres')!;
  const reviewProj = buildReviewProjection(pgEval.project, pgEval, 12);
  assert.ok(reviewProj.markdown.includes('canonical_url: https://labs.zeroshot.studio/reviews/mcp-server-postgres'));
  assert.ok(reviewProj.json.includes('"queued_requests_for_upstream": 12'));
  assert.ok(reviewProj.sections.some((s) => s.anchor === '#claim-pool-exhaustion'));

  const guideProj = buildGuideProjection();
  assert.ok(guideProj.markdown.includes('type: technical_guide'));
  assert.ok(!guideProj.json.includes('drift_status'), 'Standard technical guide should omit review-only drift fields');
});
