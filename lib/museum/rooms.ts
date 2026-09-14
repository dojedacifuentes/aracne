import type { Figure, Room } from "../content/corpus";
import type { Entry } from "../schema";

/**
 * El gabinete, calculado.
 *
 * `rooms.json` no lista figuras y no debe listarlas: la pertenencia la declara
 * cada figura en su campo `rooms`, igual que una entrada declara sus
 * categorías. Una sala es, por tanto, el resultado de una consulta, no un
 * dato duplicado que se pueda desincronizar.
 *
 * Aquí no se importa React ni nada de la interfaz: la sala se puede probar sin
 * montar una pantalla.
 */

export interface RoomState {
  room: Room;
  /** En el orden de `figures.json`, que es el orden en que se escribieron. */
  figures: Figure[];
  /** Entradas ligadas a las figuras de la sala, sin repetir. */
  entries: string[];
}

export function roomStates(figures: readonly Figure[], rooms: readonly Room[]): RoomState[] {
  return rooms.map((room) => {
    const members = figures.filter((figure) => figure.rooms.includes(room.id));
    return {
      room,
      figures: members,
      entries: [...new Set(members.flatMap((figure) => figure.entries))].sort(),
    };
  });
}

/** Las salas a las que pertenece una figura, en el orden del gabinete. */
export function roomsOf(figure: Figure, rooms: readonly Room[]): Room[] {
  return rooms.filter((room) => figure.rooms.includes(room.id));
}

/**
 * El camino de vuelta: de una entrada a las figuras que la reclaman.
 * MUSEO.md pide que la navegación vaya en los dos sentidos, y el único lado
 * donde el vínculo está escrito es el de la figura.
 */
export function figuresOfEntry(entryId: string, figures: readonly Figure[]): Figure[] {
  return figures.filter((figure) => figure.entries.includes(entryId));
}

/**
 * Las entradas de una sala, como objetos y en el orden del archivo.
 * Es lo que `invocar desde esta sala` le pasa al motor: un corpus recortado,
 * no una categoría nueva. El motor no se entera de que existe el gabinete.
 */
export function entriesOfRoom(state: RoomState, entries: readonly Entry[]): Entry[] {
  const wanted = new Set(state.entries);
  return entries.filter((entry) => wanted.has(entry.id));
}
