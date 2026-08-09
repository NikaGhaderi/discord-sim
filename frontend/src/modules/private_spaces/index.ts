/**
 * index — picks between the real implementation and the mock one.
 *
 * Consumers (like PrivateSpacesPage) should use `privateSpacesApi` from this
 * file, never api.ts or mockApi.ts directly. That way the mock/real switch is
 * a single env var and the rest of the code never changes.
 */

import * as realApi from './api';
import * as mockApi from './mockApi';
import type { PrivateSpacesApi } from './api';

const useMock = import.meta.env.VITE_USE_MOCK_API === 'true';

export const privateSpacesApi: PrivateSpacesApi = useMock ? mockApi : realApi;

export * from './api';
export * from './types';
