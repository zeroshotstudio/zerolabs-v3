'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  AlertTriangle,
  Check,
  ChevronDown,
  ChevronRight,
  Copy,
  Pin,
  RefreshCw,
  Search,
  X,
} from 'lucide-react';
import {
  EVALUATED_PROJECTS,
  FLAGSHIP_REVIEW,
  RUBRIC_AXIS_LABELS,
} from '@/lib/zerolabs-data';
import { buildReviewProjection, evaluateProjects } from '@/lib/zerolabs-engine';
import {
  CompiledContextResult,
  ConstraintSieveState,
  EmpiricalClaim,
  PinnedItem,
  ProjectionMode,
  ReRunRequestEntry,
  RubricAxis,
  RubricDetail,
  SchematicNode,
  WeightLevel,
} from '@/lib/zerolabs-types';
import { SpecimenFrame } from './SpecimenFrame';
import { InspectableSchematic } from './InspectableSchematic';
import { ContextCompilerDock } from './ContextCompilerDrawer';

interface ReviewSurfaceProps {
  projectionMode: ProjectionMode;
  sieve: ConstraintSieveState;
  onChangeSieve: (next: ConstraintSieveState) => void;
  pinnedItems: PinnedItem[];
  compiled: CompiledContextResult;
  isPinned: (id: string) => boolean;
  onTogglePin: (item: PinnedItem) => void;
  onOpenCompiler: () => void;
  rerunQueueCount: number;
  submittedRerun: ReRunRequestEntry | null;
  onSubmitRerun: (req: ReRunRequestEntry) => void;
}

const AXES: RubricAxis[] = [
  'schemaFidelity',
  'tokenEfficiency',
  'runtimeSpeed',
  'securityIsolation',
  'setupErgonomics',
];

const RERUN_FOCUS_OPTIONS = [
  'Full rubric refresh',
  'Connection pool stress (c=32)',
  'MCP 2025-03 schema check',
  'Visual proof recapture',
];

export function ReviewSurface({
  projectionMode,
  sieve,
  onChangeSieve,
  pinnedItems,
  compiled,
  isPinned,
  onTogglePin,
  onOpenCompiler,
  rerunQueueCount,
  submittedRerun,
  onSubmitRerun,
}: ReviewSurfaceProps) {
  const review = FLAGSHIP_REVIEW;
  const project = useMemo(
    () => EVALUATED_PROJECTS.find((p) => p.slug === review.slug)!,
    [review.slug]
  );

  const evaluated = useMemo(() => {
    const { qualified, disqualified } = evaluateProjects([project], sieve);
    return qualified[0] ?? disqualified[0];
  }, [project, sieve]);

  const projection = useMemo(
    () => buildReviewProjection(project, evaluated, rerunQueueCount),
    [project, evaluated, rerunQueueCount]
  );

  // Local interactive states
  const [activeStepIndex, setActiveStepIndex] = useState(2); // Default to Step 03: Pool Stress (most informative proof)
  const [expandedRubric, setExpandedRubric] = useState<RubricAxis | null>('securityIsolation');
  const [selectedNodeId, setSelectedNodeId] = useState<string>(review.schematicNodes[2].id); // Policy & AST Guard
  const [inspectorSource, setInspectorSource] = useState<
    { type: 'node'; node: SchematicNode } | { type: 'claim'; claim: EmpiricalClaim }
  >({ type: 'node', node: review.schematicNodes[2] });

  // Single tabbed middle rail slot (prevents vertical overflow!)
  const [railTab, setRailTab] = useState<'inspector' | 'constraints'>('inspector');

  // Split inspect active anchor & Agent payload format
  const [activeAnchor, setActiveAnchor] = useState<string>('#verdict');
  const [agentFormat, setAgentFormat] = useState<'markdown' | 'json'>('markdown');
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const splitScrollRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (projectionMode !== 'split' || !splitScrollRef.current) return;
    const target = splitScrollRef.current.querySelector<HTMLElement>(
      `[data-split-anchor="${CSS.escape(activeAnchor)}"]`
    );
    if (target) {
      target.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    }
  }, [activeAnchor, projectionMode]);

  // Version-Drift & Request Re-Run Popover state
  const [rerunOpen, setRerunOpen] = useState(false);
  const [rerunFocus, setRerunFocus] = useState<string[]>([
    'Full rubric refresh',
    'Connection pool stress (c=32)',
  ]);
  const [rerunNote, setRerunNote] = useState('');

  // Altitude 3 Run Dossier state
  const [dossierOpen, setDossierOpen] = useState(true);
  const [logFilter, setLogFilter] = useState('');

  const handleCopy = (key: string, text: string) => {
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(text).catch(() => {});
    }
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 1800);
  };

  const handleSelectNode = (node: SchematicNode) => {
    setSelectedNodeId(node.id);
    setInspectorSource({ type: 'node', node });
    setRailTab('inspector');
    setActiveAnchor(node.anchor);
  };

  const handleSelectClaim = (claim: EmpiricalClaim) => {
    setInspectorSource({ type: 'claim', claim });
    setRailTab('inspector');
    setActiveAnchor(claim.anchor);
    setActiveStepIndex(claim.evidenceStepIndex);
  };

  const buildClaimPin = (claim: EmpiricalClaim): PinnedItem => ({
    id: `rev-${claim.id}`,
    sourceSlug: review.slug,
    sourceTitle: review.title,
    sourceUrl: review.canonicalUrl,
    anchor: claim.anchor,
    kind: claim.kind === 'caveat' ? 'caveat' : 'claim',
    title: claim.title,
    content: `${claim.body} (Measured: ${claim.measuredValue})`,
    negativeConstraint: claim.negativeConstraint,
    tokenCost: claim.tokenCost,
    priority: claim.kind === 'caveat' ? 1 : 2,
    driftWarning: `Tested ${project.testedVersion} / Upstream ${project.upstreamVersion} (Minor drift)`,
  });

  const buildRubricPin = (r: RubricDetail): PinnedItem => ({
    id: `rev-rubric-${r.axis}`,
    sourceSlug: review.slug,
    sourceTitle: review.title,
    sourceUrl: review.canonicalUrl,
    anchor: r.anchor,
    kind: 'rubric',
    title: `${r.label}: ${r.score}/100 (${r.p95})`,
    content: `${r.summary} Assertion: ${r.assertion} [p50=${r.p50}, p95=${r.p95}, p99=${r.p99}]`,
    tokenCost: r.tokenCost,
    priority: 3,
  });

  const handlePinNode = (node: SchematicNode) => {
    onTogglePin({
      id: `rev-node-${node.id}`,
      sourceSlug: review.slug,
      sourceTitle: review.title,
      sourceUrl: review.canonicalUrl,
      anchor: node.anchor,
      kind: 'schema',
      title: `Schematic Node: ${node.label}`,
      content: `${node.role}\nScope: ${node.permissionScope}\nContract:\n${node.contractJson}`,
      negativeConstraint: node.failureMode,
      tokenCost: node.tokenCost,
      priority: 1,
    });
  };

  const handleToggleFocus = (opt: string) => {
    setRerunFocus((prev) =>
      prev.includes(opt) ? prev.filter((item) => item !== opt) : [...prev, opt]
    );
  };

  const handleSubmitRerunForm = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmitRerun({
      targetVersion: project.upstreamVersion,
      focusAreas: rerunFocus.length > 0 ? rerunFocus : ['Full rubric refresh'],
      note: rerunNote.trim(),
      submittedAt: 'Just now',
    });
    setRerunOpen(false);
    setRerunNote('');
  };

  const toggleHardConstraint = (
    key: 'offlineOnly' | 'zeroTelemetry' | 'mcp2025' | 'permissiveLicense'
  ) => {
    onChangeSieve({
      ...sieve,
      preset: 'custom',
      hard: { ...sieve.hard, [key]: !sieve.hard[key] },
    });
  };

  const setAxisWeight = (axis: RubricAxis, w: WeightLevel) => {
    onChangeSieve({
      ...sieve,
      preset: 'custom',
      weights: { ...sieve.weights, [axis]: w },
    });
  };

  const allLogLines = useMemo(() => {
    const flat = review.runSteps.flatMap((s) =>
      s.logLines.map((l) => ({ ...l, step: `0${s.stepNumber}` }))
    );
    const q = logFilter.trim().toLowerCase();
    if (!q) return flat;
    return flat.filter(
      (line) =>
        line.text.toLowerCase().includes(q) || line.level.toLowerCase().includes(q)
    );
  }, [review.runSteps, logFilter]);

  // FULL AGENT PAYLOAD MODE
  if (projectionMode === 'agent') {
    const rawText = agentFormat === 'markdown' ? projection.markdown : projection.json;
    return (
      <main className="mx-auto max-w-[1320px] px-4 sm:px-6 py-7 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3 border border-[var(--zl-specimen-border)] bg-[var(--zl-specimen-surface)] text-[var(--zl-specimen-ink)] px-4 py-3 rounded-[3px]">
          <div className="space-y-0.5">
            <div className="font-mono text-xs text-white">
              {review.canonicalUrl}.{agentFormat === 'markdown' ? 'md' : 'json'}
            </div>
            <div className="font-mono text-[11px] text-[var(--zl-specimen-muted)] tabular-nums">
              Deterministic Agent Projection · {projection.tokenCount.toLocaleString()} tokens · Includes request_review_rerun tool contract
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div
              role="group"
              aria-label="Agent payload format"
              className="inline-flex bg-[#0d1015] border border-[var(--zl-specimen-border)] p-0.5 rounded-[2px]"
            >
              {(['markdown', 'json'] as const).map((fmt) => (
                <button
                  key={fmt}
                  type="button"
                  aria-pressed={agentFormat === fmt}
                  onClick={() => setAgentFormat(fmt)}
                  className={`px-2.5 py-1 font-mono text-[11px] rounded-[2px] cursor-pointer ${
                    agentFormat === fmt
                      ? 'bg-[#252d3a] text-white'
                      : 'text-[var(--zl-specimen-muted)] hover:text-white'
                  }`}
                >
                  {fmt === 'markdown' ? 'text/markdown' : 'application/json'}
                </button>
              ))}
            </div>
            <button
              type="button"
              onClick={() => handleCopy('agent-payload', rawText)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-[var(--zl-accent)] text-white hover:bg-[var(--zl-accent-hover)] rounded-[2px] cursor-pointer"
            >
              {copiedKey === 'agent-payload' ? (
                <Check className="w-3.5 h-3.5" />
              ) : (
                <Copy className="w-3.5 h-3.5" />
              )}
              {copiedKey === 'agent-payload' ? 'Copied' : 'Copy Payload'}
            </button>
          </div>
        </div>

        <pre className="border border-[var(--zl-specimen-border)] bg-[var(--zl-specimen-bg)] text-[var(--zl-specimen-ink)] p-5 font-mono text-xs leading-relaxed overflow-x-auto specimen-scroll rounded-[3px] whitespace-pre-wrap">
          {rawText}
        </pre>
      </main>
    );
  }

  // SPLIT INSPECT GEOMETRY FIX:
  // Normal Human mode: [minmax(0,1fr)_360px]
  // Split Inspect mode: [minmax(0,760px)_minmax(0,520px)] — expands right rail into dedicated ~520px Deep Graphite machine pane!
  const isSplit = projectionMode === 'split';

  return (
    <main className="mx-auto max-w-[1320px] px-4 sm:px-6 py-7">
      <div
        className={`grid grid-cols-1 gap-7 items-start ${
          isSplit
            ? 'lg:grid-cols-[minmax(0,760px)_minmax(0,520px)]'
            : 'lg:grid-cols-[minmax(0,1fr)_360px]'
        }`}
      >
        {/* PRIMARY HUMAN ANALYSIS & EVIDENCE CANVAS */}
        <article className="space-y-9 min-w-0">
          {/* ========================================================== */}
          {/* ALTITUDE 1: VERDICT, PROVENANCE & BOUND VISUAL PROOF       */}
          {/* ========================================================== */}
          <section
            id="altitude-1"
            onMouseEnter={() => setActiveAnchor('#verdict')}
            className="space-y-5"
          >
            {/* Title & Unboxed Provenance Telemetry */}
            <header className="space-y-2.5 pb-5 border-b border-[var(--zl-border)]">
              <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1 font-mono text-xs text-[var(--zl-ink-muted)] tabular-nums">
                <span className="text-[var(--zl-ink)] font-medium">{review.category}</span>
                <span aria-hidden="true">·</span>
                <span>{project.license}</span>
                <span aria-hidden="true">·</span>
                <span>Tested {project.testedVersion}</span>
                <span aria-hidden="true">·</span>
                <span className="text-[var(--zl-warn)] font-medium">
                  Upstream {project.upstreamVersion} (Minor drift)
                </span>
                <span aria-hidden="true">·</span>
                <span>{project.runId}</span>
              </div>

              <h1 className="text-2xl sm:text-[34px] font-bold tracking-[-0.03em] leading-[1.1] text-[var(--zl-ink)]">
                {review.title}
              </h1>

              <p className="text-sm text-[var(--zl-ink-secondary)] max-w-[66ch] leading-relaxed">
                {review.subtitle}
              </p>

              {/* Mobile Compact Version-Drift & Re-Run Strip */}
              <div className="lg:hidden pt-2 flex flex-wrap items-center justify-between gap-2 text-xs border-t border-[var(--zl-border)]">
                <span className="font-mono text-[var(--zl-warn)]">
                  Tested {project.testedVersion} → Upstream {project.upstreamVersion}
                </span>
                <button
                  type="button"
                  onClick={() => setRerunOpen((v) => !v)}
                  className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium border border-[var(--zl-border-strong)] bg-[var(--zl-surface)] text-[var(--zl-ink)] rounded-[2px] cursor-pointer"
                >
                  <RefreshCw className="w-3 h-3 text-[var(--zl-accent)]" />
                  Request re-run ({rerunQueueCount})
                </button>
              </div>
            </header>

            {/* Conditional Verdict Synthesis Frame */}
            <div className="border border-[var(--zl-border)] bg-[var(--zl-surface)] rounded-[3px] overflow-hidden">
              {/* Top Verdict Score Bar */}
              <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 bg-[var(--zl-ground)] border-b border-[var(--zl-border)]">
                <div className="flex items-baseline gap-3 flex-wrap">
                  <span className="text-xs font-semibold text-[var(--zl-ink)]">
                    Altitude 1 · Conditional Verdict
                  </span>
                  {evaluated.qualified ? (
                    <span className="font-mono text-xs text-[var(--zl-ok)] font-medium tabular-nums">
                      Qualified · Weighted {evaluated.weightedScore}/100 (Baseline {evaluated.baselineScore})
                    </span>
                  ) : (
                    <span className="font-mono text-xs text-[var(--zl-fail)] font-medium">
                      Disqualified by active Constraint Sieve
                    </span>
                  )}
                </div>

                <span className="font-mono text-[11px] text-[var(--zl-ink-muted)] tabular-nums">
                  p95 {project.p95Ms}ms · {project.medianTokensPerCall} tok/call
                </span>
              </div>

              {/* Active Constraint Disqualifier Warning (if user toggled a failing constraint like <50ms -> N/A or tested custom) */}
              {!evaluated.qualified && (
                <div className="px-4 py-2.5 bg-[var(--zl-fail-bg)] border-b border-[var(--zl-fail-border)] text-xs text-[var(--zl-fail)] flex items-start gap-2">
                  <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-semibold">Fails active Constraint Sieve:</span>{' '}
                    {evaluated.disqualificationReasons.join(' ')}
                  </div>
                </div>
              )}

              <div className="p-4 sm:p-5 space-y-5">
                <p className="text-[15px] leading-[1.65] text-[var(--zl-ink)] max-w-[66ch]">
                  {review.verdictSummary}
                </p>

                {/* Two-Column Strengths vs. Hard Negative Constraints */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-3 border-t border-[var(--zl-border)]">
                  {/* Verified Strengths */}
                  <div className="space-y-3">
                    <div className="text-xs font-semibold text-[var(--zl-ok)]">
                      Verified Strengths
                    </div>
                    {review.claims
                      .filter((c) => c.kind === 'strength')
                      .map((claim) => {
                        const pin = buildClaimPin(claim);
                        const pinned = isPinned(pin.id);
                        return (
                          <div
                            key={claim.id}
                            onMouseEnter={() => setActiveAnchor(claim.anchor)}
                            className="border border-[var(--zl-border)] bg-[var(--zl-ground)] p-3 rounded-[2px] space-y-1.5"
                          >
                            <div className="flex items-start justify-between gap-2">
                              <button
                                type="button"
                                onClick={() => handleSelectClaim(claim)}
                                className="text-xs font-semibold text-[var(--zl-ink)] hover:text-[var(--zl-accent)] text-left cursor-pointer leading-snug"
                              >
                                {claim.title}
                              </button>
                              <button
                                type="button"
                                aria-label={`${pinned ? 'Unpin' : 'Pin'} ${claim.title}`}
                                onClick={() => onTogglePin(pin)}
                                className={`px-2 py-0.5 text-[11px] font-medium rounded-[2px] border cursor-pointer shrink-0 ${
                                  pinned
                                    ? 'border-[var(--zl-accent)] bg-[var(--zl-accent-soft)] text-[var(--zl-accent)]'
                                    : 'border-[var(--zl-border-strong)] bg-[var(--zl-surface)] text-[var(--zl-ink-secondary)] hover:text-[var(--zl-ink)]'
                                }`}
                              >
                                {pinned ? 'Pinned' : '+ Pin'}
                              </button>
                            </div>
                            <div className="font-mono text-[11px] text-[var(--zl-ok)] tabular-nums">
                              {claim.measuredValue}
                            </div>
                          </div>
                        );
                      })}
                  </div>

                  {/* Hard Caveats & Negative Constraints */}
                  <div className="space-y-3">
                    <div className="text-xs font-semibold text-[var(--zl-warn)]">
                      Hard Caveats &amp; Negative Constraints
                    </div>
                    {review.claims
                      .filter((c) => c.kind === 'caveat')
                      .map((claim) => {
                        const pin = buildClaimPin(claim);
                        const pinned = isPinned(pin.id);
                        return (
                          <div
                            key={claim.id}
                            onMouseEnter={() => setActiveAnchor(claim.anchor)}
                            className="border border-[var(--zl-warn-border)] bg-[var(--zl-warn-bg)] p-3 rounded-[2px] space-y-1.5"
                          >
                            <div className="flex items-start justify-between gap-2">
                              <button
                                type="button"
                                onClick={() => handleSelectClaim(claim)}
                                className="text-xs font-semibold text-[var(--zl-ink)] hover:text-[var(--zl-accent)] text-left cursor-pointer leading-snug"
                              >
                                {claim.title}
                              </button>
                              <button
                                type="button"
                                aria-label={`${pinned ? 'Unpin' : 'Pin'} ${claim.title}`}
                                onClick={() => onTogglePin(pin)}
                                className={`px-2 py-0.5 text-[11px] font-medium rounded-[2px] border cursor-pointer shrink-0 ${
                                  pinned
                                    ? 'border-[var(--zl-accent)] bg-[var(--zl-accent-soft)] text-[var(--zl-accent)]'
                                    : 'border-[var(--zl-border-strong)] bg-[var(--zl-surface)] text-[var(--zl-ink-secondary)] hover:text-[var(--zl-ink)]'
                                }`}
                              >
                                {pinned ? 'Pinned' : '+ Pin'}
                              </button>
                            </div>
                            <div className="font-mono text-[11px] text-[var(--zl-warn)] tabular-nums">
                              {claim.measuredValue}
                            </div>
                          </div>
                        );
                      })}
                  </div>
                </div>
              </div>
            </div>

            {/* Hero Bound Visual Run Proof Specimen Frame */}
            <SpecimenFrame
              runId={project.runId}
              testedVersion={project.testedVersion}
              steps={review.runSteps}
              activeStepIndex={activeStepIndex}
              onSelectStep={setActiveStepIndex}
            />
          </section>

          {/* ========================================================== */}
          {/* ALTITUDE 2: WEIGHTED RUBRIC, ANALYSIS & SCHEMATIC          */}
          {/* ========================================================== */}
          <section id="altitude-2" className="space-y-7 pt-2 border-t border-[var(--zl-border)]">
            {/* Interactive 5-Axis Rubric Breakdown */}
            <div className="space-y-3">
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <h2 className="text-lg font-bold tracking-[-0.02em] text-[var(--zl-ink)]">
                  Altitude 2 · Weighted Rubric &amp; Architecture
                </h2>
                <span className="font-mono text-xs text-[var(--zl-ink-muted)]">
                  Click any axis to inspect bound assertions &amp; percentiles
                </span>
              </div>

              <div className="border border-[var(--zl-border)] bg-[var(--zl-surface)] rounded-[3px] divide-y divide-[var(--zl-border)]">
                {review.rubricDetails.map((row) => {
                  const open = expandedRubric === row.axis;
                  const weight = sieve.weights[row.axis];
                  const pinObj = buildRubricPin(row);
                  const pinned = isPinned(pinObj.id);

                  return (
                    <div
                      key={row.axis}
                      id={row.anchor.slice(1)}
                      onMouseEnter={() => setActiveAnchor(row.anchor)}
                    >
                      <div className="flex items-center justify-between gap-3 px-4 py-3 hover:bg-[var(--zl-ground)] transition-colors">
                        <button
                          type="button"
                          aria-expanded={open}
                          onClick={() => setExpandedRubric(open ? null : row.axis)}
                          className="flex-1 flex items-center gap-3 text-left min-w-0 cursor-pointer"
                        >
                          {open ? (
                            <ChevronDown className="w-3.5 h-3.5 text-[var(--zl-ink-muted)] shrink-0" />
                          ) : (
                            <ChevronRight className="w-3.5 h-3.5 text-[var(--zl-ink-muted)] shrink-0" />
                          )}
                          <span className="text-sm font-semibold text-[var(--zl-ink)] w-40 shrink-0">
                            {row.label}
                          </span>
                          <div className="hidden sm:block flex-1 h-1.5 bg-[var(--zl-recessed)] rounded-[1px] overflow-hidden max-w-[220px]">
                            <div
                              className={`h-full ${
                                weight === 2 ? 'bg-[var(--zl-accent)]' : 'bg-[var(--zl-ink)]'
                              }`}
                              style={{ width: `${row.score}%` }}
                            />
                          </div>
                          <span className="font-mono text-xs tabular-nums text-[var(--zl-ink-muted)] hidden md:inline">
                            {weight}× wt
                          </span>
                        </button>

                        <div className="flex items-center gap-3 shrink-0">
                          <span className="font-mono text-sm font-bold tabular-nums text-[var(--zl-ink)]">
                            {row.score}
                            <span className="text-[11px] font-normal text-[var(--zl-ink-muted)]">
                              /100
                            </span>
                          </span>
                          <button
                            type="button"
                            aria-label={`${pinned ? 'Unpin' : 'Pin'} ${row.label} rubric row`}
                            onClick={() => onTogglePin(pinObj)}
                            className={`px-2 py-0.5 text-[11px] font-medium rounded-[2px] border cursor-pointer ${
                              pinned
                                ? 'border-[var(--zl-accent)] bg-[var(--zl-accent-soft)] text-[var(--zl-accent)]'
                                : 'border-[var(--zl-border-strong)] bg-[var(--zl-surface)] text-[var(--zl-ink-secondary)] hover:text-[var(--zl-ink)]'
                            }`}
                          >
                            {pinned ? 'Pinned' : '+ Pin'}
                          </button>
                        </div>
                      </div>

                      {open && (
                        <div className="px-4 sm:px-10 py-3.5 bg-[var(--zl-ground)] border-t border-[var(--zl-border)] space-y-2.5 text-xs">
                          <p className="text-[var(--zl-ink)] leading-relaxed max-w-[64ch]">
                            {row.summary}
                          </p>
                          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 font-mono text-[11px] text-[var(--zl-ink-secondary)] tabular-nums">
                            <span>p50: {row.p50}</span>
                            <span>p95: {row.p95}</span>
                            <span>p99: {row.p99}</span>
                            <button
                              type="button"
                              onClick={() => {
                                setActiveStepIndex(row.linkedStepIndex);
                                document
                                  .getElementById('altitude-1')
                                  ?.scrollIntoView({ behavior: 'smooth' });
                              }}
                              className="text-[var(--zl-accent)] hover:underline cursor-pointer"
                            >
                              Jump to bound proof Step 0{row.linkedStepIndex + 1} →
                            </button>
                          </div>
                          <div className="text-[11px] text-[var(--zl-ink-muted)]">
                            <span className="font-medium text-[var(--zl-ink-secondary)]">
                              Test Assertion:
                            </span>{' '}
                            {row.assertion}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Deep Architectural Prose (66ch measure) with Clickable Claim Provenance Anchors */}
            <div className="space-y-4 max-w-[66ch]">
              <h3 className="text-base font-bold text-[var(--zl-ink)]">
                Architectural Assessment &amp; Production Boundaries
              </h3>
              <p className="text-[15.5px] leading-[1.68] text-[var(--zl-ink-secondary)]">
                Most database MCP servers rely on keyword regex filters to block writes—a pattern trivially bypassed by writable Common Table Expressions. By embedding{' '}
                <button
                  type="button"
                  onClick={() => handleSelectClaim(review.claims[0])}
                  className="underline decoration-[var(--zl-accent)] decoration-1 underline-offset-4 text-[var(--zl-ink)] font-medium hover:text-[var(--zl-accent)] cursor-pointer"
                >
                  libpg_query AST validation (42/42 blocked)
                </button>{' '}
                directly ahead of socket dispatch, mcp-server-postgres establishes a verifiable read boundary with sub-millisecond overhead.
              </p>
              <p className="text-[15.5px] leading-[1.68] text-[var(--zl-ink-secondary)]">
                Where the server falters is multi-agent fanout. Autonomous coding loops routinely inspect five to ten tables in parallel, and under our 32-worker stress harness,{' '}
                <button
                  type="button"
                  onClick={() => handleSelectClaim(review.claims[2])}
                  className="underline decoration-[var(--zl-accent)] decoration-1 underline-offset-4 text-[var(--zl-ink)] font-medium hover:text-[var(--zl-accent)] cursor-pointer"
                >
                  the default 20-connection pool suffered 11 timeouts
                </button>
                . Placing PgBouncer in transaction mode between the AST gate and the read replica resolves saturation cleanly, while explicitly setting{' '}
                <button
                  type="button"
                  onClick={() => handleSelectClaim(review.claims[3])}
                  className="underline decoration-[var(--zl-accent)] decoration-1 underline-offset-4 text-[var(--zl-ink)] font-medium hover:text-[var(--zl-accent)] cursor-pointer"
                >
                  --statement-timeout-ms=3500
                </button>{' '}
                eliminates runaway cartesian joins.
              </p>
            </div>

            {/* Clickable Vector Inspectable Schematic */}
            <InspectableSchematic
              id="inspectable-schematic"
              title="Inspectable System Schematic · mcp-server-postgres"
              subtitle="Click any node to load its permission scope, failure mode, and JSON/MCP contract into the rail inspector."
              nodes={review.schematicNodes}
              edges={review.schematicEdges}
              selectedNodeId={selectedNodeId}
              onSelectNode={handleSelectNode}
              isNodePinned={(nid) => isPinned(`rev-node-${nid}`)}
              onPinNode={handlePinNode}
            />
          </section>

          {/* ========================================================== */}
          {/* ALTITUDE 3: RAW RUN EVIDENCE DOSSIER                       */}
          {/* ========================================================== */}
          <section id="altitude-3" className="pt-2 border-t border-[var(--zl-border)] space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <button
                type="button"
                aria-expanded={dossierOpen}
                onClick={() => setDossierOpen((v) => !v)}
                className="inline-flex items-center gap-2 text-lg font-bold tracking-[-0.02em] text-[var(--zl-ink)] cursor-pointer"
              >
                {dossierOpen ? (
                  <ChevronDown className="w-4 h-4 text-[var(--zl-ink-muted)]" />
                ) : (
                  <ChevronRight className="w-4 h-4 text-[var(--zl-ink-muted)]" />
                )}
                <span>Altitude 3 · Run Evidence Dossier ({project.runId})</span>
              </button>
              <span className="font-mono text-xs text-[var(--zl-ink-muted)] tabular-nums">
                6 PASS · 2 WARN · Commit {review.testedCommit}
              </span>
            </div>

            {dossierOpen && (
              <div className="space-y-5">
                {/* Environment Fingerprint & Repro Command */}
                <div className="border border-[var(--zl-border)] bg-[var(--zl-surface)] rounded-[3px] divide-y divide-[var(--zl-border)] text-xs">
                  <div className="p-3.5 grid grid-cols-1 sm:grid-cols-[150px_minmax(0,1fr)] gap-2">
                    <span className="font-mono text-[var(--zl-ink-muted)]">Environment</span>
                    <span className="font-mono text-[var(--zl-ink)]">{review.environment}</span>
                  </div>
                  <div className="p-3.5 grid grid-cols-1 sm:grid-cols-[150px_minmax(0,1fr)] gap-2">
                    <span className="font-mono text-[var(--zl-ink-muted)]">Harness / Date</span>
                    <span className="font-mono text-[var(--zl-ink)]">
                      {review.harnessVersion} · {review.runDate}
                    </span>
                  </div>
                  <div className="p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-2 bg-[var(--zl-ground)]">
                    <code className="font-mono text-[11px] text-[var(--zl-ink)] break-all">
                      $ {review.reproCommand}
                    </code>
                    <button
                      type="button"
                      onClick={() => handleCopy('repro', review.reproCommand)}
                      className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-mono border border-[var(--zl-border-strong)] bg-[var(--zl-surface)] text-[var(--zl-ink)] hover:border-[var(--zl-accent)] rounded-[2px] cursor-pointer shrink-0 self-start sm:self-auto"
                    >
                      {copiedKey === 'repro' ? <Check className="w-3 h-3 text-[var(--zl-ok)]" /> : <Copy className="w-3 h-3" />}
                      {copiedKey === 'repro' ? 'Copied' : 'Copy repro'}
                    </button>
                  </div>
                </div>

                {/* Test Verification Matrix */}
                <div className="border border-[var(--zl-border)] bg-[var(--zl-surface)] rounded-[3px] overflow-hidden">
                  <div className="px-4 py-2 bg-[var(--zl-recessed)] border-b border-[var(--zl-border)] font-mono text-[11px] text-[var(--zl-ink-secondary)] grid grid-cols-[64px_minmax(0,1fr)_64px_64px] gap-2">
                    <span>ID</span>
                    <span>Verification Check</span>
                    <span>Status</span>
                    <span className="text-right">Time</span>
                  </div>
                  <div className="divide-y divide-[var(--zl-border)] text-xs">
                    {review.testMatrix.map((row) => (
                      <div
                        key={row.id}
                        className="px-4 py-2 grid grid-cols-[64px_minmax(0,1fr)_64px_64px] gap-2 items-center"
                      >
                        <span className="font-mono text-[11px] text-[var(--zl-ink-muted)]">
                          {row.id}
                        </span>
                        <span className="text-[var(--zl-ink)]">{row.check}</span>
                        <span
                          className={`font-mono text-[11px] font-medium ${
                            row.result === 'PASS' ? 'text-[var(--zl-ok)]' : 'text-[var(--zl-warn)]'
                          }`}
                        >
                          {row.result}
                        </span>
                        <span className="font-mono text-[11px] text-right text-[var(--zl-ink-muted)] tabular-nums">
                          {row.duration}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Searchable Raw Execution Log */}
                <div className="border border-[var(--zl-specimen-border)] bg-[var(--zl-specimen-bg)] text-[var(--zl-specimen-ink)] rounded-[3px] overflow-hidden">
                  <div className="flex flex-wrap items-center justify-between gap-2 px-4 py-2.5 border-b border-[var(--zl-specimen-border)] bg-[var(--zl-specimen-surface)]">
                    <span className="font-mono text-[11px] text-[var(--zl-specimen-muted)]">
                      Raw Execution Trace ({allLogLines.length} lines)
                    </span>
                    <div className="relative">
                      <Search className="w-3 h-3 text-[var(--zl-specimen-muted)] absolute left-2.5 top-1/2 -translate-y-1/2" />
                      <input
                        type="search"
                        aria-label="Filter raw execution logs"
                        value={logFilter}
                        onChange={(e) => setLogFilter(e.target.value)}
                        placeholder="Filter stdout..."
                        className="pl-7 pr-2.5 py-1 text-[11px] font-mono bg-[#0c0f14] border border-[var(--zl-specimen-border)] text-white placeholder:text-[var(--zl-specimen-muted)] rounded-[2px] w-44 focus:border-[#ef5b3c] focus:outline-none"
                      />
                    </div>
                  </div>
                  <div className="p-4 font-mono text-[11px] leading-relaxed max-h-60 overflow-y-auto specimen-scroll space-y-1">
                    {allLogLines.map((line, i) => (
                      <div key={i} className="flex items-start gap-2.5">
                        <span className="text-[#5e6a7e] shrink-0 tabular-nums">S{line.step}</span>
                        <span className="text-[#697589] shrink-0 tabular-nums">{line.ts}</span>
                        <span
                          className={`w-10 shrink-0 ${
                            line.level === 'OK'
                              ? 'text-[#34c28a]'
                              : line.level === 'WARN'
                                ? 'text-[#f0ab3c]'
                                : line.level === 'TOOL'
                                  ? 'text-[#7ab3ff]'
                                  : 'text-[#8b96a6]'
                          }`}
                        >
                          {line.level}
                        </span>
                        <span className="text-[#dce4f0] break-words">{line.text}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </section>
        </article>

        {/* ========================================================================== */}
        {/* RIGHT COLUMN: EITHER EXPANDED ~520px SPLIT INSPECT OR COMPACT 360px RAIL   */}
        {/* ========================================================================== */}
        {isSplit ? (
          /* ADJUSTMENT 1: Dedicated ~520px Deep Graphite Machine Projection Pane (No 3-col cramp!) */
          <aside
            aria-label="Synchronized machine projection pane"
            className="lg:sticky lg:top-5 border border-[var(--zl-specimen-border)] bg-[var(--zl-specimen-bg)] text-[var(--zl-specimen-ink)] rounded-[3px] flex flex-col lg:h-[calc(100vh-3.5rem)] overflow-hidden"
          >
            <div className="px-4 py-3 border-b border-[var(--zl-specimen-border)] bg-[var(--zl-specimen-surface)] flex items-center justify-between gap-2 shrink-0">
              <div>
                <div className="font-mono text-xs font-medium text-white">
                  Split Inspect · Canonical JSON Projection
                </div>
                <div className="font-mono text-[11px] text-[var(--zl-specimen-muted)] mt-0.5">
                  Synced anchor: <span className="text-[#ef5b3c]">{activeAnchor}</span>
                </div>
              </div>
              <div className="flex items-center gap-2.5 shrink-0">
                <span className="font-mono text-[11px] text-[var(--zl-specimen-muted)] tabular-nums">
                  {projection.tokenCount.toLocaleString()} tok
                </span>
                <button
                  type="button"
                  onClick={() => handleCopy('split-json', projection.json)}
                  className="inline-flex items-center gap-1 px-2 py-1 font-mono text-[11px] border border-[var(--zl-specimen-border)] bg-[#0c0f14] text-[#dce4f0] hover:border-[#ef5b3c] rounded-[2px] cursor-pointer whitespace-nowrap"
                >
                  {copiedKey === 'split-json' ? <Check className="w-3 h-3 text-[#34c28a]" /> : <Copy className="w-3 h-3" />}
                  {copiedKey === 'split-json' ? 'Copied' : 'Copy JSON'}
                </button>
              </div>
            </div>

            <div
              ref={splitScrollRef}
              className="flex-1 overflow-y-auto p-4 space-y-3 specimen-scroll"
            >
              {projection.sections.map((sec) => {
                const active = sec.anchor === activeAnchor;
                return (
                  <div
                    key={sec.anchor}
                    data-split-anchor={sec.anchor}
                    className={`border rounded-[2px] transition-colors ${
                      active
                        ? 'border-[#ef5b3c] bg-[#1a1516]'
                        : 'border-[var(--zl-specimen-border)] bg-[#0f1217]'
                    }`}
                  >
                    <div className="px-3 py-1.5 border-b border-[var(--zl-specimen-border)] flex items-center justify-between gap-2 font-mono text-[11px]">
                      <span className={active ? 'text-[#ef5b3c] font-medium' : 'text-[#b5c0cf]'}>
                        {sec.label}
                      </span>
                      <span className="text-[var(--zl-specimen-muted)] shrink-0">{sec.anchor}</span>
                    </div>
                    <pre className="p-3 font-mono text-[11px] leading-relaxed overflow-x-auto text-[#dce4f0] whitespace-pre-wrap break-words">
                      {sec.jsonSlice}
                    </pre>
                  </div>
                );
              })}
            </div>

            {/* Compact Context Compiler Bar inside Split Pane Footer */}
            <div className="border-t border-[var(--zl-specimen-border)] bg-[var(--zl-specimen-surface)] px-4 py-2.5 flex items-center justify-between gap-2 shrink-0">
              <span className="font-mono text-[11px] text-[var(--zl-specimen-muted)] tabular-nums">
                Compiler: {pinnedItems.length} pinned · {compiled.totalTokens} / {compiled.budget} tok
              </span>
              <button
                type="button"
                onClick={onOpenCompiler}
                className="px-3 py-1 text-xs font-medium bg-[var(--zl-accent)] text-white hover:bg-[var(--zl-accent-hover)] rounded-[2px] cursor-pointer whitespace-nowrap"
              >
                Open Compiler
              </button>
            </div>
          </aside>
        ) : (
          /* ADJUSTMENT 2: Zero-overflow Sticky Right Instrument Rail */
          /* Top: Compact Version-Drift Strip | Middle: Tabbed Inspector / Constraints | Bottom: Context Compiler Dock */
          <aside
            aria-label="Review instrument rail"
            className="lg:sticky lg:top-5 border border-[var(--zl-border)] bg-[var(--zl-surface)] rounded-[3px] flex flex-col lg:h-[calc(100vh-3.5rem)] relative"
          >
            {/* 1. TOP (Always Visible, Compact): Version-Drift & Re-Run Strip */}
            <div className="p-3.5 border-b border-[var(--zl-border)] bg-[var(--zl-ground)] shrink-0 relative">
              <div className="flex items-center justify-between gap-2">
                <div className="font-mono text-xs font-medium text-[var(--zl-warn)] tabular-nums">
                  Minor drift · {project.testedVersion} → {project.upstreamVersion}
                </div>
                <span className="font-mono text-[11px] text-[var(--zl-ink-muted)] tabular-nums">
                  {rerunQueueCount} queued
                </span>
              </div>

              <div className="mt-2 flex items-center justify-between gap-2">
                <span className="text-[11px] text-[var(--zl-ink-muted)] truncate">
                  {submittedRerun
                    ? `Queued for ${submittedRerun.targetVersion} (${submittedRerun.submittedAt})`
                    : `Verified ${project.verifiedDate} · ${project.runId}`}
                </span>
                <button
                  type="button"
                  aria-expanded={rerunOpen}
                  onClick={() => setRerunOpen((v) => !v)}
                  className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium border border-[var(--zl-border-strong)] bg-[var(--zl-surface)] text-[var(--zl-ink)] hover:border-[var(--zl-accent)] hover:text-[var(--zl-accent)] rounded-[2px] cursor-pointer whitespace-nowrap shrink-0 transition-colors"
                >
                  <RefreshCw className="w-3 h-3" />
                  {submittedRerun ? 'Update request' : 'Request re-run'}
                </button>
              </div>

              {/* Anchored Request Re-Run Popover */}
              {rerunOpen && (
                <form
                  onSubmit={handleSubmitRerunForm}
                  aria-label="Request fresh verification run"
                  className="absolute right-0 left-0 top-full mt-1.5 z-30 border border-[var(--zl-border-strong)] bg-[var(--zl-surface)] shadow-xl rounded-[3px] p-4 space-y-3"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-xs font-bold text-[var(--zl-ink)]">
                        Request Fresh Run · {project.upstreamVersion}
                      </div>
                      <div className="text-[11px] text-[var(--zl-ink-muted)]">
                        Deduplicated across human &amp; agent queue ({rerunQueueCount} active)
                      </div>
                    </div>
                    <button
                      type="button"
                      aria-label="Close re-run popover"
                      onClick={() => setRerunOpen(false)}
                      className="p-1 text-[var(--zl-ink-muted)] hover:text-[var(--zl-ink)] cursor-pointer"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  <div className="space-y-1.5">
                    <div className="text-[11px] font-medium text-[var(--zl-ink-secondary)]">
                      Focus Scope
                    </div>
                    {RERUN_FOCUS_OPTIONS.map((opt) => (
                      <label
                        key={opt}
                        className="flex items-center gap-2 text-xs text-[var(--zl-ink)] cursor-pointer"
                      >
                        <input
                          type="checkbox"
                          checked={rerunFocus.includes(opt)}
                          onChange={() => handleToggleFocus(opt)}
                          className="accent-[var(--zl-accent)] cursor-pointer"
                        />
                        <span>{opt}</span>
                      </label>
                    ))}
                  </div>

                  <div>
                    <label
                      htmlFor="rerun-note"
                      className="block text-[11px] font-medium text-[var(--zl-ink-secondary)] mb-1"
                    >
                      Optional technical note (commit/PR)
                    </label>
                    <input
                      id="rerun-note"
                      type="text"
                      value={rerunNote}
                      onChange={(e) => setRerunNote(e.target.value)}
                      placeholder="e.g. Pool queue refactored in v2.5.1 PR #412"
                      className="w-full px-2.5 py-1.5 text-xs bg-[var(--zl-ground)] border border-[var(--zl-border-strong)] rounded-[2px] text-[var(--zl-ink)] placeholder:text-[var(--zl-ink-muted)] focus:border-[var(--zl-accent)] focus:outline-none"
                    />
                  </div>

                  <button
                    type="submit"
                    className="w-full px-3 py-1.5 text-xs font-medium bg-[var(--zl-accent)] text-white hover:bg-[var(--zl-accent-hover)] rounded-[2px] cursor-pointer transition-colors"
                  >
                    Queue Re-Run for {project.upstreamVersion}
                  </button>
                </form>
              )}
            </div>

            {/* 2. MIDDLE (Single Tabbed Slot: Inspector | Constraints — Zero Overflow) */}
            <div className="flex-1 min-h-0 flex flex-col">
              <div
                role="tablist"
                aria-label="Rail inspector tabs"
                className="grid grid-cols-2 border-b border-[var(--zl-border)] bg-[var(--zl-surface)] shrink-0"
              >
                <button
                  type="button"
                  role="tab"
                  aria-selected={railTab === 'inspector'}
                  onClick={() => setRailTab('inspector')}
                  className={`py-2 text-xs font-semibold border-b-2 transition-colors cursor-pointer ${
                    railTab === 'inspector'
                      ? 'border-[var(--zl-accent)] text-[var(--zl-ink)]'
                      : 'border-transparent text-[var(--zl-ink-muted)] hover:text-[var(--zl-ink)]'
                  }`}
                >
                  Inspector
                </button>
                <button
                  type="button"
                  role="tab"
                  aria-selected={railTab === 'constraints'}
                  onClick={() => setRailTab('constraints')}
                  className={`py-2 text-xs font-semibold border-b-2 transition-colors cursor-pointer ${
                    railTab === 'constraints'
                      ? 'border-[var(--zl-accent)] text-[var(--zl-ink)]'
                      : 'border-transparent text-[var(--zl-ink-muted)] hover:text-[var(--zl-ink)]'
                  }`}
                >
                  Constraints ({evaluated.weightedScore})
                </button>
              </div>

              {/* Active Tab Panel */}
              <div className="flex-1 min-h-0 overflow-y-auto p-3.5">
                {railTab === 'inspector' ? (
                  inspectorSource.type === 'node' ? (
                    <div className="space-y-3">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <div className="font-mono text-[10px] text-[var(--zl-ink-muted)]">
                            SCHEMATIC NODE · {inspectorSource.node.anchor}
                          </div>
                          <div className="text-sm font-bold text-[var(--zl-ink)] mt-0.5">
                            {inspectorSource.node.label}
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => handlePinNode(inspectorSource.node)}
                          className={`inline-flex items-center gap-1 px-2 py-1 text-[11px] font-medium rounded-[2px] border cursor-pointer shrink-0 ${
                            isPinned(`rev-node-${inspectorSource.node.id}`)
                              ? 'border-[var(--zl-accent)] bg-[var(--zl-accent-soft)] text-[var(--zl-accent)]'
                              : 'border-[var(--zl-border-strong)] text-[var(--zl-ink-secondary)] hover:text-[var(--zl-ink)]'
                          }`}
                        >
                          <Pin className="w-3 h-3" />
                          {isPinned(`rev-node-${inspectorSource.node.id}`) ? 'Pinned' : 'Pin'}
                        </button>
                      </div>

                      <p className="text-xs text-[var(--zl-ink-secondary)] leading-relaxed">
                        {inspectorSource.node.role}
                      </p>

                      <div className="text-[11px] font-mono space-y-1 border-y border-[var(--zl-border)] py-2">
                        <div>
                          <span className="text-[var(--zl-ink-muted)]">Scope: </span>
                          <span className="text-[var(--zl-ink)]">
                            {inspectorSource.node.permissionScope}
                          </span>
                        </div>
                        <div>
                          <span className="text-[var(--zl-ink-muted)]">Latency: </span>
                          <span className="text-[var(--zl-ink)]">
                            {inspectorSource.node.latencyBudget}
                          </span>
                        </div>
                        <div>
                          <span className="text-[var(--zl-ink-muted)]">Caveat: </span>
                          <span className="text-[var(--zl-warn)]">
                            {inspectorSource.node.failureMode}
                          </span>
                        </div>
                      </div>

                      <pre className="bg-[var(--zl-specimen-bg)] text-[var(--zl-specimen-ink)] border border-[var(--zl-specimen-border)] p-2.5 font-mono text-[10.5px] leading-relaxed overflow-x-auto specimen-scroll rounded-[2px]">
                        {inspectorSource.node.contractJson}
                      </pre>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <div className="font-mono text-[10px] text-[var(--zl-ink-muted)]">
                            CLAIM PROVENANCE · {inspectorSource.claim.anchor}
                          </div>
                          <div className="text-sm font-bold text-[var(--zl-ink)] mt-0.5 leading-snug">
                            {inspectorSource.claim.title}
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => onTogglePin(buildClaimPin(inspectorSource.claim))}
                          className="inline-flex items-center gap-1 px-2 py-1 text-[11px] font-medium rounded-[2px] border border-[var(--zl-border-strong)] text-[var(--zl-ink-secondary)] hover:text-[var(--zl-ink)] cursor-pointer shrink-0"
                        >
                          <Pin className="w-3 h-3" />
                          {isPinned(`rev-${inspectorSource.claim.id}`) ? 'Pinned' : 'Pin'}
                        </button>
                      </div>

                      <div className="font-mono text-xs text-[var(--zl-accent)] tabular-nums">
                        Measured: {inspectorSource.claim.measuredValue}
                      </div>

                      <p className="text-xs text-[var(--zl-ink-secondary)] leading-relaxed">
                        {inspectorSource.claim.body}
                      </p>

                      {inspectorSource.claim.negativeConstraint && (
                        <div className="border border-[var(--zl-warn-border)] bg-[var(--zl-warn-bg)] p-2.5 rounded-[2px] text-[11px] text-[var(--zl-warn)] leading-relaxed">
                          <span className="font-semibold">Negative constraint:</span>{' '}
                          {inspectorSource.claim.negativeConstraint}
                        </div>
                      )}

                      <button
                        type="button"
                        onClick={() => {
                          setActiveStepIndex(inspectorSource.claim.evidenceStepIndex);
                          document
                            .getElementById('altitude-1')
                            ?.scrollIntoView({ behavior: 'smooth' });
                        }}
                        className="text-xs font-mono text-[var(--zl-accent)] hover:underline cursor-pointer"
                      >
                        Inspect bound Step 0{inspectorSource.claim.evidenceStepIndex + 1} capture →
                      </button>
                    </div>
                  )
                ) : (
                  /* Active Constraint Sieve Tab */
                  <div className="space-y-3.5 text-xs">
                    <div className="flex items-center justify-between font-mono text-[11px] pb-2 border-b border-[var(--zl-border)] tabular-nums">
                      <span className="text-[var(--zl-ink-secondary)]">Weighted Fit</span>
                      <span className="font-bold text-[var(--zl-ink)]">
                        {evaluated.weightedScore}/100{' '}
                        <span className="font-normal text-[var(--zl-ink-muted)]">
                          (base {evaluated.baselineScore})
                        </span>
                      </span>
                    </div>

                    <div className="space-y-1.5">
                      <div className="text-[11px] font-semibold text-[var(--zl-ink)]">
                        Hard Constraints
                      </div>
                      {(
                        [
                          { key: 'offlineOnly', label: 'Local & Offline' },
                          { key: 'zeroTelemetry', label: 'Zero telemetry' },
                          { key: 'mcp2025', label: 'MCP 2025-03+' },
                          { key: 'permissiveLicense', label: 'Permissive license' },
                        ] as const
                      ).map((c) => (
                        <label
                          key={c.key}
                          className="flex items-center justify-between py-1 text-xs text-[var(--zl-ink-secondary)] cursor-pointer"
                        >
                          <span>{c.label}</span>
                          <input
                            type="checkbox"
                            checked={sieve.hard[c.key]}
                            onChange={() => toggleHardConstraint(c.key)}
                            className="accent-[var(--zl-accent)] cursor-pointer"
                          />
                        </label>
                      ))}
                    </div>

                    <div className="space-y-1.5 pt-2 border-t border-[var(--zl-border)]">
                      <div className="text-[11px] font-semibold text-[var(--zl-ink)]">
                        Axis Weights
                      </div>
                      {AXES.map((axis) => (
                        <div key={axis} className="flex items-center justify-between gap-2">
                          <span className="text-[11px] text-[var(--zl-ink-secondary)] truncate">
                            {RUBRIC_AXIS_LABELS[axis]}
                          </span>
                          <div className="inline-flex bg-[var(--zl-recessed)] p-0.5 border border-[var(--zl-border)] rounded-[2px]">
                            {([0.5, 1, 2] as const).map((w) => (
                              <button
                                key={w}
                                type="button"
                                onClick={() => setAxisWeight(axis, w)}
                                className={`px-1.5 py-0.5 font-mono text-[10px] tabular-nums rounded-[2px] cursor-pointer ${
                                  sieve.weights[axis] === w
                                    ? w === 2
                                      ? 'bg-[var(--zl-accent)] text-white'
                                      : 'bg-[var(--zl-surface)] text-[var(--zl-ink)] font-semibold'
                                    : 'text-[var(--zl-ink-muted)]'
                                }`}
                              >
                                {w}×
                              </button>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* 3. BOTTOM (Always Visible, Compact): Context Compiler Dock */}
            <ContextCompilerDock
              pinnedCount={pinnedItems.length}
              compiled={compiled}
              onOpen={onOpenCompiler}
              variant="rail"
            />
          </aside>
        )}
      </div>
    </main>
  );
}
