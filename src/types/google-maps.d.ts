declare namespace google.maps {
  export interface LatLng {
    lat(): number;
    lng(): number;
  }

  export interface LatLngLiteral {
    lat: number;
    lng: number;
  }

  export namespace marker {
    export class AdvancedMarkerElement {
      position?: LatLng | LatLngLiteral | null;
      title?: string;
    }
  }

  export namespace places {
    export enum SearchNearbyRankPreference {
      POPULARITY = 'POPULARITY',
      DISTANCE = 'DISTANCE',
    }

    export interface AuthorAttribution {
      displayName?: string | null;
      uri?: string | null;
      photoURI?: string | null;
    }

    export interface Photo {
      getURI(options?: { maxWidth?: number; maxHeight?: number }): string;
      authorAttributions?: AuthorAttribution[];
    }

    export interface Review {
      authorAttribution?: AuthorAttribution | null;
      rating?: number | null;
      text?: string | null;
      relativePublishTimeDescription?: string | null;
    }

    export interface OpeningHours {
      weekdayDescriptions?: string[];
    }

    export interface SearchNearbyRequest {
      fields: string[];
      locationRestriction: {
        center: LatLng | LatLngLiteral;
        radius: number;
      };
      includedPrimaryTypes?: string[];
      maxResultCount?: number;
      rankPreference?: SearchNearbyRankPreference;
      language?: string;
      region?: string;
    }

    export interface SearchByTextRequest {
      textQuery: string;
      fields: string[];
      locationBias?: {
        center: LatLng | LatLngLiteral;
        radius: number;
      };
      maxResultCount?: number;
      language?: string;
      region?: string;
    }

    export class Place {
      constructor(options: { id: string; requestedLanguage?: string });
      id?: string;
      displayName?: string;
      formattedAddress?: string;
      location?: LatLng | LatLngLiteral | null;
      types?: string[];
      primaryTypeDisplayName?: string;
      rating?: number;
      userRatingCount?: number;
      priceLevel?: unknown;
      businessStatus?: unknown;
      regularOpeningHours?: OpeningHours;
      nationalPhoneNumber?: string;
      internationalPhoneNumber?: string;
      websiteURI?: string;
      googleMapsURI?: string;
      photos?: Photo[];
      reviews?: Review[];
      editorialSummary?: string;
      fetchFields(options: { fields: string[] }): Promise<{ place: Place }>;
      static searchNearby(request: SearchNearbyRequest): Promise<{ places: Place[] }>;
      static searchByText(request: SearchByTextRequest): Promise<{ places: Place[] }>;
    }

    export class AutocompleteSessionToken {}

    export interface PlacePrediction {
      text: { text: string };
      toPlace(): Place;
    }

    export interface AutocompleteSuggestion {
      placePrediction?: PlacePrediction | null;
      static fetchAutocompleteSuggestions(request: {
        input: string;
        sessionToken?: AutocompleteSessionToken;
      }): Promise<{ suggestions: AutocompleteSuggestion[] }>;
    }
  }

  export interface PlacesLibrary {
    Place: typeof places.Place;
    SearchNearbyRankPreference: typeof places.SearchNearbyRankPreference;
    AutocompleteSessionToken: typeof places.AutocompleteSessionToken;
    AutocompleteSuggestion: typeof places.AutocompleteSuggestion;
  }
}
