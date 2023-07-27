//fZBVmISUJcuQUqXg

const express = require("express");
const mongoose = require("mongoose");
const app = express();
const dotenv = require("dotenv");
const User = require("./models/User");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcrypt");
const cors = require("cors");
const cookieParser = require("cookie-parser");
const Message = require("./models/Message");
const ws = require("ws");
const { S3Client, PutObjectCommand } = require("@aws-sdk/client-s3");
const bucket = "mernchatapp";
dotenv.config();

app.use(express.json());
app.use(
  cors({
    credentials: true,
    origin: "*",
  })
);
app.use(cookieParser());

const jwtSecret = process.env.JWT_SECRET;
const bcryptSalt = bcrypt.genSaltSync(10);

async function uploadToS3(file) {
  const client = new S3Client({
    region: "us-east-1",
    credentials: {
      accessKeyId: process.env.S3_ACCESS_KEY,
      secretAccessKey: process.env.S3_SECRET_ACCESS_KEY,
    },
  });
  const parts = file.name.split(".");
  const ext = parts[parts.length - 1];
  const fileName = Date.now() + "." + ext;
  const bufferData = Buffer.from(file.data.split(",")[1], "base64");

  const data = await client.send(
    new PutObjectCommand({
      Bucket: bucket,
      Body: bufferData,
      Key: fileName,
      // ContentType: detectedType ? detectedType : "application/octet-stream",
      ACL: "public-read",
    })
  );
  return fileName;
}

app.get("/api/test", (req, res) => {
  console.log(process.env.MONGO_URL);
  res.json("ok");
});

app.post("/api/register", async (req, res) => {
  const { userName: username, password } = req.body;
  console.log({ username, password });
  try {
    await mongoose.connect(process.env.MONGO_URL);
    const hashedPass = bcrypt.hashSync(password, bcryptSalt);
    const createdUser = await User.create({ username, password: hashedPass });
    jwt.sign(
      { userId: createdUser._id, username },
      jwtSecret,
      {},
      (err, token) => {
        if (err) throw err;
        res
          .cookie("token", token, { sameSite: "none", secure: true })
          .status(201)
          .json({
            id: createdUser._id,
          });
      }
    );
  } catch (err) {
    if (err) throw err;
    res.status(500).json("error");
  }
});

app.get("/api/people", async (req, res) => {
  await mongoose.connect(process.env.MONGO_URL);

  const users = await User.find({}, { _id: 1, username: 1 });
  res.json(users);
});

app.get("/api/profile", async (req, res) => {
  await mongoose.connect(process.env.MONGO_URL);

  const token = req.cookies?.token;
  if (token) {
    jwt.verify(token, jwtSecret, {}, (err, userData) => {
      if (err) throw err;
      res.json(userData);
    });
  } else {
    console.log("inside");
    res.status(401).json("no token");
  }
});

app.post("/api/login", async (req, res) => {
  await mongoose.connect(process.env.MONGO_URL);

  const { userName: username, password } = req.body;
  const foundUser = await User.findOne({ username });
  if (foundUser) {
    const result = bcrypt.compareSync(password, foundUser.password);
    if (result) {
      jwt.sign(
        { userId: foundUser._id, username },
        jwtSecret,
        {},
        (err, token) => {
          if (err) throw err;
          res
            .cookie("token", token, { sameSite: "none", secure: true })
            .status(200)
            .json({ id: foundUser._id });
        }
      );
    } else {
      res.status(401).json("incorrect password");
    }
  } else {
    res.status(404).json("user not found");
  }
});

app.post("/api/logout", (req, res) => {
  res.cookie("token", "", { sameSite: "none", secure: true }).json("OK");
});

async function getUserDataFromReq(req) {
  return new Promise((resolve, reject) => {
    const token = req.cookies?.token;
    if (token) {
      jwt.verify(token, jwtSecret, {}, (err, userData) => {
        if (err) throw err;
        resolve(userData);
      });
    } else {
      reject("no token");
    }
  });
}

app.get("/api/messages/:userId", async (req, res) => {
  await mongoose.connect(process.env.MONGO_URL);

  const { userId } = req.params;
  const userData = await getUserDataFromReq(req);
  const ourUserId = userData.userId;
  const messages = await Message.find({
    sender: { $in: [userId, ourUserId] },
    recipient: { $in: [userId, ourUserId] },
  }).sort({ createdAt: 1 });
  res.json(messages);
});

const server = app.listen(4020);

const wss = new ws.WebSocketServer({ server });
wss.on("connection", (connection, req) => {
  mongoose.connect(process.env.MONGO_URL);
  function notifyOnlinePeople() {
    [...wss.clients].forEach((client) => {
      client.send(
        JSON.stringify({
          online: [...wss.clients].map((c) => ({
            userId: c.userId,
            username: c.username,
          })),
        })
      );
    });
  }

  connection.isAlive = true;

  connection.timer = setInterval(() => {
    connection.ping();
    connection.deathTimer = setTimeout(() => {
      connection.isAlive = false;
      clearInterval(connection.timer);
      connection.terminate();
      notifyOnlinePeople();
    }, 1000);
  }, 5000);

  connection.on("pong", () => {
    clearTimeout(connection.deathTimer);
  });

  const cookies = req.headers.cookie;
  if (cookies) {
    const tokenCookieStr = cookies
      .split(";")
      .find((str) => str.startsWith("token="));
    if (tokenCookieStr) {
      const token = tokenCookieStr.split("=")[1];
      if (token) {
        jwt.verify(token, jwtSecret, {}, (err, userData) => {
          if (err) throw err;
          const { userId, username } = userData;
          connection.userId = userId;
          connection.username = username;
        });
      }
    }
  }
  connection.on("message", async (message) => {
    const messageData = JSON.parse(message.toString());
    const { recipient, text, file } = messageData;
    let fileName = null;
    if (file) {
      fileName = await uploadToS3(file);
    }
    if (recipient && (text || file)) {
      const msgDoc = await Message.create({
        sender: connection.userId,
        recipient,
        text,
        file: file ? fileName : null,
      });
      [...wss.clients]
        .filter((c) => c.userId === recipient)
        .forEach((c) =>
          c.send(
            JSON.stringify({
              text,
              recipient,
              sender: connection.userId,
              _id: msgDoc._id,
              file: file ? fileName : null,
            })
          )
        );
    }
  });
  notifyOnlinePeople();
});
