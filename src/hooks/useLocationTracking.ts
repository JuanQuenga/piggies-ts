import { useEffect, useRef, useCallback } from 'react'
import { useMutation } from 'convex/react'
import { api } from '../../convex/_generated/api'
import { useCurrentUser } from './useCurrentUser'

const LOCATION_UPDATE_INTERVAL = 15 * 60 * 1000 // 15 minutes
const MIN_DISTANCE_THRESHOLD_MILES = 0.5
const STORAGE_KEY = 'piggies_last_location_update'

interface StoredLocationData {
  timestamp: number
  latitude: number
  longitude: number
}

/**
 * Calculate distance between two coordinates using Haversine formula
 * @returns Distance in miles
 */
function calculateDistanceMiles(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 3959 // Earth's radius in miles
  const dLat = ((lat2 - lat1) * Math.PI) / 180
  const dLon = ((lon2 - lon1) * Math.PI) / 180
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2)
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
  return R * c
}

/**
 * Get stored location data from localStorage
 */
function getStoredLocationData(): StoredLocationData | null {
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored) {
      return JSON.parse(stored) as StoredLocationData
    }
  } catch {
    // Ignore parse errors
  }
  return null
}

/**
 * Store location data to localStorage
 */
function storeLocationData(data: StoredLocationData): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data))
  } catch {
    // Ignore storage errors
  }
}

/**
 * Reverse geocode coordinates to get city name
 */
async function reverseGeocode(
  latitude: number,
  longitude: number
): Promise<string> {
  const response = await fetch(
    `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&zoom=10`
  )
  const data = await response.json()
  return (
    data.address?.city ||
    data.address?.town ||
    data.address?.village ||
    data.address?.county ||
    'Unknown Location'
  )
}

/**
 * Hook to automatically track and update user location
 * Updates location:
 * - On initial load if stale (>15 min)
 * - Periodically every 15 minutes
 * - When user returns to tab
 * - Only if user has moved >0.5 miles
 */
export function useLocationTracking() {
  const { user, isLoading } = useCurrentUser()
  const updateLocation = useMutation(api.users.updateLocation)
  const isUpdatingRef = useRef(false)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const updateUserLocation = useCallback(async () => {
    // Skip if no user, still loading, or already updating
    if (!user || isLoading || isUpdatingRef.current) return

    // Skip if location sharing is disabled
    if (user.locationSharingEnabled === false) return

    // Skip if geolocation not supported
    if (!navigator.geolocation) return

    isUpdatingRef.current = true

    try {
      const position = await new Promise<GeolocationPosition>(
        (resolve, reject) => {
          navigator.geolocation.getCurrentPosition(resolve, reject, {
            enableHighAccuracy: false, // Use coarse location for efficiency
            timeout: 10000,
            maximumAge: 60000, // Accept cached position up to 1 minute old
          })
        }
      )

      const { latitude, longitude } = position.coords
      const storedData = getStoredLocationData()
      const now = Date.now()

      // Check if we should skip update (recently updated and hasn't moved much)
      if (storedData) {
        const timeSinceUpdate = now - storedData.timestamp
        const distance = calculateDistanceMiles(
          storedData.latitude,
          storedData.longitude,
          latitude,
          longitude
        )

        // Skip if updated recently and hasn't moved significantly
        if (
          timeSinceUpdate < LOCATION_UPDATE_INTERVAL &&
          distance < MIN_DISTANCE_THRESHOLD_MILES
        ) {
          isUpdatingRef.current = false
          return
        }

        // Skip if hasn't moved significantly (even if time elapsed)
        if (distance < MIN_DISTANCE_THRESHOLD_MILES) {
          // Just update the timestamp so we don't keep checking
          storeLocationData({ timestamp: now, latitude, longitude })
          isUpdatingRef.current = false
          return
        }
      }

      // Get location name and update
      const locationName = await reverseGeocode(latitude, longitude)

      await updateLocation({
        userId: user._id,
        latitude,
        longitude,
        locationName,
      })

      // Store the updated location data
      storeLocationData({ timestamp: now, latitude, longitude })

      // Also update UI localStorage keys if user is in "nearby" mode
      // This keeps the UI in sync with the automatic location updates
      const currentLocationType = localStorage.getItem('piggies-location-type')
      if (currentLocationType === 'nearby' || !currentLocationType) {
        localStorage.setItem(
          'piggies-nearby-coords',
          JSON.stringify({ latitude, longitude })
        )
        localStorage.setItem('piggies-nearby-location', locationName)
        // Dispatch event so UI components can react
        window.dispatchEvent(new Event('location-changed'))
      }
    } catch {
      // Silently fail - don't block UI for location errors
    } finally {
      isUpdatingRef.current = false
    }
  }, [user, isLoading, updateLocation])

  useEffect(() => {
    if (!user || isLoading) return

    // Initial location check
    updateUserLocation()

    // Set up periodic updates
    intervalRef.current = setInterval(updateUserLocation, LOCATION_UPDATE_INTERVAL)

    // Update when tab becomes visible
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        updateUserLocation()
      }
    }
    document.addEventListener('visibilitychange', handleVisibilityChange)

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
      }
      document.removeEventListener('visibilitychange', handleVisibilityChange)
    }
  }, [user, isLoading, updateUserLocation])
}
