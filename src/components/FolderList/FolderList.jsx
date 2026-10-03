import { useState } from 'react';
import { Icon } from '../../utils/icons.jsx';
import './FolderList.css';

export default function FolderList({
  folders = [],
  activeId = null,
  onSelect,
  onCreate,
  onRename,
  onDelete,
}) {
  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState('');
  const [renamingId, setRenamingId] = useState(null);
  const [renameValue, setRenameValue] = useState('');
  const [confirmDeleteId, setConfirmDeleteId] = useState(null);

  const submitCreate = () => {
    const name = newName.trim();
    if (!name) return;
    onCreate?.(name);
    setNewName('');
    setCreating(false);
  };

  const startRename = (folder) => {
    setRenamingId(folder.id);
    setRenameValue(folder.name);
    setConfirmDeleteId(null);
  };

  const submitRename = () => {
    const name = renameValue.trim();
    if (!name) {
      setRenamingId(null);
      return;
    }
    onRename?.(renamingId, name);
    setRenamingId(null);
    setRenameValue('');
  };

  const totalCount = folders.reduce((sum, f) => sum + (f.count ?? 0), 0);

  return (
    <aside className="folder-list" aria-label="Saved folders">
      <div className="folder-list-head">
        <h3 className="folder-list-title">Folders</h3>
        <button
          type="button"
          className="icon-btn"
          onClick={() => setCreating((c) => !c)}
          aria-label="Create folder"
          title="Create folder"
        >
          <Icon name="plus" />
        </button>
      </div>

      {creating && (
        <div className="folder-create">
          <input
            className="input"
            type="text"
            autoFocus
            placeholder="Folder name"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') submitCreate();
              if (e.key === 'Escape') {
                setCreating(false);
                setNewName('');
              }
            }}
          />
          <div className="folder-create-actions">
            <button type="button" className="btn btn-primary btn-sm" onClick={submitCreate}>
              <Icon name="check" /> Create
            </button>
            <button
              type="button"
              className="btn btn-ghost btn-sm"
              onClick={() => {
                setCreating(false);
                setNewName('');
              }}
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      <ul className="folder-items">
        <li>
          <button
            type="button"
            className={`folder-item ${activeId === null ? 'active' : ''}`}
            onClick={() => onSelect?.(null)}
          >
            <Icon name="bookmark" />
            <span className="folder-name">All saved</span>
            <span className="folder-count">{totalCount}</span>
          </button>
        </li>

        {folders.map((folder) => (
          <li key={folder.id}>
            {renamingId === folder.id ? (
              <div className="folder-rename">
                <input
                  className="input"
                  type="text"
                  autoFocus
                  value={renameValue}
                  onChange={(e) => setRenameValue(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') submitRename();
                    if (e.key === 'Escape') setRenamingId(null);
                  }}
                />
                <button type="button" className="icon-btn" onClick={submitRename} aria-label="Save name">
                  <Icon name="check" />
                </button>
                <button type="button" className="icon-btn" onClick={() => setRenamingId(null)} aria-label="Cancel rename">
                  <Icon name="x" />
                </button>
              </div>
            ) : confirmDeleteId === folder.id ? (
              <div className="folder-confirm">
                <span className="confirm-text">Delete “{folder.name}”?</span>
                <div className="confirm-actions">
                  <button
                    type="button"
                    className="btn btn-danger btn-sm"
                    onClick={() => {
                      onDelete?.(folder.id);
                      setConfirmDeleteId(null);
                    }}
                  >
                    Delete
                  </button>
                  <button
                    type="button"
                    className="btn btn-ghost btn-sm"
                    onClick={() => setConfirmDeleteId(null)}
                  >
                    Keep
                  </button>
                </div>
              </div>
            ) : (
              <div className={`folder-item-wrap ${activeId === folder.id ? 'active' : ''}`}>
                <button
                  type="button"
                  className="folder-item"
                  onClick={() => onSelect?.(folder.id)}
                >
                  <Icon name="folder" />
                  <span className="folder-name">{folder.name}</span>
                  <span className="folder-count">{folder.count ?? 0}</span>
                </button>
                <div className="folder-tools">
                  <button
                    type="button"
                    className="icon-btn icon-btn-xs"
                    onClick={() => startRename(folder)}
                    aria-label={`Rename ${folder.name}`}
                    title="Rename"
                  >
                    <Icon name="edit" />
                  </button>
                  <button
                    type="button"
                    className="icon-btn icon-btn-xs danger"
                    onClick={() => setConfirmDeleteId(folder.id)}
                    aria-label={`Delete ${folder.name}`}
                    title="Delete"
                  >
                    <Icon name="trash" />
                  </button>
                </div>
              </div>
            )}
          </li>
        ))}
      </ul>

      {folders.length === 0 && !creating && (
        <p className="folder-empty-hint">
          Create folders to organize the experiences you save.
        </p>
      )}
    </aside>
  );
}
