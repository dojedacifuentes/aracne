import {
  BufferAttribute,
  BufferGeometry,
  DynamicDrawUsage,
  Line,
  LineBasicMaterial,
  type ColorRepresentation,
} from 'three';

/**
 * La seda. Reimplementa la idea de `makeSpiderSilk()` de code4fukui/vr-spiders
 * —una Bézier cuadrática con algo de holgura y un vaivén de seno y coseno—
 * sin su coste: el original creaba vectores nuevos y reconstruía la geometría
 * entera en cada fotograma, y recalculaba su esfera envolvente.
 *
 * Aquí el búfer se reserva una vez, la curva se evalúa en su sitio y el hilo
 * no se recorta contra el frustum, así que no hace falta ninguna envolvente.
 * La holgura se aplica en perpendicular a la cuerda: en un hilo vertical,
 * bajar el punto de control (como hacía el original) no curva nada.
 */
export class SpiderSilk {
  readonly line: Line<BufferGeometry, LineBasicMaterial>;
  private readonly positions: Float32Array;
  private readonly attribute: BufferAttribute;
  private readonly segments: number;

  constructor({
    segments = 32,
    color = '#EDEAE3',
    opacity = 0.5,
  }: { segments?: number; color?: ColorRepresentation; opacity?: number } = {}) {
    this.segments = segments;
    this.positions = new Float32Array((segments + 1) * 3);
    this.attribute = new BufferAttribute(this.positions, 3);
    this.attribute.setUsage(DynamicDrawUsage);

    const geometry = new BufferGeometry();
    geometry.setAttribute('position', this.attribute);
    const material = new LineBasicMaterial({ color, transparent: true, opacity, depthWrite: false });

    this.line = new Line(geometry, material);
    this.line.frustumCulled = false;
  }

  setOpacity(opacity: number): void {
    this.line.material.opacity = opacity;
    this.line.visible = opacity > 0.001;
  }

  /**
   * Hilo de A a B. `slack` curva el hilo hacia un lado y `sway` lo mece en esa
   * misma dirección; `swayZ` lo mece en profundidad. Todo en unidades de mundo.
   */
  update(
    ax: number,
    ay: number,
    az: number,
    bx: number,
    by: number,
    bz: number,
    slack: number,
    sway: number,
    swayZ: number,
  ): void {
    const dx = bx - ax;
    const dy = by - ay;
    const length = Math.hypot(dx, dy) || 1;
    const nx = -dy / length;
    const ny = dx / length;
    const cx = (ax + bx) / 2 + nx * (slack + sway);
    const cy = (ay + by) / 2 + ny * (slack + sway);
    const cz = (az + bz) / 2 + swayZ;

    const p = this.positions;
    for (let i = 0; i <= this.segments; i += 1) {
      const t = i / this.segments;
      const u = 1 - t;
      const w0 = u * u;
      const w1 = 2 * u * t;
      const w2 = t * t;
      const o = i * 3;
      p[o] = w0 * ax + w1 * cx + w2 * bx;
      p[o + 1] = w0 * ay + w1 * cy + w2 * by;
      p[o + 2] = w0 * az + w1 * cz + w2 * bz;
    }
    this.attribute.needsUpdate = true;
  }

  dispose(): void {
    this.line.geometry.dispose();
    this.line.material.dispose();
  }
}
