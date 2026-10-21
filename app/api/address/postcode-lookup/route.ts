import { NextRequest, NextResponse } from "next/server";
import {
  UK_ADDRESS_DICTIONARY,
  searchAddressDictionary,
  parseCoordinates,
  isWithinUkBounds,
  formatUkPostcode,
  type UKAddressEntry,
} from "@/lib/address/dictionary";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const postcode = searchParams.get("postcode")?.trim();
    const query = searchParams.get("q")?.trim();
    const latParam = searchParams.get("lat");
    const lonParam = searchParams.get("lon");

    // 1. Direct Coordinates Lookup via lat & lon
    if (latParam && lonParam) {
      const lat = parseFloat(latParam);
      const lon = parseFloat(lonParam);
      if (!isNaN(lat) && !isNaN(lon)) {
        if (!isWithinUkBounds(lat, lon)) {
          return NextResponse.json({
            success: false,
            isCoordinates: true,
            isOutsideUk: true,
            message: `Coordinates (${lat.toFixed(3)}, ${lon.toFixed(3)}) are outside the United Kingdom.`,
            suggestions: [],
          });
        }

        try {
          const res = await fetch(
            `https://api.postcodes.io/postcodes?lat=${lat}&lon=${lon}&limit=1`,
            { signal: AbortSignal.timeout(3500) },
          );
          if (res.ok) {
            const data = await res.json();
            if (data.result && data.result.length > 0) {
              const item = data.result[0];
              const entry: UKAddressEntry = {
                line1: item.admin_district || "Local Area",
                city: item.admin_district || item.parish || item.region || "London",
                county: item.admin_county || item.region || "Greater London",
                postcode: item.postcode,
                country: "United Kingdom",
                formatted:
                  `${item.admin_district || ""}, ${item.admin_county || item.region || ""}, ${item.postcode}`.trim(),
              };
              return NextResponse.json({
                success: true,
                found: true,
                isCoordinates: true,
                suggestions: [entry],
              });
            }
          }
        } catch {
          // fallback
        }
      }
    }

    // 2. Query String (Coordinates or Postcode or Street search)
    const activeQuery = query || postcode || "";
    if (!activeQuery) {
      return NextResponse.json({ success: true, suggestions: [] });
    }

    // Check if query is raw coordinates string (e.g. "33.539793712557476, 73.054397")
    const parsedCoords = parseCoordinates(activeQuery);
    if (parsedCoords) {
      const { lat, lon } = parsedCoords;
      if (!isWithinUkBounds(lat, lon)) {
        return NextResponse.json({
          success: false,
          isCoordinates: true,
          isOutsideUk: true,
          message: `Coordinates (${lat.toFixed(3)}, ${lon.toFixed(3)}) are outside the United Kingdom.`,
          suggestions: [],
        });
      }

      try {
        const res = await fetch(
          `https://api.postcodes.io/postcodes?lat=${lat}&lon=${lon}&limit=1`,
          { signal: AbortSignal.timeout(3500) },
        );
        if (res.ok) {
          const data = await res.json();
          if (data.result && data.result.length > 0) {
            const item = data.result[0];
            const entry: UKAddressEntry = {
              line1: item.admin_district || "Local Area",
              city: item.admin_district || item.parish || item.region || "London",
              county: item.admin_county || item.region || "Greater London",
              postcode: item.postcode,
              country: "United Kingdom",
              formatted:
                `${item.admin_district || ""}, ${item.admin_county || item.region || ""}, ${item.postcode}`.trim(),
            };
            return NextResponse.json({
              success: true,
              found: true,
              isCoordinates: true,
              suggestions: [entry],
            });
          }
        }
      } catch {
        // Continue to dictionary fallback
      }
    }

    // 3. Exact Postcode Lookup (if specific postcode is requested or looks like full UK postcode)
    const cleanPostcode = activeQuery.toUpperCase().replace(/\s+/g, "");
    const isPotentiallyFullUkPostcode = /^[A-Z]{1,2}[0-9][A-Z0-9]?[0-9][A-Z]{2}$/i.test(
      cleanPostcode,
    );

    if (isPotentiallyFullUkPostcode) {
      // Check local dictionary first
      const localExact = UK_ADDRESS_DICTIONARY.find(
        (a) => a.postcode.replace(/\s+/g, "").toUpperCase() === cleanPostcode,
      );

      try {
        const res = await fetch(
          `https://api.postcodes.io/postcodes/${encodeURIComponent(cleanPostcode)}`,
          { signal: AbortSignal.timeout(3500) },
        );
        if (res.ok) {
          const data = await res.json();
          if (data.result) {
            const r = data.result;
            const liveEntry: UKAddressEntry = {
              line1: localExact?.line1 || r.admin_ward || r.admin_district || "Main Street",
              line2: localExact?.line2,
              city: r.admin_district || r.parish || r.region || "London",
              county: r.admin_county || r.region || "Greater London",
              postcode: r.postcode || formatUkPostcode(cleanPostcode),
              country: "United Kingdom",
              formatted:
                `${localExact?.line1 || r.admin_ward || r.admin_district || ""}, ${r.admin_district || ""}, ${r.admin_county || r.region || ""}, ${r.postcode}`.trim(),
            };

            return NextResponse.json({
              success: true,
              found: true,
              exactMatch: true,
              data: liveEntry,
              suggestions: [liveEntry],
            });
          }
        }
      } catch {
        if (localExact) {
          return NextResponse.json({
            success: true,
            found: true,
            exactMatch: true,
            data: localExact,
            suggestions: [localExact],
          });
        }
      }
    }

    // 4. Autocomplete & Dictionary Partial Search
    const localMatches = searchAddressDictionary(activeQuery, 6);

    // If query is 2-4 alphanumeric characters, check postcodes.io autocomplete
    let onlinePostcodes: UKAddressEntry[] = [];
    if (/^[A-Z]{1,2}[0-9]?[A-Z0-9]?$/i.test(cleanPostcode) && cleanPostcode.length >= 2) {
      try {
        const res = await fetch(
          `https://api.postcodes.io/postcodes/${encodeURIComponent(cleanPostcode)}/autocomplete`,
          { signal: AbortSignal.timeout(2000) },
        );
        if (res.ok) {
          const data = await res.json();
          if (Array.isArray(data.result)) {
            onlinePostcodes = data.result.slice(0, 4).map((pc: string) => ({
              line1: "Delivery Address",
              city: "United Kingdom",
              county: "UK Region",
              postcode: pc,
              country: "United Kingdom",
              formatted: `UK Postcode: ${pc}`,
            }));
          }
        }
      } catch {
        // Ignore API autocomplete error and rely on local matches
      }
    }

    // Merge results, avoiding duplicate postcodes
    const seenPostcodes = new Set<string>();
    const combined: UKAddressEntry[] = [];

    for (const item of localMatches) {
      const key = item.postcode.replace(/\s+/g, "").toUpperCase();
      if (!seenPostcodes.has(key)) {
        seenPostcodes.add(key);
        combined.push(item);
      }
    }

    for (const item of onlinePostcodes) {
      const key = item.postcode.replace(/\s+/g, "").toUpperCase();
      if (!seenPostcodes.has(key)) {
        seenPostcodes.add(key);
        combined.push(item);
      }
    }

    return NextResponse.json({
      success: true,
      found: combined.length > 0,
      suggestions: combined.slice(0, 8),
    });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err.message || "Failed to lookup address." },
      { status: 500 },
    );
  }
}
