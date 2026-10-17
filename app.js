/* ============ 聊天数据 ============ */
var KEY="mj-chat-v1";
var chat=document.getElementById("chat"),msg=document.getElementById("msg"),st=document.getElementById("st");
var replyBtn=document.getElementById("reply");
var nameEl=document.getElementById("name");
var data=load(),busy=false;

function load(){try{var v=localStorage.getItem(KEY);if(v)return JSON.parse(v)}catch(e){}return[]}
function save(){try{localStorage.setItem(KEY,JSON.stringify(data))}catch(e){}}
function now(){var d=new Date();return ("0"+d.getHours()).slice(-2)+":"+("0"+d.getMinutes()).slice(-2)}

function bubble(d,i){
  var prev=data[i-1],next=data[i+1];
  var gap=!prev||prev.s!==d.s;
  var row=document.createElement("div");
  row.className="row "+d.s+(gap&&i>0?" gap":"");
  if(prev&&prev.s===d.s)row.className+=" cont";
  if(next&&next.s===d.s)row.className+=" next";
  row.innerHTML='<div class="bub"><span class="txt"></span><span class="tm"></span></div>';
  row.querySelector(".txt").textContent=d.t;
  row.querySelector(".tm").textContent=d.m;
  return row;
}
function render(typing){
  chat.innerHTML="";
  data.forEach(function(d,i){chat.appendChild(bubble(d,i))});
  if(typing){
    var last=data[data.length-1];
    var r=document.createElement("div");
    r.className="row ot typing"+(!last||last.s!=="ot"?" gap":"");
    r.innerHTML='<div class="bub"><i></i><i></i><i></i></div>';
    chat.appendChild(r);
  }
  window.scrollTo(0,document.body.scrollHeight);
}
function send(){
  var t=msg.value.trim();
  if(!t)return;
  msg.value="";
  data.push({s:"me",t:t,m:now()});save();render(busy);msg.focus();
}
function reply(){
  if(busy)return;
  busy=true;replyBtn.disabled=true;render(true);st.textContent="正在输入…";
  setTimeout(function(){
    data.push({s:"ot",t:String(1+Math.floor(Math.random()*6)),m:now()});
    save();busy=false;replyBtn.disabled=false;st.textContent="在线";render(false);
  },500+Math.random()*700);
}
var clearArm=0;
function clearChat(){
  var t=Date.now();
  if(t-clearArm<3000){clearArm=0;data=[];save();render(false);toast("已清空");}
  else{clearArm=t;toast("再点一次确认清空");}
}

/* ============ 美化设置 ============ */
var PKEY="mj-chat-prefs-v1";

/* 气泡配色预设 */
var PRESETS=[
  {id:"graphite",n:"石墨",  c:"#6b6b6b"},
  {id:"blue",    n:"海蓝",  c:"#2f7cf6"},
  {id:"teal",    n:"青碧",  c:"#0f9d8f"},
  {id:"pink",    n:"樱粉",  c:"#e0658a"},
  {id:"violet",  n:"紫罗兰",c:"#7a5af8"},
  {id:"ink",     n:"墨黑",  c:"#1b1b1b"},
  {id:"white",   n:"白色",  c:"#ffffff"},
  {id:"sand",    n:"暖沙",  c:"#d9b98c"}
];

var FONTS=[
  {id:"sys",  n:"系统",v:'-apple-system,"PingFang SC","Noto Sans SC","Microsoft YaHei",sans-serif'},
  {id:"hei",  n:"黑体",v:'"PingFang SC","Heiti SC","Microsoft YaHei",sans-serif'},
  {id:"song", n:"宋体",v:'"Songti SC","Noto Serif SC","SimSun",serif'},
  {id:"kai",  n:"楷体",v:'"Kaiti SC","STKaiti","KaiTi",serif'},
  {id:"round",n:"圆体",v:'"Yuanti SC","Hiragino Maru Gothic ProN","PingFang SC",sans-serif'},
  {id:"mono", n:"等宽",v:'ui-monospace,"SF Mono",Menlo,Consolas,"Courier New",monospace'}
];

var bgEl=document.getElementById("bg");
var sheet=document.getElementById("sheet");
var fileInput=document.getElementById("file");
var PAL_ME=null,PAL_OT=null;

/* 注意：这里只操作内部变量 d，不要引用外部尚未赋值的 prefs */
var prefs=(function(){
  var d={theme:"auto",bg:"",me:"graphite",meStyle:"solid",ot:"",otStyle:"solid",fs:18,r:26,font:"sys",name:"mj"};
  try{
    var v=localStorage.getItem(PKEY);
    if(v){
      var o=JSON.parse(v);
      for(var k in d){if(o[k]!==undefined)d[k]=o[k];}
    }
  }catch(e){}
  /* 旧数据迁移：原来透明的预设改成「透明质感」 */
  if(d.me==="clear"){d.me="graphite";d.meStyle="clear";}
  if(!d.meStyle)d.meStyle="solid";
  if(d.ot===undefined||d.ot===null)d.ot="";
  if(!d.otStyle)d.otStyle="solid";
  return d;
})();

function savePrefs(){
  try{localStorage.setItem(PKEY,JSON.stringify(prefs));return true}
  catch(e){return false}
}

/* ---------- 颜色工具 ---------- */
function hexRgb(h){
  h=String(h||"").replace("#","");
  if(h.length===3)h=h[0]+h[0]+h[1]+h[1]+h[2]+h[2];
  if(!/^[0-9a-fA-F]{6}$/.test(h))return null;
  return [parseInt(h.substr(0,2),16),parseInt(h.substr(2,2),16),parseInt(h.substr(4,2),16)];
}
function hexLight(h){
  var c=hexRgb(h);if(!c)return false;
  return (0.299*c[0]+0.587*c[1]+0.114*c[2])>150;
}
function rgbaStr(h,a){
  var c=hexRgb(h);if(!c)return h;
  return "rgba("+c[0]+","+c[1]+","+c[2]+","+a+")";
}
function isHex(v){return /^#[0-9a-fA-F]{6}$/.test(v);}
function colorOf(id){
  for(var i=0;i<PRESETS.length;i++)if(PRESETS[i].id===id)return PRESETS[i].c;
  if(isHex(id))return id;
  return PRESETS[0].c;
}

/* 根据颜色 + 质感算出实际样式 */
function paintVars(hex,style){
  if(style==="clear"){
    return {bg:"transparent",t:"var(--bar-t)",bd:"rgba(136,136,136,.45)",accent:"#2f7cf6"};
  }
  var light=hexLight(hex);
  var t=light?"#1c1c1c":"#fff";
  if(style==="frost"){
    return {bg:rgbaStr(hex,.55),t:t,bd:rgbaStr(hex,.42),accent:"#2f7cf6"};
  }
  return {bg:hex,t:t,bd:light?"rgba(0,0,0,.14)":"transparent",accent:light?"#2f7cf6":hex};
}

function applyPrefs(){
  var r=document.documentElement;

  /* 主题 */
  if(prefs.theme==="auto")r.removeAttribute("data-theme");
  else r.setAttribute("data-theme",prefs.theme);

  /* 背景图 */
  if(prefs.bg){
    r.style.setProperty("--bg-img",'url("'+prefs.bg+'")');
    bgEl.classList.add("has");
  }else{
    r.style.removeProperty("--bg-img");
    bgEl.classList.remove("has");
  }

  /* 我的气泡 */
  var mv=paintVars(colorOf(prefs.me),prefs.meStyle);
  r.setAttribute("data-me",prefs.meStyle);
  r.style.setProperty("--me",mv.bg);
  r.style.setProperty("--me-t",mv.t);
  r.style.setProperty("--me-bd",mv.bd);
  r.style.setProperty("--accent",mv.accent);

  /* 对方气泡 */
  if(prefs.ot){
    var ov=paintVars(colorOf(prefs.ot),prefs.otStyle);
    r.setAttribute("data-ot",prefs.otStyle);
    r.style.setProperty("--ot",ov.bg);
    r.style.setProperty("--ot-t",ov.t);
    r.style.setProperty("--ot-bd",ov.bd);
  }else{
    /* 自动：交还给主题 CSS */
    r.removeAttribute("data-ot");
    r.style.removeProperty("--ot");
    r.style.removeProperty("--ot-t");
    r.style.removeProperty("--ot-bd");
  }

  /* 字体 / 字号 / 圆角 */
  var f=FONTS[0];
  for(var i=0;i<FONTS.length;i++){if(FONTS[i].id===prefs.font)f=FONTS[i];}
  r.style.setProperty("--ff",f.v);
  r.style.setProperty("--fs",prefs.fs+"px");
  r.style.setProperty("--r",prefs.r+"px");
}

/* ---------- 色板 ---------- */
function buildPalette(wrap,opts){
  var items=[];

  if(opts.auto){
    var a=document.createElement("button");
    a.type="button";a.className="sw sw-auto";a.dataset.v="";
    a.title="自动";a.setAttribute("aria-label","自动");
    wrap.appendChild(a);items.push(a);
  }

  PRESETS.forEach(function(p){
    var b=document.createElement("button");
    b.type="button";b.className="sw";b.dataset.v=p.id;
    b.title=p.n;b.setAttribute("aria-label",p.n);
    b.style.background=p.c;
    wrap.appendChild(b);items.push(b);
  });

  var c=document.createElement("button");
  c.type="button";c.className="sw sw-custom";c.title="自定义颜色";
  c.setAttribute("aria-label","自定义颜色");
  var inp=document.createElement("input");
  inp.type="color";inp.value="#2f7cf6";
  c.appendChild(inp);
  wrap.appendChild(c);

  wrap.addEventListener("click",function(e){
    var b=e.target.closest(".sw");
    if(!b||b===c)return;
    opts.set(b.dataset.v);
  });
  inp.addEventListener("input",function(){opts.set(inp.value);});

  return {custom:c,inp:inp,items:items};
}

function syncPalette(pal,val){
  if(!pal)return;
  for(var i=0;i<pal.items.length;i++){
    pal.items[i].setAttribute("aria-pressed",String(pal.items[i].dataset.v===val));
  }
  var cus=isHex(val);
  pal.custom.setAttribute("aria-pressed",String(cus));
  if(cus){
    pal.custom.style.background=val;
    pal.inp.value=val;
  }else{
    pal.custom.style.background="conic-gradient(from .25turn,#ff5f6d,#ffc371,#47cf73,#2f7cf6,#7a5af8,#ff5f6d)";
  }
}

function markGroup(id,val){
  var bs=document.querySelectorAll("#"+id+" button[data-v]");
  for(var i=0;i<bs.length;i++){
    bs[i].setAttribute("aria-pressed",String(bs[i].dataset.v===String(val)));
  }
}
function syncUI(){
  markGroup("themeChips",prefs.theme);
  markGroup("sizeChips",prefs.fs);
  markGroup("radiusChips",prefs.r);
  markGroup("fontChips",prefs.font);
  markGroup("meStyleChips",prefs.meStyle);
  markGroup("otStyleChips",prefs.otStyle);
  syncPalette(PAL_ME,prefs.me);
  syncPalette(PAL_OT,prefs.ot);

  /* 自动配色时禁用质感按钮 */
  var bs=document.querySelectorAll("#otStyleChips button[data-v]");
  for(var i=0;i<bs.length;i++){bs[i].disabled=!prefs.ot;}
}

/* 初始化两个色板 */
PAL_ME=buildPalette(document.getElementById("meSw"),{
  auto:false,
  set:function(v){prefs.me=v;savePrefs();applyPrefs();syncUI();}
});
PAL_OT=buildPalette(document.getElementById("otSw"),{
  auto:true,
  set:function(v){prefs.ot=v;savePrefs();applyPrefs();syncUI();}
});

/* 选项组绑定 */
function bindGroup(id,key,cast){
  var g=document.getElementById(id);
  if(!g)return;
  g.addEventListener("click",function(e){
    var b=e.target.closest("button[data-v]");if(!b||b.disabled)return;
    prefs[key]=cast?cast(b.dataset.v):b.dataset.v;
    savePrefs();applyPrefs();syncUI();
  });
}
bindGroup("themeChips","theme");
bindGroup("sizeChips","fs",Number);
bindGroup("radiusChips","r",Number);
bindGroup("fontChips","font");
bindGroup("meStyleChips","meStyle");
bindGroup("otStyleChips","otStyle");

/* ============ 点击改名字 ============ */
function applyName(){
  nameEl.textContent=prefs.name;
  msg.placeholder="发消息给 "+prefs.name+"…";
  document.title=prefs.name;
}
nameEl.addEventListener("click",function(){
  if(nameEl._busy)return;
  nameEl._busy=true;

  var inp=document.createElement("input");
  inp.type="text";
  inp.className="nameInp";
  inp.value=prefs.name;
  inp.maxLength=16;
  inp.setAttribute("aria-label","修改名字");
  nameEl.style.display="none";
  nameEl.parentNode.insertBefore(inp,nameEl);
  inp.focus();inp.select();

  var done=false;
  function finish(ok){
    if(done)return;done=true;
    var v=inp.value.trim();
    if(ok&&v)prefs.name=v.slice(0,16);
    savePrefs();
    inp.remove();
    nameEl.style.display="";
    nameEl._busy=false;
    applyName();
  }
  inp.addEventListener("keydown",function(e){
    if(e.key==="Enter"&&!e.isComposing){e.preventDefault();finish(true);}
    else if(e.key==="Escape"){finish(false);}
  });
  inp.addEventListener("blur",function(){finish(true);});
});

/* ============ 背景图：压缩后存本地 ============ */
function shrink(file,cb){
  var fr=new FileReader();
  fr.onload=function(){
    var img=new Image();
    img.onload=function(){
      var max=1400;
      var s=Math.min(1,max/Math.max(img.width||1,img.height||1));
      var w=Math.max(1,Math.round(img.width*s)),h=Math.max(1,Math.round(img.height*s));
      var c=document.createElement("canvas");c.width=w;c.height=h;
      var ctx=c.getContext("2d");
      ctx.fillStyle="#ffffff";ctx.fillRect(0,0,w,h);
      ctx.drawImage(img,0,0,w,h);
      var q=0.8,d=c.toDataURL("image/jpeg",q);
      while(d.length>1500000&&q>0.35){q-=0.12;d=c.toDataURL("image/jpeg",q);}
      cb(d);
    };
    img.onerror=function(){cb(null)};
    img.src=fr.result;
  };
  fr.onerror=function(){cb(null)};
  fr.readAsDataURL(file);
}
document.getElementById("pickBg").onclick=function(){fileInput.click()};
fileInput.addEventListener("change",function(){
  var f=fileInput.files&&fileInput.files[0];
  if(!f)return;
  if(!/^image\//.test(f.type)){toast("请选择图片文件");fileInput.value="";return;}
  var old=st.textContent;
  st.textContent="处理中…";
  shrink(f,function(url){
    fileInput.value="";
    st.textContent=old;
    if(!url){toast("图片读取失败");return;}
    prefs.bg=url;
    if(!savePrefs()){
      prefs.bg="";
      toast("图片太大，保存失败");
    }else{
      toast("背景已更换");
    }
    applyPrefs();syncUI();
  });
});
document.getElementById("clearBg").onclick=function(){
  prefs.bg="";savePrefs();applyPrefs();syncUI();toast("已移除背景");
};

/* 面板开合 */
function openSheet(){sheet.classList.add("open");document.body.style.overflow="hidden";}
function closeSheet(){sheet.classList.remove("open");document.body.style.overflow="";}
document.getElementById("openSheet").onclick=openSheet;
document.getElementById("done").onclick=closeSheet;
document.getElementById("mask").onclick=closeSheet;
document.addEventListener("keydown",function(e){if(e.key==="Escape")closeSheet();});

/* 轻提示 */
var toastEl=null;
function toast(t){
  if(!toastEl){toastEl=document.createElement("div");toastEl.className="toast";document.body.appendChild(toastEl);}
  toastEl.textContent=t;toastEl.classList.add("show");
  clearTimeout(toastEl._t);
  toastEl._t=setTimeout(function(){toastEl.classList.remove("show")},2000);
}

/* ============ 事件绑定 ============ */
document.getElementById("send").onclick=send;
replyBtn.onclick=reply;
msg.addEventListener("keydown",function(e){if(e.key==="Enter"&&!e.isComposing)send()});
document.getElementById("clear").onclick=clearChat;
document.getElementById("clear2").onclick=clearChat;

var menu=document.getElementById("menu");
document.getElementById("star").onclick=function(e){e.stopPropagation();menu.classList.toggle("open")};
menu.addEventListener("click",function(){menu.classList.remove("open")});
document.addEventListener("click",function(){menu.classList.remove("open")});

/* ============ 启动 ============ */
applyPrefs();
applyName();
syncUI();
render(false);
