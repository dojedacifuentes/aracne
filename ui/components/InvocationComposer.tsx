import { useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import type { Entry } from '../../lib/schema';
import type { LegState } from '../../lib/content/corpus';
import { useFocusRing } from '../hooks/useFocusRing';
import { legHint } from '../lib/copy';
import { textGlyph } from '../lib/glyph';
import { colors, fonts, HIT_SIZE, machine, space } from '../theme';
import { Sigil } from './Sigil';

type Props = {
  legs: readonly LegState[];
  selected: readonly string[];
  entries: readonly Entry[];
  onToggle: (id: string) => void;
  onClear: () => void;
  /** Pulsar la araña: confirma la invocación con lo que haya apoyado. */
  onInvoke: () => void;
};

/** Cuánto tarda una pulsación sostenida en abrir la ficha de la pata. */
const LONG_PRESS_MS = 420;

/** Ejemplos que se enseñan al inspeccionar una pata. Tres, no una lista. */
const EJEMPLOS = 3;

/**
 * El modo de invocación.
 *
 * Las once patas vivían en una columna permanente que cobraba 310 px en todas
 * las pantallas, también leyendo una ficha, donde no deciden nada. Aquí son lo
 * que siempre fueron —**once conmutadores de una máquina**— y aparecen cuando
 * se va a usar la máquina: se apoyan las que se quieran y se pulsa.
 *
 * **Inspeccionar una pata no compite con apoyarla.** Una pulsación siempre
 * conmuta, la primera y la décima: si inspeccionar fuera «volver a pulsar»,
 * soltar una pata se volvería imposible. La ficha se abre por el sello —un
 * botón propio, alcanzable con el tabulador y con su `aria-expanded`—, con
 * doble pulsación o manteniendo pulsado. Tres caminos para lo mismo, y ninguno
 * le quita el sitio al conmutador.
 */
export function InvocationComposer({ legs, selected, entries, onToggle, onClear, onInvoke }: Props) {
  const [abierta, setAbierta] = useState<string | null>(null);
  const puestas = legs.filter((leg) => selected.includes(leg.category.id));
  const encendidas = legs.filter((leg) => leg.visible).length;

  return (
    <View>
      {/* Lo que decía la sección «propósito», dicho donde sirve de algo: al
          lado del mando. Una pata se enciende sola al llegar a tres entradas,
          y eso se calcula, no se marca. */}
      <Text style={styles.lead}>
        cada pata es una categoría del archivo. apoya las que quieras y pulsa: sin ninguna, el motor mira el
        archivo entero. hay {encendidas} encendidas de {legs.length}; una se enciende sola al llegar a tres
        entradas.
      </Text>

      <View style={styles.head}>
        <Text style={styles.label}>las once patas</Text>
        <Text style={[styles.state, puestas.length > 0 && styles.stateOn]}>
          {puestas.length > 0 ? `${puestas.length} apoyadas` : 'ninguna'}
        </Text>
      </View>

      {legs.map((leg) => (
        <LegSwitch
          key={leg.category.id}
          leg={leg}
          legs={legs}
          entries={entries}
          on={selected.includes(leg.category.id)}
          open={abierta === leg.category.id}
          onToggle={() => onToggle(leg.category.id)}
          onInspect={() => setAbierta((actual) => (actual === leg.category.id ? null : leg.category.id))}
        />
      ))}

      <View style={styles.acciones}>
        <Accion label="invocar" onPress={onInvoke} hint="pulsa la araña con las patas apoyadas" strong />
        <Accion label="soltar todas" onPress={onClear} disabled={puestas.length === 0} />
      </View>
    </View>
  );
}

function LegSwitch({
  leg,
  legs,
  entries,
  on,
  open,
  onToggle,
  onInspect,
}: {
  leg: LegState;
  legs: readonly LegState[];
  entries: readonly Entry[];
  on: boolean;
  open: boolean;
  onToggle: () => void;
  onInspect: () => void;
}) {
  const { focusVisible, onFocus, onBlur } = useFocusRing();
  const [hovered, setHovered] = useState(false);
  const ultima = useRef(0);
  const activo = on || hovered;

  /**
   * Doble pulsación sin `onLongPress` ni `detectDoubleTap`: dos pulsaciones
   * seguidas conmutan dos veces —que es lo correcto, queda como estaba— y
   * además abren la ficha. El estado del conmutador nunca se pierde.
   */
  const pulsar = () => {
    const ahora = performance.now();
    const doble = ahora - ultima.current < 300;
    ultima.current = ahora;
    onToggle();
    if (doble) onInspect();
  };

  return (
    <View style={styles.fila}>
      <View style={[styles.row, on && styles.rowOn, !leg.visible && styles.rowOff]}>
        <View style={[styles.bar, on && styles.barOn]} />
        <InspectButton leg={leg} open={open} onPress={onInspect} />
        <Pressable
          accessibilityRole="switch"
          accessibilityLabel={leg.category.name}
          accessibilityHint={legHint(leg.count, leg.visible, leg.missing, on)}
          accessibilityState={{ checked: on, disabled: !leg.visible }}
          // Igual que con `expanded`: react-native-web no traduce
          // `accessibilityState`, y un conmutador sin `aria-checked` no dice
          // si está puesto. Comprobado en el DOM, no supuesto.
          aria-checked={on}
          disabled={!leg.visible}
          onPress={pulsar}
          onLongPress={onInspect}
          delayLongPress={LONG_PRESS_MS}
          onHoverIn={() => setHovered(true)}
          onHoverOut={() => setHovered(false)}
          onFocus={onFocus}
          onBlur={onBlur}
          style={[styles.nombreCaja, focusVisible && styles.focus]}
        >
          <Text style={[styles.name, activo && styles.nameOn]} numberOfLines={1}>
            {leg.category.name}
          </Text>
          <Text style={[styles.count, on && styles.countOn]}>
            {leg.visible ? (on ? 'ON' : String(leg.count).padStart(2, '0')) : `−${leg.missing}`}
          </Text>
        </Pressable>
      </View>

      {open ? <LegDetail leg={leg} legs={legs} entries={entries} /> : null}
    </View>
  );
}

/** El sello abre la ficha de la pata. Es un botón, no un adorno del conmutador. */
function InspectButton({ leg, open, onPress }: { leg: LegState; open: boolean; onPress: () => void }) {
  const { focusVisible, onFocus, onBlur } = useFocusRing();

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`qué es ${leg.category.name}`}
      accessibilityHint={open ? 'cierra la ficha de esta pata' : 'abre la ficha de esta pata'}
      accessibilityState={{ expanded: open }}
      // `accessibilityState` no llega al DOM en react-native-web; el atributo va a mano.
      aria-expanded={open}
      onPress={onPress}
      onFocus={onFocus}
      onBlur={onBlur}
      style={[styles.sigil, open && styles.sigilOn, focusVisible && styles.focus]}
    >
      <Sigil leg={leg.category.leg} size={24} hollow strong={open} />
      <Text style={[styles.glyph, open && styles.glyphOn]}>{textGlyph(leg.category.glyph)}</Text>
    </Pressable>
  );
}

/**
 * La ficha de una pata: qué es, cuánto tiene, con quién cruza y tres ejemplos.
 *
 * Esto es lo que antes era una sección entera del menú —«propósito»— para
 * decir de las once a la vez lo que aquí se dice de una. Las vecinas no están
 * escritas: el orden del anillo es afinidad, así que se leen de él.
 */
function LegDetail({
  leg,
  legs,
  entries,
}: {
  leg: LegState;
  legs: readonly LegState[];
  entries: readonly Entry[];
}) {
  const anillo = legs.length;
  const vecinas = [-1, 1]
    .map((paso) => legs.find((otra) => otra.category.leg === (leg.category.leg + paso + anillo) % anillo))
    .filter((otra): otra is LegState => Boolean(otra));
  const ejemplos = entries.filter((entry) => entry.categories.includes(leg.category.id)).slice(0, EJEMPLOS);

  return (
    <View style={styles.detalle}>
      <Text style={styles.detalleTexto}>{leg.category.description}</Text>
      <Text style={styles.detalleDato}>
        pata {String(leg.category.leg).padStart(2, '0')} de {anillo} · {leg.count}{' '}
        {leg.count === 1 ? 'entrada' : 'entradas'}
        {leg.visible ? '' : ` · le faltan ${leg.missing} para encenderse`}
      </Text>
      {vecinas.length > 0 ? (
        <Text style={styles.detalleDato}>
          cruza bien con {vecinas.map((otra) => otra.category.name.toLowerCase()).join(' y ')}
        </Text>
      ) : null}
      {ejemplos.map((entry) => (
        <Text key={entry.id} style={styles.ejemplo} numberOfLines={1}>
          · {entry.title}
        </Text>
      ))}
    </View>
  );
}

function Accion({
  label,
  onPress,
  hint,
  strong = false,
  disabled = false,
}: {
  label: string;
  onPress: () => void;
  hint?: string;
  strong?: boolean;
  disabled?: boolean;
}) {
  const { focusVisible, onFocus, onBlur } = useFocusRing();
  const [hovered, setHovered] = useState(false);

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityHint={hint}
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      onHoverIn={() => setHovered(true)}
      onHoverOut={() => setHovered(false)}
      onFocus={onFocus}
      onBlur={onBlur}
      style={[
        styles.accion,
        strong && styles.accionFuerte,
        hovered && !disabled && styles.accionSobre,
        disabled && styles.accionApagada,
        focusVisible && styles.focus,
      ]}
    >
      <Text style={[styles.accionTexto, strong && styles.accionTextoFuerte, hovered && !disabled && styles.accionTextoSobre]}>
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  lead: {
    fontFamily: fonts.serif,
    fontSize: 16,
    lineHeight: 25,
    color: colors.dim,
    marginBottom: space.md,
  },
  head: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    marginBottom: space.xs,
  },
  label: {
    fontFamily: fonts.mono,
    fontSize: 10,
    letterSpacing: 2,
    color: colors.dim,
    textTransform: 'uppercase',
  },
  state: { fontFamily: fonts.mono, fontSize: 10, letterSpacing: 1.2, color: colors.dim },
  stateOn: { color: machine },

  fila: { borderBottomWidth: 1, borderBottomColor: colors.line },
  row: { flexDirection: 'row', alignItems: 'center', gap: space.xs, paddingRight: space.xs },
  rowOn: { backgroundColor: colors.bg },
  rowOff: { opacity: 0.42 },
  bar: { width: 2, alignSelf: 'stretch', backgroundColor: 'transparent' },
  barOn: { backgroundColor: machine },

  sigil: {
    width: HIT_SIZE - 10,
    height: HIT_SIZE - 10,
    alignItems: 'center',
    justifyContent: 'center',
    outlineWidth: 0,
  },
  sigilOn: { backgroundColor: colors.surface },
  glyph: {
    position: 'absolute',
    fontFamily: fonts.serif,
    fontSize: 11,
    lineHeight: 15,
    color: colors.dim,
  },
  glyphOn: { color: machine },

  nombreCaja: {
    flex: 1,
    minHeight: HIT_SIZE - 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.xs,
    outlineWidth: 0,
  },
  name: { flex: 1, fontFamily: fonts.serif, fontSize: 15, lineHeight: 21, color: colors.dim },
  nameOn: { color: colors.text },
  count: { fontFamily: fonts.mono, fontSize: 10, letterSpacing: 1.2, color: colors.line, width: 26, textAlign: 'right' },
  countOn: { color: machine },

  detalle: {
    paddingLeft: HIT_SIZE - 8,
    paddingRight: space.xs,
    paddingBottom: space.sm,
  },
  detalleTexto: {
    fontFamily: fonts.serif,
    fontSize: 15,
    lineHeight: 23,
    color: colors.text,
    marginBottom: space.xs,
  },
  detalleDato: {
    fontFamily: fonts.mono,
    fontSize: 10,
    letterSpacing: 1,
    lineHeight: 16,
    color: colors.dim,
  },
  ejemplo: {
    fontFamily: fonts.serif,
    fontSize: 14,
    lineHeight: 21,
    color: colors.dim,
    marginTop: 2,
  },

  acciones: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm, marginTop: space.md },
  accion: {
    minHeight: HIT_SIZE - 8,
    justifyContent: 'center',
    paddingHorizontal: space.md,
    borderWidth: 1,
    borderColor: colors.line,
    outlineWidth: 0,
  },
  accionFuerte: { borderColor: machine },
  // Inversión al pasar por encima: el gesto de una terminal, sin color nuevo.
  accionSobre: { backgroundColor: colors.text, borderColor: colors.text },
  accionApagada: { opacity: 0.35 },
  accionTexto: {
    fontFamily: fonts.mono,
    fontSize: 11,
    letterSpacing: 1.6,
    color: colors.dim,
    textTransform: 'uppercase',
  },
  accionTextoFuerte: { color: machine },
  accionTextoSobre: { color: colors.bg },

  focus: { outlineColor: machine, outlineStyle: 'solid', outlineWidth: 1, outlineOffset: 2 },
});
