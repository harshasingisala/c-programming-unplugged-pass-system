const mongoose = require("mongoose");

const seatSchema = new mongoose.Schema({
    seatId: String,
    status: {
        type: String,
        enum: ["available", "locked", "sold"],
        default: "available"
    },
    userId: String,
    paymentId: String,
    expiry: Number
});

module.exports = mongoose.model("Seat", seatSchema);
