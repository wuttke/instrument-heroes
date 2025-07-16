// server.js
const express = require("express");
const path = require("path");
const FileStorage = require("./persistence/fileStorage");
const MongoStorage = require("./persistence/mongoStorage");

const app = express();
const PORT = process.env.PORT || 3000;

const STORAGE_TYPE = process.env.STORAGE_TYPE || "file";
const MONGO_URL = process.env.MONGO_URL;
const MONGO_DB_NAME = process.env.MONGO_DB_NAME || "instrument-heroes";

let storage;
if (STORAGE_TYPE === "mongo") {
  if (!MONGO_URL) {
    console.error("MONGO_URL environment variable is required when using mongo storage");
    process.exit(1);
  }
  storage = new MongoStorage(MONGO_URL, MONGO_DB_NAME);
} else {
  storage = new FileStorage();
}

app.use(express.json());
app.use(express.static("public"));

const getToday = () => new Date().toISOString().split("T")[0];

// GET /api/practice?start=yyyy-MM-dd&end=yyyy-MM-dd
app.get("/api/practice", async (req, res) => {
  const { start, end } = req.query;
  if (!start || !end)
    return res.status(400).json({ error: "start and end required" });

  try {
    const startDate = new Date(start);
    const endDate = new Date(end);
    
    if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
      throw new Error("Invalid date format");
    }
    
    const dayCount = Math.ceil((endDate - startDate) / (1000 * 60 * 60 * 24)) + 1;
    
    const result = await storage.readInstrumentsByDate(start, dayCount);
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// POST /api/practice
app.post("/api/practice", async (req, res) => {
  const { name } = req.body;
  if (!name) return res.status(400).json({ error: "name is required" });

  const today = getToday();

  try {
    await storage.addInstrumentToDate(today, name);
    res.status(201).json({ date: today, name });
  } catch (error) {
    if (error.message.includes("already exists")) {
      res.status(409).json({ error: error.message });
    } else {
      res.status(500).json({ error: error.message });
    }
  }
});


app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
