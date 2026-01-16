import { Heart, MapPin } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { getCategoryInfo, type VenueCategory } from "@/lib/venue-categories";

interface VenueCardProps {
  venue: {
    _id: string;
    name: string;
    category: VenueCategory;
    city: string;
    address: string;
    features?: string[];
    favoriteCount?: number;
    distanceMiles?: number;
  };
  onClick: () => void;
}

export function VenueCard({ venue, onClick }: VenueCardProps) {
  const categoryInfo = getCategoryInfo(venue.category);
  const Icon = categoryInfo.icon;

  // Format distance
  const formatDistance = (miles?: number) => {
    if (miles === undefined) return null;
    if (miles < 0.1) return "< 0.1 mi";
    if (miles < 10) return `${miles.toFixed(1)} mi`;
    return `${Math.round(miles)} mi`;
  };

  return (
    <Card
      className="cursor-pointer hover:ring-primary/50 transition-all p-4 gap-3"
      onClick={onClick}
    >
      <div className="flex items-start gap-3">
        {/* Category icon */}
        <div
          className={cn(
            "w-10 h-10 rounded-lg flex items-center justify-center shrink-0",
            venue.category === "bars_nightlife" && "bg-purple-500/20 text-purple-400",
            venue.category === "adult_venues" && "bg-red-500/20 text-red-400",
            venue.category === "fitness_wellness" && "bg-green-500/20 text-green-400",
            venue.category === "events_social" && "bg-yellow-500/20 text-yellow-400",
            venue.category === "health_clinics" && "bg-blue-500/20 text-blue-400"
          )}
        >
          <Icon className="w-5 h-5" />
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <h3 className="font-medium truncate">{venue.name}</h3>
            {venue.distanceMiles !== undefined && (
              <span className="text-xs text-muted-foreground whitespace-nowrap">
                {formatDistance(venue.distanceMiles)}
              </span>
            )}
          </div>

          <div className="flex items-center gap-1 text-sm text-muted-foreground mt-0.5">
            <span>{categoryInfo.shortLabel}</span>
            <span>·</span>
            <MapPin className="w-3 h-3" />
            <span className="truncate">{venue.city}</span>
          </div>

          {/* Features preview */}
          {venue.features && venue.features.length > 0 && (
            <div className="flex items-center gap-1.5 mt-2 overflow-hidden">
              {venue.features.slice(0, 3).map((feature) => (
                <Badge
                  key={feature}
                  variant="secondary"
                  className="text-xs px-2 py-0 shrink-0"
                >
                  {feature}
                </Badge>
              ))}
              {venue.features.length > 3 && (
                <span className="text-xs text-muted-foreground">
                  +{venue.features.length - 3}
                </span>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Footer with favorite count */}
      {venue.favoriteCount !== undefined && venue.favoriteCount > 0 && (
        <div className="flex items-center gap-1 text-xs text-muted-foreground pt-2 border-t border-border">
          <Heart className="w-3 h-3" />
          <span>{venue.favoriteCount} favorites</span>
        </div>
      )}
    </Card>
  );
}
