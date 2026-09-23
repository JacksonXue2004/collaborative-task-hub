export function StatsCard({
  stats,
}: {
  stats: { TODO: number; IN_PROGRESS: number; DONE: number; total: number };
}) {
  const items = [
    { label: 'Total', value: stats.total, color: 'bg-slate-100 text-slate-700' },
    { label: 'To Do', value: stats.TODO, color: 'bg-amber-100 text-amber-700' },
    { label: 'In Progress', value: stats.IN_PROGRESS, color: 'bg-blue-100 text-blue-700' },
    { label: 'Done', value: stats.DONE, color: 'bg-green-100 text-green-700' },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      {items.map((item) => (
        <div
          key={item.label}
          className="rounded-lg border border-slate-200 bg-white p-4"
        >
          <div className="flex items-center justify-between">
            <p className="text-sm text-slate-500">{item.label}</p>
            <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${item.color}`}>
              {item.value}
            </span>
          </div>
          <p className="mt-2 text-2xl font-bold text-slate-900">{item.value}</p>
        </div>
      ))}
    </div>
  );
}
