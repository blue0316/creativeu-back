const User = require("../models/User.model");
const MessageThread = require("../models/MessageThread.model");
const EventRequest = require("../models/EventRequest.model");
const SalesRecord = require("../models/SalesRecord.model");
const passport = require("passport");
const settings = require("../passport-config/settings");
require("../passport-config/passport")(passport);
const jwt = require("jsonwebtoken");
const { uploadFile } = require("../utils/file-upload");
const { deleteFile } = require("../utils/file-delete");
const { isActive } = require("../utils/account-activation-status");
const { scanFile } = require("../utils/scanFiles");
const { createEmptySalesRecord } = require("../utils/sales-records");
const { DateTime } = require("luxon");

module.exports = function (app, stripe) {
  //upload a pic and then update the user object with the url
  app.post(
    "/api/files/upload",
    passport.authenticate("user", { session: false }),
    (req, res) => {
      if (req.user) {
        console.log('abcdefg' ,req);
        User.findOne(
          { email: req.user.email, secretID: req.user.secretID },
          async function (err, user) {
            if (err) return next(err);
            else {
              const { filename, field } = req.body; //filename is the full key for the object, file is the actual object and field is the user field to update with the url
              const fileContent = req.files.file.data;
              try {
                const scan = await scanFile(fileContent);
                //if the scan doesn't throw an error, the file can be uploaded
                uploadFile(filename, fileContent)
                  .then((url) => {
                    user[field] = url;
                    //update the user's lastUpdatedField
                    user.lastUpdatedAt = Date.now();
                    user
                      .save()
                      .then(async (updatedUser) => {
                        const userObj = await constructUserObjToSend(
                          updatedUser
                        );
                        res.json(userObj);
                      })
                      .catch((e) => {
                        console.log(e);
                        res.status(500).send({
                          success: false,
                          message:
                            "There was a problem saving to the database.",
                        });
                      });
                  })
                  .catch((e) => {
                    console.log(e);
                    res
                      .status(500)
                      .send("There was a problem uploading the file");
                  });
              } catch (scanErr) {
                //send different error code depending on result of scan
                if (scanErr.results.isInfected) {
                  res.status(400).send("WARNING! Infected file detected.");
                } else {
                  res
                    .status(500)
                    .send("There was a problem scanning the file.");
                }
              }
            }
          }
        );
      }
    }
  );

  app.post(
    "/api/media/upload",
    passport.authenticate("user", { session: false }),
    (req, res) => {
      console.log('amediaupload' ,req);
      if (req.user) {
        User.findOne(
          { email: req.user.email, secretID: req.user.secretID },
          async function (err, user) {
            if (err) return next(err);
            else {
              const { filename, mediaType, title, fileType } = req.body; //filename is the full key for the object, file is the actual object and field is the user field to update with the url
              const fileContent = req.files.file.data;
              try {
                const scan = await scanFile(fileContent);
                //scan file will throw an err if the scan run or if a virus was detected
                uploadFile(filename, fileContent)
                  .then((url) => {
                    if (mediaType === "visual") {
                      user.visualMedia = [
                        ...user.visualMedia,
                        { url, title, fileType },
                      ];
                    } else if (mediaType === "audio") {
                      user.audioMedia = [
                        ...user.audioMedia,
                        { url, title, fileType },
                      ]; //add filetype for audio files so the player can handle them
                    }
                    user.lastUpdatedAt = Date.now();
                    user
                      .save()
                      .then(async (updatedUser) => {
                        const userObj = await constructUserObjToSend(
                          updatedUser
                        );
                        res.json(userObj);
                      })
                      .catch((e) => {
                        console.log(e);
                        res.status(500).send({
                          success: false,
                          message:
                            "There was a problem saving to the database.",
                        });
                      });
                  })
                  .catch((e) => {
                    console.log(e);
                    res
                      .status(500)
                      .send("There was a problem uploading the file");
                  });
              } catch (scanErr) {
                //send different error code depending on result of scan
                if (scanErr.results.isInfected) {
                  res.status(400).send("WARNING! Infected file detected.");
                } else {
                  res
                    .status(500)
                    .send("There was a problem scanning the file.");
                }
              }
            }
          }
        );
      }
    }
  );

  app.delete(
    "/api/media/delete",
    passport.authenticate("user", { session: false }),
    (req, res) => {
      if (req.user) {
        User.findOne(
          { email: req.user.email, secretID: req.user.secretID },
          function (err, user) {
            if (err) return next(err);
            else {
              const { url, mediaType } = req.body;
              //make sure the url contains the owner's id
              if (url.includes(user._id)) {
                deleteFile(url)
                  .then(() => {
                    if (mediaType === "visual") {
                      user.visualMedia = user.visualMedia.filter((obj) => {
                        return obj.url !== url;
                      });
                    } else if (mediaType === "audio") {
                      user.audioMedia = user.audioMedia.filter((obj) => {
                        return obj.url !== url;
                      });
                    }
                    user.lastUpdatedAt = Date.now();
                    user
                      .save()
                      .then(async (updatedUser) => {
                        const userObj = await constructUserObjToSend(
                          updatedUser
                        );
                        res.json(userObj);
                      })
                      .catch((e) => {
                        console.log(e);
                        res.status(500).send({
                          success: false,
                          message:
                            "There was a problem saving to the database.",
                        });
                      });
                  })
                  .catch(() => {
                    res.status(500).send({
                      success: false,
                      message: "There was a problem deleting the file.",
                    });
                  });
              } else {
                res.sendStatus(401);
              }
            }
          }
        );
      }
    }
  );
};

function constructUserObjToSend(user, stripe) {
  return new Promise(async (resolve, _) => {
    const accountActive = isActive(user);
    // let notifications = [];
    let eventRequests = [];
    let messageThreads = [];
    //if the user's account is active, get the user's messages and eventRequests
    if (accountActive) {
      try {
        const m = await MessageThread.find({
          $and: [
            { participants: { $in: [user._id] } },
            //filter out threads from suspended users
            { archived: false },
          ],
        });
        messageThreads = m;
      } catch (e) {
        console.log(e);
      }
      try {
        const evr = await EventRequest.find({
          $and: [
            { $or: [{ senderID: user._id }, { recipientID: user._id }] },
            //filter out threads from suspended users
            { archived: false },
          ],
        });
        eventRequests = evr;
      } catch (e) {
        console.log(e);
      }
    }
    //create a user obj to send
    let userObjToSend = {
      ...user._doc,
      accountActive,
      // notifications,
      messageThreads,
      eventRequests,
    };
    //if the user is an account executive, try to find a SalesRecord from this year
    if (user.isAccountExec) {
      let salesRecord;
      try {
        const thisYear = DateTime.now().toObject().year;
        const sR = await SalesRecord.findOne({
          ownerID: user._id,
          year: thisYear,
        });
        //if a salesRecord exists, it will be added to the userObj. Otherwise, an empty salesRecord object will be generated
        if (sR) salesRecord = sR;
        else salesRecord = createEmptySalesRecord(thisYear);
      } catch (e) {
        salesRecord = createEmptySalesRecord(thisYear);
      } finally {
        userObjToSend.salesRecord = salesRecord;
      }
    }
    //if the user's account is verified, create and send a stripe link
    if (user.accountVerified) {
      try {
        const loginLink = await stripe.accounts.createLoginLink(
          user.stripeAccountID
        );
        userObjToSend.stripeAccountUrl = loginLink.url;
      } catch (e) {
        console.log(e);
      }
    }
    //delete sensitive fields
    delete userObjToSend.secretID;
    delete userObjToSend.password;
    resolve(userObjToSend);
  });
}
