import { useEffect, useState } from 'react';
import { Text, TouchableOpacity, View } from 'react-native';
import { api } from '../api';
import { UI_LANGUAGES, useT } from '../i18n';
import { getOfferings, purchasePackage, restorePurchases } from '../purchases';
import { supabase } from '../supabaseClient';
import { useThemeColors } from '../theme';
import { Body, Button, Card, ErrorText, Icon, Loading, Muted, NeonBar, Pill, Row, Title } from '../ui';

const STATUS_LABELS = {
  trial: 'Free trial',
  active: 'Active subscription',
  canceled: 'Canceled — active until period end',
  expired: 'Expired',
};

const PRIVACY = `We store your account email, the documents you upload, and the audio, summaries, flashcards, notes, and progress generated from them, so the app can work across your devices. Document text is sent to OpenAI to generate summaries, answers, flashcards, and quizzes; it is not used to train their models. Payments are processed by Apple, Google, or Stripe via RevenueCat — we never see your card details. You can delete your account and all data at any time from this screen. Questions: ranimeree@gmail.com`;

const TERMS = `PDF to Audio converts documents you own or have the right to use into audio and study material for personal use. Do not upload content you are not permitted to copy. The service includes a 3-day free trial; afterwards a subscription is required, billed through your app store or Stripe and cancelable there at any time. The service is provided "as is" without warranty; AI-generated summaries, answers, and quizzes may contain mistakes — verify important information against the original material.`;

function GlassRow({ children, style }) {
  const c = useThemeColors();
  return (
    <View style={[{
      backgroundColor: c.glass ? 'rgba(255,255,255,0.04)' : c.card,
      borderRadius: 16, padding: 14, marginBottom: 10,
      borderWidth: 1, borderColor: c.glass ? 'rgba(167,139,250,0.2)' : c.border,
    }, style]}>
      {children}
    </View>
  );
}

export function PlanList({ subscription, onRefreshSubscription, onDone }) {
  const c = useThemeColors();
  const [offerings, setOfferings] = useState(null);
  const [purchasing, setPurchasing] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    getOfferings().then(setOfferings).catch((e) => { setError(e.message); setOfferings([]); });
  }, []);

  const buy = async (pkg) => {
    setPurchasing(true); setError('');
    try {
      await purchasePackage(pkg);
      await onRefreshSubscription();
      onDone?.();
    } catch (e) { setError(e.message); }
    finally { setPurchasing(false); }
  };

  return (
    <View>
      <ErrorText>{error}</ErrorText>
      {offerings === null && <Loading label="Loading plans…" />}
      {offerings?.length === 0 && !error && <Muted>No subscription plans are available right now. Try again later.</Muted>}
      {offerings?.map((pkg) => {
        const productId = pkg.webBillingProduct?.identifier ?? pkg.storeProduct?.identifier;
        const isCurrent = productId && productId === subscription?.product_id;
        return (
          <TouchableOpacity
            key={pkg.identifier}
            onPress={purchasing || isCurrent ? undefined : () => buy(pkg)}
            activeOpacity={0.75}
            style={{
              marginTop: 8, padding: 14, borderRadius: 16,
              backgroundColor: isCurrent
                ? (c.glass ? 'rgba(124,58,237,0.2)' : c.accentSoft)
                : (c.glass ? 'rgba(255,255,255,0.04)' : c.card),
              borderWidth: 1,
              borderColor: isCurrent
                ? (c.glass ? 'rgba(167,139,250,0.5)' : c.accent)
                : (c.glass ? 'rgba(167,139,250,0.2)' : c.border),
              opacity: purchasing ? 0.6 : 1,
            }}
          >
            <Text style={{ color: c.text, fontWeight: '700', fontSize: 14 }}>
              {pkg.webBillingProduct?.title ?? pkg.storeProduct?.title ?? pkg.identifier}
              {isCurrent ? '  ✓' : ''}
            </Text>
            <Text style={{ color: c.textMuted, fontSize: 12, marginTop: 3 }}>
              {pkg.webBillingProduct?.currentPrice?.formattedPrice ?? pkg.storeProduct?.priceString ?? ''}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const FEATURES = [
  { icon: '🎧', title: 'Audio Playback', desc: 'Listen to any document with sentence-level highlighting' },
  { icon: '✨', title: 'AI Summaries & Flashcards', desc: 'Instant key-point extraction and study cards' },
  { icon: '🔁', title: 'Spaced Repetition', desc: 'Smart review scheduling so nothing is forgotten' },
  { icon: '📁', title: 'Unlimited Uploads', desc: 'PDFs, Word docs, PowerPoints, YouTube links' },
  { icon: '🌍', title: '20+ Languages & Voices', desc: 'Neural voices in English, Arabic, Swedish and more' },
];

export function PaywallScreen({ subscription, onRefreshSubscription }) {
  const [offerings, setOfferings] = useState(null);
  const [selectedPkg, setSelectedPkg] = useState(null);
  const [purchasing, setPurchasing] = useState(false);
  const [restoring, setRestoring] = useState(false);
  const [error, setError] = useState('');
  const expired = subscription?.status === 'expired' || subscription?.status === 'canceled';

  useEffect(() => {
    getOfferings().then((pkgs) => {
      setOfferings(pkgs);
      // Pre-select the yearly plan if available, else monthly, else first
      const yearly = pkgs.find((p) => p.packageType === 'ANNUAL' || p.identifier === '$rc_annual');
      const monthly = pkgs.find((p) => p.packageType === 'MONTHLY' || p.identifier === '$rc_monthly');
      setSelectedPkg(yearly ?? monthly ?? pkgs[0] ?? null);
    }).catch((e) => { setError(e.message); setOfferings([]); });
  }, []);

  const buy = async () => {
    if (!selectedPkg) return;
    setPurchasing(true); setError('');
    try {
      await purchasePackage(selectedPkg);
      await onRefreshSubscription();
    } catch (e) {
      if (!e.message?.includes('cancelled') && !e.message?.includes('cancel')) setError(e.message);
    } finally { setPurchasing(false); }
  };

  const restore = async () => {
    setRestoring(true); setError('');
    try { await restorePurchases(); await onRefreshSubscription(); } catch (e) { setError(e.message); }
    setRestoring(false);
  };

  const getPrice = (pkg) =>
    pkg?.webBillingProduct?.currentPrice?.formattedPrice ?? pkg?.storeProduct?.priceString ?? '';

  const getTitle = (pkg) =>
    pkg?.webBillingProduct?.title ?? pkg?.storeProduct?.title ?? pkg?.identifier ?? '';

  const isYearly = (pkg) =>
    pkg?.packageType === 'ANNUAL' || pkg?.identifier === '$rc_annual';

  return (
    <View style={{ backgroundColor: '#080613', minHeight: '100%', paddingBottom: 40 }}>
      <View style={{ alignItems: 'center', paddingTop: 52, paddingHorizontal: 24 }}>
        {/* Hero icon */}
        <View style={{
          width: 88, height: 88, borderRadius: 26,
          backgroundColor: 'rgba(124,58,237,0.15)',
          alignItems: 'center', justifyContent: 'center', marginBottom: 24,
          borderWidth: 1, borderColor: 'rgba(167,139,250,0.45)',
          shadowColor: '#7C3AED', shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.9, shadowRadius: 24,
        }}>
          <Text style={{ fontSize: 40 }}>🎓</Text>
        </View>

        <Text style={{ fontSize: 11, fontWeight: '700', letterSpacing: 2.5, textTransform: 'uppercase', color: '#A78BFA', marginBottom: 10 }}>
          StudyLab Premium
        </Text>
        <Text style={{ fontSize: 28, fontWeight: '800', color: '#fff', textAlign: 'center', lineHeight: 34, marginBottom: 12 }}>
          {expired ? 'Your trial has ended' : 'Learn Smarter,\nNot Harder'}
        </Text>
        <Text style={{ fontSize: 15, color: 'rgba(255,255,255,0.45)', textAlign: 'center', lineHeight: 23, marginBottom: 36, maxWidth: 300 }}>
          {expired
            ? 'Subscribe to keep converting documents into audio, summaries, and flashcards.'
            : 'Turn any document into an immersive study session — audio, summaries, flashcards, and more.'}
        </Text>
      </View>

      {/* Features */}
      <View style={{ paddingHorizontal: 20, gap: 4, marginBottom: 28 }}>
        {FEATURES.map((f) => (
          <View key={f.title} style={{
            flexDirection: 'row', alignItems: 'center', gap: 14,
            padding: 13, borderRadius: 12,
            backgroundColor: 'rgba(255,255,255,0.04)',
            borderWidth: 1, borderColor: 'rgba(167,139,250,0.15)',
            borderLeftWidth: 2, borderLeftColor: '#7C3AED',
          }}>
            <Text style={{ fontSize: 20, width: 28, textAlign: 'center' }}>{f.icon}</Text>
            <View style={{ flex: 1 }}>
              <Text style={{ color: '#fff', fontWeight: '600', fontSize: 14 }}>{f.title}</Text>
              <Text style={{ color: 'rgba(255,255,255,0.42)', fontSize: 12, marginTop: 2, lineHeight: 17 }}>{f.desc}</Text>
            </View>
            <Text style={{ color: '#34D399', fontSize: 16 }}>✓</Text>
          </View>
        ))}
      </View>

      {/* Divider */}
      <View style={{ height: 1, backgroundColor: 'rgba(167,139,250,0.18)', marginHorizontal: 20, marginBottom: 24 }} />

      <View style={{ paddingHorizontal: 20 }}>
        <Text style={{ fontSize: 11, fontWeight: '700', letterSpacing: 2, textTransform: 'uppercase', color: 'rgba(255,255,255,0.4)', marginBottom: 12 }}>
          Choose your plan
        </Text>

        {/* Plan cards */}
        {offerings === null && <Loading label="Loading plans…" />}
        {offerings?.length === 0 && !error && (
          <Text style={{ color: 'rgba(255,255,255,0.4)', fontSize: 14, textAlign: 'center', marginBottom: 16 }}>
            No plans available right now. Try again later.
          </Text>
        )}
        <View style={{ flexDirection: 'row', gap: 12, marginBottom: 16 }}>
          {offerings?.map((pkg) => {
            const selected = selectedPkg?.identifier === pkg.identifier;
            const yearly = isYearly(pkg);
            return (
              <TouchableOpacity
                key={pkg.identifier}
                onPress={() => setSelectedPkg(pkg)}
                activeOpacity={0.8}
                style={{
                  flex: 1, padding: 18, borderRadius: 18, position: 'relative',
                  backgroundColor: yearly ? 'rgba(124,58,237,0.16)' : 'rgba(255,255,255,0.04)',
                  borderWidth: 1,
                  borderColor: selected
                    ? (yearly ? '#7C3AED' : 'rgba(167,139,250,0.5)')
                    : 'rgba(167,139,250,0.18)',
                  shadowColor: yearly && selected ? '#7C3AED' : 'transparent',
                  shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.5, shadowRadius: 16,
                }}
              >
                {yearly && (
                  <View style={{
                    position: 'absolute', top: -11, alignSelf: 'center',
                    backgroundColor: '#7C3AED', borderRadius: 20,
                    paddingHorizontal: 12, paddingVertical: 4,
                    shadowColor: '#7C3AED', shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.8, shadowRadius: 8,
                  }}>
                    <Text style={{ color: '#fff', fontSize: 10, fontWeight: '800', letterSpacing: 1, textTransform: 'uppercase' }}>
                      Best Value
                    </Text>
                  </View>
                )}
                <Text style={{ fontSize: 11, fontWeight: '700', letterSpacing: 1.5, textTransform: 'uppercase', color: yearly ? '#A78BFA' : 'rgba(255,255,255,0.4)', marginBottom: 6 }}>
                  {yearly ? 'Yearly' : 'Monthly'}
                </Text>
                <Text style={{ fontSize: 26, fontWeight: '800', color: '#fff', lineHeight: 30 }}>
                  {getPrice(pkg)}
                </Text>
                <Text style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)', marginTop: 3 }}>
                  {yearly ? 'per year' : 'per month'}
                </Text>
                {yearly && (
                  <Text style={{ fontSize: 11, fontWeight: '700', color: '#34D399', marginTop: 6 }}>
                    Save 17%
                  </Text>
                )}
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Error */}
        {!!error && <Text style={{ color: '#F87171', fontSize: 13, marginBottom: 12, textAlign: 'center' }}>{error}</Text>}

        {/* CTA button */}
        <TouchableOpacity
          onPress={buy}
          disabled={purchasing || !selectedPkg}
          activeOpacity={0.85}
          style={{
            paddingVertical: 17, borderRadius: 16, alignItems: 'center',
            backgroundColor: purchasing ? 'rgba(124,58,237,0.5)' : '#7C3AED',
            shadowColor: '#7C3AED', shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.7, shadowRadius: 20,
            marginBottom: 12,
          }}
        >
          <Text style={{ color: '#fff', fontWeight: '800', fontSize: 16, letterSpacing: 0.3 }}>
            {purchasing
              ? 'Processing…'
              : selectedPkg
                ? `Subscribe — ${getPrice(selectedPkg)}${isYearly(selectedPkg) ? '/year' : '/month'}`
                : 'Select a plan'}
          </Text>
        </TouchableOpacity>

        <Text style={{ fontSize: 12, color: 'rgba(255,255,255,0.35)', textAlign: 'center', marginBottom: 24 }}>
          Cancel anytime · Secure payment via Google Play
        </Text>

        {/* Footer links */}
        <View style={{ flexDirection: 'row', justifyContent: 'center', gap: 24 }}>
          <TouchableOpacity onPress={restore} disabled={restoring}>
            <Text style={{ color: '#A78BFA', fontSize: 13, opacity: restoring ? 0.5 : 0.8 }}>
              {restoring ? 'Restoring…' : 'Restore purchases'}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => supabase.auth.signOut()}>
            <Text style={{ color: 'rgba(255,255,255,0.25)', fontSize: 13 }}>Sign out</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

export function ProfileScreen({ session, subscription, onRefreshSubscription, settings, onChangeTheme, onChangeLang }) {
  const c = useThemeColors();
  const t = useT();
  const [showPlans, setShowPlans] = useState(false);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState('');
  const [error, setError] = useState('');
  const [legalOpen, setLegalOpen] = useState(null);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const restore = async () => {
    setBusy(true); setError(''); setNotice('');
    try { await restorePurchases(); await onRefreshSubscription(); setNotice('Purchases restored.'); }
    catch (e) { setError(e.message); }
    finally { setBusy(false); }
  };

  const deleteAccount = async () => {
    setDeleting(true); setError('');
    try { await api('/account', { method: 'DELETE' }); await supabase.auth.signOut(); }
    catch (e) { setError(e.message); setDeleting(false); setConfirmingDelete(false); }
  };

  const statusLabel = STATUS_LABELS[subscription?.status] ?? subscription?.status ?? 'Unknown';
  const isTrial = subscription?.status === 'trial';
  const isActive = subscription?.status === 'active';

  return (
    <View style={{ padding: 18 }}>
      <Text style={{ fontSize: 10, color: c.textMuted, letterSpacing: 1.5, textTransform: 'uppercase', fontWeight: '700', marginBottom: 6 }}>
        Account
      </Text>
      <Title>Profile</Title>
      <NeonBar style={{ marginTop: 14, marginBottom: 14 }} />

      {/* User card */}
      <GlassRow>
        <Row style={{ gap: 12 }}>
          <View style={{
            width: 46, height: 46, borderRadius: 23,
            backgroundColor: 'rgba(124,58,237,0.25)',
            alignItems: 'center', justifyContent: 'center',
            borderWidth: 1, borderColor: 'rgba(167,139,250,0.35)',
            shadowColor: '#7C3AED', shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.7, shadowRadius: 10,
          }}>
            <Text style={{ color: c.accent, fontWeight: '800', fontSize: 18 }}>
              {session.user.email?.[0]?.toUpperCase() ?? '?'}
            </Text>
          </View>
          <View style={{ flex: 1, minWidth: 0 }}>
            <Text numberOfLines={1} style={{ color: c.text, fontWeight: '700', fontSize: 14 }}>{session.user.email}</Text>
            <Text style={{ color: c.textMuted, fontSize: 12, marginTop: 2 }}>
              Signed in with {session.user.app_metadata?.provider ?? 'email'}
            </Text>
          </View>
        </Row>
      </GlassRow>

      {/* Subscription status */}
      <GlassRow style={{ borderColor: isActive ? 'rgba(52,211,153,0.35)' : c.glass ? 'rgba(167,139,250,0.2)' : c.border }}>
        <Row style={{ gap: 10 }}>
          <Text style={{ fontSize: 20 }}>
            {isActive ? '✅' : isTrial ? '⏳' : '⚠️'}
          </Text>
          <View style={{ flex: 1 }}>
            <Text style={{ color: isActive ? c.success : c.text, fontWeight: '700', fontSize: 14 }}>{statusLabel}</Text>
            {isTrial && (
              <Text style={{ color: c.textMuted, fontSize: 12, marginTop: 2 }}>
                {subscription.trial_days_left} day{subscription.trial_days_left === 1 ? '' : 's'} left — ends {new Date(subscription.trial_ends_at).toLocaleDateString()}
              </Text>
            )}
            {subscription?.product_id && <Text style={{ color: c.textMuted, fontSize: 12, marginTop: 2 }}>Plan: {subscription.product_id}</Text>}
            {subscription?.current_period_end && (
              <Text style={{ color: c.textMuted, fontSize: 12, marginTop: 2 }}>
                Renews {new Date(subscription.current_period_end).toLocaleDateString()}
              </Text>
            )}
          </View>
        </Row>
      </GlassRow>

      <ErrorText>{error}</ErrorText>
      {notice ? <Text style={{ color: c.success, fontSize: 13, marginTop: 4, marginBottom: 8 }}>{notice}</Text> : null}

      {/* Subscribe button */}
      <TouchableOpacity
        onPress={() => setShowPlans((v) => !v)} disabled={busy}
        style={{
          paddingVertical: 14, borderRadius: 16, alignItems: 'center',
          backgroundColor: 'rgba(124,58,237,0.3)',
          borderWidth: 1, borderColor: 'rgba(167,139,250,0.45)',
          shadowColor: '#7C3AED', shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.6, shadowRadius: 12,
          marginBottom: 10,
        }}
      >
        <Text style={{ color: '#fff', fontWeight: '700', fontSize: 14 }}>
          {isActive ? t('changePlan') : t('subscribeNow')}
        </Text>
      </TouchableOpacity>

      {showPlans && <PlanList subscription={subscription} onRefreshSubscription={onRefreshSubscription} onDone={() => setShowPlans(false)} />}

      {isActive && (
        <Text style={{ color: c.textMuted, fontSize: 12, marginBottom: 10, lineHeight: 18 }}>
          To cancel, use {subscription?.platform === 'apple' || subscription?.platform === 'app_store'
            ? 'Settings → Apple ID → Subscriptions'
            : 'Google Play → Payments and subscriptions'}. Access continues until the period ends.
        </Text>
      )}

      <NeonBar style={{ marginVertical: 14 }} />

      {/* Theme & language */}
      <GlassRow>
        <Text style={{ color: c.textMuted, fontSize: 11, letterSpacing: 1, textTransform: 'uppercase', fontWeight: '700', marginBottom: 10 }}>{t('theme')}</Text>
        <Row style={{ gap: 6, flexWrap: 'wrap' }}>
          <Pill label={t('system')} active={settings?.themePref === 'system'} onPress={() => onChangeTheme('system')} />
          <Pill label={t('light')} active={settings?.themePref === 'light'} onPress={() => onChangeTheme('light')} />
          <Pill label="Neon" active={settings?.themePref === 'dark'} onPress={() => onChangeTheme('dark')} />
        </Row>
        <Text style={{ color: c.textMuted, fontSize: 11, letterSpacing: 1, textTransform: 'uppercase', fontWeight: '700', marginTop: 14, marginBottom: 10 }}>{t('uiLanguage')}</Text>
        <Row style={{ gap: 6, flexWrap: 'wrap' }}>
          {UI_LANGUAGES.map((l) => (
            <Pill key={l.code} label={l.label} active={settings?.uiLang === l.code} onPress={() => onChangeLang(l.code)} />
          ))}
        </Row>
      </GlassRow>

      {/* Actions */}
      <Row style={{ gap: 20, marginTop: 14 }}>
        <TouchableOpacity onPress={restore} disabled={busy}>
          <Text style={{ color: c.accent, fontSize: 13 }}>{t('restorePurchases')}</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => supabase.auth.signOut()}>
          <Text style={{ color: c.accent, fontSize: 13 }}>{t('signOut')}</Text>
        </TouchableOpacity>
      </Row>

      <Row style={{ gap: 20, marginTop: 14 }}>
        <TouchableOpacity onPress={() => setLegalOpen(legalOpen === 'privacy' ? null : 'privacy')}>
          <Text style={{ color: c.textMuted, fontSize: 13 }}>Privacy policy</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => setLegalOpen(legalOpen === 'terms' ? null : 'terms')}>
          <Text style={{ color: c.textMuted, fontSize: 13 }}>Terms of service</Text>
        </TouchableOpacity>
      </Row>

      {legalOpen && (
        <GlassRow style={{ marginTop: 10 }}>
          <Text style={{ color: c.accent, fontWeight: '700', marginBottom: 6 }}>
            {legalOpen === 'privacy' ? 'Privacy policy' : 'Terms of service'}
          </Text>
          <Text style={{ color: c.textSecondary, fontSize: 13, lineHeight: 20 }}>
            {legalOpen === 'privacy' ? PRIVACY : TERMS}
          </Text>
        </GlassRow>
      )}

      <NeonBar style={{ marginTop: 20, marginBottom: 14 }} />

      {/* Danger zone */}
      <Text style={{ color: c.textMuted, fontSize: 11, letterSpacing: 1, textTransform: 'uppercase', fontWeight: '700', marginBottom: 10 }}>Danger zone</Text>
      {!confirmingDelete ? (
        <TouchableOpacity onPress={() => setConfirmingDelete(true)}>
          <Text style={{ color: c.danger, fontSize: 13 }}>Delete my account and all data</Text>
        </TouchableOpacity>
      ) : (
        <View>
          <Text style={{ color: c.danger, fontSize: 13, lineHeight: 20, marginBottom: 12 }}>
            This permanently deletes your account, courses, documents, audio, summaries, flashcards, notes, and bookmarks. This cannot be undone.
          </Text>
          <Row style={{ gap: 8 }}>
            <Button label={deleting ? 'Deleting…' : 'Yes, delete everything'} variant="danger" small onPress={deleteAccount} disabled={deleting} />
            <Button label="Cancel" variant="secondary" small onPress={() => setConfirmingDelete(false)} disabled={deleting} />
          </Row>
        </View>
      )}
      <View style={{ height: 30 }} />
    </View>
  );
}
