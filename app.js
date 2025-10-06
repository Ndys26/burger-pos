// --- Firebase Configuration ---
const firebaseConfig = { apiKey: "AIzaSyBAZ7eWGKsLCAWbxLpytJ-a9xw5ehBYOOQ", authDomain: "counting-pos-food-system.firebaseapp.com", databaseURL: "https://counting-pos-food-system-default-rtdb.asia-southeast1.firebasedatabase.app", projectId: "counting-pos-food-system", storageBucket: "counting-pos-food-system.firebasestorage.app", messagingSenderId: "663603508723", appId: "1:663603508723:web:14699d4ccf31faaee5ce86", measurementId: "G-LYPFSMCMXB" };
firebase.initializeApp(firebaseConfig);
const database = firebase.database();

// --- DOM Elements ---
const welcomeSection = document.getElementById('welcome-section');
const orderSection = document.getElementById('order-section');
const customerNameInput = document.getElementById('customer-name-input');
const startOrderBtn = document.getElementById('start-order-btn');
const displayCustomerName = document.getElementById('display-customer-name');
const menuContainer = document.getElementById('menu-container');
const cartItems = document.getElementById('cart-items');
const cartTotal = document.getElementById('cart-total');
const submitOrderBtn = document.getElementById('submit-order');
const imageModal = document.getElementById('image-modal');
const modalImg = document.getElementById('modal-img');
const closeModalBtn = document.querySelector('.modal-close-btn');

// --- Global State ---
let cart = {};
let customerNameGlobal = '';
let ingredientsData = {};
// --- MODIFICATION: Replaced simple boolean with a status object and a timer variable ---
let storeStatus = { isOpen: false, message: 'Loading status...' };
let reopenTimer = null; // Variable to hold the countdown interval

// --- ======================= START OF MODIFIED SECTION ======================= ---

// --- MODIFIED: Real-time listener for the new storeStatus object ---
const storeStatusRef = database.ref('settings/storeStatus');
storeStatusRef.on('value', (snapshot) => {
    // Set a default "closed" status if nothing exists in the database yet.
    storeStatus = snapshot.val() || { isOpen: false, message: "Sorry, online ordering is currently closed." };
    
    // Call the function to update the user interface whenever the status changes.
    updateStoreStatusUI();
});

// --- MODIFIED: Function to control UI based on the detailed store status object ---
function updateStoreStatusUI() {
    // NOTE: This assumes you have an element with id="store-status-container" in your customer-facing HTML,
    // and inside it, another element with id="store-status-message".
    // Example: <div id="store-status-container" style="display:none;"><p id="store-status-message"></p></div>
    const statusContainer = document.getElementById('store-status-container');
    const statusMessageEl = document.getElementById('store-status-message'); // Element for the message text
    const submitButton = document.getElementById('submit-order');
    const pickupSelect = document.getElementById('pickup-time-select');
    const startButton = document.getElementById('start-order-btn'); // Also control the welcome page button
    
    // Clear any existing automatic reopening timer to prevent duplicates.
    if (reopenTimer) {
        clearInterval(reopenTimer);
        reopenTimer = null;
    }

    // Safety check to ensure the elements exist
    if (!statusContainer || !submitButton || !pickupSelect || !startButton || !statusMessageEl) {
        console.warn("One or more UI elements for store status are missing.");
        return;
    };

    if (storeStatus.isOpen) {
        // If the store is OPEN:
        statusContainer.style.display = 'none'; // Hide the "store closed" banner
        submitButton.disabled = false;
        submitButton.textContent = 'Place Order';
        pickupSelect.disabled = false;
        startButton.disabled = false; // Enable button on welcome page
        startButton.textContent = 'Start Ordering';
    } else {
        // If the store is CLOSED:
        statusMessageEl.textContent = storeStatus.message; // Display the custom message from the admin
        statusContainer.style.display = 'block';
        submitButton.disabled = true;
        submitButton.textContent = 'Ordering is Closed';
        pickupSelect.disabled = true;
        startButton.disabled = true; // Disable button on welcome page
        startButton.textContent = 'Ordering is Closed';

        // NEW: Check if there is an automatic reopening time set
        if (storeStatus.reopenTime && new Date().getTime() < storeStatus.reopenTime) {
            reopenTimer = setInterval(() => {
                const now = new Date().getTime();
                const distance = storeStatus.reopenTime - now;

                if (distance < 0) {
                    // Time is up, so we stop the timer and set the store to open.
                    // This update will trigger the listener again for all users, automatically opening the store.
                    clearInterval(reopenTimer);
                    database.ref('settings/storeStatus').update({ isOpen: true, message: "We are open for online orders!" });
                    return;
                }

                // Calculate hours, minutes, seconds for the countdown
                const hours = Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
                const minutes = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60));
                const seconds = Math.floor((distance % (1000 * 60)) / 1000);

                // Update the message with the live countdown
                statusMessageEl.textContent = `Maaf, pesanan ditutup. We will reopen in ${hours}h ${minutes}m ${seconds}s`;
                
            }, 1000);
        }
    }
}
// --- ======================= END OF MODIFIED SECTION ======================= ---

// --- (The rest of your `app.js` file remains exactly the same) ---

// ... [Preserving all your original functions like populatePickupTimes, displayMenu, etc.] ...

async function populatePickupTimes() {
    const select = document.getElementById('pickup-time-select');
    if (!select) return;
    select.innerHTML = ''; 

    try {
        const settingsSnapshot = await database.ref('settings').once('value');
        const settings = settingsSnapshot.val();

        const startTimeStr = settings?.operatingHours?.startTime || "18:30";
        const endTimeStr = settings?.operatingHours?.endTime || "23:00";
        const interval = settings?.pickupInterval || 15;

        const now = new Date();

        const [startHour, startMinute] = startTimeStr.split(':').map(Number);
        const startTime = new Date(now);
        startTime.setHours(startHour, startMinute, 0, 0);

        const [endHour, endMinute] = endTimeStr.split(':').map(Number);
        const endTime = new Date(now);
        endTime.setHours(endHour, endMinute, 0, 0);

        const pickupNowOption = document.createElement('option');
        pickupNowOption.value = 'Pick Up Now';
        pickupNowOption.textContent = 'Sedia Secepat Mungkin (Pick Up Now)';
        select.appendChild(pickupNowOption);
        
        let firstSlotTime = new Date(now);
        const minutes = firstSlotTime.getMinutes();
        const remainder = minutes % interval;
        if (remainder !== 0) {
            firstSlotTime.setMinutes(minutes + (interval - remainder));
        }

        let slotTime = new Date(firstSlotTime);
        while (slotTime <= endTime) {
            const timeString = slotTime.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
            const optionElement = document.createElement('option');
            optionElement.value = timeString;
            optionElement.textContent = `Ambil pada ${timeString}`;
            select.appendChild(optionElement);
            
            slotTime.setMinutes(slotTime.getMinutes() + interval);
        }

    } catch (error) {
        console.error("Could not fetch pickup time settings:", error);
        const optionElement = document.createElement('option');
        optionElement.textContent = 'Error loading pickup times.';
        optionElement.disabled = true;
        select.appendChild(optionElement);
    }
}

startOrderBtn.addEventListener('click', async () => {
    customerNameGlobal = customerNameInput.value.trim();
    if (customerNameGlobal === '') { alert('Please enter your name.'); return; }
    displayCustomerName.textContent = customerNameGlobal;
    welcomeSection.style.display = 'none';
    orderSection.style.display = 'block';
    
    await populatePickupTimes();
    displayMenu();
    updateStoreStatusUI(); 
});


function displayMenuGallery() {
    const galleryContainer = document.getElementById('photo-grid-container');
    const galleryRef = database.ref('galleryItems');
    galleryRef.on('value', (snapshot) => {
        if (!galleryContainer) return;
        galleryContainer.innerHTML = '';
        const items = snapshot.val();
        if (items) {
            for (const key in items) {
                const item = items[key];
                const imgElement = document.createElement('img');
                imgElement.src = item.imageUrl;
                imgElement.alt = item.description;
                imgElement.addEventListener('click', () => {
                    if (imageModal) imageModal.style.display = "block";
                    if (modalImg) modalImg.src = imgElement.src;
                });
                galleryContainer.appendChild(imgElement);
            }
        }
    });
}

function isCoreVariantAvailable(variant) {
    if (!variant) return false;
    if (!variant.isAvailable) return false;
    if (variant.requiredIngredients && variant.requiredIngredients.egg) {
        if (!ingredientsData.egg || !ingredientsData.egg.isAvailable) {
            return false;
        }
    }
    return true;
}

function displayMenu() {
    database.ref().once('value', (snapshot) => {
        const data = snapshot.val();
        if (!data || !data.products) {
            menuContainer.innerHTML = "<p>Menu is not available.</p>";
            return;
        }
        ingredientsData = data.ingredients || {};
        const productsData = data.products;
        menuContainer.innerHTML = '';
        const productsArray = Object.keys(productsData).map(key => ({ ...productsData[key], key }));
        productsArray.sort((a, b) => (a.displayOrder || 99) - (b.displayOrder || 99));

        productsArray.forEach(product => {
            const card = document.createElement('div');
            card.id = product.key;
            const availablePrices = [];
            for (const variantKey in product.variants) {
                if (isCoreVariantAvailable(product.variants[variantKey])) {
                    availablePrices.push(product.variants[variantKey].price);
                }
            }
            if (availablePrices.length > 0) {
                card.className = 'product-card collapsed';
                const minPrice = Math.min(...availablePrices);
                const maxPrice = Math.max(...availablePrices);
                let priceRangeText = `RM${minPrice.toFixed(2)}`;
                if (minPrice !== maxPrice) priceRangeText += ` - RM${maxPrice.toFixed(2)}`;
                
                const descriptionSnippet = product.description ? `<p class="product-description-snippet">${product.description}</p>` : '';

                card.innerHTML = `
                    <div class="product-header">
                        <div class="product-info">
                            <h2>${product.name}</h2>
                            ${descriptionSnippet}
                        </div>
                        <div class="product-price-info">
                            <span class="price-range">${priceRangeText}</span>
                        </div>
                    </div>
                    <div class="product-body" style="display: none;"></div>`;
            } else {
                card.className = 'product-card disabled';
                card.innerHTML = `
                    <div class="product-header">
                         <div class="product-info">
                            <h2>${product.name}</h2>
                         </div>
                         <div class="product-price-info">
                            <span class="out-of-stock-label">Tidak Tersedia</span>
                         </div>
                    </div>`;
            }
            menuContainer.appendChild(card);
        });
    });
}

function buildProductOptions(card, product) {
    const productKey = product.key;
    const body = card.querySelector('.product-body');
    body.innerHTML = '';
    const availableVariants = {};
    for (const key in product.variants) {
        if (isCoreVariantAvailable(product.variants[key])) {
            availableVariants[key] = product.variants[key];
        }
    }
    let descriptionHtml = product.description ? `<p class="product-description">${product.description}</p>` : '';
    const styles = [...new Set(Object.values(availableVariants).map(v => v.style))].filter(Boolean);
    const types = [...new Set(Object.values(availableVariants).map(v => v.type))].filter(Boolean);
    let stylesHtml = styles.length ? `<div class="choice-group style-group"><h4>Pilih Jenis:</h4><div class="options-wrapper">${styles.map(style => `<label><input type="radio" name="${productKey}_style" value="${style}">${style}</label>`).join('')}</div></div>` : '';
    let typesHtml = types.length ? `<div class="choice-group type-group" style="display:none;"><h4>Pilih Daging:</h4><div class="options-wrapper">${types.map(type => `<label><input type="radio" name="${productKey}_type" value="${type}">${type}</label>`).join('')}</div></div>` : '';
    let customizationsHtml = `<div class="customizations-container" style="display:none;"><h4>Add-On:</h4><div class="options-wrapper">`;
    if (product.options) {
        customizationsHtml += product.options.map(opt => {
            let ingredientKeyToCheck = opt.key;
            if (opt.key === 'addTelur') {
                ingredientKeyToCheck = 'egg';
            }
            const isAvailable = ingredientsData[ingredientKeyToCheck]?.isAvailable ?? true;
            return `<label class="${!isAvailable ? 'disabled-option' : ''}"><input type="checkbox" class="option-checkbox" data-price="${opt.price}" data-name="${opt.name}" ${!isAvailable ? 'disabled' : ''}>${opt.name}${opt.price > 0 ? ` (+RM${opt.price.toFixed(2)})` : ''}</label>`;
        }).join('');
    }
    customizationsHtml += `</div>`;
    if (product.customizations) {
        for (const category in product.customizations) {
            customizationsHtml += `<div class="sub-customization-group"><h5>${category}</h5><div class="options-wrapper">`;
            customizationsHtml += product.customizations[category].map(item => `<label><input type="checkbox" class="customization-checkbox" data-id="${item.id}" data-name="${item.name}">${item.name}</label>`).join('');
            customizationsHtml += `</div></div>`;
        }
    }
    customizationsHtml += `</div>`;
    const footerHtml = `<div class="product-footer-actions">
        <span class="price-display">Select options...</span>
        <button class="add-to-cart-btn" disabled>Add to Order</button>
    </div>`;
    body.innerHTML = `${descriptionHtml}${stylesHtml}${typesHtml}${customizationsHtml}${footerHtml}`;
    
    const burgerKeys = ['burgerRamly', 'burgerBenjo', 'oblong'];

    if (burgerKeys.includes(productKey)) {
        const unavailableBaseIngredients = [];
        const customizationToIngredientMap = { "tntimun": "cucumber", "tnbawang": "caramelized_onion", "tntomato": "tomato", "tnsalad": "lettuce" };
        
        for (const custId in customizationToIngredientMap) {
            const ingredientKey = customizationToIngredientMap[custId];
            if (ingredientsData[ingredientKey] && !ingredientsData[ingredientKey].isAvailable) {
                unavailableBaseIngredients.push(ingredientsData[ingredientKey].name);
                const checkbox = body.querySelector(`input[data-id="${custId}"]`);
                if (checkbox) {
                    checkbox.checked = true;
                    checkbox.disabled = true;
                    checkbox.parentElement.classList.add('forced-unavailable');
                }
            }
        }
        
        if (unavailableBaseIngredients.length > 0) {
            const warningDiv = document.createElement('div');
            warningDiv.className = 'unavailable-warning';
            warningDiv.innerHTML = `<p><strong>Perhatian:</strong> Akan dihidangkan tanpa ${unavailableBaseIngredients.join(', ')}.</p>`;
            body.prepend(warningDiv);
        }
    }

    else if (productKey === 'maggiDagingBurger') {
        if (ingredientsData['fishball'] && !ingredientsData['fishball'].isAvailable) {
            const warningDiv = document.createElement('div');
            warningDiv.className = 'unavailable-warning';
            const fishballName = ingredientsData['fishball'].name || 'Bebola Ikan';
            warningDiv.innerHTML = `<p><strong>Perhatian:</strong> Akan dihidangkan tanpa ${fishballName}.</p>`;
            body.prepend(warningDiv);
        }
    }

    body.style.display = 'block';
}

function updateProductUI(card) {
    const productKey = card.id;
    database.ref('products/' + productKey).once('value', snapshot => {
        const product = snapshot.val(); if (!product) return;
        const selectedStyle = card.querySelector(`input[name="${productKey}_style"]:checked`)?.value;
        const selectedType = card.querySelector(`input[name="${productKey}_type"]:checked`)?.value;
        const typeGroup = card.querySelector('.type-group');
        const customizationsContainer = card.querySelector('.customizations-container');
        const priceDisplay = card.querySelector('.price-display');
        const addButton = card.querySelector('.add-to-cart-btn');
        if (selectedStyle) {
            if (customizationsContainer) customizationsContainer.style.display = 'block';
            const styleRequiresType = Object.values(product.variants).some(v => v.style === selectedStyle && v.type);
            if (styleRequiresType) {
                if (typeGroup) typeGroup.style.display = 'block';
            } else {
                if (typeGroup) typeGroup.style.display = 'none';
                card.querySelectorAll(`input[name="${productKey}_type"]`).forEach(radio => radio.checked = false);
            }
        } else {
             if (typeGroup) typeGroup.style.display = 'none';
             if (customizationsContainer) customizationsContainer.style.display = 'none';
        }
        let variantFound = null;
        for (const vKey in product.variants) {
            const v = product.variants[vKey];
            if (v.style === selectedStyle && (!v.type || v.type === selectedType)) {
                variantFound = v;
                break;
            }
        }
        const isSelectionComplete = variantFound && (!variantFound.type || selectedType);
        if (isSelectionComplete) {
            if (isCoreVariantAvailable(variantFound)) {
                let currentPrice = variantFound.price;
                card.querySelectorAll('.option-checkbox:checked').forEach(box => currentPrice += parseFloat(box.dataset.price));
                priceDisplay.textContent = `RM ${currentPrice.toFixed(2)}`;
                priceDisplay.classList.remove('out-of-stock-text');
                addButton.disabled = false;
            } else {
                priceDisplay.textContent = "Stok Habis";
                priceDisplay.classList.add('out-of-stock-text');
                addButton.disabled = true;
            }
        } else {
            priceDisplay.textContent = 'Select options...';
            priceDisplay.classList.remove('out-of-stock-text');
            addButton.disabled = true;
        }
    });
}

menuContainer.addEventListener('click', (e) => {
    const card = e.target.closest('.product-card');
    if (!card) return;
    if (card.classList.contains('disabled')) { return; }
    if (e.target.closest('.product-header') && card.classList.contains('collapsed')) {
        card.classList.remove('collapsed');
        database.ref('products/' + card.id).once('value', snapshot => {
            buildProductOptions(card, { ...snapshot.val(), key: card.id });
        });
        return;
    }
    if (e.target.classList.contains('add-to-cart-btn')) {
        const productKey = card.id;
        const productName = card.querySelector('h2').textContent;
        const selectedType = card.querySelector(`input[name="${productKey}_type"]:checked`)?.value;
        const selectedStyle = card.querySelector(`input[name="${productKey}_style"]:checked`)?.value;
        database.ref('products/' + productKey).once('value', snapshot => {
            const productData = snapshot.val();
            let variantFound = null, variantKey = null;
            for (const vKey in productData.variants) {
                const v = productData.variants[vKey];
                if (v.style === selectedStyle && (!v.type || v.type === selectedType)) {
                    variantFound = v; variantKey = vKey; break;
                }
            }
            if (!variantFound) return;
            
            let finalPrice = variantFound.price;
            let customizations = [];

            // ***** START OF THE ONLY CODE CHANGE *****

            // 1. Get ONLY the customizations from checkboxes that the user clicks.
            card.querySelectorAll('.option-checkbox:checked, .customization-checkbox:checked').forEach(box => {
                if (box.dataset.price) finalPrice += parseFloat(box.dataset.price);
                customizations.push(box.dataset.name);
            });

            // 2. Create a shorter, cleaner name for the kitchen.
            let kitchenName = productName;
            // Specific rule for "Maggi Burger" as requested.
            if (productKey === 'maggiDagingBurger') {
                kitchenName = 'Maggi Burger';
            }
            // Combine the clean name with the meat type (e.g., "Ayam").
            const displayName = [kitchenName, selectedType].filter(Boolean).join(' ');
            
            // The cartKey MUST still be unique. It uses the variantKey which includes the style ("Biasa"),
            // so everything still works correctly in the background.
            const cartKey = `${productKey}_${variantKey}_${customizations.sort().join('')}`;
            
            // ***** END OF THE ONLY CODE CHANGE *****

            if (cart[cartKey]) { cart[cartKey].quantity++; } 
            else { cart[cartKey] = { productKey, variantKey, displayName, price: finalPrice, quantity: 1, customizations }; }
            updateCart();
            card.querySelector('.product-body').style.display = 'none';
            card.querySelector('.product-body').innerHTML = '';
            card.classList.add('collapsed');
        });
    }
});
menuContainer.addEventListener('change', e => {
    if (e.target.matches('input')) {
        const card = e.target.closest('.product-card');
        if (card) { updateProductUI(card); }
    }
});
function updateCart() {
    cartItems.innerHTML = '';
    let total = 0;
    for (const key in cart) {
        const item = cart[key];
        const li = document.createElement('li');
        li.classList.add('cart-item');
        let customizationsHtml = '';
        if (item.customizations && item.customizations.length > 0) {
            customizationsHtml = `<div class="cart-item-customizations"><small>+ ${item.customizations.join(', ')}</small></div>`;
        }
        li.innerHTML = `
            <div class="cart-item-details">
                <div class="cart-item-name">${item.displayName} - RM ${item.price.toFixed(2)}</div>
                ${customizationsHtml}
            </div>
            <div class="cart-item-controls">
                <button class="quantity-btn decrease-btn" data-key="${key}">-</button>
                <span class="quantity-display">${item.quantity}</span>
                <button class="quantity-btn increase-btn" data-key="${key}">+</button>
            </div>`;
        cartItems.appendChild(li);
        total += item.price * item.quantity;
    }
    cartTotal.textContent = total.toFixed(2);
}
cartItems.addEventListener('click', e => {
    const key = e.target.dataset.key;
    if (!key || !cart[key]) return;
    if (e.target.matches('.increase-btn')) cart[key].quantity++;
    if (e.target.matches('.decrease-btn')) cart[key].quantity--;
    if (cart[key].quantity <= 0) delete cart[key];
    updateCart();
});

// ===================================================================
// ===== THIS ENTIRE FUNCTION HAS BEEN UPDATED FOR STEP 1        =====
// ===================================================================
submitOrderBtn.addEventListener('click', () => {
    if (Object.keys(cart).length === 0) { alert("Your cart is empty!"); return; }
    if (!customerNameGlobal) { alert("An error occurred. Please refresh."); return; }
    
    const orderRemark = document.getElementById('order-remark-input').value.trim();
    const selectedPickupTime = document.getElementById('pickup-time-select').value;
    
    // --- NEW LOGIC TO DETERMINE STATUS AND TIMESTAMP ---
    const isPickupNow = selectedPickupTime === 'Pick Up Now';
    let orderStatus = '';
    let pickupTimestamp = null;

    if (isPickupNow) {
        orderStatus = 'pending'; // This will go directly into "Incoming Orders"
        pickupTimestamp = Date.now();
    } else {
        // --- FIX: Changed 'pending_confirmation' to 'scheduled' to match admin.js ---
        orderStatus = 'scheduled'; // This goes to the "Scheduled" area.
        
        // --- This code converts a time string like "8:45 PM" to a full timestamp ---
        const today = new Date();
        const timeParts = selectedPickupTime.match(/(\d+):(\d+)\s*(AM|PM)/); 
        if (timeParts) {
            let hours = parseInt(timeParts[1], 10);
            const minutes = parseInt(timeParts[2], 10);
            const period = timeParts[3];

            if (period === 'PM' && hours < 12) {
                hours += 12; // Convert 1-11 PM to 13-23
            }
            if (period === 'AM' && hours === 12) {
                hours = 0; // Convert 12 AM (midnight) to 0
            }
            
            const pickupDate = new Date(today.getFullYear(), today.getMonth(), today.getDate(), hours, minutes);
            pickupTimestamp = pickupDate.getTime();
        } else {
            // Fallback: If for some reason the time format is unexpected, treat it as a "now" order.
            console.error("Could not parse pickup time, defaulting to 'pending'.");
            orderStatus = 'pending'; 
            pickupTimestamp = Date.now();
        }
    }
    // --- END OF NEW LOGIC ---

    const orderCounterRef = database.ref('counters/orderNumber');
    
    orderCounterRef.transaction((currentValue) => (currentValue || 0) + 1, (error, committed, snapshot) => {
        if (error) { console.error("Order number transaction failed: ", error); alert("Could not place order."); return; }
        if (committed) {
            const newOrderNumber = snapshot.val();
            const newOrderRef = database.ref('orders').push();
            
            // --- UPDATED DATA THAT GETS SAVED TO FIREBASE ---
            newOrderRef.set({
                customerName: customerNameGlobal,
                items: cart,
                total: parseFloat(cartTotal.textContent),
                timestamp: Date.now(), // The time the order was created
                status: orderStatus, // Use the new dynamic status ('pending' or 'scheduled')
                remark: orderRemark,
                orderNumber: newOrderNumber,
                pickupTime: selectedPickupTime, // The human-friendly time string (e.g., "8:45 PM")
                pickupTimestamp: pickupTimestamp // The new machine-readable timestamp for calculations
            });
            // --- END OF UPDATED DATA ---

            for (const key in cart) {
                const item = cart[key];
                database.ref(`products/${item.productKey}/variants/${item.variantKey}/soldToday`).transaction(currentValue => (currentValue || 0) + item.quantity);
            }
            const orderId = newOrderRef.key;
            orderSection.innerHTML = `<div class="order-success"><h1>Thank You, ${customerNameGlobal}!</h1><p>Your order number is #${newOrderNumber}.</p><div class="success-buttons"><a href="status.html?id=${orderId}" class="status-link" target="_blank">View My Order Status</a><button id="order-again-btn" class="order-again-link">Place Another Order</button></div></div>`;
            document.getElementById('order-again-btn').addEventListener('click', () => window.location.reload());
        }
    });
});

if (closeModalBtn) { closeModalBtn.addEventListener('click', () => imageModal.style.display = "none"); }
if (imageModal) { imageModal.addEventListener('click', (event) => { if (event.target == imageModal) { imageModal.style.display = "none"; } }); }

// --- Initial Load ---
displayMenuGallery();