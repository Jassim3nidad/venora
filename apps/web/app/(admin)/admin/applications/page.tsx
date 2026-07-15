import { DashboardPage } from "@/components/dashboard/enterprise";
import { getPendingPartnerApplicationsForAdmin } from "@/features/partner-applications/application/get-pending-partner-applications";
import { ApplicationReviewModal } from "@/features/partner-applications/ui/ApplicationReviewModal";
import { formatDistanceToNow } from "date-fns";

export const dynamic = "force-dynamic";

export default async function AdminApplicationsPage() {
  const { applications, error } = await getPendingPartnerApplicationsForAdmin();

  if (error) {
    return (
      <DashboardPage>
        <div className="rounded-2xl border border-red-200 bg-red-50 p-6 text-red-700">
          Error loading applications: {error}
        </div>
      </DashboardPage>
    );
  }

  return (
    <DashboardPage>
      <div>
        <h1 className="text-3xl font-black text-slate-900">
          Partner Applications
        </h1>
        <p className="mt-2 text-slate-500">
          Review and approve vendor applications to upgrade their workspace
          access.
        </p>
      </div>

      {applications && applications.length > 0 ? (
        <div className="overflow-hidden rounded-[24px] border border-slate-200 bg-white shadow-sm">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 text-slate-500">
              <tr>
                <th className="px-6 py-4 font-bold uppercase tracking-wider text-xs">
                  Applicant
                </th>
                <th className="px-6 py-4 font-bold uppercase tracking-wider text-xs">
                  Role Applied
                </th>
                <th className="px-6 py-4 font-bold uppercase tracking-wider text-xs">
                  Category
                </th>
                <th className="px-6 py-4 font-bold uppercase tracking-wider text-xs">
                  Applied
                </th>
                <th className="px-6 py-4 font-bold uppercase tracking-wider text-xs text-right">
                  Action
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {applications.map((app) => (
                <tr key={app.id} className="transition hover:bg-slate-50">
                  <td className="px-6 py-4">
                    <p className="font-bold text-slate-900">
                      {app.profiles?.full_name || "Unknown"}
                    </p>
                    <p className="text-xs text-slate-500">
                      {app.profiles?.email || "No email"}
                    </p>
                  </td>
                  <td className="px-6 py-4">
                    <span className="inline-flex rounded-full bg-blue-50 px-2.5 py-0.5 text-xs font-bold text-blue-700">
                      {app.role_applied_for.replace("_", " ").toUpperCase()}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-slate-600">{app.category}</td>
                  <td className="px-6 py-4 text-slate-500 text-xs">
                    {formatDistanceToNow(new Date(app.created_at), {
                      addSuffix: true,
                    })}
                  </td>
                  <td className="px-6 py-4 text-right">
                    <ApplicationReviewModal application={app} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center rounded-[24px] border border-dashed border-slate-300 bg-slate-50 p-12 text-center">
          <div className="h-12 w-12 rounded-full bg-white flex items-center justify-center shadow-sm mb-4">
            <span className="text-2xl">🎉</span>
          </div>
          <h3 className="text-lg font-bold text-slate-900">All caught up!</h3>
          <p className="text-sm text-slate-500">
            There are no pending partner applications to review.
          </p>
        </div>
      )}
    </DashboardPage>
  );
}
