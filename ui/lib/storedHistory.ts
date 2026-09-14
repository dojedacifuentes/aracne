import AsyncStorage from '@react-native-async-storage/async-storage';

import { parseHistory, pushHistory } from '../../lib/oracle/history';

/** AsyncStorage usa localStorage en web y el almacenamiento del sistema en nativo. */
const KEY = 'aracne.history';

export async function readHistory(): Promise<string[]> {
  try {
    return parseHistory(await AsyncStorage.getItem(KEY));
  } catch {
    return [];
  }
}

export async function rememberEntries(ids: readonly string[]): Promise<void> {
  try {
    const next = pushHistory(await readHistory(), ids);
    await AsyncStorage.setItem(KEY, JSON.stringify(next));
  } catch {
    // Sin almacenamiento la invocación funciona igual; solo repite antes.
  }
}
