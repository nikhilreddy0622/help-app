export interface City { slug: string; name: string; lat: number; lng: number }
export const CITIES: City[] = [
  { slug: 'bengaluru', name: 'Bengaluru', lat: 12.9716, lng: 77.5946 },
  { slug: 'mumbai', name: 'Mumbai', lat: 19.076, lng: 72.8777 },
  { slug: 'delhi', name: 'Delhi', lat: 28.6139, lng: 77.209 },
  { slug: 'hyderabad', name: 'Hyderabad', lat: 17.385, lng: 78.4867 },
  { slug: 'chennai', name: 'Chennai', lat: 13.0827, lng: 80.2707 },
  { slug: 'pune', name: 'Pune', lat: 18.5204, lng: 73.8567 },
  { slug: 'kolkata', name: 'Kolkata', lat: 22.5726, lng: 88.3639 },
  { slug: 'ahmedabad', name: 'Ahmedabad', lat: 23.0225, lng: 72.5714 },
  { slug: 'jaipur', name: 'Jaipur', lat: 26.9124, lng: 75.7873 },
  { slug: 'kochi', name: 'Kochi', lat: 9.9312, lng: 76.2673 },
];
export const DEFAULT_CITY = CITIES[0] as City;
export const cityBySlug = (slug?: string | null) => CITIES.find((c) => c.slug === slug?.toLowerCase());
