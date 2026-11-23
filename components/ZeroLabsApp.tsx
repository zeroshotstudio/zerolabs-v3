'use client';

import React, { useEffect, useMemo, useState } from 'react';
import {
  EVALUATED_PROJECTS,
  FLAGSHIP_GUIDE,
  FLAGSHIP_REVIEW,
  SIEVE_PRESETS,
} from '@/lib/zerolabs-data';
import { compileContextBundle } from '@/lib/zerolabs-engine';
import {
  CompilerProfile,
  ConstraintSieveState,
  PinnedItem,
  ProjectionMode,
  ReRunRequestEntry,
  ThemeMode,
  TokenBudget,
  ViewId,
} from '@/lib/zerolabs-types';
import { TopBar } from './TopBar';
import { WorkspaceBar } from './WorkspaceBar';
import { IndexSurface } from './IndexSurface';
import { ReviewSurface } from './ReviewSurface';
import { GuideSurface } from './GuideSurface';
import {
  ContextCompilerDock,
  ContextCompilerDrawer,
} from './ContextCompilerDrawer';

export function ZeroLabsApp() {
  const [activeView, setActiveView] = useState<ViewId>('index');
  const [projectionMode, setProjectionMode] = useState<ProjectionMode>('human');
  const [theme, setTheme] = useState<ThemeMode>('light');
  const [mcpModalOpen, setMcpModalOpen] = useState(false);

  // Shared Constraint Sieve state across Index and Project Review
  const [sieve, setSieve] = useState<ConstraintSieveState>(SIEVE_PRESETS.neutral.state);

  // Shared Cross-Page Context Compiler state
  const [pinnedItems, setPinnedItems] = useState<PinnedItem[]>([]);
  const [compilerOpen, setCompilerOpen] = useState(false);
  const [compilerProfile, setCompilerProfile] = useState<CompilerProfile>('guardrails');
  const [tokenBudget, setTokenBudget] = useState<TokenBudget>(2000);
  const [includeNegativeConstraints, setIncludeNegativeConstraints] = useState(true);

  // Version-Drift Re-Run Request Queue state for flagship review
  const flagshipSummary = EVALUATED_PROJECTS[0];
  const [rerunQueueCount, setRerunQueueCount] = useState<number>(
    flagshipSummary.rerunQueueCount
  );
  const [submittedRerun, setSubmittedRerun] = useState<ReRunRequestEntry | null>(null);

  // Sync Archival Light / Dark Bench class on <html>
  useEffect(() => {
    const root = document.documentElement;
    if (theme === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
  }, [theme]);

  const compiled = useMemo(
    () =>
      compileContextBundle(
        pinnedItems,
        compilerProfile,
        tokenBudget,
        includeNegativeConstraints
      ),
    [pinnedItems, compilerProfile, tokenBudget, includeNegativeConstraints]
  );

  const isPinned = (id: string) => pinnedItems.some((item) => item.id === id);

  const handleTogglePin = (item: PinnedItem) => {
    setPinnedItems((prev) => {
      if (prev.some((p) => p.id === item.id)) {
        return prev.filter((p) => p.id !== item.id);
      }
      return [...prev, item];
    });
  };

  const handleRemovePin = (id: string) => {
    setPinnedItems((prev) => prev.filter((p) => p.id !== id));
  };

  const handleNavigate = (view: ViewId, anchorId?: string) => {
    setActiveView(view);
    if (view === 'index') {
      setProjectionMode('human');
    }
    if (typeof window !== 'undefined') {
      if (anchorId) {
        setTimeout(() => {
          document.getElementById(anchorId)?.scrollIntoView({ behavior: 'smooth' });
        }, 60);
      } else {
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }
    }
  };

  const handleSubmitRerun = (req: ReRunRequestEntry) => {
    if (!submittedRerun) {
      setRerunQueueCount((c) => c + 1);
    }
    setSubmittedRerun(req);
  };

  const altitudeLinks =
    activeView === 'review'
      ? [
          { id: 'altitude-1', label: '1. Verdict & Proof' },
          { id: 'altitude-2', label: '2. Rubric & Schematic' },
          { id: 'altitude-3', label: '3. Run Dossier' },
        ]
      : activeView === 'guide'
        ? [
            { id: 'guide-summary', label: 'Summary' },
            { id: 'guide-invariants', label: 'Invariants' },
            { id: 'guide-schematic', label: 'Schematic' },
          ]
        : undefined;

  const entryTitle =
    activeView === 'review'
      ? FLAGSHIP_REVIEW.slug
      : activeView === 'guide'
        ? FLAGSHIP_GUIDE.slug
        : undefined;

  return (
    <div className="min-h-screen flex flex-col bg-[var(--zl-ground)] text-[var(--zl-ink)] transition-colors duration-150">
      <TopBar
        activeView={activeView}
        onNavigate={handleNavigate}
        mcpModalOpen={mcpModalOpen}
        onToggleMcpModal={setMcpModalOpen}
      />

      <WorkspaceBar
        activeView={activeView}
        entryTitle={entryTitle}
        projectionMode={projectionMode}
        onChangeProjection={setProjectionMode}
        theme={theme}
        onToggleTheme={setTheme}
        onNavigateIndex={() => handleNavigate('index')}
        altitudeLinks={altitudeLinks}
      />

      <div className="flex-1">
        {activeView === 'index' && (
          <IndexSurface
            sieve={sieve}
            onChangeSieve={setSieve}
            onOpenReview={() => handleNavigate('review')}
            onOpenGuide={() => handleNavigate('guide')}
            isPinned={isPinned}
            onTogglePin={handleTogglePin}
          />
        )}

        {activeView === 'review' && (
          <ReviewSurface
            projectionMode={projectionMode}
            sieve={sieve}
            onChangeSieve={setSieve}
            pinnedItems={pinnedItems}
            compiled={compiled}
            isPinned={isPinned}
            onTogglePin={handleTogglePin}
            onOpenCompiler={() => setCompilerOpen(true)}
            rerunQueueCount={rerunQueueCount}
            submittedRerun={submittedRerun}
            onSubmitRerun={handleSubmitRerun}
          />
        )}

        {activeView === 'guide' && (
          <GuideSurface
            projectionMode={projectionMode}
            pinnedItems={pinnedItems}
            compiled={compiled}
            isPinned={isPinned}
            onTogglePin={handleTogglePin}
            onOpenCompiler={() => setCompilerOpen(true)}
          />
        )}
      </div>

      {/* Floating Compact Compiler Dock on Index/Agent (all screens) and Review/Guide (mobile only, obeys <=15% sticky cap) */}
      {activeView === 'index' || projectionMode === 'agent' ? (
        <ContextCompilerDock
          pinnedCount={pinnedItems.length}
          compiled={compiled}
          onOpen={() => setCompilerOpen(true)}
          variant="floating"
        />
      ) : (
        <div className="lg:hidden">
          <ContextCompilerDock
            pinnedCount={pinnedItems.length}
            compiled={compiled}
            onOpen={() => setCompilerOpen(true)}
            variant="floating"
          />
        </div>
      )}

      {/* Full Context Compiler Drawer */}
      <ContextCompilerDrawer
        open={compilerOpen}
        onClose={() => setCompilerOpen(false)}
        pinnedItems={pinnedItems}
        onRemoveItem={handleRemovePin}
        onClearAll={() => setPinnedItems([])}
        profile={compilerProfile}
        onChangeProfile={setCompilerProfile}
        budget={tokenBudget}
        onChangeBudget={setTokenBudget}
        includeNegativeConstraints={includeNegativeConstraints}
        onToggleNegativeConstraints={setIncludeNegativeConstraints}
        compiled={compiled}
      />

      {/* Clean Editorial Footer */}
      <footer className="mt-12 border-t border-[var(--zl-border)] bg-[var(--zl-surface)]">
        <div className="mx-auto max-w-[1320px] px-4 sm:px-6 py-5 flex flex-wrap items-center justify-between gap-4 text-xs text-[var(--zl-ink-muted)]">
          <div className="flex items-center gap-2.5 flex-wrap">
            <span className="font-display font-bold text-[var(--zl-ink)]">ZeroLabs</span>
            <span aria-hidden="true">·</span>
            <span>labs.zeroshot.studio</span>
            <span aria-hidden="true">·</span>
            <span>Archival Field Instrument Prototype</span>
          </div>
          <div className="flex items-center gap-4 font-mono text-[11px]">
            <button
              type="button"
              onClick={() => handleNavigate('index')}
              className="hover:text-[var(--zl-ink)] cursor-pointer"
            >
              Index
            </button>
            <button
              type="button"
              onClick={() => handleNavigate('review')}
              className="hover:text-[var(--zl-ink)] cursor-pointer"
            >
              mcp-server-postgres
            </button>
            <button
              type="button"
              onClick={() => handleNavigate('guide')}
              className="hover:text-[var(--zl-ink)] cursor-pointer"
            >
              MCP Auth Guide
            </button>
            <button
              type="button"
              onClick={() => setMcpModalOpen(true)}
              className="hover:text-[var(--zl-ink)] cursor-pointer"
            >
              .well-known/mcp.json
            </button>
          </div>
        </div>
      </footer>
    </div>
  );
}
