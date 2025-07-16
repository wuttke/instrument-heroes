class PersistenceInterface {
  async addInstrumentToDate(date, instrument) {
    throw new Error('addInstrumentToDate method must be implemented');
  }

  async readInstrumentsByDate(startDate, dayCount) {
    throw new Error('readInstrumentsByDate method must be implemented');
  }
}

module.exports = PersistenceInterface;