import express from "express";
import crypto from "crypto";
import rateLimit from "express-rate-limit";

const app = express();

/**
 * REQUIRED for Railway / cloud proxies
 * Without this, rate limiting WILL NOT work
 */
app.set("trust proxy", 1);

app.use(express.urlencoded({ extended: true }));

/**
 * Rate limit ONLY the /pay endpoint
 * 5 requests per minute per IP
 */
const payLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    res
      .status(429)
      .send("Too many payment attempts. Please wait 1 minute and try again.");
  }
});

/**
 * Helper: check if timestamp is older than 5 minutes
 */
function isExpired(timestamp) {
  const FIVE_MINUTES = 5 * 60 * 1000;
  return Date.now() - Number(timestamp) > FIVE_MINUTES;
}

/**
 * PAYU PAYMENT ENDPOINT
 */
app.get("/pay", payLimiter, (req, res) => {
  let { amount, firstname, email, ts } = req.query;

  // 1️⃣ Basic validation
  if (!amount || !firstname || !email || !ts) {
    return res.status(400).send("Missing required parameters");
  }

  // 2️⃣ Enforce 5-minute transaction validity
  if (isExpired(ts)) {
    return res
      .status(410)
      .send("This payment session has expired. Please restart checkout.");
  }

  // 3️⃣ Validate & normalize amount
  amount = Number(amount);
  if (isNaN(amount) || amount <= 0) {
    return res.status(400).send("Invalid amount");
  }
  amount = amount.toFixed(2);

  // 4️⃣ Prepare PayU values
  const txnid = "TXN" + Date.now();
  const productinfo = "DemoFinancialCourse"; // NO SPACES (PayU-safe)
  const phone = "9999999999";

  const surl = "https://www.bkcashmanagement.com/payment-success";
  const furl = "https://www.bkcashmanagement.com/payment-failed";

  /**
   * PayU HASH FORMAT (STRICT)
   * key|txnid|amount|productinfo|firstname|email|udf1|udf2|udf3|udf4|udf5||||||SALT
   * -> EXACTLY 11 pipes after email
   */
  const hashString =
    `${process.env.PAYU_KEY}|${txnid}|${amount}|${productinfo}|${firstname}|${email}` +
    `|||||||||||${process.env.PAYU_SALT}`;

  const hash = crypto
    .createHash("sha512")
    .update(hashString)
    .digest("hex");

  // 5️⃣ Auto-submit PayU payment form (LIVE)
  res.send(`
    <html>
      <body onload="document.forms[0].submit()">
        <form method="post" action="https://secure.payu.in/_payment">
          <input type="hidden" name="key" value="${process.env.PAYU_KEY}" />
          <input type="hidden" name="txnid" value="${txnid}" />
          <input type="hidden" name="amount" value="${amount}" />
          <input type="hidden" name="productinfo" value="${productinfo}" />
          <input type="hidden" name="firstname" value="${firstname}" />
          <input type="hidden" name="email" value="${email}" />
          <input type="hidden" name="phone" value="${phone}" />
          <input type="hidden" name="surl" value="${surl}" />
          <input type="hidden" name="furl" value="${furl}" />
          <input type="hidden" name="hash" value="${hash}" />
        </form>
      </body>
    </html>
  `);
});

/**
 * Server start
 */
app.listen(process.env.PORT || 3000, () => {
  console.log("PayU Railway server running with rate limit + expiry");
});
