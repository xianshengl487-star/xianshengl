import type { Diagnostic } from './elements';

export type PortType =
  | 'exec'
  | 'player'
  | 'item'
  | 'block'
  | 'entity'
  | 'world'
  | 'position'
  | 'number'
  | 'string'
  | 'boolean'
  | 'command';

export interface NodePort {
  id: string;
  name: string;
  type: PortType;
  required?: boolean;
}

export interface LogicNode {
  nodeId: string;
  nodeType: string;
  title: string;
  position: { x: number; y: number };
  inputs: NodePort[];
  outputs: NodePort[];
  params: Record<string, unknown>;
  required: string[];
  diagnostics: Diagnostic[];
  comment?: string;
  collapsed?: boolean;
  fromTemplate?: boolean;
  customCode?: boolean;
  irFragment?: unknown;
}

export interface LogicEdge {
  id: string;
  source: string;
  sourceHandle: string;
  target: string;
  targetHandle: string;
  type: PortType;
}

export type LogicVariableType = 'number' | 'string' | 'boolean';

export interface LogicVariable {
  id: string;
  name: string;
  type: LogicVariableType;
  defaultValue: string | number | boolean;
  scope: 'local' | 'player_persistent' | 'global';
}

export interface LogicGraph {
  schemaVersion: string;
  graphId: string;
  name: string;
  eventType: string;
  boundElement?: string;
  enabled: boolean;
  targetLoaders: string[];
  nodes: LogicNode[];
  edges: LogicEdge[];
  variables: LogicVariable[];
  resources: string[];
  templateSource?: string;
  diagnostics: Diagnostic[];
  generatedCodeCache: {
    forge?: string;
    fabric?: string;
    mcfunction?: string;
  };
  naturalLanguageCache?: string;
  editorView: {
    zoom: number;
    position: { x: number; y: number };
    groups: unknown[];
  };
  ir?: BlockForgeIR;
}

export interface BlockForgeIR {
  irVersion: string;
  type: 'event_logic';
  event: {
    type: string;
    target?: string;
  };
  variables?: LogicVariable[];
  steps: IRStep[];
}

export interface IRStep {
  op: 'condition' | 'action';
  kind: string;
  args: Record<string, unknown>;
  then?: IRStep[];
  else?: IRStep[];
}
