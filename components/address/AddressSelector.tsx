"use client";

import { useState, useEffect, useRef } from "react";
import { Search, MapPin, Check, ChevronDown } from "lucide-react";
import {
  COUNTRIES,
  UK_COUNTIES,
  UK_MAJOR_CITIES,
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

export function AddressSelector({ value, onChange, required = true, className = "" }: AddressSelectorProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<UKAddressEntry[]>([]);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

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

  const handleSearchChange = (query: string) => {
    setSearchQuery(query);
    if (query.trim().length >= 2) {
      const results = searchAddressDictionary(query);
      setSearchResults(results);
      setIsDropdownOpen(true);
    } else {
      setSearchResults([]);
      setIsDropdownOpen(false);
    }
  };

  const handleSelectAddress = (item: UKAddressEntry) => {
    onChange({
      ...value,
      address: item.line2 ? `${item.line1}, ${item.line2}` : item.line1,
      city: item.city,
      state: item.county,
      pinCode: item.postcode,
      country: item.country,
    });
    setSearchQuery(item.formatted);
    setIsDropdownOpen(false);
  };

  // City suggestions based on selected county or all major cities
  const citySuggestions = value.state
    ? UK_MAJOR_CITIES.filter((c) => c.county.toLowerCase() === value.state.toLowerCase()).map(
        (c) => c.city,
      )
    : UK_MAJOR_CITIES.map((c) => c.city);

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
            placeholder="Type postcode or street (e.g. W1K, Deansgate, George St...)"
            value={searchQuery}
            onChange={(e) => handleSearchChange(e.target.value)}
            onFocus={() => {
              if (searchQuery.trim().length >= 2) setIsDropdownOpen(true);
            }}
            className="h-11 w-full border border-border/80 bg-white/70 pl-9 pr-4 text-xs font-normal outline-none focus:border-rosewood focus:ring-1 focus:ring-rosewood/40 transition-all rounded-none placeholder:text-muted-foreground/60 shadow-xs"
          />
          <Search
            size={14}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none"
          />
        </div>

        {/* Dropdown Suggestions */}
        {isDropdownOpen && searchResults.length > 0 && (
          <div className="absolute left-0 right-0 top-full z-40 mt-1 max-h-60 overflow-y-auto border border-border bg-white shadow-xl">
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
                  <MapPin size={13} className="text-rosewood/70 shrink-0 mt-0.5 group-hover:text-rosewood" />
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-medium text-foreground group-hover:text-rosewood transition-colors">
                      {entry.line1} {entry.line2 ? `• ${entry.line2}` : ""}
                    </p>
                    <p className="text-[11px] text-muted-foreground">
                      {entry.city}, {entry.county} • <span className="font-semibold text-foreground/80">{entry.postcode}</span>
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
            value={value.country || "United Kingdom"}
            onChange={(e) => onChange({ ...value, country: e.target.value })}
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
        {/* City with Datalist Suggestions */}
        <div>
          <label className="block text-[11px] font-semibold uppercase tracking-wider text-muted-foreground mb-1">
            City / Town {required && <span className="text-rosewood">*</span>}
          </label>
          <input
            required={required}
            type="text"
            list="uk-cities-list"
            placeholder="e.g. London, Manchester"
            value={value.city}
            onChange={(e) => {
              const newCity = e.target.value;
              const matchedCity = UK_MAJOR_CITIES.find(
                (c) => c.city.toLowerCase() === newCity.trim().toLowerCase(),
              );
              onChange({
                ...value,
                city: newCity,
                state: matchedCity && !value.state ? matchedCity.county : value.state,
              });
            }}
            className="h-11 w-full border border-border/80 bg-white/70 px-3 text-xs font-normal outline-none focus:border-rosewood focus:ring-1 focus:ring-rosewood/40 transition-all rounded-none"
          />
          <datalist id="uk-cities-list">
            {citySuggestions.map((cityName) => (
              <option key={cityName} value={cityName} />
            ))}
          </datalist>
        </div>

        {/* County / Region Dropdown */}
        <div>
          <label className="block text-[11px] font-semibold uppercase tracking-wider text-muted-foreground mb-1">
            County / Region
          </label>
          <div className="relative">
            <select
              value={value.state}
              onChange={(e) => onChange({ ...value, state: e.target.value })}
              className="h-11 w-full appearance-none border border-border/80 bg-white/70 px-3 pr-8 text-xs font-normal outline-none focus:border-rosewood focus:ring-1 focus:ring-rosewood/40 transition-all rounded-none cursor-pointer"
            >
              <option value="">Select County...</option>
              {UK_COUNTIES.map((county) => (
                <option key={county} value={county}>
                  {county}
                </option>
              ))}
            </select>
            <ChevronDown
              size={14}
              className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground"
            />
          </div>
        </div>

        {/* Postcode */}
        <div>
          <label className="block text-[11px] font-semibold uppercase tracking-wider text-muted-foreground mb-1">
            Postcode {required && <span className="text-rosewood">*</span>}
          </label>
          <input
            required={required}
            type="text"
            placeholder="e.g. W1K 5DH"
            value={value.pinCode}
            onChange={(e) => onChange({ ...value, pinCode: e.target.value.toUpperCase() })}
            className="h-11 w-full border border-border/80 bg-white/70 px-3 text-xs font-mono font-medium uppercase outline-none focus:border-rosewood focus:ring-1 focus:ring-rosewood/40 transition-all rounded-none"
          />
        </div>
      </div>
    </div>
  );
}
