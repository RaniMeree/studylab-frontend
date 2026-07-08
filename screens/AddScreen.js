import { useEffect, useState } from 'react';
import { Platform, TouchableOpacity, View } from 'react-native';
import * as DocumentPicker from 'expo-document-picker';
import { api, postJson } from '../api';
import { useT } from '../i18n';
import { useThemeColors } from '../theme';
import { Body, Button, Card, ErrorText, Icon, Input, Label, Loading, Muted, Pill, Row, Title } from '../ui';

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
      } else {
        formData.append('file', {
          uri: picked.uri,
          name: picked.name ?? picked.fileName ?? fallbackName,
          type: picked.mimeType ?? mimeType,
        });
      }
      formData.append('language', language);
      const doc = await api(`/courses/${courseId}/documents`, { method: 'POST', body: formData });
      onImported(courseId, doc.id);
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

  return (
    <View style={{ padding: 18 }}>
      <Title>{t('addMaterial')}</Title>

      <Label style={{ marginTop: 16 }}>{t('course')}</Label>
      <Row style={{ flexWrap: 'wrap', gap: 6 }}>
        {courses.map((co) => (
          <Pill key={co.id} label={co.name} active={courseId === co.id} onPress={() => setCourseId(co.id)} />
        ))}
        {courses.length === 0 && <Muted>Create a course on the Home tab first.</Muted>}
      </Row>

      <Label style={{ marginTop: 14 }}>{t('language')}</Label>
      <Row style={{ flexWrap: 'wrap', gap: 6 }}>
        {Object.keys(voicesByLanguage).map((lang) => (
          <Pill
            key={lang}
            label={lang.toUpperCase()}
            active={language === lang}
            onPress={() => setLanguage(lang)}
          />
        ))}
      </Row>

      <ErrorText>{error}</ErrorText>
      {busy && <Loading label="Importing…" />}

      <Card onPress={disabled ? undefined : addFile} style={{ marginTop: 14, opacity: disabled ? 0.5 : 1 }}>
        <Row style={{ gap: 12 }}>
          <Icon name="document-outline" size={22} color={c.accent} />
          <View style={{ flex: 1 }}>
            <Body style={{ fontWeight: '600' }}>{t('uploadFile')}</Body>
            <Muted style={{ marginTop: 2 }}>PDF, EPUB, Word, PowerPoint, or text</Muted>
          </View>
          <Icon name="chevron-forward" size={16} color={c.textMuted} />
        </Row>
      </Card>

      <Card onPress={disabled ? undefined : addPhoto} style={{ marginTop: 8, opacity: disabled ? 0.5 : 1 }}>
        <Row style={{ gap: 12 }}>
          <Icon name="camera-outline" size={22} color={c.accent} />
          <View style={{ flex: 1 }}>
            <Body style={{ fontWeight: '600' }}>{t('scanPage')}</Body>
            <Muted style={{ marginTop: 2 }}>Photograph a book or handout page</Muted>
          </View>
          <Icon name="chevron-forward" size={16} color={c.textMuted} />
        </Row>
      </Card>

      <Card style={{ marginTop: 8 }}>
        <Row style={{ gap: 12, marginBottom: 10 }}>
          <Icon name="link-outline" size={22} color={c.accent} />
          <View style={{ flex: 1 }}>
            <Body style={{ fontWeight: '600' }}>{t('importWeb')}</Body>
            <Muted style={{ marginTop: 2 }}>Article or YouTube video link</Muted>
          </View>
        </Row>
        <Row style={{ gap: 8 }}>
          <Input
            placeholder="https://…"
            autoCapitalize="none"
            value={url}
            onChangeText={setUrl}
            onSubmitEditing={importUrl}
            style={{ flex: 1 }}
          />
          <Button label={t('importBtn')} small onPress={importUrl} disabled={disabled || !url.trim()} />
        </Row>
      </Card>
    </View>
  );
}
