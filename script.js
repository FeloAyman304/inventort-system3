


// ====== state ======
let products = JSON.parse(localStorage.getItem('products')) || [];
let alerts = JSON.parse(localStorage.getItem('alerts')) || [];

// ====== عناصر DOM ======
const productForm = document.getElementById('productForm');
const sellForm = document.getElementById('sellForm');
const tableBody = document.querySelector('#productTable tbody');
const alertCountEl = document.getElementById('alert-count');
const deleteAllBtn = document.getElementById("deleteAllBtn");

// ====== ثابت ======
const LOW_STOCK_THRESHOLD = 5;

// ====== حفظ البيانات ======
function saveAll() {
    localStorage.setItem('products', JSON.stringify(products));
    localStorage.setItem('alerts', JSON.stringify(alerts));
}

// ====== فلترة HTML ======
function escapeHtml(s) {
    return String(s)
        .replaceAll('&', '&amp;').replaceAll('<', '&lt;')
        .replaceAll('>', '&gt;').replaceAll('"', '&quot;')
        .replaceAll("'", '&#039;');
}

// ====== عرض الجدول ======
// function renderTable() {
    // if (!tableBody) return;
    // tableBody.innerHTML = '';
    // products.forEach(p => {
    //     const tr = document.createElement('tr');
    //     if (p.quantity <= LOW_STOCK_THRESHOLD) tr.classList.add('low-stock');
    //     tr.innerHTML = `
    //         <td>${escapeHtml(p.name)}</td>
    //         <td>${escapeHtml(p.id)}</td>
    //         <td>${p.quantity}</td>
    //     `;
    //     tableBody.appendChild(tr);
    // });
// }
function renderTable() {
    if (!tableBody) return;
    tableBody.innerHTML = '';
    products.forEach((p, index) => {
        const tr = document.createElement('tr');
        if (p.quantity <= LOW_STOCK_THRESHOLD) tr.classList.add('low-stock');
        if (p.quantity === 0) tr.classList.add('out-of-stock'); // لون خاص لو صفر

        tr.innerHTML = `
            <td>${escapeHtml(p.name)}</td>
            <td>${escapeHtml(p.id)}</td>
            <td>${p.quantity}</td>
            <td class="delete-cell">
                <button class="delete-btn" data-index="${index}" title="حذف المنتج">
                    🗑️
                </button>
            </td>
        `;
        tableBody.appendChild(tr);
    });

    // ربط أزرار الحذف
    document.querySelectorAll('.delete-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const idx = e.currentTarget.getAttribute('data-index');
            const deletedId = products[idx].id;
            if (confirm(`هل أنت متأكد أنك تريد حذف المنتج "${products[idx].name}"؟`)) {
                // احذف المنتج
                products.splice(idx, 1);
                // امسح أي إنذار يخصه
                alerts = alerts.filter(a => !a.includes(`ID: ${deletedId}`) && !a.includes(` ${deletedId}.`));
                refreshUI();
            }
        });
    });
}


// ====== توليد إنذارات المخزون ======
function stockAlerts() {
    return products.flatMap(p => {
        if (p.quantity === 0)
            return [`❌ المنتج "${p.name}" نفد من المخزون (ID: ${p.id}).`];
        if (p.quantity <= LOW_STOCK_THRESHOLD)
            return [`⚠️ المنتج "${p.name}" كمية منخفضة (${p.quantity}) (ID: ${p.id}).`];
        return [];
    });
}

// ====== تحديث أيقونة الإنذارات ======
function updateAlertIcon() {
    if (!alertCountEl) return;
    const count = stockAlerts().length + alerts.length;
    alertCountEl.textContent = String(count);
}

// ====== إضافة/تحديث منتج ======
if (productForm) {
    productForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const name = document.getElementById('name').value.trim();
        const id = String(document.getElementById('id').value).trim();
        const qty = parseInt(document.getElementById('quantity').value, 10);

        if (!name || !id || isNaN(qty) || qty <= 0) {
            pushTempAlert('⚠️ أدخل اسمًا صحيحًا، رقمًا فريدًا، وكمية أكبر من صفر.');
            refreshUI();
            return;
        }

        const sameIdDifferentName = products.find(p => p.id === id && p.name !== name);
        if (sameIdDifferentName) {
            pushTempAlert(`🚫 الرقم الفريد ${id} مستخدم للمنتج "${sameIdDifferentName.name}". غيّر الاسم أو ID.`);
            refreshUI();
            return;
        }

        const existing = products.find(p => p.id === id && p.name === name);
        if (existing) {
            existing.quantity += qty;
        } else {
            products.push({ name, id, quantity: qty });
        }

        alerts = alerts.filter(a => !a.includes(`ID: ${id}`) && !a.includes(` ${id}.`));

        productForm.reset();
        refreshUI();
    });
}

// ====== بيع منتج ======
if (sellForm) {
    sellForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const id = String(document.getElementById('sellId').value).trim();
        const amt = parseInt(document.getElementById('sellAmount').value, 10);

        if (!id || isNaN(amt) || amt <= 0) {
            pushTempAlert('⚠️ أدخل رقم فريد صحيح وكمية أكبر من صفر.');
            refreshUI();
            return;
        }

        const product = products.find(p => p.id === id);
        if (!product) {
            pushTempAlert(`🚫 المنتج برقم ${id} غير موجود.`);
            refreshUI();
            return;
        }

        if (product.quantity < amt) {
            pushTempAlert(`⚠️ الكمية المطلوبة (${amt}) أكبر من المتاحة (${product.quantity}) للمنتج "${product.name}".`);
            refreshUI();
            return;
        }

        // نقص الكمية لكن ما نحذفش المنتج لو صفر
        product.quantity -= amt;

        sellForm.reset();
        refreshUI();
    });
}

// ====== حذف كل المنتجات ======
if (deleteAllBtn) {
    deleteAllBtn.addEventListener("click", function () {
        if (confirm("هل أنت متأكد أنك تريد حذف كل المنتجات؟")) {
            products = [];
            alerts = [];
            saveAll();
            refreshUI();
        }
    });
}

// ====== إنذارات مؤقتة ======
function pushTempAlert(msg) {
    if (!alerts.includes(msg)) alerts.push(msg);
}

// ====== التنقل لصفحة الإنذارات ======
function goToAlerts() {
    saveAll();
    window.location.href = 'alerts.html';
}

// ====== صفحة الإنذارات ======
(function initAlertsPageIfExists() {
    const listEl = document.getElementById('alerts-list');
    const countLabel = document.getElementById('alerts-count-label');
    const clearBtn = document.getElementById('clear-alerts-btn');

    if (!listEl) return;

    function renderAlertsPage() {
        const combined = [...stockAlerts(), ...alerts];
        countLabel.textContent = `عدد الإنذارات: ${combined.length}`;
        listEl.innerHTML = '';

        if (combined.length === 0) {
            listEl.innerHTML = `<div class="alert-item"><span>لا توجد إنذارات.</span></div>`;
            return;
        }

        combined.forEach((txt) => {
            const item = document.createElement('div');
            item.className = 'alert-item';
            item.innerHTML = `<span>${escapeHtml(txt)}</span><span class="meta">${new Date().toLocaleString()}</span>`;
            listEl.appendChild(item);
        });
    }

    if (clearBtn) {
        clearBtn.addEventListener('click', () => {
            alerts = [];
            saveAll();
            renderAlertsPage();
        });
    }

    renderAlertsPage();
})();

// ====== تحديث شامل ======
function refreshUI() {
    renderTable();
    updateAlertIcon();
    saveAll();
}

// ====== تشغيل أولي ======
refreshUI();
