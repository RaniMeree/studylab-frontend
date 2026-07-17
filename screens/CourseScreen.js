import { useEffect, useState } from 'react';
import { Text, TouchableOpacity, View } from 'react-native';
import { api, postJson } from '../api';
import { useThemeColors } from '../theme';
import { Body, Button, Card, EmptyState, ErrorText, GlowBox, Icon, Input, Loading, Muted, NeonBar, Row, SkeletonRows, Title, TypeBadge } from '../ui';
import { COURSE_COLORS } from './HomeScreen';

function guessType(filename) {
  if (!filename) return 'text';
  const ext = filename.split('.').pop().toLowerCase();
  if (['pdf'].includes(ext)) return 'pdf';
  if (['jpg', 'jpeg', 'png', 'gif', 'webp', 'heic'].includes(ext)) return 'image';
  if (filename.startsWith('http') || ext === 'html') return 'url';
  return 'text';
}

export function CourseScreen({ courseId, onBack, onOpenDocument, onAddMaterial }) {
  const c = useThemeColors();
  const [course, setCourse] = useState(null);
  const [error, setError] = useState('');
  const [question, setQuestion] = useState('');
  const [asking, setAsking] = useState(false);
  const [questions, setQuestions] = useState([]);
  const [pickingColor, setPickingColor] = useState(false);

  const refresh = () => {
    api(`/courses/${courseId}`).then(setCourse).catch((e) => setError(e.message));
    api(`/courses/${courseId}/questions`).then(setQuestions).catch(() => {});
  };
  useEffect(() => { refresh(); }, [courseId]);

  const ask = async () => {
    if (!question.trim()) return;
    setAsking(true);
    setError('');
    try {
      await postJson(`/courses/${courseId}/ask`, { question, speak: false });
      setQuestion('');
      api(`/courses/${courseId}/questions`).then(setQuestions).catch(() => {});
    } catch (e) {
      setError(e.message);
    } finally {
      setAsking(false);
    }
  };

  const deleteDocument = async (id) => {
    try {
      await api(`/documents/${id}`, { method: 'DELETE' });
      refresh();
    } catch (e) {
      setError(e.message);
    }
  };

  if (!course) {
    return (
      <View style={{ padding: 16 }}>
        <SkeletonRows count={1} height={80} />
        <SkeletonRows count={4} height={60} />
      </View>
    );
  }

  const color = course.color || COURSE_COLORS[0];

  const setColor = async (col) => {
    setCourse({ ...course, color: col });
    setPickingColor(false);
    try { await api(`/courses/${courseId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ color: col }),
    }); } catch (e) { setError(e.message); }
  };

  return (
    <View style={{ padding: 18 }}>
      {/* Breadcrumb back */}
      <TouchableOpacity onPress={onBack} hitSlop={8} style={{ marginBottom: 12 }}>
        <Row style={{ gap: 4 }}>
          <Icon name="chevron-back" size={15} color={c.accent} />
          <Text style={{ color: c.accent, fontSize: 13, fontWeight: '600' }}>Home</Text>
        </Row>
      </TouchableOpacity>

      {/* Course header — tinted with the course color */}
      <View style={{
        backgroundColor: `${color}26`,
        borderRadius: 18, padding: 16,
        borderWidth: 1, borderColor: `${color}55`,
        borderLeftWidth: 5, borderLeftColor: color,
      }}>
        <Row style={{ gap: 12, alignItems: 'center' }}>
          <GlowBox emoji="📁" color={color} size={44} />
          <View style={{ flex: 1, minWidth: 0 }}>
            <Title numberOfLines={1} style={{ fontSize: 21 }}>{course.name}</Title>
            <Text style={{ color: c.textMuted, fontSize: 12, marginTop: 2 }}>
              {course.documents.length} material{course.documents.length !== 1 ? 's' : ''}
            </Text>
          </View>
          {/* Color swatch — tap to change course color */}
          <TouchableOpacity
            onPress={() => setPickingColor((v) => !v)}
            hitSlop={8}
            style={{
              width: 26, height: 26, borderRadius: 13, backgroundColor: color,
              borderWidth: 2, borderColor: 'rgba(255,255,255,0.7)',
              shadowColor: color, shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.8, shadowRadius: 8,
            }}
          />
        </Row>
        {pickingColor && (
          <Row style={{ gap: 10, marginTop: 14, flexWrap: 'wrap' }}>
            {COURSE_COLORS.map((col) => (
              <TouchableOpacity
                key={col}
                onPress={() => setColor(col)}
                hitSlop={6}
                style={{
                  width: 28, height: 28, borderRadius: 14, backgroundColor: col,
                  borderWidth: 2, borderColor: col === color ? '#fff' : 'transparent',
                }}
              />
            ))}
          </Row>
        )}
      </View>

      <NeonBar style={{ marginTop: 14, marginBottom: 14 }} />

      <Row style={{ justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
        <Text style={{ fontSize: 10, color: c.textMuted, letterSpacing: 1.2, textTransform: 'uppercase', fontWeight: '700' }}>
          Materials
        </Text>
        <TouchableOpacity
          onPress={() => onAddMaterial(courseId)}
          style={{
            flexDirection: 'row', alignItems: 'center', gap: 5,
            backgroundColor: c.glass ? 'rgba(124,58,237,0.25)' : c.accentSoft,
            borderRadius: 20, paddingHorizontal: 12, paddingVertical: 6,
            borderWidth: 1, borderColor: c.glass ? 'rgba(167,139,250,0.35)' : c.border,
          }}
        >
          <Icon name="add" size={14} color={c.accent} />
          <Text style={{ color: c.accent, fontSize: 12, fontWeight: '700' }}>Add material</Text>
        </TouchableOpacity>
      </Row>

      <ErrorText>{error}</ErrorText>

      {course.documents.map((d) => {
        const type = guessType(d.filename);
        return (
          <TouchableOpacity
            key={d.id}
            onPress={() => onOpenDocument(d.id)}
            activeOpacity={0.75}
            style={{
              backgroundColor: c.glass ? 'rgba(255,255,255,0.04)' : c.card,
              borderRadius: 16, marginBottom: 10,
              borderWidth: 1, borderColor: c.glass ? 'rgba(167,139,250,0.2)' : c.border,
            }}
          >
            <View style={{ padding: 14 }}>
              {/* Material header */}
              <Row style={{ gap: 10, marginBottom: d.chapter_count > 0 ? 10 : 0 }}>
                <TypeBadge type={type} />
                <Text numberOfLines={1} style={{ flex: 1, color: c.text, fontSize: 13, fontWeight: '600' }}>
                  {d.filename}
                </Text>
                <TouchableOpacity onPress={() => deleteDocument(d.id)} hitSlop={10}>
                  <Icon name="trash-outline" size={15} color={c.textMuted} />
                </TouchableOpacity>
                <Icon name="chevron-forward" size={14} color={c.textMuted} />
              </Row>

              {/* Chapter chips */}
              {d.chapter_count > 0 && (
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
                  {Array.from({ length: Math.min(d.chapter_count, 6) }).map((_, i) => (
                    <View key={i} style={{
                      paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20,
                      backgroundColor: c.glass ? 'rgba(167,139,250,0.1)' : c.cardAlt,
                      borderWidth: 1, borderColor: c.glass ? 'rgba(167,139,250,0.22)' : c.border,
                    }}>
                      <Text style={{ fontSize: 10, color: c.accent, fontWeight: '500' }}>
                        §{i + 1}
                      </Text>
                    </View>
                  ))}
                  {d.chapter_count > 6 && (
                    <View style={{
                      paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20,
                      backgroundColor: 'transparent',
                    }}>
                      <Text style={{ fontSize: 10, color: c.textMuted }}>+{d.chapter_count - 6} more</Text>
                    </View>
                  )}
                </View>
              )}
            </View>
          </TouchableOpacity>
        );
      })}

      {course.documents.length === 0 && (
        <EmptyState
          icon="cloud-upload-outline"
          title="No material yet"
          body="Add a PDF, photo, or web link to start listening and studying."
        />
      )}

      {/* Ask across course */}
      {course.documents.length > 0 && (
        <>
          <NeonBar style={{ marginTop: 16, marginBottom: 14 }} />
          <Text style={{ fontSize: 10, color: c.textMuted, letterSpacing: 1.2, textTransform: 'uppercase', fontWeight: '700', marginBottom: 10 }}>
            Ask across all materials
          </Text>
          <Row style={{ gap: 8 }}>
            <Input
              placeholder="Ask anything about this course…"
              value={question}
              onChangeText={setQuestion}
              onSubmitEditing={ask}
              style={{ flex: 1 }}
            />
            <Button label={asking ? '…' : 'Ask'} small onPress={ask} disabled={asking || !question.trim()} />
          </Row>
          {asking && <Loading label="Thinking…" />}
          {questions.map((q) => (
            <Card key={q.id} style={{ marginTop: 8 }}>
              <Body style={{ fontWeight: '600', color: c.accent }}>Q: {q.question}</Body>
              <Body selectable style={{ marginTop: 6, color: c.textSecondary }}>{q.answer}</Body>
            </Card>
          ))}
        </>
      )}
    </View>
  );
}
