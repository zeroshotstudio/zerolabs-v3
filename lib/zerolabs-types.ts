export type ViewId = 'index' | 'review' | 'guide';

export type ProjectionMode = 'human' | 'split' | 'agent';

export type ThemeMode = 'light' | 'dark';

export type DriftStatus = 'current' | 'minor' | 'major';

export type RubricAxis =
  | 'schemaFidelity'
  | 'tokenEfficiency'
  | 'runtimeSpeed'
  | 'securityIsolation'
  | 'setupErgonomics';

export type WeightLevel = 0.5 | 1 | 2;

export type SievePresetId = 'neutral' | 'local-first' | 'production' | 'token-budget' | 'custom';

export interface ConstraintSieveState {
  preset: SievePresetId;
  hard: {
    offlineOnly: boolean;
    zeroTelemetry: boolean;
    mcp2025: boolean;
    permissiveLicense: boolean;
    maxP95Ms: number | null; // null = Any, 50, 150
  };
  weights: Record<RubricAxis, WeightLevel>;
}

export interface RubricScores {
  schemaFidelity: number;
  tokenEfficiency: number;
  runtimeSpeed: number;
  securityIsolation: number;
  setupErgonomics: number;
}

export interface ProjectSummary {
  slug: string;
  name: string;
  category: string;
  shortDesc: string;
  hasFullReview: boolean;
  testedVersion: string;
  upstreamVersion: string;
  driftStatus: DriftStatus;
  driftDeltaLabel: string;
  verifiedDate: string;
  runId: string;
  p95Ms: number;
  medianTokensPerCall: number;
  hasVisualProof: boolean;
  visualProofSteps: number;
  license: string;
  capabilities: {
    offlineCapable: boolean;
    zeroTelemetry: boolean;
    mcp2025Compliant: boolean;
    permissiveLicense: boolean;
    telemetryNote?: string;
    offlineNote?: string;
    mcpNote?: string;
    licenseNote?: string;
  };
  scores: RubricScores;
  verdictOneLiner: string;
  keyCaveat: string;
  rerunQueueCount: number;
}

export interface EvaluatedProject {
  project: ProjectSummary;
  qualified: boolean;
  disqualificationReasons: string[];
  weightedScore: number;
  baselineScore: number;
  scoreDelta: number;
}

export interface SchematicNode {
  id: string;
  anchor: string;
  label: string;
  sublabel: string;
  role: string;
  zone: 'client' | 'boundary' | 'runtime' | 'storage';
  x: number;
  y: number;
  w: number;
  h: number;
  permissionScope: string;
  latencyBudget: string;
  failureMode: string;
  contractJson: string;
  tokenCost: number;
}

export interface SchematicEdge {
  id: string;
  from: string;
  to: string;
  label: string;
  protocol: string;
  dashed?: boolean;
}

export interface RunStepEvidence {
  stepNumber: number;
  id: string;
  title: string;
  command: string;
  timestampSec: string;
  durationSec: string;
  status: 'pass' | 'warn';
  summary: string;
  metrics: { label: string; value: string }[];
  seriesData: number[]; // Normalized 0-100 telemetry waveform for crisp SVG lab capture
  logLines: { ts: string; level: 'INFO' | 'WARN' | 'OK' | 'TOOL'; text: string }[];
}

export interface RubricDetail {
  axis: RubricAxis;
  label: string;
  anchor: string;
  score: number;
  summary: string;
  p50: string;
  p95: string;
  p99: string;
  assertion: string;
  linkedStepIndex: number;
  tokenCost: number;
}

export interface EmpiricalClaim {
  id: string;
  anchor: string;
  kind: 'strength' | 'caveat' | 'claim';
  title: string;
  body: string;
  negativeConstraint?: string;
  evidenceStepIndex: number;
  measuredValue: string;
  tokenCost: number;
}

export interface ReRunRequestEntry {
  targetVersion: string;
  focusAreas: string[];
  note: string;
  submittedAt: string;
}

export type PinItemKind = 'constraint' | 'claim' | 'schema' | 'rubric' | 'caveat' | 'guide-rule';

export interface PinnedItem {
  id: string;
  sourceSlug: string;
  sourceTitle: string;
  sourceUrl: string;
  anchor: string;
  kind: PinItemKind;
  title: string;
  content: string;
  negativeConstraint?: string;
  tokenCost: number;
  priority: 1 | 2 | 3; // 1 = locked high priority (constraints/schemas), 2 = claims, 3 = narrative/rubric
  driftWarning?: string;
}

export type CompilerProfile = 'guardrails' | 'audit' | 'full-spec';
export type TokenBudget = 500 | 1000 | 2000 | 4000;

export interface CompiledContextResult {
  includedItems: PinnedItem[];
  prunedItems: PinnedItem[];
  totalTokens: number;
  rawTokens: number;
  budget: TokenBudget;
  markdownOutput: string;
  jsonOutput: string;
  mcpResourceOutput: string;
}

export interface GuideSummary {
  slug: string;
  title: string;
  category: 'MCP Guide' | 'Architecture Note' | 'Inspectable Schematic';
  summary: string;
  specCompatibility: string;
  verifiedDate: string;
  agentTokenCount: number;
  schematicNodeCount: number;
  hasFullGuide: boolean;
}
