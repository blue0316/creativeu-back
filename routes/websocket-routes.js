module.exports = function (app, clients) {
  app.ws("/connect", (ws, req) => {
    ws.on("message", (msg) => {
      if (msg.includes("initial_connection")) {
        const id = msg.split(" ")[1];
        clients[id] = ws;
        ws.send("successfully connected to websocket");
      } else if (msg.includes("event_request_action")) {
        //if the client made an event request, that user will be pinged and their frontend will get their eventRequests from the server
        const recipientID = msg.split(" ")[1];
        if (clients && clients[recipientID]) {
          clients[recipientID].send("new event request action");
        }
      } else if (msg.includes("new_message")) {
        const recipientID = msg.split(" ")[1];
        if (clients && clients[recipientID]) {
          clients[recipientID].send("new message received");
        }
      }
    });

    ws.on("close", () => {
      for (const id in clients) {
        if (clients[id] === ws) {
          delete clients[id];
        }
      }
    });
  });
};
