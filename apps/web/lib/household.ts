import { db } from '@/lib/db'
import type { HouseholdRole } from '@prisma/client'

/**
 * A user belongs to at most one household in v1 — this is enforced here
 * (create/accept both check for an existing membership first), not by the
 * schema, which technically allows more.
 */
export async function getHouseholdForUser(userId: string): Promise<{ id: string; role: HouseholdRole } | null> {
  const membership = await db.householdMember.findFirst({ where: { userId }, select: { householdId: true, role: true } })
  if (!membership) return null
  return { id: membership.householdId, role: membership.role }
}
