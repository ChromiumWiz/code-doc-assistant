import { ChatSource } from "../lib/types";

function formatRange(source: ChatSource): string {
  const start = source.start_line ?? source.start;
  const end = source.end_line ?? source.end;
  if (start && end) return `${start}-${end}`;
  if (start) return `${start}`;
  return "";
}

export default function SourceList({ sources }: { sources?: ChatSource[] }) {
  if (!sources || sources.length === 0) return null;

  const uniqueSources: ChatSource[] = [];
  const seen = new Set<string>();
  for (const source of sources) {
    const range = formatRange(source);
    const key = `${source.path}:${range}`;
    if (seen.has(key)) continue;
    seen.add(key);
    uniqueSources.push(source);
  }

  return (
    <div className="source-list">
      <div>Sources:</div>
      <ul>
        {uniqueSources.map((source, idx) => {
          const range = formatRange(source);
          return (
            <li key={`${source.path}-${idx}`}>
              {source.path}
              {range ? `:${range}` : ""}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
