export function SectionTitle({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <div className="mb-6">
      <h2 className="text-xl font-bold text-[#0f172a]">{title}</h2>
      <p className="mt-1 text-sm leading-6 text-[#64748b]">{description}</p>
    </div>
  );
}
