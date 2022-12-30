require("dotenv").config();
const http = require("http");
const cors = require("cors");
const express = require("express");
const conecttomongo = require("./db");
const utils = require("./utils/utils");
var bodyParser = require("body-parser");
const authRoutes = require("./routes/auth");
const msgRoutes = require("./routes/message");
const { addMessage } = require("./controller/messageController");

const port = 5200;
const app = express();

app.use(cors());
app.use(express.json());
app.use(bodyParser.json());
app.use('/uploads', express.static("./uploads"));
app.use(
  bodyParser.urlencoded({
    extended: true,
  })
);

conecttomongo();

utils.mkdir("./uploads");

app.use("/api/auth", authRoutes);
app.use("/api/auth", msgRoutes);

const server = http.createServer(app);
const io = require("socket.io")(server, {
  cors: {
    origin: `http://127.0.0.1:${port}`,
  },
});

global.onlineUsers = new Map();
io.on("connection", (socket) => {
  global.chatSocket = socket;
  socket.on("add-user", (userId) => {
    onlineUsers.set(userId, socket.id);
  });

  socket.on("send-msg", async (data) => {
    const { error, response } = await addMessage(data);
    if (response) {
      const sendUserSocket = onlineUsers.get(data.to);
      if (sendUserSocket) {
        socket.to(sendUserSocket).emit("msg-recieve", data);
      }
    }
  });
});

server.listen(port, "0.0.0.0", () => {
  console.log(`Server listening on port ${port}`);
});
