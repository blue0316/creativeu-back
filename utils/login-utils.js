const isAlreadyLoggedIn = (req, res, next) => {
  if (req.user) {
    return res.status(400).send("A user has already been authenticated.");
  } else return next();
};

module.exports.isAlreadyLoggedIn = isAlreadyLoggedIn;
