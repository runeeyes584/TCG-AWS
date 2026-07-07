"use client";

import { LogEntry } from "../hooks/useLocalGame";

interface ActionLogProps {
  entries: LogEntry[];
}

export function ActionLog({ entries }: ActionLogProps) {
  return (
    <aside className="action-log">
      <h2>Action Log</h2>
      <ol className="log-list">
        {entries.map((entry) => (
          <li key={entry.id}>{entry.message}</li>
        ))}
      </ol>
    </aside>
  );
}
