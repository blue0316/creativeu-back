const MessageThread = require("../models/MessageThread.model");
const passport = require("passport");
const settings = require("../passport-config/settings");
require("../passport-config/passport")(passport);

module.exports = function (app) {
  app.get(
    "/messagethreads",
    passport.authenticate("user", { session: false }),
    async (req, res) => {
      const { user } = req;
      if (!user) res.sendStatus(401);
      else {
        const messageThreads = await MessageThread.find({
          $and: [
            { participants: { $in: [user._id] } },
            //filter out threads from suspended users
            { archived: false },
          ],
        });
        res.json(messageThreads);
      }
    }
  );

  app.post(
    "/new_message_thread",
    passport.authenticate("user", { session: false }),
    (req, res) => {
      const { user } = req;
      if (!req.user) return res.sendStatus(401);
      else {
        const { message, recipientID } = req.body;
        //make sure the user hasn't blocked or been blocked by the other user
        if (
          user.blockedUsers.includes(recipientID) ||
          user.blockedByUsers.includes(recipientID)
        )
          return res.sendStatus(401);
        const newMessageThread = new MessageThread({
          participants: [user._id, recipientID],
          messages: [
            {
              senderID: user._id,
              message,
            },
          ],
        });
        newMessageThread
          .save()
          .then(async () => {
            //now look up all the user's message threads so their messages can be refreshed
            try {
              const m = await MessageThread.find({
                $and: [
                  { participants: { $in: [user._id] } },
                  //filter out threads from suspended users
                  { archived: false },
                ],
              });
              res.json(m);
            } catch (e) {
              res.sendStatus(500);
            }
          })
          .catch((e) => {
            console.log(e);
            res.sendStatus(500);
          });
      }
    }
  );
  app.put(
    "/respond_to_message",
    passport.authenticate("user", { session: false }),
    (req, res) => {
      const { user } = req;
      if (!user) return res.sendStatus(401);
      else {
        const { threadID, newMessage, recipientID } = req.body;
        if (!threadID || !newMessage) return res.sendStatus(400);
        MessageThread.findById(threadID, function (err, thread) {
          if (err) {
            console.log(err);
            res.sendStatus(500);
          } else if (!thread) {
            res.sendStatus(404);
          } else {
            //found the thread! now determine if the user has blocked or been blocked by the other user
            if (
              user.blockedUsers.includes(recipientID) ||
              user.blockedByUsers.includes(recipientID)
            )
              return res.sendStatus(401);
            //now update it with the new message
            const newMessageObj = {
              senderID: user._id,
              message: newMessage,
            };
            thread.messages = [...thread.messages, newMessageObj];
            thread
              .save()
              .then(async () => {
                //now look up all the user's message threads so their messages can be refreshed
                try {
                  const m = await MessageThread.find({
                    $and: [
                      { participants: { $in: [user._id] } },
                      //filter out threads from suspended users
                      { archived: false },
                    ],
                  });
                  res.json(m);
                } catch (e) {
                  res.sendStatus(500);
                }
              })
              .catch((e) => {
                console.log(e);
                return res.sendStatus(500);
              });
          }
        });
      }
    }
  );
  app.put(
    "/set_read_status",
    passport.authenticate("user", { session: false }),
    (req, res) => {
      const { user } = req;
      if (!user) return res.sendStatus(401);
      else {
        const { threadID } = req.body;
        MessageThread.findById(threadID, function (err, thread) {
          if (err) {
            console.log(err);
            res.sendStatus(500);
          } else if (!thread) {
            res.sendStatus(404);
          } else {
            //now set all of the messages to read where the senderID is not the user
            const readMessages = thread.messages.map(({ _doc: m }) => {
              if (m.senderID === user._id.toString()) return m;
              else
                return {
                  ...m,
                  read: true,
                  readAt: Date.now(),
                };
            });
            thread.messages = readMessages;
            thread
              .save()
              .then((t) => {
                return res.json(t);
              })
              .catch((e) => {
                console.log(e);
                return res.sendStatus(500);
              });
          }
        });
      }
    }
  );
};
