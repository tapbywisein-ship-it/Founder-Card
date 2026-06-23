import { motion } from 'framer-motion';

export interface Category {
  id: string;
  label: string;
  emoji: string;
  gradient: string;
  count?: number;
}

export const CATEGORIES: Category[] = [
  { id: 'Tech',        label: 'Tech',       emoji: '💻', gradient: 'from-blue-500/20 to-indigo-500/20' },
  { id: 'Business',   label: 'Business',   emoji: '📈', gradient: 'from-amber-500/20 to-orange-500/20' },
  { id: 'Design',     label: 'Design',     emoji: '🎨', gradient: 'from-pink-500/20 to-rose-500/20' },
  { id: 'Health',     label: 'Health',     emoji: '🧘', gradient: 'from-green-500/20 to-emerald-500/20' },
  { id: 'Social',     label: 'Social',     emoji: '🤝', gradient: 'from-violet-500/20 to-purple-500/20' },
  { id: 'AI',         label: 'AI / ML',    emoji: '🤖', gradient: 'from-cyan-500/20 to-teal-500/20' },
  { id: 'Startup',    label: 'Startup',    emoji: '🚀', gradient: 'from-yellow-500/20 to-amber-500/20' },
  { id: 'Other',      label: 'Other',      emoji: '✨', gradient: 'from-slate-500/20 to-gray-500/20' },
];

interface CategoryGridProps {
  selected?: string;
  onSelect: (id: string) => void;
  counts?: Record<string, number>;
}

export const CategoryGrid = ({ selected, onSelect, counts }: CategoryGridProps) => (
  <div className="grid grid-cols-4 gap-2.5">
    {CATEGORIES.map((cat, i) => {
      const active = selected === cat.id;
      return (
        <motion.button
          key={cat.id}
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: i * 0.04, duration: 0.25 }}
          onClick={() => onSelect(active ? '' : cat.id)}
          className={`relative flex flex-col items-center justify-center gap-1.5 p-3 rounded-2xl border transition-all ${
            active
              ? 'border-primary/40 bg-primary/10 shadow-sm shadow-primary/10'
              : 'border-border hover:border-primary/20 hover:bg-muted/40'
          }`}
        >
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-xl bg-gradient-to-br ${cat.gradient}`}>
            {cat.emoji}
          </div>
          <span className={`text-[10px] font-medium text-center leading-tight ${active ? 'text-primary' : 'text-muted-foreground'}`}>
            {cat.label}
          </span>
          {(counts?.[cat.id] ?? 0) > 0 && (
            <span className="absolute top-2 right-2 text-[9px] font-semibold text-muted-foreground/60">
              {counts![cat.id]}
            </span>
          )}
        </motion.button>
      );
    })}
  </div>
);
