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

  return (
    <div className="source-list">
      <div>Sources:</div>
      <ul>
        {sources.map((source, idx) => {
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
