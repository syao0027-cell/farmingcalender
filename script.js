// --- Supabaseの初期化 ---
const supabaseUrl = 'https://ekezpddmglfdfizmghvu.supabase.co';
const supabaseKey = 'sb_publishable_AKQc64I2A6u-lw2oNyDKMA__F1x3J3E';
const supabaseClient = window.supabase.createClient(supabaseUrl, supabaseKey);

let calendar;
let crops = [{ name: "その他", color: "#bdbdbd" }];

document.addEventListener('DOMContentLoaded', async () => {
    try {
        // 1. カテゴリー情報をSupabaseから取得して確実にセット
        const { data: cropsData, error: cropsError } = await supabaseClient.from('crops').select('*');
        if (cropsError) throw cropsError;
        
        // データベースにデータがあれば、初期値（その他）の後ろに結合する、または置き換える
        if (cropsData && cropsData.length > 0) {
            crops = cropsData;
        }
        // 画面のセレクトボックスを先に作成
        updateCropSelect();

        // 2. カレンダーの初期化
        calendar = new FullCalendar.Calendar(document.getElementById('calendar-view'), {
            initialView: 'dayGridMonth',
            events: async (fetchInfo, successCallback) => {
                try {
                    const { data, error } = await supabaseClient.from('tasks').select('*');
                    if (error) throw error;
                    if (!data) return successCallback([]);
                    const events = data.map(t => ({
                        id: t.id,
                        title: t.title,
                        start: t.start_date,
                        extendedProps: { crop: t.crop, completed: t.completed }
                    }));
                    successCallback(events);
                } catch (err) {
                    console.error("カレンダーデータの取得に失敗しました:", err);
                    successCallback([]);
                }
            },
            eventClick: (info) => openEditForm(info.event),
            eventDidMount: (info) => {
                const cropName = info.event.extendedProps.crop || "その他";
                const cropData = crops.find(c => c.name === cropName);
                info.el.style.backgroundColor = cropData ? cropData.color : "#bdbdbd";
                if (info.event.extendedProps.completed) info.el.innerHTML = "✔ " + info.event.title;
            }
        });
        calendar.render();
        updateTodayTasks();
    } catch (err) {
        console.error("アプリの初期化中にエラーが発生しました:", err);
    }
});

// --- カテゴリー関連 ---
function updateCropSelect() {
    const select = document.getElementById('task-crop');
    if(select) {
        select.innerHTML = crops.map(c => `<option value="${c.name}">${c.name}</option>`).join('');
    }
}

async function addCategory() {
    const name = document.getElementById('new-crop').value;
    const color = document.getElementById('new-color').value;
    if(name && !crops.find(c => c.name === name)) {
        // ★ await を使って、Supabaseへの登録が「完全に終わるのを待って」から次に進むようにしました
        const { error } = await supabaseClient.from('crops').insert([{ name, color }]);
        if (error) {
            alert("カテゴリーの追加に失敗しました: " + error.message);
        } else {
            // 登録が成功したら画面をリロード
            location.reload();
        }
    }
}

function renderCropList() {
    const list = document.getElementById('crop-list');
    if(list) {
        list.innerHTML = crops.map(c => `<div>${c.name} <span style="background:${c.color}; padding:0 10px; margin: 0 5px; border-radius:4px;"> </span> <button onclick="deleteCategory('${c.name}')" style="padding: 2px 8px; background:#ff5252;">×</button></div>`).join('');
    }
}

async function deleteCategory(name) {
    if(name === "その他") return alert("その他は削除できません");
    const { error } = await supabaseClient.from('crops').delete().eq('name', name);
    if (error) {
        alert("削除に失敗しました: " + error.message);
    } else {
        location.reload();
    }
}

// --- タスク・フォーム管理 ---
function openEditForm(event) {
    updateCropSelect(); 
    document.getElementById('form-title').innerText = "作業内容";
    document.getElementById('edit-task-id').value = event.id;
    document.getElementById('task-date').value = event.startStr;
    document.getElementById('task-text').value = event.title;
    document.getElementById('task-crop').value = event.extendedProps.crop || "その他";
    document.getElementById('save-btn').style.display = 'none';
    document.getElementById('update-btn').style.display = 'inline-block';
    document.getElementById('delete-btn').style.display = 'inline-block';
    document.getElementById('entry-form').style.display = 'flex'; 
}

async function saveTask() {
    const title = document.getElementById('task-text').value;
    const start_date = document.getElementById('task-date').value;
    const crop = document.getElementById('task-crop').value;
    if(!start_date || !title) return alert("入力してください");
    
    const { error } = await supabaseClient.from('tasks').insert([{ title, start_date, crop, completed: false }]);
    if (error) {
        alert("データの保存に失敗しました: " + error.message);
    } else {
        location.reload();
    }
}

async function updateTask() {
    const id = document.getElementById('edit-task-id').value;
    const title = document.getElementById('task-text').value;
    const start_date = document.getElementById('task-date').value;
    const crop = document.getElementById('task-crop').value;
    
    await supabaseClient.from('tasks').update({ title, start_date, crop }).eq('id', id);
    location.reload();
}

async function deleteTask() {
    const id = document.getElementById('edit-task-id').value;
    await supabaseClient.from('tasks').delete().eq('id', id);
    location.reload();
}

async function updateTodayTasks() {
    const d = new Date();
    const today = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    
    const { data: tasks, error } = await supabaseClient.from('tasks').select('*');
    if (error) return console.error("本日の作業の取得に失敗しました:", error);
    
    const todo = document.getElementById('todo-list'), done = document.getElementById('done-list');
    if (!todo || !done || !tasks) return;
    
    todo.innerHTML = ""; done.innerHTML = "";
    tasks.filter(t => t.start_date === today).forEach(t => {
        const div = document.createElement('div');
        const displayLabel = `【${t.crop}】${t.title}`;
        
        if(!t.completed) {
            div.innerHTML = `${displayLabel} <button onclick="confirmComplete('${t.id}')">完了</button>`;
            todo.appendChild(div);
        } else {
            div.innerHTML = `✔ ${displayLabel}`;
            done.appendChild(div);
        }
    });
}

async function confirmComplete(id) {
    await supabaseClient.from('tasks').update({ completed: true }).eq('id', id);
    location.reload();
}

// --- ユーティリティ ---
function openForm() { 
    updateCropSelect(); 
    document.getElementById('form-title').innerText = "作業記録";
    document.getElementById('edit-task-id').value = "";
    document.getElementById('task-date').value = "";
    document.getElementById('task-text').value = "";
    document.getElementById('save-btn').style.display = 'inline-block';
    document.getElementById('update-btn').style.display = 'none';
    document.getElementById('delete-btn').style.display = 'none';
    document.getElementById('entry-form').style.display = 'flex'; 
}
function closeForm() { document.getElementById('entry-form').style.display = 'none'; }
function openSettings() { document.getElementById('settings-modal').style.display = 'flex'; renderCropList(); }
function closeSettings() { document.getElementById('settings-modal').style.display = 'none'; }