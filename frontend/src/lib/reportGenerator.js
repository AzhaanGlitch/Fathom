// ============================================================
// reportGenerator.js — Professional PDF Report Engine
// Uses jsPDF native vector drawing + Canvas chart images
// ============================================================
import { jsPDF } from 'jspdf';
import 'jspdf-autotable';

// ── DESIGN SYSTEM ───────────────────────────────────────────
const C = {
  primaryDark: [21, 37, 63],
  primary:     [30, 58, 95],
  accent:      [49, 130, 206],
  success:     [34, 139, 84],
  warning:     [194, 140, 28],
  danger:      [198, 53, 53],
  textDark:    [17, 24, 39],
  textMed:     [75, 85, 99],
  textLight:   [156, 163, 175],
  white:       [255, 255, 255],
  bgLight:     [249, 250, 251],
  border:      [229, 231, 235],
};
const M  = { top: 18, right: 20, bottom: 25, left: 20 };
const PW = 210, PH = 297;
const CW = PW - M.left - M.right;

// ── HELPERS ─────────────────────────────────────────────────
const fmtDate = () => new Intl.DateTimeFormat('en-IN', { day:'2-digit', month:'long', year:'numeric' }).format(new Date());
const rptId   = () => { const d = new Date(); return `RPT-${d.getFullYear()}${String(d.getMonth()+1).padStart(2,'0')}${String(d.getDate()).padStart(2,'0')}-${Math.random().toString(36).slice(2,8).toUpperCase()}`; };
const trunc   = (t, n) => (!t ? '' : t.length > n ? t.slice(0, n-2)+'..' : t);

function hexToRgbArr(hex) {
  const m = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return m ? [parseInt(m[1],16), parseInt(m[2],16), parseInt(m[3],16)] : [107,114,128];
}

// ── PAGE BREAK ──────────────────────────────────────────────
function needsPage(doc, y, need, footerCb, pg) {
  if (y + need > PH - M.bottom - 8) {
    if (footerCb) footerCb(doc, pg.n);
    doc.addPage();
    pg.n++;
    return M.top + 5;
  }
  return y;
}

// ── HEADER ──────────────────────────────────────────────────
function drawHeader(doc, title, date, id) {
  doc.setFillColor(...C.primaryDark);
  doc.rect(0, 0, PW, 32, 'F');
  doc.setFillColor(...C.accent);
  doc.rect(0, 32, PW, 1.2, 'F');

  doc.setTextColor(...C.white);
  doc.setFont('helvetica','bold'); doc.setFontSize(18);
  doc.text('FATHOM', M.left, 14);
  doc.setFont('helvetica','normal'); doc.setFontSize(7);
  doc.setTextColor(180,200,230);
  doc.text('Faculty Analytics & Teaching Hub for Outcomes Management', M.left, 19.5);

  doc.setTextColor(...C.white);
  doc.setFont('helvetica','bold'); doc.setFontSize(13);
  doc.text(title, M.left, 28);

  doc.setFont('helvetica','normal'); doc.setFontSize(7);
  doc.setTextColor(200,210,230);
  doc.text(`Generated: ${date}`, PW-M.right, 12, {align:'right'});
  doc.text(`Report ID: ${id}`, PW-M.right, 17, {align:'right'});
  doc.setFontSize(6.5); doc.setTextColor(150,170,200);
  doc.text('CONFIDENTIAL', PW-M.right, 28, {align:'right'});
  return 38;
}

// ── FOOTER ──────────────────────────────────────────────────
function drawFooter(doc, pageNum, instName) {
  const y = PH - 12;
  doc.setDrawColor(...C.border); doc.setLineWidth(0.3);
  doc.line(M.left, y-4, PW-M.right, y-4);
  doc.setFont('helvetica','normal'); doc.setFontSize(6.5);
  doc.setTextColor(...C.textLight);
  doc.text(`\u00A9 ${instName||'Fathom Education'} ${new Date().getFullYear()}. All Rights Reserved.`, M.left, y);
  doc.text('For Internal Use Only', PW/2, y, {align:'center'});
  doc.text(`Page ${pageNum}`, PW-M.right, y, {align:'right'});
}

// ── SECTION TITLE ───────────────────────────────────────────
function sectionTitle(doc, y, title, sub) {
  doc.setFillColor(...C.accent);
  doc.rect(M.left, y, 3, 5, 'F');
  doc.setFont('helvetica','bold'); doc.setFontSize(11);
  doc.setTextColor(...C.textDark);
  doc.text(title, M.left+6, y+4);
  if (sub) {
    doc.setFont('helvetica','normal'); doc.setFontSize(7.5);
    doc.setTextColor(...C.textLight);
    doc.text(sub, M.left+6, y+9);
    return y+14;
  }
  return y+9;
}

// ── INFO BOX ────────────────────────────────────────────────
function infoBox(doc, y, left, right) {
  const rows = Math.max(left.length, right.length);
  const h = rows * 10 + 8;
  doc.setFillColor(...C.bgLight); doc.setDrawColor(...C.border); doc.setLineWidth(0.3);
  doc.roundedRect(M.left, y, CW, h, 2, 2, 'FD');
  const mid = M.left + CW/2;
  doc.line(mid, y+4, mid, y+h-4);

  let ly = y+7;
  left.forEach(it => {
    doc.setFont('helvetica','normal'); doc.setFontSize(6.5); doc.setTextColor(...C.textLight);
    doc.text(it.label, M.left+6, ly);
    doc.setFont('helvetica','bold'); doc.setFontSize(8.5); doc.setTextColor(...C.textDark);
    doc.text(String(it.value||'N/A'), M.left+6, ly+5);
    ly += 11;
  });
  let ry = y+7;
  right.forEach(it => {
    doc.setFont('helvetica','normal'); doc.setFontSize(6.5); doc.setTextColor(...C.textLight);
    doc.text(it.label, mid+6, ry);
    doc.setFont('helvetica','bold'); doc.setFontSize(8.5); doc.setTextColor(...C.textDark);
    doc.text(String(it.value||'N/A'), mid+6, ry+5);
    ry += 11;
  });
  return y+h+4;
}

// ── METRIC CARDS ────────────────────────────────────────────
function metricCards(doc, y, items) {
  const gap = 4, cw = (CW-(items.length-1)*gap)/items.length, ch = 24;
  items.forEach((m, i) => {
    const x = M.left + i*(cw+gap);
    const ac = m.color || C.accent;
    doc.setFillColor(...C.white); doc.setDrawColor(...C.border); doc.setLineWidth(0.3);
    doc.roundedRect(x, y, cw, ch, 2, 2, 'FD');
    doc.setFillColor(...ac); doc.rect(x+0.3, y+0.3, cw-0.6, 2.2, 'F');
    doc.setFont('helvetica','normal'); doc.setFontSize(7); doc.setTextColor(...C.textLight);
    doc.text(m.label, x+4, y+9);
    doc.setFont('helvetica','bold'); doc.setFontSize(16); doc.setTextColor(...C.textDark);
    doc.text(String(m.value), x+4, y+20);
    if (m.sub) {
      doc.setFont('helvetica','normal'); doc.setFontSize(6.5); doc.setTextColor(...C.textLight);
      doc.text(m.sub, x+cw-4, y+20, {align:'right'});
    }
  });
  return y+ch+6;
}

// ── INSIGHT BOX ─────────────────────────────────────────────
function insightBox(doc, y, icon, text) {
  const lines = doc.splitTextToSize(text, CW-16);
  const bh = lines.length*4.5+10;
  doc.setFillColor(245,248,255); doc.setDrawColor(200,215,240); doc.setLineWidth(0.3);
  doc.roundedRect(M.left, y, CW, bh, 2, 2, 'FD');
  doc.setFillColor(...C.accent); doc.rect(M.left, y, 3, bh, 'F');
  doc.setFont('helvetica','bold'); doc.setFontSize(7.5); doc.setTextColor(...C.accent);
  doc.text(icon||'KEY INSIGHT', M.left+7, y+6);
  doc.setFont('helvetica','normal'); doc.setFontSize(7.5); doc.setTextColor(...C.textMed);
  doc.text(lines, M.left+7, y+12);
  return y+bh+4;
}

// ============================================================
// CANVAS CHART RENDERERS — sharp images for PDF embedding
// ============================================================

function _barChart(data, w=650, h=280) {
  const cvs = document.createElement('canvas');
  const s = 2; cvs.width = w*s; cvs.height = h*s;
  const ctx = cvs.getContext('2d'); ctx.scale(s,s);
  ctx.fillStyle='#fff'; ctx.fillRect(0,0,w,h);

  const pad = {t:20,r:25,b:40,l:45};
  const cw = w-pad.l-pad.r, ch = h-pad.t-pad.b;
  const mx = Math.max(...data.map(d=>d.value),1);
  const bw = Math.min(cw/data.length*0.55, 55);
  const bg = (cw - bw*data.length) / (data.length+1);

  for (let i=0;i<=5;i++) {
    const gy = pad.t+(ch/5)*i;
    ctx.strokeStyle='#f0f0f0'; ctx.lineWidth=1;
    ctx.beginPath(); ctx.moveTo(pad.l,gy); ctx.lineTo(w-pad.r,gy); ctx.stroke();
    ctx.fillStyle='#9ca3af'; ctx.font='11px sans-serif'; ctx.textAlign='right';
    ctx.fillText(String(Math.round(mx*(1-i/5))), pad.l-8, gy+4);
  }

  data.forEach((it,i) => {
    const x = pad.l+bg+i*(bw+bg);
    const bh = (it.value/mx)*ch, by = pad.t+ch-bh;
    const clr = typeof it.color==='string'? it.color : '#3b82f6';
    ctx.fillStyle=clr;
    const r=4;
    ctx.beginPath();
    ctx.moveTo(x,by+bh); ctx.lineTo(x,by+r);
    ctx.quadraticCurveTo(x,by,x+r,by);
    ctx.lineTo(x+bw-r,by); ctx.quadraticCurveTo(x+bw,by,x+bw,by+r);
    ctx.lineTo(x+bw,by+bh); ctx.closePath(); ctx.fill();
    if(it.value>0){ctx.fillStyle='#374151';ctx.font='bold 12px sans-serif';ctx.textAlign='center';ctx.fillText(String(it.value),x+bw/2,by-6);}
    ctx.fillStyle='#6b7280';ctx.font='11px sans-serif';ctx.textAlign='center';
    ctx.fillText(trunc(it.category||it.name||'',14),x+bw/2,h-pad.b+18);
  });
  ctx.strokeStyle='#e5e7eb';ctx.lineWidth=1.5;ctx.beginPath();ctx.moveTo(pad.l,pad.t);ctx.lineTo(pad.l,pad.t+ch);ctx.lineTo(w-pad.r,pad.t+ch);ctx.stroke();
  return cvs.toDataURL('image/png');
}

function _hBarChart(data, w=650, h=280) {
  const cvs=document.createElement('canvas');const s=2;cvs.width=w*s;cvs.height=h*s;
  const ctx=cvs.getContext('2d');ctx.scale(s,s);
  ctx.fillStyle='#fff';ctx.fillRect(0,0,w,h);
  const pad={t:15,r:40,b:15,l:90};
  const cw=w-pad.l-pad.r, ch=h-pad.t-pad.b;
  const mx=Math.max(...data.map(d=>d.score||d.value||0),1);
  const bh=Math.min(ch/data.length*0.65,30);
  const bg=(ch-bh*data.length)/(data.length+1);
  const colors=['#3b82f6','#10b981','#8b5cf6','#f59e0b','#ef4444','#06b6d4','#ec4899','#84cc16'];
  data.forEach((it,i)=>{
    const y=pad.t+bg+i*(bh+bg), v=it.score||it.value||0, bW=(v/mx)*cw;
    ctx.fillStyle='#f3f4f6';ctx.fillRect(pad.l,y,cw,bh);
    ctx.fillStyle=colors[i%colors.length];
    ctx.beginPath();const r=3;
    ctx.moveTo(pad.l+r,y);ctx.lineTo(pad.l+bW-r,y);ctx.quadraticCurveTo(pad.l+bW,y,pad.l+bW,y+r);
    ctx.lineTo(pad.l+bW,y+bh-r);ctx.quadraticCurveTo(pad.l+bW,y+bh,pad.l+bW-r,y+bh);
    ctx.lineTo(pad.l+r,y+bh);ctx.quadraticCurveTo(pad.l,y+bh,pad.l,y+bh-r);
    ctx.lineTo(pad.l,y+r);ctx.quadraticCurveTo(pad.l,y,pad.l+r,y);ctx.closePath();ctx.fill();
    ctx.fillStyle='#374151';ctx.font='bold 11px sans-serif';ctx.textAlign='left';
    ctx.fillText(v.toFixed?v.toFixed(1):String(v),pad.l+bW+6,y+bh/2+4);
    ctx.fillStyle='#4b5563';ctx.font='11px sans-serif';ctx.textAlign='right';
    ctx.fillText(trunc(it.name,12),pad.l-6,y+bh/2+4);
  });
  return cvs.toDataURL('image/png');
}

function _donutChart(data, sz=260) {
  const cvs=document.createElement('canvas');const s=2;cvs.width=sz*s;cvs.height=sz*s;
  const ctx=cvs.getContext('2d');ctx.scale(s,s);
  ctx.fillStyle='#fff';ctx.fillRect(0,0,sz,sz);
  const cx=sz/2,cy=sz/2,oR=sz/2-25,iR=oR*0.58;
  const total=data.reduce((a,d)=>a+(d.value||0),0);
  const dColors=['#10b981','#8b5cf6','#3b82f6','#6b7280','#ef4444','#f59e0b'];
  if(!total){
    ctx.strokeStyle='#e5e7eb';ctx.lineWidth=oR-iR;ctx.beginPath();ctx.arc(cx,cy,(oR+iR)/2,0,Math.PI*2);ctx.stroke();
    ctx.fillStyle='#9ca3af';ctx.font='13px sans-serif';ctx.textAlign='center';ctx.fillText('No Data',cx,cy+5);
    return cvs.toDataURL('image/png');
  }
  let sa=-Math.PI/2;
  data.filter(d=>d.value>0).forEach((it,i)=>{
    const ang=(it.value/total)*Math.PI*2;
    ctx.beginPath();ctx.arc(cx,cy,oR,sa,sa+ang);ctx.arc(cx,cy,iR,sa+ang,sa,true);ctx.closePath();
    ctx.fillStyle=it.color||dColors[i%dColors.length];ctx.fill();
    const mid=sa+ang/2,lr=oR+14;
    const lx=cx+Math.cos(mid)*lr,ly=cy+Math.sin(mid)*lr;
    ctx.fillStyle='#4b5563';ctx.font='9px sans-serif';
    ctx.textAlign=(mid>Math.PI/2||mid<-Math.PI/2)?'right':'left';
    ctx.fillText(`${it.name}: ${it.value}`,lx,ly);
    sa+=ang;
  });
  ctx.fillStyle='#111827';ctx.font='bold 20px sans-serif';ctx.textAlign='center';ctx.fillText(String(total),cx,cy+3);
  ctx.fillStyle='#9ca3af';ctx.font='10px sans-serif';ctx.fillText('Total',cx,cy+15);
  return cvs.toDataURL('image/png');
}

function _lineChart(data, w=650, h=280) {
  const cvs=document.createElement('canvas');const s=2;cvs.width=w*s;cvs.height=h*s;
  const ctx=cvs.getContext('2d');ctx.scale(s,s);
  ctx.fillStyle='#fff';ctx.fillRect(0,0,w,h);
  if(!data||!data.length){ctx.fillStyle='#9ca3af';ctx.font='13px sans-serif';ctx.textAlign='center';ctx.fillText('No trend data',w/2,h/2);return cvs.toDataURL('image/png');}
  const pad={t:25,r:30,b:40,l:50};
  const cw=w-pad.l-pad.r, ch=h-pad.t-pad.b;
  const vals=data.map(d=>Number(d.sessions||d.value||0));
  const mx=Math.max(...vals,1);
  for(let i=0;i<=4;i++){const gy=pad.t+(ch/4)*i;ctx.strokeStyle='#f3f4f6';ctx.lineWidth=1;ctx.beginPath();ctx.moveTo(pad.l,gy);ctx.lineTo(w-pad.r,gy);ctx.stroke();ctx.fillStyle='#9ca3af';ctx.font='10px sans-serif';ctx.textAlign='right';ctx.fillText(String(Math.round(mx*(1-i/4))),pad.l-8,gy+4);}
  const pts=data.map((d,i)=>({x:pad.l+(i/Math.max(data.length-1,1))*cw,y:pad.t+ch-(Number(d.sessions||d.value||0)/mx)*ch}));
  // area
  const grad=ctx.createLinearGradient(0,pad.t,0,pad.t+ch);
  grad.addColorStop(0,'rgba(49,130,206,0.25)');grad.addColorStop(1,'rgba(49,130,206,0.02)');
  ctx.beginPath();ctx.moveTo(pts[0].x,pad.t+ch);
  pts.forEach(p=>ctx.lineTo(p.x,p.y));ctx.lineTo(pts[pts.length-1].x,pad.t+ch);ctx.closePath();ctx.fillStyle=grad;ctx.fill();
  // line
  ctx.beginPath();pts.forEach((p,i)=>{i===0?ctx.moveTo(p.x,p.y):ctx.lineTo(p.x,p.y);});
  ctx.strokeStyle='#3182ce';ctx.lineWidth=2.5;ctx.stroke();
  // dots
  pts.forEach(p=>{ctx.beginPath();ctx.arc(p.x,p.y,3,0,Math.PI*2);ctx.fillStyle='#3182ce';ctx.fill();ctx.strokeStyle='#fff';ctx.lineWidth=1.5;ctx.stroke();});
  // x labels
  const lbl=Math.max(1,Math.floor(data.length/8));
  data.forEach((d,i)=>{if(i%lbl===0||i===data.length-1){ctx.fillStyle='#9ca3af';ctx.font='9px sans-serif';ctx.textAlign='center';ctx.save();ctx.translate(pts[i].x,h-pad.b+16);ctx.rotate(-0.4);ctx.fillText(d.date||'',0,0);ctx.restore();}});
  return cvs.toDataURL('image/png');
}

function _scoreGauge(score, max=10, sz=180) {
  const cvs=document.createElement('canvas');const s=2;cvs.width=sz*s;cvs.height=sz*s;
  const ctx=cvs.getContext('2d');ctx.scale(s,s);
  ctx.fillStyle='#fff';ctx.fillRect(0,0,sz,sz);
  const cx=sz/2,cy=sz/2,r=sz/2-18;
  // track
  ctx.beginPath();ctx.arc(cx,cy,r,0,Math.PI*2);ctx.strokeStyle='#eef2f7';ctx.lineWidth=12;ctx.stroke();
  // progress
  const pct=Math.min(score/max,1);
  const endAng=-Math.PI/2+pct*Math.PI*2;
  ctx.beginPath();ctx.arc(cx,cy,r,-Math.PI/2,endAng);
  const g=ctx.createLinearGradient(0,0,sz,sz);g.addColorStop(0,'#3b82f6');g.addColorStop(1,'#8b5cf6');
  ctx.strokeStyle=g;ctx.lineWidth=12;ctx.lineCap='round';ctx.stroke();
  // text
  ctx.fillStyle='#111827';ctx.font='bold 28px sans-serif';ctx.textAlign='center';ctx.fillText(score.toFixed(1),cx,cy+5);
  ctx.fillStyle='#9ca3af';ctx.font='11px sans-serif';ctx.fillText(`/ ${max}`,cx,cy+20);
  return cvs.toDataURL('image/png');
}

// ============================================================
// FACULTY INDIVIDUAL REPORT
// ============================================================
export async function generateFacultyReport({ mentor, stats, sessionBreakdown, recentSessions, instituteName }) {
  const doc = new jsPDF({ unit:'mm', format:'a4' });
  const pg = { n:1 };
  const date = fmtDate(), id = rptId();
  const mkFooter = (d, n) => drawFooter(d, n, instituteName);

  // ── PAGE 1 ──────────────────────────────────────────────
  let y = drawHeader(doc, 'Faculty Performance Report', date, id);

  // Info box
  y = sectionTitle(doc, y, 'Faculty & Institution Details', 'Report subject identification');
  y = infoBox(doc, y, [
    { label: 'Faculty Name', value: mentor?.name || 'Unknown' },
    { label: 'Email', value: mentor?.email || 'N/A' },
    { label: 'Expertise', value: (mentor?.expertise||[]).slice(0,3).join(', ') || 'N/A' }
  ], [
    { label: 'Institution', value: instituteName || 'Fathom Education' },
    { label: 'Report Date', value: date },
    { label: 'Report Period', value: 'All Time' }
  ]);

  // Metrics
  y = sectionTitle(doc, y, 'Key Performance Indicators', 'Summary of critical metrics');
  const cr = stats.totalSessions ? Math.round((stats.completedSessions/stats.totalSessions)*100) : 0;
  y = metricCards(doc, y, [
    { label: 'Total Sessions', value: stats.totalSessions, color: C.accent },
    { label: 'Average Score', value: stats.averageScore.toFixed(1), sub: 'out of 10', color: C.success },
    { label: 'Completed', value: stats.completedSessions, color: [16,185,129] },
    { label: 'Completion Rate', value: `${cr}%`, color: C.warning }
  ]);

  // KPI Insight
  const kpiText = stats.averageScore >= 8
    ? `Excellent performance — the faculty maintains an average score of ${stats.averageScore.toFixed(1)}/10 across ${stats.totalSessions} session(s), with a ${cr}% completion rate. This indicates consistently high-quality teaching delivery.`
    : stats.averageScore >= 5
    ? `Satisfactory performance — the average score of ${stats.averageScore.toFixed(1)}/10 across ${stats.totalSessions} session(s) shows room for growth. Focus on engagement techniques and clarity could improve outcomes.`
    : `The faculty has ${stats.totalSessions} session(s) recorded with an average score of ${stats.averageScore.toFixed(1)}/10. ${stats.totalSessions === 0 ? 'No sessions have been recorded yet — consider scheduling an initial session to begin performance tracking.' : 'Targeted mentorship and pedagogical training are recommended to improve teaching effectiveness.'}`;
  y = insightBox(doc, y, 'PERFORMANCE INSIGHT', kpiText);

  // Bar chart
  y = needsPage(doc, y, 65, mkFooter, pg);
  y = sectionTitle(doc, y, 'Session Activity Breakdown', 'Distribution of sessions by current status');
  if (sessionBreakdown && sessionBreakdown.length) {
    const img = _barChart(sessionBreakdown, 650, 260);
    doc.addImage(img, 'PNG', M.left, y, CW, 52);
    y += 54;
  }

  // Session insight
  const bd = sessionBreakdown || [];
  const proc = bd.find(b => (b.category||b.name)==='Processing');
  const pend = bd.find(b => (b.category||b.name)==='Pending');
  const actText = `Of the ${stats.totalSessions} total sessions, ${stats.completedSessions} have been fully evaluated. ${proc?.value ? `${proc.value} session(s) are currently being processed. ` : ''}${pend?.value ? `${pend.value} session(s) are awaiting analysis.` : 'All submitted sessions have been processed.'}`;
  y = insightBox(doc, y, 'ACTIVITY ANALYSIS', actText);

  // Score gauge + summary side by side
  y = needsPage(doc, y, 55, mkFooter, pg);
  y = sectionTitle(doc, y, 'Overall Performance Score', 'Aggregated evaluation score');
  const gaugeImg = _scoreGauge(stats.averageScore, 10, 160);
  doc.addImage(gaugeImg, 'PNG', M.left+5, y, 40, 40);

  // Rating text beside gauge
  doc.setFont('helvetica','bold'); doc.setFontSize(10); doc.setTextColor(...C.textDark);
  const rating = stats.averageScore >= 9 ? 'Outstanding' : stats.averageScore >= 7 ? 'Very Good' : stats.averageScore >= 5 ? 'Satisfactory' : stats.averageScore > 0 ? 'Needs Improvement' : 'Not Rated';
  doc.text(`Rating: ${rating}`, M.left+52, y+12);
  doc.setFont('helvetica','normal'); doc.setFontSize(8); doc.setTextColor(...C.textMed);
  const ratingLines = doc.splitTextToSize(
    `This score is calculated as the weighted average across all evaluated sessions. It reflects the faculty member's overall teaching effectiveness, including clarity, engagement, subject mastery, and pedagogical approach.`,
    CW - 55
  );
  doc.text(ratingLines, M.left+52, y+18);
  y += 46;

  // Recent Sessions Table
  y = needsPage(doc, y, 50, mkFooter, pg);
  y = sectionTitle(doc, y, 'Session History', 'Recent teaching sessions and their evaluation status');
  const tableData = (recentSessions || []).map(s => [
    trunc(s.title || 'Untitled', 28),
    s.topic || 'N/A',
    s.status || 'N/A',
    new Date(s.created_at).toLocaleDateString('en-IN'),
    s.duration ? `${Math.floor(s.duration/60)}m ${s.duration%60}s` : 'N/A'
  ]);

  if (tableData.length > 0) {
    doc.autoTable({
      startY: y,
      head: [['Session Title','Topic','Status','Date','Duration']],
      body: tableData,
      theme: 'grid',
      styles: { fontSize:7.5, cellPadding:3, textColor:C.textDark, lineColor:C.border, lineWidth:0.2 },
      headStyles: { fillColor:C.primaryDark, textColor:C.white, fontStyle:'bold', fontSize:7.5 },
      alternateRowStyles: { fillColor:C.bgLight },
      margin: { left:M.left, right:M.right },
      tableLineColor: C.border,
    });
    y = doc.lastAutoTable.finalY + 6;
  } else {
    doc.setFont('helvetica','italic'); doc.setFontSize(8); doc.setTextColor(...C.textLight);
    doc.text('No sessions have been recorded yet.', M.left+6, y+6);
    y += 14;
  }

  // Footer for all pages
  const totalPages = doc.internal.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    drawFooter(doc, i, instituteName);
  }

  const fn = `${(mentor?.name||'Faculty').replace(/\s+/g,'_')}_Performance_Report.pdf`;
  doc.save(fn);
}

// ============================================================
// INSTITUTIONAL ANALYTICS REPORT
// ============================================================
export async function generateInstitutionalReport({ stats, mentorPerformance, scoreDistribution, sessionsByStatus, trendData, instituteName }) {
  const doc = new jsPDF({ unit:'mm', format:'a4' });
  const pg = { n:1 };
  const date = fmtDate(), id = rptId();
  const mkFooter = (d, n) => drawFooter(d, n, instituteName);

  // ═══ PAGE 1 ═══════════════════════════════════════════
  let y = drawHeader(doc, 'Institutional Analytics Report', date, id);

  y = sectionTitle(doc, y, 'Administrative & Institution Details');
  y = infoBox(doc, y, [
    { label: 'Prepared For', value: 'Institution Administration' },
    { label: 'Report Type', value: 'Comprehensive Analytics' },
  ], [
    { label: 'Institution', value: instituteName || 'Fathom Education' },
    { label: 'Report Period', value: 'Cumulative / All Time' },
  ]);

  // Metrics
  y = sectionTitle(doc, y, 'Institution-Wide Key Metrics', 'Aggregate performance across all registered mentors');
  y = metricCards(doc, y, [
    { label: 'Total Mentors', value: stats.totalMentors, color: C.accent },
    { label: 'Total Sessions', value: stats.totalSessions, color: [139,92,246] },
    { label: 'Average Score', value: stats.averageScore.toFixed(1), sub: 'out of 10', color: C.success },
    { label: 'Completion Rate', value: `${stats.completionRate.toFixed(0)}%`, color: C.warning },
  ]);

  const instText = `The institution has ${stats.totalMentors} registered mentor(s) who have collectively conducted ${stats.totalSessions} teaching session(s). The average evaluation score is ${stats.averageScore.toFixed(1)}/10 with a ${stats.completionRate.toFixed(0)}% session completion rate. ${stats.averageScore >= 7 ? 'This indicates strong institutional teaching standards.' : 'There is opportunity to enhance institutional teaching effectiveness through targeted faculty development.'}`;
  y = insightBox(doc, y, 'INSTITUTIONAL OVERVIEW', instText);

  // Performance Trend
  if (trendData && trendData.length > 0) {
    y = needsPage(doc, y, 68, mkFooter, pg);
    y = sectionTitle(doc, y, 'Performance Trend', 'Session volume over the selected time period');
    const tImg = _lineChart(trendData, 650, 250);
    doc.addImage(tImg, 'PNG', M.left, y, CW, 50);
    y += 52;
    const recent = trendData.slice(-7);
    const avg7 = recent.reduce((s,d) => s + Number(d.sessions||0), 0) / recent.length;
    y = insightBox(doc, y, 'TREND ANALYSIS', `Over the most recent 7 data points, the average session count is ${avg7.toFixed(1)} per period. ${avg7 > 5 ? 'This shows healthy engagement across the platform.' : 'Consider encouraging mentors to increase session frequency for richer data.'}`);
  }

  // Sessions by Status (donut)
  if (sessionsByStatus && sessionsByStatus.length) {
    y = needsPage(doc, y, 65, mkFooter, pg);
    y = sectionTitle(doc, y, 'Sessions by Status', 'Current distribution of session processing states');
    const dImg = _donutChart(sessionsByStatus, 240);
    doc.addImage(dImg, 'PNG', M.left + CW/2 - 24, y, 48, 48);
    y += 52;
    const completed = sessionsByStatus.find(s => s.name === 'Completed');
    const failed = sessionsByStatus.find(s => s.name === 'Failed');
    y = insightBox(doc, y, 'STATUS INSIGHT', `${completed?.value||0} sessions have been fully completed and evaluated. ${failed?.value ? `${failed.value} session(s) failed processing and may require re-upload.` : 'No sessions have failed, indicating stable processing infrastructure.'}`);
  }

  // Top Performers (horizontal bar)
  if (mentorPerformance && mentorPerformance.length > 0) {
    y = needsPage(doc, y, 68, mkFooter, pg);
    y = sectionTitle(doc, y, 'Top Performing Mentors', 'Ranked by average evaluation score');
    const sorted = [...mentorPerformance].sort((a,b) => (b.score||0) - (a.score||0)).slice(0, 8);
    const hImg = _hBarChart(sorted, 650, Math.max(180, sorted.length * 38));
    const imgH = Math.max(36, sorted.length * 7.5);
    doc.addImage(hImg, 'PNG', M.left, y, CW, imgH);
    y += imgH + 3;
    const top = sorted[0];
    y = insightBox(doc, y, 'PERFORMANCE RANKING', `${top?.name || 'N/A'} leads with a score of ${(top?.score||0).toFixed(1)}/10. ${sorted.length > 1 ? `The gap between the top and lowest-ranked mentor is ${((top?.score||0) - (sorted[sorted.length-1]?.score||0)).toFixed(1)} points.` : ''} Focused coaching for lower-ranked mentors can help close performance gaps.`);
  }

  // Score Distribution (bar)
  if (scoreDistribution && scoreDistribution.length) {
    y = needsPage(doc, y, 68, mkFooter, pg);
    y = sectionTitle(doc, y, 'Score Distribution', 'Frequency of evaluation scores across defined ranges');
    const sdData = scoreDistribution.map(d => ({ category: d.range, value: d.count, color: d.count > 3 ? '#10b981' : d.count > 0 ? '#3b82f6' : '#e5e7eb' }));
    const sdImg = _barChart(sdData, 650, 240);
    doc.addImage(sdImg, 'PNG', M.left, y, CW, 48);
    y += 50;
    const high = scoreDistribution.find(d => d.range === '9-10');
    const low = scoreDistribution.find(d => d.range === '0-4.9');
    y = insightBox(doc, y, 'DISTRIBUTION INSIGHT', `${high?.count||0} evaluation(s) scored 9 or above (top tier). ${low?.count ? `${low.count} evaluation(s) scored below 5, warranting attention and support for those mentors.` : 'No evaluations fell below 5, indicating a strong performance baseline across all mentors.'}`);
  }

  // Footers
  const totalPages = doc.internal.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) { doc.setPage(i); drawFooter(doc, i, instituteName); }
  doc.save('Institutional_Analytics_Report.pdf');
}

// ── LEGACY COMPAT (keep old exports working) ────────────────
export const downloadElementAsPDF = async () => { console.warn('downloadElementAsPDF is deprecated. Use generateFacultyReport or generateInstitutionalReport.'); };
export const generatePdfFromComponent = async () => { console.warn('generatePdfFromComponent is deprecated.'); };
