import { useState } from "react";
import { useMutation } from "convex/react";
import {
  Heart,
  MapPin,
  Phone,
  Globe,
  Clock,
  Flag,
  ExternalLink,
  Instagram,
  Loader2,
} from "lucide-react";
import { toast } from "sonner";
import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import {
  getCategoryInfo,
  REPORT_REASON_LIST,
  type VenueCategory,
  type ReportReason,
} from "@/lib/venue-categories";

interface VenueDetails {
  _id: Id<"communityVenues">;
  name: string;
  description?: string;
  category: VenueCategory;
  latitude: number;
  longitude: number;
  address: string;
  city: string;
  state?: string;
  country: string;
  phone?: string;
  website?: string;
  instagram?: string;
  features?: string[];
  hoursNote?: string;
  favoriteCount?: number;
  isFavorited: boolean;
  submitterName?: string;
  submittedAt: number;
}

interface VenueDetailSheetProps {
  venue: VenueDetails | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userId: Id<"users"> | undefined;
  onFavoriteToggle?: (venueId: Id<"communityVenues">, isFavorited: boolean) => void;
}

export function VenueDetailSheet({
  venue,
  open,
  onOpenChange,
  userId,
  onFavoriteToggle,
}: VenueDetailSheetProps) {
  const [isTogglingFavorite, setIsTogglingFavorite] = useState(false);
  const [reportDialogOpen, setReportDialogOpen] = useState(false);
  const [reportReason, setReportReason] = useState<ReportReason | null>(null);
  const [reportDetails, setReportDetails] = useState("");
  const [isSubmittingReport, setIsSubmittingReport] = useState(false);

  const toggleFavorite = useMutation(api.venues.toggleVenueFavorite);
  const reportVenue = useMutation(api.venues.reportVenue);
  const recordView = useMutation(api.venues.recordVenueView);

  if (!venue) return null;

  const categoryInfo = getCategoryInfo(venue.category);
  const Icon = categoryInfo.icon;

  const handleFavoriteToggle = async () => {
    if (!userId) {
      toast.error("Please sign in to favorite venues");
      return;
    }

    setIsTogglingFavorite(true);
    try {
      const result = await toggleFavorite({
        userId,
        venueId: venue._id,
      });

      if (result.success) {
        onFavoriteToggle?.(venue._id, result.isFavorited);
        toast.success(result.isFavorited ? "Added to favorites" : "Removed from favorites");
      } else {
        toast.error(result.error || "Failed to update favorite");
      }
    } catch {
      toast.error("Something went wrong");
    } finally {
      setIsTogglingFavorite(false);
    }
  };

  const handleReport = async () => {
    if (!userId || !reportReason) return;

    setIsSubmittingReport(true);
    try {
      const result = await reportVenue({
        venueId: venue._id,
        reporterId: userId,
        reason: reportReason,
        details: reportDetails || undefined,
      });

      if (result.success) {
        toast.success("Report submitted. Thank you for helping improve our community.");
        setReportDialogOpen(false);
        setReportReason(null);
        setReportDetails("");
      } else {
        toast.error(result.error || "Failed to submit report");
      }
    } catch {
      toast.error("Something went wrong");
    } finally {
      setIsSubmittingReport(false);
    }
  };

  const openInMaps = () => {
    const query = encodeURIComponent(`${venue.address}, ${venue.city}, ${venue.state || ""} ${venue.country}`);
    window.open(`https://maps.google.com/maps?q=${query}`, "_blank");
    // Record view when user interacts
    recordView({ venueId: venue._id });
  };

  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleDateString("en-US", {
      month: "short",
      year: "numeric",
    });
  };

  return (
    <>
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent side="bottom" className="max-h-[85vh] overflow-y-auto pb-8">
          <SheetHeader className="pb-4">
            <div className="flex items-start gap-3">
              <div
                className={cn(
                  "w-12 h-12 rounded-xl flex items-center justify-center shrink-0",
                  venue.category === "bars_nightlife" && "bg-purple-500/20 text-purple-400",
                  venue.category === "adult_venues" && "bg-red-500/20 text-red-400",
                  venue.category === "fitness_wellness" && "bg-green-500/20 text-green-400",
                  venue.category === "events_social" && "bg-yellow-500/20 text-yellow-400",
                  venue.category === "health_clinics" && "bg-blue-500/20 text-blue-400"
                )}
              >
                <Icon className="w-6 h-6" />
              </div>
              <div className="flex-1 min-w-0">
                <SheetTitle className="text-left">{venue.name}</SheetTitle>
                <p className="text-sm text-muted-foreground">{categoryInfo.label}</p>
              </div>
            </div>
          </SheetHeader>

          {/* Action buttons */}
          <div className="flex gap-2 mb-6">
            <Button
              variant={venue.isFavorited ? "default" : "outline"}
              className="flex-1"
              onClick={handleFavoriteToggle}
              disabled={isTogglingFavorite}
            >
              {isTogglingFavorite ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Heart
                  className={cn(
                    "w-4 h-4 mr-2",
                    venue.isFavorited && "fill-current"
                  )}
                />
              )}
              {venue.isFavorited ? "Favorited" : "Favorite"}
              {venue.favoriteCount !== undefined && venue.favoriteCount > 0 && (
                <span className="ml-1 text-xs opacity-70">({venue.favoriteCount})</span>
              )}
            </Button>
            <Button variant="outline" onClick={openInMaps}>
              <MapPin className="w-4 h-4 mr-2" />
              Directions
            </Button>
          </div>

          {/* Description */}
          {venue.description && (
            <div className="mb-6">
              <p className="text-sm text-muted-foreground">{venue.description}</p>
            </div>
          )}

          {/* Details */}
          <div className="space-y-4 mb-6">
            {/* Address */}
            <div className="flex items-start gap-3">
              <MapPin className="w-5 h-5 text-muted-foreground shrink-0 mt-0.5" />
              <div>
                <p className="text-sm">{venue.address}</p>
                <p className="text-sm text-muted-foreground">
                  {venue.city}{venue.state && `, ${venue.state}`}, {venue.country}
                </p>
              </div>
            </div>

            {/* Phone */}
            {venue.phone && (
              <div className="flex items-center gap-3">
                <Phone className="w-5 h-5 text-muted-foreground" />
                <a
                  href={`tel:${venue.phone}`}
                  className="text-sm text-primary hover:underline"
                >
                  {venue.phone}
                </a>
              </div>
            )}

            {/* Website */}
            {venue.website && (
              <div className="flex items-center gap-3">
                <Globe className="w-5 h-5 text-muted-foreground" />
                <a
                  href={venue.website.startsWith("http") ? venue.website : `https://${venue.website}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-primary hover:underline flex items-center gap-1"
                >
                  {venue.website.replace(/^https?:\/\//, "")}
                  <ExternalLink className="w-3 h-3" />
                </a>
              </div>
            )}

            {/* Instagram */}
            {venue.instagram && (
              <div className="flex items-center gap-3">
                <Instagram className="w-5 h-5 text-muted-foreground" />
                <a
                  href={`https://instagram.com/${venue.instagram.replace("@", "")}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-primary hover:underline flex items-center gap-1"
                >
                  @{venue.instagram.replace("@", "")}
                  <ExternalLink className="w-3 h-3" />
                </a>
              </div>
            )}

            {/* Hours */}
            {venue.hoursNote && (
              <div className="flex items-start gap-3">
                <Clock className="w-5 h-5 text-muted-foreground shrink-0 mt-0.5" />
                <p className="text-sm">{venue.hoursNote}</p>
              </div>
            )}
          </div>

          {/* Features */}
          {venue.features && venue.features.length > 0 && (
            <div className="mb-6">
              <h4 className="text-sm font-medium mb-2">Features</h4>
              <div className="flex flex-wrap gap-2">
                {venue.features.map((feature) => (
                  <Badge key={feature} variant="secondary">
                    {feature}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {/* Footer */}
          <div className="pt-4 border-t border-border flex items-center justify-between text-xs text-muted-foreground">
            <span>
              Added {formatDate(venue.submittedAt)}
              {venue.submitterName && ` by ${venue.submitterName}`}
            </span>
            <button
              onClick={() => setReportDialogOpen(true)}
              className="flex items-center gap-1 hover:text-foreground transition-colors"
            >
              <Flag className="w-3 h-3" />
              Report Issue
            </button>
          </div>
        </SheetContent>
      </Sheet>

      {/* Report Dialog */}
      <Dialog open={reportDialogOpen} onOpenChange={setReportDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Report an Issue</DialogTitle>
            <DialogDescription>
              Help us keep our community accurate by reporting problems with this listing.
            </DialogDescription>
          </DialogHeader>

          <div className="mt-4 space-y-4">
            <div className="space-y-2">
              {REPORT_REASON_LIST.map((reason) => (
                <button
                  key={reason.id}
                  onClick={() => setReportReason(reason.id as ReportReason)}
                  className={cn(
                    "w-full text-left p-3 rounded-lg border transition-colors",
                    reportReason === reason.id
                      ? "border-primary bg-primary/10"
                      : "border-border hover:border-primary/50"
                  )}
                >
                  <p className="font-medium text-sm">{reason.label}</p>
                  <p className="text-xs text-muted-foreground">{reason.description}</p>
                </button>
              ))}
            </div>

            {reportReason && (
              <div>
                <label className="text-sm font-medium mb-1 block">
                  Additional details (optional)
                </label>
                <Textarea
                  value={reportDetails}
                  onChange={(e) => setReportDetails(e.target.value)}
                  placeholder="Provide any additional information..."
                  rows={3}
                />
              </div>
            )}
          </div>

          <div className="mt-6 flex justify-end gap-2">
            <Button variant="outline" onClick={() => setReportDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleReport}
              disabled={!reportReason || isSubmittingReport}
            >
              {isSubmittingReport && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Submit Report
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
