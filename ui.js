import { ActivityIndicator, Text, TextInput, TouchableOpacity, View } from 'react-native';
// GlowBox, NeonBar, TypeBadge exported below use Text — already imported above
import { Ionicons } from '@expo/vector-icons';
import { useThemeColors } from './theme';

export function Icon({ name, size = 20, color, style }) {
  const c = useThemeColors();
  return <Ionicons name={name} size={size} color={color ?? c.textSecondary} style={style} />;
}

export function Card({ children, style, onPress, tint }) {
  const c = useThemeColors();
  const base = {
    backgroundColor: tint ?? (c.glass ? 'rgba(255,255,255,0.04)' : c.card),
    borderRadius: 16,
    borderWidth: 1,
    borderColor: c.glass ? (c.borderGlass ?? c.border) : c.border,
    padding: 14,
  };
  if (onPress) {
    return (
      <TouchableOpacity style={[base, style]} onPress={onPress} activeOpacity={0.75}>
        {children}
      </TouchableOpacity>
    );
  }
  return <View style={[base, style]}>{children}</View>;
}

// Glowing icon box used in neon glass design
export function GlowBox({ emoji, color = '#7C3AED', size = 38 }) {
  return (
    <View style={{
      width: size, height: size, borderRadius: size * 0.28,
      backgroundColor: `${color}33`,
      alignItems: 'center', justifyContent: 'center',
      shadowColor: color, shadowOffset: { width: 0, height: 0 },
      shadowOpacity: 0.9, shadowRadius: 10, elevation: 6,
    }}>
      <Text style={{ fontSize: size * 0.48 }}>{emoji}</Text>
    </View>
  );
}

// Neon divider bar
export function NeonBar({ style }) {
  return (
    <View style={[{
      height: 1,
      backgroundColor: 'rgba(124,58,237,0.45)',
      marginVertical: 10,
    }, style]} />
  );
}

// Material type badge (PDF / IMG / URL)
export function TypeBadge({ type }) {
  const map = {
    pdf:   { label: 'PDF', bg: 'rgba(239,68,68,0.18)',   fg: '#FCA5A5', border: 'rgba(239,68,68,0.4)' },
    image: { label: 'IMG', bg: 'rgba(34,197,94,0.18)',   fg: '#86EFAC', border: 'rgba(34,197,94,0.4)' },
    url:   { label: 'URL', bg: 'rgba(59,130,246,0.18)',  fg: '#93C5FD', border: 'rgba(59,130,246,0.4)' },
    text:  { label: 'TXT', bg: 'rgba(251,191,36,0.18)',  fg: '#FDE68A', border: 'rgba(251,191,36,0.4)' },
  };
  const t = map[type] ?? map.text;
  return (
    <View style={{
      paddingHorizontal: 7, paddingVertical: 3, borderRadius: 20,
      backgroundColor: t.bg, borderWidth: 1, borderColor: t.border,
    }}>
      <Text style={{ fontSize: 9, fontWeight: '800', color: t.fg, letterSpacing: 0.5 }}>{t.label}</Text>
    </View>
  );
}

export function Row({ children, style }) {
  return <View style={[{ flexDirection: 'row', alignItems: 'center' }, style]}>{children}</View>;
}

export function Title({ children, style }) {
  const c = useThemeColors();
  return <Text style={[{ color: c.text, fontSize: 22, fontWeight: '600' }, style]}>{children}</Text>;
}

export function Label({ children, style }) {
  const c = useThemeColors();
  return (
    <Text style={[{ color: c.textSecondary, fontSize: 13, marginBottom: 8, marginTop: 4 }, style]}>
      {children}
    </Text>
  );
}

export function Body({ children, style, ...props }) {
  const c = useThemeColors();
  return (
    <Text {...props} style={[{ color: c.text, fontSize: 14, lineHeight: 21 }, style]}>
      {children}
    </Text>
  );
}

export function Muted({ children, style, ...props }) {
  const c = useThemeColors();
  return (
    <Text {...props} style={[{ color: c.textMuted, fontSize: 12 }, style]}>
      {children}
    </Text>
  );
}

export function Button({ label, onPress, disabled, variant = 'primary', icon, style, small }) {
  const c = useThemeColors();
  const bg =
    variant === 'primary' ? c.accent :
    variant === 'danger' ? c.danger :
    'transparent';
  const fg = variant === 'secondary' ? c.text : c.onAccent;
  const realFg = variant === 'danger' ? '#fff' : fg;
  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={disabled}
      activeOpacity={0.8}
      style={[
        {
          backgroundColor: bg,
          borderWidth: variant === 'secondary' ? 1 : 0,
          borderColor: c.border,
          borderRadius: 12,
          paddingVertical: small ? 9 : 13,
          paddingHorizontal: 16,
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 8,
          opacity: disabled ? 0.5 : 1,
        },
        style,
      ]}
    >
      {icon ? <Ionicons name={icon} size={17} color={realFg} /> : null}
      <Text style={{ color: realFg, fontSize: small ? 13 : 15, fontWeight: '600' }}>{label}</Text>
    </TouchableOpacity>
  );
}

export function LinkText({ label, onPress, color, style }) {
  const c = useThemeColors();
  return (
    <TouchableOpacity onPress={onPress} hitSlop={8}>
      <Text style={[{ color: color ?? c.accent, fontSize: 13, fontWeight: '500' }, style]}>{label}</Text>
    </TouchableOpacity>
  );
}

export function Input(props) {
  const c = useThemeColors();
  return (
    <TextInput
      placeholderTextColor={c.textMuted}
      {...props}
      style={[
        {
          backgroundColor: c.card,
          borderWidth: 1,
          borderColor: c.border,
          borderRadius: 12,
          paddingVertical: 11,
          paddingHorizontal: 14,
          color: c.text,
          fontSize: 14,
        },
        props.style,
      ]}
    />
  );
}

export function Segmented({ options, value, onChange }) {
  const c = useThemeColors();
  return (
    <View
      style={{
        flexDirection: 'row',
        backgroundColor: c.cardAlt,
        borderRadius: 12,
        padding: 3,
        gap: 3,
      }}
    >
      {options.map((opt) => {
        const active = value === opt.value;
        return (
          <TouchableOpacity
            key={opt.value}
            onPress={() => onChange(opt.value)}
            style={{
              flex: 1,
              paddingVertical: 8,
              borderRadius: 9,
              backgroundColor: active ? c.card : 'transparent',
              alignItems: 'center',
            }}
          >
            <Text
              style={{
                fontSize: 13,
                fontWeight: active ? '600' : '400',
                color: active ? c.text : c.textMuted,
              }}
            >
              {opt.label}
              {opt.badge ? ` (${opt.badge})` : ''}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

export function Pill({ label, active, onPress, disabled }) {
  const c = useThemeColors();
  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={disabled}
      style={{
        paddingVertical: 7,
        paddingHorizontal: 13,
        borderRadius: 18,
        borderWidth: 1,
        borderColor: active ? c.accent : c.border,
        backgroundColor: active ? c.accentSoft : 'transparent',
        opacity: disabled ? 0.5 : 1,
      }}
    >
      <Text style={{ fontSize: 12.5, color: active ? c.accent : c.textSecondary, fontWeight: active ? '600' : '400' }}>
        {label}
      </Text>
    </TouchableOpacity>
  );
}

export function Loading({ label }) {
  const c = useThemeColors();
  return (
    <Row style={{ marginVertical: 10, justifyContent: 'center', gap: 8 }}>
      <ActivityIndicator color={c.accent} />
      {label ? <Muted>{label}</Muted> : null}
    </Row>
  );
}

export function EmptyState({ icon, title, body }) {
  const c = useThemeColors();
  return (
    <View style={{ alignItems: 'center', paddingVertical: 32, gap: 8 }}>
      <Ionicons name={icon} size={34} color={c.textMuted} />
      <Text style={{ color: c.text, fontSize: 15, fontWeight: '600' }}>{title}</Text>
      {body ? (
        <Text style={{ color: c.textMuted, fontSize: 13, textAlign: 'center', maxWidth: 280 }}>{body}</Text>
      ) : null}
    </View>
  );
}

export function ErrorText({ children }) {
  const c = useThemeColors();
  if (!children) return null;
  return <Text style={{ color: c.danger, fontSize: 13, marginVertical: 8 }}>{children}</Text>;
}

export function ProgressBar({ percent, height = 4 }) {
  const c = useThemeColors();
  return (
    <View style={{ height, backgroundColor: c.border, borderRadius: height / 2, overflow: 'hidden' }}>
      <View
        style={{
          width: `${Math.max(0, Math.min(100, percent))}%`,
          height: '100%',
          backgroundColor: c.accent,
        }}
      />
    </View>
  );
}

// ---------- Skeleton loaders ----------

import { useEffect as _useEffect, useRef as _useRef, useState as _useState, createContext as _createContext, useContext as _useContext } from 'react';
import { Animated } from 'react-native';

export function Skeleton({ height = 64, style }) {
  const c = useThemeColors();
  const opacity = _useRef(new Animated.Value(0.35)).current;
  _useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, { toValue: 0.9, duration: 700, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 0.35, duration: 700, useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [opacity]);
  return (
    <Animated.View
      style={[{
        height, borderRadius: 14, marginBottom: 10, opacity,
        backgroundColor: c.glass ? 'rgba(255,255,255,0.06)' : c.card,
      }, style]}
    />
  );
}

export function SkeletonRows({ count = 3, height = 64 }) {
  return (
    <View>
      {Array.from({ length: count }).map((_, i) => <Skeleton key={i} height={height} />)}
    </View>
  );
}

// ---------- Staged progress card (upload / TTS / summarize) ----------

export function ProgressCard({ stages, detail }) {
  const c = useThemeColors();
  const [elapsed, setElapsed] = _useState(0);
  const startRef = _useRef(Date.now());
  _useEffect(() => {
    const t = setInterval(() => setElapsed((Date.now() - startRef.current) / 1000), 300);
    return () => clearInterval(t);
  }, []);

  const total = stages.reduce((s, st) => s + st.estimateSec, 0);
  let acc = 0;
  let stageIdx = stages.length - 1;
  for (let i = 0; i < stages.length; i++) {
    acc += stages[i].estimateSec;
    if (elapsed < acc) { stageIdx = i; break; }
  }
  const pct = Math.min(95, 100 * (1 - Math.exp(-1.7 * (elapsed / total))));
  const overdue = elapsed > total * 1.6;
  const left = Math.max(0, Math.round(total - elapsed));

  return (
    <View style={{
      padding: 14, borderRadius: 16, marginVertical: 10,
      backgroundColor: c.glass ? 'rgba(255,255,255,0.04)' : c.card,
      borderWidth: 1, borderColor: c.glass ? 'rgba(167,139,250,0.25)' : c.border,
    }}>
      <Row style={{ gap: 10, marginBottom: 10 }}>
        <ActivityIndicator color={c.accent} size="small" />
        <View style={{ flex: 1 }}>
          <Text style={{ color: c.text, fontSize: 13, fontWeight: '700' }}>{stages[stageIdx].label}</Text>
          {detail ? <Text style={{ color: c.textMuted, fontSize: 11, marginTop: 2 }}>{detail}</Text> : null}
        </View>
        {left > 0 ? <Text style={{ color: c.textMuted, fontSize: 11 }}>~{left}s</Text> : null}
      </Row>
      <View style={{ height: 5, borderRadius: 3, backgroundColor: 'rgba(255,255,255,0.08)', overflow: 'hidden' }}>
        <View style={{ height: '100%', width: `${pct}%`, borderRadius: 3, backgroundColor: c.accent }} />
      </View>
      {stages.length > 1 && (
        <Row style={{ gap: 10, marginTop: 8, flexWrap: 'wrap' }}>
          {stages.map((st, i) => (
            <Text key={i} style={{
              fontSize: 10,
              color: i < stageIdx ? '#34D399' : i === stageIdx ? c.accent : c.textMuted,
              fontWeight: i === stageIdx ? '700' : '400',
            }}>
              {i < stageIdx ? '✓ ' : ''}{st.label}
            </Text>
          ))}
        </Row>
      )}
      <Text style={{ color: c.textMuted, fontSize: 10, marginTop: 8 }}>
        {overdue
          ? 'Taking a little longer than usual — the server may be waking up. Hang tight.'
          : 'This runs in the cloud — please keep the app open.'}
      </Text>
    </View>
  );
}

export const progressEstimate = {
  tts: (chars) => Math.max(8, Math.round(6 + chars / 1500)),
  summary: (chars) => Math.max(10, Math.round(8 + Math.min(chars, 60000) / 4000)),
};

// ---------- Toasts ----------

const ToastCtx = _createContext(() => {});
export const useToast = () => _useContext(ToastCtx);

export function ToastProvider({ children }) {
  const c = useThemeColors();
  const [toasts, setToasts] = _useState([]);
  const nextId = _useRef(0);

  const push = (text, kind = 'success') => {
    const id = nextId.current++;
    setToasts((t) => [...t, { id, text, kind }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 3000);
  };

  const colors = { success: '#34D399', error: '#F87171', info: c.accent };

  return (
    <ToastCtx.Provider value={push}>
      <View style={{ flex: 1 }}>
        {children}
        <View pointerEvents="none" style={{ position: 'absolute', bottom: 90, left: 0, right: 0, alignItems: 'center', gap: 8 }}>
          {toasts.map((t) => (
            <View key={t.id} style={{
              flexDirection: 'row', alignItems: 'center', gap: 8,
              paddingVertical: 10, paddingHorizontal: 16, borderRadius: 14, maxWidth: 320,
              backgroundColor: '#1A1030', borderWidth: 1, borderColor: 'rgba(167,139,250,0.35)',
              shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.4, shadowRadius: 12, elevation: 6,
            }}>
              <Text style={{ color: colors[t.kind] ?? colors.info, fontWeight: '800', fontSize: 13 }}>
                {t.kind === 'success' ? '✓' : t.kind === 'error' ? '✕' : 'ℹ'}
              </Text>
              <Text style={{ color: '#fff', fontSize: 13, fontWeight: '600' }}>{t.text}</Text>
            </View>
          ))}
        </View>
      </View>
    </ToastCtx.Provider>
  );
}
