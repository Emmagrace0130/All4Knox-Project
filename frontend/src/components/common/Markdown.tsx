import type { ReactNode } from 'react';

/**
 * Minimal markdown renderer for assistant output.
 *
 * WHY NOT react-markdown
 * ----------------------
 * This renders MODEL OUTPUT into a clinical UI. The safest property such a
 * renderer can have is that it *structurally cannot* emit raw HTML — there is
 * no `dangerouslySetInnerHTML` anywhere below, only React elements. That rules
 * out an entire class of injection regardless of what the model produces, and
 * it is auditable in one file rather than across a dependency tree.
 *
 * Supported: headings, bold, italic, inline code, fenced code, ordered and
 * unordered lists (incl. nesting by indent), blockquotes, links, tables,
 * horizontal rules, paragraphs.
 *
 * Unsupported syntax degrades to visible literal text rather than vanishing —
 * a clinician seeing odd characters is far better than silently losing a line
 * of guidance.
 */

/* ------------------------------------------------------------------ */
/* Inline                                                              */
/* ------------------------------------------------------------------ */

/** Only http(s) and in-app links. Refuses javascript:, data:, etc. */
function safeHref(raw: string): string | null {
  const href = raw.trim();
  if (href.startsWith('/') || href.startsWith('#')) return href;
  try {
    const url = new URL(href);
    return url.protocol === 'http:' || url.protocol === 'https:' ? href : null;
  } catch {
    return null;
  }
}

/**
 * Inline formatting. Ordered so that longer delimiters are matched first
 * (`**` before `*`), and code spans win over everything inside them.
 */
const INLINE = [
  { re: /`([^`]+)`/, render: (m: string, k: string) => <code key={k}>{m}</code> },
  { re: /\*\*([^*]+)\*\*/, render: (m: string, k: string) => <strong key={k}>{m}</strong> },
  { re: /__([^_]+)__/, render: (m: string, k: string) => <strong key={k}>{m}</strong> },
  { re: /\*([^*]+)\*/, render: (m: string, k: string) => <em key={k}>{m}</em> },
  { re: /_([^_]+)_/, render: (m: string, k: string) => <em key={k}>{m}</em> },
  { re: /~~([^~]+)~~/, render: (m: string, k: string) => <del key={k}>{m}</del> },
];

function renderInline(text: string, keyPrefix = 'i'): ReactNode[] {
  // Links first — their label may itself contain emphasis.
  const link = /\[([^\]]+)\]\(([^)\s]+)\)/.exec(text);
  if (link) {
    const [full, label, target] = link;
    const before = text.slice(0, link.index);
    const after = text.slice(link.index + full.length);
    const href = safeHref(target);
    return [
      ...renderInline(before, `${keyPrefix}b`),
      href ? (
        <a
          key={`${keyPrefix}l`}
          href={href}
          target={href.startsWith('http') ? '_blank' : undefined}
          rel={href.startsWith('http') ? 'noopener noreferrer' : undefined}
        >
          {renderInline(label, `${keyPrefix}ll`)}
        </a>
      ) : (
        // Refused scheme: show the text, never the link.
        <span key={`${keyPrefix}l`}>{label}</span>
      ),
      ...renderInline(after, `${keyPrefix}a`),
    ];
  }

  for (const { re, render } of INLINE) {
    const match = re.exec(text);
    if (!match) continue;
    const [full, inner] = match;
    return [
      ...renderInline(text.slice(0, match.index), `${keyPrefix}b`),
      render(inner, `${keyPrefix}m`),
      ...renderInline(text.slice(match.index + full.length), `${keyPrefix}a`),
    ];
  }

  return text ? [text] : [];
}

/* ------------------------------------------------------------------ */
/* Block                                                               */
/* ------------------------------------------------------------------ */

interface ListItem {
  indent: number;
  content: string;
}

const listItemOf = (line: string): (ListItem & { ordered: boolean }) | null => {
  const bullet = /^(\s*)[-*+]\s+(.*)$/.exec(line);
  if (bullet) return { indent: bullet[1].length, content: bullet[2], ordered: false };
  const ordered = /^(\s*)\d+[.)]\s+(.*)$/.exec(line);
  if (ordered) return { indent: ordered[1].length, content: ordered[2], ordered: true };
  return null;
};

/** Renders a run of list items, nesting by indentation. */
function renderList(
  items: (ListItem & { ordered: boolean })[],
  key: string,
): ReactNode {
  const ordered = items[0].ordered;
  const base = items[0].indent;
  const children: ReactNode[] = [];

  for (let i = 0; i < items.length; ) {
    const item = items[i];
    const nested: (ListItem & { ordered: boolean })[] = [];
    let j = i + 1;
    while (j < items.length && items[j].indent > base) {
      nested.push(items[j]);
      j += 1;
    }
    children.push(
      <li key={`${key}-${i}`}>
        {renderInline(item.content, `${key}-${i}`)}
        {nested.length > 0 ? renderList(nested, `${key}-${i}n`) : null}
      </li>,
    );
    i = j;
  }

  return ordered ? (
    <ol key={key}>{children}</ol>
  ) : (
    <ul key={key}>{children}</ul>
  );
}

function renderTable(rows: string[], key: string): ReactNode {
  const cells = (row: string) =>
    row
      .replace(/^\s*\|/, '')
      .replace(/\|\s*$/, '')
      .split('|')
      .map((c) => c.trim());

  const header = cells(rows[0]);
  // rows[1] is the |---|---| separator
  const body = rows.slice(2).map(cells);

  return (
    <div className="md-table-wrap" key={key}>
      <table className="md-table">
        <thead>
          <tr>
            {header.map((h, i) => (
              <th key={i}>{renderInline(h, `${key}h${i}`)}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {body.map((row, r) => (
            <tr key={r}>
              {row.map((c, i) => (
                <td key={i}>{renderInline(c, `${key}r${r}c${i}`)}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function Markdown({ children }: { children: string }) {
  const lines = (children ?? '').replace(/\r\n/g, '\n').split('\n');
  const blocks: ReactNode[] = [];
  let i = 0;
  let key = 0;

  while (i < lines.length) {
    const line = lines[i];
    const k = `b${key++}`;

    // fenced code
    if (/^\s*```/.test(line)) {
      const lang = line.replace(/^\s*```/, '').trim();
      const buf: string[] = [];
      i += 1;
      while (i < lines.length && !/^\s*```/.test(lines[i])) {
        buf.push(lines[i]);
        i += 1;
      }
      i += 1; // closing fence
      blocks.push(
        <pre key={k} className="md-code" data-lang={lang || undefined}>
          <code>{buf.join('\n')}</code>
        </pre>,
      );
      continue;
    }

    // blank
    if (!line.trim()) {
      i += 1;
      continue;
    }

    // horizontal rule
    if (/^\s*([-*_])\s*\1\s*\1[\s\S]*$/.test(line) && !listItemOf(line)) {
      blocks.push(<hr key={k} />);
      i += 1;
      continue;
    }

    // heading
    const heading = /^(#{1,6})\s+(.*)$/.exec(line);
    if (heading) {
      const level = heading[1].length;
      // Assistant answers live under the page's own <h2>, so shift down a
      // level to keep the document outline sane for screen readers.
      const Tag = (`h${Math.min(6, level + 2)}`) as 'h3';
      blocks.push(<Tag key={k}>{renderInline(heading[2], k)}</Tag>);
      i += 1;
      continue;
    }

    // table
    if (
      /^\s*\|/.test(line) &&
      i + 1 < lines.length &&
      /^\s*\|?[\s:-]*-[\s|:-]*$/.test(lines[i + 1])
    ) {
      const rows: string[] = [];
      while (i < lines.length && /^\s*\|/.test(lines[i])) {
        rows.push(lines[i]);
        i += 1;
      }
      if (rows.length >= 2) {
        blocks.push(renderTable(rows, k));
        continue;
      }
    }

    // blockquote
    if (/^\s*>\s?/.test(line)) {
      const buf: string[] = [];
      while (i < lines.length && /^\s*>\s?/.test(lines[i])) {
        buf.push(lines[i].replace(/^\s*>\s?/, ''));
        i += 1;
      }
      blocks.push(
        <blockquote key={k}>
          <Markdown>{buf.join('\n')}</Markdown>
        </blockquote>,
      );
      continue;
    }

    // list
    if (listItemOf(line)) {
      const items: (ListItem & { ordered: boolean })[] = [];
      while (i < lines.length) {
        const item = listItemOf(lines[i]);
        if (item) {
          items.push(item);
          i += 1;
        } else if (lines[i].trim() && /^\s{2,}/.test(lines[i]) && items.length) {
          // continuation of the previous item
          items[items.length - 1].content += ` ${lines[i].trim()}`;
          i += 1;
        } else {
          break;
        }
      }
      blocks.push(renderList(items, k));
      continue;
    }

    // paragraph — consume until a blank line or a new block starts
    const buf: string[] = [];
    while (
      i < lines.length &&
      lines[i].trim() &&
      !listItemOf(lines[i]) &&
      !/^(#{1,6})\s/.test(lines[i]) &&
      !/^\s*```/.test(lines[i]) &&
      !/^\s*>\s?/.test(lines[i]) &&
      !/^\s*\|/.test(lines[i])
    ) {
      buf.push(lines[i].trim());
      i += 1;
    }
    if (buf.length) blocks.push(<p key={k}>{renderInline(buf.join(' '), k)}</p>);
  }

  return <div className="md">{blocks}</div>;
}
