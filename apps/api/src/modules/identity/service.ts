/**
 * Identity: who is signed in, and what this deployment can really do.
 */
import type { AuthActor } from "@managevent/auth";
import type { MeResponse } from "@managevent/validators";
import type { ApiDeps } from "../../lib/deps.js";
import { getCapabilities } from "../../lib/env.js";
import { findActiveUser } from "./repo.js";

/**
 * Never fails for a signed-out caller: `user` is simply null. The web apps call this instead of
 * looking at cookies, so the cookie name stays an API detail.
 */
export async function getMe(deps: ApiDeps, actor: AuthActor | null): Promise<MeResponse> {
  const capabilities = getCapabilities();
  if (!actor?.userId) return { user: null, capabilities };

  const user = await findActiveUser(deps.db, actor.userId);
  if (!user) return { user: null, capabilities };

  return {
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
      roles: user.roles,
      emailVerified: user.emailVerified,
      twoFactorEnabled: user.twoFactorEnabled,
    },
    capabilities,
  };
}
