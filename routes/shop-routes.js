const mongoose = require("mongoose");
const User = require("../models/User.model");
const Product = require("../models/Product.model");
const passport = require("passport");
const settings = require("../passport-config/settings");
require("../passport-config/passport")(passport);
const jwt = require("jsonwebtoken");
const { uploadFile } = require("../utils/file-upload");

module.exports = function (app) {
  app.post(
    "/products/create",
    passport.authenticate("jwt", { session: false }),
    (req, res) => {
      console.log("PRODUCTS CREATE ROUTE REACHED");
      const { user: u } = req;
      User.findOne({ email: u.email }, async function (err, user) {
        if (err) return next(err);
        let newProduct;
        let isDigital;
        if (req.body.isDigital === "false") {
          isDigital = false;
        } else isDigital = true;
        if (isDigital) {
          newProduct = new Product({
            sellerUid: u._id,
            sellerStripeId: "test",
            sellerName: u.displayName,
            name: req.body.name,
            price: req.body.price,
            description: req.body.description,
            category: req.body.category,
            tags: JSON.parse(req.body.tags),
            isDigital: isDigital,
            ratings: [],
            averageRating: Math.round(Math.random() * 10) / 2,
            reviews: [],
          });
        } else {
          newProduct = new Product({
            sellerUid: u._id,
            sellerStripeId: u.stripeID,
            sellerName: u.artistName,
            name: req.body.name,
            price: req.body.price,
            description: req.body.description,
            category: req.body.category,
            tags: JSON.parse(req.body.tags),
            isDigital: isDigital,
            quantityInStock: req.body.quantityInStock,
            parcelLength: req.body.parcelLength,
            parcelWidth: req.body.parcelWidth,
            parcelHeight: req.body.parcelHeight,
            parcelWeight: req.body.parcelWeight,
            ratings: [],
            averageRating: Math.round(Math.random() * 10) / 2,
            reviews: [],
          });
        }
        newProduct.save(async function (err, product) {
          //user should also be update with the product
          if (err) {
            console.log(err);
            return res.json({
              success: false,
              msg: "Problem creating product.",
            });
          } else {
            const fileKeys = Object.keys(req.files);
            let fileUrls = [];
            let imageUrls = [];
            for (let i = 0; i < fileKeys.length; i++) {
              const key = fileKeys[i];
              const fileContent = req.files[key].data;
              let fileName = req.files[key].name;
              //if the filename contains spaces, replace them with an underscore
              if (fileName.includes(" ")) {
                fileName = fileName.split(" ").join("_");
              }
              let fileFullPath = `${req.user._id}/products/${product._id}/`;
              if (key.includes("file")) {
                fileFullPath += `downloadable_files/${fileName}`;
              } else if (key.includes("image")) {
                fileFullPath += `images/${fileName}`;
              }
              try {
                l;
                let url = await uploadFile(fileFullPath, fileContent);
                if (key.includes("file")) {
                  fileUrls.push(url);
                } else imageUrls.push(url);
              } catch (e) {
                console.log(e);
                res.sendStatus(500);
              }
            }
            product.photoUrls = imageUrls;
            product.fileUrls = fileUrls;
            product.save(function (err, product) {
              if (err) {
                console.log(err);
                return next(err);
              }
              user.products = [...user.products, product._id];
              user.save(function (err, user) {
                if (err) {
                  return res.json({
                    success: false,
                    msg: "Problem saving user.",
                  });
                } else {
                  return res.json(user);
                }
              });
            });
          }
        });
      });
    }
  );

  //delete a product
  app.delete(
    "/products/:productid",
    passport.authenticate("jwt", { session: false }),
    (req, res) => {
      const { user } = req;
      Product.findOneAndDelete(
        { sellerUid: user._id, _id: req.params.productid },
        function (err, result) {
          if (err) res.sendStatus(500);
          res.sendStatus(200);
        }
      );
    }
  );

  //update a product
  app.put(
    "/products",
    passport.authenticate("jwt", { session: false }),
    (req, res) => {
      // just needs to update the product, but should verify the owner
      // will also need to account for updating product images
      const { user } = req;
      Product.findOne(
        { sellerUid: user._id, _id: req.body.productId },
        function (err, product) {
          if (err) return next(err);
          const fields = req.body.fields && JSON.parse(req.body.fields);
          const values = req.body.values && JSON.parse(req.body.values);
          for (let i = 0; i < fields.length; i++) {
            const field = fields[i];
            const value = values[i];
            product[field] = value;
          }
          product.save();
          res.status(200).json(product);
        }
      );
    }
  );

  //find all products
  app.get("/products", (req, res) => {
    Product.find(function (err, products) {
      if (err) {
        console.log(err);
        res.sendStatus(500);
      }
      const bestSelling = products
        .sort((a, b) => {
          //subtract a from b to order the results in ascending order
          return b.unitsSold - a.unitsSold;
        })
        .slice(0, 10);
      const topRated = products
        .sort((a, b) => {
          //subtract a from b to order the results in descending order
          let comparison = b.averageRating - a.averageRating;
          //if the averageRatings are equal, give priority to the product with more ratings
          if (comparison === 0) {
            comparison = b.ratings.length - a.ratings.length;
            //if the comparison is still equal, give priority to the product with more reviews
            if (comparison === 0) {
              comparison = b.reviews.length - a.reviews.length;
              //if the comparison is still equal, give priority to the product with more units sold
              if (comparison === 0) {
                comparison = b.unitsSold - a.unitsSold;
              }
            }
          }
          return comparison;
        })
        .slice(0, 10);
      const newest = products
        .sort((a, b) => {
          return b.createdAt - a.createdAt;
        })
        .slice(0, 10);
      res.json({ bestSelling, topRated, newest });
    });
  });

  //find a single product
  app.get("/find_product/:id", (req, res) => {
    Product.findById(req.params.id, function (err, product) {
      if (err) {
        console.log(err);
        res.sendStatus(500);
      } else {
        res.json(product);
      }
    });
  });

  //find all products created by one user
  app.get("/products/:ownerid", (req, res) => {
    Product.find({ sellerUid: req.params.ownerid }, function (err, products) {
      if (err) {
        console.log(err);
        return res.sendStatus(500);
      } else {
        res.json(products);
      }
    });
  });
};
