(() => {
'use strict';
const canvas = document.querySelector('#puzzle'), ctx = canvas.getContext('2d');
const image = new Image();
const config=window.PUZZLE_CONFIG||{};
const size=value=>Math.max(1,Math.min(12,Math.round(Number(value)||3)));
const cols=size(config.columns), rows=size(config.rows), total=cols*rows;
document.querySelector('#total').textContent=total;
document.querySelector('#art-count').textContent=`${total} dílků · ilustrace`;
document.querySelector('#description').textContent=`Jeden obrázek. ${total} dílků. A trochu radosti z toho, když zapadnou.`;
let pieces=[], board, tray, width, height, pw=480/cols, ph=320/rows, mobile=false, dragging=null, preview=false, started=false, elapsed=0, lastTick=0, ready=false;
const count=document.querySelector('#count'), timer=document.querySelector('#timer'), message=document.querySelector('#message');
function edge(path,x,y,dx,dy,sign){
 const length=Math.hypot(dx,dy),nx=dy/length,ny=-dx/length;
 const point=(t,n)=>[x+dx*t+nx*n*sign*Math.min(pw,ph),y+dy*t+ny*n*sign*Math.min(pw,ph)];
 const line=(t,n)=>path.lineTo(...point(t,n));
 const curve=(a,b,c,d,e,f)=>path.bezierCurveTo(...point(a,b),...point(c,d),...point(e,f));
 if(!sign){line(1,0);return;}
 line(.35,0);curve(.44,0,.44,.03,.40,.07);curve(.33,.18,.39,.22,.50,.22);curve(.61,.22,.67,.18,.60,.07);curve(.56,.03,.56,0,.65,0);line(1,0);
}
function shape(p){const path=new Path2D();path.moveTo(0,0);edge(path,0,0,pw,0,p.edges[0]);edge(path,pw,0,0,ph,p.edges[1]);edge(path,pw,ph,-pw,0,p.edges[2]);edge(path,0,ph,0,-ph,p.edges[3]);path.closePath();return path;}
function layout(){
 mobile=window.innerWidth<=760;width=mobile?660:1240;height=mobile?1090:560;
 board={x:mobile?90:55,y:mobile?68:108,w:480,h:320};
 tray={x:mobile?60:650,y:mobile?505:58,w:540,h:460};
 const dpr=Math.min(window.devicePixelRatio||1,2);canvas.width=width*dpr;canvas.height=height*dpr;canvas.style.aspectRatio=`${width} / ${height}`;ctx.setTransform(dpr,0,0,dpr,0,0);
 if(pieces.length){pieces.forEach(p=>{p.targetX=board.x+p.col*pw;p.targetY=board.y+p.row*ph;if(p.locked){p.x=p.targetX;p.y=p.targetY;}else placeInTray(p);});}draw();
}
function placeInTray(p){const cw=tray.w/cols,ch=tray.h/rows;p.x=tray.x+(cw-pw)/2+(p.slot%cols)*cw;p.y=tray.y+(ch-ph)/2+Math.floor(p.slot/cols)*ch;}
function shuffle(){
 if(!ready)return;
 dragging=null;canvas.classList.remove('dragging');started=false;elapsed=0;lastTick=0;
 const slots=Array.from({length:total},(_,i)=>i);for(let i=slots.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[slots[i],slots[j]]=[slots[j],slots[i]];}
 pieces=[];
 for(let r=0;r<rows;r++)for(let c=0;c<cols;c++){
 const id=r*cols+c;const p={id,row:r,col:c,slot:slots[id],locked:false,edges:[r?-pieces[id-cols].edges[2]:0,c<cols-1?(Math.random()<.5?1:-1):0,r<rows-1?(Math.random()<.5?1:-1):0,c?-pieces[id-1].edges[1]:0],targetX:board.x+c*pw,targetY:board.y+r*ph};p.path=shape(p);placeInTray(p);pieces.push(p);
 }
 updateStats();draw();
}
function updateStats(){const locked=pieces.filter(p=>p.locked).length;count.textContent=locked;const s=Math.floor(elapsed/1000);timer.textContent=`${String(Math.floor(s/60)).padStart(2,'0')}:${String(s%60).padStart(2,'0')}`;message.textContent=locked===total?'Hotovo! Všechny kousky zapadly. Užij si svůj obrázek.':locked?'Pěkně! Pokračuj, další kousek už čeká.':'Vezmi dílek a přetáhni ho na jeho místo.';}
function roundedRect(x,y,w,h,r,fill){ctx.fillStyle=fill;ctx.beginPath();ctx.roundRect(x,y,w,h,r);ctx.fill();}
function drawPiece(p,shadow=false){ctx.save();ctx.translate(p.x,p.y);if(shadow){ctx.shadowColor='#24332b45';ctx.shadowBlur=dragging?.p===p?16:5;ctx.shadowOffsetY=dragging?.p===p?6:2;ctx.fillStyle='#fff';ctx.fill(p.path);}ctx.shadowColor='transparent';ctx.save();ctx.clip(p.path);ctx.drawImage(image,-p.col*pw,-p.row*ph,board.w,board.h);ctx.restore();ctx.lineWidth=p.locked?.7:1.3;ctx.strokeStyle=p.locked?'#fff9':'#fffdeb';ctx.stroke(p.path);ctx.restore();}
function draw(){
 if(!ctx||!board)return;ctx.clearRect(0,0,width,height);ctx.fillStyle='#eeeee5';ctx.fillRect(0,0,width,height);
 ctx.fillStyle='#d9ddd140';for(let y=12;y<height;y+=20)for(let x=12;x<width;x+=20){ctx.beginPath();ctx.arc(x,y,.8,0,Math.PI*2);ctx.fill();}
 ctx.fillStyle='#798373';ctx.font='10px Arial';ctx.fillText('TVŮJ OBRÁZEK',board.x,board.y-27);ctx.fillText('VOLNÉ DÍLKY',tray.x,tray.y-18);
 roundedRect(board.x-12,board.y-12,board.w+24,board.h+24,5,'#d2d8c9');roundedRect(board.x-3,board.y-3,board.w+6,board.h+6,2,'#fafbf3');ctx.fillStyle='#e1e6d8';ctx.fillRect(board.x,board.y,board.w,board.h);
 if(ready){ctx.save();ctx.globalAlpha=preview?.66:.08;ctx.drawImage(image,board.x,board.y,board.w,board.h);ctx.restore();
 pieces.forEach(p=>{ctx.save();ctx.translate(p.targetX,p.targetY);ctx.strokeStyle='#bcc6b388';ctx.lineWidth=1;ctx.stroke(p.path);ctx.restore();});
 pieces.filter(p=>p.locked).forEach(p=>drawPiece(p));pieces.filter(p=>!p.locked&&dragging?.p!==p).forEach(p=>drawPiece(p,true));if(dragging)drawPiece(dragging.p,true);
 if(pieces.every(p=>p.locked)){ctx.save();ctx.fillStyle='#47634c';ctx.textAlign='center';ctx.font='italic 23px Georgia';ctx.fillText('Kousek po kousku. Hotovo.',board.x+board.w/2,board.y+board.h+60);ctx.restore();}}
 if(!mobile){ctx.strokeStyle='#d4d8ca';ctx.beginPath();ctx.moveTo(594,36);ctx.lineTo(594,height-36);ctx.stroke();}
}
function hit(p,pos){ctx.save();ctx.setTransform(1,0,0,1,0,0);const inside=ctx.isPointInPath(p.path,pos.x-p.x,pos.y-p.y);ctx.restore();return inside;}
function pointer(e){const r=canvas.getBoundingClientRect();return{x:(e.clientX-r.left)*width/r.width,y:(e.clientY-r.top)*height/r.height};}
canvas.addEventListener('pointerdown',e=>{
 if(!ready||e.button!==0)return;const pos=pointer(e);
 for(let i=pieces.length-1;i>=0;i--){const p=pieces[i];if(!p.locked&&hit(p,pos)){
 dragging={p,dx:pos.x-p.x,dy:pos.y-p.y};pieces.splice(i,1);pieces.push(p);canvas.setPointerCapture(e.pointerId);canvas.classList.add('dragging');if(!started){started=true;lastTick=performance.now();}draw();e.preventDefault();break;}}
});
canvas.addEventListener('pointermove',e=>{if(!dragging)return;const pos=pointer(e),p=dragging.p;p.x=Math.max(20,Math.min(width-pw-20,pos.x-dragging.dx));p.y=Math.max(25,Math.min(height-ph-25,pos.y-dragging.dy));draw();});
function release(cancel=false){if(!dragging)return;const p=dragging.p;if(!cancel&&Math.hypot(p.x-p.targetX,p.y-p.targetY)<Math.min(25,pw*.25,ph*.25)){p.x=p.targetX;p.y=p.targetY;p.locked=true;}dragging=null;canvas.classList.remove('dragging');updateStats();draw();}
canvas.addEventListener('pointerup',()=>release());canvas.addEventListener('pointercancel',()=>release(true));
document.querySelector('#preview').addEventListener('click',e=>{preview=!preview;e.currentTarget.setAttribute('aria-pressed',String(preview));draw();});
document.querySelector('#shuffle').addEventListener('click',shuffle);
async function fullscreen(){try{if(document.fullscreenElement)await document.exitFullscreen();else await document.querySelector('.game-shell').requestFullscreen();}catch{message.textContent='Prohlížeč nepodporuje celou obrazovku.';}}
document.querySelector('#fullscreen').addEventListener('click',fullscreen);window.addEventListener('keydown',e=>{if(e.key.toLowerCase()==='f'&&!e.repeat)fullscreen();});
window.addEventListener('resize',()=>{release(true);layout();});
setInterval(()=>{const now=performance.now();if(started&&pieces.some(p=>!p.locked)){elapsed+=now-lastTick;updateStats();}lastTick=now;},250);
window.advanceTime=ms=>{if(started&&pieces.some(p=>!p.locked))elapsed+=ms;lastTick=performance.now();updateStats();draw();};
window.render_game_to_text=()=>JSON.stringify({mode:!ready?'loading':pieces.every(p=>p.locked)?'complete':'playing',coordinates:'Canvas logical pixels; origin top left, x right, y down.',width,height,board,preview,placed:pieces.filter(p=>p.locked).length,total,elapsed:Math.floor(elapsed/1000),pieces:pieces.map(p=>({id:p.id,x:Math.round(p.x),y:Math.round(p.y),targetX:p.targetX,targetY:p.targetY,locked:p.locked,edges:p.edges})),dragging:dragging?.p.id??null});
image.onload=()=>{ready=true;document.querySelector('#loading').classList.add('hidden');shuffle();};image.onerror=()=>{document.querySelector('#loading').textContent='Obrázek se nepodařilo načíst. Zkontroluj assets/lake-cottage.png.';};layout();image.src=config.image||'assets/lake-cottage.png';
})();
