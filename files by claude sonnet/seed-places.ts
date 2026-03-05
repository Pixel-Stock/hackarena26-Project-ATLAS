/**
 * ATLAS CrowdTag — Google Places API Merchant Seeder
 * ====================================================
 * Run this ONCE before launch to pre-populate merchant_fingerprints
 * with real merchant data from Google Places API.
 *
 * This gives ATLAS day-one coverage — users never see an empty CrowdTag.
 *
 * Usage:
 *   GOOGLE_PLACES_API_KEY=your_key \
 *   SUPABASE_URL=your_url \
 *   SUPABASE_SERVICE_KEY=your_service_key \
 *   npx tsx seed-places.ts --cities "Mumbai,Delhi,Bangalore,Pune,Chennai"
 *
 * Or seed a single city:
 *   npx tsx seed-places.ts --cities "Pune" --limit 200
 */

import { createClient } from "@supabase/supabase-js";

// ─────────────────────────────────────────────
// CONFIG
// ─────────────────────────────────────────────

const GOOGLE_PLACES_API_KEY = process.env.GOOGLE_PLACES_API_KEY!;
const SUPABASE_URL           = process.env.SUPABASE_URL!;
const SUPABASE_SERVICE_KEY   = process.env.SUPABASE_SERVICE_ROLE_KEY!;  // service role — bypasses RLS

if (!GOOGLE_PLACES_API_KEY || !SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error("❌ Missing environment variables. Check GOOGLE_PLACES_API_KEY, SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}

// Supabase client with service role key (bypasses RLS for seeding)
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

// ─────────────────────────────────────────────
// GOOGLE PLACES → ATLAS CATEGORY MAPPING
// ─────────────────────────────────────────────

const PLACES_TYPE_TO_ATLAS_CATEGORY: Record<string, string> = {
  // Food
  restaurant:          "Food & Dining",
  cafe:                "Food & Dining",
  bar:                 "Food & Dining",
  bakery:              "Food & Dining",
  meal_takeaway:       "Takeout & Delivery",
  meal_delivery:       "Takeout & Delivery",
  food:                "Food & Dining",
  fast_food:           "Takeout & Delivery",

  // Grocery / Retail
  supermarket:         "Groceries",
  grocery_or_supermarket: "Groceries",
  convenience_store:   "Groceries",

  // Health
  pharmacy:            "Health & Medicine",
  drugstore:           "Health & Medicine",
  hospital:            "Health & Medicine",
  doctor:              "Health & Medicine",
  dentist:             "Health & Medicine",
  health:              "Health & Medicine",

  // Personal care
  beauty_salon:        "Personal Care",
  hair_care:           "Personal Care",
  spa:                 "Personal Care",

  // Shopping
  clothing_store:      "Clothing & Fashion",
  shoe_store:          "Clothing & Fashion",
  shopping_mall:       "Clothing & Fashion",
  department_store:    "Clothing & Fashion",
  electronics_store:   "Electronics",
  hardware_store:      "Home & Household",
  furniture_store:     "Home & Household",
  home_goods_store:    "Home & Household",
  book_store:          "Education",

  // Transport
  gas_station:         "Transport",
  car_repair:          "Transport",
  parking:             "Transport",
  transit_station:     "Transport",

  // Entertainment
  movie_theater:       "Entertainment",
  amusement_park:      "Entertainment",
  gym:                 "Personal Care",
  night_club:          "Entertainment",

  // Education
  school:              "Education",
  university:          "Education",
  library:             "Education",
};

// Search queries per city — covers the most common merchant types
const SEARCH_QUERIES = [
  "supermarket",
  "grocery store",
  "pharmacy",
  "restaurant",
  "cafe",
  "fast food",
  "clothing store",
  "electronics store",
  "fuel station",
  "bakery",
  "convenience store",
  "hospital",
  "gym",
  "salon",
];

// ─────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────

interface PlacesResult {
  place_id:     string;
  name:         string;
  types:        string[];
  vicinity?:    string;
  formatted_address?: string;
}

interface SeedStats {
  total_fetched:  number;
  total_seeded:   number;
  total_skipped:  number;
  errors:         number;
  by_category:    Record<string, number>;
}

// ─────────────────────────────────────────────
// GOOGLE PLACES API
// ─────────────────────────────────────────────

async function searchPlacesNearby(
  query:    string,
  city:     string,
  country:  string = "IN",
  limit:    number = 60,
): Promise<PlacesResult[]> {
  // Step 1: Geocode city to get lat/lng
  const geocodeUrl = new URL("https://maps.googleapis.com/maps/api/geocode/json");
  geocodeUrl.searchParams.set("address", `${city}, ${country}`);
  geocodeUrl.searchParams.set("key", GOOGLE_PLACES_API_KEY);

  const geocodeRes  = await fetch(geocodeUrl.toString());
  const geocodeData = await geocodeRes.json();

  if (!geocodeData.results?.[0]) {
    console.warn(`⚠️  Could not geocode: ${city}`);
    return [];
  }

  const { lat, lng } = geocodeData.results[0].geometry.location;

  // Step 2: Text search
  const searchUrl = new URL("https://maps.googleapis.com/maps/api/place/textsearch/json");
  searchUrl.searchParams.set("query",    `${query} in ${city}`);
  searchUrl.searchParams.set("location", `${lat},${lng}`);
  searchUrl.searchParams.set("radius",   "15000");  // 15km radius
  searchUrl.searchParams.set("key",      GOOGLE_PLACES_API_KEY);

  const results: PlacesResult[] = [];
  let   nextPageToken: string | undefined;
  let   pages = 0;
  const maxPages = Math.ceil(limit / 20);

  do {
    if (nextPageToken) {
      searchUrl.searchParams.set("pagetoken", nextPageToken);
      await sleep(2000);  // Google requires 2s delay between paginated requests
    }

    const res  = await fetch(searchUrl.toString());
    const data = await res.json();

    if (data.status !== "OK" && data.status !== "ZERO_RESULTS") {
      console.error(`Places API error: ${data.status} — ${data.error_message}`);
      break;
    }

    results.push(...(data.results ?? []));
    nextPageToken = data.next_page_token;
    pages++;
  } while (nextPageToken && pages < maxPages);

  return results.slice(0, limit);
}

function classifyPlacesTypes(types: string[]): string {
  for (const type of types) {
    const category = PLACES_TYPE_TO_ATLAS_CATEGORY[type];
    if (category) return category;
  }
  return "Other";
}

// ─────────────────────────────────────────────
// SEEDER
// ─────────────────────────────────────────────

async function seedCity(
  city:    string,
  country: string,
  limit:   number,
  stats:   SeedStats,
): Promise<void> {
  console.log(`\n🏙️  Seeding: ${city}, ${country}`);

  for (const query of SEARCH_QUERIES) {
    try {
      const places = await searchPlacesNearby(query, city, country, Math.floor(limit / SEARCH_QUERIES.length));
      console.log(`   📍 "${query}" → ${places.length} results`);

      for (const place of places) {
        stats.total_fetched++;
        const category = classifyPlacesTypes(place.types);

        const { data, error } = await supabase.rpc("seed_merchant_from_places", {
          p_name:     place.name,
          p_city:     city,
          p_country:  country,
          p_category: category,
          p_place_id: place.place_id,
          p_types:    place.types,
        });

        if (error) {
          stats.errors++;
          if (process.env.VERBOSE) {
            console.error(`     ❌ ${place.name}: ${error.message}`);
          }
        } else if (data?.seeded) {
          stats.total_seeded++;
          stats.by_category[category] = (stats.by_category[category] ?? 0) + 1;
        } else {
          stats.total_skipped++;  // already exists
        }
      }

      await sleep(500);  // rate limit courtesy delay
    } catch (err) {
      stats.errors++;
      console.error(`   ❌ Query "${query}" failed:`, err);
    }
  }
}

// ─────────────────────────────────────────────
// MAIN
// ─────────────────────────────────────────────

async function main() {
  const args    = process.argv.slice(2);
  const cities  = getArg(args, "--cities",  "Mumbai,Delhi,Bangalore,Pune,Chennai,Hyderabad,Kolkata").split(",").map(c => c.trim());
  const country = getArg(args, "--country", "IN");
  const limit   = parseInt(getArg(args, "--limit", "100"), 10);

  console.log("═══════════════════════════════════════════");
  console.log("  ATLAS CrowdTag — Google Places Seeder");
  console.log(`  Cities  : ${cities.join(", ")}`);
  console.log(`  Country : ${country}`);
  console.log(`  Limit   : ${limit} per city`);
  console.log("═══════════════════════════════════════════");

  const stats: SeedStats = {
    total_fetched:  0,
    total_seeded:   0,
    total_skipped:  0,
    errors:         0,
    by_category:    {},
  };

  for (const city of cities) {
    await seedCity(city.trim(), country, limit, stats);
  }

  // Final report
  console.log("\n═══════════════════════════════════════════");
  console.log("  SEEDING COMPLETE");
  console.log(`  Fetched  : ${stats.total_fetched}`);
  console.log(`  Seeded   : ${stats.total_seeded} (new merchants)`);
  console.log(`  Skipped  : ${stats.total_skipped} (already existed)`);
  console.log(`  Errors   : ${stats.errors}`);
  console.log("\n  By Category:");
  Object.entries(stats.by_category)
    .sort(([, a], [, b]) => b - a)
    .forEach(([cat, count]) => console.log(`    ${cat.padEnd(25)} ${count}`));
  console.log("═══════════════════════════════════════════");
}

function getArg(args: string[], flag: string, defaultVal: string): string {
  const idx = args.indexOf(flag);
  return idx !== -1 && args[idx + 1] ? args[idx + 1] : defaultVal;
}

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

main().catch(err => {
  console.error("Fatal seeder error:", err);
  process.exit(1);
});
