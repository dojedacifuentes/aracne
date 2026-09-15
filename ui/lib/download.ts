import { Platform } from 'react-native';

/**
 * Sacar cosas de la aplicación.
 *
 * Tres salidas: al portapapeles, a un `.txt` y a un `.pdf`. Las tres son de
 * navegador; en nativo no hay descarga sin un módulo de archivos, así que
 * allí devuelven `false` y quien llama decide qué decir. Nada de librerías:
 * un `Blob` y un enlace que se pulsa solo.
 */

const web = () => Platform.OS === 'web' && typeof document !== 'undefined';

function guardar(nombre: string, blob: Blob): boolean {
  if (!web()) return false;
  const url = URL.createObjectURL(blob);
  const enlace = document.createElement('a');
  enlace.href = url;
  enlace.download = nombre;
  enlace.style.display = 'none';
  document.body.appendChild(enlace);
  enlace.click();
  enlace.remove();
  // Se libera al siguiente tick: revocarla en el mismo deja descargas a medias.
  setTimeout(() => URL.revokeObjectURL(url), 1000);
  return true;
}

export function downloadText(filename: string, text: string): boolean {
  return guardar(`${filename}.txt`, new Blob([text], { type: 'text/plain;charset=utf-8' }));
}

export function downloadPdf(filename: string, bytes: Uint8Array): boolean {
  // El buffer se copia: el `Blob` no debe quedarse mirando memoria ajena.
  return guardar(`${filename}.pdf`, new Blob([bytes.slice()], { type: 'application/pdf' }));
}

/** Copia al portapapeles. Devuelve si se pudo. */
export async function copyText(text: string): Promise<boolean> {
  if (!web()) return false;
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    // Sin permiso o sin API: se intenta a la vieja usanza antes de rendirse.
    try {
      const area = document.createElement('textarea');
      area.value = text;
      area.style.position = 'fixed';
      area.style.opacity = '0';
      document.body.appendChild(area);
      area.select();
      const hecho = document.execCommand('copy');
      area.remove();
      return hecho;
    } catch {
      return false;
    }
  }
}
