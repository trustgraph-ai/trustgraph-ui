import { useContext } from "react";
import { NotificationContext } from "../NotificationProvider";
import type { NotificationHandler } from "../types";

/**
 * Custom hook for accessing the notification handler
 * Must be used within a NotificationProvider
 *
 * @returns {NotificationHandler} The notification handler methods
 * @throws {Error} If used outside of NotificationProvider
 *
 * @example
 * ```tsx
 * function MyComponent() {
 *   const notify = useNotification();
 *
 *   const handleSuccess = () => {
 *     notify.success("Operation completed!");
 *   };
 *
 *   const handleError = () => {
 *     notify.error("Something went wrong");
 *   };
 *
 *   return <button onClick={handleSuccess}>Do Something</button>;
 * }
 * ```
 */
export const useNotification = (): NotificationHandler => {
  const handler = useContext(NotificationContext);

  if (!handler) {
    throw new Error(
      "useNotification must be used within a NotificationProvider"
    );
  }

  return handler;
};
