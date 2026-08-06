/**
 * Notification templates and helpers for generating notification content
 * These templates provide the structure for notifications in multiple languages
 */

import type { notificationTypeEnum } from "@/src/db/schema";

export interface NotificationTemplate {
  /**
   * Get localized notification title
   */
  getTitle(locale: string, params: Record<string, string>): string;

  /**
   * Get localized notification body
   */
  getBody(locale: string, params: Record<string, string>): string;

  /**
   * Get action URL
   */
  getActionUrl?(params: Record<string, string>): string;

  /**
   * Get action label
   */
  getActionLabel?(locale: string): string;

  /**
   * Get email subject
   */
  getEmailSubject?(locale: string, params: Record<string, string>): string;

  /**
   * Get email text content
   */
  getEmailText?(locale: string, params: Record<string, string>): string;

  /**
   * Get email HTML content
   */
  getEmailHtml?(locale: string, params: Record<string, string>): string;
}

/**
 * Template registry
 */
const templates: Record<
  (typeof notificationTypeEnum.enumValues)[number],
  NotificationTemplate
> = {
  booking_request_received: {
    getTitle: (locale) => {
      return locale === "de"
        ? `Neue Buchungsanfrage erhalten`
        : `New booking request received`;
    },
    getBody: (locale, params) => {
      return locale === "de"
        ? `Sie haben eine neue Buchungsanfrage von ${params.venueName || params.entertainerName} erhalten.`
        : `You have received a new booking request from ${params.venueName || params.entertainerName}.`;
    },
    getActionUrl: (params) => `/bookings/${params.bookingId}`,
    getActionLabel: (locale) =>
      locale === "de" ? "Buchung ansehen" : "View booking",
  },

  booking_accepted: {
    getTitle: (locale) =>
      locale === "de" ? `Buchung akzeptiert` : `Booking accepted`,
    getBody: (locale, params) => {
      return locale === "de"
        ? `Ihre Buchungsanfrage wurde von ${params.venueName || params.entertainerName} akzeptiert.`
        : `Your booking request has been accepted by ${params.venueName || params.entertainerName}.`;
    },
    getActionUrl: (params) => `/bookings/${params.bookingId}`,
    getActionLabel: (locale) =>
      locale === "de" ? "Buchung ansehen" : "View booking",
  },

  booking_declined: {
    getTitle: (locale) =>
      locale === "de" ? `Buchung abgelehnt` : `Booking declined`,
    getBody: (locale, params) => {
      return locale === "de"
        ? `Ihre Buchungsanfrage wurde von ${params.venueName || params.entertainerName} abgelehnt.`
        : `Your booking request has been declined by ${params.venueName || params.entertainerName}.`;
    },
    getActionUrl: (params) => `/bookings/${params.bookingId}`,
    getActionLabel: (locale) =>
      locale === "de" ? "Buchung ansehen" : "View booking",
  },

  booking_confirmed: {
    getTitle: (locale) =>
      locale === "de" ? `Buchung bestätigt` : `Booking confirmed`,
    getBody: (locale, params) => {
      return locale === "de"
        ? `Ihre Buchung für ${params.date} wurde bestätigt. Beide Parteien haben die Vereinbarung unterzeichnet.`
        : `Your booking for ${params.date} has been confirmed. Both parties have signed the agreement.`;
    },
    getActionUrl: (params) => `/bookings/${params.bookingId}`,
    getActionLabel: (locale) =>
      locale === "de" ? "Buchung ansehen" : "View booking",
  },

  booking_cancelled: {
    getTitle: (locale) =>
      locale === "de" ? `Buchung storniert` : `Booking cancelled`,
    getBody: (locale, params) => {
      return locale === "de"
        ? `Ihre Buchung für ${params.date} wurde storniert.`
        : `Your booking for ${params.date} has been cancelled.`;
    },
    getActionUrl: (params) => `/bookings/${params.bookingId}`,
    getActionLabel: (locale) =>
      locale === "de" ? "Details ansehen" : "View details",
  },

  booking_post_gig_survey_ready: {
    getTitle: (locale) =>
      locale === "de"
        ? `Feedback-Umfrage ist bereit`
        : `Post-gig survey is ready`,
    getBody: (locale, params) => {
      return locale === "de"
        ? `Dein Auftritt ist vorbei. Bitte fülle die private Feedback-Umfrage für die Buchung (${params.bookingId}) aus.`
        : `Your gig is over. Please fill out the private post-gig feedback survey for booking (${params.bookingId}).`;
    },
    getActionUrl: (params) => `/marketplace/bookings/${params.bookingId}`,
    getActionLabel: (locale) =>
      locale === "de" ? "Feedback geben" : "Give feedback",
  },

  application_submitted: {
    getTitle: (locale) =>
      locale === "de"
        ? `Neue Bewerbung eingereicht`
        : `New application submitted`,
    getBody: (locale, params) => {
      return locale === "de"
        ? `${params.entertainerName} hat sich für Ihre Gelegenheit "${params.opportunityTitle}" beworben.`
        : `${params.entertainerName} has applied for your opportunity "${params.opportunityTitle}".`;
    },
    getActionUrl: (params) =>
      `/opportunities/${params.opportunityId}/applications`,
    getActionLabel: (locale) =>
      locale === "de" ? "Bewerbungen ansehen" : "View applications",
  },

  application_shortlisted: {
    getTitle: (locale) =>
      locale === "de" ? `Bewerbung in Vorauswahl` : `Application shortlisted`,
    getBody: (locale, params) => {
      return locale === "de"
        ? `Ihre Bewerbung für "${params.opportunityTitle}" wurde in die engere Wahl gezogen.`
        : `Your application for "${params.opportunityTitle}" has been shortlisted.`;
    },
    getActionUrl: (params) => `/applications/${params.applicationId}`,
    getActionLabel: (locale) =>
      locale === "de" ? "Bewerbung ansehen" : "View application",
  },

  application_rejected: {
    getTitle: (locale) =>
      locale === "de" ? `Bewerbung abgelehnt` : `Application rejected`,
    getBody: (locale, params) => {
      return locale === "de"
        ? `Ihre Bewerbung für "${params.opportunityTitle}" wurde abgelehnt.`
        : `Your application for "${params.opportunityTitle}" has been rejected.`;
    },
    getActionUrl: (params) => `/applications/${params.applicationId}`,
    getActionLabel: (locale) =>
      locale === "de" ? "Details ansehen" : "View details",
  },

  agreement_ready: {
    getTitle: (locale) =>
      locale === "de"
        ? `Vereinbarung bereit zur Unterzeichnung`
        : `Agreement ready to sign`,
    getBody: (locale, params) => {
      return locale === "de"
        ? `Die Buchungsvereinbarung für ${params.date} ist zur Unterzeichnung bereit.`
        : `The booking agreement for ${params.date} is ready for your signature.`;
    },
    getActionUrl: (params) => `/bookings/${params.bookingId}/agreement`,
    getActionLabel: (locale) =>
      locale === "de" ? "Jetzt unterzeichnen" : "Sign now",
  },

  agreement_signed: {
    getTitle: (locale) =>
      locale === "de" ? `Vereinbarung unterzeichnet` : `Agreement signed`,
    getBody: (locale, params) => {
      return locale === "de"
        ? `${params.partyName} hat die Buchungsvereinbarung unterzeichnet.`
        : `${params.partyName} has signed the booking agreement.`;
    },
    getActionUrl: (params) => `/bookings/${params.bookingId}/agreement`,
    getActionLabel: (locale) =>
      locale === "de" ? "Vereinbarung ansehen" : "View agreement",
  },

  approval_approved: {
    getTitle: (locale) =>
      locale === "de" ? `Konto genehmigt` : `Account approved`,
    getBody: (locale) => {
      return locale === "de"
        ? `Ihr Konto wurde genehmigt! Sie können jetzt auf den Marktplatz zugreifen.`
        : `Your account has been approved! You can now access the marketplace.`;
    },
    getActionUrl: () => `/marketplace`,
    getActionLabel: (locale) =>
      locale === "de" ? "Marktplatz erkunden" : "Explore marketplace",
  },

  approval_changes_requested: {
    getTitle: (locale) =>
      locale === "de" ? `Änderungen angefordert` : `Changes requested`,
    getBody: (locale, params) => {
      return locale === "de"
        ? `Das Überprüfungsteam hat Änderungen an Ihrem Profil angefordert: ${params.reason}`
        : `The review team has requested changes to your profile: ${params.reason}`;
    },
    getActionUrl: () => `/profile`,
    getActionLabel: (locale) =>
      locale === "de" ? "Profil bearbeiten" : "Edit profile",
  },

  approval_suspended: {
    getTitle: (locale) =>
      locale === "de" ? `Konto gesperrt` : `Account suspended`,
    getBody: (locale, params) => {
      return locale === "de"
        ? `Ihr Konto wurde gesperrt: ${params.reason}`
        : `Your account has been suspended: ${params.reason}`;
    },
  },

  direct_request_received: {
    getTitle: (locale) =>
      locale === "de" ? `Neue Direktanfrage` : `New direct request`,
    getBody: (locale, params) => {
      return locale === "de"
        ? `${params.venueName} hat Ihnen eine Direktanfrage für ${params.date} gesendet.`
        : `${params.venueName} has sent you a direct request for ${params.date}.`;
    },
    getActionUrl: (params) => `/requests/${params.requestId}`,
    getActionLabel: (locale) =>
      locale === "de" ? "Anfrage ansehen" : "View request",
  },

  direct_request_accepted: {
    getTitle: (locale) =>
      locale === "de" ? `Direktanfrage akzeptiert` : `Direct request accepted`,
    getBody: (locale, params) => {
      return locale === "de"
        ? `${params.entertainerName} hat Ihre Direktanfrage für ${params.date} akzeptiert.`
        : `${params.entertainerName} has accepted your direct request for ${params.date}.`;
    },
    getActionUrl: (params) => `/requests/${params.requestId}`,
    getActionLabel: (locale) =>
      locale === "de" ? "Anfrage ansehen" : "View request",
  },

  direct_request_declined: {
    getTitle: (locale) =>
      locale === "de" ? `Direktanfrage abgelehnt` : `Direct request declined`,
    getBody: (locale, params) => {
      return locale === "de"
        ? `${params.entertainerName} hat Ihre Direktanfrage für ${params.date} abgelehnt.`
        : `${params.entertainerName} has declined your direct request for ${params.date}.`;
    },
    getActionUrl: (params) => `/requests/${params.requestId}`,
    getActionLabel: (locale) =>
      locale === "de" ? "Details ansehen" : "View details",
  },

  profile_enquiry_received: {
    getTitle: (locale, params) =>
      params.direction === "venue"
        ? locale === "de"
          ? `Neue Verbindungsanfrage`
          : `New connection request`
        : locale === "de"
          ? `Neues Profil-Interesse`
          : `New profile enquiry`,
    getBody: (locale, params) => {
      if (params.direction === "venue") {
        return locale === "de"
          ? `${params.venueName} möchte Kontakt mit Ihnen aufnehmen.`
          : `${params.venueName} wants to connect with you.`;
      }
      return locale === "de"
        ? `${params.entertainerName} hat das Profil an ${params.venueName} gesendet.`
        : `${params.entertainerName} submitted their profile to ${params.venueName}.`;
    },
    getActionUrl: (params) =>
      params.bookingId
        ? `/marketplace/bookings/${params.bookingId}`
        : `/marketplace/bookings`,
    getActionLabel: (locale) =>
      locale === "de" ? "Booking ansehen" : "View booking",
  },

  profile_enquiry_interested: {
    getTitle: (locale, params) =>
      params.direction === "act"
        ? locale === "de"
          ? `Act interessiert`
          : `Act is interested`
        : locale === "de"
          ? `Venue interessiert`
          : `Venue is interested`,
    getBody: (locale, params) => {
      if (params.direction === "act") {
        return locale === "de"
          ? `${params.entertainerName} möchte sprechen. Kontakte sind freigeschaltet.`
          : `${params.entertainerName} wants to talk. Contacts are unlocked.`;
      }
      return locale === "de"
        ? `${params.venueName} möchte mit Ihnen sprechen. Kontakte sind freigeschaltet.`
        : `${params.venueName} wants to talk. Contacts are unlocked.`;
    },
    getActionUrl: (params) =>
      params.bookingId
        ? `/marketplace/bookings/${params.bookingId}`
        : `/marketplace/bookings`,
    getActionLabel: (locale) =>
      locale === "de" ? "Booking ansehen" : "View booking",
  },

  profile_enquiry_passed: {
    getTitle: (locale) =>
      locale === "de" ? `Kein Interesse` : `Not a fit right now`,
    getBody: (locale, params) => {
      if (params.direction === "act") {
        return locale === "de"
          ? `${params.entertainerName} hat die Anfrage abgelehnt.`
          : `${params.entertainerName} passed on the connection request.`;
      }
      return locale === "de"
        ? `${params.venueName} hat Ihr Profil-Interesse abgelehnt.`
        : `${params.venueName} passed on your profile enquiry.`;
    },
    getActionUrl: () => `/marketplace/bookings`,
    getActionLabel: (locale) =>
      locale === "de" ? "Bookings ansehen" : "View bookings",
  },

  opportunity_published: {
    getTitle: (locale) =>
      locale === "de"
        ? `Neue Gelegenheit veröffentlicht`
        : `New opportunity published`,
    getBody: (locale, params) => {
      return locale === "de"
        ? `Eine neue Gelegenheit wurde veröffentlicht: "${params.opportunityTitle}" am ${params.date}.`
        : `A new opportunity has been published: "${params.opportunityTitle}" on ${params.date}.`;
    },
    getActionUrl: (params) => `/opportunities/${params.opportunityId}`,
    getActionLabel: (locale) =>
      locale === "de" ? "Gelegenheit ansehen" : "View opportunity",
  },

  calendar_conflict_detected: {
    getTitle: (locale) =>
      locale === "de"
        ? `Kalenderkonflikt erkannt`
        : `Calendar conflict detected`,
    getBody: (locale, params) => {
      return locale === "de"
        ? `Ein Konflikt wurde für ${params.date} erkannt. Bitte überprüfen Sie Ihren Kalender.`
        : `A conflict has been detected for ${params.date}. Please review your calendar.`;
    },
    getActionUrl: () => `/calendar`,
    getActionLabel: (locale) =>
      locale === "de" ? "Kalender ansehen" : "View calendar",
  },

  hold_expiring_soon: {
    getTitle: (locale) =>
      locale === "de"
        ? `Vorläufige Buchung läuft bald ab`
        : `Hold expiring soon`,
    getBody: (locale, params) => {
      return locale === "de"
        ? `Ihre vorläufige Buchung für ${params.date} läuft in ${params.hoursRemaining} Stunden ab.`
        : `Your tentative hold for ${params.date} expires in ${params.hoursRemaining} hours.`;
    },
    getActionUrl: (params) => `/bookings/${params.bookingId}`,
    getActionLabel: (locale) =>
      locale === "de" ? "Buchung ansehen" : "View booking",
  },

  venue_member_invited: {
    getTitle: (locale) =>
      locale === "de" ? `Einladung zum Veranstaltungsort` : `Venue invitation`,
    getBody: (locale, params) => {
      return locale === "de"
        ? `Sie wurden eingeladen, Mitglied von ${params.venueName} zu werden.`
        : `You have been invited to become a member of ${params.venueName}.`;
    },
    getActionUrl: (params) => `/venues/${params.venueId}/membership`,
    getActionLabel: (locale) =>
      locale === "de" ? "Einladung ansehen" : "View invitation",
  },

  venue_member_removed: {
    getTitle: (locale) =>
      locale === "de" ? `Mitgliedschaft entfernt` : `Membership removed`,
    getBody: (locale, params) => {
      return locale === "de"
        ? `Ihre Mitgliedschaft bei ${params.venueName} wurde entfernt.`
        : `Your membership at ${params.venueName} has been removed.`;
    },
  },
};

/**
 * Get notification template by type
 */
export function getNotificationTemplate(
  type: (typeof notificationTypeEnum.enumValues)[number],
): NotificationTemplate {
  const template = templates[type];
  if (!template) {
    throw new Error(`No template found for notification type: ${type}`);
  }
  return template;
}

/**
 * Generate notification content from template
 */
export function generateNotificationContent(params: {
  type: (typeof notificationTypeEnum.enumValues)[number];
  locale: string;
  params: Record<string, string>;
}) {
  const template = getNotificationTemplate(params.type);

  return {
    title: template.getTitle(params.locale, params.params),
    body: template.getBody(params.locale, params.params),
    actionUrl: template.getActionUrl?.(params.params),
    actionLabel: template.getActionLabel?.(params.locale),
    emailSubject: template.getEmailSubject?.(params.locale, params.params),
    emailText: template.getEmailText?.(params.locale, params.params),
    emailHtml: template.getEmailHtml?.(params.locale, params.params),
  };
}
