const { MongoClient } = require("mongodb");
const PersistenceInterface = require("./interface");
const { obfuscateUrl } = require("../utils");

class MongoStorage extends PersistenceInterface {
  constructor(connectionUrl, dbName = "instrument-heroes") {
    super();
    this.connectionUrl = connectionUrl;
    this.dbName = dbName;
    this.collectionName = "practice-sessions";
    this.client = null;
    this.db = null;
    this.connectionRetries = 3;
    this.connectionTimeout = 10000;
  }


  async connect() {
    if (!this.client) {
      let lastError = null;
      
      for (let attempt = 1; attempt <= this.connectionRetries; attempt++) {
        try {
          console.log(`[MongoDB] Connecting to ${obfuscateUrl(this.connectionUrl)} (attempt ${attempt}/${this.connectionRetries})`);
          
          this.client = new MongoClient(this.connectionUrl, {
            serverSelectionTimeoutMS: this.connectionTimeout,
            connectTimeoutMS: this.connectionTimeout,
            heartbeatFrequencyMS: 30000,
            maxPoolSize: 10,
            minPoolSize: 5
          });
          
          await this.client.connect();
          this.db = this.client.db(this.dbName);
          
          console.log(`[MongoDB] Successfully connected to database: ${this.dbName}`);
          return;
        } catch (error) {
          lastError = error;
          console.error(`[MongoDB] Connection attempt ${attempt} failed:`, error.message);
          
          if (this.client) {
            try {
              await this.client.close();
            } catch (closeError) {
              console.error(`[MongoDB] Error closing failed connection:`, closeError.message);
            }
            this.client = null;
            this.db = null;
          }
          
          if (attempt < this.connectionRetries) {
            const delay = Math.min(1000 * Math.pow(2, attempt - 1), 5000);
            console.log(`[MongoDB] Retrying connection in ${delay}ms...`);
            await new Promise(resolve => setTimeout(resolve, delay));
          }
        }
      }
      
      throw new Error(`Failed to connect to MongoDB after ${this.connectionRetries} attempts. Last error: ${lastError.message}`);
    }
  }

  async disconnect() {
    if (this.client) {
      try {
        console.log(`[MongoDB] Disconnecting from database: ${this.dbName}`);
        await this.client.close();
        console.log(`[MongoDB] Successfully disconnected`);
      } catch (error) {
        console.error(`[MongoDB] Error during disconnect:`, error.message);
      } finally {
        this.client = null;
        this.db = null;
      }
    }
  }

  async addInstrumentToDate(date, instrument) {
    try {
      await this.connect();
      const collection = this.db.collection(this.collectionName);
      
      console.log(`[MongoDB] Adding instrument '${instrument}' for date ${date}`);
      
      const existing = await collection.findOne({ date, instrument });
      if (existing) {
        throw new Error(`entry for '${instrument}' already exists for ${date}`);
      }
      
      const result = await collection.insertOne({ date, instrument, createdAt: new Date() });
      console.log(`[MongoDB] Successfully inserted document with ID: ${result.insertedId}`);
      
    } catch (error) {
      console.error(`[MongoDB] Error adding instrument '${instrument}' for date ${date}:`, error.message);
      
      if (error.name === 'MongoNetworkError' || error.name === 'MongoServerError') {
        throw new Error(`Database connection error: ${error.message}`);
      } else if (error.message.includes('already exists')) {
        throw error;
      } else {
        throw new Error(`Failed to add instrument: ${error.message}`);
      }
    }
  }

  async readInstrumentsByDate(startDate, dayCount) {
    try {
      await this.connect();
      const collection = this.db.collection(this.collectionName);
      
      console.log(`[MongoDB] Reading instruments from ${startDate} for ${dayCount} days`);
      
      const start = new Date(startDate);
      const end = new Date(start);
      end.setDate(start.getDate() + dayCount);
      
      const endDateStr = end.toISOString().split("T")[0];
      
      const results = await collection.find({
        date: { $gte: startDate, $lt: endDateStr }
      }).sort({ date: 1, instrument: 1 }).toArray();
      
      console.log(`[MongoDB] Found ${results.length} practice sessions`);
      
      return results.map(doc => ({ date: doc.date, name: doc.instrument }));
      
    } catch (error) {
      console.error(`[MongoDB] Error reading instruments from ${startDate}:`, error.message);
      
      if (error.name === 'MongoNetworkError' || error.name === 'MongoServerError') {
        throw new Error(`Database connection error: ${error.message}`);
      } else {
        throw new Error(`Failed to read instruments: ${error.message}`);
      }
    }
  }
}

module.exports = MongoStorage;