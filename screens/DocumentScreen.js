import { useEffect, useState } from 'react';
import { Text, TouchableOpacity, View } from 'react-native';
import * as Clipboard from 'expo-clipboard';
import { api, postJson } from '../api';
import { useT } from '../i18n';
import { usePlayer } from '../player';
import { useThemeColors } from '../theme';
import { Body, Button, Card, ErrorText, Icon, Input, Label, Loading, Muted, Pill, Row, Segmented, Title } from '../ui';

const SUMMARY_LABELS = { quick: 'Quick summary', ai: 'AI summary', simple: 'Simple explanation' };

function formatTime(seconds) {
  if (!seconds || Number.isNaN(seconds)) return '';
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60).toString().padStart(2, '0');
  return `${m}:${s}`;
}

export function DocumentScreen({ docId, voicesByLanguage, onBack }) {
  const c = useThemeColors();
  const t = useT();
  const player = usePlayer();
  const [doc, setDoc] = useState(null);
  const [tab, setTab] = useState('listen');
  const [voiceId, setVoiceId] = useState(null);
  const [error, setError] = useState('');
  const [copiedKey, setCopiedKey] = useState(null);

  const refresh = () =>
    api(`/documents/${docId}`)
      .then((d) => {
        setDoc(d);
        setVoiceId((v) => v ?? voicesByLanguage[d.language]?.[0]?.id ?? null);
      })
      .catch((e) => setError(e.message));
  useEffect(() => { refresh(); }, [docId]);

  const copyText = async (key, text) => {
    await Clipboard.setStringAsync(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 1500);
  };

  if (!doc) return <Loading label="Loading document…" />;

  const voiceOptions = voicesByLanguage[doc.language] ?? [];

  return (
    <View style={{ padding: 18 }}>
      <TouchableOpacity onPress={onBack} hitSlop={8} style={{ marginBottom: 8 }}>
        <Row style={{ gap: 4 }}>
          <Icon name="chevron-back" size={16} color={c.accent} />
          <Muted style={{ color: c.accent }}>{t('back')}</Muted>
        </Row>
      </TouchableOpacity>
      <Title numberOfLines={1} style={{ fontSize: 19 }}>{doc.filename}</Title>
      {doc.progress_percent > 0 && (
        <Muted style={{ marginTop: 2 }}>{doc.progress_percent}% complete</Muted>
      )}

      <View style={{ marginTop: 12, marginBottom: 14 }}>
        <Segmented
          value={tab}
          onChange={setTab}
          options={[
            { value: 'listen', label: t('listen') },
            { value: 'learn', label: t('learn') },
            { value: 'ask', label: t('ask') },
          ]}
        />
      </View>

      <ErrorText>{error}</ErrorText>

      {tab === 'listen' && (
        <ListenSection
          doc={doc}
          voiceOptions={voiceOptions}
          voiceId={voiceId}
          setVoiceId={setVoiceId}
          setError={setError}
          refresh={refresh}
        />
      )}
      {tab === 'learn' && (
        <LearnSection
          doc={doc}
          docId={docId}
          voiceId={voiceId}
          setError={setError}
          refresh={refresh}
          copiedKey={copiedKey}
          copyText={copyText}
        />
      )}
      {tab === 'ask' && (
        <AskSection
          doc={doc}
          docId={docId}
          voiceId={voiceId}
          setError={setError}
          refresh={refresh}
          copiedKey={copiedKey}
          copyText={copyText}
        />
      )}
    </View>
  );
}

function ListenSection({ doc, voiceOptions, voiceId, setVoiceId, setError, refresh }) {
  const c = useThemeColors();
  const t = useT();
  const player = usePlayer();
  const [bookmarkLabel, setBookmarkLabel] = useState('');
  const [noteText, setNoteText] = useState('');

  const play = (chapter) =>
    player
      .playChapter(chapter, {
        voiceId,
        chapters: doc.chapters,
        docTitle: doc.filename,
      })
      .catch((e) => setError(e.message));

  const activeChapter = doc.chapters.find((ch) => ch.id === player.track?.chapterId);

  const addBookmark = async () => {
    if (!activeChapter) return;
    try {
      await postJson(`/chapters/${activeChapter.id}/bookmarks`, {
        position_seconds: player.status.currentTime || 0,
        label: bookmarkLabel.trim() || null,
      });
      setBookmarkLabel('');
      refresh();
    } catch (e) {
      setError(e.message);
    }
  };

  const addNote = async () => {
    if (!activeChapter || !noteText.trim()) return;
    const si = player.currentSentenceIndex;
    try {
      await postJson(`/chapters/${activeChapter.id}/notes`, {
        text: noteText.trim(),
        sentence_index: si >= 0 ? si : null,
        quote: si >= 0 ? player.track.sentences[si]?.text : null,
      });
      setNoteText('');
      refresh();
    } catch (e) {
      setError(e.message);
    }
  };

  const remove = async (path) => {
    try {
      await api(path, { method: 'DELETE' });
      refresh();
    } catch (e) {
      setError(e.message);
    }
  };

  return (
    <View>
      {voiceOptions.length > 1 && (
        <>
          <Label>{t('voice')}</Label>
          <Row style={{ flexWrap: 'wrap', gap: 6, marginBottom: 12 }}>
            {voiceOptions.map((v) => (
              <Pill key={v.id} label={v.label} active={voiceId === v.id} onPress={() => setVoiceId(v.id)} />
            ))}
          </Row>
        </>
      )}

      <Label>{t('chapters')}</Label>
      {doc.chapters.map((ch) => {
        const isPlaying = player.track?.chapterId === ch.id;
        const isLoading = player.loadingChapterId === ch.id;
        const p = ch.progress;
        const statusIcon = isPlaying
          ? (player.status.playing ? 'pause' : 'play')
          : p?.completed
          ? 'checkmark-circle'
          : 'play-circle-outline';
        const statusColor = isPlaying ? c.accent : p?.completed ? c.success : c.textMuted;
        const sub = p?.completed
          ? t('completed')
          : p && p.duration_seconds > 0
          ? `${Math.round((100 * p.position_seconds) / p.duration_seconds)}% listened — tap to resume`
          : `${ch.characters.toLocaleString()} characters`;
        return (
          <Card
            key={ch.id}
            onPress={() => (isPlaying ? player.toggle() : play(ch))}
            style={{ marginBottom: 8, borderColor: isPlaying ? c.accent : c.border }}
          >
            <Row style={{ gap: 12 }}>
              <Icon name={isLoading ? 'hourglass-outline' : statusIcon} size={22} color={statusColor} />
              <View style={{ flex: 1, minWidth: 0 }}>
                <Body numberOfLines={1} style={{ fontWeight: isPlaying ? '600' : '400', color: isPlaying ? c.accent : c.text }}>
                  {ch.title}
                </Body>
                <Muted style={{ marginTop: 2 }}>{isLoading ? 'Generating audio…' : sub}</Muted>
              </View>
            </Row>
          </Card>
        );
      })}

      {activeChapter && (
        <View style={{ marginTop: 14 }}>
          <Label>{t('bookmarks')} — {activeChapter.title}</Label>
          <Row style={{ gap: 8 }}>
            <Input
              placeholder="Bookmark label (optional)…"
              value={bookmarkLabel}
              onChangeText={setBookmarkLabel}
              onSubmitEditing={addBookmark}
              style={{ flex: 1 }}
            />
            <Button label="Save" small icon="bookmark-outline" onPress={addBookmark} />
          </Row>
          {activeChapter.bookmarks.map((b) => (
            <Row key={b.id} style={{ justifyContent: 'space-between', marginTop: 10 }}>
              <TouchableOpacity onPress={() => player.player.seekTo(b.position_seconds)} style={{ flex: 1 }}>
                <Text style={{ color: c.accent, fontSize: 13 }}>
                  {formatTime(b.position_seconds)} {b.label ? `— ${b.label}` : ''}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => remove(`/bookmarks/${b.id}`)} hitSlop={8}>
                <Icon name="close" size={15} color={c.textMuted} />
              </TouchableOpacity>
            </Row>
          ))}

          <Label style={{ marginTop: 14 }}>{t('notes')}</Label>
          <Row style={{ gap: 8 }}>
            <Input
              placeholder={player.currentSentenceIndex >= 0 ? 'Note on the highlighted sentence…' : 'Add a note…'}
              value={noteText}
              onChangeText={setNoteText}
              onSubmitEditing={addNote}
              style={{ flex: 1 }}
            />
            <Button label="Add" small onPress={addNote} disabled={!noteText.trim()} />
          </Row>
          {activeChapter.notes.map((n) => (
            <Card key={n.id} style={{ marginTop: 8 }}>
              {n.quote ? <Muted numberOfLines={2}>“{n.quote}”</Muted> : null}
              <Body style={{ marginTop: 4 }}>{n.text}</Body>
              <TouchableOpacity onPress={() => remove(`/notes/${n.id}`)} style={{ marginTop: 6 }}>
                <Muted style={{ color: c.danger }}>Delete</Muted>
              </TouchableOpacity>
            </Card>
          ))}
        </View>
      )}
    </View>
  );
}

function LearnSection({ doc, docId, voiceId, setError, refresh, copiedKey, copyText }) {
  const c = useThemeColors();
  const t = useT();
  const player = usePlayer();
  const [summarizing, setSummarizing] = useState(false);
  const [glossary, setGlossary] = useState(null);
  const [loadingGlossary, setLoadingGlossary] = useState(false);
  const [generatingCards, setGeneratingCards] = useState(false);
  const [dueCount, setDueCount] = useState(0);
  const [reviewQueue, setReviewQueue] = useState(null);
  const [reviewIndex, setReviewIndex] = useState(0);
  const [reviewFlipped, setReviewFlipped] = useState(false);
  const [flipped, setFlipped] = useState({});
  const [quiz, setQuiz] = useState(undefined);
  const [quizAnswers, setQuizAnswers] = useState({});
  const [quizResult, setQuizResult] = useState(null);
  const [quizBusy, setQuizBusy] = useState(false);

  const refreshDue = () =>
    api(`/documents/${docId}/flashcards/due`)
      .then((d) => setDueCount(d.due.length))
      .catch(() => {});
  useEffect(() => { refreshDue(); }, [docId, doc.flashcards.length]);

  useEffect(() => {
    api(`/documents/${docId}/quiz`).then(setQuiz).catch(() => setQuiz(null));
  }, [docId]);

  const doSummarize = async (mode) => {
    setSummarizing(true);
    setError('');
    try {
      const data = await postJson(`/documents/${docId}/summarize`, { mode, voice_id: voiceId });
      player.playSaved(SUMMARY_LABELS[mode] ?? 'Summary', data, doc.filename);
      refresh();
    } catch (e) {
      setError(e.message);
    } finally {
      setSummarizing(false);
    }
  };

  const loadGlossary = async () => {
    setLoadingGlossary(true);
    setError('');
    try {
      const g = await postJson(`/documents/${docId}/glossary`, {});
      setGlossary(g.terms);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoadingGlossary(false);
    }
  };

  const generateFlashcards = async () => {
    setGeneratingCards(true);
    setError('');
    try {
      await postJson(`/documents/${docId}/flashcards/generate`, { count: 10 });
      refresh();
    } catch (e) {
      setError(e.message);
    } finally {
      setGeneratingCards(false);
    }
  };

  const startReview = async () => {
    try {
      const d = await api(`/documents/${docId}/flashcards/due`);
      if (!d.due.length) return;
      setReviewQueue(d.due);
      setReviewIndex(0);
      setReviewFlipped(false);
    } catch (e) {
      setError(e.message);
    }
  };

  const reviewAnswer = (quality) => {
    const card = reviewQueue[reviewIndex];
    postJson(`/flashcards/${card.id}/review`, { quality }).catch(() => {});
    setReviewFlipped(false);
    if (reviewIndex + 1 < reviewQueue.length) {
      setReviewIndex(reviewIndex + 1);
    } else {
      setReviewQueue(null);
      refresh();
      refreshDue();
    }
  };

  const generateQuiz = async () => {
    setQuizBusy(true);
    setError('');
    try {
      const q = await postJson(`/documents/${docId}/quiz/generate`, { count: 8 });
      setQuiz(q);
      setQuizAnswers({});
      setQuizResult(null);
    } catch (e) {
      setError(e.message);
    } finally {
      setQuizBusy(false);
    }
  };

  const submitQuiz = async () => {
    setQuizBusy(true);
    setError('');
    try {
      const answers = quiz.questions.map((_, i) => quizAnswers[i] ?? -1);
      setQuizResult(await postJson(`/quizzes/${quiz.id}/submit`, { answers }));
    } catch (e) {
      setError(e.message);
    } finally {
      setQuizBusy(false);
    }
  };

  if (reviewQueue) {
    const card = reviewQueue[reviewIndex];
    return (
      <View>
        <Row style={{ justifyContent: 'space-between', marginBottom: 10 }}>
          <Label style={{ marginBottom: 0 }}>Review {reviewIndex + 1} of {reviewQueue.length}</Label>
          <TouchableOpacity onPress={() => setReviewQueue(null)}>
            <Muted>Exit</Muted>
          </TouchableOpacity>
        </Row>
        <Card onPress={() => setReviewFlipped((f) => !f)} style={{ minHeight: 140, justifyContent: 'center' }}>
          <Muted style={{ marginBottom: 8 }}>{reviewFlipped ? 'ANSWER' : 'QUESTION'} · tap to flip</Muted>
          <Body style={{ fontSize: 15, lineHeight: 23 }}>
            {reviewFlipped ? card.answer : card.question}
          </Body>
        </Card>
        {reviewFlipped ? (
          <Row style={{ gap: 8, marginTop: 12 }}>
            <Button label="Again" variant="danger" small style={{ flex: 1 }} onPress={() => reviewAnswer('again')} />
            <Button label="Good" small style={{ flex: 1 }} onPress={() => reviewAnswer('good')} />
            <Button label="Easy" small variant="secondary" style={{ flex: 1 }} onPress={() => reviewAnswer('easy')} />
          </Row>
        ) : (
          <Muted style={{ marginTop: 12, textAlign: 'center' }}>Think of the answer, then tap to check.</Muted>
        )}
      </View>
    );
  }

  return (
    <View>
      <Label>{t('summaries')}</Label>
      <Row style={{ flexWrap: 'wrap', gap: 6 }}>
        <Pill label={t('quick')} onPress={() => doSummarize('quick')} disabled={summarizing} />
        <Pill label={t('aiSummary')} onPress={() => doSummarize('ai')} disabled={summarizing} />
        <Pill label={t('explainSimply')} onPress={() => doSummarize('simple')} disabled={summarizing} />
        <Pill label={t('keyTerms')} onPress={loadGlossary} disabled={loadingGlossary} />
      </Row>
      {(summarizing || loadingGlossary) && <Loading label={summarizing ? 'Summarizing…' : 'Extracting terms…'} />}

      {glossary && (
        <Card style={{ marginTop: 10 }}>
          <Muted style={{ marginBottom: 4 }}>KEY TERMS</Muted>
          {glossary.map((t, i) => (
            <View key={i} style={{ marginTop: 8 }}>
              <Body style={{ fontWeight: '600', color: c.accent }}>{t.term}</Body>
              <Body selectable style={{ color: c.textSecondary }}>{t.definition}</Body>
            </View>
          ))}
        </Card>
      )}

      {doc.summaries.map((sm) => (
        <Card key={sm.id} style={{ marginTop: 10 }}>
          <Muted>{SUMMARY_LABELS[sm.mode] ?? 'Summary'}</Muted>
          <Body selectable style={{ marginTop: 6, color: c.textSecondary }}>{sm.text}</Body>
          <Row style={{ gap: 16, marginTop: 10 }}>
            <TouchableOpacity onPress={() => player.playSaved(SUMMARY_LABELS[sm.mode] ?? 'Summary', sm, doc.filename)}>
              <Row style={{ gap: 4 }}>
                <Icon name="play" size={14} color={c.accent} />
                <Text style={{ color: c.accent, fontSize: 13 }}>Play</Text>
              </Row>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => copyText(sm.id, sm.text)}>
              <Text style={{ color: c.accent, fontSize: 13 }}>{copiedKey === sm.id ? 'Copied' : 'Copy'}</Text>
            </TouchableOpacity>
          </Row>
        </Card>
      ))}

      <Label style={{ marginTop: 18 }}>{t('flashcards')}</Label>
      {dueCount > 0 && (
        <Button label={`Review ${dueCount} due card${dueCount === 1 ? '' : 's'}`} icon="play" onPress={startReview} style={{ marginBottom: 10 }} />
      )}
      <Row style={{ gap: 6, flexWrap: 'wrap' }}>
        <Pill
          label={generatingCards ? '…' : doc.flashcards.length ? t('regenerateDeck') : t('generateFlashcards')}
          onPress={generateFlashcards}
          disabled={generatingCards}
        />
      </Row>
      {generatingCards && <Loading label="Creating flashcards…" />}
      {doc.flashcards.map((fc) => (
        <Card
          key={fc.id}
          onPress={() => setFlipped((f) => ({ ...f, [fc.id]: !f[fc.id] }))}
          style={{ marginTop: 8, borderColor: fc.known ? c.success : c.border }}
        >
          <Muted>{flipped[fc.id] ? 'ANSWER' : 'QUESTION'} · tap to flip</Muted>
          <Body style={{ marginTop: 6 }}>{flipped[fc.id] ? fc.answer : fc.question}</Body>
        </Card>
      ))}

      <Label style={{ marginTop: 18 }}>{t('exam')}</Label>
      {quizBusy && <Loading label="Working…" />}
      {quiz === null && !quizBusy && (
        <Button label={t('generateExam')} icon="school-outline" variant="secondary" onPress={generateQuiz} />
      )}
      {quiz?.results?.length > 0 && !quizResult && (
        <Muted style={{ marginBottom: 8 }}>
          Previous attempts: {quiz.results.map((r) => `${r.score}/${r.total}`).join(', ')}
        </Muted>
      )}
      {quizResult && (
        <Card style={{ borderColor: quizResult.score / quizResult.total >= 0.6 ? c.success : c.danger, marginBottom: 8 }}>
          <Body style={{ fontWeight: '600', fontSize: 16 }}>
            Score: {quizResult.score} / {quizResult.total}
          </Body>
          <TouchableOpacity onPress={() => { setQuizResult(null); setQuizAnswers({}); }} style={{ marginTop: 6 }}>
            <Text style={{ color: c.accent, fontSize: 13 }}>Try again</Text>
          </TouchableOpacity>
        </Card>
      )}
      {quiz?.questions?.map((q, qi) => {
        const chosen = quizResult ? quizResult.breakdown[qi].chosen : quizAnswers[qi];
        return (
          <Card key={qi} style={{ marginBottom: 8 }}>
            <Body style={{ fontWeight: '600' }}>{qi + 1}. {q.question}</Body>
            {q.choices.map((choice, ci) => {
              let borderColor = c.border;
              let bg = 'transparent';
              if (quizResult) {
                if (ci === quizResult.breakdown[qi].answer_index) { borderColor = c.success; bg = c.successSoft; }
                else if (ci === chosen) { borderColor = c.danger; bg = c.dangerSoft; }
              } else if (ci === chosen) {
                borderColor = c.accent; bg = c.accentSoft;
              }
              return (
                <TouchableOpacity
                  key={ci}
                  disabled={!!quizResult}
                  onPress={() => setQuizAnswers((a) => ({ ...a, [qi]: ci }))}
                  style={{
                    borderWidth: 1, borderColor, backgroundColor: bg,
                    borderRadius: 10, padding: 10, marginTop: 8,
                  }}
                >
                  <Body>{choice}</Body>
                </TouchableOpacity>
              );
            })}
            {quizResult && quizResult.breakdown[qi].explanation ? (
              <Muted style={{ marginTop: 8 }}>
                {quizResult.breakdown[qi].correct ? '✓ Correct. ' : '✗ '}
                {quizResult.breakdown[qi].explanation}
              </Muted>
            ) : null}
          </Card>
        );
      })}
      {quiz && !quizResult && (
        <Button
          label={`Submit (${Object.keys(quizAnswers).length}/${quiz.questions.length} answered)`}
          onPress={submitQuiz}
          disabled={quizBusy || Object.keys(quizAnswers).length < quiz.questions.length}
        />
      )}
    </View>
  );
}

function AskSection({ doc, docId, voiceId, setError, refresh, copiedKey, copyText }) {
  const c = useThemeColors();
  const t = useT();
  const player = usePlayer();
  const [question, setQuestion] = useState('');
  const [asking, setAsking] = useState(false);

  const ask = async () => {
    if (!question.trim()) return;
    setAsking(true);
    setError('');
    try {
      const data = await postJson(`/documents/${docId}/ask`, { question, voice_id: voiceId });
      setQuestion('');
      if (data.audio_url) player.playSaved('Answer', data, doc.filename);
      refresh();
    } catch (e) {
      setError(e.message);
    } finally {
      setAsking(false);
    }
  };

  return (
    <View>
      <Row style={{ gap: 8 }}>
        <Input
          placeholder={t('askPlaceholder')}
          value={question}
          onChangeText={setQuestion}
          onSubmitEditing={ask}
          style={{ flex: 1 }}
        />
        <Button label={asking ? '…' : 'Ask'} small onPress={ask} disabled={asking || !question.trim()} />
      </Row>
      {asking && <Loading label="Thinking…" />}
      {[...doc.questions].reverse().map((q) => (
        <Card key={q.id} style={{ marginTop: 8 }}>
          <Body style={{ fontWeight: '600', color: c.accent }}>Q: {q.question}</Body>
          <Body selectable style={{ marginTop: 6, color: c.textSecondary }}>{q.answer}</Body>
          <Row style={{ gap: 16, marginTop: 10 }}>
            {q.audio_url ? (
              <TouchableOpacity onPress={() => player.playSaved('Answer', q, doc.filename)}>
                <Row style={{ gap: 4 }}>
                  <Icon name="play" size={14} color={c.accent} />
                  <Text style={{ color: c.accent, fontSize: 13 }}>Play</Text>
                </Row>
              </TouchableOpacity>
            ) : null}
            <TouchableOpacity onPress={() => copyText(q.id, q.answer)}>
              <Text style={{ color: c.accent, fontSize: 13 }}>{copiedKey === q.id ? 'Copied' : 'Copy'}</Text>
            </TouchableOpacity>
          </Row>
        </Card>
      ))}
      {doc.questions.length === 0 && !asking && (
        <Muted style={{ marginTop: 12 }}>No questions yet — ask your first one above.</Muted>
      )}
    </View>
  );
}
