import { useState } from 'react';
import { Platform, Text, TouchableOpacity, View } from 'react-native';
import * as WebBrowser from 'expo-web-browser';
import * as Linking from 'expo-linking';
import { supabase } from '../supabaseClient';
import { useThemeColors } from '../theme';
import { Body, Button, ErrorText, Icon, Input, Muted, Row, Title } from '../ui';

WebBrowser.maybeCompleteAuthSession();

const SLIDES = [
  {
    icon: 'headset',
    title: 'Turn anything into audio',
    body: 'Upload PDFs, Word files, photos of book pages, or paste a link — then listen like an audiobook with synced highlighting.',
  },
  {
    icon: 'school',
    title: 'Actually learn it',
    body: 'AI summaries, key terms, flashcards with smart review scheduling, and exams generated from your own material.',
  },
  {
    icon: 'flame',
    title: 'Stay on track',
    body: 'Progress, bookmarks, notes, and your study streak follow you across devices. Start with a free 3-day trial.',
  },
];

export function OnboardingScreen({ onDone }) {
  const c = useThemeColors();
  const [slide, setSlide] = useState(0);
  const s = SLIDES[slide];
  const last = slide === SLIDES.length - 1;
  return (
    <View style={{ alignItems: 'center', paddingVertical: 40, paddingHorizontal: 24 }}>
      <View
        style={{
          width: 84, height: 84, borderRadius: 42, backgroundColor: c.accentSoft,
          alignItems: 'center', justifyContent: 'center', marginBottom: 20,
        }}
      >
        <Icon name={s.icon} size={40} color={c.accent} />
      </View>
      <Title style={{ textAlign: 'center' }}>{s.title}</Title>
      <Body style={{ textAlign: 'center', color: c.textSecondary, marginTop: 10, maxWidth: 320 }}>
        {s.body}
      </Body>
      <Row style={{ gap: 6, marginVertical: 20 }}>
        {SLIDES.map((_, i) => (
          <View
            key={i}
            style={{
              width: i === slide ? 18 : 7, height: 7, borderRadius: 4,
              backgroundColor: i === slide ? c.accent : c.border,
            }}
          />
        ))}
      </Row>
      <Button
        label={last ? 'Get started' : 'Next'}
        onPress={() => (last ? onDone() : setSlide(slide + 1))}
        style={{ alignSelf: 'stretch' }}
      />
      {!last && (
        <TouchableOpacity style={{ marginTop: 16 }} onPress={onDone}>
          <Muted>Skip</Muted>
        </TouchableOpacity>
      )}
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
    setBusy(true);
    setError('');
    setNotice('');
    try {
      if (mode === 'signup') {
        const { error: err, data } = await supabase.auth.signUp({ email: email.trim(), password });
        if (err) throw err;
        if (!data.session) {
          setNotice('Account created — check your email to confirm, then sign in.');
          setMode('signin');
        }
      } else {
        const { error: err } = await supabase.auth.signInWithPassword({
          email: email.trim(),
          password,
        });
        if (err) throw err;
      }
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  };

  const signInWithProvider = async (provider) => {
    setBusy(true);
    setError('');
    try {
      if (Platform.OS === 'web') {
        const { error: err } = await supabase.auth.signInWithOAuth({ provider });
        if (err) throw err;
        return;
      }
      const redirectTo = Linking.createURL('auth-callback');
      const { data, error: err } = await supabase.auth.signInWithOAuth({
        provider,
        options: { redirectTo, skipBrowserRedirect: true },
      });
      if (err) throw err;
      const result = await WebBrowser.openAuthSessionAsync(data.url, redirectTo);
      if (result.type === 'success' && result.url) {
        const { params, errorCode } = Linking.parse(result.url);
        if (errorCode) throw new Error(errorCode);
        if (params.access_token && params.refresh_token) {
          const { error: sessErr } = await supabase.auth.setSession({
            access_token: params.access_token,
            refresh_token: params.refresh_token,
          });
          if (sessErr) throw sessErr;
        }
      }
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <View style={{ padding: 24, paddingTop: 48 }}>
      <View style={{ alignItems: 'center', marginBottom: 28 }}>
        <View
          style={{
            width: 64, height: 64, borderRadius: 20, backgroundColor: c.accentSoft,
            alignItems: 'center', justifyContent: 'center', marginBottom: 14,
          }}
        >
          <Icon name="headset" size={30} color={c.accent} />
        </View>
        <Title>PDF to Audio</Title>
        <Muted style={{ marginTop: 4 }}>
          {mode === 'signin' ? 'Sign in to your library' : 'Create your account'}
        </Muted>
      </View>

      <Input
        placeholder="Email"
        autoCapitalize="none"
        keyboardType="email-address"
        value={email}
        onChangeText={setEmail}
        style={{ marginBottom: 10 }}
      />
      <Input
        placeholder="Password"
        secureTextEntry
        value={password}
        onChangeText={setPassword}
        onSubmitEditing={submit}
        style={{ marginBottom: 10 }}
      />

      <ErrorText>{error}</ErrorText>
      {notice ? <Text style={{ color: c.success, fontSize: 13, marginBottom: 8 }}>{notice}</Text> : null}

      <Button
        label={busy ? '…' : mode === 'signin' ? 'Sign in' : 'Sign up'}
        onPress={submit}
        disabled={busy}
      />

      <TouchableOpacity
        style={{ marginTop: 16, alignItems: 'center' }}
        onPress={() => {
          setMode(mode === 'signin' ? 'signup' : 'signin');
          setError('');
          setNotice('');
        }}
      >
        <Text style={{ color: c.accent, fontSize: 13 }}>
          {mode === 'signin' ? "Don't have an account? Sign up" : 'Already have an account? Sign in'}
        </Text>
      </TouchableOpacity>

      <Row style={{ gap: 10, marginVertical: 20 }}>
        <View style={{ flex: 1, height: 1, backgroundColor: c.border }} />
        <Muted>or</Muted>
        <View style={{ flex: 1, height: 1, backgroundColor: c.border }} />
      </Row>

      <Button
        label="Continue with Google"
        variant="secondary"
        icon="logo-google"
        onPress={() => signInWithProvider('google')}
        disabled={busy}
      />
      {Platform.OS !== 'android' && (
        <Button
          label="Continue with Apple"
          variant="secondary"
          icon="logo-apple"
          onPress={() => signInWithProvider('apple')}
          disabled={busy}
          style={{ marginTop: 10 }}
        />
      )}
    </View>
  );
}
