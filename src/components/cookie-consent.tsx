"use client";

import { useEffect } from "react";
import * as CookieConsent from "vanilla-cookieconsent";
import "vanilla-cookieconsent/dist/cookieconsent.css";
import { useLocale } from "next-intl";
import { cookieConsentCopy } from "@/src/lib/cookie-consent-copy";

declare global {
  interface Window {
    dataLayer: unknown[];
    gtag?: (...args: unknown[]) => void;
  }
}

type CookieCopy = {
  modalTitle: string;
  modalDescription: string;
  acceptAll: string;
  acceptNecessary: string;
  customize: string;
  privacyLink: string;
  cookiePolicyLink: string;
  preferencesTitle: string;
  savePreferences: string;
  close: string;
  serviceCounter: string;
  usage: string;
  usageDescription: string;
  necessaryTitle: string;
  necessaryDescription: string;
  analyticsTitle: string;
  analyticsDescription: string;
  marketingTitle: string;
  marketingDescription: string;
  functionalityTitle: string;
  functionalityDescription: string;
  moreInfo: string;
  moreInfoDescription: string;
  cookieName: string;
  cookieDomain: string;
  cookieExpiration: string;
  cookieDescription: string;
  gaCookieDesc: string;
  gidCookieDesc: string;
  clarityCookieDesc: string;
};

let consentInitialized = false;

function buildTranslations(locale: string, t: CookieCopy) {
  return {
    consentModal: {
      title: t.modalTitle,
      description: t.modalDescription,
      acceptAllBtn: t.acceptAll,
      acceptNecessaryBtn: t.acceptNecessary,
      showPreferencesBtn: t.customize,
      footer: `<a href="/${locale}/privacy">${t.privacyLink}</a> · <a href="/${locale}/cookies">${t.cookiePolicyLink}</a>`,
    },
    preferencesModal: {
      title: t.preferencesTitle,
      acceptAllBtn: t.acceptAll,
      acceptNecessaryBtn: t.acceptNecessary,
      savePreferencesBtn: t.savePreferences,
      closeIconLabel: t.close,
      serviceCounterLabel: t.serviceCounter,
      sections: [
        {
          title: t.usage,
          description: t.usageDescription,
        },
        {
          title: t.necessaryTitle,
          description: t.necessaryDescription,
          linkedCategory: "necessary",
        },
        {
          title: t.analyticsTitle,
          description: t.analyticsDescription,
          linkedCategory: "analytics",
          cookieTable: {
            headers: {
              name: t.cookieName,
              domain: t.cookieDomain,
              expiration: t.cookieExpiration,
              description: t.cookieDescription,
            },
            body: [
              {
                name: "_ga",
                domain: "salon.berlin",
                expiration: locale === "de" ? "2 Jahre" : "2 years",
                description: t.gaCookieDesc,
              },
              {
                name: "_gid",
                domain: "salon.berlin",
                expiration: locale === "de" ? "24 Stunden" : "24 hours",
                description: t.gidCookieDesc,
              },
              {
                name: "_clck",
                domain: "salon.berlin",
                expiration: locale === "de" ? "1 Jahr" : "1 year",
                description: t.clarityCookieDesc,
              },
            ],
          },
        },
        {
          title: t.marketingTitle,
          description: t.marketingDescription,
          linkedCategory: "marketing",
        },
        {
          title: t.functionalityTitle,
          description: t.functionalityDescription,
          linkedCategory: "functionality",
        },
        {
          title: t.moreInfo,
          description: t.moreInfoDescription
            .replace(
              "{privacyLink}",
              `<a href="/${locale}/privacy">${t.privacyLink}</a>`,
            )
            .replace(
              "{cookieLink}",
              `<a href="/${locale}/cookies">${t.cookiePolicyLink}</a>`,
            ),
        },
      ],
    },
  };
}

function updateConsentMode(categories: string[]) {
  const consentState = {
    ad_storage: categories.includes("marketing") ? "granted" : "denied",
    ad_user_data: categories.includes("marketing") ? "granted" : "denied",
    ad_personalization: categories.includes("marketing") ? "granted" : "denied",
    analytics_storage: categories.includes("analytics") ? "granted" : "denied",
    functionality_storage: categories.includes("functionality")
      ? "granted"
      : "denied",
    personalization_storage: categories.includes("functionality")
      ? "granted"
      : "denied",
    security_storage: "granted" as const,
  };

  if (window.gtag) {
    window.gtag("consent", "update", consentState);
  }
}

/**
 * GDPR-compliant cookie consent banner with Google Consent Mode v2 support.
 * Manages consent for analytics_storage, ad_storage, ad_user_data, ad_personalization,
 * functionality_storage, personalization_storage, and security_storage.
 */
export function CookieConsentBanner() {
  const locale = useLocale();

  useEffect(() => {
    window.dataLayer = window.dataLayer || [];
    function gtag(...args: unknown[]) {
      window.dataLayer.push(args);
    }
    window.gtag = gtag;

    gtag("consent", "default", {
      ad_storage: "denied",
      ad_user_data: "denied",
      ad_personalization: "denied",
      analytics_storage: "denied",
      functionality_storage: "denied",
      personalization_storage: "denied",
      security_storage: "granted",
      wait_for_update: 500,
    });

    const language = locale === "de" ? "de" : "en";

    if (!consentInitialized) {
      CookieConsent.run({
        cookie: {
          name: "cc_cookie",
          path: "/",
          expiresAfterDays: 182,
          sameSite: "Lax",
        },
        guiOptions: {
          consentModal: {
            layout: "box inline",
            position: "bottom left",
            equalWeightButtons: false,
            flipButtons: false,
          },
          preferencesModal: {
            layout: "box",
            equalWeightButtons: false,
            flipButtons: false,
          },
        },
        categories: {
          necessary: {
            enabled: true,
            readOnly: true,
          },
          analytics: {
            enabled: false,
            readOnly: false,
            autoClear: {
              cookies: [
                {
                  name: /^(_ga|_gid|_gat)/,
                },
              ],
            },
          },
          marketing: {
            enabled: false,
            readOnly: false,
            autoClear: {
              cookies: [
                {
                  name: /^(_fbp|_fbc|fr)/,
                },
              ],
            },
          },
          functionality: {
            enabled: false,
            readOnly: false,
          },
        },
        language: {
          default: language,
          translations: {
            en: buildTranslations("en", cookieConsentCopy.en),
            de: buildTranslations("de", cookieConsentCopy.de),
          },
        },
        onFirstConsent: ({ cookie }) => {
          updateConsentMode(cookie.categories);
        },
        onConsent: ({ cookie }) => {
          updateConsentMode(cookie.categories);
        },
        onChange: ({ cookie }) => {
          updateConsentMode(cookie.categories);
        },
      });
      consentInitialized = true;
      return;
    }

    void CookieConsent.setLanguage(language);
  }, [locale]);

  return null;
}
