import { describe, it, expect, vi } from "vitest";
import { renderHook } from "@testing-library/react";
import React from "react";
import { NotificationProvider } from "../NotificationProvider";
import { useNotification } from "../hooks/useNotification";
import type { NotificationHandler } from "../types";

describe("NotificationProvider", () => {
  it("should provide notification handler to children", () => {
    const mockHandler: NotificationHandler = {
      success: vi.fn(),
      error: vi.fn(),
      warning: vi.fn(),
      info: vi.fn(),
    };

    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <NotificationProvider handler={mockHandler}>
        {children}
      </NotificationProvider>
    );

    const { result } = renderHook(() => useNotification(), { wrapper });

    expect(result.current).toBe(mockHandler);
  });

  it("should throw error when useNotification used outside provider", () => {
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    expect(() => {
      renderHook(() => useNotification());
    }).toThrow("useNotification must be used within a NotificationProvider");

    consoleSpy.mockRestore();
  });

  it("should call handler methods correctly", () => {
    const mockHandler: NotificationHandler = {
      success: vi.fn(),
      error: vi.fn(),
      warning: vi.fn(),
      info: vi.fn(),
    };

    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <NotificationProvider handler={mockHandler}>
        {children}
      </NotificationProvider>
    );

    const { result } = renderHook(() => useNotification(), { wrapper });

    result.current.success("Success message");
    result.current.error("Error message");
    result.current.warning("Warning message");
    result.current.info("Info message");

    expect(mockHandler.success).toHaveBeenCalledWith("Success message");
    expect(mockHandler.error).toHaveBeenCalledWith("Error message");
    expect(mockHandler.warning).toHaveBeenCalledWith("Warning message");
    expect(mockHandler.info).toHaveBeenCalledWith("Info message");
  });
});
