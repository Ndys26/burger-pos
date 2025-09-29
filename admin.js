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
const pendingOrdersContainer = document.getElementById('pending-orders');
const preparingOrdersContainer = document.getElementById('preparing-orders');
const readyOrdersContainer = document.getElementById('ready-orders');

const incomingCountEl = document.getElementById('incoming-count');
const preparingCountEl = document.getElementById('preparing-count');
const readyCountEl = document.getElementById('ready-count');

const resetDayBtn = document.getElementById('reset-sales-btn');
const historyBtn = document.getElementById('view-history-btn');
const historyModal = document.getElementById('history-modal');
const closeBtn = document.querySelector('.close-btn');
const historyOrdersContainer = document.getElementById('history-orders-container'); // Container for history items
const notificationSound = document.getElementById('notification-sound');
const soundActivationOverlay = document.getElementById('sound-activation-overlay');
const totalRevenueEl = document.getElementById('total-revenue');
const totalItemsSoldEl = document.getElementById('total-items-sold');
const bestSellerEl = document.getElementById('best-seller');

// --- NEW Elements for Sales Target Feature ---
const salesTargetDisplay = document.getElementById('sales-target-display');
const salesProgressBar = document.getElementById('sales-progress-bar');


// --- State Variables ---
let knownOrderKeys = new Set();
let isAudioEnabled = false;

// --- SMART INVENTORY DEDUCTION (Called on Accept) ---
function deductInventoryFromOrder(orderKey) {
    console.log("SMART DEDUCTION: Deducting inventory for ACCEPTED order:", orderKey);
    database.ref().once('value', snapshot => {
        const data = snapshot.val();
        if (!data.orders || !data.products || !data.inventory) { console.error("Missing critical data for deduction."); return; }
        const order = data.orders[orderKey];
        const productsData = data.products;
        const inventoryRef = database.ref('inventory');
        if (!order || !order.items) { console.error("Order or items not found for key:", orderKey); return; }
        for (const itemKey in order.items) {
            const orderItem = order.items[itemKey];
            const product = productsData[orderItem.productKey];
            if (product && product.variants && product.variants[orderItem.variantKey]) {
                const variant = product.variants[orderItem.variantKey];
                if (variant.recipe) {
                    for (const ingredientId in variant.recipe) {
                        const quantityToDeduct = variant.recipe[ingredientId] * orderItem.quantity;
                        inventoryRef.child(ingredientId).child('stock').transaction(currentStock => (currentStock || 0) - quantityToDeduct);
                    }
                }
            }
        }
    });
}

// --- TIMER LOGIC ---
function updateAllTimers() {
    const timerElements = document.querySelectorAll('.order-timer');
    timerElements.forEach(timerEl => {
        const timestamp = parseInt(timerEl.dataset.timestamp, 10);
        const limitInSeconds = parseInt(timerEl.dataset.limit, 10);
        const card = timerEl.closest('.order-card');
        if (!timestamp || !card) return;
        const elapsedSeconds = Math.floor((Date.now() - timestamp) / 1000);
        const minutes = Math.floor(elapsedSeconds / 60).toString().padStart(2, '0');
        const seconds = (elapsedSeconds % 60).toString().padStart(2, '0');
        timerEl.textContent = `${minutes}:${seconds}`;
        if (elapsedSeconds > limitInSeconds && !card.classList.contains('overdue')) {
            card.classList.add('overdue');
        }
    });
}

// --- Helper Functions ---
function getKitchenName(fullName) { if (!fullName) return ''; let lowerCaseName = fullName.toLowerCase(); if (lowerCaseName.includes('burger ramly biasa ayam')) return 'Burger Ayam'; if (lowerCaseName.includes('maggi daging burger biasa oblong ayam')) return 'Maggi Oblong Ayam'; if (lowerCaseName.includes('maggi daging burger biasa patty ayam')) return 'Maggi Ayam'; if (lowerCaseName.includes('burger benjo biasa')) return 'Burger Benjo'; let simpleName = fullName.replace(/Burger Ramly/gi, 'Burger').replace(/Maggi Daging Burger/gi, 'Maggi').replace(/Biasa/gi, '').replace(/Patty/gi, '').replace(/  +/g, ' '); return simpleName.trim(); }
function enableAudio() { if (!isAudioEnabled) { notificationSound.play().then(() => { notificationSound.pause(); isAudioEnabled = true; if (soundActivationOverlay) soundActivationOverlay.style.display = 'none'; }).catch(e => console.error("Audio failed to play.", e)); } }
if (soundActivationOverlay) { soundActivationOverlay.addEventListener('click', enableAudio, { once: true }); }
function groupOrderItems(items) { const grouped = {}; Object.values(items).forEach(item => { const uniqueId = item.displayName + (item.customizations || []).sort().join(','); if (grouped[uniqueId]) { grouped[uniqueId].quantity += item.quantity; } else { grouped[uniqueId] = { ...item }; } }); return Object.values(grouped); }

// --- MAIN DISPLAY FUNCTION ---
function displayOrdersAndSales() {
    const ordersRef = database.ref('orders').orderByChild('timestamp');
    ordersRef.on('value', snapshot => {
        const ordersData = snapshot.val() || {};
        const currentOrderKeys = new Set(Object.keys(ordersData));
        if (knownOrderKeys.size > 0) {
            const newKeys = [...currentOrderKeys].filter(key => !knownOrderKeys.has(key) && ordersData[key].status === 'pending');
            if (newKeys.length > 0 && isAudioEnabled) { notificationSound.play().catch(e => {}); }
        }
        knownOrderKeys = currentOrderKeys;
        
        pendingOrdersContainer.innerHTML = '';
        preparingOrdersContainer.innerHTML = '';
        readyOrdersContainer.innerHTML = '';

        let incomingCount = 0, preparingCount = 0, readyCount = 0;
        const allOrdersArray = Object.entries(ordersData);
        
        allOrdersArray.forEach(([key, order]) => {
            const orderCard = createOrderCard(key, order);
            if (order.status === 'pending') {
                pendingOrdersContainer.appendChild(orderCard);
                incomingCount++;
            } else if (order.status === 'preparing') {
                preparingOrdersContainer.appendChild(orderCard);
                preparingCount++;
            } else if (order.status === 'ready') {
                readyOrdersContainer.appendChild(orderCard);
                readyCount++;
            }
        });

        if(incomingCountEl) incomingCountEl.textContent = incomingCount;
        if(preparingCountEl) preparingCountEl.textContent = preparingCount;
        if(readyCountEl) readyCountEl.textContent = readyCount;

        if (incomingCount === 0) pendingOrdersContainer.innerHTML = '<p class="no-orders-message">No new incoming orders.</p>';
        if (preparingCount === 0) preparingOrdersContainer.innerHTML = '<p class="no-orders-message">No orders in preparation.</p>';
        if (readyCount === 0) readyOrdersContainer.innerHTML = '<p class="no-orders-message">No orders are ready for pickup.</p>';
        
        updateSalesSummary(ordersData);
    });
}

// --- CARD BUILDER (Corrected Version) ---
function createOrderCard(key, order) {
    const orderCard = document.createElement('div');
    orderCard.className = `order-card ${order.status || 'pending'}`;
    
    const groupedItems = groupOrderItems(order.items);
    let itemsHtml = '<ul>';
    groupedItems.forEach(item => {
        itemsHtml += `<li><div class="item-line"><span class="item-name">${getKitchenName(item.displayName)}</span><span class="item-quantity">x${item.quantity}</span></div>`;
        if (item.customizations && item.customizations.length > 0) {
            let customizationsHtml = item.customizations.map(c => `<li>- ${c}</li>`).join('');
            itemsHtml += `<ul class="customizations-list-admin">${customizationsHtml}</ul>`;
        }
        itemsHtml += '</li>';
    });
    itemsHtml += '</ul>';

    let actionButtonsHtml = '';
    if (order.status === 'pending') {
        actionButtonsHtml = `<button class="action-btn decline-btn" data-key="${key}">Decline</button><button class="action-btn accept-btn" data-key="${key}">Accept</button>`;
    } else if (order.status === 'preparing') {
        actionButtonsHtml = `<button class="action-btn ready-btn" data-key="${key}">Order Ready</button>`;
    } else if (order.status === 'ready') {
        actionButtonsHtml = `<button class="action-btn complete-btn" data-key="${key}">Picked Up</button>`;
    }

    const simpleTime = new Date(order.timestamp).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
    
    let pickupHtml = '';
    if (order.pickupTime) {
        const isNow = order.pickupTime === 'Pick Up Now';
        pickupHtml = `<div class="pickup-info"><span class="pickup-badge ${isNow ? 'now' : 'scheduled'}">${isNow ? 'Pick Up Now' : order.pickupTime}</span></div>`;
    }

    let timerHtml = '';
    if (order.status === 'pending' || order.status === 'preparing') {
        const hasMaggi = Object.values(order.items).some(item => item.displayName && item.displayName.toLowerCase().includes('maggi'));
        const timeLimit = hasMaggi ? 360 : 300;
        timerHtml = `<div class="order-timer" data-timestamp="${order.timestamp}" data-limit="${timeLimit}">00:00</div>`;
    }
    
    orderCard.innerHTML = `
        <div class="order-header">
            <h3>${order.customerName} - ${simpleTime}</h3>
            <div class="header-right">
                ${timerHtml}
                <span class="order-id-admin">#${order.orderNumber || ''}</span>
            </div>
        </div>
        ${pickupHtml}
        <div class="order-body">${itemsHtml}</div>
        
        <!-- This line checks for the remark and inserts it ONLY if it exists -->
        ${order.remark && order.remark.trim() !== '' ? `
            <div class="order-remark">
                <strong>Nota Pesanan:</strong>
                <p>${order.remark}</p>
            </div>
        ` : ''}
        
        <div class="order-footer">
            <span class="total">RM ${order.total.toFixed(2)}</span>
            <div class="action-buttons">${actionButtonsHtml}</div>
        </div>`;
    
    return orderCard;
}

// --- Sales Summary Calculator ---
function updateSalesSummary(ordersData) {
    let totalRevenue = 0;
    let totalItemsSold = 0;
    let itemCounts = {};
    const todayStart = new Date().setHours(0, 0, 0, 0);

    Object.values(ordersData).forEach(order => {
        const isOrderToday = order.timestamp >= todayStart;
        const isOrderActive = order.status !== 'pending' && order.status !== 'cancelled';

        if (isOrderToday && isOrderActive) {
            totalRevenue += order.total;
            Object.values(order.items).forEach(item => {
                totalItemsSold += item.quantity;
                itemCounts[item.displayName] = (itemCounts[item.displayName] || 0) + item.quantity;
            });
        }
    });

    let bestSellerName = 'N/A';
    let bestSellerCount = 0;
    for (const name in itemCounts) {
        if (itemCounts[name] > bestSellerCount) {
            bestSellerCount = itemCounts[name];
            bestSellerName = getKitchenName(name);
        }
    }

    if (totalRevenueEl) totalRevenueEl.textContent = `RM ${totalRevenue.toFixed(2)}`;
    if (totalItemsSoldEl) totalItemsSoldEl.textContent = totalItemsSold;
    if (bestSellerEl) bestSellerEl.textContent = `${bestSellerName} (${bestSellerCount} sold)`;
}

// --- START: NEW FUNCTION FOR ORDER HISTORY ---
function displayOrderHistory() {
    const historyRef = database.ref('orders').orderByChild('timestamp').limitToLast(50); // Get last 50 orders
    historyRef.once('value', snapshot => {
        const ordersData = snapshot.val() || {};
        
        historyOrdersContainer.innerHTML = ''; 
        const ordersArray = Object.entries(ordersData).map(([key, value]) => ({ key, ...value }));
        ordersArray.reverse();

        if (ordersArray.length === 0) {
            historyOrdersContainer.innerHTML = '<p>No recent orders found in history.</p>';
            return;
        }

        ordersArray.forEach(order => {
            if (order.status === 'completed' || order.status === 'cancelled') {
                const simpleTime = new Date(order.timestamp).toLocaleString('en-US', { dateStyle: 'short', timeStyle: 'short' });
                const itemSummary = Object.values(order.items)
                    .map(item => `${item.quantity}x ${getKitchenName(item.displayName)}`)
                    .join(', ');

                const historyItem = document.createElement('div');
                historyItem.className = `history-item history-status-${order.status}`;
                historyItem.innerHTML = `
                    <div class="history-item-header">
                        <span class="history-name">#${order.orderNumber} - ${order.customerName}</span>
                        <span class="history-time">${simpleTime}</span>
                    </div>
                    <div class="history-item-body">
                        <span>${itemSummary}</span>
                        <span class="history-total">RM ${order.total.toFixed(2)}</span>
                    </div>
                `;
                historyOrdersContainer.appendChild(historyItem);
            }
        });
        
        if (historyOrdersContainer.innerHTML === '') {
             historyOrdersContainer.innerHTML = '<p>No completed or cancelled orders to show yet.</p>';
        }

    });
}
// --- END: NEW FUNCTION FOR ORDER HISTORY ---

// --- Sales Target Feature ---
function displaySalesTargetAndProgress() {
    const metricsRef = database.ref('daily_metrics');
    metricsRef.on('value', snapshot => {
        const metrics = snapshot.val();
        const salesTarget = metrics && metrics.salesTarget ? metrics.salesTarget : 0;

        if (salesTargetDisplay) {
            salesTargetDisplay.textContent = `RM ${salesTarget.toFixed(2)}`;
        }

        database.ref('orders').once('value', orderSnapshot => {
            const ordersData = orderSnapshot.val() || {};
            let currentRevenue = 0;
            const todayStart = new Date().setHours(0, 0, 0, 0);

            Object.values(ordersData).forEach(order => {
                if (order.timestamp >= todayStart && order.status !== 'pending' && order.status !== 'cancelled') {
                    currentRevenue += order.total;
                }
            });
            
            if (salesProgressBar && salesTarget > 0) {
                const percentage = Math.min((currentRevenue / salesTarget) * 100, 100);
                salesProgressBar.style.width = `${percentage}%`;
            } else if (salesProgressBar) {
                salesProgressBar.style.width = '0%';
            }
        });
    });
}

// --- Daily Reset Function ---
function resetOrdersForNewDay() {
    if (!confirm("Are you sure you want to clear the dashboard for a new day? This will complete all active orders.")) { return; }

    const ordersRef = database.ref('orders');
    ordersRef.once('value', snapshot => {
        const allOrders = snapshot.val();
        if (!allOrders) { alert("No orders to reset."); return; }

        const updates = {};
        let ordersToClearCount = 0;
        const activeStatuses = ['pending', 'preparing', 'ready'];

        for (const orderKey in allOrders) {
            const order = allOrders[orderKey];
            if (activeStatuses.includes(order.status)) {
                updates[`/${orderKey}/status`] = 'completed';
                updates[`/${orderKey}/completedAt`] = firebase.database.ServerValue.TIMESTAMP;
                ordersToClearCount++;
            }
        }

        if (ordersToClearCount > 0) {
            ordersRef.update(updates)
                .then(() => alert(`Successfully cleared ${ordersToClearCount} active order(s).`))
                .catch(error => console.error("Error clearing old orders: ", error));
        } else {
            alert("No active orders needed to be cleared.");
        }
    });
}

// --- Event Listeners for Order Actions ---
document.body.addEventListener('click', e => {
    const target = e.target;
    if (!target.classList.contains('action-btn') || !target.dataset.key) { return; }
    
    const orderKey = target.dataset.key;

    if (target.matches('.accept-btn')) { 
        deductInventoryFromOrder(orderKey); 
        database.ref(`orders/${orderKey}/status`).set('preparing'); 
    }
    if (target.matches('.decline-btn')) { 
        if (confirm("Are you sure you want to DECLINE this order?")) { 
            database.ref(`orders/${orderKey}/status`).set('cancelled'); 
        } 
    }
    if (target.matches('.ready-btn')) { 
        database.ref(`orders/${orderKey}/status`).set('ready'); 
    }
    if (target.matches('.complete-btn')) { 
        database.ref(`orders/${orderKey}`).update({ status: 'completed', completedAt: firebase.database.ServerValue.TIMESTAMP }); 
    }
});

// --- Other Event Listeners ---
if (historyBtn) {
    historyBtn.addEventListener('click', () => {
        displayOrderHistory(); 
        historyModal.style.display = 'block';
    });
}

if (closeBtn) closeBtn.addEventListener('click', () => { historyModal.style.display = 'none'; });
if (resetDayBtn) resetDayBtn.addEventListener('click', resetOrdersForNewDay);


// --- Initial Load ---
displayOrdersAndSales();
displaySalesTargetAndProgress();
setInterval(updateAllTimers, 1000);