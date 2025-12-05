import { useEffect, useState } from "react";
import { Package, Share2, Zap, TrendingUp } from "lucide-react";
import api from "@/services/api";

interface Activity {
  id: string;
  type: "product" | "share" | "integration" | "trending";
  title: string;
  description: string;
  time: string;
}

interface Offer {
  _id: string;
  title: string;
  source: string;
  createdAt: string;
  isPosted: boolean;
}

const iconMap = {
  product: Package,
  share: Share2,
  integration: Zap,
  trending: TrendingUp,
};

const colorMap = {
  product: "bg-primary/10 text-primary",
  share: "bg-info/10 text-info",
  integration: "bg-warning/10 text-warning",
  trending: "bg-success/10 text-success",
};

export function RecentActivity() {
  const [activities, setActivities] = useState<Activity[]>([]);

  useEffect(() => {
    const fetchActivity = async () => {
      try {
        const response = await api.get('/offers?limit=5');
        const offers: Offer[] = response.data;

        const newActivities: Activity[] = offers.map((offer) => ({
          id: offer._id,
          type: offer.isPosted ? "share" : "product",
          title: offer.isPosted ? "Publicação enviada" : "Novo produto coletado",
          description: `${offer.source} - ${offer.title.substring(0, 30)}...`,
          time: new Date(offer.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        }));

        setActivities(newActivities);
      } catch (error) {
        console.error("Error fetching activity:", error);
      }
    };

    fetchActivity();
  }, []);

  return (
    <div className="glass rounded-2xl p-6 animate-slide-up" style={{ animationDelay: "300ms" }}>
      <h3 className="text-lg font-semibold text-foreground mb-4">Atividade Recente</h3>

      <div className="space-y-4">
        {activities.map((activity, index) => {
          const Icon = iconMap[activity.type];
          return (
            <div
              key={activity.id}
              className="flex items-start gap-3 animate-fade-in"
              style={{ animationDelay: `${(index + 1) * 100}ms` }}
            >
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${colorMap[activity.type]}`}>
                <Icon className="w-5 h-5" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-foreground text-sm">{activity.title}</p>
                <p className="text-muted-foreground text-sm truncate">{activity.description}</p>
              </div>
              <span className="text-xs text-muted-foreground whitespace-nowrap">{activity.time}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
