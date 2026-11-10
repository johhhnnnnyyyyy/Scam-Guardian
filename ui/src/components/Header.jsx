
export const CONTAINER = 'mx-auto w-full max-w-6xl px-4 sm:px-6 lg:px-8';

export function Header({ nav, children }) {
 return (
  <header className="sticky top-0 z-30 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/85">
   <div className={`${CONTAINER} flex min-h-14 items-center justify-between gap-3 py-2`}>
    <a href="/" className="flex shrink-0 items-center gap-2.5 no-underline" aria-label="Scam Guardian home">
     {/* The mark is the signal lamp in miniature: three lights, one lit. */}
     <span aria-hidden="true" className="flex gap-1 rounded-full bg-primary px-1.5 py-1"><span className="size-2 rounded-full bg-lamp-safe ring-2 ring-white/70" /><span className="size-2 rounded-full bg-white/25" /><span className="size-2 rounded-full bg-white/25" /></span>
     <span className="font-serif text-lg font-semibold text-foreground max-[359px]:sr-only sm:text-xl">Scam Guardian</span>
    </a>
    {nav}
    <div className="flex min-w-0 items-center gap-2">{children}</div>
   </div>
  </header>
 );
}
