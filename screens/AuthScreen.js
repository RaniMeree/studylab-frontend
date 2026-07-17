import { useState } from 'react';
import { Platform, Text, TouchableOpacity, View } from 'react-native';
import * as WebBrowser from 'expo-web-browser';
import * as Linking from 'expo-linking';
import { supabase } from '../supabaseClient';
import { api } from '../api';
import { useThemeColors } from '../theme';
import { Button, ErrorText, Input, Muted, NeonBar, Row } from '../ui';

WebBrowser.maybeCompleteAuthSession();

const SLIDES = [
  { emoji: '🎧', title: 'Turn anything into audio', body: 'Upload PDFs, photos of book pages, or paste a link — then listen like an audiobook.' },
  { emoji: '🧠', title: 'Actually learn it', body: 'AI summaries, flashcards with smart review scheduling, and exams from your own material.' },
  { emoji: '🔥', title: 'Stay on track', body: 'Progress, bookmarks, notes, and your study streak follow you across devices. 3-day free trial.' },
];

export function OnboardingScreen({ onDone }) {
  const c = useThemeColors();
  const [slide, setSlide] = useState(0);
  const s = SLIDES[slide];
  const last = slide === SLIDES.length - 1;
  return (
    <View style={{ alignItems: 'center', paddingVertical: 60, paddingHorizontal: 28 }}>
      {/* Glow icon */}
      <View style={{
        width: 96, height: 96, borderRadius: 28,
        backgroundColor: 'rgba(124,58,237,0.2)',
        alignItems: 'center', justifyContent: 'center', marginBottom: 28,
        borderWidth: 1, borderColor: 'rgba(167,139,250,0.35)',
        shadowColor: '#7C3AED', shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.9, shadowRadius: 24,
      }}>
        <Text style={{ fontSize: 44 }}>{s.emoji}</Text>
      </View>

      <Text style={{ color: '#fff', fontSize: 24, fontWeight: '800', textAlign: 'center', letterSpacing: -0.3 }}>
        {s.title}
      </Text>
      <Text style={{ color: 'rgba(255,255,255,0.55)', fontSize: 15, textAlign: 'center', marginTop: 12, lineHeight: 22, maxWidth: 300 }}>
        {s.body}
      </Text>

      {/* Dots */}
      <Row style={{ gap: 6, marginVertical: 28 }}>
        {SLIDES.map((_, i) => (
          <View key={i} style={{
            width: i === slide ? 22 : 7, height: 7, borderRadius: 4,
            backgroundColor: i === slide ? c.accent : 'rgba(167,139,250,0.25)',
            shadowColor: i === slide ? '#7C3AED' : 'transparent',
            shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.9, shadowRadius: 6,
          }} />
        ))}
      </Row>

      <TouchableOpacity
        onPress={() => (last ? onDone() : setSlide(slide + 1))}
        style={{
          alignSelf: 'stretch', paddingVertical: 15, borderRadius: 16,
          alignItems: 'center',
          backgroundColor: 'rgba(124,58,237,0.35)',
          borderWidth: 1, borderColor: 'rgba(167,139,250,0.5)',
          shadowColor: '#7C3AED', shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.8, shadowRadius: 14,
        }}
      >
        <Text style={{ color: '#fff', fontSize: 15, fontWeight: '700' }}>{last ? 'Get started' : 'Next'}</Text>
      </TouchableOpacity>

      {!last && (
        <TouchableOpacity style={{ marginTop: 18 }} onPress={onDone}>
          <Text style={{ color: 'rgba(255,255,255,0.35)', fontSize: 13 }}>Skip</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const LEVELS = [
  { key: 'high_school', emoji: '🎒', label: 'High school' },
  { key: 'bachelor', emoji: '🎓', label: 'Bachelor' },
  { key: 'master', emoji: '📚', label: 'Master' },
  { key: 'phd', emoji: '🔬', label: 'PhD / Research' },
  { key: 'other', emoji: '✏️', label: 'Other' },
];

const FIELDS = [
  'Medicine & Health', 'Engineering & Tech', 'Business & Economics', 'Law',
  'Natural Sciences', 'Social Sciences', 'Arts & Humanities', 'Languages', 'Other',
];

const SOURCES = [
  { key: 'friend', label: '👋 A friend' },
  { key: 'social', label: '📱 Social media' },
  { key: 'search', label: '🔍 Search' },
  { key: 'store', label: '🏪 App store' },
  { key: 'other', label: '💬 Other' },
];

function Pill({ active, label, onPress, c }) {
  return (
    <TouchableOpacity
      onPress={onPress}
      style={{
        paddingVertical: 10, paddingHorizontal: 14, borderRadius: 14, marginBottom: 8,
        backgroundColor: active ? 'rgba(124,58,237,0.35)' : c.card,
        borderWidth: 1, borderColor: active ? 'rgba(167,139,250,0.7)' : c.border,
      }}
    >
      <Text style={{ color: active ? '#fff' : c.text, fontSize: 14, fontWeight: '600' }}>{label}</Text>
    </TouchableOpacity>
  );
}

/** Post-signup profile questions (study level, field, referral). Skippable. */
export function ProfileSetupScreen({ onDone }) {
  const c = useThemeColors();
  const [step, setStep] = useState(0);
  const [level, setLevel] = useState(null);
  const [field, setField] = useState(null);
  const [institution, setInstitution] = useState('');
  const [source, setSource] = useState(null);
  const [busy, setBusy] = useState(false);

  const finish = async (skipped = false) => {
    setBusy(true);
    try {
      await api('/profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          study_level: skipped ? null : level,
          field_of_study: skipped ? null : field,
          institution: skipped ? null : institution.trim() || null,
          referral_source: skipped ? null : source,
          onboarded: true,
        }),
      });
    } catch {
      // Never trap the user here — continue regardless.
    }
    onDone();
  };

  const steps = [
    {
      title: 'Where are you in your studies?',
      sub: 'We use this to pitch explanations at the right level.',
      valid: level !== null,
      body: LEVELS.map((l) => (
        <Pill key={l.key} c={c} active={level === l.key} label={`${l.emoji}  ${l.label}`} onPress={() => setLevel(l.key)} />
      )),
    },
    {
      title: 'What do you study?',
      sub: 'Helps us tailor examples and tools for you.',
      valid: field !== null,
      body: (
        <>
          <Row style={{ flexWrap: 'wrap', gap: 8 }}>
            {FIELDS.map((f) => (
              <Pill key={f} c={c} active={field === f} label={f} onPress={() => setField(f)} />
            ))}
          </Row>
          <Input placeholder="School / university (optional)" value={institution} onChangeText={setInstitution} />
        </>
      ),
    },
    {
      title: 'How did you find StudyLab?',
      sub: 'Last one — this helps us reach more students.',
      valid: source !== null,
      body: SOURCES.map((s) => (
        <Pill key={s.key} c={c} active={source === s.key} label={s.label} onPress={() => setSource(s.key)} />
      )),
    },
  ];

  const cur = steps[step];
  const last = step === steps.length - 1;

  return (
    <View style={{ paddingVertical: 48, paddingHorizontal: 24 }}>
      {/* Progress dots */}
      <Row style={{ gap: 6, justifyContent: 'center', marginBottom: 28 }}>
        {steps.map((_, i) => (
          <View key={i} style={{
            width: i === step ? 22 : 7, height: 7, borderRadius: 4,
            backgroundColor: i === step ? c.accent : 'rgba(167,139,250,0.25)',
          }} />
        ))}
      </Row>

      <Text style={{ color: c.text, fontSize: 22, fontWeight: '800', textAlign: 'center' }}>{cur.title}</Text>
      <Text style={{ color: c.subtext, fontSize: 14, textAlign: 'center', marginTop: 8, marginBottom: 24 }}>{cur.sub}</Text>

      {cur.body}

      <Row style={{ gap: 10, marginTop: 20 }}>
        {step > 0 && (
          <Button label="Back" variant="secondary" onPress={() => setStep(step - 1)} disabled={busy} style={{ flex: 1 }} />
        )}
        <Button
          label={busy ? 'Saving…' : last ? 'Start studying 🚀' : 'Continue'}
          onPress={() => (last ? finish() : setStep(step + 1))}
          disabled={busy || !cur.valid}
          style={{ flex: 2 }}
        />
      </Row>

      <TouchableOpacity style={{ marginTop: 18, alignSelf: 'center' }} onPress={() => finish(true)} disabled={busy}>
        <Text style={{ color: 'rgba(255,255,255,0.35)', fontSize: 13 }}>Skip for now</Text>
      </TouchableOpacity>
    </View>
  );
}

export function AuthScreen() {
  const c = useThemeColors();
  const [mode, setMode] = useState('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  const submit = async () => {
    if (!email.trim() || !password) return;
    setBusy(true); setError(''); setNotice('');
    try {
      if (mode === 'signup') {
        const { error: err, data } = await supabase.auth.signUp({ email: email.trim(), password });
        if (err) throw err;
        if (!data.session) { setNotice('Account created — check your email to confirm, then sign in.'); setMode('signin'); }
      } else {
        const { error: err } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
        if (err) throw err;
      }
    } catch (e) { setError(e.message); }
    finally { setBusy(false); }
  };

  const signInWithProvider = async (provider) => {
    setBusy(true); setError('');
    try {
      if (Platform.OS === 'web') {
        const { error: err } = await supabase.auth.signInWithOAuth({ provider });
        if (err) throw err;
        return;
      }
      const redirectTo = Linking.createURL('auth-callback');
      const { data, error: err } = await supabase.auth.signInWithOAuth({ provider, options: { redirectTo, skipBrowserRedirect: true } });
      if (err) throw err;
      const result = await WebBrowser.openAuthSessionAsync(data.url, redirectTo);
      if (result.type === 'success' && result.url) {
        const { params, errorCode } = Linking.parse(result.url);
        if (errorCode) throw new Error(errorCode);
        if (params.access_token && params.refresh_token) {
          const { error: sessErr } = await supabase.auth.setSession({ access_token: params.access_token, refresh_token: params.refresh_token });
          if (sessErr) throw sessErr;
        }
      }
    } catch (e) { setError(e.message); }
    finally { setBusy(false); }
  };

  return (
    <View style={{ padding: 28, paddingTop: 56 }}>
      {/* Logo */}
      <View style={{ alignItems: 'center', marginBottom: 36 }}>
        <View style={{
          width: 72, height: 72, borderRadius: 22,
          backgroundColor: 'rgba(124,58,237,0.2)',
          alignItems: 'center', justifyContent: 'center', marginBottom: 16,
          borderWidth: 1, borderColor: 'rgba(167,139,250,0.35)',
          shadowColor: '#7C3AED', shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.9, shadowRadius: 20,
        }}>
          <Text style={{ fontSize: 34 }}>🎓</Text>
        </View>
        <Text style={{ color: '#fff', fontSize: 22, fontWeight: '800', letterSpacing: -0.3 }}>
          Study<Text style={{ color: c.accent }}>Lab</Text>
        </Text>
        <Text style={{ color: 'rgba(255,255,255,0.45)', fontSize: 13, marginTop: 4 }}>
          {mode === 'signin' ? 'Sign in to your library' : 'Create your account'}
        </Text>
      </View>

      <Input placeholder="Email" autoCapitalize="none" keyboardType="email-address" value={email} onChangeText={setEmail} style={{ marginBottom: 10 }} />
      <Input placeholder="Password" secureTextEntry value={password} onChangeText={setPassword} onSubmitEditing={submit} style={{ marginBottom: 10 }} />

      <ErrorText>{error}</ErrorText>
      {notice ? <Text style={{ color: c.success, fontSize: 13, marginBottom: 8 }}>{notice}</Text> : null}

      <TouchableOpacity
        onPress={submit} disabled={busy}
        style={{
          paddingVertical: 15, borderRadius: 16, alignItems: 'center',
          backgroundColor: 'rgba(124,58,237,0.35)',
          borderWidth: 1, borderColor: 'rgba(167,139,250,0.5)',
          shadowColor: '#7C3AED', shadowOffset: { width: 0, height: 0 }, shadowOpacity: busy ? 0 : 0.8, shadowRadius: 14,
          opacity: busy ? 0.6 : 1,
        }}
      >
        <Text style={{ color: '#fff', fontSize: 15, fontWeight: '700' }}>
          {busy ? '…' : mode === 'signin' ? 'Sign in' : 'Sign up'}
        </Text>
      </TouchableOpacity>

      <TouchableOpacity style={{ marginTop: 16, alignItems: 'center' }} onPress={() => { setMode(mode === 'signin' ? 'signup' : 'signin'); setError(''); setNotice(''); }}>
        <Text style={{ color: c.accent, fontSize: 13 }}>
          {mode === 'signin' ? "Don't have an account? Sign up" : 'Already have an account? Sign in'}
        </Text>
      </TouchableOpacity>

      <NeonBar style={{ marginVertical: 20 }} />

      <TouchableOpacity
        onPress={() => signInWithProvider('google')} disabled={busy}
        style={{
          paddingVertical: 13, borderRadius: 16, alignItems: 'center', flexDirection: 'row', justifyContent: 'center', gap: 8,
          backgroundColor: 'rgba(255,255,255,0.05)',
          borderWidth: 1, borderColor: 'rgba(167,139,250,0.2)',
          opacity: busy ? 0.5 : 1,
        }}
      >
        <Text style={{ fontSize: 16 }}>G</Text>
        <Text style={{ color: 'rgba(255,255,255,0.8)', fontSize: 14, fontWeight: '600' }}>Continue with Google</Text>
      </TouchableOpacity>

      {Platform.OS !== 'android' && (
        <TouchableOpacity
          onPress={() => signInWithProvider('apple')} disabled={busy}
          style={{
            marginTop: 10, paddingVertical: 13, borderRadius: 16, alignItems: 'center', flexDirection: 'row', justifyContent: 'center', gap: 8,
            backgroundColor: 'rgba(255,255,255,0.05)',
            borderWidth: 1, borderColor: 'rgba(167,139,250,0.2)',
            opacity: busy ? 0.5 : 1,
          }}
        >
          <Text style={{ fontSize: 16 }}>🍎</Text>
          <Text style={{ color: 'rgba(255,255,255,0.8)', fontSize: 14, fontWeight: '600' }}>Continue with Apple</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}
