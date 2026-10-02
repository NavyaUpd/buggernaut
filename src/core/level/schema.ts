// Level data types (CLAUDE.md §9.8). Pure TS — no Phaser, no DOM.

export type TilePos = readonly [x: number, y: number];

export type NodeKind = 'source' | 'pole' | 'breaker' | 'load' | 'junction';
export type LoadKind = 'house' | 'shop' | 'streetlamp' | 'hospital' | 'lift' | 'shutter' | 'pump';
export type Phase = 'R' | 'Y' | 'B';

export interface NetworkNodeSource {
  id: string;
  kind: NodeKind;
  at: TilePos;
}

export interface NetworkEdgeSource {
  id: string;
  a: string;
  b: string;
  state: 'intact' | 'broken';
  phase?: Phase;
}

export interface BreakerSource {
  id: string;
  node: string;
  closed: boolean;
}

export interface LoadSource {
  id: string;
  node: string;
  kind: LoadKind;
  at: TilePos;
}

export interface NetworkSource {
  nodes: NetworkNodeSource[];
  edges: NetworkEdgeSource[];
  breakers: BreakerSource[];
  loads: LoadSource[];
  targets: string[];
}

export interface LevelSource {
  id: string;
  name: string;
  music: string;
  weather: { rain: number; wind: number; lightning: readonly [number, number] | null };
  map: string[];
  network: NetworkSource;
  story?: { caption?: string };
}
