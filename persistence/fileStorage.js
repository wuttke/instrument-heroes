const fs = require("fs");
const path = require("path");
const PersistenceInterface = require("./interface");

class FileStorage extends PersistenceInterface {
  constructor(dataFile = path.join(__dirname, "..", "data.json")) {
    super();
    this.dataFile = dataFile;
  }

  readData() {
    if (!fs.existsSync(this.dataFile)) return {};
    return JSON.parse(fs.readFileSync(this.dataFile, "utf-8"));
  }

  writeData(data) {
    fs.writeFileSync(this.dataFile, JSON.stringify(data, null, 2));
  }

  async addInstrumentToDate(date, instrument) {
    const data = this.readData();
    
    if (!data[date]) data[date] = [];
    
    if (data[date].includes(instrument)) {
      throw new Error(`entry for '${instrument}' already exists for ${date}`);
    }
    
    data[date].push(instrument);
    this.writeData(data);
  }

  async readInstrumentsByDate(startDate, dayCount) {
    const data = this.readData();
    const result = [];
    const start = new Date(startDate);
    
    for (let i = 0; i < dayCount; i++) {
      const currentDate = new Date(start);
      currentDate.setDate(start.getDate() + i);
      const dateStr = currentDate.toISOString().split("T")[0];
      
      if (data[dateStr]) {
        data[dateStr].forEach((instrument) => 
          result.push({ date: dateStr, name: instrument })
        );
      }
    }
    
    return result;
  }
}

module.exports = FileStorage;