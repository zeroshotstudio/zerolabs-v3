'use client';

import React, { useMemo, useState } from 'react';
import {
  ArrowRight,
  Check,
  ChevronDown,
  ChevronRight,
  Copy,
  Film,
  Pin,
  RotateCcw,
  Search,
  SlidersHorizontal,
} from 'lucide-react';
import {
  EVALUATED_PROJECTS,
  RUBRIC_AXIS_LABELS,
  SIEVE_PRESETS,
  TECHNICAL_LIBRARY,
} from '@/lib/zerolabs-data';
import {
  buildSieveQueryString,
  countActiveConstraints,
  evaluateProjects,
} from '@/lib/zerolabs-engine';
import {
  ConstraintSieveState,
  EvaluatedProject,
  PinnedItem,
  RubricAxis,
  SievePresetId,
  WeightLevel,
} from '@/lib/zerolabs-types';

interface IndexSurfaceProps {
  sieve: ConstraintSieveState;
  onChangeSieve: (next: ConstraintSieveState) => void;
  onOpenReview: () => void;
  onOpenGuide: () => void;
  isPinned: (id: string) => boolean;
  onTogglePin: (item: PinnedItem) => void;
}

const AXES: RubricAxis[] = [
  'schemaFidelity',
  'tokenEfficiency',
  'runtimeSpeed',
  'securityIsolation',
  'setupErgonomics',
];

export function IndexSurface({
  sieve,
  onChangeSieve,
  onOpenReview,
  onOpenGuide,
  isPinned,
  onTogglePin,
}: IndexSurfaceProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [sieveExpanded, setSieveExpanded] = useState(true);
  const [expandedSlug, setExpandedSlug] = useState<string | null>('mcp-server-postgres');
  const [copiedFilterUrl, setCopiedFilterUrl] = useState(false);
  const [mobileSection, setMobileSection] = useState<'systems' | 'library'>('systems');

  const filteredProjects = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return EVALUATED_PROJECTS;
    return EVALUATED_PROJECTS.filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        p.category.toLowerCase().includes(q) ||
        p.shortDesc.toLowerCase().includes(q) ||
        p.verdictOneLiner.toLowerCase().includes(q)
    );
  }, [searchQuery]);

  const filteredLibrary = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return TECHNICAL_LIBRARY;
    return TECHNICAL_LIBRARY.filter(
      (g) =>
        g.title.toLowerCase().includes(q) ||
        g.category.toLowerCase().includes(q) ||
        g.summary.toLowerCase().includes(q)
    );
  }, [searchQuery]);

  const { qualified, disqualified } = useMemo(
    () => evaluateProjects(filteredProjects, sieve),
    [filteredProjects, sieve]
  );

  const activeCount = countActiveConstraints(sieve);
  const queryString = buildSieveQueryString(sieve);

  const applyPreset = (presetId: Exclude<SievePresetId, 'custom'>) => {
    onChangeSieve({
      ...SIEVE_PRESETS[presetId].state,
      hard: { ...SIEVE_PRESETS[presetId].state.hard },
      weights: { ...SIEVE_PRESETS[presetId].state.weights },
    });
  };

  const toggleHard = (key: 'offlineOnly' | 'zeroTelemetry' | 'mcp2025' | 'permissiveLicense') => {
    onChangeSieve({
      ...sieve,
      preset: 'custom',
      hard: {
        ...sieve.hard,
        [key]: !sieve.hard[key],
      },
    });
  };

  const setMaxP95 = (val: number | null) => {
    onChangeSieve({
      ...sieve,
      preset: 'custom',
      hard: {
        ...sieve.hard,
        maxP95Ms: val,
      },
    });
  };

  const setAxisWeight = (axis: RubricAxis, weight: WeightLevel) => {
    onChangeSieve({
      ...sieve,
      preset: 'custom',
      weights: {
        ...sieve.weights,
        [axis]: weight,
      },
    });
  };

  const handleCopyFilteredUrl = () => {
    const url = `https://labs.zeroshot.studio/${queryString}`;
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(url).catch(() => {});
    }
    setCopiedFilterUrl(true);
    setTimeout(() => setCopiedFilterUrl(false), 1800);
  };

  const buildProjectPin = (ev: EvaluatedProject): PinnedItem => ({
    id: `idx-${ev.project.slug}`,
    sourceSlug: ev.project.slug,
    sourceTitle: ev.project.name,
    sourceUrl: `https://labs.zeroshot.studio/reviews/${ev.project.slug}`,
    anchor: '#verdict',
    kind: 'claim',
    title: `${ev.project.name} (${ev.project.testedVersion}) — Fit ${ev.weightedScore}/100`,
    content: `${ev.project.verdictOneLiner} Latency p95: ${ev.project.p95Ms}ms. Median call: ${ev.project.medianTokensPerCall} tok.`,
    negativeConstraint: ev.project.keyCaveat,
    tokenCost: 145,
    priority: 2,
    driftWarning:
      ev.project.driftStatus !== 'current'
        ? `Tested ${ev.project.testedVersion} / Upstream ${ev.project.upstreamVersion} (${ev.project.driftDeltaLabel})`
        : undefined,
  });

  const renderDriftLabel = (p: EvaluatedProject['project']) => {
    if (p.driftStatus === 'current') {
      return (
        <span className="text-[var(--zl-ok)] font-medium">
          Current · {p.testedVersion}
        </span>
      );
    }
    if (p.driftStatus === 'minor') {
      return (
        <span className="text-[var(--zl-warn)] font-medium">
          Minor drift · {p.testedVersion} → {p.upstreamVersion}
        </span>
      );
    }
    return (
      <span className="text-[var(--zl-fail)] font-medium">
        Major drift · {p.testedVersion} → {p.upstreamVersion}
      </span>
    );
  };

  return (
    <main className="mx-auto max-w-[1320px] px-4 sm:px-6 pt-7 pb-20 space-y-8">
      {/* Compact Orientation Header (Index starts immediately above the fold) */}
      <section className="flex flex-col lg:flex-row lg:items-end justify-between gap-5 pb-6 border-b border-[var(--zl-border)]">
        <div className="max-w-2xl">
          <h1 className="text-2xl sm:text-[32px] font-bold tracking-[-0.03em] leading-[1.12] text-[var(--zl-ink)]">
            Empirical systems evaluations and machine-addressable technical specifications.
          </h1>
          <div className="mt-2.5 flex flex-wrap items-center gap-x-2.5 gap-y-1 text-xs text-[var(--zl-ink-muted)] font-mono tabular-nums">
            <span>{EVALUATED_PROJECTS.length} verified reviews</span>
            <span aria-hidden="true">·</span>
            <span>{TECHNICAL_LIBRARY.length} guides &amp; schematics</span>
            <span aria-hidden="true">·</span>
            <span>MCP Spec 2025-03 sync</span>
            <span aria-hidden="true">·</span>
            <span>Dual HTTP + MCP surface</span>
          </div>
        </div>

        {/* Instant Search Input */}
        <div className="w-full lg:w-[340px] shrink-0">
          <label htmlFor="index-search" className="sr-only">
            Filter systems, guides, or capabilities
          </label>
          <div className="relative">
            <Search className="w-4 h-4 text-[var(--zl-ink-muted)] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              id="index-search"
              type="search"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Filter by tool, capability, or guide..."
              className="w-full pl-9 pr-3 py-2 text-sm bg-[var(--zl-surface)] border border-[var(--zl-border-strong)] rounded-[3px] text-[var(--zl-ink)] placeholder:text-[var(--zl-ink-muted)] focus:border-[var(--zl-accent)] focus:outline-none"
            />
          </div>
        </div>
      </section>

      {/* Mobile Section Switcher */}
      <div className="md:hidden">
        <div
          role="group"
          aria-label="Index section switch"
          className="grid grid-cols-2 bg-[var(--zl-recessed)] p-0.5 border border-[var(--zl-border)] rounded-[3px]"
        >
          <button
            type="button"
            aria-pressed={mobileSection === 'systems'}
            onClick={() => setMobileSection('systems')}
            className={`py-2 text-xs font-medium rounded-[2px] cursor-pointer ${
              mobileSection === 'systems'
                ? 'bg-[var(--zl-surface)] text-[var(--zl-ink)]'
                : 'text-[var(--zl-ink-secondary)]'
            }`}
          >
            Evaluated Systems ({filteredProjects.length})
          </button>
          <button
            type="button"
            aria-pressed={mobileSection === 'library'}
            onClick={() => setMobileSection('library')}
            className={`py-2 text-xs font-medium rounded-[2px] cursor-pointer ${
              mobileSection === 'library'
                ? 'bg-[var(--zl-surface)] text-[var(--zl-ink)]'
                : 'text-[var(--zl-ink-secondary)]'
            }`}
          >
            Guides &amp; Schematics ({filteredLibrary.length})
          </button>
        </div>
      </div>

      {/* SECTION 1: Evaluated Systems Leaderboard + Constraint Sieve */}
      <section
        aria-labelledby="leaderboard-heading"
        className={mobileSection === 'library' ? 'hidden md:block space-y-4' : 'space-y-4'}
      >
        <div className="flex flex-wrap items-baseline justify-between gap-3">
          <div>
            <h2
              id="leaderboard-heading"
              className="text-lg font-bold tracking-[-0.02em] text-[var(--zl-ink)]"
            >
              01. Evaluated Systems Ledger
            </h2>
            <p className="text-xs text-[var(--zl-ink-secondary)] mt-0.5">
              Scores dynamically re-weight to your active constraints. Disqualified tools remain visible with explicit failure causes.
            </p>
          </div>
          <div className="flex items-center gap-3 text-xs font-mono tabular-nums text-[var(--zl-ink-muted)]">
            <span className="text-[var(--zl-ink)] font-medium">
              {qualified.length} qualified
            </span>
            <span aria-hidden="true">/</span>
            <span className={disqualified.length > 0 ? 'text-[var(--zl-fail)] font-medium' : ''}>
              {disqualified.length} disqualified
            </span>
          </div>
        </div>

        {/* Constraint Sieve Control Bar */}
        <div className="border border-[var(--zl-border)] bg-[var(--zl-surface)] rounded-[3px]">
          <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-2.5 bg-[var(--zl-ground)] border-b border-[var(--zl-border)]">
            <div className="flex items-center gap-2 flex-wrap">
              <button
                type="button"
                aria-expanded={sieveExpanded}
                onClick={() => setSieveExpanded((v) => !v)}
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-[var(--zl-ink)] cursor-pointer whitespace-nowrap"
              >
                <SlidersHorizontal className="w-3.5 h-3.5 text-[var(--zl-accent)]" />
                <span>Constraint Sieve</span>
                {activeCount > 0 && (
                  <span className="font-mono text-[11px] text-[var(--zl-accent)]">
                    ({activeCount} active)
                  </span>
                )}
                {sieveExpanded ? (
                  <ChevronDown className="w-3.5 h-3.5 text-[var(--zl-ink-muted)]" />
                ) : (
                  <ChevronRight className="w-3.5 h-3.5 text-[var(--zl-ink-muted)]" />
                )}
              </button>

              <span aria-hidden="true" className="hidden sm:inline text-[var(--zl-border-strong)]">
                |
              </span>

              {/* Preset Buttons */}
              <div
                role="group"
                aria-label="Constraint presets"
                className="flex items-center gap-1 flex-wrap"
              >
                {(['neutral', 'local-first', 'production', 'token-budget'] as const).map((pid) => {
                  const active = sieve.preset === pid;
                  return (
                    <button
                      key={pid}
                      type="button"
                      aria-pressed={active}
                      onClick={() => applyPreset(pid)}
                      className={`px-2.5 py-1 text-xs font-medium rounded-[2px] border transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                        active
                          ? 'border-[var(--zl-accent)] bg-[var(--zl-accent-soft)] text-[var(--zl-accent)]'
                          : 'border-transparent text-[var(--zl-ink-secondary)] hover:bg-[var(--zl-recessed)] hover:text-[var(--zl-ink)]'
                      }`}
                    >
                      {SIEVE_PRESETS[pid].label}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              {activeCount > 0 && (
                <button
                  type="button"
                  onClick={() => applyPreset('neutral')}
                  className="inline-flex items-center gap-1 px-2 py-1 text-xs text-[var(--zl-ink-secondary)] hover:text-[var(--zl-ink)] cursor-pointer whitespace-nowrap"
                >
                  <RotateCcw className="w-3 h-3" />
                  Reset
                </button>
              )}
              <button
                type="button"
                onClick={handleCopyFilteredUrl}
                className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-mono border border-[var(--zl-border-strong)] bg-[var(--zl-surface)] text-[var(--zl-ink-secondary)] hover:text-[var(--zl-ink)] rounded-[2px] cursor-pointer whitespace-nowrap"
              >
                {copiedFilterUrl ? <Check className="w-3 h-3 text-[var(--zl-ok)]" /> : <Copy className="w-3 h-3" />}
                {copiedFilterUrl ? 'Copied view URL' : 'Copy filtered URL'}
              </button>
            </div>
          </div>

          {/* Expandable Hard Disqualifiers + Rubric Weights Grid */}
          {sieveExpanded && (
            <div className="grid grid-cols-1 lg:grid-cols-2 divide-y lg:divide-y-0 lg:divide-x divide-[var(--zl-border)]">
              {/* Left: Hard Disqualifiers */}
              <div className="p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-[var(--zl-ink)]">
                    Hard Disqualifiers
                  </span>
                  <span className="text-[11px] text-[var(--zl-ink-muted)]">
                    Violations move projects below ledger line
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {(
                    [
                      { key: 'offlineOnly', label: 'Local & Offline capable' },
                      { key: 'zeroTelemetry', label: 'Zero outbound telemetry' },
                      { key: 'mcp2025', label: 'MCP 2025-03+ compliant' },
                      { key: 'permissiveLicense', label: 'Permissive license (MIT/Apache)' },
                    ] as const
                  ).map((item) => {
                    const checked = sieve.hard[item.key];
                    return (
                      <label
                        key={item.key}
                        className={`flex items-center gap-2.5 px-3 py-2 border rounded-[3px] text-xs cursor-pointer select-none transition-colors ${
                          checked
                            ? 'border-[var(--zl-accent)] bg-[var(--zl-accent-soft)] text-[var(--zl-ink)] font-medium'
                            : 'border-[var(--zl-border)] bg-[var(--zl-ground)] text-[var(--zl-ink-secondary)] hover:border-[var(--zl-border-strong)]'
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() => toggleHard(item.key)}
                          className="accent-[var(--zl-accent)] cursor-pointer"
                        />
                        <span>{item.label}</span>
                      </label>
                    );
                  })}
                </div>

                <div className="flex items-center justify-between gap-3 pt-1">
                  <span className="text-xs text-[var(--zl-ink-secondary)]">
                    Max p95 latency ceiling
                  </span>
                  <div
                    role="group"
                    aria-label="Maximum p95 latency ceiling"
                    className="inline-flex bg-[var(--zl-recessed)] p-0.5 border border-[var(--zl-border)] rounded-[3px]"
                  >
                    {(
                      [
                        { val: null, label: 'Any' },
                        { val: 150, label: '< 150ms' },
                        { val: 50, label: '< 50ms' },
                      ] as const
                    ).map((opt) => (
                      <button
                        key={String(opt.val)}
                        type="button"
                        aria-pressed={sieve.hard.maxP95Ms === opt.val}
                        onClick={() => setMaxP95(opt.val)}
                        className={`px-2.5 py-1 font-mono text-[11px] rounded-[2px] cursor-pointer whitespace-nowrap ${
                          sieve.hard.maxP95Ms === opt.val
                            ? 'bg-[var(--zl-surface)] text-[var(--zl-ink)] font-semibold'
                            : 'text-[var(--zl-ink-secondary)] hover:text-[var(--zl-ink)]'
                        }`}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Right: Rubric Axis Priority Weights */}
              <div className="p-4 space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-[var(--zl-ink)]">
                    Rubric Priority Weights
                  </span>
                  <span className="text-[11px] font-mono text-[var(--zl-ink-muted)]">
                    0.5× Low · 1× Std · 2× Critical
                  </span>
                </div>

                <div className="space-y-1.5">
                  {AXES.map((axis) => (
                    <div
                      key={axis}
                      className="flex items-center justify-between gap-3 text-xs py-0.5"
                    >
                      <span className="text-[var(--zl-ink-secondary)]">
                        {RUBRIC_AXIS_LABELS[axis]}
                      </span>
                      <div
                        role="group"
                        aria-label={`Weight for ${RUBRIC_AXIS_LABELS[axis]}`}
                        className="inline-flex bg-[var(--zl-recessed)] p-0.5 border border-[var(--zl-border)] rounded-[2px]"
                      >
                        {([0.5, 1, 2] as const).map((w) => {
                          const active = sieve.weights[axis] === w;
                          return (
                            <button
                              key={w}
                              type="button"
                              aria-pressed={active}
                              onClick={() => setAxisWeight(axis, w)}
                              className={`px-2 py-0.5 font-mono text-[11px] tabular-nums rounded-[2px] cursor-pointer ${
                                active
                                  ? w === 2
                                    ? 'bg-[var(--zl-accent)] text-white font-semibold'
                                    : 'bg-[var(--zl-surface)] text-[var(--zl-ink)] font-semibold'
                                  : 'text-[var(--zl-ink-muted)] hover:text-[var(--zl-ink)]'
                              }`}
                            >
                              {w}×
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Tabular Leaderboard Ledger (Qualified Systems) */}
        <div className="border border-[var(--zl-border)] bg-[var(--zl-surface)] rounded-[3px] overflow-hidden">
          {/* Desktop Table Header */}
          <div className="hidden md:grid grid-cols-[minmax(0,2.2fr)_116px_1.35fr_150px_84px_92px] gap-3 px-4 py-2.5 bg-[var(--zl-recessed)] border-b border-[var(--zl-border)] text-[11px] font-mono text-[var(--zl-ink-secondary)]">
            <div>System &amp; Scope</div>
            <div className="text-right">Fit Score</div>
            <div>Verification State</div>
            <div className="text-right">p95 / Med. Tok</div>
            <div className="text-center">Proof</div>
            <div className="text-right">Context</div>
          </div>

          {qualified.length === 0 ? (
            <div className="px-4 py-8 text-center text-sm text-[var(--zl-ink-secondary)]">
              No evaluated systems satisfy all active hard constraints. Review failure reasons below or relax a constraint.
            </div>
          ) : (
            <div className="divide-y divide-[var(--zl-border)]">
              {qualified.map((ev) => {
                const { project } = ev;
                const expanded = expandedSlug === project.slug;
                const pinItem = buildProjectPin(ev);
                const pinned = isPinned(pinItem.id);

                return (
                  <div key={project.slug} className="bg-[var(--zl-surface)]">
                    {/* Main Ledger Row */}
                    <div className="grid grid-cols-1 md:grid-cols-[minmax(0,2.2fr)_116px_1.35fr_150px_84px_92px] gap-2 md:gap-3 items-center px-4 py-3 hover:bg-[var(--zl-ground)] transition-colors">
                      {/* System & Category */}
                      <div className="flex items-start gap-2.5 min-w-0">
                        <button
                          type="button"
                          aria-expanded={expanded}
                          aria-label={`${expanded ? 'Collapse' : 'Expand'} preview for ${project.name}`}
                          onClick={() => setExpandedSlug(expanded ? null : project.slug)}
                          className="mt-0.5 w-6 h-6 inline-flex items-center justify-center text-[var(--zl-ink-muted)] hover:text-[var(--zl-ink)] hover:bg-[var(--zl-recessed)] rounded-[2px] cursor-pointer shrink-0"
                        >
                          {expanded ? (
                            <ChevronDown className="w-3.5 h-3.5" />
                          ) : (
                            <ChevronRight className="w-3.5 h-3.5" />
                          )}
                        </button>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <button
                              type="button"
                              onClick={() =>
                                project.hasFullReview
                                  ? onOpenReview()
                                  : setExpandedSlug(expanded ? null : project.slug)
                              }
                              className="font-display font-bold text-sm text-[var(--zl-ink)] hover:text-[var(--zl-accent)] cursor-pointer text-left transition-colors"
                            >
                              {project.name}
                            </button>
                            <span className="text-xs text-[var(--zl-ink-muted)]">
                              {project.category} · {project.license}
                            </span>
                          </div>
                          <p className="text-xs text-[var(--zl-ink-secondary)] mt-0.5 line-clamp-1">
                            {project.shortDesc}
                          </p>
                        </div>
                      </div>

                      {/* Weighted Fit Score */}
                      <div className="flex md:flex-col items-baseline md:items-end justify-between pl-8 md:pl-0">
                        <span className="md:hidden text-xs text-[var(--zl-ink-muted)]">
                          Weighted fit
                        </span>
                        <div className="font-mono tabular-nums flex items-baseline gap-1.5">
                          <span className="text-base font-bold text-[var(--zl-ink)]">
                            {ev.weightedScore}
                          </span>
                          <span className="text-[11px] text-[var(--zl-ink-muted)]">/100</span>
                          {ev.scoreDelta !== 0 && (
                            <span
                              className={`text-[11px] font-medium ${
                                ev.scoreDelta > 0 ? 'text-[var(--zl-ok)]' : 'text-[var(--zl-warn)]'
                              }`}
                            >
                              {ev.scoreDelta > 0 ? `+${ev.scoreDelta}` : ev.scoreDelta}
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Verification & Version-Drift State */}
                      <div className="pl-8 md:pl-0 text-xs font-mono tabular-nums">
                        <div>{renderDriftLabel(project)}</div>
                        <div className="text-[11px] text-[var(--zl-ink-muted)] mt-0.5">
                          {project.runId} · {project.verifiedDate}
                        </div>
                      </div>

                      {/* Latency & Token Overhead */}
                      <div className="pl-8 md:pl-0 md:text-right font-mono text-xs tabular-nums text-[var(--zl-ink)]">
                        <span>{project.p95Ms} ms</span>
                        <span className="text-[var(--zl-ink-muted)]"> / </span>
                        <span>{project.medianTokensPerCall} tok</span>
                      </div>

                      {/* Visual Proof Indicator */}
                      <div className="hidden md:flex items-center justify-center font-mono text-[11px] text-[var(--zl-ink-secondary)]">
                        {project.hasVisualProof ? (
                          <span className="inline-flex items-center gap-1 tabular-nums">
                            <Film className="w-3.5 h-3.5 text-[var(--zl-ink-muted)]" />
                            {project.visualProofSteps}
                          </span>
                        ) : (
                          <span className="text-[var(--zl-ink-muted)]">Logs only</span>
                        )}
                      </div>

                      {/* Pin Action */}
                      <div className="pl-8 md:pl-0 flex md:justify-end items-center gap-2">
                        <button
                          type="button"
                          onClick={() => onTogglePin(pinItem)}
                          className={`inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium rounded-[2px] border cursor-pointer transition-colors whitespace-nowrap ${
                            pinned
                              ? 'border-[var(--zl-accent)] bg-[var(--zl-accent-soft)] text-[var(--zl-accent)]'
                              : 'border-[var(--zl-border-strong)] bg-[var(--zl-surface)] text-[var(--zl-ink-secondary)] hover:text-[var(--zl-ink)] hover:border-[var(--zl-ink)]'
                          }`}
                        >
                          {pinned ? <Check className="w-3 h-3" /> : <Pin className="w-3 h-3" />}
                          {pinned ? 'Pinned' : 'Pin'}
                        </button>
                      </div>
                    </div>

                    {/* Inline Specimen Expand Drawer */}
                    {expanded && (
                      <div className="border-t border-[var(--zl-border)] bg-[var(--zl-ground)] px-4 sm:px-10 py-4 grid grid-cols-1 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)_auto] gap-5 items-start">
                        <div className="space-y-2">
                          <div className="text-[11px] font-mono text-[var(--zl-ink-muted)]">
                            CONDITIONAL VERDICT · BASELINE {ev.baselineScore}/100
                          </div>
                          <p className="text-xs text-[var(--zl-ink)] leading-relaxed">
                            {project.verdictOneLiner}
                          </p>
                          <p className="text-xs text-[var(--zl-warn)] leading-relaxed">
                            <span className="font-semibold">Key caveat:</span> {project.keyCaveat}
                          </p>
                        </div>

                        {/* Mini 5-axis rubric bars */}
                        <div className="space-y-1.5">
                          {AXES.map((axis) => (
                            <div
                              key={axis}
                              className="grid grid-cols-[120px_minmax(0,1fr)_32px] items-center gap-2 text-[11px]"
                            >
                              <span className="text-[var(--zl-ink-secondary)] truncate">
                                {RUBRIC_AXIS_LABELS[axis]}
                              </span>
                              <div className="h-1.5 bg-[var(--zl-recessed)] rounded-[1px] overflow-hidden">
                                <div
                                  className="h-full bg-[var(--zl-ink)]"
                                  style={{ width: `${project.scores[axis]}%` }}
                                />
                              </div>
                              <span className="font-mono text-right tabular-nums text-[var(--zl-ink)]">
                                {project.scores[axis]}
                              </span>
                            </div>
                          ))}
                        </div>

                        <div className="flex flex-col items-start lg:items-end justify-between gap-2">
                          {project.hasFullReview ? (
                            <button
                              type="button"
                              onClick={onOpenReview}
                              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium bg-[var(--zl-accent)] text-white hover:bg-[var(--zl-accent-hover)] rounded-[3px] cursor-pointer whitespace-nowrap transition-colors"
                            >
                              <span>Open Full Review</span>
                              <ArrowRight className="w-3.5 h-3.5" />
                            </button>
                          ) : (
                            <button
                              type="button"
                              onClick={onOpenReview}
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium border border-[var(--zl-border-strong)] bg-[var(--zl-surface)] text-[var(--zl-ink)] hover:border-[var(--zl-accent)] hover:text-[var(--zl-accent)] rounded-[3px] cursor-pointer whitespace-nowrap transition-colors"
                            >
                              <span>Inspect Flagship Review</span>
                              <ArrowRight className="w-3.5 h-3.5" />
                            </button>
                          )}
                          <span className="font-mono text-[11px] text-[var(--zl-ink-muted)]">
                            {project.rerunQueueCount > 0
                              ? `${project.rerunQueueCount} re-run requests queued`
                              : 'No drift queue'}
                          </span>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {/* Disqualified Section (Transparently Visible with Failure Reasons) */}
          {disqualified.length > 0 && (
            <div className="border-t-2 border-[var(--zl-border-strong)] bg-[var(--zl-ground)]">
              <div className="px-4 py-2.5 border-b border-[var(--zl-border)] flex items-center justify-between text-xs">
                <span className="font-semibold text-[var(--zl-fail)]">
                  Disqualified by active constraints ({disqualified.length})
                </span>
                <span className="text-[11px] text-[var(--zl-ink-muted)]">
                  Shown transparently so trade-offs remain inspectable
                </span>
              </div>

              <div className="divide-y divide-[var(--zl-border)]">
                {disqualified.map((ev) => (
                  <div
                    key={ev.project.slug}
                    className="px-4 py-3 grid grid-cols-1 md:grid-cols-[minmax(0,1.2fr)_minmax(0,2fr)_auto] gap-3 items-center opacity-80"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-display font-bold text-sm text-[var(--zl-ink)]">
                          {ev.project.name}
                        </span>
                        <span className="font-mono text-[11px] text-[var(--zl-ink-muted)] tabular-nums">
                          Baseline {ev.baselineScore}
                        </span>
                      </div>
                      <div className="text-xs text-[var(--zl-ink-muted)]">
                        {ev.project.category} · {ev.project.testedVersion} · {ev.project.p95Ms} ms p95
                      </div>
                    </div>

                    <ul className="space-y-1 text-xs text-[var(--zl-fail)]">
                      {ev.disqualificationReasons.map((reason, idx) => (
                        <li key={idx}>Fails: {reason}</li>
                      ))}
                    </ul>

                    <div className="flex md:justify-end">
                      <button
                        type="button"
                        onClick={() => onTogglePin(buildProjectPin(ev))}
                        className="inline-flex items-center gap-1 px-2.5 py-1 text-xs border border-[var(--zl-border-strong)] bg-[var(--zl-surface)] text-[var(--zl-ink-secondary)] hover:text-[var(--zl-ink)] rounded-[2px] cursor-pointer whitespace-nowrap"
                      >
                        <Pin className="w-3 h-3" />
                        Pin Caveat
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </section>

      {/* SECTION 2: Technical Library & Inspectable Schematics (Graceful Degradation Showcase) */}
      <section
        aria-labelledby="library-heading"
        className={mobileSection === 'systems' ? 'hidden md:block space-y-4' : 'space-y-4'}
      >
        <div className="flex flex-wrap items-baseline justify-between gap-3 pt-2 border-t border-[var(--zl-border)]">
          <div>
            <h2
              id="library-heading"
              className="text-lg font-bold tracking-[-0.02em] text-[var(--zl-ink)]"
            >
              02. Technical Guides &amp; Inspectable Schematics
            </h2>
            <p className="text-xs text-[var(--zl-ink-secondary)] mt-0.5">
              Architecture notes and MCP protocol patterns—full Projection Lens and Context Compiler parity without synthetic scores.
            </p>
          </div>
          <span className="font-mono text-xs text-[var(--zl-ink-muted)]">
            {filteredLibrary.length} entries
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 border-t border-l border-[var(--zl-border)] bg-[var(--zl-surface)]">
          {filteredLibrary.map((item) => {
            const guidePin: PinnedItem = {
              id: `guide-idx-${item.slug}`,
              sourceSlug: item.slug,
              sourceTitle: item.title,
              sourceUrl: `https://labs.zeroshot.studio/guides/${item.slug}`,
              anchor: '#guide-summary',
              kind: 'guide-rule',
              title: item.title,
              content: `${item.summary} (${item.specCompatibility})`,
              tokenCost: 130,
              priority: 2,
            };
            const pinned = isPinned(guidePin.id);

            return (
              <article
                key={item.slug}
                className="border-r border-b border-[var(--zl-border)] p-5 flex flex-col justify-between gap-4 hover:bg-[var(--zl-ground)] transition-colors"
              >
                <div>
                  <div className="flex items-center gap-2 text-xs font-mono text-[var(--zl-ink-muted)]">
                    <span className="text-[var(--zl-ink-secondary)] font-medium">
                      {item.category}
                    </span>
                    <span aria-hidden="true">·</span>
                    <span>{item.verifiedDate}</span>
                  </div>
                  <h3 className="mt-2 text-base font-bold leading-snug text-[var(--zl-ink)]">
                    <button
                      type="button"
                      onClick={onOpenGuide}
                      className="text-left hover:text-[var(--zl-accent)] cursor-pointer transition-colors"
                    >
                      {item.title}
                    </button>
                  </h3>
                  <p className="mt-2 text-xs text-[var(--zl-ink-secondary)] leading-relaxed">
                    {item.summary}
                  </p>
                </div>

                <div className="flex flex-wrap items-center justify-between gap-2 pt-3 border-t border-[var(--zl-border)]">
                  <div className="font-mono text-[11px] text-[var(--zl-ink-muted)] tabular-nums">
                    {item.specCompatibility} · {item.agentTokenCount.toLocaleString()} tok ·{' '}
                    {item.schematicNodeCount} nodes
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => onTogglePin(guidePin)}
                      className={`inline-flex items-center gap-1 px-2 py-1 text-xs rounded-[2px] border cursor-pointer transition-colors ${
                        pinned
                          ? 'border-[var(--zl-accent)] bg-[var(--zl-accent-soft)] text-[var(--zl-accent)]'
                          : 'border-[var(--zl-border-strong)] bg-[var(--zl-surface)] text-[var(--zl-ink-secondary)] hover:text-[var(--zl-ink)]'
                      }`}
                    >
                      {pinned ? <Check className="w-3 h-3" /> : <Pin className="w-3 h-3" />}
                      {pinned ? 'Pinned' : 'Pin'}
                    </button>
                    <button
                      type="button"
                      onClick={onOpenGuide}
                      className="inline-flex items-center gap-1 text-xs font-medium text-[var(--zl-ink)] hover:text-[var(--zl-accent)] cursor-pointer whitespace-nowrap"
                    >
                      <span>{item.hasFullGuide ? 'Read Guide' : 'Open Reference'}</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      </section>
    </main>
  );
}
