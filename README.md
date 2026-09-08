# epb-update-address-base

This repo contains scripts to load data provided by [Ordnance Survey address base](https://www.ordnancesurvey.co.uk/products/addressbase)

## Prerequisites

- [Node.js](https://nodejs.org/en/download/package-manager)
- [PostgreSQL](https://www.postgresql.org/)
- [Ordnance Survey API Key](https://www.ordnancesurvey.co.uk/products/addressbase#get)

It is recommended you setup [epb-register-api](https://github.com/communitiesuk/epb-register-api) and
use its database for local development and testing.

## Running the Address base updates locally

```bash
npm ci

# Set the OS api key
export OS_DATA_HUB_API_KEY=my-api-key

# If you are not using epb-register-api with the default database
# then export a DATABASE_URL and TEST_DATABASE_URL

# If an empty database then run
# npm run setup-db

# Install the latest address base to the database
node address-base.mjs install

# For a verbose output set the DEBUG env
DEBUG=address_base:* node address-base.mjs install

# Update to the latest version
node address-base.mjs update

# List available and installed versions
node address-base.mjs versions

# Install a specific version
node address-base.mjs install 'E126 April 2026 Update'

# Update to a specific version
node address-base.mjs update 'E126 April 2026 Update'

# Test
npm run lint
npm test
```

## Database setup

By default it will use your local epb-register-api database.

To customise set `DATABASE_URL` and `TEST_DATABASE_URL`.

If you do not have a database you can create the tables using `npm run setup-db`

## Address base update process

The process checks against data packages set up on your account (this was written for the EPBR team so checks for packages marked with a prefix of EPBR in the name - update this for your own account (see the function `isEpbrPackage`)) for both the AddressBase Plus and AddressBase Plus - Islands products (these cover Great Britain, and Northern Ireland/ Isle of Man/ Channel Islands respectively).
If an update is available for both of these products, the process will perform fetches of the data for the new versions of these products and apply them to the database you connect to (for the EPBR team this is the register database).
The import works by streaming in data from the API, so no interstitial disk storage (for example, using an S3 bucket) is needed.

## Address base versions

OS release updated versions (epochs) of their data every 6 weeks.
The specific version can be [found here](https://www.ordnancesurvey.co.uk/products/addressbase-epoch-dates)

## Environmental variables

#### `DATABASE_URL`

The database connection string. Defaults to a local database called `epb`

#### `TEST_DATABASE_URL`

The test database connection string. Defaults to a local database called `epb_test`

#### `OS_DATA_HUB_API_KEY`

The API key for the OS account

#### `DEBUG`

This project uses [debug](https://github.com/debug-js/debug). For a verbose output set `DEBUG=address-base:*`

#### `EPB_TEAM_SLACK_URL`

Slack WebHook for sending alerts to Slack. Only sent for updates.

#### `STAGE`

The environment. Required to send the Slack message.
