// Validates every level in src/levels (CLAUDE.md §7.2). Exits non-zero on failure.
// Phase 0: structural checks only. Circuit solvability + reachability arrive with core/level/validate.ts.
import { LEVELS } from '../src/levels/index';

let failed = 0;
for (const level of LEVELS) {
  const widths = new Set(level.map.map((row) => row.length));
  const nodeIds = new Set(level.network.nodes.map((n) => n.id));
  const errors: string[] = [];
  if (widths.size > 1) errors.push(`ragged map rows: widths ${[...widths].join(', ')}`);
  for (const e of level.network.edges) {
    if (!nodeIds.has(e.a) || !nodeIds.has(e.b)) errors.push(`edge ${e.id} references unknown node`);
  }
  const loadIds = new Set(level.network.loads.map((l) => l.id));
  for (const t of level.network.targets) if (!loadIds.has(t)) errors.push(`target ${t} is not a load`);
  if (errors.length) {
    failed++;
    console.error(`✗ ${level.id}\n  ${errors.join('\n  ')}`);
  } else {
    console.log(`✓ ${level.id} ${level.name}`);
  }
}
console.log(`${LEVELS.length} level(s) checked, ${failed} failed.`);
process.exit(failed ? 1 : 0);
