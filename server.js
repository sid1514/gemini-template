require("dotenv").config();
const express = require("express");
const cors = require("cors");
const { GoogleGenerativeAI } = require("@google/generative-ai");
const http = require("http");
const { Server } = require("socket.io");
const mongoose = require("mongoose");
const Routes = require("./Routes/router");

const app = express();
const PORT = 8000;

app.use(cors());
app.use(express.json());
app.use(Routes);

// Create an HTTP server using Express
const server = http.createServer(app);

// Access your API key as an environment variable
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API);


app.use(express.json());

app.post("/getResponse", async (req, res) => {
  const { destination, date, length, group, budget, activity, promptG } = req.body;

  const model = genAI.getGenerativeModel({ model: "gemini-pro" });
  const prompt = promptG;

  try {
    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = await response.text(); // Get the text response
    
    // Send the response back to the client
    res.json({ response: text });
  } catch (error) {
    console.error("Error generating content:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});
// Socket.IO setup
const io = new Server(server, {
  cors: {
    origin: "http://localhost:3000",
    methods: ["GET", "POST"],
  },
});

// Socket.IO event handlers
io.on("connection", (socket) => {
  // Handle connection
  socket.on("join_room", (data) => {
    socket.join(data);
    console.log(`user with Id: ${socket.id} joined room: ${data}`);
  });

  socket.on("sendMessage", (data) => {
    console.log(data);
    socket.to(data.room).emit("receiveMessage", data);
  });

  socket.on("disconnect", () => {
    console.log("user Disconnected", socket.id);
  });
});

// Connect to MongoDB
mongoose
  .connect(process.env.MONGO_URI)
  .then(() => {
    // Start listening on the combined server
    server.listen(PORT, () => {
      console.log(`Server started on port ${PORT} and connected to database`);
    });
  })
  .catch((err) => {
    console.error("Error connecting to MongoDB:", err);
  });
