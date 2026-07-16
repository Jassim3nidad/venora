import Link from "next/link";
import { redirect } from "next/navigation";
import {
  DashboardPage,
  DashButton,
  Panel,
  PanelHeader,
} from "@/components/dashboard/enterprise";
import { createClient } from "@/src/lib/supabase/server";

type StaffAcceptPageProps = {
  searchParams: Promise<{ token?: string }>;
};

function buildLoginRedirect(token: string) {
  return `/login?redirectTo=${encodeURIComponent(
    `/staff/accept?token=${encodeURIComponent(token)}`,
  )}`;
}

function ErrorCard({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <DashboardPage className="flex min-h-screen items-center justify-center">
      <Panel className="w-full max-w-xl">
        <PanelHeader title={title} description={description} />
        <div className="flex flex-wrap gap-3">
          <DashButton href="/login">Sign In</DashButton>
          <Link
            href="/"
            className="inline-flex min-h-11 items-center justify-center rounded-2xl border border-[#dbe3ef] bg-white px-4 py-2.5 text-sm font-bold text-[#0f172a] shadow-sm shadow-slate-200/60 transition hover:border-[#93c5fd] hover:text-[#1d4ed8]"
          >
            Back to Venora
          </Link>
        </div>
      </Panel>
    </DashboardPage>
  );
}

export default async function StaffAcceptPage({
  searchParams,
}: StaffAcceptPageProps) {
  const { token } = await searchParams;

  if (!token) {
    return (
      <ErrorCard
        title="Invalid invitation"
        description="This coordinator invitation link is missing a token. Ask the venue owner to send a new invitation."
      />
    );
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect(buildLoginRedirect(token));
  }

  const { error } = await (supabase as any).rpc(
    "accept_organization_member_invitation",
    {
      p_token: token,
    },
  );

  if (error) {
    return (
      <ErrorCard
        title="Invitation could not be accepted"
        description={error.message}
      />
    );
  }

  redirect("/dashboard/coordinator?invitation=accepted");
}
