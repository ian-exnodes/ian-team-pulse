import Link from "next/link";

export default function AuthErrorPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-50 px-4">
      <div className="w-full max-w-sm rounded-2xl bg-white p-8 text-center shadow-sm">
        <h1 className="text-xl font-semibold text-slate-900">
          Sign-in link invalid
        </h1>
        <p className="mt-2 text-sm text-slate-500">
          The link may have expired or already been used.
        </p>
        <Link
          href="/login"
          className="mt-6 inline-block rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-700"
        >
          Request a new link
        </Link>
      </div>
    </main>
  );
}
