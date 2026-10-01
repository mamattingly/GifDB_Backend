import { useEffect, useMemo, useRef, useState } from "react";

const API = import.meta.env.VITE_API_URL || "";

function absoluteUrl(path) {
  const base = import.meta.env.VITE_API_URL || window.location.origin;
  return new URL(path, base).href;
}

export default function App() {
  const [gifs, setGifs] = useState([]);
  const [search, setSearch] = useState("");
  const [message, setMessage] = useState("");
  const [uploading, setUploading] = useState(false);
  const [dragging, setDragging] = useState(false);
  const inputRef = useRef(null);

  async function loadGifs() {
    const res = await fetch(`${API}/api/gifs`);
    if (!res.ok) throw new Error("Unable to load GIFs.");
    setGifs(await res.json());
  }

  useEffect(() => {
    loadGifs().catch((err) => setMessage(err.message));
  }, []);

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return gifs;
    return gifs.filter((gif) => gif.name.toLowerCase().includes(term));
  }, [gifs, search]);

  async function uploadFiles(fileList) {
    const files = [...fileList].filter((file) => file.type === "image/gif");
    if (!files.length) {
      setMessage("Please select one or more GIF files.");
      return;
    }

    setUploading(true);
    setMessage("");

    try {
      for (const file of files) {
        const form = new FormData();
        form.append("gif", file);

        const res = await fetch(`${API}/api/upload`, {
          method: "POST",
          body: form
        });

        const body = await res.json();
        if (!res.ok) throw new Error(body.error || "Upload failed.");
      }

      await loadGifs();
      setMessage(`${files.length} GIF${files.length === 1 ? "" : "s"} uploaded.`);
    } catch (err) {
      setMessage(err.message);
    } finally {
      setUploading(false);
    }
  }

  async function copy(text, label = "Link copied.") {
    try {
      await navigator.clipboard.writeText(text);
      setMessage(label);
    } catch {
      setMessage("Copy failed. Your browser may block clipboard access.");
    }
  }

  async function removeGif(gif) {
    if (!window.confirm(`Delete "${gif.name}"?`)) return;

    const res = await fetch(`${API}/api/gifs/${encodeURIComponent(gif.id)}`, {
      method: "DELETE"
    });

    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      setMessage(body.error || "Delete failed.");
      return;
    }

    await loadGifs();
    setMessage("GIF deleted.");
  }

  function onDrop(event) {
    event.preventDefault();
    setDragging(false);
    uploadFiles(event.dataTransfer.files);
  }

  return (
    <main className="page">
      <header className="header">
        <div>
          <div className="eyebrow">PERSONAL MEDIA HOST</div>
          <h1>My GIF Library</h1>
          <p>Host GIFs on your own site and copy direct HTTPS links.</p>
        </div>
        <button className="primary" onClick={() => inputRef.current?.click()}>
          {uploading ? "Uploading…" : "Upload GIF"}
        </button>
        <input
          ref={inputRef}
          hidden
          type="file"
          accept="image/gif"
          multiple
          onChange={(e) => uploadFiles(e.target.files)}
        />
      </header>

      <section
        className={`dropzone ${dragging ? "dragging" : ""}`}
        onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={onDrop}
      >
        <strong>Drop GIFs here</strong>
        <span>or click Upload GIF above</span>
      </section>

      <div className="toolbar">
        <input
          className="search"
          placeholder="Search your GIFs…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <span className="count">{filtered.length} GIF{filtered.length === 1 ? "" : "s"}</span>
      </div>

      {message && <div className="message">{message}</div>}

      {!filtered.length ? (
        <div className="empty">
          <h2>No GIFs found</h2>
          <p>Upload a GIF to start building your library.</p>
        </div>
      ) : (
        <section className="grid">
          {filtered.map((gif) => {
            const url = absoluteUrl(gif.url);
            return (
              <article className="card" key={gif.id}>
                <div className="preview">
                  <img src={url} alt={gif.name} loading="lazy" />
                </div>
                <div className="card-body">
                  <div className="filename" title={gif.name}>{gif.name}</div>
                  <div className="meta">{formatBytes(gif.size)}</div>
                  <div className="actions">
                    <button onClick={() => copy(url)}>Copy Link</button>
                    <button onClick={() => window.open(url, "_blank", "noopener,noreferrer")}>
                      Open
                    </button>
                    <button className="danger" onClick={() => removeGif(gif)}>
                      Delete
                    </button>
                  </div>
                </div>
              </article>
            );
          })}
        </section>
      )}
    </main>
  );
}

function formatBytes(bytes) {
  if (!bytes) return "0 B";
  const units = ["B", "KB", "MB", "GB"];
  const index = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
  return `${(bytes / 1024 ** index).toFixed(index ? 1 : 0)} ${units[index]}`;
}
