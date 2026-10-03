import './TagList.css';

export default function TagList({ tags = [], small = false }) {
  if (!tags.length) return null;
  return (
    <div className={`tag-list${small ? ' tag-list--small' : ''}`}>
      {tags.map((tag) => (
        <span key={tag} className="tag-pill">
          {tag}
        </span>
      ))}
    </div>
  );
}
