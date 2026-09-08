import { Command } from 'commander';
import createDebug from 'debug';

const debug = createDebug('address-base:program');

import {
  getFullVersions,
  getUpdateVersions,
  generateAddresses,
} from './os-downloads-api.mjs';
import {
  updateAddresses,
  storedVersions,
  swapInNewVersion,
  writeVersion,
  setupTempAddressTable,
  truncateVersions,
} from './database.mjs';
import { notifySlack } from './notify-slack.mjs';

export function createProgram() {
  const program = new Command();

  program
    .command('install')
    .description('Perform a full install of an address base version')
    .argument(
      '[version]',
      'version to install, if not supplied it will use the latest',
    )
    .action(installAction);

  program
    .command('update')
    .description(
      'updates AddressBase addressing data if any new versions are available',
    )
    .argument(
      '[version]',
      'version to update to, if not supplied it will update to the latest version',
    )
    .action(updateAction);

  program
    .command('versions')
    .description('list installed and available versions')
    .action(versionsAction);

  return program;
}

async function installAction(version) {
  const availableVersions = await Array.fromAsync(getFullVersions());
  version ||= availableVersions[0].productVersion;
  const applyVersions = availableVersions.filter(
    (v) => v.productVersion === version,
  );

  if (applyVersions.length === 0) {
    console.error(`Cannot find version ${version}`);
    return process.exit(1);
  }

  debug('installing versions', applyVersions);

  console.time('update');
  await setupTempAddressTable({ copyData: false });
  const counts = await processVersions(applyVersions);
  await swapInNewVersion();

  await truncateVersions();
  await writeVersion(applyVersions[0].productVersion);

  console.timeEnd('update');
  console.log(`Installed version ${version}`);
  console.log(counts);
}

async function updateAction(version) {
  try {
    const availableVersions = await Array.fromAsync(getUpdateVersions());
    const installedVersions = await storedVersions();

    if (installedVersions.length === 0) {
      console.error('No versions are installed to update');
      return process.exit(1);
    }

    version ||= availableVersions[0].productVersion;

    if (!getUniqueVersions(availableVersions).includes(version)) {
      console.error(`Cannot find version ${version}`);
      return process.exit(1);
    }

    // Find the versions up to the requested version, and after the last currently installed version
    const applyVersions = availableVersions
      .slice(
        availableVersions.findIndex((v) => v.productVersion === version),
        availableVersions.findIndex(
          (v) => v.productVersion === installedVersions[0],
        ),
      )
      .toReversed();

    if (applyVersions.length === 0) {
      console.error('No updates to apply');
      return;
    }

    debug('applying versions', applyVersions);

    console.time('update');
    await setupTempAddressTable({ copyData: true });
    const counts = await processVersions(applyVersions);
    await swapInNewVersion();

    for (const v of getUniqueVersions(applyVersions)) {
      await writeVersion(v);
    }

    console.timeEnd('update');
    console.log(`Updated to version ${version}`);
    console.log(counts);
    await notifySlack(
      `📍 Updated ${process.env.STAGE} Address Base to version: ${version}`,
    );
  } catch (e) {
    await notifySlack(
      `🔥 Updating ${process.env.STAGE} Address Base errored: ${e.message}`,
    );
    console.error(e);
    process.exit(1);
  }
}

async function versionsAction() {
  const availableVersions = await Array.fromAsync(getFullVersions());
  const uniqueAvailableVersions = getUniqueVersions(availableVersions);
  const installedVersions = await storedVersions();

  const maxLength = Math.max(...uniqueAvailableVersions.map((v) => v.length));

  console.log(`${'Version'.padEnd(maxLength, ' ')}   Installed`);
  console.log(`${'-------'.padEnd(maxLength, ' ')}   ---------`);

  let foundInstalled = false;
  for (const version of uniqueAvailableVersions) {
    const installed = installedVersions.includes(version);
    if (installed) {
      foundInstalled = true;
    }
    console.log(
      `${version.padEnd(maxLength, ' ')}   ${installed ? 'Yes' : foundInstalled ? '--' : 'No'}`,
    );
  }
}

function getUniqueVersions(versions) {
  return Array.from(new Set(versions.map((v) => v.productVersion)));
}

function mergeCounts(counts, newCounts) {
  for (const key of Object.keys(newCounts)) {
    counts[key] ||= 0;
    counts[key] += newCounts[key];
  }
}

async function processVersions(applyVersions) {
  const counts = {};
  for (const version of applyVersions) {
    const addressIterator = generateAddresses(version);
    const additionalCounts = await updateAddresses(addressIterator);
    mergeCounts(counts, additionalCounts);
  }
  return counts;
}
