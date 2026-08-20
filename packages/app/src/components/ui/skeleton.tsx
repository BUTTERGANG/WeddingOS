interface SkeletonProps {
  className?: string;
  variant?: "text" | "circular" | "rectangular";
}

const variantStyles: Record<string, string> = {
  text: "rounded h-4",
  circular: "rounded-full",
  rectangular: "rounded-lg",
};

export default function Skeleton({
  className = "",
  variant = "text",
}: SkeletonProps) {
  return (
    <div
      className={`animate-pulse bg-gray-200 dark:bg-gray-700 ${variantStyles[variant]} ${className}`}
    />
  );
}