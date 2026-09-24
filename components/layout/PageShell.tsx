import { type ReactNode } from "react";

export function PageShell({
  children,
  eyebrow,
  title,
  copy,
}: {
  children: ReactNode;
  eyebrow?: string;
  title: string;
  copy?: string;
}) {
  return (
    <main className="page-shell min-h-[65vh] py-12 md:py-16">
      {eyebrow && (
        <p className="mb-2 text-[9px] font-semibold uppercase tracking-[0.3em] text-rosewood">
          {eyebrow}
        </p>
      )}
      <h1 className="font-display text-4xl sm:text-5xl md:text-6xl text-foreground tracking-tight">
        {title}
      </h1>
      {copy && (
        <p className="mt-4 max-w-xl text-sm leading-relaxed text-muted-foreground">{copy}</p>
      )}
      <div className="mt-8">{children}</div>
    </main>
  );
}

export default PageShell;
