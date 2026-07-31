import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import { getAgronomistCases, updateAgronomistCase, type AgronomistCaseResponse, type AgronomistCaseStatus } from './lib/api';
import { DISEASE_CLASS_OPTIONS, IRRELEVANT_LABEL } from './lib/diseaseClasses';
import './ExpertApp.css';

type Status = 'pending' | 'processing' | 'responded';
type Case = AgronomistCaseResponse & { crop: string; diagnosis: string; confidencePercent: number; displayStatus: Status };
const statusText: Record<Status, string> = { pending: 'Chưa xử lý', processing: 'Đang xử lý', responded: 'Đã phản hồi' };
const Icon = ({ children }: { children: string }) => <span className="material-symbols-outlined">{children}</span>;

function normalizeCase(item: AgronomistCaseResponse): Case {
  const label = item.predicted_label || 'Chưa xác định';
  const [rawCrop, ...rawDisease] = label.split('___');
  const clean = (value: string) => value.replaceAll('_', ' ').trim();
  const confidence = item.confidence ?? 0;
  return { ...item, crop: rawDisease.length ? clean(rawCrop) : 'Cây trồng', diagnosis: rawDisease.length ? clean(rawDisease.join(' ')) : clean(label), confidencePercent: Math.round(confidence <= 1 ? confidence * 100 : confidence), displayStatus: item.status === 'in_progress' ? 'processing' : item.status === 'answered' ? 'responded' : 'pending' };
}

function useCases() {
  const { token } = useAuth();
  const [cases, setCases] = useState<Case[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const refresh = useCallback(async () => {
    if (!token) return;
    setLoading(true); setError('');
    try { setCases((await getAgronomistCases(token)).map(normalizeCase)); }
    catch (err) { setError(err instanceof Error ? err.message : 'Không thể tải dữ liệu.'); }
    finally { setLoading(false); }
  }, [token]);
  useEffect(() => { void refresh(); }, [refresh]);
  return { cases, setCases, loading, error, refresh, token };
}

function PageTitle({ title, subtitle, queue = false, refresh }: { title: string; subtitle: string; queue?: boolean; refresh: () => void }) {
  const navigate = useNavigate();
  return <div className="ep-title"><div><span className="ep-kicker"><Icon>verified_user</Icon> KHÔNG GIAN CHUYÊN GIA</span><h1 className="font-display-lg">{title}</h1><p>{subtitle}</p></div><div className="ep-actions"><button aria-label="Làm mới" onClick={refresh}><Icon>refresh</Icon></button>{!queue && <button className="ep-primary" onClick={() => navigate('/agronomist/queue')}><Icon>inbox</Icon>Xem hàng đợi</button>}</div></div>;
}
function StatusPill({ status }: { status: Status }) { return <span className={`ep-status ${status}`}><i />{statusText[status]}</span>; }

function CaseTable({ data, onSelect, loading }: { data: Case[]; onSelect: (item: Case) => void; loading?: boolean }) {
  return <div className="ep-table-wrap"><table className="ep-table"><thead><tr><th>CA BỆNH</th><th>NGƯỜI GỬI</th><th>AI CHẨN ĐOÁN</th><th>TRẠNG THÁI</th><th>ƯU TIÊN</th><th>THỜI GIAN</th><th /></tr></thead><tbody>{data.map(item => <tr key={item.id} tabIndex={0} onClick={() => onSelect(item)} onKeyDown={e => e.key === 'Enter' && onSelect(item)}><td><div className="ep-case-icon"><Icon>potted_plant</Icon><span><b>{item.crop}</b><small>{item.id.slice(0, 8).toUpperCase()}</small></span></div></td><td>{item.sender}</td><td><b>{item.diagnosis}</b><small>{item.confidencePercent}% tin cậy</small></td><td><StatusPill status={item.displayStatus} /></td><td>{['high', 'urgent'].includes(item.priority) ? <span className="ep-priority"><Icon>flag</Icon>Cao</span> : <span className="ep-muted">Bình thường</span>}</td><td className="ep-muted">{new Intl.DateTimeFormat('vi-VN', { dateStyle: 'short', timeStyle: 'short' }).format(new Date(item.created_at))}</td><td><Icon>chevron_right</Icon></td></tr>)}</tbody></table>{!data.length && <div className="ep-empty"><Icon>{loading ? 'progress_activity' : 'search_off'}</Icon><b>{loading ? 'Đang tải dữ liệu...' : 'Không tìm thấy kết quả'}</b></div>}</div>;
}

function Modal({ item, close, onUpdated, token }: { item: Case; close: () => void; onUpdated: (item: Case) => void; token: string }) {
  const [comment, setComment] = useState(item.comment ?? '');
  const [diagnosis, setDiagnosis] = useState(item.confirmed_label ?? item.predicted_label ?? '');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  useEffect(() => { const fn = (e: KeyboardEvent) => e.key === 'Escape' && close(); addEventListener('keydown', fn); return () => removeEventListener('keydown', fn); }, [close]);
  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!diagnosis) { setError('Chọn một chẩn đoán trước khi gửi.'); return; }
    setSaving(true); setError('');
    try { const updated = await updateAgronomistCase(token, item.id, { comment, confirmed_label: diagnosis, status: 'answered' }); onUpdated(normalizeCase(updated)); close(); }
    catch (err) { setError(err instanceof Error ? err.message : 'Không thể gửi phản hồi.'); }
    finally { setSaving(false); }
  };
  return <div className="ep-backdrop" onMouseDown={e => e.target === e.currentTarget && close()}><section className="ep-modal" role="dialog" aria-modal="true"><header><div><small>CHI TIẾT CA BỆNH</small><h2>{item.id.slice(0, 8).toUpperCase()} · {item.crop}</h2></div><button onClick={close} aria-label="Đóng"><Icon>close</Icon></button></header><div className="ep-modal-grid"><div className="ep-case-preview">{item.image ? <img className="ep-plant-preview ep-plant-image" src={item.image} alt={`Ảnh ${item.crop}`} /> : <div className="ep-plant-preview"><Icon>image</Icon><span>Không có ảnh cây trồng</span></div>}<dl><div><dt>Người gửi</dt><dd>{item.sender}</dd></div><div><dt>Loại cây</dt><dd>{item.crop}</dd></div><div><dt>AI đề xuất</dt><dd>{item.diagnosis} · {item.confidencePercent}%</dd></div><div><dt>Trạng thái</dt><dd><StatusPill status={item.displayStatus} /></dd></div>{item.assignee_name && <div><dt>Đã xử lý bởi</dt><dd>{item.assignee_name}</dd></div>}</dl></div><form className="ep-form" onSubmit={submit}><h3>Phản hồi chuyên gia</h3><p>Ý kiến của bạn sẽ được lưu vào ca bệnh và gửi đến đúng đoạn chat của nông dân.</p><label>Nhận xét chuyên môn<textarea autoFocus required value={comment} onChange={e => setComment(e.target.value)} placeholder="Mô tả tình trạng và nhận định của bạn..." /></label><label>Chẩn đoán<select required value={diagnosis} onChange={e => setDiagnosis(e.target.value)}><option value="" disabled>-- Chọn chẩn đoán --</option><option value={IRRELEVANT_LABEL}>⚠ Ảnh không liên quan / không hợp lệ</option>{DISEASE_CLASS_OPTIONS.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}</select></label>{error && <p className="ep-error">{error}</p>}<button className="ep-submit" disabled={saving}>{saving ? <><Icon>progress_activity</Icon>Đang gửi...</> : <>Gửi phản hồi<Icon>send</Icon></>}</button></form></div></section></div>;
}

function lastSevenDays(cases: Case[]) {
  const days = Array.from({ length: 7 }, (_, index) => { const date = new Date(); date.setHours(0, 0, 0, 0); date.setDate(date.getDate() - (6 - index)); return date; });
  const counts = days.map(day => cases.filter(item => { const created = new Date(item.created_at); return created >= day && created < new Date(day.getTime() + 86400000); }).length);
  const max = Math.max(...counts, 1);
  return days.map((day, index) => ({ label: new Intl.DateTimeFormat('vi-VN', { weekday: 'short' }).format(day), count: counts[index], height: Math.max(5, counts[index] / max * 100) }));
}

export function ExpertDashboard() {
  const navigate = useNavigate();
  const { cases, loading, error, refresh } = useCases();
  const days = useMemo(() => lastSevenDays(cases), [cases]);
  const diseases = useMemo(() => Object.entries(cases.reduce<Record<string, number>>((all, item) => ({ ...all, [item.diagnosis]: (all[item.diagnosis] ?? 0) + 1 }), {})).sort((a, b) => b[1] - a[1]).slice(0, 3), [cases]);
  const pending = cases.filter(item => item.status === 'pending').length, processing = cases.filter(item => item.status === 'in_progress').length, answered = cases.filter(item => item.status === 'answered').length;
  const stats: [string, string, string | number, string][] = [['inbox', 'Tổng yêu cầu', cases.length, 'Từ cơ sở dữ liệu'], ['pending_actions', 'Chưa xử lý', pending, 'Cần phản hồi'], ['progress_activity', 'Đang xử lý', processing, 'Đang xem xét'], ['task_alt', 'Đã hoàn thành', answered, cases.length ? `${Math.round(answered / cases.length * 100)}% tổng yêu cầu` : '0% tổng yêu cầu']];
  return <div className="ep-page"><PageTitle title="Tổng quan chuyên gia" subtitle="Theo dõi và xử lý các yêu cầu chẩn đoán từ người dùng." refresh={() => void refresh()} />{error && <p className="ep-error">{error}</p>}<div className="ep-stats">{stats.map(([icon, label, value, note]) => <article className="ep-card ep-stat" key={label}><span className="ep-stat-icon"><Icon>{icon}</Icon></span><div><small>{label}</small><strong>{value}</strong><p>{note}</p></div></article>)}</div><div className="ep-grid"><article className="ep-card ep-chart"><div className="ep-card-head"><div><h2>Yêu cầu trong 7 ngày</h2><p>Số ca gửi đến hệ thống</p></div></div><div className="ep-bars">{days.map(day => <span key={day.label} title={`${day.count} ca`}><i style={{ height: `${day.height}%` }} /><small>{day.label}</small></span>)}</div></article><article className="ep-card ep-disease"><div className="ep-card-head"><div><h2>Phân bố bệnh</h2><p>Theo chẩn đoán thực tế</p></div></div><div className="ep-donut"><div><b>{cases.length}</b><small>Tổng ca</small></div></div><ul>{diseases.map(([name, count]) => <li key={name}><i />{name} <b>{Math.round(count / cases.length * 100)}%</b></li>)}</ul></article></div><article className="ep-card ep-recent"><div className="ep-card-head"><div><h2>Yêu cầu mới nhất</h2><p>Các ca vừa được gửi lên</p></div><button onClick={() => navigate('/agronomist/queue')}>Xem tất cả <Icon>arrow_forward</Icon></button></div><CaseTable data={cases.slice(0, 4)} loading={loading} onSelect={() => navigate('/agronomist/queue')} /></article></div>;
}

export function ExpertQueue() {
  const { cases, setCases, loading, error, refresh, token } = useCases();
  const [search, setSearch] = useState(''), [status, setStatus] = useState<'all' | AgronomistCaseStatus>('all'), [selected, setSelected] = useState<Case | null>(null);
  const data = useMemo(() => cases.filter(item => (status === 'all' || item.status === status) && `${item.sender} ${item.crop} ${item.diagnosis}`.toLowerCase().includes(search.toLowerCase())), [cases, search, status]);
  return <div className="ep-page"><PageTitle title="Hàng đợi xử lý" subtitle="Xem xét và phản hồi các ca bệnh từ người dùng." queue refresh={() => void refresh()} />{error && <p className="ep-error">{error}</p>}<article className="ep-card ep-queue"><div className="ep-filters"><label><Icon>search</Icon><input placeholder="Tìm người gửi, cây trồng, bệnh..." value={search} onChange={e => setSearch(e.target.value)} /></label><label><Icon>filter_alt</Icon><select value={status} onChange={e => setStatus(e.target.value as typeof status)}><option value="all">Tất cả trạng thái</option><option value="pending">Chưa xử lý</option><option value="in_progress">Đang xử lý</option><option value="answered">Đã phản hồi</option></select></label><span>{data.length} kết quả</span></div><CaseTable data={data} loading={loading} onSelect={setSelected} /></article>{selected && token && <Modal item={selected} token={token} close={() => setSelected(null)} onUpdated={updated => setCases(current => current.map(item => item.id === updated.id ? updated : item))} />}</div>;
}
