// server.js
const express = require("express");
const fs = require("fs");
const path = require("path");

const app = express();
const PORT = process.env.PORT || 3000;
const DATA_FILE = path.join(__dirname, "data.json");

app.use(express.json());
app.use(express.static("public"));

// Hilfsfunktion: Datum als YYYY-MM-DD
const getToday = () => new Date().toISOString().split("T")[0];

// Hilfsfunktion: Daten aus Datei lesen
const readData = () => {
  if (!fs.existsSync(DATA_FILE)) return {};
  return JSON.parse(fs.readFileSync(DATA_FILE, "utf-8"));
};

// Hilfsfunktion: Daten in Datei schreiben
const writeData = (data) => {
  fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
};

// GET /api/practice?start=yyyy-MM-dd&end=yyyy-MM-dd
app.get("/api/practice", (req, res) => {
  const { start, end } = req.query;
  if (!start || !end)
    return res.status(400).json({ error: "start and end required" });

  const data = readData();
  const result = [];

  for (const [date, names] of Object.entries(data)) {
    if (date >= start && date <= end) {
      names.forEach((name) => result.push({ date, name }));
    }
  }

  res.json(result);
});

// POST /api/practice
app.post("/api/practice", (req, res) => {
  const { name } = req.body;
  if (!name) return res.status(400).json({ error: "name is required" });

  const today = getToday();
  const data = readData();

  if (!data[today]) data[today] = [];

  if (data[today].includes(name)) {
    return res.status(409).json({ error: `entry for '${name}' already exists for today` });
  }

  data[today].push(name);
  writeData(data);

  res.status(201).json({ date: today, name });
});

app.get("/api/status", (req, res) => {
  const data = readData();
  res.send(data);
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
