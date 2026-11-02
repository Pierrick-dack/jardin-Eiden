import type { Review } from "@/lib/db/schema";
import { ReviewsBoard, type ReviewItem } from "./reviews-board";

const dateFmt = new Intl.DateTimeFormat("fr-FR", {
  day: "numeric",
  month: "long",
  year: "numeric",
  timeZone: "Africa/Douala",
});

// Dates formatées côté serveur : pas d'écart d'affichage à l'hydratation
export function ProductReviews({
  productId,
  productName,
  productSlug,
  reviews,
  viewer,
}: {
  productId: string;
  productName: string;
  productSlug: string;
  reviews: Review[];
  /** Client connecté (prénom + id), ou null */
  viewer: { id: string; firstName: string } | null;
}) {
  const reviewViewer = viewer && {
    firstName: viewer.firstName,
    alreadyReviewed: reviews.some((r) => r.customerId === viewer.id),
  };
  const items: ReviewItem[] = reviews.map((r) => ({
    id: r.id,
    authorName: r.authorName,
    rating: r.rating,
    title: r.title,
    comment: r.comment,
    isVerified: r.isVerified,
    helpfulCount: r.helpfulCount,
    date: dateFmt.format(r.createdAt),
    timestamp: r.createdAt.getTime(),
  }));

  return (
    <ReviewsBoard
      productId={productId}
      productName={productName}
      productSlug={productSlug}
      reviews={items}
      viewer={reviewViewer}
    />
  );
}
