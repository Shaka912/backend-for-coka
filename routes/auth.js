const express = require("express");
const {google}= require('googleapis')
const xpath = require("path");
const router = express.Router();
const multer = require("multer");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const nodemailer = require("nodemailer");

const Dob = require("../models/dob");
const Name = require("../models/name");
const Image = require("../models/pic");
const User = require("../models/users");
const Gender = require("../models/gender");
const University = require("../models/uni");
const Message = require("../models/message");

const utils = require("../utils/utils");
const fetchuser = require("../middleware/fetchuser");
const { body, validationResult } = require("express-validator");

const jwt_secrect = "hello$123";
const CLIENT_ID = '480528069205-vajp5scbpimv6qdob9ul1tes1kohailn.apps.googleusercontent.com'
const SECERET = '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'
const refresh_token = '1//04HuLapIZYpIJCgYIARAAGAQSNwF-L9IrP4ouusos0HaiA6buMwHrUEtHvy-2crW6bQeNbYceomedVVKIkA41166VIZJc1yVoZsI'
const redirect_uri = 'https://developers.google.com/oauthplayground'
const oAuth2client = new google.auth.OAuth2(CLIENT_ID, SECERET,redirect_uri)
oAuth2client.setCredentials({refresh_token:refresh_token})
const Storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, "./uploads");
  },
  filename: (req, file, cb) => {
    cb(
      null,
      file.fieldname + "-" + Date.now() + xpath.extname(file.originalname)
    );
  },
});

const upload = multer({
  storage: Storage,
}).single("file");

router.post(
  "/createuser",
  [
    body("email", "please enter a valid email").isEmail(),
    body("password", "password must be at least 5characters").isLength({
      min: 5,
    }),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ error: errors.array() });
    }
    try {
      let user = await User.findOne({ email: req.body.email });
      if (user) {
        return res
          .status(400)
          .json({ error: "Sorry The email is already is taken" });
      }
      const salt = await bcrypt.genSalt(10);
      const secpass = await bcrypt.hash(req.body.password, salt);

      user = await User.create({
        password: secpass,
        email: req.body.email,
      });
      const data = {
        id: user.id,
        email: user.email,
      };
      const authtoken = jwt.sign(data, jwt_secrect);
      res.json({
        user: {
          id: user.id,
          email: user.email,
          authtoken: authtoken,
          timestamp: user.timestamp,
        },
      });
    } catch (error) {
      res.status(500).json({ error: "Something went worng" });
    }
  }
);
//user login endpoint
router.post(
  "/login",
  [
    body("email", "Please enter valid email").isEmail(),
    body("password", "Password cannot be blank").exists(),
  ],
  async (req, res) => {
    //error checking
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(403).json({ error: errors.array() });
    }
    const { email, password } = req.body;

    try {
      let user = await User.findOne({ email: email });
      if (user == null) {
        return res
          .status(401)
          .json({ error: "Username or password is not correct" });
      }
      //comparing user password with password in database

      let passcompare = await bcrypt.compare(password, user.password);
      if (passcompare == false) {
        return res.status(402).json({ error: "Pasword not matched" });
      }
      const data = {
        id: user.id,
        email: user.email,
      };
      const authtoken = jwt.sign(data, jwt_secrect);
      const xdob = await Dob.findOne({ _id: { $eq: user.id } });
      const xname = await Name.findOne({ _id: { $eq: user.id } });
      const ximage = await Image.findOne({ _id: { $eq: user.id } });
      const xgender = await Gender.findOne({ _id: { $eq: user.id } });
      const xuni = await University.findOne({ _id: { $eq: user.id } });
      res.json({
        user: {
          id: user.id,
          email: user.email,
          authtoken: authtoken,
          timestamp: user.timestamp,
          dob: xdob !== null ? xdob.dob : null,
          name: xname !== null ? xname.name : null,
          photo: ximage !== null ? ximage.path : null,
          gender: xgender !== null ? xgender.gender : null,
          university: xuni !== null ? xuni.university : null,
        },
      });
    } catch (error) {
      console.error(error.message);
      res.status(500).json({ error: "Something went wrong" });
    }
  }
);
router.post("/usergender", fetchuser, async (req, res) => {
  try {
    const gender = req.body.gender;
    //creating gender
    const gen = await Gender.create({
      _id: req.user.id,
      gender: gender,
    });
    res.json(gen);
  } catch (error) {
    res.status(500).json({ error: "Something went wrong" });
  }
});
router.post("/userdob", fetchuser, async (req, res) => {
  try {
    const dob = req.body.dob;
    //creating dob
    const dd = await Dob.create({
      _id: req.user.id,
      dob: dob,
    });
    res.json(dd);
  } catch (error) {
    res.status(500).json({ error: "Something went wrong" });
  }
});
router.post("/username", fetchuser, async (req, res) => {
  try {
    const name = req.body.name;
    //creating name
    const dd = await Name.create({
      _id: req.user.id,
      name: name,
    });
    res.json(dd);
  } catch (error) {
    res.status(500).json({ error: "Something went wrong" });
  }
});

router.post("/useruni", fetchuser, async (req, res) => {
  try {
    const university = req.body.university;
    const dd = await University.create({
      _id: req.user.id,
      university: university,
    });
    res.json(dd);
  } catch (error) {
    res.status(500).json({ error: "Something went wrong" });
  }
});

router.post("/uploaddp", fetchuser, (req, res) => {
  try {
    upload(req, res, async (err) => {
      if (err) {
        res.status(401).json({ error: "Not Uploaded" });
      } else {
        const dd = await Image.create({
          _id: req.user.id,
          path: `/${req.file.path.replace(/\\/g, "/")}`,
        });
        res.json(dd);
      }
    });
  } catch (error) {
    console.log(error);
    res.status(500).json({ error: "Something went wrong" });
  }
});

router.post("/updatedp", fetchuser, async (req, res) => {
  try {
    const pic = await Image.findOne({ _id: { $eq: req.user.id } });
    if (!pic) {
      res.status(500).json({ error: "Picture not found" });
      return;
    }
    utils.rmFile(pic.path);
    upload(req, res, async (err) => {
      if (err) {
        res.status(401).json({ error: "Not Uploaded" });
      } else {
        await Image.updateOne(
          { _id: req.user.id },
          {
            $set: { path: `/${req.file.path.replace(/\\/g, "/")}` },
          }
        );
        const dd = await Image.findOne({ _id: { $eq: req.user.id } });
        res.json(dd);
      }
    });
  } catch (error) {
    console.log(error);
    res.status(500).json({ error: "Something went wrong" });
  }
});

router.get("/getfriends", fetchuser, async (req, res) => {
  try {
    const fusers = await User.find({
      _id: { $ne: req.user.id },
    });
    const users = [];
    for (let user of fusers) {
      const xdob = await Dob.findOne({ _id: { $eq: user.id } });
      const xname = await Name.findOne({ _id: { $eq: user.id } });
      const ximage = await Image.findOne({ _id: { $eq: user.id } });
      const xgender = await Gender.findOne({ _id: { $eq: user.id } });
      const xuni = await University.findOne({ _id: { $eq: user.id } });
      const msgs = await Message.find({
        users: {
          $all: [req.user.id, user.id],
        },
      })
        .sort({ updatedAt: -1 })
        .limit(1);
      users.push({
        id: user.id,
        email: user.email,
        timestamp: user.timestamp,
        dob: xdob !== null ? xdob.dob : null,
        name: xname !== null ? xname.name : null,
        photo: ximage !== null ? ximage.path : null,
        gender: xgender !== null ? xgender.gender : null,
        university: xuni !== null ? xuni.university : null,
        lastmessage: msgs.length == 0 ? "Say Hi" : msgs[0].message.text,
      });
    }
    return res.status(200).json({ users });
  } catch (error) {
    console.log(error);
    return res.status(500).json({ error: "SomeThing Went Wrong" });
  }
});

router.post("/sendotp", fetchuser, async (req, res) => {
  const access_token = await oAuth2client.getAccessToken()
  try {
    if (req.user.email != req.body.email)
      return res
        .status(401)
        .json({ error: "enter same email as signup email" });
    const mailOptions = {
      from: process.env.EMAIL,
      to: req.body.email,
      subject: "Coka OTP",
      html: `<p>Here is your Coka OTP ${3952}</p>`,
    };
    const transporter = await nodemailer.createTransport({
      service:'gmail',
      // host: "smtp.gmail.com",
      // port: 465,
      secure: true,
      auth: {
        type:"OAuth2",
        clientId:CLIENT_ID,
        clientSecret:SECERET,
        refreshToken:refresh_token,
        accessToken:access_token,
        user: process.env.EMAIL,
        // pass: process.env.PASSWORD,
        // https://console.developers.google.com/projectcreate
      },
    });
    const info = await transporter.sendMail(mailOptions);
    return res.status(200).json({ message: "OTP send successfully" });
  } catch (error) {
    console.log(error);
    return res.status(500).json({ error: "SomeThing Went Wrong" });
  }
});

router.post("/verifyotp", fetchuser, async (req, res) => {
  try {
    if (3952 != req.body.otp)
      return res.status(401).json({ error: "OTP is not valid" });
    return res.status(200).json({ message: "OTP Verified Successfully" });
  } catch (error) {
    return res.status(500).json({ error: "SomeThing Went Wrong" });
  }
});

module.exports = router;
