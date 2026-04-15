import React, { createContext, ReactNode } from "react";
import type { NotificationHandler } from "./types";

// Create context for notification handler
export const NotificationContext = createContext<NotificationHandler | null>(
  null
);

/**
 * Props for NotificationProvider
 */
export interface NotificationProviderProps {
  children: ReactNode;
  handler: NotificationHandler;
}

/**
 * NotificationProvider component
 * Provides a notification handler to all child components via context
 * This allows applications to inject their own notification/toast UI implementation
 *
 * @example
 * ```tsx
 * const toasterHandler: NotificationHandler = {
 *   success: (msg) => toast.success(msg),
 *   error: (msg) => toast.error(msg),
 *   warning: (msg) => toast.warning(msg),
 *   info: (msg) => toast.info(msg)
 * };
 *
 * <NotificationProvider handler={toasterHandler}>
 *   <App />
 * </NotificationProvider>
 * ```
 */
export const NotificationProvider: React.FC<NotificationProviderProps> = ({
  children,
  handler,
}) => {
  return (
    <NotificationContext.Provider value={handler}>
      {children}
    </NotificationContext.Provider>
  );
};
