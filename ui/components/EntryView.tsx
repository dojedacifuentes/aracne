import { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import type { Corpus } from '../../lib/content/corpus';
import { catalogId, STATUS_LABEL, TYPE_LABEL } from '../../lib/labels';
import type { Entry } from '../../lib/schema';
import { STATUS_BORDER, type StatusBorder } from '../lib/epistemic';
import { colors, fonts, space } from '../theme';
import { Reveal } from './Reveal';
import { ToolButton } from './ToolButton';

type Props = {
  entry: Entry;
  corpus: Corpus;
  reduceMotion: boolean;
  /** Pantalla estrecha: título a 30 px en lugar de 42. */
  compact: boolean;
  /** El expediente está abierto: lo dice el botón con su `aria-expanded`. */
  dossierOpen: boolean;
  onToggleDossier: () => void;
};

/** El identificador cuenta hasta su número en 200 ms: el único gesto de «procesamiento». */
const COUNTER_MS = 200;

/**
 * Una entrada, y casi nada más.
 *
 * Antes la ficha era una columna de 680 px con una banda de datos de 196 px
 * pegada al cuerpo: ciento cuarenta palabras de lectura compartiendo pantalla,
 * a partes casi iguales, con «tipo / categorías / estado / fuentes / en el
 * atlas / añadida». En una pantalla de mil novecientos píxeles eso se veía
 * como lo que era: el texto arrinconado y el aparato administrativo al lado.
 *
 * Ahora manda la lectura. El cuerpo se queda con su medida —unos setenta
 * caracteres, que es lo que el ojo sigue sin perder el renglón— y la caja
 * entera se centra en el hueco en vez de pegarse al menú. Todo el aparato se
 * va a `EntryDossier`, detrás de un solo control.
 *
 * Lo que no se esconde: **el estado epistémico**. Lo exige `CLAUDE.md` y tiene
 * razón —dice cómo leer lo que se está leyendo—, así que va dos veces: en el
 * trazo del borde izquierdo y escrito al pie del cuerpo.
 */
export function EntryView({ entry, corpus, reduceMotion, compact, dossierOpen, onToggleDossier }: Props) {
  const border = STATUS_BORDER[entry.epistemicStatus];
  const patas = entry.categories
    .map((id) => corpus.categories.find((c) => c.id === id)?.name ?? id)
    .join(' · ');

  return (
    <View style={styles.ficha}>
      <Reveal index={0} reduceMotion={reduceMotion}>
        <View style={styles.tira}>
          <CatalogId id={entry.id} reduceMotion={reduceMotion} />
          <ToolButton
            label="expediente"
            expanded={dossierOpen}
            onPress={onToggleDossier}
            hint="tipo, patas, fuentes, atlas, autores y exportación"
          />
        </View>
      </Reveal>

      <Reveal index={1} reduceMotion={reduceMotion}>
        <Text style={[styles.title, compact && styles.titleCompact]} accessibilityRole="header">
          {entry.title}
        </Text>
        <Text style={styles.linea}>
          {TYPE_LABEL[entry.type]}
          {patas ? ` · ${patas}` : ''}
        </Text>
        {entry.sensitive ? <Text style={styles.sensitive}>contenido sensible, con fines educativos</Text> : null}
      </Reveal>

      <Reveal index={2} reduceMotion={reduceMotion}>
        <ContentBlock border={border} text={entry.content} statusLabel={STATUS_LABEL[entry.epistemicStatus]} />
      </Reveal>

      <Reveal index={3} reduceMotion={reduceMotion}>
        <Text style={[styles.question, compact && styles.questionCompact]}>{entry.question}</Text>
      </Reveal>
    </View>
  );
}

function CatalogId({ id, reduceMotion }: { id: string; reduceMotion: boolean }) {
  const label = catalogId(id);
  const [shown, setShown] = useState(() => (reduceMotion ? label : label.replace(/\d/g, '0')));

  useEffect(() => {
    const match = /^(.*?)(\d+)$/.exec(label);
    let frame = 0;
    const start = performance.now();
    const tick = (now: number) => {
      if (!match || reduceMotion) {
        setShown(label);
        return;
      }
      const progress = Math.min(1, (now - start) / COUNTER_MS);
      setShown(`${match[1]}${String(Math.round(Number(match[2]) * progress)).padStart(match[2].length, '0')}`);
      if (progress < 1) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    // El identificador es un dato, no un adorno: si el navegador no anima
    // —pestaña de fondo, ahorro de energía, una captura— el contador se
    // quedaba clavado en DELYRA 0000, que es un número de catálogo falso.
    // Este plazo lo deja en el suyo aunque no llegue ni un solo fotograma.
    const settle = setTimeout(() => setShown(label), COUNTER_MS);
    return () => {
      cancelAnimationFrame(frame);
      clearTimeout(settle);
    };
  }, [label, reduceMotion]);

  return (
    <Text style={styles.catalog} accessibilityLabel={label}>
      {shown}
    </Text>
  );
}

function ContentBlock({ border, text, statusLabel }: { border: StatusBorder; text: string; statusLabel: string }) {
  const tone = border.tone === 'dim' ? colors.dim : colors.text;
  return (
    <View style={styles.cuerpo}>
      <View
        style={[
          styles.block,
          border.rule === 'solid' || border.rule === 'dashed' || border.rule === 'dotted'
            ? { borderLeftWidth: border.width, borderLeftColor: tone, borderStyle: border.rule }
            : null,
        ]}
        accessibilityLabel={`${statusLabel}. ${text}`}
      >
        {border.rule === 'double' ? (
          // Dos líneas de 1 px con 1 px entre ellas: el borde doble, dibujado igual en web y en nativo.
          <View style={[styles.double, { borderColor: tone }]} />
        ) : null}
        <Text style={styles.body}>{text}</Text>
      </View>
      {/* CLAUDE.md, regla 5: el estado se ve siempre que no sea un hecho. */}
      <Text style={[styles.estado, border.accentLabel && styles.estadoAcento]}>{statusLabel}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  /**
   * La ficha entera cabe en 900 px y se centra en el hueco; el cuerpo se queda
   * en 680, que son unos setenta caracteres a 18 px. Ancho de ficha y medida de
   * lectura son dos cosas distintas: estirar la segunda hasta la primera haría
   * ilegible lo único que hay que leer.
   */
  ficha: { width: '100%', maxWidth: 900, alignSelf: 'center' },
  tira: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: space.md,
    paddingBottom: space.xs,
    borderBottomWidth: 1,
    borderBottomColor: colors.line,
  },
  // El identificador es uno de los dos únicos usos del acento.
  catalog: {
    fontFamily: fonts.mono,
    fontSize: 12,
    letterSpacing: 1.2,
    color: colors.accent,
  },
  title: {
    fontFamily: fonts.serif,
    fontSize: 42,
    lineHeight: 50,
    color: colors.text,
    marginTop: space.md,
  },
  titleCompact: { fontSize: 30, lineHeight: 37 },
  linea: {
    fontFamily: fonts.mono,
    fontSize: 11,
    letterSpacing: 1.2,
    lineHeight: 18,
    color: colors.dim,
    marginTop: space.xs,
    textTransform: 'lowercase',
  },
  sensitive: {
    fontFamily: fonts.mono,
    fontSize: 12,
    letterSpacing: 0.72,
    color: colors.dim,
    marginTop: space.sm,
  },
  // 620 px a 18 px de serif son unos setenta caracteres por línea, que es la
  // medida que el ojo sigue sin perder el renglón. Medido en pantalla: a 680
  // se iba a setenta y seis.
  cuerpo: { maxWidth: 620 },
  block: {
    marginTop: space.lg,
    paddingLeft: space.md,
  },
  double: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: 3,
    borderLeftWidth: 1,
    borderRightWidth: 1,
  },
  body: {
    fontFamily: fonts.serif,
    fontSize: 18,
    lineHeight: 30,
    color: colors.text,
  },
  estado: {
    fontFamily: fonts.mono,
    fontSize: 10,
    letterSpacing: 1.6,
    color: colors.dim,
    textTransform: 'uppercase',
    marginTop: space.sm,
    paddingLeft: space.md,
  },
  estadoAcento: { color: colors.accent },
  question: {
    fontFamily: fonts.serif,
    fontSize: 27,
    lineHeight: 37,
    color: colors.text,
    maxWidth: 820,
    marginTop: space.xl,
    paddingTop: space.md,
    borderTopWidth: 1,
    borderTopColor: colors.line,
  },
  questionCompact: { fontSize: 22, lineHeight: 30 },
});
