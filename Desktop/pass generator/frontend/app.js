// ===== INIT =====
const EMAILJS_PUBLIC_KEY = "lRZiR_b9CdRtPU7EN";
const OTP_SERVICE_ID = "service_1wep2db";
const OTP_TEMPLATE_ID = "template_u102zye";
const PASS_SERVICE_ID = "service_71voqhh";
const PASS_TEMPLATE_ID = "template_b36qc68";

emailjs.init(EMAILJS_PUBLIC_KEY);
let socket;
let lockedSeats = {};
if (typeof io !== 'undefined') {
    socket = io("http://localhost:5000");

    socket.on("seatLocked", (seatId) => {
        lockedSeats[seatId] = true;
        const btn = document.getElementById(`seat-${seatId}`);
        if (!btn) return;

        if (selectedSeat === seatId) return;

        btn.classList.remove("seat-available");
        btn.classList.add("seat-locked");
    });

    socket.on("seatUnlocked", (seatId) => {
        delete lockedSeats[seatId];
        const btn = document.getElementById(`seat-${seatId}`);
        if (!btn) return;

        btn.classList.remove("seat-locked");
        btn.classList.add("seat-available");
    });

    socket.on("seatTaken", (seatId) => {
        lockedSeats[seatId] = true;
        if (selectedSeat === seatId) {
            const btn = document.getElementById(`seat-${seatId}`);
            if (btn) {
                btn.classList.remove("seat-selected");
                btn.classList.add("seat-locked");
            }
            selectedSeat = null;
            updateSelectionChips();
        }
        alert("Seat already taken ❌");
    });

    const updateUI = (seatsObj) => {
        lockedSeats = seatsObj;

        // reset non-selected seats
        document.querySelectorAll('.seat').forEach(btn => {
            const id = btn.id.replace('seat-', '');
            if (selectedSeat !== id) {
                btn.classList.remove("seat-locked", "seat-sold", "seat-selected");
                btn.classList.add("seat-available");
            }
        });

        // apply locks / sold
        Object.keys(seatsObj).forEach(seatId => {
            const btn = document.getElementById(`seat-${seatId}`);
            if (btn) {
                if (seatsObj[seatId].status === "sold") {
                    btn.classList.remove("seat-available", "seat-selected", "seat-locked");
                    btn.classList.add("seat-sold");
                } else if (seatsObj[seatId].status === "locked") {
                    if (selectedSeat !== seatId) {
                        btn.classList.remove("seat-available", "seat-selected", "seat-sold");
                        btn.classList.add("seat-locked");
                    }
                }
            }
        });
    };

    socket.on('initSeats', (seats) => {
        updateUI(seats);
    });

    socket.on('refreshSeats', async () => {
        try {
            const res = await fetch("http://localhost:5000/get-seats");
            const arr = await res.json();
            let seatsObj = {};
            arr.forEach(s => seatsObj[s.seatId] = s);
            updateUI(seatsObj);
        } catch (err) {
            console.error("Failed to refresh seats:", err);
        }
    });

    socket.on("seatSold", (seatId) => {
        lockedSeats[seatId] = true;
        const btn = document.getElementById(`seat-${seatId}`);
        if (btn) {
            btn.classList.remove("seat-available", "seat-selected", "seat-locked");
            btn.classList.add("seat-sold");
        }
    });
}
let selectedSeat = null;
let paymentVerified = false; 
document.addEventListener('DOMContentLoaded', () => {
    if (!localStorage.getItem('feedx_users')) {
        localStorage.setItem('feedx_users', JSON.stringify([]));
    }

    // URL Router
    const path = window.location.pathname;
    const search = window.location.search;
    const hash = window.location.hash;

    // Open Admin if /admin is in URL
    if (path.endsWith('/admin') || search.includes('admin') || hash.includes('admin')) {
        window.location.href = "admin.html";
        return;
    }

    // Default User Routing
    if (localStorage.getItem("studentLoggedIn")) {
        navigateTo('home');
    } else {
        navigateTo('student-login');
    }
});

// ===== NAV =====
function navigateTo(view, data = null) {
    const container = document.getElementById('app-container');
    container.innerHTML = '';

    if (view === 'home') {
        if (localStorage.getItem("studentLoggedIn")) {
            renderHome();
        } else {
            renderStudentLogin();
        }
    } else if (view === 'student-login') {
        renderStudentLogin();
    }
    if (view === 'verify') renderVerify(data);
    if (view === 'pass') renderPass(data);
    if (view === 'contact') renderContact();
}

// ===== FETCH USER =====
function getUser(pin) {
    return usersData.find(u => u.pin === pin);
}

// ===== HOME =====
function renderHome() {
    const users = JSON.parse(localStorage.getItem('feedx_users')) || [];
    const loggedInEmail = localStorage.getItem("studentLoggedIn") || "";

    document.getElementById('app-container').innerHTML = `
    <!-- Header -->
    <header class="h-20 flex items-center justify-between px-8 border-b border-outline-variant/15 bg-surface-container-lowest/50 backdrop-blur-md z-10 relative mb-4 rounded-xl">
        <div class="flex items-center gap-6">
            <button onclick="navigateTo('home')" class="w-10 h-10 rounded-full bg-surface-container flex items-center justify-center hover:bg-surface-container-high transition-colors border border-outline-variant/20">
                <span class="material-symbols-outlined text-on-surface">arrow_back</span>
            </button>
            <div class="flex flex-col">
                <h1 class="font-headline text-2xl font-bold bg-gradient-to-r from-primary to-secondary text-transparent bg-clip-text drop-shadow-[0_0_10px_rgba(153,247,255,0.2)]">Vignan Vedika</h1>
                <span class="text-on-surface-variant text-sm font-medium">Tomorrow, 19:30 • Sector 4, Neo-Vegas</span>
            </div>
        </div>
        <div class="flex items-center gap-3 bg-surface-container-low px-4 py-2 rounded-full border border-outline-variant/15">
            <div class="w-2 h-2 rounded-full bg-error animate-pulse shadow-[0_0_8px_var(--color-error)]"></div>
            <span class="text-on-surface-variant text-sm font-medium">42 Users Viewing</span>
        </div>
    </header>

    <!-- Main Layout -->
    <main class="flex-1 flex gap-8 p-4 overflow-hidden relative z-10 h-[80vh]">
        <!-- Seat Map Area -->
        <section class="flex-1 bg-surface-container-low rounded-xl border border-outline-variant/10 overflow-hidden flex flex-col relative shadow-[0_10px_40px_rgba(0,0,0,0.5)]">
            <div class="flex-1 overflow-auto p-12 flex flex-col items-center custom-scrollbar">

                <!-- 1. Screen Indicator -->
                <div class="w-[700px] mb-12 relative flex justify-center">
                    <div class="absolute top-0 w-full h-10 border-t-[4px] border-primary/40 rounded-[50%/100%_100%_0_0] shadow-[0_-15px_30px_rgba(153,247,255,0.15)]"></div>
                    <span class="absolute -top-6 text-primary font-headline tracking-[0.4em] text-sm uppercase font-bold">🎬 SCREEN</span>
                </div>


                <!-- 3. Main Layout -->
                <div class="grid grid-cols-2 gap-x-20 gap-y-12 relative">
                    <!-- Section A -->
                    <div class="relative">
                        <div class="flex items-center gap-2 mb-4">
                            <span class="text-xs font-bold text-on-surface-variant">🅰️ Section A (Entry Side)</span>
                            <span class="text-[10px] px-1.5 py-0.5 rounded bg-surface-container-high text-on-surface-variant border border-outline-variant/20">⬅ ENTRY</span>
                        </div>
                        <div class="seat-grid" id="grid-A"></div>
                    </div>
                    <!-- Section B -->
                    <div class="relative">
                        <div class="flex items-center justify-between mb-4">
                            <span class="text-xs font-bold text-on-surface-variant">🅱️ Section B (🚺 Ladies Only)</span>
                            <span class="text-[10px] px-1.5 py-0.5 rounded bg-surface-container-high text-on-surface-variant border border-outline-variant/20">EXIT ➡</span>
                        </div>
                        <div class="seat-grid" id="grid-B"></div>
                    </div>
                    <!-- Section C -->
                    <div>
                        <div class="mb-4"><span class="text-xs font-bold text-on-surface-variant">🅲 Section C</span></div>
                        <div class="seat-grid" id="grid-C"></div>
                    </div>
                    <!-- Section D -->
                    <div>
                        <div class="mb-4"><span class="text-xs font-bold text-on-surface-variant">🅳 Section D</span></div>
                        <div class="seat-grid" id="grid-D"></div>
                    </div>
                </div>
                <!-- Bottom spacing -->
                <div class="h-20"></div>
            </div>
        </section>

        <!-- Side Panel -->
        <aside class="w-80 bg-surface-container/70 backdrop-blur-[12px] border border-outline-variant/15 rounded-xl flex flex-col overflow-y-auto shadow-[0_0_40px_rgba(112,0,255,0.05)] custom-scrollbar">
            
            <div class="p-6 border-b border-outline-variant/15 bg-surface-container-low/50">
                <h3 class="font-headline text-lg font-bold text-on-surface mb-4">Legend</h3>
                <div class="flex flex-col gap-3">
                    <div class="flex items-center gap-3"><div class="w-5 h-5 rounded seat-available"></div><span class="text-sm text-on-surface-variant">Available</span></div>
                    <div class="flex items-center gap-3"><div class="w-5 h-5 rounded seat-selected border border-[#facc15]"></div><span class="text-sm text-on-surface">Selected</span></div>
                    <div class="flex items-center gap-3"><div class="w-5 h-5 rounded seat-locked"></div><span class="text-sm text-on-surface-variant">Locked</span></div>
                    <div class="flex items-center gap-3"><div class="w-5 h-5 rounded seat-sold"></div><span class="text-sm text-on-surface-variant">Sold</span></div>
                </div>
            </div>

            <!-- Enhanced Participant Fields -->
            <div class="p-6 flex flex-col gap-4 border-b border-outline-variant/15">
                <h3 class="font-headline text-lg font-bold text-on-surface mb-1">Participant</h3>
                <input id="name" placeholder="Full Name" class="w-full p-2.5 rounded bg-surface-bright/20 border border-outline-variant/20 text-on-surface text-sm outline-none focus:border-primary/50 transition-colors">
                <input id="email" type="email" placeholder="Email Address" class="w-full p-2.5 rounded bg-surface-bright/20 border border-outline-variant/20 text-on-surface text-sm outline-none focus:border-primary/50 transition-colors" ${loggedInEmail ? `value="${loggedInEmail}" readonly` : ''}>
                <div class="flex gap-2">
                    <input id="branch" placeholder="Branch (e.g. CPS)" class="w-full p-2.5 rounded bg-surface-bright/20 border border-outline-variant/20 text-on-surface text-sm outline-none focus:border-primary/50 transition-colors">
                    <select id="year" class="w-full p-2.5 rounded bg-surface-bright/20 border border-outline-variant/20 text-on-surface text-sm outline-none focus:border-primary/50 transition-colors">
                        <option value="" class="bg-surface">Year</option>
                        <option value="1st Year" class="bg-surface">1st</option>
                        <option value="2nd Year" class="bg-surface">2nd</option>
                        <option value="3rd Year" class="bg-surface">3rd</option>
                        <option value="4th Year" class="bg-surface">4th</option>
                    </select>
                </div>
                <input id="pinInput" placeholder="College PIN" class="w-full p-2.5 rounded bg-surface-bright/20 border border-outline-variant/20 text-primary text-sm font-mono tracking-wider outline-none focus:border-primary/50 transition-colors text-center uppercase">
            </div>

            <div class="p-6 flex-1 flex flex-col min-h-[250px]">
                <h3 class="font-headline text-lg font-bold text-on-surface mb-4">Your Selection</h3>
                
                <div id="selection-chips" class="flex flex-wrap gap-2 mb-8">
                    <p class="text-on-surface-variant text-sm italic" id="no-seat-text">Click a green seat to select</p>
                </div>

                <div class="mt-auto bg-surface-container-low rounded-lg p-4 border border-outline-variant/10">
                    <div class="flex justify-between items-center mb-1">
                        <span id="ticketCount" class="text-on-surface-variant text-sm">Tickets (0)</span>
                        <span id="ticketBasePrice" class="text-on-surface font-medium">₹0</span>
                    </div>
                    <div class="h-[1px] bg-outline-variant/20 w-full mb-4 mt-3"></div>
                    <div class="flex justify-between items-end mb-6">
                        <span class="text-on-surface font-medium">Total Amount</span>
                        <span id="totalAmount" class="font-headline text-3xl font-bold bg-gradient-to-r from-primary to-secondary text-transparent bg-clip-text drop-shadow-[0_0_15px_rgba(153,247,255,0.3)]">₹0</span>
                    </div>

                    <button onclick="startPayment()" id="checkoutBtn" class="w-full h-12 rounded-lg bg-gradient-to-r from-primary to-primary-dim text-on-primary font-bold text-base shadow-[0_0_20px_rgba(0,241,254,0.3)] hover:shadow-[0_0_25px_rgba(0,241,254,0.5)] transition-all duration-300 flex items-center justify-center gap-2 group">
                        Checkout Now
                        <span class="material-symbols-outlined group-hover:translate-x-1 transition-transform">arrow_forward</span>
                    </button>
                    <p id="paymentStatus" class="text-center text-sm font-medium mt-2 hidden text-yellow-400"></p>
                </div>
            </div>
        </aside>
    </main>
    `;

    document.getElementById("pinInput").addEventListener("input", function () {
        const pin = this.value.trim();
        const user = usersData.find(u => u.pin === pin);

        if (user) {
            document.getElementById("name").value = user.name;
            document.getElementById("branch").value = user.branch;
            document.getElementById("year").value = user.year;
        }
    });

    setTimeout(() => {
        renderAuditorium();
    }, 100);
}

// ===== SEAT MAP BUILDER =====
function renderAuditorium() {
    function generateHTML(prefix, count) {
        let h = "";
        for (let i = 1; i <= count; i++) {
            const seatId = prefix + i;
            h += `<div id="seat-${seatId}" class="seat seat-available" onclick="selectSeat('${seatId}')">${seatId}</div>`;
        }
        return h;
    }

    document.getElementById("grid-A").innerHTML = generateHTML("A", 60);
    document.getElementById("grid-B").innerHTML = generateHTML("B", 60);
    document.getElementById("grid-C").innerHTML = generateHTML("C", 60);
    document.getElementById("grid-D").innerHTML = generateHTML("D", 60);

    if (Object.keys(lockedSeats).length > 0 && typeof socket !== 'undefined') {
        socket.emit("getSeats"); // Wait, previously the backend sent seats. We should trigger refreshSeats event
        // The backend doesn't have a getSeats event handler natively. Let's just rely on fetch
        fetch("http://localhost:5000/get-seats").then(res => res.json()).then(arr => {
            let seatsObj = {};
            arr.forEach(s => seatsObj[s.seatId] = s);
            lockedSeats = seatsObj;
            document.querySelectorAll('.seat').forEach(btn => {
                const id = btn.id.replace('seat-', '');
                if (selectedSeat !== id) {
                    btn.classList.remove("seat-locked", "seat-sold", "seat-selected");
                    btn.classList.add("seat-available");
                }
            });
            Object.keys(seatsObj).forEach(seatId => {
                const btn = document.getElementById(`seat-${seatId}`);
                if (btn) {
                    if (seatsObj[seatId].status === "sold") {
                        btn.classList.remove("seat-available", "seat-selected", "seat-locked");
                        btn.classList.add("seat-sold");
                    } else if (seatsObj[seatId].status === "locked") {
                        if (selectedSeat !== seatId) {
                            btn.classList.remove("seat-available", "seat-selected", "seat-sold");
                            btn.classList.add("seat-locked");
                        }
                    }
                }
            });
        });
    }
}

// ===== SELECT SEAT =====
function selectSeat(seatId) {

    if (lockedSeats[seatId] && lockedSeats[seatId].status === "sold") {
        alert("Seat unavailable ❌");
        return;
    }
    if (lockedSeats[seatId] && lockedSeats[seatId].status === "locked" && selectedSeat !== seatId) {
    }

    // Reset ALL seats visually first to ensure only one is selected
    document.querySelectorAll(".seat").forEach(btn => {
        btn.classList.remove("seat-selected");
        const sid = btn.id.replace("seat-", "");
        if (!lockedSeats[sid] || lockedSeats[sid].status === "available") {
            btn.classList.add("seat-available");
            btn.classList.remove("seat-locked", "seat-sold");
        }
    });

    const btn = document.getElementById(`seat-${seatId}`);
    if (btn) btn.className = "seat seat-selected";

    console.log("Selecting seat:", seatId);

    selectedSeat = seatId;
    localStorage.setItem("seat", selectedSeat);

    if (socket) {
        socket.emit("lockSeat", { seatId });
    }
    updateSelectionChips();
}

function clearSeat(seatId) {
    if (selectedSeat === seatId) {
        selectedSeat = null;
        localStorage.removeItem("seat");
        
        const btn = document.getElementById(`seat-${seatId}`);
        if (btn) {
            btn.classList.remove("seat-selected");
            btn.classList.add("seat-available");
        }
    }
    updateSelectionChips();
}

function updateSelectionChips() {
    console.log("Updating Selection Chips. selectedSeat is:", selectedSeat);
    const container = document.getElementById("selection-chips");
    if (!selectedSeat) {
        container.innerHTML = '<p class="text-on-surface-variant text-sm italic mt-1" id="no-seat-text">Click a green seat to select</p>';
        document.getElementById("ticketCount").innerText = `Tickets (0)`;
        document.getElementById("ticketBasePrice").innerText = "₹0";
        document.getElementById("totalAmount").innerText = "₹0";
    } else {
        container.innerHTML = `
            <div class="bg-surface-bright/20 backdrop-blur-md border border-yellow-500/30 rounded py-1.5 px-3 flex items-center gap-2 animate-fade-in w-full justify-between shadow-[0_0_10px_rgba(250,204,21,0.2)] mb-2">
                <span class="text-yellow-400 font-bold text-sm">Seat ${selectedSeat}</span>
                <span class="material-symbols-outlined text-on-surface-variant text-[16px] cursor-pointer hover:text-error transition-colors" onclick="clearSeat('${selectedSeat}')">close</span>
            </div>
        `;
        document.getElementById("ticketCount").innerText = `Tickets (1)`;
        document.getElementById("ticketBasePrice").innerText = "₹40";
        document.getElementById("totalAmount").innerText = "₹40";
    }
}

// ===== PROFESSIONAL PAYMENT FLOW =====
async function startPayment() {
    const btn = document.getElementById("checkoutBtn");
    btn.innerText = "Securing Gateway... ⏳";
    btn.disabled = true;

    if (!selectedSeat) {
        alert("Please select a seat from the map! 🪑");
        btn.disabled = false;
        btn.innerText = "Checkout Now";
        return;
    }

    try {
        // 1. Fetch Order ID from backend
        const orderRes = await fetch("http://localhost:5000/create-order", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ seat: selectedSeat })
        });

        if (!orderRes.ok) throw new Error("Failed to create order");
        const order = await orderRes.json();

        // 2. Open Razorpay Checkout
        const options = {
            key: "rzp_test_SUK1QREk8B67CK", // Use test key as requested (extracted from live key pattern)
            amount: order.amount,
            currency: "INR",
            name: "FEEDX 2026",
            description: "Auditorium Access Pass",
            order_id: order.id,
            theme: {
                color: "#6C5CE7"
            },
            handler: async function (response) {
                btn.innerText = "Verifying Payment... ⏳";

                // 3. Verify Payment Signature
                const verifyRes = await fetch("http://localhost:5000/verify-payment", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        razorpay_order_id: response.razorpay_order_id,
                        razorpay_payment_id: response.razorpay_payment_id,
                        razorpay_signature: response.razorpay_signature,
                        seat: selectedSeat
                    })
                });

                const verifyObj = await verifyRes.json();

                if (verifyObj.success) {
                    alert("Payment Verified ✅");
                    
                    // Mark seat as sold locally
                    const seatBtn = document.getElementById(`seat-${selectedSeat}`);
                    if (seatBtn) {
                        seatBtn.classList.remove("seat-selected", "seat-available", "seat-locked");
                        seatBtn.classList.add("seat-sold");
                    }
                    if (socket) socket.emit("seatSold", selectedSeat);

                    // 4. Generate Pass & Redirect
                    generatePass();
                } else {
                    alert("Payment Verification Failed ❌");
                    btn.disabled = false;
                    btn.innerText = "Checkout Now";
                }
            },
            prefill: {
                name: document.getElementById("name").value,
                email: document.getElementById("email").value
            }
        };

        const rzp = new window.Razorpay(options);
        rzp.open();

    } catch (err) {
        console.error(err);
        alert("Payment failed ❌");
        btn.disabled = false;
        btn.innerText = "Checkout Now";
    }
}

// ⚡ STEP 3 — INSTANT PASS GENERATION
function generatePass() {
    const passData = {
        seat: selectedSeat,
        name: document.getElementById("name").value,
        time: new Date().toLocaleString()
    };

    localStorage.setItem("feedx_pass", JSON.stringify(passData));

    // Also keep record in feedx_users for admin
    const users = JSON.parse(localStorage.getItem('feedx_users')) || [];
    users.push({
        ...passData,
        email: document.getElementById("email").value,
        branch: document.getElementById("branch").value,
        year: document.getElementById("year").value,
        pin: document.getElementById("pinInput").value,
        status: "approved", // auto approved after payment success
        submittedAt: new Date().toISOString()
    });
    localStorage.setItem('feedx_users', JSON.stringify(users));

    // Redirect instantly
    window.location.href = "pass.html";
}

// ===== EMAIL FUNCTION =====
function sendPassEmailNotification(name, email, pin, link) {
    emailjs.send(PASS_SERVICE_ID, PASS_TEMPLATE_ID, {
        to_name: name,
        to_email: email,
        user_pin: pin,
        pass_link: link
    })
    .then(() => {
        console.log("Pass email sent successfully!");
    })
    .catch(err => {
        console.error("Pass email error:", err);
    });
}

// ===== SUBMIT FORM COMPLETE =====
function submitForm(name, email, branch, year, pin, txn) {
    if (!paymentVerified) {
        alert("Complete payment first ❌");
        return;
    }

    const users = JSON.parse(localStorage.getItem('feedx_users')) || [];

    const newUser = {
        name,
        email,
        branch,
        year,
        pin,
        txn, // Razorpay Payment ID auto updates manual transaction logs
        seat: selectedSeat,
        status: "pending",
        checkedIn: false,
        used: false,
        expiresAt: null,
        submittedAt: new Date().toISOString()
    };

    users.push(newUser);
    localStorage.setItem('feedx_users', JSON.stringify(users));

    localStorage.setItem("paid", "true");
    showThankYou();
}

// 🔥 CHAOS MODE HOOK
function enterChaos() {
    window.location.href = "chaos.html";
}

// ===== THANK YOU =====
function showThankYou() {
    document.getElementById("app-container").innerHTML = `
                <div class="max-w-lg mx-auto text-center glass-card p-8 rounded-2xl animate-fade-in mt-10">

        <h2 class="text-3xl font-bold text-green-400 mb-4">Payment Submitted ✅</h2>

        <p class="text-gray-300 mb-4">
            Thank you for registering for <span class="text-neon-cyan">FEEDX 2026</span>.
        </p>

        <p class="text-gray-400 mb-6">
            Your payment is under verification.<br>
            🎫 Your event pass will be sent within <b>24 hours</b>.
        </p>

        <div class="text-sm text-gray-500">
            Please keep your PIN safe for future reference.
        </div>

        <button onclick="enterChaos()" class="mt-6 px-6 py-3 w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:scale-105 transition-transform text-white rounded-xl font-bold uppercase tracking-wider shadow-[0_0_15px_rgba(188,19,254,0.4)]">
            ENTER CHAOS MODE 🔥
        </button>

    </div>
                `;
}

// Legacy Admin functions removed as they are now handled by admin-dashboard.js

// ===== CONTACT US =====
function renderContact() {
    document.getElementById('app-container').innerHTML = `
                <div class="max-w-lg mx-auto animate-fade-in space-y-6">

        <!--HEADER -->
        <div class="text-center">
            <h1 class="text-4xl font-bold font-outfit bg-gradient-to-r from-cyan-400 to-purple-500 bg-clip-text text-transparent">
                Contact Us
            </h1>
            <p class="text-gray-400 mt-2">Have a question? We're here to help.</p>
        </div>

        <!--FORM CARD-->
                <div class="glass-card p-6 rounded-2xl space-y-5">
                    <form id="contact-form" class="space-y-4">

                        <!-- NAME -->
                        <div>
                            <label class="text-sm text-gray-400">Your Name</label>
                            <input id="name" placeholder="Full Name" required
                                class="input-field">
                        </div>

                        <!-- EMAIL -->
                        <div>
                            <label class="text-sm text-gray-400">Your Email</label>
                            <input id="email" type="email" placeholder="example@email.com" required
                                class="input-field">
                        </div>

                        <!-- MESSAGE -->
                        <div>
                            <label class="text-sm text-gray-400">Message</label>
                            <textarea id="message" rows="4" placeholder="How can we help?" required
                                class="input-field resize-none"></textarea>
                        </div>

                        <!-- SUBMIT -->
                        <button type="submit"
                            class="btn-primary w-full py-3 rounded-xl font-semibold">
                            Send Message
                        </button>

                        <p id="status" class="text-center font-medium mt-3 text-cyan-400"></p>

                    </form>
                </div>
    </div>
                `;

    document.getElementById("contact-form").addEventListener("submit", function (e) {
        e.preventDefault();

        document.getElementById("status").innerText = "Sending... ⏳";

        const data = {
            name: document.getElementById("name").value,
            email: document.getElementById("email").value,
            message: document.getElementById("message").value
        };

        fetch("http://localhost:5000/contact", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify(data)
        })
            .then(response => response.json())
            .then(result => {
                if (result.success) {
                    document.getElementById("status").innerText = "Message sent successfully 🚀";
                    this.reset();
                } else {
                    throw new Error("Server error");
                }
            })
            .catch((err) => {
                console.log(err);
                document.getElementById("status").className = "text-center font-medium mt-3 text-red-400";
                document.getElementById("status").innerText = "Failed to send ❌";
            });
    });
}

// ===== STUDENT LOGIN =====
let generatedOTP = "";
let otpTimer = 60;
let otpInterval = null;

function renderStudentLogin() {
    document.getElementById('app-container').innerHTML = `
                <div class="max-w-lg mx-auto animate-fade-in space-y-6">

        <div class="text-center">
            <h1 class="text-4xl font-bold font-outfit bg-gradient-to-r from-cyan-400 to-purple-500 bg-clip-text text-transparent">
                Student Portal
            </h1>
            <p class="text-gray-400 mt-2">Login with Email & OTP</p>
        </div>

        <!--EMAIL STEP-->
        <div class="glass-card p-6 rounded-2xl space-y-5" id="login-step-1">
            <div>
                <label class="text-sm text-gray-400">Email Address</label>
                <input id="email" type="email" placeholder="example@email.com" class="input-field">
            </div>
            <button id="sendOtpBtn" onclick="handleSendOTP()" type="button" class="btn-primary w-full py-3 rounded-xl font-semibold">
                SEND ACCESS KEY
            </button>
        </div>

        <!--OTP STEP-->
                <div class="glass-card p-6 rounded-2xl space-y-5 hidden" id="login-step-2">
                    <div>
                        <label class="text-sm text-gray-400">Enter 6-Digit OTP</label>
                        <input id="otp" type="text" placeholder="------" class="input-field text-center font-mono tracking-widest text-lg relative z-50" maxlength="6">
                    </div>
                    <button id="verifyOtpBtn" onclick="handleVerifyOTP()" type="button" class="btn-primary w-full py-3 rounded-xl font-semibold">
                        VERIFY OTP
                    </button>
                </div>

    </div>
                `;
}

// 🔥 SEND OTP
async function handleSendOTP() {
    const emailInput = document.getElementById("email").value;

    if (!emailInput) {
        alert("Enter email ❌");
        return;
    }

    // generate OTP
    generatedOTP = Math.floor(100000 + Math.random() * 900000).toString();

    console.log("OTP Generated:", generatedOTP); // for test

    try {
        await emailjs.send(
            OTP_SERVICE_ID,
            OTP_TEMPLATE_ID,
            {
                to_email: emailInput,
                otp: generatedOTP
            }
        );
        alert("OTP Sent ✅");

        // Swap UI
        document.getElementById("login-step-1").classList.add("hidden");
        document.getElementById("login-step-2").classList.remove("hidden");

        startTimer();
    } catch (e) {
        console.error("OTP send failed:", e);
        alert("Failed to send OTP ❌ (Debug OTP: " + generatedOTP + ")");
        // Allow user to proceed for testing if needed
        document.getElementById("login-step-1").classList.add("hidden");
        document.getElementById("login-step-2").classList.remove("hidden");
        startTimer();
    }
}

// ⏳ TIMER
function startTimer() {
    otpTimer = 60;
    const btn = document.getElementById("verifyOtpBtn");

    if (otpInterval) clearInterval(otpInterval);

    otpInterval = setInterval(() => {
        otpTimer--;

        btn.innerHTML = `VERIFY OTP(${otpTimer}s)`;

        if (otpTimer <= 0) {
            clearInterval(otpInterval);
            btn.innerHTML = "VERIFY OTP";
        }
    }, 1000);
}

// 🔐 VERIFY OTP
function handleVerifyOTP() {
    const entered = document.getElementById("otp").value;

    if (entered === generatedOTP) {
        alert("Login Success 🔥");

        // save session (also storing in studentLoggedIn to keep your SPA router working flawlessly)
        localStorage.setItem("user", document.getElementById("email").value);
        localStorage.setItem("studentLoggedIn", document.getElementById("email").value);

        // redirect using your SPA router instead of hard reload (window.location.href = "seat.html";)
        navigateTo("home");
    } else {
        alert("Invalid OTP ❌");
    }
}

// ===== PASS =====
function renderPass(user) {
    if (!localStorage.getItem("paid")) {
        alert("Unauthorized access (Payment Required) ❌");
        navigateTo("home");
        return;
    }

    document.getElementById('app-container').innerHTML = `
                <div id="pass" class="ticket p-6 text-white max-w-md mx-auto glass-card rounded-2xl animate-fade-in mt-10">

        <div class="flex gap-6 items-center">
            <div id="qr" class="bg-white p-2 rounded-lg"></div>

            <div>
                <h2 class="text-2xl font-bold">${user.name || "Guest"}</h2>
                <p class="text-gray-300 mt-1">${user.branch || "N/A"} - ${user.year || "N/A"}</p>
                <p class="font-mono text-cyan-400">${user.pin || "0000"}</p>
                ${user.seat ? `<p class="mt-2 text-lg font-bold text-pink-400">Seat: ${user.seat}</p>` : ''}
            </div>
        </div>

        <!-- 🔥 ELITE EXPERIENCE CHAOS BUTTON-- >
                <button onclick="enterChaos()" class="mt-6 px-6 py-3 w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:scale-105 transition-transform text-white rounded-xl font-bold uppercase tracking-wider shadow-[0_0_15px_rgba(188,19,254,0.4)]">
                    ENTER CHAOS MODE 🔥
                </button>

    </div>
                `;

    new QRCode(document.getElementById("qr"), {
        text: JSON.stringify({ pin: user.pin }),
        width: 120,
        height: 120
    });
}

// ===== VERIFY =====
function renderVerify() {
    document.getElementById('app-container').innerHTML = `
                <div class="max-w-md mx-auto text-center space-y-6">
        <h2 class="text-3xl font-bold text-pink-400">Scanner Engine</h2>
        <div id="reader" class="mx-auto rounded-lg overflow-hidden border-2 border-pink-400/50 bg-black" style="width:300px; padding: 10px;"></div>
        <div id="result" class="text-xl font-bold mt-4 h-10"></div>
    </div>
                `;

    setTimeout(() => {
        const scanner = new Html5QrcodeScanner("reader", { fps: 10, qrbox: 250 });
        scanner.render(onScanSuccess);
    }, 500);
}

function onScanSuccess(decodedText) {
    try {
        const data = JSON.parse(decodedText);
        validateScan(data.pin);
    } catch (e) {
        const resObj = document.getElementById("result");
        resObj.innerText = "INVALID FORMAT ❌";
        resObj.className = "text-xl font-bold mt-4 h-10 text-red-500";
    }
}

function validateScan(pin) {
    let users = JSON.parse(localStorage.getItem('feedx_users')) || [];
    let user = users.find(u => u.pin === pin);

    const resObj = document.getElementById("result");

    if (!user) {
        resObj.innerText = "DENIED (NOT FOUND) ❌";
        resObj.className = "text-xl font-bold mt-4 h-10 text-red-500";
        return;
    }

    if (user.status !== "approved") {
        resObj.innerText = "NOT APPROVED YET ⚠️";
        resObj.className = "text-xl font-bold mt-4 h-10 text-yellow-400";
        return;
    }

    if (user.used) {
        resObj.innerText = "ALREADY USED ❌";
        resObj.className = "text-xl font-bold mt-4 h-10 text-red-500";
        return;
    }

    if (user.expiresAt && Date.now() > user.expiresAt) {
        resObj.innerText = "PASS EXPIRED ❌";
        resObj.className = "text-xl font-bold mt-4 h-10 text-red-500";
        return;
    }

    user.used = true;
    user.checkedIn = true;
    localStorage.setItem('feedx_users', JSON.stringify(users));

    resObj.innerText = "VALID ENTRY ✅";
    resObj.className = "text-xl font-bold mt-4 h-10 text-green-400 animate-pulse";
}