const express = require("express");
const path = require("path");
const crypto = require("crypto");
const Razorpay = require("razorpay");

const app = express();

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const PRODUCTS = {
  apex_pro: {
    name: "Apex Cockpit — Pro",
    amount: 59999
  },
  apex_gt: {
    name: "Apex Cockpit — GT Edition",
    amount: 72999
  },
  ps5_slim: {
    name: "PlayStation 5 Slim",
    amount: 51999
  },
  ps5_setup: {
    name: "PS5 Gaming Setup",
    amount: 59999
  }
};

const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET
});

app.post("/api/create-order", async (req, res) => {
  try {
    const {
      productId,
      name,
      phone,
      email,
      pin,
      city,
      state,
      address
    } = req.body;

    const product = PRODUCTS[productId];

    if (!product) {
      return res.status(400).json({
        error: "Invalid product selected."
      });
    }

    if (!name || !phone || !email || !pin || !city || !state || !address) {
      return res.status(400).json({
        error: "Please fill all delivery details."
      });
    }

    const order = await razorpay.orders.create({
      amount: product.amount * 100,
      currency: "INR",
      receipt: "RR-" + Date.now(),

      notes: {
        productId,
        productName: product.name,
        customerName: name,
        customerEmail: email,
        customerPhone: phone,
        pin,
        city,
        state
      }
    });

    res.json({
      success: true,
      key: process.env.RAZORPAY_KEY_ID,
      orderId: order.id,
      amount: order.amount,
      currency: order.currency,
      productId,
      productName: product.name
    });

  } catch (error) {
    console.error("CREATE ORDER ERROR:", error);

    res.status(500).json({
      error: "Payment order create nahi ho saka."
    });
  }
});

app.post("/api/verify-payment", async (req, res) => {
  try {
    const {
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
      productId
    } = req.body;

    if (
      !razorpay_order_id ||
      !razorpay_payment_id ||
      !razorpay_signature
    ) {
      return res.status(400).json({
        success: false,
        error: "Payment information incomplete."
      });
    }

    const generatedSignature = crypto
      .createHmac(
        "sha256",
        process.env.RAZORPAY_KEY_SECRET
      )
      .update(
        razorpay_order_id + "|" + razorpay_payment_id
      )
      .digest("hex");

    const generatedBuffer =
      Buffer.from(generatedSignature, "utf8");

    const providedBuffer =
      Buffer.from(razorpay_signature, "utf8");

    if (
      generatedBuffer.length !== providedBuffer.length ||
      !crypto.timingSafeEqual(
        generatedBuffer,
        providedBuffer
      )
    ) {
      return res.status(400).json({
        success: false,
        error: "Payment verification failed."
      });
    }

    const product = PRODUCTS[productId];

    if (!product) {
      return res.status(400).json({
        success: false,
        error: "Invalid product."
      });
    }

    console.log("PAYMENT VERIFIED:", {
      orderId: razorpay_order_id,
      paymentId: razorpay_payment_id,
      productId,
      productName: product.name,
      amount: product.amount
    });

    res.json({
      success: true,
      orderId: razorpay_order_id,
      paymentId: razorpay_payment_id,
      productName: product.name
    });

  } catch (error) {
    console.error("VERIFY PAYMENT ERROR:", error);

    res.status(500).json({
      success: false,
      error: "Payment verification error."
    });
  }
});

app.use(
  express.static(
    path.join(__dirname, "public")
  )
);

app.use((req, res) => {
  res.sendFile(
    path.join(
      __dirname,
      "public",
      "index.html"
    )
  );
});

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(
    `RacingRig India running on port ${PORT}`
  );
});
