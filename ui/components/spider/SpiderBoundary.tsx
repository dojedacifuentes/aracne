import { Component, type ReactNode } from 'react';

type Props = {
  children: ReactNode;
  fallback: ReactNode;
  onError: () => void;
};

type State = { failed: boolean };

/**
 * La aplicación nunca se queda sin araña. Si la escena 3D falla al montarse
 * —una API que el navegador no tiene, un error del modelo—, se detiene aquí y
 * aparece la vectorial. Sin esto, un fallo dentro del lienzo se llevaría toda
 * la pantalla. Patrón heredado de MoonBoundary, en el tarot.
 */
export class SpiderBoundary extends Component<Props, State> {
  state: State = { failed: false };

  static getDerivedStateFromError(): State {
    return { failed: true };
  }

  componentDidCatch() {
    this.props.onError();
  }

  render() {
    return this.state.failed ? this.props.fallback : this.props.children;
  }
}
