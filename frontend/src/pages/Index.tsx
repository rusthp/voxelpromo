import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Package, TrendingUp, Share2, Users } from "lucide-react";
import { Layout } from "@/components/layout/Layout";
import { StatsCard } from "@/components/dashboard/StatsCard";
import { ProductCard } from "@/components/dashboard/ProductCard";
import { SocialPlatforms } from "@/components/dashboard/SocialPlatforms";
import { RecentActivity } from "@/components/dashboard/RecentActivity";
import { OnboardingChecklist } from "@/components/dashboard/OnboardingChecklist";

import { useAuth } from "@/hooks/useAuth";
import api from "@/services/api";

interface Stats {
  total: number;
  posted: number;
  notPosted: number;
  avgDiscount: number;
}

interface Offer {
  _id: string;
  title: string;
  source: string;
  brand?: string;
  currentPrice: number;
  originalPrice: number;
  discountPercentage: number;
  imageUrl: string;
}


const Index = () => {
  const { user, refreshProfile } = useAuth();
  const navigate = useNavigate();
  const [stats, setStats] = useState<Stats | null>(null);
  const [products, setProducts] = useState<Offer[]>([]);
  const [loading, setLoading] = useState(true);

  // Redirect to onboarding if no niche selected
  useEffect(() => {
    if (user && !user.preferences?.niche) {
      navigate('/onboarding');
    }
  }, [user, navigate]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [statsRes, offersRes] = await Promise.all([
          api.get('/stats'),
          api.get('/offers?limit=4')
        ]);

        setStats(statsRes.data);
        setProducts(offersRes.data);
      } catch (error) {
        console.error("Error fetching dashboard data:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const statsData = [
    {
      title: "Produtos Monitorados",
      value: stats?.total.toString() || "0",
      change: "Total acumulado",
      changeType: "neutral" as const,
      icon: Package
    },
    {
      title: "Publicações Enviadas",
      value: stats?.posted.toString() || "0",
      change: `${stats?.total ? Math.round((stats.posted / stats.total) * 100) : 0}% do total`,
      changeType: "positive" as const,
      icon: Share2
    },
    {
      title: "Média de Desconto",
      value: `${stats?.avgDiscount || 0}%`,
      change: "Em todas as ofertas",
      changeType: "positive" as const,
      icon: TrendingUp
    },
    {
      title: "Aguardando Envio",
      value: stats?.notPosted.toString() || "0",
      change: "Fila de processamento",
      changeType: "neutral" as const,
      icon: Users
    },
  ];

  return (
    <Layout>
      <div className="p-6 space-y-6">
        {/* Onboarding Checklist */}
        <OnboardingChecklist />

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {statsData.map((stat, index) => (
            <StatsCard key={stat.title} {...stat} delay={index * 100} />
          ))}
        </div>

        {/* Main Content */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Products */}
          <div className="lg:col-span-2 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-semibold text-foreground">Melhores Ofertas</h2>
              <button className="text-sm text-primary hover:underline">Ver todos</button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {products.map((product, index) => (
                <ProductCard
                  key={product._id}
                  id={product._id}
                  name={product.title}
                  company={product.source}
                  brand={product.brand}
                  price={`R$ ${product.currentPrice.toFixed(2)}`}
                  originalPrice={product.originalPrice ? `R$ ${product.originalPrice.toFixed(2)}` : undefined}
                  discount={`-${Math.round(product.discountPercentage)}%`}
                  image={product.imageUrl}
                  platforms={[]}
                  delay={index * 100}
                />
              ))}
            </div>
          </div>

          {/* Sidebar Content */}
          <div className="space-y-6">
            <SocialPlatforms />
            <RecentActivity />
          </div>
        </div>
      </div>
    </Layout>
  );
};


export default Index;
