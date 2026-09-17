import type { Sound } from './audioConfig';

/**
 * En iOS y Android no hay Web Audio: sonar pediría `expo-av` y una segunda
 * arquitectura de sonido para una plataforma que tampoco tiene la escena 3D.
 * Metro resuelve `audioEngine.web.ts` en web y este archivo en nativo, igual
 * que con `SpiderScene` y `useSpiderGrab`.
 *
 * El conmutador no aparece donde esto manda: `SOUND_AVAILABLE` lo apaga.
 */

export const SOUND_AVAILABLE = false;

export async function start(): Promise<boolean> {
  return false;
}

export function stop(): void {}

export function play(_sound: Sound, _quiet: boolean): void {}

export function beginStrand(_strain: number, _leg: number, _ringSize: number, _quiet: boolean): void {}

export function moveStrand(_strain: number, _leg: number, _ringSize: number, _quiet: boolean): void {}

export function endStrand(): void {}
