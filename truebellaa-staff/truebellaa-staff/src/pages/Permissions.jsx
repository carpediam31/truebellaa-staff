import { Fragment, useEffect, useMemo, useState } from 'react';
import { PageHeader } from '../components/Layout.jsx';
import { useToast } from '../components/Toast.jsx';
import { api } from '../api.js';

const EDITABLE_ROLES = ['manager', 'sales']; // 'admin' is locked — always has everything

export default function Permissions() {
  const notify = useToast();
  const [loading, setLoading] = useState(true);
  const [permissions, setPermissions] = useState([]);   // [{code, category, description}]
  const [roles, setRoles] = useState([]);                // [{code, name}]
  const [granted, setGranted] = useState({});             // { roleCode: Set(codes) } — saved (server) state
  const [draft, setDraft] = useState({});                 // { roleCode: Set(codes) } — being edited
  const [saving, setSaving] = useState(null);             // role code currently saving

  async function load() {
    setLoading(true);
    try {
      const [perms, roleList] = await Promise.all([api.listPermissions(), api.listRoles()]);
      setPermissions(perms);
      setRoles(roleList);
      const g = {};
      await Promise.all(EDITABLE_ROLES.map(async (code) => {
        if (!roleList.some((r) => r.code === code)) return;
        const res = await api.getRolePermissions(code);
        g[code] = new Set(res.permission_codes);
      }));
      setGranted(g);
      setDraft(Object.fromEntries(Object.entries(g).map(([k, v]) => [k, new Set(v)])));
    } catch (e) { notify(e.message, 'error'); }
    finally { setLoading(false); }
  }
  useEffect(() => { load(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, []);

  const categories = useMemo(() => {
    const byCat = {};
    for (const p of permissions) {
      (byCat[p.category] = byCat[p.category] || []).push(p);
    }
    return byCat;
  }, [permissions]);

  function toggle(roleCode, permCode) {
    setDraft((prev) => {
      const next = { ...prev, [roleCode]: new Set(prev[roleCode]) };
      if (next[roleCode].has(permCode)) next[roleCode].delete(permCode);
      else next[roleCode].add(permCode);
      return next;
    });
  }

  function isDirty(roleCode) {
    const a = granted[roleCode], b = draft[roleCode];
    if (!a || !b) return false;
    if (a.size !== b.size) return true;
    for (const c of a) if (!b.has(c)) return true;
    return false;
  }

  async function save(roleCode) {
    setSaving(roleCode);
    try {
      const codes = Array.from(draft[roleCode]);
      const res = await api.setRolePermissions(roleCode, codes);
      const fresh = new Set(res.permission_codes);
      setGranted((g) => ({ ...g, [roleCode]: new Set(fresh) }));
      setDraft((d) => ({ ...d, [roleCode]: new Set(fresh) }));
      notify(`${roleCode[0].toUpperCase()}${roleCode.slice(1)} permissions updated`);
    } catch (e) { notify(e.message, 'error'); }
    finally { setSaving(null); }
  }

  function discard(roleCode) {
    setDraft((d) => ({ ...d, [roleCode]: new Set(granted[roleCode]) }));
  }

  const roleLabel = (code) => roles.find((r) => r.code === code)?.name || code;

  return (
    <>
      <PageHeader title="Roles & Permissions" />
      <div className="content">
        <div className="card">
          <div className="card-head">
            <h2>Permission matrix</h2>
          </div>
          <p style={{ fontSize: 13, color: 'var(--muted)', marginBottom: 16 }}>
            Tick a box to grant that permission to the role, untick to remove it. Changes only
            apply after you press <b>Save</b> for that column — and take effect immediately for
            everyone with that role. The <b>Admin</b> role always has full access and can't be
            edited, so there's no way to accidentally lock everyone out.
          </p>

          {loading ? (
            <p style={{ color: 'var(--muted)' }}>Loading…</p>
          ) : (
            <div className="table-wrap">
              <table className="dt perm-matrix">
                <thead>
                  <tr>
                    <th>Permission</th>
                    <th style={{ textAlign: 'center' }}>Admin</th>
                    {EDITABLE_ROLES.filter((c) => roles.some((r) => r.code === c)).map((code) => (
                      <th key={code} style={{ textAlign: 'center' }}>{roleLabel(code)}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {Object.entries(categories).map(([cat, perms]) => (
                    <Fragment key={cat}>
                      <tr>
                        <td colSpan={2 + EDITABLE_ROLES.length}
                            style={{ background: '#fbfaf8', fontWeight: 600, fontSize: 11.5, textTransform: 'uppercase', letterSpacing: '.04em', color: 'var(--muted)' }}>
                          {cat}
                        </td>
                      </tr>
                      {perms.map((p) => (
                        <tr key={p.code}>
                          <td>
                            <div style={{ fontWeight: 500 }}>{p.description}</div>
                            <div style={{ fontSize: 11.5, color: 'var(--muted)' }}>{p.code}</div>
                          </td>
                          <td style={{ textAlign: 'center' }}>
                            <input type="checkbox" checked readOnly disabled title="Admin always has every permission" />
                          </td>
                          {EDITABLE_ROLES.filter((c) => roles.some((r) => r.code === c)).map((code) => (
                            <td key={code} style={{ textAlign: 'center' }}>
                              <input type="checkbox"
                                    checked={draft[code]?.has(p.code) || false}
                                    onChange={() => toggle(code, p.code)} />
                            </td>
                          ))}
                        </tr>
                      ))}
                    </Fragment>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {!loading && EDITABLE_ROLES.filter((c) => roles.some((r) => r.code === c)).map((code) => (
          isDirty(code) && (
            <div key={code} className="card" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{ fontSize: 14 }}>Unsaved changes for <b>{roleLabel(code)}</b></span>
              <div style={{ display: 'flex', gap: 10 }}>
                <button className="btn btn-outline btn-sm" onClick={() => discard(code)}>Discard</button>
                <button className="btn btn-gold btn-sm" disabled={saving === code} onClick={() => save(code)}>
                  {saving === code ? 'Saving…' : `Save ${roleLabel(code)}`}
                </button>
              </div>
            </div>
          )
        ))}
      </div>
    </>
  );
}
