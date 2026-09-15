import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { buildPdf } from '../../lib/export/pdf';
import { sheetPdf, sheetText, type Sheet } from '../../lib/export/sheet';
import { useFocusRing } from '../hooks/useFocusRing';
import { useTouchHeight } from '../hooks/useTouch';
import { copyText, downloadPdf, downloadText } from '../lib/download';
import { colors, fonts, machine, space } from '../theme';

type Props = {
  sheet: Sheet;
};

/**
 * Sacar el texto de aquí.
 *
 * Tres salidas para lo mismo: el portapapeles, un `.txt` crudo y un `.pdf`.
 * El texto y el PDF salen de la misma hoja, así que no pueden decir cosas
 * distintas. El PDF se escribe a mano —`lib/export/pdf.ts`—: no hay librería
 * de por medio.
 */
export function ExportRow({ sheet }: Props) {
  const [dicho, setDicho] = useState<string | null>(null);

  useEffect(() => {
    if (!dicho) return;
    const plazo = setTimeout(() => setDicho(null), 2200);
    return () => clearTimeout(plazo);
  }, [dicho]);

  return (
    <View style={styles.row}>
      <Text style={styles.label}>llevártelo</Text>
      <Salida
        label="copiar"
        onPress={async () => setDicho((await copyText(sheetText(sheet))) ? 'copiado' : 'no se pudo copiar')}
      />
      <Salida
        label="texto"
        onPress={() => setDicho(downloadText(sheet.filename, sheetText(sheet)) ? 'txt descargado' : 'solo en web')}
      />
      <Salida
        label="pdf"
        onPress={() => setDicho(downloadPdf(sheet.filename, buildPdf(sheetPdf(sheet))) ? 'pdf descargado' : 'solo en web')}
      />
      {dicho ? <Text style={styles.said}>{dicho}</Text> : null}
    </View>
  );
}

function Salida({ label, onPress }: { label: string; onPress: () => void }) {
  const { focusVisible, onFocus, onBlur } = useFocusRing();
  const [hovered, setHovered] = useState(false);
  const alto = useTouchHeight();

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      onHoverIn={() => setHovered(true)}
      onHoverOut={() => setHovered(false)}
      onFocus={onFocus}
      onBlur={onBlur}
      style={[styles.button, { minHeight: alto }, hovered && styles.hovered, focusVisible && styles.focus]}
    >
      <Text style={[styles.buttonText, hovered && styles.buttonTextOn]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: space.xs,
    marginTop: space.md,
    paddingTop: space.sm,
    borderTopWidth: 1,
    borderTopColor: colors.line,
  },
  label: {
    fontFamily: fonts.mono,
    fontSize: 10,
    letterSpacing: 2,
    color: colors.dim,
    textTransform: 'uppercase',
    marginRight: space.xs,
  },
  button: {
    minHeight: 30,
    justifyContent: 'center',
    paddingHorizontal: space.sm,
    borderWidth: 1,
    borderColor: colors.line,
    outlineWidth: 0,
  },
  hovered: { borderColor: machine },
  buttonText: { fontFamily: fonts.mono, fontSize: 11, letterSpacing: 1.2, color: colors.dim },
  buttonTextOn: { color: machine },
  said: { fontFamily: fonts.mono, fontSize: 11, letterSpacing: 1.2, color: machine },
  focus: { outlineColor: machine, outlineStyle: 'solid', outlineWidth: 1, outlineOffset: 2 },
});
