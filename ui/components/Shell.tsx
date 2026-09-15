import { useState, type ReactNode } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

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

type Props = {
  groups: ShellGroup[];
  /** Cabecera de la columna central. */
  title: string;
  meta: string;
  /** Lo que ocupa el centro. */
  children: ReactNode;
  /** La columna de la derecha: estado e instrumentos. */
  aside?: ReactNode;
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
export function Shell({ groups, title, meta, children, aside, footer, compact }: Props) {
  if (compact) {
    return (
      <View style={styles.stack}>
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
        <ScrollView style={styles.centerCompact} contentContainerStyle={styles.centerContent}>
          {children}
          {aside ? <View style={styles.asideCompact}>{aside}</View> : null}
        </ScrollView>
        {footer ? <View style={styles.footerCompact}>{footer}</View> : null}
      </View>
    );
  }

  return (
    <View style={styles.columns}>
      <View style={styles.nav}>
        <View style={styles.brand}>
          <Sigil mark="aracne" size={34} />
          <View style={styles.brandText}>
            <Text style={styles.brandName}>aracne</Text>
            <Text style={styles.brandMeta}>archivo sin firma</Text>
          </View>
        </View>
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.navContent}>
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
        <ScrollView style={styles.centerScroll} contentContainerStyle={styles.centerContent} showsVerticalScrollIndicator={false}>
          {children}
        </ScrollView>
        {footer ? <View style={styles.footer}>{footer}</View> : null}
      </View>

      {aside ? (
        <View style={styles.asideColumn}>
          <ScrollView
            style={styles.aside}
            contentContainerStyle={styles.asideContent}
            showsVerticalScrollIndicator={false}
          >
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
  head: {
    paddingHorizontal: space.lg,
    paddingTop: space.md,
    paddingBottom: space.sm,
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
  centerContent: { padding: space.lg, paddingBottom: space.xl },
  footer: {
    paddingHorizontal: space.lg,
    paddingVertical: space.sm,
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
  footerCompact: {
    paddingHorizontal: space.md,
    paddingVertical: space.sm,
    borderTopWidth: 1,
    borderTopColor: colors.line,
  },

  focus: { outlineColor: machine, outlineStyle: 'solid', outlineWidth: 1, outlineOffset: 2 },
});
