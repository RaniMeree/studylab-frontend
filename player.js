import { createContext, useContext, useEffect, useRef, useState } from 'react';
import { Platform, ScrollView, Text, TouchableOpacity, View } from 'react-native';
import Slider from '@react-native-community/slider';
import { setAudioModeAsync, useAudioPlayer, useAudioPlayerStatus } from 'expo-audio';
import * as Clipboard from 'expo-clipboard';
import { api, API_BASE, postJson } from './api';
import { useThemeColors } from './theme';
import { Icon, Muted, Pill, Row } from './ui';

const SPEEDS = [0.75, 1, 1.25, 1.5, 2];
const SLEEP_OPTIONS = [15, 30, 60];

const PlayerContext = createContext(null);
export const usePlayer = () => useContext(PlayerContext);

function formatTime(seconds) {
  if (!seconds || Number.isNaN(seconds)) return '0:00';
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60).toString().padStart(2, '0');
  return `${m}:${s}`;
}

export function PlayerProvider({ children }) {
  const [track, setTrack] = useState(null);
  const [speed, setSpeed] = useState(1);
  const [autoPlayNext, setAutoPlayNext] = useState(true);
  const [sleepMinutes, setSleepMinutes] = useState(null);
  const [expanded, setExpanded] = useState(false);
  const [loadingChapterId, setLoadingChapterId] = useState(null);

  const sleepDeadlineRef = useRef(null);
  const resumedForUrlRef = useRef(null);
  const advancedForUrlRef = useRef(null);
  const lastSavedRef = useRef(0);

  const player = useAudioPlayer(track?.url ?? undefined);
  const status = useAudioPlayerStatus(player);

  useEffect(() => {
    setAudioModeAsync({
      playsInSilentMode: true,
      shouldPlayInBackground: true,
      interruptionMode: 'doNotMix',
    }).catch(() => {});
  }, []);

  useEffect(() => {
    if (player && status.isLoaded) player.setPlaybackRate(speed, 'high');
  }, [speed, status.isLoaded, track?.url]);

  useEffect(() => {
    if (Platform.OS !== 'web' && player && status.isLoaded && track) {
      try {
        player.setActiveForLockScreen(true, {
          title: track.label,
          artist: track.docTitle ?? 'PDF to Audio',
        });
      } catch {}
    }
  }, [status.isLoaded, track?.url]);

  useEffect(() => {
    if (player && status.isLoaded && track?.resumeAt && resumedForUrlRef.current !== track.url) {
      resumedForUrlRef.current = track.url;
      player.seekTo(track.resumeAt);
    }
  }, [status.isLoaded, track?.url]);

  const saveProgress = (position, duration) => {
    if (!track?.chapterId) return;
    const completed = duration > 0 && position >= duration - 1;
    postJson(`/chapters/${track.chapterId}/progress`, {
      position_seconds: position,
      duration_seconds: duration,
      completed,
    }).catch(() => {});
  };

  useEffect(() => {
    if (!track?.chapterId || !status.isLoaded) return;
    const t = status.currentTime || 0;
    if (Math.abs(t - lastSavedRef.current) >= 5) {
      lastSavedRef.current = t;
      saveProgress(t, status.duration || 0);
    }
  }, [status.currentTime, track?.chapterId]);

  // Auto-advance to the next chapter of the same document.
  useEffect(() => {
    if (!status.didJustFinish || !track?.chapterId) return;
    if (advancedForUrlRef.current === track.url) return;
    advancedForUrlRef.current = track.url;
    saveProgress(status.duration || 0, status.duration || 0);
    if (!autoPlayNext || !track.chapters) return;
    const idx = track.chapters.findIndex((c) => c.id === track.chapterId);
    if (idx >= 0 && idx + 1 < track.chapters.length) {
      playChapter(track.chapters[idx + 1], {
        voiceId: track.voiceId,
        chapters: track.chapters,
        docTitle: track.docTitle,
      });
    }
  }, [status.didJustFinish]);

  useEffect(() => {
    if (!sleepDeadlineRef.current) return;
    if (Date.now() >= sleepDeadlineRef.current) {
      sleepDeadlineRef.current = null;
      setSleepMinutes(null);
      if (status.playing) player.pause();
    }
  }, [status.currentTime]);

  const playChapter = async (chapter, { voiceId, chapters, docTitle }) => {
    setLoadingChapterId(chapter.id);
    try {
      // Audio generation can be slow on first request (model download on server).
      // Retry up to 3 times with 5s delay to survive server warm-up.
      const data = await api(`/chapters/${chapter.id}/audio`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ voice_id: voiceId }),
      }, { retries: 3, retryDelay: 5000 });

      const resumeAt =
        chapter.progress && !chapter.progress.completed && chapter.progress.position_seconds > 3
          ? chapter.progress.position_seconds
          : 0;
      advancedForUrlRef.current = null;
      resumedForUrlRef.current = null;
      setTrack({
        url: `${API_BASE}${data.audio_url}`,
        sentences: data.sentences,
        label: chapter.title,
        chapterId: chapter.id,
        resumeAt,
        voiceId,
        chapters,
        docTitle,
      });
    } finally {
      setLoadingChapterId(null);
    }
  };

  const playSaved = (label, item, docTitle) => {
    if (!item.audio_url) return;
    advancedForUrlRef.current = null;
    resumedForUrlRef.current = null;
    setTrack({
      url: `${API_BASE}${item.audio_url}`,
      sentences: item.sentences ?? [],
      label,
      docTitle,
    });
  };

  const toggle = () => {
    if (!track) return;
    if (status.playing) {
      player.pause();
      saveProgress(status.currentTime || 0, status.duration || 0);
    } else {
      player.play();
    }
  };

  const skip = (delta) => {
    const target = Math.max(0, Math.min(status.duration || 0, (status.currentTime || 0) + delta));
    player.seekTo(target);
  };

  const setSleepTimer = (minutes) => {
    if (sleepMinutes === minutes) {
      setSleepMinutes(null);
      sleepDeadlineRef.current = null;
    } else {
      setSleepMinutes(minutes);
      sleepDeadlineRef.current = Date.now() + minutes * 60 * 1000;
    }
  };

  const stop = () => {
    if (status.playing) player.pause();
    setTrack(null);
    setExpanded(false);
  };

  const currentSentenceIndex =
    track?.sentences?.findIndex(
      (s) => (status.currentTime || 0) >= s.start && (status.currentTime || 0) < s.end
    ) ?? -1;

  const value = {
    track, status, player, speed, setSpeed,
    autoPlayNext, setAutoPlayNext, sleepMinutes, setSleepTimer,
    expanded, setExpanded, playChapter, playSaved, toggle, skip, stop,
    loadingChapterId, currentSentenceIndex, formatTime,
  };

  return <PlayerContext.Provider value={value}>{children}</PlayerContext.Provider>;
}

export function MiniPlayer() {
  const c = useThemeColors();
  const p = usePlayer();
  if (!p?.track || p.expanded) return null;
  const pct = p.status.duration ? (100 * (p.status.currentTime || 0)) / p.status.duration : 0;
  return (
    <View style={{
      backgroundColor: c.glass ? 'rgba(13,2,33,0.97)' : c.card,
      borderTopWidth: 1,
      borderColor: c.glass ? 'rgba(167,139,250,0.2)' : c.border,
    }}>
      {/* Neon progress bar */}
      <View style={{ height: 2, backgroundColor: c.glass ? 'rgba(167,139,250,0.1)' : c.border }}>
        <View style={{
          width: `${pct}%`, height: 2,
          backgroundColor: c.accent,
          shadowColor: c.accent, shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.9, shadowRadius: 4,
        }} />
      </View>
      <TouchableOpacity
        activeOpacity={0.8}
        onPress={() => p.setExpanded(true)}
        style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 9, paddingHorizontal: 14, gap: 10 }}
      >
        <TouchableOpacity
          onPress={p.toggle}
          hitSlop={8}
          style={{
            width: 36, height: 36, borderRadius: 18,
            backgroundColor: c.glass ? 'rgba(124,58,237,0.4)' : c.accent,
            alignItems: 'center', justifyContent: 'center',
            borderWidth: 1, borderColor: c.glass ? 'rgba(167,139,250,0.5)' : 'transparent',
            shadowColor: '#7C3AED', shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.9, shadowRadius: 8,
          }}
        >
          <Icon name={p.status.playing ? 'pause' : 'play'} size={18} color="#fff" />
        </TouchableOpacity>
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text numberOfLines={1} style={{ color: c.text, fontSize: 13, fontWeight: '600' }}>
            {p.track.label}
          </Text>
          <Muted numberOfLines={1}>
            {formatTime(p.status.currentTime)} / {formatTime(p.status.duration)}
            {p.track.docTitle ? ` · ${p.track.docTitle}` : ''}
          </Muted>
        </View>
        <TouchableOpacity onPress={() => p.skip(10)} hitSlop={8}>
          <Icon name="play-forward" size={18} color={c.textMuted} />
        </TouchableOpacity>
        <TouchableOpacity onPress={p.stop} hitSlop={8}>
          <Icon name="close" size={18} color={c.textMuted} />
        </TouchableOpacity>
      </TouchableOpacity>
    </View>
  );
}

export function FullPlayer() {
  const c = useThemeColors();
  const p = usePlayer();
  const [copied, setCopied] = useState(false);
  if (!p?.track || !p.expanded) return null;

  const copyText = async () => {
    await Clipboard.setStringAsync(p.track.sentences.map((s) => s.text).join(' '));
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  const download = () => {
    if (Platform.OS === 'web') {
      const a = document.createElement('a');
      a.href = p.track.url;
      a.download = `${p.track.label}.mp3`;
      a.click();
    }
  };

  return (
    <View style={{
      backgroundColor: c.glass ? 'rgba(13,2,33,0.98)' : c.card,
      borderTopWidth: 1, borderColor: c.glass ? 'rgba(167,139,250,0.22)' : c.border,
      maxHeight: 480,
    }}>
      <View style={{ paddingHorizontal: 18, paddingTop: 12 }}>
        <Row style={{ justifyContent: 'space-between' }}>
          <TouchableOpacity onPress={() => p.setExpanded(false)} hitSlop={8}>
            <Icon name="chevron-down" size={22} color={c.textMuted} />
          </TouchableOpacity>
          <View style={{ flex: 1, marginHorizontal: 10 }}>
            <Text numberOfLines={1} style={{ color: c.text, fontSize: 14, fontWeight: '700', textAlign: 'center' }}>
              {p.track.label}
            </Text>
            {p.track.docTitle ? (
              <Muted numberOfLines={1} style={{ textAlign: 'center' }}>{p.track.docTitle}</Muted>
            ) : null}
          </View>
          <TouchableOpacity onPress={p.stop} hitSlop={8}>
            <Icon name="close" size={20} color={c.textMuted} />
          </TouchableOpacity>
        </Row>

        <Slider
          style={{ width: '100%', height: 30, marginTop: 6 }}
          minimumValue={0}
          maximumValue={Math.max(p.status.duration || 0, 0.01)}
          value={p.status.currentTime || 0}
          minimumTrackTintColor={c.accent}
          maximumTrackTintColor={c.glass ? 'rgba(167,139,250,0.15)' : c.border}
          thumbTintColor={c.accent}
          onSlidingComplete={(v) => p.player.seekTo(v)}
        />
        <Row style={{ justifyContent: 'space-between', marginTop: -4 }}>
          <Muted>{formatTime(p.status.currentTime)}</Muted>
          <Muted>{formatTime(p.status.duration)}</Muted>
        </Row>

        <Row style={{ justifyContent: 'center', gap: 30, marginVertical: 8 }}>
          <TouchableOpacity onPress={() => p.skip(-10)} hitSlop={8}>
            <Icon name="play-back" size={24} color={c.textMuted} />
          </TouchableOpacity>
          <TouchableOpacity
            onPress={p.toggle}
            style={{
              width: 58, height: 58, borderRadius: 29,
              backgroundColor: c.glass ? 'rgba(124,58,237,0.4)' : c.accent,
              alignItems: 'center', justifyContent: 'center',
              borderWidth: 1, borderColor: c.glass ? 'rgba(167,139,250,0.55)' : 'transparent',
              shadowColor: '#7C3AED', shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.9, shadowRadius: 16,
            }}
          >
            <Icon name={p.status.playing ? 'pause' : 'play'} size={28} color="#fff" />
          </TouchableOpacity>
          <TouchableOpacity onPress={() => p.skip(10)} hitSlop={8}>
            <Icon name="play-forward" size={24} color={c.textMuted} />
          </TouchableOpacity>
        </Row>

        <Row style={{ flexWrap: 'wrap', gap: 6, justifyContent: 'center', marginBottom: 6 }}>
          {SPEEDS.map((s) => (
            <Pill key={s} label={`${s}×`} active={p.speed === s} onPress={() => p.setSpeed(s)} />
          ))}
        </Row>
        <Row style={{ flexWrap: 'wrap', gap: 6, justifyContent: 'center', marginBottom: 8 }}>
          <Pill label={p.autoPlayNext ? 'Auto-next on' : 'Auto-next off'} active={p.autoPlayNext} onPress={() => p.setAutoPlayNext((v) => !v)} />
          {SLEEP_OPTIONS.map((m) => (
            <Pill key={m} label={`Sleep ${m}m`} active={p.sleepMinutes === m} onPress={() => p.setSleepTimer(m)} />
          ))}
          {Platform.OS === 'web' && <Pill label="Download MP3" onPress={download} />}
          {p.track.sentences?.length > 0 && <Pill label={copied ? 'Copied' : 'Copy text'} onPress={copyText} />}
        </Row>
      </View>

      {p.track.sentences?.length > 0 && (
        <ScrollView style={{
          maxHeight: 180,
          backgroundColor: c.glass ? 'rgba(255,255,255,0.03)' : c.cardAlt,
          marginHorizontal: 18, marginBottom: 14, borderRadius: 12, padding: 12,
          borderWidth: 1, borderColor: c.glass ? 'rgba(167,139,250,0.12)' : c.border,
        }}>
          <Text style={{ color: c.textSecondary, fontSize: 14, lineHeight: 23 }}>
            {p.track.sentences.map((s, i) => (
              <Text
                key={i}
                onPress={() => p.player.seekTo(s.start)}
                style={i === p.currentSentenceIndex
                  ? { backgroundColor: c.glass ? 'rgba(124,58,237,0.3)' : c.accentSoft, color: c.accent, fontWeight: '700' }
                  : null}
              >
                {s.text}{' '}
              </Text>
            ))}
          </Text>
        </ScrollView>
      )}
    </View>
  );
}
