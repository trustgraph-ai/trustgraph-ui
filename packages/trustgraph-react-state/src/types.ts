/**
 * Interface for notification handlers
 * Applications can implement this interface to integrate their own toast/notification UI
 */
export interface NotificationHandler {
  /**
   * Display a success notification
   * @param message - The success message to display
   */
  success: (message: string) => void;

  /**
   * Display an error notification
   * @param message - The error message to display
   */
  error: (message: string) => void;

  /**
   * Display a warning notification
   * @param message - The warning message to display
   */
  warning: (message: string) => void;

  /**
   * Display an informational notification
   * @param message - The informational message to display
   */
  info: (message: string) => void;
}
