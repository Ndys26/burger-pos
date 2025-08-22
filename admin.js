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

// Initialize Firebase
firebase.initializeApp(firebaseConfig);
const database = firebase.database();

// --- DOM Elements ---
const ordersContainer = document.getElementById('orders-container');
const salesContainer = document.getElementById('sales-container');
const resetSalesBtn = document.getElementById('reset-sales-btn');
const historyBtn = document.getElementById('view-history-btn');
const historyModal = document.getElementById('history-modal');
const closeBtn = document.querySelector('.close-btn');
const historyOrdersContainer = document.getElementById('history-orders-container');
const notificationSound = document.getElementById('notification-sound');
const soundActivationOverlay = document.getElementById('sound-activation-overlay');

// --- State Variables ---
let isFirstLoad = true;
let knownOrderKeys = new Set();
let isAudioEnabled = false;


// --- Functions ---

function enableAudio() {
    if (!isAudioEnabled) {
        notificationSound.muted = false; // Unmute
        notificationSound.play().then(() => {
            notificationSound.pause();
            notificationSound.currentTime = 0;
            isAudioEnabled = true;
            console.log("Audio enabled by user interaction.");
            if(soundActivationOverlay) {
                soundActivationOverlay.style.display = 'none';
            }
        }).catch(e => {
            console.error("Audio could not be enabled:", e);
        });
    }
}

// Attach a one-time event listener to the document to enable audio on first click/tap
document.body.addEventListener('click', enableAudio, { once: true });
if (soundActivationOverlay) {
    soundActivationOverlay.addEventListener('click', enableAudio, { once: true });
}


function displayOrders() {
    const ordersRef = database.ref('orders').orderByChild('timestamp').limitToLast(30);

    ordersRef.on('value', (snapshot) => {
        const ordersData = snapshot.val();
        
        if (!ordersData) {
            ordersContainer.innerHTML = '<p>No orders yet.</p>';
            knownOrderKeys.clear(); 
            isFirstLoad = false;
            return;
        }

        const currentOrderKeys = new Set(Object.keys(ordersData));

        if (!isFirstLoad) {
            const newKeys = [...currentOrderKeys].filter(key => !knownOrderKeys.has(key));
            if (newKeys.length > 0 && isAudioEnabled) {
                notificationSound.play().catch(e => console.error("Sound play failed", e));
            }
        }
        
        knownOrderKeys = currentOrderKeys;
        isFirstLoad = false;

        ordersContainer.innerHTML = '';
        const tenMinutesAgo = Date.now() - (10 * 60 * 1000);
        const orderKeysToDisplay = Object.keys(ordersData).reverse();

        for (const key of orderKeysToDisplay) {
            const order = ordersData[key];
            if (order.status === 'completed' && order.completedAt < tenMinutesAgo) {
                continue;
            }
            
            const orderCard = document.createElement('div');
            orderCard.classList.add('order-card');
            if (order.status === 'completed') { orderCard.classList.add('completed'); }
            
            let itemsHtml = '<ul>';
            for (const itemKey in order.items) { const item = order.items[itemKey]; itemsHtml += `<li>${item.name} x${item.quantity}</li>`; }
            itemsHtml += '</ul>';

            let remarksHtml = '';
            if (order.remarks && order.remarks.trim() !== '') { remarksHtml = `<div class="order-remarks">${order.remarks}</div>`; }

            let actionButtonHtml = '';
            if (order.status === 'pending') {
                actionButtonHtml = `<button class="status-btn preparing-btn" data-order-key="${key}" data-new-status="preparing">Start Preparing</button>`;
            } else if (order.status === 'preparing') {
                actionButtonHtml = `<button class="status-btn ready-btn" data-order-key="${key}" data-new-status="ready">Order Ready</button>`;
            } else if (order.status === 'ready') {
                actionButtonHtml = `<button class="mark-complete-btn" data-order-key="${key}">Done</button>`;
            }
            
            orderCard.innerHTML = `<div class="order-header ${order.status || 'pending'}"><h3>${order.customerName} - ${new Date(order.timestamp).toLocaleTimeString()}</h3></div><div class="order-body">${itemsHtml}${remarksHtml}</div><div class="order-footer"><span class="total">Total: RM${order.total.toFixed(2)}</span>${actionButtonHtml}</div>`;
            ordersContainer.appendChild(orderCard);
        }
    });
}


function displayStockManagement() {
    const productsRef = database.ref('products');
    productsRef.on('value', (snapshot) => {
        salesContainer.innerHTML = '';
        const productsData = snapshot.val();
        
        let totalRevenue = 0, totalItemsSold = 0, bestSeller = { name: 'N/A', count: 0 };

        for (const productKey in productsData) {
            const product = productsData[productKey];
            if (product.variants) {
                const h4 = document.createElement('h4');
                h4.textContent = product.name;
                salesContainer.appendChild(h4);
                
                for (const variantKey in product.variants) {
                    const variant = product.variants[variantKey];
                    const soldCount = variant.soldToday || 0;
                    totalRevenue += soldCount * variant.price;
                    totalItemsSold += soldCount;
                    let variantFullName = `${product.name} ${variant.type || ''} ${variant.style || ''}`.trim();
                    if (soldCount > bestSeller.count) {
                        bestSeller = { name: variantFullName, count: soldCount };
                    }
                    const itemWrapper = document.createElement('div');
                    itemWrapper.classList.add('stock-item');
                    let variantName = `${variant.type || ''} ${variant.style || ''}`.trim() || variant.name;
                    itemWrapper.innerHTML = `<span class="stock-name">${variantName}: ${soldCount} sold</span><label class="toggle-switch"><input type="checkbox" class="availability-toggle" data-product-key="${productKey}" data-variant-key="${variantKey}" ${variant.isAvailable ? 'checked' : ''}><span class="slider"></span></label>`;
                    salesContainer.appendChild(itemWrapper);
                }
            }
        }

        document.getElementById('total-revenue').textContent = `RM${totalRevenue.toFixed(2)}`;
        document.getElementById('total-items-sold').textContent = totalItemsSold;
        document.getElementById('best-seller').textContent = bestSeller.count > 0 ? `${bestSeller.name} (${bestSeller.count} sold)` : 'N/A';
    });
}


// UPDATED: Now handles all button clicks inside the order cards
ordersContainer.addEventListener('click', (e) => {
    const target = e.target;

    // Handles "Done" button
    if (target.classList.contains('mark-complete-btn')) {
        const orderKey = target.dataset.orderKey;
        if (orderKey) {
            const orderRef = database.ref('orders/' + orderKey);
            orderRef.update({
                status: 'completed',
                completedAt: firebase.database.ServerValue.TIMESTAMP
            });
        }
    }
    
    // Handles all other status buttons ("Start Preparing", "Order Ready")
    if (target.classList.contains('status-btn')) {
        const orderKey = target.dataset.orderKey;
        const newStatus = target.dataset.newStatus;
        if (orderKey && newStatus) {
            const orderRef = database.ref('orders/' + orderKey);
            orderRef.update({ status: newStatus });
        }
    }
});


salesContainer.addEventListener('change', (e) => {
    if (e.target.classList.contains('availability-toggle')) {
        const toggle = e.target;
        const productKey = toggle.dataset.productKey;
        const variantKey = toggle.dataset.variantKey;
        const isNowAvailable = toggle.checked;
        const itemRef = database.ref(`products/${productKey}/variants/${variantKey}/isAvailable`);
        itemRef.set(isNowAvailable).catch(error => console.error("Could not update availability:", error));
    }
});

resetSalesBtn.addEventListener('click', () => {
    if (confirm("Are you sure? This will reset all sales to 0 AND make all items available for a new day.")) {
        const productsRef = database.ref('products');
        productsRef.once('value', (snapshot) => {
            const updates = {};
            const productsData = snapshot.val();

            for (const productKey in productsData) {
                const product = productsData[productKey];
                if (product.variants) {
                    for (const variantKey in product.variants) {
                        const variantPath = `products/${productKey}/variants/${variantKey}`;
                        updates[`${variantPath}/soldToday`] = 0;
                        updates[`${variantPath}/isAvailable`] = true;
                    }
                }
            }
            
            database.ref().update(updates)
                .then(() => {
                    alert("Daily counts and stock have been successfully reset for the new day.");
                })
                .catch((error) => {
                    console.error("Error resetting data: ", error);
                    alert("There was an error resetting the data.");
                });
        });
    }
});

historyBtn.addEventListener('click', () => {
    const historyOrdersRef = database.ref('orders').orderByChild('timestamp').limitToLast(100);
    historyOrdersRef.once('value', (snapshot) => {
        historyOrdersContainer.innerHTML = '';
        const orders = snapshot.val();
        const orderKeys = Object.keys(orders || {}).reverse();

        if (orderKeys.length === 0) {
            historyOrdersContainer.innerHTML = "<p>No order history found.</p>";
        } else {
            for (const key of orderKeys) {
                const order = orders[key];
                const li = document.createElement('li');
                li.classList.add('history-item');
                if(order.status === 'completed') { li.classList.add('completed'); }
                li.innerHTML = `<span class="history-name">${order.customerName} - ${new Date(order.timestamp).toLocaleTimeString()}</span><span class="history-total">RM${order.total.toFixed(2)}</span>`;
                historyOrdersContainer.appendChild(li);
            }
        }
        historyModal.style.display = 'block';
    });
});

closeBtn.addEventListener('click', () => { historyModal.style.display = 'none'; });
window.addEventListener('click', (e) => {
    if (e.target == historyModal) {
        historyModal.style.display = 'none';
    }
});

// --- Initial Load ---
displayOrders();
displayStockManagement();