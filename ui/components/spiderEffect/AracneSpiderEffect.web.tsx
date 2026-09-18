import { useEffect, useMemo, useRef, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { colors } from '../../theme';
import {
  ENTITY_EVENT,
  resolveEntityConfig,
  shouldRun,
  type AracneSpiderEffectProps,
  type EntityConfig,
  type EntityEnvironment,
  type EntityOverrides,
  type ZoneEvent,
  type ZoneKind,
} from './spiderEffectConfig';
import {
  bendOf,
  bridgeIndex,
  clamp,
  closestOnRect,
  createEntity,
  entrancePoint,
  hipOf,
  leanToward,
  linkAnchors,
  nearAfter,
  rectContains,
  rectDistance,
  scatterAnchors,
  setPointer,
  solveKnee,
  spinneretOf,
  splitQuad,
  stepEntity,
  threadControl,
  type Entity,
  type Rect,
  type Vec,
} from './spiderEffectMotion';

type Handlers = Pick<AracneSpiderEffectProps, 'onZoneEnter' | 'onZoneLeave' | 'linked'>;

/**
 * Una sola entidad por documento. Un segundo montaje —otra pantalla que la
 * pida, un efecto que React ejecute dos veces— no crea ni lienzo ni bucle.
 */
let owner: object | null = null;

const REDUCE = '(prefers-reduced-motion: reduce)';
const FINE = '(hover: hover) and (pointer: fine)';

/**
 * La entidad: lo que camina por la red detrás de quien lee. Reglas en
 * `docs/ENTIDAD.md`, cifras en `spiderEffectConfig.ts`, aritmética en
 * `spiderEffectMotion.ts`. Aquí solo hay lienzo, bucle y oyentes.
 *
 * No recibe eventos: el lienzo tiene `pointer-events: none` y está oculto a
 * los lectores de pantalla. No cambia el cursor, ni el `overflow`, ni el foco.
 */
export function AracneSpiderEffect({
  config: overrides,
  reduceMotion = false,
  onZoneEnter,
  onZoneLeave,
  linked,
}: AracneSpiderEffectProps) {
  // Una configuración escrita en línea cambia de identidad en cada render; su texto, no.
  const key = JSON.stringify(overrides ?? {});
  const config = useMemo(() => resolveEntityConfig(JSON.parse(key) as EntityOverrides), [key]);
  const env = useEnvironment();
  const run = shouldRun(config, { ...env, reduceMotion: reduceMotion || env.reduceMotion });
  const hostRef = useRef<View | null>(null);
  const handlers = useRef<Handlers>({ onZoneEnter, onZoneLeave, linked });

  useEffect(() => {
    handlers.current = { onZoneEnter, onZoneLeave, linked };
  }, [onZoneEnter, onZoneLeave, linked]);

  useEffect(() => {
    if (!run) return;
    const host = hostRef.current as unknown as HTMLElement | null;
    if (!host || owner) return;
    const token = {};
    owner = token;
    const stop = startEntity(host, config, handlers);
    return () => {
      stop();
      if (owner === token) owner = null;
    };
  }, [run, config]);

  if (!run) return null;
  return <View ref={hostRef} style={styles.host} aria-hidden />;
}

function readEnvironment(): EntityEnvironment {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
    return { reduceMotion: true, finePointer: false, width: 0 };
  }
  return {
    reduceMotion: window.matchMedia(REDUCE).matches,
    finePointer: window.matchMedia(FINE).matches,
    width: window.innerWidth,
  };
}

/** Lo que se sabe del navegador, y que puede cambiar sin recargar: el ratón, el ancho, la preferencia. */
function useEnvironment(): EntityEnvironment {
  const [env, setEnv] = useState(readEnvironment);
  useEffect(() => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return;
    const reduce = window.matchMedia(REDUCE);
    const fine = window.matchMedia(FINE);
    const update = () =>
      setEnv((previous) => {
        const next = readEnvironment();
        const same =
          next.reduceMotion === previous.reduceMotion &&
          next.finePointer === previous.finePointer &&
          next.width === previous.width;
        return same ? previous : next;
      });
    reduce.addEventListener('change', update);
    fine.addEventListener('change', update);
    window.addEventListener('resize', update);
    return () => {
      reduce.removeEventListener('change', update);
      fine.removeEventListener('change', update);
      window.removeEventListener('resize', update);
    };
  }, []);
  return env;
}

interface Zone extends Rect {
  el: Element;
  kind: ZoneKind | 'quiet' | 'avoid';
  id: string;
  near: boolean;
  dist: number;
}

interface Thread {
  zone: Zone | null;
  /**
   * De dónde nace. `null`: de la hilera de la entidad. Un nodo: de él, porque
   * el archivo declara el vínculo entre los dos y lo que se dibuja entonces no
   * es el alcance de la entidad, sino la red.
   */
  from: Zone | null;
  /** 0: recogido. 1: tendido del todo. */
  progress: number;
  attached: boolean;
  /** Desfase del vaivén, para que dos hilos no se mezan a la vez. */
  phase: number;
}

/** Lo que el cursor puede acercarse a una zona a evitar antes de que la entidad se retire. */
const AVOID_MARGIN = 24;
/** Si se ha movido más que esto desde la última vez que miró la página, vuelve a mirar. */
const SCAN_MOVE = 140;
/** Opacidades relativas. Todo se multiplica además por `look.intensity`. */
const LOOK = { web: 0.3, anchor: 0.45, leg: 0.85, thread: 0.55, outline: 0.5 } as const;
const TAU = Math.PI * 2;

function startEntity(host: HTMLElement, cfg: EntityConfig, handlers: { current: Handlers }): () => void {
  const doc = host.ownerDocument;
  const view = doc.defaultView;
  if (!view) return () => undefined;
  const win: Window & typeof globalThis = view;

  const canvas = doc.createElement('canvas');
  canvas.setAttribute('aria-hidden', 'true');
  canvas.setAttribute('data-aracne-entidad', '');
  Object.assign(canvas.style, {
    position: 'absolute',
    inset: '0',
    width: '100%',
    height: '100%',
    display: 'block',
    pointerEvents: 'none',
  });
  host.appendChild(canvas);
  const context = canvas.getContext('2d');
  if (!context) {
    canvas.remove();
    return () => undefined;
  }
  const ctx: CanvasRenderingContext2D = context;

  const ints = cfg.interactions;
  let width = 1;
  let height = 1;
  const origin = { x: 0, y: 0 };
  let anchors: Float32Array = new Float32Array(0);
  let pairs: Uint16Array = new Uint16Array(0);
  let entity: Entity | null = null;
  const pointer = { x: 0, y: 0, inside: false };
  /** Un gesto que empezó en una zona a evitar: mientras dure, la entidad no está. */
  let suppressed = false;
  let frame = 0;
  let timer = 0;
  let disposed = false;
  let last = performance.now();
  let pageVisible = doc.visibilityState !== 'hidden';
  let zones: Zone[] = [];
  let rescan = true;
  let remeasure = false;
  let scannedAt = -Infinity;
  const scannedFrom = { x: 0, y: 0 };
  const threads: Thread[] = Array.from({ length: Math.max(0, cfg.threads.max) }, (_, i) => ({
    zone: null,
    from: null,
    progress: 0,
    attached: false,
    phase: i * 1.7,
  }));
  const candidates: Zone[] = [];
  // Los ids de los candidatos, en el mismo orden: se rellena cada fotograma y no se reserva otro.
  const candidateIds: string[] = [];
  // La caja de lo pintado: al fotograma siguiente solo se borra eso, no la ventana entera.
  const box = { x0: 0, y0: 0, x1: 0, y1: 0, used: false };
  const painted = { x0: 0, y0: 0, x1: 0, y1: 0, used: false };
  const p1: Vec = { x: 0, y: 0 };
  const p2: Vec = { x: 0, y: 0 };
  const p3: Vec = { x: 0, y: 0 };
  const p4: Vec = { x: 0, y: 0 };
  const p5: Vec = { x: 0, y: 0 };
  const p6: Vec = { x: 0, y: 0 };

  const selector = [
    cfg.zones.avoid,
    cfg.zones.quiet,
    ints.threads || ints.proximity ? cfg.zones.node : '',
    ints.proximity ? cfg.zones.interactive : '',
  ]
    .filter(Boolean)
    .join(',');

  // ── El bucle ─────────────────────────────────────────────────────────────

  const request = () => {
    if (frame !== 0 || disposed || !pageVisible || !entity) return;
    if (timer !== 0) {
      win.clearTimeout(timer);
      timer = 0;
    }
    frame = win.requestAnimationFrame(tick);
  };

  /** Entre dos sacudidas no hay nada que dibujar: se espera con un temporizador, no con fotogramas vacíos. */
  const wakeIn = (ms: number) => {
    if (frame !== 0 || timer !== 0 || disposed || !pageVisible) return;
    timer = win.setTimeout(
      () => {
        timer = 0;
        last = performance.now();
        request();
      },
      Math.max(16, ms),
    );
  };

  function tick(now: number) {
    frame = 0;
    if (disposed || !entity) return;
    const dt = Math.min(0.05, Math.max(0, (now - last) / 1000));
    last = now;
    const travelled = Math.hypot(entity.pos.x - scannedFrom.x, entity.pos.y - scannedFrom.y);
    if (rescan || travelled > SCAN_MOVE || now - scannedAt > cfg.zones.rescanMs) scan(now);
    else if (remeasure) measure();
    sense();
    const busy = stepEntity(entity, cfg, dt, now);
    const weaving = stepThreads(dt);
    draw(now);
    if (busy || weaving) request();
    else if (entity.idle && !entity.asleep) wakeIn(entity.nextTwitch - now);
  }

  // ── La página: qué hay cerca ─────────────────────────────────────────────

  /** Lo que se pinta antes que la entidad —el armazón— está debajo de ella. Cajones y paleta, encima. */
  const below = (el: Element) =>
    (host.compareDocumentPosition(el) & win.Node.DOCUMENT_POSITION_PRECEDING) !== 0 && !el.contains(host);

  /** Nada lo tapa en su centro: un cajón abierto o su velo lo esconden de la entidad. */
  const uncovered = (el: Element, rect: DOMRect) => {
    const x = clamp(rect.left + rect.width / 2, 0, win.innerWidth - 1);
    const y = clamp(rect.top + rect.height / 2, 0, win.innerHeight - 1);
    const hit = doc.elementFromPoint(x, y);
    return hit !== null && (hit === el || el.contains(hit));
  };

  const kindOf = (el: Element): Zone['kind'] | null => {
    if (el.matches(cfg.zones.avoid)) return 'avoid';
    if (el.matches(cfg.zones.quiet)) return 'quiet';
    // Lo que está dentro de una zona a evitar no atrae: el botón de la araña es de la araña.
    if (el.closest(cfg.zones.avoid)) return null;
    if ((ints.threads || ints.proximity) && el.matches(cfg.zones.node)) return 'node';
    if (ints.proximity && el.matches(cfg.zones.interactive)) return 'interactive';
    return null;
  };

  const idOf = (el: Element) =>
    el.getAttribute('data-aracne-node') ??
    el.getAttribute('aria-label') ??
    (el.textContent ?? '').trim().slice(0, 48);

  function scan(now: number) {
    scannedAt = now;
    rescan = false;
    remeasure = false;
    if (!entity) return;
    scannedFrom.x = entity.pos.x;
    scannedFrom.y = entity.pos.y;
    const reach = Math.max(cfg.threads.radius, cfg.proximity.release) + SCAN_MOVE * 2;
    const previous = new Map<Element, Zone>();
    for (const zone of zones) previous.set(zone.el, zone);
    const next: Zone[] = [];
    const found = selector ? doc.querySelectorAll(selector) : [];
    for (let i = 0; i < found.length && next.length < cfg.zones.maxZones; i += 1) {
      const el = found[i];
      if (!below(el)) continue;
      const kind = kindOf(el);
      if (kind === null) continue;
      const rect = el.getBoundingClientRect();
      if (rect.width === 0 || rect.height === 0) continue;
      const x = rect.left - origin.x;
      const y = rect.top - origin.y;
      if (x > width || y > height || x + rect.width < 0 || y + rect.height < 0) continue;
      const touchable = kind === 'node' || kind === 'interactive';
      if (touchable && rectDistance(entity.pos.x, entity.pos.y, { x, y, w: rect.width, h: rect.height }) > reach) {
        continue;
      }
      if (touchable && !uncovered(el, rect)) continue;
      const old = previous.get(el);
      if (old) {
        previous.delete(el);
        old.x = x;
        old.y = y;
        old.w = rect.width;
        old.h = rect.height;
        old.kind = kind;
        next.push(old);
      } else {
        next.push({ el, kind, id: idOf(el), x, y, w: rect.width, h: rect.height, near: false, dist: Infinity });
      }
    }
    // Lo que se fue estando cerca se despide, y los hilos que iban hacia ello se recogen.
    for (const gone of previous.values()) {
      if (gone.near) emit('leave', gone);
      for (const thread of threads) {
        // Si se fue aquello de lo que nacía, el hilo vuelve a nacer de la entidad.
        if (thread.from === gone) thread.from = null;
        if (thread.zone === gone) {
          thread.zone = null;
          thread.from = null;
          thread.progress = 0;
          thread.attached = false;
        }
      }
    }
    zones = next;
  }

  /** Tras un scroll las cosas se han movido, pero son las mismas: basta con volver a medirlas. */
  function measure() {
    remeasure = false;
    for (const zone of zones) {
      if (!zone.el.isConnected) {
        zone.w = 0;
        zone.h = 0;
        continue;
      }
      const rect = zone.el.getBoundingClientRect();
      zone.x = rect.left - origin.x;
      zone.y = rect.top - origin.y;
      zone.w = rect.width;
      zone.h = rect.height;
    }
  }

  function emit(type: 'enter' | 'leave', zone: Zone) {
    if (zone.kind !== 'node' && zone.kind !== 'interactive') return;
    const detail: ZoneEvent = { type, kind: zone.kind, id: zone.id, element: zone.el };
    const handler = type === 'enter' ? handlers.current.onZoneEnter : handlers.current.onZoneLeave;
    handler?.(detail);
    win.dispatchEvent(new CustomEvent<ZoneEvent>(ENTITY_EVENT, { detail }));
  }

  /** Qué nota, hacia qué se inclina, hacia qué tiende hilos y cuánto se deja ver. */
  function sense() {
    const e = entity;
    if (!e) return;
    let nearest: Zone | null = null;
    let nearestDistance = Infinity;
    let quiet = false;
    let avoid = suppressed;
    candidates.length = 0;
    for (const zone of zones) {
      if (zone.w === 0) continue;
      if (zone.kind === 'quiet') {
        if (pointer.inside && rectContains(zone, pointer.x, pointer.y)) quiet = true;
        continue;
      }
      if (zone.kind === 'avoid') {
        if (pointer.inside && rectContains(zone, pointer.x, pointer.y, AVOID_MARGIN)) avoid = true;
        continue;
      }
      const distance = rectDistance(e.pos.x, e.pos.y, zone);
      zone.dist = distance;
      if (ints.proximity) {
        const near = nearAfter(zone.near, distance, cfg.proximity.radius, cfg.proximity.release);
        if (near !== zone.near) {
          zone.near = near;
          emit(near ? 'enter' : 'leave', zone);
        }
        if (near && distance < nearestDistance) {
          nearest = zone;
          nearestDistance = distance;
        }
      }
      if (ints.threads && zone.kind === 'node' && distance <= cfg.threads.radius) candidates.push(zone);
    }
    if (nearest && !avoid) {
      closestOnRect(e.pos.x, e.pos.y, nearest, p1);
      leanToward(e.pos, p1, cfg.proximity.lean, cfg.proximity.leanMax, e.lean);
    } else {
      e.lean.x = 0;
      e.lean.y = 0;
    }
    e.alphaTarget = avoid ? 0 : quiet ? cfg.look.quietIntensity / Math.max(0.001, cfg.look.intensity) : 1;
    weave();
  }

  /**
   * Los hilos van a los nodos más cercanos. Un hilo no salta de un nodo a
   * otro: se recoge y otro se tiende.
   *
   * Y si el archivo declara el vínculo entre dos de los nodos que tiene
   * cogidos, el segundo hilo no sale de la entidad: sale del primero. Lo que
   * se dibuja entonces no es hasta dónde llega ella, sino lo que une a esas
   * dos entradas, que ya estaba ahí.
   */
  function weave() {
    candidates.sort((a, b) => a.dist - b.dist);
    for (const thread of threads) thread.attached = false;
    const wanted = Math.min(candidates.length, threads.length);
    const linked = handlers.current.linked;
    candidateIds.length = 0;
    for (let i = 0; i < wanted; i += 1) candidateIds.push(candidates[i].id);
    for (let i = 0; i < wanted; i += 1) {
      const zone = candidates[i];
      let slot: Thread | null = null;
      for (const thread of threads) {
        if (thread.zone === zone) slot = thread;
      }
      if (!slot) {
        for (const thread of threads) {
          if (!slot && (thread.zone === null || (thread.progress === 0 && !thread.attached))) slot = thread;
        }
        if (slot) {
          slot.zone = zone;
          slot.progress = 0;
        }
      }
      if (!slot) continue;
      slot.attached = true;
      slot.from = linked ? hangFrom(i, linked) : null;
    }
  }

  /**
   * De qué nodo cuelga el hilo del candidato `i`, o `null` si de la entidad.
   * Solo cuelga de uno que a su vez tenga hilo: si no, nacería suelto en medio
   * de la página. Como se mira hacia atrás en el orden de distancia, el más
   * cercano siempre queda cogido a la entidad y no hay manera de hacer un ciclo.
   */
  function hangFrom(index: number, linked: (a: string, b: string) => boolean): Zone | null {
    const bridge = bridgeIndex(candidateIds, index, linked);
    if (bridge < 0) return null;
    const anchor = candidates[bridge];
    for (const thread of threads) if (thread.zone === anchor && thread.attached) return anchor;
    return null;
  }

  function stepThreads(dt: number): boolean {
    let busy = false;
    const rate = (dt * 1000 * cfg.motion.speed) / Math.max(1, cfg.threads.attachMs);
    for (const thread of threads) {
      if (!thread.zone) continue;
      thread.progress = thread.attached
        ? Math.min(1, thread.progress + rate)
        : Math.max(0, thread.progress - rate * 1.6);
      if (!thread.attached && thread.progress === 0) {
        thread.zone = null;
        thread.from = null;
        continue;
      }
      if (thread.progress > 0 && thread.progress < 1) busy = true;
    }
    return busy;
  }

  // ── El dibujo ────────────────────────────────────────────────────────────

  const include = (x: number, y: number, pad: number) => {
    if (!box.used) {
      box.x0 = x - pad;
      box.y0 = y - pad;
      box.x1 = x + pad;
      box.y1 = y + pad;
      box.used = true;
      return;
    }
    if (x - pad < box.x0) box.x0 = x - pad;
    if (y - pad < box.y0) box.y0 = y - pad;
    if (x + pad > box.x1) box.x1 = x + pad;
    if (y + pad > box.y1) box.y1 = y + pad;
  };

  function draw(now: number) {
    if (painted.used) {
      ctx.clearRect(painted.x0 - 2, painted.y0 - 2, painted.x1 - painted.x0 + 4, painted.y1 - painted.y0 + 4);
    }
    box.used = false;
    const e = entity;
    const alpha = e ? cfg.look.intensity * e.alpha : 0;
    if (e && alpha > 0.003) {
      ctx.strokeStyle = colors[cfg.look.color];
      ctx.fillStyle = colors[cfg.look.color];
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      if (ints.web) drawWeb(e, alpha);
      drawThreads(e, alpha, now);
      drawLegs(e, alpha);
      drawBody(e, alpha);
      ctx.globalAlpha = 1;
    }
    painted.x0 = box.x0;
    painted.y0 = box.y0;
    painted.x1 = box.x1;
    painted.y1 = box.y1;
    painted.used = box.used;
  }

  /** La tela está en toda la ventana, pero solo se ve alrededor de ella. */
  function drawWeb(e: Entity, alpha: number) {
    const reveal = cfg.web.reveal;
    const c = ctx;
    c.lineWidth = cfg.look.threadWidth;
    for (let p = 0; p < pairs.length; p += 2) {
      const i = pairs[p];
      const j = pairs[p + 1];
      const x1 = anchors[2 * i];
      const y1 = anchors[2 * i + 1];
      const x2 = anchors[2 * j];
      const y2 = anchors[2 * j + 1];
      const distance = Math.hypot((x1 + x2) / 2 - e.pos.x, (y1 + y2) / 2 - e.pos.y);
      if (distance >= reveal) continue;
      const fall = 1 - distance / reveal;
      c.globalAlpha = alpha * LOOK.web * fall * fall;
      c.beginPath();
      c.moveTo(x1, y1);
      c.lineTo(x2, y2);
      c.stroke();
      include(x1, y1, 1);
      include(x2, y2, 1);
    }
    for (let i = 0; i < anchors.length; i += 2) {
      const distance = Math.hypot(anchors[i] - e.pos.x, anchors[i + 1] - e.pos.y);
      if (distance >= reveal) continue;
      const fall = 1 - distance / reveal;
      c.globalAlpha = alpha * LOOK.anchor * fall * fall;
      c.fillRect(anchors[i] - 0.75, anchors[i + 1] - 0.75, 1.5, 1.5);
      include(anchors[i], anchors[i + 1], 1);
    }
  }

  function drawThreads(e: Entity, alpha: number, now: number) {
    const c = ctx;
    const spinneret = spinneretOf(e, cfg, p1);
    const speed = Math.hypot(e.vel.x, e.vel.y);
    c.lineWidth = cfg.look.threadWidth;
    for (const thread of threads) {
      if (!thread.zone || thread.progress <= 0) continue;
      // Un hilo nace en la hilera de la entidad, o en el nodo con el que el archivo declara el vínculo.
      const from = thread.from
        ? closestOnRect(thread.zone.x + thread.zone.w / 2, thread.zone.y + thread.zone.h / 2, thread.from, p6)
        : spinneret;
      const to = closestOnRect(from.x, from.y, thread.zone, p2);
      // Solo se mece mientras ella se mueve: quieta, el hilo está quieto.
      const sway = Math.sin((now / 1000) * 1.3 + thread.phase) * Math.min(3, speed / 300);
      const control = threadControl(from, to, cfg.threads.sag, sway, p3);
      splitQuad(from, control, to, thread.progress, p4, p5);
      c.globalAlpha = alpha * LOOK.thread * (thread.attached ? 1 : thread.progress);
      c.beginPath();
      c.moveTo(from.x, from.y);
      c.quadraticCurveTo(p4.x, p4.y, p5.x, p5.y);
      c.stroke();
      include(from.x, from.y, 2);
      include(p4.x, p4.y, 2);
      include(p5.x, p5.y, 2);
      if (thread.progress >= 1) {
        // Donde se prende: un punto, nada más. Si nace en un nodo, está prendido de los dos lados.
        c.globalAlpha = alpha * LOOK.anchor;
        c.fillRect(to.x - 1, to.y - 1, 2, 2);
        if (thread.from) c.fillRect(from.x - 1, from.y - 1, 2, 2);
      }
    }
  }

  function drawLegs(e: Entity, alpha: number) {
    const c = ctx;
    c.globalAlpha = alpha * LOOK.leg;
    c.lineWidth = cfg.look.lineWidth;
    c.beginPath();
    for (const leg of e.legs) {
      const hip = hipOf(e, leg, cfg, p1);
      const knee = solveKnee(hip, leg.foot, cfg.body.femur, cfg.body.tibia, bendOf(leg), p2);
      c.moveTo(hip.x, hip.y);
      c.lineTo(knee.x, knee.y);
      c.lineTo(leg.foot.x, leg.foot.y);
      include(knee.x, knee.y, 2);
      include(leg.foot.x, leg.foot.y, 2);
    }
    c.stroke();
  }

  /** Casi del color del fondo, con un contorno que apenas se ve: se nota más por lo que tapa que por lo que es. */
  function drawBody(e: Entity, alpha: number) {
    const c = ctx;
    const r = cfg.body.size;
    const back = r * 1.7;
    const ax = e.pos.x - Math.cos(e.heading) * back;
    const ay = e.pos.y - Math.sin(e.heading) * back;
    c.globalAlpha = alpha;
    c.fillStyle = colors[cfg.look.body];
    c.beginPath();
    c.ellipse(ax, ay, r * 1.45, r * 1.1, e.heading, 0, TAU);
    c.fill();
    c.beginPath();
    c.arc(e.pos.x, e.pos.y, r, 0, TAU);
    c.fill();
    c.globalAlpha = alpha * LOOK.outline;
    c.lineWidth = cfg.look.lineWidth * 0.8;
    c.beginPath();
    c.ellipse(ax, ay, r * 1.45, r * 1.1, e.heading, 0, TAU);
    c.stroke();
    c.beginPath();
    c.arc(e.pos.x, e.pos.y, r, 0, TAU);
    c.stroke();
    c.fillStyle = colors[cfg.look.color];
    include(ax, ay, r * 2);
    include(e.pos.x, e.pos.y, r * 2);
  }

  // ── Tamaño y densidad ────────────────────────────────────────────────────

  const resize = () => {
    const rect = host.getBoundingClientRect();
    width = Math.max(1, rect.width);
    height = Math.max(1, rect.height);
    origin.x = rect.left;
    origin.y = rect.top;
    const dpr = Math.min(win.devicePixelRatio || 1, cfg.device.maxDpr);
    // Cambiar el tamaño del lienzo lo deja en blanco: no queda nada que borrar.
    canvas.width = Math.round(width * dpr);
    canvas.height = Math.round(height * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    painted.used = false;
    if (ints.web) {
      anchors = scatterAnchors(cfg.web.particles, width, height, cfg.seed);
      pairs = linkAnchors(anchors, cfg.web.link);
    }
    remeasure = true;
    request();
  };
  const resizeObserver = new ResizeObserver(resize);
  resizeObserver.observe(host);

  // La densidad de píxeles cambia al pasar la ventana a otra pantalla, sin que cambie el tamaño.
  let dprQuery: MediaQueryList | null = null;
  const onDpr = () => {
    resize();
    watchDpr();
  };
  const watchDpr = () => {
    dprQuery?.removeEventListener('change', onDpr);
    dprQuery = win.matchMedia?.(`(resolution: ${win.devicePixelRatio || 1}dppx)`) ?? null;
    dprQuery?.addEventListener('change', onDpr);
  };
  watchDpr();
  resize();

  // ── Oyentes: todos pasivos, ninguno captura nada ─────────────────────────

  const onPointerMove = (event: PointerEvent) => {
    if (event.pointerType === 'touch') return;
    const x = event.clientX - origin.x;
    const y = event.clientY - origin.y;
    pointer.x = x;
    pointer.y = y;
    pointer.inside = true;
    const now = performance.now();
    if (!entity) {
      // Entra desde fuera, por el borde más cercano, y camina hasta la mano.
      const start = entrancePoint(x, y, width, height);
      entity = createEntity(cfg, start.x, start.y, now);
      entity.pointer.x = x;
      entity.pointer.y = y;
      rescan = true;
      last = now;
    }
    setPointer(entity, x, y, now, ints.follow);
    request();
  };

  const onPointerDown = (event: PointerEvent) => {
    const target = event.target as Element | null;
    if (target && typeof target.closest === 'function' && target.closest(cfg.zones.avoid)) {
      suppressed = true;
      request();
    }
  };

  const onPointerUp = () => {
    if (!suppressed) return;
    suppressed = false;
    request();
  };

  // Al salir el cursor de la ventana se queda donde lo perdió. No se va.
  const onMouseOut = (event: MouseEvent) => {
    if (event.relatedTarget !== null) return;
    pointer.inside = false;
    request();
  };

  const onScroll = () => {
    remeasure = true;
    request();
  };

  const onVisibility = () => {
    pageVisible = doc.visibilityState !== 'hidden';
    if (!pageVisible) {
      if (frame !== 0) win.cancelAnimationFrame(frame);
      if (timer !== 0) win.clearTimeout(timer);
      frame = 0;
      timer = 0;
      return;
    }
    last = performance.now();
    request();
  };

  win.addEventListener('pointermove', onPointerMove, { passive: true });
  win.addEventListener('pointerdown', onPointerDown, { capture: true, passive: true });
  win.addEventListener('pointerup', onPointerUp, { capture: true, passive: true });
  win.addEventListener('pointercancel', onPointerUp, { capture: true, passive: true });
  // El scroll no burbujea: se oye en captura desde cualquier columna que se recorra.
  win.addEventListener('scroll', onScroll, { capture: true, passive: true });
  doc.addEventListener('mouseout', onMouseOut, { passive: true });
  doc.addEventListener('visibilitychange', onVisibility);

  // Solo en desarrollo: moverla y avanzarla a mano donde `requestAnimationFrame` no corre.
  type Debug = {
    step: (frames?: number, frameMs?: number) => void;
    move: (x: number, y: number) => void;
    estado: () => unknown;
  };
  const debugHost = win as unknown as { __aracneEntidad?: Debug };
  if (__DEV__) {
    debugHost.__aracneEntidad = {
      step: (frames = 1, frameMs = 1000 / 60) => {
        for (let i = 0; i < frames; i += 1) {
          if (frame !== 0) win.cancelAnimationFrame(frame);
          frame = 0;
          tick(last + frameMs);
        }
      },
      move: (x, y) =>
        onPointerMove({ pointerType: 'mouse', clientX: x + origin.x, clientY: y + origin.y } as PointerEvent),
      estado: () =>
        entity && {
          x: Math.round(entity.pos.x),
          y: Math.round(entity.pos.y),
          alpha: Number(entity.alpha.toFixed(3)),
          idle: entity.idle,
          asleep: entity.asleep,
          zonas: zones.length,
          cerca: zones.filter((zone) => zone.near).map((zone) => zone.id),
          hilos: threads
            .filter((thread) => thread.zone)
            .map((thread) => ({
              id: thread.zone?.id,
              de: thread.from?.id ?? 'entidad',
              progreso: Number(thread.progress.toFixed(2)),
            })),
          bucle: frame !== 0 ? 'fotograma' : timer !== 0 ? 'temporizador' : 'parado',
          rumbo: Number(entity.heading.toFixed(3)),
          patas: entity.legs.map((leg) => {
            const hip = hipOf(entity!, leg, cfg, { x: 0, y: 0 });
            const knee = solveKnee(hip, leg.foot, cfg.body.femur, cfg.body.tibia, bendOf(leg), { x: 0, y: 0 });
            return {
              lado: leg.side,
              n: leg.index,
              cadera: [Math.round(hip.x), Math.round(hip.y)],
              rodilla: [Math.round(knee.x), Math.round(knee.y)],
              pie: [Math.round(leg.foot.x), Math.round(leg.foot.y)],
            };
          }),
        },
    };
  }

  return () => {
    disposed = true;
    if (frame !== 0) win.cancelAnimationFrame(frame);
    if (timer !== 0) win.clearTimeout(timer);
    frame = 0;
    timer = 0;
    resizeObserver.disconnect();
    dprQuery?.removeEventListener('change', onDpr);
    win.removeEventListener('pointermove', onPointerMove);
    win.removeEventListener('pointerdown', onPointerDown, true);
    win.removeEventListener('pointerup', onPointerUp, true);
    win.removeEventListener('pointercancel', onPointerUp, true);
    win.removeEventListener('scroll', onScroll, true);
    doc.removeEventListener('mouseout', onMouseOut);
    doc.removeEventListener('visibilitychange', onVisibility);
    // Quien escuchaba no se queda creyendo que sigue cerca.
    for (const zone of zones) if (zone.near) emit('leave', zone);
    zones = [];
    if (__DEV__) delete debugHost.__aracneEntidad;
    canvas.remove();
  };
}

const styles = StyleSheet.create({
  host: { position: 'absolute', top: 0, right: 0, bottom: 0, left: 0, pointerEvents: 'none' },
});
