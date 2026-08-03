export type ContactKind = "email" | "phone" | "other";

export type StoredContactMethod = {
  id: string;
  kind: ContactKind;
  /** Contact value at rest (platform encryption). Not application-encrypted. */
  value: string;
  isPreferred: boolean;
};

export type RevealedContact = {
  id: string;
  kind: ContactKind;
  value: string;
  isPreferred: boolean;
};

/**
 * Discovery and pre-unlock views must never include contact values.
 * After shortlist/accept, pass only the unlocked contact method IDs.
 */
export function projectContactMethods(
  methods: readonly StoredContactMethod[],
  unlockedMethodIds: ReadonlySet<string> | readonly string[] | null,
): RevealedContact[] | null {
  if (!unlockedMethodIds) {
    return null;
  }
  const unlocked =
    unlockedMethodIds instanceof Set
      ? unlockedMethodIds
      : new Set(unlockedMethodIds);
  if (unlocked.size === 0) {
    return null;
  }

  const revealed = methods
    .filter((method) => unlocked.has(method.id))
    .map((method) => ({
      id: method.id,
      kind: method.kind,
      value: method.value,
      isPreferred: method.isPreferred,
    }));

  return revealed.length > 0 ? revealed : null;
}

export function selectPreferredContact(
  methods: readonly StoredContactMethod[],
): StoredContactMethod | null {
  if (methods.length === 0) {
    return null;
  }
  const preferred = methods.filter((method) => method.isPreferred);
  if (preferred.length === 1) {
    return preferred[0] ?? null;
  }
  // Deterministic: prefer flagged methods, then earliest id.
  const pool = preferred.length > 0 ? preferred : [...methods];
  return [...pool].sort((a, b) => a.id.localeCompare(b.id))[0] ?? null;
}
