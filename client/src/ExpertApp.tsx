import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import './ExpertApp.css';

type Status = 'pending' | 'processing' | 'responded';
type Case = { id:string; sender:string; crop:string; diagnosis:string; confidence:number; status:Status; priority:boolean; time:string };

const cases: Case[] = [
  {id:'VC-4021',sender:'Trần Thị Hoa',crop:'Cà chua',diagnosis:'Mốc sương',confidence:89,status:'pending',priority:true,time:'Hôm nay, 09:42'},
  {id:'VC-4020',sender:'Võ Hoàng Chí Công',crop:'Lúa',diagnosis:'Đạo ôn lá',confidence:82,status:'processing',priority:false,time:'Hôm nay, 08:15'},
  {id:'VC-4019',sender:'Nguyễn Văn Dũng',crop:'Ngô',diagnosis:'Bệnh rỉ sắt',confidence:76,status:'responded',priority:false,time:'Hôm qua, 17:24'},
  {id:'VC-4018',sender:'Lê Minh Tâm',crop:'Cà phê',diagnosis:'Rệp sáp',confidence:91,status:'pending',priority:true,time:'Hôm qua, 15:07'},
  {id:'VC-4017',sender:'Phạm Thu Hằng',crop:'Mía',diagnosis:'Than đen',confidence:68,status:'processing',priority:false,time:'28/07, 13:29'},
];

const statusText:Record<Status,string>={pending:'Chưa xử lý',processing:'Đang xử lý',responded:'Đã phản hồi'};
const Icon=({children}:{children:string})=><span className="material-symbols-outlined">{children}</span>;

function PageTitle({title,subtitle,queue=false}:{title:string;subtitle:string;queue?:boolean}){
  const navigate=useNavigate();
  return <div className="ep-title">
    <div><span className="ep-kicker"><Icon>verified_user</Icon> KHÔNG GIAN CHUYÊN GIA</span><h1 className="font-display-lg">{title}</h1><p>{subtitle}</p></div>
    <div className="ep-actions"><button aria-label="Làm mới"><Icon>refresh</Icon></button>{!queue&&<button className="ep-primary" onClick={()=>navigate('/agronomist/queue')}><Icon>inbox</Icon>Xem hàng đợi</button>}</div>
  </div>
}

function StatusPill({status}:{status:Status}){return <span className={`ep-status ${status}`}><i/>{statusText[status]}</span>}

function CaseTable({data,onSelect}:{data:Case[];onSelect:(item:Case)=>void}){
  return <div className="ep-table-wrap"><table className="ep-table"><thead><tr><th>CA BỆNH</th><th>NGƯỜI GỬI</th><th>AI CHẨN ĐOÁN</th><th>TRẠNG THÁI</th><th>ƯU TIÊN</th><th>THỜI GIAN</th><th/></tr></thead><tbody>{data.map(item=><tr key={item.id} tabIndex={0} onClick={()=>onSelect(item)} onKeyDown={e=>e.key==='Enter'&&onSelect(item)}>
    <td><div className="ep-case-icon"><Icon>potted_plant</Icon><span><b>{item.crop}</b><small>{item.id}</small></span></div></td>
    <td>{item.sender}</td><td><b>{item.diagnosis}</b><small>{item.confidence}% tin cậy</small></td><td><StatusPill status={item.status}/></td>
    <td>{item.priority?<span className="ep-priority"><Icon>flag</Icon>Cao</span>:<span className="ep-muted">Bình thường</span>}</td><td className="ep-muted">{item.time}</td><td><Icon>chevron_right</Icon></td>
  </tr>)}</tbody></table>{data.length===0&&<div className="ep-empty"><Icon>search_off</Icon><b>Không tìm thấy kết quả</b></div>}</div>
}

function Modal({item,close}:{item:Case;close:()=>void}){
  const [sent,setSent]=useState(false);
  useEffect(()=>{const fn=(e:KeyboardEvent)=>e.key==='Escape'&&close();addEventListener('keydown',fn);return()=>removeEventListener('keydown',fn)},[close]);
  return <div className="ep-backdrop" onMouseDown={e=>e.target===e.currentTarget&&close()}><section className="ep-modal" role="dialog" aria-modal="true">
    <header><div><small>CHI TIẾT CA BỆNH</small><h2>{item.id} · {item.crop}</h2></div><button onClick={close} aria-label="Đóng"><Icon>close</Icon></button></header>
    <div className="ep-modal-grid"><div className="ep-case-preview"><div className="ep-plant-preview"><Icon>image</Icon><span>Ảnh cây trồng của người dùng</span></div><dl><div><dt>Người gửi</dt><dd>{item.sender}</dd></div><div><dt>Loại cây</dt><dd>{item.crop}</dd></div><div><dt>AI đề xuất</dt><dd>{item.diagnosis} · {item.confidence}%</dd></div><div><dt>Trạng thái</dt><dd><StatusPill status={item.status}/></dd></div></dl></div>
    <form className="ep-form" onSubmit={e=>{e.preventDefault();setSent(true)}}><h3>Phản hồi chuyên gia</h3><p>Ý kiến của bạn sẽ được gửi trực tiếp tới người dùng.</p><label>Nhận xét chuyên môn<textarea autoFocus required placeholder="Mô tả tình trạng và nhận định của bạn..."/></label><div><label>Chẩn đoán<input defaultValue={item.diagnosis}/></label><label>Mức độ<select defaultValue="medium"><option value="light">Nhẹ</option><option value="medium">Trung bình</option><option value="heavy">Nặng</option></select></label></div><label>Phương pháp xử lý<textarea placeholder="Hướng dẫn điều trị và phòng ngừa..."/></label><label className="ep-check"><input type="checkbox" defaultChecked/><span><b>Đánh dấu hoàn thành</b><small>Đưa nhãn đã xác nhận vào tập huấn luyện</small></span></label><button className="ep-submit" disabled={sent}>{sent?<><Icon>check_circle</Icon>Đã gửi phản hồi</>:<>Gửi phản hồi<Icon>send</Icon></>}</button></form></div>
  </section></div>
}

export function ExpertDashboard(){
  const navigate=useNavigate();
  return <div className="ep-page"><PageTitle title="Tổng quan chuyên gia" subtitle="Theo dõi và xử lý các yêu cầu chẩn đoán từ người dùng."/>
    <div className="ep-stats">{[
      ['inbox','Tổng yêu cầu','38','+12% tuần này'],['pending_actions','Chưa xử lý','2','Cần phản hồi'],['progress_activity','Đang xử lý','6','Đang xem xét'],['task_alt','Đã hoàn thành','30','79% tổng yêu cầu']
    ].map(([icon,label,value,note])=><article className="ep-card ep-stat" key={label}><span className="ep-stat-icon"><Icon>{icon}</Icon></span><div><small>{label}</small><strong>{value}</strong><p>{note}</p></div></article>)}</div>
    <div className="ep-grid"><article className="ep-card ep-chart"><div className="ep-card-head"><div><h2>Yêu cầu trong 7 ngày</h2><p>Số ca gửi đến hệ thống</p></div><button>7 ngày qua <Icon>expand_more</Icon></button></div><div className="ep-bars">{[42,58,36,66,52,78,88].map((h,i)=><span key={i}><i style={{height:`${h}%`}}/><small>{['T2','T3','T4','T5','T6','T7','CN'][i]}</small></span>)}</div></article>
    <article className="ep-card ep-disease"><div className="ep-card-head"><div><h2>Phân bố bệnh</h2><p>Theo chẩn đoán gần đây</p></div></div><div className="ep-donut"><div><b>38</b><small>Tổng ca</small></div></div><ul><li><i/>Đạo ôn <b>34%</b></li><li><i/>Rỉ sắt <b>26%</b></li><li><i/>Mốc sương <b>22%</b></li></ul></article></div>
    <article className="ep-card ep-recent"><div className="ep-card-head"><div><h2>Yêu cầu mới nhất</h2><p>Các ca vừa được gửi lên</p></div><button onClick={()=>navigate('/agronomist/queue')}>Xem tất cả <Icon>arrow_forward</Icon></button></div><CaseTable data={cases.slice(0,4)} onSelect={()=>navigate('/agronomist/queue')}/></article>
  </div>
}

export function ExpertQueue(){
  const [search,setSearch]=useState('');const [status,setStatus]=useState('all');const [selected,setSelected]=useState<Case|null>(null);
  const data=useMemo(()=>cases.filter(x=>(status==='all'||x.status===status)&&`${x.sender} ${x.crop} ${x.diagnosis}`.toLowerCase().includes(search.toLowerCase())),[search,status]);
  return <div className="ep-page"><PageTitle title="Hàng đợi xử lý" subtitle="Xem xét và phản hồi các ca bệnh từ người dùng." queue/>
    <article className="ep-card ep-queue"><div className="ep-filters"><label><Icon>search</Icon><input placeholder="Tìm người gửi, cây trồng, bệnh..." value={search} onChange={e=>setSearch(e.target.value)}/></label><label><Icon>filter_alt</Icon><select value={status} onChange={e=>setStatus(e.target.value)}><option value="all">Tất cả trạng thái</option><option value="pending">Chưa xử lý</option><option value="processing">Đang xử lý</option><option value="responded">Đã phản hồi</option></select></label><span>{data.length} kết quả</span></div><CaseTable data={data} onSelect={setSelected}/></article>{selected&&<Modal item={selected} close={()=>setSelected(null)}/>}
  </div>
}
