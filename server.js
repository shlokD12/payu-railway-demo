import express from "express";
import crypto from "crypto";

const app = express();
app.use(express.urlencoded({ extended: true }));

const PAYU_KEY = process.env.PAYU_KEY;   // VXtKZn
const PAYU_SALT = process.env.PAYU_SALT; // hW2KELagKTIybzGRLdRoIz8HztG1prDT

const PAYU_URL = "https://test.payu.in/_payment";

app.get("/pay", (req, res) => {
  const { amount, firstname, email } = req.query;

  if (!amount || !firstname || !email) {
    return res.status(400).send("Missing parameters");
  }

  const txnid = "TXN" + Date.now();
  const productinfo = "Demo Financial Course";

  const surl = "https://www.bkcashmanagement.com/payment-success";
  const furl = "https://www.bkcashmanagement.com/payment-failed";

  // 🔴 PAYU-CORRECT HASH (11 pipes after email)
  const hashString =
    `${PAYU_KEY}|${txnid}|${amount}|${productinfo}|${firstname}|${email}` +
    `|||||||||||${PAYU_SALT}`;

  const hash = crypto
    .createHash("sha512")
    .update(hashString)
    .digest("hex");

  res.send(`
    <html>
      <body onload="document.forms[0].submit()">
        <form method="post" action="${PAYU_URL}">
          <input type="hidden" name="key" value="${PAYU_KEY}" />
          <input type="hidden" name="txnid" value="${txnid}" />
          <input type="hidden" name="amount" value="${amount}" />
          <input type="hidden" name="productinfo" value="${productinfo}" />
          <input type="hidden" name="firstname" value="${firstname}" />
          <input type="hidden" name="email" value="${email}" />
          <input type="hidden" name="surl" value="${surl}" />
          <input type="hidden" name="furl" value="${furl}" />
          <input type="hidden" name="hash" value="${hash}" />
        </form>
      </body>
    </html>
  `);
});

app.listen(process.env.PORT || 3000, () => {
  console.log("PayU Railway demo server running");
});
