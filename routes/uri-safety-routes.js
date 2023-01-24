const { WebRiskServiceClient } = require("@google-cloud/web-risk");
const keyFilename = "./google/keyfile.json";
const client = new WebRiskServiceClient({ keyFilename });

module.exports = function (app) {
  app.post("/check_uris", async (req, res) => {
    // const uris = JSON.parse(req.body.uris);
    const { uris } = req.body;
    const threats = [];
    let error = false;
    for (const uri of uris) {
      const request = {
        uri: uri,
        threatTypes: ["MALWARE", "SOCIAL_ENGINEERING", "UNWANTED_SOFTWARE"],
      };
      // call the WebRisk searchUris API.
      try {
        const { threat } = (await client.searchUris(request))[0];
        if (threat) {
          threats.push(uri);
        }
      } catch (e) {
        error = true;
      }
    }
    if (error) return res.sendStatus(500);
    else {
      return res.json(threats);
    }
  });
};
