"use client";

import { useState, useTransition, useEffect } from "react";
import { useForm, type UseFormRegisterReturn } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  Save,
  CheckCircle2,
  AlertCircle,
  Image as ImageIcon,
  Building2,
  Loader2,
  UploadCloud,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Toast, ToastDescription, ToastTitle } from "@venora/ui";
import { createClient } from "@/lib/supabase/client";
import { BusinessProfileDraft } from "../types/business-profile.types";
import {
  saveBusinessIdentity,
  saveBusinessAbout,
  saveBusinessContact,
} from "../application/actions";
import {
  businessIdentitySchema,
  businessAboutSchema,
  businessContactSchema,
} from "../schemas/business-profile.schema";
import {
  BUSINESS_PROFILE_IMAGE_ACCEPTED_TYPES,
  BUSINESS_PROFILE_IMAGE_BUCKET,
  buildBusinessProfileImagePath,
  validateBusinessProfileImage,
  type BusinessProfileImageKind,
} from "../utils/profile-image-upload";
import { z } from "zod";

const fullProfileSchema = z.object({
  ...businessIdentitySchema.shape,
  ...businessAboutSchema.shape,
  ...businessContactSchema.shape,
});

type ProfileFormValues = z.infer<typeof fullProfileSchema>;

type EditorProps = {
  draft: BusinessProfileDraft;
  organizationId: string;
};

function FieldError({ message }: { message?: string | undefined }) {
  if (!message) return null;
  return (
    <p className="mt-1.5 flex items-center gap-1 text-xs font-semibold text-red-600">
      <AlertCircle className="h-3.5 w-3.5" />
      {message}
    </p>
  );
}

function SectionCard({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
      <div className="mb-6">
        <h3 className="text-lg font-bold text-slate-800">{title}</h3>
        <p className="mt-1 text-sm text-slate-500">{description}</p>
      </div>
      <div className="grid gap-6">{children}</div>
    </div>
  );
}

function ImageUploadRow({
  kind,
  title,
  description,
  currentUrl,
  inputProps,
  errorMessage,
  uploadError,
  isUploading,
  onUpload,
}: {
  kind: BusinessProfileImageKind;
  title: string;
  description: string;
  currentUrl: string | null | undefined;
  inputProps: UseFormRegisterReturn;
  errorMessage: string | undefined;
  uploadError?: string | null;
  isUploading: boolean;
  onUpload: (kind: BusinessProfileImageKind, file: File) => void | Promise<void>;
}) {
  const inputId = `business-profile-${kind}-upload`;

  return (
    <div className="grid gap-4 rounded-2xl border border-slate-200 bg-slate-50/70 p-4 sm:grid-cols-[150px_1fr] sm:items-start">
      <div
        className={`relative flex overflow-hidden rounded-xl border border-slate-200 bg-white ${
          kind === "cover" ? "aspect-[16/9] sm:aspect-[4/3]" : "h-24 w-24"
        }`}
      >
        {currentUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={currentUrl} alt="" className="h-full w-full object-cover" />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-slate-300">
            {kind === "logo" ? (
              <Building2 className="h-8 w-8" />
            ) : (
              <ImageIcon className="h-8 w-8" />
            )}
          </div>
        )}
      </div>

      <div className="min-w-0">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="text-sm font-bold text-slate-800">{title}</p>
            <p className="mt-1 text-sm leading-5 text-slate-500">{description}</p>
          </div>

          <label
            htmlFor={inputId}
            className={`inline-flex h-10 cursor-pointer items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-4 text-sm font-bold text-slate-700 shadow-sm transition hover:bg-slate-50 ${
              isUploading ? "pointer-events-none opacity-60" : ""
            }`}
          >
            {isUploading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <UploadCloud className="h-4 w-4" />
            )}
            {isUploading ? "Uploading..." : "Upload image"}
          </label>
        </div>

        <input
          id={inputId}
          type="file"
          accept={BUSINESS_PROFILE_IMAGE_ACCEPTED_TYPES.join(",")}
          className="hidden"
          disabled={isUploading}
          onChange={(event) => {
            const file = event.currentTarget.files?.[0];
            event.currentTarget.value = "";
            if (file) onUpload(kind, file);
          }}
        />

        <label className="mt-4 grid gap-1.5">
          <span className="text-xs font-bold uppercase tracking-[0.16em] text-slate-500">
            Or paste image URL
          </span>
          <input
            {...inputProps}
            placeholder={
              kind === "logo"
                ? "https://example.com/logo.png"
                : "https://example.com/cover.jpg"
            }
            className="h-11 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm font-semibold outline-none transition-all placeholder:text-slate-400 focus:border-[#2563EB] focus:ring-4 focus:ring-[#2563EB]/10"
          />
        </label>

        <FieldError message={errorMessage} />
        {uploadError ? (
          <p className="mt-1.5 flex items-center gap-1 text-xs font-semibold text-red-600">
            <AlertCircle className="h-3.5 w-3.5" />
            {uploadError}
          </p>
        ) : null}
      </div>
    </div>
  );
}

export function BusinessProfileEditor({ draft, organizationId }: EditorProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [uploadingImage, setUploadingImage] =
    useState<BusinessProfileImageKind | null>(null);
  const [imageUploadErrors, setImageUploadErrors] = useState<
    Record<BusinessProfileImageKind, string | null>
  >({
    logo: null,
    cover: null,
  });
  const [formMessage, setFormMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  // Toast state
  const [toastOpen, setToastOpen] = useState(false);
  const [toastMessage, setToastMessage] = useState({
    title: "",
    description: "",
  });

  const defaultValues: ProfileFormValues = {
    display_name: draft.display_name ?? "",
    slug: draft.slug ?? "",
    legal_name: draft.legal_name ?? "",
    tagline: draft.tagline ?? "",
    primary_category: draft.primary_category ?? "",
    year_established: draft.year_established ?? undefined,
    logo_path: draft.logo_path ?? "",
    cover_image_path: draft.cover_image_path ?? "",
    short_description: draft.short_description ?? "",
    about: draft.about ?? "",
    city: draft.city ?? "",
    province: draft.province ?? "",
    country_code: draft.country_code ?? "PH",
    private_address: draft.private_address ?? "",
    address_visibility: draft.address_visibility ?? "exact",
    public_email: draft.public_email ?? "",
    email_visibility: draft.email_visibility ?? true,
    public_phone: draft.public_phone ?? "",
    phone_visibility: draft.phone_visibility ?? true,
    website_url: draft.website_url ?? "",
  };

  const {
    register,
    handleSubmit,
    formState: { errors, isDirty },
    watch,
    reset,
    setValue,
  } = useForm<ProfileFormValues>({
    resolver: zodResolver(fullProfileSchema),
    defaultValues,
  });

  const formValues = watch();

  const setImageUploadError = (
    kind: BusinessProfileImageKind,
    message: string | null,
  ) => {
    setImageUploadErrors((current) => ({ ...current, [kind]: message }));
  };

  const handleImageUpload = async (
    kind: BusinessProfileImageKind,
    file: File,
  ) => {
    setImageUploadError(kind, null);
    const validationError = validateBusinessProfileImage(file);

    if (validationError) {
      setImageUploadError(kind, validationError);
      return;
    }

    setUploadingImage(kind);

    try {
      const supabase = createClient();
      const uniqueId =
        typeof crypto !== "undefined" && "randomUUID" in crypto
          ? crypto.randomUUID()
          : `${Date.now()}`;
      const storagePath = buildBusinessProfileImagePath({
        organizationId,
        kind,
        fileName: file.name,
        mimeType: file.type,
        uniqueId,
      });

      const { error: uploadError } = await supabase.storage
        .from(BUSINESS_PROFILE_IMAGE_BUCKET)
        .upload(storagePath, file, {
          cacheControl: "3600",
          contentType: file.type,
          upsert: false,
        });

      if (uploadError) {
        throw new Error(uploadError.message);
      }

      const { data } = supabase.storage
        .from(BUSINESS_PROFILE_IMAGE_BUCKET)
        .getPublicUrl(storagePath);
      const fieldName = kind === "logo" ? "logo_path" : "cover_image_path";

      setValue(fieldName, data.publicUrl, {
        shouldDirty: true,
        shouldValidate: true,
      });
      setToastMessage({
        title: "Image uploaded",
        description: "The image URL was added. Save changes to publish it.",
      });
      setToastOpen(true);
    } catch (uploadError) {
      setImageUploadError(
        kind,
        uploadError instanceof Error
          ? uploadError.message
          : "Could not upload image.",
      );
    } finally {
      setUploadingImage(null);
    }
  };

  const onSubmit = (values: ProfileFormValues) => {
    setFormMessage(null);
    startTransition(async () => {
      // Identity
      const identityRes = await saveBusinessIdentity({
        profileId: draft.id,
        display_name: values.display_name,
        slug: values.slug,
        legal_name: values.legal_name,
        tagline: values.tagline,
        primary_category: values.primary_category,
        year_established: values.year_established,
        logo_path: values.logo_path,
        cover_image_path: values.cover_image_path,
      });

      if (identityRes.error) {
        setFormMessage({ type: "error", text: identityRes.error.message });
        setToastMessage({ title: "Error", description: identityRes.error.message });
        setToastOpen(true);
        return;
      }

      // About
      const aboutRes = await saveBusinessAbout({
        profileId: draft.id,
        short_description: values.short_description,
        about: values.about,
      });

      if (aboutRes.error) {
        setFormMessage({ type: "error", text: aboutRes.error.message });
        setToastMessage({ title: "Error", description: aboutRes.error.message });
        setToastOpen(true);
        return;
      }

      // Contact
      const contactRes = await saveBusinessContact({
        profileId: draft.id,
        city: values.city,
        province: values.province,
        country_code: values.country_code,
        private_address: values.private_address,
        address_visibility: values.address_visibility,
        public_email: values.public_email,
        email_visibility: values.email_visibility,
        public_phone: values.public_phone,
        phone_visibility: values.phone_visibility,
        website_url: values.website_url,
      });

      if (contactRes.error) {
        setFormMessage({ type: "error", text: contactRes.error.message });
        setToastMessage({ title: "Error", description: contactRes.error.message });
        setToastOpen(true);
        return;
      }

      setFormMessage({ type: "success", text: "Profile successfully saved." });
      setToastMessage({ title: "Success", description: "Profile successfully saved." });
      setToastOpen(true);
      reset(values); // Reset isDirty state
      router.refresh();

      setTimeout(() => {
        setFormMessage(null);
      }, 3000);
    });
  };

  // Prevent accidental navigation when form is dirty
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (isDirty) {
        e.preventDefault();
        e.returnValue = "";
      }
    };
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [isDirty]);

  return (
    <div className="relative pb-24">
      <div className="flex flex-col xl:flex-row gap-8 items-start">
        {/* Main Form Left Column */}
        <div className="flex-1 w-full min-w-0">
          <form id="profile-form" onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            <SectionCard title="Brand Identity" description="Your business name, tagline, and visual assets.">
              <div className="grid gap-6 sm:grid-cols-2">
                <label className="grid gap-1.5">
                  <span className="text-sm font-bold text-slate-700">Display Name</span>
                  <input
                    {...register("display_name")}
                    placeholder="Your Business Name"
                    className="w-full h-11 rounded-lg border border-slate-200 bg-slate-50 px-3 text-sm font-semibold outline-none transition-all placeholder:text-slate-400 focus:border-[#2563EB] focus:bg-white focus:ring-4 focus:ring-[#2563EB]/10"
                  />
                  <FieldError message={errors.display_name?.message} />
                </label>
                <label className="grid gap-1.5">
                  <span className="text-sm font-bold text-slate-700">Legal Business Name</span>
                  <input
                    {...register("legal_name")}
                    placeholder="Optional Legal Name"
                    className="w-full h-11 rounded-lg border border-slate-200 bg-slate-50 px-3 text-sm font-semibold outline-none transition-all placeholder:text-slate-400 focus:border-[#2563EB] focus:bg-white focus:ring-4 focus:ring-[#2563EB]/10"
                  />
                  <FieldError message={errors.legal_name?.message} />
                </label>
              </div>

              <div className="grid gap-6 sm:grid-cols-2">
                <label className="grid gap-1.5">
                  <span className="text-sm font-bold text-slate-700">Profile URL Slug</span>
                  <div className="flex">
                    <span className="inline-flex h-11 items-center rounded-l-lg border border-r-0 border-slate-200 bg-slate-100 px-3 text-sm font-semibold text-slate-500">
                      venora.ph/owners/
                    </span>
                    <input
                      {...register("slug")}
                      className="w-full h-11 rounded-r-lg border border-slate-200 bg-slate-50 px-3 text-sm font-semibold outline-none transition-all placeholder:text-slate-400 focus:border-[#2563EB] focus:bg-white focus:ring-4 focus:ring-[#2563EB]/10"
                    />
                  </div>
                  <FieldError message={errors.slug?.message} />
                </label>
                <label className="grid gap-1.5">
                  <span className="text-sm font-bold text-slate-700">Year Established</span>
                  <input
                    {...register("year_established", { valueAsNumber: true })}
                    type="number"
                    min="1900"
                    max={new Date().getFullYear()}
                    placeholder="e.g. 2020"
                    className="w-full h-11 rounded-lg border border-slate-200 bg-slate-50 px-3 text-sm font-semibold outline-none transition-all placeholder:text-slate-400 focus:border-[#2563EB] focus:bg-white focus:ring-4 focus:ring-[#2563EB]/10"
                  />
                  <FieldError message={errors.year_established?.message} />
                </label>
              </div>

              <label className="grid gap-1.5">
                <span className="text-sm font-bold text-slate-700">Tagline</span>
                <input
                  {...register("tagline")}
                  placeholder="e.g., The best venue in town."
                  className="w-full h-11 rounded-lg border border-slate-200 bg-slate-50 px-3 text-sm font-semibold outline-none transition-all placeholder:text-slate-400 focus:border-[#2563EB] focus:bg-white focus:ring-4 focus:ring-[#2563EB]/10"
                />
                <FieldError message={errors.tagline?.message} />
              </label>
            </SectionCard>

            <SectionCard title="Images and Branding" description="Use high-quality images to represent your business.">
              <div className="grid gap-6">
                <ImageUploadRow
                  kind="logo"
                  title="Logo image"
                  description="Upload a square brand mark or paste an image URL."
                  currentUrl={formValues.logo_path}
                  inputProps={register("logo_path")}
                  errorMessage={errors.logo_path?.message}
                  uploadError={imageUploadErrors.logo}
                  isUploading={uploadingImage === "logo"}
                  onUpload={handleImageUpload}
                />

                <ImageUploadRow
                  kind="cover"
                  title="Cover image"
                  description="Upload a wide image that represents your venue business."
                  currentUrl={formValues.cover_image_path}
                  inputProps={register("cover_image_path")}
                  errorMessage={errors.cover_image_path?.message}
                  uploadError={imageUploadErrors.cover}
                  isUploading={uploadingImage === "cover"}
                  onUpload={handleImageUpload}
                />
              </div>
            </SectionCard>

            <SectionCard title="About the Business" description="Describe your business and what makes it special.">
              <label className="grid gap-1.5">
                <span className="text-sm font-bold text-slate-700">Short Description</span>
                <textarea
                  {...register("short_description")}
                  rows={3}
                  placeholder="A brief summary for search results and previews."
                  className="w-full resize-y rounded-lg border border-slate-200 bg-slate-50 px-3 py-3 text-sm font-semibold outline-none transition-all placeholder:text-slate-400 focus:border-[#2563EB] focus:bg-white focus:ring-4 focus:ring-[#2563EB]/10"
                />
                <FieldError message={errors.short_description?.message} />
              </label>

              <label className="grid gap-1.5">
                <span className="text-sm font-bold text-slate-700">Full About Section</span>
                <textarea
                  {...register("about")}
                  rows={6}
                  placeholder="Tell customers the full story of your business."
                  className="w-full resize-y rounded-lg border border-slate-200 bg-slate-50 px-3 py-3 text-sm font-semibold outline-none transition-all placeholder:text-slate-400 focus:border-[#2563EB] focus:bg-white focus:ring-4 focus:ring-[#2563EB]/10"
                />
                <FieldError message={errors.about?.message} />
              </label>
            </SectionCard>

            <SectionCard title="Contact & Location" description="How customers can reach your main office.">
              <div className="grid gap-6 sm:grid-cols-2">
                <label className="grid gap-1.5">
                  <span className="text-sm font-bold text-slate-700">City</span>
                  <input
                    {...register("city")}
                    className="w-full h-11 rounded-lg border border-slate-200 bg-slate-50 px-3 text-sm font-semibold outline-none transition-all placeholder:text-slate-400 focus:border-[#2563EB] focus:bg-white focus:ring-4 focus:ring-[#2563EB]/10"
                  />
                  <FieldError message={errors.city?.message} />
                </label>
                <label className="grid gap-1.5">
                  <span className="text-sm font-bold text-slate-700">Province</span>
                  <input
                    {...register("province")}
                    className="w-full h-11 rounded-lg border border-slate-200 bg-slate-50 px-3 text-sm font-semibold outline-none transition-all placeholder:text-slate-400 focus:border-[#2563EB] focus:bg-white focus:ring-4 focus:ring-[#2563EB]/10"
                  />
                  <FieldError message={errors.province?.message} />
                </label>
              </div>

              <div className="grid gap-6 sm:grid-cols-2">
                <label className="grid gap-1.5">
                  <span className="text-sm font-bold text-slate-700">Location Visibility</span>
                  <select
                    {...register("address_visibility")}
                    className="w-full h-11 rounded-lg border border-slate-200 bg-slate-50 px-3 text-sm font-semibold outline-none transition-all focus:border-[#2563EB] focus:bg-white focus:ring-4 focus:ring-[#2563EB]/10"
                  >
                    <option value="exact">Exact Address</option>
                    <option value="city_province">City and Province Only</option>
                    <option value="province">Province Only</option>
                    <option value="hidden">Hidden</option>
                  </select>
                  <FieldError message={errors.address_visibility?.message} />
                </label>
              </div>

              <div className="pt-4 border-t border-slate-100 mt-2">
                <h4 className="text-sm font-bold text-slate-800 mb-4">Contact Methods</h4>
                <div className="grid gap-6 sm:grid-cols-2">
                  <div className="grid gap-1.5">
                    <label className="grid gap-1.5">
                      <span className="text-sm font-bold text-slate-700">Public Email</span>
                      <input
                        {...register("public_email")}
                        className="w-full h-11 rounded-lg border border-slate-200 bg-slate-50 px-3 text-sm font-semibold outline-none transition-all placeholder:text-slate-400 focus:border-[#2563EB] focus:bg-white focus:ring-4 focus:ring-[#2563EB]/10"
                      />
                    </label>
                    <label className="flex items-center gap-2 mt-1">
                      <input
                        {...register("email_visibility")}
                        type="checkbox"
                        className="h-4 w-4 rounded border-slate-300 text-[#2563EB] focus:ring-[#2563EB]"
                      />
                      <span className="text-sm text-slate-600 font-semibold">Show email on public profile</span>
                    </label>
                    <FieldError message={errors.public_email?.message} />
                  </div>

                  <div className="grid gap-1.5">
                    <label className="grid gap-1.5">
                      <span className="text-sm font-bold text-slate-700">Public Phone</span>
                      <input
                        {...register("public_phone")}
                        className="w-full h-11 rounded-lg border border-slate-200 bg-slate-50 px-3 text-sm font-semibold outline-none transition-all placeholder:text-slate-400 focus:border-[#2563EB] focus:bg-white focus:ring-4 focus:ring-[#2563EB]/10"
                      />
                    </label>
                    <label className="flex items-center gap-2 mt-1">
                      <input
                        {...register("phone_visibility")}
                        type="checkbox"
                        className="h-4 w-4 rounded border-slate-300 text-[#2563EB] focus:ring-[#2563EB]"
                      />
                      <span className="text-sm text-slate-600 font-semibold">Show phone on public profile</span>
                    </label>
                    <FieldError message={errors.public_phone?.message} />
                  </div>

                  <label className="grid gap-1.5 sm:col-span-2">
                    <span className="text-sm font-bold text-slate-700">Website URL</span>
                    <input
                      {...register("website_url")}
                      placeholder="https://"
                      className="w-full h-11 rounded-lg border border-slate-200 bg-slate-50 px-3 text-sm font-semibold outline-none transition-all placeholder:text-slate-400 focus:border-[#2563EB] focus:bg-white focus:ring-4 focus:ring-[#2563EB]/10"
                    />
                    <FieldError message={errors.website_url?.message} />
                  </label>
                </div>
              </div>
            </SectionCard>
          </form>
        </div>

        {/* Sticky Live Preview Right Column */}
        <div className="hidden xl:block w-80 2xl:w-[360px] shrink-0">
          <div className="sticky top-6">
            <h3 className="text-sm font-bold text-slate-500 uppercase tracking-wider mb-3">
              Live Profile Preview
            </h3>
            <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm flex flex-col pointer-events-none">
              <div className="relative h-32 w-full bg-slate-100 border-b border-slate-100">
                {formValues.cover_image_path ? (
                  <img src={formValues.cover_image_path} alt="" className="h-full w-full object-cover" />
                ) : (
                  <div className="absolute inset-0 flex items-center justify-center text-slate-300">
                    <ImageIcon className="h-8 w-8" />
                  </div>
                )}
              </div>
              <div className="relative p-5 pt-0 flex-1 flex flex-col">
                <div className="absolute -top-10 left-5 h-20 w-20 rounded-xl border-4 border-white bg-slate-100 shadow-sm overflow-hidden flex items-center justify-center">
                  {formValues.logo_path ? (
                    <img src={formValues.logo_path} alt="" className="h-full w-full object-cover" />
                  ) : (
                    <Building2 className="h-8 w-8 text-slate-300" />
                  )}
                </div>
                <div className="mt-12 space-y-1">
                  <h4 className="font-bold text-lg text-slate-900 leading-tight">
                    {formValues.display_name || "Your Business Name"}
                  </h4>
                  {formValues.city && formValues.province && (
                    <p className="text-sm text-slate-500 font-medium">
                      {formValues.city}, {formValues.province}
                    </p>
                  )}
                </div>
                {formValues.tagline && (
                  <p className="mt-3 text-sm text-slate-700 leading-snug">"{formValues.tagline}"</p>
                )}
              </div>
              <div className="p-4 bg-slate-50 border-t border-slate-100 pointer-events-auto">
                {formValues.slug ? (
                  <Link
                    href={`/owners/${formValues.slug}`}
                    target="_blank"
                    className="w-full h-10 rounded-lg bg-white border border-slate-200 flex items-center justify-center text-sm font-bold text-slate-700 shadow-sm hover:bg-slate-50 transition"
                  >
                    View Full Profile
                  </Link>
                ) : (
                  <div className="w-full h-10 rounded-lg bg-slate-100 border border-slate-200 flex items-center justify-center text-sm font-bold text-slate-400 shadow-sm cursor-not-allowed">
                    Save profile to preview
                  </div>
                )}
              </div>
            </div>
            <p className="text-xs text-slate-400 mt-3 text-center">
              Customers will see this card when searching the marketplace.
            </p>
          </div>
        </div>
      </div>

      {/* Sticky Save Bar */}
      <div
        className={`fixed bottom-0 left-0 right-0 z-50 transform transition-transform duration-300 ease-in-out ${isDirty || formMessage ? "translate-y-0" : "translate-y-full"}`}
      >
        <div className="bg-white border-t border-slate-200 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)] px-4 py-4 sm:px-6 lg:px-8">
          <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-3 w-full sm:w-auto">
              {formMessage?.type === "success" ? (
                <div className="flex items-center gap-2 text-emerald-600 font-bold">
                  <CheckCircle2 className="h-5 w-5" />
                  {formMessage.text}
                </div>
              ) : formMessage?.type === "error" ? (
                <div className="flex items-center gap-2 text-red-600 font-bold">
                  <AlertCircle className="h-5 w-5" />
                  {formMessage.text}
                </div>
              ) : isDirty ? (
                <div className="flex items-center gap-2 text-amber-600 font-bold">
                  <div className="h-2 w-2 rounded-full bg-amber-500 animate-pulse" />
                  You have unsaved changes
                </div>
              ) : null}
            </div>

            <div className="flex items-center gap-3 w-full sm:w-auto justify-end">
              {isDirty && !isPending && (
                <button
                  type="button"
                  onClick={() => reset()}
                  className="px-4 py-2 text-sm font-bold text-slate-600 hover:text-slate-900 transition-colors"
                >
                  Discard
                </button>
              )}
              <button
                type="submit"
                form="profile-form"
                disabled={!isDirty || isPending}
                className="inline-flex h-11 items-center justify-center gap-2 rounded-lg bg-[#2563EB] px-6 text-sm font-bold text-white transition hover:bg-[#1D4ED8] disabled:bg-slate-300 disabled:cursor-not-allowed min-w-[140px]"
              >
                {isPending ? (
                  "Saving..."
                ) : (
                  <>
                    <Save className="h-4 w-4" />
                    Save Changes
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Global Toast component */}
      {toastOpen && (
        <Toast onOpenChange={setToastOpen}>
          <div className="flex flex-col gap-1">
            <ToastTitle>{toastMessage.title}</ToastTitle>
            <ToastDescription>{toastMessage.description}</ToastDescription>
          </div>
        </Toast>
      )}
    </div>
  );
}
