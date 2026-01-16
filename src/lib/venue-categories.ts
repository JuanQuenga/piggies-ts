import {
  Wine,
  Flame,
  Dumbbell,
  PartyPopper,
  HeartPulse,
  type LucideIcon,
} from "lucide-react";

// ============================================================================
// VENUE CATEGORIES
// ============================================================================

export const VENUE_CATEGORIES = {
  bars_nightlife: {
    id: "bars_nightlife",
    label: "Bars & Nightlife",
    shortLabel: "Bars",
    icon: Wine,
    description: "Gay bars, clubs, lounges, and nightlife spots",
  },
  adult_venues: {
    id: "adult_venues",
    label: "Adult Venues",
    shortLabel: "Adult",
    icon: Flame,
    description: "Sex clubs, bathhouses, saunas, and adult-only spaces",
  },
  fitness_wellness: {
    id: "fitness_wellness",
    label: "Fitness & Wellness",
    shortLabel: "Fitness",
    icon: Dumbbell,
    description: "LGBTQ+ friendly gyms, spas, and wellness centers",
  },
  events_social: {
    id: "events_social",
    label: "Events & Social",
    shortLabel: "Events",
    icon: PartyPopper,
    description: "Community centers, social clubs, and event spaces",
  },
  health_clinics: {
    id: "health_clinics",
    label: "Health & Clinics",
    shortLabel: "Health",
    icon: HeartPulse,
    description: "LGBTQ+ health clinics, testing centers, and mental health services",
  },
} as const;

export type VenueCategory = keyof typeof VENUE_CATEGORIES;

export const VENUE_CATEGORY_LIST = Object.values(VENUE_CATEGORIES);

export function getCategoryInfo(category: VenueCategory): {
  id: string;
  label: string;
  shortLabel: string;
  icon: LucideIcon;
  description: string;
} {
  return VENUE_CATEGORIES[category];
}

// ============================================================================
// VENUE FEATURES BY CATEGORY
// ============================================================================

export const VENUE_FEATURES: Record<VenueCategory, string[]> = {
  bars_nightlife: [
    "Cruisy",
    "Dance Floor",
    "Drag Shows",
    "Karaoke",
    "Leather/Fetish Friendly",
    "Patio/Outdoor",
    "Sports Bar",
    "Bear Bar",
    "Video Bar",
    "Piano Bar",
    "Late Night",
    "Happy Hour",
    "Sunday Funday",
    "Live DJ",
    "Pool Tables",
    "Food Menu",
  ],
  adult_venues: [
    "Steam Room",
    "Dry Sauna",
    "Hot Tub/Jacuzzi",
    "Dark Room",
    "Private Rooms",
    "Lockers",
    "Towel Service",
    "Gym",
    "Rooftop",
    "Pool",
    "Maze",
    "Sling Room",
    "Glory Holes",
    "Theme Nights",
    "Couples Welcome",
    "21+",
    "18+",
    "24 Hours",
  ],
  fitness_wellness: [
    "Gym",
    "Pool",
    "Yoga",
    "Spa Services",
    "Massage",
    "Steam Room",
    "LGBTQ+ Owned",
    "Trans Friendly",
    "Personal Training",
    "Group Classes",
    "Locker Room",
    "Sauna",
    "CrossFit",
    "Boxing",
  ],
  events_social: [
    "Community Center",
    "Support Groups",
    "Youth Programs",
    "Senior Programs",
    "Meeting Space",
    "Library",
    "Art Gallery",
    "Performance Space",
    "Dance Classes",
    "Networking Events",
    "Pride Events",
    "Weekly Meetups",
    "Sports Leagues",
    "Book Club",
  ],
  health_clinics: [
    "HIV Testing",
    "STI Testing",
    "PrEP Services",
    "PEP Services",
    "HRT/Hormone Therapy",
    "Mental Health",
    "Counseling",
    "Support Groups",
    "Walk-ins Welcome",
    "Insurance Accepted",
    "Sliding Scale",
    "Free Testing",
    "Trans Healthcare",
    "Addiction Services",
    "Anonymous Testing",
  ],
};

// Flatten all features for validation
export const ALL_FEATURES = Object.values(VENUE_FEATURES).flat();

// Get features for a specific category
export function getFeaturesForCategory(category: VenueCategory): string[] {
  return VENUE_FEATURES[category] || [];
}

// ============================================================================
// REPORT REASONS
// ============================================================================

export const REPORT_REASONS = {
  closed_permanently: {
    id: "closed_permanently",
    label: "Permanently Closed",
    description: "This venue has closed and is no longer operating",
  },
  incorrect_info: {
    id: "incorrect_info",
    label: "Incorrect Information",
    description: "The address, hours, or contact info is wrong",
  },
  inappropriate: {
    id: "inappropriate",
    label: "Inappropriate Content",
    description: "The listing contains inappropriate or offensive content",
  },
  duplicate: {
    id: "duplicate",
    label: "Duplicate Listing",
    description: "This venue is already listed elsewhere",
  },
  other: {
    id: "other",
    label: "Other Issue",
    description: "Report another issue with this listing",
  },
} as const;

export type ReportReason = keyof typeof REPORT_REASONS;

export const REPORT_REASON_LIST = Object.values(REPORT_REASONS);

// ============================================================================
// DISTANCE OPTIONS
// ============================================================================

export const DISTANCE_OPTIONS = [
  { value: 5, label: "5 miles" },
  { value: 10, label: "10 miles" },
  { value: 25, label: "25 miles" },
  { value: 50, label: "50 miles" },
  { value: 100, label: "100 miles" },
] as const;
