import { Capacitor } from '@capacitor/core';
import { Camera, CameraResultType, CameraSource } from '@capacitor/camera';
import { PushNotifications } from '@capacitor/push-notifications';
import { Haptics, ImpactStyle } from '@capacitor/haptics';
import { StatusBar, Style } from '@capacitor/status-bar';
import { App as CapApp } from '@capacitor/app';

export const isNativePlatform = (): boolean => {
  return Capacitor.isNativePlatform();
};

export const getPlatform = (): string => {
  return Capacitor.getPlatform();
};

/**
 * Trigger subtle haptic feedback for mobile interactions
 */
export const triggerHaptic = async (style: ImpactStyle = ImpactStyle.Light): Promise<void> => {
  if (isNativePlatform()) {
    try {
      await Haptics.impact({ style });
    } catch (e) {
      // Haptics not available or permission denied
    }
  }
};

/**
 * Configure native Android/iOS Status Bar appearance
 */
export const setupStatusBar = async (isDark: boolean = true): Promise<void> => {
  if (isNativePlatform()) {
    try {
      await StatusBar.setStyle({ style: isDark ? Style.Dark : Style.Light });
      if (Capacitor.getPlatform() === 'android') {
        await StatusBar.setBackgroundColor({ color: '#070d18' });
      }
    } catch (e) {
      // Ignore if not supported
    }
  }
};

/**
 * Capture photo from camera or choose from gallery with native picker
 */
export const pickNativeImage = async (source: CameraSource = CameraSource.Prompt): Promise<string | null> => {
  try {
    const image = await Camera.getPhoto({
      quality: 85,
      allowEditing: false,
      resultType: CameraResultType.DataUrl,
      source,
    });
    return image.dataUrl || null;
  } catch (error) {
    console.warn('Native camera picker cancelled or not available:', error);
    return null;
  }
};

/**
 * Initialize Push Notifications (FCM / APNs)
 */
export const initPushNotifications = async (
  onTokenReceived?: (token: string) => void,
  onNotificationReceived?: (notification: any) => void
): Promise<boolean> => {
  if (!isNativePlatform()) return false;

  try {
    let permStatus = await PushNotifications.checkPermissions();
    if (permStatus.receive === 'prompt') {
      permStatus = await PushNotifications.requestPermissions();
    }

    if (permStatus.receive !== 'granted') {
      console.warn('Push notification permission not granted');
      return false;
    }

    await PushNotifications.register();

    if (onTokenReceived) {
      PushNotifications.addListener('registration', (token) => {
        onTokenReceived(token.value);
      });
    }

    if (onNotificationReceived) {
      PushNotifications.addListener('pushNotificationReceived', (notification) => {
        onNotificationReceived(notification);
      });
    }

    return true;
  } catch (err) {
    console.warn('Push notification init error:', err);
    return false;
  }
};

/**
 * Setup Android Hardware Back Button listener
 */
export const registerHardwareBackButton = (handler: () => boolean): (() => void) => {
  if (!isNativePlatform()) return () => {};

  const listenerHandle = CapApp.addListener('backButton', ({ canGoBack }) => {
    const handled = handler();
    if (!handled && canGoBack) {
      window.history.back();
    } else if (!handled && !canGoBack) {
      CapApp.exitApp();
    }
  });

  return () => {
    listenerHandle.then((h) => h.remove());
  };
};
