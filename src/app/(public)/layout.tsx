import type { ReactNode } from "react";
import { Header } from "@/components/Header";
import { PostsProvider } from "@/context/PostsProvider";

export default function PublicLayout({ children }: { children: ReactNode }) {
  return (
    <PostsProvider>
      <Header />
      <main>{children}</main>
    </PostsProvider>
  );
}
