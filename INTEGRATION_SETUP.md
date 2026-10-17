# Department integration setup

1. Apply `supabase/migrations/20261017120000_resident_fields_integrations.sql` to the connected Supabase project before using the new fields/settings.
2. Enable Google Sheets API for a Google service account. Share each private spreadsheet with its service-account email as Viewer.
3. Configure server-only environment secrets containing the complete service account JSON:
   - `GOOGLE_SERVICE_ACCOUNT_HELPDESK`
   - `GOOGLE_SERVICE_ACCOUNT_FACILITY_MANAGER`
   - `GOOGLE_SERVICE_ACCOUNT_SECURITY`
   These can use different accounts. Never prefix credentials with `VITE_`.
4. Ensure `SUPABASE_URL` and `SUPABASE_PUBLISHABLE_KEY` are available on the server.
5. In Admin > App Integration, save each department's spreadsheet ID (the ID from its Google Sheets URL), exact tab name, WhatsApp number, Meta Phone Number ID, Business Account ID and existing automation webhook URL. Enable the Sheets summary for that department.
6. Put column titles in the first row. A `Status` column enables status counts. Each view reads up to 5,000 data rows and 52 columns and displays the retrieval time; use Refresh for new data.

WhatsApp fields configure the department's connection identity and existing webhook. They do not create or deploy a Meta webhook, send messages, or synchronize WhatsApp conversations into Sheets. Configure that automation separately with server-held Meta access tokens. Saving settings does not test the external WhatsApp connection.

Resident CSV templates include `bhk` and `flat_sqft`. Supported values are `2 BHK`, `2.5 BHK`, `3 BHK`, `3.5 BHK`; square feet must be positive. The template is an Excel-compatible CSV. Legacy imports may leave the new fields blank. Resident BHK/area are stored on the resident record and initialized from an eligible linked flat during migration; later resident edits do not change the shared flat directory.

Help Desk and Security routes are read-only sheet summaries; existing gate/helpdesk database records remain available to reports. Facility Manager retains the existing task workflow below its independent sheet summary.
