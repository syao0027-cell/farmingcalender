// Netlifyの環境変数（隠し金庫）から安全に鍵を読み込む
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY;

// Supabaseクライアントの初期化
const supabase = supabasejs.createClient(supabaseUrl, supabaseKey);

let calendar;
let crops = [];

// ページが読み込まれたときの処理
document.addEventListener('DOMContentLoaded', async () => {
    // 1. カテゴリーとタスクをSupabaseから取得
    await fetchCategories();
    const tasks = await fetchTasks();

    // 2. カレンダーの初期化
    calendar = new FullCalendar.Calendar(document.getElementById('calendar-view'), {
        initialView: 'dayGridMonth',
        events: tasks,
        eventClick: (info) => openEditForm(info.event),
        eventDidMount: (info) => {
            const cropName = info.event.extendedProps.crop || "その他";
            const cropData = crops.find(c => c.name === cropName);
            info.el.style.backgroundColor = cropData ? cropData.color : "#bdbdbd";
            if (info.event.extendedProps.completed) info.el.innerHTML = "✔ " + info.event.title;
        }
    });
    calendar.render();
    updateTodayTasks(tasks);
});

// --- Supabaseからのデータ取得処理 ---
async function fetchCategories() {
    const { data, error } = await supabase.from('crops').select('*');
    if (error) {
        console.error('カテゴリー取得失敗:', error);
        crops = [{ name: "その他", color: "#bdbdbd" }];
    } else {
        crops = data.length > 0 ? data : [{ name: "その他", color: "#bdbdbd" }];
    }
    updateCropSelect();
}

async function fetchTasks() {
    const { data, error } = await supabase.from('tasks').select('*');
    if (error) {
        console.error('タスク取得失敗:', error);
        return [];
    }
    // FullCalendarが読み込める形式にデータを成形
    return data.map(t => ({
        id: t.id.toString(),
        title: t.title,
        start: t.start_date,
        completed: t.completed,
        extendedProps: { crop: t.crop, memo: t.memo }
    }));
}

// --- カテゴリー関連 ---
function updateCropSelect() {
    const select = document.getElementById('task-crop');
    if(select) select.innerHTML = crops.map(c => `<option value="${c.name}">${c.name}</option>`).join('');
}

async function addCategory() {
    const name = document.getElementById('new-crop').value;
    const color = document.getElementById('new-color').value;
    if(name && !crops.find(c => c.name === name)) {
        // Supabaseにカテゴリーを保存
        const { error } = await supabase.from('crops').insert([{ name, color }]);
        if (error) return alert("カテゴリーの追加に失敗しました: " + error.message);
        
        document.getElementById('new-crop').value = '';
        location.reload();
    }
}

function renderCropList() {
    const list = document.getElementById('crop-list');
    list.innerHTML = crops.map(c => `<div>${c.name} <span style="background:${c.color}; padding:0 10px;"> </span> <button onclick="deleteCategory('${c.name}')">×</button></div>`).join('');
}

async function deleteCategory(name) {
    if(name === "その他") return alert("その他は削除できません");
    
    // Supabaseからカテゴリーを削除
    const { error } = await supabase.from('crops').delete().eq('name', name);
    if (error) return alert("カテゴリーの削除に失敗しました: " + error.message);
    
    location.reload();
}

// --- タスク・フォーム管理 ---
function openEditForm(event) {
    document.getElementById('form-title').innerText = "作業内容の編集";
    document.getElementById('edit-task-id').value = event.id;
    document.getElementById('task-date').value = event.startStr;
    document.getElementById('task-text').value = event.title;
    document.getElementById('task-memo').value = event.extendedProps.memo || "";
    document.getElementById('task-crop').value = event.extendedProps.crop || "その他";
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
    if(!start || !title) return alert("入力してください");

    // Supabaseにタスクを保存
    const { error } = await supabase.from('tasks').insert([
        { title, start_date: start, completed: false, crop, memo }
    ]);
    if (error) return alert("タスクの保存に失敗しました: " + error.message);

    location.reload();
}

async function updateTask() {
    const id = document.getElementById('edit-task-id').value;
    const title = document.getElementById('task-text').value;
    const start = document.getElementById('task-date').value;
    const crop = document.getElementById('task-crop').value;
    const memo = document.getElementById('task-memo').value;

    // Supabaseのタスクを更新
    const { error } = await supabase.from('tasks').update({
        title, start_date: start, crop, memo
    }).eq('id', id);
    
    if (error) return alert("タスクの更新に失敗しました: " + error.message);

    location.reload();
}

async function deleteTask() {
    const id = document.getElementById('edit-task-id').value;
    
    // Supabaseからタスクを削除
    const { error } = await supabase.from('tasks').delete().eq('id', id);
    if (error) return alert("タスクの削除に失敗しました: " + error.message);

    location.reload();
}

function updateTodayTasks(tasks) {
    const today = new Date().toISOString().split('T')[0];
    const todo = document.getElementById('todo-list'), done = document.getElementById('done-list');
    if (!todo || !done) return;
    todo.innerHTML = ""; done.innerHTML = "";
    
    tasks.filter(t => t.start === today).forEach(t => {
        const div = document.createElement('div');
        const crop = t.extendedProps.crop || "その他";
        const memoText = t.extendedProps.memo ? `<br><small style="color: #795548; font-size: 12px;">📝 ${t.extendedProps.memo}</small>` : "";
        const displayLabel = `【${crop}】${t.title}${memoText}`; 
        
        if(!t.completed) {
            div.innerHTML = `<div style="margin-bottom: 5px;">${displayLabel}</div> <button onclick="confirmComplete('${t.id}')">完了</button>`;
            todo.appendChild(div);
        } else {
            div.innerHTML = `✔ ${displayLabel}`;
            done.appendChild(div);
        }
    });
}

async function confirmComplete(id) {
    // Supabaseのステータスを完了(true)に更新
    const { error } = await supabase.from('tasks').update({ completed: true }).eq('id', id);
    if (error) return alert("ステータスの更新に失敗しました: " + error.message);

    location.reload();
}

// --- ユーティリティ ---
function openForm() { document.getElementById('entry-form').style.display = 'flex'; }
function closeForm() { document.getElementById('entry-form').style.display = 'none'; location.reload(); }
function openSettings() { document.getElementById('settings-modal').style.display = 'flex'; renderCropList(); }
function closeSettings() { document.getElementById('settings-modal').style.display = 'none'; }