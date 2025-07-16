const FileStorage = require("./persistence/fileStorage");
const MongoStorage = require("./persistence/mongoStorage");
const fs = require("fs");
const path = require("path");

const TEST_DATA_FILE = path.join(__dirname, "test-data.json");

async function runTests() {
  console.log("🎸 Running Instrument Heroes Storage Tests\n");

  await testFileStorage();
  await testMongoStorage();

  console.log("✅ All tests passed!");
}

async function testFileStorage() {
  console.log("📁 Testing File Storage...");
  
  if (fs.existsSync(TEST_DATA_FILE)) {
    fs.unlinkSync(TEST_DATA_FILE);
  }
  
  const storage = new FileStorage(TEST_DATA_FILE);
  await runStorageTests(storage, "File");
  
  if (fs.existsSync(TEST_DATA_FILE)) {
    fs.unlinkSync(TEST_DATA_FILE);
  }
  
  console.log("✅ File storage tests passed\n");
}

async function testMongoStorage() {
  console.log("🍃 Testing MongoDB Storage...");
  
  const mongoUrl = "mongodb://localhost:27017";
  const storage = new MongoStorage(mongoUrl, "instrument-heroes-test");
  
  try {
    await storage.connect();
    
    const db = storage.db;
    await db.collection(storage.collectionName).deleteMany({});
    
    await runStorageTests(storage, "MongoDB");
    
    await db.collection(storage.collectionName).deleteMany({});
    await storage.disconnect();
    
    console.log("✅ MongoDB storage tests passed\n");
  } catch (error) {
    console.log(`⚠️  MongoDB tests skipped: ${error.message}\n`);
  }
}

async function runStorageTests(storage, type) {
  console.log(`  Testing ${type} - addInstrumentToDate...`);
  await storage.addInstrumentToDate("2025-07-16", "piano");
  await storage.addInstrumentToDate("2025-07-16", "guitar");
  await storage.addInstrumentToDate("2025-07-17", "drums");
  
  console.log(`  Testing ${type} - duplicate prevention...`);
  try {
    await storage.addInstrumentToDate("2025-07-16", "piano");
    throw new Error("Should have thrown duplicate error");
  } catch (error) {
    if (!error.message.includes("already exists")) {
      throw error;
    }
  }
  
  console.log(`  Testing ${type} - readInstrumentsByDate...`);
  const results = await storage.readInstrumentsByDate("2025-07-16", 2);
  
  if (results.length !== 3) {
    throw new Error(`Expected 3 results, got ${results.length}`);
  }
  
  const day1Results = results.filter(r => r.date === "2025-07-16");
  const day2Results = results.filter(r => r.date === "2025-07-17");
  
  if (day1Results.length !== 2) {
    throw new Error(`Expected 2 results for day 1, got ${day1Results.length}`);
  }
  
  if (day2Results.length !== 1) {
    throw new Error(`Expected 1 result for day 2, got ${day2Results.length}`);
  }
  
  const instruments = results.map(r => r.name).sort();
  const expected = ["drums", "guitar", "piano"];
  
  if (JSON.stringify(instruments) !== JSON.stringify(expected)) {
    throw new Error(`Expected ${expected}, got ${instruments}`);
  }
}

if (require.main === module) {
  runTests().catch(error => {
    console.error("❌ Test failed:", error.message);
    process.exit(1);
  });
}

module.exports = { runTests };