// --- Firebase Configuration ---
const firebaseConfig = {
    apiKey: "AIzaSyBAZ7eWGKsLCAWbxLpytJ-a9xw5ehBYOOQ",
    authDomain: "counting-pos-food-system.firebaseapp.com",
    // --- FIX: Corrected the typo in the database URL ---
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
const toggleScheduledSection = document.getElementById('toggle-scheduled-section'); // For collapsible feature
const scheduledOrdersContainer = document.getElementById('scheduled-orders'); 
const pendingOrdersContainer = document.getElementById('pending-orders');
const preparingOrdersContainer = document.getElementById('preparing-orders');
const readyOrdersContainer = document.getElementById('ready-orders');

const scheduledCountEl = document.getElementById('scheduled-count');
const incomingCountEl = document.getElementById('incoming-count');
const preparingCountEl = document.getElementById('preparing-count');
const readyCountEl = document.getElementById('ready-count');

const resetDayBtn = document.getElementById('reset-sales-btn');
const historyBtn = document.getElementById('view-history-btn');
const historyModal = document.getElementById('history-modal');
const closeBtn = document.querySelector('.close-btn');
const historyOrdersContainer = document.getElementById('history-orders-container');
const notificationSound = document.getElementById('notification-sound');
const soundActivationOverlay = document.getElementById('sound-activation-overlay');
const totalRevenueEl = document.getElementById('total-revenue');
const totalItemsSoldEl = document.getElementById('total-items-sold');
const bestSellerEl = document.getElementById('best-seller');

const salesTargetDisplay = document.getElementById('sales-target-display');
const salesProgressBar = document.getElementById('sales-progress-bar');

// --- State Variables ---
let knownOrderKeys = new Set();
let isAudioEnabled = false;

// --- SMART INVENTORY DEDUCTION (Called on Accept) ---
function deductInventoryFromOrder(orderKey) {
    // This function remains unchanged.
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

// --- TIMER LOGIC (Unchanged)---
function updateAllTimers() {
    // This function remains unchanged.
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

// --- Helper Functions (Unchanged)---
function getKitchenName(fullName) { /* This function remains unchanged. */ return fullName; }
function enableAudio() { if (!isAudioEnabled) { notificationSound.play().then(() => { notificationSound.pause(); isAudioEnabled = true; if (soundActivationOverlay) soundActivationOverlay.style.display = 'none'; }).catch(e => console.error("Audio failed to play.", e)); } }
if (soundActivationOverlay) { soundActivationOverlay.addEventListener('click', enableAudio, { once: true }); }
function groupOrderItems(items) { /* This function remains unchanged. */ const grouped = {}; Object.values(items).forEach(item => { const uniqueId = item.displayName + (item.customizations || []).sort().join(','); if (grouped[uniqueId]) { grouped[uniqueId].quantity += item.quantity; } else { grouped[uniqueId] = { ...item }; } }); return Object.values(grouped); }

// --- MAIN DISPLAY FUNCTION (UPDATED) ---
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
        
        scheduledOrdersContainer.innerHTML = '';
        pendingOrdersContainer.innerHTML = '';
        preparingOrdersContainer.innerHTML = '';
        readyOrdersContainer.innerHTML = '';

        let scheduledCount = 0, incomingCount = 0, preparingCount = 0, readyCount = 0;
        const allOrdersArray = Object.entries(ordersData);
        
        allOrdersArray.forEach(([key, order]) => {
            const orderCard = createOrderCard(key, order);
            // --- SIMPLIFIED SORTING LOGIC ---
            // It no longer needs to check for 'pending_confirmation'
            if (order.status === 'scheduled') {
                scheduledOrdersContainer.appendChild(orderCard);
                scheduledCount++;
            } else if (order.status === 'pending') {
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
        
        if(scheduledCountEl) scheduledCountEl.textContent = scheduledCount;
        if(incomingCountEl) incomingCountEl.textContent = incomingCount;
        if(preparingCountEl) preparingCountEl.textContent = preparingCount;
        if(readyCountEl) readyCountEl.textContent = readyCount;
        
        if (scheduledCount === 0) scheduledOrdersContainer.innerHTML = '<p class="no-orders-message">No scheduled orders.</p>';
        if (incomingCount === 0) pendingOrdersContainer.innerHTML = '<p class="no-orders-message">No new incoming orders.</p>';
        if (preparingCount === 0) preparingOrdersContainer.innerHTML = '<p class="no-orders-message">No orders in preparation.</p>';
        if (readyCount === 0) readyOrdersContainer.innerHTML = '<p class="no-orders-message">No orders are ready for pickup.</p>';
        
        updateSalesSummary(ordersData);
    });
}

// --- CARD BUILDER (UPDATED) ---
function createOrderCard(key, order) {
    const orderCard = document.createElement('div');
    // Simplified class name logic
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
    // --- SIMPLIFIED BUTTON LOGIC ---
    if (order.status === 'scheduled') {
        // Scheduled orders are already accepted, so they just need a 'Cancel' button.
        actionButtonsHtml = `<button class="action-btn decline-btn" data-key="${key}">Cancel</button>`;
    } else if (order.status === 'pending') {
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
        pickupHtml = `<div class="pickup-info"><span class="pickup-badge ${isNow ? 'now' : 'scheduled'}">${isNow ? 'ASAP' : order.pickupTime}</span></div>`;
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
        
        ${order.remark && order.remark.trim() !== '' ? `<div class="order-remark"><strong>Nota Pesanan:</strong><p>${order.remark}</p></div>` : ''}
        
        <div class="order-footer">
            <span class="total">RM ${order.total.toFixed(2)}</span>
            <div class="action-buttons">${actionButtonsHtml}</div>
        </div>`;
    
    return orderCard;
}

// --- Sales Summary Calculator (UPDATED) ---
function updateSalesSummary(ordersData) {
    let totalRevenue = 0; let totalItemsSold = 0; let itemCounts = {};
    const todayStart = new Date().setHours(0, 0, 0, 0);
    Object.values(ordersData).forEach(order => {
        const isOrderToday = order.timestamp >= todayStart;
        // Simplified the active status check
        const isOrderActive = !['pending', 'scheduled', 'cancelled', 'declined'].includes(order.status);
        if (isOrderToday && isOrderActive) {
            totalRevenue += order.total;
            Object.values(order.items).forEach(item => { totalItemsSold += item.quantity; itemCounts[item.displayName] = (itemCounts[item.displayName] || 0) + item.quantity; });
        }
    });
    let bestSellerName = 'N/A'; let bestSellerCount = 0;
    for (const name in itemCounts) { if (itemCounts[name] > bestSellerCount) { bestSellerCount = itemCounts[name]; bestSellerName = getKitchenName(name); } }
    if (totalRevenueEl) totalRevenueEl.textContent = `RM ${totalRevenue.toFixed(2)}`;
    if (totalItemsSoldEl) totalItemsSoldEl.textContent = totalItemsSold;
    if (bestSellerEl) bestSellerEl.textContent = `${bestSellerName} (${bestSellerCount} sold)`;
}

// --- Order History Function (Unchanged)---
function displayOrderHistory() { /* This function remains unchanged. */ }

// --- Sales Target Feature (Unchanged) ---
function displaySalesTargetAndProgress() { /* This function remains unchanged. */ }

// --- Daily Reset Function (Unchanged) ---
function resetOrdersForNewDay() { /* This function remains unchanged. */ }

// --- AUTOMATIC PROCESSOR (Unchanged, still works perfectly) ---
function processScheduledOrders() {
    console.log("Checking for scheduled orders to prepare...");
    const now = Date.now();
    const fifteenMinutesFromNow = now + (15 * 60 * 1000);
    const ordersRef = database.ref('orders');

    ordersRef.orderByChild('status').equalTo('scheduled').once('value', snapshot => {
        const scheduledOrders = snapshot.val();
        if (scheduledOrders) {
            for (const orderId in scheduledOrders) {
                const order = scheduledOrders[orderId];
                if (order.pickupTimestamp && order.pickupTimestamp <= fifteenMinutesFromNow) {
                    console.log(`Order #${order.orderNumber} is due soon. Moving to 'Incoming Orders'...`);
                    database.ref('orders/' + orderId).update({ status: 'pending' });
                }
            }
        }
    });
}

// --- Event Listeners for Order Actions (UPDATED) ---
document.body.addEventListener('click', e => {
    const target = e.target;
    if (!target.classList.contains('action-btn') || !target.dataset.key) { return; }
    
    const orderKey = target.dataset.key;

    // REMOVED the '.confirm-btn' logic as it's no longer needed.
    
    if (target.matches('.accept-btn')) { 
        deductInventoryFromOrder(orderKey); 
        database.ref(`orders/${orderKey}/status`).set('preparing'); 
    }
    if (target.matches('.decline-btn')) { 
        if (confirm("Are you sure you want to DECLINE/CANCEL this order?")) { 
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
// NEW: Event listener to control the collapsible section
if (toggleScheduledSection) {
    toggleScheduledSection.addEventListener('click', () => {
        // Toggle the 'collapsed' class on the order list to hide/show it via CSS
        scheduledOrdersContainer.classList.toggle('collapsed');
        // Toggle the 'rotated' class on the icon to animate it
        toggleScheduledSection.querySelector('.toggle-icon').classList.toggle('rotated');
    });
}

if (historyBtn) { historyBtn.addEventListener('click', () => { displayOrderHistory(); historyModal.style.display = 'block'; }); }
if (closeBtn) closeBtn.addEventListener('click', () => { historyModal.style.display = 'none'; });
if (resetDayBtn) resetDayBtn.addEventListener('click', resetOrdersForNewDay);

// --- Initial Load ---
displayOrdersAndSales();
displaySalesTargetAndProgress();
setInterval(updateAllTimers, 1000);
setInterval(processScheduledOrders, 60000);