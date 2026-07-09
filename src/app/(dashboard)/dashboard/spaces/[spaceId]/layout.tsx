import { ReactNode } from "react";

export default function SpaceLayout({ children }: { children: ReactNode }) {
  return <div className="mx-auto max-w-5xl">{children}</div>;
}
