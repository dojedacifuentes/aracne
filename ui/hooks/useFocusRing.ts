import { useCallback, useState } from 'react';
import { Platform } from 'react-native';

/**
 * Última forma de interacción en web: teclado o puntero. Es lo que hace
 * `:focus-visible` en CSS, que React Native Web no expone.
 */
let keyboardModality = false;

if (Platform.OS === 'web' && typeof window !== 'undefined') {
  window.addEventListener(
    'keydown',
    (event) => {
      if (!event.metaKey && !event.ctrlKey && !event.altKey) keyboardModality = true;
    },
    true,
  );
  window.addEventListener(
    'pointerdown',
    () => {
      keyboardModality = false;
    },
    true,
  );
}

/** El foco se marca solo cuando se llega con teclado; un clic no deja anillo. */
export function useFocusRing() {
  const [focusVisible, setFocusVisible] = useState(false);
  const onFocus = useCallback(() => setFocusVisible(Platform.OS !== 'web' || keyboardModality), []);
  const onBlur = useCallback(() => setFocusVisible(false), []);
  return { focusVisible, onFocus, onBlur };
}
