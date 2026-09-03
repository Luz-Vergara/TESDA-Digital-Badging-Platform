import { UnconfiguredExternalAdapter } from "./unconfigured-adapter.ts";

/**
 * Reserved extension point for a future, authorized read-only T2MIS database
 * contract. It intentionally contains no driver, schema, or credentials.
 */
export class T2misDatabaseAdapter extends UnconfiguredExternalAdapter {
  constructor() {
    super("t2mis-database");
  }
}
