import { useState } from "react";
import { useMutation } from "convex/react";
import { Loader2, MapPin, Check, ChevronLeft, ChevronRight } from "lucide-react";
import { toast } from "sonner";
import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import {
  VENUE_CATEGORY_LIST,
  getFeaturesForCategory,
  type VenueCategory,
} from "@/lib/venue-categories";

interface SubmitVenueDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userId: Id<"users">;
  onSuccess?: () => void;
}

interface VenueFormData {
  name: string;
  description: string;
  category: VenueCategory | "";
  address: string;
  city: string;
  state: string;
  country: string;
  latitude: number | null;
  longitude: number | null;
  phone: string;
  website: string;
  instagram: string;
  hoursNote: string;
  features: string[];
}

const INITIAL_FORM_DATA: VenueFormData = {
  name: "",
  description: "",
  category: "",
  address: "",
  city: "",
  state: "",
  country: "",
  latitude: null,
  longitude: null,
  phone: "",
  website: "",
  instagram: "",
  hoursNote: "",
  features: [],
};

export function SubmitVenueDialog({
  open,
  onOpenChange,
  userId,
  onSuccess,
}: SubmitVenueDialogProps) {
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState<VenueFormData>(INITIAL_FORM_DATA);
  const [isGeocoding, setIsGeocoding] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [geocodeError, setGeocodeError] = useState<string | null>(null);

  const submitVenue = useMutation(api.venues.submitVenue);

  const totalSteps = 4;

  const updateForm = (updates: Partial<VenueFormData>) => {
    setFormData((prev) => ({ ...prev, ...updates }));
  };

  const geocodeAddress = async () => {
    if (!formData.address.trim()) {
      setGeocodeError("Please enter an address");
      return;
    }

    setIsGeocoding(true);
    setGeocodeError(null);

    try {
      const searchQuery = formData.address;
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(searchQuery)}&limit=1&addressdetails=1`
      );
      const data = await response.json();

      if (data.length === 0) {
        setGeocodeError("Address not found. Please try a more specific address.");
        return;
      }

      const result = data[0];
      const address = result.address || {};

      updateForm({
        latitude: parseFloat(result.lat),
        longitude: parseFloat(result.lon),
        city: address.city || address.town || address.village || address.municipality || "",
        state: address.state || address.region || "",
        country: address.country || "",
      });

      toast.success("Address found!");
    } catch {
      setGeocodeError("Failed to look up address. Please try again.");
    } finally {
      setIsGeocoding(false);
    }
  };

  const toggleFeature = (feature: string) => {
    if (formData.features.includes(feature)) {
      updateForm({ features: formData.features.filter((f) => f !== feature) });
    } else {
      updateForm({ features: [...formData.features, feature] });
    }
  };

  const canProceed = () => {
    switch (step) {
      case 1:
        return formData.name.trim() && formData.category;
      case 2:
        return formData.address.trim() && formData.latitude && formData.longitude;
      case 3:
        return true; // Contact info is optional
      case 4:
        return true; // Features are optional
      default:
        return false;
    }
  };

  const handleNext = () => {
    if (step < totalSteps) {
      setStep(step + 1);
    }
  };

  const handleBack = () => {
    if (step > 1) {
      setStep(step - 1);
    }
  };

  const handleSubmit = async () => {
    if (!formData.category || !formData.latitude || !formData.longitude) {
      toast.error("Missing required fields");
      return;
    }

    setIsSubmitting(true);
    try {
      const result = await submitVenue({
        userId,
        name: formData.name.trim(),
        description: formData.description.trim() || undefined,
        category: formData.category,
        latitude: formData.latitude,
        longitude: formData.longitude,
        address: formData.address.trim(),
        city: formData.city.trim(),
        state: formData.state.trim() || undefined,
        country: formData.country.trim(),
        phone: formData.phone.trim() || undefined,
        website: formData.website.trim() || undefined,
        instagram: formData.instagram.trim() || undefined,
        hoursNote: formData.hoursNote.trim() || undefined,
        features: formData.features.length > 0 ? formData.features : undefined,
      });

      if (result.success) {
        toast.success("Venue submitted! It will appear once approved by our team.");
        setFormData(INITIAL_FORM_DATA);
        setStep(1);
        onOpenChange(false);
        onSuccess?.();
      } else {
        toast.error(result.error || "Failed to submit venue");
      }
    } catch {
      toast.error("Something went wrong");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    setFormData(INITIAL_FORM_DATA);
    setStep(1);
    setGeocodeError(null);
    onOpenChange(false);
  };

  const availableFeatures = formData.category
    ? getFeaturesForCategory(formData.category)
    : [];

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-md max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Add a Venue</DialogTitle>
          <DialogDescription>
            Step {step} of {totalSteps}:{" "}
            {step === 1 && "Basic Info"}
            {step === 2 && "Location"}
            {step === 3 && "Contact Info"}
            {step === 4 && "Features"}
          </DialogDescription>
        </DialogHeader>

        {/* Progress bar */}
        <div className="flex gap-1 mb-4">
          {Array.from({ length: totalSteps }).map((_, i) => (
            <div
              key={i}
              className={cn(
                "h-1 flex-1 rounded-full transition-colors",
                i < step ? "bg-primary" : "bg-muted"
              )}
            />
          ))}
        </div>

        {/* Step 1: Basic Info */}
        {step === 1 && (
          <div className="space-y-4">
            <div>
              <Label htmlFor="name">Venue Name *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => updateForm({ name: e.target.value })}
                placeholder="e.g., The Eagle"
                className="mt-1"
              />
            </div>

            <div>
              <Label htmlFor="category">Category *</Label>
              <Select
                value={formData.category}
                onValueChange={(value) => updateForm({ category: value as VenueCategory, features: [] })}
              >
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="Select a category" />
                </SelectTrigger>
                <SelectContent>
                  {VENUE_CATEGORY_LIST.map((cat) => {
                    const CatIcon = cat.icon;
                    return (
                      <SelectItem key={cat.id} value={cat.id}>
                        <span className="flex items-center gap-2">
                          <CatIcon className="w-4 h-4" />
                          {cat.label}
                        </span>
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="description">Description (optional)</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => updateForm({ description: e.target.value })}
                placeholder="Tell us about this venue..."
                rows={3}
                className="mt-1"
              />
            </div>
          </div>
        )}

        {/* Step 2: Location */}
        {step === 2 && (
          <div className="space-y-4">
            <div>
              <Label htmlFor="address">Street Address *</Label>
              <div className="flex gap-2 mt-1">
                <Input
                  id="address"
                  value={formData.address}
                  onChange={(e) => {
                    updateForm({ address: e.target.value });
                    setGeocodeError(null);
                  }}
                  placeholder="e.g., 398 12th Street"
                  className="flex-1"
                />
                <Button
                  type="button"
                  variant="outline"
                  onClick={geocodeAddress}
                  disabled={isGeocoding}
                >
                  {isGeocoding ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <MapPin className="w-4 h-4" />
                  )}
                </Button>
              </div>
              {geocodeError && (
                <p className="text-sm text-destructive mt-1">{geocodeError}</p>
              )}
            </div>

            {formData.latitude && formData.longitude && (
              <div className="bg-muted/50 rounded-lg p-3 text-sm">
                <div className="flex items-center gap-2 text-green-500 mb-2">
                  <Check className="w-4 h-4" />
                  <span className="font-medium">Location verified</span>
                </div>
                {formData.city && <p>City: {formData.city}</p>}
                {formData.state && <p>State: {formData.state}</p>}
                {formData.country && <p>Country: {formData.country}</p>}
              </div>
            )}

            {!formData.latitude && (
              <p className="text-sm text-muted-foreground">
                Enter the address and click the pin icon to verify the location.
              </p>
            )}
          </div>
        )}

        {/* Step 3: Contact Info */}
        {step === 3 && (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              All fields are optional but help others find and contact the venue.
            </p>

            <div>
              <Label htmlFor="phone">Phone</Label>
              <Input
                id="phone"
                type="tel"
                value={formData.phone}
                onChange={(e) => updateForm({ phone: e.target.value })}
                placeholder="(555) 123-4567"
                className="mt-1"
              />
            </div>

            <div>
              <Label htmlFor="website">Website</Label>
              <Input
                id="website"
                type="url"
                value={formData.website}
                onChange={(e) => updateForm({ website: e.target.value })}
                placeholder="www.example.com"
                className="mt-1"
              />
            </div>

            <div>
              <Label htmlFor="instagram">Instagram</Label>
              <Input
                id="instagram"
                value={formData.instagram}
                onChange={(e) => updateForm({ instagram: e.target.value })}
                placeholder="@username"
                className="mt-1"
              />
            </div>

            <div>
              <Label htmlFor="hours">Hours (optional)</Label>
              <Textarea
                id="hours"
                value={formData.hoursNote}
                onChange={(e) => updateForm({ hoursNote: e.target.value })}
                placeholder="e.g., Mon-Fri 6PM-2AM, Sat-Sun 8PM-4AM"
                rows={2}
                className="mt-1"
              />
            </div>
          </div>
        )}

        {/* Step 4: Features */}
        {step === 4 && (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Select features that apply to this venue. This helps people find what they're looking for.
            </p>

            {availableFeatures.length > 0 ? (
              <div className="flex flex-wrap gap-2 max-h-[300px] overflow-y-auto">
                {availableFeatures.map((feature) => {
                  const isSelected = formData.features.includes(feature);
                  return (
                    <button
                      key={feature}
                      type="button"
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
            ) : (
              <p className="text-sm text-muted-foreground">
                Please select a category first to see available features.
              </p>
            )}

            {formData.features.length > 0 && (
              <p className="text-sm text-muted-foreground">
                {formData.features.length} feature{formData.features.length !== 1 && "s"} selected
              </p>
            )}
          </div>
        )}

        {/* Navigation buttons */}
        <div className="flex justify-between mt-6 pt-4 border-t">
          {step > 1 ? (
            <Button variant="outline" onClick={handleBack}>
              <ChevronLeft className="w-4 h-4 mr-1" />
              Back
            </Button>
          ) : (
            <Button variant="outline" onClick={handleClose}>
              Cancel
            </Button>
          )}

          {step < totalSteps ? (
            <Button onClick={handleNext} disabled={!canProceed()}>
              Next
              <ChevronRight className="w-4 h-4 ml-1" />
            </Button>
          ) : (
            <Button onClick={handleSubmit} disabled={isSubmitting || !canProceed()}>
              {isSubmitting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Submit Venue
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
