import { UnconfiguredExternalAdapter } from "./unconfigured-adapter.ts";

/**
 * Reserved extension point for a future, authorized T2MIS REST API contract.
 * It intentionally inherits fail-closed behavior until that contract exists.
 */
export class T2misApiAdapter extends UnconfiguredExternalAdapter {
  constructor() {
    super("t2mis-api");
  }
}
