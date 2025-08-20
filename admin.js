// Add this variable at the very top to track order count for sound notifications
let previousOrderCount = 0;

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

// --- Functions ---

/**
 * UPDATED: This function now plays a sound notification for new orders
 * and uses the new "card" layout.
 */
function displayOrders() {
    const ordersRef = database.ref('orders').orderByChild('timestamp').limitToLast(20);

    ordersRef.on('value', (snapshot) => {
        const ordersData = snapshot.val();
        
        if (!ordersData) {
            ordersContainer.innerHTML = '<p>No orders yet.</p>';
            previousOrderCount = 0; // Reset counter
            return;
        }

        // --- NEW SOUND LOGIC ---
        const newOrderCount = Object.keys(ordersData).length;
        if (newOrderCount > previousOrderCount && previousOrderCount !== 0) {
            document.getElementById('notification-sound').play().catch(e => console.error("Sound play failed", e));
        }
        previousOrderCount = newOrderCount;
        // --- END SOUND LOGIC ---

        ordersContainer.innerHTML = '';
        const orderKeys = Object.keys(ordersData).reverse();

        for (const key of orderKeys) {
            const order = ordersData[key];
            const orderCard = document.createElement('div');
            orderCard.classList.add('order-card');
            
            if (order.status === 'completed') {
                orderCard.classList.add('completed');
            }

            let itemsHtml = '<ul>';
            for (const itemKey in order.items) {
                const item = order.items[itemKey];
                itemsHtml += `<li>${item.name} x${item.quantity}</li>`;
            }
            itemsHtml += '</ul>';

            let remarksHtml = '';
            if (order.remarks && order.remarks.trim() !== '') {
                remarksHtml = `<div class="order-remarks">${order.remarks}</div>`;
            }

            orderCard.innerHTML = `
                <div class="order-header ${order.status || 'pending'}">
                    <h3>${order.customerName} - ${new Date(order.timestamp).toLocaleTimeString()}</h3>
                </div>
                <div class="order-body">
                    ${itemsHtml}
                    ${remarksHtml}
                </div>
                <div class="order-footer">
                    <span class="total">Total: RM${order.total.toFixed(2)}</span>
                    ${order.status !== 'completed' ? `<button class="mark-complete-btn" data-order-key="${key}">Done</button>` : ''}
                </div>
            `;
            ordersContainer.appendChild(orderCard);
        }
    });
}

/**
 * UPDATED: This function now correctly reads from the "products" and "variants" structure.
 */
function displaySalesCount() {
    const productsRef = database.ref('products');
    productsRef.on('value', (snapshot) => {
        salesContainer.innerHTML = '';
        const productsData = snapshot.val();
        for (const productKey in productsData) {
            const product = productsData[productKey];
            if (product.variants) {
                const h4 = document.createElement('h4');
                h4.textContent = product.name;
                salesContainer.appendChild(h4);
                
                for (const variantKey in product.variants) {
                    const variant = product.variants[variantKey];
                    const p = document.createElement('p');
                    let variantName = `${variant.type || ''} ${variant.style || ''}`.trim() || variant.name;
                    p.textContent = `${variantName}: ${variant.soldToday || 0} sold`;
                    p.style.marginLeft = '15px';
                    salesContainer.appendChild(p);
                }
            }
        }
    });
}

// Click listener for "Mark as Complete" buttons (this logic is correct).
ordersContainer.addEventListener('click', (e) => {
    if (e.target.classList.contains('mark-complete-btn')) {
        const orderKey = e.target.dataset.orderKey;
        if (orderKey) {
            const orderRef = database.ref('orders/' + orderKey);
            orderRef.update({ status: 'completed' })
                .catch(error => console.error("Could not update order status: ", error));
        }
    }
});


/**
 * UPDATED: This function now correctly resets sales in the "products" and "variants" structure.
 */
resetSalesBtn.addEventListener('click', () => {
    if (confirm("Are you sure you want to reset all daily sales counts to 0? This cannot be undone.")) {
        const productsRef = database.ref('products');
        productsRef.once('value', (snapshot) => {
            const updates = {};
            snapshot.forEach((productSnapshot) => {
                productSnapshot.child('variants').forEach((variantSnapshot) => {
                    updates[`${productSnapshot.key}/variants/${variantSnapshot.key}/soldToday`] = 0;
                });
            });
            productsRef.update(updates)
                .then(() => {
                    alert("Daily sales counts have been successfully reset.");
                })
                .catch((error) => {
                    console.error("Error resetting sales counts: ", error);
                    alert("There was an error resetting the sales counts.");
                });
        });
    }
});


// --- Initial Load ---
displayOrders();
displaySalesCount();