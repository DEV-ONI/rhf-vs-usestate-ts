import { useRef } from "react";

export type SignUpValues = {
  name: string;
  email: string;
  password: string;
};

export function useRenderCount(): number {
  const count = useRef(0);
  count.current += 1;
  return count.current;
}

export function RenderCount({ n }: { n: number }) {
  return <small> (renders: {n})</small>;
}
