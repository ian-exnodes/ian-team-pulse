import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Privacy Policy · Team Pulse",
  description: "How Team Pulse handles your data.",
};

// Public, auth-free page. Linked from the Atlassian Developer Console
// (OAuth 2.0 distribution → Privacy policy) so teammates can authorize the app.
export default function PrivacyPolicyPage() {
  return (
    <main className="mx-auto max-w-2xl px-6 py-16">
      <h1 className="text-3xl font-semibold text-olivia-cream">Privacy Policy</h1>
      <p className="mt-2 text-sm text-olivia-muted">Last updated: June 15, 2026</p>

      <div className="mt-10 space-y-8 text-olivia-cream/90 leading-relaxed">
        <section>
          <p>
            Team Pulse is an internal team dashboard for tracking standup status
            and (optionally) importing work items from Jira. This page explains
            what data the app handles and why.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-medium text-olivia-cream">What we store</h2>
          <ul className="mt-3 list-disc space-y-2 pl-5 text-olivia-cream/85">
            <li>
              <strong className="text-olivia-cream">Account details</strong> — the
              email address and display name you sign up with, used to
              authenticate you and show who&apos;s who on the board.
            </li>
            <li>
              <strong className="text-olivia-cream">Standup activity</strong> — the
              tasks, statuses, and notes you create in the app.
            </li>
            <li>
              <strong className="text-olivia-cream">Jira connection</strong> — if you
              choose to connect Jira, we store the OAuth access and refresh tokens
              needed to read your Jira issues on your behalf. We request read-only
              access (<code>read:jira-work</code>, <code>read:me</code>). We do not
              modify your Jira data.
            </li>
          </ul>
        </section>

        <section>
          <h2 className="text-xl font-medium text-olivia-cream">How we use it</h2>
          <p className="mt-3">
            Data is used solely to operate the dashboard for your team — displaying
            statuses and letting you import Jira issues you already have access to.
            We do not sell your data, share it with third parties, or use it for
            advertising.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-medium text-olivia-cream">Where it lives</h2>
          <p className="mt-3">
            Data is stored in our Supabase database and is accessible only to
            authenticated members of your team. Jira issue data is fetched live
            from Atlassian when you use the import feature and is not retained
            beyond what you choose to add to the board.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-medium text-olivia-cream">
            Disconnecting and deletion
          </h2>
          <p className="mt-3">
            You can disconnect Jira at any time from the app, which deletes the
            stored OAuth tokens. To delete your account or any associated data,
            contact your team administrator.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-medium text-olivia-cream">Contact</h2>
          <p className="mt-3">
            Questions about this policy or your data can be directed to your team
            administrator.
          </p>
        </section>
      </div>
    </main>
  );
}
