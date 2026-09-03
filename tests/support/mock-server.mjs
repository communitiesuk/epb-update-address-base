import { beforeAll, afterEach, afterAll } from '@jest/globals';
import { createReadStream } from 'node:fs';
import { Readable } from 'node:stream';
import { setupServer } from 'msw/node';
import { http, HttpResponse } from 'msw';

const server = setupServer(
  http.get('*/downloads/v1/dataPackages', ({ request }) => {
    const url = new URL(request.url);
    if (url.searchParams.get('key') !== 'apikey1234') {
      return HttpResponse.json({ message: 'Invalid ApiKey' }, { status: 403 });
    }
    return new HttpResponse(
      Readable.toWeb(createReadStream('./tests/fixtures/packages.json')),
      { headers: { 'Content-Type': 'application/json' } },
    );
  }),

  http.get(
    '*/downloads/v1/dataPackages/:id/versions/:version',
    ({ request, params }) => {
      const url = new URL(request.url);
      if (url.searchParams.get('key') !== 'apikey1234') {
        return HttpResponse.json(
          { message: 'Invalid ApiKey' },
          { status: 403 },
        );
      }
      const { id, version } = params;
      return new HttpResponse(
        Readable.toWeb(
          createReadStream(`./tests/fixtures/packages-${id}-${version}.json`),
        ),
        { headers: { 'Content-Type': 'application/json' } },
      );
    },
  ),

  http.get(
    '*/downloads/v1/dataPackages/:id/versions/:version/downloads',
    ({ request, params }) => {
      const url = new URL(request.url);
      if (url.searchParams.get('key') !== 'apikey1234') {
        return HttpResponse.json(
          { message: 'Invalid ApiKey' },
          { status: 403 },
        );
      }
      const { id, version } = params;
      return new HttpResponse(
        Readable.toWeb(
          createReadStream(
            `./tests/fixtures/packages-${id}-${version}-${url.searchParams.get('fileName')}`,
          ),
        ),
        { headers: { 'Content-Type': 'application/json' } },
      );
    },
  ),
);

beforeAll(() => server.listen());
afterEach(() => server.resetHandlers());
afterAll(() => server.close());
