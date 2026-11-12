/**
 * Prisma access for the signed-in user's own profile.
 */
import type { DbTx } from "../../lib/deps.js";

export async function findActiveUser(db: DbTx, userId: string) {
  return db.user.findFirst({
    where: { id: userId, deletedAt: null },
    select: {
      id: true,
      email: true,
      name: true,
      roles: true,
      emailVerified: true,
      twoFactorEnabled: true,
    },
  });
}
