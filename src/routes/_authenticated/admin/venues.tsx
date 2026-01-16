import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation } from "convex/react";
import { useState } from "react";
import { api } from "../../../../convex/_generated/api";
import type { Id } from "../../../../convex/_generated/dataModel";
import { useCurrentUser } from "@/hooks/useCurrentUser";
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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Store,
  Clock,
  CheckCircle,
  XCircle,
  Flag,
  MapPin,
  Loader2,
  Plus,
  Pencil,
  Trash2,
  List,
} from "lucide-react";
import { toast } from "sonner";
import {
  getCategoryInfo,
  VENUE_CATEGORY_LIST,
  getFeaturesForCategory,
  type VenueCategory,
} from "@/lib/venue-categories";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/admin/venues")({
  component: VenuesAdminPage,
});

type TabType = "all" | "pending" | "flagged" | "reports";
type VenueStatus = "pending" | "approved" | "rejected" | "flagged";

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
  status: VenueStatus;
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
  status: "approved",
};

function VenuesAdminPage() {
  const { user } = useCurrentUser();
  const [activeTab, setActiveTab] = useState<TabType>("all");
  const [selectedVenueId, setSelectedVenueId] = useState<Id<"communityVenues"> | null>(null);
  const [rejectionReason, setRejectionReason] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);

  // Dialog states
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [venueToDelete, setVenueToDelete] = useState<Id<"communityVenues"> | null>(null);
  const [formData, setFormData] = useState<VenueFormData>(INITIAL_FORM_DATA);
  const [editingVenueId, setEditingVenueId] = useState<Id<"communityVenues"> | null>(null);
  const [isGeocoding, setIsGeocoding] = useState(false);

  // Queries
  const allVenues = useQuery(
    api.venues.getAllVenues,
    user?._id ? { adminUserId: user._id } : "skip"
  );

  const pendingVenues = useQuery(
    api.venues.getPendingVenues,
    user?._id ? { adminUserId: user._id } : "skip"
  );

  const flaggedVenues = useQuery(
    api.venues.getFlaggedVenues,
    user?._id ? { adminUserId: user._id } : "skip"
  );

  const venueReports = useQuery(
    api.venues.getVenueReports,
    user?._id ? { adminUserId: user._id } : "skip"
  );

  // Mutations
  const approveVenue = useMutation(api.venues.approveVenue);
  const rejectVenue = useMutation(api.venues.rejectVenue);
  const resolveReport = useMutation(api.venues.resolveVenueReport);
  const adminCreateVenue = useMutation(api.venues.adminCreateVenue);
  const adminUpdateVenue = useMutation(api.venues.adminUpdateVenue);
  const adminDeleteVenue = useMutation(api.venues.adminDeleteVenue);

  const updateForm = (updates: Partial<VenueFormData>) => {
    setFormData((prev) => ({ ...prev, ...updates }));
  };

  const geocodeAddress = async () => {
    if (!formData.address.trim()) {
      toast.error("Please enter an address");
      return;
    }

    setIsGeocoding(true);
    try {
      const searchQuery = formData.address;
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(searchQuery)}&limit=1&addressdetails=1`
      );
      const data = await response.json();

      if (data.length === 0) {
        toast.error("Address not found");
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

      toast.success("Address verified");
    } catch {
      toast.error("Failed to look up address");
    } finally {
      setIsGeocoding(false);
    }
  };

  const handleApprove = async (venueId: Id<"communityVenues">) => {
    if (!user?._id) return;
    setIsProcessing(true);
    try {
      const result = await approveVenue({ adminUserId: user._id, venueId });
      if (result.success) {
        toast.success("Venue approved");
        setSelectedVenueId(null);
      } else {
        toast.error(result.error || "Failed to approve venue");
      }
    } catch {
      toast.error("Something went wrong");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleReject = async (venueId: Id<"communityVenues">) => {
    if (!user?._id || !rejectionReason.trim()) {
      toast.error("Please provide a rejection reason");
      return;
    }
    setIsProcessing(true);
    try {
      const result = await rejectVenue({
        adminUserId: user._id,
        venueId,
        reason: rejectionReason.trim(),
      });
      if (result.success) {
        toast.success("Venue rejected");
        setSelectedVenueId(null);
        setRejectionReason("");
      } else {
        toast.error(result.error || "Failed to reject venue");
      }
    } catch {
      toast.error("Something went wrong");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleResolveReport = async (
    reportId: Id<"venueReports">,
    action: "dismiss" | "remove_venue"
  ) => {
    if (!user?._id) return;
    setIsProcessing(true);
    try {
      const result = await resolveReport({ adminUserId: user._id, reportId, action });
      if (result.success) {
        toast.success(action === "dismiss" ? "Report dismissed" : "Venue removed");
      } else {
        toast.error(result.error || "Failed to resolve report");
      }
    } catch {
      toast.error("Something went wrong");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleAddVenue = async () => {
    if (!user?._id) return;
    if (!formData.name.trim() || !formData.category || !formData.latitude || !formData.longitude) {
      toast.error("Please fill in all required fields and verify the address");
      return;
    }

    setIsProcessing(true);
    try {
      const result = await adminCreateVenue({
        adminUserId: user._id,
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
        toast.success("Venue created");
        setShowAddDialog(false);
        setFormData(INITIAL_FORM_DATA);
      } else {
        toast.error(result.error || "Failed to create venue");
      }
    } catch {
      toast.error("Something went wrong");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleEditVenue = async () => {
    if (!user?._id || !editingVenueId) return;

    setIsProcessing(true);
    try {
      const result = await adminUpdateVenue({
        adminUserId: user._id,
        venueId: editingVenueId,
        name: formData.name.trim() || undefined,
        description: formData.description.trim() || undefined,
        category: formData.category || undefined,
        latitude: formData.latitude || undefined,
        longitude: formData.longitude || undefined,
        address: formData.address.trim() || undefined,
        city: formData.city.trim() || undefined,
        state: formData.state.trim() || undefined,
        country: formData.country.trim() || undefined,
        phone: formData.phone.trim() || undefined,
        website: formData.website.trim() || undefined,
        instagram: formData.instagram.trim() || undefined,
        hoursNote: formData.hoursNote.trim() || undefined,
        features: formData.features,
        status: formData.status,
      });

      if (result.success) {
        toast.success("Venue updated");
        setShowEditDialog(false);
        setFormData(INITIAL_FORM_DATA);
        setEditingVenueId(null);
      } else {
        toast.error(result.error || "Failed to update venue");
      }
    } catch {
      toast.error("Something went wrong");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDeleteVenue = async () => {
    if (!user?._id || !venueToDelete) return;

    setIsProcessing(true);
    try {
      const result = await adminDeleteVenue({
        adminUserId: user._id,
        venueId: venueToDelete,
      });

      if (result.success) {
        toast.success("Venue deleted");
        setShowDeleteDialog(false);
        setVenueToDelete(null);
      } else {
        toast.error(result.error || "Failed to delete venue");
      }
    } catch {
      toast.error("Something went wrong");
    } finally {
      setIsProcessing(false);
    }
  };

  const openEditDialog = (venue: NonNullable<typeof allVenues>[number]) => {
    setEditingVenueId(venue._id);
    setFormData({
      name: venue.name,
      description: venue.description || "",
      category: venue.category,
      address: venue.address,
      city: venue.city,
      state: venue.state || "",
      country: venue.country,
      latitude: venue.latitude,
      longitude: venue.longitude,
      phone: venue.phone || "",
      website: venue.website || "",
      instagram: venue.instagram || "",
      hoursNote: venue.hoursNote || "",
      features: venue.features || [],
      status: venue.status,
    });
    setShowEditDialog(true);
  };

  const toggleFeature = (feature: string) => {
    if (formData.features.includes(feature)) {
      updateForm({ features: formData.features.filter((f) => f !== feature) });
    } else {
      updateForm({ features: [...formData.features, feature] });
    }
  };

  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const getStatusBadge = (status: VenueStatus) => {
    const styles = {
      pending: "bg-orange-500/10 text-orange-500 border-orange-500/20",
      approved: "bg-green-500/10 text-green-500 border-green-500/20",
      rejected: "bg-red-500/10 text-red-500 border-red-500/20",
      flagged: "bg-amber-500/10 text-amber-500 border-amber-500/20",
    };
    return styles[status];
  };

  const availableFeatures = formData.category ? getFeaturesForCategory(formData.category) : [];

  const tabs = [
    { id: "all" as const, label: "All Venues", icon: List, count: allVenues?.length ?? 0 },
    { id: "pending" as const, label: "Pending", icon: Clock, count: pendingVenues?.length ?? 0 },
    { id: "flagged" as const, label: "Flagged", icon: Flag, count: flaggedVenues?.length ?? 0 },
    { id: "reports" as const, label: "Reports", icon: Flag, count: venueReports?.length ?? 0 },
  ];

  return (
    <div className="max-w-6xl mx-auto px-4 py-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold">Venue Management</h2>
          <p className="text-muted-foreground">Manage community venues</p>
        </div>
        <Button onClick={() => setShowAddDialog(true)}>
          <Plus className="w-4 h-4 mr-2" />
          Add Venue
        </Button>
      </div>

      {/* Tab Filter */}
      <div className="flex items-center gap-2 mb-6 overflow-x-auto pb-2">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={cn(
              "flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors whitespace-nowrap",
              activeTab === tab.id
                ? "bg-primary text-primary-foreground"
                : "bg-card border border-border text-muted-foreground hover:text-foreground"
            )}
          >
            <tab.icon className="w-4 h-4" />
            {tab.label}
            {tab.count > 0 && (
              <span
                className={cn(
                  "px-1.5 py-0.5 text-xs rounded-full",
                  activeTab === tab.id ? "bg-primary-foreground/20" : "bg-primary/20 text-primary"
                )}
              >
                {tab.count}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* All Venues Tab */}
      {activeTab === "all" && (
        <>
          {allVenues === undefined ? (
            <LoadingState />
          ) : allVenues.length === 0 ? (
            <EmptyState
              icon={Store}
              title="No venues"
              description="Add the first venue to get started"
            />
          ) : (
            <div className="space-y-3">
              {allVenues.map((venue) => {
                const categoryInfo = getCategoryInfo(venue.category);
                const Icon = categoryInfo.icon;

                return (
                  <div
                    key={venue._id}
                    className="bg-card rounded-xl border border-border p-4"
                  >
                    <div className="flex items-start gap-4">
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

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <h3 className="font-semibold truncate">{venue.name}</h3>
                          <span
                            className={`px-2 py-0.5 text-xs font-medium rounded-full border ${getStatusBadge(
                              venue.status
                            )}`}
                          >
                            {venue.status}
                          </span>
                        </div>
                        <p className="text-sm text-muted-foreground">
                          {categoryInfo.shortLabel} · {venue.city}
                        </p>
                        <p className="text-xs text-muted-foreground mt-1">
                          {venue.favoriteCount ?? 0} favorites · {venue.viewCount ?? 0} views
                        </p>
                      </div>

                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="icon"
                          onClick={() => openEditDialog(venue)}
                        >
                          <Pencil className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="icon"
                          onClick={() => {
                            setVenueToDelete(venue._id);
                            setShowDeleteDialog(true);
                          }}
                        >
                          <Trash2 className="w-4 h-4 text-destructive" />
                        </Button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}

      {/* Pending Venues Tab */}
      {activeTab === "pending" && (
        <>
          {pendingVenues === undefined ? (
            <LoadingState />
          ) : pendingVenues.length === 0 ? (
            <EmptyState
              icon={CheckCircle}
              title="No pending venues"
              description="All venue submissions have been reviewed"
            />
          ) : (
            <div className="space-y-4">
              {pendingVenues.map((venue) => {
                const categoryInfo = getCategoryInfo(venue.category);
                const Icon = categoryInfo.icon;
                const isExpanded = selectedVenueId === venue._id;

                return (
                  <div
                    key={venue._id}
                    className="bg-card rounded-2xl border border-border overflow-hidden"
                  >
                    <div className="p-4">
                      <div className="flex items-start gap-4">
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
                          <h3 className="font-semibold">{venue.name}</h3>
                          <p className="text-sm text-muted-foreground">{categoryInfo.label}</p>
                          <div className="flex items-center gap-1 text-sm text-muted-foreground mt-1">
                            <MapPin className="w-3 h-3" />
                            <span>
                              {venue.address}, {venue.city}
                            </span>
                          </div>
                        </div>

                        <div className="text-right text-xs text-muted-foreground">
                          <p>Submitted {formatDate(venue.submittedAt)}</p>
                          {venue.submitterName && <p>by {venue.submitterName}</p>}
                        </div>
                      </div>

                      {isExpanded ? (
                        <div className="mt-4 space-y-4">
                          <div>
                            <label className="text-sm font-medium mb-2 block">
                              Rejection Reason (if rejecting)
                            </label>
                            <Textarea
                              value={rejectionReason}
                              onChange={(e) => setRejectionReason(e.target.value)}
                              placeholder="Explain why this venue is being rejected..."
                              rows={2}
                            />
                          </div>

                          <div className="flex items-center gap-2">
                            <Button
                              variant="outline"
                              onClick={() => {
                                setSelectedVenueId(null);
                                setRejectionReason("");
                              }}
                            >
                              Cancel
                            </Button>
                            <Button
                              variant="outline"
                              onClick={() => handleReject(venue._id)}
                              disabled={isProcessing || !rejectionReason.trim()}
                            >
                              {isProcessing && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                              <XCircle className="w-4 h-4 mr-2" />
                              Reject
                            </Button>
                            <Button onClick={() => handleApprove(venue._id)} disabled={isProcessing}>
                              {isProcessing && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                              <CheckCircle className="w-4 h-4 mr-2" />
                              Approve
                            </Button>
                          </div>
                        </div>
                      ) : (
                        <Button
                          variant="outline"
                          className="w-full mt-4"
                          onClick={() => setSelectedVenueId(venue._id)}
                        >
                          Review Venue
                        </Button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}

      {/* Flagged Venues Tab */}
      {activeTab === "flagged" && (
        <>
          {flaggedVenues === undefined ? (
            <LoadingState />
          ) : flaggedVenues.length === 0 ? (
            <EmptyState
              icon={CheckCircle}
              title="No flagged venues"
              description="No venues have been flagged for review"
            />
          ) : (
            <div className="space-y-4">
              {flaggedVenues.map((venue) => {
                const categoryInfo = getCategoryInfo(venue.category);
                const Icon = categoryInfo.icon;

                return (
                  <div key={venue._id} className="bg-card rounded-2xl border border-border p-4">
                    <div className="flex items-start gap-4">
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
                        <h3 className="font-semibold">{venue.name}</h3>
                        <p className="text-sm text-muted-foreground">
                          {categoryInfo.label} · {venue.city}
                        </p>
                        <p className="text-sm text-amber-500 mt-1">
                          {venue.reportCount} report{venue.reportCount !== 1 && "s"}
                        </p>
                      </div>

                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleApprove(venue._id)}
                          disabled={isProcessing}
                        >
                          Restore
                        </Button>
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => {
                            setVenueToDelete(venue._id);
                            setShowDeleteDialog(true);
                          }}
                          disabled={isProcessing}
                        >
                          Remove
                        </Button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}

      {/* Venue Reports Tab */}
      {activeTab === "reports" && (
        <>
          {venueReports === undefined ? (
            <LoadingState />
          ) : venueReports.length === 0 ? (
            <EmptyState
              icon={CheckCircle}
              title="No pending reports"
              description="All venue reports have been reviewed"
            />
          ) : (
            <div className="space-y-4">
              {venueReports.map((report) => (
                <div key={report._id} className="bg-card rounded-2xl border border-border p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <h3 className="font-semibold">{report.venueName}</h3>
                      <p className="text-sm text-muted-foreground mt-1">
                        Reason: <span className="capitalize">{report.reason.replace("_", " ")}</span>
                      </p>
                      {report.details && (
                        <p className="text-sm text-muted-foreground mt-1">Details: {report.details}</p>
                      )}
                      <p className="text-xs text-muted-foreground mt-2">
                        Reported by {report.reporterName || "Unknown"} · {formatDate(report.reportedAt)}
                      </p>
                    </div>

                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleResolveReport(report._id, "dismiss")}
                        disabled={isProcessing}
                      >
                        Dismiss
                      </Button>
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => handleResolveReport(report._id, "remove_venue")}
                        disabled={isProcessing}
                      >
                        Remove Venue
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {/* Add/Edit Venue Dialog */}
      <Dialog
        open={showAddDialog || showEditDialog}
        onOpenChange={(open) => {
          if (!open) {
            setShowAddDialog(false);
            setShowEditDialog(false);
            setFormData(INITIAL_FORM_DATA);
            setEditingVenueId(null);
          }
        }}
      >
        <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{showEditDialog ? "Edit Venue" : "Add Venue"}</DialogTitle>
          </DialogHeader>

          <div className="space-y-4 mt-4">
            <div>
              <Label htmlFor="name">Name *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => updateForm({ name: e.target.value })}
                placeholder="Venue name"
                className="mt-1"
              />
            </div>

            <div>
              <Label htmlFor="category">Category *</Label>
              <Select
                value={formData.category || undefined}
                onValueChange={(value) =>
                  updateForm({ category: value as VenueCategory, features: [] })
                }
              >
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="Select category">
                    {formData.category
                      ? getCategoryInfo(formData.category).label
                      : null}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {VENUE_CATEGORY_LIST.map((cat) => (
                    <SelectItem key={cat.id} value={cat.id}>
                      {cat.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => updateForm({ description: e.target.value })}
                placeholder="Description"
                rows={2}
                className="mt-1"
              />
            </div>

            <div>
              <Label htmlFor="address">Address *</Label>
              <div className="flex gap-2 mt-1">
                <Input
                  id="address"
                  value={formData.address}
                  onChange={(e) => updateForm({ address: e.target.value })}
                  placeholder="Street address"
                  className="flex-1"
                />
                <Button type="button" variant="outline" onClick={geocodeAddress} disabled={isGeocoding}>
                  {isGeocoding ? <Loader2 className="w-4 h-4 animate-spin" /> : <MapPin className="w-4 h-4" />}
                </Button>
              </div>
              {formData.latitude && formData.longitude && (
                <p className="text-xs text-green-500 mt-1">
                  Location verified: {formData.city}, {formData.state} {formData.country}
                </p>
              )}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="phone">Phone</Label>
                <Input
                  id="phone"
                  value={formData.phone}
                  onChange={(e) => updateForm({ phone: e.target.value })}
                  placeholder="Phone"
                  className="mt-1"
                />
              </div>
              <div>
                <Label htmlFor="website">Website</Label>
                <Input
                  id="website"
                  value={formData.website}
                  onChange={(e) => updateForm({ website: e.target.value })}
                  placeholder="Website"
                  className="mt-1"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
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
                <Label htmlFor="hours">Hours</Label>
                <Input
                  id="hours"
                  value={formData.hoursNote}
                  onChange={(e) => updateForm({ hoursNote: e.target.value })}
                  placeholder="e.g., Mon-Fri 6PM-2AM"
                  className="mt-1"
                />
              </div>
            </div>

            {showEditDialog && (
              <div>
                <Label htmlFor="status">Status</Label>
                <Select
                  value={formData.status}
                  onValueChange={(value) => updateForm({ status: value as VenueStatus })}
                >
                  <SelectTrigger className="mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="approved">Approved</SelectItem>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="flagged">Flagged</SelectItem>
                    <SelectItem value="rejected">Rejected</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}

            {formData.category && availableFeatures.length > 0 && (
              <div>
                <Label>Features</Label>
                <div className="flex flex-wrap gap-2 mt-2 max-h-32 overflow-y-auto">
                  {availableFeatures.map((feature) => (
                    <button
                      key={feature}
                      type="button"
                      onClick={() => toggleFeature(feature)}
                      className={cn(
                        "px-2 py-1 rounded-full text-xs font-medium transition-colors",
                        formData.features.includes(feature)
                          ? "bg-primary text-primary-foreground"
                          : "bg-secondary text-secondary-foreground hover:bg-secondary/80"
                      )}
                    >
                      {feature}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="flex justify-end gap-2 mt-6">
            <Button
              variant="outline"
              onClick={() => {
                setShowAddDialog(false);
                setShowEditDialog(false);
                setFormData(INITIAL_FORM_DATA);
                setEditingVenueId(null);
              }}
            >
              Cancel
            </Button>
            <Button
              onClick={showEditDialog ? handleEditVenue : handleAddVenue}
              disabled={isProcessing || !formData.name || !formData.category}
            >
              {isProcessing && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              {showEditDialog ? "Save Changes" : "Add Venue"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Venue</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this venue? This action cannot be undone. All favorites
              and reports for this venue will also be deleted.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel
              onClick={() => {
                setShowDeleteDialog(false);
                setVenueToDelete(null);
              }}
            >
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteVenue}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isProcessing && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function LoadingState() {
  return (
    <div className="space-y-4">
      {[...Array(3)].map((_, i) => (
        <div key={i} className="bg-card rounded-2xl border border-border p-4 animate-pulse">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 bg-muted rounded-xl" />
            <div className="flex-1">
              <div className="h-5 w-48 bg-muted rounded mb-2" />
              <div className="h-4 w-32 bg-muted rounded" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

function EmptyState({
  icon: Icon,
  title,
  description,
}: {
  icon: typeof Store;
  title: string;
  description: string;
}) {
  return (
    <div className="bg-card rounded-2xl border border-border p-12 text-center">
      <div className="w-16 h-16 bg-muted rounded-xl flex items-center justify-center mx-auto mb-4">
        <Icon className="w-8 h-8 text-muted-foreground" />
      </div>
      <h3 className="font-semibold text-lg mb-1">{title}</h3>
      <p className="text-muted-foreground">{description}</p>
    </div>
  );
}
