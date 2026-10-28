import { createAuthEmailHook } from '../_shared/auth-email.mjs';

// Minimal runtime declaration keeps the portal's TypeScript check independent of Deno tooling.
declare const Deno: {
  env: { toObject(): Record<string, string> };
  serve(handler: (request: Request) => Promise<Response>): void;
};

Deno.serve(createAuthEmailHook(Deno.env.toObject()));
