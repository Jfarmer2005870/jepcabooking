import { useState, useEffect, forwardRef } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { 
  Search, 
  MapPin, 
  Star, 
  Filter,
  Sparkles,
  Wrench,
  Zap,
  Leaf,
  Paintbrush,
  Truck,
  Hammer,
  Wind,
  Bug
} from "lucide-react";

const categoryIcons: Record<string, React.ReactNode> = {
  cleaning: <Sparkles className="w-5 h-5" />,
  plumbing: <Wrench className="w-5 h-5" />,
  electrical: <Zap className="w-5 h-5" />,
  landscaping: <Leaf className="w-5 h-5" />,
  painting: <Paintbrush className="w-5 h-5" />,
  moving: <Truck className="w-5 h-5" />,
  handyman: <Hammer className="w-5 h-5" />,
  hvac: <Wind className="w-5 h-5" />,
  pest_control: <Bug className="w-5 h-5" />,
  other: <Wrench className="w-5 h-5" />,
};

const categoryLabels: Record<string, string> = {
  cleaning: "Cleaning",
  plumbing: "Plumbing",
  electrical: "Electrical",
  landscaping: "Landscaping",
  painting: "Painting",
  moving: "Moving",
  handyman: "Handyman",
  hvac: "HVAC",
  pest_control: "Pest Control",
  other: "Other",
};

interface Service {
  id: string;
  title: string;
  description: string | null;
  category: string;
  price_min: number | null;
  price_max: number | null;
  price_type: string | null;
  business_profiles: {
    id: string;
    business_name: string;
    city: string | null;
    state: string | null;
    rating: number | null;
    total_reviews: number | null;
    is_verified: boolean | null;
  };
}

const Services = forwardRef<HTMLDivElement>((_, ref) => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  
  // Get category from URL params
  const categoryFromUrl = searchParams.get("category");
  const [selectedCategory, setSelectedCategory] = useState<string | null>(categoryFromUrl);

  // Sync selectedCategory when URL changes
  useEffect(() => {
    setSelectedCategory(categoryFromUrl);
  }, [categoryFromUrl]);

  // Update URL when category changes
  const handleCategoryChange = (category: string | null) => {
    setSelectedCategory(category);
    if (category) {
      setSearchParams({ category });
    } else {
      setSearchParams({});
    }
  };

  useEffect(() => {
    fetchServices();
  }, []);

  const fetchServices = async () => {
    try {
      const { data, error } = await supabase
        .from("services")
        .select(`
          *,
          business_profiles (
            id,
            business_name,
            city,
            state,
            rating,
            total_reviews,
            is_verified
          )
        `)
        .eq("is_active", true)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setServices(data || []);
    } catch (error) {
      console.error("Error fetching services:", error);
    } finally {
      setLoading(false);
    }
  };

  const filteredServices = services.filter((service) => {
    const matchesSearch = 
      service.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      service.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      service.business_profiles.business_name.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesCategory = !selectedCategory || service.category === selectedCategory;

    return matchesSearch && matchesCategory;
  });

  const formatPrice = (service: Service) => {
    if (!service.price_min && !service.price_max) return "Get Quote";
    if (service.price_type === "quote") return "Get Quote";
    
    const fee = 1.05; // 5% platform fee
    const min = service.price_min ? `$${(service.price_min * fee).toFixed(2)}` : "";
    const max = service.price_max ? `$${(service.price_max * fee).toFixed(2)}` : "";
    const type = service.price_type === "hourly" ? "/hr" : "";
    
    if (min && max && min !== max) return `${min} - ${max}${type}`;
    return `${min || max}${type}`;
  };

  return (
    <div ref={ref} className="min-h-screen flex flex-col bg-background">
      <Header />
      <main className="flex-1 pt-20 md:pt-24">
        {/* Hero Section */}
        <div className="gradient-hero py-12 md:py-16">
          <div className="container mx-auto px-4">
            <h1 className="text-3xl md:text-4xl font-bold font-display text-foreground text-center mb-4">
              Find Local Services
            </h1>
            <p className="text-muted-foreground text-center mb-8 max-w-2xl mx-auto">
              Browse trusted professionals for all your home and business needs
            </p>
            
            {/* Search Bar */}
            <div className="max-w-2xl mx-auto">
              <div className="relative">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                <Input
                  placeholder="Search services or businesses..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-12 h-12 text-base"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Category Filters */}
        <div className="border-b border-border bg-card">
          <div className="container mx-auto px-4 py-4">
            <div className="flex items-center gap-2 overflow-x-auto pb-2">
              <Button
                variant={selectedCategory === null ? "default" : "outline"}
                size="sm"
                onClick={() => handleCategoryChange(null)}
              >
                <Filter className="w-4 h-4 mr-2" />
                All
              </Button>
              {Object.entries(categoryLabels).map(([key, label]) => (
                <Button
                  key={key}
                  variant={selectedCategory === key ? "default" : "outline"}
                  size="sm"
                  onClick={() => handleCategoryChange(key)}
                  className="whitespace-nowrap"
                >
                  {categoryIcons[key]}
                  <span className="ml-2">{label}</span>
                </Button>
              ))}
            </div>
          </div>
        </div>

        {/* Services Grid */}
        <div className="container mx-auto px-4 py-8">
          {loading ? (
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {[...Array(6)].map((_, i) => (
                <Card key={i} className="animate-pulse">
                  <CardHeader>
                    <div className="h-6 bg-muted rounded w-3/4 mb-2"></div>
                    <div className="h-4 bg-muted rounded w-1/2"></div>
                  </CardHeader>
                  <CardContent>
                    <div className="h-4 bg-muted rounded w-full mb-2"></div>
                    <div className="h-4 bg-muted rounded w-2/3"></div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : filteredServices.length === 0 ? (
            <div className="text-center py-12">
              <div className="w-16 h-16 rounded-full bg-secondary mx-auto mb-4 flex items-center justify-center">
                <Search className="w-8 h-8 text-muted-foreground" />
              </div>
              <h3 className="text-lg font-semibold text-foreground mb-2">No services found</h3>
              <p className="text-muted-foreground">
                {searchQuery || selectedCategory
                  ? "Try adjusting your search or filters"
                  : "Be the first to list a service!"}
              </p>
            </div>
          ) : (
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {filteredServices.map((service) => (
                <Card key={service.id} className="hover:shadow-medium transition-shadow">
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div>
                        <CardTitle className="text-lg">{service.title}</CardTitle>
                        <CardDescription className="flex items-center gap-1 mt-1">
                          {service.business_profiles.business_name}
                          {service.business_profiles.is_verified && (
                            <Badge variant="secondary" className="text-xs">Verified</Badge>
                          )}
                        </CardDescription>
                      </div>
                      <Badge variant="outline" className="flex items-center gap-1">
                        {categoryIcons[service.category]}
                        {categoryLabels[service.category]}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent>
                    {service.description && (
                      <p className="text-sm text-muted-foreground mb-4 line-clamp-2">
                        {service.description}
                      </p>
                    )}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4 text-sm text-muted-foreground">
                        {service.business_profiles.city && (
                          <span className="flex items-center gap-1">
                            <MapPin className="w-4 h-4" />
                            {service.business_profiles.city}, {service.business_profiles.state}
                          </span>
                        )}
                        {service.business_profiles.rating && service.business_profiles.rating > 0 && (
                          <span className="flex items-center gap-1">
                            <Star className="w-4 h-4 fill-accent text-accent" />
                            {service.business_profiles.rating.toFixed(1)}
                            {service.business_profiles.total_reviews && (
                              <span>({service.business_profiles.total_reviews})</span>
                            )}
                          </span>
                        )}
                      </div>
                      <span className="font-semibold text-primary">
                        {formatPrice(service)}
                      </span>
                    </div>
                    <Button className="w-full mt-4" asChild>
                      <Link to={`/services/${service.id}`}>View Details</Link>
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </main>
      <Footer />
    </div>
  );
});

Services.displayName = "Services";

export default Services;
