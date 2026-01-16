import { cn } from "@/lib/utils";
import { VENUE_CATEGORY_LIST, type VenueCategory } from "@/lib/venue-categories";

interface VenueCategoryTabsProps {
  selectedCategory: VenueCategory | null;
  onSelectCategory: (category: VenueCategory | null) => void;
}

export function VenueCategoryTabs({
  selectedCategory,
  onSelectCategory,
}: VenueCategoryTabsProps) {
  return (
    <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-none">
      {/* All tab */}
      <button
        onClick={() => onSelectCategory(null)}
        className={cn(
          "flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition-colors",
          selectedCategory === null
            ? "bg-primary text-primary-foreground"
            : "bg-secondary text-secondary-foreground hover:bg-secondary/80"
        )}
      >
        All
      </button>

      {/* Category tabs */}
      {VENUE_CATEGORY_LIST.map((category) => {
        const Icon = category.icon;
        const isSelected = selectedCategory === category.id;

        return (
          <button
            key={category.id}
            onClick={() => onSelectCategory(category.id as VenueCategory)}
            className={cn(
              "flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition-colors",
              isSelected
                ? "bg-primary text-primary-foreground"
                : "bg-secondary text-secondary-foreground hover:bg-secondary/80"
            )}
          >
            <Icon className="w-4 h-4" />
            <span>{category.shortLabel}</span>
          </button>
        );
      })}
    </div>
  );
}
