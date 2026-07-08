import { useEffect, useState } from 'react';
import { Text, TouchableOpacity, View } from 'react-native';
import { api } from '../api';
import { UI_LANGUAGES, useT } from '../i18n';
import { getOfferings, purchasePackage, restorePurchases } from '../purchases';
import { supabase } from '../supabaseClient';
import { useThemeColors } from '../theme';
import { Body, Button, Card, ErrorText, Icon, Loading, Muted, Pill, Row, Title } from '../ui';

const STATUS_LABELS = {
  trial: 'Free trial',
  active: 'Active subscription',
  canceled: 'Canceled — active until period end',
  expired: 'Expired',
};

const PRIVACY = `We store your account email, the documents you upload, and the audio, summaries, flashcards, notes, and progress generated from them, so the app can work across your devices. Document text is sent to OpenAI to generate summaries, answers, flashcards, and quizzes; it is not used to train their models. Payments are processed by Apple, Google, or Stripe via RevenueCat — we never see your card details. You can delete your account and all data at any time from this screen. Questions: ranimeree@gmail.com`;

const TERMS = `PDF to Audio converts documents you own or have the right to use into audio and study material for personal use. Do not upload content you are not permitted to copy. The service includes a 3-day free trial; afterwards a subscription is required, billed through your app store or Stripe and cancelable there at any time. The service is provided "as is" without warranty; AI-generated summaries, answers, and quizzes may contain mistakes — verify important information against the original material.`;

export function PlanList({ subscription, onRefreshSubscription, onDone }) {
  const c = useThemeColors();
  const [offerings, setOfferings] = useState(null);
  const [purchasing, setPurchasing] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    getOfferings().then(setOfferings).catch((e) => { setError(e.message); setOfferings([]); });
  }, []);

  const buy = async (pkg) => {
    setPurchasing(true);
    setError('');
    try {
      await purchasePackage(pkg);
      await onRefreshSubscription();
      onDone?.();
    } catch (e) {
      setError(e.message);
    } finally {
      setPurchasing(false);
    }
  };

  return (
    <View>
      <ErrorText>{error}</ErrorText>
      {offerings === null && <Loading label="Loading plans…" />}
      {offerings?.length === 0 && !error && (
        <Muted>No subscription plans are available right now. Try again later.</Muted>
      )}
      {offerings?.map((pkg) => {
        const productId = pkg.webBillingProduct?.identifier ?? pkg.storeProduct?.identifier;
        const isCurrent = productId && productId === subscription?.product_id;
        return (
          <Card
            key={pkg.identifier}
            onPress={purchasing || isCurrent ? undefined : () => buy(pkg)}
            style={{ marginTop: 8, borderColor: isCurrent ? c.accent : c.border, opacity: purchasing ? 0.6 : 1 }}
          >
            <Body style={{ fontWeight: '600' }}>
              {pkg.webBillingProduct?.title ?? pkg.storeProduct?.title ?? pkg.identifier}
              {isCurrent ? '  (current)' : ''}
            </Body>
            <Muted style={{ marginTop: 2 }}>
              {pkg.webBillingProduct?.currentPrice?.formattedPrice ?? pkg.storeProduct?.priceString ?? ''}
            </Muted>
          </Card>
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
    try {
      await restorePurchases();
      await onRefreshSubscription();
    } catch {}
    setBusy(false);
  };

  return (
    <View style={{ padding: 20, paddingTop: 40 }}>
      <View style={{ alignItems: 'center', marginBottom: 18 }}>
        <View
          style={{
            width: 70, height: 70, borderRadius: 22, backgroundColor: c.accentSoft,
            alignItems: 'center', justifyContent: 'center', marginBottom: 12,
          }}
        >
          <Icon name="lock-open-outline" size={32} color={c.accent} />
        </View>
        <Title style={{ textAlign: 'center' }}>
          {expired ? 'Your free trial has ended' : 'Subscribe to PDF to Audio'}
        </Title>
        <Body style={{ color: c.textSecondary, textAlign: 'center', marginTop: 8 }}>
          {expired
            ? 'Subscribe to keep converting documents, generating summaries, flashcards, and audio.'
            : 'Choose a plan to continue.'}
        </Body>
      </View>

      <PlanList subscription={subscription} onRefreshSubscription={onRefreshSubscription} />

      <TouchableOpacity onPress={restore} disabled={busy} style={{ marginTop: 20, alignItems: 'center' }}>
        <Text style={{ color: c.accent, fontSize: 13 }}>Restore purchases</Text>
      </TouchableOpacity>
      <TouchableOpacity onPress={() => supabase.auth.signOut()} style={{ marginTop: 14, alignItems: 'center' }}>
        <Muted>Sign out</Muted>
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
    setBusy(true);
    setError('');
    setNotice('');
    try {
      await restorePurchases();
      await onRefreshSubscription();
      setNotice('Purchases restored.');
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  };

  const deleteAccount = async () => {
    setDeleting(true);
    setError('');
    try {
      await api('/account', { method: 'DELETE' });
      await supabase.auth.signOut();
    } catch (e) {
      setError(e.message);
      setDeleting(false);
      setConfirmingDelete(false);
    }
  };

  const statusLabel = STATUS_LABELS[subscription?.status] ?? subscription?.status ?? 'Unknown';
  const isTrial = subscription?.status === 'trial';
  const isActive = subscription?.status === 'active';

  return (
    <View style={{ padding: 18 }}>
      <Title>Profile</Title>

      <Card style={{ marginTop: 16 }}>
        <Row style={{ gap: 12 }}>
          <View
            style={{
              width: 44, height: 44, borderRadius: 22, backgroundColor: c.accentSoft,
              alignItems: 'center', justifyContent: 'center',
            }}
          >
            <Text style={{ color: c.accent, fontWeight: '600' }}>
              {session.user.email?.[0]?.toUpperCase() ?? '?'}
            </Text>
          </View>
          <View style={{ flex: 1, minWidth: 0 }}>
            <Body numberOfLines={1} style={{ fontWeight: '600' }}>{session.user.email}</Body>
            <Muted style={{ marginTop: 2 }}>
              Signed in with {session.user.app_metadata?.provider ?? 'email'}
            </Muted>
          </View>
        </Row>
      </Card>

      <Card style={{ marginTop: 10, borderColor: isActive ? c.success : c.border }}>
        <Row style={{ gap: 10 }}>
          <Icon
            name={isActive ? 'checkmark-circle' : isTrial ? 'time-outline' : 'alert-circle-outline'}
            size={20}
            color={isActive ? c.success : isTrial ? c.accent : c.warn}
          />
          <View style={{ flex: 1 }}>
            <Body style={{ fontWeight: '600' }}>{statusLabel}</Body>
            {isTrial && (
              <Muted style={{ marginTop: 2 }}>
                {subscription.trial_days_left} day{subscription.trial_days_left === 1 ? '' : 's'} left — ends{' '}
                {new Date(subscription.trial_ends_at).toLocaleDateString()}
              </Muted>
            )}
            {subscription?.product_id && <Muted style={{ marginTop: 2 }}>Plan: {subscription.product_id}</Muted>}
            {subscription?.platform && (
              <Muted style={{ marginTop: 2 }}>
                Billed via {subscription.platform === 'stripe' ? 'Stripe (web)'
                  : subscription.platform === 'apple' || subscription.platform === 'app_store' ? 'App Store'
                  : 'Google Play'}
              </Muted>
            )}
            {subscription?.current_period_end && (
              <Muted style={{ marginTop: 2 }}>
                Renews {new Date(subscription.current_period_end).toLocaleDateString()}
              </Muted>
            )}
          </View>
        </Row>
      </Card>

      <ErrorText>{error}</ErrorText>
      {notice ? <Text style={{ color: c.success, fontSize: 13, marginTop: 8 }}>{notice}</Text> : null}

      <Button
        label={isActive ? t('changePlan') : t('subscribeNow')}
        onPress={() => setShowPlans((v) => !v)}
        disabled={busy}
        style={{ marginTop: 14 }}
      />
      {showPlans && (
        <PlanList
          subscription={subscription}
          onRefreshSubscription={onRefreshSubscription}
          onDone={() => setShowPlans(false)}
        />
      )}

      {isActive && (
        <Muted style={{ marginTop: 10 }}>
          To cancel, use {subscription?.platform === 'stripe'
            ? 'the billing portal link in your subscription email'
            : subscription?.platform === 'apple' || subscription?.platform === 'app_store'
            ? 'Settings → Apple ID → Subscriptions on your iPhone'
            : 'Google Play → Payments and subscriptions'}. Access continues until the period ends.
        </Muted>
      )}

      <Card style={{ marginTop: 18 }}>
        <Muted style={{ marginBottom: 8 }}>{t('theme')}</Muted>
        <Row style={{ gap: 6, flexWrap: 'wrap' }}>
          <Pill label={t('system')} active={settings?.themePref === 'system'} onPress={() => onChangeTheme('system')} />
          <Pill label={t('light')} active={settings?.themePref === 'light'} onPress={() => onChangeTheme('light')} />
          <Pill label={t('dark')} active={settings?.themePref === 'dark'} onPress={() => onChangeTheme('dark')} />
        </Row>
        <Muted style={{ marginTop: 14, marginBottom: 8 }}>{t('uiLanguage')}</Muted>
        <Row style={{ gap: 6, flexWrap: 'wrap' }}>
          {UI_LANGUAGES.map((l) => (
            <Pill
              key={l.code}
              label={l.label}
              active={settings?.uiLang === l.code}
              onPress={() => onChangeLang(l.code)}
            />
          ))}
        </Row>
      </Card>

      <Row style={{ gap: 20, marginTop: 20 }}>
        <TouchableOpacity onPress={restore} disabled={busy}>
          <Text style={{ color: c.accent, fontSize: 13 }}>{t('restorePurchases')}</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => supabase.auth.signOut()}>
          <Text style={{ color: c.accent, fontSize: 13 }}>{t('signOut')}</Text>
        </TouchableOpacity>
      </Row>

      <Row style={{ gap: 20, marginTop: 18 }}>
        <TouchableOpacity onPress={() => setLegalOpen(legalOpen === 'privacy' ? null : 'privacy')}>
          <Muted>Privacy policy</Muted>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => setLegalOpen(legalOpen === 'terms' ? null : 'terms')}>
          <Muted>Terms of service</Muted>
        </TouchableOpacity>
      </Row>
      {legalOpen && (
        <Card style={{ marginTop: 10 }}>
          <Body style={{ fontWeight: '600', marginBottom: 6 }}>
            {legalOpen === 'privacy' ? 'Privacy policy' : 'Terms of service'}
          </Body>
          <Body style={{ color: c.textSecondary, fontSize: 13, lineHeight: 20 }}>
            {legalOpen === 'privacy' ? PRIVACY : TERMS}
          </Body>
        </Card>
      )}

      <View style={{ marginTop: 26, paddingTop: 16, borderTopWidth: 1, borderColor: c.border }}>
        <Muted style={{ marginBottom: 8 }}>Danger zone</Muted>
        {!confirmingDelete ? (
          <TouchableOpacity onPress={() => setConfirmingDelete(true)}>
            <Text style={{ color: c.danger, fontSize: 13 }}>Delete my account and all data</Text>
          </TouchableOpacity>
        ) : (
          <View>
            <Body style={{ color: c.danger, fontSize: 13, lineHeight: 20 }}>
              This permanently deletes your account, courses, documents, audio, summaries, flashcards,
              notes, and bookmarks. This cannot be undone.
              {isActive
                ? ' Note: cancel your subscription in the store first — deleting the account does not stop billing.'
                : ''}
            </Body>
            <Row style={{ gap: 8, marginTop: 12 }}>
              <Button
                label={deleting ? 'Deleting…' : 'Yes, delete everything'}
                variant="danger"
                small
                onPress={deleteAccount}
                disabled={deleting}
              />
              <Button label="Cancel" variant="secondary" small onPress={() => setConfirmingDelete(false)} disabled={deleting} />
            </Row>
          </View>
        )}
      </View>
    </View>
  );
}
