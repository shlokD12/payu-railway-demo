import express from "express";
import crypto from "crypto";
import rateLimit from "express-rate-limit";

const app = express();

/* =======================
   BASIC MIDDLEWARE
======================= */

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

/* =======================
   CORS (FIX)
======================= */

app.use((req, res, next) => {
  res.setHeader(
    "Access-Control-Allow-Origin",
    "https://www.bkcashmanagement.com"
  );
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    return res.sendStatus(200);
  }
  next();
});

/* =======================
   RATE LIMIT (ANTI-SPAM)
======================= */

const payLimiter = rateLimit({
  windowMs: 5 * 60 * 1000, // 5 minutes
  max: 10, // max 10 payment attempts per IP
  message: "Too many attempts. Please wait and retry.",
});

/* =======================
   CONFIG
======================= */

const PAYU_KEY = process.env.PAYU_KEY;
const PAYU_SALT = process.env.PAYU_SALT;
const PAYU_URL = "https://secure.payu.in/_payment"; // LIVE
const SESSION_TTL = 5 * 60 * 1000; // 5 minutes

const sessions = new Map();

/* =======================
   PAY ROUTE
======================= */

app.post("/pay", payLimiter, (req, res) => {
  const { amount, firstname, email, orderId, returnUrl } = req.body;

  if (!amount || !firstname || !email || !orderId || !returnUrl) {
    return res.status(400).send("Missing required parameters");
  }

  const now = Date.now();
  const expiresAt = now + SESSION_TTL;

  sessions.set(orderId, { expiresAt });

  const productinfo = "Course Purchase";
  const txnid = orderId;

  const hashString = `${PAYU_KEY}|${txnid}|${amount}|${productinfo}|${firstname}|${email}|||||||||||${PAYU_SALT}`;
  const hash = crypto.createHash("sha512").update(hashString).digest("hex");

  res.send(`
<!DOCTYPE html>
<html>
<head>
  <title>Redirecting to PayU</title>
</head>
<body>
  <form id="payuForm" method="post" action="${PAYU_URL}">
    <input type="hidden" name="key" value="${PAYU_KEY}" />
    <input type="hidden" name="txnid" value="${txnid}" />
    <input type="hidden" name="amount" value="${amount}" />
    <input type="hidden" name="productinfo" value="${productinfo}" />
    <input type="hidden" name="firstname" value="${firstname}" />
    <input type="hidden" name="email" value="${email}" />
    <input type="hidden" name="phone" value="9999999999" />
    <input type="hidden" name="surl" value="${returnUrl}?status=success" />
    <input type="hidden" name="furl" value="${returnUrl}?status=failed" />
    <input type="hidden" name="hash" value="${hash}" />
  </form>

  <script>
    document.getElementById("payuForm").submit();
  </script>
</body>
</html>
`);
});

/* =======================
   PORT
======================= */

const PORT = process.env.PORT || 8080;
app.listen(PORT, () => {
  console.log("PayU server running on port", PORT);
});
