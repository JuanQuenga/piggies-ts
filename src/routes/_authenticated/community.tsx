import { createFileRoute } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { useSubscription } from "@/hooks/useSubscription";
import { Plus, MapPin, Loader2, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { VenueCategoryTabs } from "@/components/community/VenueCategoryTabs";
import { VenueFilterBar } from "@/components/community/VenueFilterBar";
import { VenueList } from "@/components/community/VenueList";
import { VenueDetailSheet } from "@/components/community/VenueDetailSheet";
import { SubmitVenueDialog } from "@/components/community/SubmitVenueDialog";
import type { VenueCategory } from "@/lib/venue-categories";

export const Route = createFileRoute("/_authenticated/community")({
  component: CommunityPage,
});

interface LocationState {
  locationType: "nearby" | "custom";
  nearbyCoords: { latitude: number; longitude: number } | null;
  customCoords: { latitude: number; longitude: number } | null;
}

function readLocationFromStorage(): LocationState {
  if (typeof window === "undefined") {
    return { locationType: "nearby", nearbyCoords: null, customCoords: null };
  }

  const savedType = localStorage.getItem("piggies-location-type");
  const locationType =
    savedType === "nearby" || savedType === "custom" ? savedType : "nearby";

  let nearbyCoords = null;
  const savedNearbyCoords = localStorage.getItem("piggies-nearby-coords");
  if (savedNearbyCoords) {
    try {
      nearbyCoords = JSON.parse(savedNearbyCoords);
    } catch {
      /* ignore */
    }
  }

  let customCoords = null;
  const savedCustomCoords = localStorage.getItem("piggies-custom-coords");
  if (savedCustomCoords) {
    try {
      customCoords = JSON.parse(savedCustomCoords);
    } catch {
      /* ignore */
    }
  }

  return { locationType, nearbyCoords, customCoords };
}

function CommunityPage() {
  const { user: convexUser } = useCurrentUser();
  const { isUltra, checkoutUrl } = useSubscription();

  // Location state
  const [locationState, setLocationState] = useState<LocationState>(readLocationFromStorage);

  // Filter state
  const [selectedCategory, setSelectedCategory] = useState<VenueCategory | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [distance, setDistance] = useState(25);
  const [selectedFeatures, setSelectedFeatures] = useState<string[]>([]);

  // UI state
  const [selectedVenue, setSelectedVenue] = useState<{
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
  } | null>(null);
  const [detailSheetOpen, setDetailSheetOpen] = useState(false);
  const [submitDialogOpen, setSubmitDialogOpen] = useState(false);

  // Listen for location changes from AppHeader
  useEffect(() => {
    const handleLocationChange = () => {
      setLocationState(readLocationFromStorage());
    };

    window.addEventListener("location-changed", handleLocationChange);
    return () => window.removeEventListener("location-changed", handleLocationChange);
  }, []);

  // Derive the active coordinates based on location type
  const activeCoords =
    locationState.locationType === "nearby"
      ? locationState.nearbyCoords
      : locationState.customCoords;

  // Query venues
  const venues = useQuery(
    api.venues.getNearbyVenues,
    activeCoords
      ? {
          latitude: activeCoords.latitude,
          longitude: activeCoords.longitude,
          maxDistanceMiles: distance,
          category: selectedCategory || undefined,
          features: selectedFeatures.length > 0 ? selectedFeatures : undefined,
          searchQuery: searchQuery.trim() || undefined,
          limit: 50,
        }
      : "skip"
  );

  // Get venue details when one is selected
  const venueDetails = useQuery(
    api.venues.getVenueById,
    selectedVenue
      ? {
          venueId: selectedVenue._id,
          userId: convexUser?._id,
        }
      : "skip"
  );

  // Check if user can submit venue
  const canSubmit = useQuery(
    api.venues.canSubmitVenue,
    convexUser?._id ? { userId: convexUser._id } : "skip"
  );

  const handleVenueClick = (venue: (typeof venues extends (infer T)[] | undefined ? T : never)) => {
    if (!venue) return;
    setSelectedVenue({
      _id: venue._id as Id<"communityVenues">,
      name: venue.name,
      description: venue.description,
      category: venue.category,
      latitude: venue.latitude,
      longitude: venue.longitude,
      address: venue.address,
      city: venue.city,
      state: venue.state,
      country: venue.country,
      phone: venue.phone,
      website: venue.website,
      instagram: venue.instagram,
      features: venue.features,
      hoursNote: venue.hoursNote,
      favoriteCount: venue.favoriteCount,
      isFavorited: false, // Will be updated when details load
      submitterName: undefined,
      submittedAt: venue._creationTime,
    });
    setDetailSheetOpen(true);
  };

  const handleFavoriteToggle = (venueId: Id<"communityVenues">, isFavorited: boolean) => {
    if (selectedVenue && selectedVenue._id === venueId) {
      setSelectedVenue({ ...selectedVenue, isFavorited });
    }
  };

  // Update selected venue when details load
  useEffect(() => {
    if (venueDetails && selectedVenue) {
      setSelectedVenue({
        ...selectedVenue,
        isFavorited: venueDetails.isFavorited,
        submitterName: venueDetails.submitterName,
        favoriteCount: venueDetails.favoriteCount,
        submittedAt: venueDetails.submittedAt,
      });
    }
  }, [venueDetails]); // eslint-disable-line react-hooks/exhaustive-deps

  const isLoading = venues === undefined && activeCoords !== null;
  const noLocation = activeCoords === null;

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Sticky header with filters */}
      <div className="sticky top-14 z-40 bg-background/95 backdrop-blur-sm border-b">
        <div className="px-3 py-3 space-y-3">
          {/* Category tabs */}
          <VenueCategoryTabs
            selectedCategory={selectedCategory}
            onSelectCategory={(cat) => {
              setSelectedCategory(cat);
              // Clear features when category changes
              setSelectedFeatures([]);
            }}
          />

          {/* Filter bar */}
          <VenueFilterBar
            searchQuery={searchQuery}
            onSearchChange={setSearchQuery}
            distance={distance}
            onDistanceChange={setDistance}
            selectedFeatures={selectedFeatures}
            onFeaturesChange={setSelectedFeatures}
            selectedCategory={selectedCategory}
          />
        </div>
      </div>

      {/* Main content */}
      <main className="flex-1 p-3">
        {noLocation ? (
          <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
            <MapPin className="w-12 h-12 mb-4 opacity-50" />
            <h3 className="text-lg font-medium mb-2">Location Required</h3>
            <p className="text-sm text-center max-w-xs mb-4">
              Enable location sharing in the header to discover venues near you.
            </p>
          </div>
        ) : (
          <VenueList
            venues={venues}
            isLoading={isLoading}
            onVenueClick={handleVenueClick}
            emptyMessage={
              selectedCategory
                ? "No venues found in this category nearby. Be the first to add one!"
                : "No venues found nearby. Be the first to add one!"
            }
          />
        )}

        {/* Upsell card for free users */}
        {!isUltra && canSubmit && !canSubmit.canSubmit && (
          <div className="mt-6 p-4 rounded-xl bg-gradient-to-r from-amber-500/20 to-orange-500/20 border border-amber-500/30">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-full bg-amber-500/20 flex items-center justify-center shrink-0">
                <Sparkles className="w-5 h-5 text-amber-400" />
              </div>
              <div className="flex-1">
                <h4 className="font-medium text-sm">
                  Want to add more venues?
                </h4>
                <p className="text-xs text-muted-foreground mt-1">
                  Free users can submit 1 venue per week. Upgrade to Ultra for unlimited submissions!
                </p>
                {checkoutUrl && (
                  <Button
                    size="sm"
                    className="mt-3"
                    onClick={() => window.open(checkoutUrl, "_blank")}
                  >
                    <Sparkles className="w-4 h-4 mr-1" />
                    Upgrade to Ultra
                  </Button>
                )}
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Floating add button */}
      {convexUser && (canSubmit?.canSubmit ?? true) && (
        <div className="fixed bottom-20 right-4 lg:bottom-6 z-50">
          <Button
            size="lg"
            className="rounded-full shadow-lg h-14 w-14 p-0"
            onClick={() => setSubmitDialogOpen(true)}
          >
            <Plus className="w-6 h-6" />
          </Button>
        </div>
      )}

      {/* Bottom padding for mobile nav */}
      <div className="h-16 lg:hidden" />

      {/* Venue detail sheet */}
      <VenueDetailSheet
        venue={
          selectedVenue && venueDetails
            ? {
                ...selectedVenue,
                isFavorited: venueDetails.isFavorited,
                submitterName: venueDetails.submitterName,
                favoriteCount: venueDetails.favoriteCount,
                submittedAt: venueDetails.submittedAt,
              }
            : selectedVenue
        }
        open={detailSheetOpen}
        onOpenChange={setDetailSheetOpen}
        userId={convexUser?._id}
        onFavoriteToggle={handleFavoriteToggle}
      />

      {/* Submit venue dialog */}
      {convexUser && (
        <SubmitVenueDialog
          open={submitDialogOpen}
          onOpenChange={setSubmitDialogOpen}
          userId={convexUser._id}
          onSuccess={() => {
            // Optionally refresh or show success state
          }}
        />
      )}
    </div>
  );
}
