'use client';

import React, { useState } from 'react';
import { Check, Copy, Layers, Trash2, X, AlertTriangle, ChevronUp } from 'lucide-react';
import {
  CompiledContextResult,
  CompilerProfile,
  PinnedItem,
  TokenBudget,
} from '@/lib/zerolabs-types';

interface ContextCompilerDockProps {
  pinnedCount: number;
  compiled: CompiledContextResult;
  onOpen: () => void;
  variant?: 'rail' | 'floating';
}

export function ContextCompilerDock({
  pinnedCount,
  compiled,
  onOpen,
  variant = 'rail',
}: ContextCompilerDockProps) {
  const pct = Math.min(100, Math.round((compiled.totalTokens / compiled.budget) * 100));
  const hasPruned = compiled.prunedItems.length > 0;

  if (variant === 'floating') {
    if (pinnedCount === 0) return null;
    return (
      <div className="fixed bottom-4 right-4 left-4 sm:left-auto z-40 sm:w-[390px] border border-[var(--zl-border-strong)] bg-[var(--zl-surface)] shadow-lg rounded-[3px] px-3.5 py-2.5 flex items-center justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2 text-xs font-semibold text-[var(--zl-ink)]">
            <Layers className="w-3.5 h-3.5 text-[var(--zl-accent)] shrink-0" />
            <span className="truncate">Context Compiler</span>
            <span className="font-mono text-[11px] font-medium text-[var(--zl-accent)] tabular-nums">
              {pinnedCount} pinned
            </span>
          </div>
          <div className="text-[11px] font-mono text-[var(--zl-ink-muted)] tabular-nums mt-0.5">
            {compiled.totalTokens.toLocaleString()} / {compiled.budget.toLocaleString()} tok
            {hasPruned && (
              <span className="text-[var(--zl-warn)]">
                {' '}
                · {compiled.prunedItems.length} pruned
              </span>
            )}
          </div>
        </div>
        <button
          type="button"
          onClick={onOpen}
          className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium bg-[var(--zl-accent)] text-white hover:bg-[var(--zl-accent-hover)] rounded-[3px] whitespace-nowrap shrink-0 cursor-pointer transition-colors"
        >
          <span>Open</span>
          <ChevronUp className="w-3.5 h-3.5" />
        </button>
      </div>
    );
  }

  // Rail docked variant (always compact, never overflows rail)
  return (
    <div className="border-t border-[var(--zl-border)] bg-[var(--zl-surface)] p-3.5 shrink-0">
      <div className="flex items-center justify-between gap-2 mb-2">
        <div className="flex items-center gap-1.5 text-xs font-bold text-[var(--zl-ink)]">
          <Layers className="w-3.5 h-3.5 text-[var(--zl-accent)]" />
          <span>Context Compiler</span>
        </div>
        <span className="font-mono text-[11px] text-[var(--zl-ink-secondary)] tabular-nums">
          {pinnedCount} pinned
        </span>
      </div>

      {/* Token Budget Bar */}
      <div className="space-y-1 mb-2.5">
        <div className="flex items-center justify-between font-mono text-[11px] tabular-nums">
          <span className="text-[var(--zl-ink-muted)]">
            {compiled.totalTokens.toLocaleString()} / {compiled.budget.toLocaleString()} tok
          </span>
          {hasPruned ? (
            <span className="text-[var(--zl-warn)]">
              {compiled.prunedItems.length} trimmed
            </span>
          ) : (
            <span className="text-[var(--zl-ink-muted)]">{pct}% budget</span>
          )}
        </div>
        <div className="h-1.5 w-full bg-[var(--zl-recessed)] rounded-[1px] overflow-hidden">
          <div
            className={`h-full transition-all duration-200 ${
              hasPruned ? 'bg-[var(--zl-warn)]' : 'bg-[var(--zl-accent)]'
            }`}
            style={{ width: `${pct}%` }}
          />
        </div>
      </div>

      <button
        type="button"
        onClick={onOpen}
        className={`w-full px-3 py-1.5 text-xs font-medium rounded-[3px] transition-colors cursor-pointer whitespace-nowrap ${
          pinnedCount > 0
            ? 'bg-[var(--zl-accent)] text-white hover:bg-[var(--zl-accent-hover)]'
            : 'border border-[var(--zl-border-strong)] bg-[var(--zl-ground)] text-[var(--zl-ink-secondary)] hover:text-[var(--zl-ink)]'
        }`}
      >
        {pinnedCount > 0
          ? `Compile & Copy Bundle (${pinnedCount})`
          : 'Pin items to compile agent bundle'}
      </button>
    </div>
  );
}

interface ContextCompilerDrawerProps {
  open: boolean;
  onClose: () => void;
  pinnedItems: PinnedItem[];
  onRemoveItem: (id: string) => void;
  onClearAll: () => void;
  profile: CompilerProfile;
  onChangeProfile: (p: CompilerProfile) => void;
  budget: TokenBudget;
  onChangeBudget: (b: TokenBudget) => void;
  includeNegativeConstraints: boolean;
  onToggleNegativeConstraints: (val: boolean) => void;
  compiled: CompiledContextResult;
}

export function ContextCompilerDrawer({
  open,
  onClose,
  pinnedItems,
  onRemoveItem,
  onClearAll,
  profile,
  onChangeProfile,
  budget,
  onChangeBudget,
  includeNegativeConstraints,
  onToggleNegativeConstraints,
  compiled,
}: ContextCompilerDrawerProps) {
  const [previewTab, setPreviewTab] = useState<'markdown' | 'json' | 'mcp'>('markdown');
  const [copiedMode, setCopiedMode] = useState<string | null>(null);

  if (!open) return null;

  const activeText =
    previewTab === 'markdown'
      ? compiled.markdownOutput
      : previewTab === 'json'
        ? compiled.jsonOutput
        : compiled.mcpResourceOutput;

  const handleCopy = (label: string, payload: string) => {
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(payload).catch(() => {});
    }
    setCopiedMode(label);
    setTimeout(() => setCopiedMode(null), 1800);
  };

  const pct = Math.min(100, Math.round((compiled.totalTokens / budget) * 100));
  const prunedIds = new Set(compiled.prunedItems.map((p) => p.id));

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="compiler-drawer-title"
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center sm:justify-end bg-black/45"
      onClick={onClose}
    >
      <div
        className="w-full sm:w-[560px] h-[90dvh] sm:h-full bg-[var(--zl-surface)] text-[var(--zl-ink)] border-t sm:border-t-0 sm:border-l border-[var(--zl-border-strong)] flex flex-col shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[var(--zl-border)] px-5 py-3.5 shrink-0">
          <div>
            <div className="flex items-center gap-2">
              <Layers className="w-4 h-4 text-[var(--zl-accent)]" />
              <h2 id="compiler-drawer-title" className="text-base font-bold tracking-tight">
                Context Compiler
              </h2>
              <span className="font-mono text-xs text-[var(--zl-ink-muted)] tabular-nums">
                {pinnedItems.length} pinned
              </span>
            </div>
            <p className="text-xs text-[var(--zl-ink-muted)] mt-0.5">
              Deterministic, token-budgeted handoff bundle with canonical source anchors.
            </p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {pinnedItems.length > 0 && (
              <button
                type="button"
                onClick={onClearAll}
                className="text-xs text-[var(--zl-ink-muted)] hover:text-[var(--zl-fail)] px-2 py-1 cursor-pointer whitespace-nowrap shrink-0"
              >
                Clear all
              </button>
            )}
            <button
              type="button"
              aria-label="Close Context Compiler"
              onClick={onClose}
              className="w-8 h-8 inline-flex items-center justify-center text-[var(--zl-ink-secondary)] hover:text-[var(--zl-ink)] hover:bg-[var(--zl-recessed)] rounded-[3px] cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Compiler Settings Strip */}
        <div className="border-b border-[var(--zl-border)] bg-[var(--zl-ground)] px-5 py-3.5 space-y-3 shrink-0">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* Profile Switcher */}
            <div>
              <div className="text-[11px] font-medium text-[var(--zl-ink-secondary)] mb-1.5">
                Target Consumer Profile
              </div>
              <div
                role="group"
                aria-label="Compiler profile"
                className="grid grid-cols-3 bg-[var(--zl-recessed)] p-0.5 border border-[var(--zl-border)] rounded-[3px]"
              >
                {(
                  [
                    { id: 'guardrails', label: 'Guardrails' },
                    { id: 'audit', label: 'Audit' },
                    { id: 'full-spec', label: 'Full Spec' },
                  ] as const
                ).map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    aria-pressed={profile === p.id}
                    onClick={() => onChangeProfile(p.id)}
                    className={`py-1 text-xs font-medium rounded-[2px] cursor-pointer transition-colors whitespace-nowrap ${
                      profile === p.id
                        ? 'bg-[var(--zl-surface)] text-[var(--zl-ink)] shadow-xs'
                        : 'text-[var(--zl-ink-secondary)] hover:text-[var(--zl-ink)]'
                    }`}
                  >
                    {p.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Token Budget Selector */}
            <div>
              <div className="text-[11px] font-medium text-[var(--zl-ink-secondary)] mb-1.5">
                Token Budget Ceiling
              </div>
              <div
                role="group"
                aria-label="Token budget"
                className="grid grid-cols-4 bg-[var(--zl-recessed)] p-0.5 border border-[var(--zl-border)] rounded-[3px]"
              >
                {([500, 1000, 2000, 4000] as const).map((b) => (
                  <button
                    key={b}
                    type="button"
                    aria-pressed={budget === b}
                    onClick={() => onChangeBudget(b)}
                    className={`py-1 font-mono text-xs tabular-nums rounded-[2px] cursor-pointer transition-colors whitespace-nowrap ${
                      budget === b
                        ? 'bg-[var(--zl-surface)] text-[var(--zl-ink)] font-semibold shadow-xs'
                        : 'text-[var(--zl-ink-secondary)] hover:text-[var(--zl-ink)]'
                    }`}
                  >
                    {b < 1000 ? `${b}` : `${b / 1000}k`}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Token Meter & Negative Constraints Toggle */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="font-mono tabular-nums text-[var(--zl-ink)]">
                {compiled.totalTokens.toLocaleString()} / {budget.toLocaleString()} tokens
                {compiled.rawTokens > budget && (
                  <span className="text-[var(--zl-warn)] ml-2">
                    ({compiled.rawTokens.toLocaleString()} raw · {compiled.prunedItems.length} trimmed)
                  </span>
                )}
              </span>
              <label className="inline-flex items-center gap-2 text-xs text-[var(--zl-ink-secondary)] cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={includeNegativeConstraints}
                  onChange={(e) => onToggleNegativeConstraints(e.target.checked)}
                  className="accent-[var(--zl-accent)] rounded-[2px] cursor-pointer"
                />
                <span>Include negative constraints</span>
              </label>
            </div>
            <div className="h-1.5 w-full bg-[var(--zl-recessed)] rounded-[1px] overflow-hidden">
              <div
                className={`h-full transition-all duration-200 ${
                  compiled.prunedItems.length > 0 ? 'bg-[var(--zl-warn)]' : 'bg-[var(--zl-accent)]'
                }`}
                style={{ width: `${pct}%` }}
              />
            </div>
          </div>
        </div>

        {/* Scrollable Body: Pinned Items + Live Compiled Output */}
        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-5">
          {pinnedItems.length === 0 ? (
            <div className="border border-dashed border-[var(--zl-border-strong)] p-6 text-center rounded-[3px]">
              <p className="text-sm font-medium text-[var(--zl-ink)]">
                No technical primitives pinned yet
              </p>
              <p className="text-xs text-[var(--zl-ink-muted)] mt-1 max-w-sm mx-auto leading-relaxed">
                Pin specific claims, negative constraints, rubric assertions, schematic nodes, or guide invariants from any ZeroLabs page to compile a tight agent handoff bundle.
              </p>
            </div>
          ) : (
            <>
              {/* Priority Pruning Banner */}
              {compiled.prunedItems.length > 0 && (
                <div className="border border-[var(--zl-warn-border)] bg-[var(--zl-warn-bg)] px-3.5 py-2.5 rounded-[3px] flex items-start gap-2.5 text-xs text-[var(--zl-warn)]">
                  <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-semibold">Priority pruning active:</span>{' '}
                    {compiled.prunedItems.length} lower-priority item(s) trimmed to stay under{' '}
                    <span className="font-mono tabular-nums">{budget.toLocaleString()}</span> tokens.
                    Negative constraints and schemas are preserved first.
                  </div>
                </div>
              )}

              {/* Pinned Items List */}
              <div>
                <div className="text-xs font-semibold text-[var(--zl-ink)] mb-2">
                  Pinned Primitives ({compiled.includedItems.length} active
                  {compiled.prunedItems.length > 0 ? ` · ${compiled.prunedItems.length} trimmed` : ''})
                </div>
                <div className="divide-y divide-[var(--zl-border)] border border-[var(--zl-border)] rounded-[3px]">
                  {pinnedItems.map((item) => {
                    const isPruned = prunedIds.has(item.id);
                    return (
                      <div
                        key={item.id}
                        className={`px-3 py-2.5 flex items-start justify-between gap-3 ${
                          isPruned ? 'bg-[var(--zl-ground)] opacity-70' : 'bg-[var(--zl-surface)]'
                        }`}
                      >
                        <div className="min-w-0">
                          <div className="flex items-center gap-2 text-[11px] font-mono text-[var(--zl-ink-muted)] flex-wrap">
                            <span className="text-[var(--zl-ink-secondary)] font-medium">
                              {item.kind}
                            </span>
                            <span aria-hidden="true">·</span>
                            <span className="truncate">{item.sourceTitle}</span>
                            <span aria-hidden="true">·</span>
                            <span className="tabular-nums">{item.tokenCost} tok</span>
                            {isPruned && (
                              <>
                                <span aria-hidden="true">·</span>
                                <span className="text-[var(--zl-warn)] font-medium">
                                  Trimmed to fit budget
                                </span>
                              </>
                            )}
                          </div>
                          <div
                            className={`text-xs font-medium mt-0.5 ${
                              isPruned
                                ? 'line-through text-[var(--zl-ink-muted)]'
                                : 'text-[var(--zl-ink)]'
                            }`}
                          >
                            {item.title}
                          </div>
                        </div>
                        <button
                          type="button"
                          aria-label={`Remove ${item.title} from compiler`}
                          onClick={() => onRemoveItem(item.id)}
                          className="p-1 text-[var(--zl-ink-muted)] hover:text-[var(--zl-fail)] cursor-pointer shrink-0"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Compiled Payload Preview */}
              <div>
                <div className="flex items-center justify-between gap-2 mb-2">
                  <div className="text-xs font-semibold text-[var(--zl-ink)]">
                    Compiled Output Preview
                  </div>
                  <div
                    role="group"
                    aria-label="Output preview format"
                    className="inline-flex bg-[var(--zl-recessed)] p-0.5 border border-[var(--zl-border)] rounded-[3px]"
                  >
                    {(
                      [
                        { id: 'markdown', label: 'Prompt MD' },
                        { id: 'json', label: 'JSON' },
                        { id: 'mcp', label: 'MCP URI' },
                      ] as const
                    ).map((t) => (
                      <button
                        key={t.id}
                        type="button"
                        aria-pressed={previewTab === t.id}
                        onClick={() => setPreviewTab(t.id)}
                        className={`px-2 py-0.5 text-[11px] font-medium rounded-[2px] cursor-pointer ${
                          previewTab === t.id
                            ? 'bg-[var(--zl-surface)] text-[var(--zl-ink)]'
                            : 'text-[var(--zl-ink-secondary)] hover:text-[var(--zl-ink)]'
                        }`}
                      >
                        {t.label}
                      </button>
                    ))}
                  </div>
                </div>

                <pre className="bg-[var(--zl-specimen-bg)] text-[var(--zl-specimen-ink)] border border-[var(--zl-specimen-border)] p-3.5 text-[11px] font-mono leading-relaxed max-h-[260px] overflow-auto specimen-scroll rounded-[3px] whitespace-pre-wrap break-words">
                  {activeText}
                </pre>
              </div>
            </>
          )}
        </div>

        {/* Sticky Footer Actions */}
        <div className="border-t border-[var(--zl-border)] bg-[var(--zl-ground)] px-5 py-3 flex flex-wrap items-center justify-between gap-2 shrink-0">
          <button
            type="button"
            disabled={pinnedItems.length === 0}
            onClick={() => handleCopy('bundle', compiled.markdownOutput)}
            className="flex-1 inline-flex items-center justify-center gap-1.5 px-4 py-2 text-xs font-medium bg-[var(--zl-accent)] text-white hover:bg-[var(--zl-accent-hover)] disabled:opacity-40 disabled:cursor-not-allowed rounded-[3px] cursor-pointer transition-colors whitespace-nowrap"
          >
            {copiedMode === 'bundle' ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
            {copiedMode === 'bundle' ? 'Copied Agent Bundle' : 'Copy Scoped Prompt Bundle'}
          </button>

          <button
            type="button"
            disabled={pinnedItems.length === 0}
            onClick={() => handleCopy('json', compiled.jsonOutput)}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium border border-[var(--zl-border-strong)] bg-[var(--zl-surface)] text-[var(--zl-ink)] hover:border-[var(--zl-ink)] disabled:opacity-40 disabled:cursor-not-allowed rounded-[3px] cursor-pointer whitespace-nowrap"
          >
            {copiedMode === 'json' ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
            {copiedMode === 'json' ? 'Copied' : 'JSON'}
          </button>

          <button
            type="button"
            disabled={pinnedItems.length === 0}
            onClick={() => handleCopy('mcp', compiled.mcpResourceOutput)}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium border border-[var(--zl-border-strong)] bg-[var(--zl-surface)] text-[var(--zl-ink)] hover:border-[var(--zl-ink)] disabled:opacity-40 disabled:cursor-not-allowed rounded-[3px] cursor-pointer whitespace-nowrap"
          >
            {copiedMode === 'mcp' ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
            {copiedMode === 'mcp' ? 'Copied' : 'MCP Call'}
          </button>
        </div>
      </div>
    </div>
  );
}
