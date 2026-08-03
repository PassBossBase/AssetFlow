import type { GenericCtx } from "@convex-dev/better-auth/utils";

import type { DataModel } from "../_generated/dataModel";
import { createAuth } from "../auth";

// Static export used only by the Better Auth schema generator.
export const auth = createAuth({} as GenericCtx<DataModel>);
