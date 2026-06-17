import { collection, addDoc, getDocs, updateDoc, deleteDoc, doc } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

let calendar;
let crops = [];

document.addEventListener('DOMContentLoaded', async () => {
    // データの読み込み
    const taskSnap = await getDocs(collection(window.db, "tasks"));
    const cropSnap = await getDocs(collection(window.db, "crops"));
    
    const tasks = taskSnap.docs.map(d => ({ id: d.id, ...d.data() }));
    crops = cropSnap.docs.map(d => ({ id: d.id, ...d.data() }));
    if(crops.length === 0) crops = [{ name: "その他", color: "#bdbdbd" }];

    updateCropSelect();
    calendar = new FullCalendar.Calendar(document.getElementById('calendar-view'), {
        initialView: 'dayGridMonth',
        events: tasks,
        eventClick: (info) => openEditForm(info.event)
    });
    calendar.render();
    updateTodayTasks(tasks);
});

async function saveTask() {
    const title = document.getElementById('task-text').value;
    const start = document.getElementById('task-date').value;
    const crop = document.getElementById('task-crop').value;
    if(!start || !title) return alert("入力してください");
    await addDoc(collection(window.db, "tasks"), { title, start, completed: false, crop });
    location.reload();
}

async function addCategory() {
    const name = document.getElementById('new-crop').value;
    const color = document.getElementById('new-color').value;
    if(name) {
        await addDoc(collection(window.db, "crops"), { name, color });
        location.reload();
    }
}

async function confirmComplete(id) {
    await updateDoc(doc(window.db, "tasks", id), { completed: true });
    location.reload();
}

// 窓口設定（HTMLから関数を呼ぶため）
window.saveTask = saveTask;
window.addCategory = addCategory;
window.confirmComplete = confirmComplete;
window.openForm = () => { document.getElementById('entry-form').style.display = 'flex'; };
window.closeForm = () => { document.getElementById('entry-form').style.display = 'none'; };
window.openSettings = () => { document.getElementById('settings-modal').style.display = 'flex'; };
window.closeSettings = () => { document.getElementById('settings-modal').style.display = 'none'; };
window.updateTask = async () => { /* ...実装は省略しますが、同様にupdateDocを使います */ location.reload(); };
window.deleteTask = async () => { /* ...同様にdeleteDocを使います */ location.reload(); };
window.deleteCategory = async (name) => { /* ...同様にdeleteDocを使います */ location.reload(); };

function updateCropSelect() {
    const select = document.getElementById('task-crop');
    if(select) select.innerHTML = crops.map(c => `<option value="${c.name}">${c.name}</option>`).join('');
}
function updateTodayTasks(tasks) {
    const today = new Date().toISOString().split('T')[0];
    const todo = document.getElementById('todo-list'), done = document.getElementById('done-list');
    tasks.filter(t => t.start === today).forEach(t => {
        const div = document.createElement('div');
        div.innerHTML = `${t.title} <button onclick="confirmComplete('${t.id}')">完了</button>`;
        if(t.completed) done.appendChild(div); else todo.appendChild(div);
    });
}