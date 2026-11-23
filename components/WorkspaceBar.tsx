'use client';

import React from 'react';
import { Moon, Sun } from 'lucide-react';
import { ProjectionMode, ThemeMode, ViewId } from '@/lib/zerolabs-types';

interface WorkspaceBarProps {
  activeView: ViewId;
  entryTitle?: string;
  projectionMode: ProjectionMode;
  onChangeProjection: (mode: ProjectionMode) => void;
  theme: ThemeMode;
  onToggleTheme: (mode: ThemeMode) => void;
  onNavigateIndex: () => void;
  altitudeLinks?: { id: string; label: string }[];
}

export function WorkspaceBar({
  activeView,
  entryTitle,
  projectionMode,
  onChangeProjection,
  theme,
  onToggleTheme,
  onNavigateIndex,
  altitudeLinks,
}: WorkspaceBarProps) {
  const showProjection = activeView === 'review' || activeView === 'guide';

  return (
    <div className="w-full border-b border-[var(--zl-border)] bg-[var(--zl-ground)]">
      <div className="mx-auto flex flex-wrap items-center justify-between gap-3 max-w-[1320px] px-4 sm:px-6 py-2">
        {/* Left: Breadcrumb + Altitude Jumps */}
        <div className="flex items-center gap-3 min-w-0 flex-wrap">
          {activeView === 'index' ? (
            <div className="flex items-center gap-2 text-xs text-[var(--zl-ink-secondary)]">
              <span className="font-mono text-[var(--zl-ink)] font-medium">labs.zeroshot.studio</span>
              <span aria-hidden="true">/</span>
              <span>Evaluation Ledger &amp; Technical Library</span>
            </div>
          ) : (
            <div className="flex items-center gap-2 text-xs text-[var(--zl-ink-muted)] min-w-0">
              <button
                type="button"
                onClick={onNavigateIndex}
                className="hover:text-[var(--zl-ink)] transition-colors cursor-pointer whitespace-nowrap shrink-0"
              >
                Index
              </button>
              <span aria-hidden="true">/</span>
              <span className="whitespace-nowrap shrink-0">
                {activeView === 'review' ? 'Reviews' : 'Guides'}
              </span>
              <span aria-hidden="true">/</span>
              <span className="font-mono text-[var(--zl-ink)] font-medium truncate max-w-[180px] sm:max-w-[260px]">
                {entryTitle}
              </span>
            </div>
          )}

          {altitudeLinks && altitudeLinks.length > 0 && projectionMode !== 'agent' && (
            <div className="hidden xl:flex items-center gap-1 pl-3 ml-1 border-l border-[var(--zl-border)]">
              {altitudeLinks.map((link) => (
                <a
                  key={link.id}
                  href={`#${link.id}`}
                  className="px-2 py-0.5 text-xs text-[var(--zl-ink-secondary)] hover:text-[var(--zl-ink)] hover:bg-[var(--zl-recessed)] rounded-[2px] transition-colors whitespace-nowrap shrink-0"
                >
                  {link.label}
                </a>
              ))}
            </div>
          )}
        </div>

        {/* Right: Projection Lens + Archival Light / Dark Bench Switch */}
        <div className="flex items-center gap-3 flex-wrap">
          {showProjection && (
            <div
              role="group"
              aria-label="Projection Lens"
              className="inline-flex items-center bg-[var(--zl-recessed)] p-0.5 border border-[var(--zl-border)] rounded-[3px]"
            >
              {(
                [
                  { id: 'human', label: 'Human' },
                  { id: 'split', label: 'Split Inspect' },
                  { id: 'agent', label: 'Agent Payload' },
                ] as const
              ).map((opt) => {
                const active = projectionMode === opt.id;
                return (
                  <button
                    key={opt.id}
                    type="button"
                    aria-pressed={active}
                    onClick={() => onChangeProjection(opt.id)}
                    className={`px-2.5 py-1 text-xs font-medium rounded-[2px] transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                      opt.id === 'split' ? 'hidden md:inline-flex' : 'inline-flex'
                    } ${
                      active
                        ? 'bg-[var(--zl-surface)] text-[var(--zl-ink)] shadow-[0_1px_2px_rgba(0,0,0,0.06)]'
                        : 'text-[var(--zl-ink-secondary)] hover:text-[var(--zl-ink)]'
                    }`}
                  >
                    {opt.label}
                  </button>
                );
              })}
            </div>
          )}

          {/* Live Archival Light / Dark Bench Toggle */}
          <div
            role="group"
            aria-label="Surface theme"
            className="inline-flex items-center bg-[var(--zl-recessed)] p-0.5 border border-[var(--zl-border)] rounded-[3px]"
          >
            <button
              type="button"
              aria-pressed={theme === 'light'}
              onClick={() => onToggleTheme('light')}
              className={`inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-[2px] transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                theme === 'light'
                  ? 'bg-[var(--zl-surface)] text-[var(--zl-ink)] shadow-[0_1px_2px_rgba(0,0,0,0.06)]'
                  : 'text-[var(--zl-ink-secondary)] hover:text-[var(--zl-ink)]'
              }`}
            >
              <Sun className="w-3 h-3" />
              <span>Archival Light</span>
            </button>
            <button
              type="button"
              aria-pressed={theme === 'dark'}
              onClick={() => onToggleTheme('dark')}
              className={`inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-[2px] transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                theme === 'dark'
                  ? 'bg-[var(--zl-surface)] text-[var(--zl-ink)] shadow-[0_1px_2px_rgba(0,0,0,0.06)]'
                  : 'text-[var(--zl-ink-secondary)] hover:text-[var(--zl-ink)]'
              }`}
            >
              <Moon className="w-3 h-3" />
              <span>Dark Bench</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
