const variantClasses = {
  line: "h-4 w-full rounded-xl",
  circle: "h-12 w-12 rounded-full",
  card: "h-48 w-full rounded-2xl",
};

export default function Skeleton({
  variant = "line",
  className = "",
}) {
  return (
    <div
      className={`animate-pulse bg-slate-200 ${variantClasses[variant]} ${className}`}
    />
  );
}
