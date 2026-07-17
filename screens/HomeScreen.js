import { useEffect, useState } from 'react';
import { Text, TouchableOpacity, View } from 'react-native';
import { api, postJson } from '../api';
import { useT } from '../i18n';
import { usePlayer } from '../player';
import { useThemeColors } from '../theme';
import { Body, Card, EmptyState, ErrorText, GlowBox, Icon, Input, Muted, NeonBar, ProgressBar, Row, SkeletonRows, Title, useToast } from '../ui';

export const COURSE_COLORS = [
  '#7C3AED', '#0EA5E9', '#EC4899', '#10B981',
  '#F59E0B', '#EF4444', '#14B8A6', '#8B5CF6',
];

export function HomeScreen({ email, onOpenCourse, onOpenDocument }) {
  const c = useThemeColors();
  const t = useT();
  const player = usePlayer();
  const toast = useToast();
  const [courses, setCourses] = useState(null);
  const [stats, setStats] = useState(null);
  const [resume, setResume] = useState(null);
  const [newName, setNewName] = useState('');
  const [newColor, setNewColor] = useState(COURSE_COLORS[0]);
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
      const course = await postJson('/courses', { name: newName, color: newColor });
      setNewName('');
      toast('Course created');
      refresh();
      onOpenCourse(course.id);
    } catch (e) {
      setError(e.message);
    } finally {
      setCreating(false);
    }
  };

  const [demoBusy, setDemoBusy] = useState(false);
  const tryDemo = async () => {
    setDemoBusy(true);
    setError('');
    try {
      const doc = await postJson('/demo', {});
      refresh();
      onOpenDocument(doc.course_id, doc.id);
    } catch (e) {
      setError(e.message);
    } finally {
      setDemoBusy(false);
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
      {/* Header */}
      <Row style={{ justifyContent: 'space-between', marginBottom: 4 }}>
        <View>
          <Text style={{ fontSize: 11, color: c.textMuted, letterSpacing: 1.5, textTransform: 'uppercase', fontWeight: '700' }}>
            Study<Text style={{ color: c.accent }}>Lab</Text>
          </Text>
          <Title style={{ fontSize: 20, marginTop: 2 }}>{greeting}{name ? `, ${name}` : ''}</Title>
        </View>
        {stats && (
          <View style={{
            backgroundColor: c.glass ? 'rgba(167,139,250,0.12)' : c.cardAlt,
            borderRadius: 20, paddingHorizontal: 12, paddingVertical: 6,
            borderWidth: 1, borderColor: c.glass ? 'rgba(167,139,250,0.25)' : c.border,
          }}>
            <Text style={{ color: c.accent, fontSize: 12, fontWeight: '700' }}>✦ {stats.minutes_listened ?? 0} min</Text>
          </View>
        )}
      </Row>

      {/* Stats row */}
      {stats && (stats.streak_days > 0 || stats.cards_known > 0) && (
        <>
          <NeonBar style={{ marginTop: 12, marginBottom: 12 }} />
          <Row style={{ gap: 8 }}>
            {[
              { v: `🔥 ${stats.streak_days}`, l: t('dayStreak') },
              { v: stats.minutes_listened, l: t('minListened') },
              { v: stats.cards_known, l: t('cardsKnown') },
              { v: stats.quizzes_taken, l: t('quizzes') },
            ].map((s, i) => (
              <View key={i} style={{
                flex: 1, backgroundColor: c.glass ? 'rgba(255,255,255,0.04)' : c.cardAlt,
                borderRadius: 12, paddingVertical: 10, alignItems: 'center',
                borderWidth: 1, borderColor: c.glass ? 'rgba(167,139,250,0.15)' : c.border,
              }}>
                <Text style={{ color: c.text, fontSize: 15, fontWeight: '700' }}>{s.v}</Text>
                <Text style={{ color: c.textMuted, fontSize: 10, marginTop: 2 }}>{s.l}</Text>
              </View>
            ))}
          </Row>
        </>
      )}

      {/* Continue listening */}
      {resume && (
        <>
          <NeonBar style={{ marginTop: 16, marginBottom: 12 }} />
          <Text style={{ fontSize: 10, color: c.textMuted, letterSpacing: 1.2, textTransform: 'uppercase', fontWeight: '700', marginBottom: 8 }}>
            {t('continueListening')}
          </Text>
          <TouchableOpacity
            onPress={() => onOpenDocument(resume.course_id, resume.document_id)}
            activeOpacity={0.75}
            style={{
              backgroundColor: c.glass ? 'rgba(124,58,237,0.12)' : c.accentSoft,
              borderRadius: 16, padding: 14,
              borderWidth: 1, borderColor: c.glass ? 'rgba(167,139,250,0.3)' : c.border,
            }}
          >
            <Row style={{ gap: 12 }}>
              <View style={{
                width: 40, height: 40, borderRadius: 20,
                backgroundColor: c.glass ? 'rgba(124,58,237,0.35)' : c.accent,
                alignItems: 'center', justifyContent: 'center',
                shadowColor: '#7C3AED', shadowOffset: { width: 0, height: 0 },
                shadowOpacity: 0.9, shadowRadius: 10,
              }}>
                <Icon name="play" size={18} color="#fff" />
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
          </TouchableOpacity>
        </>
      )}

      {/* Courses */}
      <NeonBar style={{ marginTop: 16, marginBottom: 12 }} />
      <Row style={{ justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
        <Text style={{ fontSize: 10, color: c.textMuted, letterSpacing: 1.2, textTransform: 'uppercase', fontWeight: '700' }}>
          {t('yourCourses')}
        </Text>
      </Row>

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
            width: 44, height: 44, borderRadius: 12,
            backgroundColor: c.glass ? 'rgba(124,58,237,0.4)' : c.accent,
            alignItems: 'center', justifyContent: 'center',
            opacity: creating || !newName.trim() ? 0.4 : 1,
            borderWidth: 1, borderColor: c.glass ? 'rgba(167,139,250,0.4)' : 'transparent',
            shadowColor: '#7C3AED', shadowOffset: { width: 0, height: 0 },
            shadowOpacity: creating || !newName.trim() ? 0 : 0.7, shadowRadius: 8,
          }}
        >
          <Icon name="add" size={22} color="#fff" />
        </TouchableOpacity>
      </Row>

      {/* Color picker for the new course — only shown while typing a name */}
      {newName.trim().length > 0 && (
        <Row style={{ gap: 10, marginBottom: 12, alignItems: 'center' }}>
          {COURSE_COLORS.map((col) => (
            <TouchableOpacity
              key={col}
              onPress={() => setNewColor(col)}
              hitSlop={6}
              style={{
                width: 26, height: 26, borderRadius: 13, backgroundColor: col,
                borderWidth: 2, borderColor: newColor === col ? '#fff' : 'transparent',
                shadowColor: col, shadowOffset: { width: 0, height: 0 },
                shadowOpacity: newColor === col ? 0.9 : 0, shadowRadius: 8,
              }}
            />
          ))}
        </Row>
      )}

      <ErrorText>{error}</ErrorText>

      {courses === null && <SkeletonRows count={4} height={70} />}
      {courses?.map((course) => {
        const color = course.color || COURSE_COLORS[0];
        return (
          <TouchableOpacity
            key={course.id}
            onPress={() => onOpenCourse(course.id)}
            activeOpacity={0.75}
            style={{
              backgroundColor: c.glass ? 'rgba(255,255,255,0.03)' : c.card,
              borderRadius: 16, marginBottom: 10,
              borderWidth: 1, borderColor: c.glass ? 'rgba(167,139,250,0.2)' : c.border,
              borderLeftWidth: 4, borderLeftColor: color,
              overflow: 'hidden',
            }}
          >
            <View style={{ padding: 14 }}>
              <Row style={{ gap: 12 }}>
                <GlowBox emoji="📁" color={color} size={40} />
                <View style={{ flex: 1 }}>
                  <Text style={{ color: c.text, fontSize: 14, fontWeight: '700' }}>{course.name}</Text>
                  <Text style={{ color: c.textMuted, fontSize: 11, marginTop: 2 }}>
                    {course.document_count} material{course.document_count !== 1 ? 's' : ''}
                  </Text>
                </View>
                <TouchableOpacity onPress={() => deleteCourse(course.id)} hitSlop={10}>
                  <Icon name="trash-outline" size={16} color={c.textMuted} />
                </TouchableOpacity>
                <Icon name="chevron-forward" size={15} color={c.textMuted} />
              </Row>
            </View>
          </TouchableOpacity>
        );
      })}

      {courses?.length === 0 && (
        <>
          <EmptyState
            icon="folder-open-outline"
            title="Start your first course"
            body="Create a course above, then add PDFs, photos, or links to start listening."
          />
          <TouchableOpacity
            onPress={tryDemo}
            disabled={demoBusy}
            style={{
              alignSelf: 'center', marginTop: 4, paddingVertical: 12, paddingHorizontal: 22,
              borderRadius: 14, backgroundColor: 'rgba(124,58,237,0.3)',
              borderWidth: 1, borderColor: 'rgba(167,139,250,0.5)',
              opacity: demoBusy ? 0.6 : 1,
            }}
          >
            <Text style={{ color: '#fff', fontSize: 14, fontWeight: '700' }}>
              {demoBusy ? 'Setting up…' : '✨ Try a sample document'}
            </Text>
          </TouchableOpacity>
        </>
      )}
    </View>
  );
}
