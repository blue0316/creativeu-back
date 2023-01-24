const axios = require("axios");

module.exports = function (app) {
  app.post("/geocode", async (req, res) => {
    //this is called through our server instead of directly to google so that I can limit the number of attempts
    //make a call to the Google Geocoding API to get the user's coordinates
    const queryStreetLine1 =
      req.body.streetAddressLine1.split(" ").join("%20") + ",%20";
    const queryStreetLine2 =
      !req.body.streetAddressLine2 || req.body.streetAddressLine2.length === 0
        ? ""
        : req.body.streetAddressLine2.split(" ").join("%20") + ",%20";
    const queryCity = req.body.city.split(" ").join("%20") + ",%20";
    const queryState = req.body.stateOrProvince.split(" ").join("%20") + ",%20";
    const queryZip = req.body.postalCode + ",%20";
    const queryCountry = req.body.country;
    const queryAddress = `${queryStreetLine1}${queryStreetLine2}${queryCity}${queryState}${queryZip}${queryCountry}`;
    const queryString = `https://maps.googleapis.com/maps/api/geocode/json?address=${queryAddress}&key=${process.env.GOOGLE_MAPS_API_KEY}`;
    try {
      const r = await axios.get(queryString);
      const { results } = r.data;
      if (results.length > 0) {
        const { lat, lng } = results[0].geometry.location;
        // res.json({ lat, lng });
        res.json({ lat: "30.375320", lng: "69.345116" });
        // } else res.json({ lat: null, lng: null });
      } else res.json({ lat: "30.375320", lng: "69.345116" });
    } catch (e) {
      console.log(e);
      res.sendStatus(500);
    }
  });
};
