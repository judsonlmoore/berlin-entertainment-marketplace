"use client";

import {
  useEffect,
  useRef,
  useState,
  useTransition,
  type ReactNode,
} from "react";
import { useTranslations } from "next-intl";
import {
  createVenue,
  publishVenueProfile,
  unpublishVenueProfile,
  updateVenue,
} from "@/src/actions/profiles";
import { AutosaveStatus } from "@/src/components/profile/autosave-status";
import { CategorySubcategorySelect } from "@/src/components/profile/category-subcategory-select";
import {
  ParagraphTextField,
  toParagraphEditorHtml,
} from "@/src/components/profile/paragraph-text-field";
import { PrefixedUrlInput } from "@/src/components/profile/prefixed-url-input";
import { PublicationControl } from "@/src/components/profile/publication-control";
import { ProfilePreviewButton } from "@/src/components/profile/profile-preview-button";
import { useProfileAutosave } from "@/src/components/profile/use-profile-autosave";
import { VenuePlacesSearch } from "@/src/components/profile/venue-places-search";
import {
  canOwnerPublishProfile,
  canOwnerUnpublishProfile,
  isProfilePublished,
  type ProfilePublicationState,
} from "@/src/domain/profile-publication";
import {
  encodeVenueType,
  getCategoryNode,
  parseVenueType,
  VENUE_CATEGORIES,
} from "@/src/domain/profile-taxonomy";
import {
  DESCRIPTION_MIN,
  LONG_NOTES_MAX,
  NOTES_MAX,
  SHORT_DESCRIPTION_MAX,
} from "@/src/domain/sanitize-input";
import {
  VENUE_SOCIAL_ORDER,
  type SocialPlatform,
} from "@/src/domain/social-urls";
import { useRouter } from "@/src/i18n/navigation";
import type { PlacesPrefill } from "@/src/integrations/google-places";

type SocialLinks = Partial<
  Record<
    | "instagram"
    | "facebook"
    | "tiktok"
    | "spotify"
    | "soundcloud"
    | "linkedin"
    | "youtube",
    string
  >
>;

type Props = {
  locale: "en" | "de";
  venueId?: string;
  publicationState?: string;
  accountEmail: string;
  defaultContactPhone?: string;
  mediaSlot?: ReactNode;
  documentsSlot?: ReactNode;
  defaultValues?: {
    name: string;
    shortDescription: string;
    addressLine1: string;
    addressLine2?: string | null;
    district: string;
    postalCode: string;
    city?: string;
    latitude?: string | null;
    longitude?: string | null;
    googlePlaceId?: string | null;
    venueType: string;
    audienceDescription: string;
    capacity: number;
    capacityContext?: string | null;
    roomName?: string;
    roomStageDimensions?: string | null;
    productionNotes?: string;
    productionPa?: string;
    productionMixer?: string;
    productionMics?: string;
    productionLighting?: string;
    productionBackline?: string;
    productionPower?: string;
    productionStage?: string;
    houseRules?: string | null;
    loadInNotes?: string | null;
    accessibilityNotes?: string | null;
    socialLinks?: SocialLinks;
    websiteUrl?: string | null;
    contactPhone?: string | null;
  };
};

function Section({
  title,
  hint,
  children,
}: {
  title: string;
  hint?: string;
  children: ReactNode;
}) {
  return (
    <section className="panel grid gap-4 p-6">
      <div>
        <h3 className="text-sm font-semibold tracking-[0.12em] text-[var(--ink)] uppercase">
          {title}
        </h3>
        {hint ? (
          <p className="mt-1 text-sm text-[var(--text-muted)]">{hint}</p>
        ) : null}
      </div>
      {children}
    </section>
  );
}

function socialFieldName(platform: SocialPlatform): string {
  switch (platform) {
    case "instagram":
      return "socialInstagram";
    case "facebook":
      return "socialFacebook";
    case "tiktok":
      return "socialTiktok";
    case "linkedin":
      return "socialLinkedin";
    case "youtube":
      return "socialYoutube";
    default:
      return "websiteUrl";
  }
}

function socialLabelKey(platform: SocialPlatform) {
  switch (platform) {
    case "instagram":
      return "socialInstagram" as const;
    case "facebook":
      return "socialFacebook" as const;
    case "tiktok":
      return "socialTiktok" as const;
    case "linkedin":
      return "socialLinkedin" as const;
    case "youtube":
      return "socialYoutube" as const;
    default:
      return "websiteUrl" as const;
  }
}

function canOwnerPublish(state: string | undefined): boolean {
  return canOwnerPublishProfile((state ?? "draft") as ProfilePublicationState);
}

export function VenueProfileForm({
  locale,
  venueId: initialVenueId,
  publicationState,
  accountEmail,
  defaultContactPhone = "",
  mediaSlot,
  documentsSlot,
  defaultValues,
}: Props) {
  const t = useTranslations("profile");
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);
  const [venueId, setVenueId] = useState(initialVenueId);
  const venueIdRef = useRef(venueId);
  const [displayName, setDisplayName] = useState(defaultValues?.name ?? "");
  const [addressLine1, setAddressLine1] = useState(
    defaultValues?.addressLine1 ?? "",
  );
  const [addressLine2, setAddressLine2] = useState(
    defaultValues?.addressLine2 ?? "",
  );
  const [district, setDistrict] = useState(defaultValues?.district ?? "");
  const [postalCode, setPostalCode] = useState(defaultValues?.postalCode ?? "");
  const [latitude, setLatitude] = useState(defaultValues?.latitude ?? "");
  const [longitude, setLongitude] = useState(defaultValues?.longitude ?? "");
  const [googlePlaceId, setGooglePlaceId] = useState(
    defaultValues?.googlePlaceId ?? "",
  );
  const [websiteUrl, setWebsiteUrl] = useState(defaultValues?.websiteUrl ?? "");
  const [websiteKey, setWebsiteKey] = useState(0);
  const parsedType = parseVenueType(defaultValues?.venueType);
  const [typeSelectKey, setTypeSelectKey] = useState(0);
  const [typeCategory, setTypeCategory] = useState(parsedType.categoryId);
  const [typeSubcategory, setTypeSubcategory] = useState(
    parsedType.subcategoryRaw,
  );
  const [publishError, setPublishError] = useState<string | null>(null);
  const [isPublishing, startPublish] = useTransition();
  const social = defaultValues?.socialLinks ?? {};
  const pubState = (publicationState ?? "draft") as ProfilePublicationState;
  const published = isProfilePublished(pubState);
  const showPublish = canOwnerPublish(pubState);
  const showUnpublish = canOwnerUnpublishProfile(pubState);

  useEffect(() => {
    venueIdRef.current = venueId;
  }, [venueId]);

  function applyPrefill(prefill: PlacesPrefill) {
    if (prefill.name.trim()) setDisplayName(prefill.name.trim());
    setAddressLine1(prefill.addressLine1);
    setAddressLine2(prefill.addressLine2);
    setDistrict(prefill.district);
    setPostalCode(prefill.postalCode);
    setLatitude(prefill.latitude);
    setLongitude(prefill.longitude);
    setGooglePlaceId(prefill.googlePlaceId);
    if (prefill.websiteUrl.trim()) {
      setWebsiteUrl(prefill.websiteUrl.trim());
      setWebsiteKey((key) => key + 1);
    }
    if (
      prefill.venueTypeHint &&
      getCategoryNode(VENUE_CATEGORIES, prefill.venueTypeHint)
    ) {
      const node = getCategoryNode(VENUE_CATEGORIES, prefill.venueTypeHint);
      const firstSub = node?.children[0]?.id ?? "";
      setTypeCategory(prefill.venueTypeHint);
      setTypeSubcategory(firstSub);
      setTypeSelectKey((key) => key + 1);
    }
    // Controlled updates do not emit input events — nudge autosave after paint.
    requestAnimationFrame(() => {
      formRef.current?.dispatchEvent(new Event("input", { bubbles: true }));
    });
  }

  function readForm(form: FormData) {
    const website = String(form.get("websiteUrl") ?? "").trim();
    const addressLine2Value = String(form.get("addressLine2") ?? "").trim();
    const capacityContext = String(form.get("capacityContext") ?? "").trim();
    const productionNotes = String(form.get("productionNotes") ?? "").trim();
    const latitudeValue = String(form.get("latitude") ?? "").trim();
    const longitudeValue = String(form.get("longitude") ?? "").trim();
    const placeId = String(form.get("googlePlaceId") ?? "").trim();
    const roomStageDimensions = String(
      form.get("roomStageDimensions") ?? "",
    ).trim();
    const contactPhone = String(form.get("contactPhone") ?? "").trim();
    const categoryId = String(form.get("venueCategory") ?? "");
    const subcategory = String(form.get("venueSubcategory") ?? "");

    return {
      name: String(form.get("name") ?? ""),
      shortDescription: String(form.get("shortDescription") ?? ""),
      addressLine1: String(form.get("addressLine1") ?? ""),
      ...(addressLine2Value ? { addressLine2: addressLine2Value } : {}),
      district: String(form.get("district") ?? ""),
      postalCode: String(form.get("postalCode") ?? ""),
      ...(latitudeValue ? { latitude: latitudeValue } : {}),
      ...(longitudeValue ? { longitude: longitudeValue } : {}),
      ...(placeId ? { googlePlaceId: placeId } : { googlePlaceId: "" }),
      venueType: encodeVenueType(categoryId, subcategory),
      audienceDescription: String(form.get("audienceDescription") ?? ""),
      capacity: Number(form.get("capacity") ?? 1),
      ...(capacityContext ? { capacityContext } : {}),
      roomName: String(form.get("roomName") ?? "").trim() || "Main room",
      ...(roomStageDimensions
        ? { roomStageDimensions }
        : { roomStageDimensions: "" }),
      productionNotes,
      productionPa: String(form.get("productionPa") ?? ""),
      productionMixer: String(form.get("productionMixer") ?? ""),
      productionMics: String(form.get("productionMics") ?? ""),
      productionLighting: String(form.get("productionLighting") ?? ""),
      productionBackline: String(form.get("productionBackline") ?? ""),
      productionPower: String(form.get("productionPower") ?? ""),
      productionStage: String(form.get("productionStage") ?? ""),
      houseRules: String(form.get("houseRules") ?? ""),
      loadInNotes: String(form.get("loadInNotes") ?? ""),
      accessibilityNotes: String(form.get("accessibilityNotes") ?? ""),
      socialLinks: {
        instagram: String(form.get("socialInstagram") ?? ""),
        facebook: String(form.get("socialFacebook") ?? ""),
        tiktok: String(form.get("socialTiktok") ?? ""),
        linkedin: String(form.get("socialLinkedin") ?? ""),
        youtube: String(form.get("socialYoutube") ?? ""),
      },
      ...(website ? { websiteUrl: website } : { websiteUrl: "" }),
      contactEmail: accountEmail,
      contactPhone,
      locale,
    };
  }

  const autosave = useProfileAutosave({
    formRef,
    readPayload: (form) => {
      const payload = readForm(form);
      if (!payload.name.trim() || !payload.contactEmail.trim()) return null;
      return payload;
    },
    save: async (payload) => {
      const currentId = venueIdRef.current;
      if (currentId) {
        return updateVenue(currentId, payload);
      }
      const result = await createVenue(payload);
      if (result.ok && result.id) {
        setVenueId(result.id);
        venueIdRef.current = result.id;
      }
      return result;
    },
  });

  function publishProfile() {
    setPublishError(null);
    startPublish(async () => {
      const saved = await autosave.saveNow();
      if (!saved?.ok) {
        setPublishError(saved?.message || t("publishProfileFailed"));
        return;
      }
      const id = venueIdRef.current;
      if (!id) {
        setPublishError(t("publishProfileFailed"));
        return;
      }
      const result = await publishVenueProfile(id, locale);
      if (!result.ok) {
        setPublishError(result.message || t("publishProfileFailed"));
        return;
      }
      router.refresh();
    });
  }

  function unpublishProfile() {
    setPublishError(null);
    startPublish(async () => {
      const id = venueIdRef.current;
      if (!id) {
        setPublishError(t("unpublishProfileFailed"));
        return;
      }
      const result = await unpublishVenueProfile(id, locale);
      if (!result.ok) {
        setPublishError(result.message || t("unpublishProfileFailed"));
        return;
      }
      router.refresh();
    });
  }

  return (
    <div className="grid gap-5">
      <div className="sticky top-14 z-10 bg-[var(--canvas)] py-3 lg:top-0">
        <div className="rounded-[var(--radius-md)] border border-[var(--rule)] bg-[var(--surface)] px-5 py-4">
          <div className="flex flex-wrap items-end justify-between gap-x-4 gap-y-3">
            <div className="min-w-0">
              <p className="eyebrow text-[var(--accent)]">
                {t("displayNameEyebrow")}
              </p>
              <h2 className="page-title mt-1 text-[clamp(1.5rem,2vw,2rem)]">
                {displayName.trim() || t("previewVenueFallback")}
              </h2>
            </div>

            <div className="flex flex-wrap items-center justify-end gap-3">
              <AutosaveStatus
                phase={autosave.phase}
                errorMessage={autosave.errorMessage}
              />
              {venueId ? (
                <ProfilePreviewButton
                  href={`/marketplace/venues/${venueId}?preview=1`}
                  onBeforeNavigate={() => autosave.saveNow()}
                  disabled={autosave.phase === "saving"}
                />
              ) : null}
              <PublicationControl
                state={pubState}
                unpublishedLabel={t("statusUnpublished")}
                suspendedLabel={t("statusSuspended")}
                publishLabel={t("publishProfile")}
                publishingLabel={t("publishingProfile")}
                unpublishLabel={t("unpublishProfile")}
                unpublishingLabel={t("unpublishingProfile")}
                canPublish={showPublish}
                canUnpublish={showUnpublish}
                pending={isPublishing}
                disabled={autosave.phase === "saving" || !venueId}
                onPublish={publishProfile}
                onUnpublish={unpublishProfile}
              />
            </div>
          </div>
          {publishError ? (
            <p role="alert" className="mt-3 text-sm text-[var(--danger)]">
              {publishError}
            </p>
          ) : showPublish ? (
            <p className="mt-3 text-sm text-[var(--text-muted)]">
              {t("publishProfileHint")}
            </p>
          ) : published ? (
            <p className="mt-3 text-sm text-[var(--text-muted)]">
              {t("publishedProfileHint")}
            </p>
          ) : null}
        </div>
      </div>

      <form ref={formRef} className="grid gap-5">
        {mediaSlot ? (
          <Section title={t("sectionMedia")}>{mediaSlot}</Section>
        ) : (
          <Section title={t("sectionMedia")}>
            <p className="text-sm text-[var(--text-muted)]">
              {t("portfolioNeedVenue")}
            </p>
          </Section>
        )}

        <Section title={t("sectionBasics")}>
          <VenuePlacesSearch locale={locale} onPrefill={applyPrefill} />

          <label className="grid gap-1 text-sm">
            <span className="font-medium">{t("venueName")}</span>
            <input
              name="name"
              required
              className="field"
              value={displayName}
              onChange={(event) => setDisplayName(event.target.value)}
            />
          </label>

          <CategorySubcategorySelect
            key={typeSelectKey}
            kind="venue"
            categoryName="venueCategory"
            subcategoryName="venueSubcategory"
            otherName="venueSubcategoryOther"
            defaultCategory={typeCategory}
            defaultSubcategoryRaw={typeSubcategory}
            categoryLabel={t("venueType")}
            subcategoryLabel={t("subcategory")}
            otherLabel={t("subcategoryOther")}
          />

          <ParagraphTextField
            name="shortDescription"
            label={t("shortDescription")}
            defaultValue={toParagraphEditorHtml(
              defaultValues?.shortDescription ?? "",
            )}
            min={DESCRIPTION_MIN}
            max={SHORT_DESCRIPTION_MAX}
            placeholder={t("descriptionPlaceholder")}
            size="medium"
          />
        </Section>

        <Section title={t("sectionLocation")}>
          <label className="grid gap-1 text-sm">
            <span className="font-medium">{t("addressLine1")}</span>
            <input
              name="addressLine1"
              className="field"
              value={addressLine1}
              onChange={(event) => setAddressLine1(event.target.value)}
            />
          </label>
          <label className="grid gap-1 text-sm">
            <span className="font-medium">{t("addressLine2")}</span>
            <input
              name="addressLine2"
              className="field"
              value={addressLine2}
              onChange={(event) => setAddressLine2(event.target.value)}
            />
          </label>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="grid gap-1 text-sm">
              <span className="font-medium">{t("district")}</span>
              <input
                name="district"
                className="field"
                value={district}
                onChange={(event) => setDistrict(event.target.value)}
              />
            </label>
            <label className="grid gap-1 text-sm">
              <span className="font-medium">{t("postalCode")}</span>
              <input
                name="postalCode"
                className="field"
                value={postalCode}
                onChange={(event) => setPostalCode(event.target.value)}
              />
            </label>
          </div>
          <input type="hidden" name="latitude" value={latitude} />
          <input type="hidden" name="longitude" value={longitude} />
          <input type="hidden" name="googlePlaceId" value={googlePlaceId} />
        </Section>

        <Section title={t("sectionDetails")}>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="grid gap-1 text-sm">
              <span className="font-medium">{t("capacity")}</span>
              <input
                name="capacity"
                type="number"
                min={1}
                required
                defaultValue={defaultValues?.capacity ?? 50}
                className="field"
              />
            </label>
            <label className="grid gap-1 text-sm">
              <span className="font-medium">{t("capacityContext")}</span>
              <input
                name="capacityContext"
                defaultValue={defaultValues?.capacityContext ?? ""}
                className="field"
              />
            </label>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="grid gap-1 text-sm">
              <span className="font-medium">{t("roomName")}</span>
              <input
                name="roomName"
                defaultValue={defaultValues?.roomName ?? "Main room"}
                className="field"
              />
            </label>
            <label className="grid gap-1 text-sm">
              <span className="font-medium">{t("roomStageDimensions")}</span>
              <input
                name="roomStageDimensions"
                defaultValue={defaultValues?.roomStageDimensions ?? ""}
                className="field"
              />
            </label>
          </div>
          <ParagraphTextField
            name="audienceDescription"
            label={t("audienceDescription")}
            defaultValue={toParagraphEditorHtml(
              defaultValues?.audienceDescription ?? "",
            )}
            min={0}
            max={NOTES_MAX}
            size="medium"
          />
          <label className="grid gap-1 text-sm">
            <span className="font-medium">{t("contactPhone")}</span>
            <input
              name="contactPhone"
              type="tel"
              defaultValue={
                defaultValues?.contactPhone ?? defaultContactPhone ?? ""
              }
              className="field"
              placeholder="+49 …"
            />
          </label>
        </Section>

        <Section title={t("sectionProduction")}>
          <ParagraphTextField
            name="productionNotes"
            label={t("productionNotes")}
            defaultValue={toParagraphEditorHtml(
              defaultValues?.productionNotes ?? "",
            )}
            min={0}
            max={LONG_NOTES_MAX}
            size="short"
          />
          <div className="grid gap-2 sm:grid-cols-2">
            {(
              [
                ["productionPa", "productionPa"],
                ["productionMixer", "productionMixer"],
                ["productionMics", "productionMics"],
                ["productionLighting", "productionLighting"],
                ["productionBackline", "productionBackline"],
                ["productionPower", "productionPower"],
                ["productionStage", "productionStage"],
              ] as const
            ).map(([name, labelKey]) => (
              <label key={name} className="grid gap-1 text-sm">
                <span className="font-medium">{t(labelKey)}</span>
                <input
                  name={name}
                  defaultValue={defaultValues?.[name] ?? ""}
                  className="field"
                />
              </label>
            ))}
          </div>
          <ParagraphTextField
            name="houseRules"
            label={t("houseRules")}
            defaultValue={toParagraphEditorHtml(
              defaultValues?.houseRules ?? "",
            )}
            min={0}
            max={LONG_NOTES_MAX}
            size="short"
          />
          <ParagraphTextField
            name="loadInNotes"
            label={t("loadInNotes")}
            defaultValue={toParagraphEditorHtml(
              defaultValues?.loadInNotes ?? "",
            )}
            min={0}
            max={LONG_NOTES_MAX}
            size="short"
          />
          <ParagraphTextField
            name="accessibilityNotes"
            label={t("accessibilityNotes")}
            defaultValue={toParagraphEditorHtml(
              defaultValues?.accessibilityNotes ?? "",
            )}
            min={0}
            max={NOTES_MAX}
            size="short"
          />
        </Section>

        <Section title={t("sectionLinks")} hint={t("linksHint")}>
          <PrefixedUrlInput
            key={websiteKey}
            platform="website"
            name="websiteUrl"
            label={t("websiteUrl")}
            defaultValue={websiteUrl}
          />
          <div className="grid gap-3">
            {VENUE_SOCIAL_ORDER.map((platform) => (
              <PrefixedUrlInput
                key={platform}
                platform={platform}
                name={socialFieldName(platform)}
                label={t(socialLabelKey(platform))}
                defaultValue={social[platform as keyof SocialLinks]}
              />
            ))}
          </div>
        </Section>
      </form>

      {documentsSlot ? <div className="panel p-6">{documentsSlot}</div> : null}
    </div>
  );
}
