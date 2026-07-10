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

export function PaywallScreen({ subscription, onRefreshSubscription }) {
  const c = useThemeColors();
  const [busy, setBusy] = useState(false);
  const expired = subscription?.status === 'expired' || subscription?.status === 'canceled';

  const restore = async () => {
    setBusy(true);
    try { await restorePurchases(); await onRefreshSubscription(); } catch {}
    setBusy(false);
  };

  return (
    <View style={{ padding: 24, paddingTop: 50 }}>
      <View style={{ alignItems: 'center', marginBottom: 28 }}>
        <View style={{
          width: 80, height: 80, borderRadius: 24,
          backgroundColor: 'rgba(124,58,237,0.2)',
          alignItems: 'center', justifyContent: 'center', marginBottom: 16,
          borderWidth: 1, borderColor: 'rgba(167,139,250,0.35)',
          shadowColor: '#7C3AED', shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.9, shadowRadius: 20,
        }}>
          <Text style={{ fontSize: 36 }}>🔓</Text>
        </View>
        <Text style={{ color: '#fff', fontSize: 22, fontWeight: '800', textAlign: 'center' }}>
          {expired ? 'Your free trial has ended' : 'Unlock StudyLab'}
        </Text>
        <Text style={{ color: 'rgba(255,255,255,0.5)', textAlign: 'center', marginTop: 8, fontSize: 14, lineHeight: 21 }}>
          {expired
            ? 'Subscribe to keep converting documents, generating summaries, flashcards, and audio.'
            : 'Choose a plan to continue.'}
        </Text>
      </View>

      <PlanList subscription={subscription} onRefreshSubscription={onRefreshSubscription} />

      <TouchableOpacity onPress={restore} disabled={busy} style={{ marginTop: 20, alignItems: 'center' }}>
        <Text style={{ color: c.accent, fontSize: 13 }}>Restore purchases</Text>
      </TouchableOpacity>
      <TouchableOpacity onPress={() => supabase.auth.signOut()} style={{ marginTop: 14, alignItems: 'center' }}>
        <Text style={{ color: 'rgba(255,255,255,0.3)', fontSize: 13 }}>Sign out</Text>
      </TouchableOpacity>
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
