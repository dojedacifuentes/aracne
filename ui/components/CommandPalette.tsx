import { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';

import { fold, matchesQuery } from '../../lib/archive/filter';
import type { Corpus, LegState } from '../../lib/content/corpus';
import { catalogId } from '../../lib/labels';
import { colors, fonts, HIT_SIZE, space } from '../theme';

/** Lo que la paleta sabe hacer. La fase pide exactamente estas cuatro cosas. */
export type Command =
  | { kind: 'invoke' }
  | { kind: 'archive' }
  | { kind: 'leg'; id: string }
  | { kind: 'room'; id: string }
  | { kind: 'entry'; id: string };

type Props = {
  corpus: Corpus;
  legs: LegState[];
  onRun: (command: Command) => void;
  onClose: () => void;
};

/** Con más de esto deja de ser una paleta y empieza a ser el archivo. */
const MAX_ENTRIES = 6;

interface Row {
  command: Command;
  label: string;
  meta: string;
}

function rowsFor(corpus: Corpus, legs: LegState[], query: string): Row[] {
  const q = fold(query.trim());
  const hit = (text: string) => q === '' || fold(text).includes(q);
  const rows: Row[] = [];

  if (hit('invocar')) rows.push({ command: { kind: 'invoke' }, label: 'invocar', meta: 'con las patas apoyadas' });
  if (hit('archivo')) rows.push({ command: { kind: 'archive' }, label: 'archivo', meta: 'todas las entradas' });

  // Solo las patas encendidas: una retraída no se puede apoyar.
  for (const leg of legs) {
    if (!leg.visible || !hit(leg.category.name)) continue;
    rows.push({
      command: { kind: 'leg', id: leg.category.id },
      label: leg.category.name,
      meta: `pata · ${leg.count} entradas`,
    });
  }

  for (const room of corpus.rooms) {
    if (!hit(room.name)) continue;
    rows.push({ command: { kind: 'room', id: room.id }, label: room.name, meta: 'sala' });
  }

  for (const entry of corpus.entries) {
    if (q === '' || !matchesQuery(entry, query)) continue;
    if (rows.filter((r) => r.command.kind === 'entry').length >= MAX_ENTRIES) break;
    rows.push({ command: { kind: 'entry', id: entry.id }, label: entry.title, meta: catalogId(entry.id) });
  }

  return rows;
}

/**
 * La paleta: escribir y llegar. No hace nada que no se pueda hacer pulsando
 * por la interfaz; solo lo hace en dos teclas. Se abre con ⌘K o ctrl+K.
 */
export function CommandPalette({ corpus, legs, onRun, onClose }: Props) {
  const [query, setQuery] = useState('');
  const [cursor, setCursor] = useState(0);
  const rows = useMemo(() => rowsFor(corpus, legs, query), [corpus, legs, query]);
  const active = rows.length === 0 ? -1 : Math.min(cursor, rows.length - 1);

  const key = (name: string) => {
    if (name === 'Escape') return onClose();
    if (name === 'Enter') return rows[active] ? onRun(rows[active].command) : undefined;
    if (name === 'ArrowDown') return setCursor((c) => (rows.length === 0 ? 0 : (c + 1) % rows.length));
    if (name === 'ArrowUp') {
      return setCursor((c) => (rows.length === 0 ? 0 : (c - 1 + rows.length) % rows.length));
    }
    return undefined;
  };

  return (
    <View style={styles.overlay}>
      {/* Pulsar fuera cierra: el fondo es un botón del tamaño de la pantalla. */}
      <Pressable style={StyleSheet.absoluteFill} accessibilityLabel="cerrar" onPress={onClose} />
      <View style={styles.panel}>
        <TextInput
          value={query}
          onChangeText={(next) => {
            setQuery(next);
            setCursor(0);
          }}
          onKeyPress={(event) => key(event.nativeEvent.key)}
          placeholder="buscar, invocar, saltar a pata, abrir sala"
          placeholderTextColor={colors.dim}
          style={styles.input}
          autoFocus
          autoCorrect={false}
          accessibilityLabel="paleta de comandos"
        />
        {rows.length === 0 ? (
          <Text style={styles.empty}>nada con ese nombre. prueba con otra palabra.</Text>
        ) : (
          <ScrollView style={styles.list} keyboardShouldPersistTaps="handled">
            {rows.map((row, index) => (
              <Pressable
                key={`${row.command.kind}:${'id' in row.command ? row.command.id : row.label}`}
                accessibilityRole="button"
                accessibilityLabel={row.label}
                accessibilityHint={row.meta}
                accessibilityState={{ selected: index === active }}
                onPress={() => onRun(row.command)}
                onHoverIn={() => setCursor(index)}
                style={[styles.row, index === active && styles.rowActive]}
              >
                <Text style={styles.rowLabel} numberOfLines={1}>
                  {row.label}
                </Text>
                <Text style={styles.rowMeta} numberOfLines={1}>
                  {row.meta}
                </Text>
              </Pressable>
            ))}
          </ScrollView>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(14, 13, 12, 0.86)',
    alignItems: 'center',
    paddingTop: 96,
    paddingHorizontal: space.md,
  },
  panel: {
    width: '100%',
    maxWidth: 560,
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.bg,
  },
  input: {
    minHeight: HIT_SIZE + 8,
    paddingHorizontal: space.md,
    fontFamily: fonts.serif,
    fontSize: 19,
    color: colors.text,
    borderBottomWidth: StyleSheet.hairlineWidth * 2,
    borderBottomColor: colors.line,
    outlineWidth: 0,
  },
  list: { maxHeight: 320 },
  row: {
    minHeight: HIT_SIZE,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: space.md,
    paddingVertical: space.xs,
    borderLeftWidth: 2,
    borderLeftColor: 'transparent',
  },
  // El cursor es una barra en el margen, no un fondo de color.
  rowActive: { borderLeftColor: colors.text, backgroundColor: colors.surface },
  rowLabel: {
    flex: 1,
    fontFamily: fonts.serif,
    fontSize: 17,
    color: colors.text,
  },
  rowMeta: {
    fontFamily: fonts.mono,
    fontSize: 12,
    letterSpacing: 0.72,
    color: colors.dim,
    marginLeft: space.sm,
  },
  empty: {
    fontFamily: fonts.serif,
    fontSize: 17,
    lineHeight: 26,
    color: colors.dim,
    padding: space.md,
  },
});
