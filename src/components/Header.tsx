import Link from "next/link";

export function Header() {
  return (
    <header className="sticky top-0 z-10 border-b border-zinc-200 bg-white/90 backdrop-blur-md">
      <div className="mx-auto flex max-w-3xl items-center justify-between gap-4 px-4 py-4">
        <Link
          href="/"
          className="text-lg font-semibold tracking-tight text-zinc-900 transition hover:text-zinc-600"
        >
          AddBuy<span className="text-zinc-500">+</span>C
        </Link>
        <nav className="flex items-center gap-3">
          <Link
            href="/"
            className="text-sm font-medium text-zinc-600 transition hover:text-zinc-900"
          >
            Home
          </Link>
          <Link
            href="/new"
            className="rounded-full bg-zinc-900 px-4 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-zinc-800"
          >
            New post
          </Link>
        </nav>
      </div>
    </header>
  );
}
