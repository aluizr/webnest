import { TrendingUp, Star, Folder, Tag, Zap } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { TEXT_XS_CLASS } from "@/lib/utils";
import type { LinkStats, TimelineStats } from "@/types/stats";

interface StatsOverviewProps {
  basicStats: LinkStats;
  timelineStats: TimelineStats;
}

const StatCard = ({
  icon: Icon,
  label,
  value,
  trend,
  color,
}: {
  icon: React.ReactNode;
  label: string;
  value: number | string;
  trend?: string;
  color: string;
}) => (
  <Card className="flex-1">
    <CardHeader className="pb-2">
      <CardTitle className="flex items-center justify-between text-sm font-medium">
        <span className="flex items-center gap-2">
          <div className={`p-2 rounded-lg ${color}`}>{Icon}</div>
          {label}
        </span>
      </CardTitle>
    </CardHeader>
    <CardContent>
      <div className="text-3xl font-bold">{value}</div>
      {trend && <p className={`${TEXT_XS_CLASS} text-muted-foreground mt-1`}>{trend}</p>}
    </CardContent>
  </Card>
);

export function StatsOverview({ basicStats, timelineStats }: StatsOverviewProps) {
  const trendThisMonth =
    timelineStats.thisMonth > 0 ? `+${timelineStats.thisMonth} este mês` : "Sem links este mês";
  const trendToday =
    timelineStats.today > 0 ? `+${timelineStats.today} hoje` : "Sem links hoje";

  return (
    <div className="space-y-6">
      {/* Top Stats Row */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
        <StatCard
          icon={<TrendingUp className="h-4 w-4 text-white" />}
          label="Total de Links"
          value={basicStats.totalLinks}
          trend={trendThisMonth}
          color="bg-blue-500"
        />
        <StatCard
          icon={<Star className="h-4 w-4 text-white" />}
          label="Favoritos"
          value={basicStats.totalFavorites}
          trend={`${basicStats.totalLinks > 0 ? ((basicStats.totalFavorites / basicStats.totalLinks) * 100).toFixed(1) : '0.0'}% do total`}
          color="bg-yellow-500"
        />
        <StatCard
          icon={<Folder className="h-4 w-4 text-white" />}
          label="Categorias"
          value={basicStats.totalCategories}
          trend={`${basicStats.avgLinksPerCategory.toFixed(1)} links/cat`}
          color="bg-purple-500"
        />
        <StatCard
          icon={<Tag className="h-4 w-4 text-white" />}
          label="Tags Únicas"
          value={basicStats.totalTags}
          trend={`${basicStats.avgTagsPerLink.toFixed(1)} tags/link`}
          color="bg-green-500"
        />
        <StatCard
          icon={<Zap className="h-4 w-4 text-white" />}
          label="Hoje"
          value={timelineStats.today}
          trend={trendToday}
          color="bg-orange-500"
        />
      </div>

      {/* Timeline Stats */}
      <Card>
        <CardHeader>
          <CardTitle>Atividade por Período</CardTitle>
          <CardDescription>Links adicionados em cada período</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-4">
            <div className="space-y-1">
              <p className={`${TEXT_XS_CLASS} text-muted-foreground`}>Última Semana</p>
              <p className="text-2xl font-bold">{timelineStats.thisWeek}</p>
            </div>
            <div className="space-y-1">
              <p className={`${TEXT_XS_CLASS} text-muted-foreground`}>Último Mês</p>
              <p className="text-2xl font-bold">{timelineStats.thisMonth}</p>
            </div>
            <div className="space-y-1">
              <p className={`${TEXT_XS_CLASS} text-muted-foreground`}>Último Ano</p>
              <p className="text-2xl font-bold">{timelineStats.thisYear}</p>
            </div>
            <div className="space-y-1">
              <p className={`${TEXT_XS_CLASS} text-muted-foreground`}>Total</p>
              <p className="text-2xl font-bold">{timelineStats.allTime}</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
