"use client";

import { useState } from "react";
import { Star, Send, X, CheckCircle2 } from "lucide-react";

interface FeedbackModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (score: number, notes: string) => void;
}

export function FeedbackModal({ isOpen, onClose, onSubmit }: FeedbackModalProps) {
  const [rating, setRating] = useState<number>(5);
  const [notes, setNotes] = useState<string>("");
  const [submitted, setSubmitted] = useState<boolean>(false);

  if (!isOpen) return null;

  function handleSubmit() {
    onSubmit(rating * 20, notes);
    setSubmitted(true);
    setTimeout(() => {
      setSubmitted(false);
      onClose();
    }, 1500);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
      <div className="w-full max-w-sm bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-2xl space-y-4 relative">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-slate-400 hover:text-white transition"
        >
          <X className="w-4 h-4" />
        </button>

        {submitted ? (
          <div className="py-6 text-center space-y-2">
            <CheckCircle2 className="w-10 h-10 text-emerald-400 mx-auto animate-bounce" />
            <h3 className="text-base font-bold text-white">Feedback Submitted!</h3>
            <p className="text-xs text-slate-400">
              Recorded on ERC-8004 Reputation Registry
            </p>
          </div>
        ) : (
          <>
            <div className="space-y-1">
              <h3 className="font-bold text-white text-base">Rate Prompt Execution</h3>
              <p className="text-xs text-slate-400">
                Submit onchain reputation feedback for AgentPay AI
              </p>
            </div>

            {/* Star Rating Selector */}
            <div className="flex justify-center space-x-2 py-2">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  onClick={() => setRating(star)}
                  className="p-1.5 transition transform hover:scale-110"
                >
                  <Star
                    className={`w-7 h-7 ${
                      star <= rating
                        ? "text-amber-400 fill-amber-400"
                        : "text-slate-700"
                    }`}
                  />
                </button>
              ))}
            </div>

            {/* Notes Input */}
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Optional notes (e.g., 'Fast response, accurate output')"
              className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-amber-400/50 resize-none h-20"
            />

            <button
              onClick={handleSubmit}
              className="w-full bg-amber-400 hover:bg-amber-300 text-slate-950 font-semibold py-2.5 rounded-xl transition text-sm flex items-center justify-center space-x-2"
            >
              <Send className="w-4 h-4" />
              <span>Submit Reputation Feedback</span>
            </button>
          </>
        )}
      </div>
    </div>
  );
}
