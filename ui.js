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
