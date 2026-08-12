const state = {
  players: [], identities: {}, assignments: {}, assignmentOrder: [], assignmentIndex: 0,
  activePlayers: new Set(), ranking: [], finishCount: 1, guesser: null, answerer: null,
  secret: null, time: 15, timer: null, turnIndex: 0, round: 0
};

function show(screenId) {
  document.querySelectorAll(".screen").forEach(screen => screen.classList.remove("active"));
  const screen = document.getElementById(screenId);
  if (screen) screen.classList.add("active");
}

function shuffle(array) {
  const result = [...array];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

function renderPlayers() {
  const selected = document.querySelector("#playerCount .selected");
  const count = Number(selected?.dataset.count || 4);
  const container = document.getElementById("players");
  container.innerHTML = "";
  for (let i = 0; i < count; i++) {
    const input = document.createElement("input");
    input.placeholder = `Spieler ${i + 1}`;
    input.maxLength = 20;
    input.autocomplete = "off";
    container.appendChild(input);
  }
  const finishContainer = document.getElementById("finishCount");
  finishContainer.innerHTML = "";
  for (let i = 1; i <= count; i++) {
    const button = document.createElement("button");
    button.textContent = i;
    button.dataset.value = i;
    if (i === 1) button.classList.add("selected");
    finishContainer.appendChild(button);
  }
}

function readPlayers() {
  const inputs = [...document.querySelectorAll("#players input")];
  state.players = inputs.map((input, index) => ({
    id: index,
    name: input.value.trim() || `Spieler ${index + 1}`
  }));
}

function createAssignments() {
  const playerIds = state.players.map(player => player.id);
  let targets, valid = false;
  while (!valid) {
    targets = shuffle(playerIds);
    valid = targets.every((targetId, index) => targetId !== playerIds[index]);
  }
  state.assignments = {};
  playerIds.forEach((chooserId, index) => state.assignments[chooserId] = targets[index]);
  state.assignmentOrder = shuffle(playerIds);
  state.assignmentIndex = 0;
}

function getCurrentChooser() { return state.assignmentOrder[state.assignmentIndex]; }

function startAssignment() {
  const chooserId = getCurrentChooser();
  const chooser = state.players.find(p => p.id === chooserId);
  const targetId = state.assignments[chooserId];
  const target = state.players.find(p => p.id === targetId);
  document.getElementById("assignmentPassTitle").textContent = `Gib das Handy an ${chooser.name}`;
  document.getElementById("assignmentPassText").textContent = `${chooser.name} bestimmt jetzt die Identität von ${target.name}.`;
  show("assignmentPass");
}

function openAssignment() {
  const chooserId = getCurrentChooser();
  const targetId = state.assignments[chooserId];
  const chooser = state.players.find(p => p.id === chooserId);
  const target = state.players.find(p => p.id === targetId);
  document.getElementById("chooserName").textContent = chooser.name;
  document.getElementById("targetName").textContent = target.name;
  const input = document.getElementById("identityInput");
  input.value = "";
  show("assignment");
  setTimeout(() => input.focus(), 50);
}

function confirmIdentity() {
  const input = document.getElementById("identityInput");
  const identity = input.value.trim();
  if (!identity) { alert("Bitte gib eine Identität ein."); input.focus(); return; }
  const chooserId = getCurrentChooser();
  const targetId = state.assignments[chooserId];
  state.identities[targetId] = identity;
  state.assignmentIndex++;
  if (state.assignmentIndex >= state.assignmentOrder.length) {
    state.activePlayers = new Set(state.players.map(player => player.id));
    state.ranking = [];
    state.turnIndex = 0;
    prepareRound();
    return;
  }
  const nextChooserId = getCurrentChooser();
  const nextChooser = state.players.find(p => p.id === nextChooserId);
  document.getElementById("nextChooserText").textContent = `Gib das Handy jetzt an ${nextChooser.name}.`;
  show("assignmentDone");
}

function getActivePlayers() {
  return state.players.filter(player => state.activePlayers.has(player.id));
}

function choosePlayersForRound() {
  const active = getActivePlayers();
  if (!active.length) { finishGame(); return false; }
  if (active.length === 1) {
    const lastPlayer = active[0];
    if (!state.ranking.some(item => item.playerId === lastPlayer.id)) {
      state.ranking.push({ playerId: lastPlayer.id, name: lastPlayer.name, identity: state.identities[lastPlayer.id] });
    }
    state.activePlayers.delete(lastPlayer.id);
    finishGame();
    return false;
  }
  if (state.turnIndex >= active.length) state.turnIndex = 0;
  const guesser = active[state.turnIndex];
  const answerer = active[(state.turnIndex + 1) % active.length];
  state.guesser = guesser.id;
  state.answerer = answerer.id;
  state.secret = state.identities[guesser.id];
  return true;
}

function prepareRound() {
  if (state.ranking.length >= state.finishCount || state.activePlayers.size === 0) {
    finishGame(); return;
  }
  if (!choosePlayersForRound()) return;
  const guesser = state.players.find(p => p.id === state.guesser);
  const answerer = state.players.find(p => p.id === state.answerer);
  document.getElementById("passTitle").textContent = `Gib das Handy an ${answerer.name}`;
  document.getElementById("passText").textContent = `${answerer.name} beantwortet die Fragen von ${guesser.name}.`;
  show("pass");
}

function revealSecret() {
  const guesser = state.players.find(p => p.id === state.guesser);
  document.getElementById("secretTarget").textContent = `${guesser.name} ist:`;
  document.getElementById("secretName").textContent = state.secret;
  show("secret");
}

function readyForQuestions() { startGuessing(); }

function startGuessing() {
  const guesser = state.players.find(p => p.id === state.guesser);
  document.getElementById("guesser").textContent = `${guesser.name} rät`;
  state.time = 15;
  updateTimer();
  clearInterval(state.timer);
  state.timer = setInterval(() => {
    state.time--;
    updateTimer();
    if (state.time <= 0) {
      clearInterval(state.timer);
      answerNo();
    }
  }, 1000);
  show("round");
}

function updateTimer() { document.getElementById("timer").textContent = state.time; }

function answerYes() { state.time += 5; updateTimer(); }

function answerNo() {
  clearInterval(state.timer);
  state.turnIndex++;
  prepareRound();
}

function answerHit() {
  clearInterval(state.timer);
  const playerId = state.guesser;
  const player = state.players.find(p => p.id === playerId);
  state.ranking.push({ playerId: player.id, name: player.name, identity: state.secret });
  state.activePlayers.delete(player.id);
  document.getElementById("successTitle").textContent = "🎯 Volltreffer!";
  document.getElementById("successText").textContent = `${player.name} ist ${state.secret}.`;

  if (state.ranking.length >= state.finishCount || state.activePlayers.size === 0) {
    document.getElementById("nextRound").style.display = "none";
    show("success");
    setTimeout(finishGame, 1200);
    return;
  }
  document.getElementById("nextRound").style.display = "block";
  show("success");
}

function nextRound() {
  const oldIndex = state.players.findIndex(p => p.id === state.guesser);
  const active = getActivePlayers();
  if (!active.length) { finishGame(); return; }

  let nextPlayer = null;
  for (let offset = 1; offset <= state.players.length; offset++) {
    const candidate = state.players[(oldIndex + offset) % state.players.length];
    if (state.activePlayers.has(candidate.id)) { nextPlayer = candidate; break; }
  }
  state.turnIndex = active.findIndex(p => p.id === nextPlayer.id);
  prepareRound();
}

function buildRanking() {
  const container = document.getElementById("endText");
  let html = `<div style="margin-top:20px;text-align:left;">`;
  state.ranking.forEach((item, index) => {
    const medal = index === 0 ? "🥇" : index === 1 ? "🥈" : index === 2 ? "🥉" : "4️⃣";
    html += `<div style="padding:16px;margin-bottom:10px;border:1px solid #343943;border-radius:18px;background:#17191e;">
      <div style="font-size:22px;font-weight:900;">${medal} Platz ${index + 1}</div>
      <div style="margin-top:5px;font-size:19px;font-weight:800;">${escapeHtml(item.name)}</div>
      <div style="margin-top:3px;color:#a8adb7;">${escapeHtml(item.identity)}</div>
    </div>`;
  });
  const remaining = state.players.filter(player => !state.ranking.some(item => item.playerId === player.id));
  if (remaining.length) {
    html += `<div style="margin-top:20px;margin-bottom:10px;color:#a8adb7;font-size:13px;font-weight:800;text-transform:uppercase;">Noch nicht erraten</div>`;
    remaining.forEach(player => html += `<div style="padding:13px 16px;margin-bottom:8px;border:1px solid #292d35;border-radius:16px;">${escapeHtml(player.name)}</div>`);
  }
  html += "</div>";
  container.innerHTML = html;
}

function escapeHtml(value) {
  return String(value).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;").replace(/'/g,"&#039;");
}

function finishGame() {
  clearInterval(state.timer);
  if (state.ranking.length < state.players.length) {
    const remaining = state.players.filter(player => !state.ranking.some(item => item.playerId === player.id));
    if (remaining.length === 1 && state.ranking.length === state.players.length - 1) {
      const last = remaining[0];
      state.ranking.push({ playerId:last.id, name:last.name, identity:state.identities[last.id] });
    }
  }
  buildRanking();
  show("end");
}

function restartGame() {
  clearInterval(state.timer);
  state.players=[]; state.identities={}; state.assignments={}; state.assignmentOrder=[]; state.assignmentIndex=0;
  state.activePlayers=new Set(); state.ranking=[]; state.finishCount=1; state.guesser=null; state.answerer=null;
  state.secret=null; state.time=15; state.timer=null; state.turnIndex=0; state.round=0;
  renderPlayers(); show("home");
}

document.getElementById("newGame").onclick = () => { renderPlayers(); show("setup"); };
document.getElementById("rules").onclick = () => show("rulesScreen");

document.querySelectorAll("[data-back]").forEach(button => {
  button.onclick = () => show(button.dataset.back);
});

document.getElementById("playerCount").onclick = event => {
  if (event.target.tagName !== "BUTTON") return;
  document.querySelectorAll("#playerCount button").forEach(button => button.classList.remove("selected"));
  event.target.classList.add("selected");
  renderPlayers();
};

document.getElementById("finishCount").onclick = event => {
  if (event.target.tagName !== "BUTTON") return;
  document.querySelectorAll("#finishCount button").forEach(button => button.classList.remove("selected"));
  event.target.classList.add("selected");
  state.finishCount = Number(event.target.dataset.value);
};

document.getElementById("startGame").onclick = () => {
  readPlayers();
  state.finishCount = Number(document.querySelector("#finishCount .selected").dataset.value);
  createAssignments();
  startAssignment();
};

document.getElementById("assignmentStart").onclick = openAssignment;
document.getElementById("confirmIdentity").onclick = confirmIdentity;
document.getElementById("nextChooser").onclick = startAssignment;
document.getElementById("passStart").onclick = revealSecret;
document.getElementById("secretReady").onclick = readyForQuestions;
document.getElementById("yes").onclick = answerYes;
document.getElementById("no").onclick = answerNo;
document.getElementById("hit").onclick = answerHit;
document.getElementById("nextRound").onclick = nextRound;
document.getElementById("restart").onclick = restartGame;

renderPlayers();