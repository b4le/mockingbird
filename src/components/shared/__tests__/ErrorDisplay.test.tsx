import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { ErrorDisplay } from "../ErrorDisplay";

const baseProps = {
  reset: () => {},
  title: "Something broke",
  fallbackMessage: "Try again later.",
};

describe("ErrorDisplay — NODE_ENV-gated message rendering", () => {
  const originalEnv = process.env.NODE_ENV;

  beforeEach(() => {
    vi.unstubAllEnvs();
  });

  afterEach(() => {
    cleanup();
    vi.unstubAllEnvs();
    process.env.NODE_ENV = originalEnv;
  });

  it("renders error.message in non-production (dev DX)", () => {
    vi.stubEnv("NODE_ENV", "development");
    const error = Object.assign(new Error("path /etc/secrets leaked"), {
      digest: "abc123",
    });
    render(<ErrorDisplay error={error} {...baseProps} />);
    expect(screen.queryByText(/path \/etc\/secrets leaked/)).not.toBeNull();
    expect(screen.queryByText(/Reference: abc123/)).toBeNull();
  });

  it("does NOT render error.message in production", () => {
    vi.stubEnv("NODE_ENV", "production");
    const error = Object.assign(new Error("path /etc/secrets leaked"), {
      digest: "abc123",
    });
    render(<ErrorDisplay error={error} {...baseProps} />);
    expect(screen.queryByText(/path \/etc\/secrets leaked/)).toBeNull();
  });

  it("renders error.digest as a reference in production when present", () => {
    vi.stubEnv("NODE_ENV", "production");
    const error = Object.assign(new Error("internal stack"), {
      digest: "deadbeef",
    });
    render(<ErrorDisplay error={error} {...baseProps} />);
    expect(screen.queryByText(/Reference: deadbeef/)).not.toBeNull();
  });

  it("falls back to fallbackMessage in production when digest is absent", () => {
    vi.stubEnv("NODE_ENV", "production");
    const error = new Error("internal stack") as Error & { digest?: string };
    render(<ErrorDisplay error={error} {...baseProps} />);
    expect(screen.queryByText("Try again later.")).not.toBeNull();
    expect(screen.queryByText(/internal stack/)).toBeNull();
  });
});
