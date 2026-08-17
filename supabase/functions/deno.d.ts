/**
 * Ambient type definitions for Deno runtime in Supabase Edge Functions.
 * Provides types for global `Deno` when using standard TypeScript language server.
 */

declare namespace Deno {
  export interface Env {
    get(key: string): string | undefined;
    set(key: string, value: string): void;
    delete(key: string): void;
    has(key: string): boolean;
    toObject(): Record<string, string>;
  }

  export const env: Env;

  export interface ServeOptions {
    port?: number;
    hostname?: string;
    signal?: AbortSignal;
    onError?: (error: unknown) => Response | Promise<Response>;
    onListen?: (params: { hostname: string; port: number }) => void;
  }

  export interface ServeHandlerInfo {
    remoteAddr?: {
      transport: "tcp" | "udp";
      hostname: string;
      port: number;
    };
  }

  export function serve(
    handler: (req: Request, info?: ServeHandlerInfo) => Response | Promise<Response>
  ): void;
  export function serve(
    options: ServeOptions,
    handler: (req: Request, info?: ServeHandlerInfo) => Response | Promise<Response>
  ): void;

  export function test(name: string, fn: () => void | Promise<void>): void;
  export function test(options: {
    name: string;
    fn: () => void | Promise<void>;
    [key: string]: any;
  }): void;
}

declare module "jsr:@supabase/supabase-js@2" {
  export function createClient(supabaseUrl: string, supabaseKey: string, options?: any): any;
  export type SupabaseClient = any;
  export type User = any;
  export type Session = any;
}

declare module "https://esm.sh/@supabase/supabase-js@2" {
  export function createClient(supabaseUrl: string, supabaseKey: string, options?: any): any;
  export type SupabaseClient = any;
  export type User = any;
  export type Session = any;
}

declare module "npm:@supabase/supabase-js@2" {
  export function createClient(supabaseUrl: string, supabaseKey: string, options?: any): any;
  export type SupabaseClient = any;
  export type User = any;
  export type Session = any;
}

declare module "https://deno.land/std@0.192.0/testing/asserts.ts" {
  export function assertEquals(actual: unknown, expected: unknown, msg?: string): void;
  export function assertNotEquals(actual: unknown, expected: unknown, msg?: string): void;
  export function assert(expr: unknown, msg?: string): void;
}

declare module "https://deno.land/std@*/testing/asserts.ts" {
  export function assertEquals(actual: unknown, expected: unknown, msg?: string): void;
  export function assertNotEquals(actual: unknown, expected: unknown, msg?: string): void;
  export function assert(expr: unknown, msg?: string): void;
}
