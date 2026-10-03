import { Icon } from '../../utils/icons.jsx';
import './Timeline.css';

export default function Timeline({ items = [] }) {
  return (
    <ol className="timeline">
      {items.map((item, i) => (
        <li
          key={i}
          className={`timeline-item${item.active ? ' timeline-item--active' : ''}${item.done ? ' timeline-item--done' : ''}`}
        >
          <span className="timeline-dot" aria-hidden="true">
            {item.done && !item.active && <Icon name="check" size={12} />}
          </span>
          <div className="timeline-content">
            <div className="timeline-top">
              {item.label && <span className="timeline-label">{item.label}</span>}
              {item.date && <span className="timeline-date">{item.date}</span>}
            </div>
            {item.text && <p className="timeline-text">{item.text}</p>}
          </div>
        </li>
      ))}
    </ol>
  );
}
