
function capitalize(word) {
  if (!word) { return ""; }

  return word[0].toUpperCase() + word.slice(1);
}

function uncamelcase(string) {
  if (!string) { return ""; }

  const result = string.replace(/([A-Z])|_+/g, (match, letter="") => ` ${letter}`);
  return capitalize(result.trim());
}

module.exports = {
  capitalize: capitalize,
  uncamelcase: uncamelcase
};
