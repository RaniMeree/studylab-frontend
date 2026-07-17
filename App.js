import { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaProvider, SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { api, API_BASE, pingBackend } from './api';
import { FullPlayer, MiniPlayer, PlayerProvider } from './player';
import { configurePurchases } from './purchases';
import { AddScreen } from './screens/AddScreen';
import { AuthScreen, OnboardingScreen, ProfileSetupScreen } from './screens/AuthScreen';
import { CourseScreen } from './screens/CourseScreen';
import { DocumentScreen } from './screens/DocumentScreen';
import { HomeScreen } from './screens/HomeScreen';
import { FullPaywallScreen, PaywallScreen, ProfileScreen } from './screens/ProfileScreen';
import { ReviewScreen } from './screens/ReviewScreen';
import { supabase } from './supabaseClient';
import { I18nContext, UI_LANGUAGES, makeT, useT } from './i18n';
import { ThemeContext, usePalette, useThemeColors } from './theme';
import { Icon, ToastProvider } from './ui';

const TABS = [
  { key: 'home', icon: 'home-outline', activeIcon: 'home' },
  { key: 'review', icon: 'albums-outline', activeIcon: 'albums' },
  { key: 'add', icon: 'add-circle-outline', activeIcon: 'add-circle' },
  { key: 'profile', icon: 'person-outline', activeIcon: 'person' },
];

function TabBar({ tab, onChange, dueCount }) {
  const c = useThemeColors();
  const t = useT();
  const insets = useSafeAreaInsets();
  return (
    <View
      style={{
        flexDirection: 'row',
        backgroundColor: c.glass ? 'rgba(13,2,33,0.96)' : c.card,
        borderTopWidth: 1,
        borderColor: c.glass ? 'rgba(167,139,250,0.18)' : c.border,
        paddingVertical: 8,
        paddingBottom: Math.max(insets.bottom, 10),
      }}
    >
      {TABS.map((item) => {
        const active = tab === item.key;
        return (
          <TouchableOpacity
            key={item.key}
            onPress={() => onChange(item.key)}
            style={{ flex: 1, alignItems: 'center', gap: 3 }}
          >
            <View style={active && c.glass ? {
              backgroundColor: 'rgba(124,58,237,0.22)',
              borderRadius: 10, padding: 4,
              shadowColor: '#7C3AED', shadowOffset: { width: 0, height: 0 },
              shadowOpacity: 0.8, shadowRadius: 8,
            } : { padding: 4 }}>
              <Icon name={active ? item.activeIcon : item.icon} size={22} color={active ? c.accent : c.textMuted} />
              {item.key === 'review' && dueCount > 0 && (
                <View
                  style={{
                    position: 'absolute', top: -1, right: -6, minWidth: 15, height: 15,
                    borderRadius: 8, backgroundColor: c.danger,
                    alignItems: 'center', justifyContent: 'center', paddingHorizontal: 3,
                  }}
                >
                  <Text style={{ color: '#fff', fontSize: 9, fontWeight: '700' }}>{dueCount}</Text>
                </View>
              )}
            </View>
            <Text style={{ fontSize: 10, color: active ? c.accent : c.textMuted, fontWeight: active ? '600' : '400' }}>{t(item.key)}</Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

function AppShell({ session, subscription, refreshSubscription, settings, onChangeTheme, onChangeLang }) {
  const c = useThemeColors();
  const [tab, setTab] = useState('home');
  // Home tab stack: {screen:'home'} | {screen:'course',courseId} | {screen:'document',courseId,docId}
  const [homeNav, setHomeNav] = useState({ screen: 'home' });
  const [addCourseId, setAddCourseId] = useState(null);
  const [voicesByLanguage, setVoicesByLanguage] = useState({});
  const [dueCount, setDueCount] = useState(0);
  const [showPaywall, setShowPaywall] = useState(false);

  useEffect(() => {
    fetch(`${API_BASE}/voices`).then((r) => r.json()).then(setVoicesByLanguage).catch(() => {});
  }, []);

  useEffect(() => {
    api('/review/due').then((d) => setDueCount(d.due.length)).catch(() => {});
  }, [tab]);

  // Re-tapping the Home tab while already on it pops back to the course list
  const changeTab = (key) => {
    if (key === 'home' && tab === 'home') setHomeNav({ screen: 'home' });
    setTab(key);
  };

  const openCourse = (courseId) => {
    setTab('home');
    setHomeNav({ screen: 'course', courseId });
  };
  const openDocument = (courseId, docId) => {
    setTab('home');
    setHomeNav({ screen: 'document', courseId, docId });
  };

  return (
    <View style={{ flex: 1 }}>
      {subscription?.status === 'trial' && (
        <TouchableOpacity onPress={() => setShowPaywall(true)}>
          <Text
            style={{
              backgroundColor: c.accentSoft, color: c.accent, fontSize: 12, fontWeight: '600',
              textAlign: 'center', paddingVertical: 7,
            }}
          >
            Free trial — {subscription.trial_days_left} day
            {subscription.trial_days_left === 1 ? '' : 's'} left · Subscribe
          </Text>
        </TouchableOpacity>
      )}
      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ maxWidth: 640, width: '100%', alignSelf: 'center' }}>
        {tab === 'home' && homeNav.screen === 'home' && (
          <HomeScreen
            email={session.user.email}
            onOpenCourse={openCourse}
            onOpenDocument={openDocument}
          />
        )}
        {tab === 'home' && homeNav.screen === 'course' && (
          <CourseScreen
            courseId={homeNav.courseId}
            onBack={() => setHomeNav({ screen: 'home' })}
            onOpenDocument={(docId) => setHomeNav({ screen: 'document', courseId: homeNav.courseId, docId })}
            onAddMaterial={(courseId) => {
              setAddCourseId(courseId);
              setTab('add');
            }}
          />
        )}
        {tab === 'home' && homeNav.screen === 'document' && (
          <DocumentScreen
            docId={homeNav.docId}
            voicesByLanguage={voicesByLanguage}
            onBack={() => setHomeNav({ screen: 'course', courseId: homeNav.courseId })}
          />
        )}
        {tab === 'review' && <ReviewScreen />}
        {tab === 'add' && (
          <AddScreen
            preselectedCourseId={addCourseId}
            voicesByLanguage={voicesByLanguage}
            onImported={(courseId, docId) => openDocument(courseId, docId)}
          />
        )}
        {tab === 'profile' && (
          <ProfileScreen
            session={session}
            subscription={subscription}
            onRefreshSubscription={refreshSubscription}
            settings={settings}
            onChangeTheme={onChangeTheme}
            onChangeLang={onChangeLang}
            onShowPaywall={() => setShowPaywall(true)}
          />
        )}
        <View style={{ height: 24 }} />
      </ScrollView>
      <FullPlayer />
      <MiniPlayer />
      <TabBar tab={tab} onChange={changeTab} dueCount={dueCount} />
      <Modal visible={showPaywall} animationType="slide" presentationStyle="fullScreen" onRequestClose={() => setShowPaywall(false)}>
        <FullPaywallScreen
          subscription={subscription}
          onRefreshSubscription={refreshSubscription}
          onClose={() => setShowPaywall(false)}
        />
      </Modal>
    </View>
  );
}

export default function App() {
  const [themePref, setThemePref] = useState('dark'); // system | light | dark
  const [uiLang, setUiLang] = useState('en');
  const palette = usePalette(themePref);
  const [session, setSession] = useState(undefined);
  const [subscription, setSubscription] = useState(undefined);
  const [onboarded, setOnboarded] = useState(undefined);
  const [profile, setProfile] = useState(undefined);
  const lastUserIdRef = useRef(null);

  const changeThemePref = (v) => {
    setThemePref(v);
    AsyncStorage.setItem('themePref', v).catch(() => {});
  };
  const changeUiLang = (v) => {
    setUiLang(v);
    AsyncStorage.setItem('uiLang', v).catch(() => {});
  };

  const refreshSubscription = () =>
    api('/subscription').then(setSubscription).catch(() => setSubscription(null));

  useEffect(() => {
    pingBackend();
    AsyncStorage.getItem('onboarded')
      .then((v) => setOnboarded(v === '1'))
      .catch(() => setOnboarded(true));
    AsyncStorage.getItem('themePref').then((v) => v && setThemePref(v)).catch(() => {});
    AsyncStorage.getItem('uiLang')
      .then((v) => {
        if (v) return setUiLang(v);
        // First run: follow the device language when we support it.
        try {
          const device = (Intl.DateTimeFormat().resolvedOptions().locale || 'en')
            .split(/[-_]/)[0].toLowerCase();
          if (UI_LANGUAGES.some((l) => l.code === device)) setUiLang(device);
        } catch {}
      })
      .catch(() => {});

    supabase.auth.getSession().then(({ data }) => {
      lastUserIdRef.current = data.session?.user?.id ?? null;
      setSession(data.session ?? null);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_event, next) => {
      setSession(next ?? null);
      // Supabase re-fires SIGNED_IN on token refresh and tab refocus — only
      // treat it as a change when the user actually changes.
      const nextUserId = next?.user?.id ?? null;
      if (nextUserId !== lastUserIdRef.current) {
        lastUserIdRef.current = nextUserId;
      }
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (!session) {
      setSubscription(undefined);
      setProfile(undefined);
      return;
    }
    configurePurchases(session.user.id).catch(() => {});
    refreshSubscription();
    // Profile questions (study level etc.) — treat as onboarded on failure
    // so a backend hiccup never blocks the app.
    api('/profile').then(setProfile).catch(() => setProfile({ onboarded: true }));
  }, [session?.user.id]);

  const loading = session === undefined || onboarded === undefined || (session && (subscription === undefined || profile === undefined));
  const entitled = !session || subscription?.entitled;

  return (
    <SafeAreaProvider>
    <ThemeContext.Provider value={palette}>
      <I18nContext.Provider value={{ lang: uiLang, t: makeT(uiLang) }}>
      <PlayerProvider>
        <ToastProvider>
        <SafeAreaView edges={['top']} style={{ flex: 1, backgroundColor: palette.page }}>
          <StatusBar style={palette.page === '#101012' ? 'light' : 'dark'} />
          {loading ? (
            <ActivityIndicator color={palette.accent} style={{ marginTop: 80 }} />
          ) : !session ? (
            !onboarded ? (
              <ScrollView>
                <OnboardingScreen
                  onDone={() => {
                    setOnboarded(true);
                    AsyncStorage.setItem('onboarded', '1').catch(() => {});
                  }}
                />
              </ScrollView>
            ) : (
              <ScrollView contentContainerStyle={{ maxWidth: 520, width: '100%', alignSelf: 'center' }}>
                <AuthScreen />
              </ScrollView>
            )
          ) : !entitled ? (
            <ScrollView contentContainerStyle={{ maxWidth: 520, width: '100%', alignSelf: 'center' }}>
              <PaywallScreen subscription={subscription} onRefreshSubscription={refreshSubscription} />
            </ScrollView>
          ) : profile && !profile.onboarded ? (
            <ScrollView contentContainerStyle={{ maxWidth: 520, width: '100%', alignSelf: 'center' }}>
              <ProfileSetupScreen onDone={() => setProfile({ ...profile, onboarded: true })} />
            </ScrollView>
          ) : (
            <AppShell
              session={session}
              subscription={subscription}
              refreshSubscription={refreshSubscription}
              settings={{ themePref, uiLang }}
              onChangeTheme={changeThemePref}
              onChangeLang={changeUiLang}
            />
          )}
        </SafeAreaView>
        </ToastProvider>
      </PlayerProvider>
      </I18nContext.Provider>
    </ThemeContext.Provider>
    </SafeAreaProvider>
  );
}
