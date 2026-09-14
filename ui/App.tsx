import { JetBrainsMono_400Regular } from '@expo-google-fonts/jetbrains-mono';
import { Newsreader_400Regular } from '@expo-google-fonts/newsreader';
import { useFonts } from 'expo-font';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { useReduceMotion } from './hooks/useReduceMotion';
import { HomeScreen } from './screens/HomeScreen';
import { colors } from './theme';

/** Si las fuentes tardan más que esto, se entra con las del sistema. */
const FONT_PATIENCE_MS = 1500;

export default function App() {
  const reduceMotion = useReduceMotion();
  const [fontsLoaded, fontError] = useFonts({ Newsreader_400Regular, JetBrainsMono_400Regular });
  const [impatient, setImpatient] = useState(false);

  useEffect(() => {
    const id = setTimeout(() => setImpatient(true), FONT_PATIENCE_MS);
    return () => clearTimeout(id);
  }, []);

  // Se espera a las fuentes para que el texto no salte al cambiar de familia.
  const ready = fontsLoaded || fontError !== null || impatient;

  return (
    <SafeAreaProvider>
      <View style={styles.root}>
        <StatusBar style="light" />
        {ready ? <HomeScreen reduceMotion={reduceMotion} /> : null}
      </View>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
});
