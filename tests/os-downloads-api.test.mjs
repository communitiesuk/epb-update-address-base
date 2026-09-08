import { describe, test, expect } from '@jest/globals';
import {
  getFullVersions,
  getUpdateVersions,
  parseVersionNumber,
  generateAddresses,
} from '../lib/os-downloads-api.mjs';

describe('getFullVersions', () => {
  test('returns all full versions', async () => {
    expect(await Array.fromAsync(getFullVersions())).toMatchSnapshot();
  });
});

describe('getUpdateVersions', () => {
  test('returns all update versions', async () => {
    expect(await Array.fromAsync(getUpdateVersions(127))).toMatchSnapshot();
  });
});

describe('parseVersionNumber', () => {
  test('parses correctly from a two digit epoch number', () => {
    expect(parseVersionNumber('E89 December 2021 Update')).toBe(89);
  });

  test('parses correctly from a three digit epoch number', () => {
    expect(parseVersionNumber('E101 February 2023')).toBe(101);
  });

  test('parses correctly from a date based version', () => {
    expect(parseVersionNumber('AddressBase Plus 03.07.2026')).toBe(20637);
  });

  test('throws when a version string is in an unexpected format', () => {
    expect(() => parseVersionNumber('New Unexpected Format June 2525')).toThrow(
      'Unexpected version string format encountered: New Unexpected Format June 2525',
    );
  });
});

describe('generateAddresses', () => {
  test('iterates addresses in a version', async () => {
    const version = {
      url: 'https://api.os.uk/downloads/v1/dataPackages/0040160114/versions/6870823?key=apikey1234',
    };
    expect(await Array.fromAsync(generateAddresses(version))).toHaveLength(5);
  });
});
