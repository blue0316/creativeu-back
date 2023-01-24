const Event = require("../models/Event.model");
const User = require("../models/User.model");
const passport = require("passport");
const settings = require("../passport-config/settings");
require("../passport-config/passport")(passport);
const { uploadFile } = require("../utils/file-upload");
const { scanFile } = require("../utils/scanFiles");

module.exports = function (app) {
  //create an event
  app.post(
    "/new_event",
    passport.authenticate("user", { session: false }),
    (req, res) => {
      if (req.user) {
        User.findOne(
          //finding the user may not be necessary. req.user should already have ._id, but at the same time, looking up the user with their secretID does add a level of security.
          { email: req.user.email, secretID: req.user.secretID },
          async (err, user) => {
            if (err) return next(err);
            else {
              //first, upload the file
              const eventData = JSON.parse(req.body.eventData);
              //only upload the file if it exists
              let photoUrl = "";
              if (req.files && req.files["file"]) {
                const fileContents = req.files["file"].data;
                try {
                  const scan = await scanFile(fileContents);
                  //scan will throw an error if it failed to run or a virus was found
                  try {
                    const filePath = `${user._id}/events/${req.body.eventData._id}/images/${req.files["file"].name}`;
                    const url = await uploadFile(filePath, fileContents);
                    photoUrl = url;
                  } catch (e) {
                    console.log(e);
                  }
                } catch (scanErr) {
                  if (scanErr.results.isInfected) {
                    res.status(400).send("WARNING! Infected file detected.");
                  } else {
                    res
                      .status(500)
                      .send("There was a problem scanning the file.");
                  }
                }
              }
              const newEvent = new Event({
                ...eventData,
                ownerName: user.displayName,
                ownerID: user._id,
                expirationDate: user.expirationDate,
                photoUrl,
              });
              newEvent.save(function (err, event) {
                if (err) {
                  console.log(err);
                  return res.sendStatus(500);
                } else {
                  return res.json(event);
                }
              });
            }
          }
        );
      } else {
        res
          .status(401)
          .send({ success: false, message: "Access token missing." });
      }
    }
  );

  //get all of one user's events
  app.get("/user_events/:uid", async (req, res) => {
    //first find the user and get their profileUrl
    try {
      const user = await User.findOne({ _id: req.params.uid });
      if (user) {
        Event.find({ ownerID: req.params.uid }, function (err, events) {
          if (err) {
            console.log(err);
            return res.sendStatus(500);
          } else {
            let eventsToReturn = events.map((event) => {
              return { ...event._doc, ownerProfileUrl: user.profileUrl };
            });
            res.json(eventsToReturn);
          }
        });
      } else {
        return res.sendStatus(400);
      }
    } catch (e) {
      return res.sendStatus(400);
    }
  });

  //find one event
  app.get("/find_event/:id", (req, res) => {
    Event.findById(req.params.id, async function (err, event) {
      if (err) {
        console.log(err);
        res.sendStatus(500);
      } else {
        try {
          //find the user so the user's profile url can be returned
          const user = await User.findOne({ _id: event.ownerID });
          if (user) {
            const eventToReturn = {
              ...event._doc,
              ownerProfileUrl: user.profileUrl,
            };
            res.json(eventToReturn);
          } else {
            res.json(event);
          }
        } catch (e) {
          res.sendStatus(500);
        }
      }
    });
  });

  //update an event
  app.put(
    "/update_event",
    passport.authenticate("user", { session: false }),
    (req, res) => {
      if (req.user) {
        User.findOne(
          { email: req.user.email, secretID: req.user.secretID },
          function (err, user) {
            if (err) return next(err);
            else {
              const { eventID, updatedEventObj } = req.body;
              //ensure that the user is the owner of the event
              Event.findOneAndUpdate(
                { _id: eventID, ownerID: user._id },
                updatedEventObj,
                { returnDocument: "after" },
                function (err, event) {
                  if (err) {
                    console.log(err);
                    return res.sendStatus(500);
                  } else {
                    return res.json(event);
                  }
                }
              );
            }
          }
        );
      } else {
        res
          .status(401)
          .send({ success: false, message: "Access token missing." });
      }
    }
  );

  //delete an event
  app.delete(
    "/delete_event",
    passport.authenticate("user", { session: false }),
    (req, res) => {
      if (req.user) {
        const ownerID = req.user._id.toString();
        //make sure the user is the owner of the event
        Event.findOneAndDelete(
          { _id: req.body.eventID, ownerID: ownerID },
          function (err, docs) {
            if (err) return res.sendStatus(500);
            else return res.sendStatus(200);
          }
        );
      } else {
        return res
          .status(401)
          .send({ success: false, message: "Access token missing." });
      }
    }
  );
};
