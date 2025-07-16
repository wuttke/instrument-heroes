function obfuscateUrl(url) {
  if (!url) return url;
  return url.replace(/\/\/([^:]+):([^@]+)@/, '//$1:***@');
}

module.exports = {
  obfuscateUrl
};