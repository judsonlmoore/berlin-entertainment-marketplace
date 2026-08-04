# Marketplace Requirements

## 1. Product purpose

The platform is a private marketplace where:

- Entertainers discover performance opportunities from approved venues.
- Venues discover approved entertainers and request performances.
- Both parties agree terms and sign a booking agreement before a performance.
- Contact information is disclosed only after the recipient accepts the relevant application or request.
- Platform administrators approve every venue and entertainer before they enter the marketplace.

The marketplace is role-segregated:

- Entertainers can discover venues and venue opportunities, but not other entertainers.
- Venues can discover entertainers, but not other venues.

## 2. User roles

### Entertainer

An entertainer may:

- Create and maintain an entertainer profile.
- Search approved venues and open opportunities.
- Apply to perform at an opportunity.
- Receive, accept, or decline direct booking requests.
- Negotiate or approve booking terms.
- Sign booking agreements.
- Manage availability and synchronize an external calendar.
- Upload portfolio media and technical documents.
- Access venue contact information only after the venue accepts the entertainer’s application or request.

### Venue

A venue user may:

- Create and maintain one or more venue profiles, subject to permissions.
- Search approved entertainers.
- Publish performance opportunities.
- Review and shortlist entertainer applications.
- Send direct booking requests.
- Negotiate or approve booking terms.
- Sign booking agreements.
- Manage availability and synchronize an external calendar.
- Access entertainer contact information only after the entertainer accepts the venue’s request or the venue shortlists the entertainer’s application.

### Platform administrator

An administrator may:

- Review applications from entertainers and venues.
- Approve, reject, request changes from, suspend, or reinstate accounts.
- Review profiles and uploaded content.
- Moderate opportunities and booking records.
- Investigate reported content or activity.
- View an audit history of approvals and important booking actions.
- Manage agreement templates and supported integration settings.

## 3. Membership and account status

### Account status

Accounts must support:

- `active`
- `suspended`

### Requirements

- Self-serve signup creates an active account with exactly one role (entertainer XOR venue). Staff account approval is not required to enter the marketplace.
- Active users may access private marketplace search and explore. Contact workflows require staff-verified profile publication.
- Unverified profiles must not appear in discovery listings.
- A person may hold only one marketplace role type per account.
- Suspended users must immediately lose access to private marketplace information.
- Every account-status or profile-publication change must record the administrator, timestamp, reason, and previous state.
- Material profile changes may optionally require re-verification before publication.

## 4. Entertainer profiles

An entertainer profile must support:

- Act or professional name
- Entertainer category and genres
- Description and biography
- Number of performers
- Berlin base and travel radius
- Performance formats and typical set duration
- Indicative price range and currency
- Technical requirements summary
- Languages
- Accessibility information
- Equipment supplied by the entertainer
- External website
- Social-media links
- YouTube links rendered using privacy-conscious embedded video
- Uploaded portfolio images
- Additional portfolio links
- Technical rider and related document uploads
- Preferred private contact methods
- Availability calendar
- Approval and profile-completion status

### Portfolio requirements

- Users must be able to reorder and remove portfolio items.
- Images must have captions and accessible alternative text.
- YouTube URLs must be validated before rendering.
- Video embedding must use a privacy-enhanced mode where supported.
- The platform must not download or rehost YouTube videos.
- Uploaded media must enforce file-type and size limits.
- Portfolio content must remain private to approved venue users.

### Document requirements

- Initially support PDF technical riders and related production documents.
- Store documents privately.
- Require authorization for every document download.
- Record file name, type, size, uploader, upload date, and scan status.
- Prevent executable or unsupported files.
- Support replacement and version history where operationally necessary.
- Documents must not expose permanent public storage URLs.

## 5. Venue profiles

A venue profile must support:

- Venue name and description
- Structured address
- Berlin district and map location
- Venue type
- Audience description
- Capacity, including seated or standing context
- Available spaces or stages
- Stage dimensions
- Sound system, mixer, microphones, lighting, backline, and power
- Load-in and accessibility information
- House rules and operational restrictions
- External website
- Social-media links
- Uploaded venue images
- Preferred private contact methods
- Availability calendar
- Approval and profile-completion status

Where venues have multiple performance spaces, each space should support its own capacity, technical resources, and calendar.

## 6. Private discovery

### Entertainer discovery experience

Entertainers may search only:

- Approved venue profiles
- Approved venue spaces
- Open performance opportunities

Entertainers must not:

- Browse or search other entertainer profiles
- Receive entertainer profiles through recommendations
- Access entertainer-profile URLs belonging to other people
- Infer other entertainers through API responses or client-side data

Venue and opportunity filters should include:

- Date and availability
- Berlin district
- Venue type
- Capacity
- Audience
- Performance category
- Budget
- Technical resources
- Accessibility
- Application deadline

### Venue discovery experience

Venues may search only approved entertainer profiles.

Venues must not:

- Browse or search other venue profiles
- Receive venue profiles through recommendations
- Access other venues’ private profile URLs
- Infer other venues through API responses or client-side data, except where necessary for a shared booking involving that user

Entertainer filters should include:

- Date and availability
- Category or genre
- Group size
- Price range
- Location and travel radius
- Performance duration
- Technical requirements
- Languages
- Portfolio characteristics

### Enforcement

These restrictions must be enforced on the server and in database queries. Hiding navigation links is insufficient.

## 7. Open opportunities and applications

### Venue requirements

A venue may create an opportunity containing:

- Venue and performance space
- Performance date
- Start, end, load-in, and soundcheck times
- Category or desired performance type
- Expected audience
- Budget or budget range
- Desired group size
- Technical resources
- Application deadline
- Additional requirements
- Draft, open, closed, or cancelled status

### Entertainer requirements

An entertainer may:

- View open opportunities from approved venues.
- Submit one application per act per opportunity.
- Include a message, proposed fee, availability confirmation, and portfolio references.
- Save an application draft.
- Withdraw an application before an agreed cutoff.
- View the application’s current status.

### Venue review

A venue may:

- Review applications.
- Shortlist or reject an application.
- Request clarification without revealing private contact details.
- Convert a shortlisted application into the shared booking workflow.

Shortlisting an application unlocks the parties’ selected contact methods.

## 8. Direct booking requests

A venue may send an approved entertainer a direct request containing:

- Venue and space
- Proposed date and times
- Performance format
- Proposed fee
- Technical context
- Message
- Response deadline

The entertainer may:

- Accept
- Decline
- Propose changes
- Allow the request to expire

Contact information remains hidden until the entertainer accepts the request.

## 9. Contact-information privacy

- Contact details must be stored separately from discoverable profile data.
- Search results, profile APIs, metadata, logs, and page source must not contain locked contact information.
- A venue may see an entertainer’s selected contact method only after:

  - The entertainer accepts a direct request; or
  - The venue shortlists the entertainer’s application.

- An entertainer may see a venue’s selected contact method only after:

  - The venue accepts or shortlists the entertainer’s application; or
  - The entertainer accepts the venue’s direct request.

- Every disclosure must record both parties, the triggering event, and the timestamp.
- Revoking or cancelling an engagement must not erase the disclosure audit history.
- The platform will not provide in-product chat. Once unlocked, communication moves to the chosen external channel.

## 10. Unified booking workflow

Applications and direct requests must enter one booking engine while preserving their origin.

### Lifecycle

1. Application submitted or direct request sent
2. Application shortlisted or request accepted
3. Terms proposed
4. Terms agreed
5. Agreement generated
6. First party signed
7. Both parties signed
8. Booking confirmed
9. Completed or cancelled

Additional states may include:

- Declined
- Rejected
- Withdrawn
- Expired
- Disputed

### Booking terms

The agreed terms must snapshot:

- Parties and represented organizations
- Venue and space
- Performance date and times
- Fee and currency
- Deposit requirements
- Performance format and duration
- Technical responsibilities
- Cancellation terms
- Additional agreed conditions

Later profile changes must not alter previously agreed terms.

## 11. Agreements and signatures

- Both parties must sign the same version of the booking agreement.
- The booking becomes confirmed only after all required signatures are recorded.
- The agreement must contain German controlling text.
- An English convenience translation must be associated with the same terms and template version.
- The UI must clearly identify which language controls.
- Agreement templates must be versioned.
- Agreement generation and signatures should use a provider abstraction.
- Provider callbacks must be authenticated and processed only once.
- The MVP must not claim that agreement text guarantees legal compliance.
- Production agreement templates require review by qualified German legal counsel.
- The product must not claim live electronic signatures until a provider is provisioned and tested.

## 12. Deposits and payments

- A booking’s deposit status must be tracked separately from its confirmation status.
- Supported deposit states should include:

  - Not required
  - Pending
  - Received
  - Refunded
  - Disputed

- Receiving a deposit must not confirm a booking.
- A booking must not remain unconfirmed after both valid signatures merely because a deposit is pending.
- The initial product will not collect, hold, escrow, refund, or distribute money.
- Payment references must not contain sensitive banking or card information.

## 13. Calendar and availability

### Native calendar

Both entertainers and venue spaces must support:

- Available
- Unavailable
- Tentative hold
- Requested
- Confirmed

Requirements:

- Tentative holds must have expiry times.
- Expired holds must stop blocking availability.
- Requests should appear in both parties’ calendars.
- Confirmed bookings must block the relevant entertainer and venue space.
- The platform must prevent overlapping confirmed bookings.
- Date and time storage must account for the `Europe/Berlin` timezone and daylight-saving transitions.

### External calendar synchronization

Entertainers and venues should be able to connect supported external calendars.

Initial integration priorities should be selected from:

- Google Calendar
- Microsoft Outlook/Microsoft 365
- Apple/iCloud through an appropriate supported integration path

The integration should use a well-maintained calendar integration provider or official APIs rather than a home-grown synchronization engine.

Required behavior:

- Users explicitly choose which external calendar to connect.
- Users control whether synchronization is one-way or two-way where supported.
- Imported busy events should block availability without exposing private event details.
- Salon-confirmed bookings should be exported with appropriate title, time, location, and booking link.
- Updates and cancellations should synchronize safely.
- Duplicate events must be prevented.
- Sync failures must be visible and retryable.
- Disconnecting a calendar must revoke stored authorization.
- OAuth tokens must be encrypted and remain server-only.
- The platform must record the last successful synchronization time.
- The platform must define conflict behavior when Salon and an external calendar change simultaneously.

Calendar synchronization should be treated as a separate integration milestone because it materially increases authorization, privacy, reliability, and concurrency requirements.

## 14. Administration and moderation

Administrators require tools to:

- Review entertainer applications
- Review venue applications
- Review profile completeness and uploaded content
- Approve, reject, request changes, suspend, or reinstate
- Record review notes and reasons
- Inspect role and venue membership
- Moderate opportunities
- Inspect booking and calendar conflicts
- Review contact-disclosure events
- Reconcile signature-provider events
- Investigate calendar synchronization failures
- Remove or quarantine unsafe uploaded files
- View an immutable audit trail

Administrators must not routinely impersonate users or expose private contact information without an auditable operational reason.

## 15. Page metadata

Every page must define an appropriate browser title and description.

Requirements:

- Public pages should include indexable, localized metadata where appropriate.
- Private pages should have descriptive localized browser titles but must be marked `noindex, nofollow`.
- Private data, profile names, contact information, booking details, or uploaded document names must not leak into metadata.
- Metadata should include:

  - Localized page title
  - Localized description
  - Relevant keywords where they add value
  - Canonical URL for public pages
  - Locale alternates for public English and German pages

- Metadata titles should follow a consistent format such as `Page name | Salon`.
- Authentication, dashboard, profile, opportunity, booking, and admin pages must never become search-indexable merely because metadata exists.

## 16. Internationalization

- English is the default and fallback language.
- German must cover public pages and all critical marketplace workflows.
- User-entered profile content is not translated automatically.
- Dates, times, numbers, prices, validation messages, metadata, and transactional notifications must be localized.
- Missing required translations should fail automated validation.
- Agreement language must continue to follow the German-controlling rule.

## 17. Accessibility and responsive behavior

- Meet WCAG 2.2 AA for critical workflows.
- Support keyboard-only operation.
- Provide visible focus indicators.
- Provide accessible names for icon controls.
- Require alternative text for meaningful portfolio images.
- Embedded media must have descriptive titles.
- Form validation must identify the field, problem, and corrective action.
- Statuses must not depend on color alone.
- Touch targets should be at least 44 × 44 pixels.
- Critical workflows must work at mobile, tablet, and desktop widths.
- Support loading, empty, error, forbidden, suspended, upload-failure, sync-failure, and conflict states.

## 18. Technology and integration principles

- Prefer actively maintained libraries with substantial community adoption, good documentation, regular security updates, and compatibility with the selected architecture.
- Prefer official SDKs or established providers for authentication, calendar synchronization, file storage, email, video embedding, and electronic signatures.
- Do not adopt a dependency only because it shortens initial development; assess maintenance, licensing, accessibility, bundle impact, data residency, portability, and failure behavior.
- Wrap external services behind narrow internal interfaces so providers can be replaced.
- Avoid custom implementations of security-sensitive protocols such as OAuth, calendar recurrence, upload signing, and webhook verification.
- Record major dependency and provider decisions in architecture decision records.

## 19. Security and privacy

- Enforce authentication and authorization on the server.
- Validate all inputs and uploaded files.
- Prevent unauthorized direct-object access.
- Rate-limit authentication, application, request, upload, and integration endpoints.
- Authenticate external webhooks.
- Encrypt data in transit and sensitive credentials at rest.
- Do not log contact details, OAuth tokens, signed document URLs, or private event contents.
- Maintain audit records for approvals, disclosures, contracts, calendar changes, and administrative actions.
- Establish retention and deletion procedures consistent with GDPR obligations.

## 20. Suggested delivery phases

1. Authentication, roles, and administrator approval
2. Entertainer and venue profiles
3. Role-segregated private discovery
4. Opportunities and applications
5. Direct requests
6. Unified booking terms and lifecycle
7. Agreement generation and signature-provider sandbox
8. Native availability and conflict prevention
9. Portfolio media and private documents
10. External calendar synchronization
11. Administration, audit, accessibility, and operational hardening

Calendar synchronization should not block validating the core marketplace and booking flow, but its data model and integration boundary should be planned early.