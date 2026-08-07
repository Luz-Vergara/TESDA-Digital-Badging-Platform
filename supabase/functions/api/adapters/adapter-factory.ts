import type { ExternalDataSourceAdapter } from "./external-data-source-adapter.ts";
import { SupabaseExternalDataSourceAdapter } from "./supabase-adapter.ts";
import { T2misApiAdapter } from "./t2mis-api-adapter.ts";
import { T2misDatabaseAdapter } from "./t2mis-database-adapter.ts";
import type { DataSourceName } from "../types.ts";

export function getExternalDataSourceName(): DataSourceName {
  const configured = Deno.env.get("EXTERNAL_DATA_SOURCE") ?? "supabase";
  if (
    configured !== "supabase" &&
    configured !== "t2mis-api" &&
    configured !== "t2mis-database"
  ) {
    throw new Error("Unsupported EXTERNAL_DATA_SOURCE setting");
  }
  return configured;
}

export function createExternalDataSourceAdapter(): ExternalDataSourceAdapter {
  const source = getExternalDataSourceName();
  if (source === "t2mis-api") return new T2misApiAdapter();
  if (source === "t2mis-database") return new T2misDatabaseAdapter();

  const url = Deno.env.get("SUPABASE_URL");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!url || !serviceRoleKey) {
    throw new Error("Supabase server configuration is incomplete");
  }
  return new SupabaseExternalDataSourceAdapter(url, serviceRoleKey);
}
