import { Linking, Pressable, StyleSheet, Text, View } from 'react-native';

import { causesForEntry } from '../../lib/atlas/bridge';
import { loadAtlas } from '../../lib/atlas/loader';
import type { Corpus } from '../../lib/content/corpus';
import { entrySheet } from '../../lib/export/sheet';
import { catalogId, SOURCE_KIND_LABEL, STATUS_LABEL, TYPE_LABEL } from '../../lib/labels';
import { figuresOfEntry } from '../../lib/museum/themes';
import type { Entry } from '../../lib/schema';
import { useTouchHeight } from '../hooks/useTouch';
import { colors, fonts, space } from '../theme';
import { ExportRow } from './ExportRow';

type Props = {
  entry: Entry;
  corpus: Corpus;
  onOpenFigure: (id: string) => void;
  onOpenCause: (id: string) => void;
  onOpenCategory: (id: string) => void;
  onOpenEntry: (id: string) => void;
};

/**
 * El expediente de una entrada: todo lo que no es la lectura.
 *
 * Esto colgaba en una banda de 196 px a la derecha del cuerpo, permanente,
 * en una ficha cuya razón de ser son ciento cuarenta palabras. Los datos no
 * desaparecen —el archivo no esconde de dónde sale nada— pero dejan de cobrar
 * ancho por adelantado: se abren cuando alguien los pide.
 *
 * Lo único que no está aquí es **el estado epistémico**, que sigue en la
 * ficha, a la vista, porque `CLAUDE.md` lo exige y porque es lo que dice cómo
 * hay que leer lo que se acaba de leer.
 */
export function EntryDossier({
  entry,
  corpus,
  onOpenFigure,
  onOpenCause,
  onOpenCategory,
  onOpenEntry,
}: Props) {
  const figuras = figuresOfEntry(entry.id, corpus.figures);
  // Solo lo que el archivo declara a mano. Lo que el grafo calcula se mira en
  // la tela, que para eso está dibujada.
  const cruces = entry.related
    .map((id) => corpus.entries.find((otra) => otra.id === id))
    .filter((otra): otra is Entry => otra !== undefined);
  const causas = causesForEntry(entry, loadAtlas().causes).slice(0, 4);
  const categorias = entry.categories.map((id) => ({
    id,
    name: corpus.categories.find((c) => c.id === id)?.name ?? id,
  }));

  return (
    <View>
      <Text style={styles.catalogo}>{catalogId(entry.id)}</Text>

      <Campo label="tipo" value={TYPE_LABEL[entry.type]} />
      <Campo label="estado" value={STATUS_LABEL[entry.epistemicStatus]} />
      <Campo label="añadida" value={entry.addedAt} />

      <Bloque label="patas">
        {categorias.length === 0 ? (
          <Text style={styles.valor}>sin categoría todavía</Text>
        ) : (
          categorias.map((categoria) => (
            <Enlace
              key={categoria.id}
              label={categoria.name}
              hint="abre el archivo filtrado por esta pata"
              onPress={() => onOpenCategory(categoria.id)}
            />
          ))
        )}
      </Bloque>

      <Bloque label="tags">
        <Text style={styles.valor}>{entry.tags.length > 0 ? entry.tags.join(' · ') : 'ninguno'}</Text>
      </Bloque>

      <Bloque label="fuentes">
        {entry.sources.length === 0 ? (
          <Text style={styles.valor}>ninguna todavía. por eso el estado dice lo que dice.</Text>
        ) : (
          entry.sources.map((source) => (
            <View key={source.label} style={styles.fuente}>
              {source.url ? (
                <Text
                  style={[styles.valor, styles.link, styles.fuenteEnlace]}
                  accessibilityRole="link"
                  accessibilityHint={`se abre fuera de aracne${source.work ? `, en ${source.work}` : ''}`}
                  onPress={() => void Linking.openURL(source.url as string)}
                >
                  {source.label}
                </Text>
              ) : (
                <Text style={styles.valor}>{source.label}</Text>
              )}
              <Text style={styles.fuenteMeta}>
                {[source.author, source.work, source.year, SOURCE_KIND_LABEL[source.kind]]
                  .filter(Boolean)
                  .join(' · ')}
              </Text>
            </View>
          ))
        )}
      </Bloque>

      {causas.length > 0 ? (
        <Bloque label="en el atlas">
          {causas.map((cause) => (
            <Enlace
              key={cause.id}
              label={cause.name.toLowerCase()}
              hint="abre el atlas con esta causa como lente"
              onPress={() => onOpenCause(cause.id)}
            />
          ))}
        </Bloque>
      ) : null}

      {figuras.length > 0 ? (
        <Bloque label="autores">
          {figuras.map((figure) => (
            <Enlace
              key={figure.id}
              label={figure.name}
              hint="abre su ficha"
              onPress={() => onOpenFigure(figure.id)}
            />
          ))}
        </Bloque>
      ) : null}

      {cruces.length > 0 ? (
        <Bloque label="se cruza con">
          {cruces.map((otra) => (
            <Enlace
              key={otra.id}
              label={otra.title}
              hint="abre la entrada"
              onPress={() => onOpenEntry(otra.id)}
            />
          ))}
        </Bloque>
      ) : null}

      <Bloque label="sacar de aquí">
        <ExportRow sheet={entrySheet(entry, corpus)} />
      </Bloque>
    </View>
  );
}

function Campo({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.campo}>
      <Text style={styles.label}>{label}</Text>
      <Text style={styles.valor}>{value}</Text>
    </View>
  );
}

function Bloque({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <View style={styles.bloque}>
      <Text style={styles.label}>{label}</Text>
      {children}
    </View>
  );
}

function Enlace({ label, hint, onPress }: { label: string; hint: string; onPress: () => void }) {
  const alto = useTouchHeight();
  return (
    <Pressable
      accessibilityRole="link"
      accessibilityLabel={label}
      accessibilityHint={hint}
      onPress={onPress}
      style={[styles.enlace, { minHeight: alto }]}
    >
      <Text style={[styles.valor, styles.link]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  catalogo: {
    fontFamily: fonts.mono,
    fontSize: 12,
    letterSpacing: 1.2,
    color: colors.accent,
    marginBottom: space.sm,
  },
  campo: { flexDirection: 'row', alignItems: 'baseline', gap: space.sm, marginBottom: 2 },
  bloque: { marginTop: space.sm },
  label: {
    width: 78,
    fontFamily: fonts.mono,
    fontSize: 10,
    letterSpacing: 1.6,
    lineHeight: 18,
    color: colors.dim,
    textTransform: 'uppercase',
  },
  valor: {
    fontFamily: fonts.mono,
    fontSize: 12,
    lineHeight: 19,
    letterSpacing: 0.6,
    color: colors.text,
  },
  enlace: { justifyContent: 'center' },
  // Un enlace que sale de la aplicación se pulsa con el dedo como cualquier otro.
  fuenteEnlace: { paddingVertical: space.xs },
  fuente: { marginBottom: space.xs },
  fuenteMeta: {
    fontFamily: fonts.mono,
    fontSize: 10,
    lineHeight: 16,
    letterSpacing: 0.6,
    color: colors.dim,
  },
  link: { textDecorationLine: 'underline', textDecorationColor: colors.line },
});
