import * as Sentry from "@sentry/react-native";

// Single entry point for opening Sentry's built-in User Feedback widget.
// Every "Report a Bug" surface (the global header, Settings, home screen, the
// crash fallback) routes through here so the trigger source is recorded as a
// breadcrumb on the resulting feedback — making it easy to tell a
// self-initiated report from one prompted after a crash. The widget itself is
// the Sentry SDK's own UI (the documented exception to the Paper-only rule); it
// captures the current trace, breadcrumbs, release/dist, and user context
// automatically.
export function openBugReport(
  source: "header" | "settings" | "home" | "crash"
): void {
  Sentry.addBreadcrumb({
    category: "feedback",
    message: `Report a Bug opened from ${source}`,
    level: "info",
  });
  Sentry.showFeedbackWidget();
}
