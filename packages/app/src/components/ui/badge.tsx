interface BadgeProps {
  variant?: "default" | "success" | "warning" | "danger" | "info" | "purple";
  children: React.ReactNode;
  className?: string;
}

const variantStyles: Record<string, string> = {
  default: "bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300",
  success: "bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-300",
  warning: "bg-yellow-100 dark:bg-yellow-900/40 text-yellow-700 dark:text-yellow-300",
  danger: "bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-300",
  info: "bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300",
  purple: "bg-purple-100 dark:bg-purple-900/40 text-purple-700 dark:text-purple-300",
};

export default function Badge({
  variant = "default",
  children,
  className = "",
}: BadgeProps) {
  return (
    <span
      className={`inline-flex items-center rounded-full text-xs font-medium px-2.5 py-0.5 capitalize ${variantStyles[variant]} ${className}`}
    >
      {children}
    </span>
  );
}