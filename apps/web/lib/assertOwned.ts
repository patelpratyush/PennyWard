import { db } from '@/lib/db'

/**
 * Categories may be system-defaults (`userId: null`, shared with everyone) or
 * a user's own custom category. Either is a valid reference for that user.
 *
 * `extraUserIds` widens this to categories owned by other specific users —
 * used when validating entries on a budget shared with a household, where an
 * entry may reference a category owned by any member, not just the caller.
 */
export async function assertCategoryOwned(categoryId: string, userId: string, extraUserIds: string[] = []): Promise<boolean> {
  const cat = await db.category.findFirst({ where: { id: categoryId, OR: [{ userId: null }, { userId }, { userId: { in: extraUserIds } }] } })
  return !!cat
}

/** Accounts are always private — only the owning user may reference one. */
export async function assertAccountOwned(accountId: string, userId: string): Promise<boolean> {
  const acc = await db.financialAccount.findFirst({ where: { id: accountId, userId } })
  return !!acc
}
