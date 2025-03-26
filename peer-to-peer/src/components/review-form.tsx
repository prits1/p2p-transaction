"use client"

import { useState } from "react"
import { Star } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Textarea } from "@/components/ui/textarea"
import { submitReview } from "@/lib/actions/review-actions"

interface ReviewFormProps {
  transactionId: string
  revieweeId: string
  revieweeName: string
  onSuccess?: () => void
  onCancel?: () => void
}

export function ReviewForm({ transactionId, revieweeId, revieweeName, onSuccess, onCancel }: ReviewFormProps) {
  const [rating, setRating] = useState(0)
  const [hoverRating, setHoverRating] = useState(0)
  const [comment, setComment] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit() {
    if (rating === 0) {
      setError("Please select a rating")
      return
    }

    setLoading(true)
    setError(null)

    try {
      const result = await submitReview({
        transactionId,
        revieweeId,
        rating,
        comment,
      })

      if (result.error) {
        setError(result.error)
      } else {
        if (onSuccess) onSuccess()
      }
    } catch (err: any) {
      setError(err.message || "Failed to submit review")
    } finally {
      setLoading(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Leave a Review</CardTitle>
        <CardDescription>Rate your experience with {revieweeName}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {error && <div className="p-3 text-sm text-destructive bg-destructive/10 rounded-md">{error}</div>}

        <div className="flex flex-col items-center space-y-2">
          <div className="flex items-center gap-1">
            {[1, 2, 3, 4, 5].map((star) => (
              <button
                key={star}
                type="button"
                onClick={() => setRating(star)}
                onMouseEnter={() => setHoverRating(star)}
                onMouseLeave={() => setHoverRating(0)}
                className="focus:outline-none"
              >
                <Star
                  className={`h-8 w-8 ${
                    (hoverRating || rating) >= star ? "fill-yellow-400 text-yellow-400" : "text-muted-foreground"
                  }`}
                />
              </button>
            ))}
          </div>
          <p className="text-sm text-muted-foreground">
            {rating === 1 && "Poor"}
            {rating === 2 && "Fair"}
            {rating === 3 && "Good"}
            {rating === 4 && "Very Good"}
            {rating === 5 && "Excellent"}
            {rating === 0 && "Select a rating"}
          </p>
        </div>

        <div className="space-y-2">
          <Textarea
            placeholder="Share your experience with this transaction..."
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            rows={4}
          />
        </div>
      </CardContent>
      <CardFooter className="flex justify-between">
        <Button variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button onClick={handleSubmit} disabled={loading || rating === 0}>
          {loading ? "Submitting..." : "Submit Review"}
        </Button>
      </CardFooter>
    </Card>
  )
}

