const AUDIO_READY_ICON = "/favicon.ico";

function canUseBrowserNotifications(): boolean {
  return typeof window !== "undefined" && "Notification" in window;
}

export async function primeBrowserNotifications(): Promise<NotificationPermission | null> {
  if (!canUseBrowserNotifications()) return null;
  if (Notification.permission !== "default") return Notification.permission;

  try {
    return await Notification.requestPermission();
  } catch {
    return null;
  }
}

export function notifyAudioReady(storyId: string, title: string): void {
  if (!canUseBrowserNotifications()) return;
  if (Notification.permission !== "granted") return;

  const notification = new Notification("Your voice is successfully generated", {
    body: title ? `"${title}" is ready to play and download.` : "Your story audio is ready to play and download.",
    icon: AUDIO_READY_ICON,
    tag: `story-audio-ready-${storyId}`,
  });

  notification.onclick = () => {
    window.focus();
    window.location.href = `/user/audio-download?storyId=${encodeURIComponent(storyId)}`;
  };
}