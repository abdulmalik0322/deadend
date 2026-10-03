import './Avatar.css';

const PALETTE = [
  { bg: '#26292f', fg: '#e8e9ea' },
  { bg: '#2b2e35', fg: '#e8e9ea' },
  { bg: '#22262b', fg: '#b8bcc2' },
  { bg: '#2e2a20', fg: '#f59e0b' },
  { bg: '#232a33', fg: '#e8e9ea' },
  { bg: '#2a2622', fg: '#fbbf24' },
];

function hashName(name) {
  let h = 0;
  for (let i = 0; i < name.length; i++) {
    h = (h * 31 + name.charCodeAt(i)) | 0;
  }
  return Math.abs(h);
}

export default function Avatar({ name = '', size = 36 }) {
  const initials = name
    .trim()
    .split(/\s+/)
    .map((w) => w[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();
  const tone = PALETTE[hashName(name || 'deadend') % PALETTE.length];

  return (
    <span
      className="avatar"
      style={{
        width: size,
        height: size,
        fontSize: size * 0.38,
        background: tone.bg,
        color: tone.fg,
      }}
      aria-hidden="true"
      title={name}
    >
      {initials || 'D'}
    </span>
  );
}
