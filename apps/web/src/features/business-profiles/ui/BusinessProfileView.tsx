import Image from "next/image";
import Link from "next/link";
import {
  ArrowRight,
  Building2,
  CalendarCheck2,
  CheckCircle2,
  MapPin,
  ShieldCheck,
  Globe,
  Mail,
  Phone,
} from "lucide-react";
import type { BusinessProfilePublicView } from "../types/business-profile.types";
import { isOptimizableImageSrc } from "@/src/lib/image-host";

export function BusinessProfileView({
  profile,
  isPreview = false,
}: {
  profile: BusinessProfilePublicView;
  isPreview?: boolean;
}) {
  return (
    <main className="mx-auto min-w-0 max-w-7xl space-y-10 px-4 pb-20 pt-6 font-sans sm:px-6 sm:pt-8 lg:px-8">
      {isPreview && (
        <div className="bg-amber-100 text-amber-900 px-4 py-2 rounded-md font-medium text-sm mb-4">
          Preview Mode: This is how your public profile will appear to customers.
        </div>
      )}

      {/* Hero Section */}
      <section className="relative overflow-hidden rounded-3xl bg-slate-900 pt-[30%] sm:pt-[20%]">
        {profile.coverImagePath ? (
          <Image
            src={profile.coverImagePath}
            alt="Cover"
            fill
            className="object-cover opacity-50"
            unoptimized={!isOptimizableImageSrc(profile.coverImagePath)}
          />
        ) : (
          <div className="absolute inset-0 bg-gradient-to-r from-blue-900 to-slate-900" />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-slate-950/90 to-transparent" />
        
        <div className="absolute bottom-0 left-0 w-full p-6 sm:p-10">
          <div className="flex items-end gap-6">
            <div className="relative h-24 w-24 shrink-0 overflow-hidden rounded-2xl border-4 border-slate-950 bg-white sm:h-32 sm:w-32">
              {profile.logoPath ? (
                <Image
                  src={profile.logoPath}
                  alt={profile.displayName}
                  fill
                  className="object-cover"
                  unoptimized={!isOptimizableImageSrc(profile.logoPath)}
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center bg-blue-100 text-3xl font-black text-blue-700">
                  {profile.displayName.substring(0, 2).toUpperCase()}
                </div>
              )}
            </div>
            
            <div className="mb-2 flex-1">
              <div className="flex items-center gap-3">
                <h1 className="text-3xl font-black text-white sm:text-5xl">
                  {profile.displayName}
                </h1>
                {profile.verificationStatus === "verified" && (
                  <ShieldCheck className="h-6 w-6 text-emerald-400" />
                )}
              </div>
              {profile.tagline && (
                <p className="mt-2 text-lg font-medium text-slate-300">
                  {profile.tagline}
                </p>
              )}
            </div>
          </div>
        </div>
      </section>

      <div className="grid gap-10 lg:grid-cols-[1fr_320px]">
        <div className="space-y-10">
          {/* About Section */}
          <section>
            <h2 className="text-2xl font-bold text-slate-900 mb-4">About Us</h2>
            <div className="prose prose-slate max-w-none text-slate-600">
              {profile.about ? (
                <p className="whitespace-pre-wrap">{profile.about}</p>
              ) : (
                <p className="italic">No description provided.</p>
              )}
            </div>
          </section>

          {/* Venues Section */}
          <section>
            <h2 className="text-2xl font-bold text-slate-900 mb-4">Our Venues</h2>
            {profile.venues.length > 0 ? (
              <div className="grid gap-6 sm:grid-cols-2">
                {profile.venues.map((v) => (
                  <div key={v.id} className="rounded-xl border border-slate-200 p-4">
                    <div className="flex items-center gap-3">
                      <Building2 className="h-5 w-5 text-blue-600" />
                      <span className="font-semibold text-slate-900">Venue {v.venue_id}</span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="rounded-xl border border-dashed border-slate-300 p-8 text-center text-slate-500">
                No venues published yet.
              </div>
            )}
          </section>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          <div className="rounded-2xl border border-slate-200 bg-white p-6">
            <h3 className="font-bold text-slate-900 mb-4">Business Information</h3>
            <ul className="space-y-4 text-sm text-slate-600">
              {(profile.city || profile.province) && (
                <li className="flex items-start gap-3">
                  <MapPin className="h-5 w-5 shrink-0 text-slate-400" />
                  <span>
                    {profile.city && profile.province 
                      ? `${profile.city}, ${profile.province}`
                      : profile.city || profile.province}
                  </span>
                </li>
              )}
              {profile.websiteUrl && (
                <li className="flex items-start gap-3">
                  <Globe className="h-5 w-5 shrink-0 text-slate-400" />
                  <a href={profile.websiteUrl} target="_blank" rel="noreferrer" className="text-blue-600 hover:underline break-all">
                    {profile.websiteUrl}
                  </a>
                </li>
              )}
              {profile.publicEmail && (
                <li className="flex items-start gap-3">
                  <Mail className="h-5 w-5 shrink-0 text-slate-400" />
                  <a href={`mailto:${profile.publicEmail}`} className="text-blue-600 hover:underline break-all">
                    {profile.publicEmail}
                  </a>
                </li>
              )}
              {profile.publicPhone && (
                <li className="flex items-start gap-3">
                  <Phone className="h-5 w-5 shrink-0 text-slate-400" />
                  <a href={`tel:${profile.publicPhone}`} className="text-blue-600 hover:underline">
                    {profile.publicPhone}
                  </a>
                </li>
              )}
            </ul>
          </div>
        </div>
      </div>
    </main>
  );
}
