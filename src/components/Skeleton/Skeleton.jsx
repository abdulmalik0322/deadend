import './Skeleton.css';

export function SkeletonCard() {
  return (
    <div className="skeleton-card" aria-hidden="true">
      <div className="sk shimmer" style={{ height: 16, width: '60%' }} />
      <div className="sk shimmer" style={{ height: 12, width: '90%' }} />
      <div className="sk shimmer" style={{ height: 12, width: '75%' }} />
    </div>
  );
}

export function SkeletonText({ lines = 3 }) {
  return (
    <div className="skeleton-text" aria-hidden="true">
      {Array.from({ length: lines }).map((_, i) => (
        <div
          key={i}
          className="sk shimmer"
          style={{ width: i === lines - 1 ? '55%' : '100%' }}
        />
      ))}
    </div>
  );
}

export function SkeletonAvatar() {
  return <div className="sk shimmer skeleton-avatar" aria-hidden="true" />;
}

export default function Skeleton({ kind = 'text', lines = 3 }) {
  if (kind === 'card') return <SkeletonCard />;
  if (kind === 'avatar') return <SkeletonAvatar />;
  return <SkeletonText lines={lines} />;
}
