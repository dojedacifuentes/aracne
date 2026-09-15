import { useEffect, useRef, useState, type ReactNode } from 'react';
import { Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { useFocusRing } from '../hooks/useFocusRing';
import { colors, fonts, HIT_SIZE, machine, space } from '../theme';
import { Sigil } from './Sigil';

/** Anchos de las dos columnas laterales. El centro se queda con el resto. */
export const NAV_WIDTH = 248;
export const ASIDE_WIDTH = 310;

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

/** El nodo del DOM de un `ScrollView`, en web. En nativo no hay tal cosa. */
function scrollNode(ref: { current: ScrollView | null }): HTMLElement | null {
  if (Platform.OS !== 'web') return null;
  const vista = ref.current as unknown as { getScrollableNode?: () => unknown } | null;
  const nodo = vista?.getScrollableNode?.();
  return typeof HTMLElement !== 'undefined' && nodo instanceof HTMLElement ? nodo : null;
}

/**
 * ¿Hay alguna caja entre `desde` y `hasta` que pueda moverse en ese sentido?
 * Sirve para no robarle la rueda a quien sí la estaba usando: el panel de la
 * derecha tiene su propio recorrido y debe quedárselo.
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
 * pie no pasaba nada, y como la barra estaba escondida tampoco se veía que
 * hubiera más abajo. Aquí el centro recoge la rueda que ninguna otra columna
 * ha usado, y se le añaden las teclas de página, que en un `ScrollView` no
 * existen. Solo en web: en nativo el gesto ya es del sistema.
 */
function useRecorridoCentral(
  raiz: { current: View | null },
  centro: { current: ScrollView | null },
  activo: boolean,
) {
  useEffect(() => {
    if (Platform.OS !== 'web' || !activo) return;
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
  }, [raiz, centro, activo]);
}

type Props = {
  groups: ShellGroup[];
  /** Cabecera de la columna central. */
  title: string;
  meta: string;
  /** Lo que ocupa el centro. */
  children: ReactNode;
  /** La columna de la derecha: estado e instrumentos. */
  aside?: ReactNode;
  /**
   * Solo en vertical, donde las tres columnas se apilan: el instrumento va
   * antes del contenido. Lo pide el archivo, y solo el archivo — un filtro
   * detrás de cuarenta y cuatro resultados no es un filtro.
   */
  asideFirst?: boolean;
  /** Botonera al pie del centro. */
  footer?: ReactNode;
  /** Pantalla estrecha: todo se apila. */
  compact: boolean;
};

/**
 * El armazón de la aplicación.
 *
 * Tres columnas: **las secciones a la izquierda, el contenido en el centro y
 * los instrumentos a la derecha**. Sustituye al reparto anterior —escenario a
 * un lado, panel al otro—, donde abrir cualquier sección la dejaba pegada a la
 * araña y con la mitad del ancho.
 *
 * El aire es el de una consola: etiquetas en mono y versales, filетes de un
 * píxel, y el frío del instrumento (`machine`) para todo lo que se puede
 * tocar. `docs/DESIGN.md` pedía un solo acento y ninguna superficie; esta
 * pantalla es una excepción pedida expresamente, y su regla propia es que **el
 * frío es de lo interactivo y el cálido es del contenido**: si algo se puede
 * pulsar, se ve; si es texto del archivo, nunca se pinta.
 */
export function Shell({ groups, title, meta, children, aside, asideFirst, footer, compact }: Props) {
  const raiz = useRef<View | null>(null);
  const centro = useRef<ScrollView | null>(null);
  useRecorridoCentral(raiz, centro, true);

  if (compact) {
    return (
      <View ref={raiz} style={styles.stack}>
        <View style={styles.headCompact}>
          <Text style={styles.title}>{title}</Text>
          <Text style={styles.meta}>{meta}</Text>
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
          {aside && asideFirst ? <View style={styles.asideBefore}>{aside}</View> : null}
          {children}
          {aside && !asideFirst ? <View style={styles.asideCompact}>{aside}</View> : null}
        </ScrollView>
        {footer ? <View style={styles.footerCompact}>{footer}</View> : null}
      </View>
    );
  }

  return (
    <View ref={raiz} style={styles.columns}>
      <View style={styles.nav}>
        <View style={styles.brand}>
          <Sigil mark="aracne" size={34} />
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
          <Text style={styles.title}>{title}</Text>
          <Text style={styles.meta}>{meta}</Text>
        </View>
        {/* La barra se ve: es la única manera de saber que hay más abajo. */}
        <ScrollView ref={centro} style={styles.centerScroll} contentContainerStyle={styles.centerContent}>
          {children}
        </ScrollView>
        {footer ? <View style={styles.footer}>{footer}</View> : null}
      </View>

      {aside ? (
        <View style={styles.asideColumn}>
          <ScrollView style={styles.aside} contentContainerStyle={styles.asideContent}>
            {aside}
          </ScrollView>
        </View>
      ) : null}
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
      <Sigil mark={item.label} size={compact ? 18 : 22} strong={hovered || on} />
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
    paddingVertical: space.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.line,
  },
  brandText: { flex: 1 },
  brandName: { fontFamily: fonts.serif, fontSize: 21, lineHeight: 27, color: colors.text },
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
    minHeight: HIT_SIZE,
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.sm,
    paddingRight: space.md,
    paddingVertical: 7,
    outlineWidth: 0,
  },
  navItemOn: { backgroundColor: colors.bg },
  navBar: { width: 2, alignSelf: 'stretch', backgroundColor: 'transparent' },
  navBarOn: { backgroundColor: machine },
  navText: { flex: 1 },
  navLabel: { fontFamily: fonts.serif, fontSize: 17, lineHeight: 24, color: colors.dim },
  navLabelOn: { color: colors.text },
  navHint: {
    fontFamily: fonts.mono,
    fontSize: 10,
    letterSpacing: 0.9,
    lineHeight: 15,
    color: colors.line,
  },

  navRow: {
    gap: space.sm,
    paddingHorizontal: space.md,
    paddingBottom: space.sm,
    alignItems: 'center',
  },
  navChip: {
    height: 36,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: space.sm,
    borderWidth: 1,
    borderColor: colors.line,
    outlineWidth: 0,
  },

  center: { flex: 1, minWidth: 0 },
  /*
   * El aire de la cabecera, el pie y la caja del centro se recortó a
   * propósito: cada píxel que se quitan es un píxel que no hay que bajar, y
   * son los mismos cuarenta y tantos en todas las secciones. La medida de
   * lectura sigue mandando dentro —los textos largos siguen con su `maxWidth`
   * de 640—, así que esto aprieta el marco, no la prosa.
   */
  head: {
    paddingHorizontal: space.md,
    paddingTop: space.sm,
    paddingBottom: space.xs,
    borderBottomWidth: 1,
    borderBottomColor: colors.line,
  },
  title: { fontFamily: fonts.serif, fontSize: 26, lineHeight: 34, color: colors.text },
  meta: {
    fontFamily: fonts.mono,
    fontSize: 11,
    letterSpacing: 1.2,
    color: colors.dim,
    textTransform: 'uppercase',
  },
  centerScroll: { flex: 1 },
  centerContent: { paddingHorizontal: space.md, paddingTop: space.md, paddingBottom: space.lg },
  footer: {
    paddingHorizontal: space.md,
    paddingVertical: space.xs,
    borderTopWidth: 1,
    borderTopColor: colors.line,
  },

  asideColumn: {
    width: ASIDE_WIDTH,
    flexGrow: 0,
    flexShrink: 0,
    borderLeftWidth: 1,
    borderLeftColor: colors.line,
    backgroundColor: colors.surface,
  },
  aside: { flex: 1 },
  asideContent: { padding: space.md, paddingBottom: space.xl },

  stack: { flex: 1 },
  // Sin esto la fila de secciones se come media pantalla en vertical.
  navScroll: { flexGrow: 0, borderBottomWidth: 1, borderBottomColor: colors.line },
  headCompact: { paddingHorizontal: space.md, paddingTop: space.sm, paddingBottom: space.xs },
  centerCompact: { flex: 1 },
  asideCompact: { marginTop: space.lg },
  asideBefore: { marginBottom: space.lg },
  footerCompact: {
    paddingHorizontal: space.md,
    paddingVertical: space.sm,
    borderTopWidth: 1,
    borderTopColor: colors.line,
  },

  focus: { outlineColor: machine, outlineStyle: 'solid', outlineWidth: 1, outlineOffset: 2 },
});
