import type { LucideIcon } from "lucide-react";

interface EmptyStateProps {
  icon?: LucideIcon;
  title?: string;
  description?: string;
  action?: React.ReactNode;
}

export default function EmptyState({
  icon: Icon,
  title,
  description,
  action,
}: EmptyStateProps) {
  return (
    <div className="text-center py-12">
      {Icon && (
        <div className="flex justify-center mb-3">
          <Icon className="w-12 h-12 text-gray-300 dark:text-gray-600" />
        </div>
      )}
      {title && (
        <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-1">{title}</h3>
      )}
      {description && (
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">{description}</p>
      )}
      {action && <div>{action}</div>}
    </div>
  );
}