import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Button } from "@/components/ui/button";
import { Star, ChevronDown, ChevronUp } from "lucide-react";

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
  const [reviews, setReviews] = useState<Review[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);

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

      // Fetch profile names for each review
      const reviewsWithNames = await Promise.all(
        (data || []).map(async (review) => {
          const { data: profile } = await supabase
            .from("profiles")
            .select("full_name")
            .eq("user_id", review.consumer_id)
            .maybeSingle();
          return { ...review, profiles: profile };
        })
      );

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
          reviews.map((review) => (
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
