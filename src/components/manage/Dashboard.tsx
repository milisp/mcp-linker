import { Card, CardContent } from "@/components/ui/card";

interface DashboardProps {
  personalStats: {
    total: number;
    active: number;
    disabled: number;
  };
}

// Reusable stat card component
interface StatCardProps {
  title: string;
  value: number | string;
  variant: "default" | "secondary" | "destructive";
}

const StatCard = ({ title, value, variant }: StatCardProps) => {
  const getVariantClasses = () => {
    switch (variant) {
      case "secondary":
        return {
          card: "border-green-200 dark:border-green-800 bg-green-50/50 dark:bg-green-950/50",
          title: "text-green-600 dark:text-green-400",
          value: "text-green-900 dark:text-green-100",
        };
      case "destructive":
        return {
          card: "border-orange-200 dark:border-orange-800 bg-orange-50/50 dark:bg-orange-950/50",
          title: "text-orange-600 dark:text-orange-400",
          value: "text-orange-900 dark:text-orange-100",
        };
      default:
        return {
          card: "border-blue-200 dark:border-blue-800 bg-blue-50/50 dark:bg-blue-950/50",
          title: "text-blue-600 dark:text-blue-400",
          value: "text-blue-900 dark:text-blue-100",
        };
    }
  };

  const classes = getVariantClasses();

  return (
    <Card className={classes.card}>
      <CardContent className="flex items-center justify-between">
        <p className={`text-sm font-medium ${classes.title}`}>{title}</p>
        <p className={`text-2xl font-bold ${classes.value}`}>{value}</p>
      </CardContent>
    </Card>
  );
};

export const Dashboard = ({ personalStats }: DashboardProps) => {
  // Prepare stat card data
  const statCards = [
    {
      title: "Total",
      value: personalStats.total,
      variant: "default" as const,
    },
    {
      title: "Active",
      value: personalStats.active,
      variant: "secondary" as const,
    },
    {
      title: "Disabled",
      value: personalStats.disabled,
      variant: "destructive" as const,
    },
  ];

  return (
    <div className="grid grid-cols-3 gap-2">
      {/* Render all stat cards */}
      {statCards.map((card, idx) => (
        <StatCard key={idx} {...card} />
      ))}
    </div>
  );
};
