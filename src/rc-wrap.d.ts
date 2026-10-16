export {};

declare module 'react' {
  namespace JSX {
    interface IntrinsicElements {
      'rc-wrap': React.DetailedHTMLProps<React.HTMLAttributes<HTMLElement>, HTMLElement>;
    }
  }
}
