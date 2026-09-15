import { useEffect, type ReactNode } from 'react';
import { Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { useFocusRing } from '../hooks/useFocusRing';
import { useTouchHeight } from '../hooks/useTouch';
import { colors, fonts, HIT_SIZE, machine, space } from '../theme';

type Props = {
  title: string;
  /** Una línea en mono bajo el título: qué es esto, no qué promete. */
  meta?: string;
  open: boolean;
  onClose: () => void;
  children: ReactNode;
  /** Pantalla estrecha: el cajón sube desde abajo y ocupa el ancho entero. */
  compact: boolean;
  /** Lado por el que entra. La lente del Atlas y el expediente van a la derecha. */
  side?: 'right' | 'left';
};

/**
 * Un cajón de instrumento: se superpone, no reparte.
 *
 * La consola de la fase 15 reservaba 310 px de columna derecha en todas las
 * rutas, hubiera o no algo que poner ahí. Un instrumento que se usa de vez en
 * cuando no puede cobrar ancho todo el rato: aquí aparece encima, tapa lo que
 * tenga que tapar mientras se usa, y se va. El contenido de debajo no cambia
 * de medida al abrirlo, que es la diferencia entre consultar y perder el sitio.
 *
 * En vertical entra desde abajo como una hoja, porque a lo ancho no cabe nada
 * al lado de nada.
 *
 * Accesible: `Escape` cierra, el fondo cierra, el botón de cerrar es lo primero
 * que recibe el foco, y el disparador de fuera lleva su `aria-expanded`.
 */
export function Drawer({ title, meta, open, onClose, children, compact, side = 'right' }: Props) {
  useEffect(() => {
    if (!open || Platform.OS !== 'web' || typeof window === 'undefined') return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        onClose();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <View style={styles.capa} pointerEvents="box-none">
      {/* El fondo apenas tiñe: no es un modal, es un cajón. Pulsarlo cierra. */}
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="cerrar"
        onPress={onClose}
        style={styles.fondo}
      />
      <View
        role="dialog"
        aria-label={title}
        aria-modal={false}
        style={[
          styles.panel,
          compact ? styles.panelCompact : side === 'left' ? styles.panelLeft : styles.panelRight,
        ]}
      >
        <View style={styles.cabecera}>
          <View style={styles.titulos}>
            <Text style={styles.titulo}>{title}</Text>
            {meta ? <Text style={styles.meta}>{meta}</Text> : null}
          </View>
          <Cerrar onPress={onClose} />
        </View>
        <ScrollView style={styles.cuerpo} contentContainerStyle={styles.cuerpoContenido}>
          {children}
        </ScrollView>
      </View>
    </View>
  );
}

function Cerrar({ onPress }: { onPress: () => void }) {
  const { focusVisible, onFocus, onBlur } = useFocusRing();
  const alto = useTouchHeight();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel="cerrar el panel"
      accessibilityHint="también se cierra con la tecla escape"
      onPress={onPress}
      onFocus={onFocus}
      onBlur={onBlur}
      style={[styles.cerrar, { minHeight: alto, minWidth: alto }, focusVisible && styles.focus]}
    >
      <Text style={styles.cerrarMarca}>✕</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  capa: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, zIndex: 20 },
  fondo: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(14,13,12,0.55)' },

  panel: {
    position: 'absolute',
    backgroundColor: colors.surface,
    borderColor: colors.line,
  },
  // Ancho fijo pero modesto: el cajón se lee, no se instala.
  panelRight: { top: 0, bottom: 0, right: 0, width: 380, maxWidth: '92%', borderLeftWidth: 1 },
  panelLeft: { top: 0, bottom: 0, left: 0, width: 380, maxWidth: '92%', borderRightWidth: 1 },
  panelCompact: { left: 0, right: 0, bottom: 0, maxHeight: '82%', borderTopWidth: 1 },

  cabecera: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: space.sm,
    paddingHorizontal: space.md,
    paddingTop: space.md,
    paddingBottom: space.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.line,
  },
  titulos: { flex: 1, minWidth: 0 },
  titulo: { fontFamily: fonts.serif, fontSize: 21, lineHeight: 28, color: colors.text },
  meta: {
    fontFamily: fonts.mono,
    fontSize: 10,
    letterSpacing: 1.6,
    lineHeight: 16,
    color: colors.dim,
    textTransform: 'uppercase',
  },
  cerrar: {
    width: HIT_SIZE - 8,
    height: HIT_SIZE - 8,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.line,
    outlineWidth: 0,
  },
  cerrarMarca: { fontFamily: fonts.mono, fontSize: 12, color: colors.dim },

  cuerpo: { flex: 1 },
  cuerpoContenido: { padding: space.md, paddingBottom: space.xl },

  focus: { outlineColor: machine, outlineStyle: 'solid', outlineWidth: 1, outlineOffset: 2 },
});
