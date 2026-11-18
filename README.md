# Nearby Rest Locations

**Developed by Waves IT**

**Nearby Rest Locations** is a responsive full-stack React, TypeScript, and Express web application (with an accompanying Android Jetpack Compose screen) for discovering and booking hotels, restaurants, cabanas, and cafes in real time using live Google Maps Platform data, Booking.com Demand API integration, and Firebase Authentication & Cloud Firestore.

---

## Key Features

### 1. Real-Time Location & Manual Town Explorer
- **Live GPS Tracking**: Continuously tracks user coordinates via `navigator.geolocation.watchPosition` and resolves the nearest town via the server-side `/api/reverse-geocode` proxy.
- **Manual Location Entry**: Search any town, city, or address manually using Google Places `AutocompleteSuggestion` (with `AutocompleteSessionToken` session management) and `/api/geocode`.
- **Category Filters & Search**: Filter nearby places across **All Places**, **Hotels**, **Restaurants**, **Cabanas**, and **Cafes** with configurable radius (`2 km` – `25 km`) and keyword queries powered by Places API (New) (`Place.searchNearby` & `Place.searchByText`).
- **Saved Search History**: Authenticated users can revisit or delete past GPS and manual searches stored in Firestore (`searchHistory`).

### 2. Dedicated Live Map Window
- Built with `@vis.gl/react-google-maps` (`<Map>`, `<AdvancedMarker>`, `<Pin>`, `<InfoWindow>`).
- Displays a live GPS user position marker alongside color-coded pins for every discovered hotel, restaurant, cabana, and cafe.
- Includes a synchronized side results panel, **Recenter GPS** control, and **Search This Area** viewport refresh.

### 3. Business Details, Reviews & Contact Directory
- Fetches live Google Maps details: star ratings, total review counts, written user reviews with author attributions, opening hours, photos with author attributions, phone numbers, formatted addresses, official websites, and Google Maps directions links.

### 4. In-App Booking & Booking.com API Integration
- Supports reservations for hotels, cabanas, restaurants, and cafes with date/time selection, guest count, room or seating preferences, and payment method options (`pay_at_property`, `card_reservation`, `booking_com_checkout`).
- Server endpoint `POST /api/booking/availability` queries the **Booking.com Demand API v3.1** when `BOOKING_COM_API_KEY` and `BOOKING_COM_AFFILIATE_ID` are configured, and provides a direct Booking.com property search link alongside persisted Firestore booking requests.

### 5. Authentication, Push Notifications & Preferences
- **Firebase Authentication**: Sign In, Sign Up, Sign Out, and **Continue with Google** (`signInWithPopup`).
- **Push Notifications**: Uses the browser `Notification` API and in-app toast/inbox alerts for upcoming booking appointments and active promotional offers.
- **Developer Settings**: Dedicated Settings view highlighting **Waves IT**, notification preferences, default search category/radius, and search history management.

### 6. Admin Console
- Role-protected dashboard for administrators to:
  - View and manage registered user roles (`user` / `admin`) and account status (`active` / `suspended`).
  - Monitor real-time immutable user activity logs (`activityLogs`).
  - Update booking statuses (`pending`, `confirmed`, `completed`, `cancelled`).
  - Publish and toggle promotional offers (`promotions`).

### 7. Android Jetpack Compose Companion Screen
- Included at `android/NearbyRestLocationsScreen.kt`, implementing a Material 3 `SearchBar`, `FilterChip` selectors (`Hotels`, `Restaurants`, `Cabanas`, `Cafes`), and `FusedLocationProviderClient` GPS location tracking.

---

## Tech Stack

- **Frontend**: React 19, TypeScript, Tailwind CSS v4, `@vis.gl/react-google-maps`, Lucide React
- **Backend**: Node.js, Express (`server.ts`), Vite middleware (dev) / static `dist/` serving (prod)
- **Maps & Location**: Google Maps JavaScript API, Places API (New), Geocoding API
- **Database & Auth**: Firebase Authentication, Cloud Firestore (`firebase-applet-config.json`, `firestore.rules`)
- **Booking Integration**: Booking.com Demand API v3.1 (`/api/booking/availability`)

---

## Project Structure

```text
├── android/
│   └── NearbyRestLocationsScreen.kt   # Jetpack Compose search & filter screen
├── src/
│   ├── assets/images/                 # Generated hero & category fallback visuals
│   ├── components/
│   │   ├── AdminDashboardView.tsx     # User management, logs, bookings & promos
│   │   ├── AuthModal.tsx              # Sign In / Sign Up / Google Auth modal
│   │   ├── BookingModal.tsx           # In-app & Booking.com API reservation flow
│   │   ├── BookingsView.tsx           # Saved bookings & notification alerts
│   │   ├── ErrorBoundary.tsx          # React error boundary
│   │   ├── ExploreView.tsx            # GPS/manual search, filters & grid
│   │   ├── Header.tsx                 # Responsive 3-zone top navigation bar
│   │   ├── LiveMapView.tsx            # Interactive Google Map & GPS window
│   │   ├── LogoMark.tsx               # Hotel + Magnifying Glass SVG logo
│   │   ├── PlaceCard.tsx              # Business summary card
│   │   ├── PlaceDetailModal.tsx       # Google reviews, hours & contact info
│   │   └── SettingsView.tsx           # Waves IT info, push & profile settings
│   ├── lib/
│   │   ├── constants.ts               # App constants & field validation limits
│   │   ├── firebase.ts                # Firebase SDK init & error handler
│   │   ├── firestoreService.ts        # Typed Firestore CRUD & listeners
│   │   └── placesService.ts           # Places API (New) search & mapping
│   ├── types/
│   │   ├── app.ts                     # Domain TypeScript interfaces
│   │   └── google-maps.d.ts           # Google Maps JS ambient type declarations
│   ├── App.tsx                        # Main application orchestration
│   ├── index.css                      # Tailwind v4 & font theme tokens
│   └── main.tsx                       # Entry point & Maps quota listener
├── server.ts                          # Express API server & Vite integration
├── firebase-blueprint.json            # Firestore schema intermediate blueprint
├── firestore.rules                    # Hardened Cloud Firestore security rules
├── eslint.config.js                   # Security rules ESLint configuration
├── index.html                         # HTML entry & Google Fonts
├── metadata.json                      # App metadata & geolocation permissions
└── package.json                       # Scripts & dependencies
```

---

## Configuration & Environment Variables

Copy `.env.example` to `.env` and populate the required values:

```env
# Google Maps Platform API Key (Maps JS API, Places API New, Geocoding API)
VITE_GOOGLE_MAPS_API_KEY="YOUR_GOOGLE_MAPS_API_KEY"

# Optional Booking.com Demand API v3.1 Credentials
BOOKING_COM_API_KEY=""
BOOKING_COM_AFFILIATE_ID=""

# Hosted App URL
APP_URL="http://localhost:3000"
```

### Firebase Configuration
- Client configuration is stored in `firebase-applet-config.json` (connecting to the configured Firestore database ID).
- If you want users to register with Email & Password in addition to **Continue with Google**, enable the **Email/Password** sign-in provider in the Firebase Console under **Authentication → Sign-in method**.
- Security rules are defined in `firestore.rules` and validated with `@firebase/eslint-plugin-security-rules`.

---

## Running Locally

1. **Install dependencies**:
   ```bash
   npm install
   ```

2. **Start the development server** (runs Express + Vite on port `3000`):
   ```bash
   npm run dev
   ```

3. **Typecheck & lint security rules**:
   ```bash
   npm run lint
   npx eslint firestore.rules
   ```

4. **Build and run for production**:
   ```bash
   npm run build
   npm start
   ```

---

## Developer

- **Studio**: **Waves IT**
- **Application**: **Nearby Rest Locations**
