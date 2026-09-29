import 'dotenv/config';
import { Telegraf, Markup } from 'telegraf';

const token = process.env.BOT_TOKEN;
if (!token) throw new Error("BOT_TOKEN is missing in .env");

const bot = new Telegraf(token);
const games = new Map();

const TOPICS = [
  "Ісік процесіне сипаттама",
  "Ісіктердің пайда болу себептері",
  "Ісік құрылысы",
  "Ісік өсуінің түрлері",
  "Қатерлі және қатерсіз ісіктер",
  "Метастаздау және рецидивтер",
  "Ісік алды және рак алды жағдайлар",
  "Ісіктер жіктелуі"
];

const QUESTIONS = [
  {q:"Ісіктің негізгі екі биологиялық сипаты қандай?", a:["Өсу және атипия","Тек қабыну","Тек ауырсыну","Тек қызу"], c:0, topic:0},
  {q:"Канцероген дегеніміз не?", a:["Ісік дамуына ықпал ететін фактор","Тек бактерия","Қан жасушасы","Гормон ғана"], c:0, topic:1},
  {q:"Ісіктің паренхимасы дегеніміз не?", a:["Ісіктің негізгі функционалдық жасушалары","Тек дәнекер тін","Қан тамыры ғана","Сүйек қабаты"], c:0, topic:2},
  {q:"Инфильтративті өсуге тән белгі қандай?", a:["Қоршаған тінге ену","Тек сыртқа өсу","Капсула ішінде ғана қалу","Өсудің болмауы"], c:0, topic:3},
  {q:"Қатерсіз ісікке көбіне не тән?", a:["Шектелген, экспансивті өсу","Ерте метастаз","Айқын инвазия","Жаппай деструкция"], c:0, topic:4},
  {q:"Метастаз дегеніміз не?", a:["Ісік жасушаларының басқа жерге таралуы","Ісіктің капсула түзуі","Қабынудың басылуы","Тіннің қалыпты өсуі"], c:0, topic:5},
  {q:"Рецидив дегеніміз не?", a:["Ісік емнен кейін қайта пайда болуы","Бірінші рет пайда болуы","Тек метастаз","Қабынудың басталуы"], c:0, topic:5},
  {q:"Ісік алды жағдай дегеніміз не?", a:["Қатерлі ісікке өту қаупі жоғары жағдай","Кез келген инфекция","Сау тін","Тек жарақат"], c:0, topic:6},
  {q:"Ісіктерді жіктеуде қандай белгі маңызды?", a:["Тіндік шығу тегі мен биологиялық қасиеті","Науқастың бойы","Ауа температурасы","Киім түсі"], c:0, topic:7},
  {q:"Қатерлі ісіктердің маңызды ерекшеліктерінің бірі:", a:["Инвазия және метастаз беру мүмкіндігі","Әрқашан капсуламен шектелуі","Ешқашан қайталанбауы","Тек бір жерде өсуі"], c:0, topic:4}
];

const ROLES = [
  {name:"Метастаз", team:"path", desc:"Патологиялық топ. Түнде топпен бірге бір ойыншыны зерттеуден шығарады."},
  {name:"Инвазиялық өсу", team:"path", desc:"Патологиялық топ. Түнгі шешімге қатысады."},
  {name:"Атипия", team:"path", desc:"Патологиялық топ. Түнгі шешімге қатысады."},
  {name:"Рецидив", team:"path", desc:"Патологиялық топ. Түнгі шешімге қатысады."},
  {name:"Қатерлі ісік жасушасы", team:"path", desc:"Патологиялық топ. Түнгі шешімге қатысады."},
  {name:"Қатерлі ісік жасушасы", team:"path", desc:"Патологиялық топ. Түнгі шешімге қатысады."},
  {name:"Патологоанатом", team:"med", desc:"Түнде бір ойыншының командасын тексере алады."},
  {name:"Онколог", team:"med", desc:"Түнде бір ойыншыны келесі күнгі зерттеуден қорғауға тырысады."},
  {name:"Лаборант", team:"med", desc:"Бір рет қосымша белгі сұрай алады."},
  {name:"Морфолог", team:"med", desc:"Бір рет бір ойыншының рөл санатына қатысты белгі алады."},
  {name:"Цитолог", team:"med", desc:"Бір рет бір ойыншының қатерлі топқа жататыны туралы тексеріс жасайды."},
  ...Array.from({length:14}, (_,i)=>({name:`Медициналық студент ${i+1}`, team:"med", desc:"Арнайы қабілет жоқ. Дауыс беру және сұрақтарға жауап беру арқылы медициналық топқа көмектес."}))
];

function shuffle(a){ return [...a].sort(()=>Math.random()-0.5); }
function gameKey(ctx){ return String(ctx.chat.id); }
function getGame(ctx){ return games.get(gameKey(ctx)); }

function phaseText(g){
  return g.phase === "day" ? "☀️ КҮН" : "🌙 ТҮН";
}

function alivePlayers(g){
  return [...g.players.values()].filter(p=>p.alive);
}

function roleFor(g, uid){ return g.players.get(uid)?.role; }

function resetRoundVotes(g){
  g.votes = new Map();
}

function winner(g){
  const alive = alivePlayers(g);
  const path = alive.filter(p=>p.team==="path").length;
  const med = alive.filter(p=>p.team==="med").length;
  if(path===0) return "med";
  if(path>=med) return "path";
  return null;
}

async function dm(ctx, text, extra={}) {
  try { await ctx.telegram.sendMessage(ctx.from.id, text, extra); }
  catch(e) { /* user may not have started the bot */ }
}

bot.start(async ctx=>{
  await ctx.reply(
`🧬 ПАТОЛОГИЯЛЫҚ МАФИЯ

25 адамға арналған оқу ойыны.

Топта:
/newgame — жаңа ойын
/join — ойынға қосылу
/players — ойыншылар
/startgame — 25 адам жиналғанда бастау

Ойын барысында боттың жеке чатынан жасырын рөліңді аласың.`
  );
});

bot.command("newgame", async ctx=>{
  games.set(gameKey(ctx), {
    host: ctx.from.id,
    players:new Map(),
    phase:"lobby",
    round:0,
    votes:new Map(),
    protected:null,
    used:{lab:false,morph:false,cyto:false},
    questionIndex:0,
    questionAnswered:new Set()
  });
  await ctx.reply("🧬 Жаңа ойын ашылды!\n25 адамға дейін /join деп қосылыңдар.\nЖүргізуші қажет болса /players арқылы тізімді көре алады.");
});

bot.command("join", async ctx=>{
  const g=getGame(ctx);
  if(!g) return ctx.reply("Алдымен /newgame жазыңыз.");
  if(g.phase!=="lobby") return ctx.reply("Ойын басталып кетті.");
  if(g.players.has(ctx.from.id)) return ctx.reply("Сіз ойынға бұрыннан қосылдыңыз.");
  if(g.players.size>=25) return ctx.reply("Ойын толды: 25/25.");
  g.players.set(ctx.from.id,{
    id:ctx.from.id,name:ctx.from.first_name||"Ойыншы",username:ctx.from.username||"",
    alive:true,team:null,role:null
  });
  await ctx.reply(`✅ ${ctx.from.first_name||"Ойыншы"} қосылды: ${g.players.size}/25`);
  if(g.players.size===25) await ctx.reply("🎉 25/25! Жүргізуші /startgame деп жаза алады.");
});

bot.command("players", async ctx=>{
  const g=getGame(ctx);
  if(!g) return ctx.reply("Белсенді ойын жоқ.");
  const list=[...g.players.values()].map((p,i)=>`${i+1}. ${p.name}${p.alive?"":" — ойыннан шықты"}`).join("\n");
  await ctx.reply(`👥 Ойыншылар (${g.players.size}/25)\n\n${list||"Әзірге ешкім жоқ."}`);
});

bot.command("startgame", async ctx=>{
  const g=getGame(ctx);
  if(!g) return ctx.reply("Алдымен /newgame.");
  if(ctx.from.id!==g.host) return ctx.reply("Тек ойын жүргізушісі бастай алады.");
  if(g.players.size!==25) return ctx.reply(`Қазір ${g.players.size}/25. Дәл 25 адам керек.`);
  const roles=shuffle(ROLES);
  const plist=shuffle([...g.players.values()]);
  plist.forEach((p,i)=>{
    p.role=roles[i].name; p.team=roles[i].team;
  });
  g.phase="day"; g.round=1;
  for(const p of plist){
    await dm(ctx,`🧬 СЕНІҢ ЖАСЫРЫН РӨЛІҢ\n\nРөл: ${p.role}\nКоманда: ${p.team==="path"?"🧪 Патологиялық топ":"🩺 Медициналық топ"}\n\n${ROLES.find(r=>r.name===p.role)?.desc}`);
  }
  await ctx.reply(`🚀 Ойын басталды!\n${phaseText(g)} ${g.round}-раунд.\n\nБарлығың ботқа /role деп жазып, өз рөліңді жеке чаттан көре аласың.\n\nТөмендегі патология сұрағына жауап беріп, содан кейін талқылауды бастаңыздар.`);
  await sendQuestion(ctx);
});

bot.command("role", async ctx=>{
  const g=getGame(ctx);
  const p=g?.players.get(ctx.from.id);
  if(!p) return ctx.reply("Сіз бұл ойынға тіркелмегенсіз.");
  if(!p.role) return ctx.reply("Ойын әлі басталған жоқ.");
  await dm(ctx,`🔐 Рөлің: ${p.role}\nКоманда: ${p.team==="path"?"🧪 Патологиялық топ":"🩺 Медициналық топ"}\n\n${ROLES.find(r=>r.name===p.role)?.desc}`);
  await ctx.reply("Рөліңіз жеке чатқа жіберілді.");
});

async function sendQuestion(ctx){
  const g=getGame(ctx);
  const q=QUESTIONS[(g.questionIndex++)%QUESTIONS.length];
  g.currentQuestion=q;
  g.questionAnswered=new Set();
  const buttons=q.a.map((x,i)=>[Markup.button.callback(`${String.fromCharCode(65+i)}. ${x}`,`ans:${i}`)]);
  await ctx.reply(`📚 ${TOPICS[q.topic]}\n\n❓ ${q.q}\n\nЖауапты батырмамен таңдаңыз:`,Markup.inlineKeyboard(buttons));
}

bot.action(/^ans:(\d)$/, async ctx=>{
  const g=getGame(ctx);
  if(!g || g.phase!=="day") return ctx.answerCbQuery("Қазір сұрақ кезеңі емес.");
  const p=g.players.get(ctx.from.id);
  if(!p || !p.alive) return ctx.answerCbQuery("Сіз ойынға қатыспайсыз.");
  if(g.questionAnswered.has(p.id)) return ctx.answerCbQuery("Сіз жауап беріп қойдыңыз.");
  g.questionAnswered.add(p.id);
  const chosen=Number(ctx.match[1]);
  const correct=chosen===g.currentQuestion.c;
  await ctx.answerCbQuery(correct?"Дұрыс!":"Қате.");
  if(correct) await ctx.reply(`🧠 ${p.name} — дұрыс жауап! +1 білім ұпайы`);
});

bot.command("vote", async ctx=>{
  const g=getGame(ctx);
  if(!g || g.phase!=="day") return ctx.reply("Қазір дауыс беру кезеңі емес.");
  const p=g.players.get(ctx.from.id);
  if(!p || !p.alive) return ctx.reply("Сіз дауыс бере алмайсыз.");
  const parts=ctx.message.text.trim().split(/\s+/);
  const n=Number(parts[1]);
  const alive=alivePlayers(g);
  if(!Number.isInteger(n)||n<1||n>alive.length) return ctx.reply("Мысалы: /vote 7");
  const target=alive[n-1];
  if(target.id===p.id) return ctx.reply("Өзіңізге дауыс бере алмайсыз.");
  g.votes.set(p.id,target.id);
  await ctx.reply(`🗳 Дауыс қабылданды: ${target.name}`);
  if([...alive].every(x=>g.votes.has(x.id) || x.id===p.id)){
    await resolveVote(ctx);
  }
});

async function resolveVote(ctx){
  const g=getGame(ctx);
  const counts=new Map();
  for(const id of g.votes.values()) counts.set(id,(counts.get(id)||0)+1);
  let top=[...counts.entries()].sort((a,b)=>b[1]-a[1]);
  if(!top.length) return;
  const max=top[0][1];
  const leaders=top.filter(x=>x[1]===max);
  if(leaders.length>1){
    await ctx.reply("🤝 Дауыс тең түсті. Ешкім ойыннан шықпайды.");
  } else {
    const target=g.players.get(leaders[0][0]);
    target.alive=false;
    await ctx.reply(`📋 Дауыс қорытындысы: ${target.name} ойыннан шықты.\nРөлі: ${target.role}\nКоманда: ${target.team==="path"?"🧪 Патологиялық":"🩺 Медициналық"}`);
  }
  const w=winner(g);
  if(w) return endGame(ctx,w);
  g.phase="night"; g.votes=new Map(); g.protected=null;
  await ctx.reply(`🌙 ТҮН ${g.round}. Арнайы рөлдер әрекет етеді.\n\nПатологиялық топ өзара жеке чатта келісіп, бір ойыншыны /night N арқылы таңдайды.\nПатологоанатом /check N\nОнколог /protect N\nЛаборант /clue N\nМорфолог /morph N\nЦитолог /cyto N`);
}

bot.command("night", async ctx=>{
  const g=getGame(ctx);
  const p=g?.players.get(ctx.from.id);
  if(!g || g.phase!=="night" || !p || !p.alive || p.team!=="path") return ctx.reply("Бұл әрекет сізге қазір қолжетімді емес.");
  const n=Number(ctx.message.text.trim().split(/\s+/)[1]);
  const alive=alivePlayers(g);
  const target=alive[n-1];
  if(!target) return ctx.reply("Мысалы: /night 7");
  g.nightTarget=target.id;
  await ctx.reply(`🌙 Таңдау қабылданды: ${target.name}`);
  await tryNightEnd(ctx);
});

bot.command("check", async ctx=>{
  const g=getGame(ctx); const p=g?.players.get(ctx.from.id);
  if(!g || g.phase!=="night" || !p || !p.alive || p.role!=="Патологоанатом") return ctx.reply("Бұл әрекет сізге қазір қолжетімді емес.");
  const n=Number(ctx.message.text.trim().split(/\s+/)[1]); const target=alivePlayers(g)[n-1];
  if(!target) return ctx.reply("Мысалы: /check 7");
  await dm(ctx,`🔬 Патологоанатом тексерісі: ${target.name} — ${target.team==="path"?"🧪 Патологиялық топ":"🩺 Медициналық топ"}`);
  await ctx.reply("🔬 Нәтиже жеке чатқа жіберілді.");
});

bot.command("protect", async ctx=>{
  const g=getGame(ctx); const p=g?.players.get(ctx.from.id);
  if(!g || g.phase!=="night" || !p || !p.alive || p.role!=="Онколог") return ctx.reply("Бұл әрекет сізге қазір қолжетімді емес.");
  const n=Number(ctx.message.text.trim().split(/\s+/)[1]); const target=alivePlayers(g)[n-1];
  if(!target) return ctx.reply("Мысалы: /protect 7");
  g.protected=target.id;
  await ctx.reply("🩺 Қорғау қабылданды.");
  await tryNightEnd(ctx);
});

bot.command("clue", async ctx=>{
  const g=getGame(ctx); const p=g?.players.get(ctx.from.id);
  if(!g || g.phase!=="night" || !p || !p.alive || p.role!=="Лаборант" || g.used.lab) return ctx.reply("Бұл әрекет қолжетімсіз немесе бұрын қолданылған.");
  const n=Number(ctx.message.text.trim().split(/\s+/)[1]); const target=alivePlayers(g)[n-1];
  if(!target) return ctx.reply("Мысалы: /clue 7");
  g.used.lab=true;
  await dm(ctx,`🧪 Лабораториялық белгі: ${target.name} — ${target.team==="path"?"ісіктік/патологиялық бағытқа жақын белгі":"медициналық топ белгісі"}.`);
  await ctx.reply("🧪 Белгі жеке чатқа жіберілді.");
});

bot.command("morph", async ctx=>{
  const g=getGame(ctx); const p=g?.players.get(ctx.from.id);
  if(!g || g.phase!=="night" || !p || !p.alive || p.role!=="Морфолог" || g.used.morph) return ctx.reply("Бұл әрекет қолжетімсіз немесе бұрын қолданылған.");
  const n=Number(ctx.message.text.trim().split(/\s+/)[1]); const target=alivePlayers(g)[n-1];
  if(!target) return ctx.reply("Мысалы: /morph 7");
  g.used.morph=true;
  await dm(ctx,`🧫 Морфологиялық белгі: ${target.name} — ${target.team==="path"?"атипиялық/ісіктік бағытқа сәйкес белгі":"қалыпты медициналық топ белгісі"}.`);
  await ctx.reply("🧫 Белгі жеке чатқа жіберілді.");
});

bot.command("cyto", async ctx=>{
  const g=getGame(ctx); const p=g?.players.get(ctx.from.id);
  if(!g || g.phase!=="night" || !p || !p.alive || p.role!=="Цитолог" || g.used.cyto) return ctx.reply("Бұл әрекет қолжетімсіз немесе бұрын қолданылған.");
  const n=Number(ctx.message.text.trim().split(/\s+/)[1]); const target=alivePlayers(g)[n-1];
  if(!target) return ctx.reply("Мысалы: /cyto 7");
  g.used.cyto=true;
  await dm(ctx,`🔎 Цитологиялық белгі: ${target.name} — ${target.team==="path"?"қатерлі топқа жатуы мүмкін":"қатерлі топқа жатпайды"}.`);
  await ctx.reply("🔎 Белгі жеке чатқа жіберілді.");
});

async function tryNightEnd(ctx){
  const g=getGame(ctx);
  const pathAlive=alivePlayers(g).filter(p=>p.team==="path");
  if(!g.nightTarget) return;
  const hasPathChoice=pathAlive.length>0;
  const onc=alivePlayers(g).find(p=>p.role==="Онколог");
  if(hasPathChoice && (!onc || g.protected!==null)){
    const target=g.players.get(g.nightTarget);
    if(target && g.protected!==target.id){
      target.alive=false;
      await ctx.reply(`🌅 Таң атты. ${target.name} бүгінгі зерттеуге қатыспайды.\nРөлі: ${target.role}`);
    } else {
      await ctx.reply("🌅 Таң атты. Қорғау сәтті болды — ешкім зерттеуден шығарылмады.");
    }
    const w=winner(g);
    if(w) return endGame(ctx,w);
    g.round++;
    g.phase="day"; g.nightTarget=null; g.protected=null;
    await ctx.reply(`☀️ КҮН ${g.round}. Талқылау басталды.`);
    await sendQuestion(ctx);
  }
}

function endGame(ctx,w){
  const g=getGame(ctx);
  g.phase="ended";
  return ctx.reply(w==="path"?
`🧪 ОЙЫН АЯҚТАЛДЫ!\nПатологиялық топ жеңді.\n\n📚 Қорытынды: ісік процесін бағалауда өсу түрі, қатерлілік белгілері, метастаз және рецидив ұғымдарын ажырату маңызды.`:
`🩺 ОЙЫН АЯҚТАЛДЫ!\nМедициналық топ жеңді.\n\n📚 Қорытынды: ісіктердің этиологиясы, құрылысы, өсуі, жіктелуі және қатерлі/қатерсіз айырмашылықтарын қайталап шығыңыздар.`);
}

bot.command("status", async ctx=>{
  const g=getGame(ctx);
  if(!g) return ctx.reply("Ойын жоқ.");
  const alive=alivePlayers(g);
  const list=alive.map((p,i)=>`${i+1}. ${p.name}`).join("\n");
  await ctx.reply(`${phaseText(g)} ${g.round}\nТірі ойыншылар: ${alive.length}/25\n\n${list}`);
});

bot.command("help", async ctx=>{
  await ctx.reply(
`📖 Командалар:
/newgame — жаңа ойын
/join — қосылу
/players — тізім
/startgame — бастау
/role — өз рөлің
/status — тірі ойыншылар
/vote N — дауыс
/night N — патологиялық топ таңдауы
/check N — патологоанатом
/protect N — онколог
/clue N — лаборант
/morph N — морфолог
/cyto N — цитолог`
  );
});

bot.catch(err=>console.error("BOT ERROR",err));
bot.launch();
console.log("Pathology Mafia bot started.");
