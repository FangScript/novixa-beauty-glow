"use client";

import React from "react";

/**
 * 1. Visa Logo Badge
 */
export function VisaLogo({ className = "h-5 w-8" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 38 24"
      className={`${className} shrink-0 select-none shadow-xs`}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-label="Visa"
    >
      <rect width="38" height="24" rx="3.5" fill="#00579F" />
      <text
        x="19"
        y="16.5"
        textAnchor="middle"
        fill="#FFFFFF"
        fontSize="12.5"
        fontWeight="900"
        fontStyle="italic"
        fontFamily="Arial, Helvetica, sans-serif"
        letterSpacing="0.8"
      >
        VISA
      </text>
    </svg>
  );
}

/**
 * 2. Mastercard Light Badge (White background with Red/Orange overlapping circles)
 */
export function MastercardLightLogo({ className = "h-5 w-8" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 38 24"
      className={`${className} shrink-0 select-none shadow-xs`}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-label="Mastercard"
    >
      <rect width="38" height="24" rx="3.5" fill="#FFFFFF" stroke="#E5E7EB" strokeWidth="1" />
      <circle cx="14.5" cy="12" r="6.2" fill="#EB001B" />
      <circle cx="23.5" cy="12" r="6.2" fill="#F79E1B" />
      <path
        d="M 19 7.4 A 6.2 6.2 0 0 0 19 16.6 A 6.2 6.2 0 0 0 19 7.4"
        fill="#FF5F00"
      />
    </svg>
  );
}

/**
 * 3. Mastercard Dark Badge (Dark background with Red/Orange overlapping circles)
 */
export function MastercardDarkLogo({ className = "h-5 w-8" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 38 24"
      className={`${className} shrink-0 select-none shadow-xs`}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-label="Mastercard Dark"
    >
      <rect width="38" height="24" rx="3.5" fill="#222222" />
      <circle cx="14.5" cy="12" r="6.2" fill="#EB001B" />
      <circle cx="23.5" cy="12" r="6.2" fill="#F79E1B" />
      <path
        d="M 19 7.4 A 6.2 6.2 0 0 0 19 16.6 A 6.2 6.2 0 0 0 19 7.4"
        fill="#FF5F00"
      />
    </svg>
  );
}

/**
 * 4. American Express Badge
 */
export function AmexLogo({ className = "h-5 w-8" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 38 24"
      className={`${className} shrink-0 select-none shadow-xs`}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-label="American Express"
    >
      <rect width="38" height="24" rx="3.5" fill="#007BC1" />
      <rect x="2.5" y="2.5" width="33" height="19" rx="1.5" stroke="#FFFFFF" strokeWidth="0.8" strokeOpacity="0.4" />
      <text
        x="19"
        y="11.5"
        textAnchor="middle"
        fill="#FFFFFF"
        fontSize="7.5"
        fontWeight="900"
        fontFamily="Arial, Helvetica, sans-serif"
        letterSpacing="0.8"
      >
        AM
      </text>
      <text
        x="19"
        y="18.5"
        textAnchor="middle"
        fill="#FFFFFF"
        fontSize="7.5"
        fontWeight="900"
        fontFamily="Arial, Helvetica, sans-serif"
        letterSpacing="0.8"
      >
        EX
      </text>
    </svg>
  );
}

/**
 * 5. Discover Badge
 */
export function DiscoverLogo({ className = "h-5 w-8" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 38 24"
      className={`${className} shrink-0 select-none shadow-xs`}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-label="Discover"
    >
      <rect width="38" height="24" rx="3.5" fill="#FFFFFF" stroke="#E5E7EB" strokeWidth="1" />
      <text
        x="4"
        y="14"
        fill="#231F20"
        fontSize="5.2"
        fontWeight="900"
        fontFamily="Arial, Helvetica, sans-serif"
        letterSpacing="0.2"
      >
        DISC
      </text>
      <circle cx="19.8" cy="11.5" r="3.1" fill="#F76B1C" />
      <path d="M 19.8 8.6 A 2.9 2.9 0 0 1 22.7 11.5 L 19.8 11.5 Z" fill="#FFA500" />
      <text
        x="23.5"
        y="14"
        fill="#231F20"
        fontSize="5.2"
        fontWeight="900"
        fontFamily="Arial, Helvetica, sans-serif"
        letterSpacing="0.2"
      >
        VER
      </text>
      <path d="M 4 19 Q 19 16.5 34 19" stroke="#F76B1C" strokeWidth="1.2" fill="none" />
    </svg>
  );
}

/**
 * 6. Diners Club Badge
 */
export function DinersClubLogo({ className = "h-5 w-8" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 38 24"
      className={`${className} shrink-0 select-none shadow-xs`}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-label="Diners Club"
    >
      <rect width="38" height="24" rx="3.5" fill="#FFFFFF" stroke="#E5E7EB" strokeWidth="1" />
      <circle cx="19" cy="12" r="7.5" fill="#004A97" />
      <path d="M19 6.5v11" stroke="#FFFFFF" strokeWidth="1.6" />
      <circle cx="19" cy="12" r="4.2" fill="#FFFFFF" />
      <path d="M19 8.5v7" stroke="#004A97" strokeWidth="1.6" />
    </svg>
  );
}

/**
 * 7. UnionPay Badge
 */
export function UnionPayLogo({ className = "h-5 w-8" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 38 24"
      className={`${className} shrink-0 select-none shadow-xs`}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-label="UnionPay"
    >
      <rect width="38" height="24" rx="3.5" fill="#FFFFFF" stroke="#E5E7EB" strokeWidth="1" />
      <g transform="translate(6, 4)">
        <rect x="0" y="0" width="8" height="16" rx="1.5" fill="#E21B23" transform="skewX(-11)" />
        <rect x="8.5" y="0" width="8" height="16" rx="1.5" fill="#004D80" transform="skewX(-11)" />
        <rect x="17" y="0" width="8" height="16" rx="1.5" fill="#007B5F" transform="skewX(-11)" />
      </g>
      <text
        x="19"
        y="12.5"
        textAnchor="middle"
        fill="#FFFFFF"
        fontSize="4.8"
        fontWeight="bold"
        fontFamily="Arial, Helvetica, sans-serif"
      >
        UnionPay
      </text>
      <text
        x="19"
        y="17"
        textAnchor="middle"
        fill="#FFFFFF"
        fontSize="3.8"
        fontWeight="bold"
        fontFamily="sans-serif"
      >
        银联
      </text>
    </svg>
  );
}

/**
 * 8. JCB Logo Badge
 */
export function JcbLogo({ className = "h-5 w-8" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 38 24"
      className={`${className} shrink-0 select-none shadow-xs`}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-label="JCB"
    >
      <rect width="38" height="24" rx="3.5" fill="#FFFFFF" stroke="#E5E7EB" strokeWidth="1" />
      <g transform="translate(6.5, 4.5)">
        <rect x="0" y="0" width="7.5" height="15" rx="2" fill="#003777" />
        <rect x="8" y="0" width="7.5" height="15" rx="2" fill="#D32F2F" />
        <rect x="16" y="0" width="7.5" height="15" rx="2" fill="#007934" />
        <text
          x="3.8"
          y="10.5"
          textAnchor="middle"
          fill="#FFFFFF"
          fontSize="5"
          fontWeight="900"
          fontFamily="Arial, Helvetica, sans-serif"
        >
          J
        </text>
        <text
          x="11.8"
          y="10.5"
          textAnchor="middle"
          fill="#FFFFFF"
          fontSize="5"
          fontWeight="900"
          fontFamily="Arial, Helvetica, sans-serif"
        >
          C
        </text>
        <text
          x="19.8"
          y="10.5"
          textAnchor="middle"
          fill="#FFFFFF"
          fontSize="5"
          fontWeight="900"
          fontFamily="Arial, Helvetica, sans-serif"
        >
          B
        </text>
      </g>
    </svg>
  );
}

/**
 * 9. Elo Logo Badge
 */
export function EloLogo({ className = "h-5 w-8" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 38 24"
      className={`${className} shrink-0 select-none shadow-xs`}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-label="Elo"
    >
      <rect width="38" height="24" rx="3.5" fill="#FFFFFF" stroke="#E5E7EB" strokeWidth="1" />
      <g transform="translate(5, 5)">
        <text
          x="1"
          y="10.5"
          fill="#00A499"
          fontSize="9"
          fontWeight="900"
          fontFamily="Arial, Helvetica, sans-serif"
        >
          e
        </text>
        <text
          x="7.5"
          y="10.5"
          fill="#00A499"
          fontSize="9"
          fontWeight="900"
          fontFamily="Arial, Helvetica, sans-serif"
        >
          l
        </text>
        <circle cx="19" cy="7.5" r="5" stroke="#00A499" strokeWidth="1.6" fill="none" />
        <line x1="14" y1="7.5" x2="24" y2="7.5" stroke="#00A499" strokeWidth="1.6" />
        <circle cx="22" cy="3.5" r="1.3" fill="#FFC800" />
      </g>
    </svg>
  );
}

/**
 * 10. Maestro Logo Badge
 */
export function MaestroLogo({ className = "h-5 w-8" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 38 24"
      className={`${className} shrink-0 select-none shadow-xs`}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-label="Maestro"
    >
      <rect width="38" height="24" rx="3.5" fill="#FFFFFF" stroke="#E5E7EB" strokeWidth="1" />
      <circle cx="14.5" cy="12" r="6.2" fill="#EB001B" />
      <circle cx="23.5" cy="12" r="6.2" fill="#0099DF" />
      <path
        d="M 19 7.4 A 6.2 6.2 0 0 0 19 16.6 A 6.2 6.2 0 0 0 19 7.4"
        fill="#762B86"
      />
    </svg>
  );
}

/**
 * All Supported Card Brands
 */
export const ALL_CARD_BRANDS = [
  { id: "Visa", name: "Visa", Component: VisaLogo },
  { id: "Mastercard", name: "Mastercard", Component: MastercardLightLogo },
  { id: "American Express", name: "American Express", Component: AmexLogo },
  { id: "Discover", name: "Discover", Component: DiscoverLogo },
  { id: "Diners Club", name: "Diners Club", Component: DinersClubLogo },
  { id: "UnionPay", name: "UnionPay", Component: UnionPayLogo },
  { id: "JCB", name: "JCB", Component: JcbLogo },
  { id: "Elo", name: "Elo", Component: EloLogo },
  { id: "Maestro", name: "Maestro", Component: MaestroLogo },
];

/**
 * Primary Credit Card Badges component shown in the checkout UI header:
 * Renders all accepted card brands directly in plain view.
 * When a brand is actively detected, it highlights the matching icon
 * and subtly fades the others.
 */
export function CardBrandBadges({
  detectedBrand = null,
}: {
  detectedBrand?: string | null;
}) {
  return (
    <div
      aria-label="Accepted card payment brands"
      className="flex flex-wrap items-center justify-end gap-1 sm:gap-1.5 select-none max-w-full"
    >
      {ALL_CARD_BRANDS.map(({ id, name, Component }) => {
        const isMatched = detectedBrand ? detectedBrand === id : false;
        const isNoneDetected = !detectedBrand;

        return (
          <div
            key={id}
            title={name}
            className={`transition-all duration-200 transform ${
              isNoneDetected
                ? "opacity-100 hover:scale-105"
                : isMatched
                  ? "opacity-100 scale-110 ring-2 ring-blue-600 rounded-[4px] shadow-sm z-10"
                  : "opacity-35 grayscale-[50%]"
            }`}
          >
            <Component className="h-5 w-7.5 sm:h-5.5 sm:w-8.5 rounded-[3px]" />
          </div>
        );
      })}
    </div>
  );
}

/**
 * 11. PayPal Badge
 */
export function PayPalBadge({ className = "h-5 w-16" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 64 24"
      className={`${className} shrink-0 select-none shadow-xs`}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-label="PayPal"
    >
      <rect width="64" height="24" rx="3.5" fill="#003087" />
      <path
        d="M17.5 7.5h-4.3c-.3 0-.6.2-.6.5l-2.4 12c0 .2.1.4.3.4h2.4c.3 0 .5-.2.6-.5l.6-3.2c.1-.3.3-.5.6-.5h1.8c3.2 0 5-1.5 5.5-4.4.2-1.3-.1-2.4-.8-3.1-.7-.8-2-1.2-3.5-1.2z"
        fill="#0079C1"
      />
      <path
        d="M18.8 11.2c-.3 2.1-1.8 3.2-4.1 3.2h-1.3l.8-4.2c0-.2.2-.4.4-.4h.9c1.2 0 2.2.3 2.7.9.4.6.6 1.4.6 2.1-.4 0-.7.3-1.1 0z"
        fill="#00457C"
      />
      <text
        x="36"
        y="16"
        textAnchor="middle"
        fill="#FFFFFF"
        fontSize="10"
        fontWeight="bold"
        fontStyle="italic"
        fontFamily="Verdana, sans-serif"
      >
        PayPal
      </text>
    </svg>
  );
}

/**
 * 12. Google Pay Badge
 */
export function GooglePayBadge({ className = "h-5 w-12" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 52 24"
      className={`${className} shrink-0 select-none shadow-xs`}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-label="Google Pay"
    >
      <rect width="52" height="24" rx="3.5" fill="#FFFFFF" stroke="#E5E7EB" strokeWidth="1" />
      <g transform="translate(6, 4.5)">
        <path
          d="M7.4 7.5v-2.2H14c.1.4.1.7.1 1.2 0 1.5-.4 2.8-1.2 3.7-1 1.1-2.5 1.8-4.5 1.8-3.5 0-6.4-2.8-6.4-6.3 0-3.5 2.9-6.4 6.4-6.4 1.7 0 3.1.6 4.2 1.6l-1.6 1.6c-.7-.7-1.6-1.1-2.6-1.1-2.3 0-4.2 1.9-4.2 4.3s1.9 4.3 4.2 4.3c1.7 0 2.8-.7 3.4-1.4.5-.5.8-1.3.9-2.3H7.4z"
          fill="#4285F4"
        />
        <text
          x="26"
          y="10.5"
          fill="#5F6368"
          fontSize="9.5"
          fontWeight="600"
          fontFamily="Roboto, Arial, sans-serif"
        >
          Pay
        </text>
      </g>
    </svg>
  );
}

/**
 * 13. Apple Pay Badge
 */
export function ApplePayBadge({ className = "h-5 w-12" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 52 24"
      className={`${className} shrink-0 select-none shadow-xs`}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-label="Apple Pay"
    >
      <rect width="52" height="24" rx="3.5" fill="#000000" />
      <g transform="translate(7, 4.5)">
        <path
          d="M3.5 2.6c.4-.5.7-1.2.6-1.9-.7 0-1.4.4-1.8.9-.4.4-.7 1.1-.6 1.8.7.1 1.4-.3 1.8-.8zm.5 1c-1 0-1.8.6-2.3.6-.5 0-1.2-.5-2-.5-1 0-2 .6-2.5 1.5-1.1 1.9-.3 4.7.8 6.3.5.8 1.2 1.7 2 1.6.8 0 1.1-.5 2.1-.5 1 0 1.3.5 2.1.5.9 0 1.5-.8 2-1.6.6-.9.9-1.8.9-1.9-.1 0-1.8-.7-1.8-2.6 0-1.6 1.3-2.4 1.4-2.5-.8-1.1-2-1.2-2.4-1.2-.3-.2-.3-.2-.3-.2z"
          fill="#FFFFFF"
          transform="translate(4, 0)"
        />
        <text
          x="24"
          y="10"
          fill="#FFFFFF"
          fontSize="9.5"
          fontWeight="500"
          fontFamily="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif"
        >
          Pay
        </text>
      </g>
    </svg>
  );
}

/**
 * 14. Klarna Badge
 */
export function KlarnaBadge({ className = "h-5 w-12" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 52 24"
      className={`${className} shrink-0 select-none shadow-xs`}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-label="Klarna"
    >
      <rect width="52" height="24" rx="3.5" fill="#FFB3C7" />
      <text
        x="26"
        y="15.5"
        textAnchor="middle"
        fill="#0A0A0A"
        fontSize="9.5"
        fontWeight="bold"
        fontFamily="Arial, sans-serif"
      >
        Klarna.
      </text>
    </svg>
  );
}

/**
 * 15. Bank Badges for Bank Transfer / BACS (Barclays, HSBC, Lloyds, NatWest, Santander, Monzo, Revolut)
 */
export function BankTransferBadges({ className = "h-5" }: { className?: string }) {
  return (
    <div className={`flex flex-wrap items-center justify-end gap-1 select-none ${className}`}>
      {/* Barclays Bank UK */}
      <span
        title="Barclays Bank UK"
        className="flex h-5 items-center justify-center rounded-[3px] bg-[#00AEEF] px-1.5 text-[9px] font-bold text-white shadow-xs"
      >
        BARCLAYS
      </span>
      {/* HSBC */}
      <span
        title="HSBC"
        className="flex h-5 items-center justify-center rounded-[3px] bg-[#DB0011] px-1.5 text-[9px] font-bold text-white shadow-xs"
      >
        HSBC
      </span>
      {/* Lloyds */}
      <span
        title="Lloyds Bank"
        className="flex h-5 items-center justify-center rounded-[3px] bg-[#006A4E] px-1.5 text-[9px] font-bold text-white shadow-xs"
      >
        LLOYDS
      </span>
      {/* NatWest */}
      <span
        title="NatWest"
        className="flex h-5 items-center justify-center rounded-[3px] bg-[#5A2582] px-1.5 text-[9px] font-bold text-white shadow-xs"
      >
        NatWest
      </span>
      {/* Santander */}
      <span
        title="Santander"
        className="flex h-5 items-center justify-center rounded-[3px] bg-[#EC0000] px-1.5 text-[9px] font-bold text-white shadow-xs"
      >
        Santander
      </span>
      {/* Monzo */}
      <span
        title="Monzo Bank"
        className="flex h-5 items-center justify-center rounded-[3px] bg-[#14233C] px-1.5 text-[9px] font-bold text-[#FF3366] shadow-xs"
      >
        monzo
      </span>
      {/* Revolut */}
      <span
        title="Revolut"
        className="flex h-5 items-center justify-center rounded-[3px] bg-[#000000] px-1.5 text-[9px] font-bold text-white shadow-xs"
      >
        Revolut
      </span>
    </div>
  );
}
