import { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  SafeAreaView,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { api, API_BASE } from './api';
import { FullPlayer, MiniPlayer, PlayerProvider } from './player';
import { configurePurchases } from './purchases';
import { AddScreen } from './screens/AddScreen';
import { AuthScreen, OnboardingScreen } from './screens/AuthScreen';
import { CourseScreen } from './screens/CourseScreen';
import { DocumentScreen } from './screens/DocumentScreen';
import { HomeScreen } from './screens/HomeScreen';
import { PaywallScreen, ProfileScreen } from './screens/ProfileScreen';
import { ReviewScreen } from './screens/ReviewScreen';
import { supabase } from './supabaseClient';
import { I18nContext, makeT, useT } from './i18n';
import { ThemeContext, usePalette, useThemeColors } from './theme';
import { Icon } from './ui';

const TABS = [
  { key: 'home', icon: 'home-outline', activeIcon: 'home' },
  { key: 'review', icon: 'albums-outline', activeIcon: 'albums' },
  { key: 'add', icon: 'add-circle-outline', activeIcon: 'add-circle' },
  { key: 'profile', icon: 'person-outline', activeIcon: 'person' },
];

function TabBar({ tab, onChange, dueCount }) {
  const c = useThemeColors();
  const t = useT();
  return (
    <View
      style={{
        flexDirection: 'row',
        backgroundColor: c.card,
        borderTopWidth: 1,
        borderColor: c.border,
        paddingVertical: 6,
        paddingBottom: 10,
      }}
    >
      {TABS.map((item) => {
        const active = tab === item.key;
        return (
          <TouchableOpacity
            key={item.key}
            onPress={() => onChange(item.key)}
            style={{ flex: 1, alignItems: 'center', gap: 2 }}
          >
            <View>
              <Icon name={active ? item.activeIcon : item.icon} size={22} color={active ? c.accent : c.textMuted} />
              {item.key === 'review' && dueCount > 0 && (
                <View
                  style={{
                    position: 'absolute', top: -3, right: -8, minWidth: 15, height: 15,
                    borderRadius: 8, backgroundColor: c.danger,
                    alignItems: 'center', justifyContent: 'center', paddingHorizontal: 3,
                  }}
                >
                  <Text style={{ color: '#fff', fontSize: 9, fontWeight: '700' }}>{dueCount}</Text>
                </View>
              )}
            </View>
            <Text style={{ fontSize: 10, color: active ? c.accent : c.textMuted }}>{t(item.key)}</Text>
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

  useEffect(() => {
    fetch(`${API_BASE}/voices`).then((r) => r.json()).then(setVoicesByLanguage).catch(() => {});
  }, []);

  useEffect(() => {
    api('/review/due').then((d) => setDueCount(d.due.length)).catch(() => {});
  }, [tab]);

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
        <TouchableOpacity onPress={() => setTab('profile')}>
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
          />
        )}
        <View style={{ height: 24 }} />
      </ScrollView>
      <FullPlayer />
      <MiniPlayer />
      <TabBar tab={tab} onChange={setTab} dueCount={dueCount} />
    </View>
  );
}

export default function App() {
  const [themePref, setThemePref] = useState('system'); // system | light | dark
  const [uiLang, setUiLang] = useState('en');
  const palette = usePalette(themePref);
  const [session, setSession] = useState(undefined);
  const [subscription, setSubscription] = useState(undefined);
  const [onboarded, setOnboarded] = useState(undefined);
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
    AsyncStorage.getItem('onboarded')
      .then((v) => setOnboarded(v === '1'))
      .catch(() => setOnboarded(true));
    AsyncStorage.getItem('themePref').then((v) => v && setThemePref(v)).catch(() => {});
    AsyncStorage.getItem('uiLang').then((v) => v && setUiLang(v)).catch(() => {});

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
      return;
    }
    configurePurchases(session.user.id).catch(() => {});
    refreshSubscription();
  }, [session?.user.id]);

  const loading = session === undefined || onboarded === undefined || (session && subscription === undefined);
  const entitled = !session || subscription?.entitled;

  return (
    <ThemeContext.Provider value={palette}>
      <I18nContext.Provider value={{ lang: uiLang, t: makeT(uiLang) }}>
      <PlayerProvider>
        <SafeAreaView style={{ flex: 1, backgroundColor: palette.page }}>
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
      </PlayerProvider>
      </I18nContext.Provider>
    </ThemeContext.Provider>
  );
}
