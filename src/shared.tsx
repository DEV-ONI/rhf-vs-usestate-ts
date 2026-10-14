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
  return (
    <span key={n} className="renders" title="Times this component has rendered">
      {n}
    </span>
  );
}
