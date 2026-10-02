import { useEffect, useMemo, useState } from 'react';
import { PageHeader } from '../components/Layout.jsx';
import { useToast } from '../components/Toast.jsx';
import { api } from '../api.js';

/**
 * Runtime settings — everything here takes effect within seconds, with no
 * .env edit, restart or redeploy.
 *
 * Secrets (SMTP/FTP/Razorpay passwords) are deliberately absent: they stay
 * in .env so they can never be read back through the API.
 */
export default function Settings() {
  const notify = useToast();
  const [specs, setSpecs] = useState([]);
  const [draft, setDraft] = useState({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  async function load() {
    setLoading(true);
    try {
      const rows = await api.listSettings();
      setSpecs(rows);
      setDraft(Object.fromEntries(rows.map((s) => [s.key, s.value])));
    } catch (e) { notify(e.message, 'error'); }
    finally { setLoading(false); }
  }
  useEffect(() => { load(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, []);

  const groups = useMemo(() => {
    const by = {};
    for (const s of specs) (by[s.group] = by[s.group] || []).push(s);
    return by;
  }, [specs]);

  const dirty = specs.some((s) => String(draft[s.key]) !== String(s.value));

  async function save() {
    setSaving(true);
    try {
      const res = await api.updateSettings(draft);
      const n = Object.keys(res.updated || {}).length;
      notify(n ? `${n} setting(s) updated — live now` : 'No changes to save');
      setSpecs(res.settings);
      setDraft(Object.fromEntries(res.settings.map((s) => [s.key, s.value])));
    } catch (e) { notify(e.message, 'error'); }
    finally { setSaving(false); }
  }

  function reset() {
    setDraft(Object.fromEntries(specs.map((s) => [s.key, s.default])));
    notify('Reverted to defaults — press Save to apply');
  }

  return (
    <>
      <PageHeader title="Settings" />
      <div className="content">
        {loading && <p style={{ color: 'var(--muted)' }}>Loading…</p>}

        {Object.entries(groups).map(([group, rows]) => (
          <div className="card" key={group}>
            <div className="card-head"><h2>{group}</h2></div>
            {rows.map((s) => (
              <div className="setting-row" key={s.key}>
                <div className="setting-label">
                  <div className="setting-name">{s.label}</div>
                  {s.help && <div className="setting-help">{s.help}</div>}
                </div>
                <div className="setting-input">
                  {s.kind === 'bool' ? (
                    <input type="checkbox" checked={!!draft[s.key]}
                          onChange={(e) => setDraft({ ...draft, [s.key]: e.target.checked })} />
                  ) : (
                    <input type={s.kind === 'int' ? 'number' : 'text'}
                          min={s.min ?? undefined} max={s.max ?? undefined}
                          value={draft[s.key] ?? ''}
                          onChange={(e) => setDraft({ ...draft, [s.key]: e.target.value })} />
                  )}
                  {s.kind === 'int' && (s.min != null || s.max != null) && (
                    <div className="setting-range">allowed {s.min}–{s.max}</div>
                  )}
                </div>
              </div>
            ))}
          </div>
        ))}

        {!loading && (
          <div className="card" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
            <span style={{ fontSize: 13, color: 'var(--muted)' }}>
              {dirty ? 'You have unsaved changes.' : 'Everything saved. Changes apply within ~10 seconds.'}
            </span>
            <div style={{ display: 'flex', gap: 10 }}>
              <button className="btn btn-outline btn-sm" onClick={reset}>Restore defaults</button>
              <button className="btn btn-gold btn-sm" disabled={!dirty || saving} onClick={save}>
                {saving ? 'Saving…' : 'Save changes'}
              </button>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
