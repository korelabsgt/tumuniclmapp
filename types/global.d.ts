declare global {
  namespace JSX {
    interface IntrinsicElements {
      'lord-icon': React.DetailedHTMLProps<React.HTMLAttributes<HTMLElement>, HTMLElement> & {
        src?: string;
        trigger?: string;
        target?: string;
        delay?: string | number;
        colors?: string;
        style?: React.CSSProperties;
      };
    }
  }
}

export {};