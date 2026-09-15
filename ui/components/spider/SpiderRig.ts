import { Group, Vector3, type Object3D } from 'three';

import {
  alephState,
  impulse,
  legVector,
  RING,
  threadFrequency,
  type Ring,
  type Vec2,
} from '../../../lib/aleph/tension';
import { GRIP, MOTION, SCENE, SILK_ATTACH, THREAD, type SpiderOptions } from './spiderConfig';
import {
  ambientAt,
  clampSpeed,
  pupil,
  resistInPlace,
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

interface LegThread {
  silk: SpiderSilk;
  /** Dirección de la pata en el mundo (y hacia arriba), calculada una vez. */
  dx: number;
  dy: number;
  supported: boolean;
  /** Instante del último cambio, en segundos; −∞ si no debe vibrar. */
  changedAt: number;
  opacity: number;
}

const clamp = (value: number, low: number, high: number) => Math.min(high, Math.max(low, value));

/**
 * Una araña colgada de su hilo: el modelo, la seda, los hilos de las patas y
 * el movimiento. No sabe nada de React ni del render; la escena la actualiza
 * una vez por fotograma y ella no reserva memoria al hacerlo.
 *
 * La física de las patas no se calcula aquí: sale de `alephState()`,
 * `impulse()` y `threadFrequency()` de lib/aleph/tension.ts.
 *
 * Sujetarla y tirar de ella entran por `beginGrab`, `dragTo` y `release`, en
 * unidades de mundo. No hay muelle nuevo: el tirón es un destino más para el
 * mismo muelle que ya mueve la tensión del anillo. Mientras la mano sujeta, el
 * muelle se endurece hasta el amortiguamiento crítico y sigue al dedo sin
 * temblar; al soltar vuelven las constantes del anillo, que están poco
 * amortiguadas, y por eso el cuerpo pasa de largo, oscila y se para.
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
  /** 0 suelta, 1 sujeta: la compresión de tenerla cogida. */
  private readonly grip: Damped = { value: 0, velocity: 0 };
  private readonly tension: Spring2 = { x: 0, y: 0, vx: 0, vy: 0 };
  private readonly ambient: Ambient = { sway: 0, bob: 0, twist: 0, silkX: 0, silkZ: 0 };
  /** Vector de trabajo: la resistencia y el recorte escriben aquí, no reservan. */
  private readonly scratch: Vec2 = { x: 0, y: 0 };

  private options: SpiderOptions;
  private stage: StageMetrics = { width: 2, height: 2 };
  private ring: Ring = RING;
  private threads: LegThread[] = [];
  private legs: readonly number[] = [];
  /** Destino de la tensión, en radios de `alephState()` y ejes de pantalla. */
  private pullX = 0;
  private pullY = 0;
  private pressedAt = -Infinity;
  private near = false;
  /** La mano está encima. Mientras dure, el péndulo se apaga y el cuerpo se comprime. */
  private held = false;
  /** El tirón se mide desde donde empezó a arrastrarse, no desde el primer contacto. */
  private dragging = false;
  /** Un retroceso en marcha. Dura lo que tarda en pararse, y después se olvida. */
  private recoiling = false;
  private originX = 0;
  private originY = 0;
  /** Desplazamiento pedido por la mano, ya resistido, en unidades de mundo. */
  private dragX = 0;
  private dragY = 0;

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

  /**
   * Dónde está el cuerpo ahora mismo, en unidades de mundo. De solo lectura:
   * quien lo mueve es `update()`. Lo miran las pruebas, que comprueban el
   * recorrido entero —sujetar, tirar, soltar y volver— sin montar una escena.
   */
  get bodyPosition(): Readonly<Vector3> {
    return this.body.position;
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

  /**
   * La mano se posa. Comprime el cuerpo y, si el contacto cae fuera del centro,
   * lo aparta un poco del dedo: de ese desplazamiento sale la inclinación, sin
   * necesidad de girar nada a mano.
   */
  beginGrab(x: number, y: number): void {
    this.held = true;
    this.dragging = false;
    this.recoiling = false;
    const span = this.span();
    if (span <= 0) return;
    const offX = clamp((x - this.body.position.x) / span, -1, 1);
    const offY = clamp((y - this.body.position.y) / span, -1, 1);
    const nudge = span * GRIP.pressNudge;
    this.tension.vx -= offX * nudge;
    this.tension.vy -= offY * nudge;
  }

  /** La mano arrastra. El primer aviso fija el origen: cruzar el umbral no da un salto. */
  dragTo(x: number, y: number): void {
    if (!this.held) return;
    if (!this.dragging) {
      this.dragging = true;
      this.originX = x;
      this.originY = y;
    }
    resistInPlace(this.scratch, x - this.originX, y - this.originY, this.span() * GRIP.dragReach);
    this.dragX = this.scratch.x;
    this.dragY = this.scratch.y;
  }

  /**
   * La mano se levanta. El destino vuelve a ser el que dictan las patas y la
   * velocidad del gesto se suma a la del muelle, recortada: el retroceso es de
   * quien lo soltó, pero la araña sigue colgando de su hilo.
   */
  release(vx: number, vy: number): void {
    if (!this.held) return;
    this.held = false;
    this.dragging = false;
    this.recoiling = true;
    this.dragX = 0;
    this.dragY = 0;
    clampSpeed(this.scratch, vx, vy, this.span() * GRIP.maxSpeed);
    this.tension.vx += this.scratch.x * GRIP.releaseImpulse;
    this.tension.vy += this.scratch.y * GRIP.releaseImpulse;
  }

  /** Nueva selección: golpe hacia las patas que se apoyan, retroceso de las que se sueltan, y sus hilos. */
  setLegs(next: readonly number[], ringSize: number, quiet: boolean, nowSeconds: number): void {
    if (this.threads.length !== ringSize) this.buildThreads(ringSize);
    const ring = this.ring;
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

    this.threads.forEach((thread, leg) => {
      const supported = next.includes(leg);
      if (thread.supported === supported) return;
      thread.supported = supported;
      // Sin movimiento, o al cargar una URL compartida, el hilo aparece sin vibrar.
      thread.changedAt = quiet ? -Infinity : nowSeconds;
    });
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
    const targetX = this.pullX * unit + this.dragX;
    const targetY = -this.pullY * unit + this.dragY;

    let busy = this.held;
    if (quiet) {
      this.entrance.value = 0;
      this.entrance.velocity = 0;
      this.lift.value = 0;
      this.lift.velocity = 0;
      // Sin movimiento el tirón sigue funcionando: lo que desaparece es el recorrido.
      this.tension.x = targetX;
      this.tension.y = targetY;
      this.tension.vx = 0;
      this.tension.vy = 0;
      this.grip.value = this.held ? 1 : 0;
      this.grip.velocity = 0;
      this.recoiling = false;
      stillAmbient(this.ambient);
    } else {
      const speed = Math.max(0.05, o.speed);
      if (o.entrance === 'none') this.entrance.value = 0;
      else smoothDamp(this.entrance, 0, o.entranceDuration / 2.5 / speed, dt);
      smoothDamp(this.lift, this.near && !this.held ? MOTION.retreat * Math.min(2, o.motionIntensity) : 0, 0.5, dt);
      smoothDamp(this.grip, this.held ? 1 : 0, GRIP.pressSmooth, dt);
      if (this.held) {
        springInPlace(this.tension, targetX, targetY, dt, GRIP.holdStiffness, GRIP.holdDamping);
      } else if (this.recoiling) {
        springInPlace(this.tension, targetX, targetY, dt, GRIP.releaseStiffness, GRIP.releaseDamping);
        this.recoiling = !this.settled(targetX, targetY, span);
      } else {
        springInPlace(this.tension, targetX, targetY, dt);
      }
      // El péndulo se apaga mientras la mano sujeta: lo que se mece no está cogido.
      ambientAt(nowSeconds, o.motionIntensity * (1 - this.grip.value * GRIP.ambientHold), o.speed, this.ambient);
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

    let scale = span * (1 - this.grip.value * GRIP.pressDepth);
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
      // Alejarse del anclaje tensa la seda; acercarse la afloja. Es hilo, no varilla.
      const restSpan = Math.max(1e-3, topY - restY);
      const stretch = (Math.hypot(x - restX, topY - y) - restSpan) / restSpan;
      const taut = clamp(1 - stretch * GRIP.silkTaut, 0, 1.6);
      this.silk.setOpacity(o.silkOpacity);
      this.silk.update(
        restX,
        topY,
        0,
        this.attach.x,
        this.attach.y,
        this.attach.z,
        o.silkSlack * chord * taut,
        this.ambient.silkX * chord,
        this.ambient.silkZ * chord,
      );
    }

    return this.updateThreads(x, y, restX, restY, nowSeconds, dt, quiet) || busy;
  }

  /** El modelo es de la plantilla compartida: aquí solo se liberan los hilos. */
  dispose(): void {
    this.body.remove(this.model);
    this.silk.dispose();
    for (const thread of this.threads) thread.silk.dispose();
  }

  private buildThreads(ringSize: number): void {
    for (const thread of this.threads) {
      this.object.remove(thread.silk.line);
      thread.silk.dispose();
    }
    this.ring = { legs: ringSize, reach: RING.reach };
    this.threads = Array.from({ length: ringSize }, (_, leg) => {
      const direction = legVector(leg, this.ring);
      const silk = new SpiderSilk({ segments: 24, opacity: 0 });
      silk.line.visible = false;
      this.object.add(silk.line);
      return { silk, dx: direction.x, dy: -direction.y, supported: false, changedAt: -Infinity, opacity: 0 };
    });
  }

  private updateThreads(
    x: number,
    y: number,
    restX: number,
    restY: number,
    now: number,
    dt: number,
    quiet: boolean,
  ): boolean {
    // Largo de sobra para salir del escenario en cualquier dirección.
    const reach = Math.max(this.stage.width, this.stage.height);
    // Cuánto se ha ido el cuerpo de su sitio. Los hilos siguen prendidos donde estaban.
    const ux = x - restX;
    const uy = y - restY;
    let busy = false;

    for (let leg = 0; leg < this.threads.length; leg += 1) {
      const thread = this.threads[leg];
      const target = thread.supported ? THREAD.opacity : 0;
      if (quiet) thread.opacity = target;
      else thread.opacity += (target - thread.opacity) * Math.min(1, dt / (thread.supported ? THREAD.fadeIn : THREAD.fadeOut));

      if (thread.opacity <= 0.002) {
        thread.silk.line.visible = false;
        continue;
      }
      if (Math.abs(target - thread.opacity) > 0.002) busy = true;

      const age = now - thread.changedAt;
      let sway = 0;
      // Llevar el cuerpo hacia una pata afloja su hilo; alejarlo de ella lo tensa.
      let slack = (ux * thread.dx + uy * thread.dy) * GRIP.threadSag;
      if (!quiet && Number.isFinite(age)) {
        if (thread.supported) {
          const envelope = Math.exp(-age / THREAD.decay);
          if (envelope > 0.01) {
            sway = THREAD.amplitude * reach * envelope * Math.sin(2 * Math.PI * threadFrequency(leg, this.ring) * age);
            busy = true;
          }
        } else {
          slack += THREAD.slack * reach * Math.min(1, age / THREAD.fadeOut);
        }
      }

      thread.silk.setOpacity(thread.opacity);
      thread.silk.line.visible = this.options.silk;
      // El extremo lejano está prendido en la red, no en el animal: no viaja con él.
      thread.silk.update(x, y, 0, restX + thread.dx * reach, restY + thread.dy * reach, 0, slack, sway, 0);
    }
    return busy;
  }

  /** El retroceso se ha acabado: ni distancia al destino ni velocidad que valgan un fotograma. */
  private settled(targetX: number, targetY: number, span: number): boolean {
    return (
      Math.hypot(targetX - this.tension.x, targetY - this.tension.y) < span * 0.002 &&
      Math.hypot(this.tension.vx, this.tension.vy) < span * 0.02
    );
  }

  private span(): number {
    return SCENE.span * Math.min(this.stage.width, this.stage.height) * this.options.scale;
  }

  private tensionUnit(): number {
    return this.span() * 0.5 * MOTION.tensionReach;
  }
}
