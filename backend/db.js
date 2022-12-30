const mongoose = require("mongoose");
const express = require("express");
const mongouri = "mongodb://localhost:27017/cokaDB";

const conecttomongo = () => {
  mongoose.set("strictQuery", true);
  mongoose.connect(
    mongouri,
    {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    },
    (err) => {
      if (err) console.log(err);
      else console.log("Connected to mongodb successfully");
    }
  );
};
module.exports = conecttomongo;
