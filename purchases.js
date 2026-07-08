import { Platform } from 'react-native';

// RevenueCat public SDK keys — from RevenueCat dashboard > Project Settings > API Keys.
// These are PUBLIC keys (safe to ship in the app), never the secret v1 API key.
// 👉 Replace these with your keys from RevenueCat > Project Settings > API Keys
// iOS key starts with "appl_", Android with "goog_", Web Billing with "rcb_"
const REVENUECAT_IOS_KEY = process.env.EXPO_PUBLIC_RC_IOS_KEY ?? 'appl_REPLACE_ME';
const REVENUECAT_ANDROID_KEY = process.env.EXPO_PUBLIC_RC_ANDROID_KEY ?? 'goog_REPLACE_ME';
const REVENUECAT_WEB_KEY = process.env.EXPO_PUBLIC_RC_WEB_KEY ?? 'rcb_REPLACE_ME';

let configured = false;
let webPurchases = null; // holds the configured @revenuecat/purchases-js instance

export async function configurePurchases(appUserId) {
  if (configured) return;
  if (Platform.OS === 'web') {
    const { Purchases } = await import('@revenuecat/purchases-js');
    webPurchases = Purchases.configure(REVENUECAT_WEB_KEY, appUserId);
  } else {
    const RNPurchases = (await import('react-native-purchases')).default;
    const apiKey = Platform.OS === 'ios' ? REVENUECAT_IOS_KEY : REVENUECAT_ANDROID_KEY;
    await RNPurchases.configure({ apiKey, appUserID: appUserId });
  }
  configured = true;
}

// Returns the current RevenueCat "offering" — the set of subscription
// packages you configured in the RevenueCat dashboard (e.g. monthly/yearly).
export async function getOfferings() {
  if (Platform.OS === 'web') {
    const offerings = await webPurchases.getOfferings();
    return offerings.current?.availablePackages ?? [];
  }
  const RNPurchases = (await import('react-native-purchases')).default;
  const offerings = await RNPurchases.getOfferings();
  return offerings.current?.availablePackages ?? [];
}

export async function purchasePackage(pkg) {
  if (Platform.OS === 'web') {
    return webPurchases.purchase({ rcPackage: pkg });
  }
  const RNPurchases = (await import('react-native-purchases')).default;
  return RNPurchases.purchasePackage(pkg);
}

export async function restorePurchases() {
  if (Platform.OS === 'web') {
    return webPurchases.getCustomerInfo();
  }
  const RNPurchases = (await import('react-native-purchases')).default;
  return RNPurchases.restorePurchases();
}
