import { Logo } from "@/components/brand/logo";

function TelegramIcon() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      fill="none"
      className="size-4"
    >
      <path
        d="M21.7 3.4 18.5 20c-.24 1.08-1.19 1.35-2.06.85l-5.2-3.83-2.51 2.42c-.28.28-.51.51-1.05.51l.38-5.34 9.72-8.79c.42-.38-.09-.59-.65-.22L5.1 13.58.95 12.2c-1.04-.32-1.06-1.04.22-1.54L20.32 2.1c.87-.32 1.63.21 1.38 1.3Z"
        fill="currentColor"
      />
    </svg>
  );
}

export function SiteFooter() {
  return (
    <footer className="mt-auto border-t border-border/70 py-8">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-3 px-4 text-sm text-muted-foreground sm:flex-row sm:items-center sm:justify-between sm:px-6">
        <div className="flex items-center gap-3">
          <Logo showWordmark={false} />
          <span>
            Gekonstruct — built for people who shipped before they understood.
          </span>
        </div>
        <div className="flex flex-col items-start gap-2 sm:items-end">
          <nav aria-label="Gekonstruct community" className="flex items-center gap-2">
            <a
              className="inline-flex min-h-10 items-center gap-2 rounded-lg border-2 border-[#5be000] bg-[#5be000] px-3.5 py-2 font-mono text-xs font-bold text-[#0b0f14] shadow-[3px_3px_0_rgba(91,224,0,0.22)] transition-transform hover:-translate-y-0.5 hover:bg-[#74ef18] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ring"
              href="https://t.me/gekonstruct"
              target="_blank"
              rel="noopener noreferrer"
            >
              <TelegramIcon />
              Telegram channel
            </a>
            <a
              className="inline-flex min-h-10 items-center gap-2 rounded-lg border-2 border-[#5be000] bg-[#5be000] px-3.5 py-2 font-mono text-xs font-bold text-[#0b0f14] shadow-[3px_3px_0_rgba(91,224,0,0.22)] transition-transform hover:-translate-y-0.5 hover:bg-[#74ef18] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ring"
              href="https://t.me/gekonstruct_chat"
              target="_blank"
              rel="noopener noreferrer"
            >
              <TelegramIcon />
              Telegram chat
            </a>
          </nav>
        </div>
      </div>
    </footer>
  );
}
