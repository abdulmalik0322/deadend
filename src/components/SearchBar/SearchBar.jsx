import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../../services/api/index.js';
import { Icon } from '../../utils/icons.jsx';
import './SearchBar.css';

export default function SearchBar({ size = 'md', initialValue = '', onSearch }) {
  const [value, setValue] = useState(initialValue);
  const [suggestions, setSuggestions] = useState([]);
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const navigate = useNavigate();
  const wrapRef = useRef(null);
  const debounceRef = useRef(null);

  useEffect(() => {
    setValue(initialValue);
  }, [initialValue]);

  useEffect(() => {
    clearTimeout(debounceRef.current);
    const query = value.trim();
    if (query.length < 2) {
      setSuggestions([]);
      setOpen(false);
      return undefined;
    }
    debounceRef.current = setTimeout(async () => {
      try {
        const res = await api.searchExperiences(query, { limit: 6 });
        const items = Array.isArray(res) ? res : res.items || res.results || [];
        setSuggestions(items);
        setOpen(items.length > 0);
        setActiveIndex(-1);
      } catch {
        setSuggestions([]);
        setOpen(false);
      }
    }, 250);
    return () => clearTimeout(debounceRef.current);
  }, [value]);

  useEffect(() => {
    const onDocClick = (e) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', onDocClick);
    return () => document.removeEventListener('mousedown', onDocClick);
  }, []);

  const goToSuggestion = (slug) => {
    setOpen(false);
    navigate(`/experiences/${slug}`);
  };

  const submit = (e) => {
    if (e) e.preventDefault();
    setOpen(false);
    const q = value.trim();
    if (onSearch) {
      onSearch(q);
    } else {
      navigate(q ? `/explore?q=${encodeURIComponent(q)}` : '/explore');
    }
  };

  const onKeyDown = (e) => {
    if (e.key === 'ArrowDown' && open && suggestions.length > 0) {
      e.preventDefault();
      setActiveIndex((i) => Math.min(i + 1, suggestions.length - 1));
    } else if (e.key === 'ArrowUp' && open && suggestions.length > 0) {
      e.preventDefault();
      setActiveIndex((i) => Math.max(i - 1, -1));
    } else if (e.key === 'Enter' && open && activeIndex >= 0 && suggestions[activeIndex]) {
      e.preventDefault();
      goToSuggestion(suggestions[activeIndex].slug);
    } else if (e.key === 'Escape') {
      setOpen(false);
    }
  };

  const iconSize = size === 'lg' ? 20 : 18;

  return (
    <form
      className={`searchbar searchbar--${size}`}
      onSubmit={submit}
      ref={wrapRef}
      role="search"
      autoComplete="off"
    >
      <div className="searchbar__field">
        <span className="searchbar__icon" aria-hidden="true">
          <Icon name="search" size={iconSize} />
        </span>
        <input
          type="search"
          className="searchbar__input"
          placeholder="What path are you considering? Try 'freelancing'…"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={onKeyDown}
          onFocus={() => {
            if (suggestions.length > 0) setOpen(true);
          }}
          aria-label="Search experiences"
          aria-expanded={open}
          role="combobox"
          aria-autocomplete="list"
        />
        {value && (
          <button
            type="button"
            className="searchbar__clear"
            onClick={() => {
              setValue('');
              setSuggestions([]);
              setOpen(false);
            }}
            aria-label="Clear search"
          >
            <Icon name="close" size={14} />
          </button>
        )}
        <button type="submit" className="searchbar__submit">
          Search
        </button>
      </div>

      {open && suggestions.length > 0 && (
        <ul className="searchbar__dropdown" role="listbox" aria-label="Search suggestions">
          {suggestions.map((s, i) => (
            <li key={s.id || s.slug} role="option" aria-selected={i === activeIndex}>
              <button
                type="button"
                className={`searchbar__option${i === activeIndex ? ' is-active' : ''}`}
                onMouseEnter={() => setActiveIndex(i)}
                onClick={() => goToSuggestion(s.slug)}
              >
                <span className="searchbar__option-title">{s.title}</span>
                <span className="searchbar__option-cat">
                  {s.categoryLabel || s.category}
                  {s.country ? ` · ${s.country}` : ''}
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </form>
  );
}
