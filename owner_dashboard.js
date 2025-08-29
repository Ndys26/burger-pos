document.addEventListener('DOMContentLoaded', () => {
    // --- Firebase Configuration & Global Vars ---
    const firebaseConfig = { apiKey: "AIzaSyBAZ7eWGKsLCAWbxLpytJ-a9xw5ehBYOOQ", authDomain: "counting-pos-food-system.firebaseapp.com", databaseURL: "https://counting-pos-food-system-default-rtdb.asia-southeast1.firebasedatabase.app", projectId: "counting-pos-food-system", storageBucket: "counting-pos-food-system.firebasestorage.app", messagingSenderId: "663603508723", appId: "1:663603508723:web:14699d4ccf31faaee5ce86", measurementId: "G-LYPFSMCMXB" };
    if (!firebase.apps.length) {
        firebase.initializeApp(firebaseConfig);
    }
    const auth = firebase.auth();
    const database = firebase.database();
    let mySalesChart;

    // --- Global variables to hold our data ---
    let allOrders = {};
    let allProducts = {};
    let allInventory = {};
    let allSettings = {};
    let allShifts = {};

    let fixedCosts = 0;
    let currentOrderId = null;
    let isStoreOpen = false;
    let activeShift = null;


    // --- SECURITY CHECK ---
    auth.onAuthStateChanged(user => {
        if (user) {
            setupEventListeners();
            // This is the new, efficient way to load data
            setupDataListeners();
        } else {
            window.location.href = 'login.html';
        }
    });

    // =========================================================================
    // ===== START OF OPTIMIZED CODE =====
    // =========================================================================

    // --- HELPER FUNCTION to avoid repeating code ---
    function getTodaysCompletedOrders(orders) {
        const now = new Date();
        const startOfTodayTimestamp = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
        return Object.values(orders).filter(order =>
            order.timestamp >= startOfTodayTimestamp &&
            (order.status === 'completed' || order.status === 'Completed' || order.paymentMethod)
        );
    }

    // --- NEW EFFICIENT DATA LOADING ---
    function setupDataListeners() {
        // 1. Listen ONLY to orders
        database.ref('orders').on('value', (snapshot) => {
            allOrders = snapshot.val() || {};
            console.log('Orders data updated.');

            const todaysCompletedOrders = getTodaysCompletedOrders(allOrders);

            // Update UI that depends on orders
            updateStatCards(todaysCompletedOrders);
            updateAcceptedItemsTable(allProducts, todaysCompletedOrders);
            updateSalesChart(allOrders);
            updateAllOrdersTable(allOrders);
            updateCustomersView(allOrders);
            updateReportsView('today'); // Will use the latest allOrders
            updateFinancialGoals(allOrders, allProducts);
            updateShiftsView(); // Needs both orders and shifts
        });

        // 2. Listen ONLY to products
        database.ref('products').on('value', (snapshot) => {
            allProducts = snapshot.val() || {};
            console.log('Products data updated.');

            const todaysCompletedOrders = getTodaysCompletedOrders(allOrders);

            // Update UI that depends on products
            updateAcceptedItemsTable(allProducts, todaysCompletedOrders);
            updateMenuView(allProducts, allInventory);
            updateFinancialGoals(allOrders, allProducts);
        });

        // 3. Listen ONLY to inventory
        database.ref('inventory').on('value', (snapshot) => {
            allInventory = snapshot.val() || {};
            console.log('Inventory data updated.');

            // Update UI that depends on inventory
            updateInventoryView(allInventory);
            updateMenuView(allProducts, allInventory);
        });

        // 4. Listen ONLY to settings
        database.ref('settings').on('value', (snapshot) => {
            allSettings = snapshot.val() || {};
            console.log('Settings data updated.');

            fixedCosts = allSettings.fixedCosts || 0;
            isStoreOpen = allSettings.isStoreOpen === true;

            // Update UI that depends on settings
            updateSettingsView();
            updateFinancialGoals(allOrders, allProducts);
        });

        // 5. Listen ONLY to shifts
        database.ref('shifts').on('value', (snapshot) => {
            allShifts = snapshot.val() || {};
            console.log('Shifts data updated.');
            updateShiftsView();
        });
    }

    // =========================================================================
    // ===== END OF OPTIMIZED CODE =====
    // =========================================================================

    // --- SETUP ALL EVENT LISTENERS ---
    function setupEventListeners() {
        const sidebarLinks = document.querySelectorAll('.sidebar-nav .nav-link');
        const mainViews = document.querySelectorAll('.main-view');
        sidebarLinks.forEach(link => {
            link.addEventListener('click', e => {
                e.preventDefault();
                const viewId = link.dataset.view;
                if (viewId) {
                    sidebarLinks.forEach(l => l.classList.remove('active'));
                    link.classList.add('active');
                    mainViews.forEach(view => view.classList.toggle('active', view.id === viewId));
                }
            });
        });

        const filterButtons = document.querySelectorAll('.filter-btn');
        filterButtons.forEach(button => {
            button.addEventListener('click', () => {
                filterButtons.forEach(btn => btn.classList.remove('active'));
                button.classList.add('active');
                updateReportsView(button.dataset.period);
            });
        });

        const logoutBtn = document.getElementById('logout-btn');
        if (logoutBtn) logoutBtn.addEventListener('click', e => { e.preventDefault(); auth.signOut(); });

        const settingsForm = document.getElementById('settings-form');
        if (settingsForm) {
            settingsForm.addEventListener('submit', e => {
                e.preventDefault();
                const newFixedCosts = parseFloat(document.getElementById('fixed-costs-input').value);
                if (!isNaN(newFixedCosts)) {
                    database.ref('settings/fixedCosts').set(newFixedCosts).then(() => alert('Settings saved successfully!')).catch(error => alert(`Error saving settings: ${error.message}`));
                } else {
                    alert('Please enter a valid number for fixed costs.');
                }
            });
        }

        const storeStatusToggle = document.getElementById('store-status-toggle');
        if (storeStatusToggle) {
            storeStatusToggle.addEventListener('change', () => {
                database.ref('settings/isStoreOpen').set(storeStatusToggle.checked);
            });
        }

        const startShiftBtn = document.getElementById('start-shift-btn');
        if(startShiftBtn) startShiftBtn.addEventListener('click', () => {
            document.getElementById('start-shift-modal').style.display = 'flex';
        });

        const saveTargetBtn = document.getElementById('save-target-btn');
        if (saveTargetBtn) {
            saveTargetBtn.addEventListener('click', handleSaveSalesTarget);
        }

        setupModalEventListeners();
    }

    // --- SETUP MODAL LISTENERS ---
    function setupModalEventListeners() {
        const ingredientModal = document.getElementById('ingredient-modal');
        const addIngredientBtn = document.getElementById('add-ingredient-btn');
        const closeIngredientModal = document.getElementById('close-ingredient-modal');
        const ingredientForm = document.getElementById('ingredient-form');
        const ingredientTbody = document.getElementById('inventory-tbody');
        const addStockModal = document.getElementById('add-stock-modal');
        const closeAddStockModal = document.getElementById('close-add-stock-modal');
        const addStockForm = document.getElementById('add-stock-form');
        const menuTbody = document.getElementById('menu-tbody');
        const recipeModal = document.getElementById('recipe-modal');
        const closeRecipeModal = document.getElementById('close-recipe-modal');
        const recipeForm = document.getElementById('recipe-form');

        if(addIngredientBtn) addIngredientBtn.addEventListener('click', () => { ingredientForm.reset(); document.getElementById('ingredient-key').value = ''; document.getElementById('ingredient-modal-title').textContent = 'Add New Ingredient'; ingredientModal.style.display = 'flex'; });
        if(closeIngredientModal) closeIngredientModal.addEventListener('click', () => ingredientModal.style.display = 'none');
        if(closeAddStockModal) closeAddStockModal.addEventListener('click', () => addStockModal.style.display = 'none');
        if(closeRecipeModal) closeRecipeModal.addEventListener('click', () => recipeModal.style.display = 'none');

        if(ingredientTbody) ingredientTbody.addEventListener('click', e => { const row = e.target.closest('tr'); if (!row) return; const key = row.dataset.key; if (e.target.matches('.add-stock-btn, .add-stock-btn *')) { database.ref('inventory/' + key).once('value', snapshot => { const item = snapshot.val(); document.getElementById('add-stock-modal-title').textContent = `Add Stock for ${item.name}`; document.getElementById('add-stock-key').value = key; addStockForm.reset(); addStockModal.style.display = 'flex'; }); } else if (e.target.matches('.edit-ingredient-btn, .edit-ingredient-btn *')) { database.ref('inventory/' + key).once('value', snapshot => { const item = snapshot.val(); document.getElementById('ingredient-modal-title').textContent = `Edit ${item.name}`; document.getElementById('ingredient-key').value = key; document.getElementById('ingredient-name').value = item.name; document.getElementById('ingredient-stock').value = item.stock; document.getElementById('ingredient-unit').value = item.unit; document.getElementById('ingredient-cost').value = item.cost; document.getElementById('ingredient-threshold').value = item.lowStock; ingredientModal.style.display = 'flex'; }); } });
        if(ingredientForm) ingredientForm.addEventListener('submit', e => { e.preventDefault(); const key = document.getElementById('ingredient-key').value; const ingredientData = { name: document.getElementById('ingredient-name').value, stock: parseFloat(document.getElementById('ingredient-stock').value), unit: document.getElementById('ingredient-unit').value, cost: parseFloat(document.getElementById('ingredient-cost').value), lowStock: parseFloat(document.getElementById('ingredient-threshold').value) }; if (key) { database.ref('inventory/' + key).update(ingredientData); } else { database.ref('inventory').push(ingredientData); } ingredientModal.style.display = 'none'; });
        if(addStockForm) addStockForm.addEventListener('submit', e => { e.preventDefault(); const key = document.getElementById('add-stock-key').value; const quantityToAdd = parseFloat(document.getElementById('stock-to-add').value); database.ref('inventory/' + key + '/stock').transaction(currentStock => (currentStock || 0) + quantityToAdd); addStockModal.style.display = 'none'; });
        if(menuTbody) menuTbody.addEventListener('click', e => { if (e.target.matches('.edit-recipe-btn, .edit-recipe-btn *')) { const productKey = e.target.closest('tr').dataset.productKey; const variantKey = e.target.closest('tr').dataset.variantKey; openRecipeModal(productKey, variantKey); } });
        if(recipeForm) recipeForm.addEventListener('submit', e => { e.preventDefault(); const productKey = document.getElementById('recipe-product-key').value; const variantKey = document.getElementById('recipe-variant-key').value; const newPrice = parseFloat(document.getElementById('recipe-price').value); const newRecipe = {}; document.querySelectorAll('.recipe-ingredient-item input').forEach(input => { const quantity = parseFloat(input.value); if (quantity > 0) { newRecipe[input.dataset.ingredientKey] = quantity; } }); database.ref(`products/${productKey}/variants/${variantKey}`).update({ price: newPrice, recipe: newRecipe }); recipeModal.style.display = 'none'; });

        const paymentModal = document.getElementById('payment-modal');
        const closePaymentModalBtn = document.getElementById('close-payment-modal');
        const payByCashBtn = document.getElementById('pay-by-cash-btn');
        const payByQrBtn = document.getElementById('pay-by-qr-btn');
        const allOrdersTbody = document.getElementById('all-orders-tbody');
        if (closePaymentModalBtn) closePaymentModalBtn.addEventListener('click', () => paymentModal.style.display = 'none');

        // ======================= NEW CODE BLOCK START ========================
        // UPGRADED Event Listener for the Orders Table
        if (allOrdersTbody) {
            allOrdersTbody.addEventListener('click', e => {
                const payButton = e.target.closest('.process-payment-btn');
                const deleteButton = e.target.closest('.delete-order-btn');

                // Logic for Processing Payment
                if (payButton) {
                    const orderId = payButton.dataset.orderId;
                    if (allOrders[orderId]) {
                        openPaymentModal(orderId, allOrders[orderId]);
                    }
                }

                // NEW Logic for Deleting an Order
                if (deleteButton) {
                    const orderId = deleteButton.dataset.orderId;
                    const orderNumber = allOrders[orderId]?.orderNumber || orderId; // Use order number for the alert

                    // Add a confirmation step to prevent accidents!
                    if (confirm(`Are you sure you want to permanently delete Order #${orderNumber}? This action cannot be undone.`)) {
                        // Remove the order from the Firebase database
                        database.ref('orders/' + orderId).remove()
                            .then(() => {
                                console.log(`Order ${orderId} was successfully deleted.`);
                                // The UI will update automatically because of the real-time listener!
                            })
                            .catch(error => {
                                console.error("Error deleting order: ", error);
                                alert("There was an error deleting the order. Please try again.");
                            });
                    }
                }
            });
        }
        // ======================= NEW CODE BLOCK END ========================

        if (payByCashBtn) payByCashBtn.addEventListener('click', () => processOrderPayment('Cash'));
        if (payByQrBtn) payByQrBtn.addEventListener('click', () => processOrderPayment('QR / Online Banking'));

        const startShiftModal = document.getElementById('start-shift-modal');
        const closeStartShiftModalBtn = document.getElementById('close-start-shift-modal');
        const startShiftForm = document.getElementById('start-shift-form');

        const closeShiftModal = document.getElementById('close-shift-modal');
        const closeCloseShiftModalBtn = document.getElementById('close-close-shift-modal');
        const closeShiftForm = document.getElementById('close-shift-form');
        const activeShiftSection = document.getElementById('active-shift-section');

        if(closeStartShiftModalBtn) closeStartShiftModalBtn.addEventListener('click', () => startShiftModal.style.display = 'none');
        if(startShiftForm) startShiftForm.addEventListener('submit', handleStartShiftSubmit);

        if(closeCloseShiftModalBtn) closeCloseShiftModalBtn.addEventListener('click', () => closeShiftModal.style.display = 'none');
        if(closeShiftForm) closeShiftForm.addEventListener('submit', handleCloseShiftSubmit);

        if(activeShiftSection) {
            activeShiftSection.addEventListener('click', e => {
                if(e.target.matches('.close-shift-btn, .close-shift-btn *')) {
                    openCloseShiftModal();
                }
            });
        }
    }

    // --- ALL UPDATE FUNCTIONS ---
    function updateStatCards(todaysCompletedOrders) {
        const totalRevenueDisplay = document.getElementById('total-revenue-display');
        const transactionCountDisplay = document.getElementById('transaction-count-display');
        const bestSellerDisplay = document.getElementById('best-seller-display');
        const avgTransactionDisplay = document.getElementById('avg-transaction-display');

        let totalRevenue = 0;
        const itemCounts = {};

        const transactionCount = todaysCompletedOrders.length;

        todaysCompletedOrders.forEach(order => {
            totalRevenue += order.total || 0;
            if (order.items) {
                Object.values(order.items).forEach(item => {
                    const itemName = item.displayName.split(' (')[0];
                    itemCounts[itemName] = (itemCounts[itemName] || 0) + item.quantity;
                });
            }
        });

        const averageTransactionValue = transactionCount > 0 ? totalRevenue / transactionCount : 0;
        let bestSellerName = 'N/A';
        let maxQuantity = 0;

        for (const itemName in itemCounts) {
            if (itemCounts[itemName] > maxQuantity) {
                maxQuantity = itemCounts[itemName];
                bestSellerName = itemName;
            }
        }

        if (totalRevenueDisplay) totalRevenueDisplay.textContent = `RM ${totalRevenue.toFixed(2)}`;
        if (transactionCountDisplay) transactionCountDisplay.textContent = transactionCount;
        if (bestSellerDisplay) {
            bestSellerDisplay.textContent = maxQuantity > 0 ? `${bestSellerName} (${maxQuantity} sold)` : 'N/A';
        }
        if (avgTransactionDisplay) avgTransactionDisplay.textContent = `RM ${averageTransactionValue.toFixed(2)}`;
    }

    function updateAcceptedItemsTable(products, todaysCompletedOrders) {
        const tbody = document.getElementById('accepted-items-tbody');
        if (!tbody) return;

        const todaysItemCounts = {};
        if (todaysCompletedOrders) {
            todaysCompletedOrders.forEach(order => {
                if (order.items) {
                    Object.values(order.items).forEach(item => {
                        const productKey = item.productKey;
                        if(productKey) {
                             todaysItemCounts[productKey] = (todaysItemCounts[productKey] || 0) + item.quantity;
                        }
                    });
                }
            });
        }

        tbody.innerHTML = '';
        for (const key in products) {
            const product = products[key];
            if (!product.variants) continue;

            const isAvailable = Object.values(product.variants).some(v => v.isAvailable);
            const soldToday = todaysItemCounts[key] || 0;

            const row = `<tr><td>${product.name}</td><td>${soldToday} pcs</td><td><span class="item-status ${isAvailable ? 'in-stock' : 'out-of-stock'}">${isAvailable ? 'In Stock' : 'Out of Stock'}</span></td></tr>`;
            tbody.innerHTML += row;
        }
    }

    function updateSalesChart(orders) { const canvas = document.getElementById('sales-trends-chart'); if (!canvas) return; const ctx = canvas.getContext('2d'); const labels = Array(7).fill(0).map((_, i) => { const d = new Date(); d.setDate(d.getDate() - i); return d.toLocaleString('en-US', { weekday: 'short' }); }).reverse(); const salesData = Array(7).fill(0); const today = new Date(); today.setHours(0, 0, 0, 0); for (const orderId in orders) { const order = orders[orderId]; if (!order.timestamp || !order.total) continue; const orderDate = new Date(order.timestamp); const diffDays = Math.floor((today - orderDate) / (1000 * 60 * 60 * 24)); if (diffDays >= 0 && diffDays < 7) { salesData[6 - diffDays] += order.total; } } if (mySalesChart) mySalesChart.destroy(); mySalesChart = new Chart(ctx, { type: 'line', data: { labels: labels, datasets: [{ label: 'Sales (RM)', data: salesData, backgroundColor: 'rgba(94, 53, 177, 0.1)', borderColor: '#5E35B1', borderWidth: 3, fill: true, tension: 0.4 }] }, options: { responsive: true, maintainAspectRatio: false, scales: { y: { beginAtZero: true } } } }); }

    // ======================= NEW CODE BLOCK START ========================
    // UPGRADED Function to build the Orders Table
    function updateAllOrdersTable(orders) {
        const tbody = document.getElementById('all-orders-tbody');
        if (!tbody) return;
        tbody.innerHTML = '';
        const sortedOrderIds = Object.keys(orders).sort((a, b) => orders[b].timestamp - orders[a].timestamp);
        for (const orderId of sortedOrderIds) {
            const order = orders[orderId];
            const orderDate = new Date(order.timestamp);
            const formattedDate = `${orderDate.toLocaleDateString()} ${orderDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;

            let paymentActionHtml = ''; // For the payment button/display
            if (order.status === 'Completed' && !order.paymentMethod) {
                paymentActionHtml = `<button class="action-btn pay process-payment-btn" data-order-id="${orderId}" title="Process Payment"><i class="fas fa-dollar-sign"></i></button>`;
            } else if (order.paymentMethod) {
                const icon = order.paymentMethod === 'Cash' ? 'fa-money-bill-wave' : 'fa-qrcode';
                paymentActionHtml = `<span class="payment-method-display" title="Paid with ${order.paymentMethod}"><i class="fas ${icon}"></i> ${order.paymentMethod}</span>`;
            }

            // Create the delete button for every row
            const deleteActionHtml = `<button class="action-btn delete delete-order-btn" data-order-id="${orderId}" title="Delete Order"><i class="fas fa-trash-alt"></i></button>`;

            // Combine them for the final HTML
            const finalActionHtml = `${paymentActionHtml} ${deleteActionHtml}`;

            const row = document.createElement('tr');
            // Use finalActionHtml and ensure the status class is lowercase
            row.innerHTML = `<td>#${order.orderNumber || 'N/A'}</td><td>${order.customerName}</td><td>${order.total.toFixed(2)}</td><td><span class="status-badge ${order.status.toLowerCase()}">${order.status}</span></td><td>${formattedDate}</td><td>${finalActionHtml}</td>`;
            tbody.appendChild(row);
        }
    }
    // ======================= NEW CODE BLOCK END ========================

    function updateCustomersView(orders) { const customersContainer = document.getElementById('customer-list-container'); if (!customersContainer) return; const customerData = {}; for (const orderId in orders) { const order = orders[orderId]; const name = order.customerName; if (!customerData[name]) { customerData[name] = { orderCount: 0, reviews: [] }; } customerData[name].orderCount++; if (order.review) { customerData[name].reviews.push(order.review); } } customersContainer.innerHTML = ''; for (const name in customerData) { const data = customerData[name]; const initial = name.charAt(0).toUpperCase(); let reviewsHTML = '<h5>No reviews yet.</h5>'; if (data.reviews.length > 0) { reviewsHTML = '<h5>Reviews:</h5><ul class="review-list">'; data.reviews.forEach(review => { let starsHTML = ''; for (let i = 1; i <= 5; i++) { starsHTML += `<span class="${i <= review.rating ? '' : 'empty-star'}">★</span>`; } reviewsHTML += `<li class="review-item"><div class="review-stars">${starsHTML}</div>${review.comment ? `<p class="review-comment">"${review.comment}"</p>` : ''}</li>`; }); reviewsHTML += '</ul>'; } const customerCardHTML = `<div class="customer-card"><div class="customer-card-header"><div class="customer-avatar">${initial}</div><div><h3>${name}</h3><p>${data.orderCount} total order(s)</p></div></div><div class="customer-card-body">${reviewsHTML}</div></div>`; customersContainer.innerHTML += customerCardHTML; } }
    function updateReportsView(period) { const reportTotalRevenue = document.getElementById('report-total-revenue'); const reportTotalOrders = document.getElementById('report-total-orders'); const reportTotalItems = document.getElementById('report-total-items'); const productSalesTbody = document.getElementById('product-sales-tbody'); const reportGrossProfit = document.getElementById('report-gross-profit'); if (!reportTotalRevenue) return; const now = new Date(); const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()); const startOfWeek = new Date(startOfToday); startOfWeek.setDate(startOfWeek.getDate() - now.getDay()); const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1); const filteredOrders = Object.values(allOrders).filter(order => { const orderDate = new Date(order.timestamp); if (period === 'today') return orderDate >= startOfToday; if (period === 'week') return orderDate >= startOfWeek; if (period === 'month') return orderDate >= startOfMonth; return true; }); let totalRevenue = 0; let totalItemsSold = 0; let totalCost = 0; const productSales = {}; filteredOrders.forEach(order => { totalRevenue += order.total || 0; if (order.items) { for (const key in order.items) { const item = order.items[key]; totalItemsSold += item.quantity; totalCost += (item.cost || 0) * item.quantity; const itemName = item.displayName; if (!productSales[itemName]) { productSales[itemName] = { quantity: 0, revenue: 0 }; } productSales[itemName].quantity += item.quantity; productSales[itemName].revenue += item.price * item.quantity; } } }); const grossProfit = totalRevenue - totalCost; if (reportGrossProfit) reportGrossProfit.textContent = `RM ${grossProfit.toFixed(2)}`; reportTotalRevenue.textContent = `RM ${totalRevenue.toFixed(2)}`; reportTotalOrders.textContent = filteredOrders.length; reportTotalItems.textContent = totalItemsSold; productSalesTbody.innerHTML = ''; const sortedProducts = Object.entries(productSales).sort((a, b) => b[1].quantity - a[1].quantity); sortedProducts.forEach(([name, data]) => { const row = `<tr><td>${name}</td><td>${data.quantity}</td><td>${data.revenue.toFixed(2)}</td></tr>`; productSalesTbody.innerHTML += row; }); }
    function updateInventoryView(inventory) { const tbody = document.getElementById('inventory-tbody'); if (!tbody) return; tbody.innerHTML = ''; for (const key in inventory) { const item = inventory[key]; let status, statusClass; if (item.stock <= 0) { status = 'Out of Stock'; statusClass = 'out-of-stock'; } else if (item.stock <= item.lowStock) { status = 'Low Stock'; statusClass = 'low-stock'; } else { status = 'In Stock'; statusClass = 'in-stock'; } const row = document.createElement('tr'); row.dataset.key = key; row.innerHTML = `<td>${item.name}</td><td>${item.stock}</td><td>${item.unit}</td><td>${item.lowStock}</td><td>${item.cost.toFixed(2)}</td><td><span class="status-badge ${statusClass}">${status}</span></td><td><button class="action-btn add add-stock-btn" title="Add Stock"><i class="fas fa-plus"></i></button><button class="action-btn edit edit-ingredient-btn" title="Edit Ingredient"><i class="fas fa-pencil-alt"></i></button></td>`; tbody.appendChild(row); } }
    function updateMenuView(products, inventory) { const tbody = document.getElementById('menu-tbody'); if (!tbody) return; tbody.innerHTML = ''; for (const productKey in products) { const product = products[productKey]; if (!product.variants) continue; for (const variantKey in product.variants) { const variant = product.variants[variantKey]; let calculatedCost = 0; if (variant.recipe) { for (const ingredientKey in variant.recipe) { if (inventory[ingredientKey]) { calculatedCost += (inventory[ingredientKey].cost || 0) * (variant.recipe[ingredientKey] || 0); } } } database.ref(`products/${productKey}/variants/${variantKey}/cost`).set(calculatedCost); const profit = (variant.price || 0) - calculatedCost; const margin = (variant.price > 0) ? (profit / variant.price) * 100 : 0; const row = document.createElement('tr'); row.dataset.productKey = productKey; row.dataset.variantKey = variantKey; row.innerHTML = `<td>${product.name} - ${variant.style || ''} ${variant.type || ''}</td><td>${(variant.price || 0).toFixed(2)}</td><td>${calculatedCost.toFixed(2)}</td><td>${profit.toFixed(2)}</td><td>${margin.toFixed(1)}%</td><td><button class="action-btn edit edit-recipe-btn"><i class="fas fa-edit"></i> Recipe</button></td>`; tbody.appendChild(row); } } }
    function openRecipeModal(productKey, variantKey) { const recipeModal = document.getElementById('recipe-modal'); const ingredientListDiv = document.getElementById('recipe-ingredient-list'); database.ref().once('value', snapshot => { const data = snapshot.val(); const variant = data.products[productKey].variants[variantKey]; const inventory = data.inventory; document.getElementById('recipe-modal-title').textContent = `Edit Recipe: ${data.products[productKey].name} - ${variant.style || ''} ${variant.type || ''}`; document.getElementById('recipe-product-key').value = productKey; document.getElementById('recipe-variant-key').value = variantKey; document.getElementById('recipe-price').value = (variant.price || 0).toFixed(2); ingredientListDiv.innerHTML = ''; for (const ingredientKey in inventory) { const ingredient = { id: ingredientKey, ...inventory[ingredientKey] }; const currentQuantity = variant.recipe ? (variant.recipe[ingredient.id] || 0) : 0; const itemHTML = `<div class="recipe-ingredient-item"><label for="ing-${ingredient.id}">${ingredient.name} (${ingredient.unit})</label><input type="number" step="any" id="ing-${ingredient.id}" data-ingredient-key="${ingredient.id}" value="${currentQuantity}"></div>`; ingredientListDiv.innerHTML += itemHTML; } recipeModal.style.display = 'flex'; }); }

    function updateSettingsView() { const fixedCostsInput = document.getElementById('fixed-costs-input'); if (fixedCostsInput) { fixedCostsInput.value = fixedCosts.toFixed(2); } const toggle = document.getElementById('store-status-toggle'); const statusText = document.getElementById('store-status-text'); if (toggle && statusText) { toggle.checked = isStoreOpen; statusText.textContent = isStoreOpen ? 'OPEN' : 'CLOSED'; statusText.className = 'store-status-label'; statusText.classList.add(isStoreOpen ? 'open' : 'closed'); } }
    function updateFinancialGoals() { const breakEvenRevenueEl = document.getElementById('break-even-revenue'); const breakEvenItemsEl = document.getElementById('break-even-items'); const breakEvenProgressEl = document.getElementById('break-even-progress'); const breakEvenProgressTextEl = document.getElementById('break-even-progress-text'); if (!breakEvenRevenueEl) return; const now = new Date(); const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1); const monthlyOrders = Object.values(allOrders).filter(order => new Date(order.timestamp) >= startOfMonth); let monthRevenue = 0; let monthCost = 0; let monthItemsSold = 0; monthlyOrders.forEach(order => { monthRevenue += order.total || 0; if (order.items) { for (const key in order.items) { const item = order.items[key]; monthCost += (item.cost || 0) * item.quantity; monthItemsSold += item.quantity; } } }); const monthProfit = monthRevenue - monthCost; const avgProfitPerItem = monthItemsSold > 0 ? monthProfit / monthItemsSold : 0; const breakEvenItems = avgProfitPerItem > 0 ? Math.ceil(fixedCosts / avgProfitPerItem) : 0; const progress = fixedCosts > 0 ? (monthRevenue / fixedCosts) * 100 : 0; const cappedProgress = Math.min(progress, 100); breakEvenRevenueEl.textContent = `RM ${fixedCosts.toFixed(2)}`; breakEvenItemsEl.textContent = breakEvenItems; breakEvenProgressEl.style.width = `${cappedProgress}%`; breakEvenProgressTextEl.textContent = `${Math.round(progress)}%`; }
    function openPaymentModal(orderId, order) { currentOrderId = orderId; const paymentModal = document.getElementById('payment-modal'); document.getElementById('payment-modal-title').textContent = `Process Payment for Order #${order.orderNumber}`; document.getElementById('payment-modal-total').textContent = `RM ${order.total.toFixed(2)}`; paymentModal.style.display = 'flex'; }
    function processOrderPayment(method) { if (!currentOrderId) return; database.ref('orders/' + currentOrderId).update({ paymentMethod: method }).then(() => { document.getElementById('payment-modal').style.display = 'none'; currentOrderId = null; }).catch(error => { console.error("Error updating payment method: ", error); alert("Could not process payment. Please try again."); }); }

    function formatTimestamp(ts) {
        if (!ts) return '-';
        const date = new Date(ts);
        return `${date.toLocaleDateString()} ${date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
    }
    function updateShiftsView() {
        activeShift = null;
        for (const key in allShifts) {
            if (allShifts[key].status === 'active') {
                activeShift = { key, ...allShifts[key] };
                break;
            }
        }

        const activeShiftSection = document.getElementById('active-shift-section');
        const noActiveShiftMessage = document.getElementById('no-active-shift-message');
        const startShiftBtn = document.getElementById('start-shift-btn');
        const shiftHistoryTbody = document.getElementById('shift-history-tbody');

        if (!activeShiftSection) return;
        if (activeShift) {
            noActiveShiftMessage.style.display = 'none';
            activeShiftSection.style.display = 'block';
            startShiftBtn.disabled = true;

            const shiftOrders = Object.values(allOrders).filter(order => order.timestamp >= activeShift.startTime && order.paymentMethod === 'Cash');
            const cashSales = shiftOrders.reduce((sum, order) => sum + order.total, 0);
            const expectedCash = activeShift.startingFloat + cashSales;

            activeShiftSection.innerHTML = `
                <div class="shift-summary-grid">
                    <div><strong>Start Time:</strong><span>${formatTimestamp(activeShift.startTime)}</span></div>
                    <div><strong>Starting Float:</strong><span>RM ${activeShift.startingFloat.toFixed(2)}</span></div>
                    <div><strong>Cash Sales So Far:</strong><span>RM ${cashSales.toFixed(2)}</span></div>
                    <div><strong>Expected in Drawer:</strong><span>RM ${expectedCash.toFixed(2)}</span></div>
                </div>
                <button class="add-item-btn danger close-shift-btn">Close Shift</button>
            `;
        } else {
            noActiveShiftMessage.style.display = 'block';
            activeShiftSection.style.display = 'none';
            startShiftBtn.disabled = false;
        }
        shiftHistoryTbody.innerHTML = '';
        const sortedShifts = Object.values(allShifts).filter(s => s.status === 'closed').sort((a, b) => b.startTime - a.startTime);

        if (sortedShifts.length === 0) {
             shiftHistoryTbody.innerHTML = '<tr><td colspan="6">No shift history found.</td></tr>';
        } else {
            sortedShifts.forEach(shift => {
                const difference = shift.difference || 0;
                let diffClass = '';
                if (difference > 0) diffClass = 'positive';
                if (difference < 0) diffClass = 'negative';

                const row = document.createElement('tr');
                row.innerHTML = `
                    <td>${formatTimestamp(shift.startTime)}</td>
                    <td>${formatTimestamp(shift.endTime)}</td>
                    <td>${(shift.expectedCash || 0).toFixed(2)}</td>
                    <td>${(shift.countedCash || 0).toFixed(2)}</td>
                    <td><span class="${diffClass}">${difference.toFixed(2)}</span></td>
                    <td><span class="status-badge closed">${shift.status}</span></td>
                `;
                shiftHistoryTbody.appendChild(row);
            });
        }
    }
    function handleStartShiftSubmit(e) {
        e.preventDefault();
        const startShiftModal = document.getElementById('start-shift-modal');
        const startingFloatInput = document.getElementById('starting-float-input');
        const startingFloat = parseFloat(startingFloatInput.value);

        if (isNaN(startingFloat) || startingFloat < 0) {
            alert('Please enter a valid starting cash amount.');
            return;
        }

        const newShift = {
            startTime: Date.now(),
            startingFloat: startingFloat,
            status: 'active'
        };

        database.ref('shifts').push(newShift).then(() => {
            startShiftModal.style.display = 'none';
            startingFloatInput.value = '';
        }).catch(error => {
            console.error("Error starting shift:", error);
            alert("Could not start a new shift. Please try again.");
        });
    }
    function openCloseShiftModal() {
        if (!activeShift) return;

        const summaryContainer = document.getElementById('close-shift-summary');
        const closeShiftModal = document.getElementById('close-shift-modal');

        const shiftOrders = Object.values(allOrders).filter(order => order.timestamp >= activeShift.startTime && order.paymentMethod === 'Cash');
        const cashSales = shiftOrders.reduce((sum, order) => sum + order.total, 0);
        const expectedCash = activeShift.startingFloat + cashSales;

        summaryContainer.innerHTML = `
            <p><strong>Starting Float:</strong> RM ${activeShift.startingFloat.toFixed(2)}</p>
            <p><strong>Total Cash Sales:</strong> RM ${cashSales.toFixed(2)}</p>
            <p class="expected-total"><strong>Expected Cash in Drawer:</strong> RM ${expectedCash.toFixed(2)}</p>
        `;

        closeShiftModal.style.display = 'flex';
    }
    function handleCloseShiftSubmit(e) {
        e.preventDefault();
        if (!activeShift) return;

        const closeShiftModal = document.getElementById('close-shift-modal');
        const finalCashInput = document.getElementById('final-cash-input');
        const countedCash = parseFloat(finalCashInput.value);

        if (isNaN(countedCash) || countedCash < 0) {
            alert('Please enter a valid final cash amount.');
            return;
        }

        const shiftOrders = Object.values(allOrders).filter(order => order.timestamp >= activeShift.startTime && order.paymentMethod === 'Cash');
        const cashSales = shiftOrders.reduce((sum, order) => sum + order.total, 0);
        const expectedCash = activeShift.startingFloat + cashSales;
        const difference = countedCash - expectedCash;

        const shiftUpdate = {
            endTime: Date.now(),
            status: 'closed',
            cashSales: cashSales,
            expectedCash: expectedCash,
            countedCash: countedCash,
            difference: difference
        };

        database.ref('shifts/' + activeShift.key).update(shiftUpdate).then(() => {
            closeShiftModal.style.display = 'none';
            finalCashInput.value = '';
        }).catch(error => {
            console.error("Error closing shift:", error);
            alert("Could not close the shift. Please try again.");
        });
    }

    function handleSaveSalesTarget() {
        const salesTargetInput = document.getElementById('sales-target-input');
        const targetValue = parseFloat(salesTargetInput.value);

        if (targetValue && targetValue > 0) {
            database.ref('daily_metrics/salesTarget').set(targetValue)
                .then(() => {
                    alert('Sales target saved successfully!');
                    salesTargetInput.value = '';
                })
                .catch(err => {
                    console.error("Error saving target:", err);
                    alert("Could not save the target. Please try again.");
                });
        } else {
            alert('Please enter a valid target amount.');
        }
    }
});