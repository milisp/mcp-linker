import { useTranslation } from "react-i18next";

interface DashboardProps {
  personalStats: {
    total: number;
    active: number;
    disabled: number;
  };
}

const STATS = [
  { key: "total", label: "manage.total", dot: "bg-muted-foreground" },
  { key: "active", label: "manage.enabled", dot: "bg-green-500" },
  { key: "disabled", label: "manage.disabled", dot: "bg-orange-500" },
] as const;

// Compact server counts shown beside the page tabs
export const Dashboard = ({ personalStats }: DashboardProps) => {
  const { t } = useTranslation();
  return (
  <dl className="flex items-center gap-4 text-sm">
    {STATS.map(({ key, label, dot }) => (
      <div key={key} className="flex items-center gap-1.5">
        <span className={`size-2 rounded-full ${dot}`} aria-hidden />
        <dt className="text-muted-foreground">{t(label)}</dt>
        <dd className="font-semibold tabular-nums">{personalStats[key]}</dd>
      </div>
    ))}
  </dl>
  );
};
