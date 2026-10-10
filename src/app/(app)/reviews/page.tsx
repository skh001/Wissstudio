import type { Metadata } from "next";
import { listReviews } from "@/features/reviews/repository";
import { getSettings } from "@/features/settings/repository";
import { ReviewsView } from "@/features/reviews/components/reviews-view";

export const metadata: Metadata = { title: "Reviews" };

export default async function ReviewsPage() {
  const [reviews, settings] = await Promise.all([listReviews(), getSettings()]);
  return <ReviewsView reviews={reviews} googleReady={!!process.env.GOOGLE_PLACES_API_KEY && !!settings.google_place_id} />;
}
