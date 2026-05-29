const navButtons = document.querySelectorAll(".nav-item");
const views = document.querySelectorAll(".view");
const generateButton = document.querySelector("#generateFeedback");
const saveRecordButton = document.querySelector("#saveRecord");
const clientNameInput = document.querySelector("#clientName");
const snapshotName = document.querySelector("#snapshotName");
const feedbackCards = document.querySelector("#feedbackCards");
const consultInput = document.querySelector("#consultInput");
const sendConsult = document.querySelector("#sendConsult");
const chatLog = document.querySelector("#chatLog");
const refreshPlan = document.querySelector("#refreshPlan");
const proposalStack = document.querySelector("#proposalStack");
const historyList = document.querySelector("#historyList");
const clearHistoryButton = document.querySelector("#clearHistory");

const STORAGE_KEY = "bridgewell-care-records";

if ("serviceWorker" in navigator && location.protocol !== "file:") {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("./sw.js").catch(() => {
      // PWA registration is optional for the local demo.
    });
  });
}

const clientMeta = {
  "田中さん": {
    initial: "田",
    tags: ["音楽が好き", "急な予定変更が苦手", "午前はゆっくり開始"],
  },
  "佐藤さん": {
    initial: "佐",
    tags: ["散歩が好き", "集団活動は短時間", "視覚的な予定表が有効"],
  },
  "李さん": {
    initial: "李",
    tags: ["手作業が得意", "大きな音が苦手", "午後に集中しやすい"],
  },
};

function switchView(viewId) {
  views.forEach((view) => view.classList.toggle("active", view.id === viewId));
  navButtons.forEach((button) => {
    button.classList.toggle("active", button.dataset.view === viewId);
  });
}

function makeFeedback() {
  const client = getClientName();
  const mood = document.querySelector("#dailyMood").value;
  const support = document.querySelector("#supportAction").value;
  const concern = document.querySelector("#concernNote").value;

  const hasMorningConcern = /午前|朝|反応|ぼーっと|参加が少な/.test(`${mood} ${concern}`);
  const hasCalmSupport = /無理|休憩|落ち着|ペース/.test(support);

  const cards = [
    {
      label: "良かった支援",
      title: hasCalmSupport
        ? "本人のペースを尊重した関わりができています"
        : "記録から支援の意図が読み取れます",
      body: hasCalmSupport
        ? "無理に促さず、休憩や落ち着ける時間を確保した点は、安心感を保つ支援として有効です。"
        : "今日の様子と支援内容がセットで記録されているため、次回の関わりに活用しやすい内容です。",
    },
    {
      label: "観察ポイント",
      title: hasMorningConcern
        ? "午前中の反応低下が続くかを数日単位で確認しましょう"
        : "変化が出る場面と戻る場面を分けて見ましょう",
      body: hasMorningConcern
        ? "睡眠、服薬、来所前の出来事、朝の環境刺激、体調の変化を確認すると背景を整理しやすくなります。"
        : "活動前、休憩後、昼食後など、状態が変わるタイミングを記録すると支援の手がかりになります。",
    },
    {
      label: "次回の支援案",
      title: `${client}が反応しやすい入口から短く声をかける`,
      body: "好きな活動や安心できる話題から始め、参加の選択肢を少なく提示すると負担を下げやすくなります。",
    },
  ];

  feedbackCards.innerHTML = cards
    .map(
      (card) => `
        <article class="feedback-card">
          <img class="card-guide" src="assets/yoria-guide.png" alt="" aria-hidden="true">
          <span class="card-label">${card.label}</span>
          <h3>${card.title}</h3>
          <p>${card.body}</p>
        </article>
      `,
    )
    .join("");

  switchView("feedback");
}

function getRecordInput() {
  return {
    id: `${Date.now()}`,
    createdAt: new Date().toISOString(),
    client: getClientName(),
    mood: document.querySelector("#dailyMood").value.trim(),
    support: document.querySelector("#supportAction").value.trim(),
    concern: document.querySelector("#concernNote").value.trim(),
  };
}

function loadRecords() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY)) || [];
  } catch {
    return [];
  }
}

function saveRecords(records) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(records));
}

function formatDate(isoDate) {
  return new Intl.DateTimeFormat("ja-JP", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(isoDate));
}

function escapeHtml(value) {
  return value.replace(/[&<>"']/g, (char) => {
    const entities = {
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#039;",
    };
    return entities[char];
  });
}

function saveCurrentRecord() {
  const record = getRecordInput();
  if (!record.mood && !record.support && !record.concern) {
    alert("記録内容を入力してから保存してください。");
    return;
  }

  const records = loadRecords();
  records.unshift(record);
  saveRecords(records);
  renderHistory();
  switchView("history");
}

function deleteRecord(recordId) {
  const records = loadRecords().filter((record) => record.id !== recordId);
  saveRecords(records);
  renderHistory();
}

function clearHistory() {
  const records = loadRecords();
  if (!records.length) return;
  const confirmed = confirm("保存した記録をすべて削除しますか？");
  if (!confirmed) return;
  saveRecords([]);
  renderHistory();
}

function renderHistory() {
  const records = loadRecords();

  if (!records.length) {
    historyList.innerHTML = `
      <div class="empty-state">
        <img src="assets/yoria-guide.png" alt="" aria-hidden="true">
        <p>まだ保存された記録はありません。今日の支援記録から保存してください。</p>
      </div>
    `;
    return;
  }

  historyList.innerHTML = records
    .map(
      (record) => `
        <article class="history-item">
          <div class="history-top">
            <div>
              <h3>${escapeHtml(record.client)}</h3>
              <p>${formatDate(record.createdAt)} の支援記録</p>
            </div>
            <button class="danger-action" data-delete-id="${record.id}" type="button">削除</button>
          </div>
          <div class="history-fields">
            <div>
              <strong>今日の様子</strong>
              <p>${record.mood ? escapeHtml(record.mood) : "未入力"}</p>
            </div>
            <div>
              <strong>支援内容</strong>
              <p>${record.support ? escapeHtml(record.support) : "未入力"}</p>
            </div>
            <div>
              <strong>気になる変化</strong>
              <p>${record.concern ? escapeHtml(record.concern) : "未入力"}</p>
            </div>
          </div>
        </article>
      `,
    )
    .join("");

  historyList.querySelectorAll("[data-delete-id]").forEach((button) => {
    button.addEventListener("click", () => deleteRecord(button.dataset.deleteId));
  });
}

function appendMessage(role, text) {
  const message = document.createElement("div");
  message.className = `message ${role}`;
  message.innerHTML =
    role === "ai"
      ? `<img src="assets/yoria-guide.png" alt="" aria-hidden="true"><strong>Yoria</strong><p>${text}</p>`
      : `<strong>職員</strong><p>${text}</p>`;
  chatLog.appendChild(message);
  chatLog.scrollTop = chatLog.scrollHeight;
}

function consult() {
  const text = consultInput.value.trim();
  if (!text) return;

  appendMessage("user", text);
  appendMessage(
    "ai",
    "観察ポイントは、いつから変化したか、午前と午後で差があるか、睡眠・食事・服薬・環境変化が関係していないかです。支援案としては、短時間の活動から始める、好きな話題で反応を確認する、無理に参加を求めず休憩を選べるようにする、数日間同じ観点で記録することが考えられます。医療的な急変が疑われる場合は施設手順に沿って管理者や医療職へ相談してください。",
  );
}

function refreshSupportPlan() {
  const client = getClientName();
  const plans = [
    {
      label: "優先",
      title: `${client}の午前活動は「短く始めて、続けるか選ぶ」形にする`,
      body: "最初から通常量を求めず、5分程度の活動で反応を確認します。参加できた場合は本人に継続意思を確認します。",
      high: true,
    },
    {
      label: "観察",
      title: "反応低下の前後にある要因を記録する",
      body: "睡眠、食事、来所前の様子、室内の音、職員配置、予定変更の有無を同じ形式で残すと比較しやすくなります。",
      high: false,
    },
    {
      label: "共有",
      title: "うまくいった声かけをチームメモに残す",
      body: "本人が反応した言葉や活動導入の順番を共有し、職員ごとの対応差を減らします。",
      high: false,
    },
  ];

  proposalStack.innerHTML = plans
    .map(
      (plan) => `
        <article class="proposal-card ${plan.high ? "high" : ""}">
          <span>${plan.label}</span>
          <h3>${plan.title}</h3>
          <p>${plan.body}</p>
        </article>
      `,
    )
    .join("");
}

navButtons.forEach((button) => {
  button.addEventListener("click", () => switchView(button.dataset.view));
});

generateButton.addEventListener("click", makeFeedback);
saveRecordButton.addEventListener("click", saveCurrentRecord);
sendConsult.addEventListener("click", consult);
refreshPlan.addEventListener("click", refreshSupportPlan);
clearHistoryButton.addEventListener("click", clearHistory);
consultInput.addEventListener("keydown", (event) => {
  if (event.key === "Enter") consult();
});

function getClientName() {
  return clientNameInput.value.trim() || "利用者さん";
}

function updateClientSnapshot() {
  const client = getClientName();
  const meta = clientMeta[client] || {
    initial: client.slice(0, 1),
    tags: ["本人の特性を記録", "好きな活動を追加", "苦手な環境を共有"],
  };

  snapshotName.textContent = client;
  document.querySelector(".avatar").textContent = meta.initial;
  document.querySelector(".profile-tags").innerHTML = meta.tags
    .map((tag) => `<span>${tag}</span>`)
    .join("");
}

clientNameInput.addEventListener("input", updateClientSnapshot);

renderHistory();
updateClientSnapshot();
