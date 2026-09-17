import AsyncStorage from '@react-native-async-storage/async-storage';
import { useCallback, useEffect, useState } from 'react';

import { SOUND_KEY, type Sound } from '../audio/audioConfig';
import {
  SOUND_AVAILABLE,
  beginStrand,
  endStrand,
  moveStrand,
  play as playSound,
  start,
  stop,
} from '../audio/audioEngine';
import { useReduceMotion } from './useReduceMotion';

/**
 * El conmutador del sonido, compartido por toda la aplicación sin proveedor:
 * el sintetizador ya es una pieza única, así que el estado vive en el módulo
 * y quien lo mira se suscribe. Tres sitios lo usan —el gesto sobre la araña,
 * la portada y la consola—, que es justo el número a partir del cual una
 * abstracción deja de ser prematura.
 *
 * **Nace apagado.** Un archivo que suena sin que se lo pidan es un archivo
 * maleducado, y además ningún navegador deja sonar nada antes del primer
 * gesto. La preferencia se recuerda; el contexto no se crea hasta encenderlo.
 */

let on = false;
let restored = false;
const listeners = new Set<() => void>();

function announce(next: boolean): void {
  if (on === next) return;
  on = next;
  for (const listener of listeners) listener();
}

async function remember(value: boolean): Promise<void> {
  try {
    await AsyncStorage.setItem(SOUND_KEY, value ? '1' : '0');
  } catch {
    // Sin almacenamiento el sonido funciona igual; solo se olvida al recargar.
  }
}

export interface SoundControls {
  /** En nativo no hay Web Audio: el conmutador no se enseña. */
  available: boolean;
  on: boolean;
  toggle: () => void;
  play: (sound: Sound) => void;
  /** El sostenido de la seda mientras la mano tira. */
  pull: (strain: number, leg: number, ringSize: number) => void;
  drop: () => void;
}

export function useSound(): SoundControls {
  const [value, setValue] = useState(on);
  const quiet = useReduceMotion();

  useEffect(() => {
    const listener = () => setValue(on);
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  }, []);

  useEffect(() => {
    if (restored || !SOUND_AVAILABLE) return;
    restored = true;
    let alive = true;
    void AsyncStorage.getItem(SOUND_KEY)
      .then((stored) => {
        if (!alive || stored !== '1') return;
        announce(true);
        void start();
      })
      .catch(() => undefined);
    return () => {
      alive = false;
    };
  }, []);

  const toggle = useCallback(() => {
    if (!SOUND_AVAILABLE) return;
    if (on) {
      stop();
      announce(false);
      void remember(false);
      return;
    }
    // Encender es el gesto que el navegador pide para dejar sonar nada.
    announce(true);
    void remember(true);
    void start();
  }, []);

  const play = useCallback(
    (sound: Sound) => {
      if (!on) return;
      playSound(sound, quiet);
    },
    [quiet],
  );

  const pull = useCallback(
    (strain: number, leg: number, ringSize: number) => {
      if (!on) return;
      beginStrand(strain, leg, ringSize, quiet);
      moveStrand(strain, leg, ringSize, quiet);
    },
    [quiet],
  );

  const drop = useCallback(() => {
    endStrand();
  }, []);

  return { available: SOUND_AVAILABLE, on: value, toggle, play, pull, drop };
}
