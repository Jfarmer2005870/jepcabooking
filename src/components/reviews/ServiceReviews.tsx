import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Star, ChevronDown, ChevronUp, Sparkles, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface Review {
  id: string;
  rating: number;
  comment: string | null;
  created_at: string;
  profiles: {
    full_name: string | null;
  } | null;
}

interface ServiceReviewsProps {
  businessId: string;
}

const ServiceReviews = ({ businessId }: ServiceReviewsProps) => {
  const { toast } = useToast();
  const [reviews, setReviews] = useState<Review[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [insights, setInsights] = useState<{
    strengths: string[];
    concerns: string[];
    summary: string;
  } | null>(null);
  const [insightsLoading, setInsightsLoading] = useState(false);

  const generateInsights = async () => {
    if (reviews.length === 0) return;
    setInsightsLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("ai-assist", {
        body: {
          action: "review_insights",
          payload: {
            reviews: reviews.map((r) => ({ rating: r.rating, comment: r.comment })),
          },
        },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      setInsights(data?.result || null);
    } catch (e) {
      toast({
        title: "AI error",
        description: e instanceof Error ? e.message : "Could not analyze",
        variant: "destructive",
      });
    } finally {
      setInsightsLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen && reviews.length === 0) {
      fetchReviews();
    }
  }, [isOpen]);

  const fetchReviews = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("reviews")
        .select("id, rating, comment, created_at, consumer_id")
        .eq("business_id", businessId)
        .order("created_at", { ascending: false });

      if (error) throw error;

      const reviewData = data || [];
      
      // Batch fetch all profiles at once instead of N+1
      const consumerIds = [...new Set(reviewData.map((r) => r.consumer_id))];
      const { data: profiles } = consumerIds.length > 0
        ? await supabase
            .from("profiles")
            .select("user_id, full_name")
            .in("user_id", consumerIds)
        : { data: [] };

      const profileMap = new Map(
        (profiles || []).map((p) => [p.user_id, p])
      );

      const reviewsWithNames = reviewData.map((review) => ({
        ...review,
        profiles: profileMap.get(review.consumer_id) || null,
      }));

      setReviews(reviewsWithNames);
    } catch (error) {
      console.error("Error fetching reviews:", error);
    } finally {
      setLoading(false);
    }
  };

  const averageRating =
    reviews.length > 0
      ? reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length
      : 0;

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <CollapsibleTrigger asChild>
        <Button variant="outline" className="w-full justify-between">
          <span className="flex items-center gap-2">
            <Star className="w-4 h-4 fill-accent text-accent" />
            Reviews {reviews.length > 0 && `(${reviews.length})`}
            {reviews.length > 0 && (
              <span className="text-muted-foreground text-sm">
                — {averageRating.toFixed(1)} avg
              </span>
            )}
          </span>
          {isOpen ? (
            <ChevronUp className="w-4 h-4" />
          ) : (
            <ChevronDown className="w-4 h-4" />
          )}
        </Button>
      </CollapsibleTrigger>
      <CollapsibleContent className="mt-3 space-y-3">
        {loading ? (
          <div className="text-center py-4 text-sm text-muted-foreground">
            Loading reviews...
          </div>
        ) : reviews.length === 0 ? (
          <div className="text-center py-4 text-sm text-muted-foreground">
            No reviews yet
          </div>
        ) : (
          <>
            {reviews.length >= 2 && (
              <div className="rounded-lg border border-primary/20 bg-primary/5 p-3 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-primary" />
                    AI insights
                  </span>
                  {!insights && (
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-7 px-2 text-xs"
                      disabled={insightsLoading}
                      onClick={generateInsights}
                    >
                      {insightsLoading ? (
                        <Loader2 className="w-3 h-3 animate-spin" />
                      ) : (
                        "Analyze reviews"
                      )}
                    </Button>
                  )}
                </div>
                {insights && (
                  <div className="space-y-2">
                    <p className="text-sm text-foreground">{insights.summary}</p>
                    {insights.strengths.length > 0 && (
                      <div className="flex flex-wrap gap-1.5">
                        <span className="text-xs text-muted-foreground self-center">Strengths:</span>
                        {insights.strengths.map((s, i) => (
                          <Badge key={i} variant="secondary" className="text-xs">
                            {s}
                          </Badge>
                        ))}
                      </div>
                    )}
                    {insights.concerns.length > 0 && (
                      <div className="flex flex-wrap gap-1.5">
                        <span className="text-xs text-muted-foreground self-center">Concerns:</span>
                        {insights.concerns.map((s, i) => (
                          <Badge key={i} variant="outline" className="text-xs">
                            {s}
                          </Badge>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
            {reviews.map((review) => (
              <div
                key={review.id}
                className="p-3 bg-muted/50 rounded-lg space-y-1"
              >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <Star
                      key={star}
                      className={`w-3.5 h-3.5 ${
                        star <= review.rating
                          ? "fill-accent text-accent"
                          : "text-muted-foreground/30"
                      }`}
                    />
                  ))}
                </div>
                <span className="text-xs text-muted-foreground">
                  {new Date(review.created_at).toLocaleDateString()}
                </span>
              </div>
              {review.comment && (
                <p className="text-sm text-foreground">{review.comment}</p>
              )}
              <p className="text-xs text-muted-foreground">
                — {review.profiles?.full_name || "Anonymous"}
              </p>
            </div>
          ))
        )}
      </CollapsibleContent>
    </Collapsible>
  );
};

export default ServiceReviews;
