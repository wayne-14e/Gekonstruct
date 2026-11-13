/**
 * GekoMark — placeholder chameleon mark for Gekonstruct.
 * Line-art, single colour (currentColor), drawn from one continuous path set so it
 * stays legible at 20px (nav) and at 160px (hero). Replace wholesale when the real
 * brand mark lands; every usage goes through this component.
 */
const BODY =
  "M41 28.5C40.4 22.8 36.6 19.6 31 18.6c-5.6-1-9.4.6-12 3.6-2 2.4-4 3.4-6 6.4-2.2 3.4-.6 7.8 3.8 9 5.8 1.6 15.6.8 20-2 2.8-1.8 4.2-4.2 4.2-7.1Z";
const LEGS = "M23 37.4 21 43.6l-3.6.6M33.6 36.8 35 43l3.6.8";
const TAIL =
  "M39.2 30C39.7 30.9 40.8 34.1 42.1 35.2c1.3 1.2 3.5 1.8 5 1.7 1.6 0 3.3-.9 4.3-1.9 1-.9 1.5-2.6 1.6-3.7 0-1.2-.6-2.5-1.2-3.2-.7-.8-1.8-1.1-2.6-1.2-.7 0-1.6.4-2 .8-.4.4-.4 1.3-.5 1.6";
const BRANCH = "M13 45c11 2 26 1.8 36-.4";

export function GekoMark({
  className,
  title,
  strokeWidth = 3.6,
}: {
  className?: string;
  /** Provide only when the mark is the sole label for something (e.g. a link). */
  title?: string;
  strokeWidth?: number;
}) {
  return (
    <svg
      viewBox="0 0 64 64"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      role={title ? "img" : undefined}
      aria-hidden={title ? undefined : true}
      aria-label={title}
    >
      {title ? <title>{title}</title> : null}
      <path d={BODY} />
      <path d={LEGS} />
      <path d={TAIL} strokeWidth={strokeWidth - 0.4} />
      <path d={BRANCH} strokeWidth={strokeWidth - 1} />
      <circle cx="20.4" cy="28.6" r="4.4" strokeWidth={2.4} />
      <circle cx="20.4" cy="28.6" r="1.6" fill="currentColor" stroke="none" />
    </svg>
  );
}
