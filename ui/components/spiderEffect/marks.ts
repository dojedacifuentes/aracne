import { Platform, type ViewProps } from 'react-native';

/**
 * Cómo se le señala algo a la entidad sin tocar la lógica de quien lo pinta:
 * se esparce una de estas marcas en las props de un `View` o un `Pressable`.
 * En web salen como atributos `data-aracne-*`, que es lo que buscan los
 * selectores de `spiderEffectConfig.ts`; en nativo no hay entidad y no salen.
 *
 * `dataSet` lo entiende react-native-web, pero los tipos de React Native no
 * lo declaran: por eso se devuelve ya como `ViewProps`.
 */
const WEB = Platform.OS === 'web';

/** Un nodo de la red: la entidad tiende hilos hacia él. El id viaja en los eventos. */
export function aracneNode(id: string): ViewProps {
  return WEB ? ({ dataSet: { aracneNode: id } } as ViewProps) : {};
}

/** Texto que se está leyendo: con el cursor encima, la entidad casi desaparece. */
export function aracneQuiet(): ViewProps {
  return WEB ? ({ dataSet: { aracneQuiet: 'lectura' } } as ViewProps) : {};
}

/** Donde no entra: al acercarse el cursor, se retira. */
export function aracneAvoid(name: string): ViewProps {
  return WEB ? ({ dataSet: { aracneAvoid: name } } as ViewProps) : {};
}
