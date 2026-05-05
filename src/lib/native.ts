import { Capacitor } from "@capacitor/core";
import { StatusBar, Style } from "@capacitor/status-bar";
import { SplashScreen } from "@capacitor/splash-screen";
import { App } from "@capacitor/app";
import { PushNotifications } from "@capacitor/push-notifications";
import { supabase } from "@/integrations/supabase/client";

export const isNative = () => Capacitor.isNativePlatform();

/** Call once at app boot. Safe on web (no-ops). */
export const initNative = async () => {
  if (!isNative()) return;

  try {
    await StatusBar.setStyle({ style: Style.Dark });
    await StatusBar.setBackgroundColor({ color: "#0d9488" });
  } catch {}

  try {
    await SplashScreen.hide();
  } catch {}

  // Hardware back button → browser back / exit on root
  try {
    App.addListener("backButton", ({ canGoBack }) => {
      if (canGoBack) window.history.back();
      else App.exitApp();
    });
  } catch {}
};

/** Request push permission and register the device token with the backend. */
export const registerPushNotifications = async () => {
  if (!isNative()) return { ok: false, reason: "not-native" as const };

  const perm = await PushNotifications.checkPermissions();
  let status = perm.receive;
  if (status === "prompt" || status === "prompt-with-rationale") {
    const req = await PushNotifications.requestPermissions();
    status = req.receive;
  }
  if (status !== "granted") return { ok: false, reason: "denied" as const };

  await PushNotifications.register();

  PushNotifications.addListener("registration", async (token) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    // Best-effort store; ignore if table not present
    try {
      await supabase.from("device_tokens" as any).upsert({
        user_id: user.id,
        token: token.value,
        platform: Capacitor.getPlatform(),
      });
    } catch {}
  });

  PushNotifications.addListener("registrationError", (err) => {
    console.error("Push registration error", err);
  });

  return { ok: true as const };
};
