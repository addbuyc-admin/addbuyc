import type { ReactNode } from "react";
import { Header } from "@/components/Header";

export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <>
      <Header />
      <main>{children}</main>
    </>
  );
}
