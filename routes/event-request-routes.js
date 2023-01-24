const passport = require("passport");
const settings = require("../passport-config/settings");
require("../passport-config/passport")(passport);
const EventRequest = require("../models/EventRequest.model");

module.exports = function (app) {
  app.get(
    "/api/event_requests",
    passport.authenticate("user", { session: false }),
    (req, res) => {
      const { user } = req;
      if (user) {
        EventRequest.find(
          { $or: [{ senderID: user._id }, { recipientID: user._id }] },
          function (err, eventRequests) {
            if (err) {
              res.sendStatus(500);
            } else if (eventRequests) {
              res.json(eventRequests);
            } else {
              res.json([]);
            }
          }
        );
      } else {
        res.sendStatus(401);
      }
    }
  );

  app.put(
    "/eventrequests/update",
    passport.authenticate("user", { session: false }),
    (req, res) => {
      const { user } = req;
      const { eventRequestID, fieldValuePairs } = req.body;
      if (!fieldValuePairs || fieldValuePairs.length === 0) {
        return res.sendStatus(400);
      }
      if (user && eventRequestID) {
        EventRequest.findOne(
          {
            $and: [
              { _id: eventRequestID },
              { $or: [{ senderID: user._id }, { recipientID: user._id }] },
            ],
          },
          function (err, eventRequest) {
            if (err || !eventRequest) {
              res.sendStatus(500);
            } else {
              //check if the user has blocked or been blocked by the other user
              const otherPartyID =
                eventRequest.senderID === user._id.toString()
                  ? eventRequest.recipientID
                  : eventRequest.senderID;
              if (
                user.blockedUsers.includes(otherPartyID) ||
                user.blockedByUsers.includes(otherPartyID)
              )
                return res.sendStatus(401);
              const filteredFVPairs = fieldValuePairs.filter((fV) => {
                const { field } = fV;
                return (
                  field === "declined" ||
                  field === "offers" ||
                  field === "acceptedOffer" ||
                  field === "readBySender" ||
                  field === "readByRecipient"
                );
              });
              //make sure there are still fields to update after filtering
              if (filteredFVPairs.length > 0) {
                //then iterate through each pair, setting the field to the value
                filteredFVPairs.forEach((fVPair) => {
                  let { field, value } = fVPair;
                  if (field === "offers" || field === "acceptedOffer") {
                    value = JSON.parse(value);
                  }
                  if (field === "offers") {
                    eventRequest.offers = [...eventRequest.offers, value];
                  } else {
                    eventRequest[field] = value;
                  }
                });
                eventRequest
                  .save()
                  .then((updatedEventRequest) => {
                    res.json(updatedEventRequest);
                  })
                  .catch((e) => {
                    console.log(e);
                    res.sendStatus(500);
                  });
              } else {
                res.sendStatus(401);
              }
            }
          }
        );
      } else {
        res.sendStatus(401);
      }
    }
  );

  app.post(
    "/eventrequests/new",
    passport.authenticate("user", { session: false }),
    (req, res) => {
      const { user } = req;
      const sender = user._id;
      const {
        recipient,
        startTime,
        endTime,
        title,
        description,
        isOnline,
        venueName,
        streetAddressLine1,
        streetAddressLine2,
        city,
        stateOrProvince,
        postalCode,
        country,
        payrateOffer,
        message,
      } = req.body;
      //make sure the user hasn't blocked or been blocked by the other user
      if (
        user.blockedUsers.includes(recipient) ||
        user.blockedByUsers.includes(recipient)
      )
        return res.sendStatus(401);
      const newEventRequest = new EventRequest({
        senderID: sender,
        recipientID: recipient,
        sender,
        recipient,
        title,
        description,
        isOnline,
        venueName,
        streetAddressLine1,
        streetAddressLine2,
        city,
        stateOrProvince,
        postalCode,
        country,
        offers: [
          {
            pay: payrateOffer,
            startTime,
            endTime,
            message,
            senderID: sender,
            recipientID: recipient,
          },
        ],
      });

      newEventRequest.save(function (err, eventRequest) {
        if (err) {
          res.sendStatus(500);
        } else if (eventRequest) {
          res.json(eventRequest);
        } else {
          res.sendStatus(500);
        }
      });
    }
  );
};
