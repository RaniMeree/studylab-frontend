import { useEffect, useState } from 'react';
import { TouchableOpacity, View } from 'react-native';
import { api, postJson } from '../api';
import { useThemeColors } from '../theme';
import { Body, Button, Card, EmptyState, ErrorText, Icon, Input, Loading, Muted, Row, Title } from '../ui';

export function CourseScreen({ courseId, onBack, onOpenDocument, onAddMaterial }) {
  const c = useThemeColors();
  const [course, setCourse] = useState(null);
  const [error, setError] = useState('');
  const [question, setQuestion] = useState('');
  const [asking, setAsking] = useState(false);
  const [questions, setQuestions] = useState([]);

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

  if (!course) return <Loading label="Loading course…" />;

  return (
    <View style={{ padding: 18 }}>
      <TouchableOpacity onPress={onBack} hitSlop={8} style={{ marginBottom: 8 }}>
        <Row style={{ gap: 4 }}>
          <Icon name="chevron-back" size={16} color={c.accent} />
          <Muted style={{ color: c.accent }}>Home</Muted>
        </Row>
      </TouchableOpacity>
      <Title>{course.name}</Title>

      <Button
        label="Add material"
        icon="add"
        variant="secondary"
        small
        onPress={() => onAddMaterial(courseId)}
        style={{ alignSelf: 'flex-start', marginTop: 12 }}
      />

      <ErrorText>{error}</ErrorText>

      <View style={{ marginTop: 14 }}>
        {course.documents.map((d) => (
          <Card key={d.id} onPress={() => onOpenDocument(d.id)} style={{ marginBottom: 8 }}>
            <Row style={{ gap: 12 }}>
              <Icon name="document-text-outline" size={20} color={c.accent} />
              <View style={{ flex: 1, minWidth: 0 }}>
                <Body numberOfLines={1} style={{ fontWeight: '600' }}>{d.filename}</Body>
                <Muted style={{ marginTop: 2 }}>
                  {d.chapter_count} chapter{d.chapter_count !== 1 ? 's' : ''} · {d.language.toUpperCase()}
                </Muted>
              </View>
              <TouchableOpacity onPress={() => deleteDocument(d.id)} hitSlop={10}>
                <Icon name="trash-outline" size={17} color={c.textMuted} />
              </TouchableOpacity>
              <Icon name="chevron-forward" size={16} color={c.textMuted} />
            </Row>
          </Card>
        ))}
        {course.documents.length === 0 && (
          <EmptyState
            icon="cloud-upload-outline"
            title="No material yet"
            body="Add a PDF, photo, or web link to start listening and studying."
          />
        )}
      </View>

      {course.documents.length > 0 && (
        <View style={{ marginTop: 20 }}>
          <Muted style={{ fontSize: 13, marginBottom: 8 }}>Ask across the whole course</Muted>
          <Row style={{ gap: 8 }}>
            <Input
              placeholder="Ask about any file in this course…"
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
        </View>
      )}
    </View>
  );
}
