# epb-update-address-base
This repo contains scripts to get updates from address base.

You need to provide the environment variable `DATABASE_URL` which is a connection string to your database.
You also need to provide your API key for the OS API as an environment variable `OS_DATA_HUB_API_KEY`

The process checks against data packages set up on your account (this was written for the EPBR team so checks for packages marked with a prefix of EPBR in the name - update this for your own account (see the function `isEpbrPackage`)) for both the AddressBase Plus and AddressBase Plus - Islands products (these cover Great Britain, and Northern Ireland/ Isle of Man/ Channel Islands respectively). 
If an update is available for both of these products, the process will perform fetches of the data for the new versions of these products and apply them to the database you connect to (for the EPBR team this is the register database). 
The import works by streaming in data from the API, so no interstitial disk storage (for example, using an S3 bucket) is needed.

If not already set up, you will need an address_base table and an address_base_versions table - you can set these up using the `setUpTables` script that the tests use found in `database.js`

## Available scripts

- `update-address-base` Checks what the last version added to your database was, and adds the deltas from address base in order
- `update-address-base-auto` Does the above, but doesn't require manual approval to go ahead - useful for an automated process.
- `update-address-base-specific-version` Adds a specific version from address base. Useful if you want to add them one by one your self. To use it set an environment variable named `VERSION_NUMBER` with an integer.
- `full-address-base-reload` Gets the full update for the current version - the other scripts use 'change only update' which is the delta from the previous version. This uses the full set of data for that version. Good for first set up.
- `specify-address-base-version` Allows you to change which address base version is stored as the current latest version - does not actually update the data to match. Use with care.
- `get-address-base-version` Tells you which is the latest version to have been added to your database

For your initial set up, use `full-address-base-reload` on an empty address_base table.

For normal operating, use `update-address-base-auto` for your updates.
