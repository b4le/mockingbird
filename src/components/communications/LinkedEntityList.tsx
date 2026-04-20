interface LinkedEntityListItem {
  key: string;
  text: string;
}

interface LinkedEntityListProps {
  label: string;
  items: LinkedEntityListItem[];
}

/**
 * Presentational list used in the Communications detail panel to render
 * linked entities (conversations, actions, claims, evidence, risks).
 * Keeps the detail panel markup lean when used 5x per communication.
 */
export function LinkedEntityList({ label, items }: LinkedEntityListProps) {
  if (items.length === 0) return null;
  return (
    <div>
      <p className="mb-1.5 text-xs font-medium text-muted-foreground">
        {label}
      </p>
      <ul className="space-y-1 text-sm">
        {items.map((item) => (
          <li key={item.key} className="line-clamp-1">
            {item.text}
          </li>
        ))}
      </ul>
    </div>
  );
}
