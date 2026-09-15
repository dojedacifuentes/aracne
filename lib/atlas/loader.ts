import causes from "../../content/atlas/causes.json";
import world from "../../content/atlas/world.json";

import { CauseSchema, WorldSchema, type Atlas, type Cause } from "./world";

let cached: Atlas | null = null;

/**
 * El Atlas, cargado y validado una vez.
 *
 * `npm run validate` lo comprueba antes de cada build, así que aquí no debería
 * llegar nada inválido; si llegara, se descarta la causa que no pasa el
 * esquema en lugar de tumbar la pantalla. Un mapa con veintinueve causas se
 * lee; un mapa que no arranca, no.
 */
export function loadAtlas(): Atlas {
  if (cached) return cached;
  const parsedWorld = WorldSchema.parse(world);
  const parsedCauses: Cause[] = [];
  for (const raw of causes) {
    const result = CauseSchema.safeParse(raw);
    if (result.success) parsedCauses.push(result.data);
  }
  cached = { world: parsedWorld, causes: parsedCauses };
  return cached;
}
