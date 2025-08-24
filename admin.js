// --- Firebase Configuration ---
const firebaseConfig = {
    apiKey: "AIzaSyBAZ7eWGKsLCAWbxLpytJ-a9xw5ehBYOOQ",
    authDomain: "counting-pos-food-system.firebaseapp.com",
    databaseURL: "https://counting-pos-food-system-default-rtdb.asia-southeast1.firebasedatabase.app",
    projectId: "counting-pos-food-system",
    storageBucket: "counting-pos-food-system.firebasestorage.app",
    messagingSenderId: "663603508723",
    appId: "1:663603508723:web:14699d4ccf31faaee5ce86",
    measurementId: "G-LYPFSMCMXB"
};
firebase.initializeApp(firebaseConfig);
const database = firebase.database();

// --- DOM Elements ---
const ordersContainer = document.getElementById('orders-container');
const readyOrdersContainer = document.getElementById('ready-orders-container');
const salesContainer = document.getElementById('sales-container');
const ingredientsContainer = document.getElementById('ingredients-container');
const resetSalesBtn = document.getElementById('reset-sales-btn');
const historyBtn = document.getElementById('view-history-btn');
const historyModal = document.getElementById('history-modal');
const closeBtn = document.querySelector('.close-btn');
const historyOrdersContainer = document.getElementById('history-orders-container');
const notificationSound = document.getElementById('notification-sound');
const soundActivationOverlay = document.getElementById('sound-activation-overlay');
const totalRevenueEl = document.getElementById('total-revenue');
const totalItemsSoldEl = document.getElementById('total-items-sold');
const bestSellerEl = document.getElementById('best-seller');

// --- State Variables ---
let knownOrderKeys = new Set();
let isAudioEnabled = false;

// --- Sound Activation ---
function enableAudio() {
    if (!isAudioEnabled) {
        notificationSound.play().then(() => {
            notificationSound.pause(); isAudioEnabled = true; if (soundActivationOverlay) soundActivationOverlay.style.display = 'none';
        }).catch(e => console.error("Audio failed to play.", e));
    }
}
if (soundActivationOverlay) { soundActivationOverlay.addEventListener('click', enableAudio, { once: true }); }

// --- Helper for Smart Grouping ---
function groupOrderItems(items) {
    const grouped = {};
    Object.values(items).forEach(item => {
        const uniqueId = item.displayName + (item.customizations || []).sort().join(',');
        if (grouped[uniqueId]) { grouped[uniqueId].quantity += item.quantity; }
        else { grouped[uniqueId] = { ...item }; }
    });
    return Object.values(grouped);
}

// --- Main Display Function ---
function displayOrdersAndSales() {
    const ordersRef = database.ref('orders').orderByChild('timestamp');
    ordersRef.on('value', snapshot => {
        const ordersData = snapshot.val() || {};
        ordersContainer.innerHTML = '';
        readyOrdersContainer.innerHTML = '';
        
        const currentOrderKeys = new Set(Object.keys(ordersData));
        if (knownOrderKeys.size > 0) {
            const newKeys = [...currentOrderKeys].filter(key => !knownOrderKeys.has(key) && ordersData[key].status !== 'completed');
            if (newKeys.length > 0 && isAudioEnabled) { notificationSound.play().catch(e => {}); }
        }
        knownOrderKeys = currentOrderKeys;

        // --- Sales Calculation ---
        let totalRevenue = 0, totalItemsSold = 0, itemCounts = {};
        const todayStart = new Date().setHours(0, 0, 0, 0);

        Object.values(ordersData).forEach(order => {
            if (order.status === 'completed' && order.completedAt >= todayStart) {
                totalRevenue += order.total;
                Object.values(order.items).forEach(item => {
                    totalItemsSold += item.quantity;
                    itemCounts[item.displayName] = (itemCounts[item.displayName] || 0) + item.quantity;
                });
            }
        });

        // --- Update Summary UI ---
        let bestSellerName = 'N/A', bestSellerCount = 0;
        for (const name in itemCounts) { if (itemCounts[name] > bestSellerCount) { bestSellerCount = itemCounts[name]; bestSellerName = name; } }
        totalRevenueEl.textContent = `RM ${totalRevenue.toFixed(2)}`;
        totalItemsSoldEl.textContent = totalItemsSold;
        bestSellerEl.textContent = bestSellerName === 'N/A' ? 'N/A' : `${bestSellerName} (${bestSellerCount} sold)`;
        
        // --- Active Orders Rendering ---
        const tenMinutesAgo = Date.now() - (10 * 60 * 1000);
        const activeOrders = Object.entries(ordersData).filter(([,o])=> o.status !== 'completed' || o.completedAt > tenMinutesAgo);
        let orderCounter = 1, incomingCount = 0, readyCount = 0;

        activeOrders.forEach(([key, order]) => {
            const orderCard = document.createElement('div');
            orderCard.className = `order-card ${order.status || 'pending'}`;
            const orderNumber = `#${orderCounter}`;

            const groupedItems = groupOrderItems(order.items);
            let itemsHtml = '<ul>';
            
            // --- THIS IS THE FINAL HTML FIX FOR ALIGNMENT ---
            groupedItems.forEach(item => {
                itemsHtml += `
                    <li>
                        <div class="item-line">
                            <span class="item-name">${item.displayName}</span>
                            <span class="item-quantity">x${item.quantity}</span>
                        </div>
                `;
                if (item.customizations && item.customizations.length > 0) {
                    itemsHtml += `<ul class="customizations-list-admin"><li>- ${item.customizations.join('</li><li>- ')}</li></ul>`;
                }
                itemsHtml += '</li>';
            });
            // --- END OF FIX ---
            itemsHtml += '</ul>';

            let actionButtonHtml = '';
            if (order.status === 'ready' || order.status === 'completed') { actionButtonHtml = `<button class="mark-complete-btn" data-key="${key}">DONE</button>`; }
            else if (order.status === 'pending') { actionButtonHtml = `<button class="status-btn preparing-btn" data-key="${key}" data-status="preparing">Start Preparing</button>`; }
            else if (order.status === 'preparing') { actionButtonHtml = `<button class="status-btn ready-btn" data-key="${key}" data-status="ready">Order Ready</button>`; }
            
            orderCard.innerHTML = `
                <div class="order-header"><h3>${order.customerName} - ${new Date(order.timestamp).toLocaleTimeString()}</h3><span class="order-id-admin">${orderNumber}</span></div>
                <div class="order-body">${itemsHtml}</div>
                <div class="order-footer"><span class="total">RM ${order.total.toFixed(2)}</span>${actionButtonHtml}</div>`;
            
            if (order.status === 'ready' || order.status === 'completed') {
                readyOrdersContainer.appendChild(orderCard);
                readyCount++;
            } else {
                ordersContainer.appendChild(orderCard);
                incomingCount++;
            }
            orderCounter++;
        });

        if (incomingCount === 0 && (readyCount > 0 || activeOrders.length === 0) ) { ordersContainer.innerHTML = '<p>No new incoming orders.</p>'; }
        document.getElementById('ready-section-header').style.display = readyCount > 0 ? 'block' : 'none';
    });
}

function displayManagement() {
    database.ref('products').on('value', snapshot => {
        salesContainer.innerHTML = '';
        const products = snapshot.val();
        if(!products) return;
        const productsArray = Object.keys(products).map(key => ({...products[key], key: key }));
        productsArray.sort((a,b) => (a.displayOrder || 99) - (b.displayOrder || 99));

        productsArray.forEach(product => {
            salesContainer.innerHTML += `<h4>${product.name}</h4>`;
            Object.entries(product.variants).forEach(([variantKey, variant]) => {
                const displayName = [variant.style, variant.type].filter(Boolean).join(' ') || variantKey;
                salesContainer.innerHTML += `<div class="stock-item">
                    <span class="stock-name">${displayName}: ${variant.soldToday || 0} sold</span>
                    <label class="toggle-switch"><input class="stock-toggle" type="checkbox" data-path="products/${product.key}/variants/${variantKey}/isAvailable" ${variant.isAvailable ? 'checked' : ''}><span class="slider"></span></label>
                </div>`;
            });
        });
    });

    database.ref('ingredients').on('value', snapshot => {
        ingredientsContainer.innerHTML = '';
        const ingredients = snapshot.val();
        if(!ingredients) { ingredientsContainer.innerHTML = 'Add ingredients to database.'; return; }
        Object.entries(ingredients).forEach(([key, ing]) => {
            ingredientsContainer.innerHTML += `<div class="stock-item">
                <span class="stock-name">${ing.name}</span>
                <label class="toggle-switch"><input class="stock-toggle" type="checkbox" data-path="ingredients/${key}/isAvailable" ${ing.isAvailable ? 'checked' : ''}><span class="slider"></span></label>
            </div>`;
        });
    });
}


// --- All Event Listeners ---
document.body.addEventListener('click', e => {
    // Status Buttons
    if (e.target.matches('.status-btn')) {
        database.ref(`orders/${e.target.dataset.key}/status`).set(e.target.dataset.status);
    }
    if (e.target.matches('.mark-complete-btn')) {
        database.ref(`orders/${e.target.dataset.key}`).update({
            status: 'completed',
            completedAt: firebase.database.ServerValue.TIMESTAMP
        });
    }

    // Modal and History Buttons
    if (e.target === historyBtn) {
        database.ref('orders').orderByChild('timestamp').limitToLast(100).once('value', snapshot => {
            historyOrdersContainer.innerHTML = '';
            const orders = snapshot.val() || {};
            const orderKeys = Object.keys(orders).reverse();
            if (orderKeys.length === 0) {
                historyOrdersContainer.innerHTML = "<li>No history found.</li>";
            } else {
                orderKeys.forEach(key => {
                    const order = orders[key];
                    const groupedItems = groupOrderItems(order.items);
                    const itemSummary = groupedItems.map(item => {
                        let summary = `${item.displayName} x${item.quantity}`;
                        if (item.customizations && item.customizations.length > 0) {
                           summary += ` <i>(${item.customizations.join(', ')})</i>`;
                        }
                        return summary;
                    }).join('<br>');
                    const li = document.createElement('li');
                    li.className = `history-item ${order.status === 'completed' ? 'completed' : ''}`;
                    li.innerHTML = `
                        <div class="history-item-header">
                            <span class="history-name">${order.customerName} - ${new Date(order.timestamp).toLocaleString()}</span>
                            <span class="history-total">RM ${order.total.toFixed(2)}</span>
                        </div>
                        <div class="history-item-body">${itemSummary}</div>`;
                    historyOrdersContainer.appendChild(li);
                });
            }
            historyModal.style.display = 'block';
        });
    }

    if (e.target === closeBtn || e.target === historyModal) {
        historyModal.style.display = 'none';
    }

    // Reset Sales Button
    if (e.target === resetSalesBtn) {
        if (confirm("Are you sure? This will DELETE all completed orders, reset product sales to 0, and make everything available for the new day.")) {
            const updates = {};
            database.ref('orders').orderByChild('status').equalTo('completed').once('value', orderSnapshot => {
                orderSnapshot.forEach(childSnapshot => {
                    updates[`orders/${childSnapshot.key}`] = null;
                });
                database.ref().once('value', dataSnapshot => {
                    const data = dataSnapshot.val();
                    if(data.products) { for (const pKey in data.products) { if (data.products[pKey].variants) { for (const vKey in data.products[pKey].variants) { updates[`products/${pKey}/variants/${vKey}/soldToday`] = 0; updates[`products/${pKey}/variants/${vKey}/isAvailable`] = true; } } } }
                    if(data.ingredients) { for (const iKey in data.ingredients) { updates[`ingredients/${iKey}/isAvailable`] = true; } }
                    database.ref().update(updates).then(() => {
                        alert("System has been successfully reset for the new day!");
                    }).catch(err => {
                        console.error("Error during reset:", err);
                        alert("An error occurred. Please check the console.");
                    });
                });
            });
        }
    }
});

document.body.addEventListener('change', e => {
    // All toggle switches
    if (e.target.matches('.stock-toggle')) {
        database.ref(e.target.dataset.path).set(e.target.checked);
    }
});


// --- Initial Load ---
displayOrdersAndSales();
displayManagement();