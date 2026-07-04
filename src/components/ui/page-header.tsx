export function PageHeader({
  title,
  description,
  action,
}: {
  title: string;
  description?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
      <div>
        <h1 className="text-xl font-bold text-ink md:text-2xl">{title}</h1>
        {description && (
          <p className="mt-1 text-sm text-ink/55">{description}</p>
        )}
      </div>
      {action}
    </div>
  );
}
