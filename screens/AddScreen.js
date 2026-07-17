import { useEffect, useState } from 'react';
import { Platform, Text, TouchableOpacity, View } from 'react-native';
import * as DocumentPicker from 'expo-document-picker';
import { api, postJson } from '../api';
import { useT } from '../i18n';
import { useThemeColors } from '../theme';
import { Body, Button, Card, ErrorText, Icon, Input, Label, Loading, Muted, NeonBar, Pill, Row, Title } from '../ui';

const DOC_TYPES = [
  { key: 'standard', emoji: '📄', label: 'Standard', color: '#7C3AED', hint: 'Book chapters, notes, articles — split automatically' },
  { key: 'paper', emoji: '🔬', label: 'Paper', color: '#0EA5E9', hint: 'Research paper — detects sections, extracts citation, paper digest' },
  { key: 'slides', emoji: '📊', label: 'Slides', color: '#F59E0B', hint: 'Presentation — one section per slide, expand bullets into a spoken lecture' },
  { key: 'lecture', emoji: '🎬', label: 'Lecture', color: '#EC4899', hint: 'Recording or transcript — topic outline that skips the chit-chat' },
  { key: 'exam', emoji: '📜', label: 'Exam', color: '#10B981', hint: 'Past paper — split by question, generate practice cards with model answers' },
  { key: 'assignment', emoji: '📝', label: 'Assignment', color: '#F43F5E', hint: 'Assignment brief — decode what is asked, get a plan, and feedback on your draft' },
];

export function AddScreen({ preselectedCourseId, voicesByLanguage, onImported }) {
  const c = useThemeColors();
  const t = useT();
  const [courses, setCourses] = useState([]);
  const [courseId, setCourseId] = useState(preselectedCourseId ?? null);
  const [language, setLanguage] = useState('en');
  const [url, setUrl] = useState('');
  const [docType, setDocType] = useState('standard');
  const [pasteOpen, setPasteOpen] = useState(false);
  const [pasteTitle, setPasteTitle] = useState('');
  const [pasteText, setPasteText] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    api('/courses')
      .then((list) => {
        setCourses(list);
        setCourseId((cur) => cur ?? list[0]?.id ?? null);
      })
      .catch((e) => setError(e.message));
  }, []);

  useEffect(() => {
    if (preselectedCourseId) setCourseId(preselectedCourseId);
  }, [preselectedCourseId]);

  const uploadAsset = async (picked, fallbackName, mimeType) => {
    setBusy(true);
    setError('');
    try {
      const formData = new FormData();
      if (Platform.OS === 'web' && picked.file) {
        formData.append('file', picked.file, picked.name ?? fallbackName);
        formData.append('language', language);
        formData.append('doc_type', docType);
        const doc = await api(`/courses/${courseId}/documents`, { method: 'POST', body: formData });
        onImported(courseId, doc.id);
      } else {
        // React Native 0.79+ new fetch doesn't support {uri,name,type} FormData parts.
        // Use XMLHttpRequest which still handles the native file URI correctly.
        const uri = picked.uri;
        const name = picked.name ?? picked.fileName ?? fallbackName;
        const type = picked.mimeType ?? picked.type ?? mimeType ?? 'application/octet-stream';
        const { supabase } = await import('../supabaseClient');
        const { API_BASE } = await import('../api');
        const { data } = await supabase.auth.getSession();
        const token = data.session?.access_token;
        const doc = await new Promise((resolve, reject) => {
          const fd = new FormData();
          fd.append('file', { uri, name, type });
          fd.append('language', language);
          fd.append('doc_type', docType);
          const xhr = new XMLHttpRequest();
          xhr.open('POST', `${API_BASE}/courses/${courseId}/documents`);
          if (token) xhr.setRequestHeader('Authorization', `Bearer ${token}`);
          xhr.onload = () => {
            if (xhr.status >= 200 && xhr.status < 300) {
              resolve(JSON.parse(xhr.responseText));
            } else {
              try { reject(new Error(JSON.parse(xhr.responseText).detail || 'Upload failed')); }
              catch { reject(new Error('Upload failed')); }
            }
          };
          xhr.onerror = () => reject(new Error('Network error'));
          xhr.send(fd);
        });
        onImported(courseId, doc.id);
      }
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  };

  const addFile = async () => {
    const result = await DocumentPicker.getDocumentAsync({ copyToCacheDirectory: true });
    if (result.canceled || !result.assets?.length) return;
    await uploadAsset(result.assets[0], 'document.pdf', 'application/octet-stream');
  };

  const addPhoto = async () => {
    const ImagePicker = await import('expo-image-picker');
    if (Platform.OS !== 'web') {
      const perm = await ImagePicker.requestCameraPermissionsAsync();
      if (!perm.granted) {
        setError('Camera permission is needed to scan a page.');
        return;
      }
    }
    const result =
      Platform.OS === 'web'
        ? await ImagePicker.launchImageLibraryAsync({ quality: 0.9 })
        : await ImagePicker.launchCameraAsync({ quality: 0.9 });
    if (result.canceled || !result.assets?.length) return;
    await uploadAsset(result.assets[0], 'page.jpg', 'image/jpeg');
  };

  const importUrl = async () => {
    if (!url.trim()) return;
    setBusy(true);
    setError('');
    try {
      const doc = await postJson(`/courses/${courseId}/import-url`, {
        url: url.trim(),
        language,
        doc_type: docType,
      });
      setUrl('');
      onImported(courseId, doc.id);
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  };

  const importText = async () => {
    if (pasteText.trim().length < 40) return;
    setBusy(true);
    setError('');
    try {
      const doc = await postJson(`/courses/${courseId}/import-text`, {
        text: pasteText,
        title: pasteTitle,
        language,
        doc_type: docType,
      });
      setPasteText('');
      setPasteTitle('');
      setPasteOpen(false);
      onImported(courseId, doc.id);
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  };

  const disabled = busy || !courseId;

  const UploadButton = ({ emoji, title, subtitle, onPress, glowColor = '#7C3AED' }) => (
    <TouchableOpacity
      onPress={disabled ? undefined : onPress}
      activeOpacity={0.75}
      style={{
        marginTop: 10, padding: 16, borderRadius: 16, flexDirection: 'row', alignItems: 'center', gap: 14,
        backgroundColor: c.glass ? 'rgba(255,255,255,0.04)' : c.card,
        borderWidth: 1, borderColor: c.glass ? 'rgba(167,139,250,0.2)' : c.border,
        opacity: disabled ? 0.4 : 1,
      }}
    >
      <View style={{
        width: 44, height: 44, borderRadius: 14,
        backgroundColor: `${glowColor}22`,
        alignItems: 'center', justifyContent: 'center',
        borderWidth: 1, borderColor: `${glowColor}44`,
        shadowColor: glowColor, shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.7, shadowRadius: 10,
      }}>
        <Text style={{ fontSize: 20 }}>{emoji}</Text>
      </View>
      <View style={{ flex: 1 }}>
        <Text style={{ color: c.text, fontWeight: '700', fontSize: 14 }}>{title}</Text>
        <Text style={{ color: c.textMuted, fontSize: 12, marginTop: 2 }}>{subtitle}</Text>
      </View>
      <Icon name="chevron-forward" size={15} color={c.textMuted} />
    </TouchableOpacity>
  );

  return (
    <View style={{ padding: 18 }}>
      <Text style={{ fontSize: 10, color: c.textMuted, letterSpacing: 1.5, textTransform: 'uppercase', fontWeight: '700', marginBottom: 6 }}>
        Import
      </Text>
      <Title>{t('addMaterial')}</Title>
      <NeonBar style={{ marginTop: 14, marginBottom: 14 }} />

      <Text style={{ fontSize: 10, color: c.textMuted, letterSpacing: 1, textTransform: 'uppercase', fontWeight: '700', marginBottom: 8 }}>{t('course')}</Text>
      <Row style={{ flexWrap: 'wrap', gap: 6 }}>
        {courses.map((co) => (
          <Pill key={co.id} label={co.name} active={courseId === co.id} onPress={() => setCourseId(co.id)} />
        ))}
        {courses.length === 0 && <Muted>Create a course on the Home tab first.</Muted>}
      </Row>

      <Text style={{ fontSize: 10, color: c.textMuted, letterSpacing: 1, textTransform: 'uppercase', fontWeight: '700', marginTop: 14, marginBottom: 8 }}>{t('language')}</Text>
      <Row style={{ flexWrap: 'wrap', gap: 6 }}>
        {Object.keys(voicesByLanguage).map((lang) => (
          <Pill key={lang} label={lang.toUpperCase()} active={language === lang} onPress={() => setLanguage(lang)} />
        ))}
      </Row>

      {/* Content type picker */}
      <Text style={{ fontSize: 10, color: c.textMuted, letterSpacing: 1, textTransform: 'uppercase', fontWeight: '700', marginTop: 14, marginBottom: 8 }}>
        What is it?
      </Text>
      <Row style={{ flexWrap: 'wrap', gap: 6 }}>
        {DOC_TYPES.map((dt) => {
          const active = docType === dt.key;
          return (
            <TouchableOpacity
              key={dt.key}
              onPress={() => setDocType(dt.key)}
              style={{
                paddingHorizontal: 12, paddingVertical: 8, borderRadius: 14,
                backgroundColor: active ? `${dt.color}26` : (c.glass ? 'rgba(255,255,255,0.03)' : c.card),
                borderWidth: 1, borderColor: active ? dt.color : (c.glass ? 'rgba(167,139,250,0.18)' : c.border),
              }}
            >
              <Text style={{ color: active ? c.text : c.textMuted, fontSize: 12, fontWeight: '700' }}>
                {dt.emoji} {dt.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </Row>
      <Text style={{ color: c.textMuted, fontSize: 11, marginTop: 6 }}>
        {DOC_TYPES.find((dt) => dt.key === docType)?.hint}
      </Text>

      <ErrorText>{error}</ErrorText>
      {busy && <Loading label="Importing…" />}

      <UploadButton emoji="📄" title={t('uploadFile')} subtitle="PDF, EPUB, Word, PowerPoint, or text" onPress={addFile} glowColor="#EF4444" />
      <UploadButton emoji="📷" title={t('scanPage')} subtitle="Photograph a book or handout page" onPress={addPhoto} glowColor="#22C55E" />

      <View style={{
        marginTop: 10, padding: 16, borderRadius: 16,
        backgroundColor: c.glass ? 'rgba(255,255,255,0.04)' : c.card,
        borderWidth: 1, borderColor: c.glass ? 'rgba(167,139,250,0.2)' : c.border,
      }}>
        <Row style={{ gap: 12, marginBottom: 12 }}>
          <View style={{
            width: 44, height: 44, borderRadius: 14,
            backgroundColor: 'rgba(59,130,246,0.2)', alignItems: 'center', justifyContent: 'center',
            borderWidth: 1, borderColor: 'rgba(59,130,246,0.35)',
            shadowColor: '#3B82F6', shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.7, shadowRadius: 10,
          }}>
            <Text style={{ fontSize: 20 }}>🔗</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={{ color: c.text, fontWeight: '700', fontSize: 14 }}>{t('importWeb')}</Text>
            <Text style={{ color: c.textMuted, fontSize: 12, marginTop: 2 }}>Article or YouTube video link</Text>
          </View>
        </Row>
        <Row style={{ gap: 8 }}>
          <Input placeholder="https://…" autoCapitalize="none" value={url} onChangeText={setUrl} onSubmitEditing={importUrl} style={{ flex: 1 }} />
          <Button label={t('importBtn')} small onPress={importUrl} disabled={disabled || !url.trim()} />
        </Row>
      </View>

      {/* Paste free text */}
      <View style={{
        marginTop: 10, padding: 16, borderRadius: 16,
        backgroundColor: c.glass ? 'rgba(255,255,255,0.04)' : c.card,
        borderWidth: 1, borderColor: c.glass ? 'rgba(167,139,250,0.2)' : c.border,
      }}>
        <TouchableOpacity onPress={() => setPasteOpen((v) => !v)} activeOpacity={0.75}>
          <Row style={{ gap: 12 }}>
            <View style={{
              width: 44, height: 44, borderRadius: 14,
              backgroundColor: 'rgba(236,72,153,0.2)', alignItems: 'center', justifyContent: 'center',
              borderWidth: 1, borderColor: 'rgba(236,72,153,0.35)',
              shadowColor: '#EC4899', shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.7, shadowRadius: 10,
            }}>
              <Text style={{ fontSize: 20 }}>📋</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ color: c.text, fontWeight: '700', fontSize: 14 }}>Paste text</Text>
              <Text style={{ color: c.textMuted, fontSize: 12, marginTop: 2 }}>An article, notes, or any copied text</Text>
            </View>
            <Icon name={pasteOpen ? 'chevron-up' : 'chevron-down'} size={15} color={c.textMuted} />
          </Row>
        </TouchableOpacity>
        {pasteOpen && (
          <View style={{ marginTop: 12 }}>
            <Input
              placeholder="Title (optional)"
              value={pasteTitle}
              onChangeText={setPasteTitle}
              style={{ marginBottom: 8 }}
            />
            <Input
              placeholder="Paste your text here…"
              value={pasteText}
              onChangeText={setPasteText}
              multiline
              style={{ minHeight: 120, textAlignVertical: 'top', marginBottom: 8 }}
            />
            <Button
              label={busy ? '…' : t('importBtn')}
              small
              onPress={importText}
              disabled={disabled || pasteText.trim().length < 40}
            />
            {pasteText.trim().length > 0 && pasteText.trim().length < 40 && (
              <Muted style={{ marginTop: 6 }}>Paste at least a paragraph.</Muted>
            )}
          </View>
        )}
      </View>
    </View>
  );
}
