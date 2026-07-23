import Link from "next/link";
import { MaterialIcon } from "@/components/dashboard/enterprise";

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-slate-50 px-4 text-center">
      <div className="mb-8 flex h-24 w-24 items-center justify-center rounded-full bg-slate-100 text-slate-400">
        <MaterialIcon name="explore_off" className="text-5xl" />
      </div>
      <h1 className="mb-4 text-4xl font-extrabold tracking-tight text-slate-900 sm:text-5xl">
        Page not found
      </h1>
      <p className="mb-8 text-lg text-slate-600 max-w-md">
        Sorry, we couldn't find the page you're looking for. It might have been moved or deleted.
      </p>
      <Link
        href="/"
        className="inline-flex h-12 items-center justify-center gap-2 rounded-xl bg-blue-600 px-6 font-bold text-white transition hover:bg-blue-700"
      >
        <MaterialIcon name="home" />
        Back to Home
      </Link>
    </div>
  );
}
