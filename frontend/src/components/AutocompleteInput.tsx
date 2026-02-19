import { useEffect, useMemo, useRef, useState } from 'react';

export type AutocompleteItem<TMeta = unknown> = {
  key: string;
  value: string;
  meta?: TMeta;
};

function renderHighlighted(text: string, query: string) {
  const q = query.trim();
  if (!q) return text;

  const idx = text.toLowerCase().indexOf(q.toLowerCase());
  if (idx === -1) return text;

  const before = text.slice(0, idx);
  const match = text.slice(idx, idx + q.length);
  const after = text.slice(idx + q.length);

  return (
    <>
      {before}
      <strong className="autocomplete-match">{match}</strong>
      {after}
    </>
  );
}

export default function AutocompleteInput<TMeta = unknown>({
  id,
  value,
  onChange,
  items,
  onSelect,
  placeholder,
  required,
  inputClassName,
  disabled,
  maxItems = 12,
  minChars = 0,
}: {
  id?: string;
  value: string;
  onChange: (next: string) => void;
  items: Array<AutocompleteItem<TMeta>>;
  onSelect: (item: AutocompleteItem<TMeta>) => void;
  placeholder?: string;
  required?: boolean;
  inputClassName?: string;
  disabled?: boolean;
  maxItems?: number;
  minChars?: number;
}) {
  const wrapperRef = useRef<HTMLDivElement | null>(null);
  const [open, setOpen] = useState(false);

  const query = value ?? '';

  const visibleItems = useMemo(() => {
    const q = query.trim().toLowerCase();
    const base = q ? items.filter((i) => i.value.toLowerCase().includes(q)) : items;
    return base.slice(0, maxItems);
  }, [items, maxItems, query]);

  useEffect(() => {
    const onDocMouseDown = (e: MouseEvent) => {
      const el = wrapperRef.current;
      if (!el) return;
      if (!el.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', onDocMouseDown);
    return () => document.removeEventListener('mousedown', onDocMouseDown);
  }, []);

  const showMenu = open && visibleItems.length > 0 && query.trim().length >= minChars;

  return (
    <div ref={wrapperRef} className="autocomplete">
      <input
        id={id}
        type="text"
        value={value}
        onChange={(e) => {
          onChange(e.target.value);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        onBlur={() => {
          // Let click selection happen (onMouseDown) before closing
          setTimeout(() => setOpen(false), 0);
        }}
        placeholder={placeholder}
        className={inputClassName}
        required={required}
        disabled={disabled}
        autoComplete="off"
      />

      {showMenu && (
        <div className="autocomplete-menu" role="listbox">
          {visibleItems.map((item) => (
            <div
              key={item.key}
              className="autocomplete-item"
              role="option"
              tabIndex={-1}
              onMouseDown={(e) => {
                // Prevent input blur before selection
                e.preventDefault();
                onSelect(item);
                setOpen(false);
              }}
            >
              {renderHighlighted(item.value, query)}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}


