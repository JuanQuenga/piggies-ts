// Interest categories from interests.md

export const INTEREST_CATEGORIES = {
  kinks: {
    label: 'My Kinks',
    emoji: '🔥',
    interests: [
      'Anon', 'Bator', 'BB', 'BDSM', 'Bondage', 'Brat', 'Breeding', 'Bubblebutt',
      'Carplay', 'Chastity', 'CMNM', 'Commando', 'Condoms', 'Condomsonly', 'Cruising',
      'Cuck', 'Cumdump', 'Cut', 'Deepthroat', 'Dirty', 'Discreet', 'DL', 'Dom', 'DTF',
      'Edging', 'Eyecontact', 'Feet', 'Femboy', 'FF', 'Fingering', 'Flexible', 'Foreplay',
      'Frot', 'Furries', 'Furry', 'FWB', 'Gear', 'GH', 'Gooner', 'Group', 'Hands',
      'Hosting', 'Humiliation', 'Hung', 'JO', 'Kink', 'Kissing', 'Latex', 'Leather',
      'Limits', 'Lingerie', 'Looking', 'Married', 'Masc', 'Monogamy', 'Musk', 'Nipples',
      'NSA', 'Nudist', 'Nylon', 'Oral', 'Piercings', 'Pig', 'Pits', 'Poly', 'Public',
      'Pup', 'Pupplay', 'Quickie', 'Rimming', 'Roleplay', 'Rough', 'Rubber', 'Rugged',
      'Safersex', 'Sauna', 'Sexting', 'Showoff', 'Slut', 'Socks', 'Spanking', 'Spit',
      'Straight', 'Sub', 'Swallowing', 'Tentacles', 'Thick', 'Threesome', 'Tickling',
      'Toys', 'UC', 'Underwear', 'Vanilla', 'Verbal', 'Videochat', 'Visiting', 'Watching',
      'Worship', 'Wrestling', 'WS'
    ],
  },
  hobbies: {
    label: 'My Hobbies',
    emoji: '🎯',
    interests: [
      'Anime', 'Apres ski', 'Art', 'Beach', 'Brunch', 'Concerts', 'Cooking', 'Dancing',
      'DIY', 'Fashion', 'Gaming', 'Gym', 'Hiking', 'Karaoke', 'Movies', 'Music', 'Naps',
      'Pickleball', 'Popmusic', 'Reading', 'RPDR', 'Tattoos', 'Tennis', 'Theater', 'Tv',
      'Weightlifting', 'Workingout', 'Writing', 'Yoga'
    ],
  },
  personality: {
    label: 'My Personality',
    emoji: '✨',
    interests: [
      'Adventurous', 'Aquarius', 'Aries', 'Cancer', 'Capricorn', 'Catperson', 'Chill',
      'Confident', 'Curious', 'Direct', 'Dogperson', 'Fun', 'Gemini', 'Goofy', 'Kind',
      'Leo', 'Libra', 'Loyal', 'Mature', 'Outgoing', 'Parent', 'Pisces', 'Reliable',
      'Romantic', 'Sagittarius', 'Scorpio', 'Shy', 'Taurus', 'Unicorn', 'Virgo'
    ],
  },
  tags: {
    label: 'My Other Tags',
    emoji: '🏷️',
    interests: [
      'Bear', 'Beard', 'Bi', 'Chub', 'Cleancut', 'College', 'Couple', 'Cub', 'Cuddling',
      'Daddy', 'Dating', 'Drag', 'Drugfree', 'Femme', 'FTM', 'Friends', 'Gaymer', 'Geek',
      'Hairy', 'Jock', 'Lesbian', 'LTR', 'Military', 'MTF', 'Muscle', 'Nosmoking', 'Otter',
      'Pic4pic', 'Poz', 'Sissy', 'Smooth', 'Sober', 'T4T', 'Trans', 'Twink', 'Twunk'
    ],
  },
} as const

export type InterestCategory = keyof typeof INTEREST_CATEGORIES

// Flat array of all interests for validation/searching
export const ALL_INTERESTS = Object.values(INTEREST_CATEGORIES).flatMap(
  (category) => category.interests
)

// Get category for a given interest
export function getInterestCategory(interest: string): InterestCategory | null {
  for (const [key, category] of Object.entries(INTEREST_CATEGORIES)) {
    if ((category.interests as readonly string[]).includes(interest)) {
      return key as InterestCategory
    }
  }
  return null
}

// Get display info for an interest (category label, emoji)
export function getInterestDisplayInfo(interest: string) {
  const category = getInterestCategory(interest)
  if (!category) return null
  return {
    category,
    label: INTEREST_CATEGORIES[category].label,
    emoji: INTEREST_CATEGORIES[category].emoji,
  }
}
