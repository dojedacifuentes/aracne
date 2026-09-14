import { Group, Vector3, type Object3D } from 'three';

import { alephState, impulse, RING } from '../../../lib/aleph/tension';
import { MOTION, SCENE, SILK_ATTACH, type SpiderOptions } from './spiderConfig';
import {
  ambientAt,
  pupil,
  smoothDamp,
  springInPlace,
  stillAmbient,
  type Ambient,
  type Damped,
  type Spring2,
} from './spiderMotion';
import { SpiderSilk } from './SpiderSilk';

/** Tamaño visible del escenario en z = 0, en unidades de mundo. */
export interface StageMetrics {
  width: number;
  height: number;
}

/**
 * Una araña colgada de su hilo: el modelo, la seda y el movimiento. No sabe
 * nada de React ni del render; la escena la actualiza una vez por fotograma y
 * ella no reserva memoria al hacerlo.
 *
 * La física de las patas no se calcula aquí: sale de `alephState()` e
 * `impulse()` de lib/aleph/tension.ts. La araña cuelga de la red y cada pata
 * apoyada tira de ella hacia su ángulo.
 */
export class SpiderRig {
  readonly object = new Group();
  /** 0 sin patas apoyadas; 1 con todas: menos legible, como el Aleph. */
  dim = 0;

  private readonly body = new Group();
  private readonly silk: SpiderSilk;
  private readonly attachLocal = new Vector3(SILK_ATTACH[0], SILK_ATTACH[1], SILK_ATTACH[2]);
  private readonly attach = new Vector3();

  private readonly entrance: Damped = { value: 1, velocity: 0 };
  private readonly lift: Damped = { value: 0, velocity: 0 };
  private readonly tension: Spring2 = { x: 0, y: 0, vx: 0, vy: 0 };
  private readonly ambient: Ambient = { sway: 0, bob: 0, twist: 0, silkX: 0, silkZ: 0 };

  private options: SpiderOptions;
  private stage: StageMetrics = { width: 2, height: 2 };
  private legs: readonly number[] = [];
  /** Destino de la tensión, en radios de `alephState()` y ejes de pantalla. */
  private pullX = 0;
  private pullY = 0;
  private pressedAt = -Infinity;
  private near = false;

  constructor(
    private readonly model: Object3D,
    options: SpiderOptions,
  ) {
    this.options = options;
    this.body.add(model);
    this.silk = new SpiderSilk({ opacity: options.silkOpacity });
    this.object.add(this.silk.line, this.body);
    this.entrance.value = options.entrance === 'descend' ? 1 : 0;
  }

  setOptions(options: SpiderOptions): void {
    this.options = options;
  }

  setStage(stage: StageMetrics): void {
    this.stage = { width: stage.width, height: stage.height };
  }

  setNear(near: boolean): void {
    this.near = near;
  }

  press(nowMs: number): void {
    this.pressedAt = nowMs;
  }

  /** Nueva selección de patas: golpe hacia las que se apoyan y retroceso de las que se sueltan. */
  setLegs(next: readonly number[], ringSize: number, quiet: boolean): void {
    const ring = { legs: ringSize, reach: RING.reach };
    const state = alephState([...next], ring);
    this.pullX = state.offset.x;
    this.pullY = state.offset.y;
    this.dim = Math.min(1, Math.max(0, (state.distortion - 0.3) / 0.55));

    if (!quiet) {
      const unit = this.tensionUnit();
      for (const leg of next) {
        if (this.legs.includes(leg)) continue;
        const k = impulse(leg, 'apoyar', ring);
        this.tension.x += k.x * unit;
        this.tension.y -= k.y * unit;
      }
      for (const leg of this.legs) {
        if (next.includes(leg)) continue;
        const k = impulse(leg, 'soltar', ring);
        this.tension.x += k.x * unit;
        this.tension.y -= k.y * unit;
      }
    }
    this.legs = [...next];
  }

  /** Avanza un fotograma. Devuelve si queda algo por animar. */
  update(nowSeconds: number, dt: number, quiet: boolean): boolean {
    const o = this.options;
    this.object.visible = o.visible;
    if (!o.visible) return false;

    const span = this.span();
    const unit = this.tensionUnit();
    const restX = (o.position[0] - 0.5) * this.stage.width;
    const restY = (0.5 - o.position[1]) * this.stage.height;
    const topY = o.silkLength === 'top' ? this.stage.height / 2 + 0.05 : restY + o.silkLength * this.stage.height;
    // Pantalla: y hacia abajo. Mundo: y hacia arriba.
    const targetX = this.pullX * unit;
    const targetY = -this.pullY * unit;

    let busy = false;
    if (quiet) {
      this.entrance.value = 0;
      this.entrance.velocity = 0;
      this.lift.value = 0;
      this.lift.velocity = 0;
      this.tension.x = targetX;
      this.tension.y = targetY;
      this.tension.vx = 0;
      this.tension.vy = 0;
      stillAmbient(this.ambient);
    } else {
      const speed = Math.max(0.05, o.speed);
      if (o.entrance === 'none') this.entrance.value = 0;
      else smoothDamp(this.entrance, 0, o.entranceDuration / 2.5 / speed, dt);
      smoothDamp(this.lift, this.near ? MOTION.retreat * Math.min(2, o.motionIntensity) : 0, 0.5, dt);
      springInPlace(this.tension, targetX, targetY, dt);
      ambientAt(nowSeconds, o.motionIntensity, o.speed, this.ambient);
      busy = true;
    }

    const drop = this.stage.height / 2 + span * 1.2 - restY;
    const hang = Math.max(0.01, topY - restY);
    const x = restX + this.tension.x + Math.sin(this.ambient.sway) * hang;
    const y = restY + this.tension.y + (this.ambient.bob + this.lift.value) * span + this.entrance.value * drop;
    this.body.position.set(x, y, 0);

    // El cuerpo se alinea con su hilo: si la tensión lo desplaza, se inclina hacia el anclaje.
    const lean = Math.atan2(x - restX, Math.max(0.01, topY - y));
    this.body.rotation.set(o.rotation[0], o.rotation[1] + this.ambient.twist, o.rotation[2] + lean);

    let scale = span;
    const progress = (nowSeconds * 1000 - this.pressedAt) / MOTION.pressMs;
    if (!quiet && progress >= 0 && progress < 1) {
      scale *= pupil(progress);
      busy = true;
    }
    this.body.scale.setScalar(scale);

    const showSilk = o.silk && o.silkOpacity > 0;
    this.silk.line.visible = showSilk;
    if (showSilk) {
      this.body.updateMatrixWorld(true);
      this.attach.copy(this.attachLocal);
      this.model.localToWorld(this.attach);
      const chord = Math.max(1e-3, Math.hypot(this.attach.x - restX, topY - this.attach.y));
      this.silk.setOpacity(o.silkOpacity);
      this.silk.update(
        restX,
        topY,
        0,
        this.attach.x,
        this.attach.y,
        this.attach.z,
        o.silkSlack * chord,
        this.ambient.silkX * chord,
        this.ambient.silkZ * chord,
      );
    }
    return busy;
  }

  /** El modelo es de la plantilla compartida: aquí solo se libera la seda. */
  dispose(): void {
    this.body.remove(this.model);
    this.silk.dispose();
  }

  private span(): number {
    return SCENE.span * Math.min(this.stage.width, this.stage.height) * this.options.scale;
  }

  private tensionUnit(): number {
    return this.span() * 0.5 * MOTION.tensionReach;
  }
}
