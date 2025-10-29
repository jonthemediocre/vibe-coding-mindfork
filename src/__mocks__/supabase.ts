/**
 * Supabase Mock Factory
 * Centralized mocking for Supabase client
 */

export const createMockQueryBuilder = () => {
  const mockBuilder = {
    select: jest.fn().mockReturnThis(),
    insert: jest.fn().mockReturnThis(),
    update: jest.fn().mockReturnThis(),
    delete: jest.fn().mockReturnThis(),
    upsert: jest.fn().mockReturnThis(),
    eq: jest.fn().mockReturnThis(),
    neq: jest.fn().mockReturnThis(),
    gte: jest.fn().mockReturnThis(),
    gt: jest.fn().mockReturnThis(),
    lte: jest.fn().mockReturnThis(),
    lt: jest.fn().mockReturnThis(),
    like: jest.fn().mockReturnThis(),
    ilike: jest.fn().mockReturnThis(),
    is: jest.fn().mockReturnThis(),
    in: jest.fn().mockReturnThis(),
    contains: jest.fn().mockReturnThis(),
    containedBy: jest.fn().mockReturnThis(),
    rangeGt: jest.fn().mockReturnThis(),
    rangeGte: jest.fn().mockReturnThis(),
    rangeLt: jest.fn().mockReturnThis(),
    rangeLte: jest.fn().mockReturnThis(),
    rangeAdjacent: jest.fn().mockReturnThis(),
    overlaps: jest.fn().mockReturnThis(),
    textSearch: jest.fn().mockReturnThis(),
    match: jest.fn().mockReturnThis(),
    not: jest.fn().mockReturnThis(),
    or: jest.fn().mockReturnThis(),
    filter: jest.fn().mockReturnThis(),
    order: jest.fn().mockReturnThis(),
    limit: jest.fn().mockReturnThis(),
    range: jest.fn().mockReturnThis(),
    abortSignal: jest.fn().mockReturnThis(),
    single: jest.fn().mockResolvedValue({ data: null, error: null }),
    maybeSingle: jest.fn().mockResolvedValue({ data: null, error: null }),
    csv: jest.fn().mockResolvedValue({ data: '', error: null }),
    // Default resolution for terminal operations
    then: jest.fn((resolve) => resolve({ data: [], error: null })),
  };

  return mockBuilder;
};

export const createMockStorageBucket = () => ({
  upload: jest.fn().mockResolvedValue({ data: { path: 'mock-path' }, error: null }),
  download: jest.fn().mockResolvedValue({ data: new Blob(), error: null }),
  remove: jest.fn().mockResolvedValue({ data: null, error: null }),
  list: jest.fn().mockResolvedValue({ data: [], error: null }),
  getPublicUrl: jest.fn((path: string) => ({
    data: { publicUrl: `https://example.com/${path}` },
  })),
  createSignedUrl: jest.fn().mockResolvedValue({
    data: { signedUrl: 'https://example.com/signed' },
    error: null,
  }),
  createSignedUrls: jest.fn().mockResolvedValue({
    data: [],
    error: null,
  }),
});

export const createMockSupabaseClient = () => {
  const mockClient = {
    auth: {
      getSession: jest.fn().mockResolvedValue({
        data: { session: null },
        error: null,
      }),
      getUser: jest.fn().mockResolvedValue({
        data: { user: null },
        error: null,
      }),
      signInWithPassword: jest.fn().mockResolvedValue({
        data: { user: null, session: null },
        error: null,
      }),
      signInWithOAuth: jest.fn().mockResolvedValue({
        data: { url: 'https://oauth.example.com', provider: 'google' },
        error: null,
      }),
      signUp: jest.fn().mockResolvedValue({
        data: { user: null, session: null },
        error: null,
      }),
      signOut: jest.fn().mockResolvedValue({
        error: null,
      }),
      refreshSession: jest.fn().mockResolvedValue({
        data: { session: null },
        error: null,
      }),
      resetPasswordForEmail: jest.fn().mockResolvedValue({
        data: null,
        error: null,
      }),
      updateUser: jest.fn().mockResolvedValue({
        data: { user: null },
        error: null,
      }),
      onAuthStateChange: jest.fn(() => ({
        data: {
          subscription: {
            unsubscribe: jest.fn(),
          },
        },
      })),
      setSession: jest.fn().mockResolvedValue({
        data: { session: null },
        error: null,
      }),
    },
    from: jest.fn(() => createMockQueryBuilder()),
    storage: {
      from: jest.fn(() => createMockStorageBucket()),
    },
    functions: {
      invoke: jest.fn().mockResolvedValue({
        data: null,
        error: null,
      }),
    },
    rpc: jest.fn().mockResolvedValue({
      data: null,
      error: null,
    }),
    channel: jest.fn(() => ({
      on: jest.fn().mockReturnThis(),
      subscribe: jest.fn(),
      unsubscribe: jest.fn(),
    })),
  };

  return mockClient;
};

// Default export
export const mockSupabase = createMockSupabaseClient();
