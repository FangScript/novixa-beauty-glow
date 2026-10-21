"use client";

import { useState, useEffect, useRef, useMemo } from "react";
import { Search, MapPin, Check, ChevronDown, AlertCircle, Loader2 } from "lucide-react";
import {
  COUNTRIES,
  UK_MAJOR_CITIES,
  getCountryRegionConfig,
  validatePostalCode,
  parseCoordinates,
  isWithinUkBounds,
  formatUkPostcode,
  searchAddressDictionary,
  type UKAddressEntry,
} from "@/lib/address/dictionary";

export interface AddressFormData {
  address: string; // Street address / line 1
  city: string;
  state: string; // County / State
  pinCode: string; // Postcode
  country?: string;
}

interface AddressSelectorProps {
  value: AddressFormData;
  onChange: (val: AddressFormData) => void;
  required?: boolean;
  className?: string;
}

export function AddressSelector({
  value,
  onChange,
  required = true,
  className = "",
}: AddressSelectorProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<UKAddressEntry[]>([]);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isLoadingResults, setIsLoadingResults] = useState(false);
  const [coordinateWarning, setCoordinateWarning] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);

  const activeCountry = value.country || "United Kingdom";
  const isUk =
    activeCountry.toLowerCase() === "united kingdom" ||
    activeCountry.toLowerCase() === "gb" ||
    activeCountry.toLowerCase() === "uk";

  const countryConfig = useMemo(() => getCountryRegionConfig(activeCountry), [activeCountry]);

  // Real-time postal code validation
  const postalValidation = useMemo(() => {
    if (!value.pinCode || !value.pinCode.trim()) {
      return { isValid: false, message: "" };
    }
    return validatePostalCode(value.pinCode, activeCountry);
  }, [value.pinCode, activeCountry]);

  // Close dropdown on outside click
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleOutsideClick);
    return () => document.removeEventListener("mousedown", handleOutsideClick);
  }, []);

  // Handle Country Change
  const handleCountryChange = (newCountry: string) => {
    const newConfig = getCountryRegionConfig(newCountry);
    // If current state/county is not valid in the new country, reset it
    const isValidStateInNewCountry =
      newConfig.regions && value.state ? newConfig.regions.includes(value.state) : false;

    onChange({
      ...value,
      country: newCountry,
      state: isValidStateInNewCountry ? value.state : "",
    });
    setCoordinateWarning(null);
  };

  // Perform Address Search (Local Dictionary + Online Postcode API)
  const handleSearchChange = (query: string) => {
    setSearchQuery(query);
    setCoordinateWarning(null);

    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    const trimmed = query.trim();
    if (!trimmed || trimmed.length < 2) {
      setSearchResults([]);
      setIsDropdownOpen(false);
      return;
    }

    // Check if raw GPS coordinates were entered (e.g. "33.539793712557476, 73.054397")
    const coords = parseCoordinates(trimmed);
    if (coords) {
      if (!isWithinUkBounds(coords.lat, coords.lon)) {
        setCoordinateWarning(
          `GPS coordinates (${coords.lat.toFixed(3)}, ${coords.lon.toFixed(3)}) are outside the UK. For UK delivery, please enter a UK postcode or address. To ship internationally, select your country below.`,
        );
        setSearchResults([]);
        setIsDropdownOpen(false);
        return;
      }
    }

    // Instant local matches from dictionary
    const localMatches = searchAddressDictionary(trimmed);
    setSearchResults(localMatches);
    if (localMatches.length > 0) {
      setIsDropdownOpen(true);
    }

    // Debounced query to server-side postcode lookup endpoint
    setIsLoadingResults(true);
    debounceTimerRef.current = setTimeout(async () => {
      try {
        const res = await fetch(`/api/address/postcode-lookup?q=${encodeURIComponent(trimmed)}`);
        if (res.ok) {
          const data = await res.json();
          if (data.isOutsideUk) {
            setCoordinateWarning(data.message || "Coordinates detected outside the UK.");
            setSearchResults([]);
            setIsDropdownOpen(false);
          } else if (Array.isArray(data.suggestions) && data.suggestions.length > 0) {
            setSearchResults(data.suggestions);
            setIsDropdownOpen(true);
          }
        }
      } catch {
        // Keep local matches on error
      } finally {
        setIsLoadingResults(false);
      }
    }, 280);
  };

  const handleSelectAddress = (item: UKAddressEntry) => {
    onChange({
      ...value,
      address: item.line2 ? `${item.line1}, ${item.line2}` : item.line1,
      city: item.city,
      state: item.county,
      pinCode: item.postcode,
      country: item.country || "United Kingdom",
    });
    setSearchQuery(item.formatted);
    setIsDropdownOpen(false);
    setCoordinateWarning(null);
  };

  // City suggestions based on selected county or all major cities (UK only)
  const citySuggestions = useMemo(() => {
    if (!isUk) return [];
    if (value.state) {
      const filtered = UK_MAJOR_CITIES.filter(
        (c) => c.county.toLowerCase() === value.state.toLowerCase(),
      );
      if (filtered.length > 0) return filtered.map((c) => c.city);
    }
    return UK_MAJOR_CITIES.map((c) => c.city);
  }, [isUk, value.state]);

  // Auto-fill City & County when a valid UK Postcode is typed
  const handlePostcodeBlur = async () => {
    if (isUk && postalValidation.isValid && value.pinCode) {
      const normalized = formatUkPostcode(value.pinCode);
      if (normalized !== value.pinCode) {
        onChange({ ...value, pinCode: normalized });
      }

      // If city or county is missing, auto-populate from UK postcode lookup
      if (!value.city || !value.state) {
        try {
          const res = await fetch(
            `/api/address/postcode-lookup?postcode=${encodeURIComponent(normalized)}`,
          );
          if (res.ok) {
            const data = await res.json();
            if (data.data) {
              onChange({
                ...value,
                pinCode: normalized,
                city: value.city || data.data.city,
                state: value.state || data.data.county,
              });
            }
          }
        } catch {
          // silently continue
        }
      }
    }
  };

  return (
    <div className={`space-y-3.5 ${className}`} ref={containerRef}>
      {/* 1. Fast Address & Postcode Lookup Dictionary Search */}
      <div className="relative">
        <label className="block text-[11px] font-semibold uppercase tracking-wider text-muted-foreground mb-1">
          Quick Address & Postcode Lookup
        </label>
        <div className="relative">
          <input
            type="text"
            placeholder={
              isUk
                ? "Type UK postcode or street (e.g. W1K, SW1A 1AA, Deansgate...)"
                : `Search address in ${activeCountry}...`
            }
            value={searchQuery}
            onChange={(e) => handleSearchChange(e.target.value)}
            onFocus={() => {
              if (searchQuery.trim().length >= 2 && searchResults.length > 0) {
                setIsDropdownOpen(true);
              }
            }}
            className="h-11 w-full border border-border/80 bg-white/70 pl-9 pr-9 text-xs font-normal outline-none focus:border-rosewood focus:ring-1 focus:ring-rosewood/40 transition-all rounded-none placeholder:text-muted-foreground/60 shadow-xs"
          />
          <Search
            size={14}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none"
          />
          {isLoadingResults && (
            <Loader2
              size={13}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-rosewood animate-spin pointer-events-none"
            />
          )}
        </div>

        {/* Coordinate / Location Notice */}
        {coordinateWarning && (
          <div className="mt-1.5 p-2.5 bg-amber-500/10 border border-amber-500/30 text-amber-800 text-[11px] leading-relaxed flex items-start gap-2">
            <AlertCircle size={14} className="shrink-0 mt-0.5 text-amber-600" />
            <span>{coordinateWarning}</span>
          </div>
        )}

        {/* Dropdown Suggestions */}
        {isDropdownOpen && searchResults.length > 0 && (
          <div className="absolute left-0 right-0 top-full z-40 mt-1 max-h-64 overflow-y-auto border border-border bg-white shadow-xl">
            <div className="px-3 py-1.5 bg-sand/30 border-b border-border/60 text-[10px] font-bold uppercase tracking-wider text-rosewood flex items-center justify-between">
              <span>Matching UK Addresses</span>
              <span>{searchResults.length} found</span>
            </div>
            <ul className="divide-y divide-border/40">
              {searchResults.map((entry, idx) => (
                <li
                  key={idx}
                  onClick={() => handleSelectAddress(entry)}
                  className="flex items-start gap-2.5 px-3.5 py-2.5 hover:bg-sand/30 cursor-pointer text-left transition-colors group"
                >
                  <MapPin
                    size={13}
                    className="text-rosewood/70 shrink-0 mt-0.5 group-hover:text-rosewood"
                  />
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-medium text-foreground group-hover:text-rosewood transition-colors">
                      {entry.line1} {entry.line2 ? `• ${entry.line2}` : ""}
                    </p>
                    <p className="text-[11px] text-muted-foreground">
                      {entry.city}, {entry.county} •{" "}
                      <span className="font-semibold text-foreground/80">{entry.postcode}</span>
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      {/* 2. Country Dropdown */}
      <div>
        <label className="block text-[11px] font-semibold uppercase tracking-wider text-muted-foreground mb-1">
          Country {required && <span className="text-rosewood">*</span>}
        </label>
        <div className="relative">
          <select
            value={activeCountry}
            onChange={(e) => handleCountryChange(e.target.value)}
            className="h-11 w-full appearance-none border border-border/80 bg-white/70 px-3 pr-8 text-xs font-normal outline-none focus:border-rosewood focus:ring-1 focus:ring-rosewood/40 transition-all rounded-none cursor-pointer"
          >
            {COUNTRIES.map((c) => (
              <option key={c.code} value={c.name}>
                {c.name}
              </option>
            ))}
          </select>
          <ChevronDown
            size={14}
            className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground"
          />
        </div>
      </div>

      {/* 3. Street Address / Line 1 */}
      <div>
        <label className="block text-[11px] font-semibold uppercase tracking-wider text-muted-foreground mb-1">
          Street Address {required && <span className="text-rosewood">*</span>}
        </label>
        <input
          required={required}
          type="text"
          placeholder="Building name, street number, apartment"
          value={value.address}
          onChange={(e) => onChange({ ...value, address: e.target.value })}
          className="h-11 w-full border border-border/80 bg-white/70 px-3 text-xs font-normal outline-none focus:border-rosewood focus:ring-1 focus:ring-rosewood/40 transition-all rounded-none"
        />
      </div>

      {/* 4. City, County & Postcode Grid */}
      <div className="grid gap-3 sm:grid-cols-3">
        {/* City / Town with Smart Autocomplete */}
        <div>
          <label className="block text-[11px] font-semibold uppercase tracking-wider text-muted-foreground mb-1">
            City / Town {required && <span className="text-rosewood">*</span>}
          </label>
          <input
            required={required}
            type="text"
            list={isUk ? "uk-cities-list" : undefined}
            placeholder={isUk ? "e.g. London, Manchester" : "City / Town"}
            value={value.city}
            onChange={(e) => {
              const newCity = e.target.value;
              if (isUk) {
                const matchedCity = UK_MAJOR_CITIES.find(
                  (c) => c.city.toLowerCase() === newCity.trim().toLowerCase(),
                );
                onChange({
                  ...value,
                  city: newCity,
                  state: matchedCity && !value.state ? matchedCity.county : value.state,
                });
              } else {
                onChange({ ...value, city: newCity });
              }
            }}
            className="h-11 w-full border border-border/80 bg-white/70 px-3 text-xs font-normal outline-none focus:border-rosewood focus:ring-1 focus:ring-rosewood/40 transition-all rounded-none"
          />
          {isUk && (
            <datalist id="uk-cities-list">
              {citySuggestions.map((cityName) => (
                <option key={cityName} value={cityName} />
              ))}
            </datalist>
          )}
        </div>

        {/* Dynamic County / State / Region */}
        <div>
          <label className="block text-[11px] font-semibold uppercase tracking-wider text-muted-foreground mb-1">
            {countryConfig.label}{" "}
            {required && countryConfig.regions ? <span className="text-rosewood">*</span> : null}
          </label>
          {countryConfig.regions ? (
            <div className="relative">
              <select
                value={value.state}
                onChange={(e) => onChange({ ...value, state: e.target.value })}
                className="h-11 w-full appearance-none border border-border/80 bg-white/70 px-3 pr-8 text-xs font-normal outline-none focus:border-rosewood focus:ring-1 focus:ring-rosewood/40 transition-all rounded-none cursor-pointer"
              >
                <option value="">Select {countryConfig.label}...</option>
                {countryConfig.regions.map((regionName) => (
                  <option key={regionName} value={regionName}>
                    {regionName}
                  </option>
                ))}
              </select>
              <ChevronDown
                size={14}
                className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground"
              />
            </div>
          ) : (
            <input
              type="text"
              placeholder={`e.g. ${countryConfig.label}`}
              value={value.state}
              onChange={(e) => onChange({ ...value, state: e.target.value })}
              className="h-11 w-full border border-border/80 bg-white/70 px-3 text-xs font-normal outline-none focus:border-rosewood focus:ring-1 focus:ring-rosewood/40 transition-all rounded-none"
            />
          )}
        </div>

        {/* Postcode / ZIP with Real-time Validation */}
        <div>
          <label className="block text-[11px] font-semibold uppercase tracking-wider text-muted-foreground mb-1 flex items-center justify-between">
            <span>
              {countryConfig.postalLabel} {required && <span className="text-rosewood">*</span>}
            </span>
            {value.pinCode.trim().length > 0 && postalValidation.isValid && (
              <span className="text-[10px] text-emerald-600 font-semibold flex items-center gap-0.5 lowercase tracking-normal">
                <Check size={11} className="stroke-[3]" /> valid
              </span>
            )}
          </label>
          <div className="relative">
            <input
              required={required}
              type="text"
              placeholder={countryConfig.postalPlaceholder}
              value={value.pinCode}
              onBlur={handlePostcodeBlur}
              onChange={(e) => {
                const val = e.target.value.toUpperCase();
                onChange({ ...value, pinCode: val });
              }}
              className={`h-11 w-full border bg-white/70 px-3 pr-8 text-xs font-mono font-medium uppercase outline-none transition-all rounded-none ${
                value.pinCode.trim().length > 0 && !postalValidation.isValid
                  ? "border-amber-500 focus:border-rosewood focus:ring-1 focus:ring-rosewood/40"
                  : value.pinCode.trim().length > 0 && postalValidation.isValid
                    ? "border-emerald-500/80 focus:border-rosewood focus:ring-1 focus:ring-rosewood/40"
                    : "border-border/80 focus:border-rosewood focus:ring-1 focus:ring-rosewood/40"
              }`}
            />
            {value.pinCode.trim().length > 0 && (
              <div className="absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none">
                {postalValidation.isValid ? (
                  <Check size={14} className="text-emerald-600" />
                ) : (
                  <AlertCircle size={14} className="text-amber-600" />
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Real-time Inline Helper / Error below Grid */}
      {value.pinCode.trim().length > 0 && !postalValidation.isValid && postalValidation.message && (
        <p className="text-[11px] text-amber-700 flex items-center gap-1.5 font-medium -mt-1">
          <AlertCircle size={12} className="shrink-0 text-amber-600" />
          <span>{postalValidation.message}</span>
        </p>
      )}
    </div>
  );
}
