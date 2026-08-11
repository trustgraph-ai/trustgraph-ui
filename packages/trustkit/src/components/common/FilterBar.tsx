import { FilterButton } from "./FilterButton";
import { useTheme } from "../../theme/ThemeContext";

export interface FilterItem {
  key: string;
  label: string;
  icon?: string;
  color?: string;
}

interface FilterBarProps {
  items: FilterItem[];
  selectedKey: string | null;
  onSelect: (key: string | null) => void;
  stats?: string;
  showAll?: boolean;
  allLabel?: string;
  emptyMessage?: string;
  maxItems?: number;
}

export function FilterBar({
  items,
  selectedKey,
  onSelect,
  stats,
  showAll = true,
  allLabel = "All",
  emptyMessage,
  maxItems = 10,
}: FilterBarProps) {
  const { theme, sz } = useTheme();
  const displayItems = items.slice(0, maxItems);

  return (
    <div style={{
      padding: "12px 28px",
      display: "flex",
      gap: 8,
      alignItems: "center",
      borderBottom: `1px solid ${theme.border.subtle}`,
      flexWrap: "wrap",
    }}>
      <span style={{ fontSize: sz(11), color: theme.text.disabled, fontFamily: theme.font.mono, marginRight: 8 }}>
        FILTER:
      </span>

      {emptyMessage && items.length === 0 ? (
        <span style={{ fontSize: sz(11), color: theme.text.disabled, fontStyle: "italic" }}>{emptyMessage}</span>
      ) : (
        <>
          {showAll && (
            <FilterButton
              label={allLabel}
              isActive={!selectedKey}
              onClick={() => onSelect(null)}
            />
          )}
          {displayItems.map((item) => (
            <FilterButton
              key={item.key}
              label={item.label}
              icon={item.icon}
              color={item.color}
              isActive={selectedKey === item.key}
              onClick={() => onSelect(selectedKey === item.key ? null : item.key)}
            />
          ))}
        </>
      )}

      {stats && (
        <div style={{ marginLeft: "auto", fontSize: sz(11), color: theme.text.hint, fontFamily: theme.font.mono }}>
          {stats}
        </div>
      )}
    </div>
  );
}
