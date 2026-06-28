let calendar;
let crops = JSON.parse(localStorage.getItem('crops')) || [{ name: "その他", color: "#bdbdbd" }];

document.addEventListener('DOMContentLoaded', () => {
    updateCropSelect();
    calendar = new FullCalendar.Calendar(document.getElementById('calendar-view'), {
        initialView: 'dayGridMonth',
        events: JSON.parse(localStorage.getItem('tasks')) || [],
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
});

// --- カテゴリー関連 ---
function updateCropSelect() {
    const select = document.getElementById('task-crop');
    if(select) select.innerHTML = crops.map(c => `<option value="${c.name}">${c.name}</option>`).join('');
}
function addCategory() {
    const name = document.getElementById('new-crop').value;
    const color = document.getElementById('new-color').value;
    if(name && !crops.find(c => c.name === name)) {
        crops.push({ name, color });
        localStorage.setItem('crops', JSON.stringify(crops));
        updateCropSelect(); renderCropList();
        document.getElementById('new-crop').value = '';
    }
}
function renderCropList() {
    const list = document.getElementById('crop-list');
    list.innerHTML = crops.map(c => `<div>${c.name} <span style="background:${c.color}; padding:0 10px;"> </span> <button onclick="deleteCategory('${c.name}')">×</button></div>`).join('');
}
function deleteCategory(name) {
    if(name === "その他") return alert("その他は削除できません");
    crops = crops.filter(c => c.name !== name);
    localStorage.setItem('crops', JSON.stringify(crops));
    updateCropSelect(); renderCropList();
}

// --- タスク・フォーム管理 ---
function openEditForm(event) {
    document.getElementById('form-title').innerText = "作業内容の編集";
    document.getElementById('edit-task-id').value = event.id;
    document.getElementById('task-date').value = event.startStr;
    document.getElementById('task-text').value = event.title;
    document.getElementById('task-memo').value = event.extendedProps.memo || ""; // メモをフォームに読み込む
    document.getElementById('task-crop').value = event.extendedProps.crop || "その他";
    document.getElementById('save-btn').style.display = 'none';
    document.getElementById('update-btn').style.display = 'inline-block';
    document.getElementById('delete-btn').style.display = 'inline-block';
    openForm();
}
function saveTask() {
    const title = document.getElementById('task-text').value;
    const memo = document.getElementById('task-memo').value; // メモの値を取得
    const start = document.getElementById('task-date').value;
    const crop = document.getElementById('task-crop').value;
    if(!start || !title) return alert("入力してください");
    const tasks = JSON.parse(localStorage.getItem('tasks')) || [];
    tasks.push({ id: Date.now().toString(), title, start, completed: false, extendedProps: { crop, memo } }); // メモをデータに追加
    localStorage.setItem('tasks', JSON.stringify(tasks));
    location.reload();
}
function updateTask() {
    const id = document.getElementById('edit-task-id').value;
    let tasks = JSON.parse(localStorage.getItem('tasks'));
    const idx = tasks.findIndex(t => t.id === id);
    tasks[idx].title = document.getElementById('task-text').value;
    tasks[idx].start = document.getElementById('task-date').value;
    tasks[idx].extendedProps.crop = document.getElementById('task-crop').value;
    tasks[idx].extendedProps.memo = document.getElementById('task-memo').value; // メモの更新
    localStorage.setItem('tasks', JSON.stringify(tasks));
    location.reload();
}
function deleteTask() {
    const id = document.getElementById('edit-task-id').value;
    let tasks = JSON.parse(localStorage.getItem('tasks')).filter(t => t.id !== id);
    localStorage.setItem('tasks', JSON.stringify(tasks));
    location.reload();
}
function updateTodayTasks() {
    const today = new Date().toISOString().split('T')[0];
    const tasks = JSON.parse(localStorage.getItem('tasks')) || [];
    const todo = document.getElementById('todo-list'), done = document.getElementById('done-list');
    if (!todo || !done) return;
    todo.innerHTML = ""; done.innerHTML = "";
    tasks.filter(t => t.start === today).forEach(t => {
        const div = document.createElement('div');
        const crop = t.extendedProps.crop || "その他";
        
        // メモがあれば改行して小さく表示する設定
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
function confirmComplete(id) {
    let tasks = JSON.parse(localStorage.getItem('tasks'));
    tasks = tasks.map(t => t.id === id ? {...t, completed: true} : t);
    localStorage.setItem('tasks', JSON.stringify(tasks));
    location.reload();
}

// --- ユーティリティ ---
function openForm() { document.getElementById('entry-form').style.display = 'flex'; }
function closeForm() { document.getElementById('entry-form').style.display = 'none'; location.reload(); }
function openSettings() { document.getElementById('settings-modal').style.display = 'flex'; renderCropList(); }
function closeSettings() { document.getElementById('settings-modal').style.display = 'none'; }