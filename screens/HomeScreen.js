import { useEffect, useState } from 'react';
import { Text, TouchableOpacity, View } from 'react-native';
import { api, postJson } from '../api';
import { useT } from '../i18n';
import { usePlayer } from '../player';
import { useThemeColors } from '../theme';
import { Body, Card, EmptyState, ErrorText, Icon, Input, Muted, ProgressBar, Row, Title } from '../ui';

const COURSE_ICONS = ['flask', 'language', 'book', 'calculator', 'globe', 'musical-notes'];

function StatBox({ value, label }) {
  const c = useThemeColors();
  return (
    <View
      style={{
        flex: 1, backgroundColor: c.cardAlt, borderRadius: 12,
        paddingVertical: 12, alignItems: 'center',
      }}
    >
      <Text style={{ color: c.text, fontSize: 18, fontWeight: '600' }}>{value}</Text>
      <Muted style={{ fontSize: 11, marginTop: 2 }}>{label}</Muted>
    </View>
  );
}

export function HomeScreen({ email, onOpenCourse, onOpenDocument }) {
  const c = useThemeColors();
  const t = useT();
  const player = usePlayer();
  const [courses, setCourses] = useState(null);
  const [stats, setStats] = useState(null);
  const [resume, setResume] = useState(null);
  const [newName, setNewName] = useState('');
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState('');

  const refresh = () => {
    api('/courses').then(setCourses).catch((e) => setError(e.message));
    api('/stats').then(setStats).catch(() => {});
    api('/continue').then(setResume).catch(() => {});
  };
  useEffect(() => { refresh(); }, []);

  const createCourse = async () => {
    if (!newName.trim()) return;
    setCreating(true);
    setError('');
    try {
      const course = await postJson('/courses', { name: newName });
      setNewName('');
      refresh();
      onOpenCourse(course.id);
    } catch (e) {
      setError(e.message);
    } finally {
      setCreating(false);
    }
  };

  const deleteCourse = async (id) => {
    try {
      await api(`/courses/${id}`, { method: 'DELETE' });
      refresh();
    } catch (e) {
      setError(e.message);
    }
  };

  const hour = new Date().getHours();
  const greeting = t(hour < 12 ? 'goodMorning' : hour < 18 ? 'goodAfternoon' : 'goodEvening');
  const name = email?.split('@')[0] ?? '';

  return (
    <View style={{ padding: 18 }}>
      <Title>{greeting}{name ? `, ${name}` : ''}</Title>

      {stats && (stats.minutes_listened > 0 || stats.cards_reviewed > 0 || stats.quizzes_taken > 0) && (
        <Row style={{ gap: 8, marginTop: 14 }}>
          <StatBox value={`🔥 ${stats.streak_days}`} label={t('dayStreak')} />
          <StatBox value={stats.minutes_listened} label={t('minListened')} />
          <StatBox value={stats.cards_known} label={t('cardsKnown')} />
          <StatBox value={stats.quizzes_taken} label={t('quizzes')} />
        </Row>
      )}

      {resume && (
        <>
          <Muted style={{ marginTop: 18, marginBottom: 8, fontSize: 13 }}>{t('continueListening')}</Muted>
          <Card tint={c.accentSoft} onPress={() => onOpenDocument(resume.course_id, resume.document_id)}>
            <Row style={{ gap: 12 }}>
              <View
                style={{
                  width: 40, height: 40, borderRadius: 20, backgroundColor: c.accent,
                  alignItems: 'center', justifyContent: 'center',
                }}
              >
                <Icon name="play" size={18} color={c.onAccent} />
              </View>
              <View style={{ flex: 1, minWidth: 0 }}>
                <Text numberOfLines={1} style={{ color: c.accent, fontSize: 14, fontWeight: '600' }}>
                  {resume.document_title} · {resume.chapter_title}
                </Text>
                <View style={{ marginTop: 8 }}>
                  <ProgressBar percent={resume.percent} />
                </View>
              </View>
            </Row>
          </Card>
        </>
      )}

      <Muted style={{ marginTop: 18, marginBottom: 8, fontSize: 13 }}>{t('yourCourses')}</Muted>

      <Row style={{ gap: 8, marginBottom: 12 }}>
        <Input
          placeholder={t('newCourse')}
          value={newName}
          onChangeText={setNewName}
          onSubmitEditing={createCourse}
          style={{ flex: 1 }}
        />
        <TouchableOpacity
          onPress={createCourse}
          disabled={creating || !newName.trim()}
          style={{
            width: 44, borderRadius: 12, backgroundColor: c.accent,
            alignItems: 'center', justifyContent: 'center',
            opacity: creating || !newName.trim() ? 0.5 : 1,
          }}
        >
          <Icon name="add" size={22} color={c.onAccent} />
        </TouchableOpacity>
      </Row>

      <ErrorText>{error}</ErrorText>

      {courses === null && <Muted>Loading…</Muted>}
      {courses?.map((course, i) => (
        <Card key={course.id} onPress={() => onOpenCourse(course.id)} style={{ marginBottom: 8 }}>
          <Row style={{ gap: 12 }}>
            <Icon name={COURSE_ICONS[i % COURSE_ICONS.length]} size={20} color={c.accent} />
            <View style={{ flex: 1 }}>
              <Body style={{ fontWeight: '600' }}>{course.name}</Body>
              <Muted style={{ marginTop: 2 }}>
                {course.document_count} file{course.document_count !== 1 ? 's' : ''}
              </Muted>
            </View>
            <TouchableOpacity onPress={() => deleteCourse(course.id)} hitSlop={10}>
              <Icon name="trash-outline" size={17} color={c.textMuted} />
            </TouchableOpacity>
            <Icon name="chevron-forward" size={16} color={c.textMuted} />
          </Row>
        </Card>
      ))}
      {courses?.length === 0 && (
        <EmptyState
          icon="folder-open-outline"
          title="Start your first course"
          body="Create a course above, then add PDFs, photos, or links to start listening."
        />
      )}
    </View>
  );
}
