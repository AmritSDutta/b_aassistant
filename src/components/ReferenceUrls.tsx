import React, { useState } from 'react';

export interface ReferenceUrlsProps {
  urls: string[];
  onAddUrl: (url: string) => Promise<boolean>;
  onRemoveUrl: (url: string) => void;
}

export async function verifyUrlReachability(
  url: string,
  timeoutMs: number = 5000
): Promise<{ reachable: boolean; error?: string }> {
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    // Use no-cors mode so browser does not throw a CORS error for valid cross-origin endpoints
    await fetch(url, { method: 'GET', mode: 'no-cors', signal: controller.signal });
    clearTimeout(timer);
    return { reachable: true };
  } catch (err: unknown) {
    const errorObj = err as { name?: string; message?: string };
    if (errorObj?.name === 'AbortError') {
      return { reachable: false, error: 'Connection timed out (5s limit).' };
    }
    return { reachable: false, error: 'URL is unreachable or network failed.' };
  }
}

export const ReferenceUrls: React.FC<ReferenceUrlsProps> = ({ urls, onAddUrl, onRemoveUrl }) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [inputUrl, setInputUrl] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const isFull = urls.length >= 10;

  const handleOpenModal = () => {
    setInputUrl('');
    setErrorMessage(null);
    setIsVerifying(false);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    if (isVerifying) return;
    setIsModalOpen(false);
    setErrorMessage(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isVerifying) return;

    let target = inputUrl.trim();
    if (!target) {
      setErrorMessage('Please enter a URL.');
      return;
    }

    if (!/^https?:\/\//i.test(target)) {
      target = `https://${target}`;
    }

    try {
      const parsed = new URL(target);
      if (!['http:', 'https:'].includes(parsed.protocol)) {
        setErrorMessage('Only http:// and https:// URLs are supported.');
        return;
      }
    } catch {
      setErrorMessage('Invalid URL format.');
      return;
    }

    if (urls.includes(target)) {
      setErrorMessage('This URL has already been added.');
      return;
    }

    if (urls.length >= 10) {
      setErrorMessage('Maximum 10 reference URLs reached.');
      return;
    }

    setIsVerifying(true);
    setErrorMessage(null);

    const check = await verifyUrlReachability(target);
    setIsVerifying(false);

    if (!check.reachable) {
      setErrorMessage(check.error || 'URL is unreachable.');
      return;
    }

    const added = await onAddUrl(target);
    if (added) {
      setIsModalOpen(false);
      setInputUrl('');
    } else {
      setErrorMessage('Could not add URL.');
    }
  };

  return (
    <div className="border-b flex flex-col" style={{ borderColor: 'var(--line)' }}>
      {/* Header bar */}
      <div className="px-4 py-2 flex items-center justify-between">
        <div className="flex items-center gap-1.5 font-mono text-[10px] font-bold tracking-wider uppercase" style={{ color: 'var(--ink)' }}>
          <span>REFERENCE URLS</span>
          <span className="font-bold text-[9px] px-1.5 py-0.5 rounded" style={{ background: 'var(--card)', color: 'var(--ink)' }}>
            {urls.length}/10
          </span>
        </div>
        <button
          type="button"
          onClick={handleOpenModal}
          disabled={isFull}
          className="font-mono text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded border transition-opacity disabled:opacity-30 disabled:cursor-not-allowed hover:opacity-80"
          style={{ borderColor: 'var(--line)', background: 'var(--card)', color: 'var(--ink)' }}
          title={isFull ? 'Limit reached (10 max)' : 'Add reference URL'}
          aria-label="Add reference URL"
        >
          + Add
        </button>
      </div>

      {/* URL list */}
      <div className="px-4 pb-2.5 max-h-36 overflow-y-auto space-y-1">
        {urls.length === 0 ? (
          <p className="text-[11px] italic py-1" style={{ color: 'var(--ink-soft)' }}>
            No reference URLs. Add up to 10 URLs for visiting agents.
          </p>
        ) : (
          urls.map((url) => (
            <div
              key={url}
              className="group flex items-center justify-between text-[11px] font-mono px-2 py-1 rounded border gap-2"
              style={{ background: 'var(--card)', borderColor: 'var(--line)' }}
            >
              <a
                href={url}
                target="_blank"
                rel="noopener noreferrer"
                className="truncate hover:underline flex-1"
                style={{ color: 'var(--accent-client, #6366f1)' }}
                title={url}
              >
                {url}
              </a>
              <button
                type="button"
                onClick={() => onRemoveUrl(url)}
                className="opacity-50 hover:opacity-100 hover:text-red-500 text-[10px] px-1 font-bold"
                aria-label={`Remove ${url}`}
                title="Remove URL"
              >
                ✕
              </button>
            </div>
          ))
        )}
      </div>

      {/* Modal Popup */}
      {isModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs"
          role="dialog"
          aria-modal="true"
          aria-labelledby="ref-modal-title"
        >
          <div
            className="w-full max-w-md rounded-lg shadow-xl border p-5 space-y-4"
            style={{ background: 'var(--paper)', borderColor: 'var(--line)', color: 'var(--ink)' }}
          >
            <div className="flex items-center justify-between border-b pb-2" style={{ borderColor: 'var(--line)' }}>
              <h2 id="ref-modal-title" className="font-mono text-sm font-bold tracking-wide uppercase">
                Add Reference URL
              </h2>
              <button
                type="button"
                onClick={handleCloseModal}
                disabled={isVerifying}
                className="text-sm font-bold opacity-60 hover:opacity-100 px-1.5 py-0.5 rounded"
                aria-label="Close dialog"
              >
                ✕
              </button>
            </div>

            <p className="text-xs" style={{ color: 'var(--ink-soft)' }}>
              Enter an external documentation or reference URL. bAssistant will verify that the URL is reachable before caching it for visiting AI agents.
            </p>

            <form onSubmit={handleSubmit} className="space-y-3">
              <div>
                <input
                  type="text"
                  value={inputUrl}
                  onChange={(e) => {
                    setInputUrl(e.target.value);
                    if (errorMessage) setErrorMessage(null);
                  }}
                  disabled={isVerifying}
                  placeholder="https://docs.example.com/api"
                  className="w-full text-xs font-mono px-3 py-2 rounded border focus:outline-hidden"
                  style={{
                    background: 'var(--card)',
                    borderColor: errorMessage ? '#ef4444' : 'var(--line)',
                    color: 'var(--ink)',
                  }}
                  autoFocus
                />
                {errorMessage && (
                  <p className="text-[11px] text-red-500 font-mono mt-1">{errorMessage}</p>
                )}
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={handleCloseModal}
                  disabled={isVerifying}
                  className="text-xs font-mono px-3 py-1.5 rounded border hover:opacity-80 disabled:opacity-40"
                  style={{ borderColor: 'var(--line)', background: 'var(--card)', color: 'var(--ink)' }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isVerifying}
                  className="text-xs font-mono font-bold px-3 py-1.5 rounded text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 flex items-center gap-1.5"
                >
                  {isVerifying ? (
                    <>
                      <span className="inline-block w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      Verifying...
                    </>
                  ) : (
                    'Verify & Add'
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
