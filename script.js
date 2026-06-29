// Netlifyの環境変数（隠し金庫）から安全に鍵を読み込む
const supabaseUrl = 'https://tscogqlhlavulqgncodj.supabase.co';
const supabaseKey = 'sb_publishable_baybqGP9O1REnkNCL7m3CA_V_8obPrS';

// 変数の二重宣言エラーを防ぐため、存在しない場合のみ初期化
if (typeof supabase === 'undefined' || !supabase.auth) {
    supabase = supabasejs.createClient(supabaseUrl, supabaseKey);
}

let calendar;
let crops = [];
let members = [];
let areas = [];

// ページが読み込まれたときの処理
document.addEventListener('DOMContentLoaded', async () => {
    await fetchCategories();
    await fetchMembers();
    await fetchAreas();

    const tasks = await fetchTasks();

    calendar = new FullCalendar.Calendar(
        document.getElementById('calendar-view'),
        {
            initialView: 'dayGridMonth',
            events: tasks,
            eventClick: (info) => {
                openEditForm(info.event);
            },
            eventDidMount: (info) => {
                const cropName = info.event.extendedProps.crop || "その他";
                const cropData = crops.find(c => c.name === cropName);
                info.el.style.backgroundColor = cropData ? cropData.color : "#bdbdbd";

                if (info.event.extendedProps.completed) {
                    info.el.innerHTML = "✔ " + info.event.title;
                }
            }
        }
    );

    calendar.render();
    updateTodayTasks(tasks);
});

// =========================
// データ取得
// =========================
async function fetchCategories() {
    const { data, error } = await supabase.from('crops').select('*');
    if (error) {
        console.error(error);
        crops = [{ name: "その他", color: "#bdbdbd" }];
    } else {
        crops = data.length > 0 ? data : [{ name: "その他", color: "#bdbdbd" }];
    }
    updateCropSelect();
}

async function fetchMembers() {
    const { data, error } = await supabase.from('members').select('*');
    if (error) {
        console.error(error);
        members = [];
    } else {
        members = data;
    }
    updateMemberSelect();
}

async function fetchAreas() {
    const { data, error } = await supabase.from('areas').select('*');
    if (error) {
        console.error(error);
        areas = [];
    } else {
        areas = data;
    }
    updateAreaSelect();
}

async function fetchTasks() {
    const { data, error } = await supabase.from('tasks').select('*');
    if (error) {
        console.error(error);
        return [];
    }
    return data.map(t => ({
        id: t.id.toString(),
        title: t.title,
        start: t.start_date,
        completed: t.completed,
        extendedProps: {
            crop: t.crop,
            member: t.member,
            area: t.area,
            memo: t.memo
        }
    }));
}

// =========================
// select（選択肢）更新
// =========================
function updateCropSelect() {
    const select = document.getElementById('task-crop');
    if (select) {
        select.innerHTML = crops.map(c => `<option value="${c.name}">${c.name}</option>`).join('');
    }
}

function updateMemberSelect() {
    const select = document.getElementById('task-member');
    if (select) {
        select.innerHTML = members.map(m => `<option value="${m.name}">${m.name}</option>`).join('');
    }
}

function updateAreaSelect() {
    const select = document.getElementById('task-area');
    if (select) {
        select.innerHTML = areas.map(a => `<option value="${a.name}">${a.name}</option>`).join('');
    }
}

// =========================
// 作物管理
// =========================
async function addCategory() {
    const name = document.getElementById('new-crop').value;
    const color = document.getElementById('new-color').value;
    if (!name) return;

    const { error } = await supabase.from('crops').insert([{ name, color }]);
    if (error) return alert("作物の追加に失敗しました: " + error.message);
    location.reload();
}

function renderCropList() {
    const list = document.getElementById('crop-list');
    if (!list) return;
    list.innerHTML = crops.map(c => `
        <div>
            ${c.name} <span style="background:${c.color}; padding:0 10px;"></span>
            <button onclick="deleteCategory('${c.name}')">×</button>
        </div>
    `).join('');
}

async function deleteCategory(name) {
    if (name === "その他") return alert("その他は削除できません");
    const { error } = await supabase.from('crops').delete().eq('name', name);
    if (error) return alert("作物の削除に失敗しました: " + error.message);
    location.reload();
}

// =========================
// 担当者管理
// =========================
async function addMember() {
    const name = document.getElementById('new-member').value;
    if (!name) return;

    const { error } = await supabase.from('members').insert([{ name }]);
    if (error) return alert("担当者の追加に失敗しました: " + error.message);
    location.reload();
}

function renderMemberList() {
    const list = document.getElementById('member-list');
    if (!list) return;
    list.innerHTML = members.map(m => `
        <div>
            ${m.name}
            <button onclick="deleteMember('${m.name}')">×</button>
        </div>
    `).join('');
}

async function deleteMember(name) {
    const { error } = await supabase.from('members').delete().eq('name', name);
    if (error) return alert("担当者の削除に失敗しました: " + error.message);
    location.reload();
}

// =========================
// エリア管理
// =========================
async function addArea() {
    const name = document.getElementById('new-area').value;
    if (!name) return;

    const { error } = await supabase.from('areas').insert([{ name }]);
    if (error) return alert("エリアの追加に失敗しました: " + error.message);
    location.reload();
}

function renderAreaList() {
    const list = document.getElementById('area-list');
    if (!list) return;
    list.innerHTML = areas.map(a => `
        <div>
            ${a.name}
            <button onclick="deleteArea('${a.name}')">×</button>
        </div>
    `).join('');
}

async function deleteArea(name) {
    const { error } = await supabase.from('areas').delete().eq('name', name);
    if (error) return alert("エリアの削除に失敗しました: " + error.message);
    location.reload();
}

// =========================
// タスク・フォーム管理
// =========================
function openEditForm(event) {
    document.getElementById('form-title').innerText = "作業内容の編集";
    document.getElementById('edit-task-id').value = event.id;
    document.getElementById('task-date').value = event.startStr;
    document.getElementById('task-text').value = event.title;
    document.getElementById('task-memo').value = event.extendedProps.memo || "";
    document.getElementById('task-crop').value = event.extendedProps.crop || "その他";
    document.getElementById('task-member').value = event.extendedProps.member || "";
    document.getElementById('task-area').value = event.extendedProps.area || "";

    document.getElementById('save-btn').style.display = 'none';
    document.getElementById('update-btn').style.display = 'inline-block';
    document.getElementById('delete-btn').style.display = 'inline-block';
    openForm();
}

async function saveTask() {
    const title = document.getElementById('task-text').value;
    const memo = document.getElementById('task-memo').value;
    const start = document.getElementById('task-date').value;
    const crop = document.getElementById('task-crop').value;
    const member = document.getElementById('task-member').value;
    const area = document.getElementById('task-area').value;

    if (!start || !title) return alert("入力してください");

    const { error } = await supabase.from('tasks').insert([{
        title, start_date: start, completed: false, crop, member, area, memo
    }]);

    if (error) return alert("タスクの保存に失敗しました: " + error.message);
    location.reload();
}

async function updateTask() {
    const id = document.getElementById('edit-task-id').value;
    const title = document.getElementById('task-text').value;
    const start = document.getElementById('task-date').value;
    const crop = document.getElementById('task-crop').value;
    const member = document.getElementById('task-member').value;
    const area = document.getElementById('task-area').value;
    const memo = document.getElementById('task-memo').value;

    const { error } = await supabase.from('tasks').update({
        title, start_date: start, crop, member, area, memo
    }).eq('id', id);

    if (error) return alert("タスクの更新に失敗しました: " + error.message);
    location.reload();
}

async function deleteTask() {
    const id = document.getElementById('edit-task-id').value;
    const { error } = await supabase.from('tasks').delete().eq('id', id);
    if (error) return alert("タスクの削除に失敗しました: " + error.message);
    location.reload();
}

// =========================
// 本日の作業表示
// =========================
function updateTodayTasks(tasks) {
    const today = new Date().toISOString().split('T')[0];
    const todo = document.getElementById('todo-list');
    const done = document.getElementById('done-list');
    if (!todo || !done) return;

    todo.innerHTML = "";
    done.innerHTML = "";

    tasks.filter(t => t.start === today).forEach(t => {
        const div = document.createElement('div');
        const crop = t.extendedProps.crop || "その他";
        const member = t.extendedProps.member || "";
        const area = t.extendedProps.area || "";
        const memoText = t.extendedProps.memo ? `<br><small style="color:#795548;">📝 ${t.extendedProps.memo}</small>` : "";

        const displayLabel = `
            <strong>【${crop}】</strong><br>
            👤 ${member}<br>
            📍 ${area}<br>
            ${t.title}
            ${memoText}
        `;

        if (!t.completed) {
            div.innerHTML = `${displayLabel}<br><button onclick="confirmComplete('${t.id}')">完了</button>`;
            todo.appendChild(div);
        } else {
            div.innerHTML = `✔ ${displayLabel}`;
            done.appendChild(div);
        }
    });
}

async function confirmComplete(id) {
    const { error } = await supabase.from('tasks').update({ completed: true }).eq('id', id);
    if (error) return alert("ステータス更新失敗: " + error.message);
    location.reload();
}

// =========================
// ユーティリティ
// =========================
function openForm() {
    document.getElementById('entry-form').style.display = 'flex';
    document.getElementById('save-btn').style.display = 'inline-block';
    document.getElementById('update-btn').style.display = 'none';
    document.getElementById('delete-btn').style.display = 'none';
}

function closeForm() {
    document.getElementById('entry-form').style.display = 'none';
    location.reload();
}

function openSettings() {
    document.getElementById('settings-modal').style.display = 'flex';
    switchTab('crop-tab'); 
    renderCropList();
    renderMemberList();
    renderAreaList();
}

function closeSettings() {
    document.getElementById('settings-modal').style.display = 'none';
}

// =========================
// タブ切り替え処理
// =========================
function switchTab(tabId) {
    const contents = document.querySelectorAll('.tab-content');
    contents.forEach(content => { content.style.display = 'none'; });

    const buttons = document.querySelectorAll('.tab-buttons .tab-btn');
    buttons.forEach(btn => {
        btn.classList.remove('active');
        btn.style.backgroundColor = '#e0e0e0'; 
        btn.style.color = '#333';
    });

    const targetTab = document.getElementById(tabId);
    if (targetTab) { targetTab.style.display = 'block'; }

    const activeBtn = Array.from(buttons).find(btn => btn.getAttribute('onclick').includes(tabId));
    if (activeBtn) {
        activeBtn.classList.add('active');
        activeBtn.style.backgroundColor = '#4caf50'; 
        activeBtn.style.color = 'white';
    }
}