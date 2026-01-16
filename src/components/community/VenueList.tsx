import { Loader2, MapPinOff } from "lucide-react";
import { VenueCard } from "./VenueCard";
import type { VenueCategory } from "@/lib/venue-categories";

interface Venue {
  _id: string;
  name: string;
  category: VenueCategory;
  city: string;
  address: string;
  features?: string[];
  favoriteCount?: number;
  distanceMiles?: number;
}

interface VenueListProps {
  venues: Venue[] | undefined;
  isLoading: boolean;
  onVenueClick: (venue: Venue) => void;
  emptyMessage?: string;
}

export function VenueList({
  venues,
  isLoading,
  onVenueClick,
  emptyMessage = "No venues found nearby",
}: VenueListProps) {
  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
        <Loader2 className="w-8 h-8 animate-spin mb-3" />
        <p className="text-sm">Loading venues...</p>
      </div>
    );
  }

  if (!venues || venues.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
        <MapPinOff className="w-12 h-12 mb-3 opacity-50" />
        <p className="text-base font-medium mb-1">No venues found</p>
        <p className="text-sm text-center max-w-xs">{emptyMessage}</p>
      </div>
    );
  }

  return (
    <div className="grid gap-3 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
      {venues.map((venue) => (
        <VenueCard
          key={venue._id}
          venue={venue}
          onClick={() => onVenueClick(venue)}
        />
      ))}
    </div>
  );
}
