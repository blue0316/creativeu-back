const { DateTime } = require("luxon");

//determines if the user's subscription is active
const isActive = (user) => {
  //if the user has a lifetime account, always return true
  if (user.expirationDate === "never") return true;
  //otherwise, determine if the current date is before the expiration date
  const dt = DateTime.now();
  const exp_dt = DateTime.fromISO(user.expirationDate);
  let accountActive = false;
  if (exp_dt.isValid) accountActive = dt < exp_dt;
  else accountActive = false;
  return accountActive;
};

const isActiveAccountExec = (accountExec) => {
  //first, make sure the account executive's account is not suspended
  if (accountExec.suspended) return false;
  //check that the accountExec is an accountExec, that their account is verified and that they have a stripeAccountID
  //account executives do not need to have active user accounts to collect funds from referrals
  if (
    accountExec.isAccountExec &&
    accountExec.stripeAccountID &&
    accountExec.accountVerified
  ) {
    return true;
  } else return false;
};

module.exports.isActive = isActive;
module.exports.isActiveAccountExec = isActiveAccountExec;
