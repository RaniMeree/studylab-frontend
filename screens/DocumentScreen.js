import { useEffect, useRef, useState } from 'react';
import { Modal, Platform, ScrollView, Text, TextInput, TouchableOpacity, View } from 'react-native';
import * as Clipboard from 'expo-clipboard';
import Slider from '@react-native-community/slider';
import { AudioModule, RecordingPresets, useAudioRecorder, useAudioRecorderState } from 'expo-audio';
import { api, postJson } from '../api';
import { UI_LANGUAGES, useT } from '../i18n';
import { usePlayer } from '../player';
import { useThemeColors } from '../theme';
import { Body, Button, Card, ErrorText, Icon, Input, Label, Loading, Muted, Pill, ProgressCard, Row, Segmented, SkeletonRows, Title, progressEstimate, useToast } from '../ui';

const SUMMARY_LABELS = { quick: 'Quick summary', ai: 'AI summary', simple: 'Simple explanation', lecture: 'Lecture narration' };

const WORD_STEPS = [50, 100, 150, 200, 250, 300, 350, 400, 450, 500];

const SIMPLICITY_LEVELS = [
  { key: 'child',  label: '🧒 Child',  desc: 'Age 8 — very simple words' },
  { key: 'teen',   label: '🧑 Teen',   desc: 'Age 14 — everyday language' },
  { key: 'adult',  label: '👤 Adult',  desc: 'Clear plain language' },
  { key: 'expert', label: '🎓 Expert', desc: 'Technical & precise' },
];

function SummaryOptionsSheet({ visible, mode, docLanguage, uiLang, sections, onClose, onGenerate }) {
  const c = useThemeColors();
  const [maxWords, setMaxWords] = useState(300);
  const [summaryLang, setSummaryLang] = useState(null); // null = same as doc
  const [simplicity, setSimplicity] = useState('teen');
  const [section, setSection] = useState(null); // null = whole document
  const [langOpen, setLangOpen] = useState(false);

  const isSimple = mode === 'simple';
  const isAi = mode === 'ai' || mode === 'lecture' || isSimple;

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <TouchableOpacity style={{ flex: 1 }} activeOpacity={1} onPress={onClose} />
      <View style={{
        backgroundColor: '#0f0a1e', borderTopLeftRadius: 24, borderTopRightRadius: 24,
        padding: 24, paddingBottom: 36,
        borderTopWidth: 1, borderColor: 'rgba(167,139,250,0.2)',
        shadowColor: '#7C3AED', shadowOffset: { width: 0, height: -4 }, shadowOpacity: 0.3, shadowRadius: 20,
      }}>
        {/* Handle */}
        <View style={{ width: 40, height: 4, borderRadius: 2, backgroundColor: 'rgba(167,139,250,0.3)', alignSelf: 'center', marginBottom: 20 }} />

        <Text style={{ color: '#fff', fontWeight: '800', fontSize: 17, marginBottom: 20 }}>
          {mode === 'quick' ? '⚡ Quick Summary' : mode === 'ai' ? '✨ AI Summary' : mode === 'lecture' ? '🎓 Expand into Lecture' : '💡 Explain Simply'} — Options
        </Text>

        {/* Section scope (research papers) */}
        {sections?.length > 0 && (
          <>
            <Text style={{ color: 'rgba(255,255,255,0.5)', fontSize: 11, fontWeight: '700', letterSpacing: 1.5, textTransform: 'uppercase', marginBottom: 10 }}>
              Scope
            </Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 20 }}>
              <View style={{ flexDirection: 'row', gap: 8 }}>
                {[null, ...sections].map((sec) => {
                  const active = section === sec;
                  return (
                    <TouchableOpacity
                      key={sec ?? 'whole'}
                      onPress={() => setSection(sec)}
                      style={{
                        paddingHorizontal: 14, paddingVertical: 8, borderRadius: 12,
                        backgroundColor: active ? '#0EA5E9' : 'rgba(255,255,255,0.06)',
                        borderWidth: 1, borderColor: active ? '#0EA5E9' : 'rgba(167,139,250,0.18)',
                      }}
                    >
                      <Text style={{ color: active ? '#fff' : 'rgba(255,255,255,0.5)', fontWeight: '700', fontSize: 13 }}>
                        {sec ?? '📄 Whole paper'}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </ScrollView>
          </>
        )}

        {/* Length */}
        <Text style={{ color: 'rgba(255,255,255,0.5)', fontSize: 11, fontWeight: '700', letterSpacing: 1.5, textTransform: 'uppercase', marginBottom: 10 }}>
          Length — <Text style={{ color: '#A78BFA' }}>{maxWords} words</Text>
          {maxWords <= 100 ? ' · brief' : maxWords <= 250 ? ' · standard' : maxWords <= 400 ? ' · detailed' : ' · in depth'}
        </Text>
        <Slider
          minimumValue={WORD_STEPS[0]}
          maximumValue={WORD_STEPS[WORD_STEPS.length - 1]}
          step={50}
          value={maxWords}
          onValueChange={setMaxWords}
          minimumTrackTintColor="#7C3AED"
          maximumTrackTintColor="rgba(255,255,255,0.12)"
          thumbTintColor="#A78BFA"
          style={{ marginBottom: 4, height: 36 }}
        />
        <Row style={{ justifyContent: 'space-between', marginBottom: 16 }}>
          <Text style={{ color: 'rgba(255,255,255,0.35)', fontSize: 10 }}>{WORD_STEPS[0]}</Text>
          <Text style={{ color: 'rgba(255,255,255,0.35)', fontSize: 10 }}>{WORD_STEPS[WORD_STEPS.length - 1]}</Text>
        </Row>

        {/* Simplicity (simple mode only) */}
        {isSimple && (
          <>
            <Text style={{ color: 'rgba(255,255,255,0.5)', fontSize: 11, fontWeight: '700', letterSpacing: 1.5, textTransform: 'uppercase', marginBottom: 10 }}>
              Simplicity level
            </Text>
            <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap', marginBottom: 20 }}>
              {SIMPLICITY_LEVELS.map((l) => (
                <TouchableOpacity
                  key={l.key}
                  onPress={() => setSimplicity(l.key)}
                  style={{
                    paddingHorizontal: 14, paddingVertical: 10, borderRadius: 14,
                    backgroundColor: simplicity === l.key ? 'rgba(124,58,237,0.3)' : 'rgba(255,255,255,0.04)',
                    borderWidth: 1, borderColor: simplicity === l.key ? '#7C3AED' : 'rgba(167,139,250,0.18)',
                  }}
                >
                  <Text style={{ color: '#fff', fontWeight: '700', fontSize: 13 }}>{l.label}</Text>
                  <Text style={{ color: 'rgba(255,255,255,0.4)', fontSize: 11, marginTop: 2 }}>{l.desc}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </>
        )}

        {/* Output language (AI modes only) */}
        {isAi && (
          <>
            <Text style={{ color: 'rgba(255,255,255,0.5)', fontSize: 11, fontWeight: '700', letterSpacing: 1.5, textTransform: 'uppercase', marginBottom: 10 }}>
              Output language
            </Text>
            {(() => {
              const langs = [{ code: null, label: 'Auto (same as document)', flag: '🌐' }, ...UI_LANGUAGES];
              const current = langs.find((l) => l.code === summaryLang) ?? langs[0];
              return (
                <View style={{ marginBottom: 24 }}>
                  <TouchableOpacity
                    onPress={() => setLangOpen((v) => !v)}
                    style={{
                      flexDirection: 'row', alignItems: 'center', gap: 10,
                      paddingHorizontal: 14, paddingVertical: 12, borderRadius: 14,
                      backgroundColor: 'rgba(255,255,255,0.06)',
                      borderWidth: 1, borderColor: langOpen ? '#7C3AED' : 'rgba(167,139,250,0.25)',
                    }}
                  >
                    <Text style={{ fontSize: 18 }}>{current.flag}</Text>
                    <Text style={{ color: '#fff', fontWeight: '600', fontSize: 14, flex: 1 }}>{current.label}</Text>
                    <Text style={{ color: 'rgba(255,255,255,0.5)', fontSize: 12 }}>{langOpen ? '▲' : '▼'}</Text>
                  </TouchableOpacity>
                  {langOpen && (
                    <ScrollView style={{
                      maxHeight: 190, marginTop: 6, borderRadius: 14,
                      backgroundColor: '#171029',
                      borderWidth: 1, borderColor: 'rgba(167,139,250,0.25)',
                    }}>
                      {langs.map((l) => {
                        const active = summaryLang === l.code;
                        return (
                          <TouchableOpacity
                            key={l.code ?? 'auto'}
                            onPress={() => { setSummaryLang(l.code); setLangOpen(false); }}
                            style={{
                              flexDirection: 'row', alignItems: 'center', gap: 10,
                              paddingHorizontal: 14, paddingVertical: 11,
                              backgroundColor: active ? 'rgba(124,58,237,0.3)' : 'transparent',
                            }}
                          >
                            <Text style={{ fontSize: 16 }}>{l.flag}</Text>
                            <Text style={{ color: active ? '#fff' : 'rgba(255,255,255,0.75)', fontSize: 13, fontWeight: active ? '700' : '500' }}>
                              {l.label}
                            </Text>
                          </TouchableOpacity>
                        );
                      })}
                    </ScrollView>
                  )}
                </View>
              );
            })()}
          </>
        )}

        <TouchableOpacity
          onPress={() => { onClose(); onGenerate({ maxWords, summaryLang, simplicity, section }); }}
          style={{
            paddingVertical: 16, borderRadius: 16, alignItems: 'center', backgroundColor: '#7C3AED',
            shadowColor: '#7C3AED', shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.7, shadowRadius: 16,
          }}
        >
          <Text style={{ color: '#fff', fontWeight: '800', fontSize: 16 }}>Generate</Text>
        </TouchableOpacity>
      </View>
    </Modal>
  );
}

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

  if (!doc) {
    return (
      <View style={{ padding: 16 }}>
        <SkeletonRows count={1} height={34} />
        <SkeletonRows count={4} height={64} />
      </View>
    );
  }

  const voiceOptions = voicesByLanguage[doc.language] ?? [];

  return (
    <View style={{ padding: 18 }}>
      {/* Breadcrumb: back to the course by name */}
      <TouchableOpacity onPress={onBack} hitSlop={8} style={{ marginBottom: 8 }}>
        <Row style={{ gap: 4 }}>
          <Icon name="chevron-back" size={16} color={doc.course_color ?? c.accent} />
          <Text numberOfLines={1} style={{ color: doc.course_color ?? c.accent, fontSize: 13, fontWeight: '600' }}>
            📁 {doc.course_name ?? t('back')}
          </Text>
        </Row>
      </TouchableOpacity>
      <Title numberOfLines={1} style={{ fontSize: 19 }}>{doc.filename}</Title>
      {/* Course color strip so the student always knows which course they're in */}
      <View style={{
        height: 3, borderRadius: 2, marginTop: 8, width: 56,
        backgroundColor: doc.course_color ?? c.accent,
        shadowColor: doc.course_color ?? c.accent,
        shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.8, shadowRadius: 6,
      }} />
      {doc.progress_percent > 0 && (
        <Muted style={{ marginTop: 6 }}>{doc.progress_percent}% complete</Muted>
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
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 8 }}>
        {doc.chapters.map((ch, idx) => {
          const isPlaying = player.track?.chapterId === ch.id;
          const isLoading = player.loadingChapterId === ch.id;
          const p = ch.progress;
          const done = p?.completed;
          return (
            <TouchableOpacity
              key={ch.id}
              onPress={() => (isPlaying ? player.toggle() : play(ch))}
              style={{
                paddingHorizontal: 12, paddingVertical: 8, borderRadius: 20,
                backgroundColor: isPlaying
                  ? (c.glass ? 'rgba(124,58,237,0.4)' : c.accent)
                  : done
                  ? (c.glass ? 'rgba(52,211,153,0.12)' : c.successSoft)
                  : (c.glass ? 'rgba(167,139,250,0.08)' : c.cardAlt),
                borderWidth: 1,
                borderColor: isPlaying
                  ? (c.glass ? 'rgba(167,139,250,0.6)' : c.accent)
                  : done
                  ? (c.glass ? 'rgba(52,211,153,0.35)' : c.success)
                  : (c.glass ? 'rgba(167,139,250,0.2)' : c.border),
                shadowColor: isPlaying ? '#7C3AED' : 'transparent',
                shadowOffset: { width: 0, height: 0 },
                shadowOpacity: isPlaying ? 0.9 : 0,
                shadowRadius: 10,
              }}
            >
              <Text style={{ fontSize: 12, fontWeight: isPlaying ? '700' : '500',
                color: isPlaying ? '#fff' : done ? c.success : c.accent }}>
                {isLoading ? '⏳' : isPlaying ? (player.status.playing ? '⏸ ' : '▶ ') : done ? '✓ ' : '▶ '}
                {ch.title}
              </Text>
              {p && !done && p.duration_seconds > 0 && (
                <Text style={{ fontSize: 10, color: isPlaying ? 'rgba(255,255,255,0.6)' : c.textMuted, marginTop: 3 }}>
                  {Math.round((100 * p.position_seconds) / p.duration_seconds)}% done
                </Text>
              )}
            </TouchableOpacity>
          );
        })}
      </View>

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
  const [summarizeProgress, setSummarizeProgress] = useState(null);
  const toast = useToast();
  const [summarySheet, setSummarySheet] = useState(null); // null | 'quick' | 'ai' | 'simple'
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

  const doSummarize = async (mode, opts = {}) => {
    setSummarizing(true);
    setError('');
    const totalChars = doc.chapters.reduce((s, ch) => s + (ch.characters ?? 0), 0);
    const llmSec = mode === 'quick' ? 3 : progressEstimate.summary(totalChars);
    setSummarizeProgress({
      stages: [
        { label: 'Reading the document', estimateSec: Math.max(2, Math.round(llmSec * 0.3)) },
        { label: mode === 'simple' ? 'Writing a simple explanation' : mode === 'lecture' ? 'Writing the lecture' : 'Writing the summary', estimateSec: llmSec },
        { label: 'Generating audio', estimateSec: progressEstimate.tts((opts.maxWords ?? 300) * 6) },
      ],
      detail: `${totalChars.toLocaleString()} characters · target ~${opts.maxWords ?? 300} words`,
    });
    try {
      const data = await postJson(`/documents/${docId}/summarize`, {
        mode,
        voice_id: voiceId,
        max_words: opts.maxWords ?? 300,
        summary_language: opts.summaryLang ?? null,
        simplicity: opts.simplicity ?? 'teen',
        section: opts.section ?? null,
      });
      player.playSaved(SUMMARY_LABELS[mode] ?? 'Summary', data, doc.filename);
      refresh();
    } catch (e) {
      setError(e.message);
    } finally {
      setSummarizing(false);
      setSummarizeProgress(null);
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
      toast('Flashcards ready');
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
      <SummaryOptionsSheet
        visible={summarySheet !== null}
        mode={summarySheet}
        docLanguage={doc.language}
        sections={doc.doc_type === 'paper'
          ? doc.chapters.map((ch) => ch.title).filter((s) => s !== 'Title & Authors' && s !== 'References')
          : doc.doc_type === 'slides'
            ? doc.chapters.map((ch) => ch.title)
            : null}
        onClose={() => setSummarySheet(null)}
        onGenerate={(opts) => doSummarize(summarySheet, opts)}
      />

      {doc.doc_type === 'paper' && <PaperTools doc={doc} docId={docId} setError={setError} />}
      {doc.doc_type === 'slides' && (
        <View style={{ marginBottom: 18 }}>
          <Label>📊 Slides tools</Label>
          <Row style={{ gap: 6, flexWrap: 'wrap' }}>
            <Pill label="🎓 Expand into lecture" onPress={() => setSummarySheet('lecture')} disabled={summarizing} />
          </Row>
          <Muted style={{ marginTop: 6 }}>
            Turns the bullet points into a flowing spoken lecture you can listen to.
          </Muted>
        </View>
      )}
      {doc.doc_type === 'lecture' && <LectureTools docId={docId} setError={setError} />}
      {doc.doc_type === 'exam' && <ExamTools doc={doc} docId={docId} setError={setError} refresh={refresh} />}
      {doc.doc_type === 'assignment' && <AssignmentTools doc={doc} docId={docId} setError={setError} />}

      <Label>{t('summaries')}</Label>
      <Row style={{ flexWrap: 'wrap', gap: 6 }}>
        <Pill label={t('quick')} onPress={() => setSummarySheet('quick')} disabled={summarizing} />
        <Pill label={t('aiSummary')} onPress={() => setSummarySheet('ai')} disabled={summarizing} />
        <Pill label={t('explainSimply')} onPress={() => setSummarySheet('simple')} disabled={summarizing} />
        <Pill label={t('keyTerms')} onPress={loadGlossary} disabled={loadingGlossary} />
      </Row>
      {summarizing && summarizeProgress ? (
        <ProgressCard stages={summarizeProgress.stages} detail={summarizeProgress.detail} />
      ) : (summarizing || loadingGlossary) ? (
        <Loading label={summarizing ? 'Summarizing…' : 'Extracting terms…'} />
      ) : null}

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

const CITATION_STYLES = ['apa', 'mla', 'harvard', 'bibtex'];

function PaperTools({ doc, docId, setError }) {
  const c = useThemeColors();
  const [card, setCard] = useState(doc.paper_meta?.card ?? null);
  const [loadingCard, setLoadingCard] = useState(false);
  const [citeStyle, setCiteStyle] = useState(null);
  const [citation, setCitation] = useState('');
  const [copied, setCopied] = useState(false);

  const loadCard = async () => {
    setLoadingCard(true);
    setError('');
    try {
      setCard(await postJson(`/documents/${docId}/paper-card`, {}));
    } catch (e) {
      setError(e.message);
    } finally {
      setLoadingCard(false);
    }
  };

  const loadCitation = async (style) => {
    setCiteStyle(style);
    setCitation('');
    setCopied(false);
    setError('');
    try {
      const { citation: text } = await api(`/documents/${docId}/citation?style=${style}`);
      setCitation(text);
    } catch (e) {
      setError(e.message);
      setCiteStyle(null);
    }
  };

  const copyCitation = async () => {
    await Clipboard.setStringAsync(citation);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  const hasMeta = !!doc.paper_meta?.title;

  const CARD_ROWS = card ? [
    { icon: '🎯', label: 'Research question', value: card.research_question },
    { icon: '🧪', label: 'Method', value: card.method },
    { icon: '⚠️', label: 'Limitations', value: card.limitations },
    { icon: '💡', label: 'Why it matters', value: card.why_it_matters },
  ] : [];

  return (
    <View style={{ marginBottom: 18 }}>
      <Label>🔬 Paper tools</Label>

      {/* Citation metadata strip */}
      {hasMeta && (
        <Muted style={{ marginBottom: 8 }} numberOfLines={2}>
          {doc.paper_meta.authors?.slice(0, 3).join(', ')}
          {doc.paper_meta.authors?.length > 3 ? ' et al.' : ''}
          {doc.paper_meta.year ? ` · ${doc.paper_meta.year}` : ''}
          {doc.paper_meta.journal ? ` · ${doc.paper_meta.journal}` : ''}
        </Muted>
      )}

      <Row style={{ gap: 6, flexWrap: 'wrap' }}>
        <Pill label={card ? '📋 Paper digest ✓' : loadingCard ? '…' : '📋 Paper digest'} onPress={card ? undefined : loadCard} disabled={loadingCard} />
        {hasMeta && CITATION_STYLES.map((s) => (
          <Pill key={s} label={s === 'bibtex' ? 'BibTeX' : s.toUpperCase()} active={citeStyle === s} onPress={() => loadCitation(s)} />
        ))}
      </Row>
      {loadingCard && <Loading label="Reading the paper…" />}

      {/* Citation output */}
      {citation ? (
        <Card style={{ marginTop: 10 }}>
          <Body selectable style={{ color: c.textSecondary, fontSize: 13, fontFamily: citeStyle === 'bibtex' ? 'monospace' : undefined }}>
            {citation}
          </Body>
          <TouchableOpacity onPress={copyCitation} style={{ marginTop: 8 }}>
            <Text style={{ color: c.accent, fontSize: 13 }}>{copied ? 'Copied ✓' : 'Copy citation'}</Text>
          </TouchableOpacity>
        </Card>
      ) : null}

      {/* Paper digest card */}
      {card && (
        <Card style={{ marginTop: 10 }}>
          {CARD_ROWS.filter((r) => r.value).map((r) => (
            <View key={r.label} style={{ marginBottom: 12 }}>
              <Text style={{ color: c.accent, fontSize: 11, fontWeight: '700', letterSpacing: 1, textTransform: 'uppercase', marginBottom: 3 }}>
                {r.icon} {r.label}
              </Text>
              <Body selectable style={{ color: c.textSecondary, fontSize: 13, lineHeight: 20 }}>{r.value}</Body>
            </View>
          ))}
          {card.findings?.length > 0 && (
            <View>
              <Text style={{ color: c.accent, fontSize: 11, fontWeight: '700', letterSpacing: 1, textTransform: 'uppercase', marginBottom: 3 }}>
                📊 Key findings
              </Text>
              {card.findings.map((f, i) => (
                <Body key={i} selectable style={{ color: c.textSecondary, fontSize: 13, lineHeight: 20, marginTop: 3 }}>
                  {i + 1}. {f}
                </Body>
              ))}
            </View>
          )}
        </Card>
      )}
    </View>
  );
}

function LectureTools({ docId, setError }) {
  const c = useThemeColors();
  const [topics, setTopics] = useState(null);
  const [loading, setLoading] = useState(false);

  const loadOutline = async () => {
    setLoading(true);
    setError('');
    try {
      const { topics: t } = await postJson(`/documents/${docId}/lecture-outline`, {});
      setTopics(t);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={{ marginBottom: 18 }}>
      <Label>🎬 Lecture tools</Label>
      <Row style={{ gap: 6, flexWrap: 'wrap' }}>
        <Pill label={topics ? '🗂 Topic outline ✓' : loading ? '…' : '🗂 Topic outline'} onPress={topics ? undefined : loadOutline} disabled={loading} />
      </Row>
      {loading && <Loading label="Outlining the lecture…" />}
      {topics && (
        <Card style={{ marginTop: 10 }}>
          {topics.map((topic, i) => (
            <View key={i} style={{ marginBottom: i < topics.length - 1 ? 14 : 0 }}>
              <Text style={{ color: c.accent, fontSize: 13, fontWeight: '700', marginBottom: 4 }}>
                {i + 1}. {topic.title}
              </Text>
              {topic.points.map((p, j) => (
                <Body key={j} selectable style={{ color: c.textSecondary, fontSize: 13, lineHeight: 20, marginLeft: 12, marginTop: 2 }}>
                  · {p}
                </Body>
              ))}
            </View>
          ))}
        </Card>
      )}
    </View>
  );
}

function ExamTools({ doc, docId, setError, refresh }) {
  const c = useThemeColors();
  const [generating, setGenerating] = useState(false);
  const [generatedCount, setGeneratedCount] = useState(null);

  const generate = async () => {
    setGenerating(true);
    setError('');
    try {
      const { count } = await postJson(`/documents/${docId}/exam-cards`, {});
      setGeneratedCount(count);
      refresh();
    } catch (e) {
      setError(e.message);
    } finally {
      setGenerating(false);
    }
  };

  return (
    <View style={{ marginBottom: 18 }}>
      <Label>📜 Exam tools</Label>
      <Row style={{ gap: 6, flexWrap: 'wrap' }}>
        <Pill
          label={generating ? '…' : '🎯 Create practice cards'}
          onPress={generate}
          disabled={generating}
        />
      </Row>
      {generating && <Loading label="Writing model answers…" />}
      {generatedCount !== null && !generating && (
        <Muted style={{ marginTop: 6 }}>
          Added {generatedCount} practice card{generatedCount === 1 ? '' : 's'} with model answers — review them in the Flashcards section below.
        </Muted>
      )}
      {generatedCount === null && (
        <Muted style={{ marginTop: 6 }}>
          Extracts every question and writes a model answer, then adds them as flashcards for practice.
        </Muted>
      )}
    </View>
  );
}

function GuideBlock({ icon, label, children }) {
  const c = useThemeColors();
  return (
    <View style={{ marginBottom: 14 }}>
      <Text style={{ color: c.accent, fontSize: 11, fontWeight: '700', letterSpacing: 1, textTransform: 'uppercase', marginBottom: 4 }}>
        {icon} {label}
      </Text>
      {children}
    </View>
  );
}

function AssignmentTools({ doc, docId, setError }) {
  const c = useThemeColors();
  const [guide, setGuide] = useState(doc.paper_meta?.guide ?? null);
  const [loadingGuide, setLoadingGuide] = useState(false);
  const [draftOpen, setDraftOpen] = useState(false);
  const [draft, setDraft] = useState('');
  const [feedback, setFeedback] = useState(null);
  const [loadingFeedback, setLoadingFeedback] = useState(false);

  const loadGuide = async () => {
    setLoadingGuide(true);
    setError('');
    try {
      setGuide(await postJson(`/documents/${docId}/assignment-guide`, {}));
    } catch (e) {
      setError(e.message);
    } finally {
      setLoadingGuide(false);
    }
  };

  const getFeedback = async () => {
    if (draft.trim().length < 100) return;
    setLoadingFeedback(true);
    setError('');
    setFeedback(null);
    try {
      setFeedback(await postJson(`/documents/${docId}/assignment-feedback`, { draft }));
    } catch (e) {
      setError(e.message);
    } finally {
      setLoadingFeedback(false);
    }
  };

  const body = { color: c.textSecondary, fontSize: 13, lineHeight: 20 };

  return (
    <View style={{ marginBottom: 18 }}>
      <Label>📝 Assignment coach</Label>
      <Row style={{ gap: 6, flexWrap: 'wrap' }}>
        <Pill label={guide ? '📋 Brief decoded ✓' : loadingGuide ? '…' : '📋 Decode brief & plan'} onPress={guide ? undefined : loadGuide} disabled={loadingGuide} />
        <Pill label="✍️ Feedback on my draft" active={draftOpen} onPress={() => setDraftOpen((v) => !v)} />
      </Row>
      {loadingGuide && <Loading label="Reading the brief…" />}

      {/* Guide */}
      {guide && (
        <Card style={{ marginTop: 10 }}>
          {!!guide.task_summary && (
            <GuideBlock icon="🎯" label="What is actually asked">
              <Body selectable style={body}>{guide.task_summary}</Body>
            </GuideBlock>
          )}
          {guide.deliverables?.length > 0 && (
            <GuideBlock icon="📦" label="Deliverables">
              {guide.deliverables.map((d, i) => (
                <Body key={i} selectable style={{ ...body, marginTop: 2 }}>· {d}</Body>
              ))}
            </GuideBlock>
          )}
          {guide.constraints?.length > 0 && (
            <GuideBlock icon="📏" label="Rules & constraints">
              {guide.constraints.map((d, i) => (
                <Body key={i} selectable style={{ ...body, marginTop: 2 }}>· {d}</Body>
              ))}
            </GuideBlock>
          )}
          {guide.grading_criteria?.length > 0 && (
            <GuideBlock icon="🏆" label="What the grader wants">
              {guide.grading_criteria.map((g, i) => (
                <View key={i} style={{ marginTop: 4 }}>
                  <Body selectable style={{ ...body, fontWeight: '600', color: c.text }}>{g.criterion}</Body>
                  <Body selectable style={body}>{g.what_the_grader_wants}</Body>
                </View>
              ))}
            </GuideBlock>
          )}
          {guide.outline?.length > 0 && (
            <GuideBlock icon="🗺️" label="Suggested structure">
              {guide.outline.map((o, i) => (
                <View key={i} style={{ marginTop: 4 }}>
                  <Body selectable style={{ ...body, fontWeight: '600', color: c.text }}>
                    {i + 1}. {o.section}{o.word_budget ? `  (~${o.word_budget} words)` : ''}
                  </Body>
                  <Body selectable style={body}>{o.goal}</Body>
                </View>
              ))}
            </GuideBlock>
          )}
          {guide.steps?.length > 0 && (
            <GuideBlock icon="👣" label="Work plan">
              {guide.steps.map((st, i) => (
                <Body key={i} selectable style={{ ...body, marginTop: 2 }}>{i + 1}. {st}</Body>
              ))}
            </GuideBlock>
          )}
          {guide.relevant_materials?.length > 0 && (
            <GuideBlock icon="🔗" label="Useful materials in this course">
              {guide.relevant_materials.map((m, i) => (
                <View key={i} style={{ marginTop: 4 }}>
                  <Body selectable style={{ ...body, fontWeight: '600', color: c.text }}>{m.title}</Body>
                  <Body selectable style={body}>{m.why}</Body>
                </View>
              ))}
            </GuideBlock>
          )}
          {guide.pitfalls?.length > 0 && (
            <GuideBlock icon="⚠️" label="Common pitfalls">
              {guide.pitfalls.map((p, i) => (
                <Body key={i} selectable style={{ ...body, marginTop: 2 }}>· {p}</Body>
              ))}
            </GuideBlock>
          )}
        </Card>
      )}

      {/* Draft feedback */}
      {draftOpen && (
        <Card style={{ marginTop: 10 }}>
          <Muted style={{ marginBottom: 8 }}>
            Paste your own draft — you'll get tutor-style notes, not a rewrite.
          </Muted>
          <Input
            placeholder="Paste your draft here…"
            value={draft}
            onChangeText={setDraft}
            multiline
            style={{ minHeight: 120, textAlignVertical: 'top', marginBottom: 8 }}
          />
          <Button
            label={loadingFeedback ? '…' : 'Get feedback'}
            small
            onPress={getFeedback}
            disabled={loadingFeedback || draft.trim().length < 100}
          />
          {loadingFeedback && <Loading label="Reading your draft…" />}
          {feedback && (
            <View style={{ marginTop: 14 }}>
              {feedback.strengths?.length > 0 && (
                <GuideBlock icon="💪" label="Strengths">
                  {feedback.strengths.map((s, i) => (
                    <Body key={i} selectable style={{ ...body, marginTop: 2 }}>· {s}</Body>
                  ))}
                </GuideBlock>
              )}
              {feedback.issues?.length > 0 && (
                <GuideBlock icon="🔍" label="Issues to fix">
                  {feedback.issues.map((iss, i) => (
                    <View key={i} style={{ marginTop: 6, paddingLeft: 8, borderLeftWidth: 2, borderLeftColor: c.accent }}>
                      <Body selectable style={{ ...body, fontWeight: '600', color: c.text }}>{iss.where}</Body>
                      <Body selectable style={body}>{iss.problem}</Body>
                      <Body selectable style={{ ...body, color: c.accent }}>→ {iss.how_to_fix}</Body>
                    </View>
                  ))}
                </GuideBlock>
              )}
              {feedback.missing?.length > 0 && (
                <GuideBlock icon="🕳️" label="Not yet addressed">
                  {feedback.missing.map((m, i) => (
                    <Body key={i} selectable style={{ ...body, marginTop: 2 }}>· {m}</Body>
                  ))}
                </GuideBlock>
              )}
              {feedback.checklist?.length > 0 && (
                <GuideBlock icon="✅" label="Submission checklist">
                  {feedback.checklist.map((item, i) => (
                    <Body key={i} selectable style={{ ...body, marginTop: 2 }}>
                      {item.done ? '✓' : '✗'} {item.item}{item.note ? ` — ${item.note}` : ''}
                    </Body>
                  ))}
                </GuideBlock>
              )}
            </View>
          )}
        </Card>
      )}
    </View>
  );
}

function ChatBubble({ role, text, time, children }) {
  const c = useThemeColors();
  const isUser = role === 'user';
  return (
    <View style={{ alignItems: isUser ? 'flex-end' : 'flex-start', marginTop: 10 }}>
      <View style={{
        maxWidth: '85%', padding: 12, borderRadius: 18,
        borderBottomRightRadius: isUser ? 4 : 18,
        borderBottomLeftRadius: isUser ? 18 : 4,
        backgroundColor: isUser
          ? '#7C3AED'
          : (c.glass ? 'rgba(255,255,255,0.06)' : c.card),
        borderWidth: isUser ? 0 : 1,
        borderColor: c.glass ? 'rgba(167,139,250,0.2)' : c.border,
      }}>
        <Body selectable style={{ color: isUser ? '#fff' : c.text, fontSize: 14, lineHeight: 21 }}>{text}</Body>
        {children}
      </View>
      {time ? (
        <Text style={{ color: c.textMuted, fontSize: 10, marginTop: 3, marginHorizontal: 4 }}>
          {new Date(time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
        </Text>
      ) : null}
    </View>
  );
}

function TypingDots() {
  const c = useThemeColors();
  const [tick, setTick] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setTick((n) => (n + 1) % 3), 400);
    return () => clearInterval(id);
  }, []);
  return (
    <Text style={{ color: c.textMuted, fontSize: 18, letterSpacing: 2 }}>
      {'●○○ ○●○ ○○●'.split(' ')[tick]}
    </Text>
  );
}

function AskSection({ doc, docId, voiceId, setError, refresh, copiedKey, copyText }) {
  const c = useThemeColors();
  const t = useT();
  const player = usePlayer();
  const [question, setQuestion] = useState('');
  const [asking, setAsking] = useState(false);
  const [pendingQ, setPendingQ] = useState(null);
  const [transcribing, setTranscribing] = useState(false);
  const recorder = useAudioRecorder(RecordingPresets.HIGH_QUALITY);
  const recorderState = useAudioRecorderState(recorder);
  const chatEndRef = useRef(null);

  // Chat history: persisted questions in chronological order
  const messages = [...doc.questions].sort(
    (a, b) => new Date(a.created) - new Date(b.created)
  );

  const ask = async (text) => {
    const q = (text ?? question).trim();
    if (!q) return;
    setAsking(true);
    setPendingQ(q);
    setQuestion('');
    setError('');
    try {
      await postJson(`/documents/${docId}/ask`, { question: q, voice_id: voiceId });
      refresh();
    } catch (e) {
      setError(e.message);
      setQuestion(q); // give the text back so the user can retry
    } finally {
      setAsking(false);
      setPendingQ(null);
    }
  };

  const toggleRecording = async () => {
    setError('');
    try {
      if (recorderState.isRecording) {
        await recorder.stop();
        const uri = recorder.uri;
        if (!uri) return;
        setTranscribing(true);
        const form = new FormData();
        if (Platform.OS === 'web') {
          const blob = await (await fetch(uri)).blob();
          form.append('file', blob, 'recording.webm');
        } else {
          form.append('file', { uri, name: 'recording.m4a', type: 'audio/m4a' });
        }
        const { text } = await api('/transcribe', { method: 'POST', body: form });
        setQuestion((prev) => (prev ? `${prev} ${text}` : text));
      } else {
        const status = await AudioModule.requestRecordingPermissionsAsync();
        if (!status.granted) {
          setError('Microphone permission denied.');
          return;
        }
        await recorder.prepareToRecordAsync();
        recorder.record();
      }
    } catch (e) {
      setError(e.message);
    } finally {
      setTranscribing(false);
    }
  };

  const recording = recorderState.isRecording;

  return (
    <View>
      {/* Chat history */}
      {messages.length === 0 && !pendingQ && (
        <View style={{ alignItems: 'center', paddingVertical: 28 }}>
          <Text style={{ fontSize: 34, marginBottom: 8 }}>💬</Text>
          <Muted style={{ textAlign: 'center' }}>
            Ask anything about this document.{'\n'}Type below or tap the mic to speak.
          </Muted>
        </View>
      )}

      {messages.map((q) => (
        <View key={q.id}>
          <ChatBubble role="user" text={q.question} time={q.created} />
          <ChatBubble role="assistant" text={q.answer}>
            <Row style={{ gap: 16, marginTop: 8 }}>
              {q.audio_url ? (
                <TouchableOpacity onPress={() => player.playSaved('Answer', q, doc.filename)}>
                  <Row style={{ gap: 4 }}>
                    <Icon name="play" size={13} color={c.accent} />
                    <Text style={{ color: c.accent, fontSize: 12 }}>{t('play')}</Text>
                  </Row>
                </TouchableOpacity>
              ) : null}
              <TouchableOpacity onPress={() => copyText(q.id, q.answer)}>
                <Text style={{ color: c.accent, fontSize: 12 }}>{copiedKey === q.id ? t('copied') : t('copy')}</Text>
              </TouchableOpacity>
            </Row>
          </ChatBubble>
        </View>
      ))}

      {pendingQ && (
        <View>
          <ChatBubble role="user" text={pendingQ} />
          <View style={{ alignItems: 'flex-start', marginTop: 10 }}>
            <View style={{
              padding: 12, paddingHorizontal: 16, borderRadius: 18, borderBottomLeftRadius: 4,
              backgroundColor: c.glass ? 'rgba(255,255,255,0.06)' : c.card,
              borderWidth: 1, borderColor: c.glass ? 'rgba(167,139,250,0.2)' : c.border,
            }}>
              <TypingDots />
            </View>
          </View>
        </View>
      )}
      <View ref={chatEndRef} />

      {/* Input row */}
      <View style={{
        flexDirection: 'row', alignItems: 'flex-end', gap: 8, marginTop: 16,
        backgroundColor: c.glass ? 'rgba(255,255,255,0.05)' : c.card,
        borderRadius: 22, borderWidth: 1,
        borderColor: recording ? '#F87171' : (c.glass ? 'rgba(167,139,250,0.25)' : c.border),
        paddingHorizontal: 6, paddingVertical: 6,
      }}>
        <TextInput
          placeholder={recording ? '🔴 Listening…' : transcribing ? 'Transcribing…' : t('askPlaceholder')}
          placeholderTextColor={recording ? '#F87171' : c.textMuted}
          value={question}
          onChangeText={setQuestion}
          onSubmitEditing={() => ask()}
          editable={!asking && !recording && !transcribing}
          multiline
          style={{
            flex: 1, color: c.text, fontSize: 14, paddingHorizontal: 12, paddingVertical: 8,
            maxHeight: 100, outlineStyle: 'none',
          }}
        />
        {/* Mic button */}
        <TouchableOpacity
          onPress={toggleRecording}
          disabled={asking || transcribing}
          style={{
            width: 38, height: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center',
            backgroundColor: recording ? '#F87171' : 'rgba(124,58,237,0.25)',
            borderWidth: 1, borderColor: recording ? '#F87171' : 'rgba(167,139,250,0.4)',
          }}
        >
          <Icon name={recording ? 'stop' : 'mic'} size={18} color={recording ? '#fff' : c.accent} />
        </TouchableOpacity>
        {/* Send button */}
        <TouchableOpacity
          onPress={() => ask()}
          disabled={asking || !question.trim()}
          style={{
            width: 38, height: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center',
            backgroundColor: question.trim() && !asking ? '#7C3AED' : 'rgba(124,58,237,0.2)',
          }}
        >
          <Icon name="arrow-up" size={18} color="#fff" />
        </TouchableOpacity>
      </View>
    </View>
  );
}
