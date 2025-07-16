const { MongoClient } = require("mongodb");
const PersistenceInterface = require("./interface");

class MongoStorage extends PersistenceInterface {
  constructor(connectionUrl, dbName = "instrument-heroes") {
    super();
    this.connectionUrl = connectionUrl;
    this.dbName = dbName;
    this.collectionName = "practice-sessions";
    this.client = null;
    this.db = null;
  }

  async connect() {
    if (!this.client) {
      this.client = new MongoClient(this.connectionUrl);
      await this.client.connect();
      this.db = this.client.db(this.dbName);
    }
  }

  async disconnect() {
    if (this.client) {
      await this.client.close();
      this.client = null;
      this.db = null;
    }
  }

  async addInstrumentToDate(date, instrument) {
    await this.connect();
    const collection = this.db.collection(this.collectionName);
    
    const existing = await collection.findOne({ date, instrument });
    if (existing) {
      throw new Error(`entry for '${instrument}' already exists for ${date}`);
    }
    
    await collection.insertOne({ date, instrument, createdAt: new Date() });
  }

  async readInstrumentsByDate(startDate, dayCount) {
    await this.connect();
    const collection = this.db.collection(this.collectionName);
    const start = new Date(startDate);
    const end = new Date(start);
    end.setDate(start.getDate() + dayCount);
    
    const endDateStr = end.toISOString().split("T")[0];
    
    const results = await collection.find({
      date: { $gte: startDate, $lt: endDateStr }
    }).sort({ date: 1, instrument: 1 }).toArray();
    
    return results.map(doc => ({ date: doc.date, name: doc.instrument }));
  }
}

module.exports = MongoStorage;