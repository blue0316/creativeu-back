const User = require("../models/User.model");
const Event = require("../models/Event.model");
// const Product = require("../models/Product.model");
const { isActive } = require("../utils/account-activation-status");

module.exports = function (app) {
  app.get("/search", async (req, res) => {
    const searchType = req.query.searchtype || "all"; //default to show all results
    const searchTerm = req.query.searchterm;
    const showLocalResultsOnly = req.query.showlocalresultsonly;
    const radius = req.query.radius;
    const latitude = req.query.latitude;
    const longitude = req.query.longitude;
    const originatorID = req.query.originatorid;
    //handle bad queries
    if (showLocalResultsOnly && (!radius || !latitude || !longitude)) {
      res.sendStatus(400);
    } else {
      //if the search term === "discover me" , return all discoverable users
      if (searchTerm.toLowerCase() === "discover me") {
        let queryParamsDiscoverMe = {
          $and: [
            { role: { $ne: "administrator" } }, //filter out administrators
            { type: "creative" }, //return only creatives
            { isDiscoverable: true }, //return only discoverable users
            { suspended: false },
          ],
        };
        if (originatorID) {
          queryParamsDiscoverMe.$and.push({ _id: { $ne: originatorID } }); //filter out the user
        }
        //if the user has indicated that they want to see only local results
        if (showLocalResultsOnly && radius) {
          let searchLatitude, searchLongitude;
          if (latitude && longitude) {
            searchLatitude = latitude;
            searchLongitude = longitude;
          } else {
            //if no lat and lng, return an error
            res.sendStatus(400);
          }
          const searchLatRad = searchLatitude / 57.29577951;
          const searchLngRad = searchLongitude / 57.29577951;
          //where clause for finding nearby creatives
          const whereParam = {
            $where: `function () { 
              const latitudeRad = this.lat / 57.29577951;
              const longitudeRad = this.lng / 57.29577951;
              return ${radius} >= 3963.0 * Math.acos((Math.sin(${searchLatRad}) * Math.sin(latitudeRad)) + Math.cos(${searchLatRad}) * Math.cos(latitudeRad) * Math.cos(longitudeRad - ${searchLngRad}))
             }`,
          };
          queryParamsDiscoverMe.$and[queryParamsDiscoverMe.$and.length] =
            whereParam;
        }
        let users = [];
        // let products = []; //FOR NOW WE ARE NOT HANDLING PRODUCTS
        let events = [];
        try {
          let res = await User.find(queryParamsDiscoverMe, {
            password: 0,
            streetAddressLine1: 0,
            streetAddressLine2: 0,
            role: 0,
            email: 0,
            cell: 0,
            fname: 0,
            lname: 0,
            secret: 0,
            stripeSubID: 0,
            stripeAccountID: 0,
            reported: 0,
            suspended: 0,
            blockedUsers: 0,
            blockedByUsers: 0,
          });
          users = res
            .filter((u) => {
              return isActive(u);
            })
            .map((u) => {
              const user = {
                displayName: u.displayName,
                profileUrl: u.profileUrl,
                _id: u.id,
                type: u.type,
                isDiscoverable: u.isDiscoverable,
                category: u.category,
                tags: u.tags,
                city: u.city,
                stateOrProvince: u.stateOrProvince,
                country: u.country,
                following: u.following,
                followers: u.followers,
                products: u.products,
                artists: u.artists,
                events: u.events,
                profilePicUrl: u.profilePicUrl,
                coverPhotoUrl: u.coverPhotoUrl,
                blockedUsers: u.blockedUsers,
                calendar: u.calendar,
              };
              return user;
            });
        } catch (e) {
          console.log(e);
        }
        res.json({
          users,
          events,
        });
      } else {
        //NON DISCOVER ME SEARCH
        //build query params
        let queryParamsUsers, queryParamsEvents; //queryParamsProducts;
        if (searchTerm) {
          //build users search terms
          queryParamsUsers = {
            $and: [
              { role: { $ne: "administrator" } }, //filter out administrators
              { suspended: false },
              {
                $or: [
                  { displayName: new RegExp(`.*${searchTerm}.*`, "i") },
                  { category: { $regex: searchTerm, $options: "i" } },
                  { about: { $regex: searchTerm, $options: "i" } },
                  { tags: { $regex: searchTerm, $options: "i" } },
                ],
              },
            ],
          };
          if (originatorID)
            queryParamsUsers.$and.push({ _id: { $ne: originatorID } });
          //build events search terms
          queryParamsEvents = {
            $and: [
              {
                $or: [
                  { title: { $regex: searchTerm, $options: "i" } },
                  { description: { $regex: searchTerm, $options: "i" } },
                  { venueName: { $regex: searchTerm, $options: "i" } },
                  { ownerName: { $regex: searchTerm, $options: "i" } },
                  { tags: { $regex: searchTerm, $options: "i" } },
                ],
              },
            ],
          };
          //show your own events if you are logged in
          if (originatorID) {
            queryParamsEvents.$and.push({
              $or: [{ isPublic: true }, { ownerID: originatorID }],
            });
          } else {
            queryParamsEvents.$and.push({ isPublic: true });
          }
          //for now, show only events in the future or currently happening
          queryParamsEvents.$and.push({
            //will be 2 after uncommenting the first $or
            $where: `function () {
                const d1 = this.startTime;
                const d2 = Date.now();
                return d1 >= d2;
              }`,
          });
          //build products search terms
          // queryParamsProducts = {
          //   $and: [
          //     //show either public events or private events owned by the user
          //     { $or: [{ isPublic: true }, { ownerID: originatorID }] },
          //     {
          //       $or: [
          //         { name: { $regex: searchTerm, $options: "i" } },
          //         { description: { $regex: searchTerm, $options: "i" } },
          //         { sellerName: { $regex: searchTerm, $options: "i" } },
          //         { category: { $regex: searchTerm, $options: "i" } },
          //         { tags: { $regex: searchTerm, $options: "i" } },
          //       ],
          //     },
          //   ],
          // };
        }
        //if the user has indicated that they want to see only local results
        if (showLocalResultsOnly && radius) {
          let searchLatitude, searchLongitude;
          if (latitude && longitude) {
            searchLatitude = latitude;
            searchLongitude = longitude;
          } else {
            //if no lat and lng, return an error
            res.sendStatus(400);
          }
          const searchLatRad = searchLatitude / 57.29577951;
          const searchLngRad = searchLongitude / 57.29577951;
          //THIS SHOULD BE ADDED TO THE AND CLAUSE FOR THE USERS AND EVENTS BUT NOT FOR PRODUCTS
          const whereParam = {
            $where: `function () { 
        const latitudeRad = this.lat / 57.29577951;
        const longitudeRad = this.lng / 57.29577951;
        return ${radius} >= 3963.0 * Math.acos((Math.sin(${searchLatRad}) * Math.sin(latitudeRad)) + Math.cos(${searchLatRad}) * Math.cos(latitudeRad) * Math.cos(longitudeRad - ${searchLngRad}))
      }`,
          };
          queryParamsUsers.$and.push(whereParam);
          queryParamsEvents.$and.push(whereParam);
        }
        let users = [];
        let events = [];
        // let products = [];
        try {
          let res = await User.find(queryParamsUsers, {
            password: 0,
            streetAddressLine1: 0,
            streetAddressLine2: 0,
            role: 0,
            email: 0,
            cell: 0,
            fname: 0,
            lname: 0,
            secret: 0,
            stripeSubID: 0,
            stripeAccountID: 0,
            reported: 0,
            suspended: 0,
            blockedUsers: 0,
            blockedByUsers: 0,
          });
          //return only active users
          users = res
            .filter((u) => {
              return isActive(u);
            })
            .map((u) => {
              const user = {
                displayName: u.displayName,
                profileUrl: u.profileUrl,
                _id: u.id,
                type: u.type,
                isDiscoverable: u.isDiscoverable,
                category: u.category,
                tags: u.tags,
                city: u.city,
                stateOrProvince: u.stateOrProvince,
                country: u.country,
                following: u.following,
                followers: u.followers,
                products: u.products,
                artists: u.artists,
                events: u.events,
                profilePicUrl: u.profilePicUrl,
                coverPhotoUrl: u.coverPhotoUrl,
                blockedUsers: u.blockedUsers,
                calendar: u.calendar,
              };
              return user;
            });
        } catch (e) {
          console.log(e);
        }
        try {
          let res = await Event.find(queryParamsEvents);
          //return only active events
          events = res.filter((ev) => {
            return isActive(ev);
          });
        } catch (e) {
          console.log(e);
        }
        // try {
        //   let res = await Product.find(queryParamsProducts, {
        //     sellerStripeID: 0,
        //   });
        //   products = res;
        // } catch (e) {
        //   console.log(e);
        // }
        res.json({
          users,
          events,
          // products,
        });
      }
    }
  });
};
