export default function EmptyState({
  icon: Icon,
  title,
  subtitle,
  action,
}) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      {Icon && (
        <div className="flex items-center justify-center h-16 w-16 rounded-2xl bg-slate-50 mb-4">
          <Icon className="h-7 w-7 text-slate-400" />
        </div>
      )}
      {title && (
        <p className="text-base font-semibold text-slate-600">{title}</p>
      )}
      {subtitle && (
        <p className="text-sm text-slate-400 mt-1 max-w-xs">{subtitle}</p>
      )}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}
