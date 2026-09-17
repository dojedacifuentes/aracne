import { useEffect, useRef, useState, type ReactNode } from 'react';
import { Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { useFocusRing } from '../hooks/useFocusRing';
import { colors, fonts, HIT_SIZE, machine, space } from '../theme';
import { Sigil } from './Sigil';

/** Ancho de la columna de secciones. El centro se queda con todo lo demás. */
export const NAV_WIDTH = 236;

/**
 * Cuánto ancho quiere el centro. No es decoración: es la diferencia entre una
 * ficha que se lee y un mapa que se mira.
 *
 * - `lectura`: una columna editorial centrada en el hueco. Antes se quedaba
 *   pegada a la izquierda con seiscientos píxeles de negro a la derecha.
 * - `lista`: ancha, pero con tope; una lista de mil filas de pared a pared no
 *   se recorre con los ojos.
 * - `instrumento`: todo el ancho disponible. El mapa es el contenido.
 */
export type Measure = 'lectura' | 'lista' | 'instrumento';

const MAX_WIDTH: Record<Measure, number | undefined> = {
  lectura: 980,
  lista: 1320,
  instrumento: undefined,
};

export interface ShellItem {
  id: string;
  label: string;
  /** Una línea en mono bajo la etiqueta. Lo que hace, no lo que promete. */
  hint?: string;
  onPress: () => void;
  active?: boolean;
}

export interface ShellGroup {
  label: string;
  items: ShellItem[];
}

type Props = {
  groups: ShellGroup[];
  /** Cabecera de la columna central. */
  title: string;
  meta: string;
  /** La barra de estado de la derecha de la cabecera: cifras de la máquina. */
  status?: string;
  /**
   * Lo que vive al lado del estado y no depende de la ruta: hoy, el
   * conmutador del sonido. Va en la cabecera y no al pie porque al pie está
   * lo que se hace con esta pantalla, y esto es de toda la consola.
   */
  tools?: ReactNode;
  /** Lo que ocupa el centro. */
  children: ReactNode;
  measure?: Measure;
  /**
   * Instrumento contextual como **columna**. Solo se usa donde sobra ancho de
   * verdad; el resto del tiempo el instrumento es un `Drawer` superpuesto y
   * aquí no hay nada. Ninguna ruta reserva ancho por tenerlo disponible.
   */
  aside?: ReactNode;
  /** Botonera al pie del centro. */
  footer?: ReactNode;
  /** Pantalla estrecha: todo se apila. */
  compact: boolean;
};

/** El nodo del DOM de un `ScrollView`, en web. En nativo no hay tal cosa. */
function scrollNode(ref: { current: ScrollView | null }): HTMLElement | null {
  if (Platform.OS !== 'web') return null;
  const vista = ref.current as unknown as { getScrollableNode?: () => unknown } | null;
  const nodo = vista?.getScrollableNode?.();
  return typeof HTMLElement !== 'undefined' && nodo instanceof HTMLElement ? nodo : null;
}

/**
 * ¿Hay alguna caja entre `desde` y `hasta` que pueda moverse en ese sentido?
 * Sirve para no robarle la rueda a quien sí la estaba usando: un cajón abierto
 * tiene su propio recorrido y debe quedárselo.
 */
function alguienLaUsa(desde: EventTarget | null, hasta: HTMLElement, delta: number): boolean {
  let nodo = desde instanceof HTMLElement ? desde : null;
  while (nodo && nodo !== hasta) {
    const estilo = window.getComputedStyle(nodo);
    if (/(auto|scroll)/.test(estilo.overflowY) && nodo.scrollHeight > nodo.clientHeight) {
      const sitioArriba = nodo.scrollTop > 0;
      const sitioAbajo = nodo.scrollTop + nodo.clientHeight < nodo.scrollHeight - 1;
      if (delta < 0 ? sitioArriba : sitioAbajo) return true;
    }
    nodo = nodo.parentElement;
  }
  return false;
}

/**
 * El recorrido del centro para quien no está justo encima.
 *
 * Cada columna tiene el suyo, así que la rueda solo movía el contenido con el
 * cursor sobre él: sobre el menú de la izquierda, sobre la cabecera o sobre el
 * pie no pasaba nada. Aquí el centro recoge la rueda que ninguna otra columna
 * ha usado, y se le añaden las teclas de página, que en un `ScrollView` no
 * existen. Solo en web: en nativo el gesto ya es del sistema.
 */
function useRecorridoCentral(raiz: { current: View | null }, centro: { current: ScrollView | null }) {
  useEffect(() => {
    if (Platform.OS !== 'web') return;
    const caja = raiz.current as unknown as HTMLElement | null;
    const lienzo = scrollNode(centro);
    if (!caja || !lienzo) return;

    const onWheel = (event: WheelEvent) => {
      if (event.ctrlKey || event.metaKey) return;
      if (lienzo.contains(event.target as Node)) return;
      if (alguienLaUsa(event.target, caja, event.deltaY)) return;
      lienzo.scrollTop += event.deltaY;
      event.preventDefault();
    };

    const onKey = (event: KeyboardEvent) => {
      const destino = event.target as HTMLElement | null;
      // Escribiendo en un campo, las teclas son del campo.
      if (destino && (destino.tagName === 'INPUT' || destino.tagName === 'TEXTAREA' || destino.isContentEditable)) {
        return;
      }
      const salto = lienzo.clientHeight * 0.9;
      if (event.key === 'PageDown') lienzo.scrollTop += salto;
      else if (event.key === 'PageUp') lienzo.scrollTop -= salto;
      else if (event.key === 'Home') lienzo.scrollTop = 0;
      else if (event.key === 'End') lienzo.scrollTop = lienzo.scrollHeight;
      else return;
      event.preventDefault();
    };

    caja.addEventListener('wheel', onWheel, { passive: false });
    window.addEventListener('keydown', onKey);
    return () => {
      caja.removeEventListener('wheel', onWheel);
      window.removeEventListener('keydown', onKey);
    };
  }, [raiz, centro]);
}

/**
 * El armazón de la aplicación: **secciones a la izquierda y contenido en el
 * centro**. No hay tercera columna por defecto.
 *
 * La consola de la fase 15 traía una columna derecha permanente de 310 px con
 * las once patas, estuviera uno leyendo una ficha o mirando un mapa. Eso es
 * ancho cobrado por adelantado a un instrumento que casi nunca se usaba en esa
 * pantalla. Ahora el instrumento aparece cuando se pide —`Drawer`— y el ancho
 * se lo lleva el contenido, que es lo que se venía a ver.
 *
 * El aire es el de una consola: etiquetas en mono y versales, filetes de un
 * píxel, y el frío del instrumento (`machine`) para todo lo que se puede
 * tocar. La regla de la excepción de `docs/DESIGN.md` sigue en pie: **el frío
 * es de lo interactivo y el cálido es del contenido**.
 */
export function Shell({
  groups,
  title,
  meta,
  status,
  tools,
  children,
  measure = 'lista',
  aside,
  footer,
  compact,
}: Props) {
  const raiz = useRef<View | null>(null);
  const centro = useRef<ScrollView | null>(null);
  useRecorridoCentral(raiz, centro);

  const tope = MAX_WIDTH[measure];
  const caja = [styles.caja, tope ? { maxWidth: tope } : null];

  if (compact) {
    return (
      <View ref={raiz} style={styles.stack}>
        <View style={styles.headCompact}>
          <View style={styles.headRow}>
            <View style={styles.headText}>
              <Text style={styles.title}>{title}</Text>
              <Text style={styles.meta}>{meta}</Text>
            </View>
            {tools}
          </View>
        </View>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.navScroll}
          contentContainerStyle={styles.navRow}
        >
          {groups.flatMap((group) => group.items).map((item) => (
            <NavItem key={item.id} item={item} compact />
          ))}
        </ScrollView>
        <ScrollView ref={centro} style={styles.centerCompact} contentContainerStyle={styles.centerContent}>
          {children}
          {aside ? <View style={styles.asideCompact}>{aside}</View> : null}
        </ScrollView>
        {footer ? <View style={styles.footerCompact}>{footer}</View> : null}
      </View>
    );
  }

  return (
    <View ref={raiz} style={styles.columns}>
      <View style={styles.nav}>
        <View style={styles.brand}>
          <Sigil mark="aracne" size={30} />
          <View style={styles.brandText}>
            <Text style={styles.brandName}>aracne</Text>
            <Text style={styles.brandMeta}>archivo sin firma</Text>
          </View>
        </View>
        <ScrollView contentContainerStyle={styles.navContent}>
          {groups.map((group) => (
            <View key={group.label} style={styles.group}>
              <Text style={styles.groupLabel}>{group.label}</Text>
              {group.items.map((item) => (
                <NavItem key={item.id} item={item} compact={false} />
              ))}
            </View>
          ))}
        </ScrollView>
      </View>

      <View style={styles.center}>
        <View style={styles.head}>
          <View style={styles.headText}>
            <Text style={styles.title} numberOfLines={1}>
              {title}
            </Text>
            <Text style={styles.meta} numberOfLines={1}>
              {meta}
            </Text>
          </View>
          {status ? (
            <Text style={styles.status} numberOfLines={1}>
              {status}
            </Text>
          ) : null}
          {tools}
        </View>
        {/* La barra se ve: es la única manera de saber que hay más abajo. */}
        <ScrollView ref={centro} style={styles.centerScroll} contentContainerStyle={styles.centerContent}>
          <View style={caja}>{children}</View>
        </ScrollView>
        {footer ? (
          <View style={styles.footer}>
            <View style={caja}>{footer}</View>
          </View>
        ) : null}
      </View>

      {aside ? <View style={styles.asideColumn}>{aside}</View> : null}
    </View>
  );
}

function NavItem({ item, compact }: { item: ShellItem; compact: boolean }) {
  const { focusVisible, onFocus, onBlur } = useFocusRing();
  const [hovered, setHovered] = useState(false);
  const on = Boolean(item.active);

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={item.label}
      accessibilityHint={item.hint}
      accessibilityState={{ selected: on }}
      onPress={item.onPress}
      onHoverIn={() => setHovered(true)}
      onHoverOut={() => setHovered(false)}
      onFocus={onFocus}
      onBlur={onBlur}
      style={[
        compact ? styles.navChip : styles.navItem,
        (hovered || on) && styles.navItemOn,
        focusVisible && styles.focus,
      ]}
    >
      {/* La barra de la izquierda dice cuál está abierta sin usar color de fondo. */}
      {compact ? null : <View style={[styles.navBar, on && styles.navBarOn]} />}
      <Sigil mark={item.label} size={compact ? 18 : 20} strong={hovered || on} />
      <View style={styles.navText}>
        <Text style={[styles.navLabel, (hovered || on) && styles.navLabelOn]} numberOfLines={1}>
          {item.label}
        </Text>
        {!compact && item.hint ? (
          <Text style={styles.navHint} numberOfLines={1}>
            {item.hint}
          </Text>
        ) : null}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  columns: { flex: 1, flexDirection: 'row' },

  nav: {
    width: NAV_WIDTH,
    flexGrow: 0,
    flexShrink: 0,
    borderRightWidth: 1,
    borderRightColor: colors.line,
    backgroundColor: colors.surface,
  },
  brand: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.sm,
    paddingHorizontal: space.md,
    paddingVertical: space.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.line,
  },
  brandText: { flex: 1 },
  brandName: { fontFamily: fonts.serif, fontSize: 20, lineHeight: 26, color: colors.text },
  brandMeta: {
    fontFamily: fonts.mono,
    fontSize: 10,
    letterSpacing: 1.4,
    color: colors.dim,
    textTransform: 'uppercase',
  },
  navContent: { paddingVertical: space.sm },
  group: { marginBottom: space.md },
  groupLabel: {
    fontFamily: fonts.mono,
    fontSize: 10,
    letterSpacing: 2,
    color: colors.dim,
    textTransform: 'uppercase',
    paddingHorizontal: space.md,
    marginBottom: space.xs,
  },
  navItem: {
    minHeight: HIT_SIZE - 6,
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.sm,
    paddingRight: space.md,
    paddingVertical: 6,
    outlineWidth: 0,
  },
  navItemOn: { backgroundColor: colors.bg },
  navBar: { width: 2, alignSelf: 'stretch', backgroundColor: 'transparent' },
  navBarOn: { backgroundColor: machine },
  navText: { flex: 1 },
  navLabel: { fontFamily: fonts.serif, fontSize: 16, lineHeight: 22, color: colors.dim },
  navLabelOn: { color: colors.text },
  navHint: {
    fontFamily: fonts.mono,
    fontSize: 10,
    letterSpacing: 0.9,
    lineHeight: 14,
    color: colors.line,
  },

  navRow: {
    gap: space.sm,
    paddingHorizontal: space.md,
    paddingBottom: space.sm,
    alignItems: 'center',
  },
  navChip: {
    height: HIT_SIZE,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: space.sm,
    borderWidth: 1,
    borderColor: colors.line,
    outlineWidth: 0,
  },

  center: { flex: 1, minWidth: 0 },
  head: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: space.md,
    paddingHorizontal: space.md,
    paddingTop: space.sm,
    paddingBottom: space.xs,
    borderBottomWidth: 1,
    borderBottomColor: colors.line,
  },
  headText: { flex: 1, minWidth: 0 },
  headRow: { flexDirection: 'row', alignItems: 'flex-start', gap: space.sm },
  title: { fontFamily: fonts.serif, fontSize: 26, lineHeight: 34, color: colors.text },
  meta: {
    fontFamily: fonts.mono,
    fontSize: 11,
    letterSpacing: 1.2,
    color: colors.dim,
    textTransform: 'uppercase',
  },
  // La barra de estado de la máquina: cifras, a la derecha, siempre en frío.
  status: {
    fontFamily: fonts.mono,
    fontSize: 10,
    letterSpacing: 1.4,
    color: colors.line,
    textTransform: 'uppercase',
  },
  centerScroll: { flex: 1 },
  centerContent: { paddingHorizontal: space.md, paddingTop: space.md, paddingBottom: space.lg },
  /**
   * La caja del contenido: centrada en el hueco, nunca pegada a un lado. Una
   * ficha de setecientos píxeles en una pantalla de mil novecientos quedaba
   * arrinconada contra el menú, con medio metro de negro a la derecha.
   */
  caja: { width: '100%', alignSelf: 'center' },
  footer: {
    paddingHorizontal: space.md,
    paddingVertical: space.xs,
    borderTopWidth: 1,
    borderTopColor: colors.line,
  },

  /** Columna de instrumento. Se usa donde sobra ancho; nunca por defecto. */
  asideColumn: {
    width: 320,
    flexGrow: 0,
    flexShrink: 0,
    borderLeftWidth: 1,
    borderLeftColor: colors.line,
    backgroundColor: colors.surface,
  },

  stack: { flex: 1 },
  // Sin esto la fila de secciones se come media pantalla en vertical.
  navScroll: { flexGrow: 0, borderBottomWidth: 1, borderBottomColor: colors.line },
  headCompact: { paddingHorizontal: space.md, paddingTop: space.sm, paddingBottom: space.xs },
  centerCompact: { flex: 1 },
  asideCompact: { marginTop: space.lg },
  footerCompact: {
    paddingHorizontal: space.md,
    paddingVertical: space.xs,
    borderTopWidth: 1,
    borderTopColor: colors.line,
  },

  focus: { outlineColor: machine, outlineStyle: 'solid', outlineWidth: 1, outlineOffset: 2 },
});
