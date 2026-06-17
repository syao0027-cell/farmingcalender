form.addEventListener('submit', (e) => {
    e.preventDefault();
    const file = document.getElementById('photo').files[0];
    
    // データ保存処理
    const saveToStorage = (imageData) => {
        const newItem = {
            title: document.getElementById('title').value,
            startDate: document.getElementById('startDate').value,
            endDate: document.getElementById('endDate').value,
            category: document.getElementById('category').value,
            image: imageData
        };
        // ここに既存のknitsへの追加・保存処理（localStorage等）を記述
        // knits.push(newItem);
        // localStorage.setItem('knits', JSON.stringify(knits));
        updateUI();
    };

    if (file) {
        const reader = new FileReader();
        reader.onload = (e) => {
            const img = new Image();
            img.onload = () => {
                const canvas = document.createElement('canvas');
                const MAX_WIDTH = 800;
                const scale = MAX_WIDTH / img.width;
                canvas.width = MAX_WIDTH;
                canvas.height = img.height * scale;
                
                const ctx = canvas.getContext('2d');
                ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
                
                const resizedData = canvas.toDataURL('image/jpeg', 0.7);
                saveToStorage(resizedData);
            };
            img.src = e.target.result;
        };
        reader.readAsDataURL(file);
    } else {
        saveToStorage(null);
    }
});