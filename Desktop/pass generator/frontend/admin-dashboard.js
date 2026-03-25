// 🔒 PROTECTION
if (localStorage.getItem("adminLoggedIn") !== "true") {
    alert("Access Denied ❌");
    window.location.href = "admin.html";
}

// LOAD
document.addEventListener("DOMContentLoaded", loadTable);

function loadTable() {
    const users = JSON.parse(localStorage.getItem('feedx_users')) || [];

    const rows = users.map(u => `
    <tr>
        <td>${u.name}</td>
        <td>${u.pin}</td>
        <td>${u.txn}</td>

        <td>
            ${u.status === "pending"
            ? "Pending ⏳"
            : "Approved ✅"}
        </td>

        <td>
            ${u.status === "pending"
            ? `<button onclick="approve('${u.pin}')" class="bg-green-600 px-2 py-1 rounded">Approve</button>`
            : "✔"}
        </td>

        <td>
            ${u.checkedIn ? "Entered" : "Not Entered"}
        </td>
    </tr>
    `).join('');

    document.getElementById("tableBody").innerHTML = rows;
}

function approve(pin) {
    let users = JSON.parse(localStorage.getItem('feedx_users'));
    let user = users.find(u => u.pin === pin);

    if (!user) return;

    user.status = "approved";
    user.expiresAt = Date.now() + (24 * 60 * 60 * 1000); // 24 Hour Expiration Limit Tracking

    localStorage.setItem('feedx_users', JSON.stringify(users));

    // 🔥 AUTO EMAIL HERE
    sendPassEmail(user); // 🔥 THIS LINE MUST EXIST

    alert("User Approved & Email Sent ✅");

    loadTable();
}

function sendPassEmail(user) {

    const passLink = `${window.location.origin}/index.html?view=pass&pin=${user.pin}`;

    emailjs.send("service_71voqhh", "template_b36gc68", {
        to_name: user.name,
        to_email: user.email,
        user_pin: user.pin,
        pass_link: passLink
    })
    .then(() => {
        console.log("Pass email sent ✅");
        alert("Pass sent to user email 🎟️");
    })
    .catch((err) => {
        console.error(err);
        alert("Email failed ❌");

        // 🔥 fallback (important)
        alert("Pass Link: " + passLink);
    });
}

function logout() {
    localStorage.removeItem("adminLoggedIn");
    window.location.href = "admin.html";
}

async function testOrder() {
    const res = await fetch("http://localhost:5000/create-order", {
        method: "POST"
    });

    const data = await res.json();
    console.log(data);
}
