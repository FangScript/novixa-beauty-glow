import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  validatePostalCode,
  formatUkPostcode,
  parseCoordinates,
  isWithinUkBounds,
  getCountryRegionConfig,
  UK_COUNTIES,
  US_STATES,
  CA_PROVINCES,
  AU_STATES,
  PK_PROVINCES,
} from "../lib/address/dictionary";

describe("Address & Postcode Real-time Validation Suite", () => {
  describe("UK Postcode Validation & Formatting", () => {
    it("should accept and normalize valid UK postcodes", () => {
      const cases = [
        { raw: "SW1A 1AA", expected: "SW1A 1AA" },
        { raw: "sw1a1aa", expected: "SW1A 1AA" },
        { raw: "W1K 5DH", expected: "W1K 5DH" },
        { raw: "m11pw", expected: "M1 1PW" },
        { raw: "EC1A 1BB", expected: "EC1A 1BB" },
        { raw: "b32bj", expected: "B3 2BJ" },
        { raw: "BT1 5GB", expected: "BT1 5GB" },
      ];

      for (const { raw, expected } of cases) {
        const res = validatePostalCode(raw, "United Kingdom");
        assert.equal(res.isValid, true, `Expected ${raw} to be valid`);
        assert.equal(res.normalized, expected);
      }
    });

    it("should reject non-UK postcodes when United Kingdom is selected", () => {
      const invalidCases = [
        "43600", // Pakistan / Rawalpindi
        "90210", // US Zip
        "Sana valley",
        "london",
        "12345",
        "ABC 123",
      ];

      for (const raw of invalidCases) {
        const res = validatePostalCode(raw, "United Kingdom");
        assert.equal(res.isValid, false, `Expected ${raw} to be invalid for UK`);
        assert.match(res.message || "", /Invalid UK postcode format/i);
      }
    });

    it("should format UK postcode with space before the last 3 characters", () => {
      assert.equal(formatUkPostcode("sw1a1aa"), "SW1A 1AA");
      assert.equal(formatUkPostcode("w1k5dh"), "W1K 5DH");
      assert.equal(formatUkPostcode("m11pw"), "M1 1PW");
    });
  });

  describe("GPS Coordinates Interception", () => {
    it("should accurately parse coordinate strings", () => {
      const coords = parseCoordinates("33.539793712557476, 73.054397");
      assert.ok(coords !== null);
      assert.ok(Math.abs(coords.lat - 33.53979) < 0.001);
      assert.ok(Math.abs(coords.lon - 73.05439) < 0.001);
    });

    it("should identify coordinates outside UK bounds", () => {
      // Islamabad / Rawalpindi coords
      assert.equal(isWithinUkBounds(33.53979, 73.05439), false);
      // New York coords
      assert.equal(isWithinUkBounds(40.7128, -74.006), false);
    });

    it("should identify coordinates inside UK bounds", () => {
      // London coords
      assert.equal(isWithinUkBounds(51.5074, -0.1278), true);
      // Edinburgh coords
      assert.equal(isWithinUkBounds(55.9533, -3.1883), true);
      // Manchester coords
      assert.equal(isWithinUkBounds(53.4808, -2.2426), true);
    });

    it("should reject raw coordinates pasted into postcode field", () => {
      const res = validatePostalCode("33.539793712557476, 73.054397", "United Kingdom");
      assert.equal(res.isValid, false);
      assert.match(res.message || "", /Coordinates detected/i);
    });
  });

  describe("Multi-Country Dynamic Region & Postal Routing", () => {
    it("should provide UK Counties for United Kingdom", () => {
      const config = getCountryRegionConfig("United Kingdom");
      assert.equal(config.label, "County / Region");
      assert.equal(config.postalLabel, "Postcode");
      assert.deepEqual(config.regions, UK_COUNTIES);
    });

    it("should provide US States for United States and validate ZIP", () => {
      const config = getCountryRegionConfig("United States");
      assert.equal(config.label, "State");
      assert.equal(config.postalLabel, "ZIP Code");
      assert.deepEqual(config.regions, US_STATES);

      const validZip = validatePostalCode("90210", "United States");
      assert.equal(validZip.isValid, true);

      const invalidZip = validatePostalCode("SW1A 1AA", "United States");
      assert.equal(invalidZip.isValid, false);
    });

    it("should provide Canadian Provinces for Canada and validate postal code", () => {
      const config = getCountryRegionConfig("Canada");
      assert.equal(config.label, "Province / Territory");
      assert.deepEqual(config.regions, CA_PROVINCES);

      const validPostal = validatePostalCode("M5V 2T6", "Canada");
      assert.equal(validPostal.isValid, true);
    });

    it("should provide Australian States for Australia", () => {
      const config = getCountryRegionConfig("Australia");
      assert.equal(config.label, "State / Territory");
      assert.deepEqual(config.regions, AU_STATES);

      const validPostcode = validatePostalCode("2000", "Australia");
      assert.equal(validPostcode.isValid, true);
    });

    it("should provide Pakistani Provinces for Pakistan and validate 5-digit code", () => {
      const config = getCountryRegionConfig("Pakistan");
      assert.equal(config.label, "Province / Region");
      assert.deepEqual(config.regions, PK_PROVINCES);

      const validCode = validatePostalCode("43600", "Pakistan");
      assert.equal(validCode.isValid, true);
    });

    it("should return null regions for countries without preset lists (text input)", () => {
      const config = getCountryRegionConfig("Switzerland");
      assert.equal(config.regions, null);
    });
  });
});
