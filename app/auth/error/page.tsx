import Link from "next/link";

export default function AuthErrorPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-olivia-bg px-4">
      <div className="w-full max-w-sm rounded-2xl border border-olivia-border bg-olivia-surface p-8 text-center shadow-sm">
        <h1 className="text-xl font-semibold text-olivia-cream">
          Sign-in link invalid
        </h1>
        <p className="mt-2 text-sm text-olivia-muted">
          The link may have expired or already been used.
        </p>
        <Link
          href="/login"
          className="mt-6 inline-block rounded-lg bg-olivia-pink px-4 py-2 text-sm font-medium text-olivia-bg hover:bg-olivia-pink-deep"
        >
          Request a new link
        </Link>
      </div>
    </main>
  );
}
