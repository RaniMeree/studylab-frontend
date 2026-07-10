import { useEffect, useState } from 'react';
import { Platform, Text, TouchableOpacity, View } from 'react-native';
import * as DocumentPicker from 'expo-document-picker';
import { api, postJson } from '../api';
import { useT } from '../i18n';
import { useThemeColors } from '../theme';
import { Body, Button, Card, ErrorText, Icon, Input, Label, Loading, Muted, NeonBar, Pill, Row, Title } from '../ui';

export function AddScreen({ preselectedCourseId, voicesByLanguage, onImported }) {
  const c = useThemeColors();
  const t = useT();
  const [courses, setCourses] = useState([]);
  const [courseId, setCourseId] = useState(preselectedCourseId ?? null);
  const [language, setLanguage] = useState('en');
  const [url, setUrl] = useState('');
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
      });
      setUrl('');
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
    </View>
  );
}
