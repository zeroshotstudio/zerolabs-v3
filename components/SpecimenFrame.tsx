'use client';

import React, { useEffect, useState } from 'react';
import { Pause, Play, Terminal, Eye } from 'lucide-react';
import { RunStepEvidence } from '@/lib/zerolabs-types';

interface SpecimenFrameProps {
  runId: string;
  testedVersion: string;
  steps: RunStepEvidence[];
  activeStepIndex: number;
  onSelectStep: (idx: number) => void;
}

export function SpecimenFrame({
  runId,
  testedVersion,
  steps,
  activeStepIndex,
  onSelectStep,
}: SpecimenFrameProps) {
  const [mode, setMode] = useState<'visual' | 'stdout'>('visual');
  const [playing, setPlaying] = useState(false);

  const step = steps[activeStepIndex] ?? steps[0];

  useEffect(() => {
    if (!playing) return;
    const timer = setInterval(() => {
      onSelectStep((activeStepIndex + 1) % steps.length);
    }, 3200);
    return () => clearInterval(timer);
  }, [playing, activeStepIndex, steps.length, onSelectStep]);

  // Build crisp SVG polyline points for telemetry waveform
  const chartW = 540;
  const chartH = 128;
  const padX = 14;
  const padY = 14;
  const plotW = chartW - padX * 2;
  const plotH = chartH - padY * 2;
  const pts = step.seriesData.map((val, i) => {
    const x = padX + (i / Math.max(1, step.seriesData.length - 1)) * plotW;
    const y = padY + plotH - (val / 100) * plotH;
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  });
  const linePath = `M ${pts.join(' L ')}`;
  const areaPath = `${linePath} L ${(padX + plotW).toFixed(1)},${(padY + plotH).toFixed(1)} L ${padX},${(padY + plotH).toFixed(1)} Z`;

  return (
    <section
      aria-label="Bound visual run proof"
      className="border border-[var(--zl-specimen-border)] bg-[var(--zl-specimen-bg)] text-[var(--zl-specimen-ink)] rounded-[3px] overflow-hidden"
    >
      {/* Top Specimen Control Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--zl-specimen-border)] bg-[var(--zl-specimen-surface)] px-4 py-2.5">
        <div className="flex items-center gap-2.5 min-w-0">
          <span className="font-mono text-[11px] text-[var(--zl-specimen-muted)] whitespace-nowrap shrink-0">
            Bound Run Proof
          </span>
          <span aria-hidden="true" className="text-[var(--zl-specimen-border)]">
            /
          </span>
          <span className="text-xs font-medium text-[var(--zl-specimen-ink)] truncate">
            {step.title}
          </span>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <div
            role="group"
            aria-label="Specimen display mode"
            className="inline-flex items-center bg-[#0d1015] border border-[var(--zl-specimen-border)] p-0.5 rounded-[2px]"
          >
            <button
              type="button"
              aria-pressed={mode === 'visual'}
              onClick={() => setMode('visual')}
              className={`inline-flex items-center gap-1.5 px-2.5 py-1 text-[11px] font-medium rounded-[2px] cursor-pointer transition-colors whitespace-nowrap shrink-0 ${
                mode === 'visual'
                  ? 'bg-[#242b37] text-white'
                  : 'text-[var(--zl-specimen-muted)] hover:text-white'
              }`}
            >
              <Eye className="w-3 h-3" />
              Visual Capture
            </button>
            <button
              type="button"
              aria-pressed={mode === 'stdout'}
              onClick={() => setMode('stdout')}
              className={`inline-flex items-center gap-1.5 px-2.5 py-1 text-[11px] font-medium rounded-[2px] cursor-pointer transition-colors whitespace-nowrap shrink-0 ${
                mode === 'stdout'
                  ? 'bg-[#242b37] text-white'
                  : 'text-[var(--zl-specimen-muted)] hover:text-white'
              }`}
            >
              <Terminal className="w-3 h-3" />
              Stdout Log
            </button>
          </div>
        </div>
      </div>

      {/* Main Viewport Stage */}
      <div className="p-4 sm:p-5">
        {mode === 'visual' ? (
          <div className="space-y-4">
            {/* Captured Headless Harness Visual Frame */}
            <div className="border border-[var(--zl-specimen-border)] bg-[#0b0e13] p-3.5 rounded-[2px]">
              <div className="flex items-center justify-between gap-2 text-[11px] font-mono text-[var(--zl-specimen-muted)] mb-2">
                <span className="truncate">HARNESS CAPTURE · {step.id.toUpperCase()}</span>
                <span
                  className={`whitespace-nowrap shrink-0 ${
                    step.status === 'pass' ? 'text-[#34c28a]' : 'text-[#f0ab3c]'
                  }`}
                >
                  {step.status === 'pass' ? 'PASS · ASSERTIONS MET' : 'WARN · THRESHOLD BREACH'}
                </span>
              </div>

                {/* Precision Telemetry Graph Frame */}
                <svg
                  viewBox={`0 0 ${chartW} ${chartH}`}
                  className="w-full h-32 block"
                  role="img"
                  aria-label={`Captured telemetry trace for ${step.title}`}
                >
                  <defs>
                    <linearGradient id="specimenGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop
                        offset="0%"
                        stopColor={step.status === 'pass' ? '#34c28a' : '#ef5b3c'}
                        stopOpacity="0.24"
                      />
                      <stop
                        offset="100%"
                        stopColor={step.status === 'pass' ? '#34c28a' : '#ef5b3c'}
                        stopOpacity="0.01"
                      />
                    </linearGradient>
                  </defs>
                  {/* Reference gridlines */}
                  {[0.25, 0.5, 0.75].map((ratio) => {
                    const y = padY + plotH * ratio;
                    return (
                      <line
                        key={ratio}
                        x1={padX}
                        x2={padX + plotW}
                        y1={y}
                        y2={y}
                        stroke="#232a36"
                        strokeDasharray="3 3"
                        strokeWidth="1"
                      />
                    );
                  })}
                  {/* Threshold line on stress/fault steps */}
                  {step.status === 'warn' && (
                    <line
                      x1={padX}
                      x2={padX + plotW}
                      y1={padY + plotH * 0.25}
                      y2={padY + plotH * 0.25}
                      stroke="#ef5b3c"
                      strokeDasharray="4 3"
                      strokeWidth="1"
                      opacity="0.7"
                    />
                  )}
                  <path d={areaPath} fill="url(#specimenGrad)" />
                  <path
                    d={linePath}
                    fill="none"
                    stroke={step.status === 'pass' ? '#34c28a' : '#ef5b3c'}
                    strokeWidth="2"
                    strokeLinejoin="round"
                  />
                </svg>

                {/* Live Captured Terminal Strip inside Visual Frame */}
                <div className="mt-2 border-t border-[#1e2430] pt-2.5 font-mono text-[11px] leading-relaxed text-[#c6d0df] space-y-1">
                  <div className="text-[#8b96a6] truncate">$ {step.command}</div>
                  {step.logLines.slice(-2).map((line, i) => (
                    <div key={i} className="flex items-start gap-2">
                      <span className="text-[#697589] shrink-0 tabular-nums">{line.ts}</span>
                      <span
                        className={`shrink-0 ${
                          line.level === 'OK'
                            ? 'text-[#34c28a]'
                            : line.level === 'WARN'
                              ? 'text-[#f0ab3c]'
                              : line.level === 'TOOL'
                                ? 'text-[#7ab3ff]'
                                : 'text-[#8b96a6]'
                        }`}
                      >
                        [{line.level}]
                      </span>
                      <span className="truncate">{line.text}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Precision 4-Column Metric Readout Strip */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {step.metrics.map((m) => (
                  <div
                    key={m.label}
                    className="border border-[var(--zl-specimen-border)] bg-[var(--zl-specimen-surface)] px-3 py-2 rounded-[2px] flex flex-col justify-center"
                  >
                    <span className="text-[11px] text-[var(--zl-specimen-muted)] truncate">{m.label}</span>
                    <span className="font-mono text-sm font-medium text-white tabular-nums mt-0.5 whitespace-nowrap">
                      {m.value}
                    </span>
                  </div>
                ))}
              </div>

            <p className="text-xs text-[#b5c0cf] leading-relaxed">{step.summary}</p>
          </div>
        ) : (
          /* Synchronized Raw Stdout Log View */
          <div className="border border-[var(--zl-specimen-border)] bg-[#0a0d12] p-3.5 rounded-[2px] font-mono text-xs leading-relaxed overflow-x-auto specimen-scroll">
            <div className="text-[#7c889b] pb-2 mb-2 border-b border-[#1d232e]">
              $ {step.command}
            </div>
            <div className="space-y-1.5 min-h-[168px]">
              {step.logLines.map((line, idx) => (
                <div key={idx} className="flex items-start gap-2.5">
                  <span className="text-[#647084] shrink-0 tabular-nums">{line.ts}</span>
                  <span
                    className={`w-11 shrink-0 ${
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
                  <span className="text-[#dfe6f0] break-words">{line.text}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Scrubbable Step Timeline Controls */}
        <div className="mt-4 pt-3 border-t border-[var(--zl-specimen-border)] flex flex-wrap items-center gap-2">
          <button
            type="button"
            aria-label={playing ? 'Pause capture reel' : 'Play capture reel'}
            onClick={() => setPlaying((p) => !p)}
            className="inline-flex items-center justify-center w-8 h-8 border border-[var(--zl-specimen-border)] bg-[var(--zl-specimen-surface)] hover:bg-[#252d3a] text-white rounded-[2px] cursor-pointer shrink-0"
          >
            {playing ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
          </button>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 flex-1">
            {steps.map((s, idx) => {
              const active = idx === activeStepIndex;
              return (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => {
                    setPlaying(false);
                    onSelectStep(idx);
                  }}
                  className={`px-2.5 py-1.5 text-left rounded-[2px] border transition-colors cursor-pointer ${
                    active
                      ? 'border-[#ef5b3c] bg-[#221918] text-white'
                      : 'border-[var(--zl-specimen-border)] bg-[var(--zl-specimen-surface)] text-[var(--zl-specimen-muted)] hover:text-white'
                  }`}
                >
                  <div className="flex items-center justify-between gap-1 font-mono text-[10px] tabular-nums">
                    <span>0{s.stepNumber}</span>
                    <span className={s.status === 'pass' ? 'text-[#34c28a]' : 'text-[#f0ab3c]'}>
                      {s.timestampSec}
                    </span>
                  </div>
                  <div className="text-[11px] truncate mt-0.5">
                    {s.title.replace(/^Step \d+:\s*/, '')}
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Provenance Stamp Footer */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-t border-[var(--zl-specimen-border)] bg-[#0c0f14] px-4 py-2 font-mono text-[11px] text-[var(--zl-specimen-muted)] tabular-nums">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-[#dfe6f0]">{runId}</span>
          <span aria-hidden="true">·</span>
          <span>{testedVersion}</span>
          <span aria-hidden="true">·</span>
          <span>Step 0{step.stepNumber} / 0{steps.length}</span>
        </div>
        <div>Elapsed {step.timestampSec} / 00:14.2</div>
      </div>
    </section>
  );
}
