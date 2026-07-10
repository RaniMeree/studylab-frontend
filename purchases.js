import { Platform } from 'react-native';
import Constants from 'expo-constants';

const REVENUECAT_IOS_KEY = process.env.EXPO_PUBLIC_RC_IOS_KEY ?? 'appl_REPLACE_ME';
const REVENUECAT_ANDROID_KEY = process.env.EXPO_PUBLIC_RC_ANDROID_KEY ?? 'goog_REPLACE_ME';
const REVENUECAT_WEB_KEY = process.env.EXPO_PUBLIC_RC_WEB_KEY ?? 'rcb_REPLACE_ME';

// RevenueCat native SDK doesn't work inside Expo Go — skip silently in that environment.
const isExpoGo = Constants.appOwnership === 'expo';

let configured = false;
let webPurchases = null;

export async function configurePurchases(appUserId) {
  if (configured) return;
  if (Platform.OS === 'web') {
    const { Purchases } = await import('@revenuecat/purchases-js');
    webPurchases = Purchases.configure(REVENUECAT_WEB_KEY, appUserId);
    configured = true;
  } else if (!isExpoGo) {
    const RNPurchases = (await import('react-native-purchases')).default;
    const apiKey = Platform.OS === 'ios' ? REVENUECAT_IOS_KEY : REVENUECAT_ANDROID_KEY;
    await RNPurchases.configure({ apiKey, appUserID: appUserId });
    configured = true;
  }
}

export async function getOfferings() {
  if (isExpoGo && Platform.OS !== 'web') return [];
  if (Platform.OS === 'web') {
    const offerings = await webPurchases.getOfferings();
    return offerings.current?.availablePackages ?? [];
  }
  const RNPurchases = (await import('react-native-purchases')).default;
  const offerings = await RNPurchases.getOfferings();
  return offerings.current?.availablePackages ?? [];
}

export async function purchasePackage(pkg) {
  if (isExpoGo && Platform.OS !== 'web') throw new Error('Purchases not available in Expo Go');
  if (Platform.OS === 'web') return webPurchases.purchase({ rcPackage: pkg });
  const RNPurchases = (await import('react-native-purchases')).default;
  return RNPurchases.purchasePackage(pkg);
}

export async function restorePurchases() {
  if (isExpoGo && Platform.OS !== 'web') return;
  if (Platform.OS === 'web') return webPurchases.getCustomerInfo();
  const RNPurchases = (await import('react-native-purchases')).default;
  return RNPurchases.restorePurchases();
}
