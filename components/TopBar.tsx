'use client';

import React, { useState } from 'react';
import { Check, Copy, Menu, X } from 'lucide-react';
import { ViewId } from '@/lib/zerolabs-types';

interface TopBarProps {
  activeView: ViewId;
  onNavigate: (view: ViewId, anchorId?: string) => void;
  mcpModalOpen: boolean;
  onToggleMcpModal: (open: boolean) => void;
}

export function TopBar({
  activeView,
  onNavigate,
  mcpModalOpen,
  onToggleMcpModal,
}: TopBarProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const handleCopy = (key: string, text: string) => {
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(text).catch(() => {});
    }
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 1800);
  };

  const navItems: { label: string; view: ViewId; anchor?: string; isActive: boolean }[] = [
    { label: 'Index', view: 'index', isActive: activeView === 'index' },
    { label: 'Reviews', view: 'review', isActive: activeView === 'review' },
    { label: 'Guides', view: 'guide', isActive: activeView === 'guide' },
    { label: 'Schematics', view: 'review', anchor: 'inspectable-schematic', isActive: false },
  ];

  const mcpSnippet = `{
  "mcpServers": {
    "zerolabs": {
      "url": "https://labs.zeroshot.studio/.well-known/mcp.json",
      "transport": "streamable-http"
    }
  }
}`;

  const curlSnippet = `curl -H "Accept: text/markdown" \\
  https://labs.zeroshot.studio/reviews/mcp-server-postgres`;

  return (
    <>
      <header className="w-full border-b border-[var(--zl-border)] bg-[var(--zl-surface)]">
        <div className="mx-auto flex h-14 max-w-[1320px] items-center justify-between gap-8 px-4 sm:px-6">
          {/* Zone 1: Single-element display wordmark */}
          <button
            type="button"
            onClick={() => onNavigate('index')}
            className="font-display text-lg font-bold tracking-[-0.03em] text-[var(--zl-ink)] whitespace-nowrap shrink-0 cursor-pointer hover:text-[var(--zl-accent)] transition-colors"
          >
            ZeroLabs
          </button>

          {/* Zone 2: 4 concise single-line text navigation links */}
          <nav
            aria-label="Primary navigation"
            className="hidden md:flex items-center gap-7 text-sm font-medium"
          >
            {navItems.map((item) => (
              <button
                key={item.label}
                type="button"
                onClick={() => onNavigate(item.view, item.anchor)}
                className={`relative py-1 whitespace-nowrap shrink-0 cursor-pointer transition-colors ${
                  item.isActive
                    ? 'text-[var(--zl-ink)]'
                    : 'text-[var(--zl-ink-secondary)] hover:text-[var(--zl-ink)]'
                }`}
              >
                {item.label}
                {item.isActive && (
                  <span
                    aria-hidden="true"
                    className="absolute inset-x-0 -bottom-[17px] h-[2px] bg-[var(--zl-accent)]"
                  />
                )}
              </button>
            ))}
          </nav>

          {/* Zone 3: 1 primary action */}
          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => onToggleMcpModal(true)}
              className="px-3.5 py-1.5 text-xs font-medium bg-[var(--zl-ink)] text-[var(--zl-surface)] hover:bg-[var(--zl-accent)] transition-colors whitespace-nowrap shrink-0 cursor-pointer rounded-[3px]"
            >
              MCP &amp; API
            </button>
            <button
              type="button"
              aria-label={mobileMenuOpen ? 'Close menu' : 'Open menu'}
              aria-expanded={mobileMenuOpen}
              onClick={() => setMobileMenuOpen((v) => !v)}
              className="md:hidden inline-flex items-center justify-center w-10 h-10 text-[var(--zl-ink)] hover:bg-[var(--zl-recessed)] rounded-[3px] cursor-pointer"
            >
              {mobileMenuOpen ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
            </button>
          </div>
        </div>

        {/* Mobile navigation panel */}
        {mobileMenuOpen && (
          <nav
            aria-label="Mobile navigation"
            className="md:hidden border-t border-[var(--zl-border)] bg-[var(--zl-surface)] px-4 py-2"
          >
            <div className="flex flex-col divide-y divide-[var(--zl-border)]">
              {navItems.map((item) => (
                <button
                  key={item.label}
                  type="button"
                  onClick={() => {
                    onNavigate(item.view, item.anchor);
                    setMobileMenuOpen(false);
                  }}
                  className={`py-3 text-left text-sm font-medium cursor-pointer ${
                    item.isActive ? 'text-[var(--zl-accent)]' : 'text-[var(--zl-ink)]'
                  }`}
                >
                  {item.label}
                </button>
              ))}
            </div>
          </nav>
        )}
      </header>

      {/* MCP & Machine Access Modal */}
      {mcpModalOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="mcp-modal-title"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          onClick={() => onToggleMcpModal(false)}
        >
          <div
            className="w-full max-w-2xl border border-[var(--zl-border-strong)] bg-[var(--zl-surface)] text-[var(--zl-ink)] shadow-xl rounded-[4px] overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-[var(--zl-border)] px-5 py-3.5">
              <div>
                <h2 id="mcp-modal-title" className="text-base font-bold tracking-tight">
                  ZeroLabs Machine &amp; MCP Access
                </h2>
                <p className="text-xs text-[var(--zl-ink-muted)] mt-0.5">
                  Canonical HTTP content negotiation, typed JSON schemas, and read-only MCP resources.
                </p>
              </div>
              <button
                type="button"
                aria-label="Close MCP reference dialog"
                onClick={() => onToggleMcpModal(false)}
                className="w-8 h-8 inline-flex items-center justify-center text-[var(--zl-ink-secondary)] hover:text-[var(--zl-ink)] hover:bg-[var(--zl-recessed)] rounded-[3px] cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5 space-y-5 max-h-[75vh] overflow-y-auto">
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-xs font-medium text-[var(--zl-ink)]">
                    1. Connect Coding Agents via MCP Server Manifest
                  </span>
                  <button
                    type="button"
                    onClick={() => handleCopy('mcp', mcpSnippet)}
                    className="inline-flex items-center gap-1.5 text-xs font-mono text-[var(--zl-accent)] hover:underline cursor-pointer"
                  >
                    {copiedKey === 'mcp' ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                    {copiedKey === 'mcp' ? 'Copied' : 'Copy JSON'}
                  </button>
                </div>
                <pre className="bg-[var(--zl-specimen-bg)] text-[var(--zl-specimen-ink)] border border-[var(--zl-specimen-border)] p-3.5 text-xs font-mono overflow-x-auto rounded-[3px]">
                  {mcpSnippet}
                </pre>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-xs font-medium text-[var(--zl-ink)]">
                    2. HTTP Content Negotiation (Any Review or Guide URL)
                  </span>
                  <button
                    type="button"
                    onClick={() => handleCopy('curl', curlSnippet)}
                    className="inline-flex items-center gap-1.5 text-xs font-mono text-[var(--zl-accent)] hover:underline cursor-pointer"
                  >
                    {copiedKey === 'curl' ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                    {copiedKey === 'curl' ? 'Copied' : 'Copy curl'}
                  </button>
                </div>
                <pre className="bg-[var(--zl-specimen-bg)] text-[var(--zl-specimen-ink)] border border-[var(--zl-specimen-border)] p-3.5 text-xs font-mono overflow-x-auto rounded-[3px]">
                  {curlSnippet}
                </pre>
              </div>

              <div className="border-t border-[var(--zl-border)] pt-4 grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                <div>
                  <div className="font-medium text-[var(--zl-ink)] mb-1">Exposed MCP Resources</div>
                  <ul className="space-y-1 font-mono text-[var(--zl-ink-secondary)]">
                    <li>/reviews/{'{slug}'}.json</li>
                    <li>/guides/{'{slug}'}.md</li>
                    <li>/index.json?offline=true</li>
                  </ul>
                </div>
                <div>
                  <div className="font-medium text-[var(--zl-ink)] mb-1">Programmatic Re-Run Tool</div>
                  <p className="font-mono text-[var(--zl-ink-secondary)] leading-relaxed">
                    request_review_rerun(slug, target_version, focus[])
                  </p>
                  <p className="text-[var(--zl-ink-muted)] mt-1">
                    Idempotent queue request when an agent detects version drift.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
