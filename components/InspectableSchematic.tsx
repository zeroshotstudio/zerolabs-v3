'use client';

import React from 'react';
import { Check, Pin } from 'lucide-react';
import { SchematicEdge, SchematicNode } from '@/lib/zerolabs-types';

interface InspectableSchematicProps {
  id?: string;
  title: string;
  subtitle: string;
  nodes: SchematicNode[];
  edges: SchematicEdge[];
  selectedNodeId: string;
  onSelectNode: (node: SchematicNode) => void;
  isNodePinned: (nodeId: string) => boolean;
  onPinNode: (node: SchematicNode) => void;
}

export function InspectableSchematic({
  id = 'inspectable-schematic',
  title,
  subtitle,
  nodes,
  edges,
  selectedNodeId,
  onSelectNode,
  isNodePinned,
  onPinNode,
}: InspectableSchematicProps) {
  const selectedNode = nodes.find((n) => n.id === selectedNodeId) ?? nodes[0];
  const nodeMap = new Map(nodes.map((n) => [n.id, n]));

  const isEdgeConnected = (edge: SchematicEdge) =>
    edge.from === selectedNodeId || edge.to === selectedNodeId;

  return (
    <section
      id={id}
      aria-label={title}
      className="border border-[var(--zl-border)] bg-[var(--zl-surface)] rounded-[3px] overflow-hidden"
    >
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[var(--zl-border)] px-4 py-3">
        <div>
          <h3 className="text-sm font-bold text-[var(--zl-ink)]">{title}</h3>
          <p className="text-xs text-[var(--zl-ink-muted)] mt-0.5">{subtitle}</p>
        </div>
        <span className="font-mono text-[11px] text-[var(--zl-ink-muted)]">
          Click any node to inspect contract
        </span>
      </div>

      {/* Vector Diagram Plane */}
      <div className="overflow-x-auto bg-[var(--zl-ground)] px-4 py-5 border-b border-[var(--zl-border)]">
        <div className="min-w-[720px] max-w-[800px] mx-auto">
          <svg
            viewBox="0 0 800 226"
            className="w-full h-auto block"
            role="group"
            aria-label="Interactive architecture schematic"
          >
            <defs>
              <marker
                id="zl-arrow"
                viewBox="0 0 10 10"
                refX="9"
                refY="5"
                markerWidth="6"
                markerHeight="6"
                orient="auto-start-reverse"
              >
                <path d="M 0 1 L 10 5 L 0 9 z" fill="var(--zl-border-strong)" />
              </marker>
              <marker
                id="zl-arrow-active"
                viewBox="0 0 10 10"
                refX="9"
                refY="5"
                markerWidth="6"
                markerHeight="6"
                orient="auto-start-reverse"
              >
                <path d="M 0 1 L 10 5 L 0 9 z" fill="var(--zl-accent)" />
              </marker>
            </defs>

            {/* Subtle Trust Boundary Backdrop Box */}
            <rect
              x="202"
              y="12"
              width="384"
              height="202"
              rx="3"
              fill="var(--zl-surface)"
              stroke="var(--zl-border)"
              strokeDasharray="4 4"
            />
            <text
              x="214"
              y="28"
              fill="var(--zl-ink-muted)"
              fontSize="10"
              fontFamily="var(--font-mono)"
            >
              POLICY &amp; VALIDATION BOUNDARY
            </text>

            {/* Edges */}
            {edges.map((edge) => {
              const fromNode = nodeMap.get(edge.from);
              const toNode = nodeMap.get(edge.to);
              if (!fromNode || !toNode) return null;

              const x1 = fromNode.x + fromNode.w;
              const y1 = fromNode.y + fromNode.h / 2;
              const x2 = toNode.x;
              const y2 = toNode.y + toNode.h / 2;

              // If vertical edge (e.g., Pooler -> Replica)
              const isVertical = Math.abs(fromNode.x - toNode.x) < 20;
              const pathD = isVertical
                ? `M ${fromNode.x + fromNode.w / 2} ${fromNode.y + fromNode.h} L ${toNode.x + toNode.w / 2} ${toNode.y}`
                : `M ${x1} ${y1} C ${x1 + 22} ${y1}, ${x2 - 22} ${y2}, ${x2} ${y2}`;

              const labelX = isVertical ? fromNode.x + fromNode.w / 2 + 8 : (x1 + x2) / 2;
              const labelY = isVertical
                ? (fromNode.y + fromNode.h + toNode.y) / 2 + 3
                : (y1 + y2) / 2 - 8;

              const active = isEdgeConnected(edge);

              return (
                <g key={edge.id}>
                  <path
                    d={pathD}
                    fill="none"
                    stroke={active ? 'var(--zl-accent)' : 'var(--zl-border-strong)'}
                    strokeWidth={active ? 1.8 : 1.25}
                    strokeDasharray={edge.dashed ? '4 3' : undefined}
                    markerEnd={active ? 'url(#zl-arrow-active)' : 'url(#zl-arrow)'}
                  />
                  <text
                    x={labelX}
                    y={labelY}
                    textAnchor={isVertical ? 'start' : 'middle'}
                    fontSize="9.5"
                    fontFamily="var(--font-mono)"
                    fill={active ? 'var(--zl-accent)' : 'var(--zl-ink-muted)'}
                  >
                    {edge.label}
                  </text>
                </g>
              );
            })}

            {/* Nodes */}
            {nodes.map((node) => {
              const selected = node.id === selectedNodeId;
              const pinned = isNodePinned(node.id);
              return (
                <g
                  key={node.id}
                  role="button"
                  tabIndex={0}
                  aria-label={`Inspect schematic node ${node.label}`}
                  aria-pressed={selected}
                  onClick={() => onSelectNode(node)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      onSelectNode(node);
                    }
                  }}
                  className="cursor-pointer outline-none"
                >
                  <rect
                    x={node.x}
                    y={node.y}
                    width={node.w}
                    height={node.h}
                    rx="3"
                    fill={selected ? 'var(--zl-accent-soft)' : 'var(--zl-surface)'}
                    stroke={selected ? 'var(--zl-accent)' : 'var(--zl-border-strong)'}
                    strokeWidth={selected ? 1.8 : 1}
                  />
                  <text
                    x={node.x + 12}
                    y={node.y + 24}
                    fontSize="12"
                    fontWeight="600"
                    fontFamily="var(--font-display)"
                    fill="var(--zl-ink)"
                  >
                    {node.label}
                  </text>
                  <text
                    x={node.x + 12}
                    y={node.y + 41}
                    fontSize="10"
                    fontFamily="var(--font-mono)"
                    fill="var(--zl-ink-muted)"
                  >
                    {node.sublabel}
                  </text>
                  <text
                    x={node.x + 12}
                    y={node.y + 58}
                    fontSize="9.5"
                    fontFamily="var(--font-mono)"
                    fill={pinned ? 'var(--zl-accent)' : 'var(--zl-ink-secondary)'}
                  >
                    {pinned ? 'Pinned · ' : ''}
                    {node.latencyBudget}
                  </text>
                </g>
              );
            })}
          </svg>
        </div>
      </div>

      {/* Selected Node Summary Strip (Immediate Feedback + Mobile Inspection + 1-Click Pin) */}
      {selectedNode && (
        <div className="px-4 py-3 bg-[var(--zl-surface)] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="min-w-0">
            <div className="flex items-center gap-2 text-xs">
              <span className="font-display font-bold text-[var(--zl-ink)]">
                {selectedNode.label}
              </span>
              <span aria-hidden="true" className="text-[var(--zl-border-strong)]">
                ·
              </span>
              <span className="font-mono text-[11px] text-[var(--zl-ink-muted)]">
                {selectedNode.anchor}
              </span>
            </div>
            <p className="text-xs text-[var(--zl-ink-secondary)] mt-1 leading-relaxed">
              {selectedNode.role}
            </p>
            <div className="text-[11px] font-mono text-[var(--zl-ink-muted)] mt-1.5 flex flex-wrap gap-x-3 gap-y-1">
              <span>Scope: {selectedNode.permissionScope}</span>
              <span>Budget: {selectedNode.latencyBudget}</span>
            </div>
          </div>

          <button
            type="button"
            onClick={() => onPinNode(selectedNode)}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-[3px] border transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
              isNodePinned(selectedNode.id)
                ? 'border-[var(--zl-accent)] bg-[var(--zl-accent-soft)] text-[var(--zl-accent)]'
                : 'border-[var(--zl-border-strong)] bg-[var(--zl-surface)] text-[var(--zl-ink)] hover:border-[var(--zl-accent)] hover:text-[var(--zl-accent)]'
            }`}
          >
            {isNodePinned(selectedNode.id) ? (
              <>
                <Check className="w-3.5 h-3.5" />
                Node Pinned
              </>
            ) : (
              <>
                <Pin className="w-3.5 h-3.5" />
                Pin Node &amp; Schema ({selectedNode.tokenCost} tok)
              </>
            )}
          </button>
        </div>
      )}
    </section>
  );
}
