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

// --- DOM Elements (Updated to match final status.html) ---
const greetingElement = document.getElementById('customer-name-greeting');
const orderIdDisplay = document.getElementById('order-id-display');
const statusElement = document.getElementById('order-status');
const itemsList = document.getElementById('order-items');
const totalElement = document.getElementById('order-total');

// --- Main Logic ---
function getOrderIdFromUrl() {
    const urlParams = new URLSearchParams(window.location.search);
    return urlParams.get('id');
}

const orderId = getOrderIdFromUrl();

if (!orderId) {
    // Display error if the link is missing the ID
    document.querySelector('.container').innerHTML = '<h1>Error</h1><p>No order ID was found in the URL. Please check your link.</p>';
} else {
    // Create a reference to the specific order in the database
    const orderRef = database.ref('orders/' + orderId);

    // Listen for any changes to that order's data
    orderRef.on('value', (snapshot) => {
        const order = snapshot.val();

        if (!order) {
            document.querySelector('.container').innerHTML = '<h1>Error</h1><p>Sorry, this order could not be found.</p>';
            return;
        }

        // --- All fixes are applied below ---

        // 1. Display the unique Order Number
        orderIdDisplay.textContent = `Order #${orderId.slice(-6).toUpperCase()}`;

        // 2. Display the customer greeting
        greetingElement.textContent = `Hi, ${order.customerName}!`;

        // 3. Update the status text and apply the correct color class
        const currentStatus = order.status || 'pending';
        statusElement.textContent = currentStatus; // e.g., "pending", "preparing"
        statusElement.className = `status-${currentStatus}`; // Adds the class for styling, e.g., "status-pending"

        // 4. FIX "undefined" BUG by using 'displayName'
        itemsList.innerHTML = ''; // Clear old items before adding new ones
        for (const key in order.items) {
            const item = order.items[key];
            // This is the crucial fix: It uses the full, readable name saved by app.js
            const itemName = item.displayName || "Item Name Not Found"; 
            
            const li = document.createElement('li');
            li.textContent = `${itemName} x${item.quantity}`;
            
            // Also display any customizations
            if (item.customizations && item.customizations.length > 0) {
                const customUl = document.createElement('ul');
                customUl.className = 'customizations-list-status';
                item.customizations.forEach(cust => {
                    const customLi = document.createElement('li');
                    customLi.textContent = `- ${cust}`;
                    customUl.appendChild(customLi);
                });
                li.appendChild(customUl);
            }
            itemsList.appendChild(li);
        }

        // 5. Display the total
        totalElement.textContent = `Total: RM ${order.total.toFixed(2)}`;
    });
}