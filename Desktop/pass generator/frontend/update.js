const fs = require('fs');
const path = 'c:/Users/harsh/Desktop/pass generator/frontend/app.js';
let content = fs.readFileSync(path, 'utf8');

const regex = /\/\/ ===== SELECT SEAT =====\r?\nfunction selectSeat\(seatId\) \{([\s\S]*?)\r?\nfunction clearSeat/m;

const newSelect = `// ===== SELECT SEAT =====
function selectSeat(seatId) {

    const btn = document.getElementById(\`seat-\${seatId}\`);

    // ❌ already sold
    if (lockedSeats[seatId]?.status === "sold") {
        alert("Seat already sold ❌");
        return;
    }

    // ❌ locked by others
    if (
        lockedSeats[seatId]?.status === "locked" &&
        selectedSeat !== seatId
    ) {
        alert("Seat locked by another user ❌");
        return;
    }

    // 🔁 clear previous selection
    if (selectedSeat && selectedSeat !== seatId) {
        const prev = document.getElementById(\`seat-\${selectedSeat}\`);
        if (prev) prev.classList.remove("seat-selected");

        if (socket) socket.emit("unlockSeat", selectedSeat);
    }

    // ✅ select new seat
    selectedSeat = seatId;
    localStorage.setItem("seat", seatId);

    document.querySelectorAll(".seat").forEach(btn => {
        btn.classList.remove("seat-selected");
    });

    btn.classList.add("seat-selected");

    // 🔒 lock
    if (socket) socket.emit("lockSeat", { seatId });

    // UI update
    document.getElementById("no-seat-text").style.display = "none";

    document.getElementById("selection-chips").innerHTML = \`
        <div class="bg-yellow-500 text-black px-3 py-1 rounded flex justify-between w-full">
            Seat \${seatId}
            <span onclick="clearSeat()" style="cursor:pointer">✖</span>
        </div>
    \`;
}

function clearSeat`;

content = content.replace(regex, newSelect);

fs.writeFileSync(path, content);
console.log("Updated");
