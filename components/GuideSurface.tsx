'use client';

import React, { useMemo, useState } from 'react';
import { Check, Copy, Pin } from 'lucide-react';
import { FLAGSHIP_GUIDE } from '@/lib/zerolabs-data';
import { buildGuideProjection } from '@/lib/zerolabs-engine';
import {
  CompiledContextResult,
  PinnedItem,
  ProjectionMode,
  SchematicNode,
} from '@/lib/zerolabs-types';
import { InspectableSchematic } from './InspectableSchematic';
import { ContextCompilerDock } from './ContextCompilerDrawer';

interface GuideSurfaceProps {
  projectionMode: ProjectionMode;
  pinnedItems: PinnedItem[];
  compiled: CompiledContextResult;
  isPinned: (id: string) => boolean;
  onTogglePin: (item: PinnedItem) => void;
  onOpenCompiler: () => void;
}

export function GuideSurface({
  projectionMode,
  pinnedItems,
  compiled,
  isPinned,
  onTogglePin,
  onOpenCompiler,
}: GuideSurfaceProps) {
  const guide = FLAGSHIP_GUIDE;
  const [selectedNodeId, setSelectedNodeId] = useState<string>(guide.schematicNodes[1].id);
  const [activeAnchor, setActiveAnchor] = useState<string>('#guide-summary');
  const [agentFormat, setAgentFormat] = useState<'markdown' | 'json'>('markdown');
  const [copiedPayload, setCopiedPayload] = useState(false);

  const projection = useMemo(() => buildGuideProjection(), []);
  const selectedNode =
    guide.schematicNodes.find((n) => n.id === selectedNodeId) ?? guide.schematicNodes[0];

  const handleCopy = (text: string) => {
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(text).catch(() => {});
    }
    setCopiedPayload(true);
    setTimeout(() => setCopiedPayload(false), 1800);
  };

  const handlePinNode = (node: SchematicNode) => {
    onTogglePin({
      id: `guide-node-${node.id}`,
      sourceSlug: guide.slug,
      sourceTitle: guide.title,
      sourceUrl: guide.canonicalUrl,
      anchor: node.anchor,
      kind: 'schema',
      title: `Schematic Node: ${node.label}`,
      content: `${node.role}\nScope: ${node.permissionScope}\nContract:\n${node.contractJson}`,
      negativeConstraint: node.failureMode,
      tokenCost: node.tokenCost,
      priority: 1,
    });
  };

  // Full Agent Payload Mode
  if (projectionMode === 'agent') {
    const raw = agentFormat === 'markdown' ? projection.markdown : projection.json;
    return (
      <main className="mx-auto max-w-[1320px] px-4 sm:px-6 py-7 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3 border border-[var(--zl-specimen-border)] bg-[var(--zl-specimen-surface)] text-[var(--zl-specimen-ink)] px-4 py-3 rounded-[3px]">
          <div className="space-y-0.5">
            <div className="font-mono text-xs text-white">
              {guide.canonicalUrl}.{agentFormat === 'markdown' ? 'md' : 'json'}
            </div>
            <div className="font-mono text-[11px] text-[var(--zl-specimen-muted)] tabular-nums">
              Standard Technical Guide · {projection.tokenCount.toLocaleString()} tokens · Zero review-only rubric fields
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div
              role="group"
              aria-label="Machine format"
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
              onClick={() => handleCopy(raw)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-[var(--zl-accent)] text-white hover:bg-[var(--zl-accent-hover)] rounded-[2px] cursor-pointer"
            >
              {copiedPayload ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
              {copiedPayload ? 'Copied' : 'Copy Payload'}
            </button>
          </div>
        </div>

        <pre className="border border-[var(--zl-specimen-border)] bg-[var(--zl-specimen-bg)] text-[var(--zl-specimen-ink)] p-5 font-mono text-xs leading-relaxed overflow-x-auto specimen-scroll rounded-[3px] whitespace-pre-wrap">
          {raw}
        </pre>
      </main>
    );
  }

  const isSplit = projectionMode === 'split';

  return (
    <main className="mx-auto max-w-[1320px] px-4 sm:px-6 py-7">
      <div
        className={`grid grid-cols-1 gap-8 items-start ${
          isSplit
            ? 'lg:grid-cols-[minmax(0,760px)_minmax(0,520px)]'
            : 'lg:grid-cols-[minmax(0,1fr)_340px]'
        }`}
      >
        {/* Primary Technical Guide Canvas */}
        <article className="space-y-8 min-w-0">
          {/* Header — Clean Graceful Degradation (No Rubric / No Version-Drift Widget) */}
          <header
            id="guide-summary"
            onMouseEnter={() => setActiveAnchor('#guide-summary')}
            className="pb-6 border-b border-[var(--zl-border)] space-y-3"
          >
            <div className="flex flex-wrap items-center gap-2 font-mono text-xs text-[var(--zl-ink-muted)]">
              <span className="text-[var(--zl-ink)] font-medium">{guide.category}</span>
              <span aria-hidden="true">·</span>
              <span>{guide.verifiedDate}</span>
              <span aria-hidden="true">·</span>
              <span>{guide.readingTime}</span>
              <span aria-hidden="true">·</span>
              <span className="tabular-nums">{guide.agentTokenCount.toLocaleString()} tok agent payload</span>
            </div>

            <h1 className="text-2xl sm:text-[34px] font-bold tracking-[-0.03em] leading-[1.12] text-[var(--zl-ink)]">
              {guide.title}
            </h1>

            <p className="text-xs font-mono text-[var(--zl-ink-secondary)]">
              {guide.specCompatibility}
            </p>

            <div className="pt-2">
              <p className="text-[15.5px] leading-[1.68] text-[var(--zl-ink)] max-w-[66ch]">
                {guide.executiveSummary}
              </p>
            </div>
          </header>

          {/* Architectural Invariants (Pinnable into Context Compiler) */}
          <section id="guide-invariants" aria-labelledby="invariants-heading" className="space-y-3">
            <div className="flex items-baseline justify-between gap-2">
              <h2
                id="invariants-heading"
                className="text-base font-bold text-[var(--zl-ink)]"
              >
                Core Invariants &amp; Negative Constraints
              </h2>
              <span className="text-xs text-[var(--zl-ink-muted)]">
                Pin individual rules into your agent handoff bundle
              </span>
            </div>

            <div className="divide-y divide-[var(--zl-border)] border border-[var(--zl-border)] bg-[var(--zl-surface)] rounded-[3px]">
              {guide.invariants.map((inv) => {
                const pinObj: PinnedItem = {
                  id: inv.id,
                  sourceSlug: guide.slug,
                  sourceTitle: guide.title,
                  sourceUrl: guide.canonicalUrl,
                  anchor: inv.anchor,
                  kind: 'guide-rule',
                  title: inv.title,
                  content: inv.body,
                  negativeConstraint: inv.negativeConstraint,
                  tokenCost: inv.tokenCost,
                  priority: 1,
                };
                const pinned = isPinned(inv.id);
                return (
                  <div
                    key={inv.id}
                    id={inv.anchor.slice(1)}
                    onMouseEnter={() => setActiveAnchor(inv.anchor)}
                    className="p-4 space-y-2 hover:bg-[var(--zl-ground)] transition-colors"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <h3 className="text-sm font-bold text-[var(--zl-ink)]">{inv.title}</h3>
                        <span className="font-mono text-[11px] text-[var(--zl-ink-muted)]">
                          {inv.anchor} · {inv.tokenCost} tok
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => onTogglePin(pinObj)}
                        className={`inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium rounded-[2px] border cursor-pointer shrink-0 transition-colors ${
                          pinned
                            ? 'border-[var(--zl-accent)] bg-[var(--zl-accent-soft)] text-[var(--zl-accent)]'
                            : 'border-[var(--zl-border-strong)] bg-[var(--zl-surface)] text-[var(--zl-ink-secondary)] hover:text-[var(--zl-ink)]'
                        }`}
                      >
                        {pinned ? <Check className="w-3 h-3" /> : <Pin className="w-3 h-3" />}
                        {pinned ? 'Pinned' : 'Pin Rule'}
                      </button>
                    </div>
                    <p className="text-sm text-[var(--zl-ink-secondary)] leading-relaxed max-w-[66ch]">
                      {inv.body}
                    </p>
                    <p className="text-xs font-mono text-[var(--zl-fail)]">
                      Do not assume: {inv.negativeConstraint}
                    </p>
                  </div>
                );
              })}
            </div>
          </section>

          {/* Editorial Section 1 & 2 */}
          <section id="guide-analysis" className="space-y-6">
            {guide.sections.slice(0, 2).map((sec) => (
              <div key={sec.id} id={sec.id} className="space-y-3 max-w-[66ch]">
                <h2 className="text-lg font-bold tracking-[-0.02em] text-[var(--zl-ink)]">
                  {sec.title}
                </h2>
                {sec.paragraphs.map((p, idx) => (
                  <p
                    key={idx}
                    className="text-[15.5px] leading-[1.68] text-[var(--zl-ink-secondary)]"
                  >
                    {p}
                  </p>
                ))}
              </div>
            ))}
          </section>

          {/* Inspectable Schematic (Shared Primitive across Reviews & Guides) */}
          <InspectableSchematic
            id="guide-schematic"
            title="OAuth 2.1 Capability Broker Topology"
            subtitle="Inspect each node to view RFC 8707 audience contracts and pin individual specifications."
            nodes={guide.schematicNodes}
            edges={guide.schematicEdges}
            selectedNodeId={selectedNodeId}
            onSelectNode={(node) => {
              setSelectedNodeId(node.id);
              setActiveAnchor(node.anchor);
            }}
            isNodePinned={(nid) => isPinned(`guide-node-${nid}`)}
            onPinNode={handlePinNode}
          />

          {/* Section 3 + Reference JSON Manifest */}
          <section className="space-y-4">
            <div id={guide.sections[2].id} className="space-y-3 max-w-[66ch]">
              <h2 className="text-lg font-bold tracking-[-0.02em] text-[var(--zl-ink)]">
                {guide.sections[2].title}
              </h2>
              {guide.sections[2].paragraphs.map((p, idx) => (
                <p
                  key={idx}
                  className="text-[15.5px] leading-[1.68] text-[var(--zl-ink-secondary)]"
                >
                  {p}
                </p>
              ))}
            </div>

            <div className="border border-[var(--zl-specimen-border)] bg-[var(--zl-specimen-bg)] text-[var(--zl-specimen-ink)] rounded-[3px] overflow-hidden">
              <div className="flex items-center justify-between px-4 py-2 border-b border-[var(--zl-specimen-border)] bg-[var(--zl-specimen-surface)]">
                <span className="font-mono text-[11px] text-[var(--zl-specimen-muted)]">
                  Reference Capability Profile (JSON)
                </span>
                <button
                  type="button"
                  onClick={() =>
                    onTogglePin({
                      id: 'guide-ref-profile',
                      sourceSlug: guide.slug,
                      sourceTitle: guide.title,
                      sourceUrl: guide.canonicalUrl,
                      anchor: '#ref-profile',
                      kind: 'schema',
                      title: 'MCP 2025-03 OAuth 2.1 Reference Profile',
                      content: guide.referenceSnippet,
                      tokenCost: 110,
                      priority: 1,
                    })
                  }
                  className="inline-flex items-center gap-1 font-mono text-[11px] text-[#ef5b3c] hover:underline cursor-pointer"
                >
                  <Pin className="w-3 h-3" />
                  {isPinned('guide-ref-profile') ? 'Pinned' : 'Pin JSON'}
                </button>
              </div>
              <pre className="p-4 font-mono text-xs leading-relaxed overflow-x-auto specimen-scroll">
                {guide.referenceSnippet}
              </pre>
            </div>
          </section>
        </article>

        {/* Right Side: Either Expanded ~520px Deep Graphite Split Inspect Pane OR Streamlined Guide Rail */}
        {isSplit ? (
          <aside
            aria-label="Synchronized machine projection"
            className="lg:sticky lg:top-5 border border-[var(--zl-specimen-border)] bg-[var(--zl-specimen-bg)] text-[var(--zl-specimen-ink)] rounded-[3px] flex flex-col lg:max-h-[calc(100vh-3rem)] overflow-hidden"
          >
            <div className="px-4 py-3 border-b border-[var(--zl-specimen-border)] bg-[var(--zl-specimen-surface)] flex items-center justify-between gap-2 shrink-0">
              <div>
                <div className="font-mono text-xs font-medium text-white">
                  Split Inspect · Machine Projection
                </div>
                <div className="font-mono text-[11px] text-[var(--zl-specimen-muted)]">
                  Active anchor: <span className="text-[#ef5b3c]">{activeAnchor}</span>
                </div>
              </div>
              <span className="font-mono text-[11px] text-[var(--zl-specimen-muted)] tabular-nums">
                {projection.tokenCount.toLocaleString()} tok
              </span>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-3 specimen-scroll">
              {projection.sections.map((sec) => {
                const highlighted = sec.anchor === activeAnchor;
                return (
                  <div
                    key={sec.anchor}
                    className={`border rounded-[2px] transition-colors ${
                      highlighted
                        ? 'border-[#ef5b3c] bg-[#1a1617]'
                        : 'border-[var(--zl-specimen-border)] bg-[#0f1217]'
                    }`}
                  >
                    <div className="px-3 py-1.5 border-b border-[var(--zl-specimen-border)] flex items-center justify-between font-mono text-[11px]">
                      <span className={highlighted ? 'text-[#ef5b3c] font-medium' : 'text-[#b5c0cf]'}>
                        {sec.label}
                      </span>
                      <span className="text-[var(--zl-specimen-muted)]">{sec.anchor}</span>
                    </div>
                    <pre className="p-3 font-mono text-[11px] leading-relaxed overflow-x-auto text-[#dce4f0] whitespace-pre-wrap break-words">
                      {sec.jsonSlice}
                    </pre>
                  </div>
                );
              })}
            </div>

            <div className="border-t border-[var(--zl-specimen-border)] bg-[var(--zl-specimen-surface)] px-4 py-2.5 flex items-center justify-between shrink-0">
              <span className="font-mono text-[11px] text-[var(--zl-specimen-muted)] tabular-nums">
                Compiler: {pinnedItems.length} pinned · {compiled.totalTokens} tok
              </span>
              <button
                type="button"
                onClick={onOpenCompiler}
                className="px-3 py-1 text-xs font-medium bg-[var(--zl-accent)] text-white hover:bg-[var(--zl-accent-hover)] rounded-[2px] cursor-pointer"
              >
                Open Compiler
              </button>
            </div>
          </aside>
        ) : (
          /* Clean Guide Rail (No Review-only Version-Drift or Constraint Sieve chrome) */
          <aside
            aria-label="Guide outline and node inspector"
            className="lg:sticky lg:top-5 border border-[var(--zl-border)] bg-[var(--zl-surface)] rounded-[3px] flex flex-col lg:max-h-[calc(100vh-3rem)] overflow-hidden"
          >
            {/* Compact Spec Compatibility Strip */}
            <div className="px-4 py-3 border-b border-[var(--zl-border)] bg-[var(--zl-ground)] shrink-0">
              <div className="text-[11px] font-mono text-[var(--zl-ink-muted)]">
                TECHNICAL GUIDE · NO RUBRIC
              </div>
              <div className="text-xs font-medium text-[var(--zl-ink)] mt-0.5">
                MCP Spec 2025-03 · OAuth 2.1
              </div>
            </div>

            {/* Middle Slot: Schematic Node Contract Inspector */}
            <div className="p-4 flex-1 overflow-y-auto space-y-3">
              <div>
                <div className="text-[11px] font-mono text-[var(--zl-ink-muted)]">
                  SCHEMATIC NODE INSPECTOR
                </div>
                <div className="text-sm font-bold text-[var(--zl-ink)] mt-0.5">
                  {selectedNode.label}
                </div>
                <p className="text-xs text-[var(--zl-ink-secondary)] mt-1 leading-relaxed">
                  {selectedNode.role}
                </p>
              </div>

              <div className="text-[11px] space-y-1 font-mono border-y border-[var(--zl-border)] py-2.5">
                <div>
                  <span className="text-[var(--zl-ink-muted)]">Scope: </span>
                  <span className="text-[var(--zl-ink)]">{selectedNode.permissionScope}</span>
                </div>
                <div>
                  <span className="text-[var(--zl-ink-muted)]">Failure: </span>
                  <span className="text-[var(--zl-warn)]">{selectedNode.failureMode}</span>
                </div>
              </div>

              <pre className="bg-[var(--zl-specimen-bg)] text-[var(--zl-specimen-ink)] border border-[var(--zl-specimen-border)] p-3 font-mono text-[11px] leading-relaxed overflow-x-auto specimen-scroll rounded-[2px]">
                {selectedNode.contractJson}
              </pre>
            </div>

            {/* Bottom Dock: Shared Cross-Page Context Compiler */}
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
