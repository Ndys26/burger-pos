// --- Firebase Configuration ---
// PASTE THE SAME FIREBASE CONFIGURATION FROM YOUR APP.JS FILE HERE!
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
 * FINAL VERSION: This function now displays remarks, checks order status,
 * adds a "Mark as Complete" button, and applies a different style to completed orders.
 */
function displayOrders() {
    const ordersRef = database.ref('orders').orderByChild('timestamp').limitToLast(20);

    ordersRef.on('value', (snapshot) => {
        ordersContainer.innerHTML = '';
        const ordersData = snapshot.val();
        
        if (!ordersData) {
            ordersContainer.innerHTML = '<p>No orders yet.</p>';
            return;
        }

        const orderKeys = Object.keys(ordersData).reverse();

        for (const key of orderKeys) {
            const order = ordersData[key];
            const orderDiv = document.createElement('div');
            orderDiv.classList.add('menu-item');

            if (order.status === 'completed') {
                orderDiv.classList.add('order-completed');
            }
            
            let itemsHtml = '<ul>';
            for (const itemKey in order.items) {
                const item = order.items[itemKey];
                itemsHtml += `<li>${item.name} x${item.quantity}</li>`;
            }
            itemsHtml += '</ul>';

            let remarksHtml = '';
            if (order.remarks && order.remarks.trim() !== '') {
                remarksHtml = `<div class="order-remarks"><b>Remarks:</b> ${order.remarks}</div>`;
            }

            orderDiv.innerHTML = `
                <div>
                    <h3>Order for ${order.customerName} - ${new Date(order.timestamp).toLocaleTimeString()}</h3>
                    ${itemsHtml}
                    ${remarksHtml}
                    <p><b>Total: RM${order.total.toFixed(2)}</b></p>
                </div>
            `;
            
            if (order.status !== 'completed') {
                const completeButton = document.createElement('button');
                completeButton.textContent = 'Mark as Complete';
                completeButton.classList.add('mark-complete-btn');
                completeButton.dataset.orderKey = key; // Attach order key to the button
                orderDiv.appendChild(completeButton);
            }
            
            ordersContainer.appendChild(orderDiv);
        }
    });
}

// Displays sales counts (this function is already correct).
function displaySalesCount() {
    const menuRef = database.ref('menuItems');
    menuRef.on('value', (snapshot) => {
        salesContainer.innerHTML = '';
        const salesData = snapshot.val();
        for (const key in salesData) {
            const item = salesData[key];
            const p = document.createElement('p');
            p.textContent = `${item.name}: ${item.soldToday || 0} sold`;
            salesContainer.appendChild(p);
        }
    });
}


/**
 * NEW: This listener watches for clicks on any "Mark as Complete" button and
 * updates the correct order's status in Firebase.
 */
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


// Resets all sales counts to 0 (this function is already correct).
resetSalesBtn.addEventListener('click', () => {
    if (confirm("Are you sure you want to reset all daily sales counts to 0? This cannot be undone.")) {
        const menuRef = database.ref('menuItems');
        menuRef.once('value', (snapshot) => {
            const updates = {};
            snapshot.forEach((childSnapshot) => {
                updates[childSnapshot.key + '/soldToday'] = 0;
            });
            menuRef.update(updates)
                .then(() => {
                    alert("Daily sales counts have been successfully reset to 0.");
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