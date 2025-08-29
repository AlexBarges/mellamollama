// api/ping.js (raíz del repo)
module.exports = (req, res) => {
  res.status(200).send('OK desde ROOT /api');
};
