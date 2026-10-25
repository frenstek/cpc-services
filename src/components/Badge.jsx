const colors = {
  brand: "bg-brand-50 text-brand-700",
  emerald: "bg-emerald-50 text-emerald-700",
  red: "bg-red-50 text-red-700",
  amber: "bg-amber-50 text-amber-700",
  slate: "bg-slate-100 text-slate-600",
  purple: "bg-purple-50 text-purple-700",
};

export default function Badge({
  color = "slate",
  children,
  className = "",
}) {
  return (
    <span
      className={`rounded-full px-2.5 py-1 text-[11px] font-semibold inline-flex items-center gap-1 ${colors[color]} ${className}`}
    >
      {children}
    </span>
  );
}
