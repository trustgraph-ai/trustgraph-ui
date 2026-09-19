import { useState, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useTheme } from "@trustgraph/trustkit";
import { marked } from "marked";

function baseUrlOf(url: string): string {
  const i = url.lastIndexOf("/");
  return i >= 0 ? url.substring(0, i) : url;
}

function renderMarkdown(md: string, baseUrl?: string): string {
  const renderer = new marked.Renderer();
  const origLink = renderer.link;
  renderer.link = function (token) {
    const html = origLink.call(this, token);
    if (token.href && /^https?:\/\//.test(token.href)) {
      return html.replace("<a ", '<a target="_blank" rel="noopener" ');
    }
    return html;
  };
  const origImage = renderer.image;
  renderer.image = function (token) {
    if (baseUrl && token.href && !/^https?:\/\//.test(token.href) && !token.href.startsWith("/")) {
      token.href = `${baseUrl}/${token.href}`;
    }
    return origImage.call(this, token);
  };
  let html = marked(md, { renderer }) as string;
  if (baseUrl) {
    html = html.replace(/\bsrc="([^"]+)"/g, (match, src) => {
      if (/^https?:\/\//.test(src) || src.startsWith("/")) return match;
      return `src="${baseUrl}/${src}"`;
    });
    html = html.replace(/\bhref="([^"]+)"/g, (match, href) => {
      if (/^https?:\/\//.test(href) || href.startsWith("/") || href.startsWith("#")) return match;
      return `href="${baseUrl}/${href}"`;
    });
  }
  return html;
}

const DOCS_CSS = `
.docs-viewer h1 { font-size: 1.6em; font-weight: 700; margin: 0.8em 0 0.4em }
.docs-viewer h2 { font-size: 1.3em; font-weight: 600; margin: 0.8em 0 0.3em }
.docs-viewer h3 { font-size: 1.1em; font-weight: 600; margin: 0.6em 0 0.2em }
.docs-viewer p { margin: 0.6em 0; line-height: 1.6 }
.docs-viewer img { max-width: 100%; height: auto; border-radius: 8px; margin: 8px auto; display: block }
.docs-viewer a { color: inherit; text-decoration: underline }
.docs-viewer ul, .docs-viewer ol { margin: 0.5em 0; padding-left: 1.5em }
.docs-viewer li { margin: 0.2em 0; line-height: 1.5 }
.docs-viewer blockquote { border-left: 3px solid currentColor; opacity: 0.7; margin: 0.5em 0; padding: 0.2em 1em }
.docs-viewer code { font-size: 0.9em; padding: 0.15em 0.4em; border-radius: 4px; background: rgba(128,128,128,0.15) }
.docs-viewer pre { padding: 1em; border-radius: 8px; overflow-x: auto; background: rgba(128,128,128,0.1) }
.docs-viewer pre code { padding: 0; background: none }
.docs-viewer table { border-collapse: collapse; margin: 0.5em 0; width: 100% }
.docs-viewer th, .docs-viewer td { border: 1px solid rgba(128,128,128,0.3); padding: 0.4em 0.8em; text-align: left }
.docs-viewer th { font-weight: 600 }
`;

export function DocsViewer() {
  const { theme, sz } = useTheme();
  const routerNavigate = useNavigate();
  const location = useLocation();
  const params = new URLSearchParams(location.search);
  const url = params.get("url");
  const title = params.get("title");

  const [html, setHtml] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!url) {
      setError("No documentation URL provided.");
      setLoading(false);
      return;
    }

    let cancelled = false;
    setLoading(true);
    setError(null);

    (async () => {
      try {
        const resp = await fetch(url);
        if (!resp.ok) throw new Error(`Failed to fetch: ${resp.status}`);
        const md = await resp.text();
        if (cancelled) return;
        setHtml(renderMarkdown(md, baseUrlOf(url)));
      } catch (e) {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : "Failed to load documentation");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => { cancelled = true; };
  }, [url]);

  return (
    <div style={{
      padding: sz(32), maxWidth: 860, margin: "0 auto",
      color: theme.text.primary, fontFamily: theme.font.sans,
      height: "var(--page-height)", overflowY: "auto",
    }}>
      <style>{DOCS_CSS}</style>

      <div style={{ display: "flex", alignItems: "center", gap: sz(12), marginBottom: sz(16) }}>
        <button
          onClick={() => routerNavigate(-1)}
          style={{
            fontSize: sz(13),
            padding: `${sz(5)}px ${sz(12)}px`,
            borderRadius: 6,
            background: theme.surface.overlay,
            border: `1px solid ${theme.border.default}`,
            color: theme.text.muted,
            cursor: "pointer",
            fontFamily: theme.font.sans,
          }}
        >
          Back
        </button>
        {title && (
          <h1 style={{ fontSize: sz(24), fontWeight: 600, margin: 0 }}>
            {title}
          </h1>
        )}
      </div>

      {loading && (
        <p style={{ color: theme.text.muted, fontSize: sz(14) }}>Loading documentation…</p>
      )}

      {error && (
        <p style={{ color: theme.text.faint, fontSize: sz(14) }}>{error}</p>
      )}

      {html && (
        <div
          className="docs-viewer"
          style={{ fontSize: sz(14), lineHeight: 1.6 }}
          dangerouslySetInnerHTML={{ __html: html }}
        />
      )}
    </div>
  );
}
