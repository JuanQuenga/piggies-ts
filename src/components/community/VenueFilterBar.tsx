import { useState } from "react";
import { Search, SlidersHorizontal, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import {
  DISTANCE_OPTIONS,
  getFeaturesForCategory,
  type VenueCategory,
} from "@/lib/venue-categories";

interface VenueFilterBarProps {
  searchQuery: string;
  onSearchChange: (query: string) => void;
  distance: number;
  onDistanceChange: (distance: number) => void;
  selectedFeatures: string[];
  onFeaturesChange: (features: string[]) => void;
  selectedCategory: VenueCategory | null;
}

export function VenueFilterBar({
  searchQuery,
  onSearchChange,
  distance,
  onDistanceChange,
  selectedFeatures,
  onFeaturesChange,
  selectedCategory,
}: VenueFilterBarProps) {
  const [filterDialogOpen, setFilterDialogOpen] = useState(false);

  // Get features based on selected category or all features if no category
  const availableFeatures = selectedCategory
    ? getFeaturesForCategory(selectedCategory)
    : [];

  const toggleFeature = (feature: string) => {
    if (selectedFeatures.includes(feature)) {
      onFeaturesChange(selectedFeatures.filter((f) => f !== feature));
    } else {
      onFeaturesChange([...selectedFeatures, feature]);
    }
  };

  const clearFeatures = () => {
    onFeaturesChange([]);
  };

  return (
    <div className="flex items-center gap-2">
      {/* Search input */}
      <div className="relative flex-1">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          type="text"
          placeholder="Search venues..."
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          className="pl-9 h-9"
        />
        {searchQuery && (
          <button
            onClick={() => onSearchChange("")}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Distance select */}
      <Select
        value={distance.toString()}
        onValueChange={(value) => onDistanceChange(parseInt(value))}
      >
        <SelectTrigger className="w-[100px] h-9">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {DISTANCE_OPTIONS.map((option) => (
            <SelectItem key={option.value} value={option.value.toString()}>
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {/* Features filter button */}
      {selectedCategory && availableFeatures.length > 0 && (
        <Dialog open={filterDialogOpen} onOpenChange={setFilterDialogOpen}>
          <DialogTrigger asChild>
            <Button variant="outline" size="sm" className="h-9 gap-1.5">
              <SlidersHorizontal className="w-4 h-4" />
              <span className="hidden sm:inline">Features</span>
              {selectedFeatures.length > 0 && (
                <span className="bg-primary text-primary-foreground text-xs rounded-full px-1.5 py-0.5 min-w-[18px]">
                  {selectedFeatures.length}
                </span>
              )}
            </Button>
          </DialogTrigger>
          <DialogContent className="max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Filter by Features</DialogTitle>
            </DialogHeader>
            <div className="mt-4">
              {selectedFeatures.length > 0 && (
                <div className="mb-4">
                  <button
                    onClick={clearFeatures}
                    className="text-sm text-primary hover:underline"
                  >
                    Clear all filters
                  </button>
                </div>
              )}
              <div className="flex flex-wrap gap-2">
                {availableFeatures.map((feature) => {
                  const isSelected = selectedFeatures.includes(feature);
                  return (
                    <button
                      key={feature}
                      onClick={() => toggleFeature(feature)}
                      className={cn(
                        "px-3 py-1.5 rounded-full text-sm font-medium transition-colors",
                        isSelected
                          ? "bg-primary text-primary-foreground"
                          : "bg-secondary text-secondary-foreground hover:bg-secondary/80"
                      )}
                    >
                      {feature}
                    </button>
                  );
                })}
              </div>
            </div>
            <div className="mt-6 flex justify-end">
              <Button onClick={() => setFilterDialogOpen(false)}>
                Apply Filters
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
