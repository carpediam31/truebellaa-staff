import { useEffect, useState } from 'react';
import { PageHeader } from '../components/Layout.jsx';
import Modal from '../components/Modal.jsx';
import { useToast } from '../components/Toast.jsx';
import { api } from '../api.js';

/**
 * Edit the transactional emails (welcome, order, payment, shipping).
 *
 * Deliberately a plain HTML textarea rather than a rich-text editor: email
 * clients only support a narrow subset of HTML, and a WYSIWYG tends to emit
 * markup that silently breaks in Outlook. Preview + test-send cover the
 * "did I get it right?" question instead.
 */
export default function EmailTemplates() {
  const notify = useToast();
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(null);   // code of the open template
  const [form, setForm] = useState({ subject: '', html_body: '', is_active: true });
  const [saving, setSaving] = useState(false);
  const [preview, setPreview] = useState(null);
  const [testTo, setTestTo] = useState('');
  const [sending, setSending] = useState(false);

  async function load() {
    setLoading(true);
    try { setTemplates(await api.listEmailTemplates()); }
    catch (e) { notify(e.message, 'error'); }
    finally { setLoading(false); }
  }
  useEffect(() => { load(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, []);

  const current = templates.find((t) => t.code === selected) || null;

  function open(t) {
    setSelected(t.code);
    setForm({ subject: t.subject, html_body: t.html_body, is_active: t.is_active });
    setPreview(null);
  }

  async function save() {
    setSaving(true);
    try {
      await api.updateEmailTemplate(selected, form);
      notify('Template saved — it takes effect on the next email sent');
      load();
    } catch (e) { notify(e.message, 'error'); }
    finally { setSaving(false); }
  }

  async function doPreview() {
    try {
      // Send the in-progress form so UNSAVED edits can be previewed.
      setPreview(await api.previewEmailTemplate(selected, {
        subject: form.subject, html_body: form.html_body,
      }));
    } catch (e) { notify(e.message, 'error'); }
  }

  async function doTestSend() {
    if (!testTo.trim()) return notify('Enter an email address to send the test to', 'error');
    setSending(true);
    try {
      await api.testSendEmailTemplate(selected, {
        to_email: testTo.trim(), subject: form.subject, html_body: form.html_body,
      });
      notify(`Test email sent to ${testTo.trim()}`);
    } catch (e) { notify(e.message, 'error'); }
    finally { setSending(false); }
  }

  return (
    <>
      <PageHeader title="Email Templates" />
      <div className="content">
        <div className="card">
          <div className="card-head">
            <h2>Transactional emails</h2>
            <div className="actions">
              <button className="btn btn-outline btn-sm" onClick={load}>Refresh</button>
            </div>
          </div>
          <p style={{ fontSize: 13, color: 'var(--muted)', marginBottom: 16, lineHeight: 1.6 }}>
            Edit the wording customers receive. Use <code>{'{{placeholders}}'}</code> for
            live values — each template lists the ones it supports. Preview and send
            yourself a test before saving.
          </p>

          {loading && <p style={{ color: 'var(--muted)' }}>Loading…</p>}

          <div className="tpl-grid">
            {templates.map((t) => (
              <button key={t.code} className="tpl-card" onClick={() => open(t)}>
                <div className="tpl-name">{t.name}</div>
                <div className="tpl-desc">{t.description}</div>
                <div className="tpl-subject">{t.subject}</div>
                {!t.is_active && <span className="badge badge-disabled">Inactive</span>}
              </button>
            ))}
          </div>
        </div>
      </div>

      {current && (
        <Modal title={`Edit — ${current.name}`} onClose={() => setSelected(null)}>
          <div className="field">
            <label>Subject</label>
            <input value={form.subject}
                  onChange={(e) => setForm({ ...form, subject: e.target.value })} />
          </div>

          <div className="field">
            <label>Available placeholders</label>
            <div className="var-chips">
              {(current.variables || []).map((v) => (
                <button key={v} type="button" className="var-chip" title="Click to copy"
                        onClick={() => {
                          navigator.clipboard?.writeText(`{{${v}}}`);
                          notify(`Copied {{${v}}}`);
                        }}>
                  {`{{${v}}}`}
                </button>
              ))}
            </div>
          </div>

          <div className="field">
            <label>Body (HTML)</label>
            <textarea rows={11} value={form.html_body} style={{ fontFamily: 'monospace', fontSize: 12.5 }}
                     onChange={(e) => setForm({ ...form, html_body: e.target.value })} />
          </div>

          <div className="field">
            <label style={{ textTransform: 'none', letterSpacing: 0 }}>
              <input type="checkbox" checked={form.is_active} style={{ width: 'auto', marginRight: 8 }}
                    onChange={(e) => setForm({ ...form, is_active: e.target.checked })} />
              Active — uncheck to fall back to the built-in default wording
            </label>
          </div>

          <div className="field">
            <label>Send a test to</label>
            <div className="inline-edit">
              <input type="email" placeholder="you@example.com" value={testTo}
                    style={{ width: '100%' }}
                    onChange={(e) => setTestTo(e.target.value)} />
              <button className="btn btn-outline btn-sm" disabled={sending} onClick={doTestSend}>
                {sending ? 'Sending…' : 'Send test'}
              </button>
            </div>
          </div>

          {preview && (
            <div className="field">
              <label>Preview (with sample data)</label>
              <div className="tpl-preview-subject"><b>Subject:</b> {preview.subject}</div>
              <iframe title="preview" className="tpl-preview" srcDoc={preview.html} />
            </div>
          )}

          <div className="modal-actions">
            <button className="btn btn-outline" onClick={doPreview}>Preview</button>
            <button className="btn btn-outline" onClick={() => setSelected(null)}>Close</button>
            <button className="btn btn-primary" disabled={saving} onClick={save}>
              {saving ? 'Saving…' : 'Save changes'}
            </button>
          </div>
        </Modal>
      )}
    </>
  );
}
