"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Lock, AlertCircle, ArrowRight, Loader2, ArrowLeft, KeyRound, Delete } from "lucide-react";

export default function LoginPage() {
  const router = useRouter();
  const [pin, setPin] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handlePinSubmit = async (pinValue: string) => {
    if (!pinValue || pinValue.length < 6) {
      setError("Please enter the complete 6-digit Admin PIN.");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pin: pinValue.trim() }),
      });

      const text = await res.text();
      let data: { error?: string } = {};
      try {
        data = text ? JSON.parse(text) : {};
      } catch {
        console.error("Non-JSON login response:", text);
      }

      if (!res.ok) {
        throw new Error(
          data.error ||
            (res.status === 401
              ? "Incorrect Admin PIN. Please check and try again."
              : `Unable to verify PIN (Status ${res.status}). Please try again.`)
        );
      }

      router.push("/admin");
      router.refresh();
    } catch (err: unknown) {
      const errorObj = err as Error;
      setError(errorObj.message || "Invalid Admin PIN.");
    } finally {
      setLoading(false);
    }
  };

  const handleKeyClick = (digit: string) => {
    if (loading) return;
    if (pin.length < 6) {
      const newPin = pin + digit;
      setPin(newPin);
      if (newPin.length === 6) {
        handlePinSubmit(newPin);
      }
    }
  };

  const handleDelete = () => {
    if (loading) return;
    setPin((prev) => prev.slice(0, -1));
    setError(null);
  };

  const handleClear = () => {
    if (loading) return;
    setPin("");
    setError(null);
  };

  return (
    <div className="min-h-screen bg-[#FAF7F2] text-[#1C1917] flex flex-col justify-between py-8 px-4 sm:px-6">
      {/* Top Back Navigation */}
      <div className="max-w-md w-full mx-auto">
        <a
          href="/"
          className="inline-flex items-center gap-2 py-2.5 px-3.5 rounded-xl text-sm font-medium text-stone-700 hover:text-stone-900 hover:bg-stone-200/60 transition-colors min-h-[44px]"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Family Archive</span>
        </a>
      </div>

      {/* Main Sign-In Panel */}
      <div className="max-w-md w-full mx-auto my-auto py-4">
        <div className="text-center mb-6">
          <img
            src="/logo.png"
            alt="Family Archive Logo"
            className="w-20 h-20 rounded-2xl mx-auto mb-3.5 object-contain shadow-xs border border-stone-200/90 bg-white p-1.5"
          />
          <h1 className="font-serif text-2xl sm:text-3xl font-bold text-stone-900 tracking-tight">
            Family Administrator
          </h1>
          <p className="text-xs sm:text-sm text-stone-600 mt-1.5 max-w-xs mx-auto">
            Enter the 6-digit security PIN to access administrative tools.
          </p>
        </div>

        <div className="bg-white p-6 sm:p-8 rounded-3xl border border-stone-200/80 shadow-xs space-y-5">
          {error && (
            <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-800 flex items-start gap-2.5 animate-in fade-in">
              <AlertCircle className="w-4 h-4 text-rose-600 flex-shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {/* 6-Digit Visual Display */}
          <div className="flex justify-center items-center gap-2.5 py-2">
            {[0, 1, 2, 3, 4, 5].map((idx) => {
              const isFilled = idx < pin.length;
              return (
                <div
                  key={idx}
                  className={`w-11 h-13 rounded-xl border-2 flex items-center justify-center text-xl font-bold transition-all ${
                    isFilled
                      ? "border-amber-900 bg-amber-50/50 text-stone-900 shadow-2xs"
                      : "border-stone-200 bg-stone-50/60 text-stone-300"
                  }`}
                >
                  {isFilled ? "•" : ""}
                </div>
              );
            })}
          </div>

          {/* Direct Keyboard Input (optional) */}
          <div className="relative">
            <input
              type="password"
              inputMode="numeric"
              maxLength={6}
              value={pin}
              onChange={(e) => {
                const val = e.target.value.replace(/\D/g, "").slice(0, 6);
                setPin(val);
                if (val.length === 6) {
                  handlePinSubmit(val);
                }
              }}
              placeholder="Or type 6-digit PIN..."
              className="w-full text-center tracking-widest py-2.5 px-4 bg-stone-50 border border-stone-300 rounded-xl text-sm font-mono text-stone-900 focus:outline-none focus:border-amber-800 focus:bg-white transition-all"
            />
          </div>

          {/* Touch Number Pad (Fitts's Law 48px+ Touch for mobile) */}
          <div className="grid grid-cols-3 gap-2.5 pt-2">
            {["1", "2", "3", "4", "5", "6", "7", "8", "9"].map((num) => (
              <button
                key={num}
                type="button"
                onClick={() => handleKeyClick(num)}
                disabled={loading}
                className="min-h-[52px] rounded-2xl bg-stone-100/90 hover:bg-amber-100/70 active:bg-amber-200 text-stone-900 font-bold text-lg border border-stone-200/80 cursor-pointer transition-colors shadow-2xs select-none disabled:opacity-50"
              >
                {num}
              </button>
            ))}

            <button
              type="button"
              onClick={handleClear}
              disabled={loading || pin.length === 0}
              className="min-h-[52px] rounded-2xl bg-stone-100/60 hover:bg-stone-200 text-stone-600 font-medium text-xs border border-stone-200/70 cursor-pointer transition-colors select-none disabled:opacity-30"
            >
              Clear
            </button>

            <button
              type="button"
              onClick={() => handleKeyClick("0")}
              disabled={loading}
              className="min-h-[52px] rounded-2xl bg-stone-100/90 hover:bg-amber-100/70 active:bg-amber-200 text-stone-900 font-bold text-lg border border-stone-200/80 cursor-pointer transition-colors shadow-2xs select-none disabled:opacity-50"
            >
              0
            </button>

            <button
              type="button"
              onClick={handleDelete}
              disabled={loading || pin.length === 0}
              className="min-h-[52px] rounded-2xl bg-stone-100/60 hover:bg-rose-100 text-stone-700 font-medium text-sm border border-stone-200/70 cursor-pointer transition-colors flex items-center justify-center select-none disabled:opacity-30"
              title="Delete"
            >
              <Delete className="w-5 h-5" />
            </button>
          </div>

          {/* Submit Action */}
          <button
            type="button"
            onClick={() => handlePinSubmit(pin)}
            disabled={loading || pin.length < 6}
            className="w-full min-h-[48px] flex items-center justify-center gap-2 py-3 px-4 rounded-xl text-sm font-semibold text-white bg-amber-900 hover:bg-amber-950 focus:outline-none disabled:opacity-50 transition-all cursor-pointer shadow-xs mt-2"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Verifying PIN...</span>
              </>
            ) : (
              <>
                <KeyRound className="w-4 h-4" />
                <span>Unlock Admin Access</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Footer */}
      <div className="max-w-md w-full mx-auto text-center text-xs text-stone-400">
        Our Family Archive • Private Digital Heritage
      </div>
    </div>
  );
}
