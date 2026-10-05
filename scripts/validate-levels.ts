// Validates every room in src/levels/rooms.ts (§8.3, §12). Exits non-zero on failure.
import { checkRoom } from '../src/core/reach';
import { parseRoom } from '../src/core/roomParse';
import { ROOMS } from '../src/levels/rooms';

let failed = 0;
for (const def of ROOMS) {
  const { errors } = checkRoom(parseRoom(def));
  if (errors.length) {
    failed++;
    console.error(`✗ ${def.id} ${def.name}\n  ${errors.join('\n  ')}`);
  } else {
    console.log(`✓ ${def.id} ${def.name}`);
  }
}
console.log(`${ROOMS.length} room(s) checked, ${failed} failed.`);
process.exit(failed ? 1 : 0);
