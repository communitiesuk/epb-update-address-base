import { Readable } from 'node:stream';
import { Parse as ZipParse } from 'unzipper';
import { parse as csvParse } from 'csv-parse';
import createDebug from 'debug';

const debug = createDebug('address-base:os');

async function* packages() {
  const response = await fetch(
    `https://api.os.uk/downloads/v1/dataPackages?key=${encodeURI(process.env.OS_DATA_HUB_API_KEY)}`,
  );
  if (!response.ok) {
    throw new Error(
      `status: ${response.status}: ${await response.json().message}`,
    );
  }
  for (const pack of await response.json()) {
    if (pack.name.startsWith('EPBR - ')) {
      yield pack;
    }
  }
}

/**
 * Get the version descriptors for the latest full versions
 */
export async function* getFullVersions() {
  const packs = await Array.fromAsync(packages());
  yield* packs
    .filter((pack) => pack.name.includes('(FULL)'))
    .flatMap((pack) =>
      pack.versions.map((p) => Object.assign(p, { productName: pack.name })),
    )
    .toSorted(sortVersions);
}

/**
 * Get the versions for the latest incremental updates
 */
export async function* getUpdateVersions() {
  const packs = await Array.fromAsync(packages());
  yield* packs
    .filter((pack) => pack.name.includes('(COU)'))
    .flatMap((pack) =>
      pack.versions.map((p) => Object.assign(p, { productName: pack.name })),
    )
    .toSorted(sortVersions);
}

/**
 * Get the download url for a version
 * @param {Object} version The version data
 */
async function downloadFileUrlForVersionUrl(version) {
  const response = await fetch(version.url);
  if (response.ok) {
    // There might be more than one download. The txt file is metadata. We want the zip
    return (await response.json()).downloads.find((d) =>
      d.fileName.endsWith('.zip'),
    ).url;
  }
  const text = await response.text();
  throw new Error(`${response.status}: ${text}`);
}

/**
 * Return our internal version number
 * @param {string} versionString The productVersion string
 */
export function parseVersionNumber(versionString) {
  // This is our internal version number, which should match across the islands and gb data
  // It was the based on the epoch number in the package version name,
  // however since OS has changed the name format it is now based on the epoch number or the update date

  // Previously the version number was in the form "E128 June 2026 Update"
  // We will extract the epoch number
  const matches = /^E(\d+)/.exec(versionString);
  if (matches) {
    return parseInt(matches[1], 10);
  }
  // Now the version number is in the form "AddressBase Plus 03.07.2026"
  // We will extract the date, convert it to the Unix epoch and, as it is the start of the day, divide by 86,400,000 to get it in days
  const dateMatch = /(\d{2})\.(\d{2})\.(\d{4})/.exec(versionString);
  if (dateMatch) {
    return (
      Date.UTC(
        parseInt(dateMatch[3], 10),
        parseInt(dateMatch[2], 10) - 1,
        parseInt(dateMatch[1], 10),
      ).valueOf() / 86_400_000
    );
  }
  throw new Error(
    `Unexpected version string format encountered: ${versionString}`,
  );
}

/**
 * Generates streams of csv files from the zip download urls
 */
async function* generateZipStreams(zipUrl) {
  debug(`processing zip ${zipUrl}`);
  const response = await fetch(zipUrl);
  const zipStream = Readable.fromWeb(response.body).pipe(
    ZipParse({ forceStream: true }),
  );
  for await (const entry of zipStream) {
    if (entry.path.match(/data\/.+\.csv$/)) {
      debug(`processing csv ${entry.path}`);
      yield entry;
    } else {
      entry.autodrain();
    }
  }
}

/**
 * Generate the address lines from a version descriptor
 */
export async function* generateAddresses(version) {
  const zipUrl = await downloadFileUrlForVersionUrl(version);

  for await (const stream of generateZipStreams(zipUrl)) {
    for await (const data of stream.pipe(csvParse({ columns }))) {
      yield data;
    }
  }
}

function sortVersions(first, second) {
  return (
    Date.parse(second.createdOn).valueOf() -
    Date.parse(first.createdOn).valueOf()
  );
}

const columns = [
  'UPRN',
  'UDPRN',
  'CHANGE_TYPE',
  'STATE',
  'STATE_DATE',
  'CLASS',
  'PARENT_UPRN',
  'X_COORDINATE',
  'Y_COORDINATE',
  'LATITUDE',
  'LONGITUDE',
  'RPC',
  'LOCAL_CUSTODIAN_CODE',
  'COUNTRY',
  'LA_START_DATE',
  'LAST_UPDATE_DATE',
  'ENTRY_DATE',
  'RM_ORGANISATION_NAME',
  'LA_ORGANISATION',
  'DEPARTMENT_NAME',
  'LEGAL_NAME',
  'SUB_BUILDING_NAME',
  'BUILDING_NAME',
  'BUILDING_NUMBER',
  'SAO_START_NUMBER',
  'SAO_START_SUFFIX',
  'SAO_END_NUMBER',
  'SAO_END_SUFFIX',
  'SAO_TEXT',
  'ALT_LANGUAGE_SAO_TEXT',
  'PAO_START_NUMBER',
  'PAO_START_SUFFIX',
  'PAO_END_NUMBER',
  'PAO_END_SUFFIX',
  'PAO_TEXT',
  'ALT_LANGUAGE_PAO_TEXT',
  'USRN',
  'USRN_MATCH_INDICATOR',
  'AREA_NAME',
  'LEVEL',
  'OFFICIAL_FLAG',
  'OS_ADDRESS_TOID',
  'OS_ADDRESS_TOID_VERSION',
  'OS_ROADLINK_TOID',
  'OS_ROADLINK_TOID_VERSION',
  'OS_TOPO_TOID',
  'OS_TOPO_TOID_VERSION',
  'VOA_CT_RECORD',
  'VOA_NDR_RECORD',
  'STREET_DESCRIPTION',
  'ALT_LANGUAGE_STREET_DESCRIPTION',
  'DEPENDENT_THOROUGHFARE',
  'THOROUGHFARE',
  'WELSH_DEPENDENT_THOROUGHFARE',
  'WELSH_THOROUGHFARE',
  'DOUBLE_DEPENDENT_LOCALITY',
  'DEPENDENT_LOCALITY',
  'LOCALITY',
  'WELSH_DEPENDENT_LOCALITY',
  'WELSH_DOUBLE_DEPENDENT_LOCALITY',
  'TOWN_NAME',
  'ADMINISTRATIVE_AREA',
  'POST_TOWN',
  'WELSH_POST_TOWN',
  'POSTCODE',
  'POSTCODE_LOCATOR',
  'POSTCODE_TYPE',
  'DELIVERY_POINT_SUFFIX',
  'ADDRESSBASE_POSTAL',
  'PO_BOX_NUMBER',
  'WARD_CODE',
  'PARISH_CODE',
  'RM_START_DATE',
  'MULTI_OCC_COUNT',
  'VOA_NDR_P_DESC_CODE',
  'VOA_NDR_SCAT_CODE',
  'ALT_LANGUAGE',
];
