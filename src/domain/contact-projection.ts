export type ContactKind = "email" | "phone" | "other";

export type StoredContactMethod = {
  id: string;
  kind: ContactKind;
  valueEncrypted: string;
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
 * Unlock paths pass unlocked=true only after an audited shortlist/accept.
 */
export function projectContactMethods(
  methods: readonly StoredContactMethod[],
  unlocked: boolean,
): RevealedContact[] | null {
  if (!unlocked) {
    return null;
  }

  return methods.map((method) => ({
    id: method.id,
    kind: method.kind,
    value: method.valueEncrypted,
    isPreferred: method.isPreferred,
  }));
}

export function selectPreferredContact(
  methods: readonly StoredContactMethod[],
): StoredContactMethod | null {
  if (methods.length === 0) {
    return null;
  }
  return methods.find((method) => method.isPreferred) ?? methods[0] ?? null;
}
