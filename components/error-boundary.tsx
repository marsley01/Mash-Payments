"use client";

import { Component, ReactNode } from "react";

export class ErrorBoundary extends Component<
  { children: ReactNode; fallback?: ReactNode },
  { hasError: boolean; error: string }
> {
  constructor(props: { children: ReactNode; fallback?: ReactNode }) {
    super(props);
    this.state = { hasError: false, error: "" };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error: error.message };
  }

  componentDidCatch(error: Error) {
    console.error("Caught error:", error);
  }

  render() {
    if (this.state.hasError) {
      return (
        this.props.fallback || (
          <div className="min-h-screen flex items-center justify-center p-8" style={{ background: "var(--bg)" }}>
            <div
              className="rounded-xl border p-6 max-w-md text-center"
              style={{ background: "var(--sidebar)", borderColor: "var(--border)" }}
            >
              <p className="text-lg font-semibold text-[#FF4444] mb-2">Something went wrong</p>
              <p className="text-sm mb-4 font-mono" style={{ color: "var(--text-2)" }}>{this.state.error}</p>
              <button
                onClick={() => window.location.reload()}
                className="px-4 py-2 rounded-lg text-sm font-semibold transition hover:brightness-110"
                style={{ background: "var(--accent)", color: "var(--accent-btn-text)" }}
              >
                Reload Page
              </button>
            </div>
          </div>
        )
      );
    }
    return this.props.children;
  }
}
