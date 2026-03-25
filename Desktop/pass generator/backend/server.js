const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const cors = require("cors");
const Razorpay = require("razorpay");

const app = express();
app.use(cors());
app.use(express.json());

const razorpay = new Razorpay({
    key_id: "rzp_live_SUK1QREk8B67CK",
    key_secret: "rcT0ZAKHW2kuC5SJPMXLXy4Y"
});

const server = http.createServer(app);

const io = new Server(server, {
    cors: {
        origin: "*",
        methods: ["GET", "POST"]
    }
});

// =======================
// 🔥 MONGO DB & SEAT MODEL
// =======================
const mongoose = require("mongoose");
const Seat = require("./models/Seat");

mongoose.connect("mongodb://127.0.0.1:27017/feedx")
.then(() => console.log("MongoDB Connected 🔥"))
.catch(err => console.log("Mongo Error:", err));
// =======================
// 🔌 SOCKET CONNECTION
// =======================
io.on("connection", (socket) => {

    console.log("User connected:", socket.id);

    // 📤 SEND CURRENT SEAT STATE TO NEW USER
    Seat.find().then(seatsData => {
        let seatsObj = {};
        seatsData.forEach(s => seatsObj[s.seatId] = s);
        socket.emit("initSeats", seatsObj);
    });

    // 🔒 BULLETPROOF SEAT LOCK (NO RACE CONDITIONS)
    socket.on("lockSeat", async ({ seatId }) => {
        const seat = await Seat.findOne({ seatId });

        if (seat && seat.status === "sold") {
            socket.emit("seatTaken", seatId);
            return;
        }

        if (seat && seat.status === "locked" && seat.expiry > Date.now()) {
            socket.emit("seatTaken", seatId);
            return;
        }

        await Seat.findOneAndUpdate(
            { seatId },
            {
                seatId,
                status: "locked",
                userId: socket.id,
                expiry: Date.now() + 300000 // 5 min
            },
            { upsert: true }
        );

        console.log(`Seat locked: ${seatId}`);
        io.emit("seatLocked", seatId);
    });

    // 🔓 UNLOCK MANUALLY (optional)
    socket.on("unlockSeat", async (seatId) => {
        await Seat.deleteOne({ seatId });
        io.emit("seatUnlocked", seatId);
    });

    // ❌ DISCONNECT (optional handling)
    socket.on("disconnect", async () => {
        console.log("User disconnected:", socket.id);

        // OPTIONAL: release seats of this user
        const userSeats = await Seat.find({ userId: socket.id, status: "locked" });
        if (userSeats.length > 0) {
            await Seat.updateMany(
                { userId: socket.id, status: "locked" },
                { status: "available", userId: null }
            );
            userSeats.forEach(s => io.emit("seatUnlocked", s.seatId));
        }
    });

});

// =======================
// ⏳ AUTO UNLOCK (SERVER CONTROL)
// =======================
setInterval(async () => {
    const expiredSeats = await Seat.find({ status: "locked", expiry: { $lt: Date.now() } });
    if (expiredSeats.length > 0) {
        await Seat.updateMany(
            { status: "locked", expiry: { $lt: Date.now() } },
            { status: "available", userId: null }
        );
        // Sync refreshed state
        expiredSeats.forEach(s => io.emit("seatUnlocked", s.seatId));
        io.emit("refreshSeats");
    }
}, 5000);

// =======================
// 💳 RAZORPAY GATEWAY
// =======================
app.get("/create-order", (req, res) => {
    res.send("Use POST request bro 😅");
});

app.post("/create-order", async (req, res) => {
    try {
        const options = {
            amount: 4000, // ₹40
            currency: "INR",
            receipt: "receipt_" + Date.now()
        };

        const order = await razorpay.orders.create(options);
        res.json(order);

    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Order failed" });
    }
});

app.post("/verify-payment", async (req, res) => {

    const crypto = require("crypto");

    const {
        razorpay_order_id,
        razorpay_payment_id,
        razorpay_signature,
        seat
    } = req.body;

    const body = razorpay_order_id + "|" + razorpay_payment_id;

    const expectedSignature = crypto
        .createHmac("sha256", "rcT0ZAKHW2kuC5SJPMXLXy4Y")
        .update(body.toString())
        .digest("hex");

    if (expectedSignature !== razorpay_signature) {
        return res.status(400).json({ success: false });
    }

    const seatData = await Seat.findOne({ seatId: seat });

    if (!seatData || seatData.status !== "locked") {
        return res.status(400).json({ success: false });
    }

    await Seat.updateOne(
        { seatId: seat },
        {
            status: "sold",
            paymentId: razorpay_payment_id
        }
    );

    console.log(`Seat SOLD: ${seat}`);

    io.emit("seatSold", seat);

    res.json({ success: true });
});




// =======================
// 🧱 API TO FETCH ALL SEATS
// =======================
app.get("/get-seats", async (req, res) => {
    const seats = await Seat.find();
    res.json(seats);
});

// =======================
// 📊 API TO FETCH DASHBOARD STATS
// =======================
app.get("/get-dashboard", async (req, res) => {
    try {
        const totalSeats = 280; // 7 rows × 40 seats (adjust if needed)
        const soldSeats = await Seat.countDocuments({ status: "sold" });
        const revenue = soldSeats * 40;

        res.json({
            totalSeats,
            soldSeats,
            revenue
        });
    } catch (err) {
        res.status(500).json({ error: "Failed to fetch dashboard stats" });
    }
});

// =======================
// 🏠 ROOT ROUTE
// =======================
app.get("/", (req, res) => {
    res.send("Backend running 🔥");
});

// =======================
// 🚀 START SERVER
// =======================
const PORT = 5000;

server.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT} 🔥`);
});
