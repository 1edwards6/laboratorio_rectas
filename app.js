(() => {
  'use strict';

  const $ = (id) => document.getElementById(id);
  const NS = 'http://www.w3.org/2000/svg';
  const clamp = (v, min, max) => Math.min(max, Math.max(min, v));
  const fmt = (n, digits = 1) => Number(n).toFixed(digits).replace(/\.0$/, '');
  const nice = (n) => String(n).replace('-', '−');
  const svgEl = (name, attrs = {}, content = '') => {
    const attributes = Object.entries(attrs).map(([k,v]) => `${k}="${String(v).replaceAll('"','&quot;')}"`).join(' ');
    return `<${name} ${attributes}>${content}</${name}>`;
  };
  const text = (x,y,value,attrs={}) => svgEl('text',{x,y,'text-anchor':'middle','font-family':'Manrope,Arial,sans-serif','font-size':12,fill:'#8994aa',...attrs},String(value));
  const line = (x1,y1,x2,y2,attrs={}) => svgEl('line',{x1,y1,x2,y2,...attrs});

  // Navegación entre las tres experiencias.
  document.querySelectorAll('.tab').forEach((button) => {
    button.addEventListener('click', () => {
      document.querySelectorAll('.tab').forEach((tab) => {
        const active = tab === button;
        tab.classList.toggle('active', active);
        tab.setAttribute('aria-selected', String(active));
      });
      document.querySelectorAll('.panel').forEach((panel) => {
        const active = panel.id === `panel-${button.dataset.tab}`;
        panel.classList.toggle('active', active);
        panel.hidden = !active;
      });
    });
  });

  // ---------------------------------------------------------------------------
  // ACTIVIDAD 1: y = mx + b. m y b enteros para garantizar puntos de red enteros.
  // Los puntos se arrastran sobre el eje x y y se calcula exactamente con la recta.
  // ---------------------------------------------------------------------------
  const lineState = { m: 1, b: 2, x1: -3, x2: 3, dragging: null };
  const lineSvg = $('line-graph');
  // Escala fija: la cuadrícula no cambia al modificar m o b.
  // Los límites contienen todas las rectas posibles (m entre -4 y 4, b entre -5 y 5).
  const linePlot = { left: 66, right: 874, top: 26, bottom: 448, xMin: -5, xMax: 5, yMin: -25, yMax: 25 };

  function equationText(m,b) {
    const mx = m === 0 ? '' : (m === 1 ? 'x' : m === -1 ? '−x' : `${nice(m)}x`);
    if (m === 0) return `y = ${nice(b)}`;
    if (b === 0) return `y = ${mx}`;
    return `y = ${mx} ${b > 0 ? '+' : '−'} ${Math.abs(b)}`;
  }

  function updateRangeFill(input) {
    const min = Number(input.min), max = Number(input.max), val = Number(input.value);
    const pct = ((val - min) / (max - min)) * 100;
    const color = input.classList.contains('intercept-range') ? '#f19a38' : input.classList.contains('car-range') || input.classList.contains('challenge-range') ? '#1aa995' : '#4263eb';
    input.style.background = `linear-gradient(90deg,${color} ${pct}%,#dfe4f1 ${pct}%)`;
  }

  function renderLineGraph() {
    const s = lineState, p = linePlot;
    const yAtLeft = s.m * p.xMin + s.b, yAtRight = s.m * p.xMax + s.b;
    // Los límites verticales permanecen fijos; únicamente cambia la recta.
    const yMin = p.yMin, yMax = p.yMax;
    const X = x => p.left + (x - p.xMin) / (p.xMax - p.xMin) * (p.right - p.left);
    const Y = y => p.bottom - (y - yMin) / (yMax - yMin) * (p.bottom - p.top);
    const pieces = [];
    pieces.push(svgEl('rect',{x:p.left,y:p.top,width:p.right-p.left,height:p.bottom-p.top,rx:8,fill:'#fbfcff'}));
    for (let x=p.xMin; x<=p.xMax; x++) {
      pieces.push(line(X(x),p.top,X(x),p.bottom,{stroke:x===0?'#8995b0':'#e8ecf5','stroke-width':x===0?2:1}));
      if (x !== 0) pieces.push(text(X(x),Y(0)+18,nice(x),{'font-size':11,fill:'#8792aa'}));
    }
    const yStep = 5; // Marcas constantes de cinco en cinco.
    for (let y=Math.ceil(yMin/yStep)*yStep; y<=yMax; y+=yStep) {
      pieces.push(line(p.left,Y(y),p.right,Y(y),{stroke:y===0?'#8995b0':'#e8ecf5','stroke-width':y===0?2:1}));
      if (y !== 0) pieces.push(text(p.left-17,Y(y)+4,nice(y),{'font-size':10,'text-anchor':'end',fill:'#8792aa'}));
    }
    // Marcas de los ejes y nombres de variables.
    pieces.push(text(p.right-2,Y(0)-10,'x',{'font-size':14,'font-weight':800,fill:'#53617f'}));
    pieces.push(text(X(0)+13,p.top+10,'y',{'font-size':14,'font-weight':800,fill:'#53617f'}));
    // Recta y punto de corte con el eje y.
    pieces.push(line(X(p.xMin),Y(yAtLeft),X(p.xMax),Y(yAtRight),{stroke:'#4263eb','stroke-width':4,'stroke-linecap':'round'}));
    pieces.push(svgEl('circle',{cx:X(0),cy:Y(s.b),r:6,fill:'#f19a38',stroke:'#fff','stroke-width':2}));
    pieces.push(text(X(0)+16,Y(s.b)-12,`(0, ${nice(s.b)})`,{'text-anchor':'start','font-size':11,'font-weight':800,fill:'#c17b28'}));

    const points = [
      {id:'p1',x:s.x1,y:s.m*s.x1+s.b,color:'#ed6683',label:'P₁',dx:-20,dy:-17},
      {id:'p2',x:s.x2,y:s.m*s.x2+s.b,color:'#2e9bc2',label:'P₂',dx:20,dy:-17}
    ];
    points.forEach(pt => {
      const cx=X(pt.x), cy=Y(pt.y);
      pieces.push(svgEl('circle',{cx,cy,r:14,fill:pt.color,opacity:.13}));
      pieces.push(svgEl('circle',{cx,cy,r:7.5,fill:pt.color,stroke:'#fff','stroke-width':2.5,'data-point':pt.id,class:'draggable-point',style:'cursor:grab'}));
      pieces.push(text(cx+pt.dx,cy+pt.dy,pt.label,{'font-size':13,'font-weight':800,fill:pt.color,'pointer-events':'none'}));
    });
    // El origen se marca discretamente cuando no coincide con los elementos anteriores.
    pieces.push(text(X(0)+12,Y(0)+17,'0',{'font-size':10,fill:'#8792aa','text-anchor':'start'}));
    lineSvg.innerHTML = pieces.join('');
    lineSvg.dataset.yMin = yMin; lineSvg.dataset.yMax = yMax;
    $('p1-coords').textContent = `P₁(${nice(s.x1)}, ${nice(s.m*s.x1+s.b)})`;
    $('p2-coords').textContent = `P₂(${nice(s.x2)}, ${nice(s.m*s.x2+s.b)})`;
  }

  function updateLine() {
    const {m,b} = lineState;
    $('slope-value').textContent = nice(m); $('intercept-value').textContent = nice(b);
    $('eq-m').textContent = m === 1 ? '' : m === -1 ? '−' : nice(m);
    $('eq-sign').textContent = b < 0 ? '−' : '+';
    $('eq-b').textContent = Math.abs(b);
    $('eq-m').style.display = m === 0 ? 'none' : 'inline';
    $('eq-sign').style.display = m === 0 || b === 0 ? 'none' : 'inline';
    $('eq-b').style.display = b === 0 && m !== 0 ? 'none' : 'inline';
    if (m === 0) { $('eq-m').textContent = nice(b); $('eq-b').style.display='none'; }
    const desc = m > 0 ? 'La recta sube de izquierda a derecha' : m < 0 ? 'La recta baja de izquierda a derecha' : 'La recta es horizontal';
    $('observation-text').textContent = `${desc}. ${b===0?'Pasa por el origen.':`Cruza el eje y en ${nice(b)}.`}`;
    renderLineGraph();
    updateRangeFill($('slope')); updateRangeFill($('intercept'));
    $('slope-feedback').textContent = 'Calcula primero con las coordenadas que aparecen en la gráfica.';
    $('slope-feedback').className = 'feedback';
    $('student-slope').value = '';
    $('calculation-detail').hidden = true;
    $('show-calculation').setAttribute('aria-expanded','false');
    $('show-calculation').innerHTML = 'Ver cálculo del aplicativo <span>＋</span>';
  }

  function nearestAllowedX(rawX, movingId) {
    let candidate = clamp(Math.round(rawX), -5, 5);
    const other = movingId === 'p1' ? lineState.x2 : lineState.x1;
    if (candidate !== other) return candidate;
    const alternatives = [];
    for (let x=-5;x<=5;x++) if (x !== other) alternatives.push(x);
    alternatives.sort((a,b) => Math.abs(a-rawX)-Math.abs(b-rawX));
    return alternatives[0];
  }
  function linePointerX(event) {
    const rect = lineSvg.getBoundingClientRect();
    const vx = (event.clientX - rect.left) / rect.width * 900;
    return -5 + (vx - linePlot.left) / (linePlot.right-linePlot.left) * 10;
  }
  lineSvg.addEventListener('pointerdown', (event) => {
    const target = event.target.closest('[data-point]');
    if (!target) return;
    lineState.dragging = target.dataset.point;
    lineSvg.setPointerCapture(event.pointerId);
    event.preventDefault();
  });
  lineSvg.addEventListener('pointermove', (event) => {
    if (!lineState.dragging) return;
    const which = lineState.dragging;
    const x = nearestAllowedX(linePointerX(event), which);
    if (which === 'p1') lineState.x1 = x; else lineState.x2 = x;
    renderLineGraph();
  });
  const endLineDrag = () => { lineState.dragging = null; };
  lineSvg.addEventListener('pointerup', endLineDrag); lineSvg.addEventListener('pointercancel',endLineDrag);
  $('slope').addEventListener('input', e => { lineState.m=Number(e.target.value); updateLine(); });
  $('intercept').addEventListener('input', e => { lineState.b=Number(e.target.value); updateLine(); });
  $('reset-line').addEventListener('click', () => {
    Object.assign(lineState,{m:1,b:2,x1:-3,x2:3}); $('slope').value=1; $('intercept').value=2; updateLine();
  });
  $('check-slope').addEventListener('click', () => {
    const value = $('student-slope').value.trim(); const feedback=$('slope-feedback');
    if (value === '') { feedback.textContent='Escribe el valor que obtuviste para poder comprobarlo.'; feedback.className='feedback bad'; return; }
    const expected=(lineState.m*lineState.x2+lineState.b-(lineState.m*lineState.x1+lineState.b))/(lineState.x2-lineState.x1);
    const correct=Math.abs(Number(value)-expected)<1e-8;
    feedback.textContent=correct?'¡Muy bien! Tu cálculo coincide con la pendiente de la recta.':'Todavía no coincide. Revisa el orden de las restas y divide el cambio vertical entre el horizontal.';
    feedback.className=`feedback ${correct?'good':'bad'}`;
  });
  $('show-calculation').addEventListener('click', () => {
    const x1=lineState.x1,y1=lineState.m*x1+lineState.b,x2=lineState.x2,y2=lineState.m*x2+lineState.b;
    const dx=x2-x1,dy=y2-y1,m=dy/dx,detail=$('calculation-detail');
    detail.innerHTML=`<strong>m = (y₂ − y₁) / (x₂ − x₁)</strong><br>m = (${nice(y2)} − (${nice(y1)})) / (${nice(x2)} − (${nice(x1)}))<br>m = ${nice(dy)} / ${nice(dx)} = <strong>${fmt(m,2)}</strong>`;
    detail.hidden=!detail.hidden;
    $('show-calculation').setAttribute('aria-expanded',String(!detail.hidden));
    $('show-calculation').innerHTML=detail.hidden?'Ver cálculo del aplicativo <span>＋</span>':'Ocultar cálculo <span>−</span>';
  });

  // ---------------------------------------------------------------------------
  // Utilidades SVG para caminos y gráficas de distancia-tiempo.
  // ---------------------------------------------------------------------------
  function carMarkup(cx,cy,scale=1) {
    return `<g transform="translate(${cx},${cy}) scale(${scale})" pointer-events="none">
      <ellipse cx="0" cy="20" rx="43" ry="7" fill="#19344d" opacity=".12"/>
      <path d="M-38 8 L-31 -8 Q-27 -17 -15 -17 L13 -17 Q23 -17 30 -5 L39 4 Q43 7 42 14 L-41 14 Q-43 11 -38 8Z" fill="#f19a38" stroke="#d77a25" stroke-width="2"/>
      <path d="M-23 -10 Q-19 -14 -13 -14 L-2 -14 L-2 -2 L-29 -2Z" fill="#e6f4ff" stroke="#cfdfed" stroke-width="1.3"/>
      <path d="M2 -14 L12 -14 Q19 -14 25 -3 L2 -3Z" fill="#e6f4ff" stroke="#cfdfed" stroke-width="1.3"/>
      <path d="M-40 7 L-31 7 M32 7 L41 7" stroke="#fff0d7" stroke-width="3" stroke-linecap="round"/>
      <circle cx="-25" cy="14" r="8" fill="#27344e"/><circle cx="-25" cy="14" r="3.4" fill="#dbe3f0"/>
      <circle cx="26" cy="14" r="8" fill="#27344e"/><circle cx="26" cy="14" r="3.4" fill="#dbe3f0"/>
    </g>`;
  }

  function renderRoad(svg, position, draggable=true, disabled=false) {
    const start=75,end=825,y=88,cx=start+(position/50)*(end-start);
    let parts=[];
    parts.push(svgEl('rect',{x:35,y:47,width:830,height:75,rx:16,fill:'#f1f4f8'}));
    parts.push(line(55,y+12,845,y+12,{stroke:'#fff','stroke-width':3,'stroke-dasharray':'13 12'}));
    parts.push(line(55,y+29,845,y+29,{stroke:'#d8dee9','stroke-width':2}));
    for(let d=0;d<=50;d+=5){const x=start+(d/50)*(end-start);parts.push(line(x,47,x,62,{stroke:'#9ba7b9','stroke-width':1.5}));parts.push(text(x,39,d,{ 'font-size':10,fill:'#8793a8'}));}
    parts.push(text(55,145,'INICIO',{'font-size':9,'text-anchor':'start','font-weight':800,fill:'#9aa4b7','letter-spacing':1}));
    parts.push(text(845,145,'META',{'font-size':9,'text-anchor':'end','font-weight':800,fill:'#9aa4b7','letter-spacing':1}));
    if (draggable) parts.push(svgEl('rect',{x:55,y:25,width:790,height:125,fill:'transparent','data-road-hit':'true',style:disabled?'cursor:not-allowed':'cursor:grab'}));
    parts.push(carMarkup(cx,y-1,.88));
    // Marcador de posición y zona de agarre invisible sobre el vehículo.
    parts.push(svgEl('circle',{cx,cy:y-1,r:34,fill:'transparent','data-car-hit':'true',style:disabled?'cursor:not-allowed':'cursor:grab'}));
    svg.innerHTML=parts.join('');
  }

  function renderChart(svg, config) {
    const {xMax,yMax,points=[],lineEnd=null,point=null,orange=false,xStep:configuredXStep=null,xLabel='Tiempo (s)',yLabel='Distancia (m)'}=config;
    const p={left:76,right:874,top:24,bottom:380};
    const X=x=>p.left+(x/xMax)*(p.right-p.left);
    const Y=y=>p.bottom-(y/yMax)*(p.bottom-p.top);
    const parts=[];
    parts.push(svgEl('rect',{x:p.left,y:p.top,width:p.right-p.left,height:p.bottom-p.top,rx:5,fill:'#fcfdff'}));
    const xStep=configuredXStep ?? (xMax<=5?1:xMax<=12?2:Math.ceil(xMax/6));
    const yStep=yMax<=10?2:Math.ceil(yMax/5);
    for(let x=0;x<=xMax+1e-8;x+=xStep){parts.push(line(X(x),p.top,X(x),p.bottom,{stroke:'#e9edf5','stroke-width':1}));parts.push(text(X(x),p.bottom+22,fmt(x,1),{'font-size':10,fill:'#8792aa'}));}
    for(let y=0;y<=yMax+1e-8;y+=yStep){parts.push(line(p.left,Y(y),p.right,Y(y),{stroke:y===0?'#8d99b2':'#e9edf5','stroke-width':y===0?2:1}));parts.push(text(p.left-18,Y(y)+4,fmt(y,1),{'font-size':10,'text-anchor':'end',fill:'#8792aa'}));}
    parts.push(line(p.left,p.top,p.left,p.bottom,{stroke:'#8d99b2','stroke-width':2}));
    parts.push(text(p.right-1,p.bottom+42,xLabel,{'text-anchor':'end','font-size':11,'font-weight':700,fill:'#6f7d98'}));
    parts.push(text(p.left+7,p.top+12,yLabel,{'text-anchor':'start','font-size':11,'font-weight':700,fill:'#6f7d98'}));
    if(lineEnd){parts.push(line(X(0),Y(0),X(lineEnd.x),Y(lineEnd.y),{stroke:orange?'#f19a38':'#1aa995','stroke-width':4,'stroke-linecap':'round'}));}
    if(points.length){
      const coords=points.map(pt=>`${X(pt.x)},${Y(pt.y)}`).join(' ');
      parts.push(svgEl('polyline',{points:coords,fill:'none',stroke:'#f19a38','stroke-width':3.5,'stroke-linecap':'round','stroke-linejoin':'round'}));
    }
    if(point){parts.push(svgEl('circle',{cx:X(point.x),cy:Y(point.y),r:12,fill:orange?'#f19a38':'#1aa995',opacity:.16}));parts.push(svgEl('circle',{cx:X(point.x),cy:Y(point.y),r:6.5,fill:orange?'#f19a38':'#1aa995',stroke:'#fff','stroke-width':2}));}
    svg.innerHTML=parts.join('');
  }

  // ---------------------------------------------------------------------------
  // ACTIVIDAD 2: el carrito representa una posición d; el tiempo se deduce de d=v*t.
  // Al mover el vehículo, se traza el segmento correspondiente de la recta.
  // ---------------------------------------------------------------------------
  const model={position:0,speed:5,dragging:false};
  const modelRoad=$('model-road');
  function renderModel(){
    renderRoad(modelRoad,model.position,true,false);
    $('car-position').textContent=fmt(model.position,1);
    const time=model.position/model.speed;
    $('car-time').textContent=fmt(time,1);
    $('speed-value').textContent=fmt(model.speed,1);
    $('model-speed-equation').textContent=fmt(model.speed,1);
    $('car-position-slider').value=model.position;
    $('speed-slider').value=model.speed;
    updateRangeFill($('car-position-slider'));updateRangeFill($('speed-slider'));
    // La escala horizontal permanece fija: 0 a 50 s (el tiempo necesario
    // para recorrer los 50 m a la velocidad mínima de 1 m/s). Así, al
    // aumentar la velocidad, la recta se vuelve más inclinada y termina
    // antes de ocupar todo el ancho del plano.
    renderChart($('model-chart'),{xMax:50,xStep:10,yMax:50,lineEnd:{x:time,y:model.position},point:{x:time,y:model.position},xLabel:'Tiempo (s)',yLabel:'Distancia (m)'});
  }
  function modelSetPosition(value){model.position=clamp(Math.round(value*10)/10,0,50);renderModel();}
  function roadCoordinate(event,svg){const rect=svg.getBoundingClientRect();return (event.clientX-rect.left)/rect.width*900;}
  modelRoad.addEventListener('pointerdown',event=>{
    if(!event.target.closest('[data-car-hit]'))return;
    model.dragging=true;modelRoad.setPointerCapture(event.pointerId);
    const x=roadCoordinate(event,modelRoad);modelSetPosition(clamp((x-75)/750*50,0,50));event.preventDefault();
  });
  modelRoad.addEventListener('pointermove',event=>{if(!model.dragging)return;const x=roadCoordinate(event,modelRoad);modelSetPosition(clamp((x-75)/750*50,0,50));});
  const endModelDrag=()=>{model.dragging=false;};
  modelRoad.addEventListener('pointerup',endModelDrag);modelRoad.addEventListener('pointercancel',endModelDrag);
  $('car-position-slider').addEventListener('input',e=>modelSetPosition(Number(e.target.value)));
  $('speed-slider').addEventListener('input',e=>{model.speed=Number(e.target.value);renderModel();});
  $('reset-model').addEventListener('click',()=>{model.position=0;model.speed=5;renderModel();});

  // ---------------------------------------------------------------------------
  // ACTIVIDAD 3: reto de movimiento por tramos a velocidad constante.
  // El botón alterna entre avanzar y detenerse durante 5 segundos.
  // La gráfica se construye solo con los instantes de cambio y el final:
  // segmentos rectos inclinados al avanzar y horizontales al detenerse.
  // ---------------------------------------------------------------------------
  const CHALLENGE_SPEED = 5; // m/s, constante durante cada tramo de movimiento.
  const challenge={
    position:0,
    running:false,       // El experimento de 5 segundos está activo.
    moving:false,        // El carrito está avanzando en este instante.
    finished:false,
    startTime:0,
    segmentStartTime:0,
    segmentStartPosition:0,
    distance:0,
    data:[],
    timer:null
  };
  const challengeRoad=$('challenge-road');

  function challengeElapsed(now=performance.now()){
    return clamp((now-challenge.startTime)/1000,0,5);
  }
  function appendChallengePoint(t){
    const point={t:clamp(t,0,5),d:challenge.distance,pos:challenge.position};
    const last=challenge.data[challenge.data.length-1];
    if(last && Math.abs(last.t-point.t)<0.001){
      challenge.data[challenge.data.length-1]=point;
    }else{
      challenge.data.push(point);
    }
  }
  function updateChallengePosition(elapsed){
    if(challenge.moving){
      const movingTime=Math.max(0,elapsed-challenge.segmentStartTime);
      challenge.position=clamp(challenge.segmentStartPosition+CHALLENGE_SPEED*movingTime,0,50);
      challenge.distance=challenge.position;
    }
    renderChallengeRoad();
  }
  function renderChallengeRoad(){
    renderRoad(challengeRoad,challenge.position,false,true);
    $('challenge-position-value').textContent=fmt(challenge.position,1);
  }
  function setChallengeStatus(mode){
    const pill=$('challenge-status');
    pill.className=`status-pill ${mode==='moving'?'running':mode==='paused'?'paused':''}`;
    if(mode==='moving')pill.innerHTML='<i></i> EN MOVIMIENTO';
    else if(mode==='paused')pill.innerHTML='<i></i> DETENIDO';
    else if(mode==='finished')pill.innerHTML='<i></i> TIEMPO COMPLETADO';
    else pill.innerHTML='<i></i> LISTO PARA INICIAR';
  }
  function updateChallengeButton(){
    const button=$('start-challenge');
    button.disabled=challenge.finished;
    if(challenge.finished){
      button.disabled=false;
      button.textContent='↻ VOLVER A INTENTAR';
    }else if(!challenge.running){
      button.textContent='▶ INICIAR · 5 SEGUNDOS';
    }else if(challenge.moving){
      button.textContent='Ⅱ DETENER';
    }else{
      button.textContent='▶ REANUDAR';
    }
  }
  function renderChallengeChart(){
    if(challenge.data.length===0)challenge.data.push({t:0,d:0,pos:0});
    const data=challenge.data.slice();
    const maxDistance=Math.max(5,Math.ceil(Math.max(...data.map(p=>p.d),1)/5)*5);
    renderChart($('challenge-chart'),{xMax:5,yMax:maxDistance,points:data.map(p=>({x:p.t,y:p.d})),orange:true,xLabel:'Tiempo (s)',yLabel:'Distancia acumulada (m)'});
    $('empty-chart').hidden=true;$('final-graph-wrap').hidden=false;$('final-chart-caption').hidden=false;
    $('challenge-result').hidden=false;
    challenge.resultDistance=challenge.distance;
    $('challenge-result').textContent=`En 5 segundos recorriste ${fmt(challenge.distance,1)} m. Los tramos inclinados representan el avance a 5 m/s y los horizontales, los momentos en que el carrito estuvo detenido.`;
  }
  function finishChallenge(){
    if(!challenge.running)return;
    // Calcula el estado exacto en t = 5 s, sin depender del instante del último repintado.
    updateChallengePosition(5);
    challenge.running=false;challenge.moving=false;challenge.finished=true;
    clearInterval(challenge.timer);challenge.timer=null;
    appendChallengePoint(5);
    $('challenge-timer').innerHTML='5.0 <small>/ 5.0 s</small>';
    $('challenge-instruction').textContent='¡Experimento terminado! Observa los tramos inclinados cuando avanzó y los horizontales cuando se detuvo.';
    setChallengeStatus('finished');updateChallengeButton();renderChallengeRoad();renderChallengeChart();
  }
  function startChallenge(){
    clearInterval(challenge.timer);
    challenge.position=0;challenge.distance=0;challenge.data=[{t:0,d:0,pos:0}];
    challenge.running=true;challenge.moving=true;challenge.finished=false;
    challenge.startTime=performance.now();
    challenge.segmentStartTime=0;challenge.segmentStartPosition=0;
    $('empty-chart').hidden=false;$('final-graph-wrap').hidden=true;$('final-chart-caption').hidden=true;$('challenge-result').hidden=true;
    $('empty-chart').innerHTML='<div class="empty-chart-icon">⏱</div><strong>¡Observa los tramos de movimiento!</strong><span>Pulsa DETENER y REANUDAR para crear distintos segmentos.</span>';
    $('challenge-timer').innerHTML='0.0 <small>/ 5.0 s</small>';
    $('challenge-instruction').textContent='El carrito avanza a 5 m/s. Pulsa DETENER para pausarlo y REANUDAR para continuar. El experimento dura cinco segundos en total.';
    setChallengeStatus('moving');updateChallengeButton();renderChallengeRoad();
    challenge.timer=setInterval(()=>{
      if(!challenge.running)return;
      const elapsed=challengeElapsed();
      $('challenge-timer').innerHTML=`${fmt(elapsed,1)} <small>/ 5.0 s</small>`;
      updateChallengePosition(elapsed);
      if(elapsed>=5)finishChallenge();
    },30);
  }
  function toggleChallengeMotion(){
    if(challenge.finished)return;
    if(!challenge.running){startChallenge();return;}
    const now=performance.now();
    const elapsed=challengeElapsed(now);
    if(elapsed>=5){finishChallenge();return;}
    if(challenge.moving){
      // Cierra el tramo inclinado en el instante exacto en que se pulsa DETENER.
      updateChallengePosition(elapsed);
      challenge.moving=false;
      appendChallengePoint(elapsed);
      setChallengeStatus('paused');
      $('challenge-instruction').textContent='El carrito está detenido. Pulsa REANUDAR para que vuelva a avanzar a 5 m/s.';
    }else{
      // El nuevo tramo comienza desde la posición alcanzada y mantiene la misma velocidad.
      challenge.segmentStartTime=elapsed;
      challenge.segmentStartPosition=challenge.position;
      challenge.moving=true;
      appendChallengePoint(elapsed);
      setChallengeStatus('moving');
      $('challenge-instruction').textContent='El carrito avanza a 5 m/s. Pulsa DETENER para pausarlo; el reloj de cinco segundos sigue avanzando.';
    }
    updateChallengeButton();
  }
  function resetChallenge(){
    clearInterval(challenge.timer);challenge.timer=null;
    challenge.running=false;challenge.moving=false;challenge.finished=false;
    challenge.position=0;challenge.distance=0;challenge.data=[];
    $('challenge-timer').innerHTML='0.0 <small>/ 5.0 s</small>';
    $('challenge-instruction').textContent='Pulsa INICIAR: el carrito avanzará a velocidad constante. Vuelve a pulsar para detenerlo o reanudarlo durante los cinco segundos.';
    $('empty-chart').hidden=false;$('empty-chart').innerHTML='<div class="empty-chart-icon">⌁</div><strong>La gráfica aparecerá aquí</strong><span>Primero realiza el reto de cinco segundos.</span>';
    $('final-graph-wrap').hidden=true;$('final-chart-caption').hidden=true;$('challenge-result').hidden=true;
    setChallengeStatus('ready');updateChallengeButton();renderChallengeRoad();
  }
  $('start-challenge').addEventListener('click',()=>{
    if(challenge.finished){resetChallenge();startChallenge();}
    else toggleChallengeMotion();
  });
  $('reset-challenge').addEventListener('click',resetChallenge);

  // Inicialización.
  updateLine();
  renderModel();
  resetChallenge();
})();
