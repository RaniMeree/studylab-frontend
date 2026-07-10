import { useEffect, useState } from 'react';
import { Text, TouchableOpacity, View } from 'react-native';
import { api, postJson } from '../api';
import { useT } from '../i18n';
import { useThemeColors } from '../theme';
import { Body, Button, Card, EmptyState, ErrorText, Loading, Muted, NeonBar, Row, Title } from '../ui';

export function ReviewScreen() {
  const c = useThemeColors();
  const t = useT();
  const [due, setDue] = useState(null);
  const [index, setIndex] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [reviewing, setReviewing] = useState(false);
  const [doneCount, setDoneCount] = useState(0);
  const [error, setError] = useState('');

  const refresh = () =>
    api('/review/due')
      .then((d) => setDue(d.due))
      .catch((e) => setError(e.message));
  useEffect(() => { refresh(); }, []);

  const answer = (quality) => {
    const card = due[index];
    postJson(`/flashcards/${card.id}/review`, { quality }).catch(() => {});
    setFlipped(false);
    setDoneCount((n) => n + 1);
    if (index + 1 < due.length) {
      setIndex(index + 1);
    } else {
      setReviewing(false);
      setIndex(0);
      setDoneCount(0);
      refresh();
    }
  };

  if (due === null) {
    return (
      <View style={{ padding: 18 }}>
        <Title>{t('review')}</Title>
        <Loading label="Loading due cards…" />
        <ErrorText>{error}</ErrorText>
      </View>
    );
  }

  if (reviewing && due.length > 0) {
    const card = due[index];
    const progress = (index / due.length) * 100;
    return (
      <View style={{ padding: 18 }}>
        {/* Header */}
        <Row style={{ justifyContent: 'space-between', marginBottom: 16 }}>
          <View>
            <Text style={{ fontSize: 10, color: c.textMuted, letterSpacing: 1.2, textTransform: 'uppercase', fontWeight: '700' }}>
              Reviewing
            </Text>
            <Title style={{ fontSize: 18, marginTop: 2 }}>{index + 1} of {due.length}</Title>
          </View>
          <TouchableOpacity
            onPress={() => { setReviewing(false); setFlipped(false); refresh(); }}
            style={{
              paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20,
              backgroundColor: c.glass ? 'rgba(255,255,255,0.06)' : c.cardAlt,
              borderWidth: 1, borderColor: c.glass ? 'rgba(167,139,250,0.2)' : c.border,
            }}
          >
            <Text style={{ color: c.textMuted, fontSize: 12 }}>{t('exit')}</Text>
          </TouchableOpacity>
        </Row>

        {/* Progress bar */}
        <View style={{ height: 3, backgroundColor: c.glass ? 'rgba(167,139,250,0.15)' : c.border, borderRadius: 2, marginBottom: 18 }}>
          <View style={{
            width: `${progress}%`, height: 3, borderRadius: 2,
            backgroundColor: c.accent,
            shadowColor: c.accent, shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.8, shadowRadius: 6,
          }} />
        </View>

        {/* Flashcard */}
        <TouchableOpacity
          onPress={() => setFlipped((f) => !f)}
          activeOpacity={0.85}
          style={{
            minHeight: 200, justifyContent: 'center', alignItems: 'center',
            backgroundColor: c.glass
              ? (flipped ? 'rgba(124,58,237,0.12)' : 'rgba(255,255,255,0.04)')
              : c.card,
            borderRadius: 20, padding: 24,
            borderWidth: 1,
            borderColor: c.glass
              ? (flipped ? 'rgba(167,139,250,0.45)' : 'rgba(167,139,250,0.2)')
              : (flipped ? c.accent : c.border),
            shadowColor: flipped ? '#7C3AED' : 'transparent',
            shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.5, shadowRadius: 20,
            marginBottom: 16,
          }}
        >
          <Text style={{
            fontSize: 10, color: flipped ? c.accent : c.textMuted,
            letterSpacing: 1.5, textTransform: 'uppercase', fontWeight: '700', marginBottom: 12,
          }}>
            {flipped ? '✦ ANSWER' : 'QUESTION'} · {card.document_title}
          </Text>
          <Text style={{ fontSize: 16, lineHeight: 25, color: c.text, textAlign: 'center' }}>
            {flipped ? card.answer : card.question}
          </Text>
          {!flipped && (
            <Text style={{ color: c.textMuted, fontSize: 11, marginTop: 16 }}>tap to reveal answer</Text>
          )}
        </TouchableOpacity>

        {flipped ? (
          <Row style={{ gap: 8 }}>
            <TouchableOpacity
              onPress={() => answer('again')}
              style={{
                flex: 1, paddingVertical: 13, borderRadius: 14, alignItems: 'center',
                backgroundColor: 'rgba(248,113,113,0.15)',
                borderWidth: 1, borderColor: 'rgba(248,113,113,0.35)',
              }}
            >
              <Text style={{ color: c.danger, fontWeight: '700', fontSize: 13 }}>{t('again')}</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => answer('good')}
              style={{
                flex: 1, paddingVertical: 13, borderRadius: 14, alignItems: 'center',
                backgroundColor: c.glass ? 'rgba(124,58,237,0.3)' : c.accent,
                borderWidth: 1, borderColor: c.glass ? 'rgba(167,139,250,0.5)' : 'transparent',
                shadowColor: '#7C3AED', shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.7, shadowRadius: 10,
              }}
            >
              <Text style={{ color: '#fff', fontWeight: '700', fontSize: 13 }}>{t('good')}</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => answer('easy')}
              style={{
                flex: 1, paddingVertical: 13, borderRadius: 14, alignItems: 'center',
                backgroundColor: 'rgba(52,211,153,0.15)',
                borderWidth: 1, borderColor: 'rgba(52,211,153,0.35)',
              }}
            >
              <Text style={{ color: c.success, fontWeight: '700', fontSize: 13 }}>{t('easy')}</Text>
            </TouchableOpacity>
          </Row>
        ) : (
          <View style={{ alignItems: 'center' }}>
            <Text style={{ color: c.textMuted, fontSize: 12 }}>{t('thinkThenTap')}</Text>
          </View>
        )}
      </View>
    );
  }

  return (
    <View style={{ padding: 18 }}>
      <Text style={{ fontSize: 10, color: c.textMuted, letterSpacing: 1.5, textTransform: 'uppercase', fontWeight: '700', marginBottom: 6 }}>
        Daily Review
      </Text>
      <Title>{t('review')}</Title>
      <ErrorText>{error}</ErrorText>
      <NeonBar style={{ marginTop: 14, marginBottom: 14 }} />

      {due.length === 0 ? (
        <EmptyState
          icon="checkmark-circle-outline"
          title={t('allCaughtUp')}
          body={t('noCardsDue')}
        />
      ) : (
        <>
          <View style={{
            marginTop: 8, alignItems: 'center', paddingVertical: 36,
            backgroundColor: c.glass ? 'rgba(124,58,237,0.1)' : c.cardAlt,
            borderRadius: 20, borderWidth: 1,
            borderColor: c.glass ? 'rgba(167,139,250,0.25)' : c.border,
            shadowColor: '#7C3AED', shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.4, shadowRadius: 20,
          }}>
            <Text style={{ fontSize: 56, fontWeight: '800', color: c.accent }}>{due.length}</Text>
            <Text style={{ color: c.textMuted, fontSize: 13, marginTop: 4 }}>{t('cardsDueToday')}</Text>
          </View>
          <TouchableOpacity
            onPress={() => { setReviewing(true); setIndex(0); setFlipped(false); }}
            style={{
              marginTop: 16, paddingVertical: 15, borderRadius: 16, alignItems: 'center',
              flexDirection: 'row', justifyContent: 'center', gap: 8,
              backgroundColor: c.glass ? 'rgba(124,58,237,0.35)' : c.accent,
              borderWidth: 1, borderColor: c.glass ? 'rgba(167,139,250,0.5)' : 'transparent',
              shadowColor: '#7C3AED', shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.8, shadowRadius: 14,
            }}
          >
            <Text style={{ fontSize: 18 }}>▶</Text>
            <Text style={{ color: '#fff', fontSize: 15, fontWeight: '700' }}>{t('startReview')}</Text>
          </TouchableOpacity>
        </>
      )}
    </View>
  );
}
