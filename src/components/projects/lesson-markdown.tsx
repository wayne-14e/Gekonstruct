import type { ReactNode } from "react";

/**
 * Small markdown subset for lesson `explain` fields: headings, paragraphs, ordered and
 * unordered lists, **bold** and `inline code`. Deliberately not a markdown library — the
 * prompt asks for this constrained shape, and a tiny renderer keeps the page server-only.
 */
function inline(text: string, keyPrefix: string): ReactNode[] {
  const nodes: ReactNode[] = [];

  text.split("`").forEach((chunk, index) => {
    if (index % 2 === 1) {
      nodes.push(
        <code
          key={`${keyPrefix}-code-${index}`}
          className="rounded border border-border bg-[#0e141b] px-1 py-px font-mono text-[0.8125em] break-words text-[#a9bccb]"
        >
          {chunk}
        </code>,
      );
      return;
    }

    chunk.split("**").forEach((part, boldIndex) => {
      if (!part) return;
      if (boldIndex % 2 === 1) {
        nodes.push(
          <strong key={`${keyPrefix}-strong-${index}-${boldIndex}`} className="font-semibold text-foreground">
            {part}
          </strong>,
        );
      } else {
        nodes.push(<span key={`${keyPrefix}-text-${index}-${boldIndex}`}>{part}</span>);
      }
    });
  });

  return nodes;
}

type ListBlock = { ordered: boolean; items: string[] };

function pushParagraph(nodes: ReactNode[], lines: string[], key: string) {
  const text = lines.join(" ").trim();
  if (!text) return;
  nodes.push(
    <p key={key} className="text-[0.9375rem] leading-relaxed text-card-foreground">
      {inline(text, key)}
    </p>,
  );
}

function pushList(nodes: ReactNode[], list: ListBlock, key: string) {
  if (list.items.length === 0) return;
  const items = list.items.map((item, index) => (
    <li key={`${key}-item-${index}`} className="pl-1">
      {inline(item, `${key}-item-${index}`)}
    </li>
  ));

  nodes.push(
    list.ordered ? (
      <ol key={key} className="list-decimal space-y-1.5 pl-5 text-[0.9375rem] leading-relaxed text-card-foreground marker:text-primary">
        {items}
      </ol>
    ) : (
      <ul key={key} className="list-disc space-y-1.5 pl-5 text-[0.9375rem] leading-relaxed text-card-foreground marker:text-primary">
        {items}
      </ul>
    ),
  );
}

export function LessonMarkdown({ text }: { text: string }) {
  const nodes: ReactNode[] = [];
  let paragraph: string[] = [];
  let list: ListBlock | null = null;

  const flush = (key: string) => {
    if (list) {
      pushList(nodes, list, `${key}-list`);
      list = null;
    }
    if (paragraph.length > 0) {
      pushParagraph(nodes, paragraph, `${key}-p`);
      paragraph = [];
    }
  };

  text.split("\n").forEach((rawLine, index) => {
    const line = rawLine.trim();
    const key = `line-${index}`;

    if (!line) {
      flush(key);
      return;
    }

    const heading = /^(#{1,4})\s+(.+)$/.exec(line);
    if (heading?.[2]) {
      flush(key);
      nodes.push(
        <h3 key={key} className="pt-2 text-lg tracking-[-0.02em] text-foreground">
          {inline(heading[2], key)}
        </h3>,
      );
      return;
    }

    const bullet = /^[-*]\s+(.+)$/.exec(line);
    if (bullet?.[1]) {
      if (paragraph.length > 0) {
        pushParagraph(nodes, paragraph, `${key}-p`);
        paragraph = [];
      }
      if (!list || list.ordered) {
        if (list) pushList(nodes, list, `${key}-list`);
        list = { ordered: false, items: [] };
      }
      list.items.push(bullet[1]);
      return;
    }

    const numbered = /^\d+\.\s+(.+)$/.exec(line);
    if (numbered?.[1]) {
      if (paragraph.length > 0) {
        pushParagraph(nodes, paragraph, `${key}-p`);
        paragraph = [];
      }
      if (!list || !list.ordered) {
        if (list) pushList(nodes, list, `${key}-list`);
        list = { ordered: true, items: [] };
      }
      list.items.push(numbered[1]);
      return;
    }

    if (list) {
      pushList(nodes, list, `${key}-list`);
      list = null;
    }
    paragraph.push(line);
  });

  flush("end");

  return <div className="space-y-4">{nodes}</div>;
}
