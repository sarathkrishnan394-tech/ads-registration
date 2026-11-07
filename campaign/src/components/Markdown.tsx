import type { ReactNode } from "react";

function applyInline(text: string) {
  const parts: Array<{ t: string; bold: boolean }> = [];
  const re = /\*\*(.+?)\*\*/g;
  let last = 0;
  let match: RegExpExecArray | null;
  while ((match = re.exec(text))) {
    if (match.index > last) parts.push({ t: text.slice(last, match.index), bold: false });
    parts.push({ t: match[1]!, bold: true });
    last = match.index + match[0].length;
  }
  if (last < text.length) parts.push({ t: text.slice(last), bold: false });
  return parts.map((p, i) => (p.bold ? <strong key={i}>{p.t}</strong> : <span key={i}>{p.t}</span>));
}

function parseTable(lines: string[], start: number) {
  const rows: string[][] = [];
  let i = start;
  while (i < lines.length && lines[i]!.trim().startsWith("|")) {
    const cells = lines[i]!.split("|").slice(1, -1).map((c) => c.trim());
    if (!cells.every((c) => /^:?-{3,}:?$/.test(c))) rows.push(cells);
    i += 1;
  }
  return { rows, end: i };
}

export function Markdown({ text }: { text: string }) {
  const lines = text.replace(/\r\n/g, "\n").split("\n");
  const blocks: ReactNode[] = [];
  let i = 0;
  let key = 0;
  while (i < lines.length) {
    const line = lines[i] ?? "";
    if (line.trim() === "") {
      i += 1;
      continue;
    }
    if (line.startsWith("# ")) {
      blocks.push(<h1 key={key++}>{applyInline(line.slice(2))}</h1>);
      i += 1;
      continue;
    }
    if (line.startsWith("## ")) {
      blocks.push(<h2 key={key++}>{applyInline(line.slice(3))}</h2>);
      i += 1;
      continue;
    }
    if (line.startsWith("### ")) {
      blocks.push(<h3 key={key++}>{applyInline(line.slice(4))}</h3>);
      i += 1;
      continue;
    }
    if (line.trim().startsWith("|")) {
      const table = parseTable(lines, i);
      const [header, ...body] = table.rows;
      blocks.push(
        <table key={key++}>
          {header ? (
            <thead>
              <tr>
                {header.map((cell) => (
                  <th key={cell}>{cell}</th>
                ))}
              </tr>
            </thead>
          ) : null}
          <tbody>
            {body.map((row, ri) => (
              <tr key={ri}>
                {row.map((cell, ci) => (
                  <td key={ci}>{applyInline(cell)}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>,
      );
      i = table.end;
      continue;
    }
    if (line.trim().startsWith("- ")) {
      const items: string[] = [];
      while (i < lines.length && lines[i]!.trim().startsWith("- ")) {
        items.push(lines[i]!.trim().slice(2));
        i += 1;
      }
      blocks.push(
        <ul key={key++}>
          {items.map((item) => (
            <li key={item}>{applyInline(item)}</li>
          ))}
        </ul>,
      );
      continue;
    }
    const para: string[] = [];
    while (i < lines.length && lines[i]!.trim() !== "" && !lines[i]!.startsWith("#") && !lines[i]!.trim().startsWith("|") && !lines[i]!.trim().startsWith("- ")) {
      para.push(lines[i]!);
      i += 1;
    }
    blocks.push(<p key={key++}>{applyInline(para.join(" "))}</p>);
  }
  return <div className="markdown">{blocks}</div>;
}
