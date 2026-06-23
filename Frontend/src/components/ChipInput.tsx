import { useState, type KeyboardEvent } from 'react';
import { Input } from '@/components/ui/input';
import { X } from 'lucide-react';

interface ChipInputProps {
  value: string[];
  onChange: (next: string[]) => void;
  placeholder?: string;
  /** Soft cap on number of chips. Extras are silently ignored. */
  max?: number;
  /** Suggestions rendered as one-tap pills above the input. */
  suggestions?: string[];
}

/**
 * Tag-style input. Press Enter or comma to commit a chip; backspace at the
 * empty input deletes the last one.
 */
export const ChipInput = ({
  value,
  onChange,
  placeholder,
  max = 20,
  suggestions = [],
}: ChipInputProps) => {
  const [draft, setDraft] = useState('');

  const commit = (raw: string) => {
    const v = raw.trim().replace(/,$/, '');
    if (!v) return;
    if (value.includes(v) || value.length >= max) {
      setDraft('');
      return;
    }
    onChange([...value, v]);
    setDraft('');
  };

  const handleKey = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      commit(draft);
    } else if (e.key === 'Backspace' && !draft && value.length) {
      onChange(value.slice(0, -1));
    }
  };

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center gap-1.5 rounded-card border border-input bg-background px-2 py-1.5">
        {value.map((v) => (
          <span
            key={v}
            className="inline-flex items-center gap-1 rounded-full bg-secondary px-2 py-0.5 text-xs"
          >
            {v}
            <button
              type="button"
              onClick={() => onChange(value.filter((x) => x !== v))}
              className="text-muted-foreground hover:text-foreground"
              aria-label={`Remove ${v}`}
            >
              <X className="h-3 w-3" />
            </button>
          </span>
        ))}
        <Input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={handleKey}
          onBlur={() => draft && commit(draft)}
          placeholder={value.length === 0 ? placeholder : ''}
          className="h-7 flex-1 min-w-32 border-0 bg-transparent px-1 focus-visible:ring-0"
        />
      </div>
      {suggestions.filter((s) => !value.includes(s)).length > 0 && (
        <div className="flex flex-wrap gap-1">
          {suggestions
            .filter((s) => !value.includes(s))
            .slice(0, 8)
            .map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => commit(s)}
                className="rounded-full border border-dashed border-border bg-card px-2 py-0.5 text-xs text-muted-foreground hover:border-primary hover:text-foreground"
              >
                + {s}
              </button>
            ))}
        </div>
      )}
    </div>
  );
};
