import { useEffect, useState } from 'react';
import { TouchableOpacity, View } from 'react-native';
import { api, postJson } from '../api';
import { useT } from '../i18n';
import { useThemeColors } from '../theme';
import { Body, Button, Card, EmptyState, ErrorText, Loading, Muted, Row, Title } from '../ui';

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
    return (
      <View style={{ padding: 18 }}>
        <Row style={{ justifyContent: 'space-between', marginBottom: 12 }}>
          <Title style={{ fontSize: 18 }}>{index + 1} / {due.length}</Title>
          <TouchableOpacity onPress={() => { setReviewing(false); setFlipped(false); refresh(); }}>
            <Muted>{t('exit')}</Muted>
          </TouchableOpacity>
        </Row>
        <Card onPress={() => setFlipped((f) => !f)} style={{ minHeight: 160, justifyContent: 'center' }}>
          <Muted style={{ marginBottom: 8 }}>
            {flipped ? 'ANSWER' : 'QUESTION'} · {card.document_title}
          </Muted>
          <Body style={{ fontSize: 16, lineHeight: 24 }}>
            {flipped ? card.answer : card.question}
          </Body>
        </Card>
        {flipped ? (
          <Row style={{ gap: 8, marginTop: 14 }}>
            <Button label={t('again')} variant="danger" small style={{ flex: 1 }} onPress={() => answer('again')} />
            <Button label={t('good')} small style={{ flex: 1 }} onPress={() => answer('good')} />
            <Button label={t('easy')} small variant="secondary" style={{ flex: 1 }} onPress={() => answer('easy')} />
          </Row>
        ) : (
          <Muted style={{ marginTop: 14, textAlign: 'center' }}>{t('thinkThenTap')}</Muted>
        )}
      </View>
    );
  }

  return (
    <View style={{ padding: 18 }}>
      <Title>{t('review')}</Title>
      <ErrorText>{error}</ErrorText>
      {due.length === 0 ? (
        <EmptyState
          icon="checkmark-circle-outline"
          title={t('allCaughtUp')}
          body={t('noCardsDue')}
        />
      ) : (
        <>
          <Card style={{ marginTop: 16, alignItems: 'center', paddingVertical: 24 }}>
            <Title style={{ fontSize: 34 }}>{due.length}</Title>
            <Muted style={{ marginTop: 4 }}>{t('cardsDueToday')}</Muted>
          </Card>
          <Button
            label={t('startReview')}
            icon="play"
            onPress={() => { setReviewing(true); setIndex(0); setFlipped(false); }}
            style={{ marginTop: 14 }}
          />
        </>
      )}
    </View>
  );
}
