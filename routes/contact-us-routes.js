const { sendContactUsEmail } = require("../utils/send-email");

module.exports = function (app) {
  app.post("/contact-us", async (req, res) => {
    const { name, email, message } = req.body;
    if (!name || !email || !message)
      return res
        .status(400)
        .send("Please pass your name, email, and a message.");
    else {
      try {
        await sendContactUsEmail(name, email, message);
        return res.sendStatus(200);
      } catch (e) {
        return res.sendStatus(500);
      }
    }
  });
};
