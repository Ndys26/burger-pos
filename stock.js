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
const salesContainer = document.getElementById('sales-container');
const ingredientsContainer = document.getElementById('ingredients-container');

// --- Kitchen Name Translator Function (Needed for this page too) ---
function getKitchenName(fullName) {
    if (!fullName) return '';
    let lowerCaseName = fullName.toLowerCase();
    if (lowerCaseName.includes('burger ramly biasa ayam')) return 'Burger Ayam';
    if (lowerCaseName.includes('maggi daging burger biasa oblong ayam')) return 'Maggi Oblong Ayam';
    if (lowerCaseName.includes('maggi daging burger biasa patty ayam')) return 'Maggi Ayam';
    if (lowerCaseName.includes('burger benjo biasa')) return 'Burger Benjo';
    let simpleName = fullName.replace(/Burger Ramly/gi, 'Burger').replace(/Maggi Daging Burger/gi, 'Maggi').replace(/Biasa/gi, '').replace(/Patty/gi, '').replace(/  +/g, ' ');
    return simpleName.trim();
}

// --- Function to display stock and sales data ---
function displayManagement() {
    if (salesContainer) {
        database.ref('products').on('value', snapshot => {
            salesContainer.innerHTML = ''; // Clear previous content
            const products = snapshot.val();
            if (!products) return;

            const productsArray = Object.keys(products).map(key => ({ ...products[key], key: key }));
            productsArray.sort((a, b) => (a.displayOrder || 99) - (b.displayOrder || 99));

            // NEW: Build a separate card for each product category
            productsArray.forEach(product => {
                let cardHtml = `
                    <div class="management-card">
                        <h3>${getKitchenName(product.name)}</h3>
                        <div class="management-card-body">
                `;

                Object.entries(product.variants).forEach(([variantKey, variant]) => {
                    const displayName = [variant.style, variant.type].filter(Boolean).join(' ') || variantKey;
                    cardHtml += `
                        <div class="stock-item">
                            <span class="stock-name">${displayName}: ${variant.soldToday || 0} sold</span>
                            <label class="toggle-switch">
                                <input class="stock-toggle" type="checkbox" data-path="products/${product.key}/variants/${variantKey}/isAvailable" ${variant.isAvailable ? 'checked' : ''}>
                                <span class="slider round"></span>
                            </label>
                        </div>
                    `;
                });

                cardHtml += `
                        </div>
                    </div>
                `;
                salesContainer.innerHTML += cardHtml;
            });
        });
    }

    if (ingredientsContainer) {
        database.ref('ingredients').on('value', snapshot => {
            ingredientsContainer.innerHTML = ''; // Clear previous content
            const ingredients = snapshot.val();
            if (!ingredients) {
                ingredientsContainer.innerHTML = '<p>No ingredients found.</p>';
                return;
            }

            // NEW: Build a single card for all ingredients
            let cardHtml = `
                <div class="management-card">
                    <h3>All Ingredients</h3>
                    <div class="management-card-body">
            `;

            Object.entries(ingredients).forEach(([key, ing]) => {
                cardHtml += `
                    <div class="stock-item">
                        <span class="stock-name">${ing.name}</span>
                        <label class="toggle-switch">
                            <input class="stock-toggle" type="checkbox" data-path="ingredients/${key}/isAvailable" ${ing.isAvailable ? 'checked' : ''}>
                            <span class="slider round"></span>
                        </label>
                    </div>
                `;
            });

             cardHtml += `
                    </div>
                </div>
            `;
            ingredientsContainer.innerHTML = cardHtml;
        });
    }
}

// --- Event Listener for Stock Toggles ---
document.body.addEventListener('change', e => {
    if (e.target.matches('.stock-toggle')) {
        database.ref(e.target.dataset.path).set(e.target.checked);
    }
});

// --- Initial Load ---
displayManagement();